#!/usr/bin/env node
"use strict";

// US-028/US-038 step `pick-story <candidates-file> <checks-file> <judgments-file|->`
// — the automatic pick.
//   candidates-file: compose-stories output, `sentence\tpivots` per line
//   checks-file:     one line per candidate, same order — `-` when check-story
//                    passed it, otherwise its reasons, comma-separated
//   judgments-file:  judge-stories output, one line per candidate, same order —
//                    `reasons\ttotal\tanchor,meaning,vivid\t<question>=<p>,…`
//                    (`reasons` `-` = passed every gate, hard and judgment)
// With a judgments file the pick is the story that passed every gate with the
// highest rubric total (ties: shorter sentence, then alphabetical), and stderr gets `pick: total N (anchor a, meaning m,
// vivid v)` for the run report. With `-` (judging failed) it falls back to the
// first candidate that passed the hard gates.
// Prints the winning `sentence\tpivots` line. When none passed: exit 1 with a
// `no-pick: …` line, then `sentence\treasons` for every candidate. There is
// no redraft round.

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const fs = require("fs");
const { runCli } = require("./card-lib");

const lines = (text) => text.split("\n").filter((l) => l.trim());

// A judgments line -> { reasons, total, axes: { anchor, meaning, vivid } }.
function parseJudgment(line) {
  const [reasons = "", total = "-", axes = "-"] = String(line || "").split("\t");
  const [anchor, meaning, vivid] = axes.split(",").map(Number);
  return { reasons: reasons.trim() || "not judged", total: Number(total), axes: { anchor, meaning, vivid } };
}

// Total descending, then the shorter sentence, then the alphabetically first
// (plain code-unit order, so every run ranks alike).
function byRank(a, b) {
  if (a.judgment.total !== b.judgment.total) return b.judgment.total - a.judgment.total;
  const [sa, sb] = [a.line.split("\t")[0], b.line.split("\t")[0]];
  if (sa.length !== sb.length) return sa.length - sb.length;
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function pickStory(candidatesText, checksText, judgmentsText = null) {
  const candidates = lines(candidatesText);
  if (judgmentsText === null) {
    const checks = lines(checksText);
    const i = checks.findIndex((c) => c.trim() === "-");
    if (i !== -1 && candidates[i]) return { ok: true, line: candidates[i] };
    return noPick(candidates, checks, "the hard gates");
  }
  const judgments = lines(judgmentsText).map(parseJudgment);
  const ranked = candidates
    .map((line, i) => ({ line, judgment: judgments[i] }))
    .filter((c) => c.judgment && c.judgment.reasons === "-")
    .sort(byRank);
  if (ranked.length) {
    const { line, judgment: j } = ranked[0];
    return { ok: true, line, note: `pick: total ${j.total} (anchor ${j.axes.anchor}, meaning ${j.axes.meaning}, vivid ${j.axes.vivid})` };
  }
  return noPick(candidates, judgments.map((j) => j.reasons), "every gate");
}

function noPick(candidates, reasons, gates) {
  return {
    ok: false,
    reasons: [
      `no-pick: none of ${candidates.length} candidates passed ${gates}`,
      ...candidates.map((c, j) => `${c.split("\t")[0]}\t${(reasons[j] || "not checked").trim()}`),
    ],
  };
}

if (require.main === module) {
  runCli(([candidatesFile, checksFile, judgmentsFile]) => {
    if (!candidatesFile || !checksFile || !judgmentsFile) {
      throw new Error("usage: pick-story <candidates-file> <checks-file> <judgments-file|->");
    }
    const r = pickStory(
      fs.readFileSync(candidatesFile, "utf8"),
      fs.readFileSync(checksFile, "utf8"),
      judgmentsFile === "-" ? null : fs.readFileSync(judgmentsFile, "utf8")
    );
    if (r.note) process.stderr.write(`${r.note}\n`);
    return r.ok ? { lines: [r.line] } : { stop: r.reasons };
  });
}

module.exports = { pickStory, parseJudgment };
