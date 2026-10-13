---
id: C-005
type: concept
status: active
aliases: [syllable chunk, sound chunk]
related: [C-003, C-011, C-024]
---
# C-005 Chunk

**Meaning:** One syllable of a word's US pronunciation. The pipeline cuts the word's IPA at each syllable break, so a word with two syllables has two chunks. The search for a sound anchor is done one chunk at a time, and each chunk gets one anchor or none.
**Example:** critique is /kɹɪ.ˈtik/. The dot is the cut, so it has two chunks: /kɹɪ/ and /tik/. The mark ˈ shows that /tik/ is the stressed chunk.
**Not the same as:** a rime, which is only the vowel and the end sound of one chunk (/ik/ in /tik/). A rhyme anchor matches the rime, not the whole chunk.
