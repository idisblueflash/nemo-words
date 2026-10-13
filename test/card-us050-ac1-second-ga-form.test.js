// US-050 AC1 (bug-014) — a closed keyword that matches the closed chunk only
// through a later GA form (elastic: "last" is lˈæst,lˈæs; /læs/ is the second)
// must pass check-stories' anchor-ipa gate, so the card is made.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/card-harness");
const { elasticFixture, claudeFor } = require("./helpers/us050-fixtures");

test("US-050 AC1: card.js makes elastic's card on 'last', whose /læs/ is its second GA form", async () => {
  const fx = elasticFixture();
  fx.claude = claudeFor("stretchy", "The last stick was a stretchy band.", ["last", "stick", "stretchy"]);
  const h = await createHarness(fx);
  try {
    const run = await h.runCard("elastic");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /^carded elastic \(added\)$/m);
    const row = h.readAnkiFile().split("\n").find((l) => l.startsWith("elastic\t"));
    assert.ok(row, h.readAnkiFile());
    assert.equal(row.split("\t")[1], "The last stick was a stretchy band.");
  } finally {
    await h.cleanup();
  }
});
