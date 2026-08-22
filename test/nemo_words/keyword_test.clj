(ns nemo-words.keyword-test
  (:require [clojure.java.shell :as shell]
            [clojure.test :refer [deftest is testing]]
            [nemo-words.keyword :as keyword]))

;; ---------------------------------------------------------- fixtures
(def ^:private top-60-fixture
  ;; one short, common, unambiguous word ("car") among some plausible peers
  (mapv (fn [w] {:word w :freq 1})
        ["car" "gnarly" "narwhal" "far" "star"]))

;; ---- AC1: a distinct headword exists among the top 60 -> pick-keyword
;; returns it (mocking the impure subprocess call).
(deftest pick-keyword-returns-claude-choice-test
  (testing "pick-keyword returns the word Claude chose"
    (with-redefs [keyword/invoke-claude (fn [_prompt] "car")]
      (is (= "car" (keyword/pick-keyword top-60-fixture))))))

;; ---- AC2: the returned keyword must be a member of the given list, never
;; an invented word.
(deftest pick-keyword-rejects-invented-word-test
  (testing "pick-keyword throws if the subprocess answer isn't in the list"
    (with-redefs [keyword/invoke-claude (fn [_prompt] "banana")]
      (is (thrown-with-msg? clojure.lang.ExceptionInfo
                             #"not among the candidate rows"
                             (keyword/pick-keyword top-60-fixture))))))

;; ---- AC3: if the `claude -p` subprocess exits non-zero (or times out),
;; the error propagates clearly -- pick-keyword must not catch/swallow it.
(deftest pick-keyword-propagates-subprocess-error-test
  (testing "an exception raised by invoke-claude (e.g. non-zero exit, timeout) propagates unchanged"
    (with-redefs [keyword/invoke-claude
                  (fn [_prompt]
                    (throw (ex-info "claude -p exited non-zero"
                                     {:exit 1 :err "boom"})))]
      (is (thrown-with-msg? clojure.lang.ExceptionInfo
                             #"claude -p exited non-zero"
                             (keyword/pick-keyword top-60-fixture))))))

;; ---- AC3, unit: invoke-claude itself raises (rather than swallowing) a
;; non-zero exit from the underlying `claude -p` process.
(deftest invoke-claude-throws-on-nonzero-exit-test
  (testing "a non-zero exit code from the subprocess raises ex-info with the exit/err details"
    (with-redefs [shell/sh (fn [& _args] {:exit 1 :out "" :err "rate limited"})]
      (is (thrown-with-msg? clojure.lang.ExceptionInfo
                             #"exited non-zero"
                             (keyword/invoke-claude "any prompt"))))))

