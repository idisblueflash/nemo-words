"use strict";

// Step 1: the must-see list (C-034). One text-only Claude call per story (no
// images, no tools) lists the objects a cell must show, each with its
// adjectives, and says whether the story is a sequence. A name used as a
// sound anchor becomes its visible sign. Cached in <out>/must-see.json
// (word → { story, items, isSequence }); a cached list is reused while the
// story is unchanged.

const { parseJson, pool, ClaudeError } = require("./claude");

function prompt(story) {
  return [
    "You write the must-see list for a mnemonic picture: the objects that a picture of the story below must show clearly, so that seeing the picture brings the story back.",
    "List each concrete person, animal, thing or visible result of the action, with the adjectives that matter for it (for example \"bare\" for a cob that was eaten).",
    "List only what the story itself names: don't add settings or props it doesn't name, and list each thing once.",
    "Leave out words that can't be seen (later, cancerous, related).",
    "A person's or place's name can't be seen: turn it into its visible sign, for example a nametag that reads \"Venice\" for a nurse called Venice.",
    "Also say whether the story is a sequence: two or more steps in time (\"roast corn, then toss the cob\").",
    'Print only JSON, no preamble: {"items":[{"name":"...","adjectives":["..."]}],"isSequence":true|false}',
    "",
    `STORY: ${story}`,
  ].join("\n");
}

const isText = (x) => typeof x === "string" && x.trim() !== "";

// Model answer → { items, isSequence }, or a ClaudeError when it's unusable.
function parseList(text) {
  const j = parseJson(text);
  if (!Array.isArray(j.items)) throw new ClaudeError("unusable must-see list: no items array");
  const items = j.items.map((i) => {
    if (!i || !isText(i.name)) throw new ClaudeError(`unusable must-see item: ${JSON.stringify(i)}`);
    const adjectives = Array.isArray(i.adjectives) ? i.adjectives.filter(isText) : [];
    return { name: i.name.trim(), adjectives };
  });
  return { items, isSequence: j.isSequence === true };
}

// words: [{ word, story }] → { cache, failures: word → error }.
async function mustSeeLists({ words, ask, cache = {}, jobs = 6, onSave = () => {} }) {
  const failures = {};
  const todo = words.filter((w) => !(cache[w.word] && cache[w.word].story === w.story));
  await pool(todo, jobs, async (w) => {
    try {
      const list = parseList(await ask(prompt(w.story), { tools: "" }));
      cache[w.word] = { story: w.story, ...list };
      onSave(cache);
    } catch (err) {
      if (!(err instanceof ClaudeError)) throw err;
      failures[w.word] = err.message;
    }
  });
  return { cache, failures };
}

module.exports = { prompt, parseList, mustSeeLists };
