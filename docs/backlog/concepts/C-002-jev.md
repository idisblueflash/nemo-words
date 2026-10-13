---
id: C-002
type: concept
status: active
aliases: [TypeSafe, judgment service, judgment call]
related: [C-012, C-009]
---
# C-002 Jev

**Meaning:** The outside judging service (TypeSafe, called through `scripts/lib/jev.js`). It answers small yes/no questions (Nouls) and 1–3 scores, with a probability for each. It routes ambiguous words, judges stories and tags techniques. It needs `TYPESAFE_API_KEY`.
**Example:** `judge-route` asks Jev if `wary` is built from classical parts. Jev answers p word-part 0.12, so the word gets a story card.
**Not the same as:** `claude -p`, which writes text (definitions, glosses, stories). Jev only judges; it never writes a story.
