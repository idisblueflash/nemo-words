# Vision

**For** adult ESL readers **who** meet unfamiliar words while reading (AI answers and the
sources AI finds) and forget them within a week because dictionary definitions don't
stick, **nemo-words** is a word-card generator **that** turns each new word into a
mnemonic card — a vivid scene whose story anchors both the pronunciation and the
meaning, illustrated with an image or comic — quickly, cheaply, and with the story and
image picked automatically.
**Unlike** looking a word up and forgetting it, plain-definition Anki cards, or writing
mnemonic sentences by hand, it does the sound-anchor search, story, image and pick for
you, and delivers the finished card into Anki (live sync or an importable deck file).

## Personas
### Flash: the mnemonic crafter
- **Context:** Non-native speaker who reads lots of AI responses and the material AI
  finds; already builds sound+meaning+scene mnemonics with images/comics by hand and
  drills them daily in Anki.
- **Goal:** Read faster by making new words stick long-term, without spending most of
  the time crafting each card.
- **Frustration:** Reading in English is slow and hard; building a good card (anchors,
  story, image, pick, sync) per word is a multi-step, mostly manual pipeline.

### Anki reviewer: ESL professional with a review habit
- **Context:** Adult ESL reader who already looks words up and reviews them in Anki,
  mostly as definition cards; has never written a mnemonic. *Not yet interviewed —
  this persona is itself a hypothesis.*
- **Goal:** Remember the words they meet while reading, without changing their Anki
  review routine.
- **Frustration:** Definition cards keep coming back as "Again"; making better cards by
  hand is too much work.

## Riskiest assumptions (ranked)
1. A sound+meaning+scene story with an image or comic is remembered longer than a
   definition card. · hypothesis
   *(Flash's Anki data can't test it yet: every reading deck is already mnemonic, so
   there's no definition-card control, and almost no reviews have reached a 21-day
   interval. Published research is mixed: the keyword mnemonic wins on immediate
   recall, but without review it is forgotten faster than rote over days; repeated
   review and pictures largely close that gap — so the bet is really "mnemonic + image
   + spaced review in Anki" beats "definition + spaced review", which no study found
   tests directly. Details:
   [investigation-005](../investigations/investigation-005-mnemonic-vs-definition-retention.md).
   Review 2026-10-17: E02 needs about 80 cards per arm, not 30, to see a lapse rate of 20%
   against 40%. With 30 cards per arm the Wilson intervals overlap (C-043, ADR-0036).)*
2. The app can auto-pick the story and image (no human pick) with good-enough quality,
   and can improve that pick quality over time. · hypothesis
   *(SP-037: Jev didn't predict Flash's old story picks (no-go), but those old picks were
   often Claude suggestions accepted blindly, which Flash considers unreliable. The blind
   check is the better evidence: Flash accepted Jev's pick or rated it about the same on
   17 of 20 words. Jev's decomposed judgment (one small question per rubric gate and
   axis) hallucinates less than a single Claude pick. US-033's kept-count is the ongoing
   test. Image pick: SP-029 and SP-064 were no-go, and SP-066 runs now. Review 2026-10-17:
   62 measure words show only differences of about 15 points or more, and the kept count on
   20 words is a weak signal (14 of 20 has a Wilson interval of 48% – 85%, C-043). From the
   next image-pick spike after SP-066, go also needs the exact range above the always-cell-1
   rule (ADR-0035).)*
3. AI-drafted stories and images are good enough to learn from, and the app can improve
   them. · hypothesis
   *(Review 2026-10-12: building US-041 showed that a rule written from intuition can
   fail on real words. The exact-IPA keyword rule left 14 of 40 sample words with no
   anchor, while Flash's own cards used rhymes, names and split chunks. Lesson: each
   step of the story workflow needs its own research on real data before its rules are
   set, so the story is built more accurately. US-046 then confirmed it: a rhyme rule measured on real words anchored about 10 of the 14 no-anchor words, and Flash accepted the extra rhymes found while building (stew→two, vapor→way). US-050 and [investigation-007](../investigations/investigation-007-us-050-span-shift-contains-anchors.md) followed the same lesson: a closed chunk (ADR-0025) replaces about 33 of the 62 weak rhymes ye, yeah, des and huh, and US-060 is for the rest. 7 of 316 words still stop with no anchor (US-061).)*
4. Generating one card is cheap and fast enough to do for every new word. · hypothesis
5. Users keep reviewing in Anki; the app only generates the card material and delivers
   it via live sync or an importable deck file. · hypothesis

## Out of scope for the first release
- A mobile app.
- An own review scheduler (Anki does the reviewing).
- Word-part / classical-morpheme cards (the `_etta_mology` path).
- The casual looker-up who has no review habit.
