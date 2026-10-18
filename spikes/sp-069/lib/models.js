"use strict";

// SP-069: the callers that caption a cell (Haiku, a local LM Studio model) and
// the one that judges a caption (Opus). Each returns { text, ms, costUsd }.
//
// Claude calls run `claude -p --output-format json` in a fresh folder that
// holds only picture.png, so the answer carries total_cost_usd.
// Local calls follow paper-degist's transport rule (ocr_page.py): the JSON
// body is written to a file and posted with `curl --data @body.json`, one
// request at a time, with a wait and a retry on a 502 or an empty body.
// Never Python's urllib: it takes the MLX vision worker down.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { ClaudeError, usageLimit } = require("../../sp-066/lib/claude");

const LMSTUDIO = process.env.SP069_LMSTUDIO_URL || "http://SMTVs-Mac-mini-2.local:1234/v1/chat/completions";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const run = (bin, args, opts) =>
  new Promise((resolve) => {
    const child = execFile(bin, args, { maxBuffer: 16 << 20, ...opts }, (err, stdout, stderr) => resolve({ err, stdout: String(stdout), stderr: String(stderr) }));
    child.stdin.end();
  });

function withPicture(picture, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sp069-"));
  fs.copyFileSync(picture, path.join(dir, "picture.png"));
  return fn(dir).finally(() => fs.rmSync(dir, { recursive: true, force: true }));
}

// A Claude model that looks at picture.png with the Read tool.
function claudeVision(model, { timeout = 300000 } = {}) {
  let limit = null;
  return (prompt, picture) =>
    withPicture(picture, async (dir) => {
      if (limit) throw limit;
      const t0 = Date.now();
      const { err, stdout, stderr } = await run(process.env.SP069_CLAUDE_BIN || "claude", ["-p", prompt, "--model", model, "--tools", "Read", "--allowedTools", "Read", "--output-format", "json"], { cwd: dir, timeout });
      const ms = Date.now() - t0;
      let j = null;
      try {
        j = JSON.parse(stdout);
      } catch {}
      const text = j ? String(j.result ?? "") : stdout;
      const hit = (err || (j && j.is_error)) && usageLimit(`${text} ${stderr}`);
      if (hit) throw (limit = limit || hit);
      if (err || !j || j.is_error) throw new ClaudeError(`claude ${model} failed: ${text.slice(0, 200)} ${stderr.slice(0, 200)}`.trim());
      if (!text.trim()) throw new ClaudeError(`claude ${model} gave an empty answer`);
      return { text, ms, costUsd: j.total_cost_usd ?? null };
    });
}

// A local LM Studio model. The prompt's first line (the Read-tool line) is
// swapped for one that points at the attached picture.
function localVision(model, { timeout = 600, tries = 3, gapMs = 20000 } = {}) {
  return (prompt, picture) =>
    withPicture(picture, async (dir) => {
      const text = prompt.replace(/^Use the Read tool to look at the image file picture\.png in the current folder\./, "Look at the attached picture.");
      const b64 = fs.readFileSync(path.join(dir, "picture.png")).toString("base64");
      const body = {
        model,
        temperature: 0,
        max_tokens: 4000,
        messages: [{ role: "user", content: [{ type: "text", text }, { type: "image_url", image_url: { url: `data:image/png;base64,${b64}` } }] }],
      };
      fs.writeFileSync(path.join(dir, "body.json"), JSON.stringify(body));
      let last = "";
      for (let k = 1; k <= tries; k++) {
        const t0 = Date.now();
        const { err, stdout } = await run("curl", ["-s", "-m", String(timeout), "-H", "Content-Type: application/json", "--data", "@body.json", "-w", "\n%{http_code}", LMSTUDIO], { cwd: dir });
        const ms = Date.now() - t0;
        const nl = stdout.lastIndexOf("\n");
        const code = stdout.slice(nl + 1).trim();
        const payload = stdout.slice(0, nl);
        if (!err && code === "200" && payload.trim()) {
          let j;
          try {
            j = JSON.parse(payload);
          } catch {
            throw new ClaudeError(`${model}: bad response body`);
          }
          const content = j.choices?.[0]?.message?.content;
          if (typeof content !== "string" || !content.trim()) throw new ClaudeError(`${model}: empty answer`);
          return { text: content, ms, costUsd: 0, tokens: j.usage ?? null };
        }
        last = err ? `curl: ${err.message}` : `HTTP ${code}: ${payload.slice(0, 200)}`;
        if (code && code !== "502" && code !== "000" && payload.trim()) break; // a 4xx won't get better
        if (k < tries) await sleep(gapMs);
      }
      throw new ClaudeError(`${model} failed: ${last}`);
    });
}

const isLocal = (model) => !["haiku", "sonnet", "opus"].includes(model);
const captioner = (model) => (isLocal(model) ? localVision(model) : claudeVision(model));

module.exports = { claudeVision, localVision, captioner, isLocal };
