// US-033 scenario 2: an auto-picked card whose story Flash changed in the Anki
// app, or replaced with a saved one, counts as overridden. The other side of
// that line is covered here too: what Anki's editor adds around an unchanged
// story (`&nbsp;`, `<div>`) is not a change.
//
// Runs the real scripts/kept-count.js against a mock AnkiConnect.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createKeptHarness } = require("./helpers/kept-count-harness");
const { cleanStory, autoPicks } = require("../scripts/kept-count");

const AUTO = "A wary hare eyes the snare with care.";

test("AC2: a story changed in the Anki app counts as overridden", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("wary", AUTO);
    h.card("wary", h.composed("A wary hare stares at the snare.", { gloss: "careful about danger", ipa: "ˈwɛɹ.i" }));
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 0, stderr);
    assert.match(stdout, /^kept 0 of 1 /m);
    assert.match(stdout, /^- wary\n\s+auto-picked: A wary hare eyes the snare with care\.\n\s+now: A wary hare stares at the snare\.$/m);
  } finally {
    await h.close();
  }
});

test("AC2: a one-letter typo fix is still an override", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("wary", "A wary hare eyes teh snare.");
    h.card("wary", h.composed("A wary hare eyes the snare."));
    const { stdout } = await h.run();
    assert.match(stdout, /^kept 0 of 1 /m);
    assert.match(stdout, /^- wary$/m);
  } finally {
    await h.close();
  }
});

test("AC2: a story replaced with a saved one (a later hand-picked log row) counts as overridden", async () => {
  const h = await createKeptHarness();
  try {
    const saved = "Wear a helmet, says the careful rider.";
    h.autoPick("wary", AUTO, { date: "2026-10-01" });
    // update-anki-story: a newer log row with no `picked_by: "auto"`, and the card now shows it
    h.log({ word: "wary", sentence: saved, date: "2026-10-05" });
    h.card("wary", h.composed(saved, { ipa: "ˈwɛɹ.i" }));
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 0, stderr);
    assert.match(stdout, /^kept 0 of 1 /m);
    assert.match(stdout, new RegExp(`^- wary\\n\\s+auto-picked: ${AUTO}\\n\\s+now: ${saved}$`, "m"));
  } finally {
    await h.close();
  }
});

test("AC2: a word auto-picked twice is one word, judged against its latest auto-pick", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("wary", "An older auto story.", { date: "2026-09-01" });
    h.autoPick("wary", AUTO, { date: "2026-10-01" });
    h.card("wary", h.composed(AUTO));
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 0, stderr);
    assert.match(stdout, /^kept 1 of 1 \(100%\)$/m);
  } finally {
    await h.close();
  }
});

test("AC2: what Anki's editor adds around an unchanged story is not an override", async () => {
  const h = await createKeptHarness();
  try {
    h.autoPick("wary", AUTO, { date: "2026-10-01" });
    h.autoPick("tom", "Tom & Jerry's cat says \"no\".", { date: "2026-10-02" });
    h.card(
      "wary",
      `<div><img src="nemo-wary.png"></div><div>A wary hare eyes the&nbsp;snare with care.&nbsp;</div>` +
        `<div><small style="opacity:0.75"><i>careful</i></small><br><small style="opacity:0.6">/ˈwɛɹ.i/</small></div>`
    );
    h.card("tom", "Tom &amp; Jerry's cat says &quot;no&quot;.<br><small style=\"opacity:0.6\">/tɑm/</small>");
    const { code, stdout, stderr } = await h.run();
    assert.equal(code, 0, stderr);
    assert.match(stdout, /^kept 2 of 2 \(100%\)$/m);
  } finally {
    await h.close();
  }
});

test("cleanStory: drops the image, gloss and IPA pieces composeBack adds", () => {
  const back =
    '<img src="nemo-trial.png"><br>The court tried a dull case.<br>' +
    '<small style="opacity:0.75"><i>a formal court hearing</i></small><br><small style="opacity:0.6">/ˈtraɪəl/</small>';
  assert.equal(cleanStory(back), "The court tried a dull case.");
  assert.equal(cleanStory("The court tried a dull case."), "The court tried a dull case.");
});

test("cleanStory: decodes entities, strips editor tags, trims and collapses whitespace", () => {
  assert.equal(cleanStory("  A&nbsp;&nbsp;hare \n eyes   it. "), "A hare eyes it.");
  assert.equal(cleanStory("<div>A hare</div><div>eyes it.</div>"), "A hare eyes it.");
  assert.equal(cleanStory("A <b>hare</b> eyes it.<br/>"), "A hare eyes it.");
  assert.equal(cleanStory("a &lt; b &gt; c &amp; d &#39;e&#x27; &apos;f&apos;"), "a < b > c & d 'e' 'f'");
  assert.equal(cleanStory("story<BR><IMG src='x.png'>"), "story");
  assert.equal(cleanStory("<img src=\"nemo-x.png\">story on the same line"), "story on the same line");
  assert.equal(cleanStory(""), "");
  assert.equal(cleanStory(undefined), "");
});

test("autoPicks: only `picked_by: auto` rows, the latest row per word, newest first", () => {
  const rows = [
    { word: "a", sentence: "a1", date: "2026-10-01", picked_by: "auto" },
    { word: "b", sentence: "b1", date: "2026-10-03", picked_by: "auto" },
    { word: "c", sentence: "c1", date: "2026-10-02" },
    { word: "d", sentence: "d1", date: "2026-10-02", picked_by: "flash" },
    { word: "a", sentence: "a2", date: "2026-10-02", picked_by: "auto" },
    { word: "e", sentence: "e1", date: "2026-10-02", picked_by: "auto" },
  ];
  assert.deepEqual(
    autoPicks(rows).map((p) => [p.word, p.sentence, p.date]),
    // same date: the later log row is the newer auto-pick
    [["b", "b1", "2026-10-03"], ["e", "e1", "2026-10-02"], ["a", "a2", "2026-10-02"]]
  );
});
