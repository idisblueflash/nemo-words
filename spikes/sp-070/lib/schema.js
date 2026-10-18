"use strict";

// SP-070: SP-069's schema, with the marks from SP-070's caption step
// (visible / part only / hidden).
// SP-069: the JSON schema for a local model's caption. LM Studio takes it as
// response_format json_schema and lets the model write only JSON that fits it,
// so the fixed values (marks, sizes, places, what an onlooker does, views) come
// from their lists and the action line can't be empty. It follows SP-066's
// caption prompt; the must-see keys are the item names as the model sees them.

const { itemNames, SHOTS, STEPS, STATUSES, SIZES, PLACES, VIEWS, ONLOOKER_DOES } = require("./caption");
const { maskName, describeBareName } = require("../../sp-066/lib/headword");

const shown = (name, word) => (word ? describeBareName(word, name) || maskName(word, name) : name);
const str = { type: "string" };
const oneOf = (values) => ({ type: "string", enum: values });
const orNull = (values) => ({ type: ["string", "null"], enum: [...values, null] });
const obj = (properties) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });

function captionSchema(items, word, mainSubject = null) {
  const mustSee = Object.fromEntries(itemNames(items).map((n) => [shown(n, word), obj({ mark: oneOf(STATUSES), size: orNull(SIZES), place: orNull(PLACES) })]));
  const properties = {
    objects: { type: "array", items: obj({ name: str, adjectives: { type: "array", items: str } }) },
    shot: oneOf(SHOTS),
    angle: str,
    step: oneOf(STEPS),
    extras: obj({ floor: { type: "boolean" }, background: str, morePeople: { type: "boolean" }, readableText: str }),
    action: { type: "string", minLength: 1 },
    mustSee: obj(mustSee),
    drawingErrors: { type: "array", items: obj({ object: str, mustSee: { type: "boolean" }, note: str }) },
    onlookers: { type: "array", items: obj({ who: str, does: oneOf(ONLOOKER_DOES), view: oneOf(VIEWS) }) },
  };
  if (mainSubject) properties.mainView = orNull(VIEWS);
  return { name: "caption", strict: true, schema: obj(properties) };
}

module.exports = { captionSchema };
