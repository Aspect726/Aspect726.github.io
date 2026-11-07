import plan from './plan.json' with { type: 'json' };

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
 'N-DIST':['For aligned points, subtract the changing coordinates.','If x stays the same, the distance is vertical. If y stays the same, the distance is horizontal; take the absolute value so the distance is nonnegative.','Distance = |second coordinate − first coordinate|'],
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
 'G-VOL':['Volume counts unit cubes that fill a solid.','Find the area of the base, then multiply by the height. Fractional edges still multiply in the same way; the answer uses cubic units.','V = length × width × height']
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
export function skillWeek(skill) {
 const index=plan.weeks.findIndex(week=>[...week.saturday.skills,...week.sunday.skills].includes(skill));
 return index<0?1:index+1;
}
export const LESSONS = Object.freeze(Object.fromEntries(Object.entries(plan.skills).map(([id,name])=>{
 const [rule,idea,relationship]=notes[id] || [];
 if(!rule) throw new Error(`Missing teaching content for ${id}`);
 return [id,{id,name,week:skillWeek(id),rule,idea,relationship,model:ruleModel(name,relationship)}];
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
