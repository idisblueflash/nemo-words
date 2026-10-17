"use strict";

// SP-066 AC2 and AC3 (after stage 20, ADR-0039, C-048, C-049) — the caption
// lists the onlookers: each person or animal that doesn't do the story's
// action, with what it does and its view; a cell with none has an empty
// list, and a caption with no list is unusable. Jev scores vivid in parts,
// scene and onlooker, and vivid is their mean.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { tmpDir, fixtureEnv, gridsFile, runNode, readJson } = require("./helpers/harness");
const { startMockJev } = require("./helpers/mock-jev");
const { parseCaption, prompt } = require("../lib/caption");
const { loadRubric } = require("../lib/pick");

const WAITER = { word: "flustered", grid: "alpha.grid.png", flashCell: 6, story: "The waiter fumbles the mustard, lightness 120." };

async function pickRun(kept) {
  const out = tmpDir();
  const jev = await startMockJev({}, out);
  try {
    const r = await runNode("run.js", ["--stage", "tuning"], fixtureEnv(out, { SP066_GRIDS: gridsFile(out, kept), NEMO_JEV_ENV_FILE: jev.envFile }));
    return { r, out, calls: jev.calls };
  } finally {
    await jev.close();
  }
}

const base = {
  objects: [{ name: "waiter", adjectives: ["red-faced"] }],
  shot: "medium",
  angle: "eye level",
  step: "during",
  extras: { floor: true, background: "cafe", morePeople: true, readableText: "" },
  action: "the waiter fumbles the mustard bottle",
  mustSee: { waiter: { mark: "visible", size: "large", place: "front" } },
  drawingErrors: [],
};
const items = [{ name: "waiter", adjectives: ["red-faced"] }];

test("AC2 (ADR-0039): the caption prompt asks for the onlookers, what they do and their view", () => {
  const p = prompt(items, "flustered");
  assert.match(p, /"onlookers": each person or animal in the picture that doesn't do the main action/);
  assert.match(p, /"watches", "reacts", "looks away", "other"/);
});

test("AC2 (ADR-0039): a caption keeps its onlookers; an empty list is fine; no list or a bad onlooker is unusable", () => {
  const one = [{ who: "customer", does: "watches", view: "back" }];
  assert.deepEqual(parseCaption(JSON.stringify({ ...base, onlookers: one }), items).onlookers, one);
  assert.deepEqual(parseCaption(JSON.stringify({ ...base, onlookers: [] }), items).onlookers, []);
  assert.throws(() => parseCaption(JSON.stringify(base), items), /no onlookers list/);
  assert.throws(() => parseCaption(JSON.stringify({ ...base, onlookers: [{ who: "customer", does: "stares", view: "back" }] }), items), /onlooker/);
  assert.throws(() => parseCaption(JSON.stringify({ ...base, onlookers: [{ does: "watches", view: "back" }] }), items), /onlooker/);
  assert.throws(() => parseCaption(JSON.stringify({ ...base, onlookers: [{ who: "customer", does: "watches", view: "upside" }] }), items), /onlooker/);
});

test("AC3 (ADR-0039): the rubric gives vivid 2 parts, scene and onlooker", () => {
  const v = loadRubric().axes.vivid;
  assert.deepEqual(Object.keys(v.parts), ["scene", "onlooker"]);
  assert.match(v.parts.scene.levels[2], /large and act on each other as the story says/);
  assert.match(v.parts.onlooker.levels[0], /draws the eye away/);
  assert.match(v.parts.onlooker.levels[1], /no onlooker/);
  assert.match(v.parts.onlooker.levels[2], /watches or reacts .* stronger/);
  assert.match(v.parts.onlooker.check, /from the back, it also leads the eye to the action/);
});

test("AC3 (ADR-0039): Jev sees each cell's onlookers and scores vivid as the mean of scene and onlooker", async () => {
  const { r, out, calls } = await pickRun([WAITER]);
  assert.equal(r.code, 0, r.stderr);
  const { state, questions } = calls[0].body;
  assert.deepEqual(state.cells.cell_9.onlookers, [{ who: "customer", does: "watches", view: "back" }]);
  assert.deepEqual(state.cells.cell_1.onlookers, [{ who: "customer", does: "looks away", view: "back" }]);
  assert.ok(questions.cell_9_vivid_scene && questions.cell_9_vivid_onlooker);
  assert.equal(questions.cell_9_vivid, undefined);
  const p = readJson(path.join(out, "run.json")).words[0].pick;
  // cell 9 (lightness 240): scene level 1 (not acting) + 1, onlooker who watches 2 + 1
  assert.deepEqual(p.scores[9].vivid.parts.onlooker, { score: 3, confidence: 0.9 });
  assert.equal(p.scores[9].vivid.score, (p.scores[9].vivid.parts.scene.score + 3) / 2);
  // cell 1: the customer looks away, the lowest onlooker level
  assert.equal(p.scores[1].vivid.parts.onlooker.score, 1);
});

test("AC2 (ADR-0039): a grid whose captions have no onlookers list is unjudged", async () => {
  const { r, out } = await pickRun([{ ...WAITER, word: "plain", story: "The waiter nolookers, lightness 120." }]);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stderr, /no onlookers list/);
  assert.match(readJson(path.join(out, "run.json")).words[0].unjudged, /no onlookers list/);
});
