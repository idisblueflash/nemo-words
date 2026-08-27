(ns build
  "tools.build script for the nemo-words CLI.

  Usage: clojure -T:build uberjar
  Produces target/nemo-words.jar — a self-contained jar (all deps and
  resources/data/* baked in) runnable with `java -jar target/nemo-words.jar
  <subcommand> [args...]`."
  (:require [clojure.java.io :as io]
            [clojure.tools.build.api :as b]))

(def lib 'nemo-words/nemo-words)
(def class-dir "target/classes")
(def uber-file "target/nemo-words.jar")
(def basis (delay (b/create-basis {:project "deps.edn"})))

;; kaikki-en.jsonl (~3GB, .gitignore'd raw scrape) and wikipron_uk_broad.tsv
;; (unreferenced anywhere in src/) are dev-only inputs, never read at
;; runtime by nemo-words.core -main — excluded so the uberjar ships only
;; what the CLI actually needs (ga_rp.tsv + lexical-sets.edn, plus the
;; cmudict/beep raw dicts that build-ga-rp-dict re-derives ga_rp.tsv from).
;; b/copy-dir's :ignores matches file *names* only, not full paths.
(def excluded-resources
  [#"kaikki-en\.jsonl" #"wikipron_uk_broad\.tsv"])

(defn clean [_]
  (b/delete {:path "target"}))

(defn uberjar [_]
  (clean nil)
  (b/copy-dir {:src-dirs ["src"]
               :target-dir class-dir})
  (b/copy-dir {:src-dirs ["resources"]
               :target-dir class-dir
               :ignores excluded-resources})
  (b/compile-clj {:basis @basis
                  :ns-compile '[nemo-words.core]
                  :class-dir class-dir})
  (b/uber {:class-dir class-dir
           :uber-file uber-file
           :basis @basis
           :main 'nemo-words.core}))
