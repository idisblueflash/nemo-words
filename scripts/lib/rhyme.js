"use strict";

// US-046: the rhyme rules for find-keywords (pure, no I/O). When a word's
// stressed chunk has no exact-sound keyword, it can still be anchored by a
// common word that rhymes with it (drown /dɹaʊn/ -> "down").
//
// A rhyme word: has one syllable; its GA rime (nucleus + coda) equals the
// chunk's rime (compared with ipaKey); has a non-empty onset; is not the
// headword (`exclude`); is not in FUNCTION_WORDS; has a frequency of at least FREQ_THRESHOLD, the
// exact-keyword limit. Of the words that pass, the most frequent wins.

const { ipaKey } = require("../card-lib");
const { syllables } = require("../syllabify");

// Keyword frequency cutoff (mean Ngram share, 2015–2019), shared with
// find-keywords' exact matches.
const FREQ_THRESHOLD = 5e-7;

// Words that can't carry a picture, never used as a rhyme (US-046 AC3):
// pronouns, articles, prepositions, conjunctions, auxiliary verbs, and
// words such as "thus". Fixed and short; extend it when a card shows a gap.
const FUNCTION_WORDS = new Set(
  [
    // pronouns and determiners
    "i me my mine we us our ours you your yours he him his she her hers it its they them their theirs",
    "this that these those who whom whose what which one ones",
    // articles
    "a an the",
    // prepositions
    "at by for from in into of off on onto out over per through to toward towards up upon via with",
    "than till near since",
    // conjunctions and connectives
    "and but or nor so yet if as though thus hence then when where while whilst whence",
    // auxiliary and modal verbs
    "am is are was were be been being has have had do does did done",
    "can could may might must shall should will would",
    // other function words
    "not no nay yes there here such",
  ]
    .join(" ")
    .split(/\s+/)
);

// The rime (nucleus + coda) of a one-syllable IPA string, as an ipaKey.
function rimeOf(ipa) {
  const syl = syllables(ipaKey(ipa))[0];
  return [syl.nucleus, ...syl.coda].filter(Boolean).map((x) => x.seg).join("");
}

// Does one GA pronunciation rhyme with `rime`: one syllable, an onset, the same rime?
function rhymesWith(ga, rime) {
  const sylls = syllables(ipaKey(ga));
  if (sylls.length !== 1 || !sylls[0].nucleus || sylls[0].onset.length === 0) return false;
  return rimeOf(ga) === rime;
}

// The words in `word\tRP\tGA[,GA…]` lookup output that rhyme with the chunk
// (frequency not yet considered): what word-freq is asked about.
function rhymeCandidates({ chunkIpa, lookupLines, exclude = [] }) {
  const rime = rimeOf(chunkIpa);
  const words = [];
  for (const line of String(lookupLines || "").split("\n")) {
    const [w, , ga] = line.split("\t");
    if (!w || !ga || !/^[a-z]+$/.test(w) || exclude.includes(w) || FUNCTION_WORDS.has(w) || words.includes(w)) continue;
    if (ga.split(",").some((v) => rhymesWith(v.trim(), rime))) words.push(w);
  }
  return words;
}

// -> { keyword, frequency } or null.
function rhymeFor({ chunkIpa, lookupLines, freqs = {}, exclude = [] }) {
  let best = null;
  for (const w of rhymeCandidates({ chunkIpa, lookupLines, exclude })) {
    const f = freqs[w];
    if (typeof f !== "number" || !(f >= FREQ_THRESHOLD)) continue;
    if (!best || f > best.frequency) best = { keyword: w, frequency: f };
  }
  return best;
}

// US-063 (C-031, ADR-0029/0030): the word rhyme, the last fallback for the
// stressed chunk. It matches the headword's WordTail: the sound from the
// stressed chunk's vowel to the end of the word (durable ˈdʊ.ɹə.bəl -> /ʊɹəbəl/).

// The WordTail of chunk `index` in `chunkIpas` (chunk order): that chunk's
// rime plus every later chunk's IPA, as an ipaKey.
function tailFrom(chunkIpas, index) {
  return rimeOf(chunkIpas[index]) + chunkIpas.slice(index + 1).map(ipaKey).join("");
}

// The stressed chunk of a syllable string (`ˈdʊ.ɹə.bəl`): the one with the
// primary stress, or a one-chunk word's only chunk. -> { index, chunkIpas } | null
function stressedChunk(syllableString) {
  const parts = String(syllableString || "").split(".").filter(Boolean);
  let index = parts.findIndex((p) => p.includes("ˈ"));
  if (index === -1 && parts.length === 1) index = 0;
  if (index === -1) return null;
  return { index, chunkIpas: parts.map(ipaKey) };
}

function wordTail(syllableString) {
  const s = stressedChunk(syllableString);
  return s ? tailFrom(s.chunkIpas, s.index) : null;
}

// One GA form's end from its primary-stressed vowel, and that syllable's
// onset. A one-syllable form with no `ˈ` counts as stressed; a longer form
// with no `ˈ` gives null. Only the primary stress counts (`ˌ` is part of the end).
// -> { tail, onset } | null
function stressedEnd(ga) {
  const norm = String(ga).replace(/[.ː]/g, "").replace(/r/g, "ɹ").replace(/ɡ/g, "g");
  const sylls = syllables(norm);
  if (!sylls[0].nucleus) return null;
  let i = sylls.findIndex((x) => x.nucleus.stress === "ˈ");
  if (i === -1 && sylls.length === 1) i = 0;
  if (i === -1) return null;
  const segs = [sylls[i].nucleus, ...sylls[i].coda];
  for (const x of sylls.slice(i + 1)) segs.push(...x.onset, x.nucleus, ...x.coda);
  return { tail: ipaKey(segs.map((x) => x.seg).join("")), onset: sylls[i].onset.map((x) => x.seg).join("") };
}

// Does one GA form end in `tail` from its primary-stressed vowel?
function endsInTail(ga, tail) {
  const end = stressedEnd(ga);
  return Boolean(end && end.tail === tail);
}

// The words in `word\tRP\tGA[,GA…]` lookup output that can be the word rhyme
// (frequency not yet considered): a GA form ends in the WordTail from its
// stressed vowel, with an onset there that is not empty and not the
// headword's stressed onset (that would be a homophone); not the headword, an
// inflection of it, or a word it is an inflection of; not a function word.
function wordRhymeCandidates({ syllableString, lookupLines, headword }) {
  const s = stressedChunk(syllableString);
  if (!s) return [];
  const tail = tailFrom(s.chunkIpas, s.index);
  const ownOnset = syllables(s.chunkIpas[s.index])[0].onset.map((x) => x.seg).join("");
  const { isInflectionOf } = require("../check-story"); // lazy: check-story requires this file
  const hw = headword ? headword.toLowerCase() : null;
  const words = [];
  for (const line of String(lookupLines || "").split("\n")) {
    const [w, , ga] = line.split("\t");
    if (!w || !ga || !/^[a-z]+$/.test(w) || FUNCTION_WORDS.has(w) || words.includes(w)) continue;
    if (hw && (w === hw || isInflectionOf(w, hw) || isInflectionOf(hw, w))) continue;
    const fits = ga.split(",").some((v) => {
      const end = stressedEnd(v.trim());
      return end && end.tail === tail && end.onset !== "" && end.onset !== ownOnset;
    });
    if (fits) words.push(w);
  }
  return words;
}

// The most frequent candidate at or above FREQ_THRESHOLD.
// -> { keyword, frequency, tail } or null.
function wordRhymeFor({ syllableString, lookupLines, freqs = {}, headword }) {
  let best = null;
  for (const w of wordRhymeCandidates({ syllableString, lookupLines, headword })) {
    const f = freqs[w];
    if (typeof f !== "number" || !(f >= FREQ_THRESHOLD)) continue;
    if (!best || f > best.frequency) best = { keyword: w, frequency: f };
  }
  return best && { ...best, tail: wordTail(syllableString) };
}

module.exports = {
  rhymeFor,
  rhymeCandidates,
  rimeOf,
  wordRhymeFor,
  wordRhymeCandidates,
  wordTail,
  tailFrom,
  stressedEnd,
  endsInTail,
  FREQ_THRESHOLD,
  FUNCTION_WORDS,
};
