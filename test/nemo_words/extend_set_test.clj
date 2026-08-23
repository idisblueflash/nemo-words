(ns nemo-words.extend-set-test
  (:require [clojure.edn :as edn]
            [clojure.test :refer [deftest is testing]]
            [nemo-words.extend-set :as extend-set]
            [nemo-words.freq :as freq]
            [nemo-words.keyword :as keyword])
  (:import (java.io File)))

(defn- temp-path []
  (let [f (File/createTempFile "lexical-sets" ".edn")]
    (.delete f)
    (.deleteOnExit f)
    (.getPath f)))

;; Dominant pairing ["ɑː" "ɑɹ"] (4 rows: car, far, star, gnarly), a minority
;; pairing ["ɛə" "ɑɹ"] (1 row: scar), plus "narwhal" whose extract-nucleus
;; is skipped for the dominance tally (mismatched syllable count, per
;; US-007) but whose raw rp/ga cells still contain the "ɑː"/"ɑɹ" nucleus
;; substrings, so it's re-gathered by the pair-substring step.
(def ^:private ar-dict
  [{:word "car" :rp "/kɑː/" :ga "/kɑɹ/"}
   {:word "far" :rp "/fɑː/" :ga "/fɑɹ/"}
   {:word "star" :rp "/stɑː/" :ga "/stɑɹ/"}
   {:word "gnarly" :rp "/ˈnɑː.li/" :ga "/ˈnɑɹ.li/"}
   {:word "scar" :rp "/skɛə/" :ga "/skɑɹ/"}
   {:word "narwhal" :rp "/ˈnɑːw.ə.l/" :ga "/ˈnɑɹ.li/"}
   {:word "dog" :rp "/dɒɡ/" :ga "/dɔɡ/"}])

(def ^:private ar-freqs
  {"car" 5 "far" 4 "star" 3 "gnarly" 2 "narwhal" 1})

(defn- stub-annotate-freq [rows]
  (mapv (fn [row] (assoc row :freq (get ar-freqs (:word row) 0))) rows))

(deftest extend-set-genuinely-missing-ga-test
  (testing "dominant pair drives the re-gather, ranking, and save"
    (let [path (temp-path)]
      (with-redefs [freq/annotate-freq stub-annotate-freq
                    keyword/pick-keyword (fn [_] "car")]
        (extend-set/extend-set ar-dict {} "/ɑɹ/" path))
      (let [saved (edn/read-string (slurp path))]
        (is (= ["car" "far" "star" "gnarly" "narwhal"]
               (mapv :word (get saved "car"))))
        (is (every? #(contains? % :freq) (get saved "car")))))))

(deftest extend-set-already-covered-ga-upserts-not-duplicates-test
  (testing "an existing entry for the same keyword is replaced, not duplicated"
    (let [path (temp-path)
          existing {"car" [{:word "stale" :rp "/x/" :ga "/y/" :freq 0}]}]
      (with-redefs [freq/annotate-freq stub-annotate-freq
                    keyword/pick-keyword (fn [_] "car")]
        (extend-set/extend-set ar-dict existing "/ɑɹ/" path))
      (let [saved (edn/read-string (slurp path))]
        (is (= 1 (count saved)))
        (is (= ["car" "far" "star" "gnarly" "narwhal"]
               (mapv :word (get saved "car"))))))))

(deftest extend-set-no-matches-leaves-lexical-sets-unchanged-test
  (testing "no dominant pair found -> file untouched, existing map returned as-is"
    (let [path (temp-path)
          existing {"trap" [{:word "cat" :rp "/æ/" :ga "/æ/" :freq 0}]}]
      (with-redefs [freq/annotate-freq stub-annotate-freq
                    keyword/pick-keyword (fn [_] "car")]
        (let [result (extend-set/extend-set ar-dict existing "/ɒː/" path)]
          (is (= existing result))))
      (is (not (.exists (File. path)))))))
