---
description: Batch-prepare new vocabulary words — classify, explain+mnemonic, auto-pick a Nemo story, save to Anki
argument-hint: word1, word2, word3
---

Parse `$ARGUMENTS` into a list of words: split on commas and/or whitespace, trim each
token, drop empty ones, keep them in the order given. If the list is empty, ask Flash
for words instead of proceeding.

For each word, run two cheap deterministic checks directly via Bash (the `Workflow`
tool's script sandbox has no filesystem/Bash access, so this has to happen out here,
before the workflow starts):

```bash
node scripts/classify-word.js "<word>"
grep -i "^<word>\b" anki/reading-room-terms.txt        # already carded?
node scripts/find-mnemonic.js "<word>"                 # story already logged? (exit 0 = yes)
```

Read `classify-word.js`'s `**Verdict:**` line (`medical` / `ambiguous` / `no match`).
From the `grep`, determine whether the word already has a **card** in
`anki/reading-room-terms.txt` (exact `Front` match); from that row's `Back`, check
whether it contains a `🎭` segment, and combine with `find-mnemonic.js`'s exit code for
`hasStory`. Build a `word` object carrying all of it, e.g. `{ "word": "phlebotomy",
"verdict": "medical", "existsInCard": true, "hasStory": false }`. These are direct,
deterministic checks, not a judgment call — don't spend an agent on either.

Then call the `Workflow` tool with `args: { "words": [...] }` (the list of `{word,
verdict, existsInCard, hasStory}` objects just built) and this exact script:

```js
export const meta = {
  name: 'prepare-words',
  description: 'Classify, explain, mnemonic-ize, and auto-save a batch of new vocabulary words',
  phases: [
    { title: 'Classify' },
    { title: 'Explain' },
    { title: 'Story' },
    { title: 'Save' },
  ],
}

const CLASSIFY_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['glossy', 'etta'] },
    reason: { type: 'string' },
  },
  required: ['type'],
}

const NEMO_SCHEMA = {
  type: 'object',
  properties: {
    candidates: { type: 'array', items: { type: 'string' }, minItems: 1 },
    topPickIndex: { type: 'integer', minimum: 0 },
    topPickReason: { type: 'string' },
  },
  required: ['candidates', 'topPickIndex'],
}

const EXISTING_SCHEMA = {
  type: 'object',
  properties: {
    hasStory: { type: 'boolean' },
    say: { type: 'string' },
    ipa: { type: 'string' },
    def: { type: 'string' },
    sound: { type: 'string' },
    meaning: { type: 'string' },
    story: { type: 'string' },
  },
  required: ['hasStory'],
}

// Workflow's `args` sometimes arrives as a JSON-encoded string rather than an
// already-parsed object, depending on how the calling turn passed it -- handle both.
let parsedArgs = args
if (typeof parsedArgs === 'string') {
  try {
    parsedArgs = JSON.parse(parsedArgs)
  } catch (e) {
    parsedArgs = {}
  }
}
const words = (parsedArgs && parsedArgs.words) || []
if (!words.length) log('No words given -- nothing to do.')

const results = await pipeline(
  words,

  // Stage 1: classify general-English (glossy) vs medical/INN (etta).
  // scripts/classify-word.js already ran directly (outside this sandbox) and its
  // verdict is carried on each item. Trust "medical" (strong match -> etta) and
  // "no match" (nothing matched -> glossy) outright -- no agent needed. Only spend
  // a real LLM classification call when the script came back "ambiguous".
  async (item) => {
    const word = item.word
    if (item.verdict === 'medical') {
      return { word, type: 'etta', classifiedBy: 'script' }
    }
    if (item.verdict === 'no match') {
      return { word, type: 'glossy', classifiedBy: 'script' }
    }

    const c = await agent(
      `Classify the word "${word}" per this repo's word-workflow.md routing rule: is it ` +
        `general-English vocabulary with no classical morpheme structure (route: "glossy") or a ` +
        `word built from Greek/Latin morphemes or an INN drug name (route: "etta")? Return only ` +
        `the classification.\n\n` +
        `Context: scripts/classify-word.js, a cheap heuristic pre-filter, already checked this word ` +
        `and returned verdict "${item.verdict || 'unknown (script failed)'}" -- not a confident ` +
        `medical match -- so it's falling to your judgment.`,
      { phase: 'Classify', label: `classify:${word}`, schema: CLASSIFY_SCHEMA }
    )
    return { word, type: c && c.type === 'etta' ? 'etta' : 'glossy', classifiedBy: 'llm' }
  },

  // Stage 2: explain -- dispatches the real specialist agent, but skips the dispatch
  // entirely when the word already has a card (checked in Bash before the workflow
  // started, carried as item.existsInCard).
  async (item) => {
    const word = item.word
    if (item.existsInCard) {
      return { ...item, explainReport: null, skippedExplain: true }
    }
    if (item.type === 'etta') {
      const report = await agent(`have Etta explain this: ${word}`, {
        agentType: '_etta_mology',
        phase: 'Explain',
        label: `explain:${word}`,
      })
      return { ...item, explainReport: report }
    }
    const report = await agent(`have Glossy explain this: ${word}`, {
      agentType: '_glossy_ary',
      phase: 'Explain',
      label: `explain:${word}`,
    })
    return { ...item, explainReport: report }
  },

  // Stage 3: story candidates -- glossy words only, skip if a story already exists.
  async (item) => {
    const word = item.word
    if (item.type !== 'glossy') return item
    if (item.existsInCard && item.hasStory) {
      return { ...item, skippedStory: true, existing: null }
    }
    const existing = await agent(
      `Run: grep -i "^${word}\\b" anki/reading-room-terms.txt\n` +
        `Report ONLY whether the card for "${word}" already has a non-empty 🎭 story segment ` +
        `(true/false), plus its current say/ipa/def/sound/meaning/story parsed from the row's ` +
        `Back field if a card exists at all.`,
      { phase: 'Story', label: `check:${word}`, schema: EXISTING_SCHEMA }
    )
    if (!existing || existing.hasStory) {
      return { ...item, skippedStory: true, existing }
    }
    const nemo = await agent(
      `Word: "${word}". It was just explained and carded in anki/reading-room-terms.txt with no ` +
        `story yet.\n` +
        `Pronunciation: ${existing.say || '(look it up)'} ${existing.ipa || ''}\n` +
        `Definition: ${existing.def || '(look it up)'}\n` +
        `Sound axis: ${existing.sound || '(look it up)'}\n` +
        `Meaning axis: ${existing.meaning || '(look it up)'}\n` +
        `Brainstorm your usual story candidates for it.`,
      { agentType: '_nemo', phase: 'Story', label: `nemo:${word}`, schema: NEMO_SCHEMA }
    )
    return { ...item, nemo, existing }
  },

  // Stage 4: auto-save the top pick, push alternates onto the Anki card for later review
  async (item) => {
    const word = item.word
    if (
      item.type !== 'glossy' ||
      item.skippedStory ||
      !item.nemo ||
      !item.nemo.candidates ||
      !item.nemo.candidates.length
    ) {
      return item
    }
    const idx = Math.min(Math.max(item.nemo.topPickIndex || 0, 0), item.nemo.candidates.length - 1)
    const chosen = item.nemo.candidates[idx]
    const alternates = item.nemo.candidates.filter((_, i) => i !== idx)
    const altList = alternates.map((c, i) => `${i + 1}. ${c}`).join('\n')
    const saveReport = await agent(
      `Save an auto-picked mnemonic story for the word "${word}" in anki/reading-room-terms.txt. ` +
        `This is a deliberate, scoped exception to the usual human-picks-the-story rule documented ` +
        `in .claude/rules/word-workflow.md's batch-prep note -- proceed without asking for ` +
        `confirmation.\n\n` +
        `CHOSEN STORY (save verbatim, exactly as given, apostrophes and all):\n"""\n${chosen}\n"""\n\n` +
        `ALTERNATE CANDIDATES (for the Anki card only):\n"""\n${altList || '(none)'}\n"""\n\n` +
        `Steps:\n` +
        `1. In anki/reading-room-terms.txt, find the row whose Front is exactly "${word}" and rebuild ` +
        `its Back field in the file's standard shape from that row's CURRENT parsed fields ` +
        `(say/ipa/def/sound/meaning), ending with "<br>\u{1F3AD} " + the chosen story, then append one ` +
        `more segment: "<br><br><i>Nemo alternates (unreviewed):</i><br>" followed by the alternate ` +
        `candidates above, each on its own "<br>"-joined line. Patch the existing row in place -- ` +
        `don't duplicate it.\n` +
        `2. Run: ANKI_FILE=reading-room-terms.txt node scripts/anki-sync.js "${word}"\n` +
        `3. Append one line to anki/sync.log per the existing _glossy_ary/_etta_mology convention.\n\n` +
        `Report back word/def/sound/meaning/chosen-story/alternate-count and whether the write succeeded.`,
      { phase: 'Save', label: `save:${word}` }
    )
    return { ...item, chosenStory: chosen, alternates, saveReport }
  }
)

return results.filter(Boolean)
```

When the workflow returns, present a per-word digest in chat -- word, route
(glossy/etta) with how it was decided (`script` — the classify-word.js pre-filter's own
confident "medical" or "no match" verdict, no LLM call spent — or `llm` — the pre-filter
came back "ambiguous" and a judgment call was made), whether the explain stage ran or
was skipped (`explained` vs. `skipped — already carded`, per `item.skippedExplain`),
one-line definition, sound/meaning axes (glossy only, when explained or already known),
the saved status (`chosen story + N alternates now on the Anki card`, `skipped — already
had a story`, or `no story stage — medical/INN route`), and flag anything that failed
(Anki sync unreachable, multi-word-phrase guard triggered, etc.) instead of burying it.
Close with a reminder that full review — picking or composing the final story — happens
later in the Anki app itself, and to run the `update-anki-story` skill once Flash has a
final story text for a word (it writes the Anki row + the mnemonic log).
