"use strict";

// SP-029 AC5 — Given the result is no-go, when the blind check runs on 20
// words where Jev missed, then Flash sees his cell and Jev's cell side by
// side, unlabelled, his on the left for half the words; he chooses one, or
// rates them about the same; and the report adds the share where Jev's cell
// was chosen or rated about the same.
//
// The fixture no-go (mock Jev): eta and theta are missed, alpha and gamma exact.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const { SPIKE, tmpDir, fixtureEnv, runNode, readJson } = require("./helpers/harness");
const { startMockJev } = require("./helpers/mock-jev");

async function noGoRun(byWord = { theta: { cell_1: 0.9 } }) {
  const out = tmpDir();
  const jev = await startMockJev({ byWord }, out);
  try {
    const r = await runNode("run.js", [], fixtureEnv(out, { NEMO_JEV_ENV_FILE: jev.envFile }));
    assert.equal(r.code, 0, r.stderr);
  } finally {
    await jev.close();
  }
  return out;
}

// Starts the blind page on a free port; resolves with its base URL.
function serveBlind(env) {
  const child = spawn(process.execPath, [path.join(SPIKE, "blind.js")], {
    env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "", ...env, PORT: "0" },
  });
  return new Promise((resolve, reject) => {
    let err = "";
    child.stderr.on("data", (d) => {
      err += d;
      const m = /http:\/\/127\.0\.0\.1:(\d+)/.exec(err);
      if (m) resolve({ url: `http://127.0.0.1:${m[1]}`, stop: () => child.kill() });
    });
    child.on("exit", (code) => reject(new Error(`blind.js exited ${code}: ${err}`)));
  });
}

test("AC5: on a no-go, the blind page shows Flash's and Jev's cells unlabelled, Flash's on the left for half, and the report adds Jev's share", async () => {
  const out = await noGoRun();
  const env = fixtureEnv(out);

  const prep = await runNode("blind.js", ["--prepare"], env);
  assert.equal(prep.code, 0, prep.stderr);
  const pairs = readJson(path.join(out, "blind-pairs.json"));
  assert.deepEqual(pairs.map((p) => p.word).sort(), ["eta", "theta"]); // only words Jev missed
  assert.equal(pairs.filter((p) => p.left.source === "flash").length, 1); // his on the left for half
  const eta = pairs.find((p) => p.word === "eta");
  assert.deepEqual([eta.left, eta.right].map((s) => [s.source, s.cell]).sort(), [["flash", 1], ["jev", 4]]);

  const page = await serveBlind(env);
  try {
    const state = await (await fetch(`${page.url}/api/state`)).json();
    const shown = JSON.stringify(state.pairs);
    assert.doesNotMatch(shown, /flash|jev|source|cell|grid/i); // unlabelled
    assert.deepEqual(Object.keys(state.pairs[0]).sort(), ["id", "story", "word"]);
    assert.equal(state.tally.complete, false);

    const img = await fetch(`${page.url}/img/${state.pairs[0].id}/left.png`);
    assert.equal(img.status, 200);
    assert.equal(img.headers.get("content-type"), "image/png");
    assert.ok((await img.arrayBuffer()).byteLength > 0);
    assert.equal((await fetch(`${page.url}/`)).status, 200);

    // Flash: eta → Jev's side; theta → "about the same"
    const etaId = state.pairs.find((p) => p.word === "eta").id;
    const thetaId = state.pairs.find((p) => p.word === "theta").id;
    const jevSide = eta.left.source === "jev" ? "left" : "right";
    for (const [id, side] of [[etaId, jevSide], [thetaId, "same"]]) {
      const r = await fetch(`${page.url}/api/choice`, { method: "POST", body: JSON.stringify({ id, side }) });
      assert.equal(r.status, 200);
    }
    const bad = await fetch(`${page.url}/api/choice`, { method: "POST", body: JSON.stringify({ id: etaId, side: "middle" }) });
    assert.equal(bad.status, 400);
  } finally {
    page.stop();
  }

  const choices = readJson(path.join(out, "blind-choices.json"));
  assert.equal(choices.eta.pick, "jev");
  assert.equal(choices.theta.pick, "same");

  const rep = await runNode("run.js", ["--report"], env);
  assert.equal(rep.code, 0, rep.stderr);
  const report = fs.readFileSync(path.join(out, "report.md"), "utf8");
  assert.match(report, /## Blind check/);
  assert.match(report, /Jev's cell chosen or rated about the same: 2 of 2 \(100\.0%\)/);
  assert.match(report, /- Jev's cell chosen: 1\n- About the same: 1\n- Flash's cell chosen: 0/);
  assert.match(report.trim().split("\n").slice(-3).join("\n"), /^\*\*No-go\*\*/m); // still ends with the verdict
});

test("AC5: the blind check takes at most 20 missed words, and isn't prepared on a go", async () => {
  const { buildPairs } = require("../lib/blind");
  const words = Array.from({ length: 30 }, (_, i) => ({
    word: `w${i}`,
    grid: `w${i}.grid.png`,
    flashCell: 2,
    story: "s",
    judgment: { rows: [{ pick: 1 }, { pick: 4 }, { pick: 7 }], final: { pick: 1, tie: false } },
  }));
  const pairs = buildPairs({ words, leftOut: [] });
  assert.equal(pairs.length, 20);
  assert.equal(pairs.filter((p) => p.left.source === "flash").length, 10);
  assert.deepEqual(buildPairs({ words, leftOut: [] }), pairs); // seeded: the same 20 every time

  const out = await noGoRun({}); // the fixture's go
  const prep = await runNode("blind.js", ["--prepare"], fixtureEnv(out));
  assert.equal(prep.code, 1);
  assert.match(prep.stdout, /go: no blind check/);
  assert.equal(fs.existsSync(path.join(out, "blind-pairs.json")), false);
});
