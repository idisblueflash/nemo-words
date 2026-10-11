#!/usr/bin/env node
"use strict";

// SP-037 prototype step `judge-story <word> <sense> <sentence> <pivots> <chunk-keywords-file>`
// (EN-036 step contract). stdout: one line per gate `gate\tpass|fail\tp`, one
// per axis `axis\tscore`, then `total\tN`. Hard gates (headword, ≤ 10 words,
// pivot order) run in code first: a failure exits 1 with one `gate: detail`
// reason per line and Jev isn't called. Exit 2 if Jev fails or answers
// unusably (error on stderr).

const fs = require("node:fs");
const { loadRubric, GATE_NAMES, AXIS_NAMES } = require("./lib/rubric");
const { askJev, toJudgment } = require("./lib/judge");
const { hardGateReasons } = require("./lib/gates");
const { makeClient } = require("./lib/jev-client");

// chunk-keywords file: one chunk per line, `ipa[\tkeyword[\t…]]`, keyword `-` = none.
function readChunks(text) {
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      const [ipa, keyword] = l.split("\t");
      return { ipa: ipa.trim(), keyword: keyword && keyword.trim() !== "-" ? keyword.trim() : null };
    });
}

function judgeInput([word, sense, sentence, pivots, chunksFile]) {
  const chunks = readChunks(fs.readFileSync(chunksFile, "utf8"));
  return {
    word,
    sense,
    sentence,
    pivots: (pivots || "").split(",").map((p) => p.trim()).filter(Boolean),
    ipaChunks: chunks.map((c) => c.ipa),
    chunkKeywords: chunks.filter((c) => c.keyword).map((c) => ({ ipa: c.ipa, keyword: c.keyword })),
  };
}

function formatJudgment(j) {
  return [
    ...GATE_NAMES.map((g) => `${g}\t${j.gateResults[g].pass ? "pass" : "fail"}\t${j.gateResults[g].p.toFixed(3)}`),
    ...AXIS_NAMES.map((a) => `${a}\t${j.axisScores[a].toFixed(2)}`),
    `total\t${j.total.toFixed(2)}`,
  ];
}

async function main(argv) {
  if (argv.length < 5) {
    process.stderr.write("usage: judge-story <word> <sense> <sentence> <pivots> <chunk-keywords-file>\n");
    return 2;
  }
  try {
    const input = judgeInput(argv);
    const reasons = hardGateReasons(input);
    if (reasons.length) {
      process.stdout.write(reasons.join("\n") + "\n");
      return 1;
    }
    const answers = await askJev({ client: makeClient(), rubric: loadRubric(), input });
    process.stdout.write(formatJudgment(toJudgment(answers)).join("\n") + "\n");
    return 0;
  } catch (err) {
    process.stderr.write(`judge-story: ${err.message}\n`);
    return 2;
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => (process.exitCode = code));
}

module.exports = { readChunks, judgeInput, formatJudgment };
