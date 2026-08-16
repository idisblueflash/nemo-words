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
  (:require [nemo-words.ioutil :as ioutil]
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

(defn- arpabet->ipa
  "['F' 'L' 'IH0' 'B' ...] -> IPA string with stress marks placed before the
  stressed vowel. ARPABET stress digit: 1=primary (ˈ), 2=secondary (ˌ), 0=none.

  Example:
    (arpabet->ipa [\"F\" \"L\" \"IH0\" \"B\"]) ;=> \"flɪb\"
    (arpabet->ipa [\"K\" \"AE1\" \"T\"])       ;=> \"kˈæt\""
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
(def ^:private tab-splitter #"\t")
(def ^:private comma-splitter #",")
(def ^:private hash-splitter #"#")
(def ^:private whitespace-splitter #"\s+")
(def ^:private paren-splitter #"\(")

(defn- split-str-by
  "Split s on splitter, a pre-compiled regex reused across many lines to
  avoid re-compiling it per call.

  Example:
    (split-str-by \"a\\tb\\tc\" tab-splitter 2) ;=> [\"a\" \"b\\tc\"]"
  ([s splitter] (strutil/split-str s splitter))
  ([s splitter limit] (strutil/split-str s splitter limit)))

(defn- resource-reader
  "Open a classpath resource as a Reader, or nil if it isn't found.

  Example:
    (resource-reader \"data/en_US.txt\") ;=> #object[java.io.BufferedReader ...]
    (resource-reader \"no/such/file\")   ;=> nil"
  [path]
  (some-> (ioutil/resource-io path) ioutil/reader-io))

(defn- strip-slashes
  "Strip leading/trailing '/' delimiters from an IPA transcription.

  Example:
    (strip-slashes \"/kæt/\") ;=> \"kæt\""
  [s]
  (strutil/replace-str s #"^/+|/+$" ""))

(defn- clean-word
  "Normalize a dictionary headword: trim whitespace, lower-case.

  Example:
    (clean-word \"  Cat \") ;=> \"cat\""
  [s]
  (strutil/lower-case-str (strutil/trim-str s)))

(defn- add-variants
  "Append variants onto acc's vector for word, no-op if either is empty.

  Example:
    (add-variants {} \"cat\" [\"kæt\"]) ;=> {\"cat\" [\"kæt\"]}
    (add-variants {} \"\" [\"kæt\"])    ;=> {}"
  [acc word variants]
  (if (and (seq word) (seq variants))
    (update acc word (fnil into []) variants)
    acc))

(defn- dedupe-vals
  "Remove duplicate entries from each vector value of m, preserving order.

  Example:
    (dedupe-vals {\"cat\" [\"kæt\" \"kæt\" \"khæt\"]}) ;=> {\"cat\" [\"kæt\" \"khæt\"]}"
  [m]
  (into {} (for [[k v] m] [k (vec (distinct v))])))

(defmulti ^:private parse-line
  "One raw line from brand's source -> [word variants]. Dispatched on brand;
  each method knows its own source's line format.

  Example:
    (parse-line :cmudict \"CAT K AE1 T\") ;=> [\"cat\" (\"kˈæt\")]"
  (fn [brand _line] brand))

;; :ipa-dict line -> [word variants]. Full IPA, slashes stripped, stress
;; kept; variants are comma-separated.
;; (parse-line :ipa-dict "cat\t/kˈæt/, /kæt/") ;=> ["cat" ("kˈæt" "kæt")]
(defmethod parse-line :ipa-dict
  [_ line]
  (let [parts (split-str-by line tab-splitter 2)]
    (if (< (count parts) 2)
      [nil nil]
      [(clean-word (first parts))
       (->> (split-str-by (second parts) comma-splitter)
            (map #(strip-slashes (strutil/trim-str %)))
            (remove strutil/blank-str?))])))

;; :wikipron line -> [word variants]. Source is space-separated phonemes,
;; NO stress; joined into a compact string.
;; (parse-line :wikipron "cat\tk æ t") ;=> ["cat" ("kæt")]
(defmethod parse-line :wikipron
  [_ line]
  (let [parts (split-str-by line tab-splitter 2)]
    (if (< (count parts) 2)
      [nil nil]
      (let [word (clean-word (first parts))
            ipa (apply str (split-str-by (strutil/trim-str (second parts)) whitespace-splitter))]
        [word (when (seq ipa) [ipa])]))))

;; :cmudict line -> [word variants], converted from ARPABET. Trailing
;; '# comment' is dropped; variant markers like 'word(2)' fold into the
;; base word.
;; (parse-line :cmudict "CAT K AE1 T") ;=> ["cat" ("kˈæt")]
(defmethod parse-line :cmudict
  [_ raw-line]
  (let [line (strutil/trim-str (first (split-str-by raw-line hash-splitter 2)))]
    (if (strutil/blank-str? line)
      [nil nil]
      (let [parts (split-str-by line whitespace-splitter)
            head (first parts)
            tokens (rest parts)]
        [(clean-word (first (split-str-by head paren-splitter 2)))
         (when (seq tokens) [(arpabet->ipa tokens)])]))))

(def ^:private brand->resource
  "Per-brand classpath resource path, dispatched by load-dictionary-by-brand."
  {:ipa-dict "data/en_US.txt"
   :wikipron "data/wikipron_us_broad.tsv"
   :cmudict "data/cmudict.dict"})

(defn load-dictionary-by-brand
  "brand (:ipa-dict, :wikipron, or :cmudict) -> word -> [variant, ...].

  Example:
    (load-dictionary-by-brand :cmudict) ;=> {\"cat\" [\"kˈæt\"], \"read\" [\"ɹˈid\" \"ɹˈɛd\"], ...}"
  [brand]
  (if-let [rdr (resource-reader (brand->resource brand))]
    (with-open [r rdr]
      (->> (line-seq r)
           (reduce
            (fn [acc line]
              (let [[word variants] (parse-line brand line)]
                (add-variants acc word variants)))
            {})
           dedupe-vals))
    {}))

;; ----------------------------------------------------------------------- main
(def ^:private bold-start-text "\033[1m")
(def ^:private faint-start-text "\033[2m")
(def ^:private reset-color-text "\033[0m")

(defn- fmt
  "Render up to cap variants as slash-delimited IPA, noting how many more
  exist beyond cap, or a faint '(no entry)' placeholder when empty.

  Example:
    (fmt [\"kæt\" \"khæt\"])           ;=> \"/kæt/  /khæt/\"
    (fmt [\"a\" \"b\" \"c\" \"d\"] 2)  ;=> \"/a/  /b/  (+2 more)\"
    (fmt [])                        ;=> \"\\033[2m(no entry)\\033[0m\""
  ([variants] (fmt variants 3))
  ([variants cap]
   (if (empty? variants)
     (str faint-start-text "(no entry)" reset-color-text)
     (let [shown (take cap variants)
           extra (when (> (count variants) cap)
                   (str "  (+" (- (count variants) cap) " more)"))]
       (str (strutil/join-str "  " (map #(str "/" % "/") shown)) extra)))))

(defn search-word
  "Print one word's cross-referenced entries from all three sources.

  Example:
    (search-word \"cat\" idict wiki cmu)
    ;; prints:
    ;; cat
    ;;   ipa-dict  : /kˈæt/
    ;;   wikipron  : /kæt/  [no stress marks]
    ;;   cmudict   : /kˈæt/"
  [word idict wiki cmu]
  (let [w (clean-word word)]
    (println (str "\n" bold-start-text word reset-color-text))
    (println (str "  ipa-dict  : " (fmt (get idict w []))))
    (println (str "  wikipron  : " (fmt (get wiki w []))
                  "  " faint-start-text "[no stress marks]" reset-color-text))
    (println (str "  cmudict   : " (fmt (get cmu w []))))))

(defn -main
  "Entry point: look up each word arg across all three sources and print
  the cross-referenced IPA transcriptions.

  Example:
    (-main \"cat\" \"dog\")
    ;; or from the shell:
    ;;   clj -M -m nemo-words.ipa cat dog"
  [& args]
  (let [words args]
    (if (empty? words)
      (println "Usage: clj -M -m nemo-words.ipa <word> [<word> ...]")
      (let [idict (load-dictionary-by-brand :ipa-dict)
            wiki (load-dictionary-by-brand :wikipron)
            cmu (load-dictionary-by-brand :cmudict)]
        (doseq [word words]
          (search-word word idict wiki cmu))
        (println)))))
