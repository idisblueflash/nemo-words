// Unit tests for the US-028 step CLIs' pure functions (scripts/<step>.js).
// End-to-end AC coverage lives in test/card-ac*.test.js.

const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeWord } = require("../scripts/normalize");

test("normalize: trims and keeps a single word as typed", () => {
  assert.deepEqual(normalizeWord("  Quebec \n"), { ok: true, word: "Quebec" });
});

test("normalize: rejects empty and multi-word input with a reason", () => {
  assert.equal(normalizeWord("   ").ok, false);
  assert.match(normalizeWord("   ").reason, /empty/);
  assert.equal(normalizeWord("ice cream").ok, false);
  assert.match(normalizeWord("ice cream").reason, /one word/);
});

const { routeWord } = require("../scripts/route");

test("route: a no-match general-English word routes general", () => {
  assert.deepEqual(routeWord("germane", { rows: [], log: [] }), { route: "general" });
});

const { gaFromLookup } = require("../scripts/ipa");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

test("route: a card with a story stops as already-carded (Front match case-insensitive)", () => {
  assert.deepEqual(routeWord("Germane", { rows: [{ front: "germane", back: "Old story." }], log: [] }), {
    route: "already-carded",
    story: "Old story.",
  });
});

test("route: a row with an empty Back counts as no story", () => {
  assert.deepEqual(routeWord("germane", { rows: [{ front: "germane", back: "" }], log: [] }), { route: "general" });
});

test("route: a classifier `medical` verdict (morpheme or INN stem) routes word-part", () => {
  assert.deepEqual(routeWord("nephrectomy", { rows: [], log: [] }), { route: "word-part" });
});

test("route CLI: word-part exits 1 naming the _etta_mology path", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const r = await h.runScript("route.js", ["nephrectomy"]);
    assert.equal(r.code, 1);
    assert.equal(r.stdout, "word-part: nephrectomy belongs to the word-part path (_etta_mology), not a story card\n");
  } finally {
    await h.cleanup();
  }
});

// US-040 changed this: an ambiguous verdict is no longer a stop; judge-route settles it.
test("route: a classifier `ambiguous` verdict routes ambiguous, with its matched weak parts", () => {
  assert.deepEqual(routeWord("famous", { rows: [], log: [] }), { route: "ambiguous", matchedParts: ["-ous"] });
});

test("route CLI: ambiguous exits 0 printing `ambiguous\\t<matched parts>` for judge-route", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const r = await h.runScript("route.js", ["famous"]);
    assert.deepEqual(r, { code: 0, stdout: "ambiguous\t-ous\n", stderr: "" });
  } finally {
    await h.cleanup();
  }
});

test("route: a logged (not carded) story rides along with the general route; exact word only", () => {
  const log = [
    { word: "hepat-", sentence: "Hep pats." },
    { word: "Germane", sentence: "Jermaine's main point stayed relevant.", pivot_words: ["main", "relevant"] },
  ];
  assert.deepEqual(routeWord("germane", { rows: [], log }), {
    route: "general",
    logged: { sentence: "Jermaine's main point stayed relevant.", pivots: ["main", "relevant"] },
  });
  assert.deepEqual(routeWord("hepatic", { rows: [], log: [{ word: "hepat-", sentence: "x" }] }).logged, undefined);
});

test("route CLI: prints `general\\tsentence\\tpivots` for a logged story", async () => {
  const h = await createHarness(germaneFixture(), { log: [{ word: "germane", sentence: "Main is relevant.", pivot_words: ["main", "relevant"] }] });
  try {
    assert.deepEqual(await h.runScript("route.js", ["germane"]), { code: 0, stdout: "general\tMain is relevant.\tmain,relevant\n", stderr: "" });
  } finally {
    await h.cleanup();
  }
});

test("route CLI: already-carded exits 1 and shows the current story", async () => {
  const h = await createHarness(germaneFixture(), { rows: ["germane\tOld main story.\t\t\t"] });
  try {
    const r = await h.runScript("route.js", ["germane"]);
    assert.equal(r.code, 1);
    assert.equal(r.stdout, "already carded: germane — current story: Old main story.\n");
  } finally {
    await h.cleanup();
  }
});

test("ipa: takes the first GA variant of the exact word's lookup row", () => {
  const out = "trial\ttɹaɪəl\ttɹˈaɪəl,tɹˈaɪl\ntrials\t\ttɹˈaɪəlz\n";
  assert.equal(gaFromLookup(out, "Trial"), "tɹˈaɪəl");
  assert.equal(gaFromLookup("", "zzq"), null);
});

const { syllabify } = require("../scripts/syllabify");

test("syllabify: the story's worked example", () => {
  assert.equal(syllabify("ˈtraɪəl"), "ˈtraɪ.əl");
});

test("syllabify: moves CMU's pre-vowel stress mark to the syllable start", () => {
  assert.equal(syllabify("tɹˈaɪəl"), "ˈtɹaɪ.əl");
  assert.equal(syllabify("dʒɚmˈeɪn"), "dʒɚ.ˈmeɪn");
});

test("syllabify: maximal legal onset, affricates kept whole, secondary stress kept", () => {
  assert.equal(syllabify("kˈɑmpətəns"), "ˈkɑm.pə.təns");
  assert.equal(syllabify("ɪkstɹˈim"), "ɪk.ˈstɹim");
  assert.equal(syllabify("lˈɪtɚətʃɚ"), "ˈlɪ.tɚ.ə.tʃɚ");
  assert.equal(syllabify("ˈæləmˌeɪn"), "ˈæ.lə.ˌmeɪn");
  assert.equal(syllabify("bˈʌldʒ"), "ˈbʌldʒ");
});

const { parseDefinition } = require("../scripts/define");

test("define: parses the model's JSON (inside any chatter) and strips tabs/newlines", () => {
  const text = 'Sure!\n```json\n{"primarySense": "Relevant", "definition": "fitting\\tthe\\nsubject", "senses": ["relevant", "apt"]}\n```';
  assert.deepEqual(parseDefinition(text), {
    primarySense: "relevant",
    definition: "fitting the subject",
    senses: ["relevant", "apt"],
  });
});

test("define: a multi-word primary sense is an error, not a silent pick", () => {
  assert.throws(() => parseDefinition('{"primarySense":"to the point","definition":"x","senses":[]}'), /one word/);
});

test("define CLI: three lines — primary sense, definition, senses", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const r = await h.runScript("define.js", ["germane"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "relevant\nrelevant and fitting to the subject under discussion\nrelevant,pertinent,fitting\n");
    const [call] = h.claudeCalls();
    assert.equal(call.step, "define");
    assert.match(call.prompt, /germane/);
  } finally {
    await h.cleanup();
  }
});

const { checkGloss } = require("../scripts/gloss");

test("gloss: flattens the model text and accepts up to 60 characters", () => {
  assert.deepEqual(checkGloss('"relevant to the\nmatter at hand"'), { ok: true, gloss: "relevant to the matter at hand" });
  assert.equal(checkGloss("x".repeat(60)).ok, true);
});

test("gloss: over 60 characters stops with the length in the reason", () => {
  const r = checkGloss("x".repeat(61));
  assert.equal(r.ok, false);
  assert.match(r.reason, /gloss-too-long: 61 > 60/);
});

test("gloss CLI: one line from the model, prompt carries the sense", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const r = await h.runScript("gloss.js", ["germane", "relevant", "relevant and fitting"]);
    assert.deepEqual(r, { code: 0, stdout: "relevant to the matter at hand\n", stderr: "" });
    assert.match(h.claudeCalls()[0].prompt, /relevant and fitting/);
  } finally {
    await h.cleanup();
  }
});

const { chunk } = require("../scripts/chunk");

test("chunk: one chunk per syllable, stress stripped, with its available anchor units", () => {
  assert.deepEqual(chunk("dʒɚ.ˈmeɪn"), [
    { ipa: "dʒɚ", anchorUnits: ["first-syllable", "rime", "onset", "nucleus"] },
    { ipa: "meɪn", anchorUnits: ["stressed-syllable", "rime", "onset", "nucleus", "coda"] },
  ]);
});

test("chunk: a one-syllable word is also a whole-word unit", () => {
  assert.deepEqual(chunk("ˈbʌldʒ"), [
    { ipa: "bʌldʒ", anchorUnits: ["whole-word", "first-syllable", "stressed-syllable", "rime", "onset", "nucleus", "coda"] },
  ]);
});

const { exactMatches, pickKeyword, ipaKey } = require("../scripts/find-keywords");

test("find-keywords: ipaKey ignores stress marks and treats r and ɹ alike", () => {
  assert.equal(ipaKey("tɹˈaɪ"), ipaKey("ˈtraɪ"));
});

test("find-keywords: keeps only words whose GA IPA equals the chunk exactly", () => {
  const out = "main\t\tmˈeɪn\nremain\t\tɹɪmˈeɪn\nmaine\t\tmˈeɪn,mˈeɪni\nal-amein\t\tˈæləmˌeɪn\n";
  assert.deepEqual(exactMatches(out, "meɪn"), ["main", "maine"]);
});

test("find-keywords: highest frequency above the threshold wins; none -> null", () => {
  const freqs = { main: 1.28e-4, mane: 1.8e-6, maine: 7e-8 };
  assert.deepEqual(pickKeyword(["maine", "mane", "main"], freqs, { exclude: [] }), { keyword: "main", frequency: 1.28e-4 });
  assert.equal(pickKeyword(["maine"], freqs, { exclude: [] }), null);
  assert.deepEqual(pickKeyword(["main", "mane"], freqs, { exclude: ["main"] }), { keyword: "mane", frequency: 1.8e-6 });
});

test("find-keywords: the frequency cutoff keeps familiar words (pickle, veer) and drops rare ones (urbane, beck)", () => {
  // Real Ngram means (2015–2019), measured while tuning the cutoff.
  const freqs = { pickle: 9.694e-7, veer: 6.0917e-7, urbane: 4.1698e-7, beck: 4.4668e-7 };
  for (const w of ["pickle", "veer"]) assert.equal(pickKeyword([w], freqs).keyword, w);
  for (const w of ["urbane", "beck"]) assert.equal(pickKeyword([w], freqs), null);
});

test("find-keywords CLI: one line per chunk, `-` when no exact common match", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const r = await h.runScript("find-keywords.js", ["dʒɚ.ˈmeɪn", "germane"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "dʒɚ\t-\nmeɪn\tmain\t1.2800e-4\n");
  } finally {
    await h.cleanup();
  }
});

const { parseStories, readChunkKeywords } = require("../scripts/compose-stories");

// find-keywords output for germane (dʒɚ.ˈmeɪn).
const GERMANE_KEYWORDS = "dʒɚ\t-\nmeɪn\tmain\t1.2800e-4\n";

test("compose-stories: parses up to 5 candidates, flattening tabs/newlines", () => {
  const six = Array.from({ length: 6 }, (_, i) => ({ sentence: `S${i}\tone\ntwo.`, pivots: ["a\tb", "c"] }));
  const out = parseStories("Here:\n" + JSON.stringify(six));
  assert.equal(out.length, 5);
  assert.deepEqual(out[0], { sentence: "S0 one two.", pivots: ["a b", "c"] });
});

test("compose-stories: reads the find-keywords file into ordered chunks", () => {
  assert.deepEqual(readChunkKeywords("dʒɚ\t-\nmeɪn\tmain\t1.2800e-4\n"), [
    { ipa: "dʒɚ", keyword: null },
    { ipa: "meɪn", keyword: "main" },
  ]);
});

test("compose-stories CLI: prints `sentence\\tpivots` lines; prompt lists the anchors in order", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const kw = h.writeFile("kw.tsv", GERMANE_KEYWORDS);
    const r = await h.runScript("compose-stories.js", ["germane", "relevant", kw]);
    assert.equal(r.code, 0, r.stderr);
    const lines = r.stdout.trimEnd().split("\n");
    assert.equal(lines.length, 5);
    assert.equal(lines[0], "The main point stays relevant to the talk.\tmain,relevant");
    const { prompt } = h.claudeCalls()[0];
    assert.match(prompt, /meɪn.*main/);
    assert.match(prompt, /relevant/);
  } finally {
    await h.cleanup();
  }
});

const { pickStory } = require("../scripts/pick-story");

test("pick-story: the first candidate whose check line is `-` wins", () => {
  const candidates = "A first.\ta\nB second.\tb,c\nC third.\tc\n";
  const checks = "headword: x\n-\n-\n";
  assert.deepEqual(pickStory(candidates, checks), { ok: true, line: "B second.\tb,c" });
});

const { checkStory, isInflectionOf } = require("../scripts/check-story");

test("check-story: inflections are matched case-insensitively", () => {
  for (const [form, base] of [
    ["conceded", "concede"], ["Concedes", "concede"], ["conceding", "concede"],
    ["germanes", "germane"], ["tried", "try"], ["tries", "try"], ["stopped", "stop"],
    ["bigger", "big"], ["boxes", "box"], ["relevant", "relevant"],
  ]) assert.ok(isInflectionOf(form, base), `${form} ~ ${base}`);
  for (const [form, base] of [["concise", "concede"], ["main", "germane"], ["stops", "top"]]) {
    assert.ok(!isInflectionOf(form, base), `${form} !~ ${base}`);
  }
});

const GERMANE_CHUNKS = [{ ipa: "dʒɚ", keyword: null }, { ipa: "meɪn", keyword: "main" }];
const gaOf = (dict) => (w) => dict[w.toLowerCase()] || null;
const GERMANE_GA = gaOf({ main: "mˈeɪn" });

test("check-story: the headword or an inflection of it is rejected, reason names it", () => {
  const reasons = checkStory({
    word: "concede", primarySense: "admit", sentence: "Con artists conceded and admit it.",
    pivots: [], chunks: [], lookupGa: GERMANE_GA,
  });
  assert.deepEqual(reasons, ["headword: conceded"]);
});

test("check-story: more than 10 words is rejected (wc -w count)", () => {
  const ok = checkStory({ word: "germane", primarySense: "relevant", sentence: "One two three four five six seven eight nine relevant.", pivots: [], chunks: [], lookupGa: GERMANE_GA });
  assert.deepEqual(ok, []);
  const long = checkStory({ word: "germane", primarySense: "relevant", sentence: "One two three four five six seven eight nine ten relevant.", pivots: [], chunks: [], lookupGa: GERMANE_GA });
  assert.deepEqual(long, ["word-count: 11 > 10"]);
});

test("check-story: the primary sense word (or an inflection) must be present", () => {
  const base = { word: "concede", primarySense: "admit", pivots: [], chunks: [], lookupGa: GERMANE_GA };
  assert.deepEqual(checkStory({ ...base, sentence: "Con artists admitted the seed was fake." }), []);
  assert.deepEqual(checkStory({ ...base, sentence: "Con artists sold a fake seed." }), ["sense-missing: admit"]);
});

const TWO_ANCHORS = [{ ipa: "meɪn", keyword: "main" }, { ipa: "ə", keyword: null }, { ipa: "leɪn", keyword: "lane" }];
const TWO_GA = gaOf({ main: "mˈeɪn", lane: "lˈeɪn", germ: "dʒˈɝm" });
const anchorCheck = (sentence, chunks = TWO_ANCHORS) =>
  checkStory({ word: "mainalane", primarySense: "road", sentence, pivots: [], chunks, lookupGa: TWO_GA });

test("check-story: every anchor keyword appears, in syllable order", () => {
  assert.deepEqual(anchorCheck("The main road narrows into a lane."), []);
  assert.deepEqual(anchorCheck("A lane road meets the main one."), ["anchor-order: lane before main"]);
  assert.deepEqual(anchorCheck("The main road ends."), ["anchor-missing: lane"]);
});

test("check-story: each anchor's GA IPA must equal its chunk's IPA exactly", () => {
  const chunks = [{ ipa: "dʒɚ", keyword: "germ" }];
  assert.deepEqual(anchorCheck("A germ on the road.", chunks), ["anchor-ipa: germ /dʒɝm/ is not /dʒɚ/"]);
  assert.deepEqual(anchorCheck("A zorb on the road.", [{ ipa: "zɔɹb", keyword: "zorb" }]), ["anchor-ipa: zorb /?/ is not /zɔɹb/"]);
});

test("pick-story: when nothing passes, reports every candidate with its reasons", () => {
  const candidates = "A first.\ta\nB second.\tb\n";
  const checks = "headword: x\nword-count: 12 > 10,sense-missing: y\n";
  assert.deepEqual(pickStory(candidates, checks), {
    ok: false,
    reasons: [
      "no-pick: none of 2 candidates passed the hard gates",
      "A first.\theadword: x",
      "B second.\tword-count: 12 > 10,sense-missing: y",
    ],
  });
});

test("check-story CLI: a failing story exits 1 with one reason per line", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const kw = h.writeFile("kw.tsv", GERMANE_KEYWORDS);
    const r = await h.runScript("check-story.js", ["germane", "relevant", "Germane points.", "", kw]);
    assert.equal(r.code, 1);
    assert.equal(r.stdout, "headword: germane\nsense-missing: relevant\nanchor-missing: main\n");
  } finally {
    await h.cleanup();
  }
});

test("check-story CLI: a passing story exits 0 with no output", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const kw = h.writeFile("kw.tsv", GERMANE_KEYWORDS);
    const r = await h.runScript("check-story.js", ["germane", "relevant", "The main point stays relevant to the talk.", "main,relevant", kw]);
    assert.deepEqual(r, { code: 0, stdout: "", stderr: "" });
  } finally {
    await h.cleanup();
  }
});

test("write-row CLI: appends a Front/Back/Image/IPA/Gloss row for a new word", async () => {
  const h = await createHarness(germaneFixture(), { rows: ["cracks\tOld tracks.\t\t\tthin lines"] });
  try {
    const r = await h.runScript("write-row.js", ["germane", "The main point stays relevant.", "dʒɚ.ˈmeɪn", "relevant to the matter"]);
    assert.deepEqual(r, { code: 0, stdout: "added\tgermane\n", stderr: "" });
    const rows = h.readAnkiFile().split("\n").filter((l) => l && !l.startsWith("#"));
    assert.deepEqual(rows, ["cracks\tOld tracks.\t\t\tthin lines", "germane\tThe main point stays relevant.\t\tdʒɚ.ˈmeɪn\trelevant to the matter"]);
  } finally {
    await h.cleanup();
  }
});

test("sync CLI: pushes the row through anki-sync.js and prints ok", async () => {
  const h = await createHarness(germaneFixture(), { rows: ["germane\tThe main point.\t\tdʒɚ.ˈmeɪn\trelevant"] });
  try {
    const r = await h.runScript("sync.js", ["germane", "added"]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, "ok\n");
    assert.equal(h.mock.notes.length, 1);
    assert.equal(h.mock.notes[0].fields.Front, "germane");
  } finally {
    await h.cleanup();
  }
});

test("write-row CLI: a row with an empty Back is patched in place, not duplicated", async () => {
  const h = await createHarness(germaneFixture(), { rows: ["Germane\t\tgermane.png\t\t", "cracks\tOld tracks.\t\t\tthin lines"] });
  try {
    const r = await h.runScript("write-row.js", ["germane", "The main point stays relevant.", "dʒɚ.ˈmeɪn", "relevant"]);
    assert.deepEqual(r, { code: 0, stdout: "patched\tGermane\n", stderr: "" });
    const rows = h.readAnkiFile().split("\n").filter((l) => l && !l.startsWith("#"));
    assert.deepEqual(rows, ["Germane\tThe main point stays relevant.\tgermane.png\tdʒɚ.ˈmeɪn\trelevant", "cracks\tOld tracks.\t\t\tthin lines"]);
  } finally {
    await h.cleanup();
  }
});

test("write-row CLI: refuses to overwrite a row that already has a story", async () => {
  const h = await createHarness(germaneFixture(), { rows: ["germane\tOld story.\t\t\t"] });
  const before = h.readAnkiFile();
  try {
    const r = await h.runScript("write-row.js", ["germane", "New story.", "x", "y"]);
    assert.equal(r.code, 1);
    assert.match(r.stdout, /already carded: germane — current story: Old story\./);
    assert.equal(h.readAnkiFile(), before);
  } finally {
    await h.cleanup();
  }
});

test("sync CLI: with Anki unreachable, exits 1 with a re-run hint and logs the failure", async () => {
  const h = await createHarness(germaneFixture(), { rows: ["germane\tThe main point.\t\t\t"], anki: "down" });
  try {
    const r = await h.runScript("sync.js", ["germane", "added"]);
    assert.equal(r.code, 1);
    const [first, second] = r.stdout.trimEnd().split("\n");
    assert.match(first, /^sync failed: Could not reach AnkiConnect/);
    assert.equal(second, 'the row is written; re-run later: node scripts/sync.js "germane"');
    const log = require("node:fs").readFileSync(h.syncLog, "utf8");
    assert.match(log, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ term=germane file=added sync=failed \(Could not reach AnkiConnect.*\)\n$/);
  } finally {
    await h.cleanup();
  }
});

test("sync CLI: a successful sync is logged too", async () => {
  const h = await createHarness(germaneFixture(), { rows: ["germane\tThe main point.\t\t\t"] });
  try {
    await h.runScript("sync.js", ["germane", "patched"]);
    assert.match(require("node:fs").readFileSync(h.syncLog, "utf8"), /^\S+Z term=germane file=patched sync=ok\n$/);
  } finally {
    await h.cleanup();
  }
});

test("ipa CLI: prints the word's GA IPA via nemo-words, exit 1 when unknown", async () => {
  const h = await createHarness(germaneFixture());
  try {
    assert.deepEqual(await h.runScript("ipa.js", ["germane"]), { code: 0, stdout: "dʒɚmˈeɪn\n", stderr: "" });
    const miss = await h.runScript("ipa.js", ["zzq"]);
    assert.equal(miss.code, 1);
    assert.match(miss.stdout, /no-ipa: zzq/);
  } finally {
    await h.cleanup();
  }
});
