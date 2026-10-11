"use strict";

// A local stand-in for the TypeSafe API (POST /v1/systemone), so the real
// SDK and the real `judge-story` CLI run end-to-end without the network.
// `respond(body)` returns { status, json } for each request.

const http = require("node:http");

async function startMockJev(respond) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : null;
      requests.push({ method: req.method, url: req.url, body });
      const { status = 200, json } = respond(body);
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(json));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, requests, close: () => new Promise((r) => server.close(r)) };
}

// A well-formed systemOne answer: every noul question gets `p`, every score
// question gets `level` (0–2), unless overridden per question name.
function answerAll(body, { p = 0.9, level = 2, overrides = {} } = {}) {
  const answers = {};
  for (const [name, q] of Object.entries(body.questions)) {
    answers[name] =
      overrides[name] ??
      (q.type === "noul"
        ? { type: "noul", noul: p }
        : { type: "score", score: level, confidence: 0.8, legend: {}, probabilities: {} });
  }
  return { model: "jev-mock", answers, usage: { input_tokens: 1, output_tokens: 1 } };
}

module.exports = { startMockJev, answerAll };
