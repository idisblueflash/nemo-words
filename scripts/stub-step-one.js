#!/usr/bin/env node
// EN-036 throwaway stub step 1 of dags/card.yaml (US-028 replaces it).
// Usage: node scripts/stub-step-one.js <word>
// Prints one TSV record `<word>\t<WORD uppercased>` on stdout; a note on stderr.
//
// Magic test words drive the non-happy paths of the step contract:
//   __stop__   exit 1, reasons on stdout one per line (a clean stop)
//   __fail__   exit 2, error on stderr
//   __crash__  throw an uncaught exception (exit 2, via lib/step-contract)

require("./lib/step-contract");

const word = process.argv[2];

if (word === "__stop__") {
  process.stdout.write("__stop__ is a test word\nnothing to look up\n");
  process.exit(1);
}
if (word === "__fail__") {
  process.stderr.write("stub-step-one: __fail__ asked for an error\n");
  process.exit(2);
}
if (word === "__crash__") throw new Error("__crash__ asked for a crash");

process.stderr.write(`stub-step-one: looked up ${word}\n`);
process.stdout.write(`${word}\t${word.toUpperCase()}\n`);
