(ns nemo-words.pairs-test
  (:require [clojure.test :refer [deftest is testing]]
            [nemo-words.pairs :as pairs]))

(deftest extract-nucleus-single-variant-test
  (testing "single-variant cells, nucleus extracted at matching syllable index"
    (is (= ["ɑː" "ɑɹ"]
           (pairs/extract-nucleus "/ˈnɑː.li/" "/ˈnɑɹ.li/" "/ɑɹ/")))))

(deftest nucleus-trim-test
  (testing "onset and coda consonants are stripped, rhotic ɹ is kept"
    (is (= "ɑɹ" ((var pairs/nucleus-trim) "tɑɹt")))))

(deftest extract-nucleus-multiple-ga-variants-test
  (testing "first GA variant containing target-ga wins"
    (is (= ["ɑː" "ɑɹ"]
           (pairs/extract-nucleus "/ˈnɑː.li/"
                                   "/ˈfɑːðɚ/, /ˈnɑɹ.li/"
                                   "/ɑɹ/")))))

;; NOTE: the story's literal example string "/ˈnɑːw.əl/" has only one dot
;; (2 syllables by the protocol's "split on '.'" rule), even though
;; Scenarios 4/5 describe it as having 3 syllables and require it to be
;; skipped in favor of a true 2-syllable variant. That's a typo in the
;; example (missing a syllable-separating dot) — using "/ˈnɑːw.ə.l/" (3
;; dot-segments) here to genuinely exercise the 3-vs-2 syllable-count
;; mismatch the Given/Then describe.
(deftest extract-nucleus-multiple-rp-variants-test
  (testing "first RP variant matching the chosen GA variant's syllable count wins"
    (is (= ["ɑː" "ɑɹ"]
           (pairs/extract-nucleus "/ˈnɑːw.ə.l/, /ˈnɑː.li/"
                                   "/ˈnɑɹ.li/"
                                   "/ɑɹ/")))))

(deftest extract-nucleus-no-rp-syllable-count-match-test
  (testing "no RP variant matches the GA variant's syllable count -> nil"
    (is (nil? (pairs/extract-nucleus "/ˈnɑːw.ə.l/"
                                      "/ˈnɑɹ.li/"
                                      "/ɑɹ/")))))

(deftest extract-nucleus-target-ga-not-found-test
  (testing "target-ga not found in any GA variant -> nil, no throw"
    (is (nil? (pairs/extract-nucleus "/ˈnɑː.li/" "/ˈnɑɹ.li/" "/ʊə/")))))
