"use strict";

// SP-066 AC2 (after stage 5, ADR-0037, C-045) — when the story has a main
// subject, each caption gives the view of the main subject: front,
// three-quarter, side, back or from above (null when the cell hides it). A
// caption with no mainView then is unusable. A story with no main subject
// gets no mainView question, and its captions have mainView null. The main
// subject reaches the captioner without the headword (bug-016, bug-020).
//
// The fake captioner gives the view by the cell's lightness: below 60 above,
// below 90 back, below 150 side, below 210 three-quarter, else front. It
// leaves mainView out when the main subject is "noview".

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const caption = require("../lib/caption");
const { tmpDir, fixtureEnv, gridsFile, runNode, readJson, claudeCalls } = require("./helpers/harness");

const promptOf = (c) => c.argv[c.argv.indexOf("-p") + 1];
const items = (...names) => names.map((name) => ({ name, adjectives: [] }));

async function captionOnly(kept) {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const r = await runNode("run.js", ["--stage", "tuning", "--caption-only"], fixtureEnv(out, { SP066_GRIDS: gridsFile(out, kept), FAKE_CLAUDE_LOG: log }));
  assert.equal(r.code, 0, r.stderr);
  const fs = require("node:fs");
  const f = path.join(out, "captions.json");
  return { r, captions: fs.existsSync(f) ? readJson(f) : {}, calls: claudeCalls(log).filter((c) => c.mode === "caption") };
}

test("AC2: with a main subject, each caption gives its view; without one, there is no view question and mainView is null", async () => {
  const { captions, calls } = await captionOnly([
    { word: "starry", grid: "alpha.grid.png", flashCell: 1, story: "A star shines, lightness 120." },
    { word: "plain", grid: "theta.grid.png", flashCell: 1, story: "A cat chases a dog, lightness 30." },
  ]);
  // alpha: cell n = lightness 30·(n−1)
  assert.deepEqual(
    Object.values(captions["alpha.grid.png"]).map((c) => c.mainView),
    ["above", "above", "back", "side", "side", "three-quarter", "three-quarter", "front", "front"],
  );
  for (const c of Object.values(captions["theta.grid.png"])) assert.equal(c.mainView, null);

  const starry = calls.filter((c) => /MUST-SEE ITEMS: .*"star"/.test(promptOf(c)));
  const plain = calls.filter((c) => !/"star"/.test(promptOf(c)));
  assert.equal(starry.length, 9);
  assert.equal(plain.length, 9);
  for (const c of starry) {
    assert.match(promptOf(c), /"mainView"/);
    assert.match(promptOf(c), /"front", "three-quarter", "side", "back" or "above"/);
    assert.match(promptOf(c), /^MAIN SUBJECT: "star"$/m);
  }
  for (const c of plain) {
    assert.doesNotMatch(promptOf(c), /mainView|MAIN SUBJECT/);
  }
});

test("AC2: a caption with no mainView while the story has a main subject is unusable, so the word fails", async () => {
  const { r, captions } = await captionOnly([{ word: "blank", grid: "alpha.grid.png", flashCell: 1, story: "A noview square, lightness 120." }]);
  assert.match(r.stderr, /blank: caption failed for cell 1: .*mainView/);
  assert.equal(captions["alpha.grid.png"], undefined, "an unusable caption isn't cached");
});

test("AC2: the main subject reaches the captioner without the headword (bug-016, bug-020)", async () => {
  const { calls } = await captionOnly([{ word: "surgeon", grid: "alpha.grid.png", flashCell: 6, story: "Power surge! An OR goes dark; she operates by headlamp, lightness 120." }]);
  assert.equal(calls.length, 9);
  for (const c of calls) {
    assert.doesNotMatch(promptOf(c), /surgeon/i);
    assert.match(promptOf(c), /^MAIN SUBJECT: "the main subject of the picture/m);
  }
});

test("parseCaption: mainView must be one of the five views; null only when the main subject is hidden", () => {
  const answer = (mustSee, extra) =>
    JSON.stringify({
      objects: [],
      shot: "medium",
      angle: "eye level",
      step: "during",
      extras: { floor: true, background: "", morePeople: false, readableText: "" },
      action: "she operates",
      mustSee,
      drawingErrors: [],
      ...extra,
    });
  const shown = { star: { mark: "visible", size: "large", place: "front" } };
  const hidden = { star: { mark: "hidden", size: null, place: null } };
  const list = items("star");
  for (const v of caption.VIEWS) assert.equal(caption.parseCaption(answer(shown, { mainView: v }), list, "starry", "star").mainView, v);
  assert.deepEqual(caption.VIEWS, ["front", "three-quarter", "side", "back", "above"]);
  assert.throws(() => caption.parseCaption(answer(shown, {}), list, "starry", "star"), /mainView/);
  assert.throws(() => caption.parseCaption(answer(shown, { mainView: "sideways" }), list, "starry", "star"), /mainView/);
  assert.throws(() => caption.parseCaption(answer(shown, { mainView: null }), list, "starry", "star"), /mainView/, "a shown main subject has a view");
  assert.equal(caption.parseCaption(answer(hidden, { mainView: null }), list, "starry", "star").mainView, null);
  assert.equal(caption.parseCaption(answer(hidden, { mainView: "side" }), list, "starry", "star").mainView, null, "a hidden main subject has no view");
  // no main subject: no view, whatever the answer says
  assert.equal(caption.parseCaption(answer(shown, {}), list, "starry", null).mainView, null);
  assert.equal(caption.parseCaption(answer(shown, { mainView: "front" }), list, "starry").mainView, null);
});

test("a caption made under the prompt without the main subject is made again once the list has one", () => {
  const list = items("star");
  assert.notEqual(caption.promptKey(list, "starry", "star"), caption.promptKey(list, "starry", null));
  assert.equal(caption.prompt(list, "starry", null), caption.prompt(list, "starry"));
});
