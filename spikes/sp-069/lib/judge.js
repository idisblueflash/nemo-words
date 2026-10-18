"use strict";

// SP-069: Opus judges one caption at a time (ADR-0044). It sees the cell
// (picture.png), the must-see item names, the main subject and one caption,
// never the name of the model that wrote it. It scores each caption part 1–3
// and lists the objects that the caption names but the cell doesn't show.

const { parseJson, ClaudeError } = require("../../sp-066/lib/claude");

const PARTS = ["mustSee", "sizePlace", "action", "drawingErrors", "onlookers", "mainView"];

// The caption as the judge sees it: no cache key, no timing.
const shown = (caption) => {
  const { promptKey, ms, costUsd, ...rest } = caption;
  return rest;
};

function judgePrompt(list, caption) {
  const names = [...new Set(list.items.map((i) => i.name))];
  const main = list.mainSubject ? list.mainSubject.name : null;
  return [
    "Use the Read tool to look at the image file picture.png in the current folder. It is one panel of a comic drawing.",
    "Below is a caption that a model wrote for this picture, as JSON, and the item names that the model was asked about.",
    "Judge how true the caption is to the picture. Look at the picture closely before you judge each part.",
    "Score each part 1, 2 or 3: 3 = correct, 2 = one small error or a part left out, 1 = a large error, or most of it wrong or missing.",
    '- "mustSee": the mark of each item (visible = fully shown, partly cut = the picture\'s edge cuts part of it off, hidden = can\'t be seen).',
    '- "sizePlace": the size (large / medium / small: how much of the picture it takes up) and place (front / back) of each item that isn\'t hidden.',
    '- "action": the action line says what the objects and people in the picture do to each other.',
    '- "drawingErrors": the list names each object that floats, looks pasted on or breaks the lines of the wall or floor, and nothing else. An empty list is correct when the picture has none.',
    '- "onlookers": the list names each person or animal that doesn\'t do the main action, with what it does and its view, and nothing else. An empty list is correct when there is none.',
    main === null
      ? '- "mainView": give null, because there is no main subject.'
      : '- "mainView": the view of the main subject (front, three-quarter, side, back, above), or null when the picture doesn\'t show it.',
    '- "invented": list each object, person or animal that the caption names (in objects, action or onlookers) but the picture doesn\'t show. An empty list when there is none.',
    'Print only JSON: {"scores":{"mustSee":1-3,"sizePlace":1-3,"action":1-3,"drawingErrors":1-3,"onlookers":1-3,"mainView":1-3 or null},"invented":["..."],"note":"one line: the worst error"}',
    "",
    ...(main === null ? [] : [`MAIN SUBJECT: ${JSON.stringify(main)}`]),
    `ITEM NAMES: ${JSON.stringify(names)}`,
    `CAPTION: ${JSON.stringify(shown(caption))}`,
  ].join("\n");
}

function parseJudgment(text, list) {
  const j = parseJson(text);
  const s = j.scores;
  if (!s || typeof s !== "object") throw new ClaudeError("unusable judgment: no scores");
  const scores = {};
  for (const p of PARTS) {
    if (p === "mainView" && !list.mainSubject) {
      scores[p] = null;
      continue;
    }
    if (![1, 2, 3].includes(s[p])) throw new ClaudeError(`unusable judgment: ${p} is ${JSON.stringify(s[p])}`);
    scores[p] = s[p];
  }
  if (!Array.isArray(j.invented)) throw new ClaudeError("unusable judgment: no invented list");
  return { scores, invented: j.invented.map(String), note: String(j.note || "") };
}

// The mean of the parts that apply.
const meanScore = (scores) => {
  const v = Object.values(scores).filter((x) => x !== null);
  return v.reduce((a, b) => a + b, 0) / v.length;
};

module.exports = { PARTS, judgePrompt, parseJudgment, meanScore };
