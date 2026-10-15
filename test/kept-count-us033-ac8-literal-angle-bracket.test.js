// US-033 scenario 8 (bug-012): an auto-picked story that holds a literal "<"
// or ">" counts as kept when the card's story is unchanged. The log sentence is
// plain text; only the live Back is HTML (Anki stores "<cat>" as "&lt;cat&gt;").
//
// Runs the real scripts/kept-count.js against a mock AnkiConnect (never the
// live Anki).

const test = require("node:test");
const assert = require("node:assert/strict");
const { createKeptHarness } = require("./helpers/kept-count-harness");

test("AC8: an unchanged story with a literal <tag-like> word counts as kept", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("wary", "Tom's <cat> won't run.");
    h.card("wary", h.composed("Tom's &lt;cat&gt; won't run.", { gloss: "careful", ipa: "ˈwɛr.i" }), { reps: 2 });
    const { code, stdout } = await h.run();
    assert.equal(code, 0);
    assert.match(stdout, /^kept 1 of 1 \(100%\)$/m);
    assert.doesNotMatch(stdout, /overridden/);
  } finally {
    await h.close();
  }
});

test("AC8: an unchanged story with a lone < and > counts as kept", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("wary", "If 3 < 5 and 7 > 2, the hare runs.");
    h.card("wary", h.composed("If 3 &lt; 5 and 7 &gt; 2, the hare runs."), { reps: 1 });
    const { code, stdout } = await h.run();
    assert.equal(code, 0);
    assert.match(stdout, /^kept 1 of 1 \(100%\)$/m);
  } finally {
    await h.close();
  }
});

test("AC8: a changed story with a literal < is still overridden, shown with its brackets", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("wary", "Tom's <cat> won't run.");
    h.card("wary", h.composed("Tom's &lt;dog&gt; won't run."), { reps: 2 });
    const { code, stdout } = await h.run();
    assert.equal(code, 0);
    assert.match(stdout, /^kept 0 of 1 \(0%\)$/m);
    assert.match(stdout, /auto-picked: Tom's <cat> won't run\./);
    assert.match(stdout, /now: Tom's <dog> won't run\./);
  } finally {
    await h.close();
  }
});

// Round 2: anki-sync.js pushes the story raw (no entities), so a Back it wrote
// itself holds "<cat>" as it is. That must count as kept too.
test("AC8: a Back that anki-sync wrote with a raw <tag-like> word counts as kept", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("wary", "Tom's <cat> won't run.");
    h.card("wary", h.composed("Tom's <cat> won't run.", { image: "wary.png", gloss: "careful", ipa: "ˈwɛr.i" }), { reps: 2 });
    const { code, stdout } = await h.run();
    assert.equal(code, 0);
    assert.match(stdout, /^kept 1 of 1 \(100%\)$/m);
    assert.doesNotMatch(stdout, /overridden/);
  } finally {
    await h.close();
  }
});

test("AC8: a Back that anki-sync wrote with a raw lone < and > counts as kept", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("wary", "He wrote 3 < 5 > 2 on the wall.");
    h.card("wary", h.composed("He wrote 3 < 5 > 2 on the wall."), { reps: 1 });
    const { code, stdout } = await h.run();
    assert.equal(code, 0);
    assert.match(stdout, /^kept 1 of 1 \(100%\)$/m);
  } finally {
    await h.close();
  }
});

test("AC8: a raw-Back card with a changed story is still overridden", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("wary", "Tom's <cat> won't run.");
    h.card("wary", h.composed("Tom's <dog> won't run."), { reps: 2 });
    const { code, stdout } = await h.run();
    assert.equal(code, 0);
    assert.match(stdout, /^kept 0 of 1 \(0%\)$/m);
  } finally {
    await h.close();
  }
});
