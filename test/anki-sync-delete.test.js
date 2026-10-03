// Coverage for scripts/anki-sync.js's `--delete <front>` mode — the cleanup
// verb for a note whose row has been removed from anki/*.txt. The sync proper
// is an upsert with no prune, so without this a deleted row's note lives on in
// the collection forever (the case that prompted it: folding the `omin-`
// word-part row into the whole-word `ominous` card).
//
// The guard under test matters as much as the deletion: `--delete` refuses a
// Front that is still a row in the file, so it can never remove a card that the
// next sync would re-add.
//
// Runs the real script end-to-end against an in-process mock AnkiConnect.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "anki-sync.js");
const ankiDir = path.join(repoRoot, "anki");
const testFileName = "anki-sync-delete.test.txt";
const testFilePath = path.join(ankiDir, testFileName);

const TERMS_DECK = "00 Reading Room::Terms";
const MEDICAL_DECK = "00 Reading Room::01 Medical Terms";

function createMockAnkiConnect() {
  let nextId = 1000;
  const notes = [];
  const calls = [];

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const { action, params } = JSON.parse(body);
      calls.push({ action, params });
      let result = null;
      const error = null;

      if (action === "createDeck") {
        result = 1;
      } else if (action === "findNotes") {
        const deckMatch = /deck:"([^"]*)"/.exec(params.query);
        const fieldMatch = /\s([A-Za-z]+):"([^"]*)"$/.exec(params.query);
        const deck = deckMatch ? deckMatch[1] : null;
        const front = fieldMatch ? fieldMatch[2] : null;
        result = notes
          .filter((n) => n.deckName === deck && n.fields.Front === front)
          .map((n) => n.id);
      } else if (action === "deleteNotes") {
        for (const id of params.notes) {
          const idx = notes.findIndex((n) => n.id === id);
          if (idx !== -1) notes.splice(idx, 1);
        }
        result = null;
      } else if (action === "addNote") {
        const note = params.note;
        const id = nextId++;
        notes.push({ id, deckName: note.deckName, fields: { ...note.fields }, tags: note.tags });
        result = id;
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

function run(args) {
  return execFileAsync("node", [scriptPath, ...args], {
    encoding: "utf8",
    env: { ...process.env, ANKI_FILE: testFileName, ANKI_CONNECT_URL: baseUrl },
  });
}

// Seeds a note directly, standing in for one added by an earlier sync of a row
// that the file has since dropped.
function seed(front, deckName) {
  mock.notes.push({
    id: 500 + mock.notes.length,
    deckName,
    fields: { Front: front, Back: "whatever was pushed before" },
    tags: [],
  });
}

test.beforeEach(async () => {
  mock = createMockAnkiConnect();
  await new Promise((resolve) => mock.server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${mock.server.address().port}`;

  fs.writeFileSync(
    testFilePath,
    [
      `#deck:${TERMS_DECK}`,
      "#notetype:Basic",
      "#tags:reading-room-terms",
      "#columns:Front\tBack\tImage\tIPA\tGloss\tDeck\tTags",
      "ominous\tOmmen watches Venus over almond trees, warning of a storm.\t\tˈɑm.ə.nəs\twarning that something bad is coming",
      `para-\t<i>Greek</i><br>beside, alongside\t\t\t\t${MEDICAL_DECK}\tmedical-word-parts`,
    ].join("\n") + "\n"
  );
});

test.afterEach(async () => {
  await new Promise((resolve) => mock.server.close(resolve));
  fs.rmSync(testFilePath, { force: true });
});

test("--delete removes a note whose row is no longer in the file", async () => {
  seed("omin-", MEDICAL_DECK);

  const { stdout } = await run(["--delete", "omin-"]);

  assert.match(stdout, /Deleted "omin-" from "00 Reading Room::01 Medical Terms" \(1 note\(s\)\)/);
  assert.equal(
    mock.notes.find((n) => n.fields.Front === "omin-"),
    undefined
  );
});

test("--delete searches the header deck as well as every row-level Deck override", async () => {
  seed("retired-word", TERMS_DECK);

  const { stdout } = await run(["--delete", "retired-word"]);

  assert.match(stdout, /Deleted "retired-word" from "00 Reading Room::Terms"/);
  const searched = mock.calls
    .filter((c) => c.action === "findNotes")
    .map((c) => /deck:"([^"]*)"/.exec(c.params.query)[1]);
  assert.deepEqual(new Set(searched), new Set([TERMS_DECK, MEDICAL_DECK]));
});

test("--deck scopes the search to one deck", async () => {
  seed("omin-", MEDICAL_DECK);

  await run(["--delete", "omin-", "--deck", MEDICAL_DECK]);

  const searched = mock.calls
    .filter((c) => c.action === "findNotes")
    .map((c) => /deck:"([^"]*)"/.exec(c.params.query)[1]);
  assert.deepEqual(searched, [MEDICAL_DECK]);
});

test("--delete refuses a Front that is still a row in the file, and deletes nothing", async () => {
  seed("ominous", TERMS_DECK);

  await assert.rejects(
    () => run(["--delete", "ominous"]),
    (err) => {
      assert.equal(err.code, 1);
      assert.match(err.stderr, /still a row in/);
      return true;
    }
  );

  assert.ok(mock.notes.find((n) => n.fields.Front === "ominous"));
  assert.equal(
    mock.calls.find((c) => c.action === "deleteNotes"),
    undefined
  );
});

test("--delete on an already-absent note succeeds and reports nothing to delete", async () => {
  const { stdout } = await run(["--delete", "never-existed"]);

  assert.match(stdout, /No note with Front "never-existed"/);
  assert.equal(
    mock.calls.find((c) => c.action === "deleteNotes"),
    undefined
  );
});

test("--deck without --delete is a usage error", async () => {
  await assert.rejects(
    () => run(["--deck", TERMS_DECK]),
    (err) => {
      assert.equal(err.code, 1);
      assert.match(err.stderr, /--deck is only valid with --delete/);
      return true;
    }
  );
});
