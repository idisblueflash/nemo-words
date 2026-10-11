"use strict";

// Hard gates in code (US-028's check-story rules, as the spike uses them):
// headword, ≤ 10 words, pivot order. Checked before Jev is asked anything.

const test = require("node:test");
const assert = require("node:assert/strict");

const { hardGateReasons, headwordHit } = require("../lib/gates");

const ok = { word: "creak", sentence: "Beside the creek, the rotten dock groans under my boots.", pivots: ["creek", "rotten", "dock", "groans"] };

test("a clean story passes every hard gate", () => {
  assert.deepEqual(hardGateReasons(ok), []);
});

test("headword: the word or an inflection, whole word, case-insensitive", () => {
  assert.equal(headwordHit("drown", "The flood Drowned the church."), "drowned");
  assert.equal(headwordHit("carry", "She carries it."), "carries");
  assert.equal(headwordHit("tax-", "The tax clerk."), "tax");
  assert.equal(headwordHit("robe", "From the wardrobe she runs."), null, "not a substring hit");
  assert.deepEqual(hardGateReasons({ ...ok, sentence: "The dock creaked under boots.", pivots: ["dock"] }), ["headword: creaked"]);
});

test("word count: more than 10 words fails (counted like `wc -w`)", () => {
  const s = "The company climber holds the rope tense, trusted to catch a fall.";
  assert.deepEqual(hardGateReasons({ word: "competence", sentence: s, pivots: ["company", "tense"] }), ["word-count: 12 > 10"]);
});

test("pivot order: each pivot appears, in the listed order", () => {
  assert.deepEqual(hardGateReasons({ ...ok, pivots: ["rotten", "creek"] }), ["pivot-order: creek before rotten"]);
  assert.deepEqual(hardGateReasons({ ...ok, pivots: ["creek", "swamp"] }), ["pivot-missing: swamp"]);
});

test("pivot match is case-insensitive, allows an inflection, and multi-word pivots", () => {
  assert.deepEqual(hardGateReasons({ ...ok, pivots: ["Creek", "groan"] }), []);
  assert.deepEqual(hardGateReasons({ ...ok, pivots: ["rotten dock", "boots"] }), []);
});

test("a combo keyword like `company + tense` splits on `+` into separate pivots", () => {
  const s = "The company rope held tense.";
  assert.deepEqual(hardGateReasons({ word: "competence", sentence: s, pivots: ["company + tense"] }), []);
});
