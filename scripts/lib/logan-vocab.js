"use strict";

// US-039: _logan's controlled vocabularies, read straight from
// .claude/agents/_logan/reference-tables.md so the card pipeline and the
// agent can never drift apart:
//   anchorUnits — the `## \`anchor_unit\`` table
//   techniques  — the `## \`technique\`` table
// Each entry is { value, explanation } in table order.

const fs = require("fs");
const path = require("path");

const TABLES = path.join(__dirname, "..", "..", ".claude", "agents", "_logan", "reference-tables.md");

// Rows of the first markdown table under the `## \`<name>\`` heading.
function tableUnder(text, name) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`## \`${name}\``));
  if (start === -1) throw new Error(`no "${name}" table in ${TABLES}`);
  const rows = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break;
    const m = /^\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|\s*$/.exec(line);
    if (m) rows.push({ value: m[1], explanation: m[2] });
  }
  return rows;
}

function load(file = TABLES) {
  const text = fs.readFileSync(file, "utf8");
  return { anchorUnits: tableUnder(text, "anchor_unit"), techniques: tableUnder(text, "technique") };
}

module.exports = { load, TABLES };
