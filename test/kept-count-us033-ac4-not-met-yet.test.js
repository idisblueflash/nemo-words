// US-033 scenario 4: auto-picked words whose cards Flash hasn't reviewed yet
// aren't counted, and the report says how many are "not met yet".
//
// Runs the real scripts/kept-count.js against a mock AnkiConnect.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createKeptHarness } = require("./helpers/kept-count-harness");

const day = (n) => `2026-09-${String(n).padStart(2, "0")}`;

test("AC4: unreviewed auto-picks aren't counted; the report says how many are not met yet", async () => {
  const h = await createKeptHarness();
  try {
    for (let i = 1; i <= 6; i++) {
      h.autoPick(`word${i}`, `Auto story ${i}.`, { date: day(i) });
      h.card(`word${i}`, h.composed(i === 2 ? "Flash's own story." : `Auto story ${i}.`), { reps: 3 });
    }
    // three newer auto-picks with no review yet; one of them was even edited
    for (let i = 7; i <= 9; i++) {
      h.autoPick(`word${i}`, `Auto story ${i}.`, { date: day(i) });
      h.card(`word${i}`, h.composed(i === 8 ? "Edited before any review." : `Auto story ${i}.`), { reps: 0 });
    }
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 0, stderr);
    assert.match(stdout, /^kept 5 of 6 \(83%\)$/m);
    assert.match(stdout, /^not met yet: 3$/m);
    assert.match(stdout, /^14 more needed for a verdict$/m);
    assert.doesNotMatch(stdout, /word8/, "a not-met word is never listed as overridden");
  } finally {
    await h.close();
  }
});

test("AC4: not-met words never take a place in the window of 20", async () => {
  const h = await createKeptHarness();
  try {
    for (let i = 1; i <= 20; i++) {
      h.autoPick(`word${i}`, `Auto story ${i}.`, { date: day(i) });
      h.card(`word${i}`, h.composed(i === 1 ? "Flash's own story." : `Auto story ${i}.`));
    }
    for (let i = 21; i <= 25; i++) {
      h.autoPick(`word${i}`, `Auto story ${i}.`, { date: day(i) });
      h.card(`word${i}`, h.composed(`Auto story ${i}.`), { reps: 0 });
    }
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 0, stderr);
    assert.match(stdout, /^kept 19 of 20 \(95%\)$/m);
    assert.match(stdout, /^meets E01's 70% target$/m);
    assert.match(stdout, /^not met yet: 5$/m);
    assert.match(stdout, /^- word1$/m, "the oldest reviewed word is still inside the window");
  } finally {
    await h.close();
  }
});

test("AC4: a note is not met only when every one of its cards has 0 reviews", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("both-new", "Story one.", { date: day(1) });
    h.card("both-new", h.composed("Story one."), { cards: [0, 0] });
    h.autoPick("one-seen", "Story two.", { date: day(2) });
    h.card("one-seen", h.composed("Story two."), { cards: [0, 4] });
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 0, stderr);
    assert.match(stdout, /^kept 1 of 1 \(100%\)$/m);
    assert.match(stdout, /^not met yet: 1$/m);
  } finally {
    await h.close();
  }
});

test("AC4: with every auto-pick reviewed the report says none are not met yet", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("wary", "Story one.");
    h.card("wary", h.composed("Story one."));
    const { stdout } = await h.run();
    assert.match(stdout, /^not met yet: 0$/m);
  } finally {
    await h.close();
  }
});
