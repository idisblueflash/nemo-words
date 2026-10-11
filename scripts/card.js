#!/usr/bin/env node
// EN-036 / US-028: "the one-word command" — one word in, a synced story card
// out (dags/card.yaml).
//
// Usage: node scripts/card.js <word>
//
// Starts dags/card.yaml *by path* (the global Dagu dags_dir points at another
// project) under a fresh run id, reads `dagu status --run-id`, and maps it:
//   last step ran          -> the last step's stdout (the run report), exit 0
//   a step exited 1        -> `stopped at <step>: <reasons>` on stdout, exit 1
//                             (Dagu itself calls this run "Succeeded", with the
//                             later steps skipped; the stopper is the last
//                             step that ran)
//   a step exited 2/crashed-> `failed at <step>:` + its stderr on stderr, exit 2
// The run id and the command to inspect each step's own stdout/stderr logs
// are printed on stderr. If Dagu is missing or can't run the DAG: exit 2.

const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..");
// Env overrides the step CLIs honour; dags/card.yaml declares each as a param.
const FORWARDED_ENV = [
  "ANKI_FILE",
  "ANKI_CONNECT_URL",
  "ANKI_SYNC_LOG",
  "NEMO_MNEMONIC_LOG",
  "NEMO_ALTERNATES_LOG",
  "NEMO_CLAUDE_BIN",
  "NEMO_WORDS_BIN",
  "NEMO_WORD_FREQ_BIN",
  "NEMO_JEV_ENV_FILE",
];
const dagPath = path.join(repoRoot, "dags", "card.yaml");

function fail(message) {
  process.stderr.write(`card: ${message}\n`);
  process.exit(2);
}

function dagu(args) {
  // a wide COLUMNS keeps `dagu status` from wrapping its lines
  const res = spawnSync("dagu", args, { encoding: "utf8", env: { ...process.env, COLUMNS: "10000" } });
  if (res.error && res.error.code === "ENOENT") fail("`dagu` not found on PATH; install Dagu first (e.g. `brew install dagu`)");
  if (res.error) fail(`could not run dagu: ${res.error.message}`);
  return res;
}

// Parses `dagu status` output into [{ id, status, stdout, stderr }] in step
// order; stdout/stderr are the paths of that step's own log files.
function parseStatus(text) {
  const steps = [];
  for (const line of text.split("\n")) {
    const head = /^[├└]─(\S+)(?: \([^)]*\))? \[(\w+)\]$/.exec(line);
    if (head) {
      steps.push({ id: head[1], status: head[2] });
      continue;
    }
    const log = /[├└]─(stdout|stderr): (.+)$/.exec(line);
    if (log && steps.length) steps[steps.length - 1][log[1]] = log[2];
  }
  return steps;
}

function readLog(file) {
  return file ? fs.readFileSync(file, "utf8") : "";
}

function main() {
  const word = process.argv[2] ?? ""; // no argument must not become the text "undefined"
  const runId = `card-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  // Dagu doesn't pass this process's environment on to steps, so the
  // overrides the steps honour travel as DAG params (exported to every step).
  const overrides = FORWARDED_ENV.filter((k) => process.env[k]).map((k) => `${k}=${process.env[k]}`);
  const start = dagu(["start", "-q", "--run-id", runId, dagPath, "--", `WORD=${word}`, ...overrides]);
  const status = dagu(["status", "--run-id", runId, dagPath]);
  const steps = parseStatus(status.stdout);
  if (status.status !== 0 || steps.length === 0) {
    fail(`dagu could not run the pipeline:\n${start.stdout}${start.stderr}${status.stderr}`.trimEnd());
  }
  process.stderr.write(`card: run ${runId} (inspect: dagu status --run-id ${runId} ${dagPath})\n`);

  const failed = steps.find((s) => s.status === "failed");
  if (failed) {
    process.stderr.write(`failed at ${failed.id}:\n${readLog(failed.stderr)}`);
    process.exit(2);
  }

  // Stopped = the last step never ran. Skips alone don't mean a stop: the
  // DAG skips a whole branch on purpose (the logged-story path skips the
  // drafting steps) and still reaches its last step. The stopper is the last
  // step that did run, since everything after an exit-1 step is skipped.
  if (steps[steps.length - 1].status === "skipped") {
    const stopper = [...steps].reverse().find((s) => s.status !== "skipped");
    if (!stopper) fail("dagu skipped every step of the pipeline");
    const reasons = readLog(stopper.stdout).split("\n").filter(Boolean);
    process.stdout.write(`stopped at ${stopper.id}: ${reasons.join("; ")}\n`);
    process.exit(1);
  }

  process.stdout.write(readLog(steps[steps.length - 1].stdout));
}

main();
