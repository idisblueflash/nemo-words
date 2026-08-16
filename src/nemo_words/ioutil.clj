(ns nemo-words.ioutil
  "Naming layer over clojure.java.io: call sites read as verb-io
  (resource-io, reader-io, ...) instead of the bare io/verb alias, so
  callers depend on this namespace rather than reaching into the external
  lib directly."
  (:require [clojure.java.io :as io]))

(defn resource-io
  "Look up a classpath resource by path, returning a java.net.URL, or nil
  if no such resource exists.

  Example:
    (resource-io \"data/en_US.txt\") ;=> #object[java.net.URL ...]
    (resource-io \"no/such/file\")   ;=> nil"
  [path]
  (io/resource path))

(defn reader-io
  "Open x (URL, File, String path, InputStream, ...) as a java.io.Reader.

  Example:
    (with-open [r (reader-io (resource-io \"data/en_US.txt\"))]
      (line-seq r))"
  [x]
  (io/reader x))
