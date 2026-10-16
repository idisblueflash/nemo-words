"use strict";

// SP-029 AC4 — Given every kept word has been judged, when the spike report
// is written, then it shows the exact-match rate and the in-three rate, next
// to chance (11% and 33%) and to the always-cell-1 rule, and ends with go or
// no-go: go only if exact ≥ 45% and in-three ≥ 70%.
//
// Fixture outcomes with the mock Jev (nearest gray level wins):
//   alpha  Flash 5, Jev rows 3,5,7 → 5   exact
//   eta    Flash 1, Jev rows 3,4,7 → 4   miss, not in three
//   gamma  Flash 7, Jev rows 3,6,7 → 7   exact
//   theta  Flash 8, Jev rows 3,6,8 → 8   exact

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { tmpDir, fixtureEnv, runNode } = require("./helpers/harness");
const { startMockJev } = require("./helpers/mock-jev");

async function fullRun(byWord = {}) {
  const out = tmpDir();
  const jev = await startMockJev({ byWord }, out);
  try {
    const r = await runNode("run.js", [], fixtureEnv(out, { NEMO_JEV_ENV_FILE: jev.envFile }));
    assert.equal(r.code, 0, r.stderr);
    return { out, report: fs.readFileSync(path.join(out, "report.md"), "utf8"), calls: jev.calls };
  } finally {
    await jev.close();
  }
}

const lastLines = (text, n) => text.trim().split("\n").slice(-n).join("\n");

test("AC4: the report shows exact and in-three rates next to chance and the cell-1 rule, and ends with go", async () => {
  const { report } = await fullRun();
  assert.match(report, /^# SP-029 /);
  assert.match(report, /\| Exact \(Jev's final cell = Flash's cell\) \| 3 \/ 4 \(75\.0%\) \| 11% \| 1 \/ 4 \(25\.0%\) \|/);
  assert.match(report, /\| In three \(Flash's cell is one of Jev's row picks\) \| 3 \/ 4 \(75\.0%\) \| 33% \| 2 \/ 4 \(50\.0%\) \|/);
  assert.match(report, /Judged: 4 of 4 kept words/);
  // the left-out grids are listed with their reasons
  assert.match(report, /- beta\.grid\.png: no clear match/);
  assert.match(report, /- gamma\.grid\.png: another grid of gamma matched its crop/);
  assert.match(lastLines(report, 3), /^\*\*Go\*\* for auto image pick/m);
  assert.match(lastLines(report, 3), /exact ≥ 45% and in-three ≥ 70%/);
});

test("AC4: below the bar the report ends with no-go, and counts the ties", async () => {
  // theta: Jev prefers cell 1, and rows 2 and 3 are flat ties → rows 1,4,7 → final 1
  const { report } = await fullRun({ theta: { cell_1: 0.9 } });
  assert.match(report, /\| Exact .*\| 2 \/ 4 \(50\.0%\) \|/);
  assert.match(report, /\| In three .*\| 2 \/ 4 \(50\.0%\) \|/);
  assert.match(report, /Row picks decided by a tie: 2 of 12/);
  assert.match(report, /Final picks decided by a tie: 0 of 4/);
  assert.match(lastLines(report, 3), /^\*\*No-go\*\* for auto image pick/m);
});

test("AC4: run.js --report rebuilds the report from the saved run, with no Jev or captioner call", async () => {
  const { out, report } = await fullRun();
  fs.rmSync(path.join(out, "report.md"));
  const r = await runNode("run.js", ["--report"], fixtureEnv(out, { SP029_CAPTION_BIN: "/nonexistent", NEMO_JEV_ENV_FILE: "/nonexistent" }));
  assert.equal(r.code, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(out, "report.md"), "utf8"), report);
});
