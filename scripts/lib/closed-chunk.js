"use strict";

// US-050 / ADR-0025: the closed chunk (C-026) rules for find-keywords (pure,
// no I/O). `syllabify` gives a consonant between two vowels to the later
// syllable, so a stressed short vowel ends its chunk (penalty: ˈpɛ.nəl.ti).
// The closed chunk is that stressed chunk plus the first consonant sound of
// the next chunk (/pɛn/, exactly "pen"). The next chunk keeps the consonant
// too, so no other chunk changes.

const { stripStress } = require("../card-lib");
const { segments } = require("../syllabify");
const { FUNCTION_WORDS } = require("./rhyme");
const { isInflectionOf } = require("../check-story");

// The short vowels that close. /ɑ/ and /ɔ/ are not in the set (ADR-0025).
const SHORT_VOWELS = new Set(["ɪ", "ɛ", "æ", "ʌ", "ʊ"]);

// The closed chunk's IPA for a syllable string (`ˈpɛ.nəl.ti`), or null when
// the rule does not apply. It applies to the chunk with the primary stress
// (`ˈ`) of a word with 2 or more chunks, when that chunk ends in a short vowel
// and the next chunk starts with a consonant. /tʃ/ and /dʒ/ are one sound.
// -> { index, ipa } | null
function closedChunk(syllableString) {
  const parts = String(syllableString || "").split(".").filter(Boolean);
  const index = parts.findIndex((p) => p.includes("ˈ"));
  if (index === -1 || index + 1 >= parts.length) return null;
  const open = segments(stripStress(parts[index]));
  const last = open[open.length - 1];
  if (!last || !SHORT_VOWELS.has(last.seg)) return null;
  const next = segments(stripStress(parts[index + 1]))[0];
  if (!next || next.vowel) return null;
  return { index, ipa: open.map((x) => x.seg).join("") + next.seg };
}

// A closed keyword has 3 or more letters and is not a function word: the
// shorter words and the function words (al, eh, does) are no better than the
// rhyme they would replace. It is also not a word that the headword is an
// inflection of (sweating: "sweat"), which would give the headword away.
const MIN_LETTERS = 3;
function canBeClosedKeyword(candidate, headword) {
  if (candidate.length < MIN_LETTERS || FUNCTION_WORDS.has(candidate)) return false;
  return !(headword && isInflectionOf(headword, candidate));
}

module.exports = { closedChunk, canBeClosedKeyword, SHORT_VOWELS };
