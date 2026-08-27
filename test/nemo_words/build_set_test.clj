(ns nemo-words.build-set-test
  (:require [clojure.edn :as edn]
            [clojure.test :refer [deftest is testing]]
            [nemo-words.build-set :as build-set]
            [nemo-words.ipa :as ipa])
  (:import (java.io File)))

(defn- temp-path []
  (let [f (File/createTempFile "lexical-sets" ".edn")]
    (.delete f)
    (.deleteOnExit f)
    (.getPath f)))

(def ^:private nurse-dict
  [{:word "hurt" :rp "/ɜː/" :ga "/ɜr/"}
   {:word "lurk" :rp "/ɜː/" :ga "/ɜr/"}
   {:word "urge" :rp "/ɜː/" :ga "/ɜr/"}
   {:word "burst" :rp "/ɜː/" :ga "/ɜr/"}
   {:word "jerk" :rp "/ɜː/" :ga "/ɜr/"}
   {:word "term" :rp "/ɜː/" :ga "/ɜr/"}])

(def ^:private nurse-seed-words ["hurt" "lurk" "urge" "burst" "jerk" "term"])

(deftest build-set-register-new-set-test
  (testing "Register a brand-new set, all seed words still valid"
    (let [path (temp-path)]
      (build-set/build-set nurse-dict "nurse" "/ɜː/" "/ɜr/" nurse-seed-words path)
      (let [saved (edn/read-string (slurp path))]
        (is (= {:rp "/ɜː/" :ga "/ɜr/" :words nurse-seed-words}
               (get saved "nurse")))))))

(deftest build-set-drops-stale-seed-word-test
  (testing "A seed word no longer matches the current dict"
    (let [path (temp-path)
          ;; "term" was swapped out for a newer dict entry that no longer
          ;; carries the nurse rp/ga pair.
          stale-dict (mapv (fn [row]
                              (if (= (:word row) "term")
                                (assoc row :rp "/ɜr/" :ga "/ɜr/")
                                row))
                            nurse-dict)]
      (build-set/build-set stale-dict "nurse" "/ɜː/" "/ɜr/" nurse-seed-words path)
      (let [saved (edn/read-string (slurp path))]
        (is (= {:rp "/ɜː/" :ga "/ɜr/" :words ["hurt" "lurk" "urge" "burst" "jerk"]}
               (get saved "nurse")))))))

(deftest build-set-rebuild-existing-set-is-idempotent-test
  (testing "Rebuild an existing set (idempotent upsert)"
    (let [path (temp-path)]
      (spit path (pr-str {"trap" {:rp "/æ/" :ga "/æ/" :words ["cat" "hat"]}
                           "nurse" {:rp "/ɜː/" :ga "/ɜr/" :words ["stale"]}}))
      (build-set/build-set nurse-dict "nurse" "/ɜː/" "/ɜr/" nurse-seed-words path)
      (let [saved (edn/read-string (slurp path))]
        (is (= 2 (count saved)))
        (is (= {:rp "/æ/" :ga "/æ/" :words ["cat" "hat"]} (get saved "trap")))
        (is (= {:rp "/ɜː/" :ga "/ɜr/" :words nurse-seed-words}
               (get saved "nurse")))))))

;; --------------------------------------------- populate-lexical-sets (US-015)
(deftest populate-lexical-sets-builds-every-table-row-test
  (testing "Populate every Wells set from a clean slate"
    (let [path (temp-path)
          dict (mapv (fn [[kw rp ga words]]
                        {:word (first words) :rp (str "/" rp "/") :ga (str "/" ga "/")})
                      build-set/lexical-sets-table)
          summaries (build-set/populate-lexical-sets dict path)
          saved (edn/read-string (slurp path))]
      (is (= (count build-set/lexical-sets-table) (count saved) (count summaries)))
      (doseq [[kw rp ga words] build-set/lexical-sets-table]
        (is (= {:rp rp :ga ga :words [(first words)]} (get saved kw))
            (str kw " keeps only its dict-verified word")))
      (is (= (mapv first build-set/lexical-sets-table)
             (mapv :keyword summaries))))))

(deftest populate-lexical-sets-reports-kept-and-dropped-test
  (testing "A seed word no longer matches the current dict is reported as dropped"
    (let [path (temp-path)
          empty-dict []
          summaries (build-set/populate-lexical-sets empty-dict path)
          nurse-summary (first (filter #(= "NURSE" (:keyword %)) summaries))]
      (is (= [] (:kept nurse-summary)))
      (is (= ["hurt" "lurk" "urge" "burst" "jerk" "term"] (:dropped nurse-summary))))))

;; --------------------------------------------- US-024 (re-seed against real ga_rp.tsv)
(defn- real-dict-summaries []
  (build-set/populate-lexical-sets (ipa/load-ga-rp-dict) (temp-path)))

(defn- summary-for [summaries keyword]
  (first (filter #(= keyword (:keyword %)) summaries)))

(deftest lettER-composed-ga-target-recovers-5-of-6-seed-words-test
  (testing "lettER's GA target 'ɚ' matches 5 of 6 seed words against real ga_rp.tsv, dropping only 'succour' (a CMUdict/BEEP spelling-variant gap, not the target-string bug)"
    (let [summary (summary-for (real-dict-summaries) "lettER")]
      (is (= ["paper" "metre" "calendar" "stupor" "martyr"]
             (:kept summary)))
      (is (= ["succour"] (:dropped summary))))))

(deftest cure-replacement-word-matches-test
  (testing "CURE's 'sure' (in place of 'poor') matches its RP/GA targets against real ga_rp.tsv"
    (let [summary (summary-for (real-dict-summaries) "CURE")]
      (is (= ["sure" "tourist" "pure" "plural" "jury"] (:kept summary)))
      (is (= [] (:dropped summary))))))

(deftest happy-replacement-word-matches-test
  (testing "happY's 'coffee' (in place of 'scampi') matches its RP/GA targets against real ga_rp.tsv"
    (let [summary (summary-for (real-dict-summaries) "happY")]
      (is (= ["copy" "coffee" "taxi" "sortie" "committee" "hockey" "Chelsea"] (:kept summary)))
      (is (= [] (:dropped summary))))))

(deftest comma-replacement-word-matches-test
  (testing "commA's 'sofa' (in place of 'catalpa') matches its RP/GA targets against real ga_rp.tsv"
    (let [summary (summary-for (real-dict-summaries) "commA")]
      (is (= ["sofa" "quota" "vodka"] (:kept summary)))
      (is (= [] (:dropped summary))))))

;; Baseline kept/dropped counts for every set NOT touched by this story's
;; Protocol, taken from a real populate-lexical-sets run against
;; resources/data/ga_rp.tsv post-bug-003/bug-004 (see US-024's Background).
(def ^:private untouched-set-baseline
  {"KIT" [6 0] "DRESS" [6 0] "TRAP" [6 0] "LOT" [6 0] "STRUT" [6 0]
   "FOOT" [6 0] "BATH" [6 0] "CLOTH" [5 0] "NURSE" [6 0] "FLEECE" [6 0]
   "FACE" [6 0] "PALM" [5 0] "THOUGHT" [5 0] "GOAT" [6 0] "GOOSE" [6 0]
   "PRICE" [6 0] "CHOICE" [5 0] "MOUTH" [6 0] "NEAR" [5 0] "SQUARE" [6 0]
   "START" [6 0] "NORTH" [6 0] "FORCE" [6 0]})

(deftest other-wells-sets-unaffected-test
  (testing "Sets not touched by this story's Protocol keep their post-bug-004 baseline counts"
    (let [summaries (real-dict-summaries)]
      (doseq [[keyword [kept-count dropped-count]] untouched-set-baseline]
        (let [summary (summary-for summaries keyword)]
          (is (= kept-count (count (:kept summary))) (str keyword " kept count"))
          (is (= dropped-count (count (:dropped summary))) (str keyword " dropped count")))))))
