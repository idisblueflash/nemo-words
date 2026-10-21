'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { labelProblems, okSet, summarize, agreement } =require('../scripts/lib/gold-image-pick');

const good = { cells: { 1: 'weak', 2: 'best', 3: 'weak', 4: 'weak', 5: 'ok', 6: 'weak', 7: 'weak', 8: 'weak', 9: 'wrong' }, notes: { 9: 'no broom' }, reason: 'the broom is clear' };

test('a complete label has no problems', () => {
  assert.deepStrictEqual(labelProblems(good), []);
});

const all = (mark, extra) => ({ ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => [c, mark])), ...extra });

test('a label needs exactly one best cell and a reason', () => {
  assert.deepStrictEqual(labelProblems({ cells: all('ok'), reason: '' }), ['0 best cells, not 1', 'no reason line']);
  assert.deepStrictEqual(labelProblems({ cells: all('weak', { 1: 'best', 2: 'best' }), reason: 'x' }), ['2 best cells, not 1']);
});

test('every cell needs a mark', () => {
  assert.deepStrictEqual(labelProblems({ cells: { 1: 'best', 2: 'ok', 3: 'weak', 4: 'wrong' }, reason: 'x' }), ['no mark on cells 5, 6, 7, 8, 9']);
  const cells = all('weak', { 1: 'best' });
  delete cells[9];
  assert.deepStrictEqual(labelProblems({ cells, reason: 'x' }), ['no mark on cell 9']);
});

test('a grid with only weak and wrong cells needs no best cell', () => {
  assert.deepStrictEqual(labelProblems({ cells: all('weak', { 3: 'wrong' }), reason: 'all cut off' }), []);
  assert.deepStrictEqual(labelProblems({ cells: all('weak', { 3: 'ok' }), reason: 'x' }), ['0 best cells, not 1']);
});

test('the ok set is the best cell plus the ok cells', () => {
  assert.deepStrictEqual(okSet(good), [2, 5]);
});

test('summarize compares the labels with the earlier pick', () => {
  const grids = [
    { id: 'G1', split: 'dev', earlierPick: 2 },
    { id: 'G2', split: 'test', earlierPick: 5 },
    { id: 'G3', split: 'test', earlierPick: 9 },
    { id: 'G4', split: 'dev', earlierPick: 1 },
  ];
  const labels = { G1: good, G2: good, G3: good, G4: { cells: {}, reason: '' } };
  const s = summarize(grids, labels);
  assert.strictEqual(s.labeled, 3);
  assert.deepStrictEqual(s.bySplit, { dev: 1, test: 2 });
  assert.deepStrictEqual(s.earlier, { compared: 3, sameBest: 1, inOk: 2, markedWrong: 1 });
});

test('agreement counts the same marks, the best cell and the gaps', () => {
  const grids = [{ id: 'G1' }];
  const b = { G1: { cells: { ...good.cells, 2: 'ok', 5: 'best', 9: 'weak' } } };
  const r = agreement(grids, { G1: good }, b);
  assert.strictEqual(r.cells, 9);
  assert.strictEqual(r.same, 6);
  assert.deepStrictEqual(r.best, { of: 1, same: 0, inOk: 1, wrong: 0 });
  assert.deepStrictEqual(r.wrongRecall, { of: 1, hit: 0 });
  assert.deepStrictEqual(r.gaps.map(([k]) => k).sort(), ['best → ok', 'ok → best', 'wrong → weak']);
  assert.strictEqual(agreement(grids, { G1: good }, { G1: good }).kappa, 1);
});
