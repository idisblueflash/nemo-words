#!/usr/bin/env node
"use strict";

// US-028 step `write-row <word> <story> <ipa> <gloss>` (after update-anki-story
// §2) — writes the word's row in the card file (anki/reading-room-terms.txt
// unless ANKI_FILE says otherwise): `Front\tBack\tImage\tIPA\tGloss`, Image
// left empty (US-030). Prints `<added|patched>\t<front>`.
//   - no row for the word: one is appended;
//   - a row with an empty Back (Front matched case-insensitively): patched in
//     place — its Front casing, Image and Deck/Tags columns are kept;
//   - a row that already has a story: exit 1, the file is left untouched.
// US-051: an optional 5th arg is the story's source (story's field 3). For
// `control` (the retention experiment's control arm) the row's Deck/Tags are
// set to the control deck and the `retention-control` tag, overwriting any
// that were there, and Image is cleared; Back is then the definition sentence.
// For `picked` (the story arm: only a drawn word gets a drafted story) the row
// keeps its Deck and gains the `retention-story` tag. `logged` (no draw) and
// no source leave the row's columns as before.

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const fs = require("fs");
const { runCli, cardFilePath, cardRows, findCardRow, alreadyCarded } = require("./card-lib");

const CONTROL_DECK = "00 Reading Room::03 Control Definitions";
const STORY_TAG = "retention-story";

// The file's `#tags:` header (space-separated), "" when it has none.
function headerTags(text) {
  const line = text.split("\n").find((l) => l.startsWith("#tags:"));
  return line ? line.slice("#tags:".length).trim() : "";
}

// The row's Image/Deck/Tags for the story's source, from what the row holds
// now (`current`; all empty for a new row). null = leave the columns alone.
//   control: no image (the story and the image are the only differences
//            between the arms), the control deck, `retention-control` only;
//   picked:  the story-arm tag added to the row's tags — or to the `#tags`
//            header's, since a row's Tags replace the header (ADR-0016).
function armColumns(source, current, fileTags) {
  if (source === "control") return { image: "", deck: CONTROL_DECK, tags: "retention-control" };
  if (source === "picked") {
    const tags = (current.tags || fileTags).split(/\s+/).filter(Boolean);
    if (!tags.includes(STORY_TAG)) tags.push(STORY_TAG);
    return { image: current.image, deck: current.deck, tags: tags.join(" ") };
  }
  return null;
}

function writeRow(file, { word, story, ipa, gloss, source = "" }) {
  let text = fs.readFileSync(file, "utf8");
  const row = findCardRow(cardRows(text), word);

  if (row && row.back) return { status: "already-carded", front: row.front, story: row.back };

  if (row) {
    const lines = text.split("\n");
    const cols = lines[row.index].split("\t");
    while (cols.length < 5) cols.push("");
    cols[1] = story;
    cols[3] = ipa;
    cols[4] = gloss;
    const current = { image: cols[2], deck: cols[5] || "", tags: (cols[6] || "").trim() };
    const arm = armColumns(source, current, headerTags(text));
    if (arm) {
      while (cols.length < 7) cols.push("");
      cols[2] = arm.image;
      cols[5] = arm.deck;
      cols[6] = arm.tags;
    }
    lines[row.index] = cols.join("\t");
    fs.writeFileSync(file, lines.join("\n"));
    return { status: "patched", front: row.front };
  }

  if (text && !text.endsWith("\n")) text += "\n";
  const cols = [word, story, "", ipa, gloss];
  const arm = armColumns(source, { image: "", deck: "", tags: "" }, headerTags(text));
  if (arm) cols.push(arm.deck, arm.tags);
  fs.writeFileSync(file, `${text}${cols.join("\t")}\n`);
  return { status: "added", front: word };
}

if (require.main === module) {
  runCli(([word, story, ipa, gloss, source]) => {
    if (!word || !story) throw new Error("usage: write-row <word> <story> <ipa> <gloss> [<logged|picked|control>]");
    const r = writeRow(cardFilePath(), { word, story, ipa: ipa || "", gloss: gloss || "", source: source || "" });
    if (r.status === "already-carded") return { stop: [alreadyCarded(r.front, r.story)] };
    return { lines: [`${r.status}\t${r.front}`] };
  });
}

module.exports = { writeRow, CONTROL_DECK };
