# Spec: extract `print-word` from `-main`

## Problem
`-main` in `src/nemo_words/ipa.clj` inlines the per-word printing logic
directly inside its `doseq`:

```clojure
(let [w (clean-word word)]
  (println (str "\n\033[1m" word "\033[0m"))
  (println (str "  ipa-dict  : " (fmt (get idict w []))))
  (println (str "  wikipron  : " (fmt (get wiki w [])) "  \033[2m[no stress marks]\033[0m"))
  (println (str "  cmudict   : " (fmt (get cmu w [])))))
```

Extracting this into its own function separates "print one word's
results" from "loop over all requested words."

## Change
Depends on [ansi-escape-constants](ansi-escape-constants.md) — this spec
uses `bold-start-text`, `faint-start-text`, `reset-color-text` from that
spec so the two compose into one final file. If implemented alone, fall
back to the raw `\033[...]m` escapes.

Add a private `print-word` function (near `fmt`, before `-main`):

```clojure
(defn- print-word [word idict wiki cmu]
  (let [w (clean-word word)]
    (println (str "\n" bold-start-text word reset-color-text))
    (println (str "  ipa-dict  : " (fmt (get idict w []))))
    (println (str "  wikipron  : " (fmt (get wiki w []))
                  "  " faint-start-text "[no stress marks]" reset-color-text))
    (println (str "  cmudict   : " (fmt (get cmu w []))))))
```

It takes the word plus the three already-loaded dicts (`idict`, `wiki`,
`cmu`) — no re-loading; `-main` still loads each dict exactly once.

`-main` becomes:

```clojure
(defn -main [& args]
  (let [words args]
    (if (empty? words)
      (println "Usage: clj -M -m nemo-words.ipa <word> [<word> ...]")
      (let [idict (load-ipa-dict)
            wiki (load-wikipron)
            cmu (load-cmudict)]
        (doseq [word words]
          (print-word word idict wiki cmu))
        (println)))))
```

## Verification
```
clj -M -m nemo-words.ipa test another
```
Confirm output for multiple words is unchanged from before the
extraction (same formatting, same per-word blocks).
