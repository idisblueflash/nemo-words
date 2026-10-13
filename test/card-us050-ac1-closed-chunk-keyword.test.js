// US-050 AC1 — a stressed chunk that ends in a short vowel takes the next
// consonant: the closed chunk (C-026).
//
// Given a word whose stressed syllable ends in a short vowel, where the
// syllable plus the next consonant is exactly a common word (penalty
// /ˈpɛ.nəl.ti/: /pɛn/ is "pen"), when Flash runs the one-word command, then
// the card is made, with the story built on "pen" for the stressed chunk, not
// on the rhyme "ye"; and the log row's keyword has "pen" and its anchor unit
// is "stressed-syllable"; and the card's IPA line and the log row's syllables
// still show /ˈpɛ.nəl.ti/.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/card-harness");
const { penaltyFixture, findKeywordsOn } = require("./helpers/us050-fixtures");

test("US-050 AC1: card.js builds penalty's story on the closed chunk's word 'pen', not the rhyme 'ye'", async () => {
  const h = await createHarness(penaltyFixture());
  try {
    const run = await h.runCard("penalty");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /^carded penalty \(added\)$/m);

    // the story was drafted on "pen" as an exact-sound keyword of /pɛn/
    const compose = h.claudeCalls().filter((c) => c.step === "compose-stories");
    assert.equal(compose.length, 1);
    assert.match(compose[0].prompt, /\/pɛn\/ -> "pen"$/m);
    assert.doesNotMatch(compose[0].prompt, /rhymes|"ye"/);

    // the card: the story, and the IPA line still in syllables
    const row = h.readAnkiFile().split("\n").find((l) => l.startsWith("penalty\t"));
    assert.ok(row, h.readAnkiFile());
    const [, back, , ipa] = row.split("\t");
    assert.equal(back, "A pen and no tea was his punishment.");
    assert.equal(ipa, "ˈpɛ.nəl.ti");
    assert.match(h.mock.notes[0].fields.Back, /\/ˈpɛ\.nəl\.ti\//);

    // the log row
    const log = h.readJsonl(h.mnemonicLog);
    assert.equal(log.length, 1);
    assert.equal(log[0].word, "penalty");
    assert.equal(log[0].keyword, "pen / tea");
    assert.equal(log[0].anchor_unit, "stressed-syllable");
    assert.deepEqual(log[0].syllabification, ["ˈpɛ", "nəl", "ti"]);
  } finally {
    await h.cleanup();
  }
});

test("US-050 AC1: find-keywords CLI prints the closed chunk as an exact line, `pɛn\\tpen\\tfreq`", async () => {
  const r = await findKeywordsOn(penaltyFixture(), "ˈpɛ.nəl.ti", "penalty");
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stdout, "pɛn\tpen\t2.0000e-5\nnəl\t-\nti\ttea\t4.0000e-5\n");
});
