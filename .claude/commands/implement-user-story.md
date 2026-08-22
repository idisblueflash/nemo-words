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

- Read `$ARGUMENTS`. If it doesn't exist, stop and report the bad path.
- Derive a slug from the filename without extension (e.g. `US-004` from
  `docs/user-stories/US-004.md`). You'll use it for the branch/worktree name
  and in status updates.

## 1. Branch + worktree

Call `EnterWorktree` with `name` set to a lowercase, hyphenated form of the
slug (e.g. `us-004`). This creates a new git worktree on a new branch and
switches the session into it. All following steps run inside that worktree —
the story file path (`$ARGUMENTS`) is the same relative path inside it.

## 2. Implement — dispatch `_teddy`

Dispatch the `_teddy` subagent (Agent tool, `subagent_type: "_teddy"`) with
the story file path. Wait for it to finish and report which ACs are covered,
what files it created/changed, and that its test suite passes.

## 3. Verify — dispatch `_qa`

Dispatch the `_qa` subagent (`subagent_type: "_qa"`) against the same story
file. `_qa` records its verdict in the story's own YAML frontmatter
(`qa_status: passing|bug`, plus a `bugs:` list on failure) — read the
frontmatter back after it reports to see the verdict rather than trusting
only its prose summary.

## 4. Branch on the verdict

### 4.a — bugs found

If `qa_status: bug` (any entries under `bugs:`):

1. Dispatch `_buzz` (`subagent_type: "_buzz"`) once per distinct bug entry
   (or batched, if `_buzz` can take the whole list at once) — point it at the
   story file and the specific `bugs:` entry/entries. Per `_buzz`'s own
   workflow this means: create the bug doc, reproduce, fix with TDD, then
   call `_qa` back for a second review — `_buzz` does the `_qa` callback
   itself, so let it.
2. After `_buzz` reports back, re-read the story frontmatter for the fresh
   `qa_status`.
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
2. Commit the work in the worktree: the implementation, tests, story
   frontmatter update, and any bug docs/fixes from step 4.a. Write a commit
   message naming the story (slug + title).
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
