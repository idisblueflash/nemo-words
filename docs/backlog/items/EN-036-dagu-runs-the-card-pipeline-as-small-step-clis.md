---
id: EN-036
type: enabler
parent: E01
status: ready
---
# EN-036 Dagu runs the card pipeline as small step CLIs

**Why now:** US-028's eight steps each run as one small CLI under Dagu; this sets up Dagu and the step contract before the story is built.
**Done when:** A Dagu workflow runs two stub step CLIs end-to-end on one word, passing the first step's output to the second, and a failing step stops the run with its error visible.

## Step contract (agreed 2026-10-11)
- Every step is a Node script in `scripts/` (stdlib only, like `anki-sync.js`), tested with `node:test`.
- Plain output, like a normal CLI: the result goes to stdout, one record per line, fields tab-separated, list fields comma-separated. Nothing else goes to stdout.
- Notes and warnings (e.g. `g2p-synthesized — verify`) go to stderr.
- Exit codes: `0` ok; `1` stopped with a reason (reasons on stdout, one per line); `2` error.
- Inputs are positional arguments where natural; multi-line inputs are passed as a file path.
- A `claude -p` step strips tabs and newlines from model text before printing.

## Acceptance criteria

```gherkin
Given  two stub step scripts that follow the step contract
  - When  Flash starts the pipeline with one word
    - Then  the second step receives the first step's stdout as its input
    - And   the run ends as succeeded
```

```gherkin
Given  a step that exits 1 with a reason
  - When  the pipeline reaches that step
    - Then  no later step runs
    - And   the run ends as stopped, not failed, and shows the step's reason
```

```gherkin
Given  a step that exits 2 or crashes
  - When  the pipeline reaches that step
    - Then  no later step runs
    - And   the run ends as failed, and shows the step's stderr
```

```gherkin
Given  a finished run, whether it succeeded, stopped or failed
  - When  Flash looks at that run
    - Then  each step's stdout and stderr can be read on its own
```

```gherkin
Given  a fresh clone of the repo with Dagu installed
  - When  Flash starts the pipeline with one command
    - Then  it runs without copying any file into Dagu's own config folder
```

## Logic sketch
Verified against Dagu 2.18.2 with a throwaway probe workflow (2026-10-11).
- **Entities:**
  - Pipeline: `dags/card.yaml` in the repo; params `WORD`; `working_dir` = repo root
  - Step: id, command (`node scripts/<step>.js …`), `output` var, `depends`
  - Run: id, status (succeeded | stopped | failed), per-step stdout/stderr logs
- **States:** running → succeeded (every step exits 0); running → stopped(step, reasons) on exit 1 (Dagu itself reports "Succeeded" with the later steps skipped); running → failed(step, stderr) on exit 2 or a crash.
- **Rules:**
  - Dagu natively covers: `output: VAR` capture read as `${VAR}` by later steps (Unicode IPA passes cleanly); separate `.out`/`.err` log per step, printed by `dagu status`; `dagu start <path>.yaml -- WORD=…` runs straight from the repo; exit 2 → step failed, rest aborted, run Failed.
  - Exit 1 = clean stop: `defaults: continue_on: {exit_code: [1], mark_success: true}`, plus on every step after the first a precondition `${<prev>.exit_code}` == `0`. The stopping step succeeds, every later step is skipped (skips cascade), the reason stays in that step's stdout log.
  - One-command entry `scripts/card.js <word>`: picks a run id, runs `dagu start --run-id <id> dags/card.yaml -- WORD=<word>`, reads `dagu status --run-id <id>` and maps it: succeeded with skipped steps → prints `stopped at <step>: <reasons>`, exit 1; Failed → prints the failing step's stderr, exit 2; clean success → prints the result, exit 0. This is "the one-word command" in US-028's ACs.
  - A multi-line or large result goes to a file under the run's directory and the next step gets the path, matching the step contract.
  - The two stub steps are throwaway; US-028 replaces them with its real CLIs.
- **Edge cases:** Dagu not installed → `card.js` exits 2 with "install Dagu", not a raw spawn error; the global `dags_dir` points at another project (`~/Projects/sumomo/workflows`), so the pipeline is always started by path, never by name; concurrent runs are safe because status is read by run id.

## Open questions
- [ ] Where the per-run scratch files live: assumed a folder keyed by run id under Dagu's log directory, or under `scratchpad/` if Dagu doesn't expose its run directory to steps. Settle during build.
- [ ] Whether a `dags/` folder at the repo root is the right home, or `scripts/dags/`. Assumed `dags/`.
