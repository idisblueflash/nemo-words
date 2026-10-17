---
id: C-043
type: concept
status: active
aliases: [confidence interval, small-sample statistics]
related: [C-040, C-041, C-044]
---
# C-043 Wilson interval

**Meaning:** A range around a measured rate that holds the true rate with 95% certainty. On a small set of words the range is wide, so a spike report shows it next to the rate. It stays correct on small sets and near 0% or 100%, where the simple "rate ± 2 errors" range does not.
**Example:** SP-064 got 13 of 62 exact (21%). The Wilson interval is 13% to 33%. The whole range is above the chance rate (11%). It is also all below the always-cell-1 rule (39%).
**Not the same as:** the binomial test against chance. The interval shows how sure a rate is. The test asks only whether the rate beats chance.
