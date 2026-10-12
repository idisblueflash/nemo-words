---
id: US-038
type: story
parent: E01
status: idea
---
# US-038 Jev picks the best story by the story rubric

As Flash, I want the auto-pick to choose the passing candidate that scores best on the story rubric, so that my card gets the best story of the batch, not just the first one that passed.

**Scope:** promote SP-037's `judge-story` CLI into the pipeline (one Jev question per `_nemo.md` judgment gate and score axis) and replace `pick-story`'s first-passing rule with a scored pick. **Drop the same-root-anchor gate:** in SP-037 its probabilities sat near 0.5 for every candidate (Flash's stories averaged 0.47, fresh ones 0.53), so it added noise, not judgment. The judgment gates left are vividness, scene coherence and animal harm.

**Why build it despite SP-037's no-go (2026-10-12 review):** the no-go measured agreement with Flash's old picks, which were often Claude suggestions accepted blindly, and Flash considers those unreliable. The blind check is the better evidence: Flash accepted Jev's pick or rated it about the same on 17 of 20 words. Jev also breaks the decision into one small question per gate and axis, and hallucinates less than a single Claude pick. US-033's kept-count shows whether Jev's picks keep holding up.

**Split out (2026-10-12 review):** sense lock with corpus context → US-043; concrete/abstract check → US-044; keyword choice per chunk → US-045.
