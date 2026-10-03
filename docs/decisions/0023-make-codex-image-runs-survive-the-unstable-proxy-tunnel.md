---
status: proposed
deciders: Flash Hu
date: 2026-10-03
---

# 0023. Make Codex image runs survive the unstable proxy tunnel: HTTPS-only transport, a 1536 sheet, and a 600 s launcher timeout

## Context and Problem Statement

On 2026-10-03 `_vivian` failed three times in a row to render the `intra-` grid. Each time
the `codex-imagegen` launcher (`~/.claude/skills/codex-imagegen/scripts/run_codex_imagegen.py`)
stopped with "codex timed out after 300 seconds" and no PNG. The same launcher had rendered
grids earlier that day (08:40) and the day before. The ChatGPT account and quota were fine,
since Flash generated an image on ChatGPT web during the outage.

The launcher sends all Codex output to `/dev/null`. So the cause had to be reconstructed from
diagnostic reruns (same command plus `--json`, with stderr captured), the Clash Verge / mihomo
logs, and strings in the Codex 0.160.0 binary. That showed:

* **Codex uses the macOS system proxy itself** (`system_proxy_fallback`, stable/on). Dropping
  `HTTPS_PROXY` from the environment is *not* the cause. A tiny `codex exec` with exactly the
  launcher's sanitized environment reached `chatgpt.com` through Clash and answered.
* **Two earlier hypotheses were disproved:** TUN mode toggling (`enable_tun_mode: false` since
  Sep 23, no mode changes in the log) and the specific proxy server. Both 日本 03 and 日本 01
  标准BGP中继 failed the same way, and another Codex render succeeded through 日本 03 at 09:50.
* **WebSocket transport times out through the tunnel.** Codex opens the model stream over
  WebSockets first. All five attempts timed out (`Reconnecting... n/5 (request timed out)`),
  and only after about 113 s did it log `Falling back from WebSockets to HTTPS transport`.
  This happened on every observed run, on both servers.
* **The image request is one long, silent, non-resumable HTTP call.** The `imagegen` tool runs
  client-side (`ext/image-generation/src/tool.rs` → `codex-api/src/endpoint/images.rs`). Codex
  POSTs once and waits on that connection for the finished PNG. Nothing flows while the image
  renders, there is no job id to resume, and a drop loses the render
  (`image generation failed: network error: error sending request`). ChatGPT web very likely
  renders server-side and re-fetches the result after a dropped connection (inferred, not
  verified), which is why it survives the same tunnel.
* **The image call died at a consistent ~345 s** after it started (≈344 s and ≈349 s in two
  runs). That looks like a fixed idle-connection cutoff in the tunnel rather than random drops.
  No matching timeout was found in the Codex binary, but the proxy-side cutoff is still an
  inference. Every render that succeeded today finished inside it (≈3m10s, ≈3½ min). Today's
  slower renders run past it.

Combined, the WebSocket penalty (~2 min) plus a 3–4 min render already exceeds the launcher's
300 s default, and a render slower than ~345 s is cut by the tunnel regardless.

## Decision Drivers

* Image runs must finish within the launcher timeout even when the tunnel is flaky.
* The launcher's security posture stays as it is: read-only sandbox, sanitized environment,
  validated output paths. Passing proxy variables through was refused by the permission
  system as security-weakening, and it turned out to be unnecessary anyway.
* Fixes should be cheap, verifiable, and not depend on Flash re-tuning the proxy each time.
* Grid panels must still be large enough for the card (current panels are 418×418).

## Considered Options

* A. Turn off Codex's WebSocket transport in the launcher (HTTPS-only provider override)
* B. Shrink the requested sheet from 2304×2304 to 1536×1536 so the render finishes sooner
* C. Raise the launcher's default timeout from 300 s to 600 s
* D. Route `chatgpt.com` around the cutoff (another server, or Clash Rule mode with the
  subscription's `OpenAI` group)
* E. Pass `HTTP(S)_PROXY` through the launcher's environment allowlist
* F. Render single panels locally with ComfyUI's ZIT model instead of Codex

## Decision Outcome

Chosen option: **A + B + C together, with D as a follow-up experiment**, because each attacks
a different measured part of the failure. A removes the ~113 s WebSocket penalty (verified: a
tiny request dropped from ~2 min to 15 s, and the image brief reached the image step in 7 s
instead of 121 s). B shortens the silent window the tunnel has to keep alive, so a render can
finish before the ~345 s cutoff. C gives one Codex-internal retry room to complete. A alone was
verified insufficient: the image call still died at ~349 s. E is rejected because it was never
the cause (Codex already uses the system proxy). F stays a fallback for when Codex is down,
not the default pipeline, because it loses the attached style anchor and the 9-up grid.

Concretely:

* **A:** add to the `codex exec` command in `run_codex_imagegen.py`:
  `-c 'model_providers.chatgpt_https={name="ChatGPT (HTTPS only)", base_url="https://chatgpt.com/backend-api/codex", wire_api="responses", requires_openai_auth=true, supports_websockets=false}'`
  and `-c model_provider=chatgpt_https`. These are CLI overrides, so they still apply under
  `--ignore-user-config`.
* **B:** `_vivian`'s brief asks for a 1536×1536 sheet (512 px panels) instead of 2304×2304.
* **C:** the launcher's `--timeout` default becomes 600.

### Positive Consequences

* Every Codex image run (all projects using the `codex-imagegen` skill) saves ~2 minutes and
  stops logging spurious reconnect errors.
* Renders are more likely to finish inside the tunnel's apparent cutoff.
* The sandbox, environment allowlist, and output-path validation are untouched.

### Negative Consequences

* A and C edit a global skill (`~/.claude/skills/codex-imagegen/`) shared by other projects,
  and A pins a provider definition (base URL, `wire_api`) that a future Codex release may
  rename or change. Re-check after Codex upgrades.
* B lowers grid resolution. 512 px panels still exceed the 418 px card images, but there is
  less headroom for cropping.
* The ~345 s cutoff is inferred, not proven. If a render still takes longer than that, A–C
  won't save it, and D (or waiting for a faster render window) is the remaining lever.
* A 600 s timeout means a genuinely hung run now takes up to 10 minutes to report failure.

## Pros and Cons of the Options

### A. HTTPS-only transport

* Good, because it was measured: 2 min → 15 s on a tiny request, 121 s → 7 s to the image step.
* Good, because it's a CLI override with no sandbox or environment change.
* Bad, because on its own it didn't save the render (the image call still died at ~349 s).

### B. 1536×1536 sheet

* Good, because fewer pixels render faster, shrinking the silent window that gets cut.
* Bad, because panels drop from 768 px to 512 px.
* Bad, because the speed gain is expected, not yet measured.

### C. 600 s launcher timeout

* Good, because it leaves room for Codex's own retry after a dropped image call.
* Bad, because failures take longer to surface.

### D. Route `chatgpt.com` around the cutoff

* Good, because it could remove the cutoff at its source.
* Bad, because each test costs a ~6-minute render per server, servers were failing latency
  checks during testing, and Clash is in GLOBAL mode (the `OpenAI` group is ignored).
* Bad, because it depends on proxy state Flash changes by hand.

### E. Pass proxy env vars through the launcher

* Bad, because it doesn't fix anything: Codex already uses the system proxy.
* Bad, because it widens the launcher's environment allowlist (blocked as security-weakening).

### F. ComfyUI ZIT single panels

* Good, because it runs locally with no tunnel.
* Bad, because it has no style-anchor image, ignores negative prompts at CFG 1, and gives one
  panel instead of nine candidates.

## Links

* Diagnostic wrapper used for the measurements: session scratchpad `diag_imagegen.py`
  (launcher plus `--json` event capture, optional `--https-only`)
* ADR-0008 / ADR-0009 (house style and the `_vivian` grid this affects)
