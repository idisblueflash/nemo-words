"use strict";

// The story rubric, read verbatim from `.claude/agents/_nemo.md` at run time:
// the judgment gates ("Before you return: …" sections) and the 1/2/3 score
// axes (the "Score each candidate" table).

const fs = require("node:fs");
const path = require("node:path");

const NEMO_MD = path.join(__dirname, "..", "..", "..", ".claude", "agents", "_nemo.md");

// gate name → `_nemo.md` heading
const GATES = {
  vividness: "## Before you return: vividness check",
  "scene-coherence": "## Before you return: scene-coherence check",
  "same-root-anchor": "## Before you return: no same-root anchor check",
  "animal-harm": "## Before you return: no animal-harm imagery check",
};

// axis name → `_nemo.md` table row label
const AXES = {
  anchor: "Anchor fidelity",
  meaning: "Meaning-carry",
  vivid: "Vividness",
};

function section(text, heading) {
  const start = text.indexOf(`${heading}\n`);
  if (start === -1) throw new Error(`_nemo.md: missing section "${heading}"`);
  const body = text.slice(start + heading.length + 1);
  const end = body.search(/^## /m);
  return (end === -1 ? body : body.slice(0, end)).trim();
}

function tableRow(text, label) {
  const line = text.split("\n").find((l) => l.startsWith(`| ${label} |`));
  if (!line) throw new Error(`_nemo.md: missing score row "${label}"`);
  const cells = line
    .split("|")
    .slice(2, -1)
    .map((c) => c.trim());
  if (cells.length !== 3) throw new Error(`_nemo.md: score row "${label}" needs 3 levels`);
  return cells;
}

function loadRubric(text = fs.readFileSync(NEMO_MD, "utf8")) {
  const gates = Object.fromEntries(Object.entries(GATES).map(([g, h]) => [g, section(text, h)]));
  const axes = Object.fromEntries(Object.entries(AXES).map(([a, label]) => [a, { label, levels: tableRow(text, label) }]));
  return { gates, axes };
}

module.exports = { loadRubric, GATE_NAMES: Object.keys(GATES), AXIS_NAMES: Object.keys(AXES) };
