// US-028 on EN-036's Dagu pipeline: the step CLIs that took over what the
// old in-process runner did between steps (dags/card.yaml):
//   check-stories  runs the hard gates over every candidate -> the checks file
//   story          the card's story: the auto-pick, or the logged story
//   report         the user-facing run report (the pipeline's last step)

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHarness, germaneFixture } = require("./helpers/card-harness");

const GERMANE_KEYWORDS = "dʒɚ\t-\t0\nmeɪn\tmain\t1.2800e-4\n";

test("check-stories CLI: one line per candidate, `-` when it passes, else its reasons comma-separated", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const kw = h.writeFile("kw.tsv", GERMANE_KEYWORDS);
    const candidates = h.writeFile(
      "candidates.tsv",
      "Germane points.\tmain\nThe main point stays relevant to the talk.\tmain,relevant\n"
    );
    const r = await h.runScript("check-stories.js", ["germane", "relevant", candidates, kw]);
    assert.deepEqual(r, {
      code: 0,
      stdout: "headword: germane,sense-missing: relevant,anchor-missing: main\n-\n",
      stderr: "",
    });
  } finally {
    await h.cleanup();
  }
});

test("story CLI: the auto-picked story when route found no logged story", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const route = h.writeFile("route.out", "general\n");
    const pick = h.writeFile("pick.out", "The main point stays relevant.\tmain,relevant\n");
    const r = await h.runScript("story.js", [route, pick]);
    assert.deepEqual(r, { code: 0, stdout: "The main point stays relevant.\tmain,relevant\tpicked\n", stderr: "" });
  } finally {
    await h.cleanup();
  }
});

test("story CLI: the logged story wins (pick-story was skipped, its log is empty)", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const route = h.writeFile("route.out", "general\tJermaine's main point stayed relevant.\tJermaine,main,relevant\n");
    const pick = h.writeFile("pick.out", "");
    const r = await h.runScript("story.js", [route, pick]);
    assert.deepEqual(r, {
      code: 0,
      stdout: "Jermaine's main point stayed relevant.\tJermaine,main,relevant\tlogged\n",
      stderr: "",
    });
  } finally {
    await h.cleanup();
  }
});

test("story CLI: a pick-story log that doesn't exist counts as no pick (Dagu leaves a skipped-by-dependency step's `${x.stdout}` unresolved)", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const route = h.writeFile("route.out", "general\tJermaine's main point stayed relevant.\tmain\n");
    const r = await h.runScript("story.js", [route, "${pick_story.stdout}"]);
    assert.deepEqual(r, { code: 0, stdout: "Jermaine's main point stayed relevant.\tmain\tlogged\n", stderr: "" });
  } finally {
    await h.cleanup();
  }
});

test("story CLI: with neither a pick nor a logged story it is an error (exit 2), never a stop", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const r = await h.runScript("story.js", [h.writeFile("route.out", "general\n"), h.writeFile("pick.out", "")]);
    assert.equal(r.code, 2);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /no story/);
  } finally {
    await h.cleanup();
  }
});

test("report CLI: prints the carded word, story, gloss and IPA, plus every step's stderr notes labelled by step", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const args = [
      h.writeFile("write-row.out", "added\tgermane\n"),
      h.writeFile("story.out", "The main point stays relevant.\tmain,relevant\tpicked\n"),
      h.writeFile("syllabify.out", "dʒɚ.ˈmeɪn\n"),
      h.writeFile("gloss.out", "relevant to the matter at hand\n"),
      h.writeFile("ipa.err", ""),
      h.writeFile("syllabify.20261011.221550.p1.err", "g2p-synthesized — verify\n"),
      `${h.tmp}/find_keywords.err`, // skipped step: no log at all
    ];
    const r = await h.runScript("report.js", args);
    assert.deepEqual(r, {
      code: 0,
      stdout: [
        "carded germane (added)",
        "story: The main point stays relevant.",
        "gloss: relevant to the matter at hand",
        "ipa:   dʒɚ.ˈmeɪn",
        "synced to Anki",
        "note: syllabify: g2p-synthesized — verify",
        "",
      ].join("\n"),
      stderr: "",
    });
  } finally {
    await h.cleanup();
  }
});

test("report CLI: marks a logged story as kept", async () => {
  const h = await createHarness(germaneFixture());
  try {
    const r = await h.runScript("report.js", [
      h.writeFile("write-row.out", "patched\tGermane\n"),
      h.writeFile("story.out", "Jermaine's main point.\tmain\tlogged\n"),
      h.writeFile("syllabify.out", "dʒɚ.ˈmeɪn\n"),
      h.writeFile("gloss.out", "relevant\n"),
    ]);
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /^carded Germane \(patched\)\nstory: Jermaine's main point\.  \(logged story, kept as picked\)\n/);
  } finally {
    await h.cleanup();
  }
});

for (const script of ["check-stories.js", "story.js", "report.js"]) {
  test(`${script}: a missing input file exits 2 (a crash is never a stop)`, async () => {
    const h = await createHarness(germaneFixture());
    try {
      const missing = `${h.tmp}/no-such-file`;
      const r = await h.runScript(script, ["germane", "relevant", missing, missing].slice(script === "check-stories.js" ? 0 : 2));
      assert.equal(r.code, 2, r.stdout);
      assert.equal(r.stdout, "");
    } finally {
      await h.cleanup();
    }
  });
}
