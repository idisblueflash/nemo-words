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

module.exports = { rhymeFor, rhymeCandidates, rimeOf, FREQ_THRESHOLD, FUNCTION_WORDS };
