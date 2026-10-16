"use strict";

// SP-064 AC1 — Given a story of one of SP-029's 82 judged words, when the
// spike run makes its must-see list, then one text-only Claude call lists the
// objects a cell must show, each with its adjectives; a name anchor becomes
// its visible sign (a nametag reading "Venice"); and the list is saved and
// cached, so a re-run doesn't call Claude again.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { tmpDir, fixtureEnv, runNode, readJson, claudeCalls } = require("./helpers/harness");

test("AC1: run.js --must-see-only makes one text-only Claude call per story and saves each list with its adjectives", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const r = await runNode("run.js", ["--must-see-only"], fixtureEnv(out, { FAKE_CLAUDE_LOG: log }));
  assert.equal(r.code, 0, r.stderr);

  const lists = readJson(path.join(out, "must-see.json"));
  assert.deepEqual(Object.keys(lists).sort(), ["alpha", "eta", "gamma", "nu", "theta"]);
  assert.equal(lists.alpha.story, "Alpha story, lightness 120.");
  assert.deepEqual(lists.alpha.items, [{ name: "square", adjectives: ["flat", "gray"] }]);
  assert.equal(lists.alpha.isSequence, false);

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

test("AC1: a name anchor becomes its visible sign, and the prompt asks for that", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const r = await runNode("run.js", ["--must-see-only"], fixtureEnv(out, { FAKE_CLAUDE_LOG: log }));
  assert.equal(r.code, 0, r.stderr);
  const nu = readJson(path.join(out, "must-see.json")).nu;
  assert.deepEqual(nu.items.find((i) => i.name === "nametag"), { name: "nametag", adjectives: ['reading "Venice"'] });
  const prompt = claudeCalls(log)[0].argv[claudeCalls(log)[0].argv.indexOf("-p") + 1];
  assert.match(prompt, /name/i);
  assert.match(prompt, /nametag that reads "Venice"/);
  assert.match(prompt, /adjective/i);
});

test("AC1: the lists are cached, so a re-run doesn't call Claude again", async () => {
  const out = tmpDir();
  const log = path.join(out, "claude.jsonl");
  const env = fixtureEnv(out, { FAKE_CLAUDE_LOG: log });
  assert.equal((await runNode("run.js", ["--must-see-only"], env)).code, 0);
  const before = claudeCalls(log).length;
  const again = await runNode("run.js", ["--must-see-only"], env);
  assert.equal(again.code, 0, again.stderr);
  assert.equal(claudeCalls(log).length, before);
});
