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

;; -------------------------------------------------------- lookup-rows (US-001)
(def ^:private dict-fixture
  [{:word "car" :rp "/kɑː/" :ga "/kɑɹ/"}
   {:word "star" :rp "/stɑː/" :ga "/stɑɹ/"}
   {:word "dog" :rp "/dɒɡ/" :ga "/dɔɡ/"}
   {:word "a-alike" :rp "" :ga "/ˈeɪəˈlaɪk/"}
   {:word "no-ga-word" :rp "/nəʊɡə/" :ga ""}
   {:word "gnarly" :rp "/ˈnɑː.li/" :ga "/ˈnɑɹ.li/"}
   {:word "narwhal" :rp "/ˈnɑː.li/, /ˈnɑːw.əl/" :ga "/ˈnɑɹ.wəl/, /ˈnɑɹ.li/"}
   {:word "away" :rp "/eɪ̯/, /ə/, /ˈʌ/" :ga "/eɪ̯/, /ə/, /ˈʌ/"}])

(deftest lookup-rows-exact-word-test
  (testing "exact word lookup returns exactly one row"
    (is (= [{:word "car" :rp "/kɑː/" :ga "/kɑɹ/"}]
           (ipa/lookup-rows dict-fixture {:word "car"})))))

(deftest lookup-rows-rp-substring-test
  (testing "every returned row's :rp contains the query, none excluded that do"
    (let [rows (ipa/lookup-rows dict-fixture {:rp "ɑː"})]
      (is (seq rows))
      (is (every? #(strutil/includes-str? (:rp %) "ɑː") rows))
      (is (= #{"car" "star" "gnarly" "narwhal"} (set (map :word rows)))))))

(deftest lookup-rows-exact-pair-test
  (testing "every returned row has exactly the given :rp and :ga"
    (let [rows (ipa/lookup-rows dict-fixture {:pair ["/ˈnɑː.li/" "/ˈnɑɹ.li/"]})]
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
      (is (= [{:word "a-alike" :rp "" :ga "/ˈeɪəˈlaɪk/"}] rows))))
  (testing "that row is never returned by an rp substring lookup with a non-empty query"
    (let [rows (ipa/lookup-rows dict-fixture {:rp "eɪ"})]
      (is (not (contains? (set (map :word rows)) "a-alike"))))))

(deftest lookup-rows-empty-ga-cell-test
  (testing "row for word with no GA transcription has :ga = empty string, not nil"
    (let [rows (ipa/lookup-rows dict-fixture {:word "no-ga-word"})]
      (is (= [{:word "no-ga-word" :rp "/nəʊɡə/" :ga ""}] rows))))
  (testing "that row is never returned by a ga substring lookup with a non-empty query"
    (let [rows (ipa/lookup-rows dict-fixture {:ga "ə"})]
      (is (not (contains? (set (map :word rows)) "no-ga-word"))))))

(deftest lookup-rows-multi-variant-cell-test
  (testing "row is returned and :ga is the full raw comma-joined cell, not just the matched variant"
    (let [rows (ipa/lookup-rows dict-fixture {:ga "ˈʌ"})]
      (is (= [{:word "away" :rp "/eɪ̯/, /ə/, /ˈʌ/" :ga "/eɪ̯/, /ə/, /ˈʌ/"}] rows)))))

(deftest lookup-rows-ga-substring-test
  (testing "every returned row's :ga contains the query"
    (let [rows (ipa/lookup-rows dict-fixture {:ga "ɑɹ"})]
      (is (seq rows))
      (is (every? #(strutil/includes-str? (:ga %) "ɑɹ") rows))
      (is (= #{"car" "star" "gnarly" "narwhal"} (set (map :word rows)))))))

;; ------------------------------------------------------------- word-matches? (US-004)
(deftest word-matches?-test
  (testing "word resolves to the given rp/ga pair in the dict"
    (is (true? (ipa/word-matches? dict-fixture "car" "/kɑː/" "/kɑɹ/"))))
  (testing "word no longer matches the given rp/ga pair"
    (is (false? (ipa/word-matches? dict-fixture "car" "/xxx/" "/kɑɹ/"))))
  (testing "word not in dict at all"
    (is (false? (ipa/word-matches? dict-fixture "zzznotaword" "/kɑː/" "/kɑɹ/")))))
