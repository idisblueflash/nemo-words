#!/usr/bin/env node
// One-time migration: rewrite anki/reading-room-terms.txt so each card's Back
// field is just the 🎭 story sentence (plain text) — dropping say/def/🔊/📖, the
// trailing "Anchors:" line, and any "Nemo alternates" block.
//
// Throwaway. Run once, review `git diff`, then delete this file.
//
//   node scripts/strip-anki-back-to-story.js [--write]
//
// Without --write it's a dry run (prints the summary, touches nothing).
//
// Rows left UNTOUCHED (handled by hand in a follow-up pass):
//   - legacy "<b>mnemonic:</b>" rows that still hold multiple unpicked 🎭
//     candidates (no pick marked)
//   - any row with no tab separator (data bug — currently just `cloak`)
// Rows with NO 🎭 segment get an empty Back (pending a story).

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "anki", "reading-room-terms.txt");
const WRITE = process.argv.includes("--write");

const lines = fs.readFileSync(FILE, "utf8").split("\n");

let rewritten = 0;
const emptied = [];
const leftMulti = [];
const noTab = [];

const out = lines.map((line) => {
  if (line === "" || line.startsWith("#")) return line;

  const tab = line.indexOf("\t");
  if (tab === -1) {
    noTab.push(line.split("<")[0]);
    return line;
  }

  const front = line.slice(0, tab);
  const back = line.slice(tab + 1);

  const storySegs = back
    .split(/<br\s*\/?>|<hr\s*\/?>/i)
    .map((s) => s.replace(/<[^>]+>/g, "").trim())
    .filter((s) => s.startsWith("🎭"));

  if (storySegs.length === 0) {
    emptied.push(front);
    return `${front}\t`;
  }

  if (storySegs.length > 1) {
    leftMulti.push(front);
    return line;
  }

  const story = storySegs[0].replace(/^(?:🎭\s*)+/, "").trim();
  if (!story) {
    emptied.push(front);
    return `${front}\t`;
  }

  rewritten++;
  return `${front}\t${story}`;
});

console.log(`rewritten (story-only back): ${rewritten}`);
console.log(`emptied (no 🎭 segment): ${emptied.length}`);
if (emptied.length) console.log("  " + emptied.join(", "));
console.log(`left untouched — multi-candidate mnemonic rows: ${leftMulti.length}`);
if (leftMulti.length) console.log("  " + leftMulti.join(", "));
console.log(`left untouched — no tab separator (data bug): ${noTab.length}`);
if (noTab.length) console.log("  " + noTab.join(", "));

if (WRITE) {
  fs.writeFileSync(FILE, out.join("\n"));
  console.log(`\nwrote ${FILE}`);
} else {
  console.log("\ndry run — pass --write to apply");
}
