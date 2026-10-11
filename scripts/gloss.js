#!/usr/bin/env node
"use strict";

// US-028 step `gloss <word> <primarySense> <definition>` (claude -p + a code
// length check) — the card's Gloss column (ADR-0018): one clause of plain
// English, 60 characters max. Exit 1 if the model's gloss is longer; there is
// no redraft round.

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const { runCli, claude, flatten } = require("./card-lib");

const MAX_GLOSS = 60;

function glossPrompt(word, primarySense, definition) {
  return [
    "Step: gloss",
    `Write a gloss for the English word "${word}" (main sense: ${primarySense}; definition: ${definition}).`,
    `One short clause of plain English, ${MAX_GLOSS} characters max, no etymology, no usage notes, no examples,`,
    "and not containing the word itself. Reply with the gloss only.",
  ].join("\n");
}

function checkGloss(text) {
  const gloss = flatten(text).replace(/^["']|["']$/g, "").trim();
  if (!gloss) return { ok: false, reason: "gloss-empty" };
  if (gloss.length > MAX_GLOSS) return { ok: false, reason: `gloss-too-long: ${gloss.length} > ${MAX_GLOSS}: ${gloss}` };
  return { ok: true, gloss };
}

if (require.main === module) {
  runCli(([word, primarySense, definition]) => {
    if (!word || !primarySense || !definition) throw new Error("usage: gloss <word> <primarySense> <definition>");
    const r = checkGloss(claude(glossPrompt(word, primarySense, definition)));
    return r.ok ? { lines: [r.gloss] } : { stop: [r.reason] };
  });
}

module.exports = { checkGloss, MAX_GLOSS };
