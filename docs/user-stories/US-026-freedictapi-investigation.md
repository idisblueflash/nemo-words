# US-026 follow-on: does the Free Dictionary API recover the residual gap?

_Follow-on to [US-026-investigation.md](US-026-investigation.md), triggered by a
question about `https://api.dictionaryapi.dev` (no API key). Investigation
only — no changes to `src/`, `US-026.md`, or `US-026-investigation.md`._

## 0. Reconstructing the residual set (recomputed this session, not reused)

Recomputed the baseline and cross-ref counts independently via `awk`/`sort`/
`comm` against the real files (methodology matches US-026-investigation.md
section 1-2, numbers re-derived, not copy-pasted):

| metric | count |
|---|---|
| missing GA (`ga_rp.tsv` col 2 empty) | 168,485 |
| missing RP (col 3 empty) | 57,655 |
| GA hits, `wikipron_us_broad.tsv` | 10,502 |
| RP hits, `wikipron_uk_broad.tsv` | 2,748 |
| RP hits, `en_UK.txt` | 2,240 |

All four numbers match US-026-investigation.md exactly.

**`kaikki-en.jsonl` is present locally this session** (`resources/data/kaikki-en.jsonl`,
3.2GB, gitignored) — unlike the caveat in the assigned task, it did not need to
be skipped. Streamed it once (Node, `readline`, ~19M lines, one pass, string
pre-filter on `"lang_code": "en"` + `"sounds"` before `JSON.parse` to keep it
fast) and applied the Protocol's exact tag rule (`US`/`General-American`/
`GenAm` for GA, `Received-Pronunciation`/`RP`/`UK` for RP), additionally
requiring a non-empty `sounds[].ipa` string (a word tagged but with no actual
IPA string isn't recoverable IPA, so it shouldn't count as a hit):

| | this session | US-026-investigation.md §6 |
|---|---|---|
| GA words with a usable US-tagged IPA | 4,829 | 5,138 |
| RP words with a usable RP/UK-tagged IPA | 1,234 | 2,175 |

Same order of magnitude; the ~6-45% gap is plausibly explained by requiring
an actual `ipa` string (vs. just a matching tag) and/or exact tag-set
differences — not re-investigated further since it doesn't change the
conclusion below. Using **my own numbers** (the conservative, IPA-verified
ones):

| | GA (missing 168,485) | RP (missing 57,655) |
|---|---|---|
| covered by wikipron-us/uk + en_UK | 10,502 / 2,748+2,240 (union 3,727 after wikipron_uk/en_UK overlap) |
| covered by kaikki (US/RP-tagged, has ipa) | 4,829 | 1,234 |
| **total addressable (union, all 5 sources)** | **10,680 (6.3%)** | **3,748 (6.5%)** |
| **residual (unrecoverable from any local source)** | **157,805 (93.7%)** | **53,907 (93.5%)** |

Total: **14,428/226,140 (6.4%)** addressable, **211,712 (93.6%)** residual —
consistent with the investigation doc's ~6.9%/~93% split (the small
difference is the stricter kaikki-hit definition above).

These residual lists (`ga_residual.txt` 157,805 words, `rp_residual.txt`
53,907 words) are the target population for this API question — the same
"unrecoverable from repo data" set characterized in section 4 of
US-026-investigation.md, recomputed rather than assumed.

## 1. Sampling and API attempt

Drew a seeded-random sample of 500 words from each residual list (not the
full 200K+ — a deterministic shuffle, `Math.random`-seeded, so reproducible)
and wrote a Node script to query `https://api.dictionaryapi.dev/api/v2/entries/en_US/{word}`
for the GA-residual sample and `.../en_GB/{word}` for the RP-residual sample,
150ms delay between requests, recording hit/miss and whether the response
actually carries a non-empty `phonetic`/`phonetics[].text`.

**The API was unreachable for the entire session.** Direct `curl` first
returned Cloudflare's own **522 "Connection timed out"** page (valid TLS
handshake to `*.dictionaryapi.dev`'s real certificate, HTTP/2 negotiated,
Cloudflare's edge reachable — 522 specifically means Cloudflare could not
reach the *origin* server behind it, i.e. this is the API's own backend
being down, not a network restriction on this machine). Subsequent attempts
over the following ~20 minutes (single spaced probes, then a 10-attempt/
30s-interval background poll, 9 of 10 attempts observed before writeup, all
failing) degraded further to full connection timeouts (curl exit 28, no response at all,
neither IPv4- nor IPv6-only). Control checks confirm this machine's general
outbound HTTPS works fine throughout (`https://www.google.com` → 200 in
0.9s, `https://httpbin.org/get` → 200 in 1.0s, `https://raw.githubusercontent.com`
→ 200 in 0.6s, GitHub API reachable). The API's own GitHub repo
(`meetDeveloper/freeDictionaryAPI`) README states explicitly: *"The API
usage has been ramping up rapidly, making it difficult for me to keep the
server running due to increased AWS costs"* with a donation link — i.e. the
maintainer has publicly documented that this is a cost-constrained,
single-person-run free service prone to exactly this kind of outage, not a
one-off fluke I happened to hit.

**No live hit-rate data could be collected this session.** This is reported
plainly per the investigation rules rather than estimated or extrapolated
from memory — I do not have a real measured hit rate for this API to give a
confidence interval on, and it would be dishonest to invent one.

Scratch scripts (not committed, per the workflow rules) that would produce
the live data once the API recovers, so this can be re-run instead of
redone from scratch:
- `kaikki_scan.js` (rebuild `ga_all_hits.txt`/`rp_all_hits.txt`/residuals) —
  session scratchpad, not `scripts/`.
- `sample.js` (seeded 500-word sample per residual list).
- `query_api.js ga` / `query_api.js rb` — queries `ga_sample.txt` against
  `en_US`, `rp_sample.txt` against `en_GB`, 150ms delay, writes
  `ga_results.json`/`rp_results.json` with hit/phonetic-presence per word.
All in the session scratchpad
(`/private/tmp/claude-501/.../scratchpad/`), not `scripts/` — worth keeping
only if the user wants to actually re-run this once the API is back up.

## 2. What can be said without live queries

Two indirect, data-grounded observations bound the plausible outcome even
without a live hit rate:

**(a) The residual samples are overwhelmingly not the kind of headword a
general dictionary API carries.** Cross-referencing the same two 500-word
samples against `/usr/share/dict/words` (235,976-word common-English list,
same real-word-vs-noise proxy US-026-investigation.md used, stripping
trailing `'s`/hyphens leniently before lookup):

| sample | proxy "real word" hits | % |
|---|---|---|
| GA residual (500) | 164 | 32.8% |
| RP residual (500) | 32 | 6.4% |

These track the investigation doc's own "other" bucket breakdown (36.2%/
5.8%) closely, confirming the samples are representative. Spot-checking the
samples directly:
- GA residual (first 40, alphabetically unordered — as drawn):
  `deceivers, palped, non-constant, quislings, medievalistics, wicklow,
  classica, rhomboids, cry-babies, diviners, starke's, alligator's,
  unaffecting, frederico's, humanizers, brockport, botanises, depilates,
  irreligiously, gardenia's, slotter, thickheadedly, stanchioned, portant,
  perjuries, overstarched, shanter, diphthongizes, unembellished,
  indigestibles, epentheses, roosed, negros's, superbarrio, roof-gardens,
  ripplingers, organon's, forelady, hotelling, unmuffle` — mostly real
  inflected/derived forms of real words (plurals, `-s`/`-ise` verb forms,
  `un-`/`-ly` derivations) plus a few place names (`wicklow, brockport`).
- RP residual (first 40): `macklem, frutiger, latina, virag, doshier,
  hugoton, o'donoghue, suki, colussy, schweda, lyssy, mishawaum,
  herzegovina, kiracofe, mestrovic, nuns', hammell, deihl, missler,
  habsburg, franklinville, amin, montagu's, mcgrory, stathopoulos, maydena,
  haq, dylex, wolgast, deardorff, bartol, schneider, reyman, kellis, roddy,
  thyra, beauchesne, ice-nine, varity's, dilbeck` — overwhelmingly personal
  surnames (`macklem, frutiger, doshier, kiracofe, hammell, deihl, mcgrory,
  wolgast, deardorff, schneider, dilbeck`) and place names
  (`hugoton, mishawaum, franklinville, maydena, herzegovina, habsburg`),
  matching US-026-investigation.md section 4's characterization exactly.

A general-purpose dictionary API (which, like Wiktionary and the four
existing cross-ref sources, indexes common headwords and only the most
notable proper nouns) is structurally unlikely to carry entries for
individual, non-notable surnames like `macklem` or `kiracofe` regardless of
whether it's reachable. The 32.8%/6.4% real-word proxy rates above are a
plausible **ceiling** on what any general dictionary source — API or file —
could recover from these two residual sets, not a hit-rate estimate in
themselves (many "real words" in the list are still rare/archaic enough
that even a real dictionary may not carry a phonetic transcription for
them, e.g. `epentheses`, `diphthongizes`).

**(b) Overlap risk with what US-026's Protocol already gets from
`kaikki-en.jsonl`.** The Free Dictionary API's JSON response shape (POS,
senses, examples, `phonetics[]` with IPA + audio URL) closely mirrors a
Wiktionary-style parse — the same underlying source `kaikki-en.jsonl`
already is (a full `wiktextract` dump). The project's own README/repo
doesn't state its exact backing data source explicitly (checked; no
`source`/`wiktionary`/`wordnik` mention in the README on GitHub), so this is
a structural observation, not a confirmed fact — but it means a material
fraction of whatever the API *could* recover, once reachable, is plausibly
already inside `kaikki-en.jsonl`'s 4,829/1,234 hits shown above, rather than
being additive on top of them. This should be checked directly (compare the
API's hit set against `kaikki_scan.js`'s existing GA/RP hit sets) before
trusting any future measured hit rate as pure incremental gain.

## 3. Practical obstacles observed (answering the task's point 6 directly)

- **Availability**: unreachable for the ~15+ minutes of active testing this
  session — first via Cloudflare 522 (origin down), then full connection
  timeouts. The maintainer's own README documents this as an ongoing,
  cost-driven reliability problem, not a one-off. Any pipeline depending on
  this API needs a retry/backoff/skip-on-failure story, and cannot assume
  100% of a bulk run would succeed even on a good day.
- **Rate limiting behavior**: not observed — never got a single successful
  response to characterize it against.
- **Latency**: not measurable live; Cloudflare's own 522 page took ~20s to
  return per request before the API went fully unreachable, which would be
  prohibitive at any real bulk-run scale (200K+ words × 20s ≫ feasible) even
  setting aside whether that's representative of normal-operation latency.
- **en_US/en_GB accent fidelity**: not verifiable this session — could not
  confirm whether the API's `en_US` vs `en_GB` split reliably returns
  distinct GA vs RP phonetics or sometimes echoes the same `phonetic` string
  for both (a documented pattern in similar free dictionary APIs, since not
  every headword has been transcribed separately per accent). This is an
  open question that would need to be checked as part of any future retry.

## Recommendation

- **This session cannot give the measured hit-rate/confidence-interval the
  task asked for** — the API was down for the entire investigation window,
  confirmed via multiple independent signals (Cloudflare 522, then full
  timeouts, while general internet and other HTTPS hosts stayed reachable
  throughout). Reporting this plainly rather than fabricating a number.
- Indirect evidence bounds the *ceiling*, not the actual rate: at most
  ~33% of the GA residual and ~6% of the RP residual are plausible-real
  dictionary words at all (proxy-checked against `/usr/share/dict/words`),
  and even that ceiling assumes every real word the API indexes also
  carries a phonetic transcription, which is not guaranteed. The RP
  residual in particular is dominated by non-notable personal
  surnames/place names that a general dictionary (API or file) has
  structural reasons never to carry.
- There's a real risk that whatever the API recovers substantially overlaps
  what `kaikki-en.jsonl` (already scoped into US-026's Protocol) recovers,
  given both are plausibly Wiktionary-derived — so even a decent measured
  hit rate might not be as additive as it first looks.
- Given (a) an unverifiable/unmeasurable ceiling this session, (b) a
  documented pattern of unreliability from the API's own maintainer, (c) a
  plausible-but-unconfirmed overlap with a source already in scope, and
  (d) prohibitive latency for a 200K+-word bulk backfill even if it were
  reliable — **this is not worth building into a real story on the
  evidence gathered so far.** Before reconsidering, whoever picks this up
  next should: (1) retry `query_api.js` (kept in the scratchpad; ask if it
  should move to `scripts/`) once the API is confirmed back up, on the
  same 500+500 seeded samples, to get the actual measured numbers this
  report couldn't produce; and (2) diff the API's hit set against
  `ga_all_hits.txt`/`rp_all_hits.txt` (from `kaikki_scan.js`) to see how
  much of any measured hit rate is genuinely incremental over what
  US-026's Protocol already covers. Until that's done, the honest ceiling
  on gap-closure from this API is "somewhere under the 32.8%/6.4%
  real-word proxy rates above, minus whatever kaikki-en.jsonl already
  covers" — i.e. plausibly smaller than the 6.4% US-026 already achieves
  from local files, not a clear improvement on it.
