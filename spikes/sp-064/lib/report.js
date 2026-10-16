"use strict";

// Stage 5: tunes the weights on the 20 blind-check words, re-picks every word
// from its saved scores with those weights, and renders the report for the
// other 62 words: the rates next to SP-029, chance and the cell-1 rule, the
// rates per band of each certainty signal, the better signal, each signal's
// cut-off, the ties, main-or-alternative, the words whose cell the gate
// removed, the share of partly cut cells, and the go / no-go. Always derived from the
// saved run.json, so it can be rebuilt without calling Claude or Jev.

const { AXES, START_WEIGHTS, choose } = require("./pick");

// The bar, fixed before the run (ADR-0031, SP-029's bar kept).
const BAR = { exact: 0.45, inThree: 0.7 };
const CHANCE = { exact: "11%", inThree: "33%" };
// The always-cell-1 rule: cell 1 is its pick; its "3 highest" are cells 1, 2, 3.
const CELL1_TOP3 = [1, 2, 3];
const WEIGHT_STEPS = [0, 1, 2, 3];
const AXIS_LABEL = { plausible: "plausible", vivid: "vivid", clarity: "must-see clarity" };

// The pick of one judged word with `weights`, from its saved scores.
function repick(w, weights) {
  const p = w.pick;
  const caps = Object.fromEntries(p.scored.map((c) => [c, { shot: p.shots[c], step: p.steps[c] }]));
  const c = choose(p.scores, weights, caps, p.isSequence);
  return {
    ...w,
    ...c,
    gateSkipped: p.gateSkipped,
    gateRemovedFlashCell: !p.gateSkipped && p.gatedOut.includes(w.flashCell),
    exact: c.mainCell === w.flashCell,
    inThree: c.ranking.slice(0, 3).includes(w.flashCell),
    isAlternative: c.alternativeCell === w.flashCell,
  };
}

const count = (rs, f) => rs.filter(f).length;

// Lexicographic: is key `a` strictly better (larger) than key `b`?
function beats(a, b) {
  const i = a.findIndex((x, j) => x !== b[j]);
  return i >= 0 && a[i] > b[i];
}

// Every weight triple with steps 0–3 (not all 0); the best on the tuning
// words wins: most exact, then most in three, then nearest to the start
// guess 2, 1, 1 (L1), then the first in this fixed order.
function tuneWeights(tuning) {
  if (!tuning.length) return { ...START_WEIGHTS };
  let best = null;
  for (const plausible of WEIGHT_STEPS) {
    for (const vivid of WEIGHT_STEPS) {
      for (const clarity of WEIGHT_STEPS) {
        if (!plausible && !vivid && !clarity) continue;
        const weights = { plausible, vivid, clarity };
        const rs = tuning.map((w) => repick(w, weights));
        const key = [count(rs, (r) => r.exact), count(rs, (r) => r.inThree), -AXES.reduce((d, a) => d + Math.abs(weights[a] - START_WEIGHTS[a]), 0)];
        if (!best || beats(key, best.key)) best = { weights, key };
      }
    }
  }
  return best.weights;
}

// Thirds of `rs` by `value` (ascending; null = +∞, so a lone scored cell's
// margin is in the high band).
function bands(rs, value) {
  const v = (r) => (value(r) === null ? Infinity : value(r));
  const sorted = [...rs].sort((a, b) => v(a) - v(b));
  const n = sorted.length;
  const lo = Math.round(n / 3);
  const hi = Math.round((2 * n) / 3);
  return { low: sorted.slice(0, lo), middle: sorted.slice(lo, hi), high: sorted.slice(hi), v };
}

const rate = (rs, key) => (rs.length ? count(rs, (r) => r[key]) / rs.length : 0);

function signalSummary(name, rs, value) {
  const b = bands(rs, value);
  const gap = rate(b.high, "exact") - rate(b.low, "exact");
  const cutoff = b.low.length ? b.v(b.low[b.low.length - 1]) : null;
  const atOrBelow = cutoff === null ? [] : rs.filter((r) => b.v(r) <= cutoff);
  return { name, bands: b, gap, cutoff, atOrBelow };
}

function summarize(run, { sp029 } = {}) {
  const judged = run.words.filter((w) => !w.unjudged);
  const tuningAll = run.words.filter((w) => w.tuning);
  const measureAll = run.words.filter((w) => !w.tuning);
  const weights = tuneWeights(judged.filter((w) => w.tuning));
  const tuning = judged.filter((w) => w.tuning).map((w) => repick(w, weights));
  const measured = judged.filter((w) => !w.tuning).map((w) => repick(w, weights));
  const k = measured.length;
  const s = {
    weights,
    tuningAll,
    measureAll,
    tuning,
    measured,
    k,
    exact: count(measured, (r) => r.exact),
    inThree: count(measured, (r) => r.inThree),
    cell1Exact: count(measured, (r) => r.flashCell === 1),
    cell1InThree: count(measured, (r) => CELL1_TOP3.includes(r.flashCell)),
    ties: count(measured, (r) => r.tie),
    tuningTies: count(tuning, (r) => r.tie),
    main: count(measured, (r) => r.exact),
    alternative: count(measured, (r) => r.isAlternative),
    gateSkipped: [...tuning, ...measured].filter((r) => r.gateSkipped),
    gateRemoved: { measured: measured.filter((r) => r.gateRemovedFlashCell), tuning: tuning.filter((r) => r.gateRemovedFlashCell) },
    partlyCutCells: measured.reduce((n, r) => n + r.pick.partlyCut.length, 0),
    unjudged: run.words.filter((w) => w.unjudged),
    margin: signalSummary("margin", measured, (r) => r.margin),
    confidence: signalSummary("weakest confidence", measured, (r) => r.weakestConfidence),
  };
  s.exactRate = k ? s.exact / k : 0;
  s.inThreeRate = k ? s.inThree / k : 0;
  s.better = s.confidence.gap > s.margin.gap ? s.confidence : s.margin;
  s.go = k > 0 && s.exactRate >= BAR.exact && s.inThreeRate >= BAR.inThree;
  if (sp029) s.sp029 = sp029Rates(sp029, new Set(measured.map((r) => r.word)));
  return s;
}

// SP-029's own exact / in-three, over the same measured words and over all its judged words.
function sp029Rates(sp029Run, words) {
  const judged = sp029Run.words.filter((w) => !w.unjudged && w.judgment);
  const score = (w) => ({ exact: w.judgment.final.pick === w.flashCell, inThree: w.judgment.rows.map((r) => r.pick).includes(w.flashCell) });
  const tally = (ws) => {
    const rs = ws.map(score);
    return { k: rs.length, exact: count(rs, (r) => r.exact), inThree: count(rs, (r) => r.inThree) };
  };
  return { same: tally(judged.filter((w) => words.has(w.word))), all: tally(judged) };
}

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const frac = (n, k) => `${n} / ${k} (${pct(k ? n / k : 0)})`;
const of = (n, k) => `${n} of ${k} (${pct(k ? n / k : 0)})`;
const num = (x) => (x === Infinity ? "∞ (one scored cell)" : String(Math.round(x * 1000) / 1000));
const points = (x) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(1)} points`;
const weightsText = (w) => AXES.map((a) => `${w[a]} × ${AXIS_LABEL[a]}`).join(" + ");

function cutoffLine(label, sig, k) {
  if (sig.cutoff === null) return `- ${label} cut-off: none (no measured words)`;
  const n = sig.atOrBelow.length;
  return `- ${label} cut-off: ≤ ${num(sig.cutoff)}: ${n} of ${k} words (${pct(k ? n / k : 0)}) at or below it`;
}

function bandTable(sig) {
  const row = (label, rs) => {
    const range = rs.length ? `${num(sig.bands.v(rs[0]))} – ${num(sig.bands.v(rs[rs.length - 1]))}` : "—";
    return `| ${label} | ${rs.length} | ${range} | ${frac(count(rs, (r) => r.exact), rs.length)} | ${frac(count(rs, (r) => r.inThree), rs.length)} |`;
  };
  return [
    "| Band | Words | Range | Exact | In three |",
    "|---|---|---|---|---|",
    row("High", sig.bands.high),
    row("Middle", sig.bands.middle),
    row("Low", sig.bands.low),
  ];
}

function renderReport(run, opts = {}) {
  const s = summarize(run, opts);
  const sp = s.sp029;
  const better = s.better;
  const lines = [
    "# SP-064 — Does Jev agree with Flash's image pick once it checks the must-see objects and the shot?",
    "",
    `Run ${run.date}. Per word: a must-see list (Claude, text only), a caption per cell and one difference line per cell (Claude, blind to the word, the story and Flash's cell), a gate on hidden must-see items, then one Jev request scoring each remaining cell on plausible, vivid and must-see clarity (\`image-rubric.json\`). Code adds the weighted scores; the highest total is the main cell (ties: higher plausible, then lower cell).`,
    `Tuned on ${s.tuningAll.length} blind-check words (${s.tuning.length} judged); measured on ${s.measureAll.length} other words (${s.k} judged). Rates are over the judged words only.`,
    "",
    "## Results (measured words)",
    "",
    "| | SP-064 | SP-029 (same words) | Chance | Always cell 1 |",
    "|---|---|---|---|---|",
    `| Exact (the main cell is Flash's cell) | ${frac(s.exact, s.k)} | ${sp ? frac(sp.same.exact, sp.same.k) : "n/a"} | ${CHANCE.exact} | ${frac(s.cell1Exact, s.k)} |`,
    `| In three (Flash's cell is among the 3 highest totals) | ${frac(s.inThree, s.k)} | ${sp ? frac(sp.same.inThree, sp.same.k) : "n/a"} | ${CHANCE.inThree} | ${frac(s.cell1InThree, s.k)} |`,
    "",
    sp
      ? `SP-029 over all its judged words: exact ${frac(sp.all.exact, sp.all.k)}, in three ${frac(sp.all.inThree, sp.all.k)}. SP-029's "in three" is Flash's cell among its three row picks.`
      : "SP-029's run.json wasn't found, so its column is n/a.",
    "Chance is 1/9 (exact) and 3/9 (in three). The always-cell-1 rule picks cell 1, and its 3 highest are cells 1, 2 and 3. With fewer than 3 scored cells, in three is over the scored cells only.",
    "",
    "## Weights",
    "",
    `Weights (tuned on the ${s.tuningAll.length} blind-check words): ${weightsText(s.weights)}. Start guess: ${weightsText(START_WEIGHTS)}. Searched: each weight 0–3; most exact, then most in three, then nearest the start guess.`,
    `Tuning: exact ${frac(count(s.tuning, (r) => r.exact), s.tuning.length)}, in three ${frac(count(s.tuning, (r) => r.inThree), s.tuning.length)}.`,
    "",
    "## Ties",
    "",
    "A tie on the total goes to the higher plausible score, then to the lower cell (SP-029's lower-cell tie-break favoured cell 1).",
    "",
    `- Picks decided by a tie: ${s.ties} of ${s.k} (tuning words: ${s.tuningTies} of ${s.tuning.length})`,
    `- Exact matches whose pick was a tie: ${count(s.measured, (r) => r.exact && r.tie)} of ${s.exact}`,
    "",
    "## Main or alternative cell",
    "",
    `- Flash's cell is the main cell: ${of(s.main, s.k)}`,
    `- Flash's cell is the alternative cell: ${of(s.alternative, s.k)}`,
    `- Main or alternative: ${of(s.main + s.alternative, s.k)}`,
    "",
    "## Certainty signals",
    "",
    "Bands are thirds of the measured words, per signal.",
    "",
    "### Margin",
    "",
    "The best total minus the second-best (C-036).",
    "",
    ...bandTable(s.margin),
    "",
    "### Weakest confidence",
    "",
    "The lowest of the main cell's three Jev confidences (C-037).",
    "",
    ...bandTable(s.confidence),
    "",
    `Better signal: **${better.name}** (exact rate high band − low band: margin ${points(s.margin.gap)}, weakest confidence ${points(s.confidence.gap)}).`,
    "",
    "Each cut-off is the top edge of that signal's low band, over the measured words:",
    "",
    cutoffLine("Margin", s.margin, s.k),
    cutoffLine("Weakest-confidence", s.confidence, s.k),
    "",
    `### Words at or below the ${better.name} cut-off (${better.atOrBelow.length}), for Flash to check`,
    "",
    ...(better.atOrBelow.length
      ? better.atOrBelow.map((r) => `- ${r.word} (Flash's cell ${r.flashCell}, main ${r.mainCell}, alternative ${r.alternativeCell ?? "—"}, ${better.name} ${num(better.name === "margin" ? (r.margin ?? Infinity) : r.weakestConfidence)})`)
      : ["None."]),
    "",
    `## Words where the gate removed Flash's cell (${s.gateRemoved.measured.length} of ${s.k} measured, ${s.gateRemoved.tuning.length} of ${s.tuning.length} tuning)`,
    "",
    "The gate (ADR-0032) put Flash's cell out because its caption marked a must-see item hidden.",
    "",
    ...(s.gateRemoved.measured.length + s.gateRemoved.tuning.length
      ? [...s.gateRemoved.measured, ...s.gateRemoved.tuning].map((r) => `- ${r.word}${r.tuning ? " (tuning)" : ""} (Flash's cell ${r.flashCell}, gated out ${r.pick.gatedOut.join(", ")})`)
      : ["None."]),
    "",
    "## Partly cut must-see items",
    "",
    `Cells with a partly cut must-see item: ${of(s.partlyCutCells, 9 * s.k)}, over all 9 cells of the ${s.k} judged measured words. A partly cut item doesn't put a cell out; it gets the lowest must-see clarity.`,
    "",
    `## Words where every cell hid a must-see item (${s.gateSkipped.length})`,
    "",
    "All 9 cells were scored without the gate.",
    "",
    ...(s.gateSkipped.length ? s.gateSkipped.map((r) => `- ${r.word}${r.tuning ? " (tuning)" : ""}`) : ["None."]),
    "",
    "## Per word (measured)",
    "",
    "| Word | Flash's cell | Main | Alternative | 3 highest | Gated out | Margin | Weakest confidence | Exact | In three |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...s.measureAll.map((w) => {
      if (w.unjudged) return `| ${w.word} | ${w.flashCell} | unjudged | — | — | — | — | — | — | — |`;
      const r = s.measured.find((m) => m.word === w.word);
      const gated = r.gateSkipped ? "all (gate skipped)" : w.pick.gatedOut.join(", ") || "—";
      return `| ${r.word} | ${r.flashCell} | ${r.mainCell}${r.tie ? " (tie)" : ""} | ${r.alternativeCell ?? "—"} | ${r.ranking.slice(0, 3).join(", ")} | ${gated} | ${num(r.margin ?? Infinity)} | ${num(r.weakestConfidence)} | ${r.exact ? "yes" : "no"} | ${r.inThree ? "yes" : "no"} |`;
    }),
    "",
    `## Unjudged words (${s.unjudged.length})`,
    "",
    ...(s.unjudged.length ? s.unjudged.map((w) => `- ${w.word}${w.tuning ? " (tuning)" : ""}: ${w.unjudged}`) : ["None."]),
    "",
    "## Go / no-go",
    "",
    `${s.go ? "**Go**" : "**No-go**"} for the must-see image pick. The bar, fixed before the run (ADR-0031): exact ≥ 45% and in-three ≥ 70%, on the measured words.`,
    s.k
      ? `Measured: exact ${pct(s.exactRate)}, in three ${pct(s.inThreeRate)}, over ${s.k} judged word(s).`
      : "Measured: nothing — no measured word was judged, so the bar can't be met. Inconclusive: re-run once Claude and Jev answer (Claude's answers are cached).",
    "",
  ];
  return lines.join("\n");
}

module.exports = { renderReport, summarize, tuneWeights, bands, repick, BAR };
