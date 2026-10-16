"use strict";

// Unit tests for the pixel match and the grid / story sources (AC1's edge cases).

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { rmsDistance, matchCell } = require("../lib/pixels");
const { GRID_RE } = require("../lib/grids");
const { makeLookup } = require("../lib/sources");
const { CARD_FILE, LOG_FILE } = require("./helpers/harness");

const vec = (level) => Buffer.alloc(48 * 48, level);

test("rmsDistance is 0 for the same pixels and 1 for black against white", () => {
  assert.equal(rmsDistance(vec(10), vec(10)), 0);
  assert.equal(rmsDistance(vec(0), vec(255)), 1);
});

test("matchCell takes the nearest cell, and is clear only at distance < 0.03 with the next ≥ 0.1", () => {
  const cells = [0, 30, 60, 90, 120, 150, 180, 210, 240].map(vec);
  assert.deepEqual(
    { ...matchCell(cells, vec(122)), distance: undefined, next: undefined },
    { cell: 5, clear: true, distance: undefined, next: undefined },
  );
  assert.equal(matchCell(cells, vec(128)).clear, false); // nearest 0.031 — too far
  const twins = [100, 105, 200, 210, 220, 230, 240, 250, 0].map(vec); // next-nearest only 0.02 away
  const m = matchCell(twins, vec(100));
  assert.equal(m.cell, 1);
  assert.equal(m.clear, false);
});

test("grid names: .grid, .grid-2 and a tagged .<tag>.grid all belong to the word before the first dot", () => {
  const word = (f) => (GRID_RE.exec(f) || [])[1];
  assert.equal(word("aisle.grid.png"), "aisle");
  assert.equal(word("apparatus.grid-2.png"), "apparatus");
  assert.equal(word("udon.noodles.grid.png"), "udon");
  assert.equal(word("-gen-.grid-2.png"), "-gen-");
  assert.equal(word("aisle.png"), undefined);
  assert.equal(word("coaster.comic.png"), undefined);
});

test("a story is the latest logged sentence, else the card's Back; medical-word-parts rows are word parts", () => {
  const lookup = makeLookup(fs.readFileSync(CARD_FILE, "utf8"), fs.readFileSync(LOG_FILE, "utf8"));
  assert.equal(lookup("alpha").story, "Alpha story, lightness 120.");
  assert.equal(lookup("Eta").story, "Eta story from the card, lightness 150.");
  assert.equal(lookup("zeta").story, null);
  assert.equal(lookup("-delta-").wordPart, true);
  assert.equal(lookup("alpha").wordPart, false);
  assert.equal(lookup("nope"), null);
});
