// US-050 fixtures: words whose stressed chunk (C-005) ends in a short vowel,
// so its closed chunk (C-026) is tried before the open chunk's exact keyword
// and before a rhyme anchor (C-011).
//
// This file sits under test/ so `node --test` loads it as a (test-less) file;
// it only defines functions, so that's harmless.

const { createHarness } = require("./card-harness");

const claudeFor = (primarySense, sentence, pivots) => ({
  define: JSON.stringify({ primarySense, definition: `${primarySense}, in plain words`, senses: [primarySense] }),
  gloss: `a ${primarySense}`,
  "compose-stories": JSON.stringify([{ sentence, pivots }]),
});

// penalty (ˈpɛ.nəl.ti): the stressed chunk /pɛ/ has no exact word and rhymes
// with "ye"; its closed chunk /pɛn/ is exactly "pen". /ti/ is "tea".
function penaltyFixture() {
  return {
    dict: { penalty: "pˈɛnəlti", pen: "pˈɛn", ye: "jˈɛ", tea: "tˈi" },
    freqs: { penalty: 2e-5, pen: 2e-5, ye: 9e-6, tea: 4e-5 },
    claude: claudeFor("punishment", "A pen and no tea was his punishment.", ["pen", "tea", "punishment"]),
  };
}

// A fixture for a find-keywords-only test: no model answers needed.
const soundFixture = (dict, freqs) => ({ dict, freqs, claude: {} });

// elastic (ɪ.ˈlæ.stɪk): the closed chunk /læs/ is "last" (CMU's second GA
// form, lˈæs); the next chunk /stɪk/ is "stick" and keeps its /s/. "tick" is
// what /stɪk/ would get if it lost the /s/ (ADR-0025's rejected option).
function elasticFixture() {
  return soundFixture(
    { elastic: "ɪlˈæstɪk", last: "lˈæst,lˈæs", stick: "stˈɪk", tick: "tˈɪk", yeah: "jˈæ" },
    { elastic: 6e-6, last: 4e-4, stick: 3e-5, tick: 4e-5, yeah: 3e-5 }
  );
}

// era (ˈɛ.ɹə): the open chunk /ɛ/ is exactly "eh"; the closed chunk /ɛɹ/ is "air".
function eraFixture() {
  return soundFixture({ era: "ˈɛɹə", eh: "ˈɛ", air: "ˈɛɹ", ye: "jˈɛ" }, { era: 5e-5, eh: 4e-6, air: 2e-4, ye: 9e-6 });
}

// Runs the find-keywords step CLI on a fixture: -> { code, stdout, stderr }.
async function findKeywordsOn(fixture, syllables, headword) {
  const h = await createHarness(fixture);
  try {
    return await h.runScript("find-keywords.js", [syllables, headword]);
  } finally {
    await h.cleanup();
  }
}

module.exports = { penaltyFixture, elasticFixture, eraFixture, soundFixture, findKeywordsOn, claudeFor };
