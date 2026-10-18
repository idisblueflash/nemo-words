"use strict";

// Shared SP-066 test harness (copied from SP-064): the fixture files, a throwaway output folder,
// and a runner for run.js with every path pointed at the fixtures and the
// fake claude.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");

const SPIKE = path.join(__dirname, "..", "..");
const FIXTURES = path.join(__dirname, "..", "fixtures");
const IMAGES = path.join(FIXTURES, "images");
const GRIDS = path.join(FIXTURES, "grids.json");
const FAKE_CLAUDE = path.join(__dirname, "fake-claude");

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "sp066-"));
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const writeJson = (f, data) => fs.writeFileSync(f, JSON.stringify(data, null, 2) + "\n");

// A grids.json in `dir` holding only the given kept grids.
function gridsFile(dir, kept, leftOut = []) {
  const f = path.join(dir, "grids.json");
  writeJson(f, { kept, leftOut });
  return f;
}

function fixtureEnv(outDir, extra = {}) {
  return {
    SP066_GRIDS: GRIDS,
    SP066_IMAGE_DIR: IMAGES,
    SP066_OUT_DIR: outDir,
    SP066_REPORT: path.join(outDir, "report.md"),
    SP066_CLAUDE_BIN: FAKE_CLAUDE,
    SP066_SP029_RUN: path.join(outDir, "no-sp029-run.json"),
    SP066_SP064_DIFFERENCES: path.join(outDir, "no-sp064-differences.json"),
    ...extra,
  };
}

function runNode(script, args, env = {}) {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [path.join(SPIKE, script), ...args],
      // the mocks are local: never reach them through the shell's proxy
      { env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "", http_proxy: "", https_proxy: "", ...env }, maxBuffer: 16 << 20 },
      (err, stdout, stderr) => resolve({ code: err ? err.code : 0, stdout, stderr }),
    );
  });
}

// The whole run, as the Staged run ends it: every tuning word, then the measure
// stage (which fixes the weights and writes the report). Returns the tuning
// stage when it fails, else the measure stage.
async function runStages(env) {
  const tuning = await runNode("run.js", ["--stage", "tuning"], env);
  if (tuning.code !== 0) return { ...tuning, stage: "tuning" };
  return { ...(await runNode("run.js", ["--stage", "measure"], env)), stage: "measure", tuningStdout: tuning.stdout, tuningStderr: tuning.stderr };
}

const claudeCalls = (log) =>
  fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];

module.exports = { SPIKE, FIXTURES, IMAGES, GRIDS, FAKE_CLAUDE, tmpDir, readJson, writeJson, gridsFile, fixtureEnv, runNode, runStages, claudeCalls };
