"use strict";

// Blind check after the no-go: for each judged word, Flash's logged story vs
// Jev's top pick, shown unlabelled on seeded sides. Flash picks the one he'd
// rather have on the card (or "same"). The question it answers isn't "does
// Jev agree with Flash" but "would Flash accept what Jev picks".

const { scoreWords } = require("./report");
const { mulberry32, seedFor, shuffle } = require("./rng");

// Jev's pick is acceptable on a word if Flash chose it or called it a tie;
// go if that holds for at least half the answered words. Fixed before Flash answers.
const BLIND_BAR = 0.5;
const SIDES = ["left", "right"];

function buildPairs(raw, { seed = raw.seed ?? 37, passAt } = {}) {
  const rows = scoreWords(raw, passAt).filter((r) => !r.unjudged && r.ranked[0].source !== "flash");
  // Flash's story on the left for exactly half the words (seeded), so a
  // habit of picking one side can't tilt the result.
  const flashLeftAt = shuffle(rows.map((_, i) => i < rows.length / 2), mulberry32(seedFor(seed, "blind")));
  return rows.map((r, i) => {
    const w = raw.words.find((x) => x.word === r.word);
    const flash = { source: "flash", sentence: r.ranked.find((c) => c.source === "flash").sentence };
    const jev = { source: "jev", sentence: r.ranked[0].sentence };
    const [left, right] = flashLeftAt[i] ? [flash, jev] : [jev, flash];
    return { word: r.word, sense: w.sense, ipa: (w.syllables || []).join("."), left, right };
  });
}

// What the page gets: no sources.
function publicPairs(pairs) {
  return pairs.map(({ word, sense, ipa, left, right }) => ({ word, sense, ipa, left: left.sentence, right: right.sentence }));
}

function recordChoice(choices, pairs, word, side, at = new Date().toISOString()) {
  const p = pairs.find((x) => x.word === word);
  if (!p) throw new Error(`unknown word: ${word}`);
  if (![...SIDES, "same"].includes(side)) throw new Error(`side must be left, right or same, got ${side}`);
  const pick = side === "same" ? "same" : p[side].source;
  return { ...choices, [word]: { pick, side, at } };
}

// Counts only once every pair is answered, so the page can't leak a running score.
function tally(pairs, choices) {
  const answered = pairs.filter((p) => choices[p.word]).length;
  const total = pairs.length;
  if (answered < total) return { answered, total, complete: false };
  const count = (pick) => pairs.filter((p) => choices[p.word].pick === pick).length;
  const t = { answered, total, complete: true, flash: count("flash"), jev: count("jev"), same: count("same") };
  t.jevOkRate = total ? (t.jev + t.same) / total : 0;
  t.go = total > 0 && t.jevOkRate >= BLIND_BAR;
  return t;
}

module.exports = { buildPairs, publicPairs, recordChoice, tally, BLIND_BAR };
