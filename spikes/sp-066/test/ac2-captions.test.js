"use strict";

// SP-066 AC2 (captions) — Given a cell of a kept grid and its word's must-see
// list, when the spike run captions the cell, then the caption gives
// everything SP-064's caption gave (objects with adjectives, shot, angle,
// action step, extras, a mark per must-see item by its name only, ADR-0032)
// and also one action line: what the story objects do to each other; for each
// must-see item it gives a size (large / medium / small) and a place (front /
// back) next to visible / partly cut / hidden; and the captioner sees no word,
// no story and no Flash's cell.

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
  const r = await runNode("run.js", ["--stage", "tuning", "--caption-only"], fixtureEnv(out, { SP066_GRIDS: gridsFile(out, KEPT), FAKE_CLAUDE_LOG: log }));
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
      assert.ok(typeof c.action === "string" && c.action.trim() && !/\n/.test(c.action), "one action line");
      for (const m of Object.values(c.mustSee)) {
        assert.deepEqual(Object.keys(m).sort(), ["mark", "place", "size"]);
        assert.ok(["visible", "partly cut", "hidden"].includes(m.mark));
        if (m.mark === "hidden") assert.deepEqual([m.size, m.place], [null, null], "a hidden item has no size or place");
        else {
          assert.ok(["large", "medium", "small"].includes(m.size));
          assert.ok(["front", "back"].includes(m.place));
        }
      }
    }
  }
  const kappa = captions["alpha.grid.png"];
  // cell n is the grid's nth cell, row-major: cell 1 is lightness 0, cell 9 is 240
  assert.deepEqual(kappa["1"].objects[0].adjectives, ["flat", "gray", "lightness 0"]);
  assert.equal(kappa["9"].shot, "extreme close-up");
  assert.deepEqual(
    Object.values(kappa).map((c) => c.mustSee.moon.mark),
    ["hidden", "hidden", "hidden", "hidden", "partly cut", "visible", "visible", "visible", "visible"],
  );
  assert.deepEqual(Object.keys(kappa["5"].mustSee), ["square", "moon"]);
  // the fake's size: small below lightness 80, medium below 160, else large; place: front below 128
  assert.deepEqual(kappa["3"].mustSee.square, { mark: "visible", size: "small", place: "front" });
  assert.deepEqual(kappa["5"].mustSee.moon, { mark: "partly cut", size: "medium", place: "front" });
  assert.deepEqual(kappa["9"].mustSee.moon, { mark: "visible", size: "large", place: "back" });
  assert.equal(kappa["5"].action, "the square pushes the moon: the objects act on each other");
  assert.equal(kappa["1"].action, "the objects stand apart");
  assert.deepEqual(Object.keys(captions["nu.grid.png"]["5"].mustSee), ["square", "nurse"]);
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
    const m = /MUST-SEE ITEMS: (\[.*\])/.exec(prompt);
    assert.ok(m, "the must-see item names are in the prompt");
    (byList[m[1]] = byList[m[1]] || []).push(JSON.stringify(c.argv));
  }
  // the two words' item names, and one fixed prompt per list: nothing about one cell leaks in
  const names = (w) => JSON.stringify(lists[w].items.map((i) => i.name));
  assert.deepEqual(Object.keys(byList).sort(), [names("kappa"), names("nu")].sort());
  for (const argvs of Object.values(byList)) {
    assert.equal(argvs.length, 9);
    assert.equal(new Set(argvs).size, 1);
  }
});

test("AC2: the captioner marks the must-see items by their names only, never with their adjectives", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  await captionOnly(out, log);
  const lists = readJson(path.join(out, "must-see.json"));
  const adjectives = Object.values(lists).flatMap((l) => l.items.flatMap((i) => i.adjectives));
  assert.ok(adjectives.length > 0, "the lists do carry adjectives");
  for (const c of claudeCalls(log).filter((x) => x.mode === "caption")) {
    const prompt = c.argv[c.argv.indexOf("-p") + 1];
    for (const a of adjectives) assert.ok(!prompt.includes(JSON.stringify(a)), `adjective ${a} isn't in the caption prompt`);
    assert.match(prompt, /name/i);
  }
  // the objects still carry their own adjectives
  assert.deepEqual(readJson(path.join(out, "captions.json"))["alpha.grid.png"]["2"].objects[0].adjectives, ["flat", "gray", "lightness 30"]);
});

test("AC2: a caption made under the old prompt (items with adjectives) is redone; the must-see lists are reused", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  await captionOnly(out, log);
  const before = claudeCalls(log).length;
  // a captions.json as the first build saved it: grid → cell → caption, with
  // mustSee keyed by name, but made with the adjectives in the prompt
  const old = (moon) => ({
    objects: [{ name: "square", adjectives: ["flat", "gray"] }],
    shot: "medium",
    angle: "eye level",
    step: "during",
    extras: { floor: false, background: "plain", morePeople: false, readableText: "" },
    mustSee: { square: "visible", ...(moon ? { moon: "hidden" } : { nurse: "hidden" }) },
  });
  const cells = (moon) => Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => [c, old(moon)]));
  require("node:fs").writeFileSync(path.join(out, "captions.json"), JSON.stringify({ "alpha.grid.png": cells(true), "nu.grid.png": cells(false) }));
  await captionOnly(out, log);
  const again = claudeCalls(log).slice(before);
  assert.equal(again.filter((c) => c.mode === "must-see").length, 0, "the must-see lists are reused");
  assert.equal(again.filter((c) => c.mode === "caption").length, 18, "every old caption is made again");
  const captions = readJson(path.join(out, "captions.json"));
  assert.equal(captions["nu.grid.png"]["1"].mustSee.nurse.mark, "visible");
  assert.equal(captions["alpha.grid.png"]["9"].mustSee.moon.mark, "visible");
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
  assert.equal(readJson(path.join(out, "captions.json"))["alpha.grid.png"]["1"].mustSee.ghost.mark, "hidden");
});

test("AC2: captions are cached, so a second run doesn't caption again", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  await captionOnly(out, log);
  const before = claudeCalls(log).length;
  await captionOnly(out, log);
  assert.equal(claudeCalls(log).length, before);
});

test("AC2: the caption prompt asks for the action line and a size and place per must-see item", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  await captionOnly(out, log);
  const c = claudeCalls(log).find((x) => x.mode === "caption");
  const prompt = c.argv[c.argv.indexOf("-p") + 1];
  assert.match(prompt, /"action": one line: what the objects do to each other/);
  assert.match(prompt, /"size": "large", "medium" or "small"/);
  assert.match(prompt, /"place": "front" or "back"/);
  assert.match(prompt, /"mark": "visible"/);
});

// After stage 2 (ADR-0036, C-044): the caption lists the cell's drawing errors.
// The fake captioner: with a "tile" item, a cell from lightness 210 draws the
// tile wrong (a must-see item), a cell at 150–209 draws a lamp wrong (another
// object), and a darker cell has no error. With a "nurse" item, a cell from
// lightness 150 can read "VENICE, R.N."; a darker cell reads nothing.
const TILE = { word: "anomaly", grid: "alpha.grid.png", flashCell: 6, story: "An odd tile rattles, lightness 120." };

test("AC2: every caption lists its drawing errors, each with whether it is a must-see item; a cell with none has an empty list", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const r = await runNode("run.js", ["--stage", "tuning", "--caption-only"], fixtureEnv(out, { SP066_GRIDS: gridsFile(out, [TILE, KEPT[1]]), FAKE_CLAUDE_LOG: log }));
  assert.equal(r.code, 0, r.stderr);
  const captions = readJson(path.join(out, "captions.json"));
  for (const cells of Object.values(captions)) for (const c of Object.values(cells)) assert.ok(Array.isArray(c.drawingErrors), "every caption has the list");
  const a = captions["alpha.grid.png"]; // cell n = lightness 30·(n−1)
  assert.deepEqual(a["1"].drawingErrors, []);
  assert.deepEqual(a["6"].drawingErrors, [{ object: "lamp", mustSee: false, note: "floats above the table" }]);
  assert.deepEqual(a["9"].drawingErrors, [{ object: "tile", mustSee: true, note: "sits on top of the grout lines" }]);
  // the text it can read stays in extras
  const nu = captions["nu.grid.png"]; // cell n = lightness 30·(n−1)
  assert.equal(nu["6"].extras.readableText, "VENICE, R.N.");
  assert.equal(nu["1"].extras.readableText, "");

  const c = claudeCalls(log).find((x) => x.mode === "caption");
  const prompt = c.argv[c.argv.indexOf("-p") + 1];
  assert.match(prompt, /"drawingErrors"/);
  assert.match(prompt, /floats/);
  assert.match(prompt, /pasted on/);
  assert.match(prompt, /breaks the lines of the wall or floor/);
  assert.match(prompt, /broken or crooked on purpose is not a drawing error/);
  assert.match(prompt, /"mustSee": true or false/);
  assert.match(prompt, /empty list/);
  assert.match(prompt, /readableText/);
});

test("AC2: a caption with no drawing-errors list, or a drawing error with no object or no must-see flag, is unusable", () => {
  const { parseCaption } = require("../lib/caption");
  const items = [{ name: "tile", adjectives: ["odd"] }];
  const base = {
    objects: [{ name: "tile", adjectives: [] }],
    shot: "medium",
    angle: "eye level",
    step: "during",
    extras: { floor: true, background: "wall", morePeople: false, readableText: "" },
    action: "the tile rattles in the wall",
    mustSee: { tile: { mark: "visible", size: "large", place: "front" } },
    drawingErrors: [{ object: "tile", mustSee: true, note: "sits on the grout" }],
  };
  assert.deepEqual(parseCaption(JSON.stringify(base), items).drawingErrors, [{ object: "tile", mustSee: true, note: "sits on the grout" }]);
  assert.deepEqual(parseCaption(JSON.stringify({ ...base, drawingErrors: [] }), items).drawingErrors, []);
  assert.deepEqual(parseCaption(JSON.stringify({ ...base, drawingErrors: [{ object: "lamp", mustSee: false }] }), items).drawingErrors, [{ object: "lamp", mustSee: false, note: "" }]);
  assert.throws(() => parseCaption(JSON.stringify({ ...base, drawingErrors: undefined }), items), /drawing errors/);
  assert.throws(() => parseCaption(JSON.stringify({ ...base, drawingErrors: "none" }), items), /drawing errors/);
  assert.throws(() => parseCaption(JSON.stringify({ ...base, drawingErrors: [{ mustSee: true, note: "x" }] }), items), /drawing error/);
  assert.throws(() => parseCaption(JSON.stringify({ ...base, drawingErrors: [{ object: "tile", mustSee: "yes" }] }), items), /drawing error/);
});

test("AC2: a caption with no action line, or a shown item with no size or place, is unusable", () => {
  const { parseCaption } = require("../lib/caption");
  const items = [{ name: "cob", adjectives: ["bare"] }];
  const base = {
    objects: [{ name: "cob", adjectives: [] }],
    shot: "medium",
    angle: "eye level",
    step: "after",
    extras: { floor: true, background: "", morePeople: false, readableText: "" },
    action: "a hand tosses the cob",
    mustSee: { cob: { mark: "visible", size: "large", place: "front" } },
    drawingErrors: [],
  };
  const ok = parseCaption(JSON.stringify(base), items);
  assert.equal(ok.action, "a hand tosses the cob");
  assert.deepEqual(ok.mustSee, { cob: { mark: "visible", size: "large", place: "front" } });
  assert.throws(() => parseCaption(JSON.stringify({ ...base, action: "" }), items), /action/);
  assert.throws(() => parseCaption(JSON.stringify({ ...base, action: undefined }), items), /action/);
  assert.throws(() => parseCaption(JSON.stringify({ ...base, mustSee: { cob: { mark: "visible", size: "huge", place: "front" } } }), items), /size/);
  assert.throws(() => parseCaption(JSON.stringify({ ...base, mustSee: { cob: { mark: "partly cut", size: "small" } } }), items), /place/);
  assert.throws(() => parseCaption(JSON.stringify({ ...base, mustSee: { cob: "visible" } }), items), /cob/);
  // a hidden item has no size or place, whatever the captioner wrote
  assert.deepEqual(parseCaption(JSON.stringify({ ...base, mustSee: { cob: { mark: "hidden", size: "small", place: "back" } } }), items).mustSee, {
    cob: { mark: "hidden", size: null, place: null },
  });
});
