"use strict";

// SP-052: the NOAD extract (dictionaries/noad/data/noad.tsv, written by
// dictionaries/noad/extract.py) as an in-memory index.
//
// Extract rows: `word\tkind\thomograph\tipas\trespell`
//   kind     hw (headword) | der (derivative listed under a headword)
//   ipas     the entry's US IPA strings, raw, in document order, `;`-joined
//   respell  1 if the entry has a US respelling, else 0

function parseExtract(text) {
  const entries = [];
  for (const line of String(text).split("\n")) {
    if (!line.trim()) continue;
    const [word, kind, hom, ipas = "", respell = "0"] = line.split("\t");
    entries.push({ word, kind, hom, ipas: ipas ? ipas.split(";") : [], respell: respell === "1" });
  }
  return entries;
}

// A partial pronunciation (`-ˈleɪʃ(ə)n`, given for some derivatives) only
// covers the end of the word, so it isn't the word's IPA.
const isFullIpa = (ipa) => Boolean(ipa) && !/^-|-$/.test(ipa.trim());

function buildIndex(entries) {
  const byWord = new Map();
  for (const e of entries) {
    if (!byWord.has(e.word)) byWord.set(e.word, []);
    byWord.get(e.word).push(e);
  }
  return { entries, byWord };
}

// Lower-case a–z headwords with at least one full US IPA.
function headwordsWithIpa(index) {
  const out = new Set();
  for (const e of index.entries) {
    if (e.kind === "hw" && /^[a-z]+$/.test(e.word) && e.ipas.some(isFullIpa)) out.add(e.word);
  }
  return out;
}

// Canonical NOAD format (E07): a bracketed (optional) sound is kept and only
// the brackets go, except (h) before w, which is dropped with its brackets.
// A space ("pər ˈsɛnt") only separates the entry's parts, not a sound: dropped.
//   ˈɪnt(ə)rəst -> ˈɪntərəst     (h)wɪtʃ -> wɪtʃ
function canonicalNoad(raw) {
  return String(raw)
    .replace(/\s+/g, "")
    .replace(/\(h\)(?=[ˈˌ]?w)/g, "")
    .replace(/[()]/g, "");
}

// Entries for `word`: exact spelling first, else a case-insensitive match.
function entriesFor(index, word) {
  if (index.byWord.has(word)) return index.byWord.get(word);
  const lw = word.toLowerCase();
  return index.entries.filter((e) => e.word.toLowerCase() === lw);
}

// -> { hasUsIpa, rawIpa, canonicalIpa, variants: [raw…], reason }
// Headword entries first (every homograph's IPAs are variants, in order); a
// word NOAD lists only as a derivative uses the derivative's own full IPA.
function lookupNoad(index, word) {
  const entries = entriesFor(index, word);
  const fullIpas = (kind) => entries.filter((e) => e.kind === kind).flatMap((e) => e.ipas.filter(isFullIpa));
  const variants = [...new Set(fullIpas("hw").length ? fullIpas("hw") : fullIpas("der"))];
  if (variants.length) {
    return { hasUsIpa: true, rawIpa: variants[0], canonicalIpa: canonicalNoad(variants[0]), variants, reason: null };
  }
  let reason = "not in NOAD";
  if (entries.some((e) => e.ipas.length)) reason = "derivative without its own full IPA";
  else if (entries.some((e) => e.respell)) reason = "respelling but no US IPA";
  else if (entries.length && entries.every((e) => e.kind === "der")) reason = "derivative without its own IPA";
  else if (entries.length) reason = "NOAD entry has no US IPA";
  return { hasUsIpa: false, rawIpa: null, canonicalIpa: null, variants: [], reason };
}

module.exports = { parseExtract, buildIndex, headwordsWithIpa, isFullIpa, canonicalNoad, lookupNoad };
