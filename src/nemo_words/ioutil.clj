(ns nemo-words.ioutil
  "Naming layer over clojure.java.io: call sites read as verb-io
  (resource-io, reader-io, ...) instead of the bare io/verb alias, so
  callers depend on this namespace rather than reaching into the external
  lib directly."
  (:require [clojure.java.io :as io]))

(defn resource-io [path]
  (io/resource path))

(defn reader-io [x]
  (io/reader x))
