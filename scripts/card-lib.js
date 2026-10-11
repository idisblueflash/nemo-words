"use strict";

// Shared plumbing for the US-028 card-pipeline step CLIs (scripts/<step>.js).
//
// Step contract (EN-036): the result goes to stdout, one record per line,
// fields tab-separated, list fields comma-separated; notes/warnings go to
// stderr; exit 0 ok, 1 stopped with reasons (one per line on stdout), 2 error.

// Runs a step's `main(args)`; it returns `{ lines }` on success or
// `{ stop: [reasons] }` to stop cleanly. Anything thrown is an error (exit 2).
async function runCli(main) {
  try {
    const result = await main(process.argv.slice(2));
    if (result && result.stop) {
      for (const r of result.stop) process.stdout.write(`${r}\n`);
      process.exitCode = 1;
      return;
    }
    for (const line of (result && result.lines) || []) process.stdout.write(`${line}\n`);
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n`);
    process.exitCode = 2;
  }
}

const { spawnSync } = require("child_process");

// Runs an external tool synchronously with stdin closed (no step may prompt).
// Throws on spawn failure or an unexpected exit code.
function runTool(bin, args, { okCodes = [0] } = {}) {
  const r = spawnSync(bin, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 });
  if (r.error) throw new Error(`could not run ${bin}: ${r.error.message}`);
  if (!okCodes.includes(r.status)) {
    throw new Error(`${bin} ${args[0] || ""} exited ${r.status}: ${(r.stderr || "").trim()}`);
  }
  return r.stdout;
}

// `nemo-words` (offline CMU GA + BEEP RP dictionary). NEMO_WORDS_BIN overrides
// the executable so tests can inject a fake.
function nemoWords(args) {
  return runTool(process.env.NEMO_WORDS_BIN || "nemo-words", args);
}

// One non-interactive `claude -p <prompt>` call. NEMO_CLAUDE_BIN overrides
// the executable so tests can inject a fake model. Prompts start with a
// `Step: <name>` line so the call is identifiable in logs (and to the fake).
function claude(prompt) {
  return runTool(process.env.NEMO_CLAUDE_BIN || "claude", ["-p", prompt]);
}

// Model text -> a single plain line (step contract: no tabs/newlines leak).
function flatten(text) {
  return String(text == null ? "" : text).replace(/[\t\r\n]+/g, " ").replace(/ {2,}/g, " ").trim();
}

// Pulls the first JSON object/array out of model text (it may wrap the JSON
// in prose or a code fence).
function extractJson(text) {
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (start === -1 || end < start) throw new Error(`model returned no JSON: ${flatten(text).slice(0, 200)}`);
  return JSON.parse(text.slice(start, end + 1));
}

const path = require("path");
const REPO_ROOT = path.join(__dirname, "..");

// The card file. ANKI_FILE names a file under anki/ (same convention as
// anki-sync.js, which syncs from it), default reading-room-terms.txt.
function cardFilePath() {
  return path.join(REPO_ROOT, "anki", process.env.ANKI_FILE || "reading-room-terms.txt");
}

// The card file's data rows as { front, back, index } (index = line number
// in `text.split("\n")`); `#` header lines and blank lines are skipped.
function cardRows(text) {
  const rows = [];
  text.split("\n").forEach((line, index) => {
    if (!line.trim() || line.startsWith("#") || !line.includes("\t")) return;
    const [front, back = ""] = line.split("\t");
    rows.push({ front, back: back.trim(), index });
  });
  return rows;
}

// The row for `word`, matching Front case-insensitively.
function findCardRow(rows, word) {
  const want = word.toLowerCase();
  return rows.find((r) => r.front.toLowerCase() === want) || null;
}

const alreadyCarded = (front, story) => `already carded: ${front} — current story: ${story}`;

const stripStress = (ipa) => String(ipa).replace(/[ˈˌ]/g, "");

// Comparable form of an IPA string: no stress marks, syllable dots, or length
// marks; r/ɹ and g/ɡ treated alike.
function ipaKey(ipa) {
  return stripStress(ipa).replace(/[.ː]/g, "").replace(/r/g, "ɹ").replace(/ɡ/g, "g");
}

module.exports = {
  runCli,
  runTool,
  nemoWords,
  claude,
  flatten,
  extractJson,
  cardFilePath,
  cardRows,
  findCardRow,
  alreadyCarded,
  stripStress,
  ipaKey,
  REPO_ROOT,
};
