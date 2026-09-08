#!/usr/bin/env python3
"""
search.py — thin CLI wrapper around the vendored Whitaker's Words port
(open_words, https://github.com/ArchimedesDigital/open_words).

Given one or more Latin words (or a short phrase), prints each dictionary
headword match, its English senses, and a short grammar tag, in clean
readable text.

Usage:
    python3 search.py <latin word or short phrase>

Example:
    python3 search.py corporis
"""

import os
import sys

_VENDOR_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vendor", "open_words_repo")

if not os.path.isdir(_VENDOR_DIR):
    sys.stderr.write(
        "error: vendored open_words repo not found at:\n"
        f"  {_VENDOR_DIR}\n\n"
        "Run download.sh first:\n"
        "  bash dictionaries/open-words/download.sh\n"
    )
    sys.exit(1)

sys.path.insert(0, _VENDOR_DIR)

try:
    from open_words.parse import Parse
except ImportError as exc:
    sys.stderr.write(
        "error: failed to import open_words from the vendored repo "
        f"({_VENDOR_DIR}).\n"
        f"Underlying error: {exc}\n"
        "Try re-running download.sh --force.\n"
    )
    sys.exit(1)


def format_grammar_tag(infl):
    """Build a short one-line grammar tag (e.g. 'GEN SG', 'PRES ACTIVE IND 1 SG')
    from one inflection entry's pos + form dict."""
    pos = (infl.get("pos") or "").upper()
    form = infl.get("form") or {}

    number_map = {"singular": "SG", "plural": "PL"}

    def num(v):
        return number_map.get(v, v.upper() if v else "")

    if pos == "NOUN" or pos in ("ADJECTIVE", "PRONOUN"):
        declension = form.get("declension", "")
        gender = form.get("gender", "")
        number = form.get("number", "")
        pieces = []
        if declension:
            pieces.append(declension.upper())
        if number:
            pieces.append(num(number))
        if gender:
            pieces.append(gender.upper())
        return " ".join(pieces) if pieces else pos

    if pos == "VERB":
        tense = form.get("tense", "")
        voice = form.get("voice", "")
        mood = form.get("mood", "")
        person = form.get("person", "")
        number = form.get("number", "")
        pieces = []
        if tense:
            pieces.append(tense.upper())
        if voice:
            pieces.append(voice.upper())
        if mood:
            pieces.append(mood.upper())
        if person not in ("", None):
            pieces.append(f"P{person}")
        if number:
            pieces.append(num(number))
        return " ".join(pieces) if pieces else pos

    if pos == "PARTICIPLE":
        declension = form.get("declension", "")
        gender = form.get("gender", "")
        number = form.get("number", "")
        tense = form.get("tense", "")
        voice = form.get("voice", "")
        pieces = []
        if declension:
            pieces.append(declension.upper())
        if number:
            pieces.append(num(number))
        if gender:
            pieces.append(gender.upper())
        if tense:
            pieces.append(tense.upper())
        if voice:
            pieces.append(voice.upper())
        return " ".join(pieces) if pieces else pos

    # Fallback: adverbs, conjunctions, prepositions, interjections, etc. —
    # form is usually just {'form': [...]} or similarly uninformative, so
    # fall back to the part of speech itself.
    if "form" in form and pos:
        return pos
    return pos or "?"


def format_word_result(entry):
    """Format one parsed input word's result dict as readable text."""
    lines = []
    word = entry.get("word", "?")
    defs = entry.get("defs") or []

    lines.append(f"{word}")

    if not defs:
        lines.append("  no match — not a recognized Latin form")
        return "\n".join(lines)

    for d in defs:
        orth = d.get("orth") or []
        senses = d.get("senses") or []
        infls = d.get("infls") or []

        headword = ", ".join(o for o in orth if o) or "?"
        sense_text = "; ".join(s for s in senses if s) or "(no gloss available)"

        tags = []
        seen = set()
        for infl in infls:
            tag = format_grammar_tag(infl)
            if tag and tag not in seen:
                seen.add(tag)
                tags.append(tag)

        lines.append(f"  {headword}")
        lines.append(f"    meaning: {sense_text}")
        if tags:
            lines.append(f"    grammar: {' / '.join(tags)}")

    return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        sys.stderr.write("usage: python3 search.py <latin word or short phrase>\n")
        sys.exit(1)

    query = " ".join(sys.argv[1:])
    parser = Parse()
    results = parser.parse_line(query)

    output_blocks = [format_word_result(entry) for entry in results]
    print("\n\n".join(output_blocks))


if __name__ == "__main__":
    main()
