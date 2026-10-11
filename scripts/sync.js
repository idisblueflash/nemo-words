#!/usr/bin/env node
"use strict";

// US-028 step `sync <front> [file-status]` (after update-anki-story §3–4) —
// pushes the word's row into the live collection via scripts/anki-sync.js
// (which honours ANKI_FILE / ANKI_CONNECT_URL), then appends one line to the
// sync log (anki/sync.log, or ANKI_SYNC_LOG):
//   <ISO time> term=<front> file=<added|patched> sync=<ok|failed (<reason>)>
// Prints `ok`. If the sync fails (e.g. Anki isn't running) the row already
// written stays written: exit 1 with the reason and a re-run hint.

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { runCli, REPO_ROOT } = require("./card-lib");

function syncLogPath() {
  return process.env.ANKI_SYNC_LOG || path.join(REPO_ROOT, "anki", "sync.log");
}

function runAnkiSync(front) {
  const r = spawnSync(process.execPath, [path.join(__dirname, "anki-sync.js"), front], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.error) return { ok: false, reason: r.error.message };
  if (r.status !== 0) return { ok: false, reason: (r.stderr || r.stdout || `exit ${r.status}`).trim().replace(/\s*\n\s*/g, " ") };
  return { ok: true };
}

function logSync(front, fileStatus, result) {
  const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const sync = result.ok ? "ok" : `failed (${result.reason})`;
  fs.appendFileSync(syncLogPath(), `${ts} term=${front} file=${fileStatus || "unchanged"} sync=${sync}\n`);
}

if (require.main === module) {
  runCli(([front, fileStatus]) => {
    if (!front) throw new Error("usage: sync <front> [file-status]");
    const r = runAnkiSync(front);
    logSync(front, fileStatus, r);
    if (r.ok) return { lines: ["ok"] };
    return { stop: [`sync failed: ${r.reason}`, `the row is written; re-run later: node scripts/sync.js "${front}"`] };
  });
}

module.exports = { runAnkiSync };
