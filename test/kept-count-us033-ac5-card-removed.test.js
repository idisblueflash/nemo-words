// US-033 scenario 5: an auto-picked word whose card was deleted from Anki
// counts as overridden, marked "card removed".
//
// Runs the real scripts/kept-count.js against a mock AnkiConnect.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createKeptHarness } = require("./helpers/kept-count-harness");

test("AC5: a deleted card counts as overridden, marked \"card removed\"", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("wary", "A wary hare eyes the snare.", { date: "2026-10-01" });
    h.card("wary", h.composed("A wary hare eyes the snare."));
    h.autoPick("drown", "Down the well the kitten sank.", { date: "2026-10-02" });
    // no note for "drown": Flash deleted the card

    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 0, stderr);
    assert.match(stdout, /^kept 1 of 2 \(50%\)$/m);
    assert.match(stdout, /^not met yet: 0$/m);
    assert.match(stdout, /^- drown \(card removed\)\n\s+auto-picked: Down the well the kitten sank\.\n\s+now: \(card removed\)$/m);
  } finally {
    await h.close();
  }
});

test("AC5: a card that lives only in another deck is not the word's card → card removed", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("drown", "Down the well the kitten sank.");
    h.card("drown", h.composed("Down the well the kitten sank."), { deck: "Some Other Deck" });
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 0, stderr);
    assert.match(stdout, /^kept 0 of 1 \(0%\)$/m);
    assert.match(stdout, /^- drown \(card removed\)$/m);
  } finally {
    await h.close();
  }
});
