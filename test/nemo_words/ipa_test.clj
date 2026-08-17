(ns nemo-words.ipa-test
  (:require [clojure.test :refer [deftest is testing]]
            [nemo-words.ipa :as ipa]))

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

(deftest fmt-test
  (is (= "/kæt/  /khæt/" ((var ipa/fmt) ["kæt" "khæt"])))
  (is (= "/a/  /b/  (+2 more)" ((var ipa/fmt) ["a" "b" "c" "d"] 2)))
  (is (= "\033[2m(no entry)\033[0m" ((var ipa/fmt) []))))

(deftest resource-reader-test
  (is (nil? ((var ipa/resource-reader) "no/such/file")))
  (is (some? ((var ipa/resource-reader) "data/en_US.txt"))))
