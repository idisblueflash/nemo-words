// US-050 AC6 — only /ɪ ɛ æ ʌ ʊ/ close the stressed chunk.
//
// Given a word whose stressed syllable does not end in /ɪ ɛ æ ʌ ʊ/ (paper
// /ˈpeɪ.pɚ/: "pay"; cottage /ˈkɑ.tədʒ/: "ka"), when the anchors are found,
// then every chunk has the same result as before this story.

const test = require("node:test");
const assert = require("node:assert/strict");
const { soundFixture, findKeywordsOn } = require("./helpers/us050-fixtures");

// Each fixture holds a frequent word for the stressed chunk plus the next
// consonant ("payp" is made up; "cot"), which a wider vowel set would pick.
const CASES = [
  {
    name: "paper: /peɪ/ ends in a diphthong, so it stays 'pay' and /peɪp/ is not tried",
    fixture: soundFixture({ paper: "pˈeɪpɚ", pay: "pˈeɪ", payp: "pˈeɪp", per: "pˈɚ" }, { paper: 2e-4, pay: 1e-4, payp: 3e-4, per: 4e-4 }),
    args: ["ˈpeɪ.pɚ", "paper"],
    stdout: "peɪ\tpay\t1.0000e-4\npɚ\tper\t4.0000e-4\n",
  },
  {
    name: "cottage: /kɑ/ ends in /ɑ/, so it stays 'ka' and /kɑt/ 'cot' is not tried",
    fixture: soundFixture({ cottage: "kˈɑtədʒ", ka: "kˈɑ", cot: "kˈɑt" }, { cottage: 1e-5, ka: 2e-6, cot: 3e-6 }),
    args: ["ˈkɑ.tədʒ", "cottage"],
    stdout: "kɑ\tka\t2.0000e-6\ntədʒ\t-\n",
  },
  {
    name: "a stressed /ɔ/ before a consonant does not close either (/lɔ/ stays 'law', not /lɔn/ 'lawn')",
    fixture: soundFixture({ laundry: "lˈɔndɹi", law: "lˈɔ", lawn: "lˈɔn" }, { laundry: 8e-6, law: 3e-4, lawn: 9e-6 }),
    args: ["ˈlɔ.ndɹi", "laundry"],
    stdout: "lɔ\tlaw\t3.0000e-4\nndɹi\t-\n",
  },
];

for (const c of CASES) {
  test(`US-050 AC6: find-keywords — ${c.name}`, async () => {
    const r = await findKeywordsOn(c.fixture, ...c.args);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.stdout, c.stdout);
  });
}
