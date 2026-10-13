// US-051 AC2 — a story-arm word is carded with a story, as before, and tagged.
//
// Given a new general-English word that has a sound anchor and no logged
// story, when the draw puts it in the story arm, then it is carded in
// 00 Reading Room::Terms with a story, as before; the card is tagged as a
// story-arm card, so the comparison can find it later; and the run report
// says "story arm".

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

const STORY = "The main point stays relevant to the talk.";
const GLOSS = "relevant to the matter at hand";

test("US-051 AC2: the story arm cards a story in the Terms deck, tagged retention-story, and the report says 'story arm'", async () => {
  const h = await createHarness(germaneFixture(), { arm: "story" });
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);

    const adds = h.mock.calls.filter((c) => c.action === "addNote");
    assert.equal(adds.length, 1);
    const note = adds[0].params.note;
    assert.equal(note.deckName, "00 Reading Room::Terms");
    assert.ok(note.fields.Back.startsWith(STORY), note.fields.Back);
    // the row's Tags replace the #tags header (ADR-0016), so the header tag is repeated
    assert.deepEqual(note.tags, ["reading-room-terms", "retention-story"]);
    assert.ok(
      h.readAnkiFile().split("\n").includes(`germane\t${STORY}\t\tdʒɚ.ˈmeɪn\t${GLOSS}\t\treading-room-terms retention-story`),
      h.readAnkiFile()
    );

    // a story was drafted and logged, as before
    assert.ok(h.claudeCalls().some((c) => c.step === "compose-stories"));
    assert.equal(h.readJsonl(h.mnemonicLog).length, 1);

    assert.match(run.stdout, /^story arm$/m);
    assert.match(run.stdout, new RegExp(`^story: ${STORY.replace(/\./g, "\\.")}$`, "m"));
    assert.doesNotMatch(run.stdout, /control arm/);
  } finally {
    await h.cleanup();
  }
});

test("US-051 AC2: a listed row with an empty Back keeps its patch behaviour and gains the story tag", async () => {
  const h = await createHarness(germaneFixture(), { arm: "story", rows: ["germane\t\t\t\t\t\treading-room-terms favourite"] });
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.ok(
      h.readAnkiFile().split("\n").includes(`germane\t${STORY}\t\tdʒɚ.ˈmeɪn\t${GLOSS}\t\treading-room-terms favourite retention-story`),
      h.readAnkiFile()
    );
    assert.match(run.stdout, /^carded germane \(patched\)$/m);
  } finally {
    await h.cleanup();
  }
});
