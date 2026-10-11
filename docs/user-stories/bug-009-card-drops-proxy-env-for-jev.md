---
title: "card.js/Dagu drop the caller's HTTP(S)_PROXY, so tag-technique can't reach Jev (HTTP 451) and every auto-made card is logged with technique []"
status: fixed
original_story: "[[US-039-auto-made-card-is-logged-with-its-runner-ups]]"
ac: 1
found: 2026-10-12
---

## Bug

AC 1: the auto-made card is logged with technique tags from Jev. Expected: running
`node scripts/card.js <word>` from a shell that has `HTTPS_PROXY` set reaches Jev through
that proxy and logs one or two technique tags. Actual: Dagu does not hand the caller's
environment to steps, and neither `FORWARDED_ENV` in `scripts/card.js` nor the params in
`dags/card.yaml` include `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY`, so `tag-technique` calls
Jev directly, Jev answers HTTP 451 (region block), and the row is logged with
`technique: []`. The same step run straight from the shell works.

## Reproduction

Through `card.js` under Dagu via `test/helpers/card-harness.js` (throwaway DAGU_HOME, fakes,
mock AnkiConnect and Jev; no real network). The caller's `HTTP_PROXY`/`HTTPS_PROXY` point at
an in-process CONNECT proxy tunnelling to the mock Jev, and Jev's base URL is the
unresolvable `http://jev.invalid`:

```
node --test test/card-us039-ac1-proxy-forwarded.test.js
-> fails: "Jev was never reached through the caller's proxy" (no CONNECT seen;
   tag-technique ran without the proxy and logged technique [])
```

(`_qa` saw the live equivalent: `note: tag-technique: error: Jev answered HTTP 451`.)

Root cause: `FORWARDED_ENV` (`scripts/card.js`) and the params of `dags/card.yaml` omitted the
proxy variables, and Dagu hands steps only the DAG's declared params. Secondary: `config()` in
`scripts/lib/jev.js` ignored the caller's env whenever `NEMO_JEV_ENV_FILE` was set, so even a
forwarded proxy would not have been used by the harness's env-file seam.

## Fix

`scripts/card.js` (`FORWARDED_ENV`) and `dags/card.yaml` (params) now forward
`HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY` and their lowercase forms; `scripts/lib/jev.js` `config()`
takes proxy variables from the env file first, else the caller's env (the repo `.env` stays an
optional source). `.env` untouched. Regression test: `test/card-us039-ac1-proxy-forwarded.test.js`.
