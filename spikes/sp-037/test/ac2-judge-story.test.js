"use strict";

// SP-037 AC2 — Given one candidate story and its word's sense, IPA and
// keywords, when the prototype story judge scores it, then it gives a
// pass/fail per judgment gate (vividness, scene coherence, same-root anchor,
// animal harm), a 1–3 score per axis (anchor fidelity, meaning-carry,
// vividness) and a total out of 9 — each from its own Jev question.
//
// End-to-end: the real `judge-story` CLI + the real TypeSafe SDK, pointed at a
// local mock of the API via TYPESAFE_BASE_URL.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { execFile } = require("node:child_process");

const { startMockJev, answerAll } = require("./helpers/mock-jev");

const CLI = path.join(__dirname, "..", "judge-story.js");

function runCli(args, env) {
  return new Promise((resolve) => {
    execFile(process.execPath, [CLI, ...args], { env: { ...process.env, ...env } }, (err, stdout, stderr) =>
      resolve({ code: err ? err.code : 0, stdout, stderr }),
    );
  });
}

function chunkFile(lines) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sp037-"));
  const f = path.join(dir, "chunks.tsv");
  fs.writeFileSync(f, lines.join("\n") + "\n");
  return f;
}

const ARGS = [
  "creak",
  "to make a harsh groaning sound when pressed",
  "Beside the creek, the rotten dock groans under my boots.",
  "creek,rotten,dock,groans",
  chunkFile(["kɹik\t-"]),
];

test("AC2: judge-story prints a pass/fail per gate, a 1–3 score per axis and a total out of 9, from one Jev question each", async () => {
  const jev = await startMockJev((body) => ({
    json: answerAll(body, {
      overrides: {
        "animal-harm": { type: "noul", noul: 0.2 },
        anchor: { type: "score", score: 2, confidence: 1, legend: {}, probabilities: {} },
        meaning: { type: "score", score: 1.5, confidence: 1, legend: {}, probabilities: {} },
        vivid: { type: "score", score: 0.25, confidence: 1, legend: {}, probabilities: {} },
      },
    }),
  }));
  try {
    const { code, stdout } = await runCli(ARGS, { TYPESAFE_BASE_URL: jev.url, TYPESAFE_API_KEY: "test-key" });
    assert.equal(code, 0);
    assert.equal(
      stdout,
      [
        "vividness\tpass\t0.900",
        "scene-coherence\tpass\t0.900",
        "same-root-anchor\tpass\t0.900",
        "animal-harm\tfail\t0.200",
        "anchor\t3.00",
        "meaning\t2.50",
        "vivid\t1.25",
        "total\t6.75",
        "",
      ].join("\n"),
    );

    // one systemOne call for the candidate, one question per gate / axis
    assert.equal(jev.requests.length, 1);
    const { url, body } = jev.requests[0];
    assert.equal(url, "/v1/systemone");
    assert.deepEqual(Object.keys(body.questions), [
      "vividness",
      "scene-coherence",
      "same-root-anchor",
      "animal-harm",
      "anchor",
      "meaning",
      "vivid",
    ]);
    const types = Object.values(body.questions).map((q) => q.type);
    assert.deepEqual(types, ["noul", "noul", "noul", "noul", "score", "score", "score"]);

    // the state Jev sees: word, sense, IPA chunks, sentence, pivots — and no source
    assert.deepEqual(body.state, {
      word: "creak",
      sense: "to make a harsh groaning sound when pressed",
      ipa_chunks: ["kɹik"],
      sentence: "Beside the creek, the rotten dock groans under my boots.",
      pivot_words: ["creek", "rotten", "dock", "groans"],
    });

    // axis levels verbatim from _nemo.md's 1/2/3 rubric
    assert.deepEqual(body.questions.meaning.criteria, [
      "meaning is bolted on beside the anchor",
      "present but a bit of a stretch",
      "the anchor's own image literally depicts the locked sense word",
    ]);
    // gate text verbatim from _nemo.md's "Before you return" section
    assert.match(body.questions["animal-harm"].instructions, /Animal imagery itself is fine \(an octopus, a fox, etc\./);
  } finally {
    await jev.close();
  }
});

test("judge-story runs the hard gates in code first: a failure exits 1 with reasons and Jev is never asked", async () => {
  const jev = await startMockJev((body) => ({ json: answerAll(body) }));
  try {
    const args = [...ARGS];
    args[2] = "The old dock creaked as the company climber held the rope tense.";
    args[3] = "dock,company";
    const { code, stdout } = await runCli(args, { TYPESAFE_BASE_URL: jev.url, TYPESAFE_API_KEY: "test-key" });
    assert.equal(code, 1);
    assert.equal(stdout, ["headword: creaked", "word-count: 12 > 10", ""].join("\n"));
    assert.equal(jev.requests.length, 0);
  } finally {
    await jev.close();
  }
});
