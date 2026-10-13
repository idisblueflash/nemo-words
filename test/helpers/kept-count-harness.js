"use strict";

// Harness for US-033's kept-count command (scripts/kept-count.js): a throwaway
// mnemonic log, a throwaway card file under anki/ and an in-process mock
// AnkiConnect, so the real script runs end to end with no live Anki.
//
//   const h = await createKeptHarness();
//   h.autoPick("wary", "A wary hare ...", { date: "2026-10-01" });   // log row
//   h.card("wary", h.composed("A wary hare ..."), { reps: 3 });       // live note
//   const { code, stdout, stderr } = await h.run();
//   await h.close();

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");

const repoRoot = path.join(__dirname, "..", "..");
const scriptPath = path.join(repoRoot, "scripts", "kept-count.js");

const TERMS_DECK = "00 Reading Room::Terms";
const TERMS_HEADER = [
  "#separator:tab",
  "#html:true",
  "#notetype:Basic",
  `#deck:${TERMS_DECK}`,
  "#tags:reading-room-terms",
  "#media-dir:images/mnemonic",
  "#columns:Front\tBack\tImage\tIPA\tGloss\tDeck\tTags",
];

function createMockAnkiConnect() {
  const notes = []; // { id, deckName, fields: { Front, Back }, cards: [{ id, reps }] }
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const { action, params } = JSON.parse(body);
      calls.push({ action, params });
      let result = null;
      let error = null;
      try {
        result = answer(action, params);
      } catch (e) {
        // a request the mock can't answer is an AnkiConnect error, never a hang
        error = `mock AnkiConnect: ${action}: ${e.message}`;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result, error }));
    });
  });

  function answer(action, params) {
    if (action === "findNotes") {
      const deck = (/deck:"([^"]*)"/.exec(params.query) || [])[1];
      const front = (/\s([A-Za-z]+):"([^"]*)"$/.exec(params.query) || [])[2];
      return notes.filter((n) => n.deckName === deck && n.fields.Front === front).map((n) => n.id);
    }
    if (action === "notesInfo") {
      return params.notes.map((id) => {
        const n = notes.find((x) => x.id === id);
        if (!n) return {}; // as AnkiConnect answers for an unknown note id
        const fields = {};
        for (const [k, v] of Object.entries(n.fields)) fields[k] = { value: v };
        return { noteId: n.id, fields, cards: n.cards.map((c) => c.id) };
      });
    }
    if (action === "cardsInfo") {
      const all = notes.flatMap((n) => n.cards.map((c) => ({ cardId: c.id, note: n.id, reps: c.reps })));
      return params.cards.map((id) => all.find((c) => c.cardId === id));
    }
    return null;
  }

  return { server, notes, calls };
}

// The Back that anki-sync.js's composeBack pushes: image, story, gloss, IPA.
function composed(story, { image = "", gloss = "", ipa = "" } = {}) {
  const pieces = [];
  if (image) pieces.push(`<img src="nemo-${image}">`);
  pieces.push(story);
  if (gloss) pieces.push(`<small style="opacity:0.75"><i>${gloss}</i></small>`);
  if (ipa) pieces.push(`<small style="opacity:0.6">/${ipa}/</small>`);
  return pieces.join("<br>");
}

async function createKeptHarness({ anki = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kept-count-"));
  const logPath = path.join(dir, "log.jsonl");
  fs.writeFileSync(logPath, "");
  const cardFileName = `kept-count-${process.pid}-${path.basename(dir)}.test.txt`;
  const cardFilePath = path.join(repoRoot, "anki", cardFileName);
  fs.writeFileSync(cardFilePath, `${TERMS_HEADER.join("\n")}\n`);

  const mock = createMockAnkiConnect();
  await new Promise((resolve) => mock.server.listen(0, "127.0.0.1", resolve));
  const port = mock.server.address().port;
  // "Anki isn't running": take the free port, then close it again.
  if (!anki) await new Promise((resolve) => mock.server.close(resolve));

  let nextId = 1000;
  const h = {
    dir,
    logPath,
    cardFilePath,
    mock,
    composed,
    TERMS_DECK,
    // Appends one mnemonic-log row. `picked_by` defaults to "auto".
    log(row) {
      fs.appendFileSync(logPath, `${JSON.stringify(row)}\n`);
    },
    autoPick(word, sentence, { date = "2026-10-01", ...rest } = {}) {
      h.log({ word, sentence, date, picked_by: "auto", ...rest });
    },
    // Puts a live note in the mock collection. `reps` is the review count of
    // its one card; pass `cards: [n, m]` for a note with several cards.
    card(front, back, { reps = 1, cards, deck = TERMS_DECK } = {}) {
      const id = nextId++;
      const reviewCounts = cards || [reps];
      mock.notes.push({
        id,
        deckName: deck,
        fields: { Front: front, Back: back },
        cards: reviewCounts.map((r, i) => ({ id: id * 10 + i, reps: r })),
      });
      return id;
    },
    // Adds a row to the card file (only needed for a row-level Deck override).
    cardRow(line) {
      fs.appendFileSync(cardFilePath, `${line}\n`);
    },
    run(args = [], env = {}) {
      return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [scriptPath, ...args], {
          env: {
            ...process.env,
            NEMO_MNEMONIC_LOG: logPath,
            ANKI_FILE: cardFileName,
            ANKI_CONNECT_URL: `http://127.0.0.1:${port}`,
            ...env,
          },
          stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (c) => (stdout += c));
        child.stderr.on("data", (c) => (stderr += c));
        child.on("error", reject);
        child.on("close", (code) => resolve({ code, stdout, stderr }));
      });
    },
    async close() {
      if (anki) await new Promise((resolve) => mock.server.close(resolve));
      fs.rmSync(cardFilePath, { force: true });
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
  return h;
}

module.exports = { createKeptHarness, composed, TERMS_DECK, repoRoot, scriptPath };
