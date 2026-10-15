---
id: US-063
type: story
parent: E01
status: idea
concepts: [C-003, C-005, C-011, C-025]
---
# US-063 A word rhyme from the stressed vowel to the end

As Flash, I want a second kind of rhyme anchor that matches the sound from the stressed vowel to the end of the word (levee → heavy, coaster → toaster, bulge → indulge), as well as the rhyme anchor on one chunk that the pipeline uses today, so that more words get a rhyme that sounds like the whole word, and fewer words stop.

**Scope (Flash, 2026-10-15):** keep the rhyme on one chunk (US-046) as it is. Add the word rhyme as a further method beside it. investigation-007 section 6 tried this rule: it has a candidate for 227 of 316 words (111 of the 196 words where the tail has 2+ syllables; a median of 4 candidates). It gives an anchor to 3 of the 7 words that stop today (bulge → indulge, divulge; durable → incurable; garage → massage, barrage). It holds 13 of Flash's 30 anchors of the classes "rhyme over 2+ syllables" and "chunk at the end". Open at refine: the order of the two rhyme methods, and how the word rhyme's keyword line covers more than one chunk (compare US-059).
