---
description: How backlog items get built here — stack, test commands and conventions for the backlog plugin's teddy, qa and buzz agents.
---

# Building backlog items

`/backlog:implement <ID>` (the `backlog` plugin, phase 6) builds one `ready` item from
`docs/backlog/items/`: `backlog:teddy` implements it test-first, `backlog:qa` checks it
black-box, `backlog:buzz` fixes what `qa` flags. These are the repo-specific facts they need.

## Stack

The repo has two halves. Work in whichever one the item's scenarios touch; the logic sketch
or the files it names usually make that obvious. The E01 card pipeline is all Node.

**Node scripts** — `scripts/*.js` (+ `scripts/lib/`), stdlib only, Node 18+.
- Tests are `test/*.test.js` on `node:test`; run the full suite with `node --test`.
- Name story tests after the item and scenario, e.g. `test/card-us039-ac1-logged-row.test.js`.
  Shared fixtures live in `test/helpers/`.
- Exercise scripts the way a user would, e.g. `node scripts/card.js <word>`.

**Clojure CLI** (`nemo-words`) — `clojure` CLI / `deps.edn`.
- Source is `src/nemo_words/`, one namespace per file: `src/nemo_words/ipa.clj` is
  `nemo-words.ipa`. Follow the item's own `nemo-words.<ns>/<fn>` naming when it gives one.
- Tests are `test/nemo_words/`, mirroring the namespace with a `_test` suffix
  (`test/nemo_words/ipa_test.clj` is `nemo-words.ipa-test`). Run with `clojure -M:test`
  (`cognitect.test-runner`).
- Convention: a pure function plus a thin CLI wrapper. A subcommand an item asks for
  (e.g. `ipa-lookup`) is wired into `core.clj` over the pure function.
- Black-box checks: pure functions via a `clojure -M -e` one-liner (require the namespace,
  call the function); CLI wrappers via `clojure -M:ipa …` or whatever alias `core.clj`
  exposes, or the installed `nemo-words` CLI.

A full check runs both suites: `node --test` and `clojure -M:test`.

## Bug reports

`backlog:buzz` files them in `docs/backlog/bugs/`. Numbering continues the legacy
reports in `docs/user-stories/bug-*.md` (one shared counter, so numbers never repeat):
take the next number above the highest in **both** folders, not just `docs/backlog/bugs/`.

## Legacy stories

US-001…US-027 under `docs/user-stories/` (tracked in `FEAT-*.md`) are done and frozen.
Don't build, QA or fix against them; only `docs/backlog/items/` is in scope.

## Before refining (and building)

Each step of the story workflow needs research on real data before its rules are set
(review, 2026-10-12: US-041's exact-IPA rule, written from intuition, left 14 of 40
sample words with no anchor). So before `/backlog:refine` sets an item to `ready`, if
the item adds or changes a step's rules (`chunk`, `find-keywords`, `compose-stories`,
`check-stories`, `pick-story`, …) or rests on claims about the real data
(`resources/data/`, `data/mnemonics/log.jsonl`, Flash's own cards), have `_david`
investigate it first, and draft the ACs from what it measures. `_david` is a local
agent, not part of the plugin.
