---
id: SP-037
type: spike
parent: E01
status: idea
timebox: 1d
---
# SP-037 Does Jev pick the story Flash would?

**Why now:** Unblocks US-038 (Jev judges and picks the story). If Jev rarely agrees with Flash, the auto-pick changes shape before it's built.
**Method:** A prototype `judge-story` CLI turns each gate and score axis in `_nemo.md` into one Jev question about a candidate. No past candidates are saved (`data/mnemonics/alternates.jsonl` doesn't exist yet), so for each test word, Flash's logged story is mixed in with fresh `_nemo` candidates.
**Done when:** For 20 words from `data/mnemonics/log.jsonl`, we have the rate at which Jev ranks Flash's story first and in the top two, plus a go / no-go for auto story pick.
