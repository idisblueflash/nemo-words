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

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const fs = require("fs");
const { runCli, cardFilePath, cardRows, findCardRow, alreadyCarded } = require("./card-lib");

function writeRow(file, { word, story, ipa, gloss }) {
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
    lines[row.index] = cols.join("\t");
    fs.writeFileSync(file, lines.join("\n"));
    return { status: "patched", front: row.front };
  }

  if (text && !text.endsWith("\n")) text += "\n";
  fs.writeFileSync(file, `${text}${[word, story, "", ipa, gloss].join("\t")}\n`);
  return { status: "added", front: word };
}

if (require.main === module) {
  runCli(([word, story, ipa, gloss]) => {
    if (!word || !story) throw new Error("usage: write-row <word> <story> <ipa> <gloss>");
    const r = writeRow(cardFilePath(), { word, story, ipa: ipa || "", gloss: gloss || "" });
    if (r.status === "already-carded") return { stop: [alreadyCarded(r.front, r.story)] };
    return { lines: [`${r.status}\t${r.front}`] };
  });
}

module.exports = { writeRow };
