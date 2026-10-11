#!/usr/bin/env node
"use strict";

// SP-037 follow-up: a blind check of Flash's logged story vs Jev's pick.
//
//   node spikes/sp-037/blind.js            serve the page on http://127.0.0.1:8790
//   node spikes/sp-037/blind.js --summary  print the tally from the saved choices
//
// Pairs come from raw/run.json (no Jev or claude calls). Each answer is saved
// to raw/blind-choices.json as it's made, so closing the page loses nothing.
// The page never learns which story is Flash's, and no score is shown until
// every word is answered.

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const { buildPairs, publicPairs, recordChoice, tally, BLIND_BAR } = require("./lib/blind");

const HERE = __dirname;
const RUN = path.join(HERE, "raw", "run.json");
const CHOICES = path.join(HERE, "raw", "blind-choices.json");
const PAGE = path.join(HERE, "blind.html");
const PORT = Number(process.env.PORT || 8790);

const readChoices = () => (fs.existsSync(CHOICES) ? JSON.parse(fs.readFileSync(CHOICES, "utf8")) : {});
const writeChoices = (c) => fs.writeFileSync(CHOICES, JSON.stringify(c, null, 2) + "\n");

function state(pairs, choices) {
  const sides = Object.fromEntries(Object.entries(choices).map(([w, c]) => [w, c.side]));
  return { pairs: publicPairs(pairs), choices: sides, tally: tally(pairs, choices), bar: BLIND_BAR };
}

function summary(t) {
  if (!t.complete) return `blind check: ${t.answered} of ${t.total} answered, no tally until all are done`;
  const pct = (x) => `${Math.round(x * 100)}%`;
  return [
    `blind check: ${t.total} words`,
    `  Jev's pick chosen: ${t.jev}`,
    `  about the same:    ${t.same}`,
    `  Flash's kept:      ${t.flash}`,
    `  Jev acceptable:    ${pct(t.jevOkRate)} (bar ≥ ${pct(BLIND_BAR)}) → ${t.go ? "GO" : "NO-GO"} for Jev picking`,
  ].join("\n");
}

function send(res, status, type, body) {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

function serve(pairs) {
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/") return send(res, 200, "text/html; charset=utf-8", fs.readFileSync(PAGE));
    if (req.method === "GET" && req.url === "/api/state") return send(res, 200, "application/json", JSON.stringify(state(pairs, readChoices())));
    if (req.method === "POST" && req.url === "/api/choice") {
      let body = "";
      req.on("data", (d) => (body += d));
      req.on("end", () => {
        try {
          const { word, side } = JSON.parse(body);
          const choices = recordChoice(readChoices(), pairs, word, side);
          writeChoices(choices);
          send(res, 200, "application/json", JSON.stringify(state(pairs, choices)));
        } catch (err) {
          send(res, 400, "application/json", JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
    send(res, 404, "text/plain", "not found");
  });
  server.listen(PORT, "127.0.0.1", () => {
    process.stderr.write(`sp-037 blind check: http://127.0.0.1:${PORT}  (${pairs.length} words; answers → ${CHOICES})\n`);
  });
}

if (require.main === module) {
  const pairs = buildPairs(JSON.parse(fs.readFileSync(RUN, "utf8")));
  if (process.argv.includes("--summary")) console.log(summary(tally(pairs, readChoices())));
  else serve(pairs);
}

module.exports = { state, summary };
