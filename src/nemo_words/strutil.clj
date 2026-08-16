(ns nemo-words.strutil
  "Naming layer over clojure.string: call sites read as verb-str
  (replace-str, split-str, ...) instead of the bare str/verb alias, so
  callers depend on this namespace rather than reaching into the external
  lib directly."
  (:require [clojure.string :as str]))

(defn replace-str [s match replacement]
  (str/replace s match replacement))

(defn trim-str [s]
  (str/trim s))

(defn split-str
  ([s re] (str/split s re))
  ([s re limit] (str/split s re limit)))

(defn lower-case-str [s]
  (str/lower-case s))

(defn blank-str? [s]
  (str/blank? s))

(defn join-str
  ([coll] (str/join coll))
  ([separator coll] (str/join separator coll)))
