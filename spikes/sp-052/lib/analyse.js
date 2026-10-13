"use strict";

// SP-052: looks every word up in both dictionaries (AC2) and finds its exact
// anchors with each one alone (AC3).

const { syllabify } = require("../../../scripts/syllabify");
const { syllabifyNoad } = require("../syllabify-noad");
const { lookupNoad, headwordsWithIpa } = require("./noad");
const { lookupCmu } = require("./cmu");
const {
  noadCandidateIndex,
  noadCandidates,
  cmuCandidates,
  isInflection,
  chunksWithCandidates,
  pickAnchors,
} = require("./anchors");

// words: [{ word, sources }] -> [{ word, sources, noad, cmu }] where each side
// is its lookup plus { syllables, anchors: [{ ipa, keyword, frequency }] }.
// cmu also gets `anchorsWithInflections`, for the report's inflection count.
function analyse({ words, noad, cmu, freqsFor, er = "onset" }) {
  const noadCands = noadCandidateIndex(noad);
  const heads = headwordsWithIpa(noad);
  const infl = (w) => isInflection(w, heads);

  const staged = words.map((w) => {
    const n = lookupNoad(noad, w.word);
    const c = lookupCmu(cmu, w.word);
    const nSyll = n.hasUsIpa ? syllabifyNoad(n.canonicalIpa, { er }) : "";
    const cSyll = c.hasUsIpa ? syllabify(c.ipa) : "";
    return {
      ...w,
      noad: { ...n, syllables: nSyll, chunks: chunksWithCandidates(nSyll, (ipa) => noadCandidates(noadCands, ipa)) },
      cmu: {
        ...c,
        syllables: cSyll,
        chunks: chunksWithCandidates(cSyll, (ipa) => cmuCandidates(cmu, ipa, { isInflection: infl })),
        chunksAll: chunksWithCandidates(cSyll, (ipa) => cmuCandidates(cmu, ipa)),
      },
    };
  });

  const all = new Set();
  for (const s of staged) {
    for (const ch of [...s.noad.chunks, ...s.cmu.chunksAll]) for (const w of ch.candidates) all.add(w);
  }
  const freqs = freqsFor([...all]);

  return staged.map(({ noad: n, cmu: c, ...w }) => {
    const { chunks: nChunks, ...nRest } = n;
    const { chunks: cChunks, chunksAll, ...cRest } = c;
    return {
      ...w,
      noad: { ...nRest, anchors: pickAnchors(nChunks, freqs, w.word) },
      cmu: {
        ...cRest,
        anchors: pickAnchors(cChunks, freqs, w.word),
        anchorsWithInflections: pickAnchors(chunksAll, freqs, w.word),
      },
    };
  });
}

module.exports = { analyse };
