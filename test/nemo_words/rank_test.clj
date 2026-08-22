(ns nemo-words.rank-test
  (:require [clojure.test :refer [deftest is testing]]
            [nemo-words.rank :as rank]))

(deftest top-n-more-rows-than-n
  (testing "More rows than N"
    (let [rows (for [i (range 100)] {:id i :freq i})
          result (rank/top-n rows :freq 60)
          returned-freqs (set (map :freq result))
          non-returned-freqs (set (map :freq (remove (fn [r] (contains? (set (map :id result)) (:id r))) rows)))]
      (is (= 60 (count result)))
      (is (every? (fn [rf] (every? (fn [nf] (>= rf nf)) non-returned-freqs)) returned-freqs)))))

(deftest top-n-fewer-rows-than-n
  (testing "Fewer rows than N"
    (let [rows (vec (for [i (range 12)] {:id i :freq i}))
          result (rank/top-n rows :freq 60)]
      (is (= 12 (count result)))
      (is (= (set rows) (set result))))))

(deftest top-n-tied-scores-stable
  (testing "Tied scores broken by input order"
    (let [rows [{:id :a :freq 10} {:id :b :freq 5} {:id :c :freq 5}
                {:id :d :freq 5} {:id :e :freq 1}]
          result (rank/top-n rows :freq 3)]
      (is (= [:a :b :c] (map :id result))))))

(deftest top-n-empty-input
  (testing "Empty input"
    (let [result (rank/top-n [] :freq 60)]
      (is (empty? result)))))
