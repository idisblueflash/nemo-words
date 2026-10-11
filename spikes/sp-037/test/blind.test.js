"use strict";

// The blind check: Flash's logged story vs Jev's pick per word, unlabelled,
// then a tally once every word is answered.

const test = require("node:test");
const assert = require("node:assert/strict");

const { buildPairs, publicPairs, recordChoice, tally, BLIND_BAR } = require("../lib/blind");

// A judged word: Flash's story fails a hard gate, so the fresh one is Jev's pick.
function word(w, { unjudged } = {}) {
  const answers = {
    vividness: { type: "noul", noul: 0.9 },
    "scene-coherence": { type: "noul", noul: 0.9 },
    "same-root-anchor": { type: "noul", noul: 0.9 },
    "animal-harm": { type: "noul", noul: 0.9 },
    anchor: { type: "score", score: 2 },
    meaning: { type: "score", score: 2 },
    vivid: { type: "score", score: 2 },
  };
  if (unjudged) return { word: w, sense: "s", syllables: ["a"], unjudged: "Jev failed", candidates: [] };
  return {
    word: w,
    sense: `sense of ${w}`,
    syllables: ["ˈfoʊ", "bɚ"],
    candidates: [
      { sentence: `flash ${w}`, pivot_words: [], source: "flash", hardFails: ["word-count: 11 words"], answers: null },
      { sentence: `fresh ${w}`, pivot_words: [], source: "fresh", hardFails: [], answers },
    ],
  };
}

const raw = { seed: 37, words: ["alpha", "beta", "gamma", "delta"].map((w) => word(w)) };

test("each judged word pairs Flash's story with Jev's top pick, sides seeded", () => {
  const pairs = buildPairs(raw);
  assert.equal(pairs.length, 4);
  for (const p of pairs) {
    const bySource = Object.fromEntries([p.left, p.right].map((s) => [s.source, s.sentence]));
    assert.deepEqual(bySource, { flash: `flash ${p.word}`, jev: `fresh ${p.word}` });
    assert.equal(p.ipa, "ˈfoʊ.bɚ");
  }
  assert.deepEqual(buildPairs(raw), pairs, "same seed → same sides");
  const sides = pairs.map((p) => p.left.source);
  assert.equal(sides.filter((s) => s === "flash").length, 2, "Flash's story is on the left for exactly half");
});

test("unjudged words and words where Jev already picked Flash's story are skipped", () => {
  const agree = word("same");
  agree.candidates[0].hardFails = [];
  agree.candidates[0].answers = { ...agree.candidates[1].answers, vivid: { type: "score", score: 2 } };
  agree.candidates[0].sentence = "a"; // shorter → wins the tie
  const pairs = buildPairs({ seed: 37, words: [word("gone", { unjudged: true }), agree, word("kept")] });
  assert.deepEqual(pairs.map((p) => p.word), ["kept"]);
});

test("the page sees sentences only, never which side is Flash's", () => {
  const shown = JSON.stringify(publicPairs(buildPairs(raw)));
  assert.doesNotMatch(shown, /"source"|"flash"|"jev"/);
  assert.match(shown, /"left":"(flash|fresh) alpha"/);
});

test("a side choice is stored as whose story it was; bad input is refused", () => {
  const pairs = buildPairs(raw);
  const p = pairs[0];
  const choices = recordChoice({}, pairs, p.word, "left", "2026-10-11T00:00:00Z");
  assert.deepEqual(choices[p.word], { pick: p.left.source, side: "left", at: "2026-10-11T00:00:00Z" });
  assert.equal(recordChoice(choices, pairs, p.word, "same")[p.word].pick, "same", "a later answer replaces the earlier one");
  assert.equal(choices[p.word].pick, p.left.source, "the earlier choices object isn't mutated");
  assert.throws(() => recordChoice({}, pairs, "nope", "left"), /unknown word/);
  assert.throws(() => recordChoice({}, pairs, p.word, "middle"), /side/);
});

test("tally stays hidden until every word is answered, then applies the bar", () => {
  const pairs = buildPairs(raw);
  let choices = {};
  const jevSide = (p) => (p.left.source === "jev" ? "left" : "right");
  const flashSide = (p) => (p.left.source === "flash" ? "left" : "right");
  choices = recordChoice(choices, pairs, pairs[0].word, jevSide(pairs[0]));
  assert.deepEqual(tally(pairs, choices), { answered: 1, total: 4, complete: false });

  choices = recordChoice(choices, pairs, pairs[1].word, "same");
  choices = recordChoice(choices, pairs, pairs[2].word, flashSide(pairs[2]));
  choices = recordChoice(choices, pairs, pairs[3].word, flashSide(pairs[3]));
  const t = tally(pairs, choices);
  assert.equal(t.complete, true);
  assert.deepEqual({ jev: t.jev, same: t.same, flash: t.flash }, { jev: 1, same: 1, flash: 2 });
  assert.equal(t.jevOkRate, 0.5); // Jev's pick chosen or as good
  assert.equal(BLIND_BAR, 0.5);
  assert.equal(t.go, true, "the bar is inclusive");
});
