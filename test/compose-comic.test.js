// Coverage for scripts/compose-comic.sh — composes 3 or 4 picked cells of a
// _vivian 3×3 grid into one 2×2 comic image (ADR-0020/0021/0022).
//
// Runs the real script against a synthetic 300×300 grid (nine solid-colour
// cells) built with ImageMagick, so no generated art is needed — images/mnemonic/
// is gitignored.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const SCRIPT = path.join(__dirname, "..", "scripts", "compose-comic.sh");
const COLOURS = ["red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink", "gray"];

function makeGrid(dir, colours = COLOURS, name = "grid.png") {
  const cells = colours.map((c, i) => {
    const p = path.join(dir, `${name}.in${i}.png`);
    execFileSync("magick", ["-size", "100x100", `xc:${c}`, p]);
    return p;
  });
  const rows = [0, 1, 2].map((r) => {
    const p = path.join(dir, `${name}.row${r}.png`);
    execFileSync("magick", [...cells.slice(r * 3, r * 3 + 3), "+append", p]);
    return p;
  });
  const grid = path.join(dir, name);
  execFileSync("magick", [...rows, "-append", grid]);
  return grid;
}

function size(p) {
  return execFileSync("magick", ["identify", "-format", "%wx%h", p]).toString();
}

// Colour at a point, as an RRGGBB hex string.
function pixel(p, x, y) {
  return execFileSync("magick", [p, "-format", `%[hex:p{${x},${y}}]`, "info:"]).toString();
}

function srgb(name) {
  return execFileSync("magick", [`xc:${name}`, "-depth", "8", "-format", "%[hex:p{0,0}]", "info:"]).toString();
}

test("compose-comic", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "compose-comic-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const grid = makeGrid(dir);

  // Each 100px cell → shave 4 → 92 → +3 border each side → 98px panel.
  // Layout: 12 margin + 98 + 12 gutter + 98 + 12 margin = 232, both axes.
  // Panel centres sit at 61 and 171; the image centre is 116.
  await t.test("4 cells fill a 2×2 in Z-order, in the order given", () => {
    const out = path.join(dir, "four.png");
    execFileSync(SCRIPT, [grid, out, "1", "7", "8", "9"]);
    assert.equal(size(out), "232x232");
    assert.equal(pixel(out, 61, 61), srgb("red")); // top-left = cell 1
    assert.equal(pixel(out, 171, 61), srgb("purple")); // top-right = cell 7
    assert.equal(pixel(out, 61, 171), srgb("pink")); // bottom-left = cell 8
    assert.equal(pixel(out, 171, 171), srgb("gray")); // bottom-right = cell 9
  });

  await t.test("3 cells: two on top, the third centred on the bottom row", () => {
    const out = path.join(dir, "three.png");
    execFileSync(SCRIPT, [grid, out, "2", "5", "9"]);
    assert.equal(size(out), "232x232");
    assert.equal(pixel(out, 61, 61), srgb("orange"));
    assert.equal(pixel(out, 171, 61), srgb("cyan"));
    assert.equal(pixel(out, 116, 171), srgb("gray")); // centre of bottom row
    assert.equal(pixel(out, 30, 171), srgb("white")); // left of it is blank
  });

  await t.test("a PATH:N cell is taken from a different grid", () => {
    const other = makeGrid(dir, [...COLOURS].reverse(), "other.png"); // cell 1 = gray, 9 = red
    const out = path.join(dir, "mixed.png");
    execFileSync(SCRIPT, [grid, out, "2", `${other}:1`, "3", `${other}:9`]);
    assert.equal(pixel(out, 61, 61), srgb("orange")); // cell 2 of INPUT
    assert.equal(pixel(out, 171, 61), srgb("gray")); // cell 1 of other
    assert.equal(pixel(out, 61, 171), srgb("yellow")); // cell 3 of INPUT
    assert.equal(pixel(out, 171, 171), srgb("red")); // cell 9 of other
  });

  await t.test("refuses fewer than 3 or more than 4 cells", () => {
    for (const cells of [["1", "2"], ["1", "2", "3", "4", "5"]]) {
      const r = spawnSync(SCRIPT, [grid, path.join(dir, "bad.png"), ...cells]);
      assert.notEqual(r.status, 0);
      assert.match(r.stderr.toString(), /need 3 or 4 cells/);
    }
    assert.equal(fs.existsSync(path.join(dir, "bad.png")), false);
  });
});
