// US-040 AC9 — a word typed with capital letters is lowercased first.
//
// Given a word typed with capital letters (e.g. WARY or Wary), when Flash runs
// the one-word command with that word, then the word is lowercased before any
// other step, and the card's front, the route and the judgment call all use
// the lowercase word.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, waryFixture } = require("./helpers/card-harness");

for (const typed of ["WARY", "Wary"]) {
  test(`US-040 AC9: card.js lowercases ${typed} before routing, judging and carding it`, async () => {
    const h = await createHarness(waryFixture({ word_part: 0.12 }));
    try {
      const run = await h.runCard(typed);
      assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);

      // The card's front is the lowercase word, in the file and in Anki.
      assert.match(run.stdout, /^carded wary \(added\)$/m);
      assert.match(h.readAnkiFile(), /^wary\t/m);
      assert.doesNotMatch(h.readAnkiFile(), new RegExp(`^${typed}\\t`, "m"));
      const added = h.mock.calls.filter((c) => c.action === "addNote");
      assert.equal(added.length, 1);
      assert.equal(added[0].params.note.fields.Front, "wary");

      // The route (ambiguous, so judged) and the judgment call both use "wary".
      assert.match(run.stdout, /^note: judge-route: judgment call → general \(p word-part 0\.12\)$/m);
      const routeCalls = h.jev.calls.filter((c) => "word_part" in (c.body.questions || {}));
      assert.equal(routeCalls.length, 1);
      assert.equal(routeCalls[0].body.state.word, "wary");
    } finally {
      await h.cleanup();
    }
  });
}
