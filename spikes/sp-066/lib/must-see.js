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
// checks it. Cached in <out>/must-see.json (word → { story, items, nameSigns,
// isSequence, angleCase, promptKey }); a cached list is reused while the story
// and the prompt (`promptKey`) are unchanged.

const crypto = require("node:crypto");
const { parseJson, pool, ClaudeError } = require("./claude");

function prompt(story) {
  return [
    "You write the must-see list for a mnemonic picture: the objects that a picture of the story below must show clearly, so that seeing the picture brings the story back.",
    "List only the things a drawing can show: each concrete person, animal, thing or visible result of the action, with the adjectives that matter for it (for example \"bare\" for a cob that was eaten).",
    "List only what the story itself names: don't add settings or props it doesn't name, and list each thing once.",
    "List no abstract item: not a time (later, at night), not a relation (related, his cousin), not a feeling with no visible sign (hope, worry with no worried face). Leave out words that can't be seen (cancerous).",
    'A person\'s or place\'s name can\'t be seen. For a name, list the person or thing that carries the name as an item, without the name (for example "nurse" for a nurse called Venice), and give the name as a name sign: the text that the picture should show, with the item that carries it ({"item":"nurse","text":"Venice"}). Don\'t put the name in any item\'s name. A story with no name has no name signs ([]).',
    "Also say whether the story is a sequence: two or more steps in time (\"roast corn, then toss the cob\").",
    'Also say if the story is about a view (looking down from a ridge, something that looms over a person): "view"; or has one main object, so a close-up of it is the clearest picture: "one-object"; or neither: "none".',
    'Print only JSON, no preamble: {"items":[{"name":"...","adjectives":["..."]}],"nameSigns":[{"item":"...","text":"..."}],"isSequence":true|false,"angleCase":"view"|"one-object"|"none"}',
    "",
    `STORY: ${story}`,
  ].join("\n");
}

const isText = (x) => typeof x === "string" && x.trim() !== "";
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
  return { items, nameSigns, isSequence: j.isSequence === true, angleCase: j.angleCase };
}

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

// The repair prompt: a name in an item's name becomes its carrier plus a name sign.
const fixPrompt = (story, bare) =>
  [
    prompt(story),
    "",
    `Your last list put ${bare.map((n) => `"${n}"`).join(", ")} in an item's name, or gave a name sign whose item isn't on the list. A name can't be seen: list the person or thing that carries the name as the item, without the name (for example "man" for a man called "${bare[0]}"), give the name as a name sign ({"item":"man","text":"${bare[0]}"}), and don't put the name in any item's name.`,
  ].join("\n");

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
      const bare = unsignedNames(w.story, list);
      if (bare.length) {
        list = parseList(await ask(fixPrompt(w.story, bare), { tools: "" }));
        const still = unsignedNames(w.story, list);
        if (still.length) throw new ClaudeError(`name left in an item's name, or a name sign with no carrier: ${still.join(", ")}`);
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

module.exports = { prompt, promptKey, parseList, mustSeeLists, unsignedNames, storyNames, ANGLE_CASES };
