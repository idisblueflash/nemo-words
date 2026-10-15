---
title: "kept-count ignores every argument, so --help and a mistyped option print the normal report"
status: fixed
original_story: US-033
ac: 11
found: 2026-10-13
---
# bug-013 kept-count ignores every argument, so --help and a mistyped option print the normal report

## Bug
Expected: Scenario 11 of US-033 says what the arguments do. `--help` or `-h` prints a short usage text, prints no count and exits 0. Any other argument makes the command fail with `unknown argument: <arg>` and the usage text. It prints no count and exits 2.

Actual: The command ignores every argument. It contacts Anki, prints the normal report and exits 0.

## Reproduction
Reported: Expected: `--help` or `-h` prints a short usage text and no count (exit 0). Any other argument fails with `unknown argument: <arg>` plus the usage text, and no count (exit 2). Actual: every argument is ignored. The command contacts Anki and prints the normal report, exit 0.

Round 1 (2026-10-13), on `main` at `8985e88`, with a throwaway log of one auto-picked word (`NEMO_MNEMONIC_LOG`) and a mock AnkiConnect holding its reviewed card (`ANKI_CONNECT_URL`):

    node scripts/kept-count.js --help
    node scripts/kept-count.js --last 10

Observed for both, exit 0, stderr empty, and Anki was queried (`findNotes`, `notesInfo`, `cardsInfo`):

    kept 0 of 1 (0%)
    19 more needed for a verdict
    not met yet: 0
    overridden:
    - wary
        auto-picked: …
        now: …

## Fix
`scripts/kept-count.js`: `main` checks its arguments before it reads anything. `--help` / `-h` print the usage text (exit 0); any other argument throws `unknown argument: <arg>` plus the usage text (exit 2). Covered by `test/kept-count-us033-ac11-arguments.test.js`.
