(ns nemo-words.rank)

(defn top-n
  "Sort rows by score-key descending and keep the top n. Pure, stable sort."
  [rows score-key n]
  (->> rows (sort-by score-key >) (take n)))
