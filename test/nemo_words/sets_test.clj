(ns nemo-words.sets-test
  (:require [clojure.edn :as edn]
            [clojure.java.io :as io]
            [clojure.test :refer [deftest is testing]]
            [nemo-words.sets :as sets])
  (:import (java.io File)))

(defn- temp-path []
  (let [f (File/createTempFile "lexical-sets" ".edn")]
    (.delete f)
    (.deleteOnExit f)
    (.getPath f)))

(deftest upsert-create-new-entry-test
  (testing "Create a new entry"
    (let [lexical-sets {"trap" ["cat" "hat"]}
          result (sets/upsert lexical-sets "nurse" ["bird" "word"])]
      (is (= ["bird" "word"] (get result "nurse")))
      (is (= ["cat" "hat"] (get result "trap"))))))

(deftest upsert-update-existing-entry-test
  (testing "Update an existing entry"
    (let [lexical-sets {"trap" ["cat" "hat"] "nurse" ["bird" "word"]}
          result (sets/upsert lexical-sets "nurse" ["fern" "curl"])]
      (is (= ["fern" "curl"] (get result "nurse")))
      (is (= ["cat" "hat"] (get result "trap")))
      (is (= 2 (count result))))))

(deftest save-creates-file-if-missing-test
  (testing "Save creates the file if missing"
    (let [path (temp-path)]
      (is (not (.exists (io/file path))))
      (sets/save! {"nurse" ["bird" "word"]} path)
      (is (.exists (io/file path)))
      (is (= {"nurse" ["bird" "word"]} (edn/read-string (slurp path)))))))

(deftest save-overwrites-existing-file-test
  (testing "Save overwrites the file if present"
    (let [path (temp-path)]
      (spit path (pr-str {"trap" ["cat" "hat"]}))
      (sets/save! {"nurse" ["bird" "word"]} path)
      (is (= {"nurse" ["bird" "word"]} (edn/read-string (slurp path)))))))

(deftest save-fails-test
  (testing "Save fails: throws and leaves any pre-existing file untouched"
    (let [path (temp-path)
          f (io/file path)]
      (spit path (pr-str {"trap" ["cat" "hat"]}))
      (.setWritable f false)
      (try
        (is (thrown? Exception (sets/save! {"nurse" ["bird" "word"]} path)))
        (is (= {"trap" ["cat" "hat"]} (edn/read-string (slurp path))))
        (finally
          (.setWritable f true))))))
