---
id: C-033
type: concept
status: active
aliases: [FUNCTION_WORDS, function-word list]
related: [C-003, C-011, C-032, C-031]
---
# C-033 Function word

**Meaning:** A word that you cannot draw as a picture. Examples are pronouns, articles, prepositions, conjunctions, auxiliary verbs and words like "thus". The pipeline never uses a function word as a rhyme anchor, a closed keyword or a word rhyme. The list is fixed and short (`FUNCTION_WORDS` in `scripts/lib/rhyme.js`). You add a word to it when a card shows a gap.
**Example:** The chunk /flʌs/ rhymes with "us" and "thus". Both are function words, so the pipeline uses "plus".
**Not the same as:** a weak keyword such as ye, yeah, des or huh. These words are not in `FUNCTION_WORDS`. US-060 refuses them with a separate rule.
