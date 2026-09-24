// Coverage for the per-row Deck / Tags override columns in scripts/anki-sync.js
// (ADR-0016), added when anki/medical-word-parts.txt was merged into
// anki/reading-room-terms.txt. A row's optional fifth `Deck` column and sixth
// `Tags` column override the file's `#deck`/`#tags` header for that row only,
// so one file can still route rows to two different decks/tags — e.g. plain
// vocabulary rows stay on the header's deck/tags, former word-part rows route
// to the medical deck with the medical tag.
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
const testFileName = "anki-sync-deck-tags-override.test.txt";
const testFilePath = path.join(ankiDir, testFileName);

function createMockAnkiConnect() {
  let nextId = 1000;
  const notes = [];
  const calls = [];
  const decksCreated = [];

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const { action, params } = JSON.parse(body);
      calls.push({ action, params });
      let result = null;
      let error = null;

      if (action === "createDeck") {
        decksCreated.push(params.deck);
        result = 1;
      } else if (action === "findNotes") {
        const deckMatch = /deck:"([^"]*)"/.exec(params.query);
        const fieldMatch = /\s([A-Za-z]+):"([^"]*)"$/.exec(params.query);
        const deck = deckMatch ? deckMatch[1] : null;
        const front = fieldMatch ? fieldMatch[2] : null;
        result = notes.filter((n) => n.deckName === deck && n.fields.Front === front).map((n) => n.id);
      } else if (action === "addNote") {
        const note = params.note;
        const id = nextId++;
        notes.push({ id, deckName: note.deckName, modelName: note.modelName, fields: { ...note.fields }, tags: note.tags });
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

  return { server, calls, notes, decksCreated };
}

let mock;
let baseUrl;

test.beforeEach(async () => {
  mock = createMockAnkiConnect();
  await new Promise((resolve) => mock.server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${mock.server.address().port}`;

  fs.writeFileSync(
    testFilePath,
    [
      "#deck:00 Reading Room::Terms",
      "#notetype:Basic",
      "#tags:reading-room-terms",
      "#columns:Front\tBack\tImage\tIPA\tDeck\tTags",
      "cracks\tOld sidewalk tracks reveal a web of thin cracks.\t\t\t\t",
      "para-\t<i>Greek</i><br>beside, alongside\t\t\t00 Reading Room::01 Medical Terms\tmedical-word-parts",
    ].join("\n") + "\n"
  );
});

test.afterEach(async () => {
  await new Promise((resolve) => mock.server.close(resolve));
  fs.rmSync(testFilePath, { force: true });
});

test("a row with no Deck/Tags override uses the file header's deck and tags", async () => {
  await execFileAsync("node", [scriptPath, "cracks"], {
    encoding: "utf8",
    env: { ...process.env, ANKI_FILE: testFileName, ANKI_CONNECT_URL: baseUrl },
  });

  const added = mock.notes.find((n) => n.fields.Front === "cracks");
  assert.equal(added.deckName, "00 Reading Room::Terms");
  assert.deepEqual(added.tags, ["reading-room-terms"]);
});

test("a row's Deck/Tags columns override the header for just that row", async () => {
  await execFileAsync("node", [scriptPath, "para-"], {
    encoding: "utf8",
    env: { ...process.env, ANKI_FILE: testFileName, ANKI_CONNECT_URL: baseUrl },
  });

  const added = mock.notes.find((n) => n.fields.Front === "para-");
  assert.equal(added.deckName, "00 Reading Room::01 Medical Terms");
  assert.deepEqual(added.tags, ["medical-word-parts"]);
});

test("createDeck is called for both the header's deck and every row-level Deck override", async () => {
  await execFileAsync("node", [scriptPath], {
    encoding: "utf8",
    env: { ...process.env, ANKI_FILE: testFileName, ANKI_CONNECT_URL: baseUrl },
  });

  assert.deepEqual(
    new Set(mock.decksCreated),
    new Set(["00 Reading Room::Terms", "00 Reading Room::01 Medical Terms"])
  );
});
