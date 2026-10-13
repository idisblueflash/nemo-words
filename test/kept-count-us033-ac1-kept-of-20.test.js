// US-033 scenario 1: with at least 20 reviewed auto-picked words, the
// kept-count command reports "kept N of 20 (P%)" over the 20 most recently
// auto-picked of them, says whether that meets E01's 70% target, and lists
// each overridden word with its auto-picked story and its story now.
//
// Runs the real scripts/kept-count.js against a mock AnkiConnect.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createKeptHarness } = require("./helpers/kept-count-harness");

const day = (n) => `2026-09-${String(n).padStart(2, "0")}`;
const auto = (i) => `Auto story number ${i} sits here.`;
const mine = (i) => `Flash wrote story ${i} himself.`;

// Seeds `total` reviewed auto-picked words, word1 (oldest) … word<total>
// (newest). `overridden` holds the numbers whose live story Flash changed.
function seed(h, total, overridden) {
  for (let i = 1; i <= total; i++) {
    h.autoPick(`word${i}`, auto(i), { date: day(i) });
    const story = overridden.includes(i) ? mine(i) : auto(i);
    h.card(`word${i}`, h.composed(story, { image: `word${i}.png`, gloss: "a short gloss", ipa: "ˈwɝd" }), { reps: 2 });
  }
}

test("AC1: 22 reviewed auto-picks → kept 15 of 20 (75%), meets the target, lists the overridden", async () => {
  const h = await createKeptHarness();
  try {
    // word1 and word2 are the oldest: outside the window of 20, so their
    // overrides don't count. In the window (word3…word22): 5 overridden.
    seed(h, 22, [1, 2, 5, 9, 13, 17, 21]);
    const { code, stdout, stderr } = await h.run();

    assert.equal(code, 0, stderr);
    assert.match(stdout, /^kept 15 of 20 \(75%\)$/m);
    assert.match(stdout, /^meets E01's 70% target$/m);

    for (const i of [5, 9, 13, 17, 21]) {
      const block = new RegExp(`^- word${i}\\n\\s+auto-picked: ${auto(i)}\\n\\s+now: ${mine(i)}$`, "m");
      assert.match(stdout, block, `word${i} is listed with both stories`);
    }
    // outside the window, and kept words: not listed
    assert.doesNotMatch(stdout, /^- word1$/m);
    assert.doesNotMatch(stdout, /^- word2$/m);
    assert.doesNotMatch(stdout, /^- word3$/m);
    // newest auto-pick first
    assert.ok(stdout.indexOf("- word21") < stdout.indexOf("- word5"));
  } finally {
    await h.close();
  }
});

test("AC1: 13 kept of 20 (65%) is below E01's 70% target", async () => {
  const h = await createKeptHarness();
  try {
    seed(h, 20, [1, 2, 3, 4, 5, 6, 7]);
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 0, stderr);
    assert.match(stdout, /^kept 13 of 20 \(65%\)$/m);
    assert.match(stdout, /^below E01's 70% target$/m);
    assert.doesNotMatch(stdout, /meets/);
  } finally {
    await h.close();
  }
});

test("AC1: 14 kept of 20 (70%) just meets the target", async () => {
  const h = await createKeptHarness();
  try {
    seed(h, 20, [1, 2, 3, 4, 5, 6]);
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 0, stderr);
    assert.match(stdout, /^kept 14 of 20 \(70%\)$/m);
    assert.match(stdout, /^meets E01's 70% target$/m);
  } finally {
    await h.close();
  }
});

test("AC1: the command is read-only — it only asks Anki read actions", async () => {
  const h = await createKeptHarness();
  try {
    seed(h, 20, [1]);
    await h.run();
    const actions = [...new Set(h.mock.calls.map((c) => c.action))].sort();
    assert.deepEqual(actions, ["cardsInfo", "findNotes", "notesInfo"]);
    // the same deck query anki-sync.js uses
    const first = h.mock.calls.find((c) => c.action === "findNotes");
    assert.match(first.params.query, /^deck:"00 Reading Room::Terms" Front:"word\d+"$/);
  } finally {
    await h.close();
  }
});
