# Anki note type — "Basic"

One card per Greek/Latin morpheme (prefix, root, or suffix) or WHO INN drug-name
stem, produced by the `explain-greek-latin-blocks` or `explain-inn-drug-stem`
skill's breakdown. Recognition only — part in canonical form on the front,
origin/meaning/examples on the back. No production/prediction card (that
practice happens outside Anki, by design).

Uses Anki's built-in **Basic** note type — it ships in every collection, so
there's no note type to create or maintain. `Front` holds the canonical part;
`Back` folds origin, meaning, and examples into one field via `<br>` line
breaks (see `SKILL.md` for the exact format).

## Importing cards

Cards accumulate in `anki/reading-room-terms.txt` (repo root) — Anki's
plain-text import format, shared with ordinary whole-word vocabulary rows
since word-part rows were merged into this file (ADR-0016). Word-part rows
are the ones whose `Deck`/`Tags` columns override the header's defaults:

```
#separator:tab
#html:true
#notetype:Basic
#deck:00 Reading Room::Terms
#tags:reading-room-terms
#media-dir:images/mnemonic
#columns:Front	Back	Image	IPA	Gloss	Deck	Tags
thalass-	🎭 The lass sailed across the endless blue sea.<hr><i>Greek</i><br>sea<br><span class="examples">e.g. thalassaemia</span>				00 Reading Room::01 Medical Terms	medical-word-parts
haem-	<i>Greek</i><br>blood<br><span class="examples">e.g. hemoglobin, hematology, hemolysis</span>				00 Reading Room::01 Medical Terms	medical-word-parts
-ia	<i>Greek</i><br>condition of<br><span class="examples">e.g. anemia, hypothermia</span>				00 Reading Room::01 Medical Terms	medical-word-parts
```

`thalass-` shows the optional mnemonic shape: a `🎭` sentence first, then `<hr>`, then
the origin/meaning/examples block — no `mnemonic:` label, no `<br>` before the `<hr>`.
Most rows have no mnemonic at all (`haem-`, `-ia` above); add one only when one already
exists for that part.

In routine use, rows go live via `node scripts/anki-sync.js "<front>"`
(AnkiConnect), which reads the row's `Deck`/`Tags` columns and routes it to
deck `00 Reading Room::01 Medical Terms` tagged `medical-word-parts` — not a
manual **File → Import**. A manual import would still work (Anki reads the
header directives the same way, and imports every row in the file — both
kinds — resolving each row's own `Deck` via its override column), but that's
a fallback, not the normal path; see `.claude/rules/scripts.md`.

Re-syncing after appending new rows only adds the new ones — `anki-sync.js`
looks each row up by deck + `Front` first and patches in place rather than
duplicating.
