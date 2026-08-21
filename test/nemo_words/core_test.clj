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

;; ------------------------------------------------------- ipa-lookup (US-001)
(def ^:private dict-fixture
  [{:word "car" :rp "/kɑː/" :ga "/kɑɹ/"}
   {:word "star" :rp "/stɑː/" :ga "/stɑɹ/"}])

(deftest ipa-lookup-word-match-test
  (testing "CLI wrapper mirrors lookup-rows: same N rows, as TSV word\\tRP\\tGA, exit 0"
    (let [out (java.io.StringWriter.)
          exit-code (binding [*out* out]
                      (core/ipa-lookup dict-fixture ["--word" "car"]))
          lines (->> (str/split-lines (str out)) (remove str/blank?))]
      (is (= 0 exit-code))
      (is (= ["car\t/kɑː/\t/kɑɹ/"] lines)))))

(deftest ipa-lookup-zero-matches-test
  (testing "zero matches still exits 0 with no output lines"
    (let [out (java.io.StringWriter.)
          exit-code (binding [*out* out]
                      (core/ipa-lookup dict-fixture ["--word" "zzznotaword"]))
          lines (->> (str/split-lines (str out)) (remove str/blank?))]
      (is (= 0 exit-code))
      (is (= [] lines)))))

;; ---------------------------------------------------- -main dispatch (US-001 AC10)
;; AC10 is specifically about the real shell/process boundary (per the story's
;; background: "because US-005's external AI-agent consumer needs a real
;; process boundary"), so this shells out to the actual `clojure -M` entry
;; point rather than calling core/-main or core/ipa-lookup in-process.
(deftest main-dispatches-ipa-lookup-subcommand-test
  (testing "`clojure -M -m nemo-words.core ipa-lookup --word car` prints the TSV row and exits 0"
    (let [proc (-> (ProcessBuilder. ["clojure" "-M" "-m" "nemo-words.core" "ipa-lookup" "--word" "car"])
                    (.redirectErrorStream true)
                    .start)
          out (slurp (.getInputStream proc))
          exit-code (.waitFor proc)
          lines (->> (str/split-lines out) (remove str/blank?))]
      (is (= 0 exit-code))
      (is (= ["car\t/kɑː/\t/kɑɹ/"] lines)))))
