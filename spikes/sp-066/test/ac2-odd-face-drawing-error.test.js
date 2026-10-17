"use strict";

// SP-066 AC2 (after stage 20, ADR-0039, change 5) — a face or a hand that is
// drawn wrong (twisted, melted, extra fingers) is a drawing error, and Jev's
// drawing part of plausible is told so.

const test = require("node:test");
const assert = require("node:assert/strict");

const { prompt } = require("../lib/caption");
const { loadRubric } = require("../lib/pick");

test("AC2 (ADR-0039): the caption prompt lists a face or a hand drawn wrong as a drawing error", () => {
  const p = prompt([{ name: "crowd", adjectives: ["curious"] }], "appeal");
  assert.match(p, /A face or a hand that is drawn wrong \(twisted, melted or lopsided features, odd eyes, extra or missing fingers\) is a drawing error/);
  assert.match(p, /give the person as the object, with "mustSee" true when the person is one of the item names below/);
});

test("AC3 (ADR-0039): the drawing part of plausible counts a face or a hand drawn wrong", () => {
  assert.match(loadRubric().axes.plausible.parts.drawing.check, /a face or a hand drawn wrong/);
});
