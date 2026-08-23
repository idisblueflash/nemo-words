(ns nemo-words.rime
  "Coda-position filtering for the seven rhotic Wells Lexical Sets
  (NURSE, NEAR, SQUARE, START, NORTH, FORCE, CURE), per US-012.

  US-001's substring lookup can't distinguish a genuine coda r (car,
  arcan -- belongs in the set) from an onset r that merely happens to
  follow the same vowel sequence (oware, amaro -- a linking/intrusive r
  before the next syllable's vowel, does not belong). coda-match? and
  filter-coda apply a narrow post-filter for that distinction."
  (:require [nemo-words.strutil :as strutil]))

;; IPA vowel characters that can immediately follow a rhotic sound's
;; matched substring. If sound is immediately followed by one of these,
;; the r that closes sound is really the onset of the next syllable
;; (Maximal Onset Principle resyllabification of a single intervocalic
;; consonant) -- not a coda.
(def ^:private vowel-chars
  #{\a \æ \ɑ \ɐ \ɒ \e \ɛ \ɜ \ɝ \ɚ \ə \i \ɪ \o \ɔ \u \ʊ \ʌ})

(defn- match-starts
  "All starting indices where sound occurs as a substring of s.

  Example:
    (match-starts \"kɑɹ\" \"ɑɹ\") ;=> (1)"
  [s sound]
  (loop [from 0 acc []]
    (let [i (strutil/index-of-str s sound from)]
      (if i
        (recur (inc i) (conj acc i))
        acc))))

(defn coda-match?
  "ipa-string + sound -> boolean. True iff sound occurs in ipa-string at a
  position not immediately followed by a vowel character (stress marks,
  syllable dots, consonants, punctuation, and end-of-string all count as
  \"not a vowel\", hence coda). A cell may contain comma-joined variants;
  the row counts if any occurrence in the raw string is coda-position.

  Example:
    (coda-match? \"/kɑɹ/\" \"ɑɹ\")     ;=> true  (word-final r)
    (coda-match? \"/əˈwɑɹi/\" \"ɑɹ\")  ;=> false (r is onset of next syllable)"
  [ipa-string sound]
  (boolean
   (some (fn [start]
           (let [next-idx (+ start (count sound))]
             (or (>= next-idx (count ipa-string))
                 (not (contains? vowel-chars (nth ipa-string next-idx))))))
         (match-starts ipa-string sound))))

(defn filter-coda
  "rows (US-001 lookup-rows result) + ipa-key + sound -> rows, filtered
  down to those where (coda-match? (ipa-key row) sound) is true. Called
  immediately after lookup-rows only when building one of the seven
  rhotic Lexical Sets; non-rhotic sets skip it entirely.

  Example:
    (filter-coda [{:word \"car\" :ga \"/kɑɹ/\"}
                   {:word \"oware\" :ga \"/əˈwɑɹi/\"}]
                  :ga \"ɑɹ\")
    ;=> ({:word \"car\" :ga \"/kɑɹ/\"})"
  [rows ipa-key sound]
  (filter #(coda-match? (get % ipa-key) sound) rows))
