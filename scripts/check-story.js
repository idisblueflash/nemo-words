#!/usr/bin/env node
"use strict";

// US-028 step `check-story <word> <primarySense> <sentence> <pivots> <chunk-keywords-file>`
// — the hard gates a story must pass before it can be picked (after _nemo's
// "Before you return" gates and sense lock). Exit 0 with no output on pass;
// exit 1 with one reason per line on fail (e.g. `headword: conceded`).

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const fs = require("fs");
const { runCli, ipaKey, stripStress } = require("./card-lib");
const { lookupGaForms } = require("./ipa");
const { readChunkKeywords } = require("./compose-stories");
const { rimeOf } = require("./lib/rhyme");

// Irregular inflected forms (past, participle, plural, comparative ...) by base
// word — the suffix rules below can't derive these. A curated list of common
// English irregulars; a word not listed here gets only the regular forms.
const IRREGULAR = {
  be: ["am", "is", "are", "was", "were", "been", "being"],
  have: ["has", "had", "having"], do: ["does", "did", "done", "doing"],
  go: ["goes", "went", "gone", "going"], say: ["said"], make: ["made"],
  take: ["took", "taken"], come: ["came"], see: ["saw", "seen"], know: ["knew", "known"],
  get: ["got", "gotten"], give: ["gave", "given"], find: ["found"], think: ["thought"],
  tell: ["told"], become: ["became"], leave: ["left"], feel: ["felt"], bring: ["brought"],
  begin: ["began", "begun"], keep: ["kept"], hold: ["held"], write: ["wrote", "written"],
  stand: ["stood"], hear: ["heard"], mean: ["meant"], meet: ["met"],
  run: ["ran"], pay: ["paid"], sit: ["sat"], speak: ["spoke", "spoken"], lie: ["lay", "lain"],
  lead: ["led"], grow: ["grew", "grown"], lose: ["lost"], fall: ["fell", "fallen"],
  send: ["sent"], build: ["built"], understand: ["understood"], draw: ["drew", "drawn"],
  break: ["broke", "broken"], spend: ["spent"], rise: ["rose", "risen"], drive: ["drove", "driven"],
  buy: ["bought"], wear: ["wore", "worn"], choose: ["chose", "chosen"], seek: ["sought"],
  throw: ["threw", "thrown"], catch: ["caught"], deal: ["dealt"], win: ["won"], forget: ["forgot", "forgotten"],
  sell: ["sold"], fight: ["fought"], teach: ["taught"], eat: ["ate", "eaten"], sing: ["sang", "sung"],
  drink: ["drank", "drunk"], swim: ["swam", "swum"], ring: ["rang", "rung"], sink: ["sank", "sunk"],
  fly: ["flew", "flown"], hide: ["hid", "hidden"], shake: ["shook", "shaken"], steal: ["stole", "stolen"],
  sleep: ["slept"], sweep: ["swept"], wake: ["woke", "woken"], bite: ["bit", "bitten"], blow: ["blew", "blown"],
  freeze: ["froze", "frozen"], hang: ["hung"], lend: ["lent"], ride: ["rode", "ridden"],
  shine: ["shone"], shoot: ["shot"], slide: ["slid"], spin: ["spun"], stick: ["stuck"], sting: ["stung"],
  strike: ["struck", "stricken"], swing: ["swung"], tear: ["tore", "torn"], wind: ["wound"], bend: ["bent"],
  bind: ["bound"], bleed: ["bled"], breed: ["bred"], creep: ["crept"], dig: ["dug"],
  feed: ["fed"], flee: ["fled"], fling: ["flung"], forgive: ["forgave", "forgiven"], lay: ["laid"],
  light: ["lit"], sew: ["sewn"], show: ["shown"], slay: ["slew", "slain"], spit: ["spat"],
  swear: ["swore", "sworn"], weep: ["wept"],
  die: ["dying"], tie: ["tying"], vie: ["vying"],
  child: ["children"], man: ["men"], woman: ["women"], person: ["people"], foot: ["feet"],
  tooth: ["teeth"], goose: ["geese"], mouse: ["mice"], louse: ["lice"], ox: ["oxen"],
  leaf: ["leaves"], life: ["lives"], wife: ["wives"], knife: ["knives"], wolf: ["wolves"],
  half: ["halves"], self: ["selves"], shelf: ["shelves"], thief: ["thieves"], calf: ["calves"],
  loaf: ["loaves"], elf: ["elves"], hoof: ["hooves"], scarf: ["scarves"],
  good: ["better", "best"], bad: ["worse", "worst"],
};

// Every inflection of `base` (plural/3sg, past, -ing, comparative,
// superlative): the irregular table plus the regular rules, with the usual
// e-drop, y->i and final-consonant doubling.
function inflections(base) {
  const b = base.toLowerCase();
  const forms = new Set([b, `${b}s`, `${b}es`, `${b}ed`, `${b}ing`, `${b}er`, `${b}est`]);
  for (const f of IRREGULAR[b] || []) forms.add(f);
  if (b.endsWith("ie")) forms.add(`${b.slice(0, -2)}ying`); // die -> dying, lie -> lying
  if (b.endsWith("e")) {
    const stem = b.slice(0, -1);
    for (const s of ["d", "r", "st"]) forms.add(b + s);
    forms.add(`${stem}ing`);
  }
  if (/[^aeiou]y$/.test(b)) {
    const stem = b.slice(0, -1);
    for (const s of ["ies", "ied", "ier", "iest"]) forms.add(stem + s);
  }
  if (/[^aeiou][aeiou][^aeiouwxy]$/.test(b)) {
    const last = b[b.length - 1];
    for (const s of ["ed", "ing", "er", "est"]) forms.add(b + last + s);
  }
  return forms;
}

function isInflectionOf(token, base) {
  return inflections(base).has(token.toLowerCase());
}

// Lowercase word tokens, possessive 's dropped.
function tokens(sentence) {
  return (sentence.toLowerCase().match(/[a-z]+(?:'[a-z]+)*/g) || []).map((t) => t.replace(/'s$/, ""));
}

const MAX_WORDS = 10;

// Sound anchors: each anchored chunk's keyword must be in the sentence (as
// that exact word), in syllable order, and its own GA IPA must equal the
// chunk's IPA — re-verified here against the dictionary, never trusted.
function anchorReasons(toks, chunks, lookupGa) {
  const reasons = [];
  let prev = null;
  for (const c of chunks.filter((x) => x.keyword)) {
    const kw = c.keyword.toLowerCase();
    // lookupGa may give one form or several, comma-joined (`lˈæst,lˈæs`):
    // find-keywords accepts any form, so this gate does too (bug-014).
    const gaAll = lookupGa(kw);
    const forms = gaAll ? gaAll.split(",").map((v) => v.trim()).filter(Boolean) : [];
    const ga = forms[0];
    if (c.match === "rime") {
      // US-046: a rhyme anchor needs the chunk's rime, not its whole sound
      if (!forms.some((v) => rimeOf(v) === rimeOf(c.ipa))) {
        reasons.push(`anchor-ipa: ${kw} /${ga ? stripStress(ga) : "?"}/ does not rhyme with /${c.ipa}/`);
      }
    } else if (!forms.some((v) => ipaKey(v) === ipaKey(c.ipa))) {
      reasons.push(`anchor-ipa: ${kw} /${ga ? stripStress(ga) : "?"}/ is not /${c.ipa}/`);
    }
    const pos = toks.indexOf(kw);
    if (pos === -1) {
      reasons.push(`anchor-missing: ${kw}`);
      continue;
    }
    if (prev && pos < prev.pos) reasons.push(`anchor-order: ${kw} before ${prev.kw}`);
    prev = { kw, pos };
  }
  return reasons;
}

function checkStory({ word, primarySense, sentence, chunks = [], lookupGa }) {
  const reasons = [];
  const toks = tokens(sentence);
  const hit = toks.find((t) => isInflectionOf(t, word));
  if (hit) reasons.push(`headword: ${hit}`);
  const count = sentence.trim().split(/\s+/).filter(Boolean).length; // same as `wc -w`
  if (count > MAX_WORDS) reasons.push(`word-count: ${count} > ${MAX_WORDS}`);
  if (!toks.some((t) => isInflectionOf(t, primarySense))) reasons.push(`sense-missing: ${primarySense}`);
  reasons.push(...anchorReasons(toks, chunks, lookupGa));
  return reasons;
}

if (require.main === module) {
  runCli(([word, primarySense, sentence, pivots, keywordsFile]) => {
    if (!word || !primarySense || !sentence || !keywordsFile) {
      throw new Error("usage: check-story <word> <primarySense> <sentence> <pivots> <chunk-keywords-file>");
    }
    const chunks = readChunkKeywords(fs.readFileSync(keywordsFile, "utf8"));
    const reasons = checkStory({
      word,
      primarySense,
      sentence,
      pivots: (pivots || "").split(",").filter(Boolean),
      chunks,
      lookupGa: lookupGaForms,
    });
    return reasons.length ? { stop: reasons } : { lines: [] };
  });
}

module.exports = { checkStory, isInflectionOf, inflections, tokens };
