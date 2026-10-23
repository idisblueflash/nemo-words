// jev.systemOne retries a dropped connection.
//
// A proxy can drop the TLS handshake now and then ("Client network socket
// disconnected before secure TLS connection was established"). judge-stories
// sends its calls in parallel and gives up on the first failure, so one drop
// skipped the judging for every story. systemOne now tries a connection error
// again, after a short wait; an HTTP answer or a timeout is not retried.

const test = require("node:test");
const assert = require("node:assert/strict");
const jev = require("../scripts/lib/jev");

const cfg = { apiKey: "k", baseURL: "http://jev.test", model: "jev-latest", proxyEnv: {} };
const req = { state: {}, questions: { a: jev.noul("q") } };
const noWait = { retryDelaysMs: [0, 0] };

const ok = () => new Response(JSON.stringify({ answers: { a: { noul: 0.7 } } }), { status: 200 });
const dropped = () => {
  const e = new TypeError("fetch failed");
  e.cause = new Error("Client network socket disconnected before secure TLS connection was established");
  return e;
};

// A fetch that fails the first `fails` calls with `failure()`, then answers ok.
function flakyFetch(fails, failure = dropped) {
  const f = async () => {
    f.calls++;
    if (f.calls <= fails) {
      const r = failure();
      if (r instanceof Error) throw r;
      return r;
    }
    return ok();
  };
  f.calls = 0;
  return f;
}

test("jev.systemOne: a dropped connection is tried again, and the answer of the next try is returned", async () => {
  const f = flakyFetch(2);
  const answers = await jev.systemOne(req, { config: cfg, fetch: f, ...noWait });
  assert.deepEqual(answers, { a: { noul: 0.7 } });
  assert.equal(f.calls, 3);
});

test("jev.systemOne: after 3 dropped tries it gives up with the last cause", async () => {
  const f = flakyFetch(99);
  await assert.rejects(
    jev.systemOne(req, { config: cfg, fetch: f, ...noWait }),
    (e) => e instanceof jev.JevError && /^Jev could not be reached: fetch failed \(Client network socket disconnected/.test(e.message)
  );
  assert.equal(f.calls, 3);
});

test("jev.systemOne: an HTTP answer is not retried, not even a 5xx", async () => {
  for (const status of [451, 500, 503]) {
    const f = flakyFetch(1, () => new Response("nope", { status }));
    await assert.rejects(
      jev.systemOne(req, { config: cfg, fetch: f, ...noWait }),
      (e) => e instanceof jev.JevError && new RegExp(`HTTP ${status}`).test(e.message)
    );
    assert.equal(f.calls, 1, `HTTP ${status}`);
  }
});

test("jev.systemOne: a timeout is not retried", async () => {
  const f = flakyFetch(1, () => new DOMException("The operation was aborted due to timeout", "TimeoutError"));
  await assert.rejects(
    jev.systemOne(req, { config: cfg, fetch: f, ...noWait }),
    (e) => e instanceof jev.JevError && /timeout/.test(e.message)
  );
  assert.equal(f.calls, 1);
});

test("jev.systemOne: it waits between tries (default 500 ms, then 1000 ms)", async () => {
  const f = flakyFetch(1);
  const t = Date.now();
  await jev.systemOne(req, { config: cfg, fetch: f, retryDelaysMs: [120] });
  assert.ok(Date.now() - t >= 110, "waited before the 2nd try");
  assert.deepEqual(jev.RETRY_DELAYS_MS, [500, 1000]);
});
