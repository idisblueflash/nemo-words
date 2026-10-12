// US-041 AC1 — a word with no sound anchor stops before any story is drafted.
//
// Given a word where no syllable chunk has a common word with exactly its
// sound, when Flash runs the one-word command with that word, then no card is
// made and no story is drafted; the command stops with "no sound anchor
// found", listing each chunk's IPA; and no log row and no runner-ups entry are
// written.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHarness, TERMS_HEADER } = require("./helpers/card-harness");

// "critique" (kɹɪ.ˈtik): neither /kɹɪ/ nor /tik/ is the exact GA sound of a
// common word in this dictionary ("teak" is too rare, "critique" is the
// headword itself and never its own anchor).
function critiqueFixture() {
  return {
    dict: { critique: "kɹɪtˈik", teak: "tˈik", critic: "kɹˈɪtɪk" },
    freqs: { teak: 3e-8, critique: 2e-5, critic: 1e-5 },
    claude: {
      define: JSON.stringify({
        primarySense: "review",
        definition: "a detailed analysis and assessment of something",
        senses: ["review"],
      }),
      gloss: "a careful written judgment of a work",
      "compose-stories": JSON.stringify([{ sentence: "Should never be drafted.", pivots: ["never"] }]),
    },
  };
}

test("US-041 AC1: card.js stops at find-keywords with 'no sound anchor found' and each chunk's IPA; nothing is drafted, carded or logged", async () => {
  const h = await createHarness(critiqueFixture());
  try {
    const run = await h.runCard("critique");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.equal(run.stdout, "stopped at find-keywords: no sound anchor found; kɹɪ\t-; tik\t-\n");

    // no story drafted
    assert.deepEqual(h.claudeCalls().filter((c) => c.step === "compose-stories"), []);
    // no card made: the card file is untouched, nothing reached Anki
    assert.equal(h.readAnkiFile(), TERMS_HEADER.join("\n") + "\n");
    assert.deepEqual(h.mock.calls.filter((c) => c.action === "addNote" || c.action === "updateNoteFields"), []);
    // no log row, no runner-ups entry
    assert.deepEqual(h.readJsonl(h.mnemonicLog), []);
    assert.equal(fs.existsSync(h.alternatesLog) ? fs.readFileSync(h.alternatesLog, "utf8") : "", "");
  } finally {
    await h.cleanup();
  }
});

test("US-041 AC1: a one-chunk word with no keyword (stew) is a no-anchor word too; the headword is never its own anchor", async () => {
  const fx = critiqueFixture();
  fx.dict = { stew: "stˈu" };
  fx.freqs = { stew: 5e-6 };
  const h = await createHarness(fx);
  try {
    const run = await h.runCard("stew");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.equal(run.stdout, "stopped at find-keywords: no sound anchor found; stu\t-\n");
    assert.deepEqual(h.claudeCalls().filter((c) => c.step === "compose-stories"), []);
    assert.deepEqual(h.readJsonl(h.mnemonicLog), []);
  } finally {
    await h.cleanup();
  }
});

test("US-041 AC1: find-keywords CLI exits 1 with 'no sound anchor found' then one `ipa\\t-` line per chunk", async () => {
  const h = await createHarness(critiqueFixture());
  try {
    const r = await h.runScript("find-keywords.js", ["kɹɪ.ˈtik", "critique"]);
    assert.equal(r.code, 1, r.stderr);
    assert.equal(r.stdout, "no sound anchor found\nkɹɪ\t-\ntik\t-\n");
  } finally {
    await h.cleanup();
  }
});
