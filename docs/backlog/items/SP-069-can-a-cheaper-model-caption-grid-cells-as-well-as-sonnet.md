---
id: SP-069
type: spike
parent: E01
status: ready
timebox: 1d
depends_on: [SP-066]
---
# SP-069 Can a cheaper model caption the grid cells as well as Sonnet?

**Question:** Does Claude Haiku or a local vision model on LM Studio caption each cell of a 3×3 grid about as well as Sonnet, when Claude Opus judges the captions?

**Why now:** SP-066 captions each of the 9 cells of a grid with Sonnet, so the image pick costs 9 Sonnet calls per word. US-030 and US-034 need a cheaper way to do this.

## Done when
- For each model (round 1: Haiku and `qwen/qwen3-vl-4b`), Opus's mean caption score next to Sonnet's on the same 180 cells (the 20 SP-066 tuning grids × 9), in total and for each caption part: must-see marks, size and place, action line, drawing errors, onlookers, main-subject view.
- For each model, how many of its 180 captions parse, and how many objects it names that the cell doesn't show.
- For each model, the cost per grid (Haiku: from its token counts) or the time per grid (a local model).
- Go / no-go for each model: go when its mean score is at least 90% of Sonnet's and at least 95% of its captions parse (ADR-0043).

## Approach
- Reuse SP-066 as it is: the 20 tuning grids, their must-see lists, the cell crops and the caption prompt (`spikes/sp-066/lib/caption.js`). Sonnet's captions come from `spikes/sp-066/raw/captions.json` with no new calls. A cached caption counts only when its `promptKey` matches the current prompt.
- Haiku: the same `claude -p` call as SP-066, with `--model haiku`.
- A local model: the same prompt text, with the cell image as base64 in the request body, sent to LM Studio on the Mac mini (`http://SMTVs-Mac-mini-2.local:1234/v1/chat/completions`, OpenAI-compatible). Use `paper-degist`'s transport rule (`ocr_page.py`): post the JSON body with `curl --data @body.json`, one request at a time, and wait and retry on a 502. Never post with Python's `urllib`, because it takes the MLX vision worker down. The answer goes through SP-066's `parseCaption`; an answer that doesn't parse counts as a failed caption, and it is not repaired.
- Opus judges each caption alone (ADR-0044): `claude -p --model opus` sees the cell image, the must-see list and one caption, but not the model's name. It scores each caption part 1–3 and lists the objects that the caption names but the cell doesn't show. Each judgment is cached by cell and model.
- The run takes a model list and a grid limit or grid list, and a re-run reuses its cached captions and judgments, so round 2 (`phi-3.5-vision`, `llama-3.2-vision`, still downloading) pays only for the new models.
- Leave out: the Jev pick, a prompt for each model, tests and clean-up. Code goes under `spikes/sp-069/`.

## Staged run
- **Cases:** 180 cells (20 grids); each model makes 180 captions, and Opus makes 180 judgments for each model plus 180 for Sonnet's captions. There is no prompt tuning, so there is no measure set held back.
- **Stages:** 1 → 3 → 5 → 20 grids, `qwen/qwen3-vl-4b` first, then Haiku; round 2 adds the new local models with the same stages.
- **Early picks:** one SP-066 hit, one word with a name sign, one word whose cells have drawing errors or onlookers in Sonnet's captions.
- **Check after each stage:** answers parse; a re-run makes no new calls; Opus gives Sonnet's captions scores that differ between cells; the local model's time per cell.
- **Stop for design if:** a local model can't give the caption's JSON shape in most cells; Opus gives almost every caption the same score; Opus scores Sonnet's captions low in most cells, so the judge prompt, not the models, is wrong.

## Open questions
- [ ] Opus is one judge, run once; its scores have their own noise.
- [ ] A small local model may need a shorter prompt to give the JSON shape. This spike uses SP-066's prompt only, so a "no" can mean "no with this prompt".
- [ ] The local models run with LM Studio's default settings (context length, quantization).
