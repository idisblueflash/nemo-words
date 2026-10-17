#!/usr/bin/env node
"use strict";

// SP-066 spike run: must-see list → captions → compare lines → Jev pick → report,
// in stages (the item's Staged run): tuning words first, then the measure words once.
//
//   node spikes/sp-066/run.js --split                        write and print the split (no call)
//   node spikes/sp-066/run.js --stage tuning --limit N       run the first N tuning words (in the tuning order)
//   node spikes/sp-066/run.js --stage tuning --words a,b     run just these tuning words
//   node spikes/sp-066/run.js --stage tuning                 run every tuning word
//   node spikes/sp-066/run.js --stage measure                fix the weights on the tuning words, run the
//                                                            measure words once, write the report
//   node spikes/sp-066/run.js --report                       rebuild the report from raw/run.json, no calls
//
// The split (lib/split.js): a fixed seed draws 20 of the 82 words as the
// tuning set, stratified on SP-064's hits; the other 62 are the measure set.
// A tuning stage first makes the must-see lists of every tuning word (text
// only), so that the tuning order can put the Staged run's early picks first
// (an SP-064 hit, a name anchor, an angleCase view or one-object, an SP-064
// gate skip); the order is saved in raw/split.json and doesn't change. Then
// it runs the chosen words and prints a stage summary (stdout). The measure
// stage refuses to run until every tuning word has run; it then fixes the
// weights on the tuning words (raw/weights.json), after which the tuning
// stage is closed, and runs each measure word that has no pick yet, so a
// judged measure word runs once.
// --must-see-only / --caption-only / --compare-only stop a stage after that step.
//
// When Claude answers that its session or usage limit is reached, the run
// stops (exit 1) before Jev, with no new run.json and no report, and says
// when to run it again; what is cached stays, so the next run continues from
// there.
//
// Every Claude answer and every usable Jev answer is cached under the out
// dir, so a re-run only calls Claude or Jev for what is missing or failed.
// SP-064's compare lines are reused (SP066_SP064_DIFFERENCES).
//
// Paths and knobs (env vars, defaults in brackets):
//   SP066_GRIDS        SP-029's grid list and Flash's cells  [spikes/sp-029/raw/grids.json]
//   SP066_SP064_RUN    SP-064's saved run (hits, baselines)  [spikes/sp-064/raw/run.json]
//   SP066_SP064_DIFFERENCES  SP-064's compare lines           [spikes/sp-064/raw/differences.json]
//   SP066_TUNING_SIZE  the tuning set's size                 [20]
//   SP066_IMAGE_DIR    the grids                             [<repo>/images/mnemonic]
//   SP066_OUT_DIR      raw results and the caches            [spikes/sp-066/raw]
//   SP066_REPORT       the report                            [<repo>/docs/backlog/reports/SP-066-scene-vivid-image-pick.md]
//   SP066_SP029_RUN    SP-029's raw run, for its column      [spikes/sp-029/raw/run.json]
//   SP066_CLAUDE_BIN   run like claude -p                    [claude]
//   SP066_CLAUDE_MODEL / SP066_CLAUDE_JOBS                   [sonnet / 6]
//   SP066_JEV_JOBS     words judged at once                  [4]
//   NEMO_JEV_ENV_FILE  env file with TYPESAFE_API_KEY        [<repo>/.env, via scripts/lib/jev.js]
//   (Jev from a CN address needs a proxy: run with NODE_USE_ENV_PROXY=1 and HTTPS_PROXY set.)

const fs = require("node:fs");
const path = require("node:path");

const { makeClaude, pool, UsageLimitError } = require("./lib/claude");
const { mustSeeLists } = require("./lib/must-see");
const { captionGrids } = require("./lib/caption");
const { compareGrids, linesOf } = require("./lib/differences");
const { pickCell, loadRubric } = require("./lib/pick");
const { renderReport, tuneWeights } = require("./lib/report");
const { drawSplit, sp064Outcomes, tuningOrder, TUNING_SIZE } = require("./lib/split");
const { stageSummary } = require("./lib/stage");
const jev = require("../../scripts/lib/jev");

const HERE = __dirname;
const REPO = path.join(HERE, "..", "..");
const SP029_RAW = path.join(REPO, "spikes", "sp-029", "raw");
const SP064_RAW = path.join(REPO, "spikes", "sp-064", "raw");

const USAGE = `usage:
  run.js --split                         write and print the split
  run.js --stage tuning [--limit N | --words a,b]   run tuning words
  run.js --stage measure                 fix the weights, run the measure words once, write the report
  run.js --report                        rebuild the report from raw/run.json
  (a stage takes --must-see-only, --caption-only or --compare-only to stop after that step)
`;

class StopError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.code = code;
  }
}

function config(env = process.env) {
  return {
    gridsFile: env.SP066_GRIDS || path.join(SP029_RAW, "grids.json"),
    sp064RunFile: env.SP066_SP064_RUN || path.join(SP064_RAW, "run.json"),
    sp064DifferencesFile: env.SP066_SP064_DIFFERENCES || path.join(SP064_RAW, "differences.json"),
    tuningSize: Number(env.SP066_TUNING_SIZE || TUNING_SIZE),
    imageDir: env.SP066_IMAGE_DIR || path.join(REPO, "images", "mnemonic"),
    outDir: env.SP066_OUT_DIR || path.join(HERE, "raw"),
    reportFile: env.SP066_REPORT || path.join(REPO, "docs", "backlog", "reports", "SP-066-scene-vivid-image-pick.md"),
    sp029RunFile: env.SP066_SP029_RUN || path.join(SP029_RAW, "run.json"),
    claudeBin: env.SP066_CLAUDE_BIN || "claude",
    claudeModel: env.SP066_CLAUDE_MODEL || "sonnet",
    claudeJobs: Number(env.SP066_CLAUDE_JOBS || 6),
    jevJobs: Number(env.SP066_JEV_JOBS || 4),
  };
}

const writeJson = (f, data) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(data, null, 2) + "\n");
};
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const readJsonOr = (f, fallback) => (fs.existsSync(f) ? readJson(f) : fallback);
const outFile = (cfg, name) => path.join(cfg.outDir, name);

// A step's cache under the out dir: what to start from and how to save it.
function cached(cfg, name) {
  const file = outFile(cfg, name);
  return { cache: readJsonOr(file, {}), onSave: (cache) => writeJson(file, cache) };
}

// The value after a flag, or undefined.
function flagValue(argv, flag) {
  const i = argv.indexOf(flag);
  if (i < 0) return undefined;
  const v = argv[i + 1];
  if (v === undefined || v.startsWith("--")) throw new StopError(`${flag} needs a value\n${USAGE}`, 2);
  return v;
}

// One Claude caller for the whole run, counting the calls each step really makes.
function claudeFor(cfg) {
  const ask = makeClaude({ bin: cfg.claudeBin, model: cfg.claudeModel });
  const counts = { mustSee: 0, caption: 0, compare: 0 };
  const counted = (step) => (prompt, opts) => {
    counts[step]++;
    return ask(prompt, opts);
  };
  return { counts, mustSee: counted("mustSee"), caption: counted("caption"), compare: counted("compare") };
}

// Every Claude step, in order; a word whose step fails drops out of the later
// steps and carries the cause. Returns { lists, captions, lines, failed: word → cause }.
async function prepare(cfg, kept, argv, claude) {
  const jobs = cfg.claudeJobs;
  const failed = {};
  const live = () => kept.filter((w) => !failed[w.word]);
  const out = {};

  const lists = await mustSeeLists({ words: kept, ask: claude.mustSee, jobs, ...cached(cfg, "must-see.json") });
  for (const [word, error] of Object.entries(lists.failures)) failed[word] = `must-see list failed: ${error}`;
  out.lists = lists.cache;
  if (argv.includes("--must-see-only")) return { ...out, failed };

  const caps = await captionGrids({ words: live(), lists: out.lists, imageDir: cfg.imageDir, ask: claude.caption, jobs, ...cached(cfg, "captions.json") });
  for (const w of live()) if (caps.failures[w.grid]) failed[w.word] = `caption failed for cell ${caps.failures[w.grid].cell}: ${caps.failures[w.grid].error}`;
  out.captions = caps.cache;
  if (argv.includes("--caption-only")) return { ...out, failed };

  const seed = readJsonOr(cfg.sp064DifferencesFile, {});
  const diffs = await compareGrids({ words: live(), lists: out.lists, imageDir: cfg.imageDir, ask: claude.compare, jobs, seed, ...cached(cfg, "differences.json") });
  process.stderr.write(`sp-066: compare lines: ${diffs.reused.length} reused from SP-064, ${diffs.made.length} made\n`);
  for (const w of live()) if (diffs.failures[w.grid]) failed[w.word] = `grid differences failed: ${diffs.failures[w.grid]}`;
  out.lines = Object.fromEntries(Object.entries(diffs.cache).map(([g, e]) => [g, linesOf(e)]));
  return { ...out, failed };
}

// Jev's pick for each given word. A word with a failed Claude step or a Jev
// failure is unjudged, with the cause. Returns { words, jevCalls }.
async function judge(cfg, kept, prepared, tuning) {
  const rubric = loadRubric();
  const jevCache = cached(cfg, "jev.json");
  let jevCalls = 0;
  const words = kept.map((g) => ({ word: g.word, grid: g.grid, flashCell: g.flashCell, story: g.story, tuning: tuning.has(g.word) }));
  await pool(words, cfg.jevJobs, async (w) => {
    if (prepared.failed[w.word]) {
      w.unjudged = prepared.failed[w.word];
      return;
    }
    const list = prepared.lists[w.word];
    try {
      const { fromCache, ...pick } = await pickCell(
        { word: w.word, story: w.story, items: list.items, isSequence: list.isSequence, angleCase: list.angleCase, captions: prepared.captions[w.grid], lines: prepared.lines[w.grid] },
        { rubric, ...jevCache },
      );
      if (!fromCache) jevCalls++;
      w.pick = pick;
    } catch (err) {
      if (!(err instanceof jev.JevError)) throw err;
      jevCalls++;
      w.unjudged = err.message;
    }
  });
  return { words, jevCalls };
}

// Saves the given words into <out>/run.json: each replaces its old entry; the
// words keep the split's order (tuning order, then the measure set).
function mergeRun(cfg, split, words) {
  const file = outFile(cfg, "run.json");
  const old = readJsonOr(file, { words: [] });
  const byWord = new Map(old.words.map((w) => [w.word, w]));
  for (const w of words) byWord.set(w.word, w);
  const order = [...(split.tuningOrder || split.tuning), ...split.measure];
  const rank = (w) => (order.includes(w) ? order.indexOf(w) : order.length);
  const run = { date: new Date().toISOString().slice(0, 10), seed: split.seed, words: [...byWord.values()].sort((a, b) => rank(a.word) - rank(b.word)) };
  writeJson(file, run);
  return run;
}

// The split, saved in <out>/split.json; a saved tuning order is kept while the
// tuning set is the same.
function makeSplit(cfg, kept, outcomes) {
  const words = kept.map((g) => g.word);
  const s = drawSplit(words, new Set(words.filter((w) => outcomes[w] && outcomes[w].hit)), { size: cfg.tuningSize });
  const old = readJsonOr(outFile(cfg, "split.json"), null);
  const same = old && JSON.stringify(old.tuning) === JSON.stringify(s.tuning) && old.seed === s.seed;
  const split = { ...s, ...(same && old.tuningOrder ? { tuningOrder: old.tuningOrder, earlyPicks: old.earlyPicks, missingEarlyPicks: old.missingEarlyPicks } : {}) };
  writeJson(outFile(cfg, "split.json"), split);
  return split;
}

const earlyText = (split) =>
  split.earlyPicks && split.earlyPicks.length ? split.earlyPicks.map((e) => `${e.word} (${e.roles.join(", ")})`).join(", ") : "none";

function splitText(split, outcomes) {
  const hits = split.tuning.filter((w) => outcomes[w] && outcomes[w].hit);
  const lines = [
    `split (seed ${split.seed}): tuning: ${split.tuning.length} words (${hits.length} SP-064 hit${hits.length === 1 ? "" : "s"}); measure: ${split.measure.length} words`,
    `tuning words (draw order): ${split.tuning.join(", ")}`,
    `SP-064 hits among them: ${hits.join(", ") || "none"}`,
  ];
  if (split.tuningOrder) {
    lines.push(`tuning order: ${split.tuningOrder.join(", ")}`);
    lines.push(`early picks: ${earlyText(split)}`);
    if (split.missingEarlyPicks && split.missingEarlyPicks.length) lines.push(`no tuning word for: ${split.missingEarlyPicks.join(", ")}`);
  } else lines.push("tuning order: not made yet (the first tuning stage makes it from the must-see lists)");
  return lines.join("\n") + "\n";
}

// The tuning order needs every tuning word's must-see list; it is fixed in
// split.json once all of them exist.
async function ensureTuningOrder(cfg, split, kept, outcomes, claude) {
  if (split.tuningOrder) return split;
  const byWord = new Map(kept.map((g) => [g.word, g]));
  const tuningKept = split.tuning.map((w) => byWord.get(w));
  const lists = await mustSeeLists({ words: tuningKept, ask: claude.mustSee, jobs: cfg.claudeJobs, ...cached(cfg, "must-see.json") });
  const o = tuningOrder(tuningKept, { sp064: outcomes, lists: lists.cache });
  const done = split.tuning.every((w) => lists.cache[w]);
  const next = { ...split, tuningOrder: o.order, earlyPicks: o.early, missingEarlyPicks: o.missing };
  if (done) writeJson(outFile(cfg, "split.json"), next);
  return next;
}

// The stage summary on stdout, from the stage's words and the caches.
function printSummary(cfg, { stage, words, total, split, outcomes, claude, jevCalls }) {
  const lists = readJsonOr(outFile(cfg, "must-see.json"), {});
  const captions = readJsonOr(outFile(cfg, "captions.json"), {});
  process.stdout.write(stageSummary({ stage, words, total, split, outcomes, lists, captions, claudeCounts: claude.counts, jevCalls }));
}

async function tuningStage(cfg, argv, { grids, split, outcomes }) {
  if (fs.existsSync(outFile(cfg, "weights.json"))) {
    throw new StopError("sp-066: the weights are fixed on the tuning words (raw/weights.json), so the tuning stage is closed.\n");
  }
  const limit = flagValue(argv, "--limit");
  const list = flagValue(argv, "--words");
  if (limit !== undefined && list !== undefined) throw new StopError(`give --limit or --words, not both\n${USAGE}`, 2);
  if (limit !== undefined && !/^[1-9]\d*$/.test(limit)) throw new StopError(`--limit needs a whole number above 0: ${limit}\n`, 2);
  const wanted = list !== undefined ? list.split(",").map((w) => w.trim()).filter(Boolean) : null;
  const notTuning = wanted ? wanted.filter((w) => !split.tuning.includes(w)) : [];
  if (notTuning.length) throw new StopError(`not a tuning word: ${notTuning.join(", ")}\n`, 2);

  const claude = claudeFor(cfg);
  const s = await ensureTuningOrder(cfg, split, grids.kept, outcomes, claude);
  const chosen = wanted || s.tuningOrder.slice(0, limit === undefined ? s.tuningOrder.length : Number(limit));
  const byWord = new Map(grids.kept.map((g) => [g.word, g]));
  const kept = chosen.map((w) => byWord.get(w));
  const prepared = await prepare(cfg, kept, argv, claude);
  for (const [word, cause] of Object.entries(prepared.failed)) process.stderr.write(`${word}: ${cause}\n`);
  if (["--must-see-only", "--caption-only", "--compare-only"].some((f) => argv.includes(f))) {
    process.stdout.write(`tuning stage (${argv.find((a) => a.endsWith("-only"))}): ${kept.length} of ${s.tuning.length} tuning words\nearly picks: ${earlyText(s)}\n`);
    return 0;
  }
  const { words, jevCalls } = await judge(cfg, kept, prepared, new Set(s.tuning));
  mergeRun(cfg, s, words);
  printSummary(cfg, { stage: "tuning", words, total: s.tuning.length, split: s, outcomes, claude, jevCalls });
  return 0;
}

async function measureStage(cfg, argv, { grids, split, outcomes }) {
  if (argv.includes("--limit") || argv.includes("--words")) throw new StopError(`the measure stage runs every measure word at once: no --limit or --words\n${USAGE}`, 2);
  const weightsFile = outFile(cfg, "weights.json");
  const old = readJsonOr(outFile(cfg, "run.json"), { words: [] });
  if (!fs.existsSync(weightsFile)) {
    const ran = new Set(old.words.filter((w) => w.tuning && (w.pick || w.unjudged)).map((w) => w.word));
    const missing = split.tuning.filter((w) => !ran.has(w));
    if (missing.length) {
      throw new StopError(`sp-066: tuning isn't done: ${missing.length} of ${split.tuning.length} tuning words not run yet (${missing.join(", ")}). Run --stage tuning first.\n`);
    }
    const tuningRun = old.words.filter((w) => w.tuning && !w.unjudged);
    writeJson(weightsFile, {
      weights: tuneWeights(tuningRun),
      tuningWords: split.tuning,
      judgedTuningWords: tuningRun.map((w) => w.word),
      fixedAt: new Date().toISOString(),
    });
  }
  const judged = new Set(old.words.filter((w) => !w.tuning && w.pick).map((w) => w.word));
  const byWord = new Map(grids.kept.map((g) => [g.word, g]));
  const kept = split.measure.filter((w) => !judged.has(w)).map((w) => byWord.get(w));
  const claude = claudeFor(cfg);
  const prepared = await prepare(cfg, kept, argv, claude);
  for (const [word, cause] of Object.entries(prepared.failed)) process.stderr.write(`${word}: ${cause}\n`);
  if (["--must-see-only", "--caption-only", "--compare-only"].some((f) => argv.includes(f))) return 0;
  const { words, jevCalls } = await judge(cfg, kept, prepared, new Set(split.tuning));
  const run = mergeRun(cfg, split, words);
  writeReport(cfg);
  const unjudged = run.words.filter((w) => w.unjudged).length;
  printSummary(cfg, { stage: "measure", words, total: split.measure.length, split, outcomes, claude, jevCalls });
  process.stderr.write(`sp-066: ${run.words.length} words, ${unjudged} unjudged → ${cfg.reportFile}\n`);
  return 0;
}

// The report, always from the saved run.json and weights.json — no Claude or Jev call.
function writeReport(cfg) {
  const run = readJson(outFile(cfg, "run.json"));
  const fixed = readJsonOr(outFile(cfg, "weights.json"), null);
  const sp029 = readJsonOr(cfg.sp029RunFile, null);
  const sp064 = readJsonOr(cfg.sp064RunFile, null);
  fs.mkdirSync(path.dirname(cfg.reportFile), { recursive: true });
  fs.writeFileSync(cfg.reportFile, renderReport(run, { sp029, sp064, weights: fixed && fixed.weights }));
}

async function main(argv) {
  const cfg = config();
  if (argv.includes("--report")) {
    writeReport(cfg);
    return 0;
  }
  const grids = readJson(cfg.gridsFile);
  const outcomes = sp064Outcomes(readJsonOr(cfg.sp064RunFile, { words: [] }));
  const split = makeSplit(cfg, grids.kept, outcomes);
  if (argv.includes("--split")) {
    process.stdout.write(splitText(split, outcomes));
    return 0;
  }
  const stage = argv.includes("--stage") ? flagValue(argv, "--stage") : undefined;
  if (stage !== "tuning" && stage !== "measure") throw new StopError(`${stage === undefined ? "no stage given" : `unknown stage: ${stage}`}\n${USAGE}`, 2);
  try {
    return await (stage === "tuning" ? tuningStage : measureStage)(cfg, argv, { grids, split, outcomes });
  } catch (err) {
    if (!(err instanceof UsageLimitError)) throw err;
    const when = err.resetsAt ? `after ${err.resetsAt}` : "later";
    process.stderr.write(`sp-066: stopped: ${err.message}\nNo report was written. The cached answers are kept, so the next run continues from there. Run it again ${when}.\n`);
    return 1;
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).then(
    (code) => (process.exitCode = code),
    (err) => {
      if (err instanceof StopError) {
        process.stderr.write(err.message);
        process.exitCode = err.code;
        return;
      }
      process.stderr.write(`sp-066: ${err.stack || err.message}\n`);
      process.exitCode = 2;
    },
  );
}

module.exports = { config, prepare, judge, USAGE };
