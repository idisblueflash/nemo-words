"use strict";

// SP-037 AC1 — Given 20 words sampled from the mnemonic log, each with Flash's
// logged story, when the spike run builds each word's candidate set, then each
// set holds Flash's story plus 5 fresh candidates, a fresh candidate matching
// Flash's word-for-word is dropped and replaced, and the candidates are
// shuffled with nothing marking which one is Flash's.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const { sampleWords, readLog } = require("../lib/sample");
const { buildCandidateSet, forJudge } = require("../lib/candidates");

const LOG = path.join(__dirname, "..", "..", "..", "data", "mnemonics", "log.jsonl");

// A fake `draft` step: 5 fresh candidates per call, the first of which echoes
// Flash's story (with different case/punctuation) on the first call only.
function fakeDraft() {
  const calls = [];
  const draft = async (tw, count) => {
    calls.push({ word: tw.word, count });
    const first = calls.filter((c) => c.word === tw.word).length === 1;
    return Array.from({ length: count }, (_, i) => ({
      sentence:
        first && i === 0
          ? tw.flashSentence.toUpperCase().replace(/[.,;!?]/g, "")
          : `Fresh ${tw.word} candidate number ${calls.length}-${i}.`,
      pivot_words: ["fresh", "candidate"],
    }));
  };
  return { draft, calls };
}

test("AC1: 20 sampled words each get Flash's story + 5 fresh, deduped, shuffled, unmarked", async () => {
  const words = sampleWords(readLog(fs.readFileSync(LOG, "utf8")), { n: 20, seed: 37 });
  assert.equal(words.length, 20);
  assert.equal(new Set(words.map((w) => w.word)).size, 20, "20 distinct words");

  const { draft, calls } = fakeDraft();
  let flashFirstEverywhere = true;
  for (const tw of words) {
    const set = await buildCandidateSet(tw, { draft, seed: 37 });
    assert.equal(set.length, 6, `${tw.word}: Flash + 5 fresh`);
    const flash = set.filter((c) => c.source === "flash");
    assert.equal(flash.length, 1);
    assert.equal(flash[0].sentence, tw.flashSentence);
    assert.deepEqual(flash[0].pivot_words, tw.flashPivots);
    // the echo of Flash's story was dropped and replaced by a redraft
    const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
    assert.equal(set.filter((c) => norm(c.sentence) === norm(tw.flashSentence)).length, 1);
    assert.equal(set.filter((c) => c.source === "fresh").length, 5);
    if (set[0].source !== "flash") flashFirstEverywhere = false;
    // nothing handed to the judge marks Flash's story
    for (const c of set) assert.deepEqual(Object.keys(forJudge(c)).sort(), ["pivot_words", "sentence"]);
  }
  assert.equal(flashFirstEverywhere, false, "Flash's story is not always in the same slot");
  // each word: one 5-candidate draft, one 1-candidate redraft for the echo
  assert.deepEqual(
    calls.map((c) => c.count),
    words.flatMap(() => [5, 1]),
  );
});
