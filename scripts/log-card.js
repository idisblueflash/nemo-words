#!/usr/bin/env node
"use strict";

// US-039 step `log-card` (code, dags/card.yaml) — records the auto-made card
// in the mnemonic log (data/mnemonics/log.jsonl, or NEMO_MNEMONIC_LOG) as one
// `_logan` row (.claude/agents/_logan/reference-tables.md) with
// `picked_by: "auto"`.
//
// Usage:
//   log-card <word> <story-file> <candidates-file> <checks-file> <tags-file>
//            <define-file> <syllabify-file> <chunk-file> <chunk-keywords-file>
// Each file is that step's stdout: story (`sentence\tpivots\tpicked`),
// tag-technique (`tag\tp`, p descending; `-` instead of a file when Jev
// failed: the row is logged with `technique: []` and a note on stderr), define (line 2 = the sense),
// syllabify (`dʒɚ.ˈmeɪn`), chunk (`ipa\tanchorUnits`), find-keywords
// (`ipa\tkeyword\tfreq` or `ipa\t-`).
//
// It also appends one entry to data/mnemonics/alternates.jsonl (or
// NEMO_ALTERNATES_LOG): the word, the chosen sentence, `picked_by: "auto"`, the
// date and the runner-ups — every other compose-stories candidate with its
// pivot words and reject reasons. <checks-file> is judge-stories' judgments
// file when judging ran (its first column is read), else check-stories' checks
// file.
//
// The row is validated before anything is written; on failure: exit 1 with
// one reason per line on stdout, and nothing written. Prints
// `logged\t<word>\t<n> runner-ups` on success.

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const fs = require("fs");
const path = require("path");
const { runCli, REPO_ROOT } = require("./card-lib");
const { readChunkKeywords } = require("./compose-stories");
const { tokens, isInflectionOf } = require("./check-story");
const vocab = require("./lib/logan-vocab");

const lines = (text) => String(text || "").split("\n").filter((l) => l.trim());
const list = (field) => String(field || "").split(",").map((s) => s.trim()).filter(Boolean);

// Ranked `[{ tag, p }]` -> the tags to log: story-chain only with 3+ pivot
// words; then the top tag, plus the second only if its p ≥ 0.5.
const SECOND_TAG_AT = 0.5;
function chooseTags(ranked, pivots) {
  const eligible = ranked.filter((t) => t.tag !== "story-chain" || pivots.length >= 3);
  const chosen = eligible.slice(0, 1).map((t) => t.tag);
  if (eligible[1] && eligible[1].p >= SECOND_TAG_AT) chosen.push(eligible[1].tag);
  return chosen;
}

function parseTags(text) {
  return lines(text).map((l) => {
    const [tag, p] = l.split("\t");
    return { tag, p: Number(p) };
  });
}

// chunks: [{ anchorUnits, keyword|null, match? }] in syllable order.
// US-046: a rhyme on the stressed chunk (find-keywords' `rime`) is a `rime`
// anchor; so is a word rhyme (US-063, `word-rime`), as Flash's levee -> heavy row.
function anchorUnit(chunks) {
  const stressed = chunks.length === 1 ? chunks[0] : chunks.find((c) => c.anchorUnits.includes("stressed-syllable"));
  if (stressed && stressed.keyword && (stressed.match === "rime" || stressed.match === "word-rime")) return "rime";
  if (chunks.length === 1) return "whole-word";
  if (stressed && stressed.keyword) return "stressed-syllable";
  const first = chunks.find((c) => c.keyword);
  return first ? first.anchorUnits[0] || "" : "";
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildRow({ word, storyText, defineText, syllablesText, chunkText, keywordsText, tags, date = today() }) {
  const [sentence = "", pivots = ""] = lines(storyText)[0].split("\t");
  const keywords = readChunkKeywords(keywordsText);
  const chunks = lines(chunkText).map((l, i) => {
    const [, units] = l.split("\t");
    return { anchorUnits: list(units), keyword: keywords[i] ? keywords[i].keyword : null, match: keywords[i] && keywords[i].match };
  });
  const defineLines = String(defineText || "").split("\n");
  return {
    word,
    syllabification: lines(syllablesText)[0].split(".").filter(Boolean),
    anchor_unit: anchorUnit(chunks),
    keyword: chunks.filter((c) => c.keyword).map((c) => c.keyword).join(" / "),
    sense: (defineLines[1] || "").trim(),
    sentence,
    pivot_words: list(pivots),
    technique: tags,
    recall_check: null,
    date,
    picked_by: "auto",
  };
}

// The runner-ups: every candidate (compose-stories' `sentence\tpivots` lines)
// except the picked sentence, in draft order, each with its reject reasons
// (`-` = passed every gate -> []). The reasons come from the first column of
// judge-stories' judgments file when judging ran (hard gates plus failed
// judgment gates, US-038), else from check-stories' checks file (hard gates
// only). US-031 offers only the ones with no reasons.
// US-041: a runner-up is any candidate whose *sentence* differs from the
// picked one (exact string compare). Pivot words don't count: a candidate
// repeating the picked sentence with other pivots is the same story, so it is
// dropped. Duplicates among the runner-ups themselves are kept as drafted.
function runnerUps(candidatesText, checksText, pickedSentence) {
  const checks = lines(checksText);
  return lines(candidatesText)
    .map((line, i) => {
      const [sentence, pivots = ""] = line.split("\t");
      const check = (checks[i] || "").split("\t")[0].trim();
      return { sentence, pivot_words: list(pivots), reject_reasons: check === "-" ? [] : list(check) };
    })
    .filter((c) => c.sentence !== pickedSentence);
}

const alternatesEntry = (row, alternates) => ({
  word: row.word,
  chosen: row.sentence,
  picked_by: "auto",
  date: row.date,
  alternates,
});

const REQUIRED = ["word", "syllabification", "anchor_unit", "keyword", "sense", "sentence", "pivot_words"];
const MAX_TAGS = 2;

function validateRow(row) {
  const { anchorUnits, techniques } = vocab.load();
  const reasons = [];
  for (const f of REQUIRED) {
    const v = row[f];
    if (Array.isArray(v) ? v.length === 0 : !String(v || "").trim()) reasons.push(`${f}: empty`);
  }
  if (row.anchor_unit && !anchorUnits.some((u) => u.value === row.anchor_unit)) {
    reasons.push(`anchor_unit: ${row.anchor_unit} is not in _logan's controlled list`);
  }
  if (row.technique.length > MAX_TAGS) reasons.push(`technique: ${row.technique.length} tags, at most ${MAX_TAGS}`);
  for (const t of row.technique) {
    if (!techniques.some((x) => x.value === t)) reasons.push(`technique: ${t} is not in _logan's controlled list`);
  }
  const hit = tokens(row.sentence || "").find((t) => isInflectionOf(t, row.word));
  if (hit) reasons.push(`headword: ${hit}`);
  return reasons;
}

const mnemonicLogPath = () => process.env.NEMO_MNEMONIC_LOG || path.join(REPO_ROOT, "data", "mnemonics", "log.jsonl");
const alternatesLogPath = () =>
  process.env.NEMO_ALTERNATES_LOG || path.join(REPO_ROOT, "data", "mnemonics", "alternates.jsonl");

function appendJsonl(file, obj) {
  let prefix = "";
  if (fs.existsSync(file)) {
    const text = fs.readFileSync(file, "utf8");
    if (text && !text.endsWith("\n")) prefix = "\n";
  }
  fs.appendFileSync(file, `${prefix}${JSON.stringify(obj)}\n`);
}

if (require.main === module) {
  runCli((args) => {
    const [word, storyFile, candidatesFile, checksFile, tagsFile, defineFile, syllablesFile, chunkFile, keywordsFile] = args;
    if (args.length < 9 || !word) {
      throw new Error(
        "usage: log-card <word> <story-file> <candidates-file> <checks-file> <tags-file> <define-file> <syllabify-file> <chunk-file> <chunk-keywords-file>"
      );
    }
    const read = (f) => fs.readFileSync(f, "utf8");
    const storyText = read(storyFile);
    const pivots = list(lines(storyText)[0].split("\t")[1]);
    const jevFailed = tagsFile === "-";
    const row = buildRow({
      word,
      storyText,
      defineText: read(defineFile),
      syllablesText: read(syllablesFile),
      chunkText: read(chunkFile),
      keywordsText: read(keywordsFile),
      tags: jevFailed ? [] : chooseTags(parseTags(read(tagsFile)), pivots),
    });
    const reasons = validateRow(row);
    if (reasons.length) {
      // The run goes on to sync the card, so the report's notes (stderr) are
      // where Flash sees that it wasn't logged.
      process.stderr.write(`not logged: ${reasons.join("; ")}\n`);
      return { stop: reasons };
    }
    const alternates = runnerUps(read(candidatesFile), read(checksFile), row.sentence);
    // Alternates first, then the log row: a crash in between leaves only an
    // orphan alternates line, harmless since lookups are by word.
    appendJsonl(alternatesLogPath(), alternatesEntry(row, alternates));
    appendJsonl(mnemonicLogPath(), row);
    // stderr lands in the run report as a `note: log-card: …` line
    if (jevFailed) process.stderr.write("technique tags missing: Jev could not tag this story; logged with technique []\n");
    return { lines: [`logged\t${word}\t${alternates.length} runner-ups`] };
  });
}

module.exports = { chooseTags, parseTags, anchorUnit, buildRow, validateRow, runnerUps, alternatesEntry };
