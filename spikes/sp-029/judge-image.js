#!/usr/bin/env node
"use strict";

// SP-029 prototype step `judge-image <word> <story> <captions-file>`
// (EN-036 step contract), for US-030 to promote into scripts/.
//
// captions-file: 9 lines, `cell\tcaption`, cells 1–9 row-major.
// stdout:
//   row\t<1–3>\t<picked cell>\t<cell>=<p>,…     one line per grid row (round 1)
//   final\t<picked cell>\t<cell>=<p>,…          round 2 over the three row picks
// Exit 0 with a pick; exit 2 if Jev fails or answers unusably (the cause on
// stderr, nothing on stdout) or the input is bad. Jev's key: TYPESAFE_API_KEY
// from the repo's .env, or the env file NEMO_JEV_ENV_FILE names.

if (require.main === module) require("../../scripts/lib/step-contract"); // a crash exits 2, never 1
const fs = require("node:fs");
const { judgeImage, formatJudgment } = require("./lib/judge-image");

function readCaptions(text) {
  const captions = {};
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const [cell, ...rest] = line.split("\t");
    captions[Number(cell)] = rest.join(" ").trim();
  }
  return captions;
}

async function main([word, story, captionsFile]) {
  if (!word || !story || !captionsFile) {
    process.stderr.write("usage: judge-image <word> <story> <captions-file>\n");
    return 2;
  }
  try {
    const j = await judgeImage({ word, story, captions: readCaptions(fs.readFileSync(captionsFile, "utf8")) });
    process.stdout.write(formatJudgment(j).join("\n") + "\n");
    return 0;
  } catch (err) {
    process.stderr.write(`judge-image: ${err.message}\n`);
    return 2;
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => (process.exitCode = code));
}

module.exports = { readCaptions };
