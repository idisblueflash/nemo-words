// Shared harness for the US-028 one-word card pipeline tests.
//
// Nothing here touches the network, a live Anki, or the real
// anki/reading-room-terms.txt / anki/sync.log / data/mnemonics/log.jsonl:
//   - `claude`, `nemo-words` and `word-freq.js` are replaced by fake
//     executables (written to a temp dir) that answer from a JSON fixture;
//   - AnkiConnect is an in-process mock HTTP server (or a closed port, for
//     "Anki is not running");
//   - Jev (TypeSafe's systemOne API, US-039's tag-technique) is an in-process
//     mock HTTP server too, reached through a throwaway env file
//     (NEMO_JEV_ENV_FILE) holding a fake key and the mock's base URL — so the
//     repo's real `.env` key is never read and the network never reached;
//   - the card file is a throwaway `anki/<unique>.test.txt` (anki-sync.js
//     only accepts a filename under anki/), and the sync log, mnemonic log
//     and alternates log live in the temp dir.
//
// This file sits under test/ so `node --test` loads it as a (test-less) file;
// it only defines functions, so that's harmless.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");

const repoRoot = path.join(__dirname, "..", "..");

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
const fx = JSON.parse(require("fs").readFileSync(require("path").join(__dirname, "fixture.json"), "utf8"));
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
const fx = JSON.parse(require("fs").readFileSync(require("path").join(__dirname, "fixture.json"), "utf8"));
const freqs = fx.freqs || {};
for (const w of process.argv.slice(2)) {
  console.log(w + "\\t" + (w in freqs ? Number(freqs[w]).toExponential(4) : "(not found)"));
}
`;

// Fake \`claude -p <prompt>\`: answers by the prompt's \`Step: <name>\` line.
// Records every prompt it sees so tests can assert how often the model ran.
const FAKE_CLAUDE = `#!/usr/bin/env node
const fs = require("fs");
const fx = JSON.parse(fs.readFileSync(require("path").join(__dirname, "fixture.json"), "utf8"));
const args = process.argv.slice(2);
const prompt = args[args.indexOf("-p") + 1] || "";
const m = /^Step: (\\S+)/m.exec(prompt);
const step = m ? m[1] : "?";
fs.appendFileSync(require("path").join(__dirname, "claude-calls.jsonl"), JSON.stringify({ step, prompt }) + "\\n");
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

// Mock Jev: `POST /v1/systemone`. Records each request so tests can assert
// what Jev was asked.
//   - When the request's `state.word` is a key of `fixture.jevByWord`
//     (US-040's route-accuracy check), every question gets that word's value;
//     the value "http-500" makes the mock answer HTTP 500 instead.
//   - A story-judging request (US-038's judge-stories: it holds `score`
//     questions) is answered from `fixture.judge[<state.sentence>][name]`:
//     a p for a noul question, a 0–2 level for a score question. Unlisted
//     questions pass: noul 0.9, score 1 (axis score 2).
//   - Any other request (US-039's tag-technique, US-040's judge-route) gets the
//     fixture's p per question name (`fixture.jev[name]`, default 0.1).
const isJudgeCall = (body) => Object.values((body && body.questions) || {}).some((q) => q.type === "score");

function createMockJev(fixture) {
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const parsed = JSON.parse(body || "{}");
      calls.push({ method: req.method, path: req.url, auth: req.headers.authorization, body: parsed });
      const byWord = fixture.jevByWord || {};
      const word = parsed.state && parsed.state.word;
      const perWord = Object.prototype.hasOwnProperty.call(byWord, word);
      if (perWord && byWord[word] === "http-500") {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "mock Jev: internal error" }));
        return;
      }
      const answers = {};
      if (isJudgeCall(parsed)) {
        const given = (fixture.judge || {})[parsed.state && parsed.state.sentence] || {};
        for (const [name, q] of Object.entries(parsed.questions)) {
          const v = name in given ? given[name] : q.type === "score" ? 1 : 0.9;
          answers[name] =
            q.type === "score"
              ? { type: "score", score: v, confidence: 0.8, legend: {}, probabilities: {} }
              : { type: "noul", noul: v };
        }
      } else {
        for (const name of Object.keys(parsed.questions || {})) {
          if (perWord) answers[name] = { noul: byWord[word] };
          else answers[name] = { noul: name in (fixture.jev || {}) ? fixture.jev[name] : 0.1 };
        }
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ answers, model: "jev-mock" }));
    });
  });
  return {
    server,
    calls,
    judgeCalls: () => calls.filter((c) => isJudgeCall(c.body)),
    tagCalls: () => calls.filter((c) => !isJudgeCall(c.body)),
  };
}

// fixture: { dict, freqs, claude: { define, gloss, "compose-stories" }, jev: { <tag>: p },
//            judge: { <sentence>: { <question name>: p | level } } }
// options: { rows: [tsv row strings], log: [jsonl objects], anki: "up" | "down",
//            arm: NEMO_ARM for the run (US-051), default "story" so the story
//            path tests never land in the control arm by chance; null = unset (a real draw),
//            jev: "up" | "down" | "unconfigured" (no API key),
//            root: repo copy to run from (default: this repo), cwd: where to run }
async function createHarness(fixture, options = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nemo-card-test-"));
  const fixturePath = path.join(tmp, "fixture.json");
  const daguHome = path.join(tmp, "dagu home"); // the space mirrors macOS's "Application Support"
  fs.mkdirSync(daguHome);
  // options.root: run against a copy of the repo (a "fresh clone") instead
  const root = options.root || repoRoot;
  const scripts = path.join(root, "scripts");
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
  fs.mkdirSync(path.join(root, "anki"), { recursive: true });
  const ankiFilePath = path.join(root, "anki", ankiFileName);
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

  const alternatesLog = path.join(tmp, "alternates.jsonl");
  const jev = createMockJev(fixture);
  await new Promise((r) => jev.server.listen(0, "127.0.0.1", r));
  const jevPort = jev.server.address().port;
  if (options.jev === "down") await new Promise((r) => jev.server.close(r));
  const jevEnvFile = path.join(tmp, "jev.env");
  fs.writeFileSync(
    jevEnvFile,
    options.jev === "unconfigured" ? "" : `TYPESAFE_API_KEY=test-key\nTYPESAFE_BASE_URL=http://127.0.0.1:${jevPort}\n`
  );

  const env = {
    ...process.env,
    // A step's own fetch must reach the local mocks directly, never via a proxy.
    HTTP_PROXY: "",
    HTTPS_PROXY: "",
    http_proxy: "",
    https_proxy: "",
    // card.js runs the pipeline under Dagu: a throwaway DAGU_HOME keeps test
    // runs out of Flash's real Dagu history. (The fakes find fixture.json and
    // claude-calls.jsonl next to themselves, since Dagu forwards only the
    // pipeline's declared overrides to steps, not test-only env vars.)
    DAGU_HOME: daguHome,
    NEMO_CLAUDE_BIN: bins.claude,
    NEMO_WORDS_BIN: bins.nemoWords,
    NEMO_WORD_FREQ_BIN: bins.wordFreq,
    ANKI_FILE: ankiFileName,
    ANKI_CONNECT_URL: `http://127.0.0.1:${port}`,
    ANKI_SYNC_LOG: syncLog,
    NEMO_MNEMONIC_LOG: mnemonicLog,
    NEMO_ALTERNATES_LOG: alternatesLog,
    NEMO_JEV_ENV_FILE: jevEnvFile,
  };
  // US-051: the story/control draw. Pinned to the story arm unless a test asks.
  const arm = options.arm === undefined ? "story" : options.arm;
  if (arm === null) delete env.NEMO_ARM;
  else env.NEMO_ARM = arm;

  // Runs a script under scripts/ with stdin closed (so a step that tried to
  // prompt would get EOF instead of hanging), collecting stdout/stderr/code.
  function runScript(script, args) {
    return new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(scripts, script), ...args], {
        env,
        cwd: options.cwd || root,
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
    daguHome,
    mock,
    jev,
    ankiFilePath,
    syncLog,
    mnemonicLog,
    alternatesLog,
    jevEnvFile,
    runScript,
    runCard: (word) => runScript("card.js", [word]),
    readAnkiFile: () => fs.readFileSync(ankiFilePath, "utf8"),
    writeFile(name, text) {
      const p = path.join(tmp, name);
      fs.writeFileSync(p, text);
      return p;
    },
    // A JSON-lines file as an array of objects ([] when it doesn't exist).
    readJsonl: (file) =>
      fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [],
    claudeCalls: () =>
      fs.readFileSync(claudeLog, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)),
    async cleanup() {
      if (options.anki !== "down") await new Promise((r) => mock.server.close(r));
      if (options.jev !== "down") await new Promise((r) => jev.server.close(r));
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
    // Jev's p per technique tag (US-039's tag-technique); unlisted tags get
    // the mock's default 0.1. story-chain tops the list but is ruled out in
    // code (the pick has only 2 pivot words), so the logged tags are
    // keyword-method + scene-depicts-meaning (second tag kept at p ≥ 0.5).
    jev: { "story-chain": 0.95, "keyword-method": 0.91, "scene-depicts-meaning": 0.62, homophone: 0.4 },
  };
}

// US-040: "wary" — the classifier calls it ambiguous (a weak -ary match only).
// GA wˈɛɹi, syllables ˈwɛ.ɹi. The ɹi chunk is anchored by "re" (US-041: a card
// needs at least one anchored chunk); the wɛ chunk has no common exact match. `jev` sets Jev's answers by question name: `word_part`
// is judge-route's p that the word belongs on the word-part path.
function waryFixture(jev = {}) {
  return {
    dict: { wary: "wˈɛɹi", re: "ɹˈi" },
    freqs: { re: 3e-5 },
    claude: {
      define: JSON.stringify({
        primarySense: "careful",
        definition: "careful and cautious about possible dangers or problems",
        senses: ["careful", "cautious"],
      }),
      gloss: "cautious about possible danger",
      "compose-stories": JSON.stringify([
        { sentence: "The weary hiker stays careful near the cliff, re safety.", pivots: ["weary", "careful"] },
      ]),
    },
    jev,
  };
}

// A copy of the pipeline (dags/ + scripts/ code, no data) at `clone`, for a
// test that breaks one of its files (pass it to createHarness as `root`).
function clonePipeline(clone) {
  fs.mkdirSync(path.join(clone, "scripts"), { recursive: true });
  const tables = path.join(".claude", "agents", "_logan", "reference-tables.md");
  fs.mkdirSync(path.dirname(path.join(clone, tables)), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, tables), path.join(clone, tables));
  fs.cpSync(path.join(repoRoot, "dags"), path.join(clone, "dags"), { recursive: true });
  fs.cpSync(path.join(repoRoot, "scripts", "lib"), path.join(clone, "scripts", "lib"), { recursive: true });
  for (const f of fs.readdirSync(path.join(repoRoot, "scripts"))) {
    if (/\.(js|json)$/.test(f)) fs.copyFileSync(path.join(repoRoot, "scripts", f), path.join(clone, "scripts", f));
  }
  return clone;
}

// Today's local date, YYYY-MM-DD (the `date` a new log row gets).
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

module.exports = { createHarness, clonePipeline, germaneFixture, waryFixture, today, TERMS_HEADER, repoRoot };
