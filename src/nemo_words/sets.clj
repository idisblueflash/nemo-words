(ns nemo-words.sets
  "Read/write nemo-words.sets/lexical-sets.edn — the keyword -> word-list
  lookup table built by US-004's build-set and US-006's extend-set."
  (:require [clojure.edn :as edn]
            [clojure.java.io :as io]
            [nemo-words.strutil :as strutil]))

(def default-path
  "Default location of the lexical-sets lookup table."
  "resources/lexical-sets.edn")

(defn load!
  "path (default default-path) -> lexical-sets map read from path, or nil if
  the file doesn't exist yet (distinct from {}, which is a valid empty map
  a caller might otherwise mistake for \"not built\").

  Example:
    (load!) ;=> {\"nurse\" {:rp \"/ɜː/\" :ga \"/ɜr/\" :words [\"bird\" \"word\"]}}
    (load! \"no/such/file.edn\") ;=> nil"
  ([] (load! default-path))
  ([path]
   (when (.exists (io/file path))
     (edn/read-string (slurp path)))))

(defn upsert
  "lexical-sets (map) + keyword + rows (word list) -> lexical-sets', with
  keyword's entry replaced by rows (created if missing) and every other
  entry left untouched.

  Example:
    (upsert {\"trap\" [\"cat\"]} \"nurse\" [\"bird\" \"word\"])
    ;=> {\"trap\" [\"cat\"], \"nurse\" [\"bird\" \"word\"]}"
  [lexical-sets keyword rows]
  (assoc lexical-sets keyword rows))

(defn pick-by-ga
  "lexical-sets (map keyword -> {:rp :ga :words}) + query (an IPA string) ->
  vector of {:keyword :rp :ga :words} maps for every entry whose :ga
  contains query as a substring, in lexical-sets' iteration order. No
  matches -> [].

  Example:
    (pick-by-ga {\"lettER\" {:rp \"ə\" :ga \"əɹ\" :words [\"paper\"]}
                 \"commA\" {:rp \"ə\" :ga \"ə\" :words [\"quota\"]}}
                \"ə\")
    ;=> [{:keyword \"lettER\" :rp \"ə\" :ga \"əɹ\" :words [\"paper\"]}
         {:keyword \"commA\" :rp \"ə\" :ga \"ə\" :words [\"quota\"]}]"
  [lexical-sets query]
  (into []
        (comp (filter (fn [[_ row]] (strutil/includes-str? (:ga row) query)))
              (map (fn [[keyword row]] (assoc row :keyword keyword))))
        lexical-sets))

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
