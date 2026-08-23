(ns nemo-words.build-set
  "Register an existing lexical set's hand-picked seed words into
  lexical-sets.edn, re-verifying each against the current dict (US-004)."
  (:require [clojure.edn :as edn]
            [clojure.java.io :as io]
            [nemo-words.ipa :as ipa]
            [nemo-words.sets :as sets]))

(defn- load-sets
  "path -> lexical-sets map read from path, or {} if path doesn't exist yet."
  [path]
  (if (.exists (io/file path))
    (edn/read-string (slurp path))
    {}))

(defn build-set
  "dict + keyword + rp + ga + words (+ optional path, default
  sets/default-path) -> filters words down to only those that still
  word-matches? rp/ga in dict, upserts keyword -> {:rp :ga :words filtered}
  into the lexical-sets map loaded from path, and saves it back.

  Example:
    (build-set dict \"nurse\" \"/ɜː/\" \"/ɜr/\" [\"hurt\" \"lurk\"])
    ;; writes lexical-sets.edn with \"nurse\" -> {:rp \"/ɜː/\" :ga \"/ɜr/\"
    ;;                                            :words [\"hurt\" \"lurk\"]}"
  ([dict keyword rp ga words] (build-set dict keyword rp ga words sets/default-path))
  ([dict keyword rp ga words path]
   (let [matched (vec (filter #(ipa/word-matches? dict % rp ga) words))
         updated (sets/upsert (load-sets path) keyword {:rp rp :ga ga :words matched})]
     (sets/save! updated path)
     updated)))
