---
id: C-023
type: concept
status: active
aliases: [New Oxford American Dictionary, the macOS dictionary, the NOAD extract]
related: [C-022, C-003]
---
# C-023 NOAD

**Meaning:** The New Oxford American Dictionary that is built into macOS. E07 takes each word's US IPA, syllables, definition and origin from it. Its content is copyrighted, so the extract stays on this Mac: it is never committed and never put in the release jar.
**Example:** `dictionaries/noad/extract.py` reads the Mac's NOAD into the gitignored `dictionaries/noad/data/noad.tsv`. SP-052's committed report holds only counts and word lists.
**Not the same as:** the CMU dictionary behind `nemo-words ipa-lookup`, which the card pipeline still uses today. NOAD has no personal names and few inflected forms, and CMU has both.
