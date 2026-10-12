// US-041 AC3 — a logged story is carded even when the word has no sound anchor.
//
// Given a word with no sound anchor that already has a logged story, when
// Flash runs the one-word command, then the logged story is carded as
// before, and nothing stops it for lack of an anchor.
//
// (The logged-story path skips find-keywords altogether, so it can never
// reach the no-anchor stop; this pins that.)

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/card-harness");

test("US-041 AC3: card.js cards the logged story of a no-anchor word (stew) instead of stopping at find-keywords", async () => {
  const logged = "Stu simmers beef and carrots slowly in a pot.";
  const fixture = {
    dict: { stew: "stˈu" }, // the headword is never its own anchor: /stu/ has no keyword
    freqs: { stew: 5e-6 },
    claude: {
      define: JSON.stringify({ primarySense: "dish", definition: "a dish of meat and vegetables cooked slowly in liquid", senses: ["dish"] }),
      gloss: "meat and vegetables cooked slowly in liquid",
    },
  };
  const h = await createHarness(fixture, {
    log: [{ word: "stew", sentence: logged, pivot_words: ["Stu", "simmers"] }],
  });
  try {
    const run = await h.runCard("stew");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.doesNotMatch(run.stdout, /no sound anchor found/);
    assert.match(run.stdout, /logged story/);
    assert.match(h.readAnkiFile(), /^stew\tStu simmers beef and carrots slowly in a pot\.\t\tˈstu\t/m);
    assert.ok(h.mock.calls.find((c) => c.action === "addNote").params.note.fields.Back.startsWith(logged));
    assert.deepEqual(h.claudeCalls().filter((c) => c.step === "compose-stories"), []);
    assert.equal(h.readJsonl(h.mnemonicLog).length, 1, "the logged row stays the only one");
  } finally {
    await h.cleanup();
  }
});
