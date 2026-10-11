"use strict";

// A 20-word fake mnemonic log, a fake `draft` step and a fake Jev client with
// a scripted outcome per word, for driving `runSpike` end-to-end offline.
//
//   words 0–9   Flash's story scores 9/9          → ranks 1st
//   words 10–13 Flash 8/9, a fresh "STAR" 9/9     → ranks 2nd
//   words 14–17 Flash fails the vividness gate    → ranks below every passer
//   words 18–19 Flash's story is over 10 words    → hard-gate miss

const WORDS = Array.from({ length: 20 }, (_, i) => `zq${String.fromCharCode(97 + i)}`);

function fakeLogText() {
  return WORDS.map((word, i) =>
    JSON.stringify({
      word,
      syllabification: ["zɪk", "kju"],
      keyword: "zick",
      sense: `sense of ${word}`,
      sentence:
        i >= 18
          ? "Flash wrote this one long ago, so it runs well past ten words."
          : `Flash story ${i}.`,
      pivot_words: ["Flash"],
      technique: [],
      date: "2026-10-01",
    }),
  ).join("\n");
}

function fakeDraft() {
  return async (tw, count) => {
    const i = WORDS.indexOf(tw.word);
    return Array.from({ length: count }, (_, k) => ({
      sentence: i >= 10 && i <= 13 && k === 0 ? `A STAR pick here.` : `Fresh pick number ${k} here.`,
      pivot_words: ["pick"],
    }));
  };
}

const level = (score) => ({ type: "score", score, confidence: 1, legend: {}, probabilities: {} });
const gate = (noul) => ({ type: "noul", noul });

function answersFor(state, questions) {
  const i = WORDS.indexOf(state.word);
  const flash = state.sentence.startsWith("Flash");
  const star = state.sentence.includes("STAR");
  const answers = {};
  for (const [name, q] of Object.entries(questions)) {
    if (q.type === "noul") answers[name] = gate(flash && i >= 14 && i <= 17 && name === "vividness" ? 0.2 : 0.9);
    else answers[name] = level(star ? 2 : flash ? (i >= 10 && i <= 13 && name === "vivid" ? 1 : 2) : 1);
  }
  return answers;
}

// `failOn(state)` → truthy to make that call throw (AC5).
function fakeJev({ failOn = () => false, mangle = null } = {}) {
  const calls = [];
  return {
    calls,
    async systemOne({ state, questions }) {
      calls.push(state);
      if (failOn(state)) throw Object.assign(new Error("Typesafe is not available in your region."), { status: 451 });
      const answers = answersFor(state, questions);
      return { model: "jev-fake", answers: mangle ? mangle(state, answers) : answers, usage: {} };
    },
  };
}

module.exports = { WORDS, fakeLogText, fakeDraft, fakeJev };
