// Shared harness for the US-028 one-word card pipeline tests.
//
// Nothing here touches the network, a live Anki, or the real
// anki/reading-room-terms.txt / anki/sync.log / data/mnemonics/log.jsonl:
//   - `claude`, `nemo-words` and `word-freq.js` are replaced by fake
//     executables (written to a temp dir) that answer from a JSON fixture;
//   - AnkiConnect is an in-process mock HTTP server (or a closed port, for
//     "Anki is not running");
//   - the card file is a throwaway `anki/<unique>.test.txt` (anki-sync.js
//     only accepts a filename under anki/), and the sync log and mnemonic log
//     live in the temp dir.
//
// This file sits under test/ so `node --test` loads it as a (test-less) file;
// it only defines functions, so that's harmless.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");

const repoRoot = path.join(__dirname, "..", "..");
const scriptsDir = path.join(repoRoot, "scripts");

const TERMS_HEADER = [
  "#separator:tab",
  "#html:true",
  "#notetype:Basic",
  "#deck:00 Reading Room::Terms",
  "#tags:reading-room-terms",
  "#media-dir:images/mnemonic",
  "#columns:Front\tBack\tImage\tIPA\tGloss\tDeck\tTags",
];

// Fake `nemo-words`: supports `ipa-lookup --word <w>` and `ipa-lookup --ga <frag>`,
// printing `word\tRP\tGA` like the real CLI (nothing on no hit).
const FAKE_NEMO_WORDS = `#!/usr/bin/env node
const fx = JSON.parse(require("fs").readFileSync(process.env.NEMO_FAKE_FIXTURE, "utf8"));
const dict = fx.dict || {};
const [sub, flag, value] = process.argv.slice(2);
if (sub !== "ipa-lookup") process.exit(2);
const strip = (s) => s.replace(/[ˈˌ]/g, "");
for (const [w, ga] of Object.entries(dict)) {
  if (flag === "--word" && w === String(value).toLowerCase()) console.log(w + "\\t\\t" + ga);
  if (flag === "--ga" && ga.split(",").some((v) => strip(v).includes(value))) console.log(w + "\\t\\t" + ga);
}
`;

// Fake \`word-freq.js\`: \`word\\tfreq\` per arg, \`(not found)\` when absent.
const FAKE_WORD_FREQ = `#!/usr/bin/env node
const fx = JSON.parse(require("fs").readFileSync(process.env.NEMO_FAKE_FIXTURE, "utf8"));
const freqs = fx.freqs || {};
for (const w of process.argv.slice(2)) {
  console.log(w + "\\t" + (w in freqs ? Number(freqs[w]).toExponential(4) : "(not found)"));
}
`;

// Fake \`claude -p <prompt>\`: answers by the prompt's \`Step: <name>\` line.
// Records every prompt it sees so tests can assert how often the model ran.
const FAKE_CLAUDE = `#!/usr/bin/env node
const fs = require("fs");
const fx = JSON.parse(fs.readFileSync(process.env.NEMO_FAKE_FIXTURE, "utf8"));
const args = process.argv.slice(2);
const prompt = args[args.indexOf("-p") + 1] || "";
const m = /^Step: (\\S+)/m.exec(prompt);
const step = m ? m[1] : "?";
fs.appendFileSync(process.env.NEMO_FAKE_CLAUDE_LOG, JSON.stringify({ step, prompt }) + "\\n");
if (!(fx.claude && step in fx.claude)) { console.error("fake claude: no answer for " + step); process.exit(3); }
process.stdout.write(fx.claude[step]);
`;

function writeExecutable(file, body) {
  fs.writeFileSync(file, body);
  fs.chmodSync(file, 0o755);
}

function createMockAnkiConnect() {
  let nextId = 1000;
  const notes = [];
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const { action, params } = JSON.parse(body);
      calls.push({ action, params });
      let result = null;
      if (action === "createDeck") result = 1;
      else if (action === "findNotes") {
        const deck = (/deck:"([^"]*)"/.exec(params.query) || [])[1];
        const front = (/\s([A-Za-z]+):"([^"]*)"$/.exec(params.query) || [])[2];
        result = notes.filter((n) => n.deckName === deck && n.fields.Front === front).map((n) => n.id);
      } else if (action === "addNote") {
        const id = nextId++;
        notes.push({ id, deckName: params.note.deckName, fields: { ...params.note.fields } });
        result = id;
      } else if (action === "notesInfo") {
        result = params.notes.map((id) => {
          const n = notes.find((x) => x.id === id);
          const fields = {};
          for (const [k, v] of Object.entries(n.fields)) fields[k] = { value: v };
          return { fields };
        });
      } else if (action === "updateNoteFields") {
        const n = notes.find((x) => x.id === params.note.id);
        Object.assign(n.fields, params.note.fields);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result, error: null }));
    });
  });
  return { server, notes, calls };
}

// fixture: { dict, freqs, claude: { define, gloss, "compose-stories" } }
// options: { rows: [tsv row strings], log: [jsonl objects], anki: "up" | "down" }
async function createHarness(fixture, options = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nemo-card-test-"));
  const fixturePath = path.join(tmp, "fixture.json");
  fs.writeFileSync(fixturePath, JSON.stringify(fixture));
  const bins = {
    claude: path.join(tmp, "fake-claude"),
    nemoWords: path.join(tmp, "fake-nemo-words"),
    wordFreq: path.join(tmp, "fake-word-freq"),
  };
  writeExecutable(bins.claude, FAKE_CLAUDE);
  writeExecutable(bins.nemoWords, FAKE_NEMO_WORDS);
  writeExecutable(bins.wordFreq, FAKE_WORD_FREQ);

  const ankiFileName = `card-pipeline-${process.pid}-${path.basename(tmp)}.test.txt`;
  const ankiFilePath = path.join(repoRoot, "anki", ankiFileName);
  fs.writeFileSync(ankiFilePath, [...TERMS_HEADER, ...(options.rows || [])].join("\n") + "\n");

  const mnemonicLog = path.join(tmp, "log.jsonl");
  fs.writeFileSync(mnemonicLog, (options.log || []).map((r) => JSON.stringify(r) + "\n").join(""));
  const syncLog = path.join(tmp, "sync.log");
  const claudeLog = path.join(tmp, "claude-calls.jsonl");
  fs.writeFileSync(claudeLog, "");

  const mock = createMockAnkiConnect();
  await new Promise((r) => mock.server.listen(0, "127.0.0.1", r));
  const port = mock.server.address().port;
  if (options.anki === "down") await new Promise((r) => mock.server.close(r));

  const env = {
    ...process.env,
    NEMO_FAKE_FIXTURE: fixturePath,
    NEMO_FAKE_CLAUDE_LOG: claudeLog,
    NEMO_CLAUDE_BIN: bins.claude,
    NEMO_WORDS_BIN: bins.nemoWords,
    NEMO_WORD_FREQ_BIN: bins.wordFreq,
    ANKI_FILE: ankiFileName,
    ANKI_CONNECT_URL: `http://127.0.0.1:${port}`,
    ANKI_SYNC_LOG: syncLog,
    NEMO_MNEMONIC_LOG: mnemonicLog,
  };

  // Runs a script under scripts/ with stdin closed (so a step that tried to
  // prompt would get EOF instead of hanging), collecting stdout/stderr/code.
  function runScript(script, args) {
    return new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(scriptsDir, script), ...args], {
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => (stdout += d));
      child.stderr.on("data", (d) => (stderr += d));
      child.on("close", (code) => resolve({ code, stdout, stderr }));
    });
  }

  return {
    env,
    tmp,
    mock,
    ankiFilePath,
    syncLog,
    runScript,
    runCard: (word) => runScript("card.js", [word]),
    readAnkiFile: () => fs.readFileSync(ankiFilePath, "utf8"),
    writeFile(name, text) {
      const p = path.join(tmp, name);
      fs.writeFileSync(p, text);
      return p;
    },
    claudeCalls: () =>
      fs.readFileSync(claudeLog, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)),
    async cleanup() {
      if (options.anki !== "down") await new Promise((r) => mock.server.close(r));
      fs.rmSync(ankiFilePath, { force: true });
      fs.rmSync(tmp, { recursive: true, force: true });
    },
  };
}

// The "germane" fixture used by several ACs: GA dʒɚmˈeɪn, syllables
// dʒɚ.ˈmeɪn — no common exact match for /dʒɚ/, "main" for /meɪn/.
function germaneFixture(stories) {
  return {
    dict: {
      germane: "dʒɚmˈeɪn",
      main: "mˈeɪn",
      mane: "mˈeɪn",
      maine: "mˈeɪn",
      remain: "ɹɪmˈeɪn",
      jermaine: "dʒɚmˈeɪn",
    },
    freqs: { main: 1.28e-4, mane: 1.8e-6, maine: 7.1e-8, remain: 9e-5, jermaine: 1.2e-10 },
    claude: {
      define: JSON.stringify({
        primarySense: "relevant",
        definition: "relevant and fitting to the subject under discussion",
        senses: ["relevant", "pertinent", "fitting"],
      }),
      gloss: "relevant to the matter at hand",
      "compose-stories": JSON.stringify(
        stories || [
          { sentence: "The main point stays relevant to the talk.", pivots: ["main", "relevant"] },
          { sentence: "The germane point stays relevant.", pivots: ["main", "relevant"] },
          { sentence: "Main ideas remain relevant for the whole long winding talk tonight.", pivots: ["main", "relevant"] },
          { sentence: "A mane of hair is relevant.", pivots: ["mane", "relevant"] },
          { sentence: "The main road is long.", pivots: ["main"] },
        ]
      ),
    },
  };
}

module.exports = { createHarness, germaneFixture, TERMS_HEADER, repoRoot };
