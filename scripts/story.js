#!/usr/bin/env node
"use strict";

// US-028 step `story <route-file> <pick-story-file>` (dags/card.yaml) — the
// card's story, where the logged-story shortcut and the drafted path meet.
// When route found a logged story (`general\t<sentence>\t<pivots>`) it wins —
// a logged story was a human pick, and the draft steps were skipped, so there
// is no pick-story log. Otherwise it's pick-story's `sentence\tpivots`.
// Prints `sentence\tpivots\t<logged|picked>`.
// US-051: when draw-arm put the word in the control arm (the drafting steps
// were skipped), the card's back is define's definition sentence (line 2):
// prints `definition\t\tcontrol`.
// Having none of these is an error (exit 2): the DAG's preconditions only run
// this step when one exists.

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const fs = require("fs");
const { runCli } = require("./card-lib");

const firstLine = (text) => text.split("\n").find((l) => l.trim()) || "";

function resolveStory(routeText, pickText, armText = "", defineText = "") {
  const [, sentence, pivots = ""] = firstLine(routeText).split("\t");
  if (sentence) return `${sentence}\t${pivots}\tlogged`;
  if (firstLine(armText).trim() === "control") {
    const definition = (defineText.split("\n")[1] || "").trim();
    if (!definition) throw new Error("control arm: define gave no definition sentence");
    return `${definition}\t\tcontrol`;
  }
  const picked = firstLine(pickText);
  if (picked) {
    const [s, p = ""] = picked.split("\t");
    return `${s}\t${p}\tpicked`;
  }
  return null;
}

if (require.main === module) {
  runCli(([routeFile, pickFile, armFile, defineFile]) => {
    if (!routeFile || !pickFile) throw new Error("usage: story <route-file> <pick-story-file> [<draw-arm-file> <define-file>]");
    // On the logged-story path pick-story was skipped (via its skipped
    // dependencies), and Dagu then leaves `${pick_story.stdout}` unresolved:
    // the DAG passes it single-quoted, so it arrives here as a literal
    // non-existent path. A missing pick log = no pick.
    const pickText = fs.existsSync(pickFile) ? fs.readFileSync(pickFile, "utf8") : "";
    // Likewise draw-arm's log is missing when it was skipped (no draw).
    const armText = armFile && fs.existsSync(armFile) ? fs.readFileSync(armFile, "utf8") : "";
    const defineText = armText && defineFile ? fs.readFileSync(defineFile, "utf8") : "";
    const line = resolveStory(fs.readFileSync(routeFile, "utf8"), pickText, armText, defineText);
    if (!line) throw new Error("no story: route found no logged story and pick-story picked none");
    return { lines: [line] };
  });
}

module.exports = { resolveStory };
