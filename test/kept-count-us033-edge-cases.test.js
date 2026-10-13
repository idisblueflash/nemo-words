// US-033 edge cases from the item's logic sketch that no single scenario
// spells out: an unreadable mnemonic log fails (exit 2), and a word's card is
// found the way anki-sync.js finds it — by its card-file row's own Front and
// Deck when the row has them.
//
// Runs the real scripts/kept-count.js against a mock AnkiConnect.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createKeptHarness } = require("./helpers/kept-count-harness");

test("a missing mnemonic log fails (exit 2), naming the file, with no count", async () => {
  const h = await createKeptHarness();
  try {
    const missing = path.join(h.dir, "no-such-log.jsonl");
    const { code, stdout, stderr } = await h.run([], { NEMO_MNEMONIC_LOG: missing });
    assert.equal(code, 2);
    assert.match(stderr, /can't read the mnemonic log/);
    assert.ok(stderr.includes(missing));
    assert.equal(stdout, "");
    assert.equal(h.mock.calls.length, 0);
  } finally {
    await h.close();
  }
});

test("a mnemonic log with a line that isn't JSON fails (exit 2), naming the line", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("wary", "A wary hare eyes the snare.");
    fs.appendFileSync(h.logPath, "{not json\n");
    h.card("wary", h.composed("A wary hare eyes the snare."));
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 2);
    assert.match(stderr, /can't read the mnemonic log/);
    assert.match(stderr, /line 2/);
    assert.equal(stdout, "");
  } finally {
    await h.close();
  }
});

test("the command writes nothing: the log and the card file are byte-for-byte unchanged", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("wary", "A wary hare eyes the snare.");
    h.card("wary", h.composed("Flash's own."));
    const before = [fs.readFileSync(h.logPath, "utf8"), fs.readFileSync(h.cardFilePath, "utf8")];
    const { code } = await h.run();
    assert.equal(code, 0);
    assert.deepEqual([fs.readFileSync(h.logPath, "utf8"), fs.readFileSync(h.cardFilePath, "utf8")], before);
  } finally {
    await h.close();
  }
});

test("a card-file row's Deck override and Front casing are used to find the card", async () => {
  const h = await createKeptHarness();
  try {
    const deck = "00 Reading Room::Elsewhere";
    h.autoPick("wary", "A hare eyes the snare.");
    h.cardRow(`Wary\tA hare eyes the snare.\t\t\t\t${deck}\tretention-story`);
    h.card("Wary", h.composed("A hare eyes the snare."), { deck });
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 0, stderr);
    assert.match(stdout, /^kept 1 of 1 \(100%\)$/m);
    const find = h.mock.calls.find((c) => c.action === "findNotes");
    assert.equal(find.params.query, `deck:"${deck}" Front:"Wary"`);
  } finally {
    await h.close();
  }
});

test("an AnkiConnect error answer fails (exit 2) and reports no count", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("wary", "A hare eyes the snare.");
    h.mock.notes.push({ id: 1, deckName: h.TERMS_DECK, fields: { Front: "wary", Back: "x" }, cards: null });
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 2);
    assert.match(stderr, /^error: /);
    assert.equal(stdout, "");
  } finally {
    await h.close();
  }
});
