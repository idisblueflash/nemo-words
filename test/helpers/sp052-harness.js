// Shared harness for the SP-052 spike tests (NOAD vs CMU sound anchors).
//
// Nothing here reads the Mac's real NOAD, the network or the real card file /
// mnemonic log: the NOAD extract is a tiny hand-written `noad.tsv` in a temp
// dir, `nemo-words` and `word-freq.js` are fake executables answering from a
// JSON fixture, and the card file and log are temp files.
//
// This file sits under test/ so `node --test` loads it as a (test-less) file;
// it only defines functions, so that's harmless.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..", "..");
const RUN = path.join(repoRoot, "spikes", "sp-052", "run.js");

const CARD_HEADER = [
  "#separator:tab",
  "#html:true",
  "#notetype:Basic",
  "#deck:00 Reading Room::Terms",
  "#tags:reading-room-terms",
  "#columns:Front\tBack\tImage\tIPA\tGloss\tDeck\tTags",
];

// Fake `nemo-words ipa-lookup --word <w>` / `--ga <frag>` (an empty fragment
// matches every row, as the real CLI does), printing `word\tRP\tGA`.
const FAKE_NEMO_WORDS = `#!/usr/bin/env node
const fx = JSON.parse(require("fs").readFileSync(require("path").join(__dirname, "fixture.json"), "utf8"));
const dict = fx.cmu || {};
const [sub, flag, value] = process.argv.slice(2);
if (sub !== "ipa-lookup") process.exit(2);
const strip = (s) => s.replace(/[ˈˌ]/g, "");
for (const [w, ga] of Object.entries(dict)) {
  if (flag === "--word" && w === String(value).toLowerCase()) console.log(w + "\\t\\t" + ga);
  if (flag === "--ga" && ga.split(",").some((v) => strip(v).includes(value))) console.log(w + "\\t\\t" + ga);
}
`;

// Fake \`word-freq.js\`: \`word\\tfreq\` per arg, \`(not found)\` when absent.
// Every call's word list is recorded so tests can see what was asked.
const FAKE_WORD_FREQ = `#!/usr/bin/env node
const fs = require("fs");
const p = require("path");
const fx = JSON.parse(fs.readFileSync(p.join(__dirname, "fixture.json"), "utf8"));
const freqs = fx.freqs || {};
const words = process.argv.slice(2);
fs.appendFileSync(p.join(__dirname, "freq-calls.jsonl"), JSON.stringify(words) + "\\n");
for (const w of words) console.log(w + "\\t" + (w in freqs ? Number(freqs[w]).toExponential(4) : "(not found)"));
`;

function writeExecutable(file, body) {
  fs.writeFileSync(file, body);
  fs.chmodSync(file, 0o755);
}

// One NOAD extract row: { word, kind: "hw"|"der", hom, ipas: [..], respell }.
function noadLine({ word, kind = "hw", hom = "", ipas = [], respell = ipas.length > 0 }) {
  return [word, kind, hom, ipas.join(";"), respell ? "1" : "0"].join("\t");
}

// fixture: {
//   card: [[front, back, tags?]...], log: [word...],
//   noad: [noadLine args...] (omit with noad: null for "extract missing"),
//   cmu: { word: "GA[,GA…]" }, freqs: { word: number },
// }
function createHarness(fixture) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sp052-"));
  const binDir = path.join(dir, "bin");
  const extractDir = path.join(dir, "noad-data");
  fs.mkdirSync(binDir);
  fs.mkdirSync(extractDir);
  fs.writeFileSync(path.join(binDir, "fixture.json"), JSON.stringify(fixture));
  writeExecutable(path.join(binDir, "nemo-words"), FAKE_NEMO_WORDS);
  writeExecutable(path.join(binDir, "word-freq"), FAKE_WORD_FREQ);

  const cardFile = path.join(dir, "card.txt");
  const cardRows = (fixture.card || []).map(([front, back = "a story", tags = ""]) =>
    [front, back, "", "", "", tags ? "00 Reading Room::01 Medical Terms" : "", tags].join("\t")
  );
  fs.writeFileSync(cardFile, [...CARD_HEADER, ...cardRows].join("\n") + "\n");

  const logFile = path.join(dir, "log.jsonl");
  fs.writeFileSync(logFile, (fixture.log || []).map((w) => JSON.stringify({ word: w, sentence: "s" })).join("\n") + "\n");

  if (fixture.noad !== null) {
    fs.writeFileSync(path.join(extractDir, "noad.tsv"), (fixture.noad || []).map(noadLine).join("\n") + "\n");
  }

  const reportFile = path.join(dir, "report.md");
  const detailFile = path.join(extractDir, "sp-052-detail.tsv");

  function run(extraArgs = []) {
    const args = [
      RUN,
      "--card-file", cardFile,
      "--log-file", logFile,
      "--extract-dir", extractDir,
      "--report", reportFile,
      "--seed", String(fixture.seed || 52),
      "--sample-size", String(fixture.sampleSize || 0),
      ...extraArgs,
    ];
    const r = spawnSync(process.execPath, args, {
      encoding: "utf8",
      env: {
        ...process.env,
        NEMO_WORDS_BIN: path.join(binDir, "nemo-words"),
        NEMO_WORD_FREQ_BIN: path.join(binDir, "word-freq"),
      },
    });
    return { code: r.status, stdout: r.stdout, stderr: r.stderr };
  }

  const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null);
  // Detail TSV -> [{ column: value }] keyed by its header line.
  function detail() {
    const text = read(detailFile);
    if (text === null) return null;
    const [head, ...lines] = text.trim().split("\n");
    const cols = head.split("\t");
    return lines.map((l) => Object.fromEntries(l.split("\t").map((v, i) => [cols[i], v])));
  }

  return {
    dir,
    extractDir,
    reportFile,
    detailFile,
    run,
    report: () => read(reportFile),
    detail,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

module.exports = { createHarness, noadLine, repoRoot };
