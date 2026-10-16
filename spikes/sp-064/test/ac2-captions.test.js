"use strict";

// SP-064 AC2 — Given a cell of a kept grid and its word's must-see list, when
// the spike run captions the cell again, then the caption gives the objects,
// the shot, the angle, the action step (before / during / after) and the
// extras (floor, background, more people, readable text); it marks each
// must-see item visible, partly cut or hidden; and the captioner sees only
// that cell and the list, never the word, the story or Flash's cell.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { tmpDir, fixtureEnv, gridsFile, runNode, readJson, claudeCalls } = require("./helpers/harness");

// kappa: L grid (cell n = lightness 30·(n−1)); its story names a moon, which
// the fake captioner hides below lightness 100 and cuts partly below 150.
const KEPT = [
  { word: "kappa", grid: "alpha.grid.png", flashCell: 6, story: "Kappa waves at the moon, lightness 120." },
  { word: "nu", grid: "nu.grid.png", flashCell: 5, story: "Nurse Venice checks the monitor, lightness 120." },
];

async function captionOnly(out, log) {
  const r = await runNode("run.js", ["--caption-only"], fixtureEnv(out, { SP064_GRIDS: gridsFile(out, KEPT), FAKE_CLAUDE_LOG: log }));
  assert.equal(r.code, 0, r.stderr);
  return readJson(path.join(out, "captions.json"));
}

test("AC2: every cell of a kept grid gets a caption with objects, shot, angle, step and extras, and a status per must-see item", async () => {
  const out = tmpDir();
  const captions = await captionOnly(out, path.join(out, "claude.jsonl"));
  assert.deepEqual(Object.keys(captions).sort(), ["alpha.grid.png", "nu.grid.png"]);
  for (const cells of Object.values(captions)) {
    assert.deepEqual(Object.keys(cells), ["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    for (const c of Object.values(cells)) {
      assert.ok(Array.isArray(c.objects) && c.objects.length > 0);
      assert.ok(["extreme close-up", "close-up", "medium", "wide"].includes(c.shot));
      assert.equal(typeof c.angle, "string");
      assert.ok(["before", "during", "after"].includes(c.step));
      assert.deepEqual(Object.keys(c.extras).sort(), ["background", "floor", "morePeople", "readableText"]);
      for (const status of Object.values(c.mustSee)) assert.ok(["visible", "partly cut", "hidden"].includes(status));
    }
  }
  const kappa = captions["alpha.grid.png"];
  // cell n is the grid's nth cell, row-major: cell 1 is lightness 0, cell 9 is 240
  assert.deepEqual(kappa["1"].objects[0].adjectives, ["flat", "gray", "lightness 0"]);
  assert.equal(kappa["9"].shot, "extreme close-up");
  assert.deepEqual(
    Object.values(kappa).map((c) => c.mustSee.moon),
    ["hidden", "hidden", "hidden", "hidden", "partly cut", "visible", "visible", "visible", "visible"],
  );
  assert.deepEqual(Object.keys(kappa["5"].mustSee), ["square", "moon"]);
  assert.deepEqual(Object.keys(captions["nu.grid.png"]["5"].mustSee), ["square", "nametag"]);
});

test("AC2: the captioner sees only that cell and the must-see list, never the word, the story or Flash's cell", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  await captionOnly(out, log);
  const calls = claudeCalls(log).filter((c) => c.mode === "caption");
  assert.equal(calls.length, 18);
  const lists = readJson(path.join(out, "must-see.json"));
  const byList = {};
  for (const c of calls) {
    assert.deepEqual(c.files, ["picture.png"], "one cell at a time, under a neutral name");
    const prompt = c.argv[c.argv.indexOf("-p") + 1];
    const shown = [...c.argv, c.cwd].join(" ");
    for (const k of KEPT) {
      assert.ok(!shown.includes(k.story), "never the story");
      assert.doesNotMatch(shown, new RegExp(`\\b${k.word}\\b`, "i"), "never the word");
    }
    assert.doesNotMatch(shown, /grid|flash|cell \d|\bpick/i, "never which grid or cell, nor Flash's pick");
    const m = /MUST-SEE LIST: (\[.*\])/.exec(prompt);
    assert.ok(m, "the must-see list is in the prompt");
    (byList[m[1]] = byList[m[1]] || []).push(JSON.stringify(c.argv));
  }
  // the two words' lists, and one fixed prompt per list: nothing about one cell leaks in
  assert.deepEqual(Object.keys(byList).sort(), [JSON.stringify(lists.kappa.items), JSON.stringify(lists.nu.items)].sort());
  for (const argvs of Object.values(byList)) {
    assert.equal(argvs.length, 9);
    assert.equal(new Set(argvs).size, 1);
  }
});

test("AC2: a cached caption made for another must-see list is redone", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  await captionOnly(out, log);
  const before = claudeCalls(log).length;
  // kappa's list gains an item (as when its story or the list prompt changes)
  const listFile = path.join(out, "must-see.json");
  const lists = readJson(listFile);
  lists.kappa.items.push({ name: "ghost", adjectives: ["pale"] });
  require("node:fs").writeFileSync(listFile, JSON.stringify(lists));
  await captionOnly(out, log);
  const again = claudeCalls(log).slice(before);
  assert.equal(again.length, 9, "only kappa's 9 cells are captioned again");
  assert.equal(readJson(path.join(out, "captions.json"))["alpha.grid.png"]["1"].mustSee.ghost, "hidden");
});

test("AC2: captions are cached, so a second run doesn't caption again", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  await captionOnly(out, log);
  const before = claudeCalls(log).length;
  await captionOnly(out, log);
  assert.equal(claudeCalls(log).length, before);
});
