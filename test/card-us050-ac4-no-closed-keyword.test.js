// US-050 AC4 — no usable word for the closed chunk: today's result stays.
//
// Given a word whose stressed syllable ends in a short vowel, where the
// syllable plus the next consonant is no common word (levee: /lɛv/), or only a
// word of 1–2 letters or a function word (aloe: /æl/ is "al"; dozen: /dʌz/ is
// "does"), when the anchors are found, then the stressed chunk has the same
// result as before this story (levee: the rhyme "ye"; aloe: the rhyme "yeah").

const test = require("node:test");
const assert = require("node:assert/strict");
const { soundFixture, eraFixture, findKeywordsOn } = require("./helpers/us050-fixtures");

const CASES = [
  {
    name: "levee: /lɛv/ is only a too-rare word, so the rhyme 'ye' stays",
    fixture: soundFixture({ levee: "lˈɛvi", lev: "lˈɛv", ye: "jˈɛ" }, { levee: 2e-6, lev: 1e-8, ye: 9e-6 }),
    args: ["ˈlɛ.vi", "levee"],
    stdout: "lɛ\tye\t9.0000e-6\trime\nvi\t-\n",
  },
  {
    name: "aloe: /æl/ is only the 2-letter 'al', so the rhyme 'yeah' stays",
    fixture: soundFixture({ aloe: "ˈæloʊ", al: "ˈæl", yeah: "jˈæ", low: "lˈoʊ" }, { aloe: 3e-6, al: 2e-5, yeah: 3e-5, low: 2e-4 }),
    args: ["ˈæ.loʊ", "aloe"],
    stdout: "æ\tyeah\t3.0000e-5\trime\nloʊ\tlow\t2.0000e-4\n",
  },
  {
    name: "dozen: /dʌz/ is only the function word 'does', so the rhyme 'huh' stays",
    fixture: soundFixture({ dozen: "dˈʌzən", does: "dˈʌz", huh: "hˈʌ" }, { dozen: 2e-5, does: 5e-4, huh: 5e-6 }),
    args: ["ˈdʌ.zən", "dozen"],
    stdout: "dʌ\thuh\t5.0000e-6\trime\nzən\t-\n",
  },
];

for (const c of CASES) {
  test(`US-050 AC4: find-keywords — ${c.name}`, async () => {
    const r = await findKeywordsOn(c.fixture, ...c.args);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, c.stdout);
  });
}

test("US-050 AC4: with no closed keyword, the open chunk's exact keyword stays (era without 'air': 'eh')", async () => {
  const fx = eraFixture();
  delete fx.dict.air;
  fx.dict.er = "ˈɛɹ"; // 2 letters: not a closed keyword
  fx.freqs.er = 3e-5;
  const r = await findKeywordsOn(fx, "ˈɛ.ɹə", "era");
  assert.equal(r.stdout, "ɛ\teh\t4.0000e-6\nɹə\t-\n");
});

test("US-050 edge case: the most frequent candidate is a function word, a less frequent one passes and is the keyword", async () => {
  // "duzz" is a made-up word that sounds exactly /dʌz/
  const fx = soundFixture({ dozen: "dˈʌzən", does: "dˈʌz", duzz: "dˈʌz", huh: "hˈʌ" }, { dozen: 2e-5, does: 5e-4, duzz: 1e-6, huh: 5e-6 });
  const r = await findKeywordsOn(fx, "ˈdʌ.zən", "dozen");
  assert.equal(r.stdout, "dʌz\tduzz\t1.0000e-6\nzən\t-\n");
});
