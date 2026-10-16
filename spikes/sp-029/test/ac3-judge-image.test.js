"use strict";

// SP-029 AC3 — Given the 9 captions of a grid and the word's story, when Jev
// picks in two rounds, then round 1 picks one cell per grid row out of that
// row's 3 captions, round 2 picks the best of the three row picks, and every
// pick comes from Jev's scores, which are saved.
//
// End to end through the `judge-image` step CLI (EN-036's step contract) and
// through run.js, both against a mock Jev.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { tmpDir, fixtureEnv, runNode, readJson } = require("./helpers/harness");
const { startMockJev } = require("./helpers/mock-jev");

const LEVELS = [240, 210, 180, 150, 120, 90, 60, 30, 0];

function captionsFile(dir, levels = LEVELS) {
  const f = path.join(dir, "captions.tsv");
  fs.writeFileSync(f, levels.map((l, i) => `${i + 1}\ta flat gray square, lightness ${l}`).join("\n") + "\n");
  return f;
}

test("AC3: judge-image picks one cell per row from that row's captions, then the best of the three, and prints every score", async () => {
  const dir = tmpDir();
  const jev = await startMockJev({}, dir);
  try {
    const { code, stdout, stderr } = await runNode(
      "judge-image.js",
      ["eta", "Eta story, lightness 140.", captionsFile(dir)],
      { NEMO_JEV_ENV_FILE: jev.envFile },
    );
    assert.equal(code, 0, stderr);
    // p = 1 − |140 − level| / 255, shown to 3 places
    assert.equal(
      stdout,
      [
        "row\t1\t3\t1=0.608,2=0.725,3=0.843",
        "row\t2\t4\t4=0.961,5=0.922,6=0.804",
        "row\t3\t7\t7=0.686,8=0.569,9=0.451",
        "final\t4\t3=0.843,4=0.961,7=0.686",
        "",
      ].join("\n"),
    );

    assert.equal(jev.calls.length, 4);
    assert.ok(jev.calls.every((c) => c.url === "/v1/systemone" && c.auth === "Bearer test-key"));
    // round 1: each call holds exactly one row's three captions
    const round1 = jev.calls.slice(0, 3).map((c) => Object.keys(c.body.state.pictures));
    assert.deepEqual(round1.sort(), [["cell_1", "cell_2", "cell_3"], ["cell_4", "cell_5", "cell_6"], ["cell_7", "cell_8", "cell_9"]]);
    for (const c of jev.calls) {
      assert.equal(c.body.state.story, "Eta story, lightness 140.");
      assert.deepEqual(Object.keys(c.body.questions).sort(), Object.keys(c.body.state.pictures).sort());
    }
    // round 2: the three row picks
    assert.deepEqual(jev.calls[3].body.state.pictures, {
      cell_3: "a flat gray square, lightness 180",
      cell_4: "a flat gray square, lightness 150",
      cell_7: "a flat gray square, lightness 60",
    });
  } finally {
    await jev.close();
  }
});

test("AC3: run.js judges every kept word in two rounds and saves Jev's scores and raw answers in run.json", async () => {
  const out = tmpDir();
  const jev = await startMockJev({}, out);
  try {
    const { code, stderr } = await runNode("run.js", [], fixtureEnv(out, { NEMO_JEV_ENV_FILE: jev.envFile }));
    assert.equal(code, 0, stderr);
    const run = readJson(path.join(out, "run.json"));
    const byWord = Object.fromEntries(run.words.map((w) => [w.word, w]));
    assert.deepEqual(Object.keys(byWord).sort(), ["alpha", "eta", "gamma", "theta"]);

    // alpha: L grid (cell n = 30·(n−1)), story lightness 120 → cell 5
    const a = byWord.alpha.judgment;
    assert.deepEqual(a.rows.map((r) => r.pick), [3, 5, 7]);
    assert.equal(a.final.pick, 5);
    assert.equal(byWord.alpha.flashCell, 5);
    for (const round of [...a.rows, a.final]) {
      // the pick is the highest saved score
      const best = Math.max(...Object.values(round.scores));
      assert.equal(round.scores[round.pick], best);
      assert.ok(round.answers, "raw answers saved");
    }
    assert.equal(Object.keys(a.final.scores).join(","), "3,5,7");
  } finally {
    await jev.close();
  }
});
