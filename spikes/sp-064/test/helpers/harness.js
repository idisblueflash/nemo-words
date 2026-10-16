"use strict";

// Shared SP-064 test harness: the fixture files, a throwaway output folder,
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
const BLIND_PAIRS = path.join(FIXTURES, "blind-pairs.json");
const FAKE_CLAUDE = path.join(__dirname, "fake-claude");

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "sp064-"));
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
    SP064_GRIDS: GRIDS,
    SP064_BLIND_PAIRS: BLIND_PAIRS,
    SP064_IMAGE_DIR: IMAGES,
    SP064_OUT_DIR: outDir,
    SP064_REPORT: path.join(outDir, "report.md"),
    SP064_CLAUDE_BIN: FAKE_CLAUDE,
    SP064_SP029_RUN: path.join(outDir, "no-sp029-run.json"),
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

const claudeCalls = (log) =>
  fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];

module.exports = { SPIKE, FIXTURES, IMAGES, GRIDS, BLIND_PAIRS, FAKE_CLAUDE, tmpDir, readJson, writeJson, gridsFile, fixtureEnv, runNode, claudeCalls };
