#!/usr/bin/env node
"use strict";

// SP-052 spike run: does NOAD find as many exact sound anchors as CMU?
//
//   node spikes/sp-052/run.js [--seed 52] [--sample-size 200]
//
// Needs the NOAD extract first: `python3 dictionaries/noad/extract.py`.
// Writes spikes/sp-052/report.md (counts and word lists only, committed) and
// dictionaries/noad/data/sp-052-detail.tsv (per-word IPA, gitignored).
//
// Overrides (tests use them): --card-file, --log-file, --extract-dir,
// --report, --detail, --findings (hand-written findings.md, put in just before
// the verdict); NEMO_WORDS_BIN and NEMO_WORD_FREQ_BIN as in the card
// pipeline. Exit 0 report written; 2 error (including a missing extract).

require("../../scripts/lib/step-contract"); // a crash exits 2
const fs = require("node:fs");
const path = require("node:path");

const { FREQ_THRESHOLD } = require("../../scripts/find-keywords");
const { buildWordSet } = require("./lib/wordset");
const { parseExtract, buildIndex, headwordsWithIpa } = require("./lib/noad");
const { analyse } = require("./lib/analyse");
const { loadCmu, cmuWords } = require("./lib/cmu");
const { makeFreqs } = require("./lib/freq");
const { renderReport, detailTsv } = require("./lib/report");
const { coverageNote, inflectionNote, erNote, pickErRule } = require("./lib/notes");

const REPO = path.join(__dirname, "..", "..");

function parseArgs(argv) {
  const opts = {
    cardFile: path.join(REPO, "anki", "reading-room-terms.txt"),
    logFile: path.join(REPO, "data", "mnemonics", "log.jsonl"),
    extractDir: path.join(REPO, "dictionaries", "noad", "data"),
    report: path.join(__dirname, "report.md"),
    detail: null,
    findings: path.join(__dirname, "findings.md"),
    seed: 52,
    sampleSize: 200,
  };
  const keys = {
    "--card-file": "cardFile",
    "--log-file": "logFile",
    "--extract-dir": "extractDir",
    "--report": "report",
    "--detail": "detail",
    "--findings": "findings",
    "--seed": "seed",
    "--sample-size": "sampleSize",
  };
  for (let i = 0; i < argv.length; i++) {
    const key = keys[argv[i]];
    if (!key) throw new Error(`unknown option ${argv[i]}`);
    opts[key] = argv[++i];
  }
  opts.seed = Number(opts.seed);
  opts.sampleSize = Number(opts.sampleSize);
  opts.detail = opts.detail || path.join(opts.extractDir, "sp-052-detail.tsv");
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const extractFile = path.join(opts.extractDir, "noad.tsv");
  if (!fs.existsSync(extractFile)) {
    process.stderr.write(
      `error: the NOAD extract is missing (${extractFile}).\n` +
        "Build it from the Mac's own dictionary first: python3 dictionaries/noad/extract.py\n"
    );
    process.exit(2);
  }
  const noad = buildIndex(parseExtract(fs.readFileSync(extractFile, "utf8")));
  const cmu = loadCmu();
  const freqsFor = makeFreqs(path.join(opts.extractDir, "freq-cache.tsv"));

  const cmuSet = cmuWords(cmu);
  const pool = [...headwordsWithIpa(noad)].filter((w) => cmuSet.has(w));
  const wordSet = buildWordSet({
    cardText: fs.readFileSync(opts.cardFile, "utf8"),
    logText: fs.readFileSync(opts.logFile, "utf8"),
    pool,
    sampleSize: opts.sampleSize,
    seed: opts.seed,
    threshold: FREQ_THRESHOLD,
    freqsFor,
  });

  // The ər-before-a-vowel rule is measured both ways; the better one is used.
  const study = {
    onset: analyse({ words: wordSet.words, noad, cmu, freqsFor, er: "onset" }),
    nucleus: analyse({ words: wordSet.words, noad, cmu, freqsFor, er: "nucleus" }),
  };
  const rule = pickErRule(study);
  const results = study[rule];
  const notes = [coverageNote(noad, results), inflectionNote(results), erNote({ study, rule, noad })];
  fs.writeFileSync(opts.detail, detailTsv(results));
  const findings = fs.existsSync(opts.findings) ? fs.readFileSync(opts.findings, "utf8") : null;
  fs.writeFileSync(opts.report, renderReport({ wordSet, results, notes, findings }));
  process.stdout.write(`report: ${opts.report}\ndetail: ${opts.detail}\n`);
}

main();
