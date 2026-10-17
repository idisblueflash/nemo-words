"use strict";

// SP-066 AC1 (after stage 2, ADR-0035, C-043) — a name anchor gives the person
// or thing that carries the name as a must-see item (a nurse), and its name
// sign: the text that the picture should show ("Venice"). A name sign is not a
// must-see item, so the gate never checks it. A list that leaves the name in
// an item's name (a bare "Victor", or SP-064's "nurse with a nametag that
// reads Venice") is asked again once with a repair prompt; a list still like
// that is a failure. A list cached under an older prompt is made again.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { mustSeeLists, unsignedNames, parseList, prompt, promptKey } = require("../lib/must-see");
const { tmpDir, fixtureEnv, runNode, readJson, claudeCalls } = require("./helpers/harness");

const STORY = "If Victor misses rent, movers will make him leave.";
const BARE = { items: [{ name: "Victor", adjectives: ["worried"] }, { name: "movers", adjectives: [] }], nameSigns: [], isSequence: false, angleCase: "none" };
const NAMETAG = { items: [{ name: 'man with a nametag reading "Victor"', adjectives: [] }, { name: "movers", adjectives: [] }], nameSigns: [], isSequence: false, angleCase: "none" };
const SIGNED = {
  items: [{ name: "man", adjectives: ["worried"] }, { name: "movers", adjectives: [] }],
  nameSigns: [{ item: "man", text: "Victor" }],
  isSequence: false,
  angleCase: "none",
};

test("AC1: run.js gives a name anchor's carrier as a must-see item and the name as a name sign", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const r = await runNode("run.js", ["--stage", "tuning", "--must-see-only"], fixtureEnv(out, { FAKE_CLAUDE_LOG: log }));
  assert.equal(r.code, 0, r.stderr);
  const lists = readJson(path.join(out, "must-see.json"));
  const nu = lists.nu;
  assert.ok(nu.items.some((i) => i.name === "nurse"), "the carrier is a must-see item");
  assert.deepEqual(nu.nameSigns, [{ item: "nurse", text: "Venice" }]);
  for (const i of nu.items) assert.doesNotMatch(i.name, /Venice|nametag/, "the name sign is not a must-see item");
  assert.deepEqual(lists.alpha.nameSigns, [], "a story with no name anchor has no name sign");

  const c = claudeCalls(log)[0];
  const p = c.argv[c.argv.indexOf("-p") + 1];
  assert.match(p, /"nameSigns":\[\{"item":"\.\.\.","text":"\.\.\."\}\]/);
  assert.match(p, /carries the name/);
  assert.match(p, /nurse/);
  assert.match(p, /"Venice"/);
});

test("AC1: parseList keeps the name signs; a name sign must name its carrier and its text", () => {
  assert.deepEqual(parseList(JSON.stringify(SIGNED)).nameSigns, [{ item: "man", text: "Victor" }]);
  assert.deepEqual(parseList(JSON.stringify({ ...SIGNED, nameSigns: undefined })).nameSigns, [], "no name signs: an empty list");
  assert.throws(() => parseList(JSON.stringify({ ...SIGNED, nameSigns: [{ item: "man" }] })), /name sign/);
  assert.throws(() => parseList(JSON.stringify({ ...SIGNED, nameSigns: "Victor" })), /name sign/);
});

test("a name left in an item name is an unsigned name, with or without a nametag; a carrier with a name sign is not", () => {
  assert.deepEqual(unsignedNames(STORY, BARE), ["Victor"]);
  assert.deepEqual(unsignedNames(STORY, NAMETAG), ["Victor"]);
  assert.deepEqual(unsignedNames(STORY, SIGNED), []);
  assert.deepEqual(unsignedNames("Spoon tips the mug.", { items: [{ name: "spoon", adjectives: [] }], nameSigns: [] }), []);
});

test("a name sign whose carrier isn't a must-see item needs the repair too", () => {
  assert.deepEqual(unsignedNames(STORY, { ...SIGNED, nameSigns: [{ item: "landlord", text: "Victor" }] }), ["Victor"]);
});

test("a list that leaves a name in an item name is asked again once, with the repair prompt, and the carrier list is kept", async () => {
  const prompts = [];
  const ask = async (p) => (prompts.push(p), JSON.stringify(prompts.length === 1 ? NAMETAG : SIGNED));
  const r = await mustSeeLists({ words: [{ word: "evicted", story: STORY }], ask });
  assert.equal(prompts.length, 2);
  assert.match(prompts[1], /"Victor"/);
  assert.match(prompts[1], /carries the name/);
  assert.match(prompts[1], /name sign/);
  assert.doesNotMatch(prompts[1], /show it as a nametag/);
  assert.deepEqual(r.cache.evicted.items, SIGNED.items);
  assert.deepEqual(r.cache.evicted.nameSigns, SIGNED.nameSigns);
  assert.deepEqual(r.failures, {});
});

test("a name still in an item name after the repair is a failure, not a saved list", async () => {
  const ask = async () => JSON.stringify(BARE);
  const r = await mustSeeLists({ words: [{ word: "evicted", story: STORY }], ask });
  assert.match(r.failures.evicted, /Victor/);
  assert.equal(r.cache.evicted, undefined);
});

test("AC1: a list cached under an older prompt (SP-064's nametag item) is made again; a list made under this prompt is reused", async () => {
  let calls = 0;
  const ask = async () => (calls++, JSON.stringify(SIGNED));
  const fresh = { story: STORY, ...SIGNED, promptKey: promptKey(STORY) };
  const cache = {
    old: { story: STORY, items: [{ name: 'person with a nametag reading "Victor"', adjectives: [] }], isSequence: false, angleCase: "none" },
    ok: fresh,
  };
  await mustSeeLists({ words: [{ word: "old", story: STORY }, { word: "ok", story: STORY }], ask, cache });
  assert.equal(calls, 1);
  assert.deepEqual(cache.old.nameSigns, SIGNED.nameSigns);
  assert.equal(cache.old.promptKey, promptKey(STORY));
  assert.equal(cache.ok, fresh);
  assert.equal(promptKey(STORY).length, 16);
  assert.notEqual(promptKey(STORY), promptKey("Another story."));
  assert.ok(prompt(STORY).includes(STORY));
});
