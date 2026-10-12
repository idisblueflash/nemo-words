// US-040 AC1 — an ambiguous word that is plain English gets a story card.
//
// Given a word the classifier calls ambiguous, which is in fact plain English
// (e.g. wary), when Flash runs the one-word command with that word, then a
// story card is made the same way as for any general-English word, and the
// run report says the route was a judgment call and how confident it was.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, waryFixture } = require("./helpers/card-harness");

test("US-040 AC1: card.js cards an ambiguous word Jev judges general, and the report names the judgment call and its p", async () => {
  const h = await createHarness(waryFixture({ word_part: 0.12 }));
  try {
    const run = await h.runCard("wary"); // only a weak -ary suffix match -> `ambiguous`
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);

    // Carded the same way as any general-English word.
    assert.match(run.stdout, /^carded wary \(added\)$/m);
    assert.match(h.readAnkiFile(), /^wary\tThe weary hiker stays careful near the cliff\.\t\tˈwɛ\.ɹi\tcautious about possible danger$/m);
    assert.equal(h.mock.calls.filter((c) => c.action === "addNote").length, 1);

    // The run report says the route was a judgment call, and how confident.
    assert.match(run.stdout, /^note: judge-route: judgment call → general \(p word-part 0\.12\)$/m);

    // Jev was asked the routing question once, about this word and its weak match.
    const routeCalls = h.jev.calls.filter((c) => "word_part" in (c.body.questions || {}));
    assert.equal(routeCalls.length, 1);
    assert.equal(routeCalls[0].body.state.word, "wary");
    assert.deepEqual(routeCalls[0].body.state.matchedParts, ["-ary"]);
  } finally {
    await h.cleanup();
  }
});
