// SP-052 AC2 (lookup source): dictionaries/noad/extract.py reads an Apple
// dictionary Body.data (zlib-compressed XML entries in chunks) and writes the
// NOAD extract, one row per headword or derivative with its US IPA strings.
// The test builds a tiny Body.data by hand, so the real NOAD is never read.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { spawnSync } = require("node:child_process");
const { repoRoot } = require("./helpers/sp052-harness");

const EXTRACT = path.join(repoRoot, "dictionaries", "noad", "extract.py");
const NS = 'xmlns:d="http://www.apple.com/DTDs/DictionaryService-1.0.rng"';

const ipa = (s) => `<span d:prn="IPA" dialect="AmE" class="ph t_IPA">${s}<d:prn></d:prn></span>`;
const respell = (s) => `<span d:prn="US" dialect="AmE" class="ph t_respell">${s}<d:prn></d:prn></span>`;
const prx = (...parts) => `<span dialect="AmE" class="prx"> | ${parts.join("")} | </span>`;
const entry = (title, body, hom = "") =>
  `<d:entry ${NS} id="x" d:title="${title}" class="entry"><span class="hg x_xh0">` +
  `<span role="text"${hom ? ` homograph="${hom}"` : ""} class="hw">${title}</span>${body.head || ""}</span>` +
  `<span class="sg">${body.sg || ""}</span>${body.der || ""}</d:entry>`;

const ENTRIES = [
  entry("interest", { head: prx(respell("ˈint(ə)rəst"), ipa("ˈɪnt(ə)rəst"), respell("ˈinˌtrest"), ipa("ˈɪnˌtrɛst")) }),
  entry("lead", { head: prx(respell("lēd"), ipa("lid")) }, "1"),
  // POS-level pronunciation; the inflection's pronunciation (led) isn't the headword's
  entry("read", {
    sg:
      `<span class="se1 x_xd0"><span class="x_xdh"><span class="infg"><span class="inf">read </span>` +
      `<span class="pr">${respell("red")}${ipa("rɛd")}</span></span>${prx(respell("rēd"), ipa("rid"))}</span></span>`,
  }),
  entry("weary", {
    head: prx(respell("ˈwirē"), ipa("ˈwɪri")),
    der:
      `<span class="subEntryBlock x_xo0 t_derivatives"><span class="subEntry x_xo1"><span class="x_xoh">` +
      `<span role="text" class="l">weariless </span><span class="pr"> | ${respell("ˈwirēlis")}${ipa("ˈwɪrilɪs")} | </span></span></span>` +
      `<span class="subEntry x_xo1"><span class="x_xoh"><span role="text" class="l">wearily </span></span></span></span>`,
  }),
  entry("Xyst", { head: prx(respell("zist")) }),
];

// Apple Body.data: a 0x40-byte header, then at 0x40 the data length (from
// 0x40), then chunks from 0x60: [len][len-4][decompressed len][zlib …], each
// decompressed chunk being [len][xml] records.
function bodyData(entries) {
  const records = Buffer.concat(
    entries.map((xml) => {
      const b = Buffer.from(xml, "utf8");
      const len = Buffer.alloc(4);
      len.writeInt32LE(b.length);
      return Buffer.concat([len, b]);
    })
  );
  const z = zlib.deflateSync(records);
  const chunkHead = Buffer.alloc(12);
  chunkHead.writeInt32LE(z.length + 8, 0);
  chunkHead.writeInt32LE(z.length + 4, 4);
  chunkHead.writeInt32LE(records.length, 8);
  const chunk = Buffer.concat([chunkHead, z]);
  const head = Buffer.alloc(0x60);
  head.writeInt32LE(0x60 - 0x40 + chunk.length, 0x40);
  return Buffer.concat([head, chunk]);
}

test("SP-052 extract.py: headwords, homographs, POS-level IPA and derivatives become extract rows", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sp052-extract-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const body = path.join(dir, "Body.data");
  fs.writeFileSync(body, bodyData(ENTRIES));
  const out = path.join(dir, "data");

  const r = spawnSync("python3", [EXTRACT, "--body", body, "--out", out], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const rows = fs
    .readFileSync(path.join(out, "noad.tsv"), "utf8")
    .trim()
    .split("\n")
    .map((l) => l.split("\t"));
  const find = (w) => rows.filter((x) => x[0] === w);

  assert.deepEqual(find("interest"), [["interest", "hw", "", "ˈɪnt(ə)rəst;ˈɪnˌtrɛst", "1"]]);
  assert.deepEqual(find("lead"), [["lead", "hw", "1", "lid", "1"]]);
  assert.deepEqual(find("read"), [["read", "hw", "", "rid", "1"]]);
  assert.deepEqual(find("weariless"), [["weariless", "der", "", "ˈwɪrilɪs", "1"]]);
  assert.deepEqual(find("wearily"), [["wearily", "der", "", "", "0"]]);
  assert.deepEqual(find("Xyst"), [["Xyst", "hw", "", "", "1"]]);
});

test("SP-052 extract.py: a Body.data that isn't there exits 2 and says where it looked", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sp052-extract-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const r = spawnSync("python3", [EXTRACT, "--body", path.join(dir, "nope.data"), "--out", dir], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /nope\.data/);
});
