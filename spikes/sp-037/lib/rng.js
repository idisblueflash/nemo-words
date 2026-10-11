"use strict";

// Seeded PRNG (mulberry32) + Fisher-Yates, so a fixed seed always gives the
// same sample and the same candidate order.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Derive a per-key seed (e.g. per word) from a base seed.
function seedFor(seed, key) {
  let h = seed >>> 0;
  for (const ch of String(key)) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return h;
}

function shuffle(items, rand) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = { mulberry32, seedFor, shuffle };
