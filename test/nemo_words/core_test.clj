(ns nemo-words.core-test
  (:require [clojure.string :as str]
            [clojure.test :refer [deftest is testing]]
            [nemo-words.core :as core]))

(deftest smoke-test
  (is (= 1 1)))

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
