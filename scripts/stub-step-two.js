#!/usr/bin/env node
// EN-036 throwaway stub step 2 of dags/card.yaml (US-028 replaces it).
// Usage: node scripts/stub-step-two.js <file holding step one's stdout>
// Echoes each TSV record in the file with a `checked` field appended.
// The DAG passes `${one.stdout}` (step one's stdout log) rather than an
// `output:` variable, because Dagu escapes tabs when it substitutes a
// variable straight into a command line.

require("./lib/step-contract"); // a crash exits 2, never 1
const fs = require("node:fs");

const records = fs.readFileSync(process.argv[2], "utf8").split("\n").filter(Boolean);
process.stderr.write(`stub-step-two: checked ${records.length} record(s)\n`);
for (const record of records) process.stdout.write(`${record}\tchecked\n`);
