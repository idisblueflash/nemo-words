"use strict";

// `draft` step: fresh story candidates from `claude -p`, on a prompt built
// from `_nemo.md`'s process, gates and core technique. Given only the word,
// sense and IPA — never Flash's story, keyword or pivots.

const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");

const NEMO_MD = path.join(__dirname, "..", "..", "..", ".claude", "agents", "_nemo.md");

// `_nemo.md` from "## The process, in order" up to (not including) "## Finding
// anchor candidates" — the process, sense lock, every "Before you return"
// gate and the core technique.
function nemoRubric(text = fs.readFileSync(NEMO_MD, "utf8")) {
  const start = text.indexOf("## The process, in order");
  const end = text.indexOf("## Finding anchor candidates");
  return text.slice(start, end).trim();
}

function buildDraftPrompt(tw, count, rubric = nemoRubric()) {
  return [
    `You are drafting mnemonic story candidates for one word, following the rubric below (it is the`,
    `_nemo agent's process and gates). You have no tools: where the rubric says to run a CLI`,
    `(nemo-words, rhyme.py, word-freq.js, wc -w), apply that check from your own knowledge of US`,
    `(General American) pronunciation and common English words instead.`,
    ``,
    `Word: ${tw.word}`,
    `Sense: ${tw.sense}`,
    `IPA (GA), one syllable per chunk: ${tw.syllables.join(" . ")}`,
    ``,
    `--- rubric ---`,
    rubric,
    `--- end rubric ---`,
    ``,
    `Output format — this overrides the rubric's own output format. Print exactly ${count} lines`,
    `and nothing else (no heading, numbering, commentary or code fence). Each line is:`,
    `<sentence><TAB><pivot_words comma-separated, in anchor order>`,
  ].join("\n");
}

// Keeps only `sentence<TAB>pivots` lines; strips list numbering.
function parseDraftOutput(out) {
  return out
    .split("\n")
    .filter((l) => l.includes("\t"))
    .map((l) => {
      const [sentence, pivots = ""] = l.split("\t");
      return {
        sentence: sentence.replace(/^\s*\d+[.)]\s*/, "").trim(),
        pivot_words: pivots
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
      };
    })
    .filter((c) => c.sentence);
}

function execClaude(args) {
  return new Promise((resolve, reject) => {
    execFile("claude", args, { maxBuffer: 1 << 20, timeout: 300000 }, (err, stdout, stderr) =>
      err ? reject(new Error(`claude -p failed: ${err.message} ${stderr}`)) : resolve(stdout),
    );
  });
}

function makeClaudeDraft({ exec = execClaude, model = "sonnet" } = {}) {
  return async (tw, count) => {
    const out = await exec(["-p", buildDraftPrompt(tw, count), "--model", model, "--tools", ""]);
    return parseDraftOutput(out).slice(0, count);
  };
}

module.exports = { buildDraftPrompt, parseDraftOutput, makeClaudeDraft, nemoRubric };
