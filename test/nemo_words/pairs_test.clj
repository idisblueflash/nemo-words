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

;; -- dominant-pair / pair-distribution fixtures --------------------------

(def ^:private car-row
  ;; extract-nucleus "/kɑː/" "/kɑɹ/" "/ɑɹ/" => ["ɑː" "ɑɹ"]
  {:word "car" :rp "/kɑː/" :ga "/kɑɹ/"})

(def ^:private par-row
  ;; extract-nucleus "/pɔː/" "/pɑɹ/" "/ɑɹ/" => ["ɔː" "ɑɹ"]
  {:word "par" :rp "/pɔː/" :ga "/pɑɹ/"})

(def ^:private scar-row
  ;; extract-nucleus "/skɛə/" "/skɑɹ/" "/ɑɹ/" => ["ɛə" "ɑɹ"]
  {:word "scar" :rp "/skɛə/" :ga "/skɑɹ/"})

(def ^:private narwhal-mismatched-row
  ;; ga variant "nɑɹ.li" has 2 syllables; the only rp variant "nɑːw.ə.l"
  ;; has 3 -> extract-nucleus returns nil, row is skipped.
  {:word "narwhal" :rp "/ˈnɑːw.ə.l/" :ga "/ˈnɑɹ.li/"})

(deftest dominant-pair-clear-majority-test
  (testing "one RP nucleus clearly dominates"
    (let [triples (concat (repeat 8 car-row) (repeat 2 scar-row))]
      (is (= ["ɑː" "ɑɹ"] (pairs/dominant-pair triples "/ɑɹ/"))))))

(deftest dominant-pair-tie-is-stable-on-input-order-test
  (testing "exact tie resolved by first-occurrence-in-input order"
    (let [triples (concat (repeat 5 car-row) (repeat 5 par-row))]
      (is (= ["ɑː" "ɑɹ"] (pairs/dominant-pair triples "/ɑɹ/"))))))

(deftest dominant-pair-single-pairing-test
  (testing "only one nucleus pairing exists -> that pairing, 100% dominance"
    (let [triples (repeat 3 car-row)]
      (is (= ["ɑː" "ɑɹ"] (pairs/dominant-pair triples "/ɑɹ/"))))))

(deftest dominant-pair-skips-mismatched-syllable-row-test
  (testing "row with mismatched syllable count contributes nothing"
    (let [triples [narwhal-mismatched-row car-row]]
      (is (= ["ɑː" "ɑɹ"] (pairs/dominant-pair triples "/ɑɹ/"))))))

(deftest pair-distribution-full-spread-test
  (testing "returns the entire tally, sorted by count descending"
    (let [triples (concat (repeat 8 car-row) (repeat 2 scar-row))]
      (is (= [{:pair ["ɑː" "ɑɹ"] :count 8 :pct 80}
              {:pair ["ɛə" "ɑɹ"] :count 2 :pct 20}]
             (pairs/pair-distribution triples "/ɑɹ/")))
      (is (= ["ɑː" "ɑɹ"] (pairs/dominant-pair triples "/ɑɹ/"))))))

(deftest dominant-pair-no-triples-test
  (testing "empty triples -> nil, not a bogus pair or a throw"
    (is (nil? (pairs/dominant-pair [] "/ʊə/")))))

(deftest pair-distribution-no-triples-test
  (testing "empty triples -> [], not nil"
    (is (= [] (pairs/pair-distribution [] "/ʊə/")))))

;; -- extract-syllable (US-014) -------------------------------------------

(deftest extract-syllable-basic-test
  (testing "returns {:onset :nucleus :coda} for the matching GA syllable"
    (is (= {:onset "n" :nucleus "ɑɹ" :coda ""}
           (pairs/extract-syllable "/ˈnɑː.li/" "/ˈnɑɹ.li/" "/ɑɹ/")))))

(deftest extract-syllable-with-coda-test
  (testing "coda is captured when the matching syllable has trailing consonants"
    (is (= {:onset "st" :nucleus "ɑɹ" :coda "t"}
           (pairs/extract-syllable "/ˈstɑː.tli/" "/ˈstɑɹt.li/" "/ɑɹ/")))))

(deftest extract-syllable-not-found-test
  (testing "target-ga not found in any GA variant -> nil, no throw"
    (is (nil? (pairs/extract-syllable "/ˈnɑː.li/" "/ˈnɑɹ.li/" "/ʊə/")))))

(deftest dominant-pair-all-rows-skipped-test
  (testing "every row skipped -> nil, same as empty-triples case"
    (let [triples [narwhal-mismatched-row narwhal-mismatched-row]]
      (is (nil? (pairs/dominant-pair triples "/ɑɹ/"))))))

(deftest pair-distribution-all-rows-skipped-test
  (testing "every row skipped -> []"
    (let [triples [narwhal-mismatched-row narwhal-mismatched-row]]
      (is (= [] (pairs/pair-distribution triples "/ɑɹ/"))))))
