---
status: accepted
deciders: Flash Hu
date: 2026-09-07
---

# 0007. Reuse Codex CLI's built-in $imagegen skill (gpt-image-2) for _vivian's mnemonic image generation

## Context and Problem Statement

_vivian turns a vocabulary word and its mnemonic sentence into a rendered
image. That needs a text-to-image backend callable non-interactively from a
script (generate a 3×3 sheet, then crop a chosen cell). Options were: call an
image-model HTTP API directly with an API key and per-image billing, run a
local diffusion model, or shell out to a CLI that already has an authenticated
image-generation capability. We already have the Codex CLI installed and
authenticated against a ChatGPT subscription.

## Considered Options

* Reuse Codex CLI's built-in `$imagegen` skill (gpt-image-2) via the
  `codex-imagegen` Claude Code skill
* Call OpenAI's Images API (or another provider's) directly with an API key
* Run a local diffusion model (e.g. FLUX / ComfyUI)
* An MCP image server (mcp-image, Gemini MCP, nano-banana)

## Decision Outcome

Chosen option: "Reuse Codex CLI's `$imagegen` via the `codex-imagegen` skill",
because it rides the existing ChatGPT-subscription auth (no new API key, no
per-image credit spend), gives gpt-image-2 quality, and the skill already
handles the awkward scripting — parsing Codex's stdout for the session id,
locating the PNG, and copying it out past Codex's sandbox.

### Positive Consequences

* No new secret to manage; image generation billed under an existing
  subscription rather than metered API credits.
* _vivian's workflow stays a thin wrapper — one skill invocation plus
  `scripts/crop-grid-cell.sh`.
* Model upgrades (e.g. gpt-image-2) arrive via Codex CLI updates with no
  change here.

### Negative Consequences

* Hard dependency on the `codex` CLI being installed, authenticated, and a
  compatible version (`$imagegen` needs v0.117.0+, gpt-image-2 v0.123.0+).
* Coupled to Codex's sandbox and stdout format; an upstream change there can
  break the wrapper.
* No provider choice — locked to whatever model Codex's `$imagegen` exposes.

## Links

* Related: ADR-0006 (B&W manga line-art house style for _vivian)
