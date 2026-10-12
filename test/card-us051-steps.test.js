// US-051 — unit tests for the retention experiment's step pieces
// (draw-arm, story's control branch, write-row's arm columns, report's arm line).

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { resolveStory } = require("../scripts/story");
const { writeRow, CONTROL_DECK } = require("../scripts/write-row");
const { TERMS_HEADER } = require("./helpers/card-harness");

const DEFINE = "relevant\nrelevant and fitting to the subject\nrelevant,pertinent\n";

function tmpCardFile(rows) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "us051-"));
  const file = path.join(dir, "terms.txt");
  fs.writeFileSync(file, [...TERMS_HEADER, ...rows].join("\n") + "\n");
  return file;
}
const dataRows = (file) => fs.readFileSync(file, "utf8").split("\n").filter((l) => l && !l.startsWith("#"));

test("story: the control arm's back is define's definition sentence, source `control`", () => {
  assert.equal(resolveStory("general\n", "", "control\n", DEFINE), "relevant and fitting to the subject\t\tcontrol");
});

test("story: the story arm still takes pick-story's story", () => {
  assert.equal(resolveStory("general\n", "A story.\tmain\n", "story\n", DEFINE), "A story.\tmain\tpicked");
});

test("story: a control arm with no definition sentence is an error, never an empty card", () => {
  assert.throws(() => resolveStory("general\n", "", "control\n", "relevant\n"), /no definition/);
});

test("write-row: a control row is appended with the control deck and tag", () => {
  const file = tmpCardFile([]);
  writeRow(file, { word: "germane", story: "def.", ipa: "x", gloss: "g", source: "control" });
  assert.deepEqual(dataRows(file), [`germane\tdef.\t\tx\tg\t${CONTROL_DECK}\tretention-control`]);
});

test("write-row: a listed row with an empty Back gets the control deck and tag, overwriting its Deck/Tags, and no image", () => {
  const file = tmpCardFile(["Germane\t\tgermane.png\t\t\tSome Deck\tsome-tag"]);
  const r = writeRow(file, { word: "germane", story: "def.", ipa: "x", gloss: "g", source: "control" });
  assert.equal(r.status, "patched");
  assert.deepEqual(dataRows(file), [`Germane\tdef.\t\tx\tg\t${CONTROL_DECK}\tretention-control`]);
});

const { drawArm } = require("../scripts/draw-arm");

test("draw-arm: NEMO_ARM forces the arm", () => {
  assert.equal(drawArm({ forced: "control", random: () => 0.9 }), "control");
  assert.equal(drawArm({ forced: "story", random: () => 0.1 }), "story");
});

test("draw-arm: any other NEMO_ARM value is an error", () => {
  assert.throws(() => drawArm({ forced: "Control" }), /NEMO_ARM must be control or story/);
});

test("draw-arm: an empty experiment (0/0) is a plain 50/50 draw", () => {
  assert.equal(drawArm({ counts: { control: 0, story: 0 }, random: () => 0.1 }), "control");
  assert.equal(drawArm({ counts: { control: 0, story: 0 }, random: () => 0.7 }), "story");
});

const { countArms } = require("../scripts/draw-arm");

test("draw-arm: a gap of 3 or more sends the word to the arm with fewer cards, whatever the chance", () => {
  for (const random of [() => 0, () => 0.99]) {
    assert.equal(drawArm({ counts: { control: 3, story: 0 }, random }), "story");
    assert.equal(drawArm({ counts: { control: 10, story: 14 }, random }), "control");
  }
});

test("draw-arm: a gap under 3 is still a chance draw", () => {
  assert.equal(drawArm({ counts: { control: 2, story: 0 }, random: () => 0.1 }), "control");
  assert.equal(drawArm({ counts: { control: 0, story: 2 }, random: () => 0.9 }), "story");
});

test("draw-arm: NEMO_ARM wins over the cap", () => {
  assert.equal(drawArm({ forced: "control", counts: { control: 5, story: 0 } }), "control");
});

test("draw-arm: counts only rows tagged retention-control / retention-story that have a Back", () => {
  const text = [
    ...TERMS_HEADER,
    "a\tdef\t\t\t\tD\tretention-control",
    "b\tdef\t\t\t\tD\tother retention-control",
    "c\t\t\t\t\tD\tretention-control", // listed, not carded
    "d\tstory\t\t\t\t\treading-room-terms retention-story",
    "e\tstory\t\t\t", // no arm tag (logged / hand-made)
    "f\tretention-control mentioned in a Back\t\t\t", // a tag only counts in the Tags column
  ].join("\n");
  assert.deepEqual(countArms(text), { control: 2, story: 1 });
});

test("write-row: a picked (story-arm) row repeats the #tags header and adds retention-story", () => {
  const file = tmpCardFile([]);
  writeRow(file, { word: "germane", story: "A story.", ipa: "x", gloss: "g", source: "picked" });
  assert.deepEqual(dataRows(file), ["germane\tA story.\t\tx\tg\t\treading-room-terms retention-story"]);
});

test("write-row: a picked story patching a listed row keeps its Image and Deck and adds the story tag to its own tags", () => {
  const file = tmpCardFile(["germane\t\tgermane.png\t\t\tSome Deck\tsome-tag"]);
  writeRow(file, { word: "germane", story: "A story.", ipa: "x", gloss: "g", source: "picked" });
  assert.deepEqual(dataRows(file), ["germane\tA story.\tgermane.png\tx\tg\tSome Deck\tsome-tag retention-story"]);
});

test("write-row: a logged story gets no arm columns", () => {
  const file = tmpCardFile([]);
  writeRow(file, { word: "germane", story: "A story.", ipa: "x", gloss: "g", source: "logged" });
  assert.deepEqual(dataRows(file), ["germane\tA story.\t\tx\tg"]);
});
