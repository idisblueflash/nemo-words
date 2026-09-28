#!/usr/bin/env python3
"""Offline pronunciation + rhyme lookup for word-mnemonic-builder.

Looks a word up in the (locally-cached) CMU Pronouncing Dictionary, prints
its IPA transcription, and lists rhyming words that share the same stressed
rime -- candidates for a "sounds like" mnemonic anchor.

Usage:
    python3 rhyme.py <word> [--rhymes N] [--json]
    python3 rhyme.py <word> --ipa "/flᵻˈbɒtəmi/"   # skip lookup/g2p, use this IPA

If the word isn't in the dictionary (common for rare/medical terms and INN
drug names), a rough letter-by-letter fallback is used instead and the
result is flagged "[g2p-synthesized -- verify]". Rhymes found from a
synthesized pronunciation are best-effort only -- pass --ipa once you know
the real pronunciation (from a dictionary, a clinician, etc.) to get
reliable rhyme candidates.
"""

import argparse
import json
import re
import sys
from pathlib import Path

CMUDICT_PATH = Path.home() / "nltk_data" / "corpora" / "cmudict" / "cmudict"

ARPABET_TO_IPA = {
    "AA": "ɑ", "AE": "æ", "AH": "ʌ", "AO": "ɔ", "AW": "aʊ", "AY": "aɪ",
    "EH": "ɛ", "ER": "ɝ", "EY": "eɪ", "IH": "ɪ", "IY": "i", "OW": "oʊ",
    "OY": "ɔɪ", "UH": "ʊ", "UW": "u",
    "B": "b", "CH": "tʃ", "D": "d", "DH": "ð", "F": "f", "G": "ɡ",
    "HH": "h", "JH": "dʒ", "K": "k", "L": "l", "M": "m", "N": "n",
    "NG": "ŋ", "P": "p", "R": "r", "S": "s", "SH": "ʃ", "T": "t",
    "TH": "θ", "V": "v", "W": "w", "Y": "j", "Z": "z", "ZH": "ʒ",
}
VOWEL_CODES = {"AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH",
               "IY", "OW", "OY", "UH", "UW"}

# Traditionally transcribed "long" in broad dictionary IPA (father/PALM,
# thought/THOUGHT, fleece/FLEECE, goose/GOOSE) -- gets a length mark
# regardless of what follows, matching e.g. Wiktionary's GenAm style, even
# though American English doesn't actually hold these measurably longer.
_LONG_CODES = {"AA", "AO", "IY", "UW"}


# AH0 is schwa, not the stressed "hut" vowel -- CMUdict doesn't distinguish,
# so special-case it (this is the one ARPAbet->IPA mapping that depends on
# stress, everything else in ARPABET_TO_IPA is stress-independent).
def _phone_ipa(code, stress):
    if code == "AH" and stress == "0":
        return "ə"
    if code == "ER" and stress == "0":
        return "ɚ"
    ipa = ARPABET_TO_IPA[code]
    if code in _LONG_CODES and stress != "0":
        # unstressed occurrences (e.g. the final "-y" in "gnarly") stay short
        # even though they're the same phoneme -- only stressed ones get ː
        ipa += "ː"
    return ipa


def _split_phone(phone):
    """'AA1' -> ('AA', '1'); 'K' -> ('K', None)."""
    m = re.match(r"^([A-Z]+)([0-2])?$", phone)
    code, stress = m.group(1), m.group(2)
    return code, stress


def arpabet_to_ipa(phones):
    """List of ARPAbet tokens (e.g. ['N','AA1','R','L','IY0']) -> IPA string.

    Stress placement is approximate: the mark is inserted at the syllable
    boundary immediately after the *previous* vowel (maximal-onset), which
    is exact for simple onsets but can misplace complex consonant clusters
    that straddle a syllable boundary (e.g. "heartbreak"). Good enough for
    mnemonic-anchor purposes, not a phonetics reference.
    """
    parsed = [_split_phone(p) for p in phones]
    vowel_idxs = [i for i, (code, st) in enumerate(parsed) if code in VOWEL_CODES]
    marks = {}  # index -> stress mark to insert before
    prev_vowel = -1
    for i in vowel_idxs:
        code, st = parsed[i]
        if st in ("1", "2") and len(vowel_idxs) > 1:
            start = prev_vowel + 1
            marks[start] = "ˈ" if st == "1" else "ˌ"
        prev_vowel = i
    out = []
    for i, (code, st) in enumerate(parsed):
        if i in marks:
            out.append(marks[i])
        out.append(_phone_ipa(code, st))
    return "".join(out)


def rime_key(phones):
    """From the primary-stressed vowel (or last vowel, if none) to the end,
    stress digits stripped -- the part two words must share to rhyme."""
    parsed = [_split_phone(p) for p in phones]
    vowel_idxs = [i for i, (code, st) in enumerate(parsed) if code in VOWEL_CODES]
    if not vowel_idxs:
        return tuple(code for code, _ in parsed)
    start = next((i for i in vowel_idxs if parsed[i][1] == "1"), vowel_idxs[-1])
    return tuple(code for code, _ in parsed[start:])


def load_cmudict():
    """word (upper, apostrophes kept) -> list of phoneme-lists, in file order."""
    entries = {}
    with open(CMUDICT_PATH, encoding="latin-1") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line or line.startswith(";;;"):
                continue
            parts = line.split(" ")
            word, phones = parts[0], parts[2:]
            entries.setdefault(word, []).append(phones)
    return entries


def build_rime_index(entries):
    index = {}
    for word, prons in entries.items():
        for phones in prons:
            index.setdefault(rime_key(phones), set()).add(word)
    return index


IPA_TOKENS_BY_LEN = sorted(
    set(ARPABET_TO_IPA.values()) | {"ə", "ɚ"}, key=len, reverse=True
)
IPA_VOWELS = {_phone_ipa(c, s) for c in VOWEL_CODES for s in ("0", "1", "2")}


def tokenize_ipa(s):
    """Best-effort tokenizer for a hand-typed IPA string into our phoneme
    alphabet. Strips slashes/brackets/length marks; keeps ˈ and ˌ."""
    s = s.strip().strip("/[]")
    s = s.replace("ː", "").replace("ɒ", "ɔ").replace("ɜ", "ɝ")
    tokens = []
    i = 0
    while i < len(s):
        ch = s[i]
        if ch in "ˈˌ":
            tokens.append(ch)
            i += 1
            continue
        if ch.isspace() or ch == ".":
            i += 1
            continue
        matched = False
        for tok in IPA_TOKENS_BY_LEN:
            if s.startswith(tok, i):
                tokens.append(tok)
                i += len(tok)
                matched = True
                break
        if not matched:
            tokens.append(ch)  # unknown symbol, kept as its own opaque token
            i += 1
    return tokens


def rime_key_from_ipa(tokens):
    """Mirror of rime_key() but starting from a tokenized IPA string."""
    stress_idxs = [i for i, t in enumerate(tokens) if t == "ˈ"]
    search_from = 0
    if stress_idxs:
        search_from = stress_idxs[0] + 1
    vowel_idxs = [i for i, t in enumerate(tokens) if t in IPA_VOWELS]
    start_candidates = [i for i in vowel_idxs if i >= search_from]
    start = start_candidates[0] if start_candidates else (vowel_idxs[-1] if vowel_idxs else 0)
    rime_ipa = [t for t in tokens[start:] if t not in "ˈˌ"]
    # translate back to ARPAbet codes so it can match the cmudict-built index
    ipa_to_code = {}
    for code, ipa in ARPABET_TO_IPA.items():
        ipa_to_code.setdefault(ipa, code)
    ipa_to_code.setdefault("ə", "AH")
    ipa_to_code.setdefault("ɚ", "ER")
    return tuple(ipa_to_code.get(t, t) for t in rime_ipa)


# --- last-resort fallback for words missing from the dictionary ---------

_DIGRAPHS = [
    ("tion", "ʃən"), ("sion", "ʒən"), ("ough", "ʌf"),
    ("ch", "tʃ"), ("sh", "ʃ"), ("th", "θ"), ("ph", "f"), ("wh", "w"),
    ("ng", "ŋ"), ("qu", "kw"), ("ck", "k"),
    ("ee", "i"), ("ea", "i"), ("oo", "u"), ("ou", "aʊ"), ("ow", "aʊ"),
    ("oy", "ɔɪ"), ("oi", "ɔɪ"), ("ai", "eɪ"), ("ay", "eɪ"),
    ("igh", "aɪ"), ("ie", "aɪ"), ("oa", "oʊ"), ("ue", "u"),
    ("ar", "ɑr"), ("er", "ər"), ("ir", "ɝ"), ("or", "ɔr"), ("ur", "ɝ"),
]
_SINGLES = {
    "a": "æ", "e": "ɛ", "i": "ɪ", "o": "ɑ", "u": "ʌ", "y": "i",
    "b": "b", "c": "k", "d": "d", "f": "f", "g": "ɡ", "h": "h", "j": "dʒ",
    "k": "k", "l": "l", "m": "m", "n": "n", "p": "p", "q": "k", "r": "r",
    "s": "s", "t": "t", "v": "v", "w": "w", "x": "ks", "z": "z",
}


def synthesize_ipa(word):
    """Crude letter-by-letter grapheme-to-phoneme guess. No real stress
    detection -- always marks the first syllable, which is only right about
    half the time. Flag any output from this as unverified."""
    w = word.lower()
    out = []
    i = 0
    while i < len(w):
        matched = False
        for grapheme, ipa in _DIGRAPHS:
            if w.startswith(grapheme, i):
                out.append(ipa)
                i += len(grapheme)
                matched = True
                break
        if matched:
            continue
        ch = w[i]
        if ch in _SINGLES:
            out.append(_SINGLES[ch])
        elif not ch.isalpha():
            pass
        i += 1
    ipa = "".join(out)
    return "ˈ" + ipa if ipa else ipa


_WORDLIKE = re.compile(r"^[A-Z]+('[A-Z]+)?$")


def format_rhymes(words, exclude, limit):
    words = [w for w in words
              if w.upper() != exclude.upper() and len(w) >= 3 and _WORDLIKE.match(w)]
    words = sorted(set(words), key=lambda w: (len(w), w))
    return [w.lower() for w in words[:limit]]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                  formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("word")
    ap.add_argument("--ipa", help="known IPA pronunciation; skips lookup/g2p "
                                   "and is used directly for rhyme search")
    ap.add_argument("--rhymes", type=int, default=15, help="max rhyme candidates (default 15)")
    ap.add_argument("--json", action="store_true", help="emit JSON instead of text")
    args = ap.parse_args(argv)

    entries = load_cmudict()
    rime_index = build_rime_index(entries)

    result = {"word": args.word, "source": None, "ipa": None,
              "alternates": [], "rhymes": [], "note": None}

    if args.ipa:
        result["source"] = "user-supplied"
        result["ipa"] = args.ipa.strip().strip("/[]")
        tokens = tokenize_ipa(args.ipa)
        key = rime_key_from_ipa(tokens)
        result["rhymes"] = format_rhymes(rime_index.get(key, set()), args.word, args.rhymes)
        if not result["rhymes"]:
            result["note"] = "no dictionary words share this rime -- try simplifying the IPA"
    else:
        key = args.word.upper()
        prons = entries.get(key)
        if prons:
            result["source"] = "cmudict"
            result["ipa"] = arpabet_to_ipa(prons[0])
            result["alternates"] = [arpabet_to_ipa(p) for p in prons[1:]]
            rkey = rime_key(prons[0])
            result["rhymes"] = format_rhymes(rime_index.get(rkey, set()), args.word, args.rhymes)
        else:
            result["source"] = "g2p-synthesized"
            result["ipa"] = synthesize_ipa(args.word)
            result["note"] = ("[g2p-synthesized — verify] not found in the dictionary; "
                               "this pronunciation is a rough guess. Rhymes below are "
                               "best-effort. Pass --ipa with the real pronunciation once "
                               "you know it.")
            tokens = tokenize_ipa(result["ipa"])
            rkey = rime_key_from_ipa(tokens)
            result["rhymes"] = format_rhymes(rime_index.get(rkey, set()), args.word, args.rhymes)

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    tag = "" if result["source"] == "cmudict" else f"  [{result['source']}]"
    print(f"{args.word}: /{result['ipa']}/{tag}")
    for alt in result["alternates"]:
        print(f"  also: /{alt}/")
    if result["rhymes"]:
        print(f"rhymes: {', '.join(result['rhymes'])}")
    else:
        print("rhymes: (none found)")
    if result["note"]:
        print(f"note: {result['note']}")


if __name__ == "__main__":
    try:
        main()
    except FileNotFoundError:
        print(f"error: CMU dictionary not found at {CMUDICT_PATH}", file=sys.stderr)
        print("install it with: python3 -c \"import nltk; nltk.download('cmudict')\"",
              file=sys.stderr)
        sys.exit(1)
