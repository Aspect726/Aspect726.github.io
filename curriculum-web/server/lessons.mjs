import plan from './plan.json' with { type: 'json' };
import { SUPPLEMENTAL_SKILLS, curriculumForSkill } from './curriculum.mjs';

// Original teaching notes. Examples are supplied separately by checked generators.
const notes = {
 'D-SUB':['Line up decimal places before subtracting.','A zero can hold a place even when there is nothing in it. Regroup one unit as ten units in the next smaller place, keeping the total unchanged.','Whole → tenths → hundredths → thousandths'],
 'D-LONG':['Division can continue beyond the decimal point.','A remainder can be renamed as tenths, then hundredths. Put a decimal point in the quotient above the dividend’s decimal point and keep making equal groups.','Remainder → rename → divide again'],
 'D-DIV':['Scale both numbers by the same power of ten.','Make the divisor a whole number. Multiplying both numbers by the same amount preserves the number of groups.','Dividend ÷ divisor = scaled dividend ÷ scaled divisor'],
 'F-WHOLE':['Divide the known part by the fraction of the whole.','The fraction tells you how much of one whole you have. Find the size of one equal part, then rebuild all the parts.','Known part ÷ fraction = whole'],
 'E-EXP':['An exponent counts equal factors.','The base is multiplied by itself as many times as the exponent says. A fraction or decimal base follows the same rule.','Base × base × … = power'],
 'E-ORDER':['Group first, then powers, then products, then sums.','Work inside parentheses before using exponents. Multiplication and division share a rank, as do addition and subtraction: work left to right within a rank.','Parentheses → exponents → × and ÷ → + and −'],
 'E-DIST':['Multiply every term inside the parentheses.','A group containing two amounts can be split into two groups. The outside factor belongs to both terms, not just the first.','a(b + c) = ab + ac'],
 'E-FACTOR':['Pull out the greatest factor shared by every term.','Factoring reverses distributing. Divide each term by the common factor, then put the remaining terms inside parentheses.','ab + ac = a(b + c)'],
 'E-LIKE':['Combine terms only when their variable parts match.','Coefficients tell how many of the same kind of term you have. A number alone and a variable term are different kinds, so they stay separate.','ax + bx = (a + b)x'],
 'E-SOLVE':['Keep both sides equal while undoing an operation.','An equation is a balance. Apply the same inverse operation to each side, then substitute your answer to check the original equation.','Equal sides → same operation → equal sides'],
 'E-STORY':['Name the unknown, write a relationship, then solve.','Decide what the variable measures and include its unit. Translate the whole story into an equation before calculating, and check that the answer fits the story.','Story → equation → solution → check'],
 'G-PERIM':['A rectangle has two lengths and two widths.','Perimeter measures the distance around the outside. Add all four sides, or double the sum of one length and one width.','P = 2l + 2w'],
 'E-RELATE':['The dependent value follows a rule from the input.','Choose the independent value first. Use the rule to find the dependent value; to work backwards, undo the rule in reverse order.','Input → rule → output'],
 'E-GRAPH':['Each table row becomes an ordered pair on the graph.','Read the input as the horizontal coordinate and the output as the vertical coordinate. Check more than one pair before deciding which rule fits.','Input x | rule | output y'],
 'G-PARA':['Parallelogram area is base times perpendicular height.','Slide a triangular end across to make a rectangle with the same area. The height must meet the base at a right angle; the sloping side is not the height.','A = b × h'],
 'G-TRI':['A triangle has half the area of its matching parallelogram.','Two copies of a triangle can make a parallelogram. The height is perpendicular to the base, even when its foot falls outside the triangle.','A = b × h ÷ 2'],
 'G-COMP':['Split a complex region into shapes whose areas you know.','Add areas of pieces that do not overlap. For a cut-out, subtract its area from the larger shape, keeping square units throughout.','Whole area = sum of pieces − cut-outs'],
 'G-SA':['Surface area counts every outside face once.','Imagine unfolding the solid into a net. Find the area of each face and add them; hidden faces still count if they are on the outside of the solid.','Surface area = sum of face areas'],
 'N-OPP':['Opposites are equally far from zero on opposite sides.','Taking the opposite changes the direction from zero. Taking the opposite twice brings you back to the original number.','Opposite of a is −a'],
 'N-ABS':['Absolute value measures distance from zero.','Distance is never negative. A number and its opposite therefore have the same absolute value.','Distance from zero = |a|'],
 'N-ORDER':['Numbers increase as you move right on a number line.','Among negative numbers, the one closer to zero is greater. Use equivalent fractions or decimals when the written forms make comparison difficult.','Left: smaller | zero | right: greater'],
 'N-COORD':['Read an ordered pair horizontally, then vertically.','Start at the origin. The first coordinate moves left or right, and the second moves down or up.','(x, y): across first, then up or down'],
 'N-REFLECT':['A reflection reverses the coordinate across the mirror line.','Across the x-axis, keep x and change the sign of y. Across the y-axis, keep y and change the sign of x.','x-axis: (x, −y) | y-axis: (−x, y)'],
 'N-DIST':['For aligned points, subtract the changing coordinates.','If x stays the same, the distance is vertical. If y stays the same, the distance is horizontal; take the absolute value so the distance is nonnegative. For a rectangle drawn from coordinate vertices, use horizontal and vertical distances as its length and width, then multiply them to find the area.','Aligned distance = |second coordinate − first coordinate|; rectangle area = width × height'],
 'E-INEQ':['An inequality describes every value that makes a comparison true.','Use an open point for a strict boundary and a filled point when the boundary is included. Shade towards the values that satisfy the statement.','< or >: open | ≤ or ≥: included'],
 'S-QUESTION':['A statistical question expects variation in a group of answers.','Collecting data helps answer it because people or objects can have different values. A question about one fixed fact does not need a distribution.','Question → varied data → description'],
 'S-DISPLAY':['A display shows how often values or intervals occur.','A dot plot keeps individual values visible. A histogram groups numerical values into intervals; use the stated interval boundaries when counting.','Value or interval | frequency'],
 'S-MEAN':['Mean is the equal share of the total.','Add the values, then divide by how many values there are. If a mean and count are known, multiply them to recover the total.','Mean = total ÷ count'],
 'S-MEDIAN':['The median is the middle of an ordered list.','Sort the values before finding the middle. If there are two middle values, their mean is the median.','Order → middle value or middle pair'],
 'S-CENTER':['An unusual value pulls the mean more than the median.','The mean uses every value’s size. The median uses their positions, so it often describes a typical value better when one value is far away.','Mean: all sizes | median: middle position'],
 'S-RANGE':['Range is the largest value minus the smallest.','Range describes the full distance across the data. It uses only the two endpoints, so it does not describe how the middle values are arranged.','Range = maximum − minimum'],
 'S-IQR':['The interquartile range measures the spread of the middle half.','Order the data and find the median of each half. Subtract the lower quartile from the upper quartile.','IQR = Q3 − Q1'],
 'S-BOX':['A box plot locates five landmarks in ordered data.','Read the minimum, lower quartile, median, upper quartile and maximum. The box covers the middle half of the data, not half the length of the axis.','Minimum | Q1 | median | Q3 | maximum'],
 'S-MAD':['MAD is the mean distance of values from their mean.','First find the mean. Find each value’s absolute distance from it, then average those distances.','Mean → absolute distances → mean of distances'],
 'S-SPREAD':['Compare center and spread separately.','Two groups can have the same mean but different spreads. Name the measure you use and compare values in the same units.','Typical value: center | variation: spread'],
 'P-PROP':['In a proportional relationship, y divided by x is constant.','The constant of proportionality tells how much y belongs to one x. Its graph is a straight line through the origin.','y = kx | k = y ÷ x'],
 'P-SCALE':['A length scale factor is applied to every corresponding length.','Scaling two dimensions changes area by the square of the length factor. Keep length factors and area factors separate.','Length factor k | area factor k²'],
 'P-MAP':['A scale connects a drawing length to a real length.','Write the scale with its units. Multiply or divide by the same scale factor to move between the map and the real place.','Drawing length × scale rate = real length'],
 'G-CIRC':['Circumference is the distance around a circle.','A diameter is twice a radius. Multiply the diameter by the stated value of pi to find the circumference.','C = πd = 2πr'],
 'G-CAREA':['Circle area uses the square of the radius.','Area measures the inside in square units. Use the radius rather than the diameter, and distinguish area from the distance around the circle.','A = πr²'],
 'N-ADD':['Adding moves along the number line; subtracting adds the opposite.','Positive movement goes right and negative movement goes left. Replace subtraction with addition of the opposite before combining signed numbers.','a − b = a + (−b)'],
 'N-MULT':['Equal signs give a positive product; different signs give a negative one.','First determine the sign. Multiply the absolute values, then attach the sign you found.','Same signs: positive | different signs: negative'],
 'E-2STEP':['Undo operations in reverse order while keeping the equation balanced.','For a multiplied variable plus a number, undo the addition first. For a factor outside parentheses, you can first divide both sides by that factor.','Outside operation undone first → isolate variable'],
 'F-ADD':['Use equal-sized parts before adding fractions.','Rename fractions with a common denominator. Add the numerators, keep the common denominator, and simplify when possible.','Equal denominators → add numerators'],
 'F-SUB':['Use equal-sized parts before subtracting fractions.','Rename both fractions with a common denominator. Subtract the numerators and simplify the result.','Equal denominators → subtract numerators'],
 'F-MULT':['Multiply numerators together and denominators together.','A fraction of a fraction means part of a part. Cancel shared factors before or after multiplying to write the result simply.','a/b × c/d = ac/bd'],
 'F-DIV':['Dividing asks how many groups fit in an amount.','To divide by a nonzero fraction, multiply by its reciprocal. Check by multiplying the quotient by the divisor.','a/b ÷ c/d = a/b × d/c'],
 'F-COMP':['Compare fractions using equal denominators or a common benchmark.','Equal denominators make the part sizes match, so numerators can be compared directly. One half and one whole can also help place fractions.','Same-sized parts → compare part counts'],
 'R-RATIO':['Equivalent ratios scale both quantities by the same factor.','Keep track of whether a comparison is part-to-part or part-to-whole. Add the parts before using a whole in the ratio.','a : b = ka : kb'],
 'R-RATE':['A unit rate tells how much belongs to one unit.','Divide the total amount by the number of units. Keep the units with the result so you know what one means.','Total amount ÷ number of units'],
 'P-PERCENT':['A percent is a number of parts out of one hundred.','Write a percent as a fraction or decimal of the whole. The equation part equals rate times whole can be used to find any missing quantity.','Part = percent rate × whole'],
 'P-CHANGE':['Percent change compares the change with the original amount.','Find the increase or decrease first. Divide that change by the original amount, then express the ratio as a percent.','Percent change = change ÷ original × 100%'],
 'N-DIV':['Divide into equal groups and keep track of the remainder.','Each step divides a place-value amount. Check that divisor times quotient plus remainder rebuilds the dividend.','Dividend = divisor × quotient + remainder'],
 'G-VOL':['Volume counts unit cubes that fill a solid.','Find the area of the base, then multiply by the height. Fractional edges still multiply in the same way; the answer uses cubic units.','V = length × width × height'],
 'N-PLACE':['A digit’s value depends on the place it occupies.','Each place is ten times the place to its right and one tenth of the place to its left. Read the whole number and fractional parts separately. A zero can hold a place without adding any value.','4.206 = 4 ones + 2 tenths + 0 hundredths + 6 thousandths'],
 'N-ROUND':['Choose the nearest value at the requested place.','Find the two neighbouring multiples of the place you are rounding to. Compare the number’s distance from each one. At the halfway point, use the stated rounding rule; for positive numbers here, round up.','2.36 is between 2.3 and 2.4; it is nearer 2.4'],
 'N-WMULT':['Break a large multiplication into place-value products.','Each digit stands for a place-value amount. Multiply each part of one factor by each part of the other, then combine the partial products. The standard algorithm records the same reasoning in columns.','23 × 14 = 200 + 30 + 80 + 12 = 322'],
 'D-ADD':['Add quantities with the same place value together.','Line up decimal points so ones meet ones, tenths meet tenths, and hundredths meet hundredths. Add a zero as a placeholder if it helps. Regroup ten hundredths into one tenth, just as with whole numbers.','2.35 + 1.40 = 3.75'],
 'D-MULT':['Use whole-number products to count smaller decimal units.','Tenths multiplied by tenths make hundredths. Work out the product of the digit counts, then name the unit of each small piece. Check the size: multiplying a positive quantity by less than one makes it smaller.','12 tenths × 3 tenths = 36 hundredths = 0.36'],
 'M-CONVERT':['Change the unit while keeping the measured quantity equal.','Write a known unit relationship first. Multiply when changing to smaller units because more of them fit; divide when changing to larger units. Keep the unit on every line, and convert before comparing or adding.','1 metre = 100 centimetres, so 2.4 metres = 240 centimetres'],
 'F-UNITDIV':['Draw equal shares or count unit-fraction groups.','A fraction can describe an equal share: sharing one half among three people gives each person one sixth. Dividing a whole by a unit fraction asks how many of those small groups fit inside it. Check by multiplying back.','1/2 ÷ 3 = 1/6; 2 ÷ 1/4 = 8'],
 'E-NUM':['Grouping symbols tell which calculation happens first.','Read a numerical expression as a set of instructions. Work inside parentheses, brackets or braces first, from the innermost group out. Then multiply or divide before adding or subtracting, working left to right within a rank.','3 × (8 + 2) = 3 × 10 = 30'],
 'E-PATTERN':['Compare corresponding terms in two growing patterns.','Use each rule from its stated starting value. Pair terms from the same step, then plot the first pattern horizontally and the second vertically. Explain how corresponding values are related instead of guessing from one pair.','Steps 0, 1, 2, 3: A is 0, 2, 4, 6; B is 0, 3, 6, 9'],
 'N-FACTORS':['Factors make equal groups; multiples count repeated groups.','A common factor divides both quantities without a remainder; the greatest common factor makes the largest equal groups. A common multiple is reached by counting in either group size; the least positive one finds the first shared total.','GCF(12, 18) = 6; LCM(4, 6) = 12'],
 'N-SDIV':['Use a related multiplication to explain the quotient’s sign.','Division undoes multiplication. Ask which number multiplied by the divisor gives the dividend. Equal signs give a positive quotient and different signs give a negative quotient. Zero can be divided by a nonzero number; division by zero is undefined.','−12 ÷ 3 = −4 because 3 × (−4) = −12'],
 'G-CLASS':['A shape keeps the properties of every larger group it belongs to.','Classify shapes using their sides and angles, not how they are turned on the page. A square has four right angles, so it is a rectangle; it also has four equal sides, so it is a rhombus. Some shape groups overlap.','Square → rectangle → parallelogram → quadrilateral'],
 'G-WVOL':['Count layers of unit cubes, then combine separate solids.','A rectangular prism has length times width cubes in each layer and height layers. Multiply to find its volume. For a solid made from non-overlapping prisms, add their volumes; do not count a shared region twice.','3 × 2 × 2 + 2 × 2 × 2 = 12 + 8 = 20 cubic units'],
 'S-LINEPLOT':['Every mark represents one measurement at that position.','Read the fraction labels before counting marks. Repeated marks are separate observations, not a larger measurement. To find a total, multiply each measurement by its frequency and add; keep the measurement unit.','Total measurement = sum of value × frequency'],
 'S-PROB':['Compare favourable outcomes with all equally likely outcomes.','When every outcome is equally likely, probability is the favourable count divided by the total count. A probability of zero means impossible and one means certain. Expected counts describe long-run patterns, not a promise about one trial.','2 blue counters out of 6 equally likely counters gives probability 1/3'],
 'S-SAMPLE':['A representative sample can support an estimate about a larger group.','A fair selection method gives members of the population a chance to be chosen. Find the sample proportion, then scale it to the population. The result is an estimate, so explain who was sampled and why the sample may or may not represent everyone.','12 of 20 sampled students walk: estimate 12/20 × 100 = 60 of 100 students']
};

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function wrap(text, width = 46) {
 const words=String(text).split(' '), lines=[''];
 for(const word of words){if((lines.at(-1)+' '+word).trim().length>width) lines.push(word);else lines[lines.length-1]=(lines.at(-1)+' '+word).trim();}
 return lines;
}
function ruleModel(label, rule) {
 const lines=wrap(rule),height=80+lines.length*25;
 return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escape(label+': '+rule)}" viewBox="0 0 520 ${height}"><title>${escape(label)}</title><rect x="1" y="1" width="518" height="${height-2}" rx="10" fill="#FBF8F2" stroke="#E2DACB"/><path d="M24 44H496" stroke="#1F5A63"/><text x="24" y="30" font-family="sans-serif" font-size="16" fill="#173F45">The relationship</text>${lines.map((line,i)=>`<text x="24" y="${76+i*25}" font-family="sans-serif" font-size="18" fill="#1E2A2C">${escape(line)}</text>`).join('')}</svg>`;
}

function supplementalModel(id,name) {
 const t=(x,y,value,size=17)=>`<text x="${x}" y="${y}" font-family="sans-serif" font-size="${size}" fill="#263452">${escape(value)}</text>`;
 const box=(x,y,w,h,fill='#eee9ff')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="#7867c2"/>`;
 const line=(x1,y1,x2,y2)=>`<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="#596b99" stroke-width="2"/>`;
 let content='',height=245;
 if(id==='N-PLACE') {
  const labels=['ones','tenths','hundredths','thousandths'];
  content=labels.map((label,i)=>box(20+i*125,50,115,103)+t(30+i*125,78,label,14)+t(63+i*125,124,[4,2,0,6][i],30)).join('')+t(25,193,'4.206 = 4 + 0.2 + 0.006',21)+t(25,220,'Each step right is one tenth of the previous place.',15);
 } else if(id==='N-ROUND') {
  content=line(50,120,470,120)+Array.from({length:11},(_,i)=>line(50+i*42,111,50+i*42,129)).join('')+t(35,155,'2.3')+t(443,155,'2.4')+`<circle cx="302" cy="120" r="7" fill="#e67a35"/>`+t(277,94,'2.36')+line(302,70,470,70)+t(305,57,'nearer to 2.4',15)+t(38,201,'To the nearest tenth: 2.36 → 2.4',20);
 } else if(id==='N-WMULT') {
  content=t(148,42,'20')+t(327,42,'3')+t(40,95,'10')+t(45,163,'4')+box(90,53,215,71)+box(305,53,125,71,'#e3f2ff')+box(90,124,215,62,'#e3f2ff')+box(305,124,125,62,'#fff0d7')+t(173,98,'200',24)+t(350,98,'30',24)+t(180,162,'80',24)+t(350,162,'12',24)+t(75,222,'23 × 14 = 200 + 30 + 80 + 12 = 322',18);
 } else if(id==='D-ADD') {
  const row=(y,a,b,c)=>t(180,y,a,25)+t(235,y,'.',25)+t(290,y,b,25)+t(395,y,c,25);
  content=box(60,45,400,142)+t(164,70,'ones',16)+t(268,70,'tenths',16)+t(355,70,'hundredths',16)+row(103,2,3,5)+t(115,137,'+',25)+row(137,1,4,0)+line(130,147,420,147)+row(176,3,7,5)+t(57,219,'Equal places line up. 1.4 and 1.40 are equal.',17);
 } else if(id==='D-MULT') {
  content=Array.from({length:36},(_,i)=>box(44+(i%12)*34,65+Math.floor(i/12)*30,32,28,i%12<10?'#eee9ff':'#e3f2ff')).join('')+t(190,47,'12 tenths',19)+t(48,185,'3 rows of 12 hundredths = 36 hundredths',17)+t(160,221,'1.2 × 0.3 = 0.36',23);
 } else if(id==='M-CONVERT') {
  content=box(35,70,180,58)+box(215,70,180,58)+box(395,70,72,58,'#fff0d7')+t(94,105,'1 m',22)+t(274,105,'1 m',22)+t(402,105,'0.4 m',17)+t(82,155,'100 cm')+t(262,155,'100 cm')+t(400,155,'40 cm')+t(155,207,'2.4 m = 240 cm',24);
 } else if(id==='F-UNITDIV') {
  content=Array.from({length:6},(_,i)=>box(35+i*75,78,75,65,i<3?['#ddd4ff','#c9e5ff','#ffe3bc'][i]:'#fff')).join('')+t(44,60,'One half of the whole',17)+t(50,113,'1/6',21)+t(125,113,'1/6',21)+t(200,113,'1/6',21)+t(40,182,'Share the shaded half equally among 3 people.',17)+t(146,221,'1/2 ÷ 3 = 1/6 each',23);
 } else if(id==='E-NUM') {
  content=box(115,45,290,55)+t(142,82,'3 × (8 + 2)',28)+line(250,105,250,126)+box(115,132,290,55,'#e3f2ff')+t(170,168,'3 × 10',28)+t(208,224,'= 30',29);
 } else if(id==='E-PATTERN') {
  content=t(25,54,'Step',16)+t(103,54,'A (+2)',16)+t(190,54,'B (+3)',16)+[0,1,2,3].map((n)=>t(36,84+n*29,n,18)+t(120,84+n*29,n*2,18)+t(210,84+n*29,n*3,18)).join('')+line(298,190,475,190)+line(298,190,298,38)+[0,1,2,3].map(n=>line(298+n*50,186,298+n*50,194)+t(293+n*50,209,n*2,12)+(n?line(294,190-n*45,302,190-n*45)+t(280,194-n*45,n*3,12):'')+`<circle cx="${298+n*50}" cy="${190-n*45}" r="5" fill="#7960c8"/>`).join('')+line(298,190,448,55)+t(478,208,'A',15)+t(280,35,'B',15)+t(25,229,'Pairs: (0, 0), (2, 3), (4, 6), (6, 9)',19);
 } else if(id==='N-FACTORS') {
  content=t(30,52,'12 = 6 × 2',23)+t(290,52,'18 = 6 × 3',23)+Array.from({length:12},(_,i)=>`<circle cx="${36+i%6*29}" cy="${86+Math.floor(i/6)*25}" r="8" fill="#8971d4"/>`).join('')+Array.from({length:18},(_,i)=>`<circle cx="${296+i%6*29}" cy="${86+Math.floor(i/6)*25}" r="8" fill="#57a1d2"/>`).join('')+t(110,183,'Largest common group size: 6',19)+t(45,224,'4, 8, 12, …   and   6, 12, …   → LCM is 12',18);
 } else if(id==='N-SDIV') {
  content=line(45,128,475,128)+[-12,-8,-4,0].map((n,i)=>line(55+i*135,120,55+i*135,137)+t(40+i*135,165,n,20)).join('')+[0,1,2].map(i=>`<path d="M${460-i*135} 118 Q${392-i*135} 23 ${325-i*135} 118" fill="none" stroke="#8c63cc" stroke-width="3"/>`+t(373-i*135,69,'−4',18)).join('')+t(67,214,'3 equal changes of −4 make a total change of −12.',17);
 } else if(id==='G-CLASS') {
  content=box(20,38,480,180,'#f1f6ff')+t(30,64,'Quadrilaterals: four sides',18)+box(45,77,430,125,'#e7e2ff')+t(60,102,'Parallelograms: opposite sides parallel',16)+box(70,116,380,72,'#ddd3ff')+t(84,140,'Rectangles: four right angles',16)+box(245,149,190,31,'#fff1d5')+t(252,171,'Squares: equal sides',15);
 } else if(id==='G-WVOL') {
  const cube=(x,y,w,h,depth,label)=>`<path d="M${x} ${y}h${w}v${h}h-${w}zM${x} ${y}l${depth} -${depth}h${w}l-${depth} ${depth}M${x+w} ${y}l${depth} -${depth}v${h}l-${depth} ${depth}" fill="#e7e1ff" stroke="#7867c2" stroke-width="2"/>`+t(x+15,y+h/2+7,label,21);
  content=cube(43,79,155,83,25,'12 cubes')+cube(290,89,120,73,23,'8 cubes')+t(224,131,'+',31)+t(62,193,'3 × 2 × 2')+t(300,193,'2 × 2 × 2')+t(104,228,'Together: 20 cubic units',22);
 } else if(id==='S-LINEPLOT') {
  const frequencies=[1,2,3,2];
  content=line(45,162,475,162)+frequencies.map((n,i)=>t(67+i*115,190,['1/4','1/2','3/4','1'][i],18)+Array.from({length:n},(_,j)=>t(75+i*115,146-j*28,'×',25)).join('')).join('')+t(150,222,'Each × is one measurement.',17);
 } else if(id==='S-PROB') {
  content=Array.from({length:6},(_,i)=>`<circle cx="${65+i*78}" cy="105" r="25" fill="${i<4?'#d46372':'#498dc4'}" stroke="#354c71"/>`).join('')+t(40,162,'Four red and two blue counters; each is equally likely.',16)+t(79,208,'P(blue) = 2 ÷ 6 = 1/3',24);
 } else if(id==='S-SAMPLE') {
  content=box(25,43,470,135)+Array.from({length:20},(_,i)=>`<circle cx="${48+(i%10)*47}" cy="${78+Math.floor(i/10)*40}" r="11" fill="${i<12?'#7965bf':'#d8dfec'}"/>`).join('')+t(53,163,'A random sample: 12 of 20 students walk.',17)+t(45,212,'For 100 students, estimate 12/20 × 100 = 60.',18);
 }
 if(!content)return null;
 return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escape(name+': '+notes[id][2])}" viewBox="0 0 520 ${height}"><title>${escape(name)}</title><desc>${escape(notes[id][2])}</desc><rect x="1" y="1" width="518" height="${height-2}" rx="12" fill="#fff" stroke="#d8d2ed"/>${content}</svg>`;
}
export function skillWeek(skill) {
 if(SUPPLEMENTAL_SKILLS[skill])return Math.floor(curriculumForSkill(skill).introductionDay/7)+1;
 const index=plan.weeks.findIndex(week=>[...week.saturday.skills,...week.sunday.skills].includes(skill));
 return index<0?1:index+1;
}
export const LESSONS = Object.freeze(Object.fromEntries(Object.entries({...plan.skills,...SUPPLEMENTAL_SKILLS}).map(([id,name])=>{
 const [rule,idea,relationship]=notes[id] || [];
 if(!rule) throw new Error(`Missing teaching content for ${id}`);
 return [id,{id,name,week:skillWeek(id),rule,idea,relationship,model:supplementalModel(id,name)||ruleModel(name,relationship),curriculum:curriculumForSkill(id)}];
})));

export const vocabulary = [
 ['coefficient','The factor multiplying a variable.','In 6x, the coefficient is 6.'],
 ['variable','A symbol representing a number that can be unknown or can vary.','In x + 8 = 19, x is the unknown.'],
 ['equivalent','Equal in value even when written differently.','0.5 and 1/2 are equivalent.'],
 ['reciprocal','A number that multiplies with the original to make one.','The reciprocal of 3/5 is 5/3.'],
 ['perpendicular','Meeting at a right angle.','The height of a triangle is perpendicular to its base.'],
 ['radius','The distance from a circle’s center to its edge.','A diameter contains two radii.'],
 ['proportional','Related by one constant multiplier.','If y = 7x for every pair, y is proportional to x.'],
 ['distribution','The values in a data set and how often each appears.','A dot plot shows a distribution.'],
 ['quartile','A boundary separating an ordered data set into quarters.','The lower quartile is the median of the lower half.'],
 ['absolute value','A number’s distance from zero.','The absolute value of −9 is 9.'],
 ['unit rate','An amount for one unit of another quantity.','A distance per hour is a unit rate.'],
 ['exponent','A count of equal factors of a base.','The exponent in 4³ is 3.']
].map(([term,definition,example])=>({term,definition,example}));
export const formulas = [
 ['Rectangle area','A = lw','Multiply length by width; use square units.'],
 ['Triangle area','A = bh ÷ 2','Height is perpendicular to the chosen base.'],
 ['Parallelogram area','A = bh','The sloping side is not usually the height.'],
 ['Rectangle perimeter','P = 2l + 2w','Perimeter uses length units.'],
 ['Box surface area','SA = 2(lw + lh + wh)','Count all six outside faces.'],
 ['Pyramid surface area','SA = base area + sum of triangular face areas','Use each face’s perpendicular height.'],
 ['Box volume','V = lwh','Volume uses cubic units.'],
 ['Circle circumference','C = 2πr = πd','Use the value of pi stated in the question.'],
 ['Circle area','A = πr²','Square the radius, not the diameter.'],
 ['Mean','Mean = sum of values ÷ count','Include every value in the count.'],
 ['Mean absolute deviation','MAD = sum of distances from the mean ÷ count','Every distance is nonnegative.'],
 ['Interquartile range','IQR = Q3 − Q1','Describes the middle half of the ordered data.']
].map(([name,formula,note])=>({name,formula,note}));
