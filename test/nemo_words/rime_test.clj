(ns nemo-words.rime-test
  (:require [clojure.test :refer [deftest is testing]]
            [nemo-words.rime :as rime]))

(deftest coda-match?-test
  (testing "word-final r is always coda"
    (is (true? (rime/coda-match? "/kɑɹ/" "ɑɹ"))))
  (testing "r before a consonant is coda"
    (is (true? (rime/coda-match? "/ˈɑɹ.kæn/" "ɑɹ"))))
  (testing "r before a stress mark then a consonant is still coda"
    (is (true? (rime/coda-match? "/ˈfaɪəɹˌpɔɹt/" "aɪəɹ"))))
  (testing "r immediately before a vowel is onset, not coda"
    (is (false? (rime/coda-match? "/əˈwɑɹi/" "ɑɹ"))))
  (testing "r before a dot then a vowel-only syllable is still coda"
    (is (true? (rime/coda-match? "/ˈstɑɹ.i/" "ɑɹ"))))
  (testing "multi-variant cell counts if any variant is coda-position"
    (is (true? (rime/coda-match? "/əˈvɑɹi/, /kɑɹ/" "ɑɹ"))))
  (testing "sound absent"
    (is (false? (rime/coda-match? "/kæt/" "ɑɹ")))))

(deftest filter-coda-test
  (testing "drops onset-r false positives from a lookup-rows result"
    (let [rows [{:word "car" :ga "/kɑɹ/"}
                {:word "arcan" :ga "/ˈɑɹ.kæn/"}
                {:word "oware" :ga "/əˈwɑɹi/"}
                {:word "amaro" :ga "/əˈmɑɹoʊ/"}]
          result (rime/filter-coda rows :ga "ɑɹ")
          words (set (map :word result))]
      (is (= #{"car" "arcan"} words)))))
