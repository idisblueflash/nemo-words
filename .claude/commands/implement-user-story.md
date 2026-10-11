---
description: Implement a user story end-to-end in an isolated worktree — _teddy implements, _qa verifies against the ACs, and _buzz files/fixes any bug _qa flags, looping until the story is done.
argument-hint: <backlog item ID or path, e.g. US-039>
---

You are orchestrating the full implement→verify→fix loop for one backlog item
(a story, spike or enabler managed by the `backlog` plugin), given as
`$ARGUMENTS` — either its ID (e.g. `US-039`) or a path to its file under
`docs/backlog/items/` (e.g.
`docs/backlog/items/US-039-auto-made-card-is-logged-with-its-runner-ups.md`).
Run the steps below in order, in this main session — don't delegate the
orchestration itself to a subagent, only the individual phases
(_teddy / _qa / _buzz).

Status lives in two places the `backlog` plugin keeps in step: the item's
own `status:` frontmatter and its line in `docs/backlog/BACKLOG.md`
(`... · <epic> · <status>`). Whenever this command changes a status, change
both. Valid story statuses are `idea → refined → ready → in-progress → done`
(plus `dropped`) — see the plugin's `reference/format.md`.

## 0. Resolve the story

- Resolve `$ARGUMENTS` to a repo-relative path: an ID resolves to the single
  `docs/backlog/items/<ID>-*.md` match; a path is normalized against the repo
  root. The rest of this command assumes a repo-relative path that still
  resolves once you're inside the worktree. If nothing (or more than one
  file) matches, stop and report it.
- Legacy stories under `docs/user-stories/` (US-001…US-027, tracked in
  `FEAT-*.md`) are all done and frozen — this command no longer handles
  them. If given one, stop and say so.
- The item's `status` should be `ready`. If it's `idea` or `refined`, stop
  and suggest `/backlog:refine <ID>` first — there are no settled ACs to
  implement yet. If it's already `in-progress`, that's a resumed run; see
  step 1's existing-worktree case.
- Take the ID (e.g. `US-039`) from the frontmatter `id:` and the title from
  the `# <ID> <title>` heading. You'll use the ID for the branch/worktree
  name, commit messages, status updates and the PR title.

## 1. Branch + worktree

Call `EnterWorktree` with `name` set to the lowercase ID (e.g. `us-039`). This creates a new git worktree on a new branch and
switches the session into it. All following steps run inside that worktree —
the normalized story file path is the same relative path inside it.

If `EnterWorktree` fails because that name/branch already exists (a prior
run of this command on the same story), don't guess — report it to the user
and ask whether to resume in the existing worktree (`EnterWorktree` with
`path`) or use a new name (e.g. suffix `-2`).

Once inside the worktree, mark the item `status: in-progress` (frontmatter +
`BACKLOG.md` line) and commit just that change (`<ID>: start`). Skip this if
it's already `in-progress` from a resumed run.

## 2. Implement — dispatch `_teddy`

Dispatch the `_teddy` subagent (Agent tool, `subagent_type: "_teddy"`) with
the story file path. Wait for it to finish and report which ACs are covered,
what files it created/changed, and that its test suite passes.

Commit `_teddy`'s work now, before moving on — implementation + tests, one
commit, message naming the story ID. This checkpoint protects the work if
`_qa` or `_buzz` fails or the session is interrupted later.

## 3. Verify — dispatch `_qa`

Dispatch the `_qa` subagent (`subagent_type: "_qa"`) against the same story
file. `_qa` records its verdict in the story's own YAML frontmatter
(`qa_status: passing|bug`, plus a `bugs:` list on failure) — read the
frontmatter back after it reports to see the verdict rather than trusting
only its prose summary.

## 4. Branch on the verdict

### 4.a — bugs found

If `qa_status: bug` (any entries under `bugs:`):

1. Dispatch `_buzz` (`subagent_type: "_buzz"`) once per distinct `bugs:`
   entry, sequentially — one bug report, reproduction, and TDD fix per
   dispatch. Don't batch multiple bugs into one dispatch: `_buzz`'s report
   format and its `_qa` callback are built around a single bug at a time,
   and batching risks one fix's test changes masking another's regression.
   Point each dispatch at the story file and that entry's AC number.
   `_buzz` calls `_qa` back itself after each fix — let it; don't also
   dispatch `_qa` yourself in this step. This is one **round**; track a
   round counter for this story (starts at 1).
2. After all flagged bugs have gone through `_buzz`, re-read the story
   frontmatter for the current `qa_status`.
3. If it's now `passing`, proceed to 4.b. If bugs remain (new or
   unresolved):
   - Report the outstanding bugs to the user, including the current round
     count (e.g. "round 2 of 3"), and stop — do not loop indefinitely or
     guess at further fixes yourself.
   - If this was round 3 (i.e. 3 rounds of dispatching `_buzz` for this
     story's remaining bugs have completed and bugs still remain), stop
     here regardless of what the user wants to do next — do not start a
     4th round even if asked to keep going. Report that the 3-round cap
     was hit and that persistent bugs after 3 rounds need closer human
     review rather than another automated attempt.
   - Otherwise (round 1 or 2 just completed), only start the next round
     (increment the counter, go back to step 1) if the user explicitly
     says to keep going.

### 4.b — clean pass

If `qa_status: passing` with no open `bugs:` entries (either on the first
pass or after `_buzz` resolved everything):

1. Set the item's `status: done` (replacing `in-progress`; `_qa`'s
   `qa_status: passing` stays alongside it — `status` is the backlog's
   lifecycle field, `qa_status` is `_qa`'s verdict).
2. Set the item's line in `docs/backlog/BACKLOG.md` to `done` too (the last
   `· <status>` segment). If the item has no line there, stop and report it
   rather than silently proceeding — the backlog is out of step and needs a
   `/backlog:review`. Don't re-rank or touch any other line; ranking is
   `/backlog:review`'s job.
3. Commit this final state: the `status: done` frontmatter edit, the
   `BACKLOG.md` line from step 2, plus anything from step 4.a not
   already committed by `_buzz` (bug reports, fixes — `_buzz` commits its
   own work per its workflow, but confirm with `git status` rather than
   assuming). Write a commit message naming the story (ID + title).
4. **Push and open a PR**, right away, as part of this same invocation —
   this does not need separate explicit go-ahead, unlike other push/PR
   actions elsewhere in this repo's agents. Push the branch, then
   `gh pr create` with title = story ID + title and a body summarizing
   which ACs `_teddy` covered and confirming `_qa`'s clean pass.
5. Report to the user: branch name, worktree path, story ID/title,
   AC summary from `_teddy`, confirmation of the `status: done` flag, and
   the PR URL.
6. Leave the worktree in place (don't call `ExitWorktree` yet) so the user
   can inspect it, review the PR on GitHub, or continue from it.

## 5. Merge and clean up — only on explicit instruction

This is a separate, later invocation/message, not a continuation of step 4
— the user reviews the PR on GitHub (or however they like) in the
meantime, and this command does not poll or wait for that.

When the user explicitly asks to merge (e.g. "merge PR `<ID>`", "merge
it", "it's ready, merge and clean up"):

1. Check the PR's current state (`gh pr view`). If it isn't merged yet,
   merge it (`gh pr merge`). If it's already merged (e.g. the user merged
   it themselves via the GitHub UI), just confirm that rather than
   re-merging.
2. Once merged, call `ExitWorktree` to clean up the worktree.
3. Report the merge commit and confirm the worktree was removed.

Never infer this step from the PR being opened, CI going green, or any
other signal short of the user's explicit merge instruction — the
worktree stays until the user actually says to clean it up.

## Rules

- Never skip `_qa` after `_teddy` — even if `_teddy`'s own tests are green,
  `_qa` is the black-box check against the ACs.
- Never mark `status: done` while any `bugs:` entry is open.
- Only ever change the item's `status` field and its `BACKLOG.md` status
  segment — never its ACs, its rank, or other items. Refining and re-ranking
  belong to `/backlog:refine` and `/backlog:review`.
- If `_teddy` reports an ambiguity or AC conflict, stop and report it to the
  user before dispatching `_qa` — there's nothing to verify yet.
- Never call `ExitWorktree` except in step 5, after an explicit user
  instruction to merge/clean up — not automatically once the PR is open,
  and not inferred from any other signal.
