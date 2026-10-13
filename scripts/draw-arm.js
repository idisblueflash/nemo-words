#!/usr/bin/env node
"use strict";

// US-051 step `draw-arm` (dags/card.yaml, right after find-keywords) — puts a
// word that would get a story card today into one arm of the retention
// experiment (E02): `control` (a definition-only card in its own deck) or
// `story` (the story card, as before, tagged). Prints the arm.
//   - NEMO_ARM=control|story forces the arm (tests, or Flash by hand); any
//     other non-empty value is an error (exit 2).
//   - Otherwise, when one arm has 3 or more cards more than the other, the
//     word goes to the arm with fewer cards (no chance draw);
//   - otherwise a 50/50 chance draw.
// The counts are worked out each run from the card file (anki/reading-room-
// terms.txt, or ANKI_FILE), never stored: rows with a non-empty Back whose
// Tags column holds `retention-control` / `retention-story`. A card file that
// can't be read fails the step (exit 2): no draw that ignores the cap.
// It only runs after the no-anchor stop, so hard-to-anchor words never skew
// the control arm.

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const fs = require("fs");
const { runCli, cardFilePath } = require("./card-lib");

const ARMS = ["control", "story"];
const CAP = 3;

// { control, story }: the card file's carded rows per arm tag.
function countArms(text) {
  const counts = { control: 0, story: 0 };
  for (const line of text.split("\n")) {
    if (line.startsWith("#") || !line.includes("\t")) continue;
    const cols = line.split("\t");
    if (!(cols[1] || "").trim()) continue;
    const tags = (cols[6] || "").split(/\s+/);
    for (const arm of ARMS) if (tags.includes(`retention-${arm}`)) counts[arm] += 1;
  }
  return counts;
}

function drawArm({ forced = "", counts = { control: 0, story: 0 }, random = Math.random } = {}) {
  if (forced) {
    if (!ARMS.includes(forced)) throw new Error(`NEMO_ARM must be control or story, got "${forced}"`);
    return forced;
  }
  if (Math.abs(counts.control - counts.story) >= CAP) return counts.control < counts.story ? "control" : "story";
  return random() < 0.5 ? "control" : "story";
}

if (require.main === module) {
  runCli(() => {
    const forced = process.env.NEMO_ARM || "";
    const counts = countArms(fs.readFileSync(cardFilePath(), "utf8"));
    return { lines: [drawArm({ forced, counts })] };
  });
}

module.exports = { drawArm, countArms, ARMS };
