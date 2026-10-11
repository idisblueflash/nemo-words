#!/usr/bin/env node
"use strict";

// US-028 step `normalize <word>` — trims the input and rejects empty or
// multi-word input. Prints the word as typed (case kept; Front matching later
// is case-insensitive). Exit 1 with a reason on rejection.

const { runCli } = require("./card-lib");

function normalizeWord(input) {
  const word = String(input || "").trim();
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
