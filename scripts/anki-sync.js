#!/usr/bin/env node
"use strict";

// Upsert rows from an anki/*.txt export file into a live Anki collection via
// AnkiConnect (http://127.0.0.1:8765 by default), without disturbing an
// existing note's scheduling/review history the way addNotes' silent
// duplicate-skipping would.
//
// Usage:
//   node scripts/anki-sync.js                       # sync every row in the file
//   node scripts/anki-sync.js <front>                # sync just the row with this exact Front
//   ANKI_FILE=reading-room-terms.txt node scripts/anki-sync.js [<front>]
//                                                     # sync a different anki/ file
//                                                     # (defaults to medical-word-parts.txt)
//
// Upsert flow per row (mirrors scripts/update-word.js's insert-or-patch
// pattern, just against AnkiConnect instead of data.json):
//   1. findNotes (deck + exact Front match) to see if the note exists.
//   2. found  -> updateNoteFields (patches Back only; scheduling/tags untouched)
//   3. absent -> addNote (creates it fresh)
//
// Deck/notetype/tags/columns are parsed from the file's own header
// directives each run, not hardcoded, so this stays correct if those change.

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "anki", process.env.ANKI_FILE || "medical-word-parts.txt");
const ANKI_CONNECT_URL = process.env.ANKI_CONNECT_URL || "http://127.0.0.1:8765";

function usageAndExit() {
  console.error("Usage: node scripts/anki-sync.js [<front>]");
  process.exit(1);
}

if (process.argv.length > 3) usageAndExit();
const frontFilter = process.argv[2];

// -- File parsing -----------------------------------------------------------

// Parses the #directive:value header lines and the tab-separated rows below
// them. Header values are used verbatim (not trimmed beyond the newline)
// since #columns:Front\tBack relies on an embedded literal tab.
function parseFile(text) {
  const lines = text.split(/\r?\n/);
  const header = {};
  const rows = [];

  for (const line of lines) {
    if (line.startsWith("#")) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(1, idx).trim();
      const value = line.slice(idx + 1);
      header[key] = value;
      continue;
    }
    if (!line.trim()) continue;
    const tabIdx = line.indexOf("\t");
    if (tabIdx === -1) continue; // malformed row, skip
    rows.push({ front: line.slice(0, tabIdx), back: line.slice(tabIdx + 1) });
  }

  const deckName = header.deck;
  const modelName = header.notetype;
  const tags = (header.tags || "").trim().split(/\s+/).filter(Boolean);
  const columns = (header.columns || "Front\tBack").split("\t").map((c) => c.trim());
  const [frontField, backField] = columns.length === 2 ? columns : ["Front", "Back"];

  return { deckName, modelName, tags, frontField, backField, rows };
}

// -- AnkiConnect client -------------------------------------------------------

// Thrown when the HTTP request itself fails (Anki not running / AnkiConnect
// not installed / wrong port) — distinct from a row-level API error so the
// caller can treat it as fatal for the whole run.
class ConnectionError extends Error {}

// Thrown when AnkiConnect responds but with a non-null `error` — a
// row-level failure the caller can log and continue past.
class ActionError extends Error {}

async function invoke(action, params) {
  let res;
  try {
    res = await fetch(ANKI_CONNECT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, version: 6, params }),
    });
  } catch (e) {
    throw new ConnectionError(e.message);
  }

  let body;
  try {
    body = await res.json();
  } catch (e) {
    throw new ConnectionError(`Unexpected response from AnkiConnect: ${e.message}`);
  }

  if (body.error) throw new ActionError(body.error);
  return body.result;
}

// Backslash-escapes `\` and `"` so a value can be embedded in an AnkiConnect
// search query (e.g. `Front:"<value>"`).
function escapeQueryValue(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// -- Sync ---------------------------------------------------------------

async function syncRow(row, ctx) {
  const { deckName, modelName, tags, frontField, backField } = ctx;
  const query = `deck:"${escapeQueryValue(deckName)}" ${frontField}:"${escapeQueryValue(row.front)}"`;
  const noteIds = await invoke("findNotes", { query });

  if (noteIds.length > 0) {
    const noteId = noteIds[0];
    const infos = await invoke("notesInfo", { notes: [noteId] });
    const currentBack = infos[0] && infos[0].fields[backField] && infos[0].fields[backField].value;
    if (currentBack === row.back) {
      console.log(`Unchanged "${row.front}"`);
      return;
    }
    await invoke("updateNoteFields", {
      note: { id: noteId, fields: { [backField]: row.back } },
    });
    console.log(`Updated "${row.front}"`);
    return;
  }

  await invoke("addNote", {
    note: {
      deckName,
      modelName,
      fields: { [frontField]: row.front, [backField]: row.back },
      tags,
      // AnkiConnect's default duplicate check is notetype-wide (any deck),
      // but this project's anki/*.txt decks intentionally reuse Front text
      // across different decks (see scripts.md) — scope the check to the
      // target deck so a Front used elsewhere doesn't block a legitimate
      // add here. findNotes above is already deck-scoped; this matches it.
      options: { duplicateScope: "deck" },
    },
  });
  console.log(`Added "${row.front}"`);
}

async function main() {
  const text = fs.readFileSync(FILE, "utf8");
  const ctx = parseFile(text);

  let rows = ctx.rows;
  if (frontFilter !== undefined) {
    rows = rows.filter((r) => r.front === frontFilter);
    if (rows.length === 0) {
      console.error(`No row with Front "${frontFilter}" in ${FILE}`);
      process.exit(1);
    }
  }

  // Idempotent/safe even if the deck already exists — call defensively so a
  // first-run sync on a fresh collection doesn't fail with "deck was not found".
  await invoke("createDeck", { deck: ctx.deckName });

  let hadFailure = false;
  for (const row of rows) {
    try {
      await syncRow(row, ctx);
    } catch (e) {
      if (e instanceof ConnectionError) throw e;
      hadFailure = true;
      console.error(`Failed "${row.front}": ${e.message}`);
    }
  }

  if (hadFailure) process.exit(1);
}

main().catch((e) => {
  if (e instanceof ConnectionError) {
    console.error(
      `Could not reach AnkiConnect at ${ANKI_CONNECT_URL} — make sure Anki is open with the AnkiConnect add-on installed.`
    );
    process.exit(1);
  }
  console.error(`Failed: ${e.message}`);
  process.exit(1);
});
