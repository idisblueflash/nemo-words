#!/usr/bin/env node
"use strict";

// US-028 step `pick-story <candidates-file> <checks-file>` — the automatic
// pick: the first candidate that passed every hard gate.
//   candidates-file: compose-stories output, `sentence\tpivots` per line
//   checks-file:     one line per candidate, same order — `-` when check-story
//                    passed it, otherwise its reasons, comma-separated
// Prints the winning `sentence\tpivots` line. When none passed: exit 1 with a
// `no-pick: …` line, then `sentence\treasons` for every candidate. There is
// no redraft round.

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const fs = require("fs");
const { runCli } = require("./card-lib");

const lines = (text) => text.split("\n").filter((l) => l.trim());

function pickStory(candidatesText, checksText) {
  const candidates = lines(candidatesText);
  const checks = lines(checksText);
  const i = checks.findIndex((c) => c.trim() === "-");
  if (i !== -1 && candidates[i]) return { ok: true, line: candidates[i] };
  return {
    ok: false,
    reasons: [
      `no-pick: none of ${candidates.length} candidates passed the hard gates`,
      ...candidates.map((c, j) => `${c.split("\t")[0]}\t${(checks[j] || "not checked").trim()}`),
    ],
  };
}

if (require.main === module) {
  runCli(([candidatesFile, checksFile]) => {
    if (!candidatesFile || !checksFile) throw new Error("usage: pick-story <candidates-file> <checks-file>");
    const r = pickStory(fs.readFileSync(candidatesFile, "utf8"), fs.readFileSync(checksFile, "utf8"));
    return r.ok ? { lines: [r.line] } : { stop: r.reasons };
  });
}

module.exports = { pickStory };
