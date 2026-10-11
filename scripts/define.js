#!/usr/bin/env node
"use strict";

// US-028 step `define <word>` (claude -p) — the word's plain meaning, after
// english-word-explainer Step 1. Prints:
//   line 1: primarySense (one word — the story must contain it)
//   line 2: definition
//   line 3: all senses, comma-separated

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const { runCli, claude, flatten, extractJson } = require("./card-lib");

function definePrompt(word) {
  return [
    "Step: define",
    `Define the English word "${word}" in plain language for an adult learner.`,
    "Reply with JSON only, no prose:",
    '{"primarySense": "<ONE common English word that names the word\'s main meaning, not the word itself or a form of it>",',
    ' "definition": "<one plain sentence>",',
    ' "senses": ["<one or two words per sense, most common first>"]}',
  ].join("\n");
}

function parseDefinition(text) {
  const j = extractJson(text);
  const primarySense = flatten(j.primarySense).toLowerCase();
  if (!/^[a-z'-]+$/.test(primarySense)) {
    throw new Error(`primarySense must be one word, got "${primarySense}"`);
  }
  const definition = flatten(j.definition);
  if (!definition) throw new Error("model returned an empty definition");
  const senses = (Array.isArray(j.senses) ? j.senses : []).map((s) => flatten(s).replace(/,/g, ";")).filter(Boolean);
  return { primarySense, definition, senses };
}

if (require.main === module) {
  runCli(([word]) => {
    if (!word) throw new Error("usage: define <word>");
    const d = parseDefinition(claude(definePrompt(word)));
    return { lines: [d.primarySense, d.definition, d.senses.join(",")] };
  });
}

module.exports = { parseDefinition, definePrompt };
