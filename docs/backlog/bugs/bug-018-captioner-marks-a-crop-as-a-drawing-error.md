---
title: "The captioner marks an object cut off by the cell edge as a drawing error"
status: fixed
original_story: SP-066
ac: 2
found: 2026-10-17
---
# bug-018 The captioner marks an object cut off by the cell edge as a drawing error

## Bug
Expected: The captioner does not mark a crop as a drawing error, because concept C-044 says a drawing error is only an object that floats, looks pasted on, or breaks the lines of the wall or floor. An object that the edge of the cell cuts off (for example in a close-up), an object drawn small, and an object in the wrong state are not drawing errors. Flash said: "a crop because of the extreme close-up shot is reasonable".

Actual: The captioner marks a cut-off object as a drawing error. On ventilator cell 1, it marked the machine as a drawing error on a must-see item ("cut off by the right edge… looks small"). That drawing error then capped plausible at 1.

## Reproduction
Reported: In a real smoke call on ventilator cell 1, the captioner marked as a drawing error on a must-see item a machine that was simply cut off by the right edge of the cell ("cut off by the right edge… looks small"), which then capped plausible at 1. Flash said: "a crop because of the extreme close-up shot is reasonable".

Observed (no paid call made): the "drawingErrors" line of the caption prompt in spikes/sp-066/lib/caption.js named only "it floats, looks pasted on, or breaks the lines of the wall or floor" and "broken or crooked on purpose". It did not say that a crop, a small object or a wrong state is not a drawing error. The new test `spikes/sp-066/test/ac2-crop-not-drawing-error.test.js` failed on this.

## Fix
spikes/sp-066/lib/caption.js: the drawingErrors line now says an object cut off by the edge of the cell (a crop), drawn small, or in the wrong state is not a drawing error. This changes the caption prompt key, so cached captions are made again.
