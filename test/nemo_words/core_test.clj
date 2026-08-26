(ns nemo-words.core-test
  (:require [clojure.edn :as edn]
            [clojure.string :as str]
            [clojure.test :refer [deftest is testing]]
            [nemo-words.build-set :as build-set]
            [nemo-words.core :as core]
            [nemo-words.freq :as freq]
            [nemo-words.ipa :as ipa]
            [nemo-words.sets :as sets])
  (:import (java.io File)))

(defn- temp-sets-path []
  (let [f (File/createTempFile "lexical-sets" ".edn")]
    (.delete f)
    (.deleteOnExit f)
    (.getPath f)))

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

;; ------------------------------------------- pick-example-words-by-ipa (US-005)
(deftest pick-example-words-by-ipa-single-match-test
  (testing "IPA matches exactly one set: stdout is an EDN vector with that entry's map, nothing else"
    (let [path (temp-sets-path)]
      (spit path (pr-str {"nurse" {:rp "/ɜː/" :ga "/ɜr/" :words ["bird" "word"]}}))
      (let [out (java.io.StringWriter.)
            exit-code (binding [*out* out]
                        (core/pick-example-words-by-ipa-cli ["/ɜr/"] path))
            lines (->> (str/split-lines (str out)) (remove str/blank?))]
        (is (= 0 exit-code))
        (is (= 1 (count lines)))
        (is (= [{:keyword "nurse" :rp "/ɜː/" :ga "/ɜr/" :words ["bird" "word"]}]
               (edn/read-string (str out))))))))

(deftest pick-example-words-by-ipa-multiple-matches-test
  (testing "IPA matches more than one set: one map per matching entry, in lexical-sets.edn's order"
    (let [path (temp-sets-path)]
      (spit path (pr-str {"lettER" {:rp "ə" :ga "əɹ"
                                     :words ["paper" "metre" "calendar" "stupor" "succour" "martyr"]}
                           "commA" {:rp "ə" :ga "ə" :words ["catalpa" "quota" "vodka"]}}))
      (let [out (java.io.StringWriter.)
            exit-code (binding [*out* out]
                        (core/pick-example-words-by-ipa-cli ["ə"] path))]
        (is (= 0 exit-code))
        (is (= [{:keyword "lettER" :rp "ə" :ga "əɹ"
                 :words ["paper" "metre" "calendar" "stupor" "succour" "martyr"]}
                {:keyword "commA" :rp "ə" :ga "ə" :words ["catalpa" "quota" "vodka"]}]
               (edn/read-string (str out))))))))

(deftest pick-example-words-by-ipa-no-match-test
  (testing "IPA matches no set: stdout is the empty EDN vector \"[]\", process exits 0"
    (let [path (temp-sets-path)]
      (spit path (pr-str {"nurse" {:rp "/ɜː/" :ga "/ɜr/" :words ["bird" "word"]}}))
      (let [out (java.io.StringWriter.)
            exit-code (binding [*out* out]
                        (core/pick-example-words-by-ipa-cli ["/zzz/"] path))]
        (is (= 0 exit-code))
        (is (= "[]" (str/trim (str out))))
        (is (= [] (edn/read-string (str out))))))))

(deftest pick-example-words-by-ipa-no-lexical-sets-file-test
  (testing "lexical-sets.edn does not exist yet: clear message, non-zero exit"
    (let [path (temp-sets-path)
          out (java.io.StringWriter.)
          err (java.io.StringWriter.)
          exit-code (binding [*out* out *err* err]
                      (core/pick-example-words-by-ipa-cli ["/ɜr/"] path))]
      (is (not (zero? exit-code)))
      (is (str/includes? (str/lower-case (str err)) "no lexical sets built yet")))))

;; ---------------------------------------------------- -main dispatch (US-001 AC10)
;; AC10 is specifically about the real shell/process boundary (per the story's
;; background: "because US-005's external AI-agent consumer needs a real
;; process boundary"), so this shells out to the actual `clojure -M` entry
;; point rather than calling core/-main or core/ipa-lookup in-process.
;;
;; US-019 renamed load-rp-ga-dict -> load-ga-rp-dict and re-pointed it at
;; resources/data/ga_rp.tsv, whose rows are shaped {:word :ga-tokens
;; :rp-tokens} (raw ARPABET/MRPA tokens), not the old {:word :rp :ga}
;; IPA-cell shape. US-022 migrated lookup-rows' :word/:rp/:ga/:pair matching
;; to work against that shape (this subcommand already called the renamed
;; load-ga-rp-dict, confirmed by populate-lexical-sets-cli-calls-load-ga-rp-dict-test
;; above), but core.clj's ipa-lookup CLI wrapper still *prints* (:rp row)/
;; (:ga row) directly, which stay nil/empty on the new row shape -- wiring
;; ga-tokens->ipa/rp-tokens->ipa into that display is US-023's job, not this
;; story's, so the printed RP/GA cells are still expected to come up empty.
(deftest main-dispatches-ipa-lookup-subcommand-test
  (testing "`clojure -M -m nemo-words.core ipa-lookup --word car` prints the row and exits 0 (RP/GA cells empty pending US-023)"
    (let [proc (-> (ProcessBuilder. ["clojure" "-M" "-m" "nemo-words.core" "ipa-lookup" "--word" "car"])
                    (.redirectErrorStream true)
                    .start)
          out (slurp (.getInputStream proc))
          exit-code (.waitFor proc)
          lines (->> (str/split-lines out) (remove str/blank?))]
      (is (= 0 exit-code))
      (is (= ["car\t\t"] lines)))))

;; -------------------------- CLI subcommands use the renamed loader (US-022 AC4)
;; load-rp-ga-dict was renamed load-ga-rp-dict by US-019; this pins that
;; populate-lexical-sets-cli calls the renamed var (not some stale/removed
;; name) by counting invocations through a with-redefs spy.
(deftest populate-lexical-sets-cli-calls-load-ga-rp-dict-test
  (testing "populate-lexical-sets-cli loads the dict via ipa/load-ga-rp-dict"
    (let [path (temp-sets-path)
          calls (atom 0)]
      (with-redefs [ipa/load-ga-rp-dict (fn [] (swap! calls inc) [])
                    sets/default-path path]
        (binding [*out* (java.io.StringWriter.)]
          (core/populate-lexical-sets-cli [])))
      (is (pos? @calls)))))

;; -------------------------------------- pick-example-words-by-ipa exit code (bug-001, US-005 AC4)
;; Same real-process rationale as main-dispatches-ipa-lookup-subcommand-test above:
;; -main must translate a subcommand's returned exit code into an actual
;; process exit code via System/exit, not just discard it.
(deftest main-pick-example-words-by-ipa-missing-lexical-sets-exits-nonzero-test
  (testing "`clojure -M -m nemo-words.core pick-example-words-by-ipa /ɜr/` exits non-zero (per US-005 AC 4) when lexical-sets.edn is missing"
    (is (not (.exists (java.io.File. "resources/lexical-sets.edn")))
        "precondition: resources/lexical-sets.edn (the default path) must not exist for this test to be meaningful")
    (let [proc (-> (ProcessBuilder. ["clojure" "-M" "-m" "nemo-words.core"
                                      "pick-example-words-by-ipa" "/ɜr/"])
                    (.redirectErrorStream true)
                    .start)
          out (slurp (.getInputStream proc))
          exit-code (.waitFor proc)]
      (is (not (zero? exit-code)))
      (is (str/includes? (str/lower-case out) "no lexical sets built yet")))))

;; ---------------------------------------------------------- build-set (US-015)
(def ^:private nurse-dict-fixture
  [{:word "hurt" :rp "/ɜː/" :ga "/ɜr/"}
   {:word "lurk" :rp "/ɜː/" :ga "/ɜr/"}])

(deftest build-set-cli-registers-a-set-test
  (testing "`build-set nurse /ɜː/ /ɜr/ hurt lurk` upserts \"nurse\" and prints a kept/dropped summary"
    (let [path (temp-sets-path)]
      (with-redefs [ipa/load-ga-rp-dict (fn [] nurse-dict-fixture)
                    sets/default-path path]
        (let [out (java.io.StringWriter.)
              exit-code (binding [*out* out]
                          (core/build-set-cli ["nurse" "/ɜː/" "/ɜr/" "hurt" "lurk"]))]
          (is (= 0 exit-code))
          (is (str/includes? (str out) "nurse\tkept 2/2"))
          (is (= {:rp "/ɜː/" :ga "/ɜr/" :words ["hurt" "lurk"]}
                 (get (edn/read-string (slurp path)) "nurse"))))))))

(deftest build-set-cli-reports-dropped-words-test
  (testing "a seed word that no longer matches the dict is dropped and reported"
    (let [path (temp-sets-path)]
      (with-redefs [ipa/load-ga-rp-dict (fn [] nurse-dict-fixture)
                    sets/default-path path]
        (let [out (java.io.StringWriter.)
              exit-code (binding [*out* out]
                          (core/build-set-cli ["nurse" "/ɜː/" "/ɜr/" "hurt" "stale"]))]
          (is (= 0 exit-code))
          (is (str/includes? (str out) "nurse\tkept 1/2\tdropped: [\"stale\"]"))
          (is (= ["hurt"] (get-in (edn/read-string (slurp path)) ["nurse" :words]))))))))

;; ----------------------------------------------- populate-lexical-sets (US-015)
(deftest populate-lexical-sets-cli-writes-all-wells-sets-test
  (testing "`populate-lexical-sets` builds every row of build-set/lexical-sets-table"
    (let [path (temp-sets-path)
          all-words-dict (mapv (fn [[kw rp ga words]]
                                  (mapv (fn [w] {:word w :rp (str "/" rp "/") :ga (str "/" ga "/")})
                                        words))
                                build-set/lexical-sets-table)]
      (with-redefs [ipa/load-ga-rp-dict (fn [] (apply concat all-words-dict))
                    sets/default-path path]
        (let [out (java.io.StringWriter.)
              exit-code (binding [*out* out]
                          (core/populate-lexical-sets-cli []))
              saved (edn/read-string (slurp path))
              lines (->> (str/split-lines (str out)) (remove str/blank?))]
          (is (= 0 exit-code))
          (is (= (count build-set/lexical-sets-table) (count saved) (count lines)))
          (doseq [[kw _rp _ga words] build-set/lexical-sets-table]
            (is (= words (get-in saved [kw :words])) (str kw " keeps every seed word"))))))))

;; --------------------------------------------------------- build-ga-rp-dict (US-019)
(deftest build-ga-rp-dict-cli-writes-tsv-test
  (testing "`build-ga-rp-dict` writes word<TAB>GA<TAB>RP rows to path, printing a row-count summary"
    (let [path (temp-sets-path)]
      (with-redefs [ipa/load-dictionary-by-brand
                    (fn [brand]
                      (case brand
                        :cmudict-raw {"car" ["K AA1 R"]}
                        :beep-raw {"car" ["k aa"]}))]
        (let [out (java.io.StringWriter.)
              exit-code (binding [*out* out]
                          (core/build-ga-rp-dict-cli [] path))
              lines (str/split-lines (slurp path))]
          (is (= 0 exit-code))
          (is (= ["car\tK AA1 R\tk aa"] lines))
          (is (str/includes? (str out) "1")))))))
