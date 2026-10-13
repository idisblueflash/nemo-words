// US-050 AC2 — the next chunk keeps the consonant the closed chunk takes
// (ADR-0025).
//
// Given a word whose stressed chunk takes the next consonant (elastic
// /ɪ.ˈlæ.stɪk/: /læs/ is "last"), when the anchors are found, then the next
// chunk is still /stɪk/ and its keyword is still "stick"; and every chunk
// other than the stressed chunk has the same result as before this story.

const test = require("node:test");
const assert = require("node:assert/strict");
const { elasticFixture, findKeywordsOn } = require("./helpers/us050-fixtures");

test("US-050 AC2: find-keywords closes elastic's stressed chunk to /læs/ 'last' and leaves /ɪ/ and /stɪk/ 'stick' as they were", async () => {
  const r = await findKeywordsOn(elasticFixture(), "ɪ.ˈlæ.stɪk", "elastic");
  assert.equal(r.code, 0, r.stderr);
  const lines = r.stdout.split("\n");
  // before this story: `ɪ\t-`, `læ\tyeah\t3.0000e-5\trime`, `stɪk\tstick\t3.0000e-5`
  assert.equal(lines.length, 4, "three keyword lines, same number and order as the chunks");
  assert.equal(lines[0], "ɪ\t-");
  assert.equal(lines[1], "læs\tlast\t4.0000e-4");
  assert.equal(lines[2], "stɪk\tstick\t3.0000e-5");
});
