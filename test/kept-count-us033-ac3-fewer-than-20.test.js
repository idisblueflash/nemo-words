// US-033 scenario 3: with fewer than 20 reviewed auto-picked words, the
// kept-count command reports the count over the words there are, says how
// many more are needed for a verdict, and gives no verdict.
//
// Runs the real scripts/kept-count.js against a mock AnkiConnect.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createKeptHarness } = require("./helpers/kept-count-harness");

function seed(h, total, overridden) {
  for (let i = 1; i <= total; i++) {
    h.autoPick(`word${i}`, `Auto story ${i}.`, { date: `2026-09-${String(i).padStart(2, "0")}` });
    h.card(`word${i}`, h.composed(overridden.includes(i) ? `Flash's story ${i}.` : `Auto story ${i}.`));
  }
}

test("AC3: 6 reviewed auto-picks → kept 5 of 6, 14 more needed, no verdict", async () => {
  const h = await createKeptHarness();
  try {
    seed(h, 6, [4]);
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 0, stderr);
    assert.match(stdout, /^kept 5 of 6 \(83%\)$/m);
    assert.match(stdout, /^14 more needed for a verdict$/m);
    assert.doesNotMatch(stdout, /target/);
    assert.match(stdout, /^- word4$/m, "the overridden word is still listed");
  } finally {
    await h.close();
  }
});

test("AC3: 19 reviewed auto-picks, all kept → 1 more needed, still no verdict", async () => {
  const h = await createKeptHarness();
  try {
    seed(h, 19, []);
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 0, stderr);
    assert.match(stdout, /^kept 19 of 19 \(100%\)$/m);
    assert.match(stdout, /^1 more needed for a verdict$/m);
    assert.doesNotMatch(stdout, /target/);
  } finally {
    await h.close();
  }
});
