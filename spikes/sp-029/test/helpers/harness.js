"use strict";

// Shared SP-029 test harness: the fixture files, a throwaway output folder,
// and a runner for the spike's CLIs with every path pointed at the fixtures.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");

const SPIKE = path.join(__dirname, "..", "..");
const FIXTURES = path.join(__dirname, "..", "fixtures");
const IMAGES = path.join(FIXTURES, "images");
const CARD_FILE = path.join(FIXTURES, "reading-room-terms.txt");
const LOG_FILE = path.join(FIXTURES, "log.jsonl");
const FAKE_CAPTIONER = path.join(__dirname, "fake-captioner");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sp029-"));
}

// Env for run.js / blind.js: fixtures in, a fresh out dir, the fake captioner.
function fixtureEnv(outDir, extra = {}) {
  return {
    SP029_IMAGE_DIR: IMAGES,
    SP029_CARD_FILE: CARD_FILE,
    NEMO_MNEMONIC_LOG: LOG_FILE,
    SP029_OUT_DIR: outDir,
    SP029_REPORT: path.join(outDir, "report.md"),
    SP029_CAPTION_BIN: FAKE_CAPTIONER,
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

const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

module.exports = { SPIKE, FIXTURES, IMAGES, CARD_FILE, LOG_FILE, FAKE_CAPTIONER, tmpDir, fixtureEnv, runNode, readJson };
