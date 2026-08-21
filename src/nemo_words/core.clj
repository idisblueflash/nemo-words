(ns nemo-words.core
  (:require [nemo-words.freq :as freq]
            [nemo-words.ioutil :as ioutil]
            [nemo-words.ipa :as ipa]
            [nemo-words.strutil :as strutil]))

(defn- clean-lines
  "Raw lines -> trimmed, non-blank words, order preserved.

  Example:
    (clean-lines [\"car\" \"\" \"  star  \"]) ;=> (\"car\" \"star\")"
  [lines]
  (->> lines (map strutil/trim-str) (remove strutil/blank-str?)))

(defn- read-words-from-file
  "path -> seq of non-blank, trimmed words, one per line of the file.

  Example:
    (read-words-from-file \"words.txt\") ;=> (\"car\" \"star\")"
  [path]
  (with-open [r (ioutil/reader-io path)]
    (clean-lines (doall (line-seq r)))))

(defn- resolve-words
  "CLI args for word-freq -> seq of words: the args themselves, or lines
  from `--file <path>`, or (when neither is given) lines read from stdin.

  Example:
    (resolve-words [\"car\" \"star\"])         ;=> (\"car\" \"star\")
    (resolve-words [\"--file\" \"words.txt\"]) ;=> lines from words.txt, blanks dropped"
  [args]
  (cond
    (= (first args) "--file") (read-words-from-file (second args))
    (seq args) args
    :else (clean-lines (line-seq (java.io.BufferedReader. *in*)))))

(defn word-freq
  "Thin CLI wrapper: seq of words -> freq/annotate-freq -> print TSV
  \"word\\tfreq\", one line per word, in the same order as given.

  Example:
    (word-freq [\"car\" \"star\"])
    ;; prints \"car\\t1.5E-5\" then \"star\\t2.5E-6\""
  [words]
  (let [rows (map #(hash-map :word %) words)]
    (doseq [{:keys [word freq]} (freq/annotate-freq rows)]
      (println (str word "\t" freq)))
    0))

(defn word-freq-cli
  "Full CLI entry for the word-freq subcommand: resolves words from args,
  `--file <path>`, or stdin, then delegates to word-freq.

  Example:
    (word-freq-cli [\"car\" \"star\"])          ;; same as (word-freq [\"car\" \"star\"])
    (word-freq-cli [\"--file\" \"words.txt\"])  ;; reads words.txt instead"
  [args]
  (word-freq (resolve-words args)))

(defn- parse-ipa-lookup-args
  "CLI args for the ipa-lookup subcommand -> opts map for lookup-rows.

  Example:
    (parse-ipa-lookup-args [\"--word\" \"car\"])            ;=> {:word \"car\"}
    (parse-ipa-lookup-args [\"--pair\" \"/rp/\" \"/ga/\"])   ;=> {:pair [\"/rp/\" \"/ga/\"]}"
  [args]
  (let [[flag a b] args]
    (case flag
      "--word" {:word a}
      "--rp" {:rp a}
      "--ga" {:ga a}
      "--pair" {:pair [a b]}
      "--pair-substring" {:pair-substring [a b]}
      {})))

(defn ipa-lookup
  "Thin CLI wrapper: dict + CLI args -> lookup-rows -> print TSV
  \"word\\tRP\\tGA\", one line per row. Returns the process exit code (always
  0, even for zero matches).

  Example:
    (ipa-lookup [{:word \"car\" :rp \"/kɑː/\" :ga \"/kɑɹ/\"}] [\"--word\" \"car\"])
    ;; prints \"car\\t/kɑː/\\t/kɑɹ/\"
    ;=> 0"
  [dict args]
  (let [opts (parse-ipa-lookup-args args)
        rows (ipa/lookup-rows dict opts)]
    (doseq [row rows]
      (println (str (:word row) "\t" (:rp row) "\t" (:ga row))))
    0))

(defn -main
  "Entry point invoked by `clj -M -m nemo-words.core`. Dispatches the
  word-freq and ipa-lookup subcommands; any other/no args prints a greeting.

  Example:
    (-main) ;; prints \"Hello, nemo-words!\"
    (-main \"word-freq\" \"car\" \"star\") ;; prints \"car\\t<freq>\" then \"star\\t<freq>\"
    (-main \"ipa-lookup\" \"--word\" \"car\") ;; prints \"car\\t/kɑː/\\t/kɑɹ/\", exits 0"
  [& args]
  (let [[subcommand & rest-args] args]
    (cond
      (= subcommand "word-freq") (word-freq-cli rest-args)
      (= subcommand "ipa-lookup") (ipa-lookup (ipa/load-rp-ga-dict) rest-args)
      :else (println "Hello, nemo-words!"))))
