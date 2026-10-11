#!/usr/bin/env node
"use strict";

// US-028 — the one-word command: `node scripts/card.js <word>`.
// One word in, a synced story card out, with nothing asked along the way.
//
// Runs the step CLIs in order, each as its own process under the EN-036 step
// contract (stdout = result, tab-separated; stderr = notes; exit 0 ok,
// 1 stopped with reasons, 2 error):
//   normalize -> route -> ipa -> syllabify -> define -> gloss -> chunk ->
//   find-keywords -> compose-stories -> check-story (per candidate) ->
//   pick-story -> write-row -> sync
// Multi-line results are handed on as files in a per-run temp directory.
//
// This is a plain sequential runner standing in for EN-036's Dagu workflow
// (not built yet); it maps step outcomes the way EN-036 specifies for
// `card.js`: a step exiting 1 prints `stopped at <step>: <reasons>` and exits
// 1; a step exiting 2 or crashing prints its stderr and exits 2; otherwise
// the result is printed and it exits 0.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

class Stopped {
  constructor(step, reasons) {
    this.step = step;
    this.reasons = reasons;
  }
}
class Failed {
  constructor(step, stderr) {
    this.step = step;
    this.stderr = stderr;
  }
}

const notes = [];

function step(name, args) {
  const r = spawnSync(process.execPath, [path.join(__dirname, `${name}.js`), ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = (r.stdout || "").split("\n").filter((l) => l !== "");
  if (r.stderr && r.stderr.trim()) notes.push(`${name}: ${r.stderr.trim()}`);
  if (r.status === 0) return out;
  if (r.status === 1) throw new Stopped(name, out);
  throw new Failed(name, (r.stderr || r.error?.message || `exit ${r.status}`).trim());
}

function run(input) {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "nemo-card-"));
  const save = (file, lines) => {
    const p = path.join(runDir, file);
    fs.writeFileSync(p, lines.map((l) => `${l}\n`).join(""));
    return p;
  };

  const [word] = step("normalize", [input]);
  const [, loggedStory] = step("route", [word])[0].split("\t");
  const [ga] = step("ipa", [word]);
  const [syllables] = step("syllabify", [ga]);
  const [primarySense, definition] = step("define", [word]);
  const [gloss] = step("gloss", [word, primarySense, definition]);
  save("chunks.tsv", step("chunk", [syllables]));
  const story = loggedStory || draftAndPick(word, primarySense, syllables, save);
  const [status, front] = step("write-row", [word, story, syllables, gloss])[0].split("\t");
  step("sync", [front, status]);

  return [
    `carded ${front} (${status})`,
    `story: ${story}${loggedStory ? "  (logged story, kept as picked)" : ""}`,
    `gloss: ${gloss}`,
    `ipa:   ${syllables}`,
    "synced to Anki",
  ];
}

// find-keywords -> compose-stories -> check-story per candidate -> pick-story.
function draftAndPick(word, primarySense, syllables, save) {
  const keywordsFile = save("keywords.tsv", step("find-keywords", [syllables, word]));
  const candidates = step("compose-stories", [word, primarySense, keywordsFile]);
  const candidatesFile = save("candidates.tsv", candidates);

  const checks = candidates.map((line) => {
    const [sentence, pivots = ""] = line.split("\t");
    try {
      step("check-story", [word, primarySense, sentence, pivots, keywordsFile]);
      return "-";
    } catch (e) {
      if (e instanceof Stopped) return e.reasons.join(",");
      throw e;
    }
  });
  const checksFile = save("checks.tsv", checks);

  const [picked] = step("pick-story", [candidatesFile, checksFile]);
  return picked.split("\t")[0];
}

function main() {
  const input = process.argv.slice(2).join(" ");
  try {
    for (const line of run(input)) console.log(line);
    for (const n of notes) console.error(`note: ${n}`);
  } catch (e) {
    for (const n of notes) console.error(`note: ${n}`);
    if (e instanceof Stopped) {
      console.log(`stopped at ${e.step}: ${e.reasons.join("\n  ")}`);
      process.exitCode = 1;
    } else if (e instanceof Failed) {
      console.error(`failed at ${e.step}:\n${e.stderr}`);
      process.exitCode = 2;
    } else {
      console.error(`failed: ${e.stack || e}`);
      process.exitCode = 2;
    }
  }
}

if (require.main === module) main();
