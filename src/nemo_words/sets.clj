(ns nemo-words.sets
  "Read/write nemo-words.sets/lexical-sets.edn — the keyword -> word-list
  lookup table built by US-004's build-set and US-006's extend-set.")

(def default-path
  "Default location of the lexical-sets lookup table."
  "resources/lexical-sets.edn")

(defn upsert
  "lexical-sets (map) + keyword + rows (word list) -> lexical-sets', with
  keyword's entry replaced by rows (created if missing) and every other
  entry left untouched.

  Example:
    (upsert {\"trap\" [\"cat\"]} \"nurse\" [\"bird\" \"word\"])
    ;=> {\"trap\" [\"cat\"], \"nurse\" [\"bird\" \"word\"]}"
  [lexical-sets keyword rows]
  (assoc lexical-sets keyword rows))

(defn save!
  "Write lexical-sets to path (default-path if omitted) as EDN, creating the
  file if missing and overwriting it if present. Throws on write failure
  (e.g. an unwritable path), leaving any pre-existing file untouched.

  Example:
    (save! {\"nurse\" [\"bird\" \"word\"]})
    ;; writes resources/lexical-sets.edn"
  ([lexical-sets] (save! lexical-sets default-path))
  ([lexical-sets path]
   (spit path (pr-str lexical-sets))))
