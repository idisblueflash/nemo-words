"use strict";

// SP-066 AC1 — Given a story of one of the 82 judged words, when the spike
// run makes its must-see list, then one text-only Claude call lists only
// objects that a drawing can show, each with its adjectives; it lists no
// abstract items (a time, a relation, a feeling with no visible sign); a name
// anchor gives its carrier as an item and its name as a name sign (ADR-0035);
// it says if the story is about a view, has one main object, or neither
// (angleCase, C-042); and the list is cached, so a re-run doesn't call Claude
// again.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { tmpDir, fixtureEnv, gridsFile, runNode, readJson, claudeCalls } = require("./helpers/harness");

test("AC1: run.js --must-see-only makes one text-only Claude call per story and saves each list with its adjectives", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const r = await runNode("run.js", ["--stage", "tuning", "--must-see-only"], fixtureEnv(out, { FAKE_CLAUDE_LOG: log }));
  assert.equal(r.code, 0, r.stderr);

  const lists = readJson(path.join(out, "must-see.json"));
  assert.deepEqual(Object.keys(lists).sort(), ["alpha", "eta", "gamma", "nu", "theta"]);
  assert.equal(lists.alpha.story, "Alpha story, lightness 120.");
  assert.deepEqual(lists.alpha.items, [{ name: "square", adjectives: ["flat", "gray"] }]);
  assert.equal(lists.alpha.isSequence, false);
  assert.equal(lists.alpha.angleCase, "none");

  const calls = claudeCalls(log);
  assert.equal(calls.length, 5, "one call per story");
  for (const c of calls) {
    assert.equal(c.mode, "must-see");
    assert.deepEqual(c.files, [], "text only: no image in the call's folder");
    const t = c.argv.indexOf("--tools");
    assert.ok(t >= 0 && c.argv[t + 1] === "", "no tools at all, so no image can be read");
  }
  // each call holds its own story
  const prompts = calls.map((c) => c.argv[c.argv.indexOf("-p") + 1]);
  for (const w of Object.values(lists)) assert.equal(prompts.filter((p) => p.includes(w.story)).length, 1);
});

test("AC1: a name anchor gives its carrier as an item and its name as a name sign, and the prompt asks for that", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const r = await runNode("run.js", ["--stage", "tuning", "--must-see-only"], fixtureEnv(out, { FAKE_CLAUDE_LOG: log }));
  assert.equal(r.code, 0, r.stderr);
  const nu = readJson(path.join(out, "must-see.json")).nu;
  assert.deepEqual(nu.items.find((i) => i.name === "nurse"), { name: "nurse", adjectives: ["tired"] });
  assert.deepEqual(nu.nameSigns, [{ item: "nurse", text: "Venice" }]);
  const prompt = claudeCalls(log)[0].argv[claudeCalls(log)[0].argv.indexOf("-p") + 1];
  assert.match(prompt, /name sign/i);
  assert.match(prompt, /\{"item":"nurse","text":"Venice"\}/);
  assert.match(prompt, /adjective/i);
});

test("AC1: the lists are cached, so a re-run doesn't call Claude again", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const env = fixtureEnv(out, { FAKE_CLAUDE_LOG: log });
  assert.equal((await runNode("run.js", ["--stage", "tuning", "--must-see-only"], env)).code, 0);
  const before = claudeCalls(log).length;
  const again = await runNode("run.js", ["--stage", "tuning", "--must-see-only"], env);
  assert.equal(again.code, 0, again.stderr);
  assert.equal(claudeCalls(log).length, before);
});

test("AC1: the prompt asks only for objects a drawing can show, and for no abstract item", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const r = await runNode("run.js", ["--stage", "tuning", "--must-see-only"], fixtureEnv(out, { FAKE_CLAUDE_LOG: log }));
  assert.equal(r.code, 0, r.stderr);
  const c = claudeCalls(log)[0];
  const prompt = c.argv[c.argv.indexOf("-p") + 1];
  assert.match(prompt, /only .*a drawing can show/i);
  assert.match(prompt, /no abstract item/i);
  assert.match(prompt, /a time/);
  assert.match(prompt, /a relation/);
  assert.match(prompt, /a feeling with no visible sign/);
});

test("AC1: the list says if the story is about a view, has one main object, or neither", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const kept = [
    { word: "ridge", grid: "alpha.grid.png", flashCell: 1, story: "Hikers look down from the ridge view, lightness 120." },
    { word: "lone", grid: "eta.grid.png", flashCell: 1, story: "A lone cob lies on the plate, lightness 150." },
    { word: "plain", grid: "theta.grid.png", flashCell: 1, story: "A cat chases a dog, lightness 30." },
  ];
  const r = await runNode("run.js", ["--stage", "tuning", "--must-see-only"], fixtureEnv(out, { SP066_GRIDS: gridsFile(out, kept), FAKE_CLAUDE_LOG: log }));
  assert.equal(r.code, 0, r.stderr);
  const lists = readJson(path.join(out, "must-see.json"));
  assert.equal(lists.ridge.angleCase, "view");
  assert.equal(lists.lone.angleCase, "one-object");
  assert.equal(lists.plain.angleCase, "none");
  const c = claudeCalls(log)[0];
  const prompt = c.argv[c.argv.indexOf("-p") + 1];
  assert.match(prompt, /"angleCase":"view"\|"one-object"\|"none"/);
});

test("AC1: an angleCase that isn't view, one-object or none is an unusable list, not a guess", () => {
  const { parseList } = require("../lib/must-see");
  assert.throws(() => parseList(JSON.stringify({ items: [], isSequence: false, angleCase: "sideways" })), /angleCase/);
  assert.throws(() => parseList(JSON.stringify({ items: [], isSequence: false })), /angleCase/);
  assert.deepEqual(parseList(JSON.stringify({ items: [{ name: "cob", adjectives: ["bare"] }], mainSubject: "cob", isSequence: false, angleCase: "one-object" })), {
    items: [{ name: "cob", adjectives: ["bare"] }],
    nameSigns: [],
    mainSubject: "cob",
    isSequence: false,
    angleCase: "one-object",
  });
});

test("AC1: a cached list without an angleCase (SP-064's shape) is made again; one with it is reused", async () => {
  const { mustSeeLists, promptKey } = require("../lib/must-see");
  let calls = 0;
  const ask = async () => (calls++, JSON.stringify({ items: [{ name: "cob", adjectives: [] }], mainSubject: null, isSequence: false, angleCase: "none" }));
  const cache = {
    old: { story: "A cob.", items: [{ name: "cob", adjectives: [] }], isSequence: false },
    ok: { story: "A cob.", items: [{ name: "cob", adjectives: [] }], nameSigns: [], isSequence: false, angleCase: "one-object", promptKey: promptKey("A cob.") },
  };
  await mustSeeLists({ words: [{ word: "old", story: "A cob." }, { word: "ok", story: "A cob." }], ask, cache });
  assert.equal(calls, 1);
  assert.equal(cache.old.angleCase, "none");
  assert.equal(cache.ok.angleCase, "one-object");
});
