#!/usr/bin/env node
"use strict";

// US-028 step `normalize <word>` — trims the input and rejects empty or
// multi-word input. Prints the word lowercased (US-040), so every later step
// (route, judge-route, the card's Front) sees the lowercase form. Exit 1 with
// a reason on rejection.

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const { runCli } = require("./card-lib");

function normalizeWord(input) {
  const word = String(input || "").trim().toLowerCase();
  if (!word) return { ok: false, reason: "empty input: give one word" };
  if (/\s/.test(word)) return { ok: false, reason: `not one word: "${word}"` };
  return { ok: true, word };
}

if (require.main === module) {
  runCli(([input]) => {
    const r = normalizeWord(input);
    return r.ok ? { lines: [r.word] } : { stop: [r.reason] };
  });
}

module.exports = { normalizeWord };
