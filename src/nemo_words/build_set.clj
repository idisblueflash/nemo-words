(ns nemo-words.build-set
  "Register an existing lexical set's hand-picked seed words into
  lexical-sets.edn, re-verifying each against the current dict (US-004)."
  (:require [nemo-words.ipa :as ipa]
            [nemo-words.sets :as sets]))

(defn- load-sets
  "path -> lexical-sets map read from path, or {} if path doesn't exist yet."
  [path]
  (or (sets/load! path) {}))

(defn build-set
  "dict + keyword + rp + ga + words (+ optional path, default
  sets/default-path) -> filters words down to only those that still
  word-matches? rp/ga in dict, upserts keyword -> {:rp :ga :words filtered}
  into the lexical-sets map loaded from path, and saves it back.

  Example:
    (build-set dict \"nurse\" \"/ɜː/\" \"/ɜr/\" [\"hurt\" \"lurk\"])
    ;; writes lexical-sets.edn with \"nurse\" -> {:rp \"/ɜː/\" :ga \"/ɜr/\"
    ;;                                            :words [\"hurt\" \"lurk\"]}"
  ([dict keyword rp ga words] (build-set dict keyword rp ga words sets/default-path))
  ([dict keyword rp ga words path]
   (let [matched (vec (filter #(ipa/word-matches? dict % rp ga) words))
         updated (sets/upsert (load-sets path) keyword {:rp rp :ga ga :words matched})]
     (sets/save! updated path)
     updated)))

;; -------------------------------------------- initial seed table (FEAT-001)
(def lexical-sets-table
  "The 26 Wells Lexical Sets from FEAT-001's reference table, as
  [keyword rp ga words] tuples (rp/ga in the raw substring style
  build-set expects to find inside dict cells, no enclosing slashes).
  This is the one-time seed data for populate-lexical-sets; it's frozen
  data lifted from FEAT-001's markdown table, not derived at runtime.

  The 7 rhotic rows (NURSE, NEAR, SQUARE, START, NORTH, FORCE, CURE) use
  IPA turned-r 'ɹ' in their GA column, not ASCII 'r' — FEAT-001's markdown
  table itself is inconsistent here (lettER already uses 'ɹ', the other 7
  wrote plain 'r'), but the real dict (en_US_RP_ipa.tsv) only ever stores
  'ɹ', so a bare 'r' GA target would never match a real cell."
  [["KIT"     "ɪ"  "ɪ"  ["ship" "sick" "bridge" "milk" "myth" "busy"]]
   ["DRESS"   "ɛ"  "ɛ"  ["step" "neck" "edge" "shelf" "friend" "ready"]]
   ["TRAP"    "æ"  "æ"  ["tap" "back" "badge" "scalp" "hand" "cancel"]]
   ["LOT"     "ɒ"  "ɑ"  ["stop" "sock" "dodge" "romp" "possible" "quality"]]
   ["STRUT"   "ʌ"  "ʌ"  ["cup" "suck" "budge" "pulse" "trunk" "blood"]]
   ["FOOT"    "ʊ"  "ʊ"  ["put" "bush" "full" "good" "look" "wolf"]]
   ["BATH"    "ɑː" "æ"  ["staff" "brass" "ask" "dance" "sample" "calf"]]
   ["CLOTH"   "ɒ"  "ɔ"  ["cough" "broth" "cross" "long" "Boston"]]
   ["NURSE"   "ɜː" "ɜɹ" ["hurt" "lurk" "urge" "burst" "jerk" "term"]]
   ["FLEECE"  "iː" "i"  ["creep" "speak" "leave" "feel" "key" "people"]]
   ["FACE"    "eɪ" "eɪ" ["tape" "cake" "raid" "veil" "steak" "day"]]
   ["PALM"    "ɑː" "ɑ"  ["psalm" "father" "bra" "spa" "lager"]]
   ["THOUGHT" "ɔː" "ɔ"  ["taught" "sauce" "hawk" "jaw" "broad"]]
   ["GOAT"    "əʊ" "oʊ" ["soap" "joke" "home" "know" "so" "roll"]]
   ["GOOSE"   "uː" "u"  ["loop" "shoot" "tomb" "mute" "huge" "view"]]
   ["PRICE"   "aɪ" "aɪ" ["ripe" "write" "arrive" "high" "try" "buy"]]
   ["CHOICE"  "ɔɪ" "ɔɪ" ["adroit" "noise" "join" "toy" "royal"]]
   ["MOUTH"   "aʊ" "aʊ" ["out" "loud" "house" "count" "crowd" "cow"]]
   ["NEAR"    "ɪə" "ɪɹ" ["beer" "sincere" "fear" "beard" "serum"]]
   ["SQUARE"  "ɛə" "ɛɹ" ["care" "fair" "pear" "where" "scarce" "vary"]]
   ["START"   "ɑː" "ɑɹ" ["far" "sharp" "bark" "carve" "farm" "heart"]]
   ["NORTH"   "ɔː" "ɔɹ" ["for" "war" "short" "scorch" "born" "warm"]]
   ["FORCE"   "ɔː" "oɹ" ["four" "wore" "sport" "porch" "borne" "story"]]
   ["CURE"    "ʊə" "ʊɹ" ["sure" "tourist" "pure" "plural" "jury"]]
   ["happY"   "i"  "i"  ["copy" "coffee" "taxi" "sortie" "committee" "hockey" "Chelsea"]]
   ["lettER"  "ə"  "ɚ"  ["paper" "metre" "calendar" "stupor" "succour" "martyr"]]
   ["commA"   "ə"  "ə"  ["sofa" "quota" "vodka"]]])

(defn populate-lexical-sets
  "dict (+ optional path, default sets/default-path) -> runs build-set for
  every row in lexical-sets-table, upserting/saving each into path in turn.
  Returns a seq of {:keyword :kept :dropped} summaries, one per row, in
  table order, so a caller (e.g. the CLI) can report what happened without
  re-reading the saved file.

  Example:
    (populate-lexical-sets dict)
    ;; writes all 26 Wells sets into lexical-sets.edn
    ;=> ({:keyword \"KIT\" :kept [...] :dropped [...]} ...)"
  ([dict] (populate-lexical-sets dict sets/default-path))
  ([dict path]
   (mapv (fn [[keyword rp ga words]]
           (let [result (build-set dict keyword rp ga words path)
                 kept (get-in result [keyword :words])]
             {:keyword keyword
              :kept kept
              :dropped (vec (remove (set kept) words))}))
         lexical-sets-table)))
