(ns nemo-words.freq-test
  (:require [clojure.test :refer [deftest is testing]]
            [nemo-words.freq :as freq]))

;; ------------------------------------------------- annotate-freq (US-003 AC1)
(deftest annotate-freq-adds-numeric-freq-and-preserves-order-test
  (testing "each row gains a :freq key with a numeric value; row order preserved"
    (with-redefs [freq/fetch-freq-map (fn [_words] {"car" 1.23e-5 "star" 4.56e-6})]
      (let [rows [{:word "car"} {:word "star"}]
            result (freq/annotate-freq rows)]
        (is (= ["car" "star"] (map :word result)))
        (is (every? number? (map :freq result)))
        (is (= 1.23e-5 (:freq (first result))))
        (is (= 4.56e-6 (:freq (second result))))))))

;; ------------------------------------------ unknown word -> 0 (US-003 AC2)
(deftest annotate-freq-unknown-word-gets-zero-freq-test
  (testing "a word absent from the corpus gets :freq 0, not nil, and no exception"
    (with-redefs [freq/fetch-freq-map (fn [_words] {"car" 1.23e-5})]
      (let [rows [{:word "car"} {:word "zzznotaword"}]
            result (freq/annotate-freq rows)]
        (is (= 0 (:freq (second result))))
        (is (not (nil? (:freq (second result)))))))))
