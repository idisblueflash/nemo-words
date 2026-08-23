(ns nemo-words.build-set-test
  (:require [clojure.edn :as edn]
            [clojure.test :refer [deftest is testing]]
            [nemo-words.build-set :as build-set])
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
