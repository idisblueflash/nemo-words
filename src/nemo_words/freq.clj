(ns nemo-words.freq
  "Annotate word rows with corpus frequency from Google Books Ngram
  Viewer's JSON endpoint (see US-002's PoC). Network I/O is isolated behind
  fetch-freq-map, the one impure boundary in this namespace — tests redef
  it rather than exercising the real HTTP call, per the story's own note
  that this call is mocked, not unit-tested."
  (:require [clojure.data.json :as json]
            [clojure.string :as str])
  (:import (java.net URI)
           (java.net.http HttpClient HttpRequest HttpResponse$BodyHandlers)))

(def ^:private chunk-size 400)
(def ^:private year-start 2015)
(def ^:private year-end 2019)
(def ^:private corpus "en-2019")

(defn- ngram-url
  "words -> the Google Books Ngram Viewer JSON endpoint URL for that
  comma-joined batch (same undocumented endpoint as the US-002 PoC).

  Example:
    (ngram-url [\"car\" \"star\"]) ;=> \"https://books.google.com/ngrams/json?content=car%2Cstar&...\""
  [words]
  (str "https://books.google.com/ngrams/json?content="
       (URI. nil nil (str/join "," words) nil)
       "&year_start=" year-start
       "&year_end=" year-end
       "&corpus=" corpus
       "&smoothing=0"))

(defn- fetch-json
  "url -> parsed JSON body (as Clojure data) from a GET request. Impure:
  performs a real HTTP call via java.net.http.HttpClient."
  [url]
  (let [client (HttpClient/newHttpClient)
        request (-> (HttpRequest/newBuilder (URI/create url))
                    (.header "User-Agent" "Mozilla/5.0")
                    .GET
                    .build)
        response (.send client request (HttpResponse$BodyHandlers/ofString))]
    (json/read-str (.body response) :key-fn keyword)))

(defn- mean
  "coll of numbers -> arithmetic mean, or nil for an empty coll.

  Example:
    (mean [1 2 3]) ;=> 2"
  [coll]
  (when (seq coll)
    (/ (reduce + coll) (double (count coll)))))

(defn- chunk-freq-map
  "One chunk (<= chunk-size words) -> {word freq}, fetched in a single
  request. Only :type \"NGRAM\" entries count (CASE_INSENSITIVE/EXPANSION
  rows are aggregates, not per-word data)."
  [words]
  (->> (fetch-json (ngram-url words))
       (filter #(= "NGRAM" (:type %)))
       (reduce (fn [acc {:keys [ngram timeseries]}]
                 (update acc (str/lower-case ngram) (fnil into []) timeseries))
               {})
       (reduce-kv (fn [acc word series] (assoc acc word (mean series))) {})))

(defn fetch-freq-map
  "words (seq of strings) -> {word freq}. Impure: hits the Google Ngram
  endpoint over the network, chunked at chunk-size words per request.
  Words absent from the corpus are simply missing from the returned map
  (annotate-freq treats that as 0, never nil). Tests should with-redefs
  this rather than calling it directly."
  [words]
  (->> (partition-all chunk-size words)
       (map chunk-freq-map)
       (apply merge)))

(defn annotate-freq
  "rows (seq of {:word ...}) -> rows with :freq assoc'd, in the same order.
  :freq is always numeric — 0 for a word absent from the corpus, never nil
  (US-010's (sort-by score-key >) throws on a nil key).

  Example:
    (annotate-freq [{:word \"car\"} {:word \"star\"}])
    ;=> [{:word \"car\" :freq 1.23E-5} {:word \"star\" :freq 4.56E-6}]"
  [rows]
  (let [freq-map (fetch-freq-map (map :word rows))]
    (mapv (fn [row] (assoc row :freq (get freq-map (:word row) 0))) rows)))
