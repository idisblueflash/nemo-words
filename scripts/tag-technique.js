#!/usr/bin/env node
"use strict";

// US-039 step `tag-technique <word> <sentence> <pivots> <chunk-keywords-file>`
// (Jev, dags/card.yaml) — how likely each of _logan's controlled `technique`
// tags (.claude/agents/_logan/reference-tables.md) describes the picked story.
// One `systemOne` call holding one Noul (yes/no) question per tag, each worded
// from that tag's definition in _logan's table; the state is the word, the
// sentence, its pivot words and the IPA chunks with their keywords.
// Prints one line per tag, `tag\tp`, sorted by p descending. Choosing which
// tags to log is log-card's job. Exit 2 if Jev fails (not configured,
// unreachable, an error, or an unusable answer) — log-card then logs no tags.

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const fs = require("fs");
const { runCli } = require("./card-lib");
const { readChunkKeywords } = require("./compose-stories");
const vocab = require("./lib/logan-vocab");
const jev = require("./lib/jev");

function techniqueQuestions(techniques) {
  const questions = {};
  for (const t of techniques) {
    questions[t.value] = jev.noul(
      [
        "The state holds a one-sentence mnemonic story for an English word, its pivot words and the word's IPA chunks with their sound-anchor keywords.",
        `Does the mnemonic technique "${t.value}" describe how this story works? That technique is defined as:`,
        "",
        t.explanation,
      ].join("\n")
    );
  }
  return questions;
}

const usable = (p) => typeof p === "number" && Number.isFinite(p) && p >= 0 && p <= 1;

function rankTags(answers, techniques) {
  return techniques
    .map((t) => {
      const p = answers && answers[t.value] && answers[t.value].noul;
      if (!usable(p)) throw new jev.JevError(`unusable Jev answer for ${t.value}: ${JSON.stringify(answers && answers[t.value])}`);
      return { tag: t.value, p };
    })
    .sort((a, b) => b.p - a.p);
}

async function tagTechnique({ word, sentence, pivots, chunks }, opts = {}) {
  const { techniques } = vocab.load();
  const answers = await jev.systemOne(
    {
      state: { word, sentence, pivot_words: pivots, ipa_chunks: chunks.map((c) => ({ ipa: c.ipa, keyword: c.keyword })) },
      questions: techniqueQuestions(techniques),
    },
    opts
  );
  return rankTags(answers, techniques);
}

if (require.main === module) {
  runCli(async ([word, sentence, pivots, keywordsFile]) => {
    if (!word || !sentence || !keywordsFile) {
      throw new Error("usage: tag-technique <word> <sentence> <pivots> <chunk-keywords-file>");
    }
    const tags = await tagTechnique({
      word,
      sentence,
      pivots: (pivots || "").split(",").filter(Boolean),
      chunks: readChunkKeywords(fs.readFileSync(keywordsFile, "utf8")),
    });
    return { lines: tags.map((t) => `${t.tag}\t${t.p}`) };
  });
}

module.exports = { techniqueQuestions, rankTags, tagTechnique };
