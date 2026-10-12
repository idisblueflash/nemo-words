#!/usr/bin/env node
"use strict";

// US-040 step `judge-route <route-file> <word>` (Jev, dags/card.yaml) — runs
// right after `route`, and its stdout replaces route's as the route later
// steps read. A route line other than `ambiguous\t<matched parts>` passes
// through unchanged, with no Jev call. An ambiguous one is a judgment call:
// one `systemOne` call with one Noul question, "is this word built from
// classical Greek/Latin morphemes or an INN drug stem?", answered by
// pWordPart (the p of the word-part path):
//   pWordPart <= 0.3 -> prints `general`, exit 0; a stderr note for the run
//                       report, `judgment call → general (p word-part 0.12)`.
//   pWordPart >= 0.7 -> exit 1, `word-part: <word> belongs to the word-part
//                       path (_etta_mology) — judgment call, p 0.84`.
//   in between       -> exit 1, `ambiguous: <word> couldn't be routed
//                       automatically — judgment call unsure, p 0.55`.
// Jev failing (not configured, unreachable, an error, an unusable answer) is
// exit 2, `routing failed: judgment service unavailable (<cause>); re-run later`.

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const fs = require("fs");
const { runCli } = require("./card-lib");
const jev = require("./lib/jev");

const QUESTION = "word_part";
const WORD_PART_MIN = 0.7; // pWordPart at or above: word-part
const GENERAL_MAX = 0.3; // at or below: general; in between: unsure

const usable = (p) => typeof p === "number" && Number.isFinite(p) && p >= 0 && p <= 1;

function routeQuestion() {
  return {
    [QUESTION]: jev.noul(
      [
        "The state holds an English word and the word-part suffixes a word list matched in it (matchedParts; all weak: generic endings such as -ary or -ous that nearly any English word can carry).",
        "Is this word built from classical Greek/Latin morphemes or an INN drug stem, so that breaking it into parts teaches it better than a story?",
        "",
        "The rule: morpheme structure decides, not domain. A general word built from classical parts belongs to the word-part path as much as a medical one; a word whose only match is a weak ending does not.",
        "- adjoining: yes (ad- + join, a Latin prefix on a Latin root), though it is an everyday word.",
        "- wary: no (plain English; its -ary match is a weak ending only).",
      ].join("\n")
    ),
  };
}

async function judgeRoute({ word, matchedParts }, opts = {}) {
  const answers = await jev.systemOne({ state: { word, matchedParts }, questions: routeQuestion() }, opts);
  const pWordPart = answers && answers[QUESTION] && answers[QUESTION].noul;
  if (!usable(pWordPart)) throw new jev.JevError(`unusable Jev answer: ${JSON.stringify(answers && answers[QUESTION])}`);
  return { verdict: verdictFor(pWordPart), pWordPart };
}

// The cut-offs are parameters only so route-accuracy.js can try others.
function verdictFor(pWordPart, { generalMax = GENERAL_MAX, wordPartMin = WORD_PART_MIN } = {}) {
  if (pWordPart >= wordPartMin) return "word-part";
  if (pWordPart <= generalMax) return "general";
  return "unsure";
}

const firstLine = (text) => text.split("\n").find((l) => l.trim()) || "";

if (require.main === module) {
  runCli(async ([routeFile, word]) => {
    if (!routeFile || !word) throw new Error("usage: judge-route <route-file> <word>");
    const line = firstLine(fs.readFileSync(routeFile, "utf8"));
    const [route, parts = ""] = line.split("\t");
    if (route !== "ambiguous") return { lines: [line] };
    let j;
    try {
      j = await judgeRoute({ word, matchedParts: parts.split(",").filter(Boolean) });
    } catch (e) {
      if (!(e instanceof jev.JevError)) throw e;
      // A failure, not a stop (exit 2): nothing has been written yet, so a re-run is safe.
      process.stderr.write(`routing failed: judgment service unavailable (${e.message}); re-run later\n`);
      process.exitCode = 2;
      return {};
    }
    if (j.verdict === "word-part") {
      return { stop: [`word-part: ${word} belongs to the word-part path (_etta_mology) — judgment call, p ${j.pWordPart}`] };
    }
    if (j.verdict === "unsure") {
      return { stop: [`ambiguous: ${word} couldn't be routed automatically — judgment call unsure, p ${j.pWordPart}`] };
    }
    process.stderr.write(`judgment call → general (p word-part ${j.pWordPart})\n`);
    return { lines: ["general"] };
  });
}

module.exports = { routeQuestion, judgeRoute, verdictFor, GENERAL_MAX, WORD_PART_MIN };
