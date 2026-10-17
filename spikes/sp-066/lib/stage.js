"use strict";

// The summary a stage prints (stdout), for the Staged run's checks after each
// stage: the words it ran and their picks (with the start weights, before the
// weights are fixed), the calls it really made (a re-run of cached words
// makes none), whether every caption has the action line and a size and
// place per shown item, the gate skips next to SP-064's on the same words,
// vivid alone next to the chance rate, and the angleCase counts.

const { vividAlone } = require("./split");

const pct = (n, k) => (k ? `${((n / k) * 100).toFixed(1)}%` : "—");
const of = (n, k) => `${n} of ${k} (${pct(n, k)})`;

// Every caption of the word's grid has an action line, and a size and place
// for each item that isn't hidden.
function captionsComplete(cells) {
  const all = Object.values(cells || {});
  if (all.length !== 9) return false;
  return all.every(
    (c) =>
      typeof c.action === "string" &&
      c.action.trim() !== "" &&
      Object.values(c.mustSee || {}).every((m) => m.mark === "hidden" || (m.size && m.place)),
  );
}

function stageSummary({ stage, words, total, split, outcomes, lists, captions, claudeCounts, jevCalls }) {
  const judged = words.filter((w) => w.pick);
  const early = new Map((split.earlyPicks || []).map((e) => [e.word, e.roles]));
  const c = claudeCounts;
  const lines = [
    `${stage} stage: ${words.length} of ${total} ${stage} words (${words.map((w) => w.word).join(", ")})`,
    `Claude calls this run: ${c.mustSee + c.caption + c.compare} (must-see ${c.mustSee}, caption ${c.caption}, compare ${c.compare}); Jev calls this run: ${jevCalls}`,
    "",
  ];
  for (const w of words) {
    const list = lists[w.word];
    const role = early.has(w.word) ? `; early pick: ${early.get(w.word).join(", ")}` : "";
    const ac = list ? `; angleCase ${list.angleCase}` : "";
    if (!w.pick) {
      lines.push(`- ${w.word}: unjudged: ${w.unjudged}${ac}${role}`);
      continue;
    }
    const p = w.pick;
    const top3 = p.ranking.slice(0, 3);
    const gate = p.gateSkipped ? "gate skipped" : p.gatedOut.length ? `gated out ${p.gatedOut.join(", ")}` : "no cell gated out";
    lines.push(
      `- ${w.word}: Flash's cell ${w.flashCell}, main ${p.mainCell}${p.mainCell === w.flashCell ? " (exact)" : ""}, alternative ${p.alternativeCell ?? "—"}, 3 highest ${top3.join(", ")}${top3.includes(w.flashCell) ? " (in three)" : ""}; vivid alone ${vividAlone(p.scores)}; ${gate}${ac}${role}`,
    );
  }
  const complete = judged.filter((w) => captionsComplete(captions[w.grid]));
  const skipped = judged.filter((w) => w.pick.gateSkipped);
  const sp064Same = judged.filter((w) => outcomes[w.word] && outcomes[w.word].judged);
  const sp064Skipped = sp064Same.filter((w) => outcomes[w.word].gateSkipped);
  const vividExact = judged.filter((w) => vividAlone(w.pick.scores) === w.flashCell);
  const cases = { view: 0, "one-object": 0, none: 0 };
  for (const w of words) if (lists[w.word]) cases[lists[w.word].angleCase]++;
  lines.push(
    "",
    `Judged: ${judged.length} of ${words.length}; unjudged: ${words.length - judged.length}`,
    `Captions with the action line and a size and place per shown item: ${complete.length} of ${judged.length} judged grids`,
    `Gate skipped: ${skipped.length} of ${judged.length}; SP-064 on the same words: ${sp064Skipped.length} of ${sp064Same.length}`,
    `Exact (start weights): ${of(judged.filter((w) => w.pick.mainCell === w.flashCell).length, judged.length)}; in three: ${of(judged.filter((w) => w.pick.ranking.slice(0, 3).includes(w.flashCell)).length, judged.length)}`,
    `Vivid alone (exact): ${of(vividExact.length, judged.length)}; chance 11.1%`,
    `angleCase: view ${cases.view}, one-object ${cases["one-object"]}, none ${cases.none}`,
    "",
  );
  return lines.join("\n");
}

module.exports = { stageSummary, captionsComplete };
