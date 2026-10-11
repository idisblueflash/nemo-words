"use strict";

// Unit tests for AC1's pieces: sampling, the echo rule's edge cases, and the
// `draft` step's prompt/parse (no `claude -p` call — exec is injected).

const test = require("node:test");
const assert = require("node:assert/strict");

const { sampleWords, eligibleWords } = require("../lib/sample");
const { buildCandidateSet, normalize } = require("../lib/candidates");
const { buildDraftPrompt, parseDraftOutput, makeClaudeDraft } = require("../lib/draft");

const row = (word, sentence, extra = {}) => ({
  word,
  syllabification: ["x"],
  keyword: "k",
  sense: `sense of ${word}`,
  sentence,
  pivot_words: ["a"],
  ...extra,
});

const tw = {
  word: "creak",
  sense: "to make a harsh groaning sound",
  syllables: ["ˈkɹik"],
  keyword: "creek",
  flashSentence: "Beside the creek, the rotten dock groans under my boots.",
  flashPivots: ["creek", "rotten", "dock", "groans"],
};

test("sample: latest row per word, and a word whose latest story names it is skipped", () => {
  const rows = [
    row("robe", "The judge grabs her robe."),
    row("odd", "An old story."),
    row("odd", "A newer story."),
    row("drown", "The flood drowned the church."),
    row("tax-", "The tax clerk lines up folders."),
    row("ok", "Fine words here."),
  ];
  const words = eligibleWords(rows);
  assert.deepEqual(
    words.map((w) => [w.word, w.flashSentence]),
    [
      ["odd", "A newer story."],
      ["ok", "Fine words here."],
    ],
  );
});

test("sample: a fixed seed always draws the same words; another seed differs", () => {
  const rows = Array.from({ length: 50 }, (_, i) => row(`w${i}`, `story ${i}`));
  const a = sampleWords(rows, { n: 20, seed: 37 }).map((w) => w.word);
  assert.deepEqual(sampleWords(rows, { n: 20, seed: 37 }).map((w) => w.word), a);
  assert.notDeepEqual(sampleWords(rows, { n: 20, seed: 38 }).map((w) => w.word), a);
});

test("normalize: case and punctuation don't count", () => {
  assert.equal(normalize("Beside the creek, the dock groans!"), normalize("beside the creek the DOCK groans"));
});

test("echo redrafted once, still an echo → dropped; set runs smaller", async () => {
  let calls = 0;
  const draft = async (_tw, count) => {
    calls++;
    if (count === 1) return [{ sentence: tw.flashSentence, pivot_words: [] }];
    return [
      { sentence: tw.flashSentence.toLowerCase(), pivot_words: [] },
      ...Array.from({ length: 4 }, (_, i) => ({ sentence: `fresh ${i}`, pivot_words: [] })),
    ];
  };
  const set = await buildCandidateSet(tw, { draft, seed: 1 });
  assert.equal(calls, 2, "one draft + exactly one redraft");
  assert.equal(set.length, 5);
  assert.equal(set.filter((c) => c.source === "fresh").length, 4);
});

test("fewer than 5 fresh candidates back → run with what came back", async () => {
  const draft = async () => [{ sentence: "only one", pivot_words: [] }];
  const set = await buildCandidateSet(tw, { draft, seed: 1 });
  assert.equal(set.length, 2);
});

test("same seed → same order; order doesn't depend on Flash being first", async () => {
  const draft = async () => Array.from({ length: 5 }, (_, i) => ({ sentence: `s${i}`, pivot_words: [] }));
  const a = await buildCandidateSet(tw, { draft, seed: 7 });
  const b = await buildCandidateSet(tw, { draft, seed: 7 });
  assert.deepEqual(a, b);
});

test("draft prompt carries word, sense and IPA, the _nemo gates — never Flash's story", () => {
  const prompt = buildDraftPrompt(tw, 5);
  assert.match(prompt, /creak/);
  assert.match(prompt, /harsh groaning sound/);
  assert.match(prompt, /ˈkɹik/);
  assert.match(prompt, /scene-coherence check/);
  assert.match(prompt, /no animal-harm imagery check/);
  assert.match(prompt, /exactly 5 lines/);
  assert.doesNotMatch(prompt, /rotten dock/);
  assert.ok(!prompt.includes(tw.flashSentence));
  const other = { ...tw, flashSentence: "Other.", flashPivots: ["zz"], keyword: "zz" };
  assert.equal(buildDraftPrompt(other, 5), prompt, "Flash's story, keyword and pivots don't reach the prompt");
});

test("draft output: `sentence<TAB>pivot,pivot` lines; tabs/newlines stripped, junk lines ignored", () => {
  const out = [
    "Here you go:",
    "1. Kirk sees the old door, it groans.\tKirk,groans",
    "```",
    "Rick's stairs moan loudly.\tRick, moan",
    "",
  ].join("\n");
  assert.deepEqual(parseDraftOutput(out), [
    { sentence: "Kirk sees the old door, it groans.", pivot_words: ["Kirk", "groans"] },
    { sentence: "Rick's stairs moan loudly.", pivot_words: ["Rick", "moan"] },
  ]);
});

test("claude draft: runs `claude -p` through the injected exec and caps at count", async () => {
  const seen = [];
  const exec = async (args) => {
    seen.push(args);
    return Array.from({ length: 7 }, (_, i) => `s${i}\tp${i}`).join("\n");
  };
  const draft = makeClaudeDraft({ exec });
  const got = await draft(tw, 5);
  assert.equal(got.length, 5);
  assert.equal(seen[0][0], "-p");
});
