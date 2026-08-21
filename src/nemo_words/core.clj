(ns nemo-words.core
  (:require [nemo-words.ipa :as ipa]))

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
  ipa-lookup subcommand (loading resources/data/en_US_RP_ipa.tsv via
  nemo-words.ipa/load-rp-ga-dict); any other/no args prints a greeting.

  Example:
    (-main) ;; prints \"Hello, nemo-words!\"
    (-main \"ipa-lookup\" \"--word\" \"car\") ;; prints \"car\\t/kɑː/\\t/kɑɹ/\", exits 0"
  [& args]
  (let [[subcommand & rest-args] args]
    (if (= subcommand "ipa-lookup")
      (ipa-lookup (ipa/load-rp-ga-dict) rest-args)
      (println "Hello, nemo-words!"))))
