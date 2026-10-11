"use strict";

// SP-037 AC5 — Given Jev can't answer a question for a candidate (error or
// unusable answer), when the spike run hits it, then that word is reported as
// unjudged instead of being guessed, and the rates are computed over the
// judged words only, with the count shown.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");

const { runSpike } = require("../run");
const { fakeLogText, fakeDraft, fakeJev } = require("./helpers/fake-run");
const { startMockJev, answerAll } = require("./helpers/mock-jev");

test("AC5: a Jev error or unusable answer makes the whole word unjudged; rates over judged words only", async () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "sp037-run-"));
  const client = fakeJev({
    // zqa: Jev errors on one fresh candidate only
    failOn: (s) => s.word === "zqa" && s.sentence === "Fresh pick number 2 here.",
    // zqb: an unusable (out-of-range) score on Flash's story
    mangle: (s, a) => (s.word === "zqb" && s.sentence.startsWith("Flash") ? { ...a, meaning: { type: "score", score: 7 } } : a),
  });
  await runSpike({ logText: fakeLogText(), n: 20, seed: 37, draft: fakeDraft(), client, outDir });
  const report = fs.readFileSync(path.join(outDir, "report.md"), "utf8");

  assert.match(report, /Judged: 18 of 20 words/);
  // words 2–9 still Flash-1st; 10–13 top 2 → 8/18 and 12/18
  assert.match(report, /\| Flash's story ranks 1st \| 8 \/ 18 \(44\.4%\) \| 16\.7% \|/);
  assert.match(report, /\| Flash's story in the top 2 \| 12 \/ 18 \(66\.7%\) \| 33\.3% \|/);

  const unjudged = report.split("## Unjudged words")[1].split("\n## ")[0];
  assert.match(unjudged, /- zqa: Jev call failed: .*451/);
  assert.match(unjudged, /- zqb: unusable answer for meaning/);
  assert.match(report, /\| zqa \| — \| unjudged \|/);
  // no guessed rank for an unjudged word, and it isn't in the failed-gate list
  assert.doesNotMatch(report.split("## Flash's story failed a gate")[1].split("\n## ")[0], /zqa|zqb/);

  const raw = JSON.parse(fs.readFileSync(path.join(outDir, "raw", "run.json"), "utf8"));
  assert.match(raw.words.find((w) => w.word === "zqa").unjudged, /451/);
});

test("AC5: zero judged words → the report says so and ends no-go", async () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "sp037-run-"));
  await runSpike({ logText: fakeLogText(), n: 20, seed: 37, draft: fakeDraft(), client: fakeJev({ failOn: () => true }), outDir });
  const report = fs.readFileSync(path.join(outDir, "report.md"), "utf8");
  assert.match(report, /Judged: 0 of 20 words/);
  assert.match(report, /\*\*No-go\*\*/);
  assert.match(report, /no word was judged/);
});

function runJudgeStory(env) {
  const cli = path.join(__dirname, "..", "judge-story.js");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sp037-"));
  const chunks = path.join(dir, "chunks.tsv");
  fs.writeFileSync(chunks, "kɹik\t-\n");
  const args = [cli, "creak", "to groan", "Beside the creek, the dock groans.", "creek,groans", chunks];
  return new Promise((resolve) =>
    execFile(process.execPath, args, { env: { ...process.env, TYPESAFE_API_KEY: "test-key", ...env } }, (err, stdout, stderr) =>
      resolve({ code: err ? err.code : 0, stdout, stderr }),
    ),
  );
}

test("judge-story exits 2 with the error on stderr, and prints nothing, when Jev fails", async () => {
  const jev = await startMockJev(() => ({ status: 451, json: { title: "Typesafe is not available in your region.", status: 451 } }));
  try {
    const { code, stdout, stderr } = await runJudgeStory({ TYPESAFE_BASE_URL: jev.url });
    assert.equal(code, 2);
    assert.equal(stdout, "");
    assert.match(stderr, /451/);
  } finally {
    await jev.close();
  }
});

test("judge-story exits 2 on an unusable answer", async () => {
  const jev = await startMockJev((body) => ({ json: answerAll(body, { overrides: { vividness: { type: "noul", noul: null } } }) }));
  try {
    const { code, stdout, stderr } = await runJudgeStory({ TYPESAFE_BASE_URL: jev.url });
    assert.equal(code, 2);
    assert.equal(stdout, "");
    assert.match(stderr, /unusable answer for vividness/);
  } finally {
    await jev.close();
  }
});
