"use strict";

// SP-066 AC1 (after stage 20, ADR-0039) — a group that only reacts to the
// action (a crowd that the bells attract) is not the main subject; when an
// object does the action and a person works it (bells that ring), the main
// subject is that person, the actor. The must-see call decides this from the
// prompt's rule (code can't tell who acts), so the test checks the rule is in
// the prompt.

const test = require("node:test");
const assert = require("node:assert/strict");

const { prompt } = require("../lib/must-see");

test("AC1 (ADR-0039): the must-see prompt says that a group that only reacts is an onlooker, not the main subject", () => {
  const p = prompt("A peal of bells attracts a curious crowd.");
  assert.match(p, /only reacts to the action \(a crowd that the bells attract, people who watch\) is not the main subject either: it is an onlooker/);
});

test("AC1 (ADR-0039): the must-see prompt makes the person who works the thing the actor (bells that peal: a person rings them)", () => {
  const p = prompt("A peal of bells attracts a curious crowd.");
  assert.match(p, /done by a thing that a person works by hand \(bells that peal: a person rings them\): the main subject is that person, the actor \("person who rings the bells"\)/);
});

