"use strict";

// SP-029 AC2 — Given a kept grid, when the spike run captions its cells,
// then each of the 9 cells gets one line of text that says what it shows,
// and the captioner sees one cell at a time, never the story, the word or
// Flash's pick.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { tmpDir, fixtureEnv, runNode, readJson } = require("./helpers/harness");

const R = [240, 210, 180, 150, 120, 90, 60, 30, 0];
const L = [0, 30, 60, 90, 120, 150, 180, 210, 240];

test("AC2: run.js --caption-only gives every cell of every kept grid one line, from a captioner that sees one cell and nothing else", async () => {
  const out = tmpDir();
  const log = path.join(out, "captioner.jsonl");
  const { code, stderr } = await runNode("run.js", ["--caption-only"], fixtureEnv(out, { FAKE_CAPTION_LOG: log }));
  assert.equal(code, 0, stderr);

  const captions = readJson(path.join(out, "captions.json"));
  assert.deepEqual(Object.keys(captions).sort(), ["alpha.grid.png", "eta.grid.png", "gamma.grid-2.png", "theta.grid.png"]);
  for (const cells of Object.values(captions)) {
    assert.deepEqual(Object.keys(cells), ["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    for (const text of Object.values(cells)) {
      assert.ok(text.trim().length > 0);
      assert.doesNotMatch(text, /[\n\t]/); // one line, tabs stripped
    }
  }
  // cell n is the grid's nth cell, row-major
  assert.deepEqual(Object.values(captions["alpha.grid.png"]), L.map((l) => `a flat gray square, lightness ${l}`));
  assert.deepEqual(Object.values(captions["eta.grid.png"]), R.map((l) => `a flat gray square, lightness ${l}`));

  const calls = fs.readFileSync(log, "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(calls.length, 4 * 9);
  const story = /story|lightness 1[25]0\.|alpha|gamma|theta|\beta\b/i;
  for (const c of calls) {
    assert.deepEqual(c.files, ["picture.png"]); // one cell at a time, under a neutral name
    const shown = [...c.argv, c.cwd].join(" ");
    assert.doesNotMatch(shown, story); // never the word or the story
    assert.doesNotMatch(shown, /cell|grid|flash|pick/i); // never which cell this is, nor Flash's pick
  }
  // the same prompt every time: nothing about one cell can leak in
  assert.equal(new Set(calls.map((c) => JSON.stringify(c.argv))).size, 1);
});

test("AC2: captions are cached, so a second run doesn't caption again", async () => {
  const out = tmpDir();
  const log = path.join(out, "captioner.jsonl");
  const env = fixtureEnv(out, { FAKE_CAPTION_LOG: log });
  assert.equal((await runNode("run.js", ["--caption-only"], env)).code, 0);
  const before = fs.readFileSync(log, "utf8").trim().split("\n").length;
  const again = await runNode("run.js", ["--caption-only"], env);
  assert.equal(again.code, 0, again.stderr);
  assert.equal(fs.readFileSync(log, "utf8").trim().split("\n").length, before);
});
