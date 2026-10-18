"use strict";

// The summary a stage prints (stdout), for the Staged run's checks after each
// stage: the words it ran and their picks (with the start weights, before the
// weights are fixed), the calls it really made (a re-run of cached words
// makes none), whether every caption has the action line and a size and
// place per shown item, the gate skips next to SP-064's on the same words,
// vivid alone next to the chance rate, and the angleCase counts. After the
// stage-2 refine also: whether every caption has a drawing-errors list, for
// the name-anchor words the cells gated out only because the name can't be
// read (should be 0, ADR-0037), and how many cells have a drawing error
// (most cells → stop for design, ADR-0038). After the stage-5 refine
// (ADR-0039): the captions that show the main subject but give no mainView
// (should be 0), and clarity's mean spread inside a grid (max − min over the
// scored cells, then the mean over the judged words), next to stage 5's value
// before the refine. After the second stage 5 (ADR-0040, C-051): each word's
// main subject, marked "(actor)" when it is one, or "none"; for an actor a
// null mainView means the cell doesn't show it, so it isn't counted as a
// missing view, and the cells where an actor isn't shown get a line of their own.

const { vividAlone, hasNameAnchor, hasMainSubject } = require("./split");
const { VIEWS } = require("./caption");

// Stage 5's clarity spread before the refine (the item's "Check after each stage").
const SPREAD_BEFORE = 0.71;

const isActor = (list) => !!(list && list.mainSubject && list.mainSubject.actor);

// Whether a caption shows the list's main subject: an item that isn't marked
// hidden, or an actor with a mainView (null: the cell doesn't show it).
const showsMain = (list, c) => {
  if (isActor(list)) return c.mainView !== null && c.mainView !== undefined;
  const m = c.mustSee && c.mustSee[list.mainSubject.name];
  return !(m && m.mark === "hidden");
};

// For an actor word: the cells that don't show the actor (mainView null).
const actorNotShown = (list, cells) =>
  Object.entries(cells || {})
    .filter(([, c]) => !showsMain(list, c))
    .map(([cell]) => Number(cell));

// A word's main subject as the summary prints it.
const mainText = (list) => (hasMainSubject(list) ? `; main subject ${list.mainSubject.name}${isActor(list) ? " (actor)" : ""}` : "; main subject none");

// For a main-subject word: the cells that show the main subject but have no usable mainView.
function missingViews(list, cells) {
  return Object.entries(cells || {})
    .filter(([, c]) => showsMain(list, c) && !VIEWS.includes(c.mainView))
    .map(([cell]) => Number(cell));
}

// A judged word's clarity spread: max − min over its scored cells.
function claritySpread(pick) {
  const v = pick.scored.map((c) => pick.scores[c].clarity.score);
  return Math.max(...v) - Math.min(...v);
}

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

// After stage 2: every caption of the word's grid has a drawing-errors list.
const hasDrawingErrorLists = (cells) => {
  const all = Object.values(cells || {});
  return all.length === 9 && all.every((c) => Array.isArray(c.drawingErrors));
};

// An item that holds the name (ADR-0037 says it shouldn't): its name holds a
// name sign's text, or names a nametag, badge, label or sign.
const NAME_ITEM = /name\s?tag|badge|label|\bsign\b/i;
function holdsName(itemName, nameSigns) {
  if (NAME_ITEM.test(itemName)) return true;
  const lower = itemName.toLowerCase();
  return nameSigns.some((s) => new RegExp(`\\b${s.text.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower));
}

// For a name-anchor word: the gated-out cells whose every hidden must-see item
// holds the name, so the cell is out only because its name can't be read.
function gatedForName(w, list, cells) {
  return (w.pick.gatedOut || []).filter((c) => {
    const hidden = Object.entries((cells && cells[c] && cells[c].mustSee) || {}).filter(([, m]) => m.mark === "hidden");
    return hidden.length > 0 && hidden.every(([name]) => holdsName(name, list.nameSigns));
  });
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
    const ac = list ? `; angleCase ${list.angleCase}${mainText(list)}` : "";
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
  const withErrorLists = judged.filter((w) => hasDrawingErrorLists(captions[w.grid]));
  const nameWords = judged.filter((w) => hasNameAnchor(lists[w.word]));
  const forName = nameWords.map((w) => [w.word, gatedForName(w, lists[w.word], captions[w.grid])]).filter(([, cells]) => cells.length);
  const nForName = forName.reduce((n, [, cells]) => n + cells.length, 0);
  const judgedCells = judged.flatMap((w) => Object.values(captions[w.grid] || {}));
  const errorCells = judgedCells.filter((c) => (c.drawingErrors || []).length);
  const mustSeeErrorCells = errorCells.filter((c) => c.drawingErrors.some((e) => e.mustSee));
  const mainWords = judged.filter((w) => hasMainSubject(lists[w.word]));
  const noView = mainWords.map((w) => [w.word, missingViews(lists[w.word], captions[w.grid])]).filter(([, cells]) => cells.length);
  const nNoView = noView.reduce((n, [, cells]) => n + cells.length, 0);
  const showing = mainWords.reduce((n, w) => n + Object.values(captions[w.grid] || {}).filter((c) => showsMain(lists[w.word], c)).length, 0);
  const actorWords = mainWords.filter((w) => isActor(lists[w.word]));
  const notShown = actorWords.map((w) => [w.word, actorNotShown(lists[w.word], captions[w.grid])]).filter(([, cells]) => cells.length);
  const nNotShown = notShown.reduce((n, [, cells]) => n + cells.length, 0);
  const actorCells = actorWords.reduce((n, w) => n + Object.keys(captions[w.grid] || {}).length, 0);
  const spreads = judged.map((w) => claritySpread(w.pick));
  const meanSpread = spreads.length ? (spreads.reduce((s, x) => s + x, 0) / spreads.length).toFixed(2) : "—";
  lines.push(
    "",
    `Judged: ${judged.length} of ${words.length}; unjudged: ${words.length - judged.length}`,
    `Captions with the action line and a size and place per shown item: ${complete.length} of ${judged.length} judged grids`,
    `Captions with a drawing-errors list: ${withErrorLists.length} of ${judged.length} judged grids`,
    `Name-anchor words: ${nameWords.length}; cells gated out only because the name can't be read: ${nForName}${forName.length ? ` (${forName.map(([w, cells]) => `${w}: ${cells.join(", ")}`).join("; ")})` : ""}`,
    `Cells with a drawing error: ${of(errorCells.length, judgedCells.length)}; on a must-see item: ${mustSeeErrorCells.length}`,
    `Cells with an onlooker (ADR-0041): ${of(judgedCells.filter((c) => (c.onlookers || []).length).length, judgedCells.length)}; one that watches or reacts: ${judgedCells.filter((c) => (c.onlookers || []).some((o) => ["watches", "reacts"].includes(o.does))).length}`,
    `Main-subject words: ${mainWords.length}; captions that show the main subject with no mainView: ${nNoView} of ${showing}${noView.length ? ` (${noView.map(([w, cells]) => `${w}: ${cells.join(", ")}`).join("; ")})` : ""}`,
    `Actor words: ${actorWords.length}; cells where the actor isn't shown: ${nNotShown} of ${actorCells}${notShown.length ? ` (${notShown.map(([w, cells]) => `${w}: ${cells.join(", ")}`).join("; ")})` : ""}`,
    `Clarity's spread inside a grid (max − min): mean ${meanSpread} over ${judged.length} judged grids; stage 5 before the refine: ${SPREAD_BEFORE}`,
    `Gate skipped: ${skipped.length} of ${judged.length}; SP-064 on the same words: ${sp064Skipped.length} of ${sp064Same.length}`,
    `Exact (start weights): ${of(judged.filter((w) => w.pick.mainCell === w.flashCell).length, judged.length)}; in three: ${of(judged.filter((w) => w.pick.ranking.slice(0, 3).includes(w.flashCell)).length, judged.length)}`,
    `Vivid alone (exact): ${of(vividExact.length, judged.length)}; chance 11.1%`,
    `angleCase: view ${cases.view}, one-object ${cases["one-object"]}, none ${cases.none}`,
    "",
  );
  return lines.join("\n");
}

module.exports = { stageSummary, captionsComplete };
