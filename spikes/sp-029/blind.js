#!/usr/bin/env node
"use strict";

// SP-029 blind check (AC5), only after a no-go:
//
//   node spikes/sp-029/blind.js --prepare   pick up to 20 words Jev missed, cut their two cells
//   node spikes/sp-029/blind.js             serve the page on http://127.0.0.1:8791 (PORT=… to change)
//   node spikes/sp-029/blind.js --summary   print the share from the saved choices
//   node spikes/sp-029/run.js --report      add the share to the report
//
// Reads <out>/run.json (SP029_OUT_DIR, as run.js). Pairs go to
// <out>/blind-pairs.json and their cells to <out>/blind-cells/, named by pair
// and side only. Each answer is saved to <out>/blind-choices.json as it's
// made. The page never learns which cell is Flash's, and no share is shown
// until every word is answered.

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const { config } = require("./run");
const { summarize } = require("./lib/report");
const { buildPairs, publicPairs, recordChoice, tally } = require("./lib/blind");
const { cropCell } = require("./lib/caption");

const PAGE = path.join(__dirname, "blind.html");

const files = (cfg) => ({
  run: path.join(cfg.outDir, "run.json"),
  pairs: path.join(cfg.outDir, "blind-pairs.json"),
  choices: path.join(cfg.outDir, "blind-choices.json"),
  cells: path.join(cfg.outDir, "blind-cells"),
});
const readJson = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : fallback);
const writeJson = (f, data) => fs.writeFileSync(f, JSON.stringify(data, null, 2) + "\n");
const cellFile = (cfg, id, side) => path.join(files(cfg).cells, `${id}-${side}.png`);

function prepare(cfg) {
  const f = files(cfg);
  const run = readJson(f.run, null);
  if (!run) throw new Error(`no run yet: ${f.run}`);
  if (summarize(run).go) {
    process.stdout.write("go: no blind check (it runs only on a no-go)\n");
    return 1;
  }
  const pairs = buildPairs(run);
  fs.mkdirSync(f.cells, { recursive: true });
  for (const p of pairs) {
    for (const side of ["left", "right"]) cropCell(path.join(cfg.imageDir, p.grid), p[side].cell, cellFile(cfg, p.id, side));
  }
  writeJson(f.pairs, pairs);
  process.stderr.write(`sp-029 blind check: ${pairs.length} words → ${f.pairs}\n`);
  return 0;
}

function summary(t) {
  if (!t.complete) return `blind check: ${t.answered} of ${t.total} answered, no share until all are done`;
  return [
    `blind check: ${t.total} words`,
    `  Jev's cell chosen: ${t.jev}`,
    `  about the same:    ${t.same}`,
    `  Flash's chosen:    ${t.flash}`,
    `  Jev acceptable:    ${t.jevOk} of ${t.total} (${(t.jevOkRate * 100).toFixed(1)}%)`,
  ].join("\n");
}

function send(res, status, type, body) {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

function serve(cfg, pairs, port) {
  const f = files(cfg);
  const state = (choices) => ({
    pairs: publicPairs(pairs),
    choices: Object.fromEntries(pairs.filter((p) => choices[p.word]).map((p) => [p.id, choices[p.word].side])),
    tally: tally(pairs, choices),
  });
  const server = http.createServer((req, res) => {
    const img = /^\/img\/(\d+)\/(left|right)\.png$/.exec(req.url);
    if (req.method === "GET" && req.url === "/") return send(res, 200, "text/html; charset=utf-8", fs.readFileSync(PAGE));
    if (req.method === "GET" && req.url === "/api/state") return send(res, 200, "application/json", JSON.stringify(state(readJson(f.choices, {}))));
    if (req.method === "GET" && img && pairs.some((p) => p.id === img[1])) {
      return send(res, 200, "image/png", fs.readFileSync(cellFile(cfg, img[1], img[2])));
    }
    if (req.method === "POST" && req.url === "/api/choice") {
      let body = "";
      req.on("data", (d) => (body += d));
      req.on("end", () => {
        try {
          const { id, side } = JSON.parse(body);
          const choices = recordChoice(readJson(f.choices, {}), pairs, id, side);
          writeJson(f.choices, choices);
          send(res, 200, "application/json", JSON.stringify(state(choices)));
        } catch (err) {
          send(res, 400, "application/json", JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
    send(res, 404, "text/plain", "not found");
  });
  server.listen(port, "127.0.0.1", () => {
    process.stderr.write(`sp-029 blind check: http://127.0.0.1:${server.address().port}  (${pairs.length} words; answers → ${f.choices})\n`);
  });
}

function main(argv) {
  const cfg = config();
  if (argv.includes("--prepare")) return prepare(cfg);
  const pairs = readJson(files(cfg).pairs, null);
  if (!pairs) {
    process.stderr.write("no blind pairs yet: run `node spikes/sp-029/blind.js --prepare` first\n");
    return 2;
  }
  if (argv.includes("--summary")) {
    process.stdout.write(summary(tally(pairs, readJson(files(cfg).choices, {}))) + "\n");
    return 0;
  }
  serve(cfg, pairs, process.env.PORT === undefined ? 8791 : Number(process.env.PORT));
  return undefined;
}

if (require.main === module) {
  try {
    const code = main(process.argv.slice(2));
    if (code !== undefined) process.exitCode = code;
  } catch (err) {
    process.stderr.write(`sp-029 blind: ${err.message}\n`);
    process.exitCode = 2;
  }
}

module.exports = { summary };
