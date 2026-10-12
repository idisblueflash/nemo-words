// US-028 AC4 — Anki not running: the row still lands, the failure is reported
// and logged.
//
// Given Anki is not running, when Flash runs the one-word command with a new
// word, then the word's row is still written to the card file, the command
// reports that the sync failed and that it can be re-run later, and the
// failure is recorded in the sync log.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

test("AC4: with Anki down, card.js writes the row, reports the failed sync, and logs it", async () => {
  const h = await createHarness(germaneFixture(), { anki: "down" });
  try {
    const run = await h.runCard("germane");
    assert.equal(run.code, 1, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);

    // Row written (US-051: a drawn story-arm word's row carries the story-arm tag).
    assert.match(h.readAnkiFile(), /^germane\tThe main point stays relevant to the talk\.\t\tdʒɚ\.ˈmeɪn\trelevant to the matter at hand\t\treading-room-terms retention-story$/m);

    // Reported: sync failed, re-run later.
    assert.match(run.stdout, /sync failed/);
    assert.match(run.stdout, /re-run later/);
    assert.match(run.stdout, /node scripts\/sync\.js "germane"/);

    // Logged.
    const log = fs.readFileSync(h.syncLog, "utf8");
    assert.match(log, /^\S+Z term=germane file=added sync=failed \(.*AnkiConnect.*\)$/m);
  } finally {
    await h.cleanup();
  }
});
