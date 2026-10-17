---
id: C-038
type: concept
status: active
aliases: [ChunkKeyword, keyword line, the log's keyword]
related: [C-003, C-005, C-011, C-031, C-032]
---
# C-038 Keyword

**Meaning:** The word that `find-keywords` gives one chunk, so that the story can make Flash hear that chunk. A keyword has a type: an exact keyword (a sound anchor), a closed keyword, a rhyme anchor or a word rhyme. A chunk with no keyword has the line `ipa	-`.
**Example:** penalty → "pen" (closed keyword). drown → "down" (rhyme anchor, tag `rime`). durable → "incurable" (word rhyme, tag `word-rime`). The two later chunks of durable have no keyword, because the word rhyme covers them.
**Not the same as:** a sound anchor, which is only the exact type of keyword. Also not pivot words, which are the words in the sentence that carry the keywords.
