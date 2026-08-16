(ns nemo-words.ipa
  "Cross-reference IPA lookup across three open US-English sources.

  The point of cross-referencing: when several independent sources AGREE on a
  transcription you can trust it as a \"perfect match\" anchor; when they
  DISAGREE that is the signal to slow down and inspect (dialect variants,
  careful vs. reduced forms). No single source is right for every word:

    1. ipa-dict   data/en_US.txt            open-dict-data (Wiktionary-derived),
                                             full IPA WITH stress; thin on medical.
    2. WikiPron   data/wikipron_us_broad.tsv Wiktionary scrape — best rare/medical
                                             coverage, lists variants, but NO stress.
    3. CMUdict    data/cmudict.dict         CMU, ARPABET->IPA here, HAS stress;
                                             thin on medical.

  All three sources are curated (human-checked).

  Usage:
    clj -M -m nemo-words.ipa <word> [<word> ...]"
  (:require [clojure.java.io :as io]
            [nemo-words.strutil :as strutil]))

;; --------------------------------------------------------- ARPABET -> IPA (US)
;; Base phoneme map. Vowels that carry an ARPABET stress digit are handled in
;; arpabet->ipa so we can (a) render ER0 as ɚ vs ER1/2 as ɝ, (b) render AH0 as
;; the schwa ə, and (c) place the IPA stress mark before the stressed vowel.
(def ^:private arpabet-phoneme->ipa
  {"AA" "ɑ" "AE" "æ" "AH" "ʌ" "AO" "ɔ" "AW" "aʊ" "AY" "aɪ"
   "B" "b" "CH" "tʃ" "D" "d" "DH" "ð" "EH" "ɛ" "ER" "ɝ"
   "EY" "eɪ" "F" "f" "G" "ɡ" "HH" "h" "IH" "ɪ" "IY" "i"
   "JH" "dʒ" "K" "k" "L" "l" "M" "m" "N" "n" "NG" "ŋ"
   "OW" "oʊ" "OY" "ɔɪ" "P" "p" "R" "ɹ" "S" "s" "SH" "ʃ"
   "T" "t" "TH" "θ" "UH" "ʊ" "UW" "u" "V" "v" "W" "w"
   "Y" "j" "Z" "z" "ZH" "ʒ"})

(def ^:private arpabet-vowels
  #{"AA" "AE" "AH" "AO" "AW" "AY" "EH" "ER"
    "EY" "IH" "IY" "OW" "OY" "UH" "UW"})

(defn arpabet->ipa
  "['F' 'L' 'IH0' 'B' ...] -> IPA string with stress marks placed before the
  stressed vowel. ARPABET stress digit: 1=primary (ˈ), 2=secondary (ˌ), 0=none."
  [tokens]
  (apply str
         (for [tok tokens
               :let [has-digit? (and (seq tok) (contains? #{\0 \1 \2} (last tok)))
                     base (if has-digit? (subs tok 0 (dec (count tok))) tok)
                     digit (when has-digit? (str (last tok)))]]
           (if (and has-digit? (contains? arpabet-vowels base))
             (cond
               (and (= base "AH") (= digit "0")) "ə"
               (and (= base "ER") (= digit "0")) "ɚ"
               (= digit "1") (str "ˈ" (get arpabet-phoneme->ipa base base))
               (= digit "2") (str "ˌ" (get arpabet-phoneme->ipa base base))
               :else (get arpabet-phoneme->ipa base base))
             (get arpabet-phoneme->ipa base base)))))

;; ------------------------------------------------------------- source loaders
(defn- resource-reader [path]
  (some-> (io/resource path) io/reader))

(defn- strip-slashes [s]
  (strutil/replace-str s #"^/+|/+$" ""))

(defn- add-variants [acc word variants]
  (if (and (seq word) (seq variants))
    (update acc word (fnil into []) variants)
    acc))

(defn- dedupe-vals [m]
  (into {} (for [[k v] m] [k (vec (distinct v))])))

(defn load-ipa-dict
  "word -> [variant, ...] (full IPA, slashes stripped, stress kept)."
  []
  (if-let [rdr (resource-reader "data/en_US.txt")]
    (with-open [r rdr]
      (->> (line-seq r)
           (reduce
            (fn [acc line]
              (let [parts (strutil/split-str line #"\t" 2)]
                (if (< (count parts) 2)
                  acc
                  (let [word (strutil/lower-case-str (strutil/trim-str (first parts)))
                        variants (->> (strutil/split-str (second parts) #",")
                                      (map #(strip-slashes (strutil/trim-str %)))
                                      (remove strutil/blank-str?))]
                    (add-variants acc word variants)))))
            {})
           dedupe-vals))
    {}))

(defn load-wikipron
  "word -> [variant, ...]. Source is space-separated phonemes, NO stress; we
  join them into a compact string. Multiple lines per word = variants."
  []
  (if-let [rdr (resource-reader "data/wikipron_us_broad.tsv")]
    (with-open [r rdr]
      (->> (line-seq r)
           (reduce
            (fn [acc line]
              (let [parts (strutil/split-str line #"\t" 2)]
                (if (< (count parts) 2)
                  acc
                  (let [word (strutil/lower-case-str (strutil/trim-str (first parts)))
                        ipa (apply str (strutil/split-str (strutil/trim-str (second parts)) #"\s+"))]
                    (add-variants acc word (when (seq ipa) [ipa]))))))
            {})
           dedupe-vals))
    {}))

(defn load-cmudict
  "word -> [IPA variant, ...], converted from ARPABET. Variant markers like
  'word(2)' are folded into the base word."
  []
  (if-let [rdr (resource-reader "data/cmudict.dict")]
    (with-open [r rdr]
      (->> (line-seq r)
           (reduce
            (fn [acc raw-line]
              (let [line (strutil/trim-str (first (strutil/split-str raw-line #"#" 2)))]
                (if (strutil/blank-str? line)
                  acc
                  (let [parts (strutil/split-str line #"\s+")
                        head (first parts)
                        tokens (rest parts)
                        word (strutil/lower-case-str (strutil/trim-str (first (strutil/split-str head #"\(" 2))))]
                    (add-variants acc word (when (seq tokens) [(arpabet->ipa tokens)]))))))
            {})
           dedupe-vals))
    {}))

;; ----------------------------------------------------------------------- main
(defn- fmt
  ([variants] (fmt variants 3))
  ([variants cap]
   (if (empty? variants)
     "\033[2m(no entry)\033[0m"
     (let [shown (take cap variants)
           extra (when (> (count variants) cap)
                   (str "  (+" (- (count variants) cap) " more)"))]
       (str (strutil/join-str "  " (map #(str "/" % "/") shown)) extra)))))

(defn -main [& args]
  (let [words args]
    (if (empty? words)
      (println "Usage: clj -M -m nemo-words.ipa <word> [<word> ...]")
      (let [idict (load-ipa-dict)
            wiki (load-wikipron)
            cmu (load-cmudict)]
        (doseq [word words]
          (let [w (strutil/lower-case-str (strutil/trim-str word))]
            (println (str "\n\033[1m" word "\033[0m"))
            (println (str "  ipa-dict  : " (fmt (get idict w []))))
            (println (str "  wikipron  : " (fmt (get wiki w [])) "  \033[2m[no stress marks]\033[0m"))
            (println (str "  cmudict   : " (fmt (get cmu w []))))))
        (println)))))
