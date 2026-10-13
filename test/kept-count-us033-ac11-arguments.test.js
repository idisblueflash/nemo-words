// US-033 scenario 11 (bug-013): the kept-count command takes no options.
// "--help" / "-h" print a short usage text and no count; any other argument
// fails with "unknown argument: <arg>" plus the usage text, and no count.
// Either way nothing is read: the log isn't opened and Anki isn't contacted.
//
// Runs the real scripts/kept-count.js against a mock AnkiConnect (never the
// live Anki).

const test = require("node:test");
const assert = require("node:assert/strict");
const { createKeptHarness } = require("./helpers/kept-count-harness");

async function withReviewedCard(fn) {
  const h = await createKeptHarness();
  try {
    h.autoPick("wary", "A wary hare eyes the snare.");
    h.card("wary", h.composed("A wary hare eyes the snare."), { reps: 2 });
    await fn(h);
  } finally {
    await h.close();
  }
}

for (const flag of ["--help", "-h"]) {
  test(`AC11: ${flag} prints the usage text, no count, and reads nothing`, async () => {
    await withReviewedCard(async (h) => {
      const { code, stdout, stderr } = await h.run([flag]);
      assert.equal(code, 0);
      assert.match(stdout, /usage: node scripts\/kept-count\.js/i);
      assert.doesNotMatch(stdout, /kept \d+ of \d+/);
      assert.equal(stderr, "");
      assert.equal(h.mock.calls.length, 0, "Anki isn't contacted");
    });
  });
}

for (const args of [["--last", "10"], ["wary"], ["--helpme"]]) {
  test(`AC11: "${args.join(" ")}" fails with "unknown argument: ${args[0]}" and the usage text`, async () => {
    await withReviewedCard(async (h) => {
      const { code, stdout, stderr } = await h.run(args);
      assert.equal(code, 2);
      assert.match(stderr, new RegExp(`unknown argument: ${args[0]}\\n`));
      assert.match(stderr, /usage: node scripts\/kept-count\.js/i);
      assert.equal(stdout, "", "no count is reported");
      assert.equal(h.mock.calls.length, 0, "Anki isn't contacted");
    });
  });
}

test("AC11: --help wins over an unreadable log (nothing is read)", async () => {
  await withReviewedCard(async (h) => {
    const { code, stdout } = await h.run(["--help"], { NEMO_MNEMONIC_LOG: "/nonexistent/log.jsonl" });
    assert.equal(code, 0);
    assert.match(stdout, /usage:/i);
  });
});
