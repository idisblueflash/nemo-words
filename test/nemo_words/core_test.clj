(ns nemo-words.core-test
  (:require [clojure.string :as str]
            [clojure.test :refer [deftest is testing]]
            [nemo-words.core :as core]
            [nemo-words.freq :as freq]))

(deftest smoke-test
  (is (= 1 1)))

;; -------------------------------------------------- word-freq CLI (US-003)
(deftest word-freq-reads-words-from-args-test
  (testing "`word-freq car star` prints TSV \"word\\tfreq\" lines, one per arg"
    (with-redefs [freq/fetch-freq-map (fn [_words] {"car" 1.5e-5 "star" 2.5e-6})]
      (let [out (java.io.StringWriter.)]
        (binding [*out* out]
          (core/word-freq ["car" "star"]))
        (let [lines (->> (str/split-lines (str out)) (remove str/blank?))]
          (is (= ["car\t1.5E-5" "star\t2.5E-6"] lines)))))))

(deftest word-freq-reads-words-from-file-test
  (testing "`word-freq --file words.txt` prints one TSV line per non-blank line in the file"
    (let [tmp (java.io.File/createTempFile "words" ".txt")]
      (try
        (spit tmp "car\nstar\n\n")
        (with-redefs [freq/fetch-freq-map (fn [_words] {"car" 1.5e-5 "star" 2.5e-6})]
          (let [out (java.io.StringWriter.)]
            (binding [*out* out]
              (core/word-freq-cli ["--file" (.getPath tmp)]))
            (let [lines (->> (str/split-lines (str out)) (remove str/blank?))]
              (is (= ["car\t1.5E-5" "star\t2.5E-6"] lines)))))
        (finally (.delete tmp))))))

(deftest word-freq-reads-words-from-stdin-test
  (testing "no args/--file given: reads words piped via stdin, one per line, same TSV output as the args form"
    (with-redefs [freq/fetch-freq-map (fn [_words] {"car" 1.5e-5 "star" 2.5e-6})]
      (let [in (clojure.lang.LineNumberingPushbackReader.
                (java.io.StringReader. "car\nstar\n"))
            out (java.io.StringWriter.)]
        (binding [*in* in *out* out]
          (core/word-freq-cli []))
        (let [lines (->> (str/split-lines (str out)) (remove str/blank?))]
          (is (= ["car\t1.5E-5" "star\t2.5E-6"] lines)))))))
