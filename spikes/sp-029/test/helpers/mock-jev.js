"use strict";

// A local stand-in for Jev (POST /v1/systemone), reached through
// scripts/lib/jev.js by an env file (NEMO_JEV_ENV_FILE) that holds a fake key
// and the mock's base URL. Each `cell_N` question is answered from the
// fixture captions: the story says "lightness X", a caption says
// "lightness Y", and p = 1 − |X − Y| / 255, so the cell nearest in gray
// level wins. `byWord[word]` overrides that for one word:
//   "http-500"  answer HTTP 500
//   "unusable"  answer p = "high" for every question
//   { cell_N: p, … }  fixed p per question (others 0.5)

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const level = (text) => Number((/lightness (\d+)/.exec(text) || [])[1]);

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
        let p;
        if (over === "unusable") p = "high";
        else if (over) p = name in over ? over[name] : 0.5;
        else p = 1 - Math.abs(level(body.state.story) - level(body.state.pictures[name])) / 255;
        answers[name] = { type: "noul", noul: p };
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
