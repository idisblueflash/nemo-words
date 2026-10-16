"use strict";

// A local stand-in for Jev (POST /v1/systemone), reached through
// scripts/lib/jev.js by an env file (NEMO_JEV_ENV_FILE) that holds a fake key
// and the mock's base URL. It answers SP-064's Score questions
// `cell_<N>_<axis>` from the fake captions in the state:
//   plausible  level 2·(1 − |X − Y| / 255), X the story's lightness, Y the cell's
//   vivid      2 for an extreme close-up, else 1
//   clarity    0 when a must-see item is partly cut, else 2
// with confidence 0.9. `byWord[word]` overrides that for one word:
//   "http-500"  answer HTTP 500
//   "unusable"  answer score = "high" for every question
//   { cell_5_vivid: { score, confidence }, … }  fixed answers for those questions

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const lightness = (x) => Number((/lightness (\d+)/.exec(typeof x === "string" ? x : JSON.stringify(x)) || [])[1]);

function answer(name, state) {
  const [, cell, axis] = /^(cell_\d)_(\w+)$/.exec(name);
  const c = state.cells[cell];
  let level;
  if (axis === "plausible") level = 2 * (1 - Math.abs(lightness(state.story) - lightness(c.objects)) / 255);
  else if (axis === "vivid") level = c.shot === "extreme close-up" ? 2 : 1;
  else level = Object.values(c.must_see || {}).includes("partly cut") ? 0 : 2;
  return { type: "score", score: level, confidence: 0.9, legend: {}, probabilities: {} };
}

async function startMockJev({ byWord = {} } = {}, dir) {
  const calls = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw || "{}");
      calls.push({ url: req.url, auth: req.headers.authorization, body });
      const send = (status, json) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(json));
      };
      const over = byWord[body.state && body.state.word];
      if (over === "http-500") return send(500, { error: "mock Jev: internal error" });
      const answers = {};
      for (const name of Object.keys(body.questions || {})) {
        if (over === "unusable") answers[name] = { type: "score", score: "high", confidence: 0.9 };
        else answers[name] = { ...answer(name, body.state), ...((over && over[name]) || {}) };
      }
      send(200, { model: "jev-mock", answers });
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  const envFile = path.join(dir, "jev.env");
  fs.writeFileSync(envFile, `TYPESAFE_API_KEY=test-key\nTYPESAFE_BASE_URL=${url}\n`);
  return { url, envFile, calls, close: () => new Promise((r) => server.close(r)) };
}

module.exports = { startMockJev };
