(ns nemo-words.ipa
  "Cross-reference IPA lookup across open English-pronunciation sources.

  The point of cross-referencing: when several independent sources AGREE on a
  transcription you can trust it as a \"perfect match\" anchor; when they
  DISAGREE that is the signal to slow down and inspect (dialect variants,
  careful vs. reduced forms). No single source is right for every word:

    1. ipa-dict   data/en_US.txt            open-dict-data (Wiktionary-derived),
                                             full IPA WITH stress; thin on medical.
    2. WikiPron   data/wikipron_us_broad.tsv Wiktionary scrape — best rare/medical
                                             coverage, lists variants, but NO stress.
    3. CMUdict    data/cmudict.dict         CMU, ARPABET->IPA here, HAS stress;
                                             thin on medical. US-only.
    4. ipa-dict UK data/en_UK.txt           open-dict-data, same format as #1 but
                                             Received Pronunciation (non-rhotic).

  All four sources are curated (human-checked).

  Usage:
    clj -M -m nemo-words.ipa <word> [<word> ...]"
  (:require [clojure.string :as str]
            [nemo-words.ioutil :as ioutil]
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

;; Every ARPABET phoneme's IPA rendering is at most 2 codepoints, so the
;; only way two adjacent tokens' renderings can accidentally spell a
;; *different*, unrelated phoneme's rendering is pairwise (a 3+-token
;; span can't collide, since that would require some token to render as
;; the empty string). Exhaustively checked against every base pair in
;; arpabet-phoneme->ipa: exactly these three collide.
(def ^:private colliding-adjacent-bases
  "Adjacent [prev-base base] pairs whose concatenated IPA rendering spells
  the same string as some other, unrelated phoneme (T+SH vs CH, AO+IH vs
  OY, D+ZH vs JH)."
  #{["T" "SH"] ["AO" "IH"] ["D" "ZH"]})

(def ^:private token-boundary-marker
  "Zero-width non-joiner inserted between colliding-adjacent-bases pairs
  so ipa->arpabet's greedy tokenizer can't misread the boundary as a
  different phoneme. Invisible in display; ipa->arpabet's existing
  unrecognized-codepoint skip treats it as a forced token break."
  "‌")

(defn- render-arpabet-token
  "One ARPABET token -> [base ipa-string], stress marks placed before the
  stressed vowel. ARPABET stress digit: 1=primary (ˈ), 2=secondary (ˌ),
  0=none.

  Example:
    (render-arpabet-token \"IH0\")  ;=> [\"IH\" \"ɪ\"]
    (render-arpabet-token \"AE1\")  ;=> [\"AE\" \"ˈæ\"]"
  [tok]
  (let [has-digit? (and (seq tok) (contains? #{\0 \1 \2} (last tok)))
        base (if has-digit? (subs tok 0 (dec (count tok))) tok)
        digit (when has-digit? (str (last tok)))]
    [base
     (if (and has-digit? (contains? arpabet-vowels base))
       (cond
         (and (= base "AH") (= digit "0")) "ə"
         (and (= base "ER") (= digit "0")) "ɚ"
         (= digit "1") (str "ˈ" (get arpabet-phoneme->ipa base base))
         (= digit "2") (str "ˌ" (get arpabet-phoneme->ipa base base))
         :else (get arpabet-phoneme->ipa base base))
       (get arpabet-phoneme->ipa base base))]))

(defn- arpabet->ipa
  "['F' 'L' 'IH0' 'B' ...] -> IPA string with stress marks placed before the
  stressed vowel.

  Example:
    (arpabet->ipa [\"F\" \"L\" \"IH0\" \"B\"]) ;=> \"flɪb\"
    (arpabet->ipa [\"K\" \"AE1\" \"T\"])       ;=> \"kˈæt\""
  [tokens]
  (apply str
         (loop [toks tokens prev-base nil rendered []]
           (if (empty? toks)
             rendered
             (let [[base ipa] (render-arpabet-token (first toks))
                   boundary? (contains? colliding-adjacent-bases [prev-base base])]
               (recur (rest toks)
                      base
                      (conj rendered (if boundary? (str token-boundary-marker ipa) ipa))))))))

;; --------------------------------------------------------- IPA -> ARPABET (US-020)
(def ^:private ipa->arpabet-base
  "IPA symbol -> ARPABET base token, the inverse of arpabet-phoneme->ipa."
  (into {} (map (fn [[base ipa]] [ipa base]) arpabet-phoneme->ipa)))

(def ^:private schwa-ipa "ə")
(def ^:private rhotic-schwa-ipa "ɚ")
(def ^:private primary-stress-ipa "ˈ")
(def ^:private secondary-stress-ipa "ˌ")

(def ^:private ipa-symbols
  "All IPA symbols recognized by the tokenizer, longest first so a
  greedy-longest-match scan splits multi-codepoint symbols (e.g. 'tʃ')
  before falling back to single-codepoint ones."
  (->> (concat (keys ipa->arpabet-base) [schwa-ipa rhotic-schwa-ipa])
       distinct
       (sort-by (comp - count))))

(defn- match-longest-symbol
  "Longest IPA symbol in ipa-symbols matching s starting at pos, or nil.

  Example:
    (match-longest-symbol \"tʃˈɛs\" 0) ;=> \"tʃ\""
  [s pos]
  (some (fn [sym]
          (let [end (+ pos (count sym))]
            (when (and (<= end (count s)) (= sym (subs s pos end)))
              sym)))
        ipa-symbols))

(defn ipa->arpabet
  "IPA string -> ARPABET token vector. Tokenizes greedily against
  arpabet-phoneme->ipa's values (longest match first), re-attaching any
  'ˈ'/'ˌ' immediately preceding a vowel as that vowel token's trailing
  stress digit ('1'/'2'); vowels with no preceding mark get '0'.

  Example:
    (ipa->arpabet \"kˈæt\")   ;=> [\"K\" \"AE1\" \"T\"]
    (ipa->arpabet \"tʃˈɛs\")  ;=> [\"CH\" \"EH1\" \"S\"]
    (ipa->arpabet \"əˈbʌv\")  ;=> [\"AH0\" \"B\" \"AH1\" \"V\"]"
  [ipa]
  (let [len (count ipa)]
    (loop [pos 0 pending-stress nil tokens []]
      (if (>= pos len)
        tokens
        (cond
          (= primary-stress-ipa (subs ipa pos (min len (+ pos 1))))
          (recur (inc pos) "1" tokens)

          (= secondary-stress-ipa (subs ipa pos (min len (+ pos 1))))
          (recur (inc pos) "2" tokens)

          :else
          (if-let [sym (match-longest-symbol ipa pos)]
            (let [base (get ipa->arpabet-base sym)
                  new-pos (+ pos (count sym))]
              (cond
                (= sym schwa-ipa) (recur new-pos nil (conj tokens "AH0"))
                (= sym rhotic-schwa-ipa) (recur new-pos nil (conj tokens "ER0"))
                (contains? arpabet-vowels base)
                (recur new-pos nil (conj tokens (str base (or pending-stress "0"))))
                :else
                (recur new-pos pending-stress (conj tokens base))))
            ;; unrecognized codepoint: skip it defensively rather than error
            (recur (inc pos) pending-stress tokens)))))))

;; ------------------------------------------------------------- MRPA -> IPA (RP, US-021)
;; BEEP's non-rhotic phoneme map. BEEP tokens carry no stress digit at all,
;; so mrpa->ipa is a straight per-token lookup and concatenation.
(def mrpa-phoneme->ipa
  {"aa" "ɑː" "ae" "æ" "ah" "ʌ" "ao" "ɔː" "ax" "ə" "ay" "aɪ" "aw" "aʊ" "b" "b"
   "ch" "tʃ" "d" "d" "dh" "ð" "ea" "ɛə" "eh" "ɛ" "er" "ɜː" "ey" "eɪ" "f" "f"
   "g" "ɡ" "hh" "h" "ia" "ɪə" "ih" "ɪ" "iy" "iː" "jh" "dʒ" "k" "k" "l" "l"
   "m" "m" "n" "n" "ng" "ŋ" "oh" "ɒ" "ow" "əʊ" "oy" "ɔɪ" "p" "p" "r" "ɹ"
   "s" "s" "sh" "ʃ" "sil" "" "t" "t" "th" "θ" "ua" "ʊə" "uh" "ʊ" "uw" "uː"
   "v" "v" "w" "w" "y" "j" "z" "z" "zh" "ʒ"})

(defn mrpa->ipa
  "MRPA token vector -> IPA string. Maps each token through
  mrpa-phoneme->ipa and concatenates; no stress logic needed (BEEP has
  none).

  Example:
    (mrpa->ipa [\"k\" \"aa\"]) ;=> \"kɑː\""
  [tokens]
  (apply str (map #(get mrpa-phoneme->ipa % %) tokens)))

(defn rp-tokens->ipa
  "Raw RP cell-string -> IPA string. Splits on ',' (multi-variant), splits
  each variant on whitespace into MRPA tokens, runs each through
  mrpa->ipa, rejoins variants with ','.

  Example:
    (rp-tokens->ipa \"k aa\") ;=> \"kɑː\"
    (rp-tokens->ipa \"k ea,k eh\") ;=> \"kɛə,kɛ\""
  [cell]
  (->> (strutil/split-str cell #",")
       (map #(mrpa->ipa (strutil/split-str (strutil/trim-str %) #"\s+")))
       (strutil/join-str ",")))

;; Reverse of mrpa-phoneme->ipa (IPA symbol -> MRPA token), for ipa->mrpa's
;; tokenizer. "sil" maps to "" in the forward direction and is excluded
;; here since an empty symbol can't be matched against IPA text.
(def ^:private ipa->mrpa-phoneme
  (into {} (for [[token ipa] mrpa-phoneme->ipa :when (seq ipa)] [ipa token])))

;; IPA symbols to try, longest-first, so e.g. "ɛə" is matched as one
;; token instead of splitting into "ɛ" + a stray "ə".
(def ^:private ipa-symbols-longest-first
  (->> (keys ipa->mrpa-phoneme)
       (sort-by count >)))

(defn ipa->mrpa
  "IPA string -> MRPA token vector. Tokenizes the IPA string greedily
  against mrpa-phoneme->ipa's value set (longest match first), no stress
  mark to strip.

  Example:
    (ipa->mrpa \"kɑː\") ;=> [\"k\" \"aa\"]
    (ipa->mrpa \"kɛə\") ;=> [\"k\" \"ea\"]"
  [ipa-str]
  (loop [s ipa-str
         tokens []]
    (if (empty? s)
      tokens
      (if-let [match (first (filter #(str/starts-with? s %) ipa-symbols-longest-first))]
        (recur (subs s (count match)) (conj tokens (ipa->mrpa-phoneme match)))
        (recur (subs s 1) tokens)))))

;; ------------------------------------------------------------- source loaders
(def ^:private tab-splitter #"\t")
(def ^:private comma-splitter #",")
(def ^:private hash-splitter #"#")
(def ^:private whitespace-splitter #"\s+")
(def ^:private paren-splitter #"\(")

(defn ga-tokens->ipa
  "Raw GA cell string -> IPA string. Splits cell on ',' into variants, each
  variant on whitespace into ARPABET tokens, runs each variant's tokens
  through arpabet->ipa, rejoins variants with ','.

  Example:
    (ga-tokens->ipa \"K AA1 R\")           ;=> \"kˈɑɹ\"
    (ga-tokens->ipa \"R IY1 D,R EH1 D\")   ;=> \"ɹˈid,ɹˈɛd\""
  [cell]
  (->> (strutil/split-str cell comma-splitter)
       (map (fn [variant]
              (arpabet->ipa (strutil/split-str (strutil/trim-str variant) whitespace-splitter))))
       (strutil/join-str ",")))

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

;; Shared by :ipa-dict and :ipa-dict-uk, which use the identical
;; tab-separated "word\t/ipa/, /ipa/, ..." line format.
;; (parse-ipa-dict-line "cat\t/kˈæt/, /kæt/") ;=> ["cat" ("kˈæt" "kæt")]
(defn- parse-ipa-dict-line
  [line]
  (let [parts (split-str-by line tab-splitter 2)]
    (if (< (count parts) 2)
      [nil nil]
      [(clean-word (first parts))
       (->> (split-str-by (second parts) comma-splitter)
            (map #(strip-slashes (strutil/trim-str %)))
            (remove strutil/blank-str?))])))

;; :ipa-dict line -> [word variants]. Full IPA, slashes stripped, stress
;; kept; variants are comma-separated. US (rhotic) pronunciations.
(defmethod parse-line :ipa-dict
  [_ line]
  (parse-ipa-dict-line line))

;; :ipa-dict-uk line -> [word variants]. Same format as :ipa-dict, but
;; Received Pronunciation (non-rhotic) pronunciations.
(defmethod parse-line :ipa-dict-uk
  [_ line]
  (parse-ipa-dict-line line))

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

;; BEEP headword-validity filter — kept inline per US-018's merge-conflict
;; note (avoid a shared top-level def colliding with US-017's CMUdict work).
(def ^:private beep-word-pattern #"^[a-z][a-z'-]*$")

;; :beep-raw line -> [word variants]. BEEP is "WORD<whitespace>phoneme
;; phoneme ...", phonemes MRPA-style lowercase, no stress digits. Phonemes
;; are kept as-is (space-joined), not translated to IPA here — that's
;; US-021's job. Symbol pseudo-words (e.g. !EXCLAMATION-POINT) are excluded.
;; (parse-line :beep-raw "CAR\tk aa") ;=> ["car" ("k aa")]
(defmethod parse-line :beep-raw
  [_ raw-line]
  (let [line (strutil/trim-str raw-line)]
    (if (or (strutil/blank-str? line) (= \# (first line)))
      [nil nil]
      (let [parts (split-str-by line whitespace-splitter)
            word (clean-word (first parts))
            tokens (rest parts)]
        (if (and (re-matches beep-word-pattern word) (seq tokens))
          [word (list (strutil/join-str " " tokens))]
          [nil nil])))))

;; :cmudict-raw line -> [word variants], keeping raw ARPABET tokens (stress
;; digits intact) instead of translating to IPA. Same line format as
;; :cmudict: trailing '# comment' dropped, variant markers like 'word(2)'
;; fold into the base word. Headword filter kept inline (per US-017's
;; merge-conflict note) to avoid a shared top-level def colliding with
;; US-018's BEEP work.
;; (parse-line :cmudict-raw "CAT K AE1 T") ;=> ["cat" ("K AE1 T")]
(defmethod parse-line :cmudict-raw
  [_ raw-line]
  (let [line (strutil/trim-str (first (split-str-by raw-line hash-splitter 2)))]
    (if (strutil/blank-str? line)
      [nil nil]
      (let [parts (split-str-by line whitespace-splitter)
            head (first parts)
            tokens (rest parts)
            word (clean-word (first (split-str-by head paren-splitter 2)))]
        (if (re-matches #"^[a-z][a-z'-]*$" word)
          [word (when (seq tokens) [(strutil/join-str " " tokens)])]
          [nil nil])))))

(def ^:private brand->resource
  "Per-brand classpath resource path, dispatched by load-dictionary-by-brand."
  {:ipa-dict "data/en_US.txt"
   :wikipron "data/wikipron_us_broad.tsv"
   :cmudict "data/cmudict.dict"
   :cmudict-raw "data/cmudict.dict"
   :ipa-dict-uk "data/en_UK.txt"
   :beep-raw "data/beep_uk.dict"})

(defn load-dictionary-by-brand
  "brand (:ipa-dict, :wikipron, :cmudict, or :ipa-dict-uk) -> word -> [variant, ...].

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

;; ------------------------------------------------- GA/RP dict build (US-019)
(defn- comma-join-variants
  "dict + word -> comma-joined variant string, \"\" when word is absent or
  has no variants.

  Example:
    (comma-join-variants {\"read\" [\"R EH1 D\" \"R IY1 D\"]} \"read\") ;=> \"R EH1 D,R IY1 D\"
    (comma-join-variants {} \"missing\") ;=> \"\""
  [dict word]
  (strutil/join-str "," (get dict word [])))

(defn build-ga-rp-rows
  "ga-dict (word -> raw ARPABET variants, e.g. from :cmudict-raw) + rp-dict
  (word -> raw MRPA variants, e.g. from :beep-raw) -> seq of {:word :ga :rp}
  rows, one per word in the union of both dicts' keys. Multi-variant cells
  are comma-joined; a word present in only one source still gets a row with
  \"\" (not omitted) for the missing side. A word is dropped entirely only
  when both the GA and RP cells would be empty.

  Example:
    (build-ga-rp-rows {\"car\" [\"K AA1 R\"]} {\"car\" [\"k aa\"]})
    ;=> ({:word \"car\" :ga \"K AA1 R\" :rp \"k aa\"})"
  [ga-dict rp-dict]
  (->> (into (set (keys ga-dict)) (keys rp-dict))
       sort
       (keep (fn [word]
               (let [ga (comma-join-variants ga-dict word)
                     rp (comma-join-variants rp-dict word)]
                 (when (or (seq ga) (seq rp))
                   {:word word :ga ga :rp rp}))))))

(def default-ga-rp-path
  "Default location of the built GA/RP raw-token TSV."
  "resources/data/ga_rp.tsv")

(defn ga-rp-tsv-lines
  "rows (seq of {:word :ga :rp}) -> seq of tab-joined \"word\\tGA\\tRP\" lines,
  same order as rows.

  Example:
    (ga-rp-tsv-lines [{:word \"car\" :ga \"K AA1 R\" :rp \"k aa\"}])
    ;=> (\"car\\tK AA1 R\\tk aa\")"
  [rows]
  (map (fn [{:keys [word ga rp]}] (strutil/join-str "\t" [word ga rp])) rows))

(defn write-ga-rp-dict!
  "Build rows by unioning :cmudict-raw + :beep-raw (via
  load-dictionary-by-brand) and write them as word<TAB>GA<TAB>RP lines to
  path (default default-ga-rp-path). Returns the number of rows written.

  Example:
    (write-ga-rp-dict!) ;; writes resources/data/ga_rp.tsv, returns row count"
  ([] (write-ga-rp-dict! default-ga-rp-path))
  ([path]
   (let [rows (build-ga-rp-rows (load-dictionary-by-brand :cmudict-raw)
                                 (load-dictionary-by-brand :beep-raw))]
     (spit path (strutil/join-str "\n" (ga-rp-tsv-lines rows)))
     (count rows))))

;; ---------------------------------------------------- GA/RP dict (US-001, renamed US-019)
;; ga_rp.tsv line format: word<TAB>GA-cell<TAB>RP-cell (GA first, then RP;
;; see US-001's "Data reality" note, and US-019's build step). Loaded as raw
;; token strings unchanged (no IPA translation at load) into a thin,
;; format-preserving shape: seq of {:word :ga-tokens :rp-tokens}, "" (not
;; nil) when a cell is empty.
(defn load-ga-rp-dict
  "Load resources/data/ga_rp.tsv (US-019's build step) into a seq of
  {:word :ga-tokens :rp-tokens} rows, or () if the resource isn't found.
  Raw token strings are returned unchanged, no IPA translation.

  Example:
    (load-ga-rp-dict) ;=> ({:word \"car\" :ga-tokens \"K AA1 R\" :rp-tokens \"k aa\"} ...)"
  []
  (if-let [rdr (resource-reader "data/ga_rp.tsv")]
    (with-open [r rdr]
      (->> (line-seq r)
           (keep (fn [line]
                   (let [[word ga rp] (split-str-by line tab-splitter -1)]
                     (when (seq word)
                       {:word (clean-word word)
                        :ga-tokens (or ga "")
                        :rp-tokens (or rp "")}))))
           doall))
    '()))

;; ------------------------------------------------------------ lookup-rows (US-022)
(defn- strip-stress-digits
  "Remove ARPABET stress digits (0/1/2) from a token string, so a query with
  no stress info (an IPA nucleus string carries none) still matches a stored
  token cell whose vowels do carry one -- mirroring the old IPA-text
  substring match, where the stress mark was a separate adjacent character
  and never blocked a match on the phoneme spelling itself.

  Example:
    (strip-stress-digits \"K AA1 R\") ;=> \"K AA R\""
  [s]
  (strutil/replace-str s #"[0-9]" ""))

(defn- ga-query->token-string
  "IPA query string -> ARPABET token string (via ipa->arpabet), stress
  digits stripped for comparison.

  Example:
    (ga-query->token-string \"/ɑɹ/\") ;=> \"AA R\""
  [ipa]
  (strip-stress-digits (strutil/join-str " " (ipa->arpabet ipa))))

(defn- rp-query->token-string
  "IPA query string -> MRPA token string (via ipa->mrpa). BEEP tokens carry
  no stress digit, so there's nothing to strip here.

  Example:
    (rp-query->token-string \"ɛə\") ;=> \"ea\""
  [ipa]
  (strutil/join-str " " (ipa->mrpa ipa)))

;; A row with a :ga-tokens/:rp-tokens key (the shape US-019's load-ga-rp-dict
;; actually produces) is matched in token space; a row still on the
;; pre-US-019 {:word :rp :ga} IPA-text shape (as used by
;; match.clj/extend_set.clj/rime.clj's own test fixtures, out of this
;; story's scope) falls back to the old direct IPA-text match, so neither
;; caller shape regresses.
(defn- ga-field-matches?
  "row + raw IPA query + its ga-query->token-string conversion -> true if
  the query matches row's GA cell (substring, stress-digit-agnostic in
  token space).

  Example:
    (ga-field-matches? {:ga-tokens \"K AA1 R\"} \"/ɑɹ/\" \"AA R\") ;=> true
    (ga-field-matches? {:ga \"/kɑɹ/\"} \"/ɑɹ/\" \"AA R\")          ;=> true"
  [row query token-query]
  (if (contains? row :ga-tokens)
    (strutil/includes-str? (strip-stress-digits (:ga-tokens row)) token-query)
    (strutil/includes-str? (:ga row) query)))

(defn- rp-field-matches?
  "row + raw IPA query + its rp-query->token-string conversion -> true if
  the query matches row's RP cell (substring).

  Example:
    (rp-field-matches? {:rp-tokens \"k ea\"} \"ɛə\" \"ea\") ;=> true
    (rp-field-matches? {:rp \"/kɛə/\"} \"ɛə\" \"ea\")        ;=> true"
  [row query token-query]
  (if (contains? row :rp-tokens)
    (strutil/includes-str? (:rp-tokens row) token-query)
    (strutil/includes-str? (:rp row) query)))

(defn- ga-field-exact-match?
  "Exact-match counterpart of ga-field-matches?, for :pair.

  Example:
    (ga-field-exact-match? {:ga-tokens \"K AA1 R\"} \"/ɑɹ/\" \"AA R\") ;=> false"
  [row query token-query]
  (if (contains? row :ga-tokens)
    (= (strip-stress-digits (:ga-tokens row)) token-query)
    (= (:ga row) query)))

(defn- rp-field-exact-match?
  "Exact-match counterpart of rp-field-matches?, for :pair.

  Example:
    (rp-field-exact-match? {:rp-tokens \"k aa\"} \"kɑː\" \"k aa\") ;=> true"
  [row query token-query]
  (if (contains? row :rp-tokens)
    (= (:rp-tokens row) token-query)
    (= (:rp row) query)))

(defn lookup-rows
  "dict (seq of {:word :ga-tokens :rp-tokens}, per US-019's load-ga-rp-dict)
  + opts -> matching rows.

  opts is one of:
    {:word w}                exact match on :word
    {:rp ipa} / {:ga ipa}    ipa is an IPA-string query exactly as before
                             (US-022): converted once internally via
                             ipa->mrpa/ipa->arpabet into a raw token string,
                             then matched (stress-digit-agnostic on the GA
                             side) as a substring of the row's
                             :rp-tokens/:ga-tokens cell
    {:pair [rp ga]}          exact match on both converted token strings
    {:pair-substring [rp ga]} substring match on :rp-tokens and :ga-tokens
                             independently

  Example:
    (lookup-rows [{:word \"car\" :ga-tokens \"K AA1 R\" :rp-tokens \"k aa\"}] {:word \"car\"})
    ;=> ({:word \"car\" :ga-tokens \"K AA1 R\" :rp-tokens \"k aa\"})"
  [dict opts]
  (cond
    (contains? opts :word)
    (filter #(= (:word %) (:word opts)) dict)

    (contains? opts :rp)
    (let [query (:rp opts)
          token-query (rp-query->token-string query)]
      (filter #(rp-field-matches? % query token-query) dict))

    (contains? opts :ga)
    (let [query (:ga opts)
          token-query (ga-query->token-string query)]
      (filter #(ga-field-matches? % query token-query) dict))

    (contains? opts :pair)
    (let [[rp ga] (:pair opts)
          rp-token-query (rp-query->token-string rp)
          ga-token-query (ga-query->token-string ga)]
      (filter #(and (rp-field-exact-match? % rp rp-token-query)
                    (ga-field-exact-match? % ga ga-token-query))
              dict))

    (contains? opts :pair-substring)
    (let [[rp ga] (:pair-substring opts)
          rp-token-query (rp-query->token-string rp)
          ga-token-query (ga-query->token-string ga)]
      (filter #(and (rp-field-matches? % rp rp-token-query)
                    (ga-field-matches? % ga ga-token-query))
              dict))

    :else '()))

;; --------------------------------------------------------- word-matches? (US-004, US-022)
(defn word-matches?
  "dict + word + rp + ga -> true if word still resolves to a row in dict
  whose GA/RP cell contains rp and ga (as IPA-string queries, matched per
  lookup-rows' :rp/:ga -- token-converted substring for
  {:word :ga-tokens :rp-tokens} rows, direct IPA-text substring for the
  older {:word :rp :ga} shape), false otherwise (including when word isn't
  in dict at all).

  Example:
    (word-matches? [{:word \"car\" :ga-tokens \"K AA1 R\" :rp-tokens \"k aa\"}] \"car\" \"kɑː\" \"/ɑɹ/\")
    ;=> true
    (word-matches? [{:word \"car\" :ga-tokens \"K AA1 R\" :rp-tokens \"k aa\"}] \"car\" \"xxx\" \"/ɑɹ/\")
    ;=> false"
  [dict word rp ga]
  (let [rp-token-query (rp-query->token-string rp)
        ga-token-query (ga-query->token-string ga)]
    (boolean
     (some (fn [row]
             (and (rp-field-matches? row rp rp-token-query)
                  (ga-field-matches? row ga ga-token-query)))
           (lookup-rows dict {:word word})))))

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
  "Print one word's cross-referenced entries from all four sources.

  Example:
    (search-word \"cat\" idict wiki cmu idict-uk)
    ;; prints:
    ;; cat
    ;;   ipa-dict     : /kˈæt/
    ;;   wikipron     : /kæt/  [no stress marks]
    ;;   cmudict      : /kˈæt/
    ;;   ipa-dict-uk  : /kˈat/"
  [word idict wiki cmu idict-uk]
  (let [w (clean-word word)]
    (println (str "\n" bold-start-text word reset-color-text))
    (println (str "  ipa-dict     : " (fmt (get idict w []))))
    (println (str "  wikipron     : " (fmt (get wiki w []))
                  "  " faint-start-text "[no stress marks]" reset-color-text))
    (println (str "  cmudict      : " (fmt (get cmu w []))))
    (println (str "  ipa-dict-uk  : " (fmt (get idict-uk w []))
                  "  " faint-start-text "[RP]" reset-color-text))))

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
            cmu (load-dictionary-by-brand :cmudict)
            idict-uk (load-dictionary-by-brand :ipa-dict-uk)]
        (doseq [word words]
          (search-word word idict wiki cmu idict-uk))
        (println)))))
