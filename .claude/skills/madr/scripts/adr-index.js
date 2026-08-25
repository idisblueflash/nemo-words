#!/usr/bin/env node
// Deterministic helper for maintaining a folder of MADR files with YAML
// front matter (status/deciders/date). No dependencies beyond Node stdlib.
//
// Usage:
//   node adr-index.js list [dir]      print an index table, oldest first
//   node adr-index.js next [dir]      print the next zero-padded number
//   node adr-index.js validate [dir]  exit non-zero and list problems if any

const fs = require("fs");
const path = require("path");

const CANDIDATE_DIRS = ["docs/decisions", "docs/adr", "docs/architecture/decisions"];
const VALID_STATUSES = new Set(["proposed", "accepted", "rejected", "deprecated", "superseded"]);
const FILE_RE = /^(\d{4})-[a-z0-9-]+\.md$/;

function resolveDir(explicit) {
  if (explicit) return explicit;
  for (const candidate of CANDIDATE_DIRS) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return CANDIDATE_DIRS[0];
}

function parseFrontMatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fields = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (kv) fields[kv[1].trim()] = kv[2].trim();
  }
  return fields;
}

function loadRecords(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((filename) => {
      const fullPath = path.join(dir, filename);
      const text = fs.readFileSync(fullPath, "utf8");
      const fields = parseFrontMatter(text);
      const numberMatch = filename.match(/^(\d+)-/);
      const titleMatch = text.match(/^#\s*\d+\.\s*(.+)$/m) || text.match(/^#\s*(.+)$/m);
      return {
        filename,
        number: numberMatch ? numberMatch[1] : null,
        title: titleMatch ? titleMatch[1].trim() : "(no title found)",
        status: fields.status || "(missing)",
        deciders: fields.deciders || "",
        date: fields.date || "(missing)",
      };
    });
}

function cmdList(dir) {
  const records = loadRecords(dir);
  if (records.length === 0) {
    console.log(`No records found in ${dir}`);
    return;
  }
  for (const r of records) {
    console.log(`${r.number ?? "????"}  [${r.status}]  ${r.date}  ${r.title}`);
  }
}

function cmdNext(dir) {
  const records = loadRecords(dir);
  const max = records.reduce((m, r) => Math.max(m, r.number ? parseInt(r.number, 10) : 0), 0);
  console.log(String(max + 1).padStart(4, "0"));
}

function cmdValidate(dir) {
  const records = loadRecords(dir);
  const problems = [];
  const seenNumbers = new Map();

  for (const r of records) {
    if (!FILE_RE.test(r.filename)) {
      problems.push(`${r.filename}: filename doesn't match NNNN-kebab-title.md`);
    }
    if (r.number) {
      if (seenNumbers.has(r.number)) {
        problems.push(`${r.filename}: duplicate number ${r.number} (also used by ${seenNumbers.get(r.number)})`);
      }
      seenNumbers.set(r.number, r.filename);
    }
    if (r.status === "(missing)") {
      problems.push(`${r.filename}: missing front-matter status`);
    } else if (!VALID_STATUSES.has(r.status)) {
      problems.push(`${r.filename}: invalid status "${r.status}" (expected one of ${[...VALID_STATUSES].join(", ")})`);
    }
    if (r.date === "(missing)") {
      problems.push(`${r.filename}: missing front-matter date`);
    }
    if (r.status === "superseded") {
      const text = fs.readFileSync(path.join(dir, r.filename), "utf8");
      if (!/superseded by/i.test(text)) {
        problems.push(`${r.filename}: status is superseded but no "Superseded by" link found`);
      }
    }
  }

  if (problems.length === 0) {
    console.log(`${records.length} record(s) in ${dir} — no problems found.`);
    return;
  }
  console.log(`${problems.length} problem(s) in ${dir}:`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exitCode = 1;
}

function main() {
  const [, , cmd, dirArg] = process.argv;
  const dir = resolveDir(dirArg);

  switch (cmd) {
    case "list":
      return cmdList(dir);
    case "next":
      return cmdNext(dir);
    case "validate":
      return cmdValidate(dir);
    default:
      console.error("Usage: node adr-index.js <list|next|validate> [dir]");
      process.exitCode = 1;
  }
}

main();
