"use strict";

// The headword must not reach a blind call (scenarios 2 and 3). A must-see list
// can hold it, in an item name ("breathing machine (ventilator)", "surgeon")
// or in an adjective ("worn"). This finds the word and its forms in a text and
// hides it. A list that doesn't hold the word is left byte-identical, so the
// prompts (and their cache keys) of the other words don't change (bug-016).

const PLACEHOLDER = "key item";

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The word and its regular forms: plural, -ed, -ing, -ly, a dropped final e,
// y → i, a doubled final consonant.
function headwordSource(word) {
  const w = word.toLowerCase();
  const stems = new Set([w]);
  if (w.endsWith("e")) stems.add(w.slice(0, -1));
  if (w.endsWith("y")) stems.add(w.slice(0, -1) + "i");
  if (/[^aeiou][aeiou][^aeiouwxy]$/.test(w)) stems.add(w + w.slice(-1));
  return `\\b(?:${[...stems].map(escape).join("|")})(?:s|es|ed|d|ing|ly|er|ers)?\\b`;
}

const headwordRe = (word, flags = "gi") => new RegExp(headwordSource(word), flags);
const mentions = (word, text) => headwordRe(word, "i").test(text);

// An item name with the word hidden: a bracket that holds only the word is
// dropped ("breathing machine (ventilator)" → "breathing machine"); otherwise
// the word becomes a placeholder ("matching pajamas" → "matching key item").
function maskName(word, name) {
  if (!mentions(word, name)) return name;
  const dropped = name.replace(new RegExp(`\\s*[(\\[]\\s*${headwordSource(word)}\\s*[)\\]]`, "gi"), "").trim();
  if (dropped && !mentions(word, dropped)) return dropped;
  return name.replace(headwordRe(word), PLACEHOLDER);
}

module.exports = { headwordRe, mentions, maskName, PLACEHOLDER };
