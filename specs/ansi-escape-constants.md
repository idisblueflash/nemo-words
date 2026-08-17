# Spec: name the ANSI escape codes in `ipa.clj`

## Problem
`src/nemo_words/ipa.clj` embeds raw ANSI escape sequences (`\033[1m`,
`\033[2m`, `\033[0m`) inline in three places to bold the word header and
dim the "(no entry)" / "[no stress marks]" notes. These magic strings
are hard to read and their meaning isn't obvious at the call site.

## Change
Add three private constants near the top of the "main" section (above
`fmt`, around line 136):

```clojure
(def ^:private bold-start-text "\033[1m")
(def ^:private faint-start-text "\033[2m")
(def ^:private reset-color-text "\033[0m")
```

Replace each raw-escape usage:

- `fmt` (line 141): `"\033[2m(no entry)\033[0m"` →
  `(str faint-start-text "(no entry)" reset-color-text)`
- `-main` (line 156): `(str "\n\033[1m" word "\033[0m")` →
  `(str "\n" bold-start-text word reset-color-text)`
- `-main` (line 158): `"  \033[2m[no stress marks]\033[0m"` →
  `(str "  " faint-start-text "[no stress marks]" reset-color-text)`

No other files reference these escape codes — they only appear in
`ipa.clj`.

## Verification
```
clj -M -m nemo-words.ipa test
```
Confirm the word header still renders bold and the "(no entry)" /
"[no stress marks]" notes still render dim in the terminal.
