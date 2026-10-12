#!/usr/bin/env python3
"""Extract headwords, derivatives and their US IPA from the Mac's own NOAD.

The New Oxford American Dictionary ships with macOS as an Apple dictionary
bundle. Its Body.data holds the entries as XML, zlib-compressed in chunks.
This script reads it and writes one TSV row per headword entry and per
derivative listed under one:

    word <TAB> kind <TAB> homograph <TAB> ipas <TAB> respell

    kind      hw (headword entry) or der (derivative under a headword)
    homograph the headword's homograph number (lead 1, lead 2), else empty
    ipas      the US IPA strings, raw, in document order, joined with ';'
              (a derivative may give only a partial one, e.g. -ˈleɪʃ(ə)n)
    respell   1 if the entry has a US respelling, else 0

A headword's IPA is its header pronunciation, or the one at the head of a
part of speech (read: rid). Pronunciations inside inflections, variants,
senses, phrases, examples and the origin note are not the headword's.

The output is copyrighted dictionary content: local only, never committed,
never in the release jar (E07, Claudepot 39feb3d3). dictionaries/noad/data/
is gitignored.

Usage:
    python3 dictionaries/noad/extract.py [--body PATH] [--out DIR]

Body.data is found, in order: --body, $NOAD_BODY, the known macOS asset
path, then a glob over the macOS dictionary assets. --out defaults to
dictionaries/noad/data/ next to this script. Exit 0 ok, 2 error.
"""

import argparse
import glob
import os
import struct
import sys
import xml.etree.ElementTree as ET
import zlib

ASSETS = "/System/Library/AssetsV2/com_apple_MobileAsset_DictionaryServices_dictionary3macOS"
BUNDLE = "AssetData/New Oxford American Dictionary.dictionary/Contents/Resources/Body.data"
KNOWN = os.path.join(ASSETS, "b9e021ec5ecf0a0a52e39cb5471a0492a0b82f97.asset", BUNDLE)
D = "{http://www.apple.com/DTDs/DictionaryService-1.0.rng}"

# Pronunciations under these aren't the headword's (or a derivative's) own.
NOT_OWN = {"infg", "vg", "msDict", "eg", "etym", "subEntryBlock", "subEntry"}


def find_body(explicit):
    if explicit:
        return explicit
    if os.environ.get("NOAD_BODY"):
        return os.environ["NOAD_BODY"]
    if os.path.exists(KNOWN):
        return KNOWN
    hits = sorted(glob.glob(os.path.join(ASSETS, "*.asset", BUNDLE)))
    return hits[0] if hits else KNOWN


def entries(body):
    """Yield each entry's XML string from an Apple dictionary Body.data."""
    with open(body, "rb") as f:
        data = f.read()
    limit = 0x40 + struct.unpack_from("<i", data, 0x40)[0]
    off = 0x60
    while off < limit:
        size = struct.unpack_from("<i", data, off)[0]
        chunk = zlib.decompress(data[off + 4 + 8 : off + 4 + size])
        i = 0
        while i < len(chunk):
            n = struct.unpack_from("<i", chunk, i)[0]
            yield chunk[i + 4 : i + 4 + n].decode("utf-8")
            i += 4 + n
        off += 4 + size


def classes(el):
    return set((el.get("class") or "").split())


def prons(el, skip):
    """(ipas, has_respell) under el, not descending into classes in skip."""
    ipas, respell = [], False
    for child in el:
        cls = classes(child)
        if cls & skip:
            continue
        if "t_IPA" in cls:
            text = (child.text or "").strip()
            if text:
                ipas.append(text)
            continue
        if "t_respell" in cls:
            respell = True
            continue
        sub_ipas, sub_respell = prons(child, skip)
        ipas += sub_ipas
        respell = respell or sub_respell
    return ipas, respell


def text_of(el):
    return "".join(el.itertext()).strip()


def rows_for(xml):
    root = ET.fromstring(xml)
    title = root.get(D + "title") or ""
    hw = next((e for e in root.iter() if "hw" in classes(e)), None)
    hom = hw.get("homograph", "") if hw is not None else ""
    ipas, respell = prons(root, NOT_OWN)
    yield (title, "hw", hom, ipas, respell)
    for block in root.iter():
        if not {"subEntryBlock", "t_derivatives"} <= classes(block):
            continue
        for sub in block:
            if "subEntry" not in classes(sub):
                continue
            words = [text_of(e) for e in sub.iter() if "l" in classes(e)]
            d_ipas, d_respell = prons(sub, {"msDict", "eg", "etym"})
            for w in words:
                yield (w, "der", "", d_ipas, d_respell)


def main():
    ap = argparse.ArgumentParser(description="Extract NOAD headwords and US IPA.")
    ap.add_argument("--body", help="path to NOAD's Body.data")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "data"))
    args = ap.parse_args()

    body = find_body(args.body)
    if not os.path.exists(body):
        sys.stderr.write(f"error: NOAD Body.data not found at {body}\n"
                         "Pass --body PATH or set NOAD_BODY to the dictionary's Body.data.\n")
        return 2
    os.makedirs(args.out, exist_ok=True)
    out = os.path.join(args.out, "noad.tsv")
    n = bad = 0
    with open(out, "w", encoding="utf-8") as f:
        for xml in entries(body):
            try:
                for word, kind, hom, ipas, respell in rows_for(xml):
                    f.write("\t".join([word, kind, hom, ";".join(ipas), "1" if respell else "0"]) + "\n")
                    n += 1
            except ET.ParseError:
                bad += 1
    sys.stderr.write(f"wrote {n} rows to {out} ({bad} unparsable entries skipped)\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
