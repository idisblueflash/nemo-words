#!/usr/bin/env node
"use strict";

// US-040 routing accuracy check: `node scripts/route-accuracy.js [report-path]`.
//
// Builds a labelled set of words and puts each one to Jev with judge-route's
// own question (judgeRoute in scripts/judge-route.js: same Noul question,
// same 0.3 / 0.7 cut-offs), then writes a Markdown report, by default
// docs/backlog/reports/US-040-route-accuracy.md.
//
// The labelled set:
//   - the US-028 QA misses (a fixed list, below);
//   - every whole-word row of the card file (anki/reading-room-terms.txt, or
//     ANKI_FILE) — a row without the `medical-word-parts` tag — as general;
//   - every `e.g. …` example word on the card file's word-part rows as
//     word-part. The word-part Fronts themselves (`fus-`) aren't words and
//     stay out.
// A word carrying both labels is left out (and listed).
//
// Jev is asked about the word plus the classifier's weak suffix matches
// (matchedParts), the state judge-route gets: its question tells Jev the
// matched parts are weak endings, so strong matches aren't passed.

const fs = require("fs");
const path = require("path");
const { cardFilePath, flatten, REPO_ROOT } = require("./card-lib");
const { judgeRoute, verdictFor, GENERAL_MAX, WORD_PART_MIN } = require("./judge-route");
const jev = require("./lib/jev");
const { classify } = require("./classify-word");

const DEFAULT_REPORT = path.join(REPO_ROOT, "docs", "backlog", "reports", "US-040-route-accuracy.md");
const CONCURRENCY = 4;
const LABELS = ["general", "word-part"];

// US-028's QA misses (see the US-040 item).
const QA_MISSES = {
  "word-part": ["ibuprofen", "ketoprofen", "naproxen", "conduct"],
  general: [
    "trial", "pathway", "period", "roster", "episode", "recurrent", "adherence",
    "substance", "premise", "trivial", "exotic", "apparently", "apprenticeship",
  ],
};

const WORD_PART_TAG = "medical-word-parts";
const TAGS_COLUMN = 6; // Front Back Image IPA Gloss Deck Tags

// A card Front as a word: lowercased, a trailing disambiguation like
// `colon (intestine)` dropped; null when what's left isn't one word.
function frontWord(front) {
  const w = front.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase();
  return /^[a-z][a-z'-]*$/.test(w) ? w : null;
}

// The example words of a word-part row's Back: `<span class="examples">e.g. a, b, c</span>`.
function exampleWords(back) {
  const m = /<span class="examples">\s*e\.g\.\s*([^<]*)<\/span>/.exec(back);
  if (!m) return [];
  return m[1].split(",").map((w) => w.trim().toLowerCase()).filter((w) => /^[a-z][a-z'-]*$/.test(w));
}

// { words: [{ word, label }] (sorted), bothLabels: [word] } from the card file's text.
function labelledSet(cardText) {
  const labels = new Map(); // word -> Set(label)
  const add = (word, label) => {
    if (!labels.has(word)) labels.set(word, new Set());
    labels.get(word).add(label);
  };
  for (const label of LABELS) for (const w of QA_MISSES[label]) add(w, label);
  for (const line of cardText.split("\n")) {
    if (!line.trim() || line.startsWith("#") || !line.includes("\t")) continue;
    const cols = line.split("\t");
    if ((cols[TAGS_COLUMN] || "").split(/\s+/).includes(WORD_PART_TAG)) {
      for (const w of exampleWords(cols[1] || "")) add(w, "word-part");
    } else {
      const w = frontWord(cols[0]);
      if (w) add(w, "general");
    }
  }
  const words = [];
  const bothLabels = [];
  for (const [word, set] of [...labels].sort(([a], [b]) => a.localeCompare(b))) {
    if (set.size > 1) bothLabels.push(word);
    else words.push({ word, label: [...set][0] });
  }
  return { words, bothLabels };
}

const weakParts = (word) => classify(word).matches.filter((m) => m.weak).map((m) => m.part);

// Judges every word, CONCURRENCY at a time; each result gets pWordPart +
// verdict (or `unjudged`: the cause), plus the classifier's own verdict.
async function judgeAll(words, opts = {}) {
  const results = new Array(words.length);
  let next = 0;
  async function worker() {
    while (next < words.length) {
      const i = next++;
      const { word, label } = words[i];
      const base = { word, label, classifier: classify(word).verdict };
      try {
        results[i] = { ...base, ...(await judgeRoute({ word, matchedParts: weakParts(word) }, opts)) };
      } catch (e) {
        if (!(e instanceof jev.JevError)) throw e;
        results[i] = { ...base, unjudged: flatten(e.message) }; // reported, never guessed
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, words.length) }, worker));
  return results;
}

const CURRENT = { generalMax: GENERAL_MAX, wordPartMin: WORD_PART_MIN };
const fmtCut = (c) => `${c.generalMax} / ${c.wordPartMin}`;

// Judged words of one label routed right / wrong / unsure under cut-offs `cut`.
function counts(judged, label, cut = CURRENT) {
  const verdicts = judged.filter((r) => r.label === label).map((r) => verdictFor(r.pWordPart, cut));
  return {
    judged: verdicts.length,
    right: verdicts.filter((v) => v === label).length,
    wrong: verdicts.filter((v) => v !== label && v !== "unsure").length,
    unsure: verdicts.filter((v) => v === "unsure").length,
  };
}

// The cut-offs rule: a wrong route costs 2, an unsure one (a stop Flash
// settles by hand) costs 1. Every pair on a 0.05 grid (lower 0.05–0.5,
// upper 0.5–0.95, lower < upper) is scored over all judged words; 0.3 / 0.7
// hold when none scores lower. Otherwise the lowest-scoring pair nearest to
// 0.3 / 0.7 (then the widest unsure band) is the one the results support.
const WRONG_COST = 2;
const UNSURE_COST = 1;

function score(judged, cut) {
  let wrong = 0;
  let unsure = 0;
  for (const label of LABELS) {
    const c = counts(judged, label, cut);
    wrong += c.wrong;
    unsure += c.unsure;
  }
  return { cut, wrong, unsure, cost: WRONG_COST * wrong + UNSURE_COST * unsure };
}

// Each label decides one cut-off: general the lower, word-part the upper.
const DECIDES = { general: "generalMax", "word-part": "wordPartMin" };
const SIDE = { generalMax: "lower", wordPartMin: "upper" };
const GRID = { generalMax: "0.05–0.5", wordPartMin: "0.5–0.95" };
const otherCut = (cut) => (cut === "generalMax" ? "wordPartMin" : "generalMax");

// `fixed` (generalMax | wordPartMin): a cut-off held at its current value
// because the label that decides it has no judged words; only the other is searched.
function cutOffs(judged, fixed) {
  const pairs = [];
  for (let lo = 5; lo <= 50; lo += 5) {
    for (let hi = 50; hi <= 95; hi += 5) {
      const cut = { generalMax: lo / 100, wordPartMin: hi / 100 };
      if (fixed) cut[fixed] = CURRENT[fixed];
      if (cut.generalMax < cut.wordPartMin) pairs.push(score(judged, cut));
    }
  }
  const current = score(judged, CURRENT);
  const lowest = Math.min(current.cost, ...pairs.map((p) => p.cost));
  const distance = (p) => Math.abs(p.cut.generalMax - GENERAL_MAX) + Math.abs(p.cut.wordPartMin - WORD_PART_MIN);
  const band = (p) => p.cut.wordPartMin - p.cut.generalMax;
  const best = pairs.filter((p) => p.cost === lowest).sort((a, b) => distance(a) - distance(b) || band(b) - band(a))[0];
  return { current, best, holds: current.cost === lowest };
}

function report({ results, bothLabels, cardFile }) {
  const judged = results.filter((r) => !r.unjudged);
  const unjudged = results.filter((r) => r.unjudged);
  const out = [];
  out.push("# US-040 route accuracy", "");
  out.push(
    `Each labelled word put to Jev with judge-route's question; routed by p word-part: ≤ ${GENERAL_MAX} general, ≥ ${WORD_PART_MIN} word-part, in between unsure. Card file: \`${cardFile}\`.`,
    ""
  );
  out.push(
    `- Labelled: ${results.length} words`,
    `- Judged: ${judged.length} words`,
    `- Unjudged: ${unjudged.length} words (Jev errored or gave no usable answer; not counted below)`,
    `- Left out (both labels): ${bothLabels.length} words`,
    ""
  );
  out.push(`## Counts (${fmtCut(CURRENT)} cut-offs)`, "");
  out.push(...countsTable(judged), "");
  for (const label of noJudged(judged)) out.push(`The ${label} label has no judged words.`, "");
  const ambiguous = judged.filter((r) => r.classifier === "ambiguous");
  out.push(
    `Of which the classifier calls ambiguous (the only words judge-route judges in the card pipeline): ${ambiguous.length}.`,
    ""
  );
  out.push(...countsTable(ambiguous), "");
  const misrouted = judged.filter((r) => r.verdict !== r.label && r.verdict !== "unsure");
  out.push("## Misrouted", "");
  out.push(...wordTable(misrouted), "");
  out.push("## Unjudged", "");
  out.push("| Word | Label | Cause |", "|---|---|---|");
  for (const r of unjudged) out.push(`| ${r.word} | ${r.label} | ${cell(r.unjudged)} |`);
  out.push("");
  out.push("## Left out (both labels)", "");
  for (const w of bothLabels) out.push(`- ${w}`);
  if (!bothLabels.length) out.push("(none)");
  out.push("");
  out.push("## Every judged word", "");
  out.push(...wordTable(judged), "");
  out.push(...cutOffsSection(judged));
  return out.join("\n");
}

function countsTable(judged) {
  const out = ["| Label | Judged | Routed right | Routed wrong | Unsure |", "|---|---|---|---|---|"];
  for (const label of LABELS) {
    const c = counts(judged, label);
    out.push(`| ${label} | ${c.judged} | ${c.right} | ${c.wrong} | ${c.unsure} |`);
  }
  return out;
}

const wordTable = (rows) => [
  "| Word | Label | p word-part | Routed | Classifier |",
  "|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.word} | ${r.label} | ${r.pWordPart} | ${r.verdict} | ${r.classifier} |`),
];

const NONE_JUDGED = "no words were judged: Jev couldn't answer for any word";

// Labels with no judged words.
const noJudged = (judged) => LABELS.filter((label) => !judged.some((r) => r.label === label));

// The report's last section: the cut-offs rule, the scores, and the conclusion
// (a report is only written with at least one judged word). When one label has
// no judged words, the cut-off it decides is held at its current value, only
// the other is searched, and the conclusion speaks only to that other one.
function cutOffsSection(judged) {
  const [missing] = noJudged(judged);
  const fixed = missing && DECIDES[missing];
  const other = fixed && otherCut(fixed);
  const { current, best, holds } = cutOffs(judged, fixed);
  const line = (p) => `| ${fmtCut(p.cut)} | ${p.wrong} | ${p.unsure} | ${p.cost} |`;
  const out = ["## Cut-offs", ""];
  const searched = fixed
    ? `the ${SIDE[fixed]} cut-off is held at ${CURRENT[fixed]} (the ${missing} label has no judged words) and every ${SIDE[other]} one on a 0.05 grid (${GRID[other]}) is scored`
    : "every lower / upper pair on a 0.05 grid (lower 0.05–0.5, upper 0.5–0.95) is scored";
  out.push(
    `Rule: over all ${judged.length} judged words, a wrong route costs ${WRONG_COST} and an unsure one ${UNSURE_COST}; ${searched}, and ${fmtCut(CURRENT)} hold when none scores lower.`,
    ""
  );
  out.push("| Cut-offs | Routed wrong | Unsure | Cost |", "|---|---|---|---|", line(current));
  if (!holds) out.push(line(best));
  out.push("");
  if (fixed) {
    const verdict = holds
      ? `the ${CURRENT[other]} ${SIDE[other]} cut-off holds: no other ${SIDE[other]} cut-off scores lower (cost ${current.cost})`
      : `the ${CURRENT[other]} ${SIDE[other]} cut-off doesn't hold; the results support ${best.cut[other]} instead (cost ${best.cost} against ${current.cost})`;
    out.push(
      `**Conclusion:** no conclusion on the ${CURRENT[fixed]} ${SIDE[fixed]} cut-off (the ${missing} label has no judged words); ${verdict}.`,
      ""
    );
    return out;
  }
  out.push(
    holds
      ? `**Conclusion:** the ${fmtCut(CURRENT)} cut-offs hold: no other cut-offs score lower (cost ${current.cost}).`
      : `**Conclusion:** the ${fmtCut(CURRENT)} cut-offs don't hold; the results support ${fmtCut(best.cut)} instead (cost ${best.cost} against ${current.cost}).`,
    ""
  );
  return out;
}

const cell = (text) => String(text).replace(/\|/g, "\\|");

// Why `reportPath` can't be written, or null when it can — checked without
// creating, opening or truncating anything (a run with nothing judged must
// leave no file behind, AC12). An existing path must be a writable file; a
// missing one needs its nearest existing ancestor to be a writable folder
// (the missing folders below it are created when the report is written).
function unwritableReason(reportPath) {
  const stat = (p) => {
    try {
      return fs.statSync(p);
    } catch (e) {
      // ENOTDIR: a file sits higher up the path; walking up reaches it.
      if (e.code === "ENOENT" || e.code === "ENOTDIR") return null;
      throw e;
    }
  };
  const writable = (p) => {
    try {
      fs.accessSync(p, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  };
  const st = stat(reportPath);
  if (st) {
    if (st.isDirectory()) return "it is a directory";
    return writable(reportPath) ? null : "it is not writable";
  }
  let dir = path.dirname(reportPath);
  let dst = stat(dir);
  while (!dst && path.dirname(dir) !== dir) {
    dir = path.dirname(dir);
    dst = stat(dir);
  }
  if (!dst || !dst.isDirectory()) return `${dir} is not a folder`;
  return writable(dir) ? null : `folder ${dir} is not writable`;
}

async function main(argv) {
  const reportPath = path.resolve(argv[0] || DEFAULT_REPORT);
  // Checked before any word is put to Jev, so a bad path costs no Jev calls.
  // A clean stop (exit 1, the step contract's convention); 2 is for crashes.
  const unwritable = unwritableReason(reportPath);
  if (unwritable) {
    process.stderr.write(`stopped: report path can't be written: ${reportPath} (${unwritable}); no word was put to Jev\n`);
    process.exitCode = 1;
    return;
  }
  const cardFile = cardFilePath();
  const { words, bothLabels } = labelledSet(fs.readFileSync(cardFile, "utf8"));
  const results = await judgeAll(words);
  const judged = results.filter((r) => !r.unjudged);
  // With nothing judged there's nothing to report: no file is written, so a
  // saved report (the default path's real-Jev run) is never overwritten.
  if (judged.length) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report({ results, bothLabels, cardFile: path.relative(REPO_ROOT, cardFile) }));
    process.stdout.write(`wrote ${reportPath}\n`);
  }
  process.stdout.write(`unjudged: ${results.length - judged.length}\n`);
  for (const label of LABELS) {
    const c = counts(judged, label);
    process.stdout.write(`${label}: ${c.judged} judged, ${c.right} right, ${c.wrong} wrong, ${c.unsure} unsure\n`);
  }
  if (!judged.length) {
    // A clean stop (exit 1, the step contract's convention); 2 is for crashes.
    process.stderr.write(`stopped: ${NONE_JUDGED}; no conclusion on the ${fmtCut(CURRENT)} cut-offs; no report written\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((e) => {
    process.stderr.write(`error: ${e.message}\n`);
    process.exitCode = 2;
  });
}

module.exports = { unwritableReason, labelledSet, frontWord, exampleWords, counts, QA_MISSES };
