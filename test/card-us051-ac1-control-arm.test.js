// US-051 AC1 — a control-arm word gets a definition-only card in its own deck.
//
// Given a new general-English word that has a sound anchor and no logged
// story, when Flash runs the one-word command and the draw puts it in the
// control arm, then a card appears in 00 Reading Room::03 Control Definitions;
// its back shows the plain definition, the gloss and the IPA line, with no
// story and no image; no story is drafted or judged, nothing is written to the
// mnemonic log; and the run report says "control arm: definition-only card".

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

const CONTROL_DECK = "00 Reading Room::03 Control Definitions";
const DEFINITION = "relevant and fitting to the subject under discussion";
const GLOSS = "relevant to the matter at hand";

test("US-051 AC1: the control arm cards the definition, gloss and IPA in the control deck, with no story drafted, judged or logged", async () => {
  const h = await createHarness(germaneFixture(), { arm: "control" });
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);

    // a card in the control deck, tagged as a control card
    const adds = h.mock.calls.filter((c) => c.action === "addNote");
    assert.equal(adds.length, 1);
    const note = adds[0].params.note;
    assert.equal(note.deckName, CONTROL_DECK);
    assert.equal(note.fields.Front, "germane");
    assert.deepEqual(note.tags, ["retention-control"]);
    assert.ok(h.mock.calls.some((c) => c.action === "createDeck" && c.params.deck === CONTROL_DECK));

    // its back: the plain definition, the gloss and the IPA line — no story, no image
    assert.equal(
      note.fields.Back,
      DEFINITION +
        `<br><small style="opacity:0.75"><i>${GLOSS}</i></small>` +
        `<br><small style="opacity:0.6">/dʒɚ.ˈmeɪn/</small>`
    );
    assert.doesNotMatch(note.fields.Back, /<img/);
    assert.ok(
      h.readAnkiFile().split("\n").includes(`germane\t${DEFINITION}\t\tdʒɚ.ˈmeɪn\t${GLOSS}\t${CONTROL_DECK}\tretention-control`),
      h.readAnkiFile()
    );

    // no story drafted or judged, nothing logged
    assert.deepEqual(h.claudeCalls().map((c) => c.step), ["define", "gloss"]);
    assert.deepEqual(h.jev.judgeCalls(), []);
    assert.deepEqual(h.jev.tagCalls(), []);
    assert.deepEqual(h.readJsonl(h.mnemonicLog), []);
    assert.equal(fs.existsSync(h.alternatesLog) ? fs.readFileSync(h.alternatesLog, "utf8") : "", "");

    // the run report
    assert.match(run.stdout, /^control arm: definition-only card$/m);
    assert.match(run.stdout, /^carded germane \(added\)$/m);
    assert.doesNotMatch(run.stdout, /^story:/m);
  } finally {
    await h.cleanup();
  }
});

test("US-051: NEMO_ARM other than control|story fails the run at draw-arm (exit 2), with nothing written", async () => {
  const h = await createHarness(germaneFixture(), { arm: "both" });
  try {
    const before = h.readAnkiFile();
    const run = await h.runCard("germane");
    assert.equal(run.code, 2, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stderr, /failed at draw-arm:\nerror: NEMO_ARM must be control or story, got "both"/);
    assert.equal(h.readAnkiFile(), before);
    assert.deepEqual(h.mock.calls, []);
  } finally {
    await h.cleanup();
  }
});
