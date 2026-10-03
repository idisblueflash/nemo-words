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
//   node scripts/anki-sync.js --delete <front>       # remove a note the file no longer carries
//   node scripts/anki-sync.js --delete <front> --deck <deck>
//                                                     # ...scoped to one deck
//   ANKI_FILE=<name>.txt node scripts/anki-sync.js [<front>]
//                                                     # sync a different anki/ file
//                                                     # (defaults to reading-room-terms.txt)
//
// Upsert flow per row (mirrors scripts/update-word.js's insert-or-patch
// pattern, just against AnkiConnect instead of data.json):
//   1. findNotes (deck + exact Front match) to see if the note exists.
//   2. found  -> updateNoteFields (patches Back only; scheduling/tags untouched)
//   3. absent -> addNote (creates it fresh)
//
// Deck/notetype/tags/columns are parsed from the file's own header
// directives each run, not hardcoded, so this stays correct if those change.
//
// Mnemonic images (ADR-0012): if the file declares `#media-dir:<path>` and a
// row has a third `Image` column with a basename, the referenced file under
// <media-dir> is uploaded to the collection as `nemo-<basename>` (the prefix
// keeps it from colliding with anything else in the shared media folder) and
// an <img> tag is appended to the Back field that gets pushed. The Back column
// in the .txt file itself stays plain-text story — the <img> is composed here
// at sync time, never stored in the file.
//
// IPA (ADR-0015): an optional fourth `IPA` column carries the word's IPA
// transcription (stress marked, e.g. `ˈɑm.ə.nəs`). If present, it's appended
// to the composed Back as a small muted `/ipa/` line. Composed Back order is
// image, then story, then IPA. Like the Image column, this is sync-time
// composition only — the .txt Back column itself never gains it.
//
// Gloss (ADR-0018): an optional fifth `Gloss` column carries a one-clause
// plain-English meaning (~60 chars, no etymology). If present, it's composed
// onto the Back as a small muted italic line between the story and the IPA, so
// on review the story is checked against the meaning it encodes and then the
// transcription confirms the pronunciation. Sync-time composition only, like
// Image and IPA. Word-part rows (`medical-word-parts`) don't use it — their
// Back already states the morpheme's meaning.
//
// Deck / Tags overrides (ADR-0016): medical-word-parts.txt was merged into
// reading-room-terms.txt so there's one file to keep in sync, but its rows
// still belong to a different Anki deck and a different tag than ordinary
// vocabulary rows. An optional sixth `Deck` column overrides the file's
// `#deck` header for just that row, and an optional seventh `Tags` column
// (space-separated) replaces the file's `#tags` header for just that row.
// Both are per-row overrides, not additive — empty means "use the header
// default". `Tags` only affects notes created by this run (addNote); an
// existing note's tags are left alone on update, same as before.
//
// Deleting a note (`--delete <front>`): the sync above is an upsert, so
// deleting a row from an anki/*.txt file leaves its note behind in the live
// collection forever — the file is no longer the whole truth about the deck.
// `--delete` is the explicit cleanup verb for that case (e.g. folding a
// word-part row into its whole-word card). It is deliberately NOT a prune:
// nothing is inferred from the file's contents, one Front is named on the
// command line, and the run REFUSES if that Front is still a row in the file,
// so it can only ever remove something already un-carded. With no `--deck` it
// searches the header deck plus every deck named by a row-level Deck override;
// deleting a note is irreversible from here (Anki's own undo still applies in
// the app), so it reports every note it removes and which deck it came from.

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..");
const FILE = path.join(REPO_ROOT, "anki", process.env.ANKI_FILE || "reading-room-terms.txt");
const ANKI_CONNECT_URL = process.env.ANKI_CONNECT_URL || "http://127.0.0.1:8765";

function usageAndExit(message) {
  if (message) console.error(message);
  console.error("Usage: node scripts/anki-sync.js [<front>]");
  console.error("       node scripts/anki-sync.js --delete <front> [--deck <deck>]");
  process.exit(1);
}

// Returns { frontFilter, deleteFront, deck }. `frontFilter` undefined means
// "sync every row"; `deleteFront` set switches the run to delete mode, where
// `deck` optionally scopes the search to one deck.
function parseArgs(argv) {
  const args = argv.slice(2);
  let frontFilter;
  let deleteFront = null;
  let deck = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--delete" || arg === "--deck") {
      const value = args[++i];
      if (value === undefined) usageAndExit(`${arg} needs a value`);
      if (arg === "--delete") deleteFront = value;
      else deck = value;
      continue;
    }
    if (arg.startsWith("--")) usageAndExit(`Unknown option ${arg}`);
    if (frontFilter !== undefined) usageAndExit("Only one <front> may be given");
    frontFilter = arg;
  }

  if (deck !== null && deleteFront === null) usageAndExit("--deck is only valid with --delete");
  if (deleteFront !== null && frontFilter !== undefined) {
    usageAndExit("--delete takes the Front itself; don't also pass a positional <front>");
  }

  return { frontFilter, deleteFront, deck };
}

const { frontFilter, deleteFront, deck: deleteDeck } = parseArgs(process.argv);

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
    if (line.indexOf("\t") === -1) continue; // malformed row, skip
    // Split on every tab: Front, Back, an optional third Image column, an
    // optional fourth IPA column, an optional fifth Gloss column, and
    // optional sixth Deck / seventh Tags override columns. A story sentence
    // never contains a literal tab, so this is safe.
    const parts = line.split("\t");
    rows.push({
      front: parts[0],
      back: parts[1] || "",
      image: (parts[2] || "").trim(),
      ipa: (parts[3] || "").trim(),
      gloss: (parts[4] || "").trim(),
      deck: (parts[5] || "").trim(),
      tags: (parts[6] || "").trim(),
    });
  }

  const deckName = header.deck;
  const modelName = header.notetype;
  const tags = (header.tags || "").trim().split(/\s+/).filter(Boolean);
  const columns = (header.columns || "Front\tBack").split("\t").map((c) => c.trim());
  const frontField = columns[0] || "Front";
  const backField = columns[1] || "Back";
  // Directory (repo-relative) holding the files named by the Image column.
  // Absent -> the Image column is ignored even if present.
  const mediaDir = header["media-dir"] ? header["media-dir"].trim() : null;

  return { deckName, modelName, tags, frontField, backField, mediaDir, rows };
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

// Uploads the row's image (if any) into the collection and returns the Back
// HTML to push, in review order: the <img> (if attached), then the plain-text
// story, then a muted italic gloss line (if given), then a trailing muted
// `/ipa/` line (if given). A declared-but-missing image file is a row-level
// failure so the caller logs it and moves on rather than silently dropping
// the image.
async function composeBack(row, ctx) {
  const pieces = [];

  if (row.image && ctx.mediaDir) {
    const srcPath = path.join(REPO_ROOT, ctx.mediaDir, row.image);
    if (!fs.existsSync(srcPath)) {
      throw new ActionError(`image not found: ${path.join(ctx.mediaDir, row.image)}`);
    }
    const mediaName = `nemo-${row.image}`;
    await invoke("storeMediaFile", {
      filename: mediaName,
      data: fs.readFileSync(srcPath).toString("base64"),
    });

    pieces.push(`<img src="${mediaName}">`);
  }

  if (row.back) pieces.push(row.back);

  if (row.gloss) pieces.push(`<small style="opacity:0.75"><i>${row.gloss}</i></small>`);

  if (row.ipa) pieces.push(`<small style="opacity:0.6">/${row.ipa}/</small>`);

  return pieces.join("<br>");
}

async function syncRow(row, ctx) {
  const { modelName, frontField, backField } = ctx;
  const deckName = row.deck || ctx.deckName;
  const tags = row.tags ? row.tags.split(/\s+/).filter(Boolean) : ctx.tags;
  const back = await composeBack(row, ctx);
  const query = `deck:"${escapeQueryValue(deckName)}" ${frontField}:"${escapeQueryValue(row.front)}"`;
  const noteIds = await invoke("findNotes", { query });

  if (noteIds.length > 0) {
    const noteId = noteIds[0];
    const infos = await invoke("notesInfo", { notes: [noteId] });
    const currentBack = infos[0] && infos[0].fields[backField] && infos[0].fields[backField].value;
    if (currentBack === back) {
      console.log(`Unchanged "${row.front}"`);
      return;
    }
    await invoke("updateNoteFields", {
      note: { id: noteId, fields: { [backField]: back } },
    });
    console.log(`Updated "${row.front}"`);
    return;
  }

  await invoke("addNote", {
    note: {
      deckName,
      modelName,
      fields: { [frontField]: row.front, [backField]: back },
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

// Removes the note(s) with this exact Front from the live collection. Guarded
// on the file: a Front that's still carded here is a mistake, not a cleanup, so
// it refuses rather than deleting a note the next sync would just re-add.
// Finding nothing is success (the run is idempotent — re-running after the note
// is gone is fine).
async function deleteNote(front, ctx) {
  if (ctx.rows.some((r) => r.front === front)) {
    console.error(
      `"${front}" is still a row in ${FILE} — remove the row first. ` +
        `--delete only removes notes the file no longer carries.`
    );
    process.exit(1);
  }

  const decks = deleteDeck
    ? [deleteDeck]
    : [...new Set([ctx.deckName, ...ctx.rows.map((r) => r.deck).filter(Boolean)])];

  let deleted = 0;
  for (const deck of decks) {
    const query = `deck:"${escapeQueryValue(deck)}" ${ctx.frontField}:"${escapeQueryValue(front)}"`;
    const noteIds = await invoke("findNotes", { query });
    if (noteIds.length === 0) continue;
    await invoke("deleteNotes", { notes: noteIds });
    deleted += noteIds.length;
    console.log(`Deleted "${front}" from "${deck}" (${noteIds.length} note(s))`);
  }

  if (deleted === 0) {
    console.log(`No note with Front "${front}" in ${decks.map((d) => `"${d}"`).join(", ")}`);
  }
}

async function main() {
  const text = fs.readFileSync(FILE, "utf8");
  const ctx = parseFile(text);

  if (deleteFront !== null) {
    await deleteNote(deleteFront, ctx);
    return;
  }

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
  // Covers the header's default deck plus every row-level Deck override in
  // play for this run.
  const decksInPlay = new Set([ctx.deckName, ...rows.map((r) => r.deck).filter(Boolean)]);
  for (const deck of decksInPlay) await invoke("createDeck", { deck });

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
