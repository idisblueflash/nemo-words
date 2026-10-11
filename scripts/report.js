#!/usr/bin/env node
"use strict";

// US-028 step `report <write-row-file> <story-file> <syllabify-file> <gloss-file> [<stderr-file>…]`
// — the last step of dags/card.yaml, so its stdout is what `scripts/card.js`
// prints on success: what was carded, its story (marked when it was the
// logged story), gloss and IPA. The steps' stderr logs passed after the four
// results are appended as `note: <step>: <line>` lines (as the old in-process
// runner did), so a step's warning shows in the run report. Logs that don't
// exist (skipped steps) are ignored.

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const fs = require("fs");
const path = require("path");
const { runCli } = require("./card-lib");

const firstLine = (file) => fs.readFileSync(file, "utf8").split("\n").find((l) => l.trim()) || "";

function report({ writeRow, story, syllables, gloss, notes = [] }) {
  const [status, front] = writeRow.split("\t");
  const [sentence, , source] = story.split("\t");
  return [
    `carded ${front} (${status})`,
    `story: ${sentence}${source === "logged" ? "  (logged story, kept as picked)" : ""}`,
    `gloss: ${gloss}`,
    `ipa:   ${syllables}`,
    "synced to Anki",
    ...notes.map((n) => `note: ${n}`),
  ];
}

if (require.main === module) {
  runCli(([writeRowFile, storyFile, syllablesFile, glossFile, ...stderrFiles]) => {
    if (!writeRowFile || !storyFile || !syllablesFile || !glossFile) {
      throw new Error("usage: report <write-row-file> <story-file> <syllabify-file> <gloss-file> [<stderr-file>…]");
    }
    // Dagu names a step's log `<step id>.<timestamp…>.err`; a skipped step's
    // log path doesn't exist (see the `story` step in dags/card.yaml).
    const notes = stderrFiles
      .filter((f) => fs.existsSync(f))
      .flatMap((f) => {
        const step = path.basename(f).split(".")[0].replace(/_/g, "-");
        return fs.readFileSync(f, "utf8").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => `${step}: ${l}`);
      });
    return {
      lines: report({
        writeRow: firstLine(writeRowFile),
        story: firstLine(storyFile),
        syllables: firstLine(syllablesFile),
        gloss: firstLine(glossFile),
        notes,
      }),
    };
  });
}

module.exports = { report };
