import plan from './plan.json' with { type: 'json' };

// This is a teaching overlay. The supplied plan and its dates remain authoritative.
// Standards describe the intended learning target, not proof of student mastery.
export const SUPPLEMENTAL_SKILLS = Object.freeze({
  'N-PLACE':'Place value, powers of ten and decimals',
  'N-ROUND':'Round decimals and check estimates',
  'N-WMULT':'Multiply multi-digit whole numbers',
  'D-ADD':'Add decimals with place-value reasoning',
  'D-MULT':'Multiply decimals and explain the size of the product',
  'M-CONVERT':'Convert measurement units in a problem',
  'F-UNITDIV':'Share wholes and divide with unit fractions',
  'E-NUM':'Write and evaluate grouped numerical expressions',
  'E-PATTERN':'Compare two numerical patterns and their graphs',
  'N-FACTORS':'Common factors, greatest common factor and least common multiple',
  'N-SDIV':'Divide signed numbers',
  'G-CLASS':'Classify shapes by their properties',
  'G-WVOL':'Build and combine whole-number prism volumes',
  'S-LINEPLOT':'Read fractional measurements on a line plot',
  'S-PROB':'Reason about simple probability',
  'S-SAMPLE':'Use a representative sample to make an estimate'
});

export const CURRICULUM_SOURCES = Object.freeze([
  {id:'bsd-sequence',title:'Bellevue School District math sequence',url:'https://www.bsd405.org/academics/advanced-learning/math-placement',scope:'IMT1 combines grade 6 and 7 standards; IMT2 combines grade 7 and 8. Placement is a district decision.'},
  {id:'bsd-middle',title:'Bellevue School District middle school curriculum',url:'https://www.bsd405.org/academics/instructional-materials-and-family-resources/middle-school-instructional-materials-and-family-resources',scope:'Current district descriptions of IMT1 and IMT2.'},
  {id:'bsd-unit-guide',title:'International School IMT1 and IMT2 unit guide',url:'https://international.bsd405.org/fs/resource-manager/view/10279ff2-de39-4b02-be66-7fbc14a83f9e',scope:'Published unit guide: IMT1 uses IM 6.1–6.8 and 7.1–7.3. Its course boundary differs from the current district overview.'},
  {id:'bsd-grade5',title:'BSD grade 5 curriculum overview',url:'https://ardmore.bsd405.org/learning/curriculum',scope:'Grade 5 uses Illustrative Mathematics, including fractions, decimal operations, volume, patterns and shapes.'},
  {id:'im-accelerated1',title:'Illustrative Mathematics Accelerated 1',url:'https://im.kendallhunt.com/MS_ACC/teachers/1/index.html',scope:'Publisher sequence includes rational arithmetic, percent change, sampling and simple probability. Not an entrance-test specification.'},
  {id:'im-accelerated2',title:'Illustrative Mathematics Accelerated 2',url:'https://im.kendallhunt.com/MS_ACC/teachers/2/index.html',scope:'Publisher sequence includes transformations, equations, linear relationships and later grade 8 work.'},
  {id:'ccss5',title:'Grade 5 mathematics standards',url:'https://www.thecorestandards.org/Math/Content/5/introduction/',scope:'Grade 5 learning targets and mathematical practices.'},
  {id:'ccss6',title:'Grade 6 mathematics standards',url:'https://www.thecorestandards.org/Math/Content/6/introduction/',scope:'Grade 6 learning targets.'},
  {id:'ccss7',title:'Grade 7 mathematics standards',url:'https://www.thecorestandards.org/Math/Content/7/introduction/',scope:'Grade 7 learning targets used for the selected bridge.'}
]);

export const CURRICULUM_STAGES = Object.freeze([
  {id:'grade5',title:'Grade 5 · Check and strengthen',description:'Refresh foundations and find anything that needs another explanation. Availability does not mean mastery.'},
  {id:'imt1',title:'IMT1 · Build understanding',description:'Learn the connected grade 6 and selected grade 7 ideas in the course.'},
  {id:'bridge',title:'Next steps · Early IMT2',description:'Extend the foundations with selected signed-number, percentage and equation problems.'}
]);

// These skills can be checked from the start. They are never marked mastered here.
// General fraction division, ratios, percentages and fractional-edge volume are new learning.
export const GRADE5_REVIEW_SKILLS = Object.freeze([
  'F-ADD','F-SUB','F-MULT','F-COMP','N-DIV',
  'N-PLACE','N-ROUND','N-WMULT','D-ADD','D-MULT','M-CONVERT','F-UNITDIV',
  'E-NUM','E-PATTERN','G-CLASS','G-WVOL','S-LINEPLOT'
]);

const bridge = (skill,dayIndex,practiceDays,prerequisites,title) => Object.freeze({skill,dayIndex,practiceDays:Object.freeze(practiceDays),prerequisites:Object.freeze(prerequisites),title});
export const CURRICULUM_BRIDGES = Object.freeze([
  bridge('D-ADD',0,[0,2],['N-PLACE'],'Line up equal place values'),
  bridge('F-DIV',1,[1,3],['F-UNITDIV','F-MULT'],'From unit fractions to fraction division'),
  bridge('D-MULT',2,[2,4],['N-PLACE','N-WMULT'],'Explain a decimal product'),
  bridge('M-CONVERT',4,[4,6],['N-PLACE','N-WMULT','N-DIV'],'Keep the quantity while changing its unit'),
  bridge('N-FACTORS',8,[8,10],['N-WMULT','N-DIV'],'Find common factors and common multiples'),
  bridge('G-VOL',22,[22,24],['G-WVOL','F-MULT'],'Use fractional lengths in a prism'),
  bridge('R-RATIO',42,[42,43],['F-COMP','N-WMULT'],'Compare two quantities with a ratio'),
  bridge('R-RATE',44,[44,45],['R-RATIO','N-DIV'],'Find the amount for one unit'),
  bridge('P-PERCENT',46,[46,47],['R-RATE','F-MULT'],'Connect parts out of one hundred'),
  bridge('S-PROB',48,[48,50],['F-COMP','S-DISPLAY'],'Count possible and favourable outcomes'),
  bridge('S-SAMPLE',51,[51,53],['R-RATIO','P-PROP','S-MEAN'],'Use a fair sample to estimate'),
  bridge('P-CHANGE',56,[56,57],['P-PERCENT','P-PROP'],'Compare a change with the original amount'),
  bridge('N-SDIV',65,[65,67],['N-MULT','F-DIV'],'Use multiplication to explain signed division')
]);

// Standards are aligned teaching targets. Some require explanation or drawing as
// well as the machine-graded numerical practice; see docs/curriculum-audit.md.
const targets = {
  'D-SUB':['grade5',['5.NBT.B.7','6.NS.B.3'],['N-PLACE']],
  'D-LONG':['imt1',['5.NBT.B.6','6.NS.B.2','6.NS.B.3'],['N-DIV','N-PLACE']],
  'D-DIV':['imt1',['6.NS.B.3'],['N-PLACE','D-LONG']],
  'F-WHOLE':['imt1',['6.NS.A.1','6.EE.B.7'],['F-DIV']],
  'E-EXP':['imt1',['6.EE.A.1'],['E-NUM','F-MULT','D-MULT']],
  'E-ORDER':['imt1',['6.EE.A.1','6.EE.A.2.c'],['E-NUM','E-EXP']],
  'E-DIST':['imt1',['6.EE.A.3','6.EE.A.4'],['E-NUM','N-WMULT']],
  'E-FACTOR':['imt1',['6.NS.B.4','6.EE.A.3'],['N-FACTORS','E-DIST']],
  'E-LIKE':['imt1',['6.EE.A.3','6.EE.A.4','7.EE.A.1'],['E-DIST']],
  'E-SOLVE':['imt1',['6.EE.B.5','6.EE.B.6','6.EE.B.7'],['E-NUM','F-DIV']],
  'E-STORY':['imt1',['6.EE.B.6','6.EE.B.7'],['E-SOLVE']],
  'G-PERIM':['imt1',['6.EE.B.7'],['E-SOLVE','N-WMULT']],
  'E-RELATE':['imt1',['6.EE.C.9'],['E-PATTERN','E-SOLVE']],
  'E-GRAPH':['imt1',['6.EE.C.9'],['E-PATTERN','E-RELATE']],
  'G-PARA':['imt1',['6.G.A.1'],['N-WMULT','G-CLASS']],
  'G-TRI':['imt1',['6.G.A.1'],['G-PARA']],
  'G-COMP':['imt1',['6.G.A.1'],['G-PARA','G-TRI']],
  'G-SA':['imt1',['6.G.A.4'],['G-COMP','G-WVOL']],
  'N-OPP':['imt1',['6.NS.C.5','6.NS.C.6.a'],['N-PLACE']],
  'N-ABS':['imt1',['6.NS.C.7.c','6.NS.C.7.d'],['N-OPP']],
  'N-ORDER':['imt1',['6.NS.C.7.a','6.NS.C.7.b'],['N-OPP','F-COMP']],
  'N-COORD':['imt1',['6.NS.C.6.b','6.NS.C.6.c','6.NS.C.8'],['E-PATTERN','N-ORDER']],
  'N-REFLECT':['imt1',['6.NS.C.6.b'],['N-COORD']],
  'N-DIST':['imt1',['6.NS.C.8','6.G.A.3'],['N-COORD','N-ABS','G-PARA']],
  'E-INEQ':['imt1',['6.EE.B.5','6.EE.B.8'],['N-ORDER']],
  'S-QUESTION':['imt1',['6.SP.A.1','6.SP.A.2'],['S-LINEPLOT']],
  'S-DISPLAY':['imt1',['6.SP.B.4','6.SP.B.5.a','6.SP.B.5.b'],['S-LINEPLOT','S-QUESTION']],
  'S-MEAN':['imt1',['6.SP.A.3','6.SP.B.5.c'],['S-DISPLAY','N-DIV']],
  'S-MEDIAN':['imt1',['6.SP.A.3','6.SP.B.5.c'],['S-DISPLAY']],
  'S-CENTER':['imt1',['6.SP.B.5.d'],['S-MEAN','S-MEDIAN']],
  'S-RANGE':['imt1',['6.SP.A.3','6.SP.B.5.c'],['S-DISPLAY']],
  'S-IQR':['imt1',['6.SP.B.5.c'],['S-MEDIAN']],
  'S-BOX':['imt1',['6.SP.B.4'],['S-IQR','S-RANGE']],
  'S-MAD':['imt1',['6.SP.B.5.c'],['S-MEAN','N-ABS']],
  'S-SPREAD':['imt1',['6.SP.B.5.d'],['S-CENTER','S-IQR','S-MAD']],
  'P-PROP':['imt1',['7.RP.A.1','7.RP.A.2'],['R-RATE','E-GRAPH']],
  'P-SCALE':['imt1',['7.G.A.1'],['P-PROP','G-PARA']],
  'P-MAP':['imt1',['7.G.A.1','6.RP.A.3.d'],['P-PROP','M-CONVERT']],
  'G-CIRC':['imt1',['7.G.B.4'],['P-PROP','D-MULT']],
  'G-CAREA':['imt1',['7.G.B.4'],['G-CIRC','E-EXP']],
  'N-ADD':['bridge',['7.NS.A.1'],['N-OPP','N-ORDER']],
  'N-MULT':['bridge',['7.NS.A.2.a','7.NS.A.2.c'],['N-ADD','F-MULT']],
  'E-2STEP':['bridge',['7.EE.B.4.a'],['E-SOLVE','E-DIST','N-ADD']],
  'F-ADD':['grade5',['5.NF.A.1','5.NF.A.2'],['F-COMP']],
  'F-SUB':['grade5',['5.NF.A.1','5.NF.A.2'],['F-COMP']],
  'F-MULT':['grade5',['5.NF.B.4','5.NF.B.5','5.NF.B.6'],['F-COMP']],
  'F-DIV':['imt1',['6.NS.A.1'],['F-UNITDIV','F-MULT']],
  'F-COMP':['grade5',['4.NF.A.2','5.NF.A.2'],[]],
  'R-RATIO':['imt1',['6.RP.A.1','6.RP.A.3.a'],['N-WMULT','F-COMP']],
  'R-RATE':['imt1',['6.RP.A.2','6.RP.A.3.b'],['R-RATIO','N-DIV']],
  'P-PERCENT':['imt1',['6.RP.A.3.c'],['R-RATE','F-MULT']],
  'P-CHANGE':['bridge',['7.RP.A.3'],['P-PERCENT','P-PROP']],
  'N-DIV':['grade5',['5.NBT.B.6','6.NS.B.2'],['N-WMULT']],
  'G-VOL':['imt1',['6.G.A.2'],['G-WVOL','F-MULT']],
  'N-PLACE':['grade5',['5.NBT.A.1','5.NBT.A.2','5.NBT.A.3'],[]],
  'N-ROUND':['grade5',['5.NBT.A.4'],['N-PLACE']],
  'N-WMULT':['grade5',['5.NBT.B.5'],['N-PLACE']],
  'D-ADD':['grade5',['5.NBT.B.7','6.NS.B.3'],['N-PLACE']],
  'D-MULT':['grade5',['5.NBT.B.7','6.NS.B.3'],['N-PLACE','N-WMULT']],
  'M-CONVERT':['grade5',['5.MD.A.1','6.RP.A.3.d'],['N-PLACE','N-WMULT','N-DIV']],
  'F-UNITDIV':['grade5',['5.NF.B.3','5.NF.B.7'],['F-COMP','N-DIV']],
  'E-NUM':['grade5',['5.OA.A.1','5.OA.A.2'],['N-WMULT','N-DIV']],
  'E-PATTERN':['grade5',['5.OA.B.3','5.G.A.1','5.G.A.2'],['E-NUM']],
  'N-FACTORS':['imt1',['6.NS.B.4'],['N-WMULT','N-DIV']],
  'N-SDIV':['bridge',['7.NS.A.2.b','7.NS.A.2.c'],['N-MULT','F-DIV']],
  'G-CLASS':['grade5',['5.G.B.3','5.G.B.4'],[]],
  'G-WVOL':['grade5',['5.MD.C.3','5.MD.C.4','5.MD.C.5'],['N-WMULT']],
  'S-LINEPLOT':['grade5',['5.MD.B.2'],['F-ADD','F-SUB']],
  'S-PROB':['bridge',['7.SP.C.5','7.SP.C.6','7.SP.C.7'],['F-COMP','S-DISPLAY']],
  'S-SAMPLE':['bridge',['7.SP.A.1','7.SP.A.2'],['R-RATIO','P-PROP','S-MEAN']]
};

function plannedIntroduction(skill) {
  if (GRADE5_REVIEW_SKILLS.includes(skill)) return 0;
  const extra=CURRICULUM_BRIDGES.find(item=>item.skill===skill);
  if(extra)return extra.dayIndex;
  const day=plan.days.find(item=>item.focus==='mixed'
    ? ['saturday','sunday'].some(name=>plan.weeks[item.week-1][name].skills.includes(skill))
    : plan.weeks[item.week-1][item.focus].skills.includes(skill));
  return day ? plan.days.indexOf(day) : 69;
}

export const CURRICULUM_SKILLS = Object.freeze(Object.fromEntries(Object.entries({...plan.skills,...SUPPLEMENTAL_SKILLS}).map(([id,name])=>{
  if(!targets[id])throw new Error(`Missing curriculum target for ${id}`);
  const [stage,standards,prerequisites]=targets[id];
  return [id,Object.freeze({id,name,stage,standards:Object.freeze(standards),prerequisites:Object.freeze(prerequisites),introductionDay:plannedIntroduction(id),
    reviewFromStart:GRADE5_REVIEW_SKILLS.includes(id),masteryAssumed:false,
    standardUrls:Object.freeze([...new Set(standards.map(code=>{const [grade,domain]=code.split('.');return `https://www.thecorestandards.org/Math/Content/${grade}/${domain}/`;}))]),
    scope:stage==='grade5'?'Check and strengthen prior foundations':stage==='imt1'?'Teach before independent practice':'Selected extension; course boundaries vary across published guides'
  })];
})));

export const curriculumForSkill = skill => CURRICULUM_SKILLS[skill] ?? null;
export function curriculumOverview() {
  return {stages:CURRICULUM_STAGES,skills:Object.values(CURRICULUM_SKILLS),bridges:CURRICULUM_BRIDGES,sources:CURRICULUM_SOURCES,
    scope:'Grade 5 foundations, IMT1 topics and selected early IMT2 extensions. This is a learning plan, not a district placement decision or an entrance-test specification.'};
}
