"use strict";

// SP-064 AC1 (bug-015) — a name anchor becomes its visible sign. A list that
// leaves the name as a bare item ("Victor", "worried") is asked again once; a
// cached list like that is made again; one that stays bare is a failure.

const test = require("node:test");
const assert = require("node:assert/strict");

const { mustSeeLists, unsignedNames } = require("../lib/must-see");

const BARE = { items: [{ name: "Victor", adjectives: ["worried"] }, { name: "movers", adjectives: [] }], isSequence: false };
const SIGNED = { items: [{ name: "man", adjectives: ['nametag reading "Victor"'] }], isSequence: false };
const STORY = "If Victor misses rent, movers will make him leave.";

test("a bare name item is an unsigned name; a nametag reading the name is not", () => {
  assert.deepEqual(unsignedNames(STORY, BARE.items), ["Victor"]);
  assert.deepEqual(unsignedNames(STORY, SIGNED.items), []);
  assert.deepEqual(unsignedNames("Spoon tips the mug.", [{ name: "spoon", adjectives: [] }]), []);
});

test("a list that leaves a name bare is asked again once, and the signed list is kept", async () => {
  const prompts = [];
  const ask = async (p) => (prompts.push(p), JSON.stringify(prompts.length === 1 ? BARE : SIGNED));
  const r = await mustSeeLists({ words: [{ word: "evicted", story: STORY }], ask });
  assert.equal(prompts.length, 2);
  assert.match(prompts[1], /Victor/);
  assert.deepEqual(r.cache.evicted.items, SIGNED.items);
  assert.deepEqual(r.failures, {});
});

test("a cached list with a bare name is made again; a good cached list is not", async () => {
  let calls = 0;
  const ask = async () => (calls++, JSON.stringify(SIGNED));
  const cache = {
    evicted: { story: STORY, ...BARE },
    ok: { story: "Plain story.", items: [{ name: "x", adjectives: [] }], isSequence: false },
  };
  await mustSeeLists({ words: [{ word: "evicted", story: STORY }, { word: "ok", story: "Plain story." }], ask, cache });
  assert.equal(calls, 1);
  assert.deepEqual(cache.evicted.items, SIGNED.items);
});

test("a name still bare after the second ask is a failure, not a saved list", async () => {
  const ask = async () => JSON.stringify(BARE);
  const r = await mustSeeLists({ words: [{ word: "evicted", story: STORY }], ask });
  assert.match(r.failures.evicted, /Victor/);
  assert.equal(r.cache.evicted, undefined);
});
