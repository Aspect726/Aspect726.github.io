import { CURRICULUM_SKILLS } from './curriculum.mjs';

// Teaching alignment only: this overlay never changes question selection,
// answer grading, course dates or a student's stored mastery.
// Titles and numbering follow the openly published IM catalogs cited below.
export const IM_ALIGNMENT_SOURCES = Object.freeze([
  { id: 'im5', title: 'IM Grade 5 units', url: 'https://im.kendallhunt.com/k5/teachers/grade-5/units.html' },
  { id: 'im5-standards', title: 'IM Grade 5 lessons and standards', url: 'https://im.kendallhunt.com/k5/teachers/grade-5/course-guide/lessons_and_standards.html' },
  { id: 'im6', title: 'IM Grade 6 units', url: 'https://im.kendallhunt.com/MS/teachers/1/index.html' },
  { id: 'im7', title: 'IM Grade 7 units', url: 'https://im.kendallhunt.com/MS/teachers/2/index.html' },
  { id: 'bsd-desmos', title: 'BSD IMT1 and IMT2 Desmos/IM unit guide', url: 'https://resources.finalsite.net/images/v1710338136/bsd405org/az1lnk9yy78svqims0cj/IMT1-and-IMT2-Unit-Guide-Illustrative-Math-via-Desmos-Curriculum.pdf' },
  { id: 'imagine', title: 'Imagine Learning IM elementary curriculum', url: 'https://tours.imaginelearning.com/illustrativemathematicsk-5/' }
].map(Object.freeze));

const titles = {
  5: ['Finding Volume', 'Fractions as Quotients and Fraction Multiplication', 'Multiplying and Dividing Fractions', 'Wrapping Up Multiplication and Division with Multi-Digit Numbers', 'Place Value Patterns and Decimal Operations', 'More Decimal and Fraction Operations', 'Shapes on the Coordinate Plane', 'Putting It All Together'],
  6: ['Area and Surface Area', 'Introducing Ratios', 'Unit Rates and Percentages', 'Dividing Fractions', 'Arithmetic in Base Ten', 'Expressions and Equations', 'Rational Numbers', 'Data Sets and Distributions', 'Putting It All Together'],
  7: ['Scale Drawings', 'Introducing Proportional Relationships', 'Measuring Circles', 'Proportional Relationships and Percentages', 'Rational Number Arithmetic', 'Expressions, Equations, and Inequalities', 'Angles, Triangles, and Prisms', 'Probability and Sampling', 'Putting It All Together']
};
const unitUrl = (grade, number) => grade === 5
  ? `https://im.kendallhunt.com/k5/teachers/grade-5/unit-${number}/lessons.html`
  : `https://im.kendallhunt.com/MS/teachers/${grade - 5}/${number}/index.html`;
export const IM_UNITS = Object.freeze(Object.entries(titles).flatMap(([grade, names]) => names.map((title, index) => Object.freeze({
  id: `${grade}.${index + 1}`, grade: Number(grade), number: index + 1,
  label: `IM ${grade}.${index + 1}`, title, url: unitUrl(Number(grade), index + 1),
  sourceId: `im${grade}`
}))));
const unitById = new Map(IM_UNITS.map(unit => [unit.id, unit]));

// Each course skill has one primary home so coverage totals cannot double-count
// it. Related units are useful teaching connections, not additional completion.
const groups = {
  '5.1': ['G-WVOL', 'E-NUM'],
  '5.3': ['F-MULT', 'F-UNITDIV'],
  '5.4': ['N-WMULT', 'N-DIV'],
  '5.5': ['N-PLACE', 'N-ROUND', 'D-ADD', 'D-SUB', 'D-MULT'],
  '5.6': ['F-ADD', 'F-SUB', 'F-COMP', 'M-CONVERT', 'S-LINEPLOT'],
  '5.7': ['E-PATTERN', 'G-CLASS'],
  '6.1': ['G-PARA', 'G-TRI', 'G-COMP', 'G-SA'],
  '6.2': ['R-RATIO'],
  '6.3': ['R-RATE', 'P-PERCENT'],
  '6.4': ['F-DIV', 'F-WHOLE', 'G-VOL'],
  '6.5': ['D-LONG', 'D-DIV'],
  '6.6': ['E-EXP', 'E-ORDER', 'E-DIST', 'E-FACTOR', 'E-LIKE', 'E-SOLVE', 'E-STORY', 'G-PERIM', 'E-RELATE', 'E-GRAPH'],
  '6.7': ['N-OPP', 'N-ABS', 'N-ORDER', 'N-COORD', 'N-REFLECT', 'N-DIST', 'E-INEQ', 'N-FACTORS'],
  '6.8': ['S-QUESTION', 'S-DISPLAY', 'S-MEAN', 'S-MEDIAN', 'S-CENTER', 'S-RANGE', 'S-IQR', 'S-BOX', 'S-MAD', 'S-SPREAD'],
  '7.1': ['P-SCALE', 'P-MAP'],
  '7.2': ['P-PROP'],
  '7.3': ['G-CIRC', 'G-CAREA'],
  '7.4': ['P-CHANGE'],
  '7.5': ['N-ADD', 'N-MULT', 'N-SDIV'],
  '7.6': ['E-2STEP'],
  '7.8': ['S-PROB', 'S-SAMPLE']
};
const connections = {
  'G-WVOL': ['5.4'], 'E-NUM': ['5.2', '5.3'],
  'F-MULT': ['5.2', '5.6'], 'F-UNITDIV': ['5.2'],
  'N-DIV': ['6.5'], 'N-PLACE': ['5.6'], 'D-ADD': ['6.5'], 'D-SUB': ['6.5'], 'D-MULT': ['6.5'],
  'M-CONVERT': ['6.3'], 'D-LONG': ['5.5'], 'F-WHOLE': ['6.6'],
  'E-EXP': ['6.1'], 'E-FACTOR': ['6.7'], 'E-LIKE': ['7.6'],
  'N-DIST': ['6.1'], 'P-MAP': ['6.3'], 'P-PROP': ['7.4']
};
const notes = {
  'F-COMP': 'Fraction comparison is an earlier-grade prerequisite used in Grade 5 fraction work; this tag does not claim it is newly taught in Unit 5.6.',
  'E-NUM': 'Grouped expressions are developed through volume in Unit 5.1 and used again with fraction multiplication in Units 5.2 and 5.3.',
  'F-UNITDIV': 'Unit-fraction division belongs to Unit 5.3; interpreting a fraction as a quotient connects back to Unit 5.2.',
  'F-WHOLE': 'Finding an unknown whole connects fraction-division reasoning in Unit 6.4 to one-variable equations in Unit 6.6.',
  'G-VOL': 'This skill uses fractional side lengths; the relevant extension is Unit 6.4, building on whole-number volume from Unit 5.1.',
  'E-FACTOR': 'Factoring an expression connects equivalent expressions in Unit 6.6 with common factors in Unit 6.7.',
  'E-LIKE': 'Equivalent expressions begin in Unit 6.6; more general work with like terms continues in Unit 7.6.',
  'G-PERIM': 'Perimeter provides the setting; the course target is writing and solving an equation in Unit 6.6.',
  'N-REFLECT': 'Reflections here mean opposite coordinates across an axis in Unit 6.7, not the later Grade 8 transformation course.',
  'P-MAP': 'Scale drawings belong to Unit 7.1; measurement conversions also connect to Unit 6.3.',
  'S-LINEPLOT': 'Grade 5 fractional line plots appear in Unit 5.6, alongside fraction addition and subtraction.',
  'S-RANGE': 'Range is supporting vocabulary for describing distributions; one range skill does not cover all of Unit 6.8.'
};
const alignmentEntries = [];
const assigned = new Set();
for (const [unitId, skills] of Object.entries(groups)) {
  for (const skillId of skills) {
    if (!CURRICULUM_SKILLS[skillId] || assigned.has(skillId)) throw new Error(`Invalid or repeated IM skill alignment: ${skillId}`);
    assigned.add(skillId);
    alignmentEntries.push([skillId, Object.freeze({
      skillId, primaryUnitId: unitId, primaryUnit: unitById.get(unitId),
      relationship: skillId === 'F-COMP' ? 'prerequisite' : 'focus',
      relatedUnits: Object.freeze((connections[skillId] || []).map(id => Object.freeze({ ...unitById.get(id), relationship: 'supporting' }))),
      note: notes[skillId] || 'A course skill connected to this IM unit; it is not the complete unit.',
      standards: CURRICULUM_SKILLS[skillId].standards
    })]);
  }
}
if (Object.keys(CURRICULUM_SKILLS).some(skill => !assigned.has(skill))) throw new Error('Every course skill needs an IM unit alignment.');
export const IM_SKILL_ALIGNMENT = Object.freeze(Object.fromEntries(alignmentEntries));
export const alignmentForSkill = skill => IM_SKILL_ALIGNMENT[skill] || null;
export const unitForSkill = skill => alignmentForSkill(skill)?.primaryUnit || null;

export const IM_COVERAGE_SCOPE = 'Counts show this website’s course skills, not all lessons in an IM unit. A practiced or mastered course skill does not mean the whole IM unit is complete.';
const masteryName = record => {
  const name = String(record?.mastery ?? record?.level ?? '').toLowerCase().replaceAll(' ', '_');
  return ['learning', 'practicing', 'mastered'].includes(name) ? name : 'learning';
};

export function unitCoverage(progress = []) {
  // Never sum duplicated week entries for the same skill. Each current skill
  // appears exactly once, even when the week map revisits it several times.
  const records = new Map();
  for (const record of Array.isArray(progress) ? progress : []) {
    const id = record?.skill || record?.id;
    if (!IM_SKILL_ALIGNMENT[id]) continue;
    const attempts = Number(record.attempts);
    const current = records.get(id);
    const previous = Number(current?.attempts);
    if (!current || (Number.isInteger(attempts) && attempts > 0 && (!Number.isInteger(previous) || attempts > previous))) records.set(id, record);
  }
  const units = IM_UNITS.map(unit => {
    const skills = alignmentEntries.filter(([, alignment]) => alignment.primaryUnitId === unit.id).map(([id, alignment]) => {
      const record = records.get(id), count = Number(record?.attempts);
      const attempts = Number.isInteger(count) && count > 0 ? count : 0;
      return { id, name: CURRICULUM_SKILLS[id].name, relationship: alignment.relationship,
        level: attempts ? masteryName(record) : 'not_started', attempts };
    });
    const practiced = skills.filter(skill => skill.attempts > 0).length;
    const relatedSkills = alignmentEntries.filter(([, alignment]) => alignment.relatedUnits.some(related => related.id === unit.id))
      .map(([id]) => ({ id, name: CURRICULUM_SKILLS[id].name, relationship: 'supporting' }));
    return { ...unit, skillCount: skills.length, practiced, mastered: skills.filter(skill => skill.level === 'mastered').length,
      notStarted: skills.length - practiced, skills, relatedSkills, relatedSkillCount: relatedSkills.length,
      coverageLabel: skills.length ? 'Selected course skills' : relatedSkills.length ? 'Supporting connections only' : 'No primary course skills mapped',
      scope: IM_COVERAGE_SCOPE };
  });
  return { scope: IM_COVERAGE_SCOPE, summary: {
    courseSkills: assigned.size,
    practiced: units.reduce((sum, unit) => sum + unit.practiced, 0),
    mastered: units.reduce((sum, unit) => sum + unit.mastered, 0)
  }, units, sources: IM_ALIGNMENT_SOURCES };
}
