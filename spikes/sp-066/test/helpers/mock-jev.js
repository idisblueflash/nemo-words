"use strict";

// A local stand-in for Jev (POST /v1/systemone), reached through
// scripts/lib/jev.js by an env file (NEMO_JEV_ENV_FILE) that holds a fake key
// and the mock's base URL. It answers SP-066's Score questions
// `cell_<N>_<axis>` from the fake captions in the state, the way the rubric says:
//   plausible  level 2·(1 − |X − Y| / 255), X the story's lightness, Y the cell's
//   vivid      0 when a shown must-see item is small; else 2 when the action
//              line says the objects act on each other and every shown item
//              is large; else 1. An angle other than eye level costs one
//              level (not below 0) unless angle_case is view or one-object.
//   clarity    0 when a must-see item is partly cut or small; else 2 when
//              every shown item is large; else 1
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
  let level = 2 * (1 - Math.abs(lightness(state.story) - lightness(c.objects)) / 255); // plausible
  const shown = Object.values(c.must_see || {}).filter((x) => x.mark !== "hidden");
  const small = shown.some((x) => x.size === "small");
  const allLarge = shown.every((x) => x.size === "large");
  if (axis === "vivid") {
    level = small ? 0 : /act on each other/.test(c.action) && allLarge ? 2 : 1;
    if (c.angle !== "eye level" && !["view", "one-object"].includes(state.angle_case)) level = Math.max(0, level - 1);
  } else if (axis === "clarity") level = small || shown.some((x) => x.mark === "partly cut") ? 0 : allLarge ? 2 : 1;
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
