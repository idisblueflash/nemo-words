(ns nemo-words.extend-set
  "Build an entirely new lexical set from a GA IPA combination not yet
  covered by lexical-sets.edn (US-006). Thin composition/glue over
  US-007's pairs/dominant-pair, US-010's rank/top-n, US-002's
  freq/annotate-freq, US-009's keyword/pick-keyword and US-011's
  sets/upsert + sets/save! — no new ranking/matching logic here."
  (:require [nemo-words.freq :as freq]
            [nemo-words.ipa :as ipa]
            [nemo-words.keyword :as keyword]
            [nemo-words.pairs :as pairs]
            [nemo-words.rank :as rank]
            [nemo-words.sets :as sets]
            [nemo-words.strutil :as strutil]))

(defn- strip-slashes
  "Strip leading/trailing '/' delimiters from an IPA transcription.

  Example:
    (strip-slashes \"/ɑɹ/\") ;=> \"ɑɹ\""
  [s]
  (strutil/replace-str s #"^/+|/+$" ""))

(defn extend-set
  "dict + lexical-sets (map, already loaded) + ga (+ optional path, default
  sets/default-path) -> finds the dominant RP+GA nucleus pair for ga (US-007),
  re-gathers every dict row whose raw rp/ga cells contain that pair,
  ranks the top 60 by corpus frequency (US-002/US-010), picks a
  representative keyword (US-009), upserts it into lexical-sets and saves
  (US-011). When no dominant pair can be found (nothing in dict matches
  ga at all), prints a message and returns lexical-sets unchanged without
  writing anything.

  Example:
    (extend-set dict {} \"/ɑɹ/\")
    ;; writes lexical-sets.edn with a new \"car\" (or similar) entry"
  ([dict lexical-sets ga] (extend-set dict lexical-sets ga sets/default-path))
  ([dict lexical-sets ga path]
   (let [candidates (ipa/lookup-rows dict {:ga (strip-slashes ga)})]
     (if-let [[rp ga*] (pairs/dominant-pair candidates ga)]
       (let [gathered (freq/annotate-freq (ipa/lookup-rows dict {:pair-substring [rp ga*]}))
             ranked (rank/top-n gathered :freq 60)
             kw (keyword/pick-keyword ranked)
             updated (sets/upsert lexical-sets kw ranked)]
         (sets/save! updated path)
         updated)
       (do
         (println (str "extend-set: no dominant RP+GA pair found for GA " ga))
         lexical-sets)))))
