"use strict";

// Stage 4: scores each judged word against Flash's cell and renders the
// report, which ends with the go / no-go. Always derived from the saved raw
// run (run.json), so it can be rebuilt without calling anything.

// The bar, fixed before the run (SP-029 "Done when", ADR-0027).
const BAR = { exact: 0.45, inThree: 0.7 };
const CHANCE = { exact: "11%", inThree: "33%" };
// The always-cell-1 rule; its "three row picks" are the first cell of each row.
const CELL1_ROWS = [1, 4, 7];

function scoreWord(w) {
  if (w.unjudged) return { ...w };
  const rowPicks = w.judgment.rows.map((r) => r.pick);
  const finalCell = w.judgment.final.pick;
  return {
    ...w,
    rowPicks,
    finalCell,
    exact: finalCell === w.flashCell,
    inThree: rowPicks.includes(w.flashCell),
    rowTies: w.judgment.rows.filter((r) => r.tie).length,
    finalTie: w.judgment.final.tie,
  };
}

function summarize(run) {
  const results = run.words.map(scoreWord);
  const judged = results.filter((r) => !r.unjudged);
  const k = judged.length;
  const count = (f) => judged.filter(f).length;
  const s = {
    results,
    judged,
    total: results.length,
    k,
    exact: count((r) => r.exact),
    inThree: count((r) => r.inThree),
    cell1Exact: count((r) => r.flashCell === 1),
    cell1InThree: count((r) => CELL1_ROWS.includes(r.flashCell)),
    rowTies: judged.reduce((n, r) => n + r.rowTies, 0),
    finalTies: count((r) => r.finalTie),
    exactByTie: count((r) => r.exact && r.finalTie),
  };
  s.exactRate = k ? s.exact / k : 0;
  s.inThreeRate = k ? s.inThree / k : 0;
  s.go = k > 0 && s.exactRate >= BAR.exact && s.inThreeRate >= BAR.inThree;
  return s;
}

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const frac = (n, k) => `${n} / ${k} (${pct(k ? n / k : 0)})`;
const cellHistogram = (rs, key) => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => `${c}→${rs.filter((r) => r[key] === c).length}`).join(", ");

function renderReport(run, { blind } = {}) {
  const s = summarize(run);
  const lines = [
    "# SP-029 — Does an auto image pick agree with Flash's picks?",
    "",
    `Run ${run.date}. Flash's cell is found again by a pixel match between each grid and its final crop.`,
    "Each cell is captioned alone by `claude -p`; Jev then picks one cell per grid row and the best of those three (`judge-image`).",
    `Judged: ${s.k} of ${s.total} kept words${s.total - s.k ? ` (${s.total - s.k} unjudged, listed below)` : ""}. Rates are over the judged words only.`,
    "",
    "## Results",
    "",
    "| | Jev | Chance | Always cell 1 |",
    "|---|---|---|---|",
    `| Exact (Jev's final cell = Flash's cell) | ${frac(s.exact, s.k)} | ${CHANCE.exact} | ${frac(s.cell1Exact, s.k)} |`,
    `| In three (Flash's cell is one of Jev's row picks) | ${frac(s.inThree, s.k)} | ${CHANCE.inThree} | ${frac(s.cell1InThree, s.k)} |`,
    "",
    "Chance is 1/9 (exact) and 3/9 (in three). The always-cell-1 rule's \"row picks\" are cells 1, 4 and 7, the first cell of each row.",
    "",
    "## Ties",
    "",
    "A pick is the highest p; a tie goes to the lower cell number, which leans toward cell 1.",
    "",
    `- Row picks decided by a tie: ${s.rowTies} of ${s.k * 3}`,
    `- Final picks decided by a tie: ${s.finalTies} of ${s.k}`,
    `- Exact matches whose final pick was a tie: ${s.exactByTie} of ${s.exact}`,
    "",
    "## Cells",
    "",
    `- Flash's cell: ${cellHistogram(s.judged, "flashCell")}`,
    `- Jev's cell: ${cellHistogram(s.judged, "finalCell")}`,
    "",
    "## Per word",
    "",
    "| Word | Grid | Flash's cell | Jev's row picks | Jev's cell | Exact | In three |",
    "|---|---|---|---|---|---|---|",
    ...s.results.map((r) =>
      r.unjudged
        ? `| ${r.word} | ${r.grid} | ${r.flashCell} | unjudged | — | — | — |`
        : `| ${r.word} | ${r.grid} | ${r.flashCell} | ${r.rowPicks.join(", ")}${r.rowTies ? " (tie)" : ""} | ${r.finalCell}${r.finalTie ? " (tie)" : ""} | ${r.exact ? "yes" : "no"} | ${r.inThree ? "yes" : "no"} |`,
    ),
    "",
    "## Unjudged words",
    "",
    ...(s.total - s.k ? s.results.filter((r) => r.unjudged).map((r) => `- ${r.word}: ${r.unjudged}`) : ["None."]),
    "",
    `## Grids left out (${run.leftOut.length})`,
    "",
    ...(run.leftOut.length ? run.leftOut.map((g) => `- ${g.grid}: ${g.reason}`) : ["None."]),
    "",
  ];
  if (blind) lines.push(...blind, "");
  lines.push(
    "## Go / no-go",
    "",
    `${s.go ? "**Go**" : "**No-go**"} for auto image pick. The bar, fixed before the run (ADR-0027): exact ≥ 45% and in-three ≥ 70%.`,
    s.k
      ? `Measured: exact ${pct(s.exactRate)}, in three ${pct(s.inThreeRate)}, over ${s.k} judged word(s).`
      : "Measured: nothing — no word was judged, so the bar can't be met. Inconclusive: re-run once Jev answers (captions are cached).",
    "",
  );
  return lines.join("\n");
}

module.exports = { renderReport, summarize, scoreWord, BAR };
