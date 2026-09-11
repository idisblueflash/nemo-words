// Coverage for the IPA field in scripts/anki-sync.js (ADR-0015).
//
// When an anki/*.txt row carries a fourth `IPA` column, anki-sync.js should
// append it to the composed Back as a small muted `/ipa/` line, after the
// image (if any) — the .txt Back column itself stays plain-text story.
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
const testFileName = "anki-sync-ipa-field.test.txt";
const testFilePath = path.join(ankiDir, testFileName);
const mediaRelDir = path.join("test", "fixtures", "anki-sync-ipa-field");
const mediaAbsDir = path.join(repoRoot, mediaRelDir);
const imageName = "widget.png";

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
        result = notes.filter((n) => n.deckName === deck && n.fields.Front === front).map((n) => n.id);
      } else if (action === "storeMediaFile") {
        result = params.filename;
      } else if (action === "addNote") {
        const note = params.note;
        const id = nextId++;
        notes.push({ id, deckName: note.deckName, modelName: note.modelName, fields: { ...note.fields } });
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

test.beforeEach(async () => {
  mock = createMockAnkiConnect();
  await new Promise((resolve) => mock.server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${mock.server.address().port}`;

  fs.mkdirSync(mediaAbsDir, { recursive: true });
  fs.writeFileSync(path.join(mediaAbsDir, imageName), Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]));

  fs.writeFileSync(
    testFilePath,
    [
      "#deck:Reading Room Terms",
      "#notetype:Basic",
      `#media-dir:${mediaRelDir}`,
      "#columns:Front\tBack\tImage\tIPA",
      `widget\tThe midget wound the fidget.\t${imageName}\tˈwɪd.ɪt`,
      "plainword\tNo image, has IPA.\t\tˈpleɪn.wɜrd",
      "noipaword\tNo IPA at all.\t\t",
    ].join("\n") + "\n"
  );
});

test.afterEach(async () => {
  await new Promise((resolve) => mock.server.close(resolve));
  fs.rmSync(testFilePath, { force: true });
  fs.rmSync(mediaAbsDir, { recursive: true, force: true });
});

test("a row with Image and IPA appends both, IPA after the image", async () => {
  await execFileAsync("node", [scriptPath, "widget"], {
    encoding: "utf8",
    env: { ...process.env, ANKI_FILE: testFileName, ANKI_CONNECT_URL: baseUrl },
  });

  const added = mock.notes.find((n) => n.fields.Front === "widget");
  assert.equal(
    added.fields.Back,
    'The midget wound the fidget.<br><img src="nemo-widget.png"><br><small style="opacity:0.6">/ˈwɪd.ɪt/</small>'
  );
});

test("a row with IPA but no image appends the IPA line directly after the story", async () => {
  await execFileAsync("node", [scriptPath, "plainword"], {
    encoding: "utf8",
    env: { ...process.env, ANKI_FILE: testFileName, ANKI_CONNECT_URL: baseUrl },
  });

  const added = mock.notes.find((n) => n.fields.Front === "plainword");
  assert.equal(
    added.fields.Back,
    'No image, has IPA.<br><small style="opacity:0.6">/ˈpleɪn.wɜrd/</small>'
  );
});

test("a row with an empty IPA column pushes plain story with no IPA line", async () => {
  await execFileAsync("node", [scriptPath, "noipaword"], {
    encoding: "utf8",
    env: { ...process.env, ANKI_FILE: testFileName, ANKI_CONNECT_URL: baseUrl },
  });

  const added = mock.notes.find((n) => n.fields.Front === "noipaword");
  assert.equal(added.fields.Back, "No IPA at all.");
});
