(ns nemo-words.pairs
  "Reduce a row's RP/GA cells to the vowel nucleus fragment matching a
  target GA pattern, so dominance tallies (US-007) compare like-for-like
  fragments instead of whole-word transcriptions (see US-013)."
  (:require [clojure.string :as str]
            [nemo-words.strutil :as strutil]))

(def ^:private comma-splitter #",")
(def ^:private dot-splitter #"\.")

(defn- strip-slashes
  "Strip leading/trailing '/' delimiters from an IPA transcription.

  Example:
    (strip-slashes \"/kæt/\") ;=> \"kæt\""
  [s]
  (strutil/replace-str s #"^/+|/+$" ""))

(defn- variants
  "Split a raw (possibly comma-joined, slash-delimited) cell into trimmed,
  slash-stripped variant strings.

  Example:
    (variants \"/ˈnɑː.li/\") ;=> [\"ˈnɑː.li\"]
    (variants \"/ˈfɑːðɚ/, /ˈnɑɹ.li/\") ;=> [\"ˈfɑːðɚ\" \"ˈnɑɹ.li\"]"
  [cell]
  (mapv (comp strip-slashes strutil/trim-str) (strutil/split-str cell comma-splitter)))

(defn- syllables
  "Split one variant into its dot-delimited syllable segments.

  Example:
    (syllables \"ˈnɑː.li\") ;=> [\"ˈnɑː\" \"li\"]"
  [variant]
  (strutil/split-str variant dot-splitter))

;; Onset/coda consonants stripped by nucleus-trim. ɹ is deliberately
;; excluded so a rhotic vowel like "ɑɹ" isn't stripped as a coda. Listed
;; longest-first so multi-character clusters (tʃ, dʒ) match before their
;; single-character prefixes.
(def ^:private consonants
  ["tʃ" "dʒ" "p" "b" "t" "d" "k" "ɡ" "f" "v" "θ" "ð" "s" "z" "ʃ" "ʒ" "h"
   "m" "n" "ŋ" "l" "w" "j"])

(defn- drop-stress
  "Drop leading primary/secondary stress marks (ˈ/ˌ) from a segment.

  Example:
    (drop-stress \"ˈnɑɹ\") ;=> \"nɑɹ\""
  [segment]
  (strutil/replace-str segment #"^[ˈˌ]+" ""))

(defn- trim-leading-consonants
  "Repeatedly strip a leading onset consonant (per `consonants`) from s.

  Example:
    (trim-leading-consonants \"nɑɹ\") ;=> \"ɑɹ\""
  [s]
  (loop [s s]
    (if-let [match (first (filter #(str/starts-with? s %) consonants))]
      (recur (subs s (count match)))
      s)))

(defn- trim-trailing-consonants
  "Repeatedly strip a trailing coda consonant (per `consonants`) from s.

  Example:
    (trim-trailing-consonants \"ɑɹt\") ;=> \"ɑɹ\""
  [s]
  (loop [s s]
    (if-let [match (first (filter #(str/ends-with? s %) consonants))]
      (recur (subs s 0 (- (count s) (count match))))
      s)))

(defn- nucleus-trim
  "Drop leading stress marks, then trim leading/trailing onset/coda
  consonants from a single syllable segment, leaving just the nucleus
  (vowel, plus any rhotic ɹ that colors it).

  Example:
    (nucleus-trim \"ˈnɑɹ\")  ;=> \"nɑɹ\" -> after trim -> \"ɑɹ\"
    (nucleus-trim \"tɑɹt\") ;=> \"ɑɹ\""
  [segment]
  (-> segment
      drop-stress
      trim-leading-consonants
      trim-trailing-consonants))

(defn extract-nucleus
  "One row's raw :rp/:ga cell text plus the target-ga substring that
  matched it -> [rp-nucleus ga-nucleus], or nil if no aligned pair can be
  found.

  Example:
    (extract-nucleus \"/ˈnɑː.li/\" \"/ˈnɑɹ.li/\" \"/ɑɹ/\") ;=> [\"ɑː\" \"ɑɹ\"]"
  [rp ga target-ga]
  (let [target (strip-slashes target-ga)
        ga-variant (first (filter #(strutil/includes-str? % target)
                                   (variants ga)))]
    (when ga-variant
      (let [ga-segs (syllables ga-variant)
            idx (first (keep-indexed (fn [i seg] (when (strutil/includes-str? seg target) i))
                                      ga-segs))
            ga-syll-count (count ga-segs)
            rp-variant (first (filter #(= (count (syllables %)) ga-syll-count)
                                       (variants rp)))]
        (when (and idx rp-variant)
          [(nucleus-trim (nth (syllables rp-variant) idx))
           (nucleus-trim (nth ga-segs idx))])))))

(defn- tally-pairs
  "Rows (`{:word :rp :ga}`) plus target-ga -> a seq of `[pair count]`
  entries, sorted by count descending, ties broken by first-occurrence
  order of the pair in `triples`. Rows where extract-nucleus returns nil
  contribute nothing."
  [triples target-ga]
  (let [pairs (keep #(extract-nucleus (:rp %) (:ga %) target-ga) triples)
        order (into {} (map-indexed (fn [i p] [p i]) (distinct pairs)))
        counts (frequencies pairs)]
    (sort-by (fn [[p n]] [(- n) (order p)]) counts)))

(defn pair-distribution
  "Rows (`{:word :rp :ga}`) plus target-ga -> `[{:pair :count :pct} ...]`,
  the full tally of `[rp-nucleus ga-nucleus]` fragment pairings across all
  matches, sorted by count descending (ties broken by first-occurrence
  order in `triples`). Returns `[]` when nothing can be tallied.

  Example:
    (pair-distribution [{:word \"car\" :rp \"/kɑː/\" :ga \"/kɑɹ/\"}] \"/ɑɹ/\")
    ;=> [{:pair [\"ɑː\" \"ɑɹ\"] :count 1 :pct 100}]"
  [triples target-ga]
  (let [tallied (tally-pairs triples target-ga)
        total (reduce + (map second tallied))]
    (mapv (fn [[p n]]
            {:pair p :count n :pct (int (Math/round (* 100.0 (/ n total))))})
          tallied)))

(defn dominant-pair
  "Rows (`{:word :rp :ga}`) plus target-ga -> the single highest-percentage
  `[rp-nucleus ga-nucleus]` pairing, or nil when nothing can be tallied.

  Example:
    (dominant-pair [{:word \"car\" :rp \"/kɑː/\" :ga \"/kɑɹ/\"}] \"/ɑɹ/\")
    ;=> [\"ɑː\" \"ɑɹ\"]"
  [triples target-ga]
  (-> (pair-distribution triples target-ga) first :pair))
