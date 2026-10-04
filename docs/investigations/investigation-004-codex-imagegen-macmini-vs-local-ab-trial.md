---
title: "Codex image generation: is the Mac mini route better than the local tunnel?"
status: resolved
related_adr: "[ADR-0024](../decisions/0024-route-codex-image-runs-through-the-mac-mini-via-an-http-connect-proxy-over-ssh.md)"
investigated: 2026-10-04
---

## Investigation findings (2026-10-04)

Follow-up to ADR-0024. Only one image run had gone through the Mac mini when the ADR was
written. This note records a paired A/B trial of the two routes and what it does and does not
show.

**Headline: the Mac mini route rendered the grid in both valid rounds (117 s and 139 s). The
local route failed both (one 600 s timeout, and one still unfinished after about 435 s when the
trial was stopped). One of the three rounds is void because the Mac went to sleep.**

### Setup

* Same request for every run: the `shattered` brief `_vivian` wrote
  (`shattered.prompt.txt`, session scratchpad) plus `docs/mnemonics/style-anchor.png`.
* **Local** = `run_codex_imagegen.py` called directly. The shell sets
  `HTTPS_PROXY`/`HTTP_PROXY=http://127.0.0.1:7897` (Clash), which the launcher now passes
  through, so this is the ADR-0023 route.
* **Mac mini** = `scripts/codex-imagegen-via-macmini.sh`, the ADR-0024 route.
* Both used the launcher's HTTPS-only provider and its 600 s limit.
* In each round both routes started at the same moment, so they faced the same network
  conditions. There were 3 rounds, run one after another. The whole trial had a 35-minute
  limit (background task, `ab-trial.sh` in the session scratchpad).

### Runs

| Round | Start (local time) | Local | Mac mini |
|---|---|---|---|
| 1 | 12:26:54 | ❌ timed out at 600 s, no PNG | ✅ PNG in **117 s** |
| 2 | 12:36:54 | ⚠️ void: the Mac slept (exit 124 after 1058 s of wall clock) | ⚠️ void: the Mac slept (exit 124 after 1059 s) |
| 3 | 12:54:33 | ❌ no PNG after about 435 s, when the trial's limit stopped it | ✅ PNG in **139 s** |

### Why round 2 doesn't count

`pmset -g log` shows `Entering Sleep state due to 'Idle Sleep'` at 12:37:34 and `Wake from
Deep Idle` at 12:46:02. Both runs were frozen across that gap, which is why each took about
1058 s of wall clock against a 600 s limit. The sleep also dropped the SSH `-L` tunnel. At the
start of round 3 the wrapper logged `opened tunnel 127.0.0.1:8899 -> macmini`. It noticed the
tunnel was gone, rebuilt it, and the run succeeded. That is the reconnect-on-demand behaviour
ADR-0024 intended.

### Tally for 2026-10-04 (same `shattered` brief throughout)

* Mac mini: **3 of 3** succeeded (the `_vivian` run that produced the carded grid, plus
  rounds 1 and 3), each in about 2 minutes.
* Local: **0 of 4** (two `_vivian` timeouts that morning at 300 s and 600 s, plus rounds 1
  and 3).

### What this does and does not show

* It shows the Mac mini route is far more reliable than the local tunnel today, and about
  3–5× faster when it works. That supports keeping `_vivian` on the wrapper.
* The sample is small, all on one day, and all with one brief. The morning's local failures
  ran at a different time than the paired rounds.
* The local tunnel's proxy node wasn't recorded per run, so this doesn't rule out a better
  Clash node closing the gap.
* Next time, run the trial under `caffeinate -i` so the Mac can't sleep, and give it a longer
  overall limit so every round can finish.

### Leftovers

The trial left two extra grids in `~/.codex/generated_images/`
(`01a1052a-…/exec-cae4ac29-….png` and `01a10543-…/exec-8d3360de-….png`). Nothing in the repo or
on the cards changed.
