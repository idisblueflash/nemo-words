// US-063 AC3 — the word rhyme is the last fallback (ADR-0029).
//
// Given a word whose stressed chunk gets an anchor today (penalty -> "pen",
// drown -> "down"), when the anchors are found, then no word rhyme is used,
// and every chunk gets the same keyword as before this story.
//
// Each fixture adds a word rhyme that is more frequent than today's anchor,
// so it would win if it ran first.

const test = require("node:test");
const assert = require("node:assert/strict");
const { penaltyFixture, findKeywordsOn, soundFixture } = require("./helpers/us050-fixtures");

test("US-063 AC3: penalty keeps its closed keyword pen and tea; the word rhyme is not used", async () => {
  const fx = penaltyFixture();
  fx.dict.kenalty = "kˈɛnəlti"; // a fixture-only word with penalty's end /ɛnəlti/
  fx.freqs.kenalty = 9e-4;
  const r = await findKeywordsOn(fx, "ˈpɛ.nəl.ti", "penalty");
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stdout, "pɛn\tpen\t2.0000e-5\nnəl\t-\nti\ttea\t4.0000e-5\n");
});

test("US-063 AC3: drown keeps its one-chunk rhyme down; the word rhyme renown is not used", async () => {
  const fx = soundFixture(
    { drown: "dɹˈaʊn", down: "dˈaʊn", town: "tˈaʊn", renown: "ɹɪnˈaʊn" },
    { drown: 4e-6, down: 5e-4, town: 1e-4, renown: 9e-4 }
  );
  const r = await findKeywordsOn(fx, "ˈdɹaʊn", "drown");
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stdout, "dɹaʊn\tdown\t5.0000e-4\trime\n");
});

test("US-063 AC3: germane keeps its exact keyword main; the word rhyme remain is not used", async () => {
  const fx = soundFixture({ germane: "dʒɚmˈeɪn", main: "mˈeɪn", remain: "ɹɪmˈeɪn", obtain: "əbtˈeɪn" }, { main: 1.28e-4, remain: 9e-5, obtain: 5e-4 });
  const r = await findKeywordsOn(fx, "dʒɚ.ˈmeɪn", "germane");
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stdout, "dʒɚ\t-\nmeɪn\tmain\t1.2800e-4\n");
});
