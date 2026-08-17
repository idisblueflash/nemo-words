# nemo-words

## Dependency graph (DGML)

To visualize `src/nemo_words/` as a DGML dependency graph (nodes per
`def`/`defn`/`defn-`, grouped by namespace, with `Calls` edges inferred
from symbol references), run:

```
scripts/gen-dgml.sh [SRC_DIR] [OUT_FILE]
```

Defaults: `SRC_DIR=src/nemo_words`, `OUT_FILE=docs/nemo_words.dgml`.

Re-run this any time the source changes instead of hand-authoring DGML —
it's a regex-based scan (no real Clojure reader), so it won't catch macro
expansion or lexical shadowing, but it correctly distinguishes public vs.
`^:private`/`defn-` symbols, flags `-main` as an entry point, and resolves
both same-namespace bare calls and `alias/symbol` calls via each file's
`:require :as` map (linking to sibling namespaces in `SRC_DIR` when
possible, otherwise to an external-library node).

## Interactive dependency graph (rename-capable)

For a live, clickable view of the same graph — docstrings on click,
inline rename that rewrites `src/nemo_words/*.clj` on disk (def site and
every call site) — run:

```
node scripts/graph-server.js
```

then open `http://localhost:8787`. It re-scans the source on every
request (same regex heuristic as `scripts/gen-dgml.sh`, kept in sync by
hand between the two scripts) and refuses to rename `-main` or a name
that would collide with an existing def. Every rename runs a
`clojure ... :reload-all` compile check and reverts all touched files if
it fails. As with any tool that rewrites source in place, only point it
at a clean git working tree so `git diff` / `git checkout` stay your
undo button.
