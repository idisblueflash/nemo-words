"use strict";

// Unit tests for lib/claude.js: telling a usage-limit answer (scenario 8)
// from every other failure (scenario 7), and the pool stopping on a throw.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { usageLimit, makeClaude, pool, ClaudeError, UsageLimitError } = require("../lib/claude");
const { tmpDir } = require("./helpers/harness");

test("usageLimit: the real session-limit answer, with its reset time", () => {
  const e = usageLimit("You've hit your session limit · resets 1:10pm (Asia/Shanghai)\n");
  assert.ok(e instanceof UsageLimitError);
  assert.ok(!(e instanceof ClaudeError), "no step catches it");
  assert.equal(e.resetsAt, "1:10pm (Asia/Shanghai)");
});

test("usageLimit: a usage-limit answer with no reset time", () => {
  assert.equal(usageLimit("Claude AI usage limit reached").resetsAt, null);
  assert.ok(usageLimit("You've hit your weekly limit"));
});

test("usageLimit: other failures aren't the limit", () => {
  assert.equal(usageLimit("API Error: 500 Internal server error"), null);
  assert.equal(usageLimit(""), null);
});

// A stand-in claude that prints $TEXT and exits $CODE, logging each call.
function fakeBin(dir) {
  const bin = path.join(dir, "claude");
  fs.writeFileSync(bin, `#!/usr/bin/env node\nrequire("fs").appendFileSync(${JSON.stringify(path.join(dir, "calls"))}, "x");\nprocess.stdout.write(process.env.TEXT);\nprocess.exit(Number(process.env.CODE));\n`);
  fs.chmodSync(bin, 0o755);
  return bin;
}
const calls = (dir) => (fs.existsSync(path.join(dir, "calls")) ? fs.readFileSync(path.join(dir, "calls"), "utf8").length : 0);

async function withEnv(env, fn) {
  const old = { ...process.env };
  Object.assign(process.env, env);
  try {
    return await fn();
  } finally {
    for (const k of Object.keys(env)) if (old[k] === undefined) delete process.env[k];
    else process.env[k] = old[k];
  }
}

test("makeClaude: after a limit answer, every later ask fails at once with no new call", async () => {
  const dir = tmpDir();
  const ask = makeClaude({ bin: fakeBin(dir) });
  await withEnv({ TEXT: "You've hit your session limit · resets 1:10pm (Asia/Shanghai)", CODE: "1" }, async () => {
    await assert.rejects(ask("p"), UsageLimitError);
  });
  await withEnv({ TEXT: '{"ok":true}', CODE: "0" }, async () => {
    await assert.rejects(ask("p"), UsageLimitError);
  });
  assert.equal(calls(dir), 1);
});

test("makeClaude: a JSON answer that mentions a session limit is an answer, and an error is a ClaudeError", async () => {
  const dir = tmpDir();
  const ask = makeClaude({ bin: fakeBin(dir) });
  await withEnv({ TEXT: '{"objects":[{"name":"sign","adjectives":["reads \\"session limit reached\\""]}]}', CODE: "0" }, async () => {
    assert.match(await ask("p"), /session limit/);
  });
  await withEnv({ TEXT: "API Error: 500", CODE: "1" }, async () => {
    await assert.rejects(ask("p"), (e) => e instanceof ClaudeError && /API Error: 500/.test(e.message));
  });
});

test("pool: once one item throws, no worker takes a new item", async () => {
  const seen = [];
  await assert.rejects(
    pool([1, 2, 3, 4, 5], 1, async (x) => {
      seen.push(x);
      if (x === 2) throw new Error("stop");
    }),
    /stop/,
  );
  assert.deepEqual(seen, [1, 2]);
});
