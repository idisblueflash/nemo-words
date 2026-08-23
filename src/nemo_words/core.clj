(ns nemo-words.core
  (:require [nemo-words.build-set :as build-set]
            [nemo-words.freq :as freq]
            [nemo-words.ioutil :as ioutil]
            [nemo-words.ipa :as ipa]
            [nemo-words.sets :as sets]
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

(defn pick-example-words-by-ipa
  "Thin CLI wrapper: lexical-sets map + query IPA string -> sets/pick-by-ga
  -> print one line of EDN (a vector of {:keyword :rp :ga :words} maps) to
  stdout. Returns the process exit code (always 0).

  Example:
    (pick-example-words-by-ipa
      {\"nurse\" {:rp \"/ɜː/\" :ga \"/ɜr/\" :words [\"bird\"]}} \"/ɜr/\")
    ;; prints [{:keyword \"nurse\", :rp \"/ɜː/\", :ga \"/ɜr/\", :words [\"bird\"]}]
    ;=> 0"
  [lexical-sets query]
  (println (pr-str (sets/pick-by-ga lexical-sets query)))
  0)

(defn pick-example-words-by-ipa-cli
  "Full CLI entry for the pick-example-words-by-ipa subcommand: loads
  lexical-sets.edn (or path, when given, for testability) and either
  delegates to pick-example-words-by-ipa or, if the file doesn't exist
  yet, prints a clear error to stderr and returns a non-zero exit code.

  Example:
    (pick-example-words-by-ipa-cli [\"/ɜr/\"]) ;; reads lexical-sets.edn, prints matches, exits 0"
  ([args] (pick-example-words-by-ipa-cli args sets/default-path))
  ([args path]
   (let [query (first args)
         lexical-sets (sets/load! path)]
     (if (nil? lexical-sets)
       (do (binding [*out* *err*]
             (println "No lexical sets built yet. Run build-set (US-004) first."))
           1)
       (pick-example-words-by-ipa lexical-sets query)))))

(defn- report-build-set-summary
  "Print one \"KEYWORD kept N/M dropped: [...]\" line per row summary
  returned by build-set/build-set or build-set/populate-lexical-sets."
  [{:keys [keyword kept dropped]} seed-count]
  (println (str keyword "\tkept " (count kept) "/" seed-count
                (when (seq dropped) (str "\tdropped: " (pr-str dropped))))))

(defn build-set-cli
  "Full CLI entry for the build-set subcommand: `build-set <keyword> <rp>
  <ga> <word> [<word> ...]` verifies each given word against the current
  dict and upserts/saves keyword -> {:rp :ga :words} into lexical-sets.edn.
  Prints a one-line kept/dropped summary and returns exit code 0.

  Example:
    (build-set-cli [\"nurse\" \"ɜː\" \"ɜr\" \"hurt\" \"lurk\"])
    ;; prints \"nurse\\tkept 2/2\", writes lexical-sets.edn
    ;=> 0"
  [args]
  (let [[keyword rp ga & words] args
        dict (ipa/load-rp-ga-dict)
        result (build-set/build-set dict keyword rp ga words)
        kept (get-in result [keyword :words])]
    (report-build-set-summary {:keyword keyword
                                :kept kept
                                :dropped (vec (remove (set kept) words))}
                               (count words))
    0))

(defn populate-lexical-sets-cli
  "Full CLI entry for the populate-lexical-sets subcommand (no args):
  registers all 26 Wells Lexical Sets from FEAT-001's reference table
  (nemo-words.build-set/lexical-sets-table) into lexical-sets.edn, one
  build-set call per row. Prints one kept/dropped summary line per set
  and returns exit code 0. Safe to re-run (each row is an idempotent
  upsert) if the underlying dict is updated later.

  Example:
    (populate-lexical-sets-cli [])
    ;; prints one summary line per Wells set, writes lexical-sets.edn
    ;=> 0"
  [_args]
  (let [dict (ipa/load-rp-ga-dict)
        summaries (build-set/populate-lexical-sets dict)]
    (doseq [{:keys [kept dropped] :as summary} summaries]
      (report-build-set-summary summary (+ (count kept) (count dropped))))
    0))

(defn -main
  "Entry point invoked by `clj -M -m nemo-words.core`. Dispatches the
  word-freq, ipa-lookup, pick-example-words-by-ipa, build-set, and
  populate-lexical-sets subcommands; any other/no args prints a greeting.
  Passes the dispatched subcommand's returned exit code to System/exit so
  the real OS process exit status matches it (a bare return value here has
  no effect on the process).

  Example:
    (-main) ;; prints \"Hello, nemo-words!\"
    (-main \"word-freq\" \"car\" \"star\") ;; prints \"car\\t<freq>\" then \"star\\t<freq>\"
    (-main \"ipa-lookup\" \"--word\" \"car\") ;; prints \"car\\t/kɑː/\\t/kɑɹ/\", exits 0
    (-main \"pick-example-words-by-ipa\" \"/ɜr/\") ;; prints an EDN vector of matches, exits 0
    (-main \"build-set\" \"nurse\" \"ɜː\" \"ɜr\" \"hurt\" \"lurk\") ;; upserts \"nurse\" into lexical-sets.edn
    (-main \"populate-lexical-sets\") ;; upserts all 26 Wells sets into lexical-sets.edn"
  [& args]
  (let [[subcommand & rest-args] args
        exit-code (cond
                    (= subcommand "word-freq") (word-freq-cli rest-args)
                    (= subcommand "ipa-lookup") (ipa-lookup (ipa/load-rp-ga-dict) rest-args)
                    (= subcommand "pick-example-words-by-ipa") (pick-example-words-by-ipa-cli rest-args)
                    (= subcommand "build-set") (build-set-cli rest-args)
                    (= subcommand "populate-lexical-sets") (populate-lexical-sets-cli rest-args)
                    :else (do (println "Hello, nemo-words!") 0))]
    (System/exit exit-code)))
