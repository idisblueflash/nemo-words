// US-040 unit coverage: how scripts/route-accuracy.js builds its labelled set,
// and its report path check (AC13).

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { labelledSet, frontWord, exampleWords, unwritableReason } = require("../scripts/route-accuracy");

test("route-accuracy: an existing writable report passes the check and is left as it was", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nemo-ra-unit-"));
  try {
    const file = path.join(dir, "report.md");
    fs.writeFileSync(file, "saved report");
    const before = fs.statSync(file).mtimeMs;
    assert.equal(unwritableReason(file), null);
    assert.equal(fs.readFileSync(file, "utf8"), "saved report");
    assert.equal(fs.statSync(file).mtimeMs, before);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("route-accuracy: a directory, a read-only file and a path under a file fail the check; a new path creates nothing", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nemo-ra-unit-"));
  try {
    assert.match(unwritableReason(dir), /directory/);
    const ro = path.join(dir, "ro.md");
    fs.writeFileSync(ro, "x");
    fs.chmodSync(ro, 0o444);
    if (process.getuid && process.getuid() !== 0) assert.match(unwritableReason(ro), /not writable/);
    assert.match(unwritableReason(path.join(ro, "sub", "report.md")), /not a folder/);
    assert.equal(unwritableReason(path.join(dir, "a", "b", "report.md")), null);
    assert.equal(fs.existsSync(path.join(dir, "a")), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const HEADER = "#separator:tab\n#columns:Front\tBack\tImage\tIPA\tGloss\tDeck\tTags\n";
const wordPartRow = (front, back) => [front, back, "", "", "", "00 Reading Room::01 Medical Terms", "medical-word-parts"].join("\t");

test("route-accuracy: a whole-word Front is lowercased, with a trailing (disambiguation) dropped", () => {
  assert.equal(frontWord("Quebec"), "quebec");
  assert.equal(frontWord("colon (intestine)"), "colon");
  assert.equal(frontWord("ice cream"), null);
});

test("route-accuracy: example words come only from the examples span, not an e.g. in the meaning", () => {
  const back =
    '🎭 Sing.<hr><i>Greek</i><br>together (e.g. sym- before p/b/m)<br><span class="examples">e.g. syndrome, Synthesis, symptom</span>';
  assert.deepEqual(exampleWords(back), ["syndrome", "synthesis", "symptom"]);
  assert.deepEqual(exampleWords("no examples here"), []);
});

test("route-accuracy: word-part Fronts stay out, duplicates collapse, and a word with both labels is left out", () => {
  const text =
    HEADER +
    [
      "colon\tA story.",
      "colon (intestine)\tAnother story.",
      wordPartRow("syn-", '🎭 x<hr><i>Greek</i><br>with<br><span class="examples">e.g. syndrome, colon</span>'),
      wordPartRow("-drome", '<i>Greek</i><br>run<br><span class="examples">e.g. syndrome</span>'),
    ].join("\n");
  const { words, bothLabels } = labelledSet(text);
  assert.deepEqual(bothLabels, ["colon"]);
  assert.ok(!words.some((w) => /-/.test(w.word)), "no word-part Front in the set");
  assert.equal(words.filter((w) => w.word === "syndrome").length, 1);
  assert.deepEqual(words.find((w) => w.word === "syndrome"), { word: "syndrome", label: "word-part" });
  assert.deepEqual(words.find((w) => w.word === "ibuprofen"), { word: "ibuprofen", label: "word-part" });
  assert.deepEqual(words.find((w) => w.word === "trial"), { word: "trial", label: "general" });
});
