---
title: "Codex image generation: does a lighter request survive the flaky connection?"
status: resolved
related_adr: "[ADR-0023](../decisions/0023-make-codex-image-runs-survive-the-unstable-proxy-tunnel.md)"
investigated: 2026-10-03
---

## Investigation findings (2026-10-03)

Follow-up to ADR-0023. `_vivian` had failed three times to render the `intra-` grid
("codex timed out after 300 seconds"). This note records the Codex test runs made that day
and what they do and do not show.

**Headline: a light brief (155 words, 1536×1536 asked, "low quality draft") rendered the
`intra-` grid in 347.6 s over HTTPS-only transport with a 600 s limit. The first image attempt
inside that run failed at about 2 minutes and Codex's own retry succeeded. The launcher's
default 300 s limit would still have killed the run.**

### Setup

* Codex CLI 0.160.0, ChatGPT login, macOS, system proxy = Clash Verge Rev (GLOBAL mode,
  127.0.0.1:7897).
* All runs used the `codex-imagegen` launcher's exact command, sandbox and sanitized
  environment through a wrapper (`diag_imagegen.py`, session scratchpad) that only adds
  `--json` and captures stdout/stderr, which the launcher sends to `/dev/null`.
* "HTTPS-only" means these two CLI overrides, which stop Codex trying WebSockets first:
  `-c 'model_providers.chatgpt_https={name="ChatGPT (HTTPS only)", base_url="https://chatgpt.com/backend-api/codex", wire_api="responses", requires_openai_auth=true, supports_websockets=false}'`
  `-c model_provider=chatgpt_https`
* Style anchor `docs/mnemonics/style-anchor.png` attached on every run.

### Runs

| # | Brief | Transport | Limit | Proxy node | Result |
|---|---|---|---|---|---|
| 1–3 | 747 words, 2304×2304 (`_vivian`'s) | default (WebSocket first) | 300 s | 日本 03 | Timed out at 300 s, no PNG. No diagnostics (output discarded). |
| 4 | same | default | raised | 日本 03 / 日本 01 | WebSocket reconnects 5/5 timed out, HTTPS fallback after ~113 s, image step reached at ~121 s, then `image generation failed: network error: error sending request` ~344 s after the image call began. |
| 5 | same | HTTPS-only | 600 s | 日本 01 标准BGP中继 | Image step reached at 7 s. Same `network error` at ~349 s. Run then hit the 600 s limit with no PNG. |
| 6 | **light: 155 words, 1536×1536, "low quality draft"** | HTTPS-only | 600 s | Japan AC 2 3X | **Success in 347.6 s.** First image attempt failed ~121 s in (`image generation failed: connection failed: error sending request`), a retry produced the PNG. `failed to refresh available models: request timed out` logged 7 times during the run. |

Run 6 timeline (local time): start 16:12:02, image error 16:14:03, PNG returned 16:17:50.

Run 6 output: 1254×1254 PNG (not the 1536 requested), 2.5 MB, nine 418 px panels. Saved as
`images/mnemonic/intra-.grid.png`; cell 1 became `images/mnemonic/intra-.png`.

Run 6 brief (verbatim):

```
$imagegen
One square image, 1536x1536, low quality draft: a 3x3 grid of nine equal square panels with thin white gutters, no outer border, no text anywhere.
Every panel shows the same scene restaged: students in matching teal jerseys playing basketball inside their own school gym, enclosed by bold brick-orange walls. One team only, no rivals. The walls are the boldest, most saturated shape in each panel.
Vary only the camera: 1 wide shot; 2 low angle under a shooter; 3 top-down, gym as a walled box; 4 over the shoulder toward the hoop; 5 close-up high-five; 6 side view of a pass; 7 corner huddle; 8 closing the gym door from inside; 9 ball bouncing among feet.
Style: brush-pen comic line art, thick tapered ink outlines, flat chalky gouache fills, sparse flat backgrounds, no hatching, no gradients, no shadows. Image 1 is a style reference for line and palette only; do not copy its content.
```

### What this shows

* **HTTPS-only is worth keeping.** It removes a ~113 s WebSocket penalty on every run
  (runs 4 vs 5).
* **A 600 s limit is needed.** The one successful run took 347.6 s.
* **Codex retries the image call internally.** Run 6 logged one failed attempt and then
  succeeded, so ADR-0023's "one long, non-resumable call" description is incomplete: a single
  attempt is not resumable, but the tool call is retried.
* **A lighter request got through where the heavy one did not** (run 5 vs run 6), on a
  connection that was visibly flaky during the successful run.

### What this does not show

* **Which change mattered.** Run 6 changed brief length, requested size, requested quality
  and the proxy node all at once, and it is a single run.
* **Whether the size and quality requests were honoured.** The output was 1254×1254, not
  1536×1536; the built-in tool documents no size or quality controls.
* **Where the failures come from.** ADR-0023 inferred a ~345 s idle cutoff in the proxy
  tunnel. Open Codex issues report the same error without a proxy
  ([#29645](https://github.com/openai/codex/issues/29645): simple prompts succeed in ~40 s,
  ordinary illustration prompts fail at ~240 s) and with a Clash-family proxy
  ([#45381](https://github.com/openai/codex/issues/45381): ~305 s, five POST attempts ~60 s
  apart). The cause may be on OpenAI's side. Not determined here.
* **Style fidelity of the light brief.** The grid has window scenery, floor markings and
  wall texture that `_vivian`'s full brief forbids. No style QA was done.

### Not tested

* **Splitting the sheet into strips or single panels** — planned only as a fallback if run 6
  failed.
* **Codex Cloud** (`codex cloud exec`) — blocked: the account has no cloud environment for
  this repo (`environment 'idisblueflash/nemo-words' not found`), and the official docs do
  not confirm that cloud tasks can generate images or return binary files.
* **The official Image API with streaming** (`partial_images`) — needs an API key and bills
  per image.

### Follow-ups for ADR-0023

* Keep A (HTTPS-only) and C (600 s limit); both are now backed by a successful run.
* Reframe B from "1536 sheet" to "lighter brief": shorter text and a smaller sheet, with the
  style rules that must survive the trim still to be decided.
* Correct the diagnosis: internal retries exist, and the tunnel cutoff is one candidate
  cause, not the established one.
