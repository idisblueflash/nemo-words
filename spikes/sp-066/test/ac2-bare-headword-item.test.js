"use strict";

// SP-066 AC2 and AC3 (bug-020) — a must-see item that is wholly the headword
// ("surgeon" for the word "surgeon") is not shown to the blind captioner as the
// meaningless "key item". It gets a description that holds no headword, so a
// cell that shows the item is marked from what it shows and the gate keeps it.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const caption = require("../lib/caption");
const { maskName, describeBareName } = require("../lib/headword");
const { tmpDir, fixtureEnv, gridsFile, runNode, readJson } = require("./helpers/harness");

const items = (...names) => names.map((name) => ({ name, adjectives: [] }));
const seen = (prompt) => prompt.split("\n").pop();

test("bug-020: an item that is wholly the headword gets a description, never the bare placeholder", () => {
  const p = caption.prompt(items("operating room", "surgeon", "headlamp"), "surgeon");
  assert.doesNotMatch(p, /surgeon/i);
  assert.doesNotMatch(p, /key item/);
  assert.equal(describeBareName("surgeon", "surgeon"), "the main subject of the picture (the one thing or person the scene is about)");
  assert.equal(describeBareName("surgeon", "Surgeons"), describeBareName("surgeon", "surgeon"));
  assert.match(seen(p), /^MUST-SEE ITEMS: \["operating room","the main subject/);
});

test("bug-020: a name that holds the headword with other words keeps the placeholder, so other prompts stay byte-identical", () => {
  assert.equal(describeBareName("pajamas", "matching pajamas"), null);
  assert.equal(seen(caption.prompt(items("matching pajamas"), "pajamas")), 'MUST-SEE ITEMS: ["matching key item"]');
  assert.equal(seen(caption.prompt(items("nurse", "breathing machine (ventilator)"), "ventilator")), 'MUST-SEE ITEMS: ["nurse","breathing machine"]');
  assert.equal(maskName("surgeon", "surgeon"), "key item");
});

test("bug-020: the mustSee key stays the list's item name", () => {
  const list = items("surgeon");
  const desc = describeBareName("surgeon", "surgeon");
  const answer = JSON.stringify({
    objects: [],
    shot: "medium",
    angle: "eye level",
    step: "during",
    extras: { floor: true, background: "", morePeople: false, readableText: "" },
    action: "she operates",
    mustSee: { [desc]: { mark: "visible", size: "large", place: "front" } },
    drawingErrors: [],
    onlookers: [],
  });
  assert.deepEqual(caption.parseCaption(answer, list, "surgeon").mustSee, { surgeon: { mark: "visible", size: "large", place: "front" } });
});

test("bug-020: a run keeps the cells that show the bare-headword item", async () => {
  const out = tmpDir();
  const kept = [{ word: "surgeon", grid: "alpha.grid.png", flashCell: 6, story: "Power surge! An OR goes dark; she operates by headlamp, lightness 120." }];
  const r = await runNode("run.js", ["--stage", "tuning", "--caption-only"], fixtureEnv(out, { SP066_GRIDS: gridsFile(out, kept) }));
  assert.equal(r.code, 0, r.stderr);
  const caps = readJson(path.join(out, "captions.json"))["alpha.grid.png"];
  for (const c of Object.values(caps)) assert.equal(c.mustSee.surgeon.mark, "visible");
});
