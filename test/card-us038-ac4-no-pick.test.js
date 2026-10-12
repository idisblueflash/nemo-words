// US-038 AC4 — nothing passes every gate: no card, no-pick with reasons.
//
// Given every drafted story fails a hard gate or a judgment gate, when Flash
// runs the one-word command, then no card is made, and the command stops with
// no-pick and lists each story with its failed gates.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

const TWO_PLACES = "The main point stays relevant to the talk.";
const FLAT = "Main facts stay relevant.";
const HARD_FAIL = "The main road is long.";

test("US-038 AC4: card.js makes no card and stops with no-pick, listing every story's failed gates", async () => {
  const fixture = germaneFixture([
    { sentence: TWO_PLACES, pivots: ["main", "relevant"] },
    { sentence: HARD_FAIL, pivots: ["main"] },
    { sentence: FLAT, pivots: ["main", "relevant"] },
  ]);
  fixture.judge = {
    [TWO_PLACES]: { anchor: 2, meaning: 2, vivid: 2, "scene-coherence.one-setting": 0.2 },
    [FLAT]: { vividness: 0.1, "animal-harm.not-mistreated": 0.4 },
  };
  const h = await createHarness(fixture);
  const before = h.readAnkiFile();
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);

    assert.equal(h.readAnkiFile(), before);
    assert.deepEqual(h.mock.calls, [], "Anki is never touched");
    assert.deepEqual(h.readJsonl(h.mnemonicLog), [], "nothing is logged");

    assert.equal(
      run.stdout,
      `stopped at pick-story: ${[
        "no-pick: none of 3 candidates passed every gate",
        `${TWO_PLACES}\tscene-coherence: one-setting`,
        `${HARD_FAIL}\tsense-missing: relevant`,
        `${FLAT}\tvividness: summary,animal-harm: not-mistreated`,
      ].join("; ")}\n`
    );
  } finally {
    await h.cleanup();
  }
});

test("US-038 AC4 edge: when every story fails a hard gate, Jev is never asked and the command stops with no-pick", async () => {
  const h = await createHarness(
    germaneFixture([
      { sentence: HARD_FAIL, pivots: ["main"] },
      { sentence: "The germane point stays relevant.", pivots: ["main", "relevant"] },
    ])
  );
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.deepEqual(h.jev.calls, []);
    assert.match(run.stdout, /^stopped at pick-story: no-pick: none of 2 candidates passed every gate; /);
    assert.ok(run.stdout.includes(`${HARD_FAIL}\tsense-missing: relevant`));
    assert.deepEqual(h.mock.calls, []);
  } finally {
    await h.cleanup();
  }
});
