// Local page for Flash to mark the gold-set cells. Saves each answer to labels.json at once.
// Run: node spikes/sp-070/gold/serve.js  →  http://localhost:8790
const http = require("http");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "../../..");
const LABELS = path.join(__dirname, "labels.json");
const PORT = Number(process.env.PORT) || 8790;

const readLabels = () => (fs.existsSync(LABELS) ? JSON.parse(fs.readFileSync(LABELS, "utf8")) : {});

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const send = (code, type, body) => { res.writeHead(code, { "content-type": type }); res.end(body); };
  if (url.pathname === "/") return send(200, "text/html; charset=utf-8", fs.readFileSync(path.join(__dirname, "page.html")));
  if (url.pathname === "/data.json") {
    const cells = JSON.parse(fs.readFileSync(path.join(__dirname, "cells.json"), "utf8"));
    return send(200, "application/json", JSON.stringify({ cells, labels: readLabels() }));
  }
  if (url.pathname.startsWith("/grid/")) {
    const file = path.join(root, "images/mnemonic", path.basename(decodeURIComponent(url.pathname.slice(6))));
    if (!fs.existsSync(file)) return send(404, "text/plain", "no grid");
    return send(200, "image/png", fs.readFileSync(file));
  }
  if (url.pathname === "/label" && req.method === "POST") {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      const { key, value } = JSON.parse(body);
      const labels = readLabels();
      if (value) labels[key] = { ...value, at: new Date().toISOString() }; else delete labels[key];
      fs.writeFileSync(LABELS, JSON.stringify(labels, null, 2) + "\n");
      send(200, "application/json", "{}");
    });
    return;
  }
  send(404, "text/plain", "not found");
}).listen(PORT, () => console.log(`gold-set page: http://localhost:${PORT}`));
