"use strict";

// SP-066 AC3 (after stage 20, ADR-0039, second way of change 3) — a main
// subject that only watches or reacts to what another figure does (a curious
// crowd that bells attract, while a bell ringer acts) is an onlooker of that
// action: the view part gives its back view, facing the action, the top level.

const test = require("node:test");
const assert = require("node:assert/strict");

const { loadRubric } = require("../lib/pick");

test("AC3 (ADR-0039): the view part's check gives a reacting group's back view, facing the action, the top level", () => {
  const view = loadRubric().axes.clarity.parts.view;
  assert.match(view.check, /only watches or reacts to what another figure in the cell does/);
  assert.match(view.check, /a back view that faces the action gets the top level/);
  // the levels stay as they were (ADR-0037)
  assert.match(view.levels[0], /back or from above/);
  assert.match(view.levels[2], /front or in three-quarter view/);
});
