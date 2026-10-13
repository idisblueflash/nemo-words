// US-033 scenario 7: when Anki isn't running, the kept-count command fails
// with "can't reach Anki; re-run with Anki open" and reports no count.
//
// Runs the real scripts/kept-count.js with nothing listening on its
// ANKI_CONNECT_URL (never the live Anki).

const test = require("node:test");
const assert = require("node:assert/strict");
const { createKeptHarness } = require("./helpers/kept-count-harness");

test("AC7: Anki isn't running → fails (exit 2) with the re-run message and no count", async () => {
  const h = await createKeptHarness({ anki: false });
  try {
    h.autoPick("wary", "A wary hare eyes the snare.");
    h.autoPick("drown", "Down the well the kitten sank.");
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 2);
    assert.match(stderr, /can't reach Anki; re-run with Anki open/);
    assert.equal(stdout, "", "no count is reported");
  } finally {
    await h.close();
  }
});
