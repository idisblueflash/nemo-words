// US-040 logic-sketch rule: a logged story skips the judgment. An ambiguous
// word Flash already gave a story (data/mnemonics/log.jsonl, e.g. wary) routes
// general with that story, and Jev is not asked to route it.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, waryFixture } = require("./helpers/card-harness");
const { routeWord } = require("../scripts/route");

test("route: a logged ambiguous-verdict word routes general with its logged story", () => {
  const log = [{ word: "wary", sentence: "Wear a careful face.", pivot_words: ["wear", "careful"] }];
  assert.deepEqual(routeWord("wary", { rows: [], log }), {
    route: "general",
    logged: { sentence: "Wear a careful face.", pivots: ["wear", "careful"] },
  });
});

test("route: a logged medical-verdict word still routes word-part (overruling `medical` is US-042)", () => {
  assert.deepEqual(routeWord("nephrectomy", { rows: [], log: [{ word: "nephrectomy", sentence: "x" }] }), { route: "word-part" });
});

test("US-040: card.js cards a logged ambiguous word's logged story with no judgment call", async () => {
  const logged = "The weary hiker stays careful near the cliff.";
  const h = await createHarness(waryFixture({ word_part: 0.84 }), {
    log: [{ word: "wary", sentence: logged, pivot_words: ["weary", "careful"] }],
  });
  try {
    const run = await h.runCard("wary");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /^carded wary \(added\)$/m);
    assert.match(run.stdout, /logged story/);
    assert.doesNotMatch(run.stdout, /judgment call/);
    assert.deepEqual(h.jev.calls, []);
  } finally {
    await h.cleanup();
  }
});
