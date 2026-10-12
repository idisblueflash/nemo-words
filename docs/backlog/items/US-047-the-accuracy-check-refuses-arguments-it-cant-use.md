---
id: US-047
type: story
parent: E01
status: idea
---
# US-047 The accuracy check refuses arguments it can't use

As Flash, I want the routing accuracy check to refuse an argument it can't use before it asks Jev anything, so that a typo never costs me a whole paid Jev run or leaves a stray report file behind.

**Scope (follow-ups from US-040's QA of `scripts/route-accuracy.js`):**
- **An option-like argument is taken as a report path.** `node scripts/route-accuracy.js --help` puts every word to Jev, then writes a file literally named `--help`. It should print usage and exit non-zero instead, with no Jev call and no file written.
- **Extra arguments and padded paths are taken silently.** `route-accuracy.js a.md b.md` writes `a.md` and ignores `b.md` without a word. A path with spaces around it (`" /abs/r.md "`) is used as typed, creating a folder named `" "`. Extra arguments should stop the check before any Jev call, and spaces around a path should be trimmed, consistent with US-040 scenario 14, which already treats a whitespace-only path as empty.
