// US-040 AC6 — the routing accuracy check (mock Jev).
//
// Given a labelled set of words: the US-028 QA misses (ibuprofen, ketoprofen,
// naproxen, conduct as word-part; trial, pathway, period, roster, episode,
// recurrent, adherence, substance, premise, trivial, exotic, apparently,
// apprenticeship as general), every whole-word row in the card file as
// general, and every example word on the card file's word-part rows as
// word-part, when Flash runs the routing accuracy check, then each word is put
// to Jev with the same question judge-route asks, and its p word-part is
// recorded; and the report shows, for each label, how many words the 0.3 / 0.7
// cut-offs route right, route wrong and leave unsure; and it lists every
// misrouted word with its p, and every word left out because it carries both
// labels.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHarness } = require("./helpers/card-harness");
const { routeQuestion } = require("../scripts/judge-route");

const MISSES_WORD_PART = ["ibuprofen", "ketoprofen", "naproxen", "conduct"];
const MISSES_GENERAL = [
  "trial", "pathway", "period", "roster", "episode", "recurrent", "adherence",
  "substance", "premise", "trivial", "exotic", "apparently", "apprenticeship",
];

const WORD_PART_ROW = [
  "ad-",
  '🎭 A sentence.<hr><i>Latin</i><br>to, toward<br><span class="examples">e.g. adjoining, adhere, premise</span>',
  "", "", "", "00 Reading Room::01 Medical Terms", "medical-word-parts",
].join("\t");

test("US-040 AC6: route-accuracy.js asks Jev judge-route's question per labelled word and reports right / wrong / unsure per label", async () => {
  const h = await createHarness(
    {
      // Unlisted words get 0.1 (general).
      jevByWord: { trial: 0.8, ibuprofen: 0.2, ketoprofen: 0.95, naproxen: 0.7, conduct: 0.55, adjoining: 0.9, adhere: 0.5 },
    },
    { rows: ["wary\tThe weary hiker stays careful near the cliff.", WORD_PART_ROW] }
  );
  try {
    const reportPath = `${h.tmp}/report.md`;
    const run = await h.runScript("route-accuracy.js", [reportPath]);
    assert.equal(run.code, 0, `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    const report = fs.readFileSync(reportPath, "utf8");

    // Each labelled word (premise carries both labels, so it's left out; the
    // word-part Front `ad-` is not a word) is put to Jev once, with judge-route's question.
    const general = ["wary", ...MISSES_GENERAL.filter((w) => w !== "premise")];
    const wordPart = [...MISSES_WORD_PART, "adjoining", "adhere"];
    const asked = h.jev.calls.map((c) => c.body.state.word).sort();
    assert.deepEqual(asked, [...general, ...wordPart].sort());
    for (const c of h.jev.calls) assert.deepEqual(c.body.questions, routeQuestion());
    assert.deepEqual(h.jev.calls.find((c) => c.body.state.word === "wary").body.state.matchedParts, ["-ary"]);

    // Its p word-part is recorded, per word.
    assert.match(report, /^\| adjoining \| word-part \| 0\.9 \| word-part \|/m);
    assert.match(report, /^\| wary \| general \| 0\.1 \| general \|/m);

    // Per label: judged, routed right, routed wrong, unsure at 0.3 / 0.7.
    assert.match(report, /^\| general \| 13 \| 12 \| 1 \| 0 \|$/m);
    assert.match(report, /^\| word-part \| 6 \| 3 \| 1 \| 2 \|$/m);

    // Every misrouted word with its p.
    const misrouted = section(report, "Misrouted");
    assert.match(misrouted, /^\| trial \| general \| 0\.8 \| word-part \|/m);
    assert.match(misrouted, /^\| ibuprofen \| word-part \| 0\.2 \| general \|/m);
    assert.equal((misrouted.match(/^\| [a-z]+ \|/gm) || []).length, 2);

    // Every word left out because it carries both labels.
    assert.match(section(report, "Left out"), /^- premise$/m);
  } finally {
    await h.cleanup();
  }
});

// The text of the `## <title>…` section, up to the next `## `.
function section(md, title) {
  const at = md.indexOf(`\n## ${title}`);
  assert.notEqual(at, -1, `no "## ${title}" section in:\n${md}`);
  const rest = md.slice(at + 1);
  const end = rest.indexOf("\n## ", 1);
  return end === -1 ? rest : rest.slice(0, end);
}
