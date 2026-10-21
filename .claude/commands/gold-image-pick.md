---
description: Start the labeling page for the image-pick gold set (scripts/gold-image-pick.js), or print its report
argument-hint: "[report | --round N]"
---

Run the image-pick gold set app (`scripts/gold-image-pick.js`, documented in
`data/gold/image-pick/README.md`). The app is a local page where Flash gives a mark to
every cell of _vivian's 3×3 grids: `best`, `ok`, `weak` or `wrong`. Each change is
saved at once to `data/gold/image-pick/labels.json` (round 1) or `labels.r<N>.json`.

Read `$ARGUMENTS`:

- **Empty** — start the labeling page for round 1.
- **`--round N`** (N = 2, 3, …) — start the page for round N, to label the grids again
  for self-agreement.
- **`report`** — print the report instead of starting the page.
- Anything else — tell Flash which arguments the command takes, and stop.

## Start the page

1. Check whether port 8791 is already in use: `lsof -nP -iTCP:8791 -sTCP:LISTEN`.
   If a server is already running, don't start a second one. Tell Flash the URL and
   what is running on the port. If it is the gold-set page for a different round, ask
   Flash before you stop it.
2. Start the server in the background (`run_in_background: true`), so that it keeps
   running after this turn:

   ```bash
   node scripts/gold-image-pick.js            # round 1
   node scripts/gold-image-pick.js --round N  # round N
   ```

3. When the server prints its first line, open the page with `open http://localhost:8791`.
4. Tell Flash the URL, the round, and the labels file that the page writes to. Say how
   to stop the server (ask Claude to stop it, or press Ctrl+C if Flash ran it).

The grid PNGs are gitignored. The script reads them from `images/mnemonic/`, or from the
main checkout when it runs in a worktree. If the page shows no images, check that
`images/mnemonic/*.grid.png` exists, or set `GOLD_IMG_DIR`.

## Print the report

```bash
node scripts/gold-image-pick.js report
```

Show the output as it is. Then say in one or two plain sentences what it means: how
many grids have labels, and whether any labels are not complete.

Write to Flash in the plain style that `CLAUDE.md` describes.
