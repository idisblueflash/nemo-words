// US-028 AC1 — one word in, a synced story card out, no questions asked.
//
// Given a general-English word with no card and no logged story,
// when Flash runs the one-word command (scripts/card.js) with that word,
// then a new card appears in the 00 Reading Room::Terms deck whose back shows
// a story sentence, a gloss of 60 characters or fewer, and an IPA line —
// and the run never prompts (stdin is closed; it must still finish, exit 0).

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

test("AC1: card.js turns a new general word into a synced story card", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    // It ran as the Dagu pipeline (EN-036), inspectable afterwards.
    assert.match(run.stderr, /\(inspect: dagu status --run-id \S+ .*dags\/card\.yaml\)/);

    // A new note in the Terms deck…
    const adds = h.mock.calls.filter((c) => c.action === "addNote");
    assert.equal(adds.length, 1);
    const note = adds[0].params.note;
    assert.equal(note.deckName, "00 Reading Room::Terms");
    assert.equal(note.fields.Front, "germane");

    // …whose back shows the story, a ≤60-char gloss, and an IPA line.
    const story = "The main point stays relevant to the talk.";
    const gloss = "relevant to the matter at hand";
    assert.ok(gloss.length <= 60);
    assert.equal(
      note.fields.Back,
      story +
        `<br><small style="opacity:0.75"><i>${gloss}</i></small>` +
        `<br><small style="opacity:0.6">/dʒɚ.ˈmeɪn/</small>`
    );

    // The row in the card file is the same card (US-051: tagged as a story-arm card).
    assert.match(
      h.readAnkiFile(),
      new RegExp(`^germane\t${story.replace(/\./g, "\\.")}\t\tdʒɚ\\.ˈmeɪn\t${gloss}\t\treading-room-terms retention-story$`, "m")
    );

    // The report names what was carded.
    assert.match(run.stdout, /carded germane/);
    assert.match(run.stdout, /The main point stays relevant to the talk\./);
  } finally {
    await h.cleanup();
  }
});
