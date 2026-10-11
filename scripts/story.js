#!/usr/bin/env node
"use strict";

// US-028 step `story <route-file> <pick-story-file>` (dags/card.yaml) — the
// card's story, where the logged-story shortcut and the drafted path meet.
// When route found a logged story (`general\t<sentence>\t<pivots>`) it wins —
// a logged story was a human pick, and the draft steps were skipped, so there
// is no pick-story log. Otherwise it's pick-story's `sentence\tpivots`.
// Prints `sentence\tpivots\t<logged|picked>`. Having neither is an error
// (exit 2): the DAG's preconditions only run this step when one exists.

if (require.main === module) require("./lib/step-contract"); // a crash exits 2, never 1
const fs = require("fs");
const { runCli } = require("./card-lib");

const firstLine = (text) => text.split("\n").find((l) => l.trim()) || "";

function resolveStory(routeText, pickText) {
  const [, sentence, pivots = ""] = firstLine(routeText).split("\t");
  if (sentence) return `${sentence}\t${pivots}\tlogged`;
  const picked = firstLine(pickText);
  if (picked) {
    const [s, p = ""] = picked.split("\t");
    return `${s}\t${p}\tpicked`;
  }
  return null;
}

if (require.main === module) {
  runCli(([routeFile, pickFile]) => {
    if (!routeFile || !pickFile) throw new Error("usage: story <route-file> <pick-story-file>");
    // On the logged-story path pick-story was skipped (via its skipped
    // dependencies), and Dagu then leaves `${pick_story.stdout}` unresolved:
    // the DAG passes it single-quoted, so it arrives here as a literal
    // non-existent path. A missing pick log = no pick.
    const pickText = fs.existsSync(pickFile) ? fs.readFileSync(pickFile, "utf8") : "";
    const line = resolveStory(fs.readFileSync(routeFile, "utf8"), pickText);
    if (!line) throw new Error("no story: route found no logged story and pick-story picked none");
    return { lines: [line] };
  });
}

module.exports = { resolveStory };
