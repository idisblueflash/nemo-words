# SP-066 The appeal case in detail

**Story:** A peal of bells attracts a curious crowd.

**Your cell:** 9. **The pick:** cell 1. **The alternative:** cell 6 (margin 0.07).

**Must-see items:** bells (ringing); crowd (curious).

**Main subject:** crowd (actor: false). The must-see stage picked the crowd, because the story names no person who does the action. The bells do the action ("attracts"), and the crowd reacts.

**The picture:** the map can't show images. Open `images/mnemonic/appeal.grid.png` to see the 9 cells (1–3 on the top row, 7–9 on the bottom row).

All numbers come from the cached results after change 4 (changes 1, 2 and 4 kept), on 2026-10-18. The case's history is in CASE-001. Each score is on a 1–3 scale.

## Ranking

| Rank | Cell | Total at 2·1·1 | Total at 3·2·3 | Plausible | Vivid | Clarity |
|---|---|---|---|---|---|---|
| 1 | 1 (the pick) | 11.10 | 21.48 | 2.96 | 2.96 | 2.23 |
| 2 | 6 | 11.03 | 21.82 | 2.91 | 2.56 | 2.65 |
| 3 | 5 | 10.74 | 21.12 | 2.72 | 2.96 | 2.35 |
| 4 | 9 **(yours)** | 10.29 | 19.88 | 2.82 | 2.54 | 2.11 |
| 5 | 7 | 10.03 | 19.80 | 2.46 | 2.90 | 2.21 |
| 6 | 2 | 9.52 | 18.78 | 2.31 | 2.87 | 2.04 |
| 7 | 4 | 9.38 | 17.58 | 2.84 | 2.06 | 1.65 |

At the tuned weights 3·2·3 the order is 6, 1, 5, 9, 7, 2, 4.

Gated out (a must-see item is hidden): cell 3 (crowd: hidden), cell 8 (crowd: hidden).

## The parts of each score

| Part | 1 | 6 | 5 | **9** | 7 | 2 | 4 |
|---|---|---|---|---|---|---|---|
| plausible setting | 2.99 | 2.99 | 2.51 | 2.97 | 1.94 | 1.41 | 2.95 |
| plausible drawing | 3.00 | 2.99 | 3.00 | 3.00 | 2.99 | 2.99 | 2.98 |
| plausible actions | 2.88 | 2.74 | 2.64 | 2.49 | 2.45 | 2.52 | 2.58 |
| vivid scene | 2.93 | 2.98 | 2.94 | 2.08 | 2.81 | 2.74 | 1.86 |
| vivid onlooker | 3.00 | 2.15 | 2.99 | 3.00 | 2.98 | 3.00 | 2.25 |
| clarity completeness | 1.42 | 2.86 | 2.98 | 2.77 | 1.57 | 1.53 | 1.70 |
| clarity size | 2.97 | 2.99 | 2.98 | 2.36 | 2.95 | 1.97 | 1.88 |
| clarity state | 1.82 | 2.11 | 2.18 | 2.11 | 2.28 | 1.96 | 1.90 |
| clarity view | 2.69 | 2.66 | 1.24 | 1.21 | 2.04 | 2.70 | 1.13 |

Plausible is the mean of its 3 parts, vivid of its 2 parts, and clarity of its 4 parts.

## What Jev was asked (the levels for each part)

Jev gives each part a level 0, 1 or 2. The code adds 1, so the score is 1–3. The decimals come from Jev's probabilities.

### plausible setting

- 0: no setting clues: nothing shows where the scene happens
- 1: a few setting clues
- 2: clear setting clues that fit the story, such as a floor, a hand, a height or a place
- Cell 9: score 2.97, probabilities 0=0, 1=0.03, 2=0.97

### plausible drawing

- 0: a must-see item is drawn wrong (a drawing error with mustSee true)
- 1: another object is drawn wrong (a drawing error with mustSee false only)
- 2: no drawing error
- Cell 9: score 3.00, probabilities 0=0, 1=0, 2=1

### plausible actions

- 0: the cell shows only one action, or only the result, of a story with more actions; or its actions don't fit the story's order
- 1: the cell shows some of the story's beginning actions
- 2: the cell shows the story's beginning actions in the story's order (the result may be left out)
- Cell 9: score 2.49, probabilities 0=0.21, 1=0.09, 2=0.7

### vivid scene

- 0: the story objects are small, far away or apart from each other
- 1: the story objects are clear, but they don't act on each other as the story says
- 2: the story objects are large and act on each other as the story says
- Cell 9: score 2.08, probabilities 0=0.44, 1=0.05, 2=0.51

### vivid onlooker

- 0: an onlooker looks away or does something else, so it draws the eye away from the story's action
- 1: no onlooker, or an onlooker that adds nothing to the story
- 2: an onlooker watches or reacts to the action and makes the story's feeling stronger
- Cell 9: score 3.00, probabilities 0=0, 1=0, 2=1

### clarity completeness

- 0: a crop cuts off part of the story: a must-see item that the story needs is partly cut off by the edge of the picture
- 1: a must-see item is partly cut, but the crop fits the shot (as in a close-up)
- 2: every must-see item is fully visible
- Cell 9: score 2.77, probabilities 0=0.07, 1=0.09, 2=0.84

### clarity size

- 0: a story item is too small to see what it does
- 1: an item is small by nature (such as a headlamp), and every other must-see item is large enough to see
- 2: every must-see item is large enough to see
- Cell 9: score 2.36, probabilities 0=0.3, 1=0.04, 2=0.66

### clarity state

- 0: a must-see item is not in the state its adjectives give (a cob that isn't bare yet)
- 1: the state of some must-see items is unclear
- 2: every must-see item is in the state its adjectives give
- Cell 9: score 2.11, probabilities 0=0.39, 1=0.11, 2=0.5

### clarity view

- 0: the main subject is seen from the back or from above, or is hidden, or it is an actor that the cell doesn't show
- 1: the main subject is seen from the side
- 2: the main subject is seen from the front or in three-quarter view
- Cell 9: score 1.21, probabilities 0=0.87, 1=0.04, 2=0.09

## What the captioner saw in each cell

### Cell 1 (the pick)

- Shot: wide, angle: eye level, step: during
- Action: The old man pulls the rope to ring the bell, which swings with sound lines, while the villagers around him look up at the bell.
- Must-see: bells visible, large, back; crowd partly cut, large, front
- Main subject's view: three-quarter
- Onlookers: old woman (watches, three-quarter); boy (watches, three-quarter); woman with auburn hair (watches, three-quarter); man with hat (reacts, three-quarter)
- Drawing errors: none
- Objects: bell, wooden frame, rope, old man bell ringer, old woman, boy, woman with auburn hair, man with hat, fence, house, trees
- Background: A village scene with trees, a house with a red roof, a wooden fence, and a pale sky
- The grid brief for this cell: Eye-level wide shot of the whole frame: one bell on its frame, the ringer pulling the rope, and all four onlookers standing in a row, every face visible.

### Cell 2

- Shot: medium, angle: low angle, step: during
- Action: The old man pulls the rope with his raised arm to swing the big bell, while the small crowd of four at the bottom right looks up at the bell.
- Must-see: bells partly cut, large, back; crowd partly cut, small, front
- Main subject's view: three-quarter
- Onlookers: elderly woman with glasses (watches, three-quarter); boy (watches, front); red-haired woman (reacts, three-quarter); mustached man with hat (watches, three-quarter)
- Drawing errors: none
- Objects: old man, bell, rope, elderly woman, boy, woman, man with hat, motion lines
- Background: plain pale cream background with no details
- The grid brief for this cell: Low-angle close shot looking up past the ringer's head and arm at one big bell; the crowd is reduced to small faces along the bottom edge.

### Cell 3 (gated out)

- Shot: close-up, angle: low angle, step: during
- Action: The bell swings and rings, with motion lines around it, while a startled boy in the lower right corner looks up at it with wide eyes.
- Must-see: bells partly cut, large, front; crowd hidden
- Main subject's view: none (not shown)
- Onlookers: boy (reacts, three-quarter)
- Drawing errors: none
- Objects: bell, bell rope, bell clapper, wooden post, boy, motion lines
- Background: plain cream backdrop with a wooden post on the left
- The grid brief for this cell: Extreme close-up of the bell and the boy's face alone; the ringer and the rest of the crowd are cut off, so the gathered crowd is hidden.

### Cell 4

- Shot: wide, angle: eye level, step: during
- Action: An old man pulls a rope to ring a large bell on a wooden frame while three people in the foreground watch him from behind and the side.
- Must-see: bells visible, medium, back; crowd partly cut, large, front
- Main subject's view: back
- Onlookers: none
- Drawing errors: none
- Objects: bell, wooden frame, bell rope, old man, woman with auburn bun, woman with gray bun, man in green hat, dirt ground, bushes, sound lines
- Background: A dry dirt yard with green bushes and a pale sky behind a wooden bell frame
- The grid brief for this cell: Wide shot from behind the crowd, with two woman's heads in the foreground and a hat at the edge, so their faces are hidden; the ringer and a small bell are seen far away.

### Cell 5

- Shot: medium, angle: overhead, step: during
- Action: The old man pulls the rope to ring the bell while the woman, boy, man with hat and old woman stand around it looking up at it.
- Must-see: bells visible, large, front; crowd visible, large, back
- Main subject's view: above
- Onlookers: woman with red hair in a bun (watches, above); boy (watches, above); man with hat (watches, above); old woman (watches, above)
- Drawing errors: none
- Objects: woman with red hair in a bun, boy, man with hat, old woman, old man, bell, wooden beam, rope, motion lines
- Background: sandy beige ground with small pebbles and marks
- The grid brief for this cell: Overhead bird's-eye view looking down on the bell, with the ringer and four onlookers circled around it and looking up.

### Cell 6

- Shot: wide, angle: low angle, step: during
- Action: The old man pulls the rope to ring the bell on the post while the crowd of villagers walk toward him, looking up at the bell and reacting with delight.
- Must-see: bells visible, large, back; crowd visible, large, front
- Main subject's view: three-quarter
- Onlookers: none
- Drawing errors: none
- Objects: bell, wooden post, rope, old man bell ringer, elderly woman, boy, woman in apron, man in hat, house, trees
- Background: A village dirt square with green trees and a small house under a pale sky
- The grid brief for this cell: Wide shot from a low-angle side view with the ringer large in the foreground pulling the rope and the crowd approaching from the left; the bell is cropped at the top.

### Cell 7

- Shot: medium, angle: low angle, step: during
- Action: A large bell swings and rings while the old man covers his ears and the boy, the woman and the older woman look up at it in surprise.
- Must-see: bells partly cut, large, back; crowd partly cut, large, front
- Main subject's view: front
- Onlookers: boy (watches, three-quarter); woman in apron (reacts, front); older gray-haired woman (watches, back)
- Drawing errors: none
- Objects: bell, wooden post, rope, old man, old man's hat, boy, woman, older woman
- Background: pale cream sky with a faint distant horizon and a small building silhouette at the lower left
- The grid brief for this cell: Medium shot with the bell swinging at the top, the man in the hat covering his ears at left, and the boy and two women at the bottom; this is the only cell with the loud-noise reaction, and the ringer is absent.

### Cell 8 (gated out)

- Shot: medium, angle: low angle, step: during
- Action: The old man grips the bell rope and pulls it to ring the large bell while he and the boy look up at it.
- Must-see: bells partly cut, large, back; crowd hidden
- Main subject's view: none (not shown)
- Onlookers: none
- Drawing errors: none
- Objects: old man, boy, bell, bell rope, wooden post, vest, shirt
- Background: plain off-white background with a wooden post
- The grid brief for this cell: Tight close-up on the ringer's face and hand on the rope, with the boy peeking over his shoulder; the bell is cropped and the rest of the crowd is cut off.

### Cell 9 (yours)

- Shot: medium, angle: eye level, step: during
- Action: The old man pulls the rope to ring the bell on the wooden frame while four people in the foreground watch him from behind.
- Must-see: bells visible, medium, back; crowd partly cut, large, front
- Main subject's view: back
- Onlookers: man in green hat (watches, back); child (watches, back); old woman (watches, back); woman with red hair (watches, three-quarter)
- Drawing errors: none
- Objects: bell, wooden bell frame, bell rope, bell ringer (old man), man in green hat, child, old woman, woman with red hair, trees, dirt ground
- Background: A dirt clearing with green trees and a cream sky behind the bell frame
- The grid brief for this cell: Wide shot from behind the crowd, with four backs of heads filling the foreground and the ringer and bell small in the distance; similar to cell 4 but showing the whole crowd and more of the bell.

## Why cell 9 loses

- Cell 9 is 0.81 below cell 1 at the weights 2·1·1.
- View: 1.21 for cell 9 and 2.69 for cell 1. The crowd in cell 9 is seen from the back, and the lowest level says "seen from the back".
- Scene: 2.08 for cell 9 and 2.93 for cell 1. Jev reads the bells at the back and the crowd at the front as objects that are apart.
- Actions: 2.49 for cell 9 and 2.88 for cell 1. Plausible has the weight 2, so this costs cell 9 about 0.26.
- If the view of cell 9 were 3.00, its total would be 10.74. That is still below cell 1 (11.10) and cell 6 (11.03).
- If the scene of cell 9 were also 2.93 (as cell 1), its total would be 11.17.
