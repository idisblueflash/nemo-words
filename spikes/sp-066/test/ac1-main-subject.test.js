"use strict";

// SP-066 AC1 (after stage 5, ADR-0039, C-049; after the second stage 5,
// ADR-0040, C-051) — the must-see list names the main subject as
// { name, actor } or null: the one person, animal or group of them that does
// the story's action (one of the items, actor false); one that only receives
// the action is not it, and an object is never it. When the story names no
// person but has an action that a person does, the main subject is that
// person, the actor (actor true, a short name that is not an item). A
// non-actor main subject that isn't one of the items, or a malformed value,
// gets the repair prompt once; a list still like that is a failure. An actor
// is never a must-see item.
//
// The fake claude: a story with "star" names { name: "star", actor: false };
// "grab" names the actor { name: "person who grabs the broom", actor: true };
// "bad-main" names "dragon" (no item) until the repair prompt, then "star";
// "bad-main-always" names "dragon" every time; "malformed-main" gives the old
// bare string "star" until the repair; other stories: null.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { mustSeeLists, parseList, badMainSubject, prompt } = require("../lib/must-see");
const { tmpDir, fixtureEnv, gridsFile, runNode, readJson, claudeCalls } = require("./helpers/harness");

const readJsonOr = (f, fallback) => (require("node:fs").existsSync(f) ? readJson(f) : fallback);
const promptOf = (c) => c.argv[c.argv.indexOf("-p") + 1];

async function listsOnly(kept) {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const r = await runNode("run.js", ["--stage", "tuning", "--must-see-only"], fixtureEnv(out, { SP066_GRIDS: gridsFile(out, kept), FAKE_CLAUDE_LOG: log }));
  return { r, out, log, lists: readJsonOr(path.join(out, "must-see.json"), {}), calls: claudeCalls(log) };
}

test("AC1: run.js saves each list's main subject as { name, actor } or null, and the prompt gives the rule", async () => {
  const { r, lists, calls } = await listsOnly([
    { word: "starry", grid: "alpha.grid.png", flashCell: 1, story: "A star shines, lightness 120." },
    { word: "plain", grid: "theta.grid.png", flashCell: 1, story: "A cat chases a dog, lightness 30." },
  ]);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(lists.starry.mainSubject, { name: "star", actor: false });
  assert.ok(lists.starry.items.some((i) => i.name === "star"));
  assert.equal(lists.plain.mainSubject, null);
  const p = promptOf(calls[0]);
  assert.match(p, /"mainSubject":\{"name":"\.\.\.","actor":true\|false\}\|null/);
  assert.match(p, /person, animal or group of them that does the story's action/);
  assert.match(p, /only receives the action is not the main subject/);
  assert.match(p, /An object is never the main subject/);
  assert.match(p, /names no person but has an action that a person does/);
  assert.match(p, /"actor":true/);
});

test("AC1: a story that names no person but has an action gives the actor, which is not a must-see item", async () => {
  const { r, lists, calls } = await listsOnly([{ word: "sweep", grid: "alpha.grid.png", flashCell: 2, story: "Swing deep into the corner; grab the broom, lightness 120." }]);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(lists.sweep.mainSubject, { name: "person who grabs the broom", actor: true });
  assert.ok(!lists.sweep.items.some((i) => i.name === "person who grabs the broom"), "an actor is not an item");
  assert.equal(calls.length, 1, "an actor that isn't an item needs no repair");
});

test("AC1: a main subject that isn't one of the items gets the repair prompt once, then the list is kept", async () => {
  const { r, lists, calls } = await listsOnly([{ word: "starry", grid: "alpha.grid.png", flashCell: 1, story: "A bad-main star shines, lightness 120." }]);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(calls.length, 2, "the first list and the repair");
  assert.match(promptOf(calls[1]), /"dragon"/);
  assert.match(promptOf(calls[1]), /Your last list named the main subject/);
  assert.deepEqual(lists.starry.mainSubject, { name: "star", actor: false });
});

test("AC1: a malformed main subject (the old bare string) gets the repair prompt once, then the list is kept", async () => {
  const { r, lists, calls } = await listsOnly([{ word: "starry", grid: "alpha.grid.png", flashCell: 1, story: "A malformed-main star shines, lightness 120." }]);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(calls.length, 2, "the first list and the repair");
  assert.match(promptOf(calls[1]), /Your last list named the main subject "star"/);
  assert.match(promptOf(calls[1]), /\{"name":"\.\.\.","actor":true\|false\}/);
  assert.deepEqual(lists.starry.mainSubject, { name: "star", actor: false });
});

test("AC1: a main subject still not an item after the repair: the word fails", async () => {
  const { r, out, log } = await listsOnly([{ word: "starry", grid: "alpha.grid.png", flashCell: 1, story: "A bad-main-always star shines, lightness 120." }]);
  assert.equal(r.code, 0, r.stderr);
  // the tuning order and the stage each try the list once: a first prompt and one repair each
  const repairs = claudeCalls(log).filter((c) => /Your last list named the main subject/.test(promptOf(c)));
  assert.equal(repairs.length * 2, claudeCalls(log).length, "one repair per try, no more");
  assert.match(r.stderr, /starry: must-see list failed: .*main subject.*dragon/);
  assert.equal(readJsonOr(path.join(out, "must-see.json"), {}).starry, undefined, "no list saved");
});

test("mustSeeLists: a main subject still not an item after one repair is a failure, with no third call", async () => {
  let calls = 0;
  const bad = { items: [{ name: "star", adjectives: [] }], nameSigns: [], isSequence: false, angleCase: "none", mainSubject: { name: "dragon", actor: false } };
  const r = await mustSeeLists({ words: [{ word: "starry", story: "A star shines." }], ask: async () => (calls++, JSON.stringify(bad)) });
  assert.equal(calls, 2);
  assert.match(r.failures.starry, /main subject isn't an item: \{"name":"dragon","actor":false\}/);
  assert.equal(r.cache.starry, undefined);
});

test("mustSeeLists: a main subject still malformed after one repair is a failure", async () => {
  let calls = 0;
  const bad = { items: [{ name: "star", adjectives: [] }], nameSigns: [], isSequence: false, angleCase: "none", mainSubject: { name: "star" } };
  const r = await mustSeeLists({ words: [{ word: "starry", story: "A star shines." }], ask: async () => (calls++, JSON.stringify(bad)) });
  assert.equal(calls, 2);
  assert.match(r.failures.starry, /main subject isn't usable: \{"name":"star"\}/);
});

test("parseList keeps the main subject; badMainSubject: null, an item or an actor is fine; anything else needs the repair", () => {
  const items = [{ name: "surgeon", adjectives: [] }, { name: "headlamp", adjectives: [] }];
  const list = (mainSubject) => ({ items, nameSigns: [], isSequence: false, angleCase: "none", ...(mainSubject === undefined ? {} : { mainSubject }) });
  const parsed = (m) => parseList(JSON.stringify(list(m)));
  assert.deepEqual(parsed({ name: " surgeon ", actor: false }).mainSubject, { name: "surgeon", actor: false });
  assert.deepEqual(parsed({ name: "person who sweeps", actor: true }).mainSubject, { name: "person who sweeps", actor: true });
  assert.equal(parsed(null).mainSubject, null);
  assert.equal(badMainSubject(parsed({ name: "surgeon", actor: false })), false);
  assert.equal(badMainSubject(parsed({ name: "person who sweeps", actor: true })), false, "an actor is never an item");
  assert.equal(badMainSubject(parsed(null)), false);
  assert.equal(badMainSubject(parsed({ name: "dragon", actor: false })), true);
  assert.equal(badMainSubject(parsed("surgeon")), true, "the old bare string is malformed");
  assert.equal(badMainSubject(parsed({ name: "", actor: true })), true);
  assert.equal(badMainSubject(parsed({ name: "surgeon" })), true, "no actor flag");
  assert.equal(badMainSubject(parsed({ name: "surgeon", actor: "no" })), true);
  assert.equal(badMainSubject(parsed(undefined)), true, "no mainSubject key: not named");
});

test("mustSeeLists: the main-subject repair and the name repair go in one repair prompt", async () => {
  const STORY = "If Victor misses rent, movers will make him leave.";
  const first = { items: [{ name: "Victor", adjectives: [] }, { name: "movers", adjectives: [] }], nameSigns: [], isSequence: false, angleCase: "none", mainSubject: { name: "landlord", actor: false } };
  const fixed = { items: [{ name: "man", adjectives: [] }, { name: "movers", adjectives: [] }], nameSigns: [{ item: "man", text: "Victor" }], isSequence: false, angleCase: "none", mainSubject: { name: "movers", actor: false } };
  const prompts = [];
  const ask = async (p) => (prompts.push(p), JSON.stringify(prompts.length === 1 ? first : fixed));
  const r = await mustSeeLists({ words: [{ word: "evicted", story: STORY }], ask });
  assert.equal(prompts.length, 2);
  assert.match(prompts[1], /"Victor"/);
  assert.match(prompts[1], /"landlord"/);
  assert.deepEqual(r.cache.evicted.mainSubject, { name: "movers", actor: false });
  assert.deepEqual(r.failures, {});
});

test("the must-see prompt changes, so every list made under the old prompt is made again", () => {
  // the key of the prompt before ADR-0040, for this story
  assert.notEqual(require("../lib/must-see").promptKey("A star shines."), "2e80671e70d0c711");
  assert.doesNotMatch(prompt("A star shines."), /the one person or object that the story is about/);
});
