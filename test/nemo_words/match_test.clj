(ns nemo-words.match-test
  (:require [clojure.test :refer [deftest is testing]]
            [nemo-words.freq :as freq]
            [nemo-words.match :as match]
            [nemo-words.sets :as sets])
  (:import (java.io File)))

(defn- temp-path []
  (let [f (File/createTempFile "lexical-sets" ".edn")]
    (.delete f)
    (.deleteOnExit f)
    (.getPath f)))

;; -- score (US-014) -------------------------------------------------------

(deftest score-onset-match-only-test
  (testing "onset match, no coda on target -> +1"
    (is (= 1 (match/score {:onset "n" :nucleus "ɑɹ" :coda ""}
                           {:onset "n" :nucleus "ɑɹ" :coda ""})))))

(deftest score-onset-and-coda-match-test
  (testing "onset match + coda match, target has a coda -> +2"
    (is (= 2 (match/score {:onset "n" :nucleus "ɑ" :coda "r"}
                           {:onset "n" :nucleus "ɑ" :coda "r"})))))

(deftest score-onset-match-different-coda-test
  (testing "onset match but coda differs -> +1 only"
    (is (= 1 (match/score {:onset "n" :nucleus "ɑ" :coda "r"}
                           {:onset "n" :nucleus "ɑ" :coda "l"})))))

(deftest score-no-coda-credit-when-target-has-no-coda-test
  (testing "both codas empty but target's coda is empty -> no coda credit"
    (is (= 1 (match/score {:onset "n" :nucleus "ɑ" :coda ""}
                           {:onset "n" :nucleus "ɑ" :coda ""})))))

(deftest score-no-match-test
  (testing "neither onset nor coda match -> 0"
    (is (= 0 (match/score {:onset "n" :nucleus "ɑ" :coda "r"}
                           {:onset "st" :nucleus "ɑ" :coda "l"})))))

;; -- best-candidates (US-014 AC3) ------------------------------------------

(def ^:private ac3-dict
  ;; target: onset "n", nucleus "ɑ", empty coda (no dot in this segment,
  ;; and no trailing consonant)
  [{:word "nadle" :rp "/ˈnɑː.dl/" :ga "/ˈnɑ.dl/"}
   ;; candidate A: onset "n" matches, coda also empty -> score 1 (onset only)
   {:word "nashi" :rp "/ˈnɑː.ʃi/" :ga "/ˈnɑ.ʃi/"}
   ;; candidate B: onset "n" matches, non-empty coda -> still score 1,
   ;; because target's own coda is empty (not a shared feature)
   {:word "nadsy" :rp "/ˈnɑːd.si/" :ga "/ˈnɑd.si/"}])

(deftest best-candidates-no-coda-credit-when-target-has-no-coda-test
  (testing "Scenario: Coda scoring doesn't apply when the target has no coda"
    (with-redefs [freq/fetch-freq-map (fn [_words] {})]
      (let [ranked (match/best-candidates ac3-dict "nadle" "ɑː" "ɑ")
            by-word (into {} (map (juxt :word identity) ranked))]
        (is (= 1 (:score (by-word "nashi"))))
        (is (= 1 (:score (by-word "nadsy"))))))))

;; -- best-candidates (US-014 AC4) ------------------------------------------

(def ^:private ac4-dict
  ;; target: onset "n", empty coda
  [{:word "nadle" :rp "/ˈnɑː.dl/" :ga "/ˈnɑ.dl/"}
   ;; candidate A and B both match onset "n" only, tying on score
   {:word "nashi" :rp "/ˈnɑː.ʃi/" :ga "/ˈnɑ.ʃi/"}
   {:word "nazzy" :rp "/ˈnɑː.zi/" :ga "/ˈnɑ.zi/"}])

(deftest best-candidates-tie-broken-by-freq-test
  (testing "Scenario: Equal scores are broken by corpus frequency"
    (with-redefs [freq/fetch-freq-map (fn [_words] {"nadle" 0 "nashi" 10 "nazzy" 1})]
      (let [ranked (match/best-candidates ac4-dict "nadle" "ɑː" "ɑ")
            words (map :word ranked)
            a-idx (.indexOf words "nashi")
            b-idx (.indexOf words "nazzy")]
        (is (= (:score ((into {} (map (juxt :word identity) ranked)) "nashi"))
               (:score ((into {} (map (juxt :word identity) ranked)) "nazzy"))))
        (is (< a-idx b-idx))))))

;; -- best-candidates (US-014 AC5) ------------------------------------------

(def ^:private ac5-dict
  [{:word "gnarly" :rp "/ˈnɑː.li/" :ga "/ˈnɑɹ.li/"}
   {:word "beetle" :rp "/ˈbiː.tl/" :ga "/ˈbiː.tl/"}])

(deftest best-candidates-no-matches-test
  (testing "Scenario: No candidates share the nucleus"
    (with-redefs [freq/fetch-freq-map (fn [_words] {})]
      (is (= [] (match/best-candidates ac5-dict "gnarly" "ʊə" "ʊə"))))))

;; -- best-candidates (US-014 AC1) ------------------------------------------

(def ^:private ac1-dict
  [{:word "gnarly" :rp "/ˈnɑː.li/" :ga "/ˈnɑɹ.li/"}
   {:word "narwhal" :rp "/ˈnɑː.wəl/" :ga "/ˈnɑɹ.wəl/"}
   {:word "starlet" :rp "/ˈstɑː.lət/" :ga "/ˈstɑɹ.lət/"}])

(deftest best-candidates-onset-match-outranks-nucleus-only-match-test
  (testing "Scenario: Onset match outranks nucleus-only match"
    (with-redefs [freq/fetch-freq-map (fn [_words] {})]
      (let [ranked (match/best-candidates ac1-dict "gnarly" "ɑː" "ɑɹ")
            words (map :word ranked)
            narwhal-idx (.indexOf words "narwhal")
            starlet-idx (.indexOf words "starlet")]
        (is (not= -1 narwhal-idx))
        (is (not= -1 starlet-idx))
        (is (< narwhal-idx starlet-idx))))))

;; -- best-candidates (bug-001) -----------------------------------------
;; Regression for docs/user-stories/bug-001-best-candidates-drops-empty-rp-rows.md:
;; a candidate whose :rp cell is genuinely empty (like "narwhal" in the real
;; en_US_RP_ipa.tsv dict) must still be found via its :ga match, not dropped
;; from the candidate pool.

(def ^:private bug001-dict
  [{:word "gnarly" :rp "/ˈnɑː.li/" :ga "/ˈnɑɹ.li/"}
   ;; narwhal: empty :rp cell (as in the real en_US_RP_ipa.tsv row), single
   ;; syllable :ga matching -> must still be found
   {:word "narwhal" :rp "" :ga "/ˈnɑɹʍəl/"}
   {:word "starlet" :rp "/ˈstɑː.lət/" :ga "/ˈstɑɹ.lət/"}])

(deftest best-candidates-includes-empty-rp-candidate-test
  (testing "a candidate with an empty :rp cell is still matched via :ga"
    (with-redefs [freq/fetch-freq-map (fn [_words] {})]
      (let [ranked (match/best-candidates bug001-dict "gnarly" "ɑː" "ɑɹ")
            words (map :word ranked)
            narwhal-idx (.indexOf words "narwhal")
            starlet-idx (.indexOf words "starlet")]
        (is (not= -1 narwhal-idx) "narwhal (empty :rp) must appear in results")
        (is (not= -1 starlet-idx))
        (is (< narwhal-idx starlet-idx))))))

;; -- best-candidates (US-014 AC6) ------------------------------------------

(deftest best-candidates-does-not-persist-lexical-sets-test
  (testing "Scenario: Nothing is persisted"
    (let [path (temp-path)]
      (sets/save! {"trap" ["cat" "hat"]} path)
      (let [before (slurp path)]
        (with-redefs [freq/fetch-freq-map (fn [_words] {})]
          (match/best-candidates ac1-dict "gnarly" "ɑː" "ɑɹ"))
        (is (= before (slurp path)))))))

;; -- best-candidates (US-014 AC2) ------------------------------------------

(def ^:private ac2-dict
  ;; target: onset "n", nucleus "ɑɹ", coda "t"
  [{:word "nartle" :rp "/ˈnɑːt.l/" :ga "/ˈnɑɹt.l/"}
   ;; candidate A: onset "n", coda "t" -> onset+coda match
   {:word "nartsi" :rp "/ˈnɑːt.si/" :ga "/ˈnɑɹt.si/"}
   ;; candidate B: onset "n", different coda "b" -> onset-only match
   {:word "narble" :rp "/ˈnɑː.bl/" :ga "/ˈnɑɹb.l/"}])

(deftest best-candidates-onset-and-coda-outranks-onset-only-test
  (testing "Scenario: Onset + coda match outranks onset-only match"
    (with-redefs [freq/fetch-freq-map (fn [_words] {})]
      (let [ranked (match/best-candidates ac2-dict "nartle" "ɑː" "ɑɹ")
            words (map :word ranked)
            a-idx (.indexOf words "nartsi")
            b-idx (.indexOf words "narble")]
        (is (not= -1 a-idx))
        (is (not= -1 b-idx))
        (is (< a-idx b-idx))))))
