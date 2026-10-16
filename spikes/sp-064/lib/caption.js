"use strict";

// Step 2: cell captions, redone. One Claude call per cell: the cell is cut out
// as crop-grid-cell.sh cuts it (SP-029's cropCell) and copied alone into a
// fresh folder as `picture.png`. The prompt holds only the must-see list, the
// same for all 9 cells of a grid, so the captioner never sees the word, the
// story, the cell number or Flash's cell. It answers JSON: the objects with
// their adjectives, the shot, the angle, the action step, the extras, and a
// status per must-see item. The prompt names the must-see items by name only,
// without their adjectives (ADR-0032): the adjectives can describe the story's
// last step and so hide an earlier step's cell; they count only toward the
// clarity score. Cached in <out>/captions.json (grid → cell → caption); each
// caption keeps the key of the prompt it was made with (`promptKey`), so a
// caption made under another prompt or list is made again. A failed or
// unusable caption isn't cached.

const crypto = require("node:crypto");
const path = require("node:path");
const { cropCell } = require("../../sp-029/lib/caption");
const { parseJson, pool, ClaudeError } = require("./claude");
const { maskName } = require("./headword");

const SHOTS = ["extreme close-up", "close-up", "medium", "wide"];
const STEPS = ["before", "during", "after"];
const STATUSES = ["visible", "partly cut", "hidden"];
const EXTRAS = ["floor", "background", "morePeople", "readableText"];

// The must-see item names, once each, in list order.
const itemNames = (items) => [...new Set(items.map((i) => i.name))];

// The names as the captioner sees them: the headword is hidden in a name that
// holds it (bug-016); every other name is as written.
const shownNames = (items, word) => itemNames(items).map((n) => (word ? maskName(word, n) : n));

function prompt(items, word) {
  return [
    "Use the Read tool to look at the image file picture.png in the current folder.",
    "Describe what the picture shows, as JSON with these keys:",
    '- "objects": every person, animal and object you can see, as [{"name":"...","adjectives":["..."]}]',
    `- "shot": one of ${SHOTS.map((s) => `"${s}"`).join(", ")}`,
    '- "angle": the camera angle, e.g. "eye level", "low angle", "high angle", "overhead"',
    '- "step": the action step it shows, one of "before", "during", "after"',
    '- "extras": what else it shows, {"floor": true|false, "background": "...", "morePeople": true|false, "readableText": "the words you can read, or empty"}',
    '- "mustSee": for each item name below (keyed by the name, exactly as written), "visible" when the thing is fully shown, "partly cut" when the edge of the picture cuts part of it off, "hidden" when it can\'t be seen. Judge only whether the thing itself is there, whatever its state',
    "Print only the JSON, no preamble.",
    "",
    `MUST-SEE ITEMS: ${JSON.stringify(shownNames(items, word))}`,
  ].join("\n");
}

const isObject = (x) => x !== null && typeof x === "object" && !Array.isArray(x);

// Model answer → caption, or a ClaudeError when it's unusable.
// The mustSee keys stay the list's own item names, whatever the captioner was shown.
function parseCaption(text, items, word) {
  const j = parseJson(text);
  if (!Array.isArray(j.objects)) throw new ClaudeError("unusable caption: no objects array");
  if (!SHOTS.includes(j.shot)) throw new ClaudeError(`unusable caption: shot ${JSON.stringify(j.shot)}`);
  if (!STEPS.includes(j.step)) throw new ClaudeError(`unusable caption: step ${JSON.stringify(j.step)}`);
  if (!isObject(j.extras)) throw new ClaudeError("unusable caption: no extras");
  if (!isObject(j.mustSee)) throw new ClaudeError("unusable caption: no mustSee");
  const mustSee = {};
  const shown = shownNames(items, word);
  itemNames(items).forEach((name, k) => {
    if (!STATUSES.includes(j.mustSee[shown[k]])) throw new ClaudeError(`unusable caption: must-see ${shown[k]} is ${JSON.stringify(j.mustSee[shown[k]])}`);
    mustSee[name] = j.mustSee[shown[k]];
  });
  return {
    objects: j.objects,
    shot: j.shot,
    angle: String(j.angle || ""),
    step: j.step,
    extras: Object.fromEntries(EXTRAS.map((k) => [k, j.extras[k] ?? null])),
    mustSee,
  };
}

// The cache key of a caption: the prompt it was made with.
const promptKey = (items, word) => crypto.createHash("sha256").update(prompt(items, word)).digest("hex").slice(0, 16);

// words: [{ word, grid }], lists: word → { items } → { cache, failures: grid → { cell, error } }.
async function captionGrids({ words, lists, imageDir, ask, cache = {}, jobs = 6, onSave = () => {} }) {
  // a cached caption counts only if it was made with the prompt the word's current list gives
  const fits = (caption, items, word) => caption && caption.promptKey === promptKey(items, word);
  const todo = [];
  for (const w of words) for (let cell = 1; cell <= 9; cell++) if (!fits(cache[w.grid]?.[cell], lists[w.word].items, w.word)) todo.push({ ...w, cell });
  const failures = {};
  await pool(todo, jobs, async ({ word, grid, cell }) => {
    const items = lists[word].items;
    try {
      const prepare = (dir) => cropCell(path.join(imageDir, grid), cell, path.join(dir, "picture.png"));
      const caption = { ...parseCaption(await ask(prompt(items, word), { tools: "Read", prepare }), items, word), promptKey: promptKey(items, word) };
      // keep cells in 1–9 order however they finish
      cache[grid] = Object.fromEntries(Object.entries({ ...(cache[grid] || {}), [cell]: caption }).sort(([a], [b]) => a - b));
      onSave(cache);
    } catch (err) {
      if (!(err instanceof ClaudeError)) throw err;
      if (!failures[grid] || cell < failures[grid].cell) failures[grid] = { cell, error: err.message };
    }
  });
  return { cache, failures };
}

module.exports = { prompt, promptKey, itemNames, parseCaption, captionGrids, SHOTS, STEPS, STATUSES };
