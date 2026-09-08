// Regression test for bugs/anki-sync-cross-deck-duplicate-front.md
//
// Confirmed root cause: syncRow()'s addNote call in scripts/anki-sync.js
// (the branch taken when findNotes finds no existing note in the *target*
// deck) doesn't pass `options: { duplicateScope: "deck" }`. AnkiConnect's
// addNote defaults to a notetype-wide duplicate check, so a Front that
// already exists in some *other* deck on the same notetype gets rejected as
// a duplicate even though the target deck has no such note. Confirmed live
// via anki/sync.log's 2026-08-07T08:51:34Z "germane" entry (and earlier
// "agog"/"secus" entries) — a genuinely cross-deck, not same-deck, collision.
//
// This test runs the real script (scripts/anki-sync.js) end-to-end as a
// child process against a small in-process mock AnkiConnect server that
// enforces the same notetype-wide-by-default / deck-scoped-when-asked
// duplicate rule the real AnkiConnect does, so the fix is verified by
// behavior (the add succeeds) rather than just by inspecting the request
// shape.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

// Must be the async (promise-based) execFile, not execFileSync — the mock
// AnkiConnect server below runs in this same process, and execFileSync
// blocks this process's event loop while it waits, which would starve the
// mock server of the chance to ever accept/respond to the child's request.
const execFileAsync = promisify(execFile);

const scriptPath = path.join(__dirname, "..", "scripts", "anki-sync.js");
const ankiDir = path.join(__dirname, "..", "anki");
const testFileName = "anki-sync-cross-deck-duplicate.test.txt";
const testFilePath = path.join(ankiDir, testFileName);

// A minimal AnkiConnect stand-in that mirrors the one behavior this bug
// hinges on: addNote's duplicate check is notetype-wide unless
// options.duplicateScope === "deck", in which case it's scoped to that deck.
function createMockAnkiConnect(seedNotes) {
  let nextId = 1000;
  const notes = seedNotes.map((n) => ({ id: nextId++, ...n }));
  const calls = [];

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const { action, params } = JSON.parse(body);
      calls.push({ action, params });
      let result = null;
      let error = null;

      if (action === "createDeck") {
        result = 1;
      } else if (action === "findNotes") {
        const deckMatch = /deck:"([^"]*)"/.exec(params.query);
        const fieldMatch = /\s([A-Za-z]+):"([^"]*)"$/.exec(params.query);
        const deck = deckMatch ? deckMatch[1] : null;
        const front = fieldMatch ? fieldMatch[2] : null;
        result = notes.filter((n) => n.deckName === deck && n.fields.Front === front).map((n) => n.id);
      } else if (action === "addNote") {
        const note = params.note;
        const front = note.fields.Front;
        const duplicateScope = note.options && note.options.duplicateScope;
        const sameNotetype = notes.filter((n) => n.modelName === note.modelName && n.fields.Front === front);
        const conflicting =
          duplicateScope === "deck"
            ? sameNotetype.filter((n) => n.deckName === note.deckName)
            : sameNotetype; // AnkiConnect's real default: notetype-wide, any deck

        if (conflicting.length > 0) {
          error = "cannot create note because it is a duplicate";
        } else {
          const id = nextId++;
          notes.push({ id, deckName: note.deckName, modelName: note.modelName, fields: { ...note.fields } });
          result = id;
        }
      } else if (action === "updateNoteFields") {
        result = null;
      } else if (action === "notesInfo") {
        result = params.notes.map((id) => {
          const n = notes.find((x) => x.id === id);
          if (!n) return null;
          const fields = {};
          for (const [k, v] of Object.entries(n.fields)) fields[k] = { value: v };
          return { fields };
        });
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result, error }));
    });
  });

  return { server, calls, notes };
}

let mock;
let baseUrl;

test.beforeEach(async () => {
  // Seed an existing "germane" note in a *different* deck, same notetype —
  // the exact cross-deck collision from the bug card.
  mock = createMockAnkiConnect([
    { deckName: "02 Academic Word Parts", modelName: "Basic", fields: { Front: "germane", Back: "Latin root note" } },
  ]);
  await new Promise((resolve) => mock.server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${mock.server.address().port}`;

  fs.writeFileSync(
    testFilePath,
    ["#deck:Reading Room Terms", "#notetype:Basic", "germane\tnew reading-room-terms back text"].join("\n") + "\n"
  );
});

test.afterEach(async () => {
  await new Promise((resolve) => mock.server.close(resolve));
  fs.rmSync(testFilePath, { force: true });
});

test("syncing a row whose Front collides with a note in a different deck still adds it", async () => {
  let stdout;
  try {
    ({ stdout } = await execFileAsync("node", [scriptPath, "germane"], {
      encoding: "utf8",
      env: { ...process.env, ANKI_FILE: testFileName, ANKI_CONNECT_URL: baseUrl },
    }));
  } catch (err) {
    assert.fail(
      `expected anki-sync.js to add "germane" to the target deck despite an unrelated ` +
        `same-Front note existing in a different deck, but it failed:\n${err.stdout}${err.stderr}`
    );
  }

  assert.match(stdout, /Added "germane"/);

  const addNoteCall = mock.calls.find((c) => c.action === "addNote");
  assert.ok(addNoteCall, "expected an addNote call");
  assert.equal(
    addNoteCall.params.note.options && addNoteCall.params.note.options.duplicateScope,
    "deck",
    "addNote should scope its duplicate check to the target deck"
  );

  const targetDeckNotes = mock.notes.filter((n) => n.deckName === "Reading Room Terms" && n.fields.Front === "germane");
  assert.equal(targetDeckNotes.length, 1, "the note should have been added to the target deck");
});
