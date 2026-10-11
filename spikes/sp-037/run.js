#!/usr/bin/env node
"use strict";

// SP-037 spike run: sample → draft → judge-story → rank → report.
//
//   node spikes/sp-037/run.js [--n 20] [--seed 37]   full run (claude -p + Jev)
//   node spikes/sp-037/run.js --report [--pass-at 0.6]
//                                     rebuild report.md from raw/run.json, no calls
//
// Raw results (every candidate, its source, hard-gate reasons and Jev's raw
// answers) go to raw/run.json; report.md is always derived from that. Each
// word's candidate set is saved to raw/candidate-sets.json as soon as it's
// drafted, and reused on a re-run, so re-judging never redrafts.

const fs = require("node:fs");
const path = require("node:path");

const { readLog, sampleWords } = require("./lib/sample");
const { buildCandidateSet, forJudge } = require("./lib/candidates");
const { hardGateReasons } = require("./lib/gates");
const { askJev, toJudgment, JevError } = require("./lib/judge");
const { loadRubric } = require("./lib/rubric");
const { renderReport } = require("./lib/report");
const { makeClaudeDraft } = require("./lib/draft");
const { makeClient } = require("./lib/jev-client");

const HERE = __dirname;
const LOG = path.join(HERE, "..", "..", "data", "mnemonics", "log.jsonl");

// Hard gates in code; Jev only for candidates that pass them. Throws
// JevError if Jev fails or answers unusably for any candidate.
async function judgeWord(tw, candidates, { client, rubric }) {
  return Promise.all(
    candidates.map(async (c) => {
      const shown = forJudge(c);
      const hardFails = hardGateReasons({ word: tw.word, sentence: shown.sentence, pivots: shown.pivot_words });
      if (hardFails.length) return { ...c, hardFails, answers: null };
      const answers = await askJev({
        client,
        rubric,
        input: { word: tw.word, sense: tw.sense, ipaChunks: tw.syllables, sentence: shown.sentence, pivots: shown.pivot_words },
      });
      toJudgment(answers); // unusable → JevError
      return { ...c, hardFails, answers };
    }),
  );
}

const writeJson = (f, data) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(data, null, 2) + "\n");
};

function writeOut(outDir, raw, passAt) {
  writeJson(path.join(outDir, "raw", "run.json"), raw);
  fs.writeFileSync(path.join(outDir, "report.md"), renderReport(raw, { passAt }));
}

// Rebuild report.md from the saved raw run — no claude -p, no Jev.
function rerender(outDir, passAt) {
  const raw = JSON.parse(fs.readFileSync(path.join(outDir, "raw", "run.json"), "utf8"));
  fs.writeFileSync(path.join(outDir, "report.md"), renderReport(raw, { passAt }));
}

// `candidateSets` (word → candidate set) is filled as words are drafted and
// read back on a re-run; `onSet` lets the caller persist it after each word.
async function runSpike({
  logText,
  n = 20,
  seed = 37,
  draft,
  client,
  rubric = loadRubric(),
  outDir = HERE,
  passAt,
  candidateSets = {},
  onSet = () => {},
}) {
  const raw = { seed, n, words: [] };
  for (const tw of sampleWords(readLog(logText), { n, seed })) {
    if (!candidateSets[tw.word]) {
      candidateSets[tw.word] = await buildCandidateSet(tw, { draft, seed });
      onSet(candidateSets);
    }
    const candidates = candidateSets[tw.word];
    const entry = { word: tw.word, sense: tw.sense, syllables: tw.syllables };
    try {
      entry.candidates = await judgeWord(tw, candidates, { client, rubric });
    } catch (err) {
      if (!(err instanceof JevError)) throw err;
      // the whole word is unjudged — never ranked on partial answers
      entry.unjudged = err.message;
      entry.candidates = candidates.map((c) => ({ ...c, hardFails: null, answers: null }));
    }
    raw.words.push(entry);
  }
  writeOut(outDir, raw, passAt);
  return raw;
}

function arg(argv, name, fallback) {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
}

async function main(argv) {
  const passAt = arg(argv, "--pass-at") === undefined ? undefined : Number(arg(argv, "--pass-at"));
  if (argv.includes("--report")) return rerender(HERE, passAt);
  const setsFile = path.join(HERE, "raw", "candidate-sets.json");
  const candidateSets = fs.existsSync(setsFile) ? JSON.parse(fs.readFileSync(setsFile, "utf8")) : {};
  const raw = await runSpike({
    logText: fs.readFileSync(LOG, "utf8"),
    n: Number(arg(argv, "--n", 20)),
    seed: Number(arg(argv, "--seed", 37)),
    draft: makeClaudeDraft(),
    client: makeClient(),
    passAt,
    candidateSets,
    onSet: (sets) => writeJson(setsFile, sets),
  });
  const unjudged = raw.words.filter((w) => w.unjudged).length;
  process.stderr.write(`sp-037: ${raw.words.length} words, ${unjudged} unjudged → ${path.join(HERE, "report.md")}\n`);
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`sp-037: ${err.stack || err.message}\n`);
    process.exitCode = 2;
  });
}

module.exports = { runSpike, judgeWord, rerender };
