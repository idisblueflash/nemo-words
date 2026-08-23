(ns nemo-words.match
  "Score and rank candidate words by how closely their onset/coda echo a
  target word's own syllable (see US-014), so the mnemonic-story feature
  gets the single best-sounding example instead of an arbitrary one."
  (:require [nemo-words.freq :as freq]
            [nemo-words.ipa :as ipa]
            [nemo-words.pairs :as pairs]))

(defn score
  "target-syllable + candidate-syllable (each {:onset :nucleus :coda}) ->
  0, 1, or 2: +1 when :onset strings are equal, +1 when :coda strings are
  equal AND target-syllable's :coda is non-empty (two words both lacking
  a coda isn't a shared feature worth scoring).

  Example:
    (score {:onset \"n\" :nucleus \"ɑɹ\" :coda \"\"}
           {:onset \"n\" :nucleus \"ɑɹ\" :coda \"\"}) ;=> 1"
  [target-syllable candidate-syllable]
  (+ (if (= (:onset target-syllable) (:onset candidate-syllable)) 1 0)
     (if (and (seq (:coda target-syllable))
              (= (:coda target-syllable) (:coda candidate-syllable)))
       1 0)))

(defn best-candidates
  "dict + target-word + rp/ga (the lexical set pair) -> rows for that pair,
  each annotated with :score (per `score`, comparing onset/coda against
  target-word's own syllable for the pair) and :freq (US-002's
  freq/annotate-freq), sorted by :score desc, ties broken by :freq desc.
  Output only: never reads or writes lexical-sets.edn.

  Example:
    (best-candidates dict \"gnarly\" \"ɑː\" \"ɑɹ\")
    ;=> ({:word \"narwhal\" ... :score 1 :freq ...} {:word \"starlet\" ... :score 0 :freq ...} ...)"
  [dict target-word rp ga]
  (let [target (->> (ipa/lookup-rows dict {:word target-word})
                     first
                     (#(pairs/extract-syllable (:rp %) (:ga %) ga)))]
    (->> (ipa/lookup-rows dict {:rp rp :ga ga})
         (keep (fn [row]
                 (when-let [syll (pairs/extract-syllable (:rp row) (:ga row) ga)]
                   (assoc row :score (score target syll)))))
         freq/annotate-freq
         (sort-by (juxt :score :freq) #(compare %2 %1)))))
