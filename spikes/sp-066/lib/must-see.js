"use strict";

// Step 1: the must-see list (C-034). One text-only Claude call per story (no
// images, no tools) lists the objects a cell must show, each with its
// adjectives, and says whether the story is a sequence. SP-066: it lists only
// what a drawing can show (no abstract item: a time, a relation, a feeling
// with no visible sign), and it says if the story is about a view, has one
// main object, or neither (angleCase, C-042). A name used as a sound anchor
// stays its visible sign, as in SP-064. Cached in <out>/must-see.json
// (word → { story, items, isSequence, angleCase }); a cached list is reused
// while the story is unchanged.

const { parseJson, pool, ClaudeError } = require("./claude");

function prompt(story) {
  return [
    "You write the must-see list for a mnemonic picture: the objects that a picture of the story below must show clearly, so that seeing the picture brings the story back.",
    "List only the things a drawing can show: each concrete person, animal, thing or visible result of the action, with the adjectives that matter for it (for example \"bare\" for a cob that was eaten).",
    "List only what the story itself names: don't add settings or props it doesn't name, and list each thing once.",
    "List no abstract item: not a time (later, at night), not a relation (related, his cousin), not a feeling with no visible sign (hope, worry with no worried face). Leave out words that can't be seen (cancerous).",
    "A person's or place's name can't be seen: turn it into its visible sign, for example a nametag that reads \"Venice\" for a nurse called Venice.",
    "Also say whether the story is a sequence: two or more steps in time (\"roast corn, then toss the cob\").",
    'Also say if the story is about a view (looking down from a ridge, something that looms over a person): "view"; or has one main object, so a close-up of it is the clearest picture: "one-object"; or neither: "none".',
    'Print only JSON, no preamble: {"items":[{"name":"...","adjectives":["..."]}],"isSequence":true|false,"angleCase":"view"|"one-object"|"none"}',
    "",
    `STORY: ${story}`,
  ].join("\n");
}

const isText = (x) => typeof x === "string" && x.trim() !== "";
const ANGLE_CASES = ["view", "one-object", "none"];

// Model answer → { items, isSequence, angleCase }, or a ClaudeError when it's unusable.
function parseList(text) {
  const j = parseJson(text);
  if (!Array.isArray(j.items)) throw new ClaudeError("unusable must-see list: no items array");
  const items = j.items.map((i) => {
    if (!i || !isText(i.name)) throw new ClaudeError(`unusable must-see item: ${JSON.stringify(i)}`);
    const adjectives = Array.isArray(i.adjectives) ? i.adjectives.filter(isText) : [];
    return { name: i.name.trim(), adjectives };
  });
  if (!ANGLE_CASES.includes(j.angleCase)) throw new ClaudeError(`unusable must-see list: angleCase ${JSON.stringify(j.angleCase)}`);
  return { items, isSequence: j.isSequence === true, angleCase: j.angleCase };
}

// A name anchor is a capitalized word of the story that the list names as an
// item. Its visible sign is an item that shows the name on a nametag, sign,
// label and so on. Returns the names the list leaves bare (bug-015).
const SIGN = /name\s?tag|sign|label|badge|sticker|placard|banner|read/i;

// The captioner is shown item names only (ADR-0032), so the sign has to be in
// the name of an item that holds the anchor: a bare "Victor" is judged as a
// bare name even when an adjective says "nametag reading Victor".
function unsignedNames(story, items) {
  const names = new Set(story.match(/[A-Z][a-z]+/g) || []);
  return [...names].filter((n) => {
    const re = new RegExp(`\\b${n}\\b`);
    return items.some((i) => re.test(i.name) && !SIGN.test(i.name));
  });
}

// An item that holds a name anchor in its name, with no sign there, but with
// the sign in an adjective: the name becomes `person with a nametag reading
// "<anchor>"` and that adjective goes (it is in the name now). No Claude call.
function moveSignIntoName(story, items) {
  const names = [...new Set(story.match(/[A-Z][a-z]+/g) || [])];
  return items.map((i) => {
    const n = names.find((x) => new RegExp(`\\b${x}\\b`).test(i.name));
    const re = n && new RegExp(`\\b${n}\\b`);
    const k = n && !SIGN.test(i.name) ? i.adjectives.findIndex((a) => re.test(a) && SIGN.test(a)) : -1;
    if (k < 0) return i;
    return { name: `person with a nametag reading "${n}"`, adjectives: i.adjectives.filter((_, j) => j !== k) };
  });
}

const fixPrompt = (story, bare) =>
  [
    prompt(story),
    "",
    `Your last list left ${bare.map((n) => `"${n}"`).join(", ")} as a bare name. A name can't be seen: show it as a nametag or sign that reads the name (for example a man with a nametag that reads "${bare[0]}"), and don't list the bare name as an item.`,
  ].join("\n");

// words: [{ word, story }] → { cache, failures: word → error }. A cached list
// that leaves a name bare is made again; a new list that does is asked once more.
async function mustSeeLists({ words, ask, cache = {}, jobs = 6, onSave = () => {} }) {
  const failures = {};
  let changed = false;
  for (const w of words) {
    const c = cache[w.word];
    if (c && c.story === w.story) {
      const items = moveSignIntoName(w.story, c.items);
      if (JSON.stringify(items) !== JSON.stringify(c.items)) {
        cache[w.word] = { ...c, items };
        changed = true;
      }
    }
  }
  if (changed) onSave(cache);
  const fresh = (w) =>
    cache[w.word] && cache[w.word].story === w.story && ANGLE_CASES.includes(cache[w.word].angleCase) && unsignedNames(w.story, cache[w.word].items).length === 0;
  const todo = words.filter((w) => !fresh(w));
  await pool(todo, jobs, async (w) => {
    try {
      let list = parseList(await ask(prompt(w.story), { tools: "" }));
      list.items = moveSignIntoName(w.story, list.items);
      const bare = unsignedNames(w.story, list.items);
      if (bare.length) {
        list = parseList(await ask(fixPrompt(w.story, bare), { tools: "" }));
        list.items = moveSignIntoName(w.story, list.items);
        const still = unsignedNames(w.story, list.items);
        if (still.length) throw new ClaudeError(`name left bare, with no visible sign: ${still.join(", ")}`);
      }
      cache[w.word] = { story: w.story, ...list };
      onSave(cache);
    } catch (err) {
      if (!(err instanceof ClaudeError)) throw err;
      failures[w.word] = err.message;
    }
  });
  return { cache, failures };
}

module.exports = { prompt, parseList, mustSeeLists, unsignedNames, ANGLE_CASES, SIGN };
