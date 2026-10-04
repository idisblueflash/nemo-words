---
status: proposed
deciders: Flash Hu
date: 2026-10-04
---

# 0024. Route Codex image runs through the Mac mini via an HTTP CONNECT proxy over SSH

## Context and Problem Statement

ADR-0023's fixes (HTTPS-only transport, a 600 s launcher timeout) made Codex image runs
possible on this Mac's proxy tunnel, but not reliable. On 2026-10-04 `_vivian` failed the
`shattered` grid twice in a row (timeouts at 300 s and 600 s, exit 124, no PNG). The cause is
the same tunnel cutoff described in ADR-0023.

Flash's Mac mini (`ssh macmini`, `SMTVs-Mac-mini-2.local.`) has a better route out. From the
mini, `api.openai.com` and `chatgpt.com` answered in about 0.5 s with no proxy configured
there. It doesn't have Codex, Node, the repo, or the `codex-imagegen` skill, though. The
question was how to use the mini's connection without moving the render pipeline onto it.

Two facts found while trying this:

* **Codex can't use a SOCKS proxy.** An `ssh -D 127.0.0.1:1081 macmini` tunnel worked for
  `curl`. But `codex exec` with `HTTPS_PROXY`/`ALL_PROXY` set to either `socks5h://` or
  `socks5://` failed every request immediately (`Request failed ... is_connect=true`) and kept
  retrying ("Reconnecting... waiting for network"). An image run set up this way just timed out
  at 600 s.
* **The launcher drops proxy variables.** `run_codex_imagegen.py` passes only its
  `SAFE_ENV_NAMES` allowlist to Codex. ADR-0023 rejected widening it (option E) because Codex
  already uses the macOS system proxy. That reasoning holds for the local tunnel, but the only
  way to send Codex to a *different* proxy is through these environment variables.

## Decision Drivers

* The `_vivian` grid has to render without depending on this Mac's flaky tunnel.
* Keep the existing pipeline: same launcher, same sandbox, same style anchor, and the PNG still
  lands on this Mac where the crop/compose scripts and the Anki sync run.
* Don't put the ChatGPT login on a second machine.
* Expose nothing new on the LAN.

## Considered Options

* A. SOCKS tunnel through the mini (`ssh -D`), proxy variables passed through the launcher
* B. HTTP CONNECT proxy on the mini (localhost-only) reached over `ssh -L`, proxy variables
  passed through the launcher
* C. Install Node + Codex on the mini, log in there, and run the render on the mini, copying the
  prompt and style anchor over and the grid back
* D. Keep using only this Mac's tunnel (ADR-0023 as it stands)

## Decision Outcome

Chosen option: **B**. It's the only option that has actually worked from this Mac. A fails
because Codex only accepts an HTTP proxy. C needs the ChatGPT login and a second toolchain on
the mini, plus moving files both ways for each render. D is what just failed twice.

Measured result: through B, a tiny `codex exec` answered "ok" (about 13k tokens), and the
`shattered` grid rendered on the first attempt (exit 0, 1254×1254 sheet) using the same prompt
file and style anchor that had timed out twice on the local tunnel. That's a single success,
so the status stays `proposed` until more runs are in.

Concretely:

* `scripts/macmini-proxy/connect_proxy.py` is a stdlib-only asyncio HTTP CONNECT proxy. It
  allows CONNECT only, binds to `127.0.0.1:8899` on the mini, and has no auth.
* `scripts/codex-imagegen-via-macmini.sh [launcher args...]` makes sure that proxy is running
  on the mini (copying it to `/tmp/connect_proxy.py` there and starting it with `nohup` if
  needed). It then makes sure `ssh -f -N -L 127.0.0.1:8899:127.0.0.1:8899 macmini` is up, and
  health-checks `chatgpt.com` through it. Finally it `exec`s the bundled launcher with
  `HTTPS_PROXY`/`HTTP_PROXY`/`ALL_PROXY=http://127.0.0.1:8899`. If the mini is unreachable or
  the check fails, it warns on stderr and runs the launcher directly (ADR-0023's path).
  `--down` closes the tunnel and stops the remote proxy.
* `run_codex_imagegen.py`'s `SAFE_ENV_NAMES` now includes `ALL_PROXY`, `HTTPS_PROXY` and
  `HTTP_PROXY`. That is ADR-0023's rejected option E, adopted here for a different reason.
  Flash approved the edit after the auto-mode classifier had refused it.
* `_vivian` calls the wrapper instead of the bare launcher, with a 700 s Bash timeout, and
  reports which path the wrapper took.

### Positive Consequences

* Renders go out over the mini's stable connection instead of the tunnel that cuts long
  silent requests.
* No login, Node or Codex install on the mini. All it needs is SSH key auth and the
  `python3` already there.
* The pipeline is unchanged after the network hop: same launcher flags, same sandbox, the
  grid lands in `~/.codex/generated_images/` on this Mac, and crop/compose/sync are untouched.
* It degrades gracefully. With the mini off, the wrapper falls back to the local path rather
  than failing.

### Negative Consequences

* Renders now depend on the mini being on and reachable over the LAN (`.local` mDNS name).
  When it's away, runs are back to ADR-0023's odds.
* The launcher's environment allowlist is wider. That's a global skill shared by other
  projects. Any caller that sets `HTTP(S)_PROXY`/`ALL_PROXY` now redirects Codex, which is
  intended, but it's a broader attack surface than before.
* The proxy on the mini lives in `/tmp` and isn't a service. It dies on reboot, and the
  wrapper restarts it on the next run. It has no auth, so any local process on the mini can
  reach the internet through it. The listener is bound to localhost only.
* `scripts/` is gitignored in this repo (`.gitignore` line 10, `/scripts/`), so the wrapper
  and proxy aren't version-controlled. Rebuilding them depends on this ADR and the local copy.
* Codex's other traffic during the run (the model stream and the `/models` refresh) also goes
  through the mini. That's fine, but the mini's link becomes a single hop for the whole run.
* Only one image run has been measured. Whether the mini's route avoids the ~345 s cutoff
  every time, or only did so this time, is still open.

## Pros and Cons of the Options

### A. SOCKS tunnel (`ssh -D`)

* Good, because it's a single built-in SSH flag with nothing to run on the mini.
* Bad, because Codex rejects SOCKS proxies (every request failed instantly with
  `is_connect=true`), so it can't work as things stand.

### B. HTTP CONNECT proxy over `ssh -L`

* Good, because it was measured to work end to end, and the image render succeeded first try.
* Good, because it needs no login or install on the mini, and it's localhost-bound at both ends.
* Bad, because it means widening the launcher's environment allowlist and running an
  unmanaged proxy process on the mini.

### C. Run Codex on the mini

* Good, because it has no proxy layer at all and the render runs where the network is good.
* Bad, because it needs the ChatGPT login and a Node/Codex toolchain on a second machine.
* Bad, because every render means copying the prompt and anchor over and the grid back, and
  the launcher and skill would need installing there too.

### D. Local tunnel only

* Good, because there's nothing new to maintain.
* Bad, because it failed twice on `shattered` that day, even with ADR-0023's fixes in place.

## Links

* ADR-0023: the tunnel cutoff this works around. Its HTTPS-only transport and 600 s timeout
  stay in place. This ADR adopts its rejected option E, for a different reason.
* ADR-0008 / ADR-0009: house style and the `_vivian` grid this affects
* investigation-004: the paired local-vs-Mac-mini A/B trial behind the note below

## Notes

* **2026-10-04: paired A/B trial, Mac mini 2/2 vs local 0/2.** The `shattered` brief ran on
  both routes at the same moment, in 3 rounds. Through the Mac mini it rendered in 117 s and
  139 s. Locally it timed out at 600 s, and was still unfinished after about 435 s when the trial
  ended. One round is void because the Mac slept. The sleep dropped the SSH tunnel, and the
  wrapper rebuilt it on the next run. Today's tally on this brief is Mac mini 3/3 and local 0/4.
  The status stays `proposed`: it's one day and one brief, and the next trial should run under
  `caffeinate -i`. Details: `docs/investigations/investigation-004-codex-imagegen-macmini-vs-local-ab-trial.md`.
