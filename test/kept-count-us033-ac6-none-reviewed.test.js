// US-033 scenario 6: when no auto-picked word has a reviewed card yet, the
// kept-count command stops with "no reviewed auto-picked cards yet" (a clean
// stop, exit 1). An empty log and a log with no auto rows stop the same way.
//
// Runs the real scripts/kept-count.js against a mock AnkiConnect.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createKeptHarness } = require("./helpers/kept-count-harness");

const STOP = /^no reviewed auto-picked cards yet$/m;

test("AC6: auto-picked cards exist but none is reviewed → stops, exit 1", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("wary", "A wary hare eyes the snare.");
    h.card("wary", h.composed("A wary hare eyes the snare."), { reps: 0 });
    h.autoPick("drown", "Down the well the kitten sank.");
    h.card("drown", h.composed("Down the well the kitten sank."), { reps: 0 });

    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 1, stderr);
    assert.match(stdout, STOP);
    assert.match(stdout, /^not met yet: 2$/m);
    assert.doesNotMatch(stdout, /kept \d+ of/);
    assert.equal(stderr, "");
  } finally {
    await h.close();
  }
});

test("AC6: an empty log → the same clean stop, and Anki is never asked", async () => {
  const h = await createKeptHarness();
  try {
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 1, stderr);
    assert.match(stdout, STOP);
    assert.doesNotMatch(stdout, /kept \d+ of/);
    assert.equal(h.mock.calls.length, 0);
  } finally {
    await h.close();
  }
});

test("AC6: a log with only hand-picked rows → the same clean stop", async () => {
  const h = await createKeptHarness();
  try {
    h.log({ word: "wary", sentence: "Flash's own story.", date: "2026-10-01" });
    h.log({ word: "drown", sentence: "Another of Flash's.", date: "2026-10-02", picked_by: "flash" });
    h.card("wary", h.composed("Flash's own story."));
    h.card("drown", h.composed("Another of Flash's."));
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 1, stderr);
    assert.match(stdout, STOP);
    assert.doesNotMatch(stdout, /kept \d+ of/);
  } finally {
    await h.close();
  }
});
