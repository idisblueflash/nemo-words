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

Cards accumulate in `anki/medical-word-parts.txt` (repo root) — Anki's
plain-text import format, modeled on this project's existing
`anki-ivig-after-car-t-cell-therapy-*.txt` export (which also uses `Basic`).
Header directives fix the notetype, deck, and tags right in the file, so no
manual selection is needed at import time:

```
#separator:tab
#html:true
#notetype:Basic
#deck:01 Medical Terms
#tags:medical-word-parts
#columns:Front	Back
thalass-	<i>Greek</i><br>sea<br><span class="examples">e.g. thalassaemia</span>
haem-	<i>Greek</i><br>blood<br><span class="examples">e.g. hemoglobin, hematology, hemolysis</span>
-ia	<i>Greek</i><br>condition of<br><span class="examples">e.g. anemia, hypothermia</span>
```

**File → Import** → select `medical-word-parts.txt` → Anki reads the
directives and imports straight into deck `01 Medical Terms` using the
built-in `Basic` notetype, tagged `medical-word-parts`, no per-import choices
needed — because `Basic` already exists in every collection, Anki always
resolves it and the two columns (`Front`, `Back`) map automatically.

Re-running import after appending new rows only adds the new ones — Anki skips
duplicates by first-field (`Front`) match.
