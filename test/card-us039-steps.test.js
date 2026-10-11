// US-039 unit coverage: the pieces behind the two new pipeline steps
// (dags/card.yaml) — `tag-technique` (Jev) and `log-card` (code).

const test = require("node:test");
const assert = require("node:assert/strict");

const vocab = require("../scripts/lib/logan-vocab");

test("logan-vocab: reads _logan's controlled anchor_unit and technique vocabularies from reference-tables.md", () => {
  const { anchorUnits, techniques } = vocab.load();
  assert.deepEqual(
    anchorUnits.map((u) => u.value),
    ["whole-word", "stressed-syllable", "rime", "onset", "nucleus", "coda", "first-syllable", "word-shape", "morpheme"]
  );
  assert.equal(techniques.length, 14);
  assert.equal(techniques[0].value, "homophone");
  assert.equal(techniques[13].value, "scene-depicts-meaning");
  assert.match(techniques.find((t) => t.value === "story-chain").explanation, /^Three or more distinct pivot fragments/);
  // backticks/markdown stay in the explanation text, but the value is bare
  for (const t of techniques) assert.match(t.value, /^[a-z0-9-]+$/i);
});

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const jev = require("../scripts/lib/jev");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "us039-steps-"));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
const tmpFile = (name, text) => {
  const p = path.join(tmp, name);
  fs.writeFileSync(p, text);
  return p;
};

const { techniqueQuestions, rankTags } = require("../scripts/tag-technique");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

const GERMANE_KEYWORDS = "dʒɚ\t-\nmeɪn\tmain\t1.2800e-4\n";

test("tag-technique: one Jev yes/no question per controlled technique, worded from its definition in _logan's table", () => {
  const { techniques } = vocab.load();
  const q = techniqueQuestions(techniques);
  assert.deepEqual(Object.keys(q), techniques.map((t) => t.value));
  for (const t of techniques) {
    assert.equal(q[t.value].type, "noul");
    assert.ok(q[t.value].instructions.includes(t.explanation), t.value);
    assert.ok(q[t.value].instructions.includes(`"${t.value}"`), t.value);
  }
});

test("tag-technique: answers -> every tag with its p, highest first", () => {
  const techniques = [{ value: "a" }, { value: "b" }, { value: "c" }];
  assert.deepEqual(rankTags({ a: { noul: 0.2 }, b: { noul: 0.9 }, c: { noul: 0.5 } }, techniques), [
    { tag: "b", p: 0.9 },
    { tag: "c", p: 0.5 },
    { tag: "a", p: 0.2 },
  ]);
});

test("tag-technique: a missing or out-of-range answer is a Jev failure, never a guess", () => {
  const techniques = [{ value: "a" }, { value: "b" }];
  assert.throws(() => rankTags({ a: { noul: 0.2 } }, techniques), jev.JevError);
  assert.throws(() => rankTags({ a: { noul: 0.2 }, b: { noul: 1.4 } }, techniques), jev.JevError);
});

test("tag-technique CLI: one `systemOne` call; prints `tag<TAB>p` per tag, sorted by p descending", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const kw = h.writeFile("kw.tsv", GERMANE_KEYWORDS);
    const r = await h.runScript("tag-technique.js", ["germane", "The main point stays relevant to the talk.", "main,relevant", kw]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stderr, "");
    const lines = r.stdout.split("\n").filter(Boolean);
    assert.equal(lines.length, 14);
    assert.deepEqual(lines.slice(0, 4), ["story-chain\t0.95", "keyword-method\t0.91", "scene-depicts-meaning\t0.62", "homophone\t0.4"]);
    assert.ok(lines.slice(4).every((l) => l.endsWith("\t0.1")));

    assert.equal(h.jev.calls.length, 1);
    const call = h.jev.calls[0];
    assert.equal(call.path, "/v1/systemone");
    assert.equal(call.auth, "Bearer test-key");
    assert.deepEqual(call.body.state, {
      word: "germane",
      sentence: "The main point stays relevant to the talk.",
      pivot_words: ["main", "relevant"],
      ipa_chunks: [{ ipa: "dʒɚ", keyword: null }, { ipa: "meɪn", keyword: "main" }],
    });
    assert.equal(Object.keys(call.body.questions).length, 14);
  } finally {
    await h.cleanup();
  }
});

for (const mode of ["down", "unconfigured"]) {
  test(`tag-technique CLI: Jev ${mode} -> exit 2, the reason on stderr, nothing on stdout`, async () => {
    const h = await createHarness(germaneFixture(), { jev: mode });
    try {
      const kw = h.writeFile("kw.tsv", GERMANE_KEYWORDS);
      const r = await h.runScript("tag-technique.js", ["germane", "The main point stays relevant.", "main,relevant", kw]);
      assert.equal(r.code, 2);
      assert.equal(r.stdout, "");
      assert.match(r.stderr, mode === "down" ? /Jev could not be reached/ : /Jev is not configured/);
      assert.doesNotMatch(r.stderr, /test-key/);
    } finally {
      await h.cleanup();
    }
  });
}

const logCard = require("../scripts/log-card");

test("log-card chooseTags: the top tag, plus the second only if its p ≥ 0.5", () => {
  const two = ["a", "b"];
  assert.deepEqual(logCard.chooseTags([{ tag: "keyword-method", p: 0.9 }, { tag: "homophone", p: 0.5 }], two), ["keyword-method", "homophone"]);
  assert.deepEqual(logCard.chooseTags([{ tag: "keyword-method", p: 0.9 }, { tag: "homophone", p: 0.49 }], two), ["keyword-method"]);
  // the top tag is kept whatever its p
  assert.deepEqual(logCard.chooseTags([{ tag: "pun", p: 0.2 }, { tag: "rhyme", p: 0.1 }], two), ["pun"]);
  assert.deepEqual(logCard.chooseTags([], two), []);
});

test("log-card chooseTags: story-chain only when there are 3+ pivot words", () => {
  const ranked = [{ tag: "story-chain", p: 0.95 }, { tag: "keyword-method", p: 0.9 }, { tag: "rhyme", p: 0.6 }];
  assert.deepEqual(logCard.chooseTags(ranked, ["a", "b"]), ["keyword-method", "rhyme"]);
  assert.deepEqual(logCard.chooseTags(ranked, ["a", "b", "c"]), ["story-chain", "keyword-method"]);
});

test("log-card anchorUnit: whole-word for one chunk; else the stressed chunk if anchored; else the first anchored chunk's unit", () => {
  const c = (units, keyword) => ({ anchorUnits: units, keyword });
  assert.equal(logCard.anchorUnit([c(["whole-word", "first-syllable", "stressed-syllable", "rime"], "fear")]), "whole-word");
  // germane: dʒɚ unanchored, stressed meɪn -> main
  assert.equal(logCard.anchorUnit([c(["first-syllable", "rime"], null), c(["stressed-syllable", "rime"], "main")]), "stressed-syllable");
  // stressed chunk unanchored: the first anchored chunk's own unit
  assert.equal(logCard.anchorUnit([c(["first-syllable", "rime"], "cal"), c(["stressed-syllable", "rime"], null)]), "first-syllable");
  assert.equal(
    logCard.anchorUnit([c(["first-syllable"], null), c(["stressed-syllable", "rime"], null), c(["rime", "onset"], "dur")]),
    "rime"
  );
  assert.equal(logCard.anchorUnit([c(["first-syllable"], null), c(["stressed-syllable"], null)]), "");
});

test("log-card buildRow: the _logan row from the steps' outputs, picked_by auto", () => {
  const row = logCard.buildRow({
    word: "germane",
    storyText: "The main point stays relevant to the talk.\tmain,relevant\tpicked\n",
    defineText: "relevant\nrelevant and fitting to the subject under discussion\nrelevant,pertinent\n",
    syllablesText: "dʒɚ.ˈmeɪn\n",
    chunkText: "dʒɚ\tfirst-syllable,rime,onset,nucleus\nmeɪn\tstressed-syllable,rime,onset,nucleus,coda\n",
    keywordsText: GERMANE_KEYWORDS,
    tags: ["keyword-method"],
    date: "2026-10-11",
  });
  assert.deepEqual(row, {
    word: "germane",
    syllabification: ["dʒɚ", "ˈmeɪn"],
    anchor_unit: "stressed-syllable",
    keyword: "main",
    sense: "relevant and fitting to the subject under discussion",
    sentence: "The main point stays relevant to the talk.",
    pivot_words: ["main", "relevant"],
    technique: ["keyword-method"],
    recall_check: null,
    date: "2026-10-11",
    picked_by: "auto",
  });
});

test("log-card buildRow: the keyword joins every anchored chunk's keyword with ` / `", () => {
  const row = logCard.buildRow({
    word: "warrant",
    storyText: "War ants need a permit.\twar,ant,permit\tpicked\n",
    defineText: "permit\nan official authorization\npermit\n",
    syllablesText: "ˈwɔɹ.ənt\n",
    chunkText: "wɔɹ\tfirst-syllable,stressed-syllable\nənt\trime\n",
    keywordsText: "wɔɹ\twar\t1e-4\nənt\tant\t1e-5\n",
    tags: [],
    date: "2026-10-11",
  });
  assert.equal(row.keyword, "war / ant");
  assert.equal(row.anchor_unit, "stressed-syllable");
});

test("log-card validateRow: anchor_unit and every tag from the controlled lists, no headword, required fields filled", () => {
  const good = {
    word: "germane", syllabification: ["dʒɚ", "ˈmeɪn"], anchor_unit: "stressed-syllable", keyword: "main",
    sense: "relevant", sentence: "The main point stays relevant.", pivot_words: ["main", "relevant"],
    technique: ["keyword-method"], recall_check: null, date: "2026-10-11", picked_by: "auto",
  };
  assert.deepEqual(logCard.validateRow(good), []);
  assert.deepEqual(logCard.validateRow({ ...good, technique: [] }), [], "no tags is allowed (Jev failed)");
  assert.deepEqual(logCard.validateRow({ ...good, anchor_unit: "syllable" }), ["anchor_unit: syllable is not in _logan's controlled list"]);
  assert.deepEqual(logCard.validateRow({ ...good, technique: ["keyword-method", "vibes"] }), ["technique: vibes is not in _logan's controlled list"]);
  assert.deepEqual(logCard.validateRow({ ...good, technique: ["pun", "rhyme", "homophone"] }), ["technique: 3 tags, at most 2"]);
  assert.deepEqual(logCard.validateRow({ ...good, sentence: "Germanes are relevant." }), ["headword: germanes"]);
  assert.deepEqual(logCard.validateRow({ ...good, keyword: "", anchor_unit: "", sense: " ", pivot_words: [] }), [
    "anchor_unit: empty",
    "keyword: empty",
    "sense: empty",
    "pivot_words: empty",
  ]);
});

test("log-card runnerUps: every candidate but the picked one, in draft order, with pivots and reject reasons", () => {
  const candidates = "A main germane.\tmain\nThe main point stays relevant.\tmain,relevant\nMain facts stay relevant.\tmain,relevant\n";
  const checks = "headword: germane,sense-missing: relevant\n-\n-\n";
  assert.deepEqual(logCard.runnerUps(candidates, checks, "The main point stays relevant."), [
    { sentence: "A main germane.", pivot_words: ["main"], reject_reasons: ["headword: germane", "sense-missing: relevant"] },
    { sentence: "Main facts stay relevant.", pivot_words: ["main", "relevant"], reject_reasons: [] },
  ]);
});

test("log-card runnerUps: only one candidate drafted -> no runner-ups", () => {
  assert.deepEqual(logCard.runnerUps("The main point stays relevant.\tmain,relevant\n", "-\n", "The main point stays relevant."), []);
});

test("log-card alternatesEntry: word, chosen sentence, picked_by auto, date, runner-ups", () => {
  const row = { word: "germane", sentence: "S.", date: "2026-10-11" };
  assert.deepEqual(logCard.alternatesEntry(row, [{ sentence: "T.", pivot_words: [], reject_reasons: [] }]), {
    word: "germane",
    chosen: "S.",
    picked_by: "auto",
    date: "2026-10-11",
    alternates: [{ sentence: "T.", pivot_words: [], reject_reasons: [] }],
  });
});

// The germane run's step outputs, as files log-card reads.
function germaneStepFiles(h, { story = "The main point stays relevant to the talk.\tmain,relevant\tpicked\n" } = {}) {
  return {
    story: h.writeFile("story.out", story),
    candidates: h.writeFile("candidates.out", "The main point stays relevant to the talk.\tmain,relevant\nThe main road is long.\tmain\n"),
    checks: h.writeFile("checks.out", "-\nsense-missing: relevant\n"),
    tags: h.writeFile("tags.out", "keyword-method\t0.9\nhomophone\t0.2\n"),
    define: h.writeFile("define.out", "relevant\nrelevant and fitting to the subject\nrelevant\n"),
    syllables: h.writeFile("syllabify.out", "dʒɚ.ˈmeɪn\n"),
    chunk: h.writeFile("chunk.out", "dʒɚ\tfirst-syllable,rime\nmeɪn\tstressed-syllable,rime\n"),
    keywords: h.writeFile("kw.out", GERMANE_KEYWORDS),
  };
}
const logCardArgs = (f, tags = f.tags) => [
  "germane", f.story, f.candidates, f.checks, tags, f.define, f.syllables, f.chunk, f.keywords,
];

test("log-card CLI: `-` for the tags file (Jev failed) logs technique [] and notes the missing tags on stderr", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const r = await h.runScript("log-card.js", logCardArgs(germaneStepFiles(h), "-"));
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "logged\tgermane\t1 runner-ups\n");
    assert.equal(r.stderr, "technique tags missing: Jev could not tag this story; logged with technique []\n");
    const [row] = h.readJsonl(h.mnemonicLog);
    assert.deepEqual(row.technique, []);
  } finally {
    await h.cleanup();
  }
});

test("log-card CLI: writes the alternates line and the log row, and only those", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const r = await h.runScript("log-card.js", logCardArgs(germaneStepFiles(h)));
    assert.deepEqual(r, { code: 0, stdout: "logged\tgermane\t1 runner-ups\n", stderr: "" });
    const [row] = h.readJsonl(h.mnemonicLog);
    assert.deepEqual(row.technique, ["keyword-method"]);
    const [entry] = h.readJsonl(h.alternatesLog);
    assert.deepEqual(entry.alternates, [
      { sentence: "The main road is long.", pivot_words: ["main"], reject_reasons: ["sense-missing: relevant"] },
    ]);
  } finally {
    await h.cleanup();
  }
});

test("log-card CLI: a row that fails validation exits 1 with its reasons, notes it, and writes nothing at all", async () => {
  const h = await createHarness(germaneFixture());
  try {
    // no chunk has a keyword: no anchor_unit and no keyword to log
    const files = germaneStepFiles(h);
    files.keywords = h.writeFile("kw-none.out", "dʒɚ\t-\nmeɪn\t-\n");
    const r = await h.runScript("log-card.js", logCardArgs(files));
    assert.equal(r.code, 1);
    assert.equal(r.stdout, "anchor_unit: empty\nkeyword: empty\n");
    assert.equal(r.stderr, "not logged: anchor_unit: empty; keyword: empty\n");
    assert.equal(fs.readFileSync(h.mnemonicLog, "utf8"), "");
    assert.ok(!fs.existsSync(h.alternatesLog));
  } finally {
    await h.cleanup();
  }
});

test("jev.config: NEMO_JEV_ENV_FILE is authoritative for the key and base URL (default base https://api.typesafe.ai)", () => {
  const file = tmpFile("a.env", "TYPESAFE_API_KEY=k1\n");
  assert.deepEqual(jev.config({ NEMO_JEV_ENV_FILE: file, TYPESAFE_API_KEY: "from-shell" }), {
    apiKey: "k1",
    baseURL: "https://api.typesafe.ai",
    model: "jev-latest",
    proxyEnv: {},
  });
  const file2 = tmpFile("b.env", "TYPESAFE_API_KEY=k2\nTYPESAFE_BASE_URL=http://127.0.0.1:9/\nHTTPS_PROXY=http://proxy:8080\n");
  const c = jev.config({ NEMO_JEV_ENV_FILE: file2 });
  assert.equal(c.baseURL, "http://127.0.0.1:9");
  assert.deepEqual(c.proxyEnv, { HTTPS_PROXY: "http://proxy:8080" });
});

test("jev.config: no key anywhere means Jev isn't configured (null)", () => {
  assert.equal(jev.config({ NEMO_JEV_ENV_FILE: tmpFile("empty.env", "") }), null);
  assert.equal(jev.config({ NEMO_JEV_ENV_FILE: path.join(tmp, "missing.env") }), null);
});

test("jev.systemOne: one POST to <base>/v1/systemone with the bearer key, state, questions and model; returns the answers", async () => {
  const seen = [];
  const fakeFetch = async (url, init) => {
    seen.push({ url, init });
    return new Response(JSON.stringify({ answers: { a: { noul: 0.7 } } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const answers = await jev.systemOne(
    { state: { word: "x" }, questions: { a: jev.noul("Is it?") } },
    { config: { apiKey: "k", baseURL: "http://jev.test", model: "jev-latest", proxyEnv: {} }, fetch: fakeFetch }
  );
  assert.deepEqual(answers, { a: { noul: 0.7 } });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, "http://jev.test/v1/systemone");
  assert.equal(seen[0].init.method, "POST");
  assert.equal(seen[0].init.headers.Authorization, "Bearer k");
  assert.deepEqual(JSON.parse(seen[0].init.body), {
    state: { word: "x" },
    questions: { a: { type: "noul", instructions: "Is it?" } },
    model: "jev-latest",
  });
});

test("jev.systemOne: not configured, a non-2xx answer, or a connection error all throw a JevError", async () => {
  const cfg = { apiKey: "k", baseURL: "http://jev.test", model: "jev-latest", proxyEnv: {} };
  const req = { state: {}, questions: { a: jev.noul("q") } };
  await assert.rejects(jev.systemOne(req, { config: null }), (e) => e instanceof jev.JevError && /not configured/.test(e.message));
  await assert.rejects(
    jev.systemOne(req, { config: cfg, fetch: async () => new Response("nope", { status: 451 }) }),
    (e) => e instanceof jev.JevError && /451/.test(e.message)
  );
  await assert.rejects(
    jev.systemOne(req, {
      config: cfg,
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    }),
    (e) => e instanceof jev.JevError && /fetch failed/.test(e.message)
  );
});
