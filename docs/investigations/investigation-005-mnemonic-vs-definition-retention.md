---
title: "Do mnemonic cards outlast definition cards? (Anki data + published research)"
status: findings-recorded
related_vision: "[VISION.md — assumption 1](../backlog/VISION.md)"
investigated: 2026-10-11
---

## Goal

Check the riskiest assumption in the product vision: *a sound+meaning+scene story with
an image or comic is remembered longer than a definition card.* Two sources: Flash's
own Anki review history, and published research on the keyword mnemonic.

## 1. Flash's Anki data

Pulled read-only via AnkiConnect `cardReviews` (note: `getReviewsOfCards` returned empty
logs for these cards; `cardReviews` per deck works). Retention = share of review-type
(`type = 1`) answers that weren't "Again"; mature = previous interval ≥ 21 days.

| Deck | Reviews | Retention | 1st review | Mature (≥21d) |
|---|---|---|---|---|
| Reading Room::Terms | 809 | 75.0% | 71.8% | 18.8% (n=16) |
| Reading Room::01 Medical Terms | 280 | 76.8% | 85.1% | 33.3% (n=3) |
| Reading Room::02 Academic Word Parts | 60 | 76.7% | 73.7% | — |
| 01 Words | 38 | 84.2% | 100% | n=4 |

Data window: 2026-07-26 → 2026-10-10 for the Terms deck.

**Finding: this data cannot test the assumption.**
- All of these decks are effectively mnemonic cards, so there is no plain-definition
  control group.
- Almost no reviews have reached a 21-day interval, and long-term retention is the
  window the assumption is about.

**What it could test later:**
- Image/comic vs story-only cards *within* Reading Room::Terms (mnemonic vs mnemonic).
- A real control: card some new words definition-only, in the same weeks as story cards.

## 2. Published research (keyword mnemonic vs rote/definition)

- **Immediate recall: the mnemonic wins.** A review of ~50 studies concluded the keyword
  method beats rote, contextual and definitional learning for learning speed and
  immediate recall.
- **Delayed recall reverses without review.** Wang, Thomas and colleagues (UCF,
  1992–1995) found faster long-term forgetting for keyword learners. On a cued-recall
  test 2 days later they had forgotten almost twice as many items as rote learners, and
  semantic-context learners outscored them after 2 days. Proposed cause: the keyword's
  pre-existing everyday associations interfere with retrieving the new interactive image.
- **Review and pictures close the gap.** Repeated reviews "considerably reduced" the
  keyword's faster forgetting, and giving learners a picture of the keyword and its
  referent improved long-term retention.
- **Counter-evidence exists.**
  - Iranian EFL adults (n=60, 2-week delayed test): the keyword group retained more than
    a picture-only group.
  - A Chilean one-week study: keyword combined with other strategies ≈ retrieval practice.
  - Rote beat keyword for *productive* recall (L1 → L2) in one study; the two were equal
    for receptive recall.
- **Caveats.**
  - These are mostly small lab studies on timescales of days, not the months an Anki
    deck covers.
  - Many used within-subject designs that confound initial learning rate with retention.

## Conclusion for the vision

- Assumption 1 as worded ("mnemonic beats definition") isn't supported on its own.
- The product's actual bet is *mnemonic + image + spaced review in Anki* vs
  *definition + spaced review*. The research suggests the two added ingredients are
  exactly what fixes the mnemonic's weakness.
- No study found compares that combination directly, so it stays a **hypothesis**. An
  early spike could run the definition-only control on Flash's own deck.

Implications for design:
- Pick sound anchors with few strong competing associations, since interference is the
  suspected failure mode.
- Always pair the story with an image.
- Rely on Anki's spaced review rather than one-shot exposure.

## Sources

- [Wang, Thomas & Ouellette: Keyword mnemonic and retention of 2nd-language vocabulary words](https://stars.library.ucf.edu/facultybib1990/601)
- [Wang & Thomas: Effect of keywords on long-term retention — help or hindrance?](https://stars.library.ucf.edu/facultybib1990/1498)
- [Summary of Wang & Thomas 1995 (memory-key archive)](https://archive.memory-key.com/research/Wang95)
- [In defence of keyword experiments: a reply to Gruneberg's commentary](https://stars.library.ucf.edu/facultybib1990/2884)
- [UCF Scopus record on keyword retention](https://stars.library.ucf.edu/scopus1990/1045)
- [Keyword vs pictorial methods, EFL adults (Univ. of Granada repository)](https://digibug.ugr.es/handle/10481/20105)
- [Efficacy of the keyword mnemonic in long-term recall of L2 words (UDC)](https://portalinvestigacion.udc.gal/documentos/608ca9b4af765575d40b116a?lang=en)
- [Keyword + retrieval practice, one-week delayed test (Univ. of Chile)](https://lenguasmodernas.uchile.cl/index.php/LM/article/download/45444/47514/160464)
- [Mnemonics and their limitations in studying vocabulary (blog)](https://www.goodreads.com/author_blog_posts/9163879-mnemonics-and-their-limitations-in-studying-vocabulary?tab=book)
