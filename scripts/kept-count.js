#!/usr/bin/env node
"use strict";

// US-033 — how many auto-picked cards Flash kept.
//
// Usage:
//   node scripts/kept-count.js
//   node scripts/kept-count.js --help
// It takes no options: any other argument is refused, not ignored.
//
// An auto-picked word is one whose mnemonic-log row says `picked_by: "auto"`
// (the card pipeline picked its story, US-039). For each one this reads the
// live card from Anki through AnkiConnect and gives it a kept verdict:
//   kept        the story on the card is still the auto-picked sentence
//   overridden  the story differs at all, even by one typo fix
//   removed     the card is gone (counts as overridden, shown "card removed")
//   not-met     every card of the note has 0 reviews (only counted)
// The report covers the 20 most recently auto-picked reviewed words:
//   kept 15 of 20 (75%)
//   meets E01's 70% target        (or `below …`; `N more needed for a verdict`
//   not met yet: 3                 while the window holds fewer than 20)
//   overridden:
//   - wary
//       auto-picked: <the auto-picked sentence>
//       now: <the story on the card now>
//
// Exit 0 = report printed; exit 1 (clean stop) = no reviewed auto-picked cards
// yet; exit 2 = Anki unreachable, or the log unreadable.
//
// Read-only: it writes nothing, to Anki or to disk. Honours NEMO_MNEMONIC_LOG,
// ANKI_CONNECT_URL and ANKI_FILE (the card file whose `#deck` / `#columns`
// headers name the deck and fields, as for anki-sync.js).

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const fs = require("fs");
const path = require("path");
const { runCli, REPO_ROOT } = require("./card-lib");
const anki = require("./anki-sync");

const WINDOW = 20;
const TARGET_PERCENT = 70; // E01's target
const TARGET_KEPT = (WINDOW * TARGET_PERCENT) / 100;

const mnemonicLogPath = () => process.env.NEMO_MNEMONIC_LOG || path.join(REPO_ROOT, "data", "mnemonics", "log.jsonl");

// The mnemonic log's rows, in file order. A log that can't be read — missing,
// or holding a line that isn't JSON — is an error (exit 2), not a smaller
// count: a dropped row would quietly change the measurement.
function readLog(file) {
  const unreadable = (why) => new Error(`can't read the mnemonic log: ${file} (${why})`);
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (e) {
    throw unreadable(e.code || e.message);
  }
  const rows = [];
  text.split("\n").forEach((line, i) => {
    if (!line.trim()) return;
    try {
      rows.push(JSON.parse(line));
    } catch {
      throw unreadable(`line ${i + 1} isn't JSON`);
    }
  });
  return rows;
}

// Log rows -> the auto-picks `[{ word, sentence, date }]`, newest first. A word
// with several auto rows is one auto-pick: its latest row (the log only grows,
// so that is the last one in the file). On the same date the later row is newer.
function autoPicks(rows) {
  const latest = new Map();
  rows.forEach((r, order) => {
    if (!r || r.picked_by !== "auto" || !r.word) return;
    const pick = { word: r.word, sentence: String(r.sentence || ""), date: String(r.date || ""), order };
    latest.set(String(r.word).toLowerCase(), pick);
  });
  return [...latest.values()].sort((a, b) => (a.date === b.date ? b.order - a.order : a.date < b.date ? 1 : -1));
}

// The story as it reads on a card, out of the live Back (HTML).
const cleanStory = (text) => anki.storyFromBack(text);

// The auto-picked sentence as it reads on a card. The log holds plain text, so
// a `<` or `>` in it is story text, never a tag: only whitespace is cleaned.
const plainStory = (text) => String(text || "").replace(/\s+/g, " ").trim();

// The story piece of a Back exactly as anki-sync.js composeBack writes it: the
// pieces split on its "<br>" separator, minus the <img> and <small> pieces, and
// nothing stripped or decoded. composeBack pushes the story raw, so a literal
// `<cat>` or `< 5 >` is still in the Back as typed (bug-012, round 2).
const rawStory = (back) =>
  plainStory(
    String(back || "")
      .split("<br>")
      .filter((piece) => !/^\s*<(img|small)\b/i.test(piece))
      .join(" ")
  );

// One auto-pick + its live card -> `{ ...pick, verdict, storyNow }`.
// No live card (`null`) is `removed`: Flash deleted it, which overrides the pick.
function judge(pick, liveCard) {
  if (!liveCard) return { ...pick, verdict: "removed" };
  if (liveCard.reviews === 0) return { ...pick, verdict: "not-met" };
  const storyNow = cleanStory(liveCard.back);
  const sentence = plainStory(pick.sentence);
  const kept = storyNow === sentence || rawStory(liveCard.back) === sentence;
  return { ...pick, storyNow, verdict: kept ? "kept" : "overridden" };
}

// Judged words, newest first -> the KeptReport. The window is the reviewed
// words only; `not-met` words are counted, never put in it.
function buildReport(judged) {
  const window = judged.filter((j) => j.verdict !== "not-met").slice(0, WINDOW);
  const kept = window.filter((j) => j.verdict === "kept").length;
  return {
    kept,
    total: window.length,
    percent: Math.round((kept / window.length) * 100),
    // a verdict only when the window is full; until then, how many more it needs
    verdict: window.length < WINDOW ? null : kept >= TARGET_KEPT ? "meets" : "below",
    moreNeeded: WINDOW - window.length,
    notMet: judged.length - judged.filter((j) => j.verdict !== "not-met").length,
    overridden: window.filter((j) => j.verdict !== "kept"),
  };
}

function verdictLine(report) {
  if (!report.verdict) return `${report.moreNeeded} more needed for a verdict`;
  return report.verdict === "meets" ? `meets E01's ${TARGET_PERCENT}% target` : `below E01's ${TARGET_PERCENT}% target`;
}

const CARD_REMOVED = "card removed";

function reportLines(report) {
  const lines = [`kept ${report.kept} of ${report.total} (${report.percent}%)`, verdictLine(report)];
  lines.push(`not met yet: ${report.notMet}`);
  if (report.overridden.length) lines.push("overridden:");
  for (const o of report.overridden) {
    const removed = o.verdict === "removed";
    lines.push(
      removed ? `- ${o.word} (${CARD_REMOVED})` : `- ${o.word}`,
      `    auto-picked: ${o.sentence}`,
      `    now: ${removed ? `(${CARD_REMOVED})` : o.storyNow}`
    );
  }
  return lines;
}

// Reads the live card of one word: `{ noteId, back, reviews }`, or null when
// the deck holds no note with that Front. The search is anki-sync.js's own:
// when the card file has a row for the word, that row's Front (its casing) and
// its Deck override are used, else the word and the file's `#deck`.
async function liveCard(word, ctx) {
  const row = ctx.rows.find((r) => r.front.toLowerCase() === String(word).toLowerCase());
  const deckName = (row && row.deck) || ctx.deckName;
  const query = anki.noteQuery(deckName, ctx.frontField, row ? row.front : word);
  const noteIds = await anki.invoke("findNotes", { query });
  if (noteIds.length === 0) return null;
  const [info] = await anki.invoke("notesInfo", { notes: [noteIds[0]] });
  const cards = await anki.invoke("cardsInfo", { cards: info.cards });
  return {
    noteId: noteIds[0],
    back: info.fields[ctx.backField].value,
    reviews: cards.reduce((sum, c) => sum + c.reps, 0),
  };
}

const NONE_REVIEWED = "no reviewed auto-picked cards yet";
const ANKI_UNREACHABLE = "can't reach Anki; re-run with Anki open";

const USAGE = [
  "usage: node scripts/kept-count.js",
  "Reports how many auto-picked stories are still on their Anki cards,",
  "over the 20 most recently auto-picked reviewed words. Takes no options.",
];

async function main(argv = []) {
  // before anything is read: a mistyped option must not look like a report
  if (argv.length) {
    if (argv.every((a) => a === "--help" || a === "-h")) return { lines: USAGE };
    const unknown = argv.find((a) => a !== "--help" && a !== "-h");
    throw new Error([`unknown argument: ${unknown}`, ...USAGE].join("\n"));
  }
  const picks = autoPicks(readLog(mnemonicLogPath()));
  const ctx = anki.parseFile(fs.readFileSync(anki.FILE, "utf8"));
  const judged = [];
  try {
    for (const pick of picks) judged.push(judge(pick, await liveCard(pick.word, ctx)));
  } catch (e) {
    // nothing is reported from a half-read collection
    if (e instanceof anki.ConnectionError) throw new Error(ANKI_UNREACHABLE);
    throw e;
  }
  const report = buildReport(judged);
  if (report.total === 0) {
    const reasons = [NONE_REVIEWED];
    if (report.notMet) reasons.push(`not met yet: ${report.notMet}`);
    return { stop: reasons };
  }
  return { lines: reportLines(report) };
}

if (require.main === module) runCli(main);

module.exports = { autoPicks, cleanStory, plainStory, judge, buildReport, reportLines, WINDOW, TARGET_PERCENT };
