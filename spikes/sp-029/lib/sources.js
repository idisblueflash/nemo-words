"use strict";

// Where a word's story comes from: the latest row for it in the mnemonic log,
// else its card's Back. Card rows are read with the file's own `#columns:`
// header; a row tagged `medical-word-parts` is a word-part card.

function cardRows(text) {
  let columns = ["Front", "Back"];
  const rows = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    if (line.startsWith("#")) {
      if (line.startsWith("#columns:")) columns = line.slice("#columns:".length).split("\t");
      continue;
    }
    const cells = line.split("\t");
    rows.push(Object.fromEntries(columns.map((c, i) => [c, (cells[i] || "").trim()])));
  }
  return rows;
}

// word (lowercase) → latest logged sentence
function loggedStories(text) {
  const stories = {};
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    if (row.word && row.sentence) stories[row.word.toLowerCase()] = row.sentence;
  }
  return stories;
}

// word → { card, wordPart, story } (null when the word has no card row)
function makeLookup(cardText, logText) {
  const cards = {};
  for (const r of cardRows(cardText)) cards[r.Front.toLowerCase()] = r;
  const logged = loggedStories(logText);
  return (word) => {
    const key = word.toLowerCase();
    const card = cards[key];
    if (!card) return null;
    const wordPart = (card.Tags || "").split(/\s+/).includes("medical-word-parts");
    const story = logged[key] || card.Back || null;
    return { card, wordPart, story };
  };
}

module.exports = { cardRows, loggedStories, makeLookup };
