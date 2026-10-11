"use strict";

// `report` step: re-judges and re-ranks from the saved raw run (so a
// different gate cut-off needs no Jev call), scores where Flash's story
// landed, and renders `report.md` ending in the go / no-go.

const { toJudgment, PASS_AT } = require("./judge");
const { rankCandidates, failedGates } = require("./rank");

// The bar, fixed before the run (SP-037 "Done when").
const BAR = { first: 0.4, top2: 0.65 };

function scoreWord(w, passAt) {
  const candidates = w.candidates.map((c) => ({ ...c, judgment: c.answers ? toJudgment(c.answers, passAt) : null }));
  const ranked = rankCandidates(candidates, { passAt });
  const flash = ranked.find((c) => c.source === "flash");
  const flashRank = ranked.indexOf(flash) + 1;
  const hardMiss = flash.hardFails.length > 0; // a hard-gate fail always counts as a miss
  return {
    word: w.word,
    candidateCount: ranked.length,
    flashRank,
    failedGates: failedGates(flash, passAt),
    first: !hardMiss && flashRank === 1,
    top2: !hardMiss && flashRank <= 2,
    ranked,
  };
}

function scoreWords(raw, passAt = PASS_AT) {
  return raw.words.map((w) => (w.unjudged ? { word: w.word, unjudged: w.unjudged } : scoreWord(w, passAt)));
}

function summarize(results) {
  const judged = results.filter((r) => !r.unjudged);
  const k = judged.length;
  const mean = (f) => (k ? judged.reduce((s, r) => s + f(r), 0) / k : 0);
  const s = {
    total: results.length,
    judged: k,
    first: judged.filter((r) => r.first).length,
    top2: judged.filter((r) => r.top2).length,
    chanceFirst: mean((r) => 1 / r.candidateCount),
    chanceTop2: mean((r) => Math.min(2, r.candidateCount) / r.candidateCount),
  };
  s.firstRate = k ? s.first / k : 0;
  s.top2Rate = k ? s.top2 / k : 0;
  s.go = k > 0 && s.firstRate >= BAR.first && s.top2Rate >= BAR.top2;
  return s;
}

const pct = (x) => `${(x * 100).toFixed(1)}%`;

function renderReport(raw, { passAt = PASS_AT } = {}) {
  const results = scoreWords(raw, passAt);
  const s = summarize(results);
  const failed = results.filter((r) => !r.unjudged && r.failedGates.length);
  const unjudged = results.filter((r) => r.unjudged);
  const lines = [
    "# SP-037 — Does Jev pick the story Flash would?",
    "",
    `Seed ${raw.seed}, ${raw.n} words sampled from \`data/mnemonics/log.jsonl\`; Jev gate cut-off p ≥ ${passAt}.`,
    `Judged: ${s.judged} of ${s.total} words. Rates are over judged words only.`,
    "",
    "## Results",
    "",
    "| | Jev's ranking | Chance |",
    "|---|---|---|",
    `| Flash's story ranks 1st | ${s.first} / ${s.judged} (${pct(s.firstRate)}) | ${pct(s.chanceFirst)} |`,
    `| Flash's story in the top 2 | ${s.top2} / ${s.judged} (${pct(s.top2Rate)}) | ${pct(s.chanceTop2)} |`,
    "",
    "Chance is 1/n (1st) and 2/n (top 2) per word, n = that word's candidate count, averaged.",
    "",
    "## Flash's story failed a gate",
    "",
    ...(failed.length ? failed.map((r) => `- ${r.word}: ${r.failedGates.join(", ")}`) : ["None."]),
    "",
    "## Unjudged words",
    "",
    ...(unjudged.length ? unjudged.map((r) => `- ${r.word}: ${r.unjudged}`) : ["None."]),
    "",
    "## Per word",
    "",
    "| Word | Candidates | Flash's rank | Flash failed | Jev's pick |",
    "|---|---|---|---|---|",
    ...results.map((r) =>
      r.unjudged
        ? `| ${r.word} | — | unjudged | — | — |`
        : `| ${r.word} | ${r.candidateCount} | ${r.flashRank} | ${r.failedGates.join(", ") || "—"} | ${r.ranked[0].source === "flash" ? "(Flash's)" : r.ranked[0].sentence} |`,
    ),
    "",
    "## Go / no-go",
    "",
    `${s.go ? "**Go**" : "**No-go**"} for auto story pick. The bar, fixed before the run: Flash's story 1st ≥ 40% of judged words and in the top 2 ≥ 65%.`,
    s.judged
      ? `Measured: 1st ${pct(s.firstRate)}, top 2 ${pct(s.top2Rate)}, over ${s.judged} judged word(s).`
      : "Measured: nothing — no word was judged, so the bar can't be met. Inconclusive: re-judge once Jev answers (`node spikes/sp-037/run.js` reuses the saved candidate sets).",
    "",
  ];
  return lines.join("\n");
}

module.exports = { renderReport, scoreWords, summarize, BAR };
