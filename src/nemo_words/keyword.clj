(ns nemo-words.keyword
  "Pick the representative headword for a newly built lexical set by asking
  the `claude -p` CLI, per Wells' convention (see US-009). Impure — shells
  out to an external process — so the subprocess boundary is isolated in
  `invoke-claude` for tests to stub via `with-redefs`."
  (:require [clojure.java.shell :as shell]
            [clojure.string :as str]))

(defn- prompt-for
  "Build the `claude -p` prompt asking for the single most distinct, easiest
  to recognize headword among `words`, per Wells' lexical-set convention.

  Example:
    (prompt-for [\"car\" \"far\"]) ;=> a string ending in \"car, far\""
  [words]
  (str "Following J.C. Wells' lexical set naming convention, pick the "
       "single most distinct and easiest-to-recognize word from this list "
       "to serve as the representative headword for the set. Reply with "
       "only that one word, exactly as it appears in the list, and "
       "nothing else.\n\nWords: " (str/join ", " words)))

(defn invoke-claude
  "Shell out to `claude -p <prompt>`, returning trimmed stdout. Throws
  ex-info (not silently swallowed) if the process exits non-zero.

  Example:
    (invoke-claude \"pick one: car, far\") ;=> \"car\" (or throws on failure)"
  [prompt]
  (let [{:keys [exit out err]} (shell/sh "claude" "-p" prompt)]
    (if (zero? exit)
      (str/trim out)
      (throw (ex-info "claude -p exited non-zero"
                       {:exit exit :err err})))))

(defn pick-keyword
  "Given the top-60 ranked `rows` (from rank/top-n), ask Claude to choose
  the representative headword and return it. Validates that the answer is
  actually a member of rows' :word values (never an invented word) --
  throws ex-info otherwise. Any error from invoke-claude propagates
  unchanged (not caught/swallowed here).

  Example:
    (with-redefs [invoke-claude (fn [_] \"car\")])
    (pick-keyword [{:word \"car\"} {:word \"far\"}]) ;=> \"car\""
  [rows]
  (let [words (mapv :word rows)
        answer (invoke-claude (prompt-for words))]
    (if (some #{answer} words)
      answer
      (throw (ex-info "claude returned a word not among the candidate rows"
                       {:answer answer :words words})))))
