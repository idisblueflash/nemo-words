#!/usr/bin/env python3
"""vocab.py — save & recall-test the words you learn with english-word-explainer.

Each entry is one line of JSON (JSONL) holding the word, the context sentence you
saw it in, a plain definition, pronunciation, and the 3-axis mnemonic (sound /
meaning / story). You can add words, search them, and run a random recall test.

Examples
--------
    # add a word (flags)
    python3 vocab.py add curations \
        --context "Over the exhibit's full duration, the gallery's curation never changed." \
        --definition "a carefully chosen, arranged set of things" \
        --say "kyoo-RAY-shunz" \
        --sound "curation rhymes with duration (-RAY-shun)" \
        --meaning "a curator picking the best items and hanging them neatly" \
        --story "The curator trimmed raw bytes into a clean curation."

    # add a word interactively (prompts for each field)
    python3 vocab.py add

    # search across word / context / definition
    python3 vocab.py search curat

    # list everything you've saved
    python3 vocab.py list

    # random recall test (show word -> you recall meaning, then reveal & grade)
    python3 vocab.py test
    python3 vocab.py test --reverse   # show definition -> you recall the word
    python3 vocab.py test -n 5         # 5 questions
    python3 vocab.py test --no-grade  # quick test, don't touch the schedule

    # spaced repetition: only the words due for review today (most overdue first)
    python3 vocab.py test --due

After each card you grade your recall — [a]gain / [h]ard / [g]ood / [e]asy — and the
word is rescheduled (SM-2 style). `list` marks which words are due now.
"""

import argparse
import json
import os
import random
import sys
from datetime import date, timedelta

DEFAULT_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vocab.jsonl")
DB_PATH = os.environ.get("VOCAB_DB", DEFAULT_DB)


# ---------------------------------------------------------------- storage ----
def load(path=DB_PATH):
    """Return a list of entry dicts. Skips blank/corrupt lines gracefully."""
    if not os.path.exists(path):
        return []
    entries = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                print(f"warning: skipping unparseable line: {line[:60]}...",
                      file=sys.stderr)
    return entries


def append(entry, path=DB_PATH):
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def rewrite(entries, path=DB_PATH):
    with open(path, "w", encoding="utf-8") as f:
        for e in entries:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")


# ------------------------------------------------------- spaced repetition ----
# A small SM-2-style scheduler. Each entry carries an "sr" block:
#   reps      how many times graged "good"/"easy" in a row
#   ease      multiplier that grows the interval (floor 1.3)
#   interval  current gap in days
#   due       ISO date the card is next due
#   last      ISO date it was last tested
GRADES = {  # input char -> (label, quality 0..3)
    "a": ("again", 0), "h": ("hard", 1), "g": ("good", 2), "e": ("easy", 3),
}


def get_sr(e):
    return e.get("sr") or {"reps": 0, "ease": 2.5, "interval": 0,
                           "due": None, "last": None}


def is_due(e, today=None):
    """A card with no schedule yet is always due; otherwise compare its due date."""
    today = today or date.today()
    sr = e.get("sr")
    if not sr or not sr.get("due"):
        return True
    return sr["due"] <= today.isoformat()


def schedule(e, quality, today=None):
    """Update entry's sr block in place for the given grade (0..3). Returns next interval."""
    today = today or date.today()
    sr = get_sr(e)
    ease = sr.get("ease", 2.5)
    interval = sr.get("interval", 0)
    reps = sr.get("reps", 0)

    if quality == 0:            # again — reset, see it again next session
        reps, interval = 0, 0
        ease = max(1.3, ease - 0.20)
    elif quality == 1:          # hard — small step, lower ease
        interval = max(1, round((interval or 1) * 1.2))
        ease = max(1.3, ease - 0.15)
        reps += 1
    elif quality == 2:          # good — standard SM-2 progression
        interval = 1 if reps == 0 else 3 if reps == 1 else round(interval * ease)
        reps += 1
    else:                       # easy — bigger jump, raise ease
        interval = round((interval or 1) * ease * 1.3)
        ease = min(3.0, ease + 0.15)
        reps += 1

    due = today + timedelta(days=interval)
    e["sr"] = {"reps": reps, "ease": round(ease, 2), "interval": interval,
               "due": due.isoformat(), "last": today.isoformat()}
    return interval


# ------------------------------------------------------------------ render ----
def fmt_entry(e, full=True):
    lines = [f"\033[1m{e.get('word', '?')}\033[0m"]
    if e.get("say"):
        lines.append(f"  say:     {e['say']}")
    if e.get("definition"):
        lines.append(f"  meaning: {e['definition']}")
    if e.get("context"):
        lines.append(f"  context: {e['context']}")
    if full:
        m = e.get("mnemonic", {})
        if m.get("sound"):
            lines.append(f"  \U0001f50a {m['sound']}")
        if m.get("meaning"):
            lines.append(f"  \U0001f4d6 {m['meaning']}")
        if m.get("story"):
            lines.append(f"  \U0001f3ad {m['story']}")
    if e.get("added"):
        lines.append(f"  added:   {e['added']}")
    return "\n".join(lines)


# ------------------------------------------------------------------ add ----
def prompt(label, required=False):
    while True:
        val = input(f"{label}: ").strip()
        if val or not required:
            return val
        print("  (required)")


def cmd_add(args):
    if args.word:
        word = args.word
        context = args.context or ""
        definition = args.definition or ""
        say = args.say or ""
        sound = args.sound or ""
        meaning = args.meaning or ""
        story = args.story or ""
    else:
        print("New word (press Enter to skip optional fields)")
        word = prompt("word", required=True)
        context = prompt("context sentence")
        definition = prompt("plain definition")
        say = prompt("pronunciation (e.g. kyoo-RAY-shunz)")
        sound = prompt("mnemonic - sound")
        meaning = prompt("mnemonic - meaning")
        story = prompt("mnemonic - story")

    entry = {
        "word": word,
        "added": date.today().isoformat(),
        "say": say,
        "definition": definition,
        "context": context,
        "mnemonic": {"sound": sound, "meaning": meaning, "story": story},
    }
    append(entry)
    print(f"\nSaved to {DB_PATH}\n")
    print(fmt_entry(entry))


# ---------------------------------------------------------------- search ----
def cmd_search(args):
    q = args.query.lower()
    hits = []
    for e in load():
        hay = " ".join([
            e.get("word", ""),
            e.get("definition", ""),
            e.get("context", ""),
            " ".join(e.get("mnemonic", {}).values()),
        ]).lower()
        if q in hay:
            hits.append(e)
    if not hits:
        print(f"No matches for '{args.query}'.")
        return
    print(f"{len(hits)} match(es):\n")
    for e in hits:
        print(fmt_entry(e))
        print()


# ------------------------------------------------------------------ list ----
def cmd_list(args):
    entries = load()
    if not entries:
        print("No words saved yet. Add one with:  python3 vocab.py add")
        return
    if args.full:
        for e in entries:
            print(fmt_entry(e))
            print()
    else:
        for e in entries:
            due = " \033[33m(due)\033[0m" if is_due(e) else ""
            print(f"{e.get('word', '?'):<20} {e.get('definition', '')}{due}")
    due_count = sum(1 for e in entries if is_due(e))
    print(f"\n{len(entries)} word(s) in {DB_PATH} — {due_count} due now")


# ------------------------------------------------------------------ test ----
def pause(msg):
    """Wait for Enter to reveal an answer. Tolerates piped/non-interactive input."""
    try:
        input(msg)
    except EOFError:
        print()  # no stdin (e.g. piped) — just reveal


def grade_prompt():
    """Ask the learner to grade their recall. Returns quality 0..3, or None to skip."""
    while True:
        raw = input("   grade [a]gain/[h]ard/[g]ood/[e]asy (Enter=skip): ").strip().lower()
        if raw == "":
            return None
        if raw[0] in GRADES:
            return GRADES[raw[0]][1]
        print("   (type a, h, g, or e — or just Enter to skip)")


def cmd_test(args):
    entries = load()
    if not entries:
        print("No words saved yet. Add one first with:  python3 vocab.py add")
        return

    pool = [e for e in entries if is_due(e)] if args.due else list(entries)
    if args.due and not pool:
        nxt = min((e["sr"]["due"] for e in entries if e.get("sr") and e["sr"].get("due")),
                  default=None)
        print("Nothing due today. \U0001f389" + (f" Next due: {nxt}" if nxt else ""))
        return

    if args.due:
        # Most-overdue first so the weakest words come back soonest.
        pool.sort(key=lambda e: (e.get("sr") or {}).get("due") or "")
    else:
        random.shuffle(pool)

    n = min(args.n, len(pool)) if args.n else len(pool)
    deck = pool[:n]
    grading = not args.no_grade
    changed = False

    label = "due" if args.due else "word"
    print(f"Recall test — {n} {label}(s). Press Enter to reveal each answer.\n")
    for i, e in enumerate(deck, 1):
        if args.reverse:
            # Show the meaning/context, hide the word.
            print(f"[{i}/{n}] Which word means:")
            if e.get("definition"):
                print(f"   {e['definition']}")
            if e.get("context"):
                print(f"   context: {blank_word(e.get('context', ''), e.get('word', ''))}")
            pause("   …recall the word, then press Enter")
            print(f"   -> \033[1m{e.get('word', '?')}\033[0m")
        else:
            # Show the word, hide meaning + mnemonic.
            print(f"[{i}/{n}] \033[1m{e.get('word', '?')}\033[0m")
            if e.get("say"):
                print(f"   ({e['say']})")
            pause("   …say the meaning + your story out loud, then press Enter")
            m = e.get("mnemonic", {})
            if e.get("definition"):
                print(f"   meaning: {e['definition']}")
            if m.get("story"):
                print(f"   \U0001f3ad {m['story']}")
            if e.get("context"):
                print(f"   context: {e['context']}")

        if grading:
            try:
                q = grade_prompt()
            except EOFError:
                q = None
            if q is not None:
                days = schedule(e, q)
                changed = True
                when = "today" if days == 0 else f"in {days} day(s)"
                print(f"   → next review {when}")
        print()

    if changed:
        rewrite(entries)
    print("Done. The ones that felt shaky are the ones to revisit soon. \U0001f331")


def blank_word(sentence, word):
    """Replace the target word (and simple variants) with a blank in the context."""
    if not sentence or not word:
        return sentence
    out = sentence
    base = word.rstrip("s")
    for variant in (word, word.capitalize(), base, base.capitalize(),
                    base + "s", base + "es", base + "ed", base + "ing"):
        if variant and variant in out:
            out = out.replace(variant, "____")
    return out


# ------------------------------------------------------------------ main ----
def build_parser():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    a = sub.add_parser("add", help="save a new word")
    a.add_argument("word", nargs="?", help="the word (omit for interactive mode)")
    a.add_argument("--context", help="the sentence you saw it in")
    a.add_argument("--definition", help="plain-language meaning")
    a.add_argument("--say", help="pronunciation, e.g. kyoo-RAY-shunz")
    a.add_argument("--sound", help="mnemonic: sound axis")
    a.add_argument("--meaning", help="mnemonic: meaning axis")
    a.add_argument("--story", help="mnemonic: story axis")
    a.set_defaults(func=cmd_add)

    s = sub.add_parser("search", help="search saved words")
    s.add_argument("query")
    s.set_defaults(func=cmd_search)

    l = sub.add_parser("list", help="list saved words")
    l.add_argument("--full", action="store_true", help="show full entries")
    l.set_defaults(func=cmd_list)

    t = sub.add_parser("test", help="random recall test")
    t.add_argument("-n", type=int, default=0, help="number of questions (default: all)")
    t.add_argument("--reverse", action="store_true",
                   help="show the meaning, you recall the word")
    t.add_argument("--due", action="store_true",
                   help="only words due for review (spaced repetition), most overdue first")
    t.add_argument("--no-grade", action="store_true",
                   help="don't ask for a grade or update the review schedule")
    t.set_defaults(func=cmd_test)
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
