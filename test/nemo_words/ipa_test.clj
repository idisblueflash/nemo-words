(ns nemo-words.ipa-test
  (:require [clojure.set :as set]
            [clojure.test :refer [deftest is testing]]
            [nemo-words.ipa :as ipa]
            [nemo-words.strutil :as strutil]))

(deftest arpabet->ipa-test
  (testing "no stress digit"
    (is (= "flɪb" ((var ipa/arpabet->ipa) ["F" "L" "IH0" "B"]))))
  (testing "primary stress"
    (is (= "kˈæt" ((var ipa/arpabet->ipa) ["K" "AE1" "T"]))))
  (testing "secondary stress"
    (is (= "ˌæd" ((var ipa/arpabet->ipa) ["AE2" "D"]))))
  (testing "AH0 renders as schwa"
    (is (= "ə" ((var ipa/arpabet->ipa) ["AH0"]))))
  (testing "ER0 renders as rhotacized schwa"
    (is (= "ɚ" ((var ipa/arpabet->ipa) ["ER0"]))))
  (testing "ER1 renders as stressed r-colored vowel"
    (is (= "ˈɝ" ((var ipa/arpabet->ipa) ["ER1"]))))
  (testing "unknown token passes through unchanged"
    (is (= "??" ((var ipa/arpabet->ipa) ["??"]))))
  (testing "empty token list"
    (is (= "" ((var ipa/arpabet->ipa) [])))))

(deftest split-str-by-test
  (is (= ["a" "b" "c"] ((var ipa/split-str-by) "a\tb\tc" @(var ipa/tab-splitter))))
  (is (= ["a" "b\tc"] ((var ipa/split-str-by) "a\tb\tc" @(var ipa/tab-splitter) 2))))

(deftest strip-slashes-test
  (is (= "kæt" ((var ipa/strip-slashes) "/kæt/")))
  (is (= "kæt" ((var ipa/strip-slashes) "kæt")))
  (is (= "" ((var ipa/strip-slashes) "//"))))

(deftest clean-word-test
  (is (= "cat" ((var ipa/clean-word) "  Cat ")))
  (is (= "" ((var ipa/clean-word) "   "))))

(deftest add-variants-test
  (is (= {"cat" ["kæt"]} ((var ipa/add-variants) {} "cat" ["kæt"])))
  (is (= {} ((var ipa/add-variants) {} "" ["kæt"])))
  (is (= {} ((var ipa/add-variants) {} "cat" [])))
  (is (= {"cat" ["kæt" "khæt"]}
         ((var ipa/add-variants) {"cat" ["kæt"]} "cat" ["khæt"]))))

(deftest dedupe-vals-test
  (is (= {"cat" ["kæt" "khæt"]}
         ((var ipa/dedupe-vals) {"cat" ["kæt" "kæt" "khæt"]})))
  (is (= {"cat" []} ((var ipa/dedupe-vals) {"cat" []}))))

(deftest parse-line-test
  (testing ":ipa-dict happy path with multiple comma-separated variants"
    (is (= ["cat" ["kˈæt" "kæt"]]
           ((var ipa/parse-line) :ipa-dict "cat\t/kˈæt/, /kæt/"))))
  (testing ":ipa-dict uppercase headword is lower-cased"
    (is (= ["cat" ["kæt"]] ((var ipa/parse-line) :ipa-dict "Cat\t/kæt/"))))
  (testing ":ipa-dict missing tab (no variant column)"
    (is (= [nil nil] ((var ipa/parse-line) :ipa-dict "cat"))))
  (testing ":ipa-dict blank/trailing-comma variants are dropped"
    (is (= ["cat" ["kæt"]] ((var ipa/parse-line) :ipa-dict "cat\t/kæt/, ,  "))))
  (testing ":ipa-dict empty variant column yields no variants"
    (is (= ["cat" []] ((var ipa/parse-line) :ipa-dict "cat\t"))))

  (testing ":wikipron happy path joins space-separated phonemes"
    (is (= ["cat" ["kæt"]] ((var ipa/parse-line) :wikipron "cat\tk æ t"))))
  (testing ":wikipron missing tab (no phoneme column)"
    (is (= [nil nil] ((var ipa/parse-line) :wikipron "cat"))))
  (testing ":wikipron blank phoneme column yields nil variants"
    (is (= ["cat" nil] ((var ipa/parse-line) :wikipron "cat\t   "))))

  (testing ":cmudict happy path converts ARPABET to IPA"
    (is (= ["cat" ["kˈæt"]] ((var ipa/parse-line) :cmudict "CAT K AE1 T"))))
  (testing ":cmudict variant marker word(2) folds into base word"
    (is (= ["cat" ["kˈæt"]] ((var ipa/parse-line) :cmudict "CAT(2) K AE1 T"))))
  (testing ":cmudict trailing '# comment' is stripped"
    (is (= ["cat" ["kˈæt"]] ((var ipa/parse-line) :cmudict "CAT K AE1 T # comment"))))
  (testing ":cmudict comment-only or blank line"
    (is (= [nil nil] ((var ipa/parse-line) :cmudict "  ")))
    (is (= [nil nil] ((var ipa/parse-line) :cmudict "# just a comment"))))
  (testing ":cmudict headword with no phoneme tokens"
    (is (= ["cat" nil] ((var ipa/parse-line) :cmudict "CAT"))))

  (testing "unknown brand has no dispatch method"
    (is (thrown? IllegalArgumentException
                 ((var ipa/parse-line) :unknown-brand "cat\tkæt")))))

(deftest parse-line-cmudict-raw-test
  (testing ":cmudict-raw happy path keeps raw ARPABET tokens, not IPA"
    (is (= ["car" ["K AA1 R"]] ((var ipa/parse-line) :cmudict-raw "CAR K AA1 R"))))
  (testing ":cmudict-raw stress digits are preserved, digit intact"
    (is (= ["cat" ["K AE1 T"]] ((var ipa/parse-line) :cmudict-raw "CAT K AE1 T"))))
  (testing ":cmudict-raw trailing '# comment' is stripped"
    (is (= ["car" ["K AA1 R"]] ((var ipa/parse-line) :cmudict-raw "CAR K AA1 R # some comment"))))
  (testing ":cmudict-raw variant marker word(2) folds into base word"
    (is (= ["read" ["R EH1 D"]] ((var ipa/parse-line) :cmudict-raw "READ(2) R EH1 D"))))
  (testing ":cmudict-raw comment-only or blank line"
    (is (= [nil nil] ((var ipa/parse-line) :cmudict-raw "  ")))
    (is (= [nil nil] ((var ipa/parse-line) :cmudict-raw "# just a comment"))))
  (testing ":cmudict-raw headword with no phoneme tokens"
    (is (= ["cat" nil] ((var ipa/parse-line) :cmudict-raw "CAT"))))
  (testing ":cmudict-raw skips headwords that don't match the validity filter"
    (is (= [nil nil] ((var ipa/parse-line) :cmudict-raw "1(THOUSAND) W AH1 N")))
    (is (= [nil nil] ((var ipa/parse-line) :cmudict-raw "!EXCLAMATION-POINT")))))

(deftest load-dictionary-by-brand-cmudict-raw-test
  (testing "every value is a vector of raw space-joined ARPABET token strings with no IPA characters"
    (let [dict (ipa/load-dictionary-by-brand :cmudict-raw)]
      (is (seq dict))
      (is (every? (fn [[_ variants]]
                    (every? (fn [tok-str]
                              (not (re-find #"[ɑʃˈɔɪŋɡɛɹːæʊdʒʒʌðθŋɝɚɔɪ]" tok-str)))
                            variants))
                  dict))))
  (testing ":cmudict (IPA) is unaffected by :cmudict-raw's addition"
    (let [cmu (ipa/load-dictionary-by-brand :cmudict)
          raw (ipa/load-dictionary-by-brand :cmudict-raw)]
      (is (= ["kˈɑɹ"] (get cmu "car")))
      (is (= ["K AA1 R"] (get raw "car"))))))

(deftest fmt-test
  (is (= "/kæt/  /khæt/" ((var ipa/fmt) ["kæt" "khæt"])))
  (is (= "/a/  /b/  (+2 more)" ((var ipa/fmt) ["a" "b" "c" "d"] 2)))
  (is (= "\033[2m(no entry)\033[0m" ((var ipa/fmt) []))))

(deftest resource-reader-test
  (is (nil? ((var ipa/resource-reader) "no/such/file")))
  (is (some? ((var ipa/resource-reader) "data/en_US.txt"))))

;; ---------------------------------------------------------- :beep-raw (US-018)
(deftest parse-line-beep-raw-test
  (testing "a simple BEEP line parses to raw tokens"
    (is (= ["car" '("k aa")] ((var ipa/parse-line) :beep-raw "CAR\tk aa"))))
  (testing "a header/comment line is skipped"
    (is (= [nil nil] ((var ipa/parse-line) :beep-raw "# BEEP UK dictionary header"))))
  (testing "BEEP's symbol pseudo-words are excluded"
    (is (= [nil nil]
           ((var ipa/parse-line) :beep-raw
            "!EXCLAMATION-POINT\teh k s k l ah m ey sh ah n p oy n t"))))
  (testing "BEEP's RP-specific vowel tokens are kept raw, not translated here"
    (is (= ["care" '("k ea")] ((var ipa/parse-line) :beep-raw "CARE\tk ea")))))

(deftest load-dictionary-by-brand-beep-raw-test
  (testing "every value is a vector of raw space-joined MRPA token strings, no IPA characters"
    (let [dict (ipa/load-dictionary-by-brand :beep-raw)]
      (is (seq dict))
      (is (every? vector? (vals dict)))
      (is (every? string? (mapcat identity (vals dict))))
      (is (not-any? #(re-find #"[ɛəː]" %) (mapcat identity (vals dict))))
      (is (some #{"k aa"} (get dict "car"))))))

;; ------------------------------------------------------ build-ga-rp-rows (US-019)
(deftest build-ga-rp-rows-both-sources-test
  (testing "a word present in both CMUdict-raw and BEEP-raw gets both columns populated with raw tokens"
    (let [rows (ipa/build-ga-rp-rows (ipa/load-dictionary-by-brand :cmudict-raw)
                                      (ipa/load-dictionary-by-brand :beep-raw))
          car-row (first (filter #(= (:word %) "car") rows))]
      (is (some? car-row))
      (is (= "K AA1 R" (:ga car-row)))
      (is (strutil/includes-str? (:rp car-row) "k aa")))))

(deftest build-ga-rp-rows-no-ipa-translation-test
  (testing "the GA column keeps raw ARPABET tokens, not IPA"
    (let [rows (ipa/build-ga-rp-rows (ipa/load-dictionary-by-brand :cmudict-raw)
                                      (ipa/load-dictionary-by-brand :beep-raw))
          car-row (first (filter #(= (:word %) "car") rows))]
      (is (= "K AA1 R" (:ga car-row)))
      (is (not= "/kˈɑɹ/" (:ga car-row))))))

(deftest build-ga-rp-rows-one-source-only-test
  (testing "a word found in only GA still gets a row, RP left empty, not dropped"
    (let [rows (ipa/build-ga-rp-rows {"onlyga" ["W AH1 N"]} {})]
      (is (= [{:word "onlyga" :ga "W AH1 N" :rp ""}] rows))))
  (testing "a word found in only RP still gets a row, GA left empty, not dropped"
    (let [rows (ipa/build-ga-rp-rows {} {"onlyrp" ["w uh n"]})]
      (is (= [{:word "onlyrp" :ga "" :rp "w uh n"}] rows)))))

(deftest build-ga-rp-rows-neither-source-test
  (testing "a word absent from both sources produces no row for it, and no empty-cell row either"
    (let [rows (ipa/build-ga-rp-rows {"car" ["K AA1 R"]} {"car" ["k aa"]})]
      (is (nil? (first (filter #(= (:word %) "nowhere") rows))))
      (is (not-any? #(and (= "" (:ga %)) (= "" (:rp %))) rows)))))

(deftest build-ga-rp-rows-excludes-beep-pseudo-words-test
  (testing "BEEP's symbol pseudo-words never appear in the built rows"
    (let [rows (ipa/build-ga-rp-rows (ipa/load-dictionary-by-brand :cmudict-raw)
                                      (ipa/load-dictionary-by-brand :beep-raw))]
      (is (nil? (first (filter #(= (:word %) "!exclamation-point") rows))))
      (is (not-any? #(re-find #"[^a-z'-]" (:word %)) rows)))))

(deftest build-ga-rp-rows-multiple-variants-comma-joined-test
  (testing "multiple raw-token variants for the same word are comma-joined, same convention as before"
    (let [rows (ipa/build-ga-rp-rows {"read" ["R IY1 D" "R EH1 D"]} {})
          read-row (first (filter #(= (:word %) "read") rows))]
      (is (= "R IY1 D,R EH1 D" (:ga read-row))))))

;; --------------------------------------------------- load-ga-rp-dict (US-019)
(deftest load-ga-rp-dict-reads-built-file-test
  (testing "reads resources/data/ga_rp.tsv (built by write-ga-rp-dict!) into {:word :ga-tokens :rp-tokens} rows"
    (let [rows (ipa/load-ga-rp-dict)
          car-row (first (filter #(= (:word %) "car") rows))]
      (is (seq rows))
      (is (some? car-row))
      (is (= "K AA1 R" (:ga-tokens car-row)))
      (is (strutil/includes-str? (:rp-tokens car-row) "k aa"))
      (is (every? #(and (string? (:ga-tokens %)) (string? (:rp-tokens %))) rows)))))

;; -------------------------------------------------------- lookup-rows (US-001, US-022)
;; US-022 migrates matching to raw token comparison against the
;; {:word :ga-tokens :rp-tokens} shape US-019's loader produces. Old :rp/:ga
;; IPA-text fields are kept alongside for now so not-yet-migrated opts
;; (:pair, :pair-substring, still on the old fields until this story's later
;; ACs land) keep passing unaffected.
(def ^:private dict-fixture
  [{:word "car" :rp "/kɑː/" :ga "/kɑɹ/" :ga-tokens "K AA1 R" :rp-tokens "k aa"}
   {:word "star" :rp "/stɑː/" :ga "/stɑɹ/" :ga-tokens "S T AA1 R" :rp-tokens "s t aa"}
   {:word "dog" :rp "/dɒɡ/" :ga "/dɔɡ/" :ga-tokens "D AO1 G" :rp-tokens "d o g"}
   {:word "a-alike" :rp "" :ga "/ˈeɪəˈlaɪk/" :ga-tokens "" :rp-tokens ""}
   {:word "no-ga-word" :rp "/nəʊɡə/" :ga "" :ga-tokens "" :rp-tokens "n oh g ax"}
   {:word "gnarly" :rp "/ˈnɑː.li/" :ga "/ˈnɑɹ.li/" :ga-tokens "N AA1 R L IY0" :rp-tokens "n aa l iy"}
   {:word "narwhal" :rp "/ˈnɑː.li/, /ˈnɑːw.əl/" :ga "/ˈnɑɹ.wəl/, /ˈnɑɹ.li/"
    :ga-tokens "N AA1 R W AA0 L,N AA1 R L IY0" :rp-tokens "n aa w aa l,n aa l iy"}
   {:word "away" :rp "/eɪ̯/, /ə/, /ˈʌ/" :ga "/eɪ̯/, /ə/, /ˈʌ/"
    :ga-tokens "EY0,AH0,AH1" :rp-tokens "ey,ax,ah"}])

(deftest lookup-rows-exact-word-test
  (testing "exact word lookup returns exactly one row"
    (is (= [{:word "car" :rp "/kɑː/" :ga "/kɑɹ/" :ga-tokens "K AA1 R" :rp-tokens "k aa"}]
           (ipa/lookup-rows dict-fixture {:word "car"})))))

(deftest lookup-rows-rp-substring-test
  (testing "every returned row matches, via ipa->mrpa token conversion, none excluded that do"
    (let [rows (ipa/lookup-rows dict-fixture {:rp "ɑː"})]
      (is (seq rows))
      (is (= #{"car" "star" "gnarly" "narwhal"} (set (map :word rows)))))))

;; --------------------- lookup-rows :rp IPA query -> MRPA tokens (US-022 AC2)
;; :rp keeps accepting an IPA-string query exactly as before; internally
;; it's converted once via ipa->mrpa, then matched as a substring against
;; the row's raw :rp-tokens cell -- matching BEEP's non-rhotic tokens
;; directly, no ligature-decomposition step needed.
(deftest lookup-rows-rp-query-converts-to-tokens-test
  (testing "worked example: {:rp \"ɛə\"} matches a row via ipa->mrpa token conversion"
    (let [dict [{:word "care" :ga-tokens "K EH1 R" :rp-tokens "k ea"}]
          rows (ipa/lookup-rows dict {:rp "ɛə"})]
      (is (= [{:word "care" :ga-tokens "K EH1 R" :rp-tokens "k ea"}] rows)))))

;; Old-shape-only fixture (no :ga-tokens/:rp-tokens): exercises lookup-rows'
;; backward-compatible direct-IPA-text fallback path for :pair, used by
;; callers (match.clj/extend_set.clj/rime.clj) not yet migrated onto
;; US-019's {:word :ga-tokens :rp-tokens} dict shape.
(def ^:private old-shape-dict-fixture
  [{:word "gnarly" :rp "/ˈnɑː.li/" :ga "/ˈnɑɹ.li/"}
   {:word "narwhal" :rp "/ˈnɑː.li/, /ˈnɑːw.əl/" :ga "/ˈnɑɹ.wəl/, /ˈnɑɹ.li/"}])

(deftest lookup-rows-exact-pair-test
  (testing "every returned row has exactly the given :rp and :ga"
    (let [rows (ipa/lookup-rows old-shape-dict-fixture {:pair ["/ˈnɑː.li/" "/ˈnɑɹ.li/"]})]
      (is (= [{:word "gnarly" :rp "/ˈnɑː.li/" :ga "/ˈnɑɹ.li/"}] rows))
      (is (every? #(and (= (:rp %) "/ˈnɑː.li/") (= (:ga %) "/ˈnɑɹ.li/")) rows)))))

(deftest lookup-rows-pair-substring-test
  (testing "both rp and ga independently match as substrings, even split across variants"
    (let [rows (ipa/lookup-rows dict-fixture {:pair-substring ["ɑː" "ɑɹ"]})
          matched-words (set (map :word rows))]
      (is (set/subset? #{"gnarly" "narwhal"} matched-words)))))

(deftest lookup-rows-no-matches-test
  (testing "unknown word yields empty seq, no error"
    (is (= [] (ipa/lookup-rows dict-fixture {:word "zzznotaword"}))))
  (testing "unknown IPA substring yields empty seq, no error"
    (is (= [] (ipa/lookup-rows dict-fixture {:rp "xyz-not-ipa"})))))

(deftest lookup-rows-empty-rp-cell-test
  (testing "row for word with no RP transcription has :rp = empty string, not nil"
    (let [rows (ipa/lookup-rows dict-fixture {:word "a-alike"})]
      (is (= [{:word "a-alike" :rp "" :ga "/ˈeɪəˈlaɪk/" :ga-tokens "" :rp-tokens ""}] rows))))
  (testing "that row is never returned by an rp substring lookup with a non-empty query"
    (let [rows (ipa/lookup-rows dict-fixture {:rp "eɪ"})]
      (is (not (contains? (set (map :word rows)) "a-alike"))))))

;; --------------------- lookup-rows :ga IPA query -> ARPABET tokens (US-022 AC1)
;; :ga keeps accepting an IPA-string query exactly as before; internally it's
;; converted once via ipa->arpabet, then matched (stress-digit-agnostic, since
;; the query carries no per-word stress placement) as a substring against the
;; row's raw :ga-tokens cell -- no more direct IPA-text substring match.
(deftest lookup-rows-ga-query-converts-to-tokens-test
  (testing "worked example: {:ga \"/ɑɹ/\"} matches a row via ipa->arpabet token conversion, not IPA text"
    (let [dict [{:word "car" :ga-tokens "K AA1 R" :rp-tokens "k aa"}]
          rows (ipa/lookup-rows dict {:ga "/ɑɹ/"})]
      (is (= [{:word "car" :ga-tokens "K AA1 R" :rp-tokens "k aa"}] rows)))))

(deftest lookup-rows-empty-ga-cell-test
  (testing "row for word with no GA transcription has :ga-tokens = empty string, not nil"
    (let [rows (ipa/lookup-rows dict-fixture {:word "no-ga-word"})]
      (is (= [{:word "no-ga-word" :rp "/nəʊɡə/" :ga "" :ga-tokens "" :rp-tokens "n oh g ax"}] rows))))
  (testing "that row is never returned by a ga substring lookup with a non-empty query"
    (let [rows (ipa/lookup-rows dict-fixture {:ga "ə"})]
      (is (not (contains? (set (map :word rows)) "no-ga-word"))))))

(deftest lookup-rows-multi-variant-cell-test
  (testing "row is returned and :ga-tokens is the full raw comma-joined cell, not just the matched variant"
    (let [rows (ipa/lookup-rows dict-fixture {:ga "ˈʌ"})]
      (is (= [{:word "away" :rp "/eɪ̯/, /ə/, /ˈʌ/" :ga "/eɪ̯/, /ə/, /ˈʌ/"
               :ga-tokens "EY0,AH0,AH1" :rp-tokens "ey,ax,ah"}]
             rows)))))

(deftest lookup-rows-ga-substring-test
  (testing "every returned row's :ga-tokens contains the converted query, stress digits ignored"
    (let [rows (ipa/lookup-rows dict-fixture {:ga "ɑɹ"})]
      (is (seq rows))
      (is (= #{"car" "star" "gnarly" "narwhal"} (set (map :word rows)))))))

(deftest lookup-rows-ga-query-ignores-stress-digit-mismatch-test
  (testing "the query's default (unstressed) digit doesn't block a match against a stressed stored token"
    (let [dict [{:word "car" :ga-tokens "K AA1 R" :rp-tokens "k aa"}]]
      (is (= 1 (count (ipa/lookup-rows dict {:ga "ɑɹ"})))))))

;; -------------------------------------------------- ga-tokens->ipa (US-020)
(deftest ga-tokens->ipa-single-variant-test
  (testing "wraps arpabet->ipa for a single space-separated ARPABET variant"
    (is (= "kˈɑɹ" (ipa/ga-tokens->ipa "K AA1 R")))))

(deftest ga-tokens->ipa-multi-variant-test
  (testing "comma-joined multi-variant cells are converted variant-by-variant"
    (is (= "ɹˈid,ɹˈɛd" (ipa/ga-tokens->ipa "R IY1 D,R EH1 D")))))

;; -------------------------------------------------- ipa->arpabet (US-020)
(deftest ipa->arpabet-simple-word-test
  (testing "reconstructs a simple word's tokens with stress reattached"
    (is (= ["K" "AE1" "T"] (ipa/ipa->arpabet "kˈæt")))))

(deftest ipa->arpabet-multi-codepoint-symbol-test
  (testing "greedy longest match splits 'tʃ' as CH, not a mis-split 't' 'ʃ'"
    (is (= ["CH" "EH1"] (take 2 (ipa/ipa->arpabet "tʃˈɛs"))))))

(deftest ipa->arpabet-unstressed-leading-vowel-test
  (testing "unstressed leading vowel with no preceding mark becomes AH0, not digit-less"
    (is (= "AH0" (first (ipa/ipa->arpabet "əˈbʌv"))))))

;; ------------------------------------------ round-trip property (US-020)
;; ARPABET tokens always carry a stress digit on vowels (per CMUdict
;; convention, e.g. "K AE1 T"), never a bare vowel symbol, so the
;; generator below only ever emits digited vowel tokens.
(deftest round-trip-boundary-collision-test
  (testing "adjacent tokens whose IPA renderings concatenate into a
            different symbol's spelling still round-trip (T+SH vs CH,
            AO+IH vs OY, D+ZH vs JH)"
    (doseq [v [["S" "AO1" "IH0" "NG"]
               ["N" "AH1" "T" "SH" "EH2" "L"]
               ["B" "AE1" "D" "ZH" "AA1" "B"]]]
      (is (= v (ipa/ipa->arpabet ((var ipa/arpabet->ipa) v))) (str "vector: " v)))))

(deftest colliding-adjacent-bases-derivation-test
  (testing "the hardcoded collision set matches what an exhaustive pairwise
            check of arpabet-phoneme->ipa derives today, so a future change
            to the phoneme map fails loudly here instead of silently
            reintroducing an unmarked boundary collision"
    (let [phoneme->ipa @(var ipa/arpabet-phoneme->ipa)
          bases (keys phoneme->ipa)
          derived (set (for [prev bases
                              base bases
                              :let [concatenated (str (get phoneme->ipa prev)
                                                       (get phoneme->ipa base))]
                              :when (contains? (set (vals phoneme->ipa)) concatenated)]
                          [prev base]))]
      (is (= @(var ipa/colliding-adjacent-bases) derived)))))

(def ^:private round-trip-consonants
  (remove @(var ipa/arpabet-vowels) (keys @(var ipa/arpabet-phoneme->ipa))))

(def ^:private round-trip-vowel-tokens
  (for [v @(var ipa/arpabet-vowels) d ["0" "1" "2"]] (str v d)))

(def ^:private round-trip-all-tokens
  (concat round-trip-consonants round-trip-vowel-tokens))

(defn- random-token-vector
  "A random ARPABET token vector of length n, freely mixing consonants
  and digited vowels in any order (e.g. (\"T\" \"SH\" \"AE1\" \"K\"))."
  [n]
  (vec (repeatedly n #(rand-nth round-trip-all-tokens))))

(deftest round-trip-arpabet-ipa-arpabet-test
  (testing "every single ARPABET token round-trips through arpabet->ipa then ipa->arpabet"
    (doseq [tok (concat round-trip-consonants round-trip-vowel-tokens)]
      (is (= [tok] (ipa/ipa->arpabet ((var ipa/arpabet->ipa) [tok])))
          (str "token: " tok))))
  (testing "the worked examples from this story round-trip exactly"
    (doseq [v [["K" "AE1" "T"] ["R" "IY1" "D"] ["R" "EH1" "D"]
               ["K" "AA1" "R"] ["F" "L" "IH0" "B"] ["AE2" "D"]]]
      (is (= v (ipa/ipa->arpabet ((var ipa/arpabet->ipa) v))) (str "vector: " v))))
  (testing "randomized token vectors, any consonant/vowel arrangement, round-trip exactly"
    (dotimes [_ 500]
      (let [v (random-token-vector (inc (rand-int 6)))]
        (is (= v (ipa/ipa->arpabet ((var ipa/arpabet->ipa) v))) (str "vector: " v))))))

;; ------------------------------------------------------------- word-matches? (US-004, US-022 AC3)
;; word-matches? needs no signature change from US-022 -- it keeps taking
;; IPA-string rp/ga queries and just inherits lookup-rows' new token-based
;; matching against the {:word :ga-tokens :rp-tokens} shape.
(def ^:private token-dict-fixture
  [{:word "car" :ga-tokens "K AA1 R" :rp-tokens "k aa"}])

(deftest word-matches?-test
  (testing "word resolves to the given rp/ga pair in the dict, matched via token conversion"
    (is (true? (ipa/word-matches? token-dict-fixture "car" "kɑː" "ɑɹ"))))
  (testing "word no longer matches the given rp/ga pair"
    (is (false? (ipa/word-matches? token-dict-fixture "car" "iː" "ɑɹ"))))
  (testing "word not in dict at all"
    (is (false? (ipa/word-matches? token-dict-fixture "zzznotaword" "kɑː" "ɑɹ")))))

;; word-matches? on a NURSE-set candidate word, against a {:ga-tokens
;; :rp-tokens} dict, per lexical-sets.edn's NURSE row ["ɜː" "ɜɹ"]
;; (build_set.clj's lexical-sets-table). The GA target "ɜɹ" is a
;; decomposed nucleus+rhotic (never how CMUdict's r-colored ER renders as
;; IPA, which collapses to the ligature ɝ) -- confirming ADR-0003's point
;; that token-space matching needs no ligature-decomposition step to find
;; it, since ARPABET's "ER" spelling already textually contains "R".
(def ^:private nurse-token-dict
  [{:word "hurt" :ga-tokens "HH ER1 T" :rp-tokens "h er t"}
   {:word "cat" :ga-tokens "K AE1 T" :rp-tokens "k ae t"}])

;; ---------- no ligature-decomposition step in the matching path (US-022 AC5)
;; Rhotic IPA ligatures ("ɝ", "ɚ") convert straight to a single ARPABET
;; token (ER1/ER0) via ipa->arpabet -- lookup-rows never runs a separate
;; decomposition step over the query or the stored cell before comparing.
(def ^:private rhotic-ligature-dict
  [{:word "hurt" :ga-tokens "HH ER1 T" :rp-tokens "h er t"}])

(deftest lookup-rows-ga-query-with-stressed-rhotic-ligature-test
  (testing "'ɝ' converts straight to an ER token and matches by plain substring comparison"
    (is (= ["hurt"] (map :word (ipa/lookup-rows rhotic-ligature-dict {:ga "ɝ"}))))))

(deftest lookup-rows-ga-query-with-unstressed-rhotic-ligature-test
  (testing "'ɚ' converts straight to ER0 and matches the same way, no decomposition step"
    (is (= ["hurt"] (map :word (ipa/lookup-rows rhotic-ligature-dict {:ga "ɚ"}))))))

(deftest word-matches?-nurse-lexical-set-test
  (testing "a NURSE candidate word matches NURSE's rp/ga targets"
    (is (true? (ipa/word-matches? nurse-token-dict "hurt" "ɜː" "ɜɹ"))))
  (testing "a non-NURSE candidate word does not match NURSE's targets"
    (is (false? (ipa/word-matches? nurse-token-dict "cat" "ɜː" "ɜɹ")))))

;; ------------------------------------------------------------- mrpa->ipa (US-021)
(deftest mrpa->ipa-test
  (testing "converts a simple token vector"
    (is (= "kɑː" (ipa/mrpa->ipa ["k" "aa"])))))

(deftest rp-tokens->ipa-single-variant-test
  (testing "wraps mrpa->ipa for a single variant"
    (is (= "kɑː" (ipa/rp-tokens->ipa "k aa")))))

(deftest rp-tokens->ipa-multi-variant-test
  (testing "handles comma-joined multi-variant cells"
    (is (= "kɛə,kɛ" (ipa/rp-tokens->ipa "k ea,k eh")))))

(deftest mrpa->ipa-never-introduces-stress-test
  (testing "no ˈ or ˌ appears in the output, for any token vector"
    (doseq [tokens [["k" "aa"] (keys ipa/mrpa-phoneme->ipa) ["p" "ea" "sil" "t"]]]
      (let [result (ipa/mrpa->ipa tokens)]
        (is (not (strutil/includes-str? result "ˈ")))
        (is (not (strutil/includes-str? result "ˌ")))))))

(deftest ipa->mrpa-test
  (testing "reconstructs a simple word's tokens"
    (is (= ["k" "aa"] (ipa/ipa->mrpa "kɑː")))))

(deftest ipa->mrpa-multi-codepoint-test
  (testing "handles multi-codepoint IPA symbols, not a mis-split single-character read"
    (is (= ["k" "ea"] (ipa/ipa->mrpa "kɛə")))))

(deftest mrpa-ipa-round-trip-test
  (testing "round-trips through mrpa->ipa then ipa->mrpa for every token vector"
    (doseq [v [["k" "aa"] ["p" "ea" "t"] ["ch" "ao" "n"] ["sh" "iy" "n"]
               (vec (remove #(= "sil" %) (keys ipa/mrpa-phoneme->ipa)))]]
      (is (= v (ipa/ipa->mrpa (ipa/mrpa->ipa v)))))))
