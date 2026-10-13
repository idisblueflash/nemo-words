---
id: C-021
type: concept
status: active
aliases: [step CLI, step]
related: [C-020, C-007]
---
# C-021 Step contract

**Meaning:** The rules that every pipeline step follows. It is one Node script. Its result goes to stdout, with tabs between fields. Notes go to stderr. Exit 0 is ok, 1 is a clean stop, and 2 is an error. A long input is passed as a file path.
**Example:** `find-keywords ˈdʒɝ.ˈmeɪn` prints `dʒɝ\t-` and `meɪn\tmain\t…` and exits 0.
