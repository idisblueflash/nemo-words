"use strict";

// The blind check after a no-go (SP-029 AC5, ADR-0027): up to 20 words where
// Jev's cell isn't Flash's, each shown as two cells side by side, unlabelled.
// Flash's cell is on the left for exactly half the words (seeded), so a habit
// of picking one side can't tilt the share. He picks one, or "about the
// same". The question: would Flash accept Jev's cell anyway?

const { summarize } = require("./report");
const { mulberry32, seedFor, shuffle } = require("./rng");

const SEED = 29;
const SIZE = 20;
const SIDES = ["left", "right"];

function buildPairs(run, { seed = SEED, n = SIZE } = {}) {
  const missed = summarize(run).judged.filter((r) => !r.exact);
  const chosen = shuffle(missed, mulberry32(seedFor(seed, "words"))).slice(0, n);
  const flashLeftAt = shuffle(chosen.map((_, i) => i < chosen.length / 2), mulberry32(seedFor(seed, "sides")));
  return chosen.map((r, i) => {
    const flash = { source: "flash", cell: r.flashCell };
    const jev = { source: "jev", cell: r.finalCell };
    const [left, right] = flashLeftAt[i] ? [flash, jev] : [jev, flash];
    return { id: String(i + 1), word: r.word, story: r.story, grid: r.grid, left, right };
  });
}

// What the page gets: no sources, no cells, no grid.
const publicPairs = (pairs) => pairs.map(({ id, word, story }) => ({ id, word, story }));

function recordChoice(choices, pairs, id, side, at = new Date().toISOString()) {
  const p = pairs.find((x) => x.id === String(id));
  if (!p) throw new Error(`unknown pair: ${id}`);
  if (![...SIDES, "same"].includes(side)) throw new Error(`side must be left, right or same, got ${side}`);
  const pick = side === "same" ? "same" : p[side].source;
  return { ...choices, [p.word]: { pick, side, at } };
}

// Counts only once every pair is answered, so the page can't leak a running share.
function tally(pairs, choices) {
  const total = pairs.length;
  const answered = pairs.filter((p) => choices[p.word]).length;
  if (answered < total) return { answered, total, complete: false };
  const count = (pick) => pairs.filter((p) => choices[p.word].pick === pick).length;
  const t = { answered, total, complete: true, jev: count("jev"), same: count("same"), flash: count("flash") };
  t.jevOk = t.jev + t.same;
  t.jevOkRate = total ? t.jevOk / total : 0;
  return t;
}

// The report's blind-check section (null when there is no blind check yet).
function blindSection(pairs, choices) {
  if (!pairs) return null;
  const t = tally(pairs, choices || {});
  const head = [
    "## Blind check",
    "",
    `${t.total} words where Jev's cell wasn't Flash's. Flash saw both cells side by side, unlabelled, his own on the left for half the words, and chose one or rated them about the same.`,
    "",
  ];
  if (!t.complete) return [...head, `Not finished: ${t.answered} of ${t.total} answered. The share is shown once every word is answered.`];
  return [
    ...head,
    `Jev's cell chosen or rated about the same: ${t.jevOk} of ${t.total} (${(t.jevOkRate * 100).toFixed(1)}%)`,
    "",
    `- Jev's cell chosen: ${t.jev}`,
    `- About the same: ${t.same}`,
    `- Flash's cell chosen: ${t.flash}`,
  ];
}

module.exports = { buildPairs, publicPairs, recordChoice, tally, blindSection, SIZE };
