---
title: "pick-example-words-by-ipa exits 0 instead of non-zero when lexical-sets.edn is missing"
status: fixed
original_story: "[US-005](US-005.md)"
ac: 4
found: 2026-08-23
---

# Bug

Expected: per US-005 AC 4 ("lexical-sets.edn does not exist yet"), when
`lexical-sets.edn` has not been built yet, running
`pick-example-words-by-ipa` should print a clear "no lexical sets built
yet" message and **exit non-zero**.

Actual: `pick-example-words-by-ipa-cli` correctly returns exit code `1` in
this case, but `-main` never passes any subcommand's return value to
`System/exit`, so the real OS process always exits `0` regardless of what
the underlying function returned.

# Reproduction

Command (run as a real subprocess, with `lexical-sets.edn` absent from the
working directory):

```
mv lexical-sets.edn /tmp/lexical-sets.edn.bak   # ensure the file is absent
clojure -M -m nemo-words.core pick-example-words-by-ipa /ɜr/ ; echo "EXIT=$?"
```

Observed output:

```
No lexical sets built yet. Run build-set (US-004) first.
EXIT=0
```

Confirmed: stderr message is correct, but exit code is `0`, not non-zero as
AC 4 requires. Root cause: `nemo-words.core/-main` (src/nemo_words/core.clj)
dispatches to `pick-example-words-by-ipa-cli` (and the other subcommands)
but discards the returned exit code instead of calling `(System/exit
exit-code)`, so the JVM process always exits 0 (the default) no matter what
any subcommand function returns.

# Fix

`-main` (src/nemo_words/core.clj) now binds the dispatched subcommand's
return value to `exit-code` and calls `(System/exit exit-code)` at the end,
instead of discarding the cond's result. Regression test:
`main-pick-example-words-by-ipa-missing-lexical-sets-exits-nonzero-test` in
test/nemo_words/core_test.clj, which shells out to the real
`clojure -M -m nemo-words.core` process (same pattern as the existing
`main-dispatches-ipa-lookup-subcommand-test`) and asserts a non-zero exit
code when `resources/lexical-sets.edn` doesn't exist.
