"use strict";

// Hard gates in code, from US-028's `check-story` rules. US-028's check-story
// isn't on main yet, so the inflection rules here are reimplemented from the
// US-028 backlog item ("no headword or inflection, case-insensitive, whole
// word"), matching the regular-inflection set US-028's work in progress uses.

// Every regular inflection of `base` (plural/3sg, past, -ing, comparative,
// superlative), with the usual e-drop, y->i and final-consonant doubling.
function inflections(base) {
  const b = base.toLowerCase();
  const forms = new Set([b, `${b}s`, `${b}es`, `${b}ed`, `${b}ing`, `${b}er`, `${b}est`]);
  if (b.endsWith("e")) {
    const stem = b.slice(0, -1);
    for (const s of ["d", "r", "st"]) forms.add(b + s);
    forms.add(`${stem}ing`);
  }
  if (/[^aeiou]y$/.test(b)) {
    const stem = b.slice(0, -1);
    for (const s of ["ies", "ied", "ier", "iest"]) forms.add(stem + s);
  }
  if (/[^aeiou][aeiou][^aeiouwxy]$/.test(b)) {
    const last = b[b.length - 1];
    for (const s of ["ed", "ing", "er", "est"]) forms.add(b + last + s);
  }
  return forms;
}

// A word part like "-glob-" or "tax-" is matched on its letters.
function headwordBase(word) {
  return word.toLowerCase().replace(/[^a-z' ]/g, "").trim();
}

function isInflectionOf(token, base) {
  return inflections(base).has(token.toLowerCase());
}

// Lowercase word tokens, possessive 's dropped.
function tokens(sentence) {
  return (sentence.toLowerCase().match(/[a-z]+(?:'[a-z]+)*/g) || []).map((t) => t.replace(/'s$/, ""));
}

// The headword (or an inflection of it) as a whole word in the sentence, or null.
function headwordHit(word, sentence) {
  const base = headwordBase(word);
  if (!base) return null;
  return tokens(sentence).find((t) => isInflectionOf(t, base)) || null;
}

const MAX_WORDS = 10;

const sameWord = (a, b) => isInflectionOf(a, b) || isInflectionOf(b, a);

// Index of the first run of sentence tokens matching the (possibly
// multi-word) pivot, or -1.
function pivotPosition(toks, pivot) {
  const want = tokens(pivot);
  if (!want.length) return -1;
  for (let i = 0; i + want.length <= toks.length; i++) {
    if (want.every((w, k) => sameWord(toks[i + k], w))) return i;
  }
  return -1;
}

// A combo pivot like "company + tense" is two pivots.
function splitPivots(pivots) {
  return pivots.flatMap((p) => p.split("+")).map((p) => p.trim()).filter(Boolean);
}

function pivotOrderReasons(toks, pivots) {
  const reasons = [];
  let prev = null;
  for (const p of splitPivots(pivots)) {
    const pos = pivotPosition(toks, p);
    if (pos === -1) {
      reasons.push(`pivot-missing: ${p}`);
      continue;
    }
    if (prev && pos < prev.pos) reasons.push(`pivot-order: ${p} before ${prev.p}`);
    prev = { p, pos };
  }
  return reasons;
}

// Hard gates, in code, before Jev: headword, ≤ 10 words, pivot order.
// [] = pass; otherwise one `gate: detail` reason per failure.
function hardGateReasons({ word, sentence, pivots }) {
  const reasons = [];
  const hit = headwordHit(word, sentence);
  if (hit) reasons.push(`headword: ${hit}`);
  const count = sentence.trim().split(/\s+/).filter(Boolean).length; // same as `wc -w`
  if (count > MAX_WORDS) reasons.push(`word-count: ${count} > ${MAX_WORDS}`);
  reasons.push(...pivotOrderReasons(tokens(sentence), pivots));
  return reasons;
}

module.exports = { inflections, isInflectionOf, tokens, headwordHit, hardGateReasons, splitPivots };
