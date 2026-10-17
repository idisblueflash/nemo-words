"use strict";

// SP-066's word split (C-041, ADR-0034) and what it needs from SP-064's saved run.
//
//   sp064Outcomes: each word's SP-064 result, redone from SP-064's saved
//     scores with the weights SP-064's own search found on its tuning words
//     (the result SP-064's report gives): hit (main cell = Flash's cell), in
//     three, gate skipped, and vivid alone (the scored cell with the highest
//     vivid score; ties: lower cell).
//   drawSplit: a fixed seed draws the tuning set, stratified so its share of
//     SP-064 hits is the whole set's (round(size · hits / words): 4 of 20 for
//     18 hits of 82); the other words are the measure set, in grid order.

const sp064Report = require("../../sp-064/lib/report");

const SEED = 66;
const TUNING_SIZE = 20;

// A small seeded generator (mulberry32): the same seed gives the same draws.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, next) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// The scored cell with the highest vivid score (ties: lower cell).
function vividAlone(scores) {
  const cells = Object.keys(scores).map(Number).sort((a, b) => a - b);
  return cells.reduce((best, c) => (scores[c].vivid.score > scores[best].vivid.score ? c : best), cells[0]);
}

// SP-064's run → word → { judged, hit, inThree?, gateSkipped?, vividAlone?, mainCell? }
function sp064Outcomes(run) {
  const judged = run.words.filter((w) => !w.unjudged && w.pick);
  const weights = sp064Report.tuneWeights(judged.filter((w) => w.tuning));
  const out = {};
  for (const w of run.words) {
    if (w.unjudged || !w.pick) {
      out[w.word] = { judged: false, hit: false };
      continue;
    }
    const r = sp064Report.repick(w, weights);
    out[w.word] = { hit: r.exact, inThree: r.inThree, gateSkipped: !!w.pick.gateSkipped, vividAlone: vividAlone(w.pick.scores), mainCell: r.mainCell, judged: true };
  }
  return out;
}

// words: in grid order; hits: Set of SP-064 hits → { seed, size, tuning (draw order), measure (grid order), tuningHits }
function drawSplit(words, hits, { seed = SEED, size = TUNING_SIZE } = {}) {
  const n = Math.min(size, words.length);
  const next = rng(seed);
  const hitWords = words.filter((w) => hits.has(w));
  const missWords = words.filter((w) => !hits.has(w));
  const nHits = Math.min(hitWords.length, Math.round((n * hitWords.length) / (words.length || 1)), n);
  const nMisses = Math.min(missWords.length, n - nHits);
  const chosen = [...shuffle(hitWords, next).slice(0, nHits), ...shuffle(missWords, next).slice(0, nMisses)];
  const tuning = shuffle(chosen, next);
  const inTuning = new Set(tuning);
  return { seed, size: n, tuning, measure: words.filter((w) => !inTuning.has(w)), tuningHits: nHits };
}

// A name anchor: the must-see list gives a name sign (ADR-0035, C-043).
const hasNameAnchor = (list) => !!list && Array.isArray(list.nameSigns) && list.nameSigns.length > 0;

// A main subject: the must-see list names one, { name, actor } (ADR-0037, ADR-0038, C-045); an actor counts.
const hasMainSubject = (list) => !!list && !!list.mainSubject && typeof list.mainSubject.name === "string" && list.mainSubject.name !== "";

// The early picks the Staged run asks for, in this order; one word can meet several.
const EARLY = [
  { role: "SP-064 hit", meets: (w, x) => !!(x.sp064[w.word] && x.sp064[w.word].hit) },
  { role: "name anchor", meets: (w, x) => !!x.lists[w.word] && hasNameAnchor(x.lists[w.word]) },
  { role: "angleCase view or one-object", meets: (w, x) => !!x.lists[w.word] && ["view", "one-object"].includes(x.lists[w.word].angleCase) },
  { role: "gate skipped in SP-064", meets: (w, x) => !!(x.sp064[w.word] && x.sp064[w.word].gateSkipped) },
  { role: "main subject", meets: (w, x) => hasMainSubject(x.lists[w.word]) },
];

// tuning: [{ word, story }] in draw order; sp064: sp064Outcomes; lists: word → list
// → { order: [word], early: [{ word, roles }], missing: [role] }. The early
// picks come first (for each role still unmet, the first word in draw order
// that meets it), then the other tuning words in draw order.
function tuningOrder(tuning, { sp064 = {}, lists = {} } = {}) {
  const x = { sp064, lists };
  const picked = [];
  const missing = [];
  for (const e of EARLY) {
    if (picked.some((w) => e.meets(w, x))) continue;
    const w = tuning.find((t) => !picked.includes(t) && e.meets(t, x));
    if (w) picked.push(w);
    else missing.push(e.role);
  }
  const early = picked.map((w) => ({ word: w.word, roles: EARLY.filter((e) => e.meets(w, x)).map((e) => e.role) }));
  return { order: [...picked, ...tuning.filter((t) => !picked.includes(t))].map((w) => w.word), early, missing };
}

module.exports = { SEED, TUNING_SIZE, rng, drawSplit, sp064Outcomes, vividAlone, hasNameAnchor, hasMainSubject, tuningOrder, EARLY };
