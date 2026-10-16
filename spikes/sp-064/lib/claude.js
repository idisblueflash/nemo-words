"use strict";

// The one way SP-064 calls `claude -p` (or $SP064_CLAUDE_BIN): in a fresh
// temp folder that holds only the files the step puts there, with a fixed
// prompt and a fixed tool list. Claude writes every text step; Jev only judges.
// A failed call, an empty answer or an answer that isn't the JSON the step
// asked for is a ClaudeError, so the word is unjudged and nothing is cached.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");

class ClaudeError extends Error {}

const oneLine = (text) => String(text).replace(/\s+/g, " ").trim();

// ask(prompt, { tools, prepare }) → stdout text.
//   tools:   "" for a text-only call, "Read" to let it look at the folder's images
//   prepare: (dir) => void, puts the call's files into its folder
function makeClaude({ bin = "claude", model = "sonnet", timeout = 300000 } = {}) {
  return (prompt, { tools = "", prepare = () => {} } = {}) =>
    new Promise((resolve, reject) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "call-"));
      try {
        prepare(dir);
      } catch (err) {
        fs.rmSync(dir, { recursive: true, force: true });
        return reject(new ClaudeError(`couldn't prepare the call: ${err.message}`));
      }
      const args = ["-p", prompt, "--model", model, "--tools", tools];
      if (tools) args.push("--allowedTools", tools);
      const child = execFile(bin, args, { cwd: dir, timeout, maxBuffer: 4 << 20 }, (err, stdout, stderr) => {
        fs.rmSync(dir, { recursive: true, force: true });
        // claude -p says why it failed (e.g. a usage limit) on stdout
        if (err) return reject(new ClaudeError(`claude failed (exit ${err.code}): ${oneLine(stdout)} ${oneLine(stderr)}`.trim()));
        if (!String(stdout).trim()) return reject(new ClaudeError("claude gave an empty answer"));
        resolve(String(stdout));
      });
      child.stdin.end(); // nothing to read: don't make claude -p wait for stdin
    });
}

// The JSON object in a model answer (it may sit in a ```json fence).
function parseJson(text) {
  const s = String(text);
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end < start) throw new ClaudeError(`unusable claude answer (no JSON): ${oneLine(s).slice(0, 120)}`);
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch (err) {
    throw new ClaudeError(`unusable claude answer (bad JSON: ${err.message}): ${oneLine(s).slice(0, 120)}`);
  }
}

// Runs `fn` over `items` with at most `jobs` at once.
async function pool(items, jobs, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(jobs, items.length)) }, worker));
}

module.exports = { makeClaude, parseJson, pool, oneLine, ClaudeError };
