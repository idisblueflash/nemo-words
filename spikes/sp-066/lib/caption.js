"use strict";

// Step 2: cell captions, redone. One Claude call per cell: the cell is cut out
// as crop-grid-cell.sh cuts it (SP-029's cropCell) and copied alone into a
// fresh folder as `picture.png`. The prompt holds only the must-see list, the
// same for all 9 cells of a grid, so the captioner never sees the word, the
// story, the cell number or Flash's cell. It answers JSON: the objects with
// their adjectives, the shot, the angle, the action step, the extras, and a
// status per must-see item. SP-066 adds one action line (what the objects do
// to each other) and, per must-see item, a size (large / medium / small) and
// a place (front / back) next to its mark (visible / partly cut / hidden); a
// hidden item has no size or place (null). The prompt names the must-see items by name only,
// without their adjectives (ADR-0032): the adjectives can describe the story's
// last step and so hide an earlier step's cell; they count only toward the
// clarity score. After stage 2 (ADR-0036, C-044) it also lists the cell's
// drawing errors, drawingErrors [{ object, mustSee: true|false, note }]: an
// object that floats, looks pasted on, or breaks the lines of the wall or
// floor (not one the scene shows broken on purpose); an empty list when there
// is none, and a caption without the list is unusable. The text it can read
// stays in extras.readableText (the name-sign check, ADR-0035). After stage 5
// (ADR-0037, C-045): when the list has a main subject, the prompt names it (as
// the captioner may see it, without the headword) and asks for its view,
// mainView: front, three-quarter, side, back or above; null when the cell hides
// it. A caption with no usable mainView then is unusable. With no main subject
// the prompt has no view question, and mainView is null. After the second
// stage 5 (ADR-0038, C-047) the main subject is { name, actor }; the prompt
// gives its name, masked as item names are. An actor isn't an item: null then
// means the cell doesn't show the person, and is usable.
// Cached in <out>/captions.json (grid → cell → caption); each
// caption keeps the key of the prompt it was made with (`promptKey`), so a
// caption made under another prompt or list is made again. A failed or
// unusable caption isn't cached.

const crypto = require("node:crypto");
const path = require("node:path");
const { cropCell } = require("../../sp-029/lib/caption");
const { parseJson, pool, oneLine, ClaudeError } = require("./claude");
const { maskName, describeBareName } = require("./headword");

const SHOTS = ["extreme close-up", "close-up", "medium", "wide"];
const STEPS = ["before", "during", "after"];
const STATUSES = ["visible", "partly cut", "hidden"];
const EXTRAS = ["floor", "background", "morePeople", "readableText"];
const SIZES = ["large", "medium", "small"];
const PLACES = ["front", "back"];
const VIEWS = ["front", "three-quarter", "side", "back", "above"];
// What an onlooker does (ADR-0039, C-048).
const ONLOOKER_DOES = ["watches", "reacts", "looks away", "other"];

// The must-see item names, once each, in list order.
const itemNames = (items) => [...new Set(items.map((i) => i.name))];

// The names as the captioner sees them: the headword is hidden in a name that
// holds it (bug-016); a name that is wholly the headword is described instead,
// since the bare placeholder says nothing (bug-020); every other name is as written.
const shownNames = (items, word) => itemNames(items).map((n) => (word ? describeBareName(word, n) || maskName(word, n) : n));

// The main subject's name as the captioner sees it, like the item names (an actor's too).
const shownMain = (name, word) => (word ? describeBareName(word, name) || maskName(word, name) : name);

const hasMain = (mainSubject) => mainSubject !== null && mainSubject !== undefined;

// mainSubject: { name, actor } or null (ADR-0038). A non-actor main subject's
// prompt is the one it had as a bare name, so its cached captions stay valid;
// an actor's view question says to give null when the cell doesn't show it.
function prompt(items, word, mainSubject = null) {
  const main = hasMain(mainSubject) ? shownMain(mainSubject.name, word) : null;
  const ifNull = hasMain(mainSubject) && mainSubject.actor ? "the picture doesn't show the main subject" : "the main subject is hidden";
  return [
    "Use the Read tool to look at the image file picture.png in the current folder.",
    "Describe what the picture shows, as JSON with these keys:",
    '- "objects": every person, animal and object you can see, as [{"name":"...","adjectives":["..."]}]',
    `- "shot": one of ${SHOTS.map((s) => `"${s}"`).join(", ")}`,
    '- "angle": the camera angle, e.g. "eye level", "low angle", "high angle", "overhead"',
    '- "step": the action step it shows, one of "before", "during", "after"',
    '- "extras": what else it shows, {"floor": true|false, "background": "...", "morePeople": true|false, "readableText": "the words you can read, or empty"}',
    '- "action": one line: what the objects do to each other in the picture (who holds, pushes, hands over, looks at what), or that they stand apart',
    '- "mustSee": for each item name below (keyed by the name, exactly as written), {"mark": "visible", "partly cut" or "hidden", "size": "large", "medium" or "small", "place": "front" or "back"}. The mark is "visible" when the thing is fully shown, "partly cut" when the edge of the picture cuts part of it off, "hidden" when it can\'t be seen; judge only whether the thing itself is there, whatever its state. The size is how much of the picture the thing takes up; the place is whether it is in the front or the back of the scene. For a hidden thing, give null for size and place',
    '- "drawingErrors": each object that doesn\'t fit the picture as drawn: it floats, looks pasted on, or breaks the lines of the wall or floor, as [{"object":"...","mustSee": true or false,"note":"what is wrong"}], with "mustSee" true when the object is one of the item names below. An object that is cut off by the edge of the cell (a crop, for example in a close-up), drawn small, or shown in the wrong state is not a drawing error. An object that the scene shows as broken or crooked on purpose is not a drawing error either. A face or a hand that is drawn wrong (twisted, melted or lopsided features, odd eyes, extra or missing fingers) is a drawing error: give the person as the object, with "mustSee" true when the person is one of the item names below. Give an empty list ([]) when there is none',
    `- "onlookers": each person or animal in the picture that doesn't do the main action itself${main === null ? "" : " and isn't the main subject below"}, but is there with it: it watches the action, reacts to it, looks away, or does something else. Give [{"who":"...","does": ${ONLOOKER_DOES.map((d) => `"${d}"`).join(", ")},"view": one of ${VIEWS.slice(0, -1).map((v) => `"${v}"`).join(", ")} or "${VIEWS[VIEWS.length - 1]}"}], where "view" says where its face and body point: "front" when they face the viewer, "three-quarter" when they are turned part way, "side" in profile, "back" when they face away, "above" when seen from above. Give an empty list ([]) when there is none`,
    ...(main === null
      ? []
      : [
          `- "mainView": the view of the main subject below (MAIN SUBJECT): one of ${VIEWS.slice(0, -1).map((v) => `"${v}"`).join(", ")} or "${VIEWS[VIEWS.length - 1]}" (seen from above). It says where its face and body point: "front" when they face the viewer, "three-quarter" when they are turned part way, "side" in profile, "back" when they face away. Give null when ${ifNull}`,
        ]),
    'Put the words you can read in the picture (on a nametag, a sign, a label) in "extras"."readableText", exactly as written.',
    "Print only the JSON, no preamble.",
    "",
    ...(main === null ? [] : [`MAIN SUBJECT: ${JSON.stringify(main)}`]),
    `MUST-SEE ITEMS: ${JSON.stringify(shownNames(items, word))}`,
  ].join("\n");
}

const isObject = (x) => x !== null && typeof x === "object" && !Array.isArray(x);

// Model answer → caption, or a ClaudeError when it's unusable.
// The mustSee keys stay the list's own item names, whatever the captioner was shown.
function parseCaption(text, items, word, mainSubject = null) {
  const j = parseJson(text);
  if (!Array.isArray(j.objects)) throw new ClaudeError("unusable caption: no objects array");
  if (!SHOTS.includes(j.shot)) throw new ClaudeError(`unusable caption: shot ${JSON.stringify(j.shot)}`);
  if (!STEPS.includes(j.step)) throw new ClaudeError(`unusable caption: step ${JSON.stringify(j.step)}`);
  if (!isObject(j.extras)) throw new ClaudeError("unusable caption: no extras");
  if (!isObject(j.mustSee)) throw new ClaudeError("unusable caption: no mustSee");
  if (typeof j.action !== "string" || !j.action.trim()) throw new ClaudeError("unusable caption: no action line");
  if (!Array.isArray(j.drawingErrors)) throw new ClaudeError("unusable caption: no drawing errors list");
  const drawingErrors = j.drawingErrors.map((e) => {
    if (!isObject(e) || typeof e.object !== "string" || !e.object.trim() || typeof e.mustSee !== "boolean") {
      throw new ClaudeError(`unusable caption: drawing error ${JSON.stringify(e)}`);
    }
    return { object: e.object.trim(), mustSee: e.mustSee, note: typeof e.note === "string" ? oneLine(e.note) : "" };
  });
  if (!Array.isArray(j.onlookers)) throw new ClaudeError("unusable caption: no onlookers list");
  const onlookers = j.onlookers.map((o) => {
    if (!isObject(o) || typeof o.who !== "string" || !o.who.trim() || !ONLOOKER_DOES.includes(o.does) || !VIEWS.includes(o.view)) {
      throw new ClaudeError(`unusable caption: onlooker ${JSON.stringify(o)}`);
    }
    return { who: o.who.trim(), does: o.does, view: o.view };
  });
  const mustSee = {};
  const shown = shownNames(items, word);
  itemNames(items).forEach((name, k) => {
    const m = j.mustSee[shown[k]];
    if (!isObject(m) || !STATUSES.includes(m.mark)) throw new ClaudeError(`unusable caption: must-see ${shown[k]} is ${JSON.stringify(m)}`);
    if (m.mark === "hidden") {
      mustSee[name] = { mark: m.mark, size: null, place: null };
      return;
    }
    if (!SIZES.includes(m.size)) throw new ClaudeError(`unusable caption: must-see ${shown[k]} has size ${JSON.stringify(m.size)}`);
    if (!PLACES.includes(m.place)) throw new ClaudeError(`unusable caption: must-see ${shown[k]} has place ${JSON.stringify(m.place)}`);
    mustSee[name] = { mark: m.mark, size: m.size, place: m.place };
  });
  // a non-actor main subject has a view unless its item is hidden; an actor
  // (not an item) has a view or null, when the cell doesn't show the person
  let mainView = null;
  const hiddenItem = hasMain(mainSubject) && !mainSubject.actor && mustSee[mainSubject.name] && mustSee[mainSubject.name].mark === "hidden";
  if (hasMain(mainSubject) && !hiddenItem && !(mainSubject.actor && j.mainView === null)) {
    if (!VIEWS.includes(j.mainView)) throw new ClaudeError(`unusable caption: mainView ${JSON.stringify(j.mainView)}`);
    mainView = j.mainView;
  }
  return {
    objects: j.objects,
    shot: j.shot,
    angle: String(j.angle || ""),
    step: j.step,
    action: oneLine(j.action),
    extras: Object.fromEntries(EXTRAS.map((k) => [k, j.extras[k] ?? null])),
    mustSee,
    drawingErrors,
    onlookers,
    mainView,
  };
}

// The cache key of a caption: the prompt it was made with.
const promptKey = (items, word, mainSubject = null) => crypto.createHash("sha256").update(prompt(items, word, mainSubject)).digest("hex").slice(0, 16);

// words: [{ word, grid }], lists: word → { items, mainSubject: { name, actor } | null } → { cache, failures: grid → { cell, error } }.
async function captionGrids({ words, lists, imageDir, ask, cache = {}, jobs = 6, onSave = () => {} }) {
  // a cached caption counts only if it was made with the prompt the word's current list gives
  const mainOf = (word) => lists[word].mainSubject ?? null;
  const fits = (caption, word) => caption && caption.promptKey === promptKey(lists[word].items, word, mainOf(word));
  const todo = [];
  for (const w of words) for (let cell = 1; cell <= 9; cell++) if (!fits(cache[w.grid]?.[cell], w.word)) todo.push({ ...w, cell });
  const failures = {};
  await pool(todo, jobs, async ({ word, grid, cell }) => {
    const items = lists[word].items;
    const main = mainOf(word);
    try {
      const prepare = (dir) => cropCell(path.join(imageDir, grid), cell, path.join(dir, "picture.png"));
      const caption = { ...parseCaption(await ask(prompt(items, word, main), { tools: "Read", prepare }), items, word, main), promptKey: promptKey(items, word, main) };
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

module.exports = { prompt, promptKey, itemNames, parseCaption, captionGrids, SHOTS, STEPS, STATUSES, SIZES, PLACES, VIEWS, ONLOOKER_DOES };
