"use strict";

// SP-064 AC2 (bug-016) — the captioner never sees the word, even when the
// must-see list names it in an item name ("breathing machine (ventilator)").
// A list that doesn't hold the word gives the same prompt as before, so its
// cached captions stay. The mustSee keys stay the list's own item names.

const test = require("node:test");
const assert = require("node:assert/strict");

const caption = require("../lib/caption");
const { mentions, maskName } = require("../lib/headword");

const items = (...names) => names.map((name) => ({ name, adjectives: [] }));
const seen = (prompt) => prompt.split("\n").pop();

test("bug-016: the caption prompt hides the word in the item names that hold it", () => {
  assert.equal(seen(caption.prompt(items("nurse", "breathing machine (ventilator)", "newborn"), "ventilator")), 'MUST-SEE ITEMS: ["nurse","breathing machine","newborn"]');
  assert.doesNotMatch(caption.prompt(items("surgeon", "scalpel"), "surgeon"), /surgeon/i);
  assert.doesNotMatch(caption.prompt(items("matching pajamas"), "pajamas"), /pajamas/i);
  assert.doesNotMatch(caption.prompt(items("Ventilators"), "ventilator"), /ventilator/i);
});

test("bug-016: a list without the word gives the very same prompt and key as without a word", () => {
  const list = items("nurse", "nametag that reads \"Venice\"", "newborn");
  assert.equal(caption.prompt(list, "nu"), caption.prompt(list));
  assert.equal(caption.promptKey(list, "nu"), caption.promptKey(list));
  // a word that is only part of another word is not a mention
  assert.equal(mentions("man", "mantle"), false);
  assert.equal(maskName("man", "mantle"), "mantle");
});

test("bug-016: the mustSee keys stay the list's item names", () => {
  const list = items("nurse", "breathing machine (ventilator)");
  const answer = JSON.stringify({
    objects: [{ name: "nurse", adjectives: [] }],
    shot: "medium",
    angle: "eye level",
    step: "during",
    extras: { floor: true, background: "", morePeople: false, readableText: "" },
    mustSee: { nurse: "visible", "breathing machine": "partly cut" },
  });
  assert.deepEqual(caption.parseCaption(answer, list, "ventilator").mustSee, { nurse: "visible", "breathing machine (ventilator)": "partly cut" });
});
