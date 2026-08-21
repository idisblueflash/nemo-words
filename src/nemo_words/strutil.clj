(ns nemo-words.strutil
  "Naming layer over clojure.string: call sites read as verb-str
  (replace-str, split-str, ...) instead of the bare str/verb alias, so
  callers depend on this namespace rather than reaching into the external
  lib directly."
  (:require [clojure.string :as str]))

(defn replace-str
  "Replace occurrences of match (string or regex) in s with replacement.

  Example:
    (replace-str \"a-b-c\" \"-\" \"_\") ;=> \"a_b_c\""
  [s match replacement]
  (str/replace s match replacement))

(defn trim-str
  "Trim leading and trailing whitespace from s.

  Example:
    (trim-str \"  hi  \") ;=> \"hi\""
  [s]
  (str/trim s))

(defn split-str
  "Split s on re, optionally capping the number of parts at limit.

  Example:
    (split-str \"a,b,c\" #\",\")   ;=> [\"a\" \"b\" \"c\"]
    (split-str \"a,b,c\" #\",\" 2) ;=> [\"a\" \"b,c\"]"
  ([s re] (str/split s re))
  ([s re limit] (str/split s re limit)))

(defn lower-case-str
  "Lower-case s.

  Example:
    (lower-case-str \"ABC\") ;=> \"abc\""
  [s]
  (str/lower-case s))

(defn blank-str?
  "true if s is nil, empty, or entirely whitespace.

  Example:
    (blank-str? \"   \") ;=> true
    (blank-str? \"hi\")  ;=> false"
  [s]
  (str/blank? s))

(defn includes-str?
  "true if s contains substr.

  Example:
    (includes-str? \"hello world\" \"lo wo\") ;=> true"
  [s substr]
  (str/includes? s substr))

(defn join-str
  "Join coll into a string, optionally interposing separator between elements.

  Example:
    (join-str [\"a\" \"b\" \"c\"])      ;=> \"abc\"
    (join-str \", \" [\"a\" \"b\" \"c\"]) ;=> \"a, b, c\""
  ([coll] (str/join coll))
  ([separator coll] (str/join separator coll)))
