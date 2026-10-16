"use strict";

// SP-064 AC3 (bug-017) — the grid-differences call never sees the word, even
// when the must-see list holds it in an item name or an adjective. A list that
// doesn't hold the word gives the same prompt as before, so its cached lines
// stay; a cache entry made under a prompt that leaked the word is made again.

const test = require("node:test");
const assert = require("node:assert/strict");

const diff = require("../lib/differences");

const item = (name, ...adjectives) => ({ name, adjectives });
const seen = (prompt) => prompt.split("\n").pop();
const LINES = Array.from({ length: 9 }, (_, i) => `line ${i + 1}`);

test("bug-017: the prompt hides the word in an adjective and in an item name", () => {
  const worn = [item("driver", "warned"), item("tire", "bald", "worn", "rubbed smooth")];
  assert.equal(seen(diff.prompt(worn, "worn")), 'MUST-SEE LIST: [{"name":"driver","adjectives":["warned"]},{"name":"tire","adjectives":["bald","rubbed smooth"]}]');
  assert.doesNotMatch(diff.prompt([item("breathing machine (ventilator)", "loud")], "ventilator"), /ventilator/i);
  assert.doesNotMatch(diff.prompt([item("matching pajamas")], "pajamas"), /pajamas/i);
  assert.doesNotMatch(diff.prompt([item("surgeon", "masked")], "surgeon"), /surgeon/i);
});

test("bug-017: a list without the word gives the very same prompt and key as without a word", () => {
  const list = [item("nurse", "tired"), item('nametag that reads "Venice"')];
  assert.equal(diff.prompt(list, "nu"), diff.prompt(list));
  assert.equal(diff.promptKey(list, "nu"), diff.promptKey(list));
});

test("bug-017: a name anchor's visible sign stays in the prompt", () => {
  const list = [item('nametag that reads "Venice"'), item("gondola")];
  assert.match(diff.prompt(list, "gondola"), /nametag that reads \\"Venice\\"/);
});

test("bug-017: only a grid whose prompt changed is asked again", async () => {
  const lists = { worn: { items: [item("tire", "worn")] }, plain: { items: [item("cup", "red")] }, fresh: { items: [item("cup", "red")] } };
  const words = [{ word: "worn", grid: "w.png" }, { word: "plain", grid: "p.png" }, { word: "fresh", grid: "f.png" }];
  const cache = {
    "w.png": LINES, // old bare entry, made under the leaking prompt
    "p.png": LINES, // old bare entry, prompt unchanged
    "f.png": { promptKey: diff.promptKey(lists.fresh.items, "fresh"), lines: LINES },
  };
  const asked = [];
  const ask = async (p) => (asked.push(p), JSON.stringify({ lines: LINES }));
  const { cache: out } = await diff.compareGrids({ words, lists, imageDir: "/none", ask, cache, jobs: 1 });
  assert.equal(asked.length, 1);
  assert.doesNotMatch(asked[0], /worn/i);
  assert.equal(out["w.png"].promptKey, diff.promptKey(lists.worn.items, "worn"));
  assert.equal(out["p.png"], LINES);
});
