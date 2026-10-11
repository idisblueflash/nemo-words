// US-039 AC1 (bug-009): the caller's proxy variables must reach tag-technique
// through card.js and Dagu (Dagu passes steps only the DAG's declared params).
//
// Deterministic, no real network or real proxy: Jev's base URL is an
// unresolvable host, and the caller's HTTP_PROXY/HTTPS_PROXY point at a tiny
// in-process CONNECT proxy that tunnels to the harness's mock Jev. The only
// way the request can arrive is through the forwarded proxy variables. The
// Jev env file carries no proxy of its own.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

function createTunnelProxy(targetPort) {
  const connects = [];
  const server = http.createServer((req, res) => {
    res.writeHead(502);
    res.end("only CONNECT is supported");
  });
  server.on("connect", (req, clientSocket, head) => {
    connects.push(req.url);
    const upstream = net.connect(targetPort, "127.0.0.1", () => {
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length) upstream.write(head);
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });
    upstream.on("error", () => clientSocket.destroy());
    clientSocket.on("error", () => upstream.destroy());
  });
  return { server, connects };
}

test("US-039 AC1: card.js forwards the caller's proxy variables so tag-technique reaches Jev through them", async () => {
  const h = await createHarness(germaneFixture());
  const proxy = createTunnelProxy(h.jev.server.address().port);
  await new Promise((r) => proxy.server.listen(0, "127.0.0.1", r));
  try {
    const proxyUrl = `http://127.0.0.1:${proxy.server.address().port}`;
    fs.writeFileSync(h.jevEnvFile, "TYPESAFE_API_KEY=test-key\nTYPESAFE_BASE_URL=http://jev.invalid\n");
    h.env.HTTP_PROXY = proxyUrl;
    h.env.HTTPS_PROXY = proxyUrl;
    // Everything local (dagu's own socket/API, the AnkiConnect mock) must
    // bypass the proxy; only the unresolvable Jev host goes through it.
    h.env.NO_PROXY = "127.0.0.1,localhost";

    const run = await h.runCard("germane");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);

    assert.ok(proxy.connects.includes("jev.invalid:80"), `Jev was never reached through the caller's proxy: ${proxy.connects}`);
    assert.equal(h.jev.calls[0].path, "/v1/systemone");
    const log = h.readJsonl(h.mnemonicLog);
    assert.equal(log.length, 1);
    assert.deepEqual(log[0].technique, ["keyword-method", "scene-depicts-meaning"]);
    assert.doesNotMatch(run.stdout, /technique tags missing/);
  } finally {
    await new Promise((r) => proxy.server.close(r));
    await h.cleanup();
  }
});
