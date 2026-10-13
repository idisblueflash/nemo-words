---
id: C-016
type: concept
status: active
aliases: [control arm, story arm, retention-control, retention-story, control deck]
related: [C-001, C-018, C-009]
---
# C-016 Arm

**Meaning:** The group that a new word is drawn into for the E02 test. A `story` arm word gets a normal story card. A `control` arm word gets a card with only the definition, in its own deck. The row's tag records the arm.
**Example:** `draw-arm` sends `wary` to control. Its card goes to `00 Reading Room::03 Control Definitions` with the tag `retention-control`.
**Not the same as:** a route. The route decides whether a word gets a story card at all. The arm is drawn only after the route is `general`.
