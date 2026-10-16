#!/usr/bin/env node
"use strict";

// SP-064 spike run: must-see list → captions → grid differences → Jev pick → report.
//
//   node spikes/sp-064/run.js --must-see-only   write the must-see list of every kept word
//   node spikes/sp-064/run.js --caption-only    … and caption every cell of the kept grids
//   node spikes/sp-064/run.js --compare-only    … and write each kept grid's difference lines (every Claude step)
//   node spikes/sp-064/run.js                   … and have Jev score each kept word's cells; save raw/run.json; write the report
//   node spikes/sp-064/run.js --report          rebuild the report from raw/run.json, no calls
//
// Every Claude answer is cached under the out dir, so a re-run only calls
// Claude for what is missing or failed.
//
// Paths and knobs (env vars, defaults in brackets):
//   SP064_GRIDS        SP-029's grid list and Flash's cells  [spikes/sp-029/raw/grids.json]
//   SP064_BLIND_PAIRS  SP-029's 20 blind-check words (tuning set) [spikes/sp-029/raw/blind-pairs.json]
//   SP064_IMAGE_DIR    the grids                             [<repo>/images/mnemonic]
//   SP064_OUT_DIR      raw results and the Claude caches     [spikes/sp-064/raw]
//   SP064_REPORT       the report                            [<repo>/docs/backlog/reports/SP-064-must-see-image-pick.md]
//   SP064_SP029_RUN    SP-029's raw run, for its column      [spikes/sp-029/raw/run.json]
//   SP064_CLAUDE_BIN   run like claude -p                    [claude]
//   SP064_CLAUDE_MODEL / SP064_CLAUDE_JOBS                   [sonnet / 6]
//   SP064_JEV_JOBS     words judged at once                  [4]
//   NEMO_JEV_ENV_FILE  env file with TYPESAFE_API_KEY        [<repo>/.env, via scripts/lib/jev.js]
//   (Jev from a CN address needs a proxy: run with NODE_USE_ENV_PROXY=1 and HTTPS_PROXY set.)

const fs = require("node:fs");
const path = require("node:path");

const { makeClaude, pool } = require("./lib/claude");
const { mustSeeLists } = require("./lib/must-see");
const { captionGrids } = require("./lib/caption");
const { compareGrids } = require("./lib/differences");
const { pickCell, loadRubric } = require("./lib/pick");
const { renderReport } = require("./lib/report");
const jev = require("../../scripts/lib/jev");

const HERE = __dirname;
const REPO = path.join(HERE, "..", "..");
const SP029_RAW = path.join(REPO, "spikes", "sp-029", "raw");

function config(env = process.env) {
  return {
    gridsFile: env.SP064_GRIDS || path.join(SP029_RAW, "grids.json"),
    blindPairsFile: env.SP064_BLIND_PAIRS || path.join(SP029_RAW, "blind-pairs.json"),
    imageDir: env.SP064_IMAGE_DIR || path.join(REPO, "images", "mnemonic"),
    outDir: env.SP064_OUT_DIR || path.join(HERE, "raw"),
    reportFile: env.SP064_REPORT || path.join(REPO, "docs", "backlog", "reports", "SP-064-must-see-image-pick.md"),
    sp029RunFile: env.SP064_SP029_RUN || path.join(SP029_RAW, "run.json"),
    claudeBin: env.SP064_CLAUDE_BIN || "claude",
    claudeModel: env.SP064_CLAUDE_MODEL || "sonnet",
    claudeJobs: Number(env.SP064_CLAUDE_JOBS || 6),
    jevJobs: Number(env.SP064_JEV_JOBS || 4),
  };
}

const writeJson = (f, data) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(data, null, 2) + "\n");
};
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const readJsonOr = (f, fallback) => (fs.existsSync(f) ? readJson(f) : fallback);

// A Claude step's cache under the out dir: what to start from and how to save it.
function cached(cfg, name) {
  const file = path.join(cfg.outDir, name);
  return { cache: readJsonOr(file, {}), onSave: (cache) => writeJson(file, cache) };
}

// Every Claude step, in order; a word whose step fails drops out of the later
// steps and carries the cause. Returns { lists, captions, lines, failed: word → cause }.
async function prepare(cfg, kept, argv) {
  const ask = makeClaude({ bin: cfg.claudeBin, model: cfg.claudeModel });
  const jobs = cfg.claudeJobs;
  const failed = {};
  const live = () => kept.filter((w) => !failed[w.word]);
  const out = {};

  const lists = await mustSeeLists({ words: kept, ask, jobs, ...cached(cfg, "must-see.json") });
  for (const [word, error] of Object.entries(lists.failures)) failed[word] = `must-see list failed: ${error}`;
  out.lists = lists.cache;
  if (argv.includes("--must-see-only")) return { ...out, failed };

  const caps = await captionGrids({ words: live(), lists: out.lists, imageDir: cfg.imageDir, ask, jobs, ...cached(cfg, "captions.json") });
  for (const w of live()) if (caps.failures[w.grid]) failed[w.word] = `caption failed for cell ${caps.failures[w.grid].cell}: ${caps.failures[w.grid].error}`;
  out.captions = caps.cache;
  if (argv.includes("--caption-only")) return { ...out, failed };

  const diffs = await compareGrids({ words: live(), lists: out.lists, imageDir: cfg.imageDir, ask, jobs, ...cached(cfg, "differences.json") });
  for (const w of live()) if (diffs.failures[w.grid]) failed[w.word] = `grid differences failed: ${diffs.failures[w.grid]}`;
  out.lines = diffs.cache;
  return { ...out, failed };
}

// Jev's pick for each kept word; the raw run goes to <out>/run.json. A word
// with a failed Claude step or a Jev failure is unjudged, with the cause.
async function judge(cfg, grids, prepared) {
  const tuningWords = new Set(readJsonOr(cfg.blindPairsFile, []).map((p) => p.word));
  const rubric = loadRubric();
  const words = grids.kept.map((g) => ({ word: g.word, grid: g.grid, flashCell: g.flashCell, story: g.story, tuning: tuningWords.has(g.word) }));
  await pool(words, cfg.jevJobs, async (w) => {
    if (prepared.failed[w.word]) {
      w.unjudged = prepared.failed[w.word];
      return;
    }
    const list = prepared.lists[w.word];
    try {
      w.pick = await pickCell(
        { word: w.word, story: w.story, items: list.items, isSequence: list.isSequence, captions: prepared.captions[w.grid], lines: prepared.lines[w.grid] },
        { rubric },
      );
    } catch (err) {
      if (!(err instanceof jev.JevError)) throw err;
      w.unjudged = err.message;
    }
  });
  const run = { date: new Date().toISOString().slice(0, 10), words, leftOut: grids.leftOut || [] };
  writeJson(path.join(cfg.outDir, "run.json"), run);
  return run;
}

// The report, always from the saved run.json — no Claude or Jev call.
function writeReport(cfg) {
  const run = readJson(path.join(cfg.outDir, "run.json"));
  const sp029 = readJsonOr(cfg.sp029RunFile, null);
  fs.mkdirSync(path.dirname(cfg.reportFile), { recursive: true });
  fs.writeFileSync(cfg.reportFile, renderReport(run, { sp029 }));
}

async function main(argv) {
  const cfg = config();
  if (argv.includes("--report")) {
    writeReport(cfg);
    return 0;
  }
  const grids = readJson(cfg.gridsFile);
  const prepared = await prepare(cfg, grids.kept, argv);
  for (const [word, cause] of Object.entries(prepared.failed)) process.stderr.write(`${word}: ${cause}\n`);
  if (["--must-see-only", "--caption-only", "--compare-only"].some((f) => argv.includes(f))) return 0;
  const run = await judge(cfg, grids, prepared);
  writeReport(cfg);
  const unjudged = run.words.filter((w) => w.unjudged).length;
  process.stderr.write(`sp-064: ${run.words.length} words, ${unjudged} unjudged → ${cfg.reportFile}\n`);
  return 0;
}

if (require.main === module) {
  main(process.argv.slice(2)).then(
    (code) => (process.exitCode = code),
    (err) => {
      process.stderr.write(`sp-064: ${err.stack || err.message}\n`);
      process.exitCode = 2;
    },
  );
}

module.exports = { config, prepare, judge };
