"use strict";

// SP-066 AC1 (after stage 5, ADR-0037, C-045) — the must-see list names the
// main subject: the one person or object that the story is about (one of its
// items), or none (null). A value that isn't one of the items gets the repair
// prompt once; a list still like that is a failure.
//
// The fake claude: a story with "star" lists the item "star" as its main
// subject; "bad-main" names "dragon" (no item) until the repair prompt, then
// "star"; "bad-main-always" names "dragon" every time; other stories: null.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { mustSeeLists, parseList, badMainSubject } = require("../lib/must-see");
const { tmpDir, fixtureEnv, gridsFile, runNode, readJson, claudeCalls } = require("./helpers/harness");

const readJsonOr = (f, fallback) => (require("node:fs").existsSync(f) ? readJson(f) : fallback);
const promptOf =(c) => c.argv[c.argv.indexOf("-p") + 1];

test("AC1: run.js saves each list's main subject, an item name or null, and the prompt asks for it", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const kept = [
    { word: "starry", grid: "alpha.grid.png", flashCell: 1, story: "A star shines, lightness 120." },
    { word: "plain", grid: "theta.grid.png", flashCell: 1, story: "A cat chases a dog, lightness 30." },
  ];
  const r = await runNode("run.js", ["--stage", "tuning", "--must-see-only"], fixtureEnv(out, { SP066_GRIDS: gridsFile(out, kept), FAKE_CLAUDE_LOG: log }));
  assert.equal(r.code, 0, r.stderr);
  const lists = readJson(path.join(out, "must-see.json"));
  assert.equal(lists.starry.mainSubject, "star");
  assert.ok(lists.starry.items.some((i) => i.name === "star"));
  assert.equal(lists.plain.mainSubject, null);
  const p = promptOf(claudeCalls(log)[0]);
  assert.match(p, /main subject/i);
  assert.match(p, /"mainSubject":"\.\.\."\|null/);
});

test("AC1: a main subject that isn't one of the items gets the repair prompt once, then the list is kept", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const kept = [{ word: "starry", grid: "alpha.grid.png", flashCell: 1, story: "A bad-main star shines, lightness 120." }];
  const r = await runNode("run.js", ["--stage", "tuning", "--must-see-only"], fixtureEnv(out, { SP066_GRIDS: gridsFile(out, kept), FAKE_CLAUDE_LOG: log }));
  assert.equal(r.code, 0, r.stderr);
  const calls = claudeCalls(log);
  assert.equal(calls.length, 2, "the first list and the repair");
  assert.match(promptOf(calls[1]), /"dragon"/);
  assert.match(promptOf(calls[1]), /main subject/i);
  assert.equal(readJson(path.join(out, "must-see.json")).starry.mainSubject, "star");
});

test("AC1: a main subject still not an item after the repair: the word fails", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const kept = [{ word: "starry", grid: "alpha.grid.png", flashCell: 1, story: "A bad-main-always star shines, lightness 120." }];
  const r = await runNode("run.js", ["--stage", "tuning", "--must-see-only"], fixtureEnv(out, { SP066_GRIDS: gridsFile(out, kept), FAKE_CLAUDE_LOG: log }));
  assert.equal(r.code, 0, r.stderr);
  // the tuning order and the stage each try the list once: a first prompt and one repair each
  const repairs = claudeCalls(log).filter((c) => /Your last list named the main subject/.test(promptOf(c)));
  assert.equal(repairs.length * 2, claudeCalls(log).length, "one repair per try, no more");
  assert.match(r.stderr, /starry: must-see list failed: .*main subject.*dragon/);
  assert.equal(readJsonOr(path.join(out, "must-see.json"), {}).starry, undefined, "no list saved");
});

test("mustSeeLists: a main subject still not an item after one repair is a failure, with no third call", async () => {
  let calls = 0;
  const bad = { items: [{ name: "star", adjectives: [] }], nameSigns: [], isSequence: false, angleCase: "none", mainSubject: "dragon" };
  const r = await mustSeeLists({ words: [{ word: "starry", story: "A star shines." }], ask: async () => (calls++, JSON.stringify(bad)) });
  assert.equal(calls, 2);
  assert.match(r.failures.starry, /main subject isn't an item: "dragon"/);
  assert.equal(r.cache.starry, undefined);
});

test("parseList keeps the main subject; badMainSubject is true for a value that isn't an item or null", () => {
  const items = [{ name: "surgeon", adjectives: [] }, { name: "headlamp", adjectives: [] }];
  const list = (mainSubject) => ({ items, nameSigns: [], isSequence: false, angleCase: "none", ...(mainSubject === undefined ? {} : { mainSubject }) });
  assert.equal(parseList(JSON.stringify(list("surgeon"))).mainSubject, "surgeon");
  assert.equal(parseList(JSON.stringify(list(null))).mainSubject, null);
  assert.equal(badMainSubject(parseList(JSON.stringify(list("surgeon")))), false);
  assert.equal(badMainSubject(parseList(JSON.stringify(list(null)))), false);
  assert.equal(badMainSubject(parseList(JSON.stringify(list("dragon")))), true);
  assert.equal(badMainSubject(parseList(JSON.stringify(list("")))), true);
  assert.equal(badMainSubject(parseList(JSON.stringify(list(undefined)))), true, "no mainSubject key: not named");
});

test("mustSeeLists: the main-subject repair and the name repair go in one repair prompt", async () => {
  const STORY = "If Victor misses rent, movers will make him leave.";
  const first = { items: [{ name: "Victor", adjectives: [] }, { name: "movers", adjectives: [] }], nameSigns: [], isSequence: false, angleCase: "none", mainSubject: "landlord" };
  const fixed = { items: [{ name: "man", adjectives: [] }, { name: "movers", adjectives: [] }], nameSigns: [{ item: "man", text: "Victor" }], isSequence: false, angleCase: "none", mainSubject: "man" };
  const prompts = [];
  const ask = async (p) => (prompts.push(p), JSON.stringify(prompts.length === 1 ? first : fixed));
  const r = await mustSeeLists({ words: [{ word: "evicted", story: STORY }], ask });
  assert.equal(prompts.length, 2);
  assert.match(prompts[1], /"Victor"/);
  assert.match(prompts[1], /"landlord"/);
  assert.equal(r.cache.evicted.mainSubject, "man");
  assert.deepEqual(r.failures, {});
});
