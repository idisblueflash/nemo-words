"use strict";

// SP-029 AC6 — Given the captioner or Jev fails on a cell (error or unusable
// answer), when the spike run hits it, then that word is reported as
// unjudged instead of being guessed, and the rates are computed over the
// judged words only, with the count shown.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const { IMAGES, tmpDir, fixtureEnv, runNode, readJson } = require("./helpers/harness");
const { startMockJev } = require("./helpers/mock-jev");

async function run(out, byWord, extraEnv = {}) {
  const jev = await startMockJev({ byWord }, out);
  try {
    const r = await runNode("run.js", [], fixtureEnv(out, { NEMO_JEV_ENV_FILE: jev.envFile, ...extraEnv }));
    assert.equal(r.code, 0, r.stderr);
    return { calls: jev.calls, report: fs.readFileSync(path.join(out, "report.md"), "utf8"), run: readJson(path.join(out, "run.json")) };
  } finally {
    await jev.close();
  }
}

test("AC6: a word Jev fails on (HTTP error or an unusable answer) is unjudged, and the rates are over the judged words only", async () => {
  const out = tmpDir();
  const { report, run: raw } = await run(out, { eta: "http-500", theta: "unusable" });
  const byWord = Object.fromEntries(raw.words.map((w) => [w.word, w]));
  assert.match(byWord.eta.unjudged, /HTTP 500/);
  assert.match(byWord.theta.unjudged, /unusable Jev answer/);
  assert.equal(byWord.eta.judgment, undefined); // nothing guessed

  assert.match(report, /Judged: 2 of 4 kept words \(2 unjudged, listed below\)/);
  assert.match(report, /\| Exact .*\| 2 \/ 2 \(100\.0%\) \|/);
  assert.match(report, /\| In three .*\| 2 \/ 2 \(100\.0%\) \|/);
  assert.match(report, /- eta: Jev answered HTTP 500/);
  assert.match(report, /- theta: unusable Jev answer/);
  assert.match(report, /\| eta \| eta\.grid\.png \| 1 \| unjudged \|/);
  assert.match(report, /over 2 judged word\(s\)/);
});

test("AC6: a cell the captioner fails on leaves its word unjudged and unasked; the failure isn't cached", async () => {
  // theta's grid with cell 9 turned white: a gray level no other kept grid has
  const images = tmpDir();
  for (const f of fs.readdirSync(IMAGES)) fs.copyFileSync(path.join(IMAGES, f), path.join(images, f));
  execFileSync("magick", [path.join(images, "theta.grid.png"), "-fill", "rgb(255,255,255)", "-draw", "rectangle 60,60 89,89", path.join(images, "theta.grid.png")]);

  const out = tmpDir();
  const { report, calls, run: raw } = await run(out, {}, { SP029_IMAGE_DIR: images, FAKE_CAPTION_FAIL_LEVEL: "255" });
  const theta = raw.words.find((w) => w.word === "theta");
  assert.match(theta.unjudged, /^caption failed for cell 9: captioner failed.*You have hit your session limit/);
  assert.ok(calls.every((c) => c.body.state.word !== "theta"), "Jev is never asked about a word with a missing caption");
  assert.match(report, /Judged: 3 of 4 kept words \(1 unjudged, listed below\)/);
  assert.match(report, /- theta: caption failed for cell 9/);

  const cached = readJson(path.join(out, "captions.json"))["theta.grid.png"];
  assert.equal(cached["9"], undefined);
  assert.equal(Object.keys(cached).length, 8);

  // an empty caption is unusable too
  const out2 = tmpDir();
  const second = await run(out2, {}, { SP029_IMAGE_DIR: images, FAKE_CAPTION_EMPTY_LEVEL: "255" });
  assert.match(second.run.words.find((w) => w.word === "theta").unjudged, /caption failed for cell 9: captioner gave an empty caption/);
});
