"use strict";

// SP-066 AC3 (after stage 20, ADR-0041, change 4) — an item that the story
// calls small (tiny) is in its state when it looks small next to another
// story item, and a wide shot that shows it so is not "small, far away" for
// the scene part or the size part.

const test = require("node:test");
const assert = require("node:assert/strict");

const { loadRubric } = require("../lib/pick");

test("AC3 (ADR-0041): the state part checks a size word by comparison with another story item", () => {
  const { state } = loadRubric().axes.clarity.parts;
  assert.match(state.check, /in its state only when it looks that size next to another story item/);
  assert.match(state.check, /a tiny house drawn large in the front of the cell is not in its state/);
});

test("AC3 (ADR-0041): a small item that the story calls small costs nothing in the size part", () => {
  const { size } = loadRubric().axes.clarity.parts;
  assert.match(size.check, /calls small \(tiny, little\) and that is drawn small or medium next to a larger story item costs nothing/);
});

test("AC3 (ADR-0041): a wide shot that shows a small item small next to a larger one is not \"small, far away\" in the scene part", () => {
  const { scene } = loadRubric().axes.vivid.parts;
  assert.match(scene.check, /a wide shot that shows the whole place, with the small item small next to a larger story item, is not "small, far away"/);
});
