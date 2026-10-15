"use strict";

// Unit tests for the two-round pick's rules: ties go to the lower cell and
// are flagged; an unusable answer is a JevError, never a guessed pick.

const test = require("node:test");
const assert = require("node:assert/strict");

const { judgeImage, judgeRound } = require("../lib/judge-image");
const { JevError } = require("../../../scripts/lib/jev");

const captions = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => [c, `picture ${c}`]));
const config = { apiKey: "k", baseURL: "http://jev.invalid", model: "m", proxyEnv: {} };

// A fetch that answers every question with p = ps[cell] (default 0.5).
const fakeFetch = (ps) => async (url, init) => {
  const body = JSON.parse(init.body);
  const answers = Object.fromEntries(Object.keys(body.questions).map((n) => [n, { noul: ps[n] ?? 0.5 }]));
  return { ok: true, status: 200, text: async () => JSON.stringify({ answers }) };
};

test("a tie goes to the lower cell number and is flagged", async () => {
  const r = await judgeRound(
    { word: "w", story: "s", captions, cells: [4, 5, 6] },
    { config, fetch: fakeFetch({ cell_5: 0.8, cell_6: 0.8, cell_4: 0.1 }) },
  );
  assert.equal(r.pick, 5);
  assert.equal(r.tie, true);
  const clear = await judgeRound({ word: "w", story: "s", captions, cells: [4, 5, 6] }, { config, fetch: fakeFetch({ cell_6: 0.9 }) });
  assert.deepEqual([clear.pick, clear.tie], [6, false]);
});

test("an all-equal grid falls to cell 1 in both rounds, and both rounds say tie", async () => {
  const j = await judgeImage({ word: "w", story: "s", captions }, { config, fetch: fakeFetch({}) });
  assert.deepEqual(j.rows.map((r) => r.pick), [1, 4, 7]);
  assert.equal(j.final.pick, 1);
  assert.ok(j.rows.every((r) => r.tie) && j.final.tie);
});

test("an answer that isn't a p in 0–1 is a JevError", async () => {
  await assert.rejects(
    judgeImage({ word: "w", story: "s", captions }, { config, fetch: fakeFetch({ cell_2: 1.4 }) }),
    (e) => e instanceof JevError && /cell_2/.test(e.message),
  );
});
