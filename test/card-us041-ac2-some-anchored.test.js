// US-041 AC2 — a word with some chunks anchored still gets its card.
//
// Given a word where some chunks have a keyword and others have none, when
// Flash runs the one-word command, then the card is made, logged and synced
// as before, and the log row's keyword lists only the anchored chunks.
//
// (A regression pin for US-041's no-anchor stop: one anchored chunk is
// enough; unanchored chunks are taught by the card's IPA line.)

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness } = require("./helpers/card-harness");

// "tomato" (tə.ˈmeɪ.toʊ): no common word sounds exactly /tə/; /meɪ/ is "may"
// and /toʊ/ is "toe".
function tomatoFixture() {
  return {
    dict: { tomato: "təmˈeɪtoʊ", may: "mˈeɪ", toe: "tˈoʊ", tow: "tˈoʊ" },
    freqs: { may: 8e-4, toe: 6e-6, tow: 1e-6 },
    claude: {
      define: JSON.stringify({
        primarySense: "fruit",
        definition: "a red, juicy fruit eaten as a vegetable",
        senses: ["fruit"],
      }),
      gloss: "a red, juicy fruit used like a vegetable",
      "compose-stories": JSON.stringify([
        { sentence: "May my toe kick the red fruit.", pivots: ["may", "toe", "fruit"] },
      ]),
    },
  };
}

test("US-041 AC2: card.js cards, logs and syncs a word with one unanchored chunk; the log keyword lists only the anchored chunks", async () => {
  const h = await createHarness(tomatoFixture());
  try {
    const run = await h.runCard("tomato");
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    assert.match(run.stdout, /^carded tomato \(added\)$/m);

    assert.match(h.readAnkiFile(), /^tomato\tMay my toe kick the red fruit\.\t\ttə\.ˈmeɪ\.toʊ\t/m);
    assert.equal(h.mock.calls.filter((c) => c.action === "addNote").length, 1);

    const log = h.readJsonl(h.mnemonicLog);
    assert.equal(log.length, 1);
    assert.equal(log[0].word, "tomato");
    assert.equal(log[0].sentence, "May my toe kick the red fruit.");
    assert.equal(log[0].keyword, "may / toe");
    assert.equal(log[0].picked_by, "auto");
    assert.equal(h.readJsonl(h.alternatesLog).length, 1);
  } finally {
    await h.cleanup();
  }
});
