"use strict";

// Step 1: the must-see list (C-034). One text-only Claude call per story (no
// images, no tools) lists the objects a cell must show, each with its
// adjectives, and says whether the story is a sequence. SP-066: it lists only
// what a drawing can show (no abstract item: a time, a relation, a feeling
// with no visible sign), and it says if the story is about a view, has one
// main object, or neither (angleCase, C-042). After stage 2 (ADR-0035, C-043):
// a name used as a sound anchor gives the person or thing that carries it as
// a must-see item ("nurse") and the name as a name sign ({ item: "nurse",
// text: "Venice" }); a name sign is not a must-see item, so the gate never
// checks it. After stage 5 (ADR-0037, C-045): it names the main subject. After
// the second stage 5 (ADR-0038, C-047) that is { name, actor } or null: the
// one person, animal or group of them that does the story's action (an item,
// actor false; never an object, never one that only receives the action), or,
// when the story names no person but has an action, the person who does it
// (the actor, actor true: a short name that is not an item, so the gate never
// checks it). A non-actor main subject that isn't one of the items, or a
// malformed value, gets the repair prompt once (with the name repair, if that
// is needed too), and the word fails if it is still wrong. Cached in
// <out>/must-see.json (word → { story, items, nameSigns, mainSubject,
// isSequence, angleCase, promptKey }); a cached list is reused while the story
// and the prompt (`promptKey`) are unchanged.

const crypto = require("node:crypto");
const { parseJson, pool, ClaudeError } = require("./claude");

// The main subject's JSON shape, as the prompts give it.
const MAIN_SHAPE = '{"name":"...","actor":true|false}|null';

function prompt(story) {
  return [
    "You write the must-see list for a mnemonic picture: the objects that a picture of the story below must show clearly, so that seeing the picture brings the story back.",
    "List only the things a drawing can show: each concrete person, animal, thing or visible result of the action, with the adjectives that matter for it (for example \"bare\" for a cob that was eaten).",
    "List only what the story itself names: don't add settings or props it doesn't name, and list each thing once.",
    "List no abstract item: not a time (later, at night), not a relation (related, his cousin), not a feeling with no visible sign (hope, worry with no worried face). Leave out words that can't be seen (cancerous).",
    'A person\'s or place\'s name can\'t be seen. For a name, list the person or thing that carries the name as an item, without the name (for example "nurse" for a nurse called Venice), and give the name as a name sign: the text that the picture should show, with the item that carries it ({"item":"nurse","text":"Venice"}). Don\'t put the name in any item\'s name. A story with no name has no name signs ([]).',
    "Also say whether the story is a sequence: two or more steps in time (\"roast corn, then toss the cob\").",
    'Also say if the story is about a view (looking down from a ridge, something that looms over a person): "view"; or has one main object, so a close-up of it is the clearest picture: "one-object"; or neither: "none".',
    'Also name the main subject: the one person, animal or group of them that does the story\'s action (a group such as a family counts as one), as {"name":"...","actor":false} with the name of one of your items, exactly as written there (for example {"name":"surgeon","actor":false} for a surgeon who operates by headlamp). When two of them act, it is the one that does the story\'s main action. One that only receives the action is not the main subject (not the patient that a doctor treats, but the doctor). An object is never the main subject (not a cup, a bridge or a rake).',
    'When the story names no person but has an action that a person does ("pull the rope"), the main subject is that person, the actor: give {"name":"...","actor":true} with a short name for the person, such as "person who pulls the rope". An actor is not one of your items: don\'t list it as an item. Otherwise (no person, animal or group acts) give null.',
    `Print only JSON, no preamble: {"items":[{"name":"...","adjectives":["..."]}],"nameSigns":[{"item":"...","text":"..."}],"mainSubject":${MAIN_SHAPE},"isSequence":true|false,"angleCase":"view"|"one-object"|"none"}`,
    "",
    `STORY: ${story}`,
  ].join("\n");
}

const isText = (x) => typeof x === "string" && x.trim() !== "";
const isObject = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const ANGLE_CASES = ["view", "one-object", "none"];

// Model answer → { items, nameSigns, isSequence, angleCase }, or a ClaudeError when it's unusable.
// No nameSigns key means no name signs.
function parseList(text) {
  const j = parseJson(text);
  if (!Array.isArray(j.items)) throw new ClaudeError("unusable must-see list: no items array");
  const items = j.items.map((i) => {
    if (!i || !isText(i.name)) throw new ClaudeError(`unusable must-see item: ${JSON.stringify(i)}`);
    const adjectives = Array.isArray(i.adjectives) ? i.adjectives.filter(isText) : [];
    return { name: i.name.trim(), adjectives };
  });
  if (j.nameSigns !== undefined && !Array.isArray(j.nameSigns)) throw new ClaudeError(`unusable must-see list: name signs ${JSON.stringify(j.nameSigns)}`);
  const nameSigns = (j.nameSigns || []).map((s) => {
    if (!s || !isText(s.item) || !isText(s.text)) throw new ClaudeError(`unusable name sign: ${JSON.stringify(s)}`);
    return { item: s.item.trim(), text: s.text.trim() };
  });
  if (!ANGLE_CASES.includes(j.angleCase)) throw new ClaudeError(`unusable must-see list: angleCase ${JSON.stringify(j.angleCase)}`);
  // a well-formed main subject is trimmed; any other value stays as given, for the repair (badMainSubject)
  const m = j.mainSubject;
  const mainSubject = wellFormedMain(m) ? { name: m.name.trim(), actor: m.actor } : m;
  return { items, nameSigns, mainSubject, isSequence: j.isSequence === true, angleCase: j.angleCase };
}

// A main subject's shape (ADR-0038): { name: a non-empty string, actor: true | false }.
const wellFormedMain = (m) => isObject(m) && isText(m.name) && typeof m.actor === "boolean";

// What is wrong with a list's main subject: "malformed" (not null and not
// { name, actor }; a missing one isn't named), "not an item" (a non-actor main
// subject that isn't one of the items, C-045), or null when it is fine. An
// actor is never an item (C-047), so any actor name is fine.
function mainSubjectProblem(list) {
  const m = list.mainSubject;
  if (m === null) return null;
  if (!wellFormedMain(m)) return "malformed";
  if (m.actor) return null;
  return (list.items || []).some((i) => i.name === m.name) ? null : "not an item";
}

const badMainSubject = (list) => mainSubjectProblem(list) !== null;

// The story's names: each capitalized word that doesn't start a sentence
// ("Venice" in "Nurse Venice returns", "Victor" in "If Victor misses rent"),
// and the capitalized words of each name sign's text.
function storyNames(story, nameSigns = []) {
  const names = [];
  for (const sentence of String(story).split(/[.!?;:]\s+/)) {
    const words = sentence.split(/\s+/).slice(1).map((w) => w.replace(/[^A-Za-z]/g, ""));
    names.push(...words.filter((w) => /^[A-Z][a-z]+$/.test(w)));
  }
  for (const s of nameSigns) names.push(...(s.text.match(/[A-Z][a-z]+/g) || []));
  return [...new Set(names)];
}

// A name sign is not a must-see item (ADR-0035): the name must not be in an
// item's name, bare ("Victor") or as SP-064's nametag item ('man with a
// nametag reading "Victor"'), and each name sign's carrier must be an item of
// the list. list: { items, nameSigns } → the names that need the repair.
function unsignedNames(story, list) {
  const items = list.items || [];
  const signs = list.nameSigns || [];
  const inName = storyNames(story, signs).filter((n) => items.some((i) => new RegExp(`\\b${n}\\b`).test(i.name)));
  const carriers = new Set(items.map((i) => i.name));
  const orphans = signs.filter((s) => !carriers.has(s.item)).map((s) => s.text);
  return [...new Set([...inName, ...orphans])];
}

// The repair prompt: a name in an item's name becomes its carrier plus a name
// sign, and a main subject that isn't an item becomes one of the items or null.
// fix: { bare: [name], main: the list with the bad main subject, or undefined }.
const fixPrompt = (story, { bare, main }) =>
  [
    prompt(story),
    "",
    ...(bare.length
      ? [
          `Your last list put ${bare.map((n) => `"${n}"`).join(", ")} in an item's name, or gave a name sign whose item isn't on the list. A name can't be seen: list the person or thing that carries the name as the item, without the name (for example "man" for a man called "${bare[0]}"), give the name as a name sign ({"item":"man","text":"${bare[0]}"}), and don't put the name in any item's name.`,
        ]
      : []),
    ...(main
      ? [
          `Your last list named the main subject ${JSON.stringify(main.mainSubject ?? null)}, which ${mainSubjectProblem(main) === "malformed" ? `isn't in the form ${MAIN_SHAPE}` : "isn't the name of one of its items"}. Give the main subject as ${MAIN_SHAPE}: with actor false, the name of one of your items, exactly as written there; with actor true, a short name for the person who does the action when the story names no person; or null when no person, animal or group acts.`,
        ]
      : []),
  ].join("\n");

// What a list needs repaired: { bare, main } as fixPrompt takes it, or null when nothing.
function needsRepair(story, list) {
  const bare = unsignedNames(story, list);
  const main = badMainSubject(list) ? list : undefined;
  return bare.length || main ? { bare, main } : null;
}

const repairText = ({ bare, main }) =>
  [
    ...(bare.length ? [`name left in an item's name, or a name sign with no carrier: ${bare.join(", ")}`] : []),
    ...(main ? [`main subject ${mainSubjectProblem(main) === "malformed" ? "isn't usable" : "isn't an item"}: ${JSON.stringify(main.mainSubject ?? null)}`] : []),
  ].join("; ");

// The cache key of a list: the prompt it was made with.
const promptKey = (story) => crypto.createHash("sha256").update(prompt(story)).digest("hex").slice(0, 16);

// words: [{ word, story }] → { cache, failures: word → error }. A cached list
// made under another prompt (or for another story) is made again; a new list
// that puts a name in an item's name is asked once more, with the repair prompt.
async function mustSeeLists({ words, ask, cache = {}, jobs = 6, onSave = () => {} }) {
  const failures = {};
  const fresh = (w) => {
    const c = cache[w.word];
    return !!c && c.story === w.story && c.promptKey === promptKey(w.story);
  };
  const todo = words.filter((w) => !fresh(w));
  await pool(todo, jobs, async (w) => {
    try {
      let list = parseList(await ask(prompt(w.story), { tools: "" }));
      const fix = needsRepair(w.story, list);
      if (fix) {
        list = parseList(await ask(fixPrompt(w.story, fix), { tools: "" }));
        const still = needsRepair(w.story, list);
        if (still) throw new ClaudeError(repairText(still));
      }
      cache[w.word] = { story: w.story, ...list, promptKey: promptKey(w.story) };
      onSave(cache);
    } catch (err) {
      if (!(err instanceof ClaudeError)) throw err;
      failures[w.word] = err.message;
    }
  });
  return { cache, failures };
}

module.exports = { prompt, promptKey, parseList, mustSeeLists, unsignedNames, badMainSubject, storyNames, ANGLE_CASES };
