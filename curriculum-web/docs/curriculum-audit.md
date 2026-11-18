# Bellevue mathematics curriculum alignment

This practice course connects Grade 5 foundations, Bellevue Integrated Math Topics 1, and selected early IMT2 topics. The 70 dates and original focus topics in `server/plan.json` remain intact. `server/curriculum.mjs` adds explicit prerequisites, foundation checks and teaching bridges. A skill being available for review does not mark it mastered.

## District scope and course boundaries

Bellevue identifies IMT1 with grade 6 and 7 standards and IMT2 with grade 7 and 8 standards. Advanced Learning placement uses district decisions and multiple evidence sources; this site's progress measures do not determine placement. The district describes acceleration beyond one year as an elementary guidance-team decision. [BSD math sequence](https://www.bsd405.org/academics/advanced-learning/math-placement), [BSD identification process](https://www.bsd405.org/academics/advanced-learning/identification-process).

The current district overview describes IMT1 work in area, ratios, fractions, decimals, expressions, equations, proportional relationships, circles, percentages, negative arithmetic and data. It describes IMT2 work in transformations, similarity, linear relationships, functions and further algebra. [BSD middle school curriculum](https://www.bsd405.org/academics/instructional-materials-and-family-resources/middle-school-instructional-materials-and-family-resources).

An undated unit guide linked by International School gives a more specific, different boundary: IMT1 comprises IM grade 6 units 1–8 plus grade 7 units 1–3; IMT2 begins with grade 7 percentages, signed arithmetic and equations. That guide also places some grade 8 algebra topics in Algebra 1. It is useful for matching the supplied plan, but its exact division should not be presented as a current district-wide assessment blueprint. [International School unit guide](https://international.bsd405.org/fs/resource-manager/view/10279ff2-de39-4b02-be66-7fbc14a83f9e), [school resource page](https://international.bsd405.org/counseling/academic-resources).

The publisher's accelerated sequence places percent change, signed arithmetic, sampling and simple probability in Accelerated 1. Its Accelerated 2 includes transformations, equations, linear relationships, systems and functions. These publisher materials explain why “IMT1 equals only sixth-grade math” is too narrow; they do not establish the content of an individual placement assessment. [IM Accelerated 1](https://im.kendallhunt.com/MS_ACC/teachers/1/index.html), [IM Accelerated 2](https://im.kendallhunt.com/MS_ACC/teachers/2/index.html).

## Foundation coverage

BSD's Grade 5 overview uses Illustrative Mathematics and includes volume, fractions, whole-number operations, decimal place value and operations, coordinate work and shape relationships. The following table maps those learning targets to the site's original and supplemental skills. A standards alignment identifies a teaching target, not a claim that a numerical answer alone assesses every part of a standard. [BSD Grade 5 overview](https://ardmore.bsd405.org/learning/curriculum), [Grade 5 standards](https://www.thecorestandards.org/Math/Content/5/introduction/).

| Learning target | Original coverage | Supplemental coverage and remaining depth |
| --- | --- | --- |
| Place value, decimal notation, powers of ten and rounding | Decimal regrouping and divisor scaling appeared within D-SUB and D-DIV. WARMUP was only short arithmetic. | N-PLACE and N-ROUND make these explicit. Reading and explaining expanded notation remains an instructional task as well as numerical practice. |
| Whole-number multiplication and division | N-DIV; multiplication appeared inside other problems. | N-WMULT teaches partial products and their connection to the standard algorithm. |
| Decimal addition, subtraction, multiplication and division | D-SUB, D-LONG and D-DIV. | D-ADD and D-MULT complete the four-operation targets and include place-value explanations. |
| Fraction addition, subtraction and multiplication | F-ADD, F-SUB, F-MULT and F-COMP. | Models and discussion must include equivalent fractions, reasonable estimates and why multiplication by a factor below one reduces a positive quantity. |
| Fractions as shares and limited Grade 5 fraction division | General F-DIV was labelled a pre-existing strength. | F-UNITDIV separates sharing and unit-fraction division from general fraction-by-fraction division. F-DIV is introduced explicitly afterward. |
| Numerical expressions and corresponding patterns | E-ORDER and E-GRAPH introduced later algebraic concepts. | E-NUM and E-PATTERN provide Grade 5 grouping and paired-pattern foundations. |
| Measurement conversions | Map scales occurred later. | M-CONVERT covers standard unit relationships; an arbitrary map scale is not a substitute for measurement conversion. |
| Fractional measurement data | S-DISPLAY focused on later statistics. | S-LINEPLOT connects fractions of a unit, repeated observations and totals. |
| Whole-number volume, cube layers and combined prisms | G-VOL did not distinguish the Grade 5 and Grade 6 targets. | G-WVOL handles whole-number dimensions and non-overlapping combined prisms. G-VOL is a later fractional-edge bridge. |
| Coordinate meaning and shape classification | Coordinate skills existed; shape hierarchies did not. | E-PATTERN supports first-quadrant work; G-CLASS teaches properties and overlapping shape categories. |

The detailed target codes are published with each skill in `CURRICULUM_SKILLS`. They link to the official domains: [5.NBT](https://www.thecorestandards.org/Math/Content/5/NBT/), [5.NF](https://www.thecorestandards.org/Math/Content/5/NF/), [5.OA](https://www.thecorestandards.org/Math/Content/5/OA/), [5.MD](https://www.thecorestandards.org/Math/Content/5/MD/), [5.G](https://www.thecorestandards.org/Math/Content/5/G/).

## IMT1 and selected extensions

| Strand | Learning targets in this course | Important distinction |
| --- | --- | --- |
| Ratios and rates | R-RATIO → R-RATE → P-PERCENT → P-PROP | These are taught before review; they are not assumed to be Grade 5 knowledge. |
| Rational arithmetic | Decimal four-operation skills, F-DIV, N-FACTORS, signed number meaning | General fraction division and GCF/LCM are explicit Grade 6 targets. Signed operations are taught later. |
| Expressions and equations | Powers, order, equivalence, factoring, one-step equations, variables and graphs | Factoring includes common factors; recognising an expression is different from constructing and explaining it. |
| Geometry | Area, perpendicular heights, composite area, nets, fractional volume, scales and circles | Whole-number and fractional-edge volume have separate skills. A perpendicular height need not lie inside a triangle. |
| Statistics | Questions, distributions, center, spread, box plots and MAD | Students also need to explain what a measure means and construct representations. Automatic numeric grading alone does not verify drawing a plot. |
| Selected next steps | P-CHANGE, N-ADD, N-MULT, N-SDIV, E-2STEP, S-PROB and S-SAMPLE | These bridge topics are not a claim of complete Grade 7 or complete IMT2 coverage. Sampling and probability lie on different sides of the published course boundary. |

Grade 6 targets include general fraction division, decimal operations, factors and multiples, ratios, unit rates, percentages and unit conversion. Grade 7 extends these ideas to signed operations, proportional relationships and probability. [6.NS](https://www.thecorestandards.org/Math/Content/6/NS/), [6.RP](https://www.thecorestandards.org/Math/Content/6/RP/).

## Teaching order and evidence of learning

The introduction overlay uses short bridges within the daily focus allocation, preserving the original focus dates. Foundations remain available for checks and refreshers without a mastery label. General fraction division precedes finding a whole from a fractional part. Ratio reasoning precedes unit rates and percentages; percent change follows both percentages and proportional relationships. Signed division follows signed multiplication. Data displays and center precede sampling estimates.

Daily practice should combine numerical accuracy with diagrams, units, worked reasoning, comparison and mistake analysis. Teacher review and the student's explanations supply evidence beyond a machine-graded final number. The course does not cover every later IMT2 topic, such as systems, general functions, scientific notation or the Pythagorean theorem, and does not promise an entrance-test outcome.

Sources checked on 14 November 2026. District descriptions and the school unit guide should be reviewed when course boundaries change.
