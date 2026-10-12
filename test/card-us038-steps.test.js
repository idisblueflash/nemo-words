// US-038 unit tests: the story rubric's shape, jev.score, judge-stories'
// question set / judgment math / output line, and pick-story's scored pick.

const test = require("node:test");
const assert = require("node:assert/strict");
const jev = require("../scripts/lib/jev");
const { loadRubric, rubricProblem, nouls, buildQuestions, toJudgment, formatLine } = require("../scripts/judge-stories");
const { pickStory } = require("../scripts/pick-story");

const rubric = loadRubric();

// Jev answers: every noul `p`, every axis `level`, unless overridden by name.
function answers({ p = 0.9, level = 1, overrides = {} } = {}) {
  const a = {};
  for (const [name, q] of Object.entries(buildQuestions(rubric))) {
    a[name] = name in overrides ? overrides[name] : q.type === "noul" ? { noul: p } : { score: level };
  }
  return a;
}

test("story-rubric.json: every gate has a summary and ≥ 1 split-out question, every axis a label and 3 levels", () => {
  assert.deepEqual(Object.keys(rubric.gates), ["vividness", "scene-coherence", "animal-harm"]);
  assert.deepEqual(Object.keys(rubric.axes), ["anchor", "meaning", "vivid"]);
  // US-048: the same shape check judge-stories runs before any Jev call.
  assert.equal(rubricProblem(rubric), null);
});

test("jev.score: the SDK's score question shape (levels as criteria indexed from 0)", () => {
  assert.deepEqual(jev.score("How good?", ["bad", "ok", "good"]), {
    type: "score",
    instructions: "How good?",
    criteria: ["bad", "ok", "good"],
  });
  assert.throws(() => jev.score("x", ["only one"]), jev.JevError);
});

test("judge-stories: 14 questions — 3 gate summaries + 8 split-outs as Nouls, 3 axes as Scores; no same-root-anchor", () => {
  const q = buildQuestions(rubric);
  assert.equal(Object.keys(q).length, 14);
  assert.equal(Object.values(q).filter((x) => x.type === "noul").length, 11);
  assert.deepEqual(Object.keys(q).filter((n) => q[n].type === "score"), ["anchor", "meaning", "vivid"]);
  for (const g of ["vividness", "scene-coherence", "animal-harm"]) assert.equal(q[g].type, "noul");
  assert.ok(!Object.keys(q).some((n) => n.includes("same-root")));
  assert.deepEqual(q.meaning.criteria, rubric.axes.meaning.levels);
  assert.match(q["animal-harm.not-eaten"].instructions, /eaten, cooked or hunted/);
  assert.deepEqual(nouls(rubric).slice(0, 4).map((n) => n.name), [
    "vividness",
    "vividness.specific-moment",
    "vividness.beyond-definition",
    "vividness.single-picture",
  ]);
});

test("judge-stories: axis score = Jev's 0–2 level + 1; total is their sum (fractional levels kept)", () => {
  const j = toJudgment(answers({ overrides: { anchor: { score: 2 }, meaning: { score: 1.5 }, vivid: { score: 0 } } }), rubric);
  assert.deepEqual(j.axisScores, { anchor: 3, meaning: 2.5, vivid: 1 });
  assert.equal(j.total, 6.5);
  assert.deepEqual(j.failedGates, []);
  assert.equal(j.nouls["vividness.single-picture"], 0.9);
});

test("judge-stories: a missing or out-of-range answer is a JevError, never guessed", () => {
  for (const overrides of [
    { anchor: { score: 3 } },
    { vivid: undefined },
    { "animal-harm.not-hurt": { noul: 1.2 } },
    { "scene-coherence": { noul: "0.9" } },
  ]) {
    assert.throws(() => toJudgment(answers({ overrides }), rubric), jev.JevError, JSON.stringify(overrides));
  }
});

test("judge-stories line: `-` + total + axes + every noul's p; a hard-gate fail gets `-` score fields", () => {
  const j = toJudgment(answers({ overrides: { anchor: { score: 2 }, meaning: { score: 1 }, vivid: { score: 2 } } }), rubric);
  const [reasons, total, axes, ps] = formatLine("-", j).split("\t");
  assert.equal(reasons, "-");
  assert.equal(total, "8");
  assert.equal(axes, "3,2,3");
  assert.equal(ps.split(",").length, 11);
  assert.match(ps, /^vividness=0\.9,vividness\.specific-moment=0\.9,/);
  assert.equal(formatLine("headword: germane,anchor-missing: main", null), "headword: germane,anchor-missing: main\t-\t-\t-");
});

test("pick-story: with judgments, the passing story with the highest total wins and the note gives its scores", () => {
  const candidates = "A first.\ta\nB second.\tb\nC third.\tc\nD fourth.\td\n";
  const checks = "-\n-\n-\nheadword: x\n";
  const judgments = ["-\t6\t2,2,2\t", "-\t8.5\t3,2.5,3\t", "-\t7\t3,2,2\t", "headword: x\t-\t-\t-"].join("\n");
  assert.deepEqual(pickStory(candidates, checks, judgments), {
    ok: true,
    line: "B second.\tb",
    note: "pick: total 8.5 (anchor 3, meaning 2.5, vivid 3)",
  });
});

test("pick-story: `-` for judgments (judging failed) falls back to the first that passed the hard gates", () => {
  const r = pickStory("A first.\ta\nB second.\tb\n", "headword: x\n-\n", null);
  assert.deepEqual(r, { ok: true, line: "B second.\tb" });
});

test("pick-story: ties go to the shorter sentence, then the alphabetically first, whatever the draft order", () => {
  const rows = [
    ["Bb long one.\tx", "-\t7\t3,2,2\t"],
    ["Zz short.\tx", "-\t7\t3,2,2\t"],
    ["Aa short.\tx", "-\t7\t3,2,2\t"],
    ["Top score but longest of all.\tx", "-\t6\t2,2,2\t"],
  ];
  for (const order of [[0, 1, 2, 3], [3, 2, 1, 0], [1, 3, 0, 2]]) {
    const cands = order.map((i) => rows[i][0]).join("\n");
    const judged = order.map((i) => rows[i][1]).join("\n");
    assert.equal(pickStory(cands, order.map(() => "-").join("\n"), judged).line, "Aa short.\tx", String(order));
  }
});

// --- AC2: judgment gates

test("judge-stories: a noul passes at p ≥ 0.5; a gate fails on any failing noul, named by its first failing question", () => {
  const j = toJudgment(
    answers({
      overrides: {
        vividness: { noul: 0.5 }, // exactly the cut-off: passes
        "vividness.beyond-definition": { noul: 0.49 },
        "vividness.single-picture": { noul: 0.1 },
        "scene-coherence": { noul: 0.2 },
        "scene-coherence.one-setting": { noul: 0.1 },
      },
    }),
    rubric
  );
  assert.deepEqual(j.failedGates, ["vividness: beyond-definition", "scene-coherence: summary"]);
  assert.equal(formatLine("-", j).split("\t")[0], "vividness: beyond-definition,scene-coherence: summary");
});

test("pick-story: a judgment-gate fail is never picked while a story passes every gate, whatever its total", () => {
  const candidates = "A high.\ta\nB low.\tb\n";
  const judgments = "vividness: summary\t9\t3,3,3\t\n-\t3\t1,1,1\t\n";
  const r = pickStory(candidates, "-\n-\n", judgments);
  assert.equal(r.line, "B low.\tb");
});

// --- the judge-stories CLI, against the harness's mock Jev

const { createHarness, germaneFixture } = require("./helpers/card-harness");

async function withJudgeCli(fixture, options, fn) {
  const h = await createHarness(fixture, options);
  try {
    const files = [
      h.writeFile("cands.tsv", "Hard fail.\tmain\nGood one.\tmain,relevant\nFlat one.\tmain,relevant\n"),
      h.writeFile("checks.tsv", "sense-missing: relevant\n-\n-\n"),
      h.writeFile("keywords.tsv", "dʒɚ\t-\nˈmeɪn\tmain\t1.28e-4\n"),
    ];
    await fn(h, (args = ["germane", "relevant", ...files]) => h.runScript("judge-stories.js", args));
  } finally {
    await h.cleanup();
  }
}

test("judge-stories CLI: one line per candidate in order; one parallel Jev call per hard-gate pass, with the story's state", async () => {
  const fixture = germaneFixture();
  fixture.judge = { "Flat one.": { "vividness.specific-moment": 0.2, vivid: 0 }, "Good one.": { anchor: 2 } };
  await withJudgeCli(fixture, {}, async (h, run) => {
    const r = await run();
    assert.equal(r.code, 0, r.stderr);
    const out = r.stdout.trimEnd().split("\n").map((l) => l.split("\t"));
    assert.equal(out.length, 3);
    assert.deepEqual(out[0], ["sense-missing: relevant", "-", "-", "-"]);
    assert.deepEqual(out[1].slice(0, 3), ["-", "7", "3,2,2"]);
    assert.deepEqual(out[2].slice(0, 3), ["vividness: specific-moment", "5", "2,2,1"]);
    assert.match(out[2][3], /vividness\.specific-moment=0\.2/);

    const calls = h.jev.judgeCalls();
    assert.equal(calls.length, 2);
    const state = calls.find((c) => c.body.state.sentence === "Good one.").body.state;
    assert.deepEqual(state, {
      word: "germane",
      sense: "relevant",
      ipa_chunks: [{ ipa: "dʒɚ", keyword: null }, { ipa: "ˈmeɪn", keyword: "main" }],
      sentence: "Good one.",
      pivot_words: ["main", "relevant"],
    });
  });
});

test("judge-stories CLI: Jev unreachable -> exit 2, stdout empty, stderr says the stories weren't judged and why", async () => {
  await withJudgeCli(germaneFixture(), { jev: "down" }, async (h, run) => {
    const r = await run();
    assert.equal(r.code, 2);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /^stories not judged: Jev could not be reached: .*; picked the first that passed the hard gates\n$/);
  });
});

test("judge-stories: a malformed story-rubric.json throws (the CLI then exits 2 and falls back)", () => {
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  const bad = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "rubric-")), "story-rubric.json");
  fs.writeFileSync(bad, "{ not json");
  try {
    // US-048 AC1: a RubricError naming the file, not a bare SyntaxError.
    assert.throws(() => loadRubric(bad), /^RubricError: can't read .*story-rubric\.json \(.*JSON.*\)$/);
  } finally {
    fs.rmSync(path.dirname(bad), { recursive: true, force: true });
  }
});

test("log-card runner-ups: reads the judgments file's reasons column (failed judgment gates included)", () => {
  const { runnerUps } = require("../scripts/log-card");
  const candidates = "Picked.\ta\nFlat one.\tb,c\nHard fail.\td\n";
  const judgments = "-\t7\t3,2,2\tx=0.9\nvividness: single-picture\t9\t3,3,3\tx=0.3\nheadword: x,word-count: 12 > 10\t-\t-\t-\n";
  assert.deepEqual(runnerUps(candidates, judgments, "Picked."), [
    { sentence: "Flat one.", pivot_words: ["b", "c"], reject_reasons: ["vividness: single-picture"] },
    { sentence: "Hard fail.", pivot_words: ["d"], reject_reasons: ["headword: x", "word-count: 12 > 10"] },
  ]);
});
