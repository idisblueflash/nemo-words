// US-040 unit coverage: the `judge-route` step (scripts/judge-route.js) —
// thresholds, Jev's question, unusable answers, and the pass-through of
// every route line that isn't `ambiguous`.

const test = require("node:test");
const assert = require("node:assert/strict");
const { verdictFor, routeQuestion, judgeRoute } = require("../scripts/judge-route");
const jev = require("../scripts/lib/jev");
const { createHarness, waryFixture } = require("./helpers/card-harness");

test("judge-route: p word-part >= 0.7 is word-part, <= 0.3 general, in between unsure (edges included)", () => {
  assert.equal(verdictFor(0), "general");
  assert.equal(verdictFor(0.3), "general");
  assert.equal(verdictFor(0.3001), "unsure");
  assert.equal(verdictFor(0.6999), "unsure");
  assert.equal(verdictFor(0.7), "word-part");
  assert.equal(verdictFor(1), "word-part");
});

test("judge-route: one Noul question carrying word-workflow.md's routing rule and one example each way", () => {
  const q = routeQuestion();
  assert.deepEqual(Object.keys(q), ["word_part"]);
  assert.equal(q.word_part.type, "noul");
  const text = q.word_part.instructions;
  assert.match(text, /classical Greek\/Latin morphemes or an INN drug stem/);
  assert.match(text, /morpheme structure/i);
  assert.match(text, /not (its )?domain/i);
  assert.match(text, /adjoining/);
  assert.match(text, /wary/);
});

// A fake fetch answering systemOne with `answer` for the word_part question.
const fakeJev = (answer) => ({
  config: { apiKey: "k", baseURL: "http://jev.invalid", model: "m", proxyEnv: {} },
  fetch: async (url, init) => {
    fakeJev.last = JSON.parse(init.body);
    return { ok: true, status: 200, text: async () => JSON.stringify({ answers: { word_part: answer } }) };
  },
});

test("judge-route: asks Jev about the word and its matched parts, and returns the verdict with its p", async () => {
  assert.deepEqual(await judgeRoute({ word: "wary", matchedParts: ["-ary"] }, fakeJev({ noul: 0.12 })), {
    verdict: "general",
    pWordPart: 0.12,
  });
  assert.deepEqual(fakeJev.last.state, { word: "wary", matchedParts: ["-ary"] });
});

for (const answer of [undefined, {}, { noul: "high" }, { noul: 1.5 }, { noul: -0.1 }]) {
  test(`judge-route: an unusable Jev answer (${JSON.stringify(answer)}) is a JevError`, async () => {
    await assert.rejects(judgeRoute({ word: "wary", matchedParts: ["-ary"] }, fakeJev(answer)), jev.JevError);
  });
}

for (const line of ["general", "general\tWear a careful face.\twear,careful"]) {
  test(`judge-route CLI: a non-ambiguous route line passes through unchanged with no Jev call (${JSON.stringify(line)})`, async () => {
    const h = await createHarness(waryFixture({ word_part: 0.9 }), { jev: "down" });
    try {
      const r = await h.runScript("judge-route.js", [h.writeFile("route.out", `${line}\n`), "wary"]);
      assert.deepEqual(r, { code: 0, stdout: `${line}\n`, stderr: "" });
    } finally {
      await h.cleanup();
    }
  });
}

test("judge-route CLI: an unusable Jev answer fails (exit 2) as the judgment service being unavailable", async () => {
  const h = await createHarness(waryFixture({ word_part: 7 }));
  try {
    const r = await h.runScript("judge-route.js", [h.writeFile("route.out", "ambiguous\t-ary\n"), "wary"]);
    assert.equal(r.code, 2);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /^routing failed: judgment service unavailable \(unusable Jev answer: .*\); re-run later\n$/);
  } finally {
    await h.cleanup();
  }
});
