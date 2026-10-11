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
   [investigation-005](../investigations/investigation-005-mnemonic-vs-definition-retention.md).)*
2. The app can auto-pick the story and image (no human pick) with good-enough quality,
   and can improve that pick quality over time. · hypothesis
3. AI-drafted stories and images are good enough to learn from, and the app can improve
   them. · hypothesis
4. Generating one card is cheap and fast enough to do for every new word. · hypothesis
5. Users keep reviewing in Anki; the app only generates the card material and delivers
   it via live sync or an importable deck file. · hypothesis

## Out of scope for the first release
- A mobile app.
- An own review scheduler (Anki does the reviewing).
- Word-part / classical-morpheme cards (the `_etta_mology` path).
- The casual looker-up who has no review habit.
