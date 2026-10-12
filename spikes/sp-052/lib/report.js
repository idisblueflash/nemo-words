"use strict";

// SP-052 report (committed): counts and word lists only, never NOAD IPA or
// definitions (copyright, Claudepot 39feb3d3). The per-word IPA comparison
// goes to the gitignored detail TSV instead.

const { ipaKey } = require("../../../scripts/card-lib");

const BAR = 0.95; // Done when: NOAD anchors at least 95% as many words as CMU

const SOURCES = ["card", "log", "sample"];
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : "n/a");
const frac = (n, d) => `${n}/${d} (${pct(n, d)})`;
const anchoredCount = (anchors) => anchors.filter((a) => a.keyword).length;
const isAnchored = (side) => anchoredCount(side.anchors) > 0;

// The two dictionaries spell some sounds differently even when they agree:
// NOAD's ər vs CMU's ɚ/ɝ, NOAD's stressed ə vs CMU's ʌ. Compared after this.
function sameSoundKey(ipa) {
  return ipaKey(ipa)
    .replace(/‌/g, "")
    .replace(/[ɚɝ]/g, "əɹ")
    .replace(/ʌ/g, "ə");
}
const splitKey = (syllables) => syllables.split(".").map(sameSoundKey).join(".");

function verdict(noadWords, cmuWords) {
  const go = noadWords >= BAR * cmuWords;
  const share = cmuWords ? pct(noadWords, cmuWords) : "n/a";
  return { go, share };
}

function sideStats(results, side) {
  return {
    ipa: results.filter((r) => r[side].hasUsIpa).length,
    syllables: results.reduce((n, r) => n + r[side].anchors.length, 0),
    anchoredSyllables: results.reduce((n, r) => n + anchoredCount(r[side].anchors), 0),
    anchoredWords: results.filter((r) => isAnchored(r[side])).length,
  };
}

function statsRow(label, results) {
  const n = sideStats(results, "noad");
  const c = sideStats(results, "cmu");
  const w = results.length;
  return `| ${label} | ${w} | ${frac(n.ipa, w)} | ${frac(c.ipa, w)} | ${frac(n.anchoredSyllables, n.syllables)} | ${frac(
    c.anchoredSyllables,
    c.syllables
  )} | ${frac(n.anchoredWords, w)} | ${frac(c.anchoredWords, w)} |`;
}

function bullets(lines, words) {
  if (words.length === 0) lines.push("(none)");
  for (const w of words) lines.push(`- ${w}`);
  lines.push("");
}

function renderReport({ wordSet, results, notes = [], findings = null }) {
  const lines = [];
  lines.push("# SP-052 report: does NOAD find as many exact sound anchors as CMU?", "");
  lines.push(
    "Counts and word lists only. The per-word IPA comparison is in the gitignored " +
      "`dictionaries/noad/data/sp-052-detail.tsv` (NOAD content is never committed).",
    ""
  );

  lines.push("## Word set", "");
  const bySource = (s) => wordSet.words.filter((w) => w.sources.includes(s)).length;
  lines.push(
    `${wordSet.words.length} words: ${bySource("card")} from the card file, ${bySource("log")} from the mnemonic log, ` +
      `${bySource("sample")} sampled (seed ${wordSet.seed}). A word in more than one source is counted once.`,
    ""
  );
  if (wordSet.rows) {
    lines.push(
      `Read: card file: ${wordSet.rows.card} whole-word rows; mnemonic log: ${wordSet.rows.log} whole-word rows ` +
        "(word-part rows not counted; before names are left out and duplicates merged, e.g. `colon (intestine)` and `colon`).",
      ""
    );
  }
  if (wordSet.leftOut.length) {
    lines.push("Left out:", "");
    const groups = new Map();
    for (const x of wordSet.leftOut) {
      const key = `${x.source}\t${x.reason}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(x.word);
    }
    for (const [key, ws] of groups) {
      const [source, reason] = key.split("\t");
      lines.push(`- ${ws.join(", ")} (${source}, ${ws.length}): ${reason}`);
    }
    lines.push("");
  }

  lines.push("## Results", "");
  lines.push(
    "A source's row counts every word from that source (a word in two sources is in both rows). " +
      "Anchored syllables: syllables with an exact anchor, out of all syllables of the words that dictionary has IPA for.",
    ""
  );
  lines.push(
    "| Source | Words | US IPA NOAD | US IPA CMU | Anchored syllables NOAD | Anchored syllables CMU | Words with an anchor NOAD | Words with an anchor CMU |",
    "|---|---|---|---|---|---|---|---|"
  );
  for (const s of SOURCES) lines.push(statsRow(s, results.filter((r) => r.sources.includes(s))));
  lines.push(statsRow("total", results), "");

  lines.push("## Anchored with NOAD only", "");
  bullets(lines, results.filter((r) => isAnchored(r.noad) && !isAnchored(r.cmu)).map((r) => r.word));
  lines.push("## Anchored with CMU only", "");
  bullets(lines, results.filter((r) => isAnchored(r.cmu) && !isAnchored(r.noad)).map((r) => r.word));

  const same = results.filter(
    (r) => r.noad.hasUsIpa && r.cmu.hasUsIpa && sameSoundKey(r.noad.canonicalIpa) === sameSoundKey(r.cmu.ipa)
  );
  const differ = same.filter((r) => splitKey(r.noad.syllables) !== splitKey(r.cmu.syllables));
  lines.push("## Same IPA, split differently", "");
  lines.push(
    `${differ.length} of ${same.length} words with the same IPA in both dictionaries are split differently ` +
      "(IPA compared without stress marks, with NOAD ər = CMU ɚ/ɝ and NOAD ə = CMU ʌ).",
    ""
  );
  bullets(lines, differ.map((r) => r.word));

  // AC5: these count as unanchored for the dictionary that lacks them.
  for (const [side, name] of [["noad", "NOAD"], ["cmu", "CMU"]]) {
    const missing = results.filter((r) => !r[side].hasUsIpa);
    lines.push(`## Words with no US IPA in ${name}`, "");
    lines.push(`${missing.length} words, counted as unanchored for ${name}.`, "");
    bullets(lines, missing.map((r) => `${r.word}: ${r[side].reason}`));
  }

  for (const note of notes) lines.push(...note, "");
  if (findings) lines.push(findings.trim(), "");

  const n = sideStats(results, "noad").anchoredWords;
  const c = sideStats(results, "cmu").anchoredWords;
  const v = verdict(n, c);
  lines.push("## Verdict", "");
  lines.push(
    `${v.go ? "**Go**" : "**No-go**"} for E07: NOAD anchors ${n} words, CMU ${c}: ${v.share} of CMU's (bar: at least 95%).`
  );
  return lines.join("\n") + "\n";
}

const yn = (b) => (b ? "yes" : "no");
const anchorText = (anchors) => anchors.map((a) => `${a.ipa}=${a.keyword || "-"}`).join(" ");
const anchoredText = (anchors) => `${anchoredCount(anchors)}/${anchors.length}`;

const DETAIL_COLUMNS = [
  "word", "sources",
  "noad_us_ipa", "noad_raw", "noad_canonical", "noad_syllables", "noad_anchors", "noad_anchored",
  "cmu_us_ipa", "cmu_ipa", "cmu_syllables", "cmu_anchors", "cmu_anchored",
];

// Per-word detail (NOAD IPA: gitignored, never committed).
function detailTsv(results) {
  const lines = [DETAIL_COLUMNS.join("\t")];
  for (const r of results) {
    lines.push(
      [
        r.word, r.sources.join(","),
        yn(r.noad.hasUsIpa), r.noad.rawIpa || "", r.noad.canonicalIpa || "", r.noad.syllables,
        anchorText(r.noad.anchors), anchoredText(r.noad.anchors),
        yn(r.cmu.hasUsIpa), r.cmu.ipa || "", r.cmu.syllables, anchorText(r.cmu.anchors), anchoredText(r.cmu.anchors),
      ].join("\t")
    );
  }
  return lines.join("\n") + "\n";
}

module.exports = { renderReport, detailTsv, verdict, sameSoundKey, BAR };
