#!/usr/bin/env node
'use strict';
// AI labels for the image-pick gold set, and their agreement with Flash's labels.
//
//   node scripts/gold-image-pick-ai.js label [--models sonnet,qwen] [--grids G001,G002] [--cells | --two-step]
//   node scripts/gold-image-pick-ai.js score [--guidelines v3 | v3-cells]
//
// Each model sees the whole 3×3 grid, the story sentence and guidelines.md, and gives
// each of the 9 cells one mark (best | ok | weak | wrong) with a note, plus a reason —
// the same task Flash does on the labeling page. Answers are cached per model in
// data/gold/image-pick/ai/labels.<model>.<guidelines version>.json, so a re-run only asks
// for the missing grids, and a new guidelines version starts a new file.
// The callers are SP-069's (claude -p with the Read tool; LM Studio over curl).
// With --cells the model gets the 9 cells as 9 separate images, each cropped and scaled
// up 2× (in the whole grid a cell is only ~418px), cached as labels.<model>.<v>-cells.json.
// With --two-step each cell is checked alone first (ok | weak | wrong), and then one call
// compares only the ok cells and picks the best: labels.<model>.<v>-two-step.json.
// With --captions each cell gets a caption alone first, and then the whole-grid label
// uses the 9 captions to adjust its marks: labels.<model>.<v>-captions.json.
// With --describe (Qwen only) Qwen describes each cell in plain text, and Jev checks
// each description against the rules: labels.qwen.<v>-describe.json.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, execFile } = require('node:child_process');
const { claudeVision, localVision } = require('../spikes/sp-069/lib/models');
const { MARKS, agreement } = require('./lib/gold-image-pick');
const jev = require('./lib/jev');

const ROOT = path.join(__dirname, '..');
const DIR = process.env.GOLD_DIR || path.join(ROOT, 'data', 'gold', 'image-pick');
const AI_DIR = path.join(DIR, 'ai');
const MODELS = { sonnet: 'sonnet', qwen: 'qwen/qwen3-vl-8b' };

const readJson = (f, empty) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : empty);
// The guidelines version, e.g. "v3" from the title "... (v3)".
const guideVersion = () => (/\((v\d+)\)/.exec(fs.readFileSync(path.join(DIR, 'guidelines.md'), 'utf8')) || [])[1] || 'v0';
const aiFile = (name, v = guideVersion()) => path.join(AI_DIR, `labels.${name}.${v}.json`);
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? null : process.argv[i + 1];
};

function imageDir() {
  if (process.env.GOLD_IMG_DIR) return process.env.GOLD_IMG_DIR;
  const own = path.join(ROOT, 'images', 'mnemonic');
  if (fs.existsSync(own) && fs.readdirSync(own).some((f) => f.endsWith('.grid.png'))) return own;
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: ROOT, encoding: 'utf8' }).trim();
  return path.join(path.dirname(common), 'images', 'mnemonic');
}

const LOOK = {
  grid: `Use the Read tool to look at the image file picture.png in the current folder.

It is a 3×3 grid of nine candidate cells for one story sentence. The cells are numbered 1 to 9: left to right, top to bottom (1 2 3 on the top row, 7 8 9 on the bottom row).`,
  cells: `Use the Read tool to look at the nine image files cell1.png to cell9.png in the current folder. Read all nine.

They are nine candidate cells for one story sentence; cellN.png is cell N.`,
  local: 'Look at the nine attached pictures. They are nine candidate cells for one story sentence, in order: the first picture is cell 1, the ninth is cell 9.',
};

function prompt(g, look = LOOK.grid) {
  const guide = fs.readFileSync(path.join(DIR, 'guidelines.md'), 'utf8');
  return `${look}

Story sentence: "${g.story}"

Label the grid with these guidelines:

<guidelines>
${guide}
</guidelines>

Answer with JSON only, in this shape:
{"cells": {"1": {"mark": "best|ok|weak|wrong", "note": "short reason"}, ... "9": {...}}, "reason": "why the best cell wins over the next one"}
Give all 9 cells a mark. Use exactly 1 "best", unless every cell is "weak" or "wrong".`;
}

const schema = {
  name: 'grid_label',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['cells', 'reason'],
    properties: {
      cells: {
        type: 'object',
        additionalProperties: false,
        required: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
        properties: Object.fromEntries(
          ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((c) => [
            c,
            { type: 'object', additionalProperties: false, required: ['mark', 'note'], properties: { mark: { type: 'string', enum: MARKS }, note: { type: 'string' } } },
          ]),
        ),
      },
      reason: { type: 'string' },
    },
  },
};

// Crops the 9 cells of a grid into dir as cell1.png … cell9.png, scaled up 2×.
function cropCells(grid, dir) {
  const [w, h] = execFileSync('magick', ['identify', '-format', '%w %h', `${grid}[0]`], { encoding: 'utf8' }).split(' ').map(Number);
  const cw = Math.floor(w / 3);
  const ch = Math.floor(h / 3);
  for (let i = 0; i < 9; i++) {
    const geo = `${cw}x${ch}+${(i % 3) * cw}+${Math.floor(i / 3) * ch}`;
    execFileSync('magick', [`${grid}[0]`, '-crop', geo, '+repage', '-resize', '200%', path.join(dir, `cell${i + 1}.png`)]);
  }
}

const runFile = (bin, args, opts) =>
  new Promise((resolve) => {
    const child = execFile(bin, args, { maxBuffer: 64 << 20, ...opts }, (err, stdout, stderr) => resolve({ err, stdout: String(stdout), stderr: String(stderr) }));
    child.stdin.end();
  });

// The same two callers as SP-069's, with some cell images (cellN.png in dir) in place
// of one picture. `look` holds the prompt's first part for each caller.
async function askImages(name, model, look, rest, dir, cells, schemaFor) {
  const files = cells.map((c) => (typeof c === 'number' ? `cell${c}.png` : c));
  const t0 = Date.now();
  if (name !== 'qwen') {
    const { err, stdout, stderr } = await runFile(process.env.SP069_CLAUDE_BIN || 'claude', ['-p', `${look.claude}\n\n${rest}`, '--model', model, '--tools', 'Read', '--allowedTools', 'Read', '--output-format', 'json'], { cwd: dir, timeout: 600000 });
    let j = null;
    try {
      j = JSON.parse(stdout);
    } catch {}
    if (err || !j || j.is_error) throw new Error(`claude ${model} failed: ${String(j ? j.result : stdout).slice(0, 200)} ${stderr.slice(0, 200)}`);
    return { text: String(j.result), ms: Date.now() - t0, costUsd: j.total_cost_usd ?? 0 };
  }
  const images = files.map((f) => ({ type: 'image_url', image_url: { url: `data:image/png;base64,${fs.readFileSync(path.join(dir, f)).toString('base64')}` } }));
  const body = { model, temperature: 0, max_tokens: 4000, ...(schemaFor ? { response_format: { type: 'json_schema', json_schema: schemaFor } } : {}), messages: [{ role: 'user', content: [{ type: 'text', text: `${look.local}\n\n${rest}` }, ...images] }] };
  fs.writeFileSync(path.join(dir, 'body.json'), JSON.stringify(body));
  const url = process.env.SP069_LMSTUDIO_URL || 'http://SMTVs-Mac-mini-2.local:1234/v1/chat/completions';
  const { err, stdout } = await runFile('curl', ['-s', '-m', '900', '-H', 'Content-Type: application/json', '--data', '@body.json', '-w', '\n%{http_code}', url], { cwd: dir });
  const nl = stdout.lastIndexOf('\n');
  const code = stdout.slice(nl + 1).trim();
  if (err || code !== '200') throw new Error(`${model} failed: ${err ? err.message : `HTTP ${code}: ${stdout.slice(0, 200)}`}`);
  return { text: JSON.parse(stdout.slice(0, nl)).choices[0].message.content, ms: Date.now() - t0, costUsd: 0 };
}

function withCells(grid, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gold-cells-'));
  cropCells(grid, dir);
  return fn(dir).finally(() => fs.rmSync(dir, { recursive: true, force: true }));
}

const jsonOf = (text) => {
  const s = String(text);
  return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
};

// --cells: the 9 cells in one call.
function cellsVision(name, model) {
  return (g, grid) =>
    withCells(grid, async (dir) => {
      const r = await askImages(name, model, { claude: LOOK.cells, local: LOOK.local }, prompt(g, '').trim(), dir, [1, 2, 3, 4, 5, 6, 7, 8, 9], schema);
      return { ...parse(r.text), ms: r.ms, costUsd: r.costUsd };
    });
}

// --two-step: step 1 checks each cell alone (ok | weak | wrong); step 2 compares only
// the ok cells and picks the best. With 1 ok cell it is the best; with 0, no best.
const guide = () => fs.readFileSync(path.join(DIR, 'guidelines.md'), 'utf8');
const checkSchema = {
  name: 'cell_check',
  strict: true,
  schema: { type: 'object', additionalProperties: false, required: ['mark', 'note'], properties: { mark: { type: 'string', enum: ['ok', 'weak', 'wrong'] }, note: { type: 'string' } } },
};
const pickSchema = (ok) => ({
  name: 'cell_pick',
  strict: true,
  schema: { type: 'object', additionalProperties: false, required: ['best', 'reason'], properties: { best: { type: 'integer', enum: ok }, reason: { type: 'string' } } },
});

function twoStepVision(name, model) {
  return (g, grid) =>
    withCells(grid, async (dir) => {
      let ms = 0;
      let costUsd = 0;
      const cells = {};
      const notes = {};
      const check = async (c) => {
        const look = { claude: `Use the Read tool to look at the image file cell${c}.png in the current folder.`, local: 'Look at the attached picture.' };
        const rest = `It is cell ${c} of nine candidate cells for one story sentence.

Story sentence: "${g.story}"

Check this one cell with these guidelines:

<guidelines>
${guide()}
</guidelines>

Do not pick a best cell now: a later step compares the cells that pass. Mark the cell "ok" if you would accept it for the card, else "weak" or "wrong".
Answer with JSON only, in this shape:
{"mark": "ok|weak|wrong", "note": "short reason"}`;
        const r = await askImages(name, model, look, rest, dir, [c], checkSchema);
        const j = jsonOf(r.text);
        const mark = String(j.mark || '').toLowerCase().trim();
        if (!['ok', 'weak', 'wrong'].includes(mark)) throw new Error(`cell ${c}: unknown mark "${j.mark}"`);
        cells[c] = mark;
        if (j.note) notes[c] = String(j.note);
        ms += r.ms;
        costUsd += r.costUsd || 0;
      };
      const all = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      if (name === 'qwen') for (const c of all) await check(c); // LM Studio: one request at a time
      else for (let i = 0; i < 9; i += 3) await Promise.all(all.slice(i, i + 3).map(check));
      const ok = all.filter((c) => cells[c] === 'ok');
      let reason = 'no cell passed the check';
      if (ok.length === 1) {
        cells[ok[0]] = 'best';
        reason = 'the only cell that passed the check';
      } else if (ok.length > 1) {
        const look = {
          claude: `Use the Read tool to look at the image files ${ok.map((c) => `cell${c}.png`).join(', ')} in the current folder. Read all of them.`,
          local: `Look at the ${ok.length} attached pictures. In order, they are cells ${ok.join(', ')}.`,
        };
        const rest = `They are the candidate cells for one story sentence that passed a first check. cellN.png is cell N.

Story sentence: "${g.story}"

Notes from the first check:
${ok.map((c) => `- cell ${c}: ${notes[c] || ''}`).join('\n')}

Pick the one best cell for the card with these guidelines:

<guidelines>
${guide()}
</guidelines>

Answer with JSON only, in this shape:
{"best": <cell number>, "reason": "why the best cell wins over the next one"}`;
        const r = await askImages(name, model, look, rest, dir, ok, pickSchema(ok));
        const j = jsonOf(r.text);
        const best = Number(j.best);
        if (!ok.includes(best)) throw new Error(`best ${j.best} is not one of the ok cells ${ok.join(',')}`);
        cells[best] = 'best';
        reason = String(j.reason || '');
        ms += r.ms;
        costUsd += r.costUsd || 0;
      }
      return { cells, notes, reason, ms, costUsd };
    });
}

// --captions: step 1 writes a caption for each cell alone (what it shows, no mark);
// step 2 labels the whole grid as in v3, with the 9 captions to check and adjust by.
const captionSchema = {
  name: 'cell_caption',
  strict: true,
  schema: { type: 'object', additionalProperties: false, required: ['caption'], properties: { caption: { type: 'string' } } },
};

function captionsVision(name, model) {
  return (g, grid) =>
    withCells(grid, async (dir) => {
      fs.copyFileSync(grid, path.join(dir, 'picture.png'));
      let ms = 0;
      let costUsd = 0;
      const captions = {};
      const caption = async (c) => {
        const look = { claude: `Use the Read tool to look at the image file cell${c}.png in the current folder.`, local: 'Look at the attached picture.' };
        const rest = `It is one candidate picture for this story sentence: "${g.story}"

Describe only what you see. Do not judge the picture. Write 3 to 6 short sentences about:
- each person or animal: how many, what each one does, which way each one faces (front, quarter, side, back, from the top), and how big each one is in the picture;
- the objects and the place;
- the faces: the feeling on each face;
- any drawing fault: a bad eye, a bad hand, a broken object, a body part you cannot read. Look at the eyes closely. Say "no fault seen" if there is none.

Answer with JSON only, in this shape:
{"caption": "..."}`;
        const r = await askImages(name, model, look, rest, dir, [c], captionSchema);
        captions[c] = String(jsonOf(r.text).caption || '');
        ms += r.ms;
        costUsd += r.costUsd || 0;
      };
      const all = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      if (name === 'qwen') for (const c of all) await caption(c); // LM Studio: one request at a time
      else for (let i = 0; i < 9; i += 3) await Promise.all(all.slice(i, i + 3).map(caption));
      const list = all.map((c) => `- cell ${c}: ${captions[c]}`).join('\n');
      const rest = `${prompt(g, '').trim()}

A first step looked at each cell alone, close up, and wrote these captions. They can show a fault or a detail that is hard to see in the whole grid. Check each caption against the grid, and adjust your marks where a caption is right:
${list}`;
      const r = await askImages(name, model, { claude: LOOK.grid, local: 'Look at the attached picture. It is a 3×3 grid of nine candidate cells for one story sentence, numbered 1 to 9: left to right, top to bottom.' }, rest, dir, ['picture.png'], schema);
      return { ...parse(r.text), captions, ms: ms + r.ms, costUsd: costUsd + (r.costUsd || 0) };
    });
}

// --describe (Qwen only): step 1 has Qwen describe each cell alone in plain text, under
// fixed headings, blind (no story), with no judgment. Step 2 has Jev check each
// description against the story points and the v3 rules, with one small question per
// fact (see jevQuestions); markOf turns the answers into a mark, and the ok cell with
// the highest weighted fit is best.
const DESCRIBE = `Describe what you see in this picture, in plain text. Do not judge the picture, and do not say if it is good or bad. Write one line for each heading below, in this order:

People and animals: how many of each, and who they are.
Action: what each one does with the hands and body.
Objects: the objects you see.
Place: where the scene is, or "no place shown".
View: for each person or animal, which way it faces the camera (front, quarter, side, back) and if the camera looks from the top.
Size: which one is biggest in the picture, and which one is small or far away.
Shot: close-up, medium or long shot, and what the frame cuts off.
Heads: which way each head turns or tilts.
Faces: the feeling on each face.
Signs: any symbol, such as a question mark, a spark, lines or text.
Eyes and hands: describe each eye and each hand you see. Say if one looks broken, missing or strange.
Strange parts: any object or body part that looks broken, or that you cannot tell what it is.`;

// The story's key points, from Qwen in a text-only call, as JSON: the main actor, who
// (with how many), each action, each object, the place if the sentence names one, and
// the details (a manner, a sound, a shine) that a still picture may not show. Empty
// fields are dropped, so a story with no place gets no place point.
const pointsSchema = {
  name: 'story_points',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['main_actor', 'who', 'actions', 'objects', 'place', 'details'],
    properties: {
      main_actor: { type: 'string' },
      who: { type: 'array', items: { type: 'string' } },
      actions: { type: 'array', items: { type: 'string' } },
      objects: { type: 'array', items: { type: 'string' } },
      place: { type: 'string' },
      details: { type: 'array', items: { type: 'string' } },
    },
  },
};

// Story points checked by hand for the gold grids: a run uses these when the grid has
// an entry, because Qwen's points change from run to run.
const FIXED_POINTS = readJson(path.join(DIR, 'ai', 'story-points.json'), {});

async function storyPoints(name, model, story, dir) {
  const rest = `Story sentence: "${story}"

List what a picture of this sentence must show. Cover every part of the sentence, also the part after a ";" or a ",".
- main_actor: the one person or animal the story is mostly about, the one who does the main action.
- who: each actor and how many (a plural word such as "they" means 2 or more people).
- actions: each action, with who does it, in plain words, without how it is done.
- objects: each object the sentence names.
- place: the place, only if the sentence names one. Otherwise "".
- details: each word that says how something is done or how it looks or sounds, which a still picture may not show (for example "precisely", "gleams", "unspoken", "thin").

Example for "Carl knocked loudly, and the cat tilted its head.":
{"main_actor": "Carl (1 man)", "who": ["Carl (1 man)", "a cat (1)"], "actions": ["Carl knocks on a door", "the cat tilts its head"], "objects": ["a door"], "place": "", "details": ["the knock is loud"]}

Answer with JSON only.`;
  const r = await askImages(name, model, { local: 'Read this story sentence.' }, rest, dir, [], pointsSchema);
  const j = jsonOf(r.text);
  const list = (k) => (Array.isArray(j[k]) ? j[k] : []).map((v) => String(v).trim()).filter(Boolean);
  const place = String(j.place || '').trim();
  return {
    main_actor: String(j.main_actor || '').trim() || list('who')[0] || '',
    must: [...list('who'), ...list('actions'), ...list('objects'), ...(place ? [`the place: ${place}`] : [])],
    details: list('details'),
  };
}

// Qwen describes each cell blind: it gets no story and no story points, so it cannot
// copy them or see what it expects. Only Jev compares the description with the points.
const describePrompt = () => `${DESCRIBE}

Look closely at each hand: describe its exact pose, for example a fist, an open hand, or fingers that hold something.`;

// Qwen's plain text, cut at the DESCRIBE headings into fields, so each Jev question can
// name the one field it reads (`picture.view`, `picture.eyes_and_hands`, ...).
const HEADINGS = ['People and animals', 'Action', 'Objects', 'Place', 'View', 'Size', 'Shot', 'Heads', 'Faces', 'Signs', 'Eyes and hands', 'Strange parts'];
const fieldOf = (h) => h.toLowerCase().replace(/ /g, '_');
function descriptionFields(text) {
  const picture = Object.fromEntries(HEADINGS.map((h) => [fieldOf(h), '']));
  let at = null;
  for (const line of String(text).split('\n')) {
    const l = line.replace(/\*\*/g, '').replace(/^\s*[-*]\s*/, '').trim();
    const h = HEADINGS.find((x) => l.toLowerCase().startsWith(`${x.toLowerCase()}:`));
    if (h) {
      at = fieldOf(h);
      picture[at] = l.slice(h.length + 1).trim();
    } else if (at && l) picture[at] += ` ${l}`;
  }
  return picture;
}

// One small question per fact (the Jev guide: split, don't overload). A story point is a
// Choice, so "not described" is its own answer and not the same as "not there". The
// code turns the answers into a mark.
const POINT = {
  shown: 'The description says the picture shows this point.',
  other_words: 'The description shows this point in other words or in a close form (a yellow card is the tab; holding a tab is grabbing it; a mark on the scalp is a cut; a raised fist at a door is a knock).',
  different: 'The description shows a different thing in place of this point (an open hand that pats where the point says knocks; 1 person where the point says 2 or more people).',
  missing: 'The description lists the people, the objects and the actions, and this point is clearly not among them.',
  not_described: 'The description says nothing about this point either way, because a viewer would not write about it (a sound, a manner, a shine, a silence).',
};
const VIEW = {
  front: 'The main actor faces the camera.',
  quarter: 'The main actor is turned partly, and the face still shows.',
  side: 'The main actor is seen in profile, from the side.',
  back: 'The main actor is seen from behind, so the face does not show.',
  top: 'The camera looks down from the top, so the face does not show.',
  not_shown: 'The main actor is not in the picture, or only a hand or an arm is.',
};
const SIZE = {
  biggest: 'No other person or animal is bigger than the main actor. Objects and body parts do not count.',
  smaller: 'Another person or animal is clearly bigger than the main actor. Objects and body parts (a scalp, a hand, a door) do not count.',
  tiny: 'The main actor is small and far away.',
  not_shown: 'The main actor is not in the picture.',
};
const SHOT = {
  extreme_close_up: 'An extreme close-up: the frame shows only a hand, a face or an object, and cuts off the place and the other actors.',
  close_up: 'A close-up that still shows the main actor and the action.',
  medium: 'A medium shot.',
  long: 'A long shot: the figures are small in a wide scene.',
};
const yes = (y, n) => ({ yes: y, no: n });
const FIT = {
  face: ['The main actor\'s face does not show.', 'The face shows, but the feeling is hard to read.', 'The face shows clearly, with a feeling that fits the story.'],
  action: ['The main action is hard to see.', 'The main action shows, but not clearly.', 'The main action shows clearly.'],
  scene: ['The picture shows only the main actor, with no place and no other actor.', 'The picture shows some of the place or the other actors.', 'The picture shows the place and the other actors around the action.'],
};
const FIT_WEIGHTS = { face: 1, action: 1, scene: 0.5 };

function jevQuestions(points) {
  const q = {};
  const point = (pt) => jev.choice(`\`story\` is a story sentence. \`picture\` describes one picture drawn for it, by a viewer who did not know the story. Does the picture show this point of the story: "${pt}"?`, POINT);
  points.must.forEach((pt, i) => (q[`must${i}`] = point(pt)));
  points.details.forEach((pt, i) => (q[`detail${i}`] = point(pt)));
  q.view = jev.choice('In `picture.view`, which way does the main actor (`main_actor`) face the camera?', VIEW);
  q.size = jev.choice('In `picture.size` and `picture.people_and_animals`, how big is the main actor (`main_actor`) next to the other people and animals? Compare people and animals only, not objects or body parts.', SIZE);
  q.shot = jev.choice('Which kind of shot does `picture.shot` describe?', SHOT);
  q.feeling = jev.noul('In `picture.faces`, does the main actor (`main_actor`) show a feeling that goes against `story`?', yes('The feeling on the face goes against the story (a smile where the story is sad, fear where it is calm).', 'The feeling fits the story, or it is neutral, or the face does not show.'));
  q.apart = jev.noul('In `picture`, are the actors of `story` far apart, so the action and its result do not read as one scene?', yes('The actors are far apart and do not read as one scene.', 'The actors are close enough to read as one scene, or there is only one actor.'));
  q.eye = jev.noul('In `picture.eyes_and_hands` and `picture.strange_parts`, is any eye described as broken, missing or strange?', yes('An eye is broken, missing or strange.', 'The eyes are normal, or no eye shows.'));
  q.hand = jev.noul('In `picture.eyes_and_hands` and `picture.strange_parts`, is any hand described as broken, missing or strange?', yes('A hand is broken, has wrong fingers, or is strange.', 'The hands are normal, or no hand shows.'));
  q.part = jev.noul('In `picture.strange_parts`, is any object or body part, other than an eye or a hand, broken or impossible to read?', yes('An object or a body part is broken, or you cannot tell what it is.', 'Nothing is broken, or the line says none.'));
  for (const [k, levels] of Object.entries(FIT)) q[`fit_${k}`] = jev.score(`\`picture\` describes one picture drawn for \`story\`; the main actor is \`main_actor\`. ${{ face: 'How well does the main actor\'s face show?', action: 'How well does the main action of the story show?', scene: 'How much of the scene around the action shows?' }[k]}`, levels);
  return q;
}

async function jevCheck(story, points, desc) {
  const state = { story, main_actor: points.main_actor, picture: descriptionFields(desc) };
  const questions = jevQuestions(points);
  let answers;
  for (let i = 0; ; i++) {
    try {
      answers = await jev.systemOne({ state, questions });
      break;
    } catch (err) {
      if (i >= 2) throw err;
    }
  }
  for (const k of Object.keys(questions)) if (!answers[k]) throw new Error(`Jev gave no answer to ${k}`);
  return answers;
}

// The mark from Jev's answers. A probability is the chance of the bad options together;
// LIMIT is where it counts. A Choice with a low confidence is noted as unsure.
const LIMIT = 0.5;
const UNSURE = 0.5;
function markOf(points, a) {
  const pr = (k, opts) => opts.reduce((s, o) => s + Number(a[k].probabilities[o] || 0), 0);
  const wrong = [];
  const weak = [];
  points.must.forEach((pt, i) => {
    if (pr(`must${i}`, ['different', 'missing']) >= LIMIT) wrong.push(`${a[`must${i}`].choice}: ${pt}`);
  });
  points.details.forEach((pt, i) => {
    if (pr(`detail${i}`, ['different']) >= LIMIT) weak.push(`different: ${pt}`);
  });
  for (const k of ['eye', 'hand', 'part']) if (a[k].noul >= LIMIT) wrong.push(`${k} fault`);
  if (pr('view', ['back', 'top']) >= LIMIT) weak.push(`view ${a.view.choice}`);
  if (pr('size', ['smaller', 'tiny']) >= LIMIT) weak.push(`size ${a.size.choice}`);
  if (pr('shot', ['extreme_close_up']) >= LIMIT) weak.push('extreme close-up');
  for (const k of ['feeling', 'apart']) if (a[k].noul >= LIMIT) weak.push(k);
  const unsure = Object.keys(a).filter((k) => a[k].type === 'choice' && a[k].confidence < UNSURE);
  const fit = Object.entries(FIT_WEIGHTS).reduce((s, [k, w]) => s + w * Number(a[`fit_${k}`].score), 0);
  return { mark: wrong.length ? 'wrong' : weak.length ? 'weak' : 'ok', why: [...wrong, ...weak], unsure, fit };
}

// --rejudge <file>: reuse the descriptions in that labels file, and run only Jev again
// (with --new-points, Qwen also writes the story points again).
const REJUDGE = arg('--rejudge') ? readJson(path.resolve(arg('--rejudge')), {}) : null;

function describeVision(name, model) {
  return (g, grid) =>
    withCells(grid, async (dir) => {
      const t0 = Date.now();
      const all = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const reuse = REJUDGE && REJUDGE[g.id];
      const descriptions = reuse ? { ...reuse.descriptions } : {};
      const oldPoints = reuse && reuse.points && reuse.points.must ? reuse.points : null;
      const points = FIXED_POINTS[g.id] || (oldPoints && !process.argv.includes('--new-points') ? oldPoints : await storyPoints(name, model, g.story, dir));
      let costUsd = 0;
      for (const c of reuse ? [] : all) {
        const r = await askImages(name, model, { claude: `Use the Read tool to look at the image file cell${c}.png in the current folder.`, local: 'Look at the attached picture.' }, describePrompt(), dir, [c], null);
        descriptions[c] = r.text.trim();
        costUsd += r.costUsd;
      }
      const checks = Object.fromEntries(await Promise.all(all.map(async (c) => [c, await jevCheck(g.story, points, descriptions[c])])));
      const cells = {};
      const notes = {};
      const marks = {};
      for (const c of all) {
        marks[c] = markOf(points, checks[c]);
        cells[c] = marks[c].mark;
        notes[c] = [...marks[c].why, ...(marks[c].unsure.length ? [`unsure: ${marks[c].unsure.join(' ')}`] : [])].join('; ') || `fit ${marks[c].fit.toFixed(2)}`;
      }
      const ok = all.filter((c) => cells[c] === 'ok').sort((a, b) => marks[b].fit - marks[a].fit);
      if (ok.length) cells[ok[0]] = 'best';
      const reason = ok.length ? `highest fit ${marks[ok[0]].fit.toFixed(2)}${ok[1] ? ` vs cell ${ok[1]} ${marks[ok[1]].fit.toFixed(2)}` : ''}` : 'no cell passed the rules';
      return { cells, notes, reason, points, descriptions, checks, ms: Date.now() - t0, costUsd };
    });
}

// Model text → { cells: {c: mark}, notes: {c: note}, reason }.
function parse(text) {
  const s = String(text);
  const j = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
  const cells = {};
  const notes = {};
  for (const [c, v] of Object.entries(j.cells || {})) {
    const mark = String(v.mark || '').toLowerCase().trim();
    if (!MARKS.includes(mark)) throw new Error(`cell ${c}: unknown mark "${v.mark}"`);
    cells[c] = mark;
    if (v.note) notes[c] = String(v.note);
  }
  if (Object.keys(cells).length !== 9) throw new Error(`${Object.keys(cells).length} cells marked, not 9`);
  return { cells, notes, reason: String(j.reason || '') };
}

async function label(names, ids, mode) {
  fs.mkdirSync(AI_DIR, { recursive: true });
  const grids = readJson(path.join(DIR, 'grids.json'), []).filter((g) => !ids || ids.includes(g.id));
  const imgDir = imageDir();
  await Promise.all(
    names.map(async (name) => {
      const model = MODELS[name];
      if (!model) throw new Error(`unknown model ${name} (use ${Object.keys(MODELS).join(', ')})`);
      const one = name === 'qwen' ? localVision(model) : claudeVision(model);
      const ask =
        mode === 'cells'
          ? cellsVision(name, model)
          : mode === 'two-step'
            ? twoStepVision(name, model)
            : mode === 'captions'
              ? captionsVision(name, model)
              : mode === 'describe'
                ? describeVision(name, model)
                : async (g, grid) => {
                const r = await one(prompt(g), grid, name === 'qwen' ? schema : undefined);
                return { ...parse(r.text), ms: r.ms, costUsd: r.costUsd };
              };
      const file = aiFile(name, guideVersion() + (mode ? `-${mode}` : '') + (arg('--out') ? `-${arg('--out')}` : ''));
      const out = readJson(file, {});
      for (const g of grids) {
        if (out[g.id] && !out[g.id].failed) continue;
        const t0 = Date.now();
        try {
          const r = await ask(g, path.join(imgDir, g.grid));
          out[g.id] = { ...r, model, at: new Date().toISOString() };
          console.error(`${name} ${g.id}: ok ${Math.round((Date.now() - t0) / 1000)}s`);
        } catch (err) {
          out[g.id] = { failed: err.message.slice(0, 300), model, at: new Date().toISOString() };
          console.error(`${name} ${g.id}: FAILED ${err.message.slice(0, 160)}`);
        }
        fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
      }
    }),
  );
}

const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : '-');

function printPair(title, a, b, grids) {
  const r = agreement(grids, a, b);
  console.log(`\n## ${title} (${r.grids} grids, ${r.cells} cells)`);
  console.log(`same mark: ${pct(r.same, r.cells)}   kappa: ${r.kappa.toFixed(2)}   weighted kappa (order best>ok>weak>wrong): ${r.weightedKappa.toFixed(2)}`);
  console.log(`B's best is A's best: ${r.best.same}/${r.best.of}   in A's ok set: ${r.best.inOk}/${r.best.of}   A marked it wrong: ${r.best.wrong}/${r.best.of}`);
  console.log(`A's wrong cells that B also marks wrong: ${r.wrongRecall.hit}/${r.wrongRecall.of}`);
  console.log(`\nrows = A, columns = B\n${['', ...MARKS].map((s) => s.padEnd(7)).join('')}`);
  for (const m of MARKS) console.log([m, ...MARKS.map((n) => String(r.confusion[m][n]))].map((s) => s.padEnd(7)).join(''));
  console.log(`\nbiggest gaps (A mark → B mark: cells):`);
  for (const [k, n] of r.gaps.slice(0, 6)) console.log(`  ${k}: ${n}`);
  return r;
}

function score(v = guideVersion()) {
  const grids = readJson(path.join(DIR, 'grids.json'), []);
  const flash = readJson(path.join(DIR, 'labels.json'), {});
  console.log(`# AI labels made with guidelines ${v}`);
  const ai = Object.fromEntries(Object.keys(MODELS).map((n) => [n, Object.fromEntries(Object.entries(readJson(aiFile(n, v), {})).filter(([, v]) => !v.failed))]));
  for (const n of Object.keys(MODELS)) printPair(`Flash (A) vs ${n} (B)`, flash, ai[n], grids);
  printPair('sonnet (A) vs qwen (B)', ai.sonnet, ai.qwen, grids);
}

const cmd = process.argv[2];
if (cmd === 'label') {
  const names = (arg('--models') || 'sonnet,qwen').split(',').filter(Boolean);
  const ids = arg('--grids') ? arg('--grids').split(',') : null;
  const mode = process.argv.includes('--cells') ? 'cells' : process.argv.includes('--two-step') ? 'two-step' : process.argv.includes('--captions') ? 'captions' : process.argv.includes('--describe') ? 'describe' : null;
  label(names, ids, mode).catch((err) => {
    console.error(err.message);
    process.exit(2);
  });
} else if (cmd === 'score') score(arg('--guidelines') || undefined);
else {
  console.error('usage: node scripts/gold-image-pick-ai.js label [--models sonnet,qwen] [--grids G001,...] [--cells | --two-step | --captions | --describe] | score [--guidelines v2 | v3-cells | v3-two-step | v3-captions | v3-describe]');
  process.exit(2);
}
