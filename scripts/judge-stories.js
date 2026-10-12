#!/usr/bin/env node
"use strict";

// US-038 step `judge-stories <word> <sense> <candidates-file> <checks-file> <chunk-keywords-file>`
// (Jev, dags/card.yaml) — judges every candidate that passed check-stories'
// hard gates against the pipeline's own story rubric (scripts/story-rubric.json,
// promoted from SP-037's judge-story without the same-root-anchor gate).
//
// One `systemOne` call per judged candidate, all in parallel, 14 questions:
//   - per judgment gate (vividness, scene-coherence, animal-harm) a summary
//     Noul named `<gate>` plus split-out Nouls named `<gate>.<id>`, yes = pass;
//   - per score axis (anchor, meaning, vivid) a Score over three levels,
//     Jev answering 0–2, so the axis score is that + 1 (total 3–9).
// A Noul passes at p ≥ 0.5; a gate passes when all of its Nouls pass.
//
// Prints one line per candidate, same order as the candidates file:
//   reasons\ttotal\tanchor,meaning,vivid\t<question>=<p>,…
// `reasons` is `-` when the candidate passed every gate, else its hard-gate
// reasons plus each failed judgment gate as `<gate>: <first failing
// question>` (`summary` for the gate's own question), comma-separated. A
// hard-gate fail isn't sent to Jev: its score fields are `-`.
// Exit 2 if any Jev call fails or answers unusably (or the rubric can't be
// read): pick-story then falls back to the first story that passed the hard
// gates, and stderr says so for the run report.

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const fs = require("fs");
const path = require("path");
const { readChunkKeywords } = require("./compose-stories");
const jev = require("./lib/jev");

const RUBRIC_FILE = path.join(__dirname, "story-rubric.json");
const PASS_AT = 0.5;

const lines = (text) => String(text || "").split("\n").filter((l) => l.trim());

function loadRubric(file = RUBRIC_FILE) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// [{ name, gate, id, text }] — the gate's summary first, then its split-outs.
function nouls(rubric) {
  return Object.entries(rubric.gates).flatMap(([gate, g]) => [
    { name: gate, gate, id: "summary", text: g.summary },
    ...Object.entries(g.questions).map(([id, text]) => ({ name: `${gate}.${id}`, gate, id, text })),
  ]);
}

function buildQuestions(rubric) {
  const questions = {};
  for (const q of nouls(rubric)) {
    questions[q.name] = jev.noul(
      [
        "The state holds a one-sentence mnemonic story for an English word: the word, its sense, its IPA chunks with their sound-anchor keywords, the sentence and its pivot words.",
        "Judge the story exactly as written (no rewriting).",
        "",
        q.text,
      ].join("\n")
    );
  }
  for (const [axis, a] of Object.entries(rubric.axes)) {
    questions[axis] = jev.score(
      `The state holds a one-sentence mnemonic story for an English word. Score the story, exactly as written, on the "${a.label}" axis.`,
      a.levels
    );
  }
  return questions;
}

const usable = (x, lo, hi) => typeof x === "number" && Number.isFinite(x) && x >= lo && x <= hi;

// Jev's answers -> { nouls: { name: p }, failedGates: ["gate: id"], axisScores: { axis: 1–3 }, total }.
// Any missing or out-of-range answer is a JevError, never guessed.
function toJudgment(answers, rubric) {
  const ps = {};
  const failedGates = [];
  for (const q of nouls(rubric)) {
    const p = answers && answers[q.name] && answers[q.name].noul;
    if (!usable(p, 0, 1)) throw new jev.JevError(`unusable Jev answer for ${q.name}: ${JSON.stringify(answers && answers[q.name])}`);
    ps[q.name] = p;
    if (p < PASS_AT && !failedGates.some((f) => f.startsWith(`${q.gate}:`))) failedGates.push(`${q.gate}: ${q.id}`);
  }
  const axisScores = {};
  for (const axis of Object.keys(rubric.axes)) {
    const level = answers && answers[axis] && answers[axis].score;
    if (!usable(level, 0, 2)) throw new jev.JevError(`unusable Jev answer for ${axis}: ${JSON.stringify(answers && answers[axis])}`);
    axisScores[axis] = level + 1;
  }
  const total = Object.values(axisScores).reduce((s, x) => s + x, 0);
  return { nouls: ps, failedGates, axisScores, total };
}

// A score for display: at most two decimals, no trailing zeros.
const fmt = (x) => String(Math.round(x * 100) / 100);

function formatLine(hardReasons, judgment) {
  if (!judgment) return `${hardReasons}\t-\t-\t-`;
  const reasons = judgment.failedGates.length ? judgment.failedGates.join(",") : "-";
  const axes = Object.values(judgment.axisScores).map(fmt).join(",");
  const ps = Object.entries(judgment.nouls).map(([n, p]) => `${n}=${p}`).join(",");
  return `${reasons}\t${fmt(judgment.total)}\t${axes}\t${ps}`;
}

async function judgeStories({ word, sense, candidatesText, checksText, chunks }, opts = {}) {
  const rubric = opts.rubric || loadRubric();
  const questions = buildQuestions(rubric);
  const checks = lines(checksText);
  const ipaChunks = chunks.map((c) => ({ ipa: c.ipa, keyword: c.keyword }));
  return Promise.all(
    lines(candidatesText).map(async (line, i) => {
      const hard = (checks[i] || "not checked").trim();
      if (hard !== "-") return formatLine(hard, null);
      const [sentence, pivots = ""] = line.split("\t");
      const state = { word, sense, ipa_chunks: ipaChunks, sentence, pivot_words: pivots.split(",").filter(Boolean) };
      const answers = await jev.systemOne({ state, questions }, opts);
      return formatLine("-", toJudgment(answers, rubric));
    })
  );
}

if (require.main === module) {
  (async () => {
    const [word, sense, candidatesFile, checksFile, keywordsFile] = process.argv.slice(2);
    if (!word || !candidatesFile || !checksFile || !keywordsFile) {
      process.stderr.write("error: usage: judge-stories <word> <sense> <candidates-file> <checks-file> <chunk-keywords-file>\n");
      process.exitCode = 2;
      return;
    }
    try {
      const out = await judgeStories({
        word,
        sense: sense || "",
        candidatesText: fs.readFileSync(candidatesFile, "utf8"),
        checksText: fs.readFileSync(checksFile, "utf8"),
        chunks: readChunkKeywords(fs.readFileSync(keywordsFile, "utf8")),
      });
      for (const l of out) process.stdout.write(`${l}\n`);
    } catch (e) {
      process.stderr.write(`stories not judged: ${e.message}; picked the first that passed the hard gates\n`);
      process.exitCode = 2;
    }
  })();
}

module.exports = { loadRubric, nouls, buildQuestions, toJudgment, formatLine, judgeStories, PASS_AT };
