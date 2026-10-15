#!/usr/bin/env node
"use strict";

// SP-029 spike run: match → caption → judge-image → report.
//
//   node spikes/sp-029/run.js --match-only    find Flash's cells, list the grids left out
//   node spikes/sp-029/run.js --caption-only  … and caption every cell of the kept grids
//   node spikes/sp-029/run.js                 … and judge each kept word in two rounds (Jev), and write the report
//   node spikes/sp-029/run.js --report        rebuild the report from raw/run.json, no calls
//
// Paths and knobs (env vars, defaults in brackets):
//   SP029_IMAGE_DIR    the grids and crops                  [<repo>/images/mnemonic]
//   SP029_CARD_FILE    the card file                        [<repo>/anki/reading-room-terms.txt]
//   NEMO_MNEMONIC_LOG  the mnemonic log                     [<repo>/data/mnemonics/log.jsonl]
//   SP029_OUT_DIR      raw results and the caption cache    [spikes/sp-029/raw]
//   SP029_REPORT       the report                           [<repo>/docs/backlog/reports/SP-029-auto-image-pick.md]
//   SP029_CAPTION_BIN  the captioner, run like claude -p    [claude]
//   SP029_CAPTION_MODEL / SP029_CAPTION_JOBS               [sonnet / 6]
//   SP029_JEV_JOBS     words judged at once                 [4]
//   NEMO_JEV_ENV_FILE  env file with TYPESAFE_API_KEY       [<repo>/.env, via scripts/lib/jev.js]

const fs = require("node:fs");
const path = require("node:path");

const { makeLookup } = require("./lib/sources");
const { matchGrids } = require("./lib/grids");
const { makeCaptioner, captionGrids, pool } = require("./lib/caption");
const { judgeImage } = require("./lib/judge-image");
const { renderReport } = require("./lib/report");
const { blindSection } = require("./lib/blind");
const jev = require("../../scripts/lib/jev");

const HERE = __dirname;
const REPO = path.join(HERE, "..", "..");

function config(env = process.env) {
  return {
    imageDir: env.SP029_IMAGE_DIR || path.join(REPO, "images", "mnemonic"),
    cardFile: env.SP029_CARD_FILE || path.join(REPO, "anki", "reading-room-terms.txt"),
    logFile: env.NEMO_MNEMONIC_LOG || path.join(REPO, "data", "mnemonics", "log.jsonl"),
    outDir: env.SP029_OUT_DIR || path.join(HERE, "raw"),
    reportFile: env.SP029_REPORT || path.join(REPO, "docs", "backlog", "reports", "SP-029-auto-image-pick.md"),
    captionBin: env.SP029_CAPTION_BIN || "claude",
    captionModel: env.SP029_CAPTION_MODEL || "sonnet",
    captionJobs: Number(env.SP029_CAPTION_JOBS || 6),
    jevJobs: Number(env.SP029_JEV_JOBS || 4),
  };
}

const writeJson = (f, data) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(data, null, 2) + "\n");
};
const readJsonOr = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : fallback);

function match(cfg) {
  const lookup = makeLookup(fs.readFileSync(cfg.cardFile, "utf8"), fs.readFileSync(cfg.logFile, "utf8"));
  const grids = matchGrids({ imageDir: cfg.imageDir, lookup });
  writeJson(path.join(cfg.outDir, "grids.json"), grids);
  return grids;
}

// Captions every kept grid, through the cache; saves the cache after each caption.
async function caption(cfg, grids) {
  const cacheFile = path.join(cfg.outDir, "captions.json");
  return captionGrids({
    kept: grids.kept,
    imageDir: cfg.imageDir,
    captioner: makeCaptioner({ bin: cfg.captionBin, model: cfg.captionModel }),
    cache: readJsonOr(cacheFile, {}),
    jobs: cfg.captionJobs,
    onCaption: (cache) => writeJson(cacheFile, cache),
  });
}

// Jev's two-round pick for each kept word; the raw run goes to <out>/run.json.
// A word with a failed caption (`failures`: grid → { cell, error }) or a Jev
// failure is unjudged, with the cause; nothing is guessed for it.
async function judge(cfg, grids, captions, failures = {}) {
  const words = grids.kept.map((g) => ({ word: g.word, grid: g.grid, flashCell: g.flashCell, distance: g.distance, story: g.story }));
  await pool(words, cfg.jevJobs, async (w) => {
    const failed = failures[w.grid];
    if (failed) {
      w.unjudged = `caption failed for cell ${failed.cell}: ${failed.error}`;
      return;
    }
    try {
      w.judgment = await judgeImage({ word: w.word, story: w.story, captions: captions[w.grid] || {} });
    } catch (err) {
      if (!(err instanceof jev.JevError)) throw err;
      w.unjudged = err.message;
    }
  });
  const run = { date: new Date().toISOString().slice(0, 10), words, leftOut: grids.leftOut };
  writeJson(path.join(cfg.outDir, "run.json"), run);
  return run;
}

// The report, always from the saved run.json — no captioner or Jev call.
function writeReport(cfg) {
  const run = JSON.parse(fs.readFileSync(path.join(cfg.outDir, "run.json"), "utf8"));
  // the blind check's share, once blind.js --prepare has run (AC5)
  const blind = blindSection(
    readJsonOr(path.join(cfg.outDir, "blind-pairs.json"), null),
    readJsonOr(path.join(cfg.outDir, "blind-choices.json"), {}),
  );
  fs.mkdirSync(path.dirname(cfg.reportFile), { recursive: true });
  fs.writeFileSync(cfg.reportFile, renderReport(run, { blind }));
}

function matchLines({ kept, leftOut }) {
  return [
    ...kept.map((g) => ["kept", g.word, g.grid, g.flashCell, g.distance, g.next].join("\t")),
    ...leftOut.map((g) => ["left-out", g.grid, g.reason].join("\t")),
  ];
}

async function main(argv) {
  const cfg = config();
  if (argv.includes("--report")) {
    writeReport(cfg);
    return 0;
  }
  if (argv.includes("--match-only")) {
    process.stdout.write(matchLines(match(cfg)).join("\n") + "\n");
    return 0;
  }
  const grids = match(cfg);
  const { cache, failures } = await caption(cfg, grids);
  if (argv.includes("--caption-only")) {
    const failed = Object.keys(failures).length;
    for (const [grid, f] of Object.entries(failures)) process.stderr.write(`caption failed: ${grid} cell ${f.cell}: ${f.error}\n`);
    process.stderr.write(`sp-029: captioned ${grids.kept.length - failed} of ${grids.kept.length} grids\n`);
    return 0;
  }
  const run = await judge(cfg, grids, cache, failures);
  writeReport(cfg);
  const unjudged = run.words.filter((w) => w.unjudged).length;
  process.stderr.write(`sp-029: ${run.words.length} words, ${unjudged} unjudged → ${cfg.reportFile}\n`);
  return 0;
}

if (require.main === module) {
  main(process.argv.slice(2)).then(
    (code) => (process.exitCode = code),
    (err) => {
      process.stderr.write(`sp-029: ${err.stack || err.message}\n`);
      process.exitCode = 2;
    },
  );
}

module.exports = { config, match, caption, judge, matchLines };
