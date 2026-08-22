---
description: Implement a user story end-to-end in an isolated worktree — _teddy implements, _qa verifies against the ACs, and _buzz files/fixes any bug _qa flags, looping until the story is done.
argument-hint: <path-to-user-story.md>
---

You are orchestrating the full implement→verify→fix loop for one user story,
given as `$ARGUMENTS` (a path under `docs/user-stories/`, e.g.
`docs/user-stories/US-004.md`). Run the steps below in order, in this main
session — don't delegate the orchestration itself to a subagent, only the
individual phases (_teddy / _qa / _buzz).

## 0. Resolve the story

- Normalize `$ARGUMENTS` to a path relative to the repo root (resolve it
  against the repo root if given as absolute or relative-to-cwd) — the rest
  of this command assumes a repo-relative path that still resolves once
  you're inside the worktree. If it doesn't exist, stop and report the bad
  path.
- Derive a slug from the filename without extension (e.g. `US-004` from
  `docs/user-stories/US-004.md`). You'll use it for the branch/worktree name
  and in status updates.

## 1. Branch + worktree

Call `EnterWorktree` with `name` set to a lowercase, hyphenated form of the
slug (e.g. `us-004`). This creates a new git worktree on a new branch and
switches the session into it. All following steps run inside that worktree —
the normalized story file path is the same relative path inside it.

If `EnterWorktree` fails because that name/branch already exists (a prior
run of this command on the same story), don't guess — report it to the user
and ask whether to resume in the existing worktree (`EnterWorktree` with
`path`) or use a new name (e.g. suffix `-2`).

## 2. Implement — dispatch `_teddy`

Dispatch the `_teddy` subagent (Agent tool, `subagent_type: "_teddy"`) with
the story file path. Wait for it to finish and report which ACs are covered,
what files it created/changed, and that its test suite passes.

Commit `_teddy`'s work now, before moving on — implementation + tests, one
commit, message naming the story slug. This checkpoint protects the work if
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
   dispatch `_qa` yourself in this step.
2. After all flagged bugs have gone through `_buzz`, re-read the story
   frontmatter for the current `qa_status`.
3. If it's now `passing`, proceed to 4.b. If bugs remain (new or
   unresolved), report the outstanding bugs to the user and stop — do not
   loop indefinitely or guess at further fixes yourself. Only re-dispatch
   `_buzz` again if the user says to keep going.

### 4.b — clean pass

If `qa_status: passing` with no open `bugs:` entries (either on the first
pass or after `_buzz` resolved everything):

1. Edit the story file's frontmatter to add `status: done` (alongside the
   existing `qa_status: passing`) — this is the "story implemented and
   verified" flag, distinct from `_qa`'s own `qa_status` field.
2. Commit this final state: the `status: done` frontmatter edit, plus
   anything from step 4.a not already committed by `_buzz` (bug reports,
   fixes — `_buzz` commits its own work per its workflow, but confirm with
   `git status` rather than assuming). Write a commit message naming the
   story (slug + title).
3. Report to the user: branch name, worktree path, story slug/title,
   AC summary from `_teddy`, and confirmation of the `status: done` flag.
   Do not push or open a PR — that needs separate explicit go-ahead.
4. Leave the worktree in place (don't call `ExitWorktree` unless the user
   asks) so the user can inspect or continue from it.

## Rules

- Never skip `_qa` after `_teddy` — even if `_teddy`'s own tests are green,
  `_qa` is the black-box check against the ACs.
- Never mark `status: done` while any `bugs:` entry is open.
- If `_teddy` reports an ambiguity or AC conflict, stop and report it to the
  user before dispatching `_qa` — there's nothing to verify yet.
