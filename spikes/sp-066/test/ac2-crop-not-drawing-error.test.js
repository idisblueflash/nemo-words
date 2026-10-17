"use strict";

// SP-066 AC2 (bug-018) — a crop, a small object or a wrong state is not a
// drawing error (C-044). Only an object that floats, looks pasted on, or
// breaks the lines of the wall or floor is one.

const test = require("node:test");
const assert = require("node:assert/strict");

const caption = require("../lib/caption");

test("bug-018: the caption prompt says a crop, a small object or a wrong state is not a drawing error", () => {
  const p = caption.prompt([{ name: "nurse", adjectives: [] }], "ventilator");
  assert.match(p, /cut off by the edge of the cell/);
  assert.match(p, /a crop/);
  assert.match(p, /drawn small/);
  assert.match(p, /in the wrong state/);
  assert.match(p, /is not a drawing error/);
});
