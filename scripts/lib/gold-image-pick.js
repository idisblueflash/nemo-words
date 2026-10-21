// Pure helpers for the image-pick gold set (data/gold/image-pick/): checking one
// label, and summing up the labels against the grid list.
'use strict';

const MARKS = ['best', 'ok', 'weak', 'wrong'];
const CELLS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Returns a list of problems; an empty list means the label is complete.
function labelProblems(label) {
  if (!label) return ['not labeled'];
  const problems = [];
  const cells = label.cells || {};
  for (const [cell, mark] of Object.entries(cells)) {
    if (!CELLS.includes(Number(cell))) problems.push(`cell ${cell} is not 1–9`);
    if (!MARKS.includes(mark)) problems.push(`cell ${cell} has an unknown mark "${mark}"`);
  }
  const empty = CELLS.filter((c) => !cells[c]);
  if (empty.length) problems.push(`no mark on cell${empty.length > 1 ? 's' : ''} ${empty.join(', ')}`);
  const best = cellsWith(label, 'best');
  if (!noneGood(label) && best.length !== 1) problems.push(`${best.length} best cells, not 1`);
  if (!String(label.reason || '').trim()) problems.push('no reason line');
  return problems;
}

function cellsWith(label, mark) {
  return Object.entries((label && label.cells) || {})
    .filter(([, m]) => m === mark)
    .map(([c]) => Number(c))
    .sort((a, b) => a - b);
}

// No cell is good when every cell is weak or wrong. Then the grid has no best cell.
function noneGood(label) {
  return okSet(label).length === 0;
}

// The accepted set: the best cell plus every ok cell.
function okSet(label) {
  return [...cellsWith(label, 'best'), ...cellsWith(label, 'ok')].sort((a, b) => a - b);
}

// Counts for the report. `earlier` compares today's label with the single cell Flash
// picked for the card before (the crop): a free first look at self-agreement.
function summarize(grids, labels) {
  const done = grids.filter((g) => labelProblems(labels[g.id]).length === 0);
  const sum = (f) => done.reduce((n, g) => n + f(labels[g.id], g), 0);
  const withEarlier = done.filter((g) => g.earlierPick && !noneGood(labels[g.id]));
  return {
    grids: grids.length,
    labeled: done.length,
    bySplit: Object.fromEntries(['dev', 'test'].map((s) => [s, done.filter((g) => g.split === s).length])),
    noneGood: sum((l) => (noneGood(l) ? 1 : 0)),
    meanOk: done.length ? sum((l) => okSet(l).length) / done.length : 0,
    meanWeak: done.length ? sum((l) => cellsWith(l, 'weak').length) / done.length : 0,
    meanWrong: done.length ? sum((l) => cellsWith(l, 'wrong').length) / done.length : 0,
    earlier: {
      compared: withEarlier.length,
      sameBest: withEarlier.filter((g) => cellsWith(labels[g.id], 'best')[0] === g.earlierPick).length,
      inOk: withEarlier.filter((g) => okSet(labels[g.id]).includes(g.earlierPick)).length,
      markedWrong: withEarlier.filter((g) => cellsWith(labels[g.id], 'wrong').includes(g.earlierPick)).length,
    },
  };
}

// Cohen's kappa over a k×k count table; `weight(i, j)` is the disagreement weight
// (0 on the diagonal). Plain kappa uses 1 off the diagonal; linear uses |i - j|.
function kappa(table, weight) {
  const n = table.flat().reduce((a, b) => a + b, 0);
  if (!n) return 0;
  const rows = table.map((r) => r.reduce((a, b) => a + b, 0));
  const cols = table[0].map((_, j) => table.reduce((a, r) => a + r[j], 0));
  let seen = 0;
  let chance = 0;
  table.forEach((r, i) =>
    r.forEach((v, j) => {
      seen += weight(i, j) * v;
      chance += (weight(i, j) * rows[i] * cols[j]) / n;
    }),
  );
  return chance ? 1 - seen / chance : 1;
}

// How far annotator B's labels agree with annotator A's, over the grids both labeled.
function agreement(grids, a, b) {
  const both = grids.filter((g) => a[g.id] && b[g.id] && labelProblems(a[g.id]).length === 0);
  const confusion = Object.fromEntries(MARKS.map((m) => [m, Object.fromEntries(MARKS.map((n) => [n, 0]))]));
  const best = { of: 0, same: 0, inOk: 0, wrong: 0 };
  const wrongRecall = { of: 0, hit: 0 };
  for (const g of both) {
    for (const c of CELLS) {
      const ma = a[g.id].cells[c];
      const mb = b[g.id].cells[c];
      if (!MARKS.includes(ma) || !MARKS.includes(mb)) continue;
      confusion[ma][mb]++;
      if (ma === 'wrong') {
        wrongRecall.of++;
        if (mb === 'wrong') wrongRecall.hit++;
      }
    }
    const bb = cellsWith(b[g.id], 'best')[0];
    if (bb !== undefined && !noneGood(a[g.id])) {
      best.of++;
      if (cellsWith(a[g.id], 'best')[0] === bb) best.same++;
      if (okSet(a[g.id]).includes(bb)) best.inOk++;
      if (cellsWith(a[g.id], 'wrong').includes(bb)) best.wrong++;
    }
  }
  const table = MARKS.map((m) => MARKS.map((n) => confusion[m][n]));
  const cells = table.flat().reduce((x, y) => x + y, 0);
  const same = MARKS.reduce((x, m) => x + confusion[m][m], 0);
  const gaps = MARKS.flatMap((m) => MARKS.filter((n) => n !== m).map((n) => [`${m} → ${n}`, confusion[m][n]]))
    .filter(([, v]) => v > 0)
    .sort((x, y) => y[1] - x[1]);
  return {
    grids: both.length,
    cells,
    same,
    kappa: kappa(table, (i, j) => (i === j ? 0 : 1)),
    weightedKappa: kappa(table, (i, j) => Math.abs(i - j)),
    best,
    wrongRecall,
    confusion,
    gaps,
  };
}

module.exports = { MARKS, labelProblems, cellsWith, okSet, noneGood, summarize, kappa, agreement };
