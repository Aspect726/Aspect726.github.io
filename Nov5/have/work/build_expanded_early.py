"""Original expanded practice and linked-step challenges, weeks 1–5.
Writes a separate revision file; never mutates the earlier curriculum.
"""
import json
from fractions import Fraction as F
from pathlib import Path

def f(x):
 x=F(x)
 return str(x.numerator) if x.denominator==1 else '{'+str(x.numerator)+'/'+str(x.denominator)+'}'
def dec(x,places=4):
 x=F(x);s=f'{float(x):.{places}f}'.rstrip('0').rstrip('.')
 return s if s else '0'
def Q(text,answer,worked,skill,check,**kwargs):
 return dict(text=text,answer=str(answer),worked=worked,skill=skill,check=check,**kwargs)
def C(text,answer,worked,skill,check,ask,hint):
 return Q(text,answer,worked,skill,check,challenge=True,discussion={'ask':ask,'expect':str(answer),'if_stuck':hint})

def practice(kind,k):
 a=2+k%6;b=3+(k*3)%7;c=2+(k*5)%5
 if kind=='same_den':
  den=9+k%7;n=1+k%(den-3);m=n+2
  return Q(f'Compare {{{n}/{den}}} and {{{m}/{den}}}. Explain using equal parts.',f'{{{n}/{den}}} < {{{m}/{den}}}','The parts have equal size. The second fraction counts two more parts.','F-COMP',f'F({n},{den})<F({m},{den})')
 if kind=='same_num':
  n=2+k%5;d=n+2+k%3;e=d+2
  return Q(f'Which is greater: {{{n}/{d}}} or {{{n}/{e}}}? Explain the size of one part.',f'{{{n}/{d}}}','With the same whole and numerator, fewer equal parts make each part larger.','F-COMP',f'F({n},{d})>F({n},{e})')
 if kind=='unlike':
  pairs=[(3,4,5,8),(2,3,7,12),(5,6,7,9),(3,5,5,8),(7,10,2,3),(4,9,5,12),(5,8,7,12),(7,8,8,9),(4,5,9,10),(3,7,5,12),(7,9,3,4),(5,12,4,9)]
  n,d,m,e=pairs[k%len(pairs)];v=F(n,d);z=F(m,e);sign='>' if v>z else '<'
  return Q(f'Compare {{{n}/{d}}} and {{{m}/{e}}} using a common denominator.',f'{{{n}/{d}}} {sign} {{{m}/{e}}}',f'Cross-products are {n*e} and {m*d}; both fractions can use denominator {d*e}.','F-COMP',f'F({n},{d}){sign}F({m},{e})')
 if kind=='frac_decimal':
  den=[4,5,8,10][k%4];n=1+k%(den-1);v=F(n,den);z=v+F(1,100)*(1 if k%2 else -1)
  return Q(f'Compare {f(v)} and {dec(z)}. Rename one number.',f'{f(v)} '+('<' if v<z else '>')+f' {dec(z)}',f'{f(v)} = {dec(v)}. Compare hundredths or thousandths.','F-COMP',f'F({n},{den})'+('<' if v<z else '>')+f'F("{dec(z)}")')
 if kind=='line':
  d=[3,4,5,6,8][k%5];n=d+1+k%(d-1);v=F(n,d)
  return Q(f'On a 0-to-2 number line, place {{{n}/{d}}}. Name its mixed-number form.',f'1 {f(v-1)}',f'One whole uses {d} equal steps. Take {n-d} more steps of size 1/{d}.','F-LINE',f'F({n},{d})==1+F({n-d},{d})')
 if kind=='between':
  d=[8,10,12,16,20][k%5];n=d//2+1
  return Q(f'Name a fraction with denominator {d} strictly between {{1/2}} and {{3/4}}.',f'One answer: {{{n}/{d}}}',f'Half is {d//2}/{d}; choose the next numerator. Other valid answers may exist.','F-COMP',f'F(1,2)<F({n},{d})<F(3,4)')
 if kind=='equiv':
  d=[3,4,5,6,8,10][k%6];n=1+k%(d-1);scale=2+k%4
  return Q(f'Complete {{{n}/{d}}} = {{?/{d*scale}}}. Explain your multiplier.',str(n*scale),f'Multiply numerator and denominator by {scale}; the value stays unchanged.','F-EQUIV',f'F({n},{d})==F({n*scale},{d*scale})')
 if kind=='add_frac':
  n=1+k%3;d=4+k%3;v=F(n,d)+F(1,3)
  return Q(f'Find {{{n}/{d}}} + {{1/3}}. Use equal-sized parts.',f(v),f'A common denominator is {d*3}: {n*3}/{d*3} + {d}/{d*3}. Simplify the sum.','F-ADD',f'F({n},{d})+F(1,3)==F({v.numerator},{v.denominator})')
 if kind=='sub_frac':
  d=[4,5,6,8,10][k%5];v=F(d-1,d)-F(1,3)
  return Q(f'Find {{{d-1}/{d}}} − {{1/3}}. Check by addition.',f(v),f'Use denominator {3*d}; subtract {d} from {3*(d-1)}, then simplify. Add 1/3 to check.','F-SUB',f'F({d-1},{d})-F(1,3)==F({v.numerator},{v.denominator})')
 if kind=='whole_frac':
  n=1+k%3;d=4+k%3;count=3+k%6;v=count*F(n,d)
  return Q(f'{count} bags each hold {{{n}/{d}}} kilogram. Find the total mass.',f(v)+' kilograms',f'Add the fraction {count} times: {count} × {n}/{d} = {count*n}/{d}.','F-MULT',f'{count}*F({n},{d})==F({v.numerator},{v.denominator})')
 if kind=='frac_frac':
  d=[3,4,5,6,8][k%5];e=[4,5,6,8,10][k%5];n=d-1;m=1+k%(e-1);v=F(n,d)*F(m,e)
  return Q(f'Find {{{n}/{d}}} of {{{m}/{e}}}. Sketch equal parts.',f(v),f'Partition a whole into {d*e} equal pieces. The overlapping region has {n*m} pieces.','F-MULT',f'F({n},{d})*F({m},{e})==F({v.numerator},{v.denominator})')
 if kind=='mixed_mult':
  n=1+k%4;d=3+k%3;whole=1+k%2;v=F(n,5)*(whole+F(1,d))
  return Q(f'Find {{{n}/5}} of {whole} {{1/{d}}} liters.',f(v)+' liters',f'Rename the mixed number as {whole*d+1}/{d}; multiply numerators and denominators.','F-MULT',f'F({n},5)*(F({whole})+F(1,{d}))==F({v.numerator},{v.denominator})')
 if kind=='unit_groups':
  whole=2+k%7;den=3+k%6
  return Q(f'A {whole}-meter cord is cut into {{1/{den}}}-meter pieces. How many pieces?',str(whole*den),f'Each meter contains {den} pieces; {whole} × {den} counts all the pieces.','F-DIV1',f'F({whole})/F(1,{den})=={whole*den}')
 if kind=='unit_share':
  den=3+k%6;people=2+k%5;v=F(1,den)/people
  return Q(f'Share {{1/{den}}} liter equally among {people} cups. How much per cup?',f(v)+' liter',f'Split one {den}th into {people} equal parts; each is 1/{den*people} of the whole liter.','F-DIV1',f'F(1,{den})/{people}==F({v.numerator},{v.denominator})')
 if kind=='scale':
  whole=6+k%7;den=3+k%4;n=den-1;v=whole*F(n,den)
  return Q(f'Is {{{n}/{den}}} × {whole} greater or less than {whole}? Then calculate.',f'Less; {f(v)}',f'The factor {n}/{den} is below1, so it takes only part of {whole}. Multiply to verify.','F-SCALE',f'F({n},{den})*{whole}==F({v.numerator},{v.denominator}) and F({v.numerator},{v.denominator})<{whole}')
 if kind=='area_frac':
  d=3+k%4;e=4+k%5;n=d-1;m=e-1;v=F(n,d)*F(m,e)
  return Q(f'A rectangle is {{{n}/{d}}} meter by {{{m}/{e}}} meter. Find its area.',f(v)+' square meter',f'Multiply the side lengths. The unit is square meters because this counts area.','F-MULT',f'F({n},{d})*F({m},{e})==F({v.numerator},{v.denominator})')
 if kind=='facts':
  n=3+k%7;m=4+(k*3)%8
  return Q(f'Use a multiplication fact to find {n*m} ÷ {n}.',str(m),f'{n} × {m} = {n*m}; division undoes that multiplication.','N-FACT',f'{n*m}//{n}=={m}')
 if kind=='whole_div':
  n=12+k%13;m=8+k%15
  return Q(f'Find {n*m} ÷ {n}. Check by multiplication.',str(m),f'{n} × {m} = {n*m}, so the quotient is {m}.','N-DIV1',f'{n*m}//{n}=={m}')
 if kind=='ratio_scale':
  red=2+k%5;blue=3+k%6;factor=2+k%5
  return Q(f'Red:blue is {red}:{blue}. Complete ({red},{blue}), ({red*factor},__).',str(blue*factor),f'The first amount is multiplied by {factor}; multiply the second amount by the same factor.','R-EQUIV',f'F({red},{blue})==F({red*factor},{blue*factor})')
 if kind=='ratio_down':
  red=2+k%5;blue=3+k%7;factor=2+k%4
  return Q(f'A mix has {red*factor} raisins and {blue*factor} nuts. Divide both counts by {factor}; write the new ratio.',f'{red}:{blue}',f'Dividing both quantities by {factor} keeps the number of raisins for each nut unchanged.','R-EQUIV',f'F({red*factor},{blue*factor})==F({red},{blue})')
 if kind=='ratio_fraction':
  red=2*(2+k%4);blue=2*(3+k%5);target=red*3//2;ans=blue*3//2
  return Q(f'A recipe uses {red} cups oats for {blue} cups seeds. How many cups seeds go with {target} cups oats?',str(ans)+' cups',f'The scale factor is3/2. Multiply both amounts by3/2, or make half a batch and add it to one batch.','R-EQUIV',f'F({target},{red})==F(3,2) and F({blue})*F(3,2)=={ans}')
 if kind=='ratio_total':
  red=2+k%4;blue=3+k%5;unit=3+k%5;total=(red+blue)*unit
  return Q(f'Gold:silver beads are {red}:{blue}. There are {total} beads. Find each count.',f'{red*unit} gold; {blue*unit} silver',f'There are {red+blue} equal parts. Each has {unit} beads; multiply by each ratio number.','R-PART1',f'{red*unit}+{blue*unit}=={total} and F({red*unit},{blue*unit})==F({red},{blue})')
 if kind=='ratio_whole':
  red=2+k%5;blue=3+k%6;v=F(red,red+blue)
  return Q(f'Orange:purple tiles are {red}:{blue}. What fraction of all tiles is orange?',f(v),f'The whole has {red+blue} parts, and orange has {red} of them.','R-PART1',f'F({red},{red+blue})==F({v.numerator},{v.denominator})')
 if kind=='ratio_table':
  red=2+k%4;blue=3+k%5;s=2+k%4
  return Q(f'Complete the ratio table: ({red},{blue}), ({red*s},__), (__,{blue*(s+1)}).',f'{blue*s}; {red*(s+1)}',f'Use matching scale factors {s} and {s+1} in the two columns.','R-TABLE',f'F({red*s},{blue*s})==F({red},{blue}) and F({red*(s+1)},{blue*(s+1)})==F({red},{blue})')
 if kind=='ratio_error':
  red=2+k%4;blue=red+2;add=2+k%5
  return Q(f'Is {red+add}:{blue+add} equivalent to {red}:{blue}? Explain without using the difference.',f'No; cross-products {red*(blue+add)} and {blue*(red+add)} differ.',f'Equivalent ratios use one multiplicative scale factor. Adding {add} to both amounts does not preserve it.','R-EQUIV',f'F({red+add},{blue+add})!=F({red},{blue})')
 if kind=='ratio_compare':
  n=2+k%5;d=n+2;e=d*2;other=n*2+1
  return Q(f'MixA has {n} cups fruit for {d} cups yogurt. MixB has {other} for {e}. Which has more fruit for the same yogurt?',f'MixB',f'Double MixA to get {2*n} cups fruit for {e} cups yogurt. MixB has one more cup fruit at that same yogurt amount.','R-COMP',f'F({other},{e})>F({n},{d})')
 if kind=='ratio_plot':
  rate=2+k%5;t=2+k%4
  return Q(f'For each box there are {rate} pencils. Write ordered pairs for0,{t},and{t+1} boxes. Is(0,0) included?',f'(0,0), ({t},{t*rate}), ({t+1},{(t+1)*rate}); yes',f'Multiply every box count by {rate}. Zero boxes give zero pencils.','R-GRAPH',f'{t}*{rate}=={t*rate} and ({t}+1)*{rate}=={(t+1)*rate}')
 if kind=='rate':
  hours=2+k%5;rate=3+k%8;total=hours*rate
  return Q(f'A cyclist travels {total} kilometers in {hours} hours at steady speed. Find kilometers per hour.',str(rate)+' km per hour',f'Divide distance by time: {total} ÷ {hours}. The unit names the division order.','R-RATE',f'F({total},{hours})=={rate}')
 if kind=='rate_decimal':
  count=4+k%6;price=F(35+5*(k%8),100);cost=count*price
  return Q(f'{count} markers cost${dec(cost,2)}. Find dollars per marker.',f'${float(price):.2f} per marker',f'Divide total dollars by {count}: {dec(cost)} ÷ {count} = {dec(price)}.','R-RATE',f'F("{dec(cost)}")/{count}==F("{dec(price)}")')
 if kind=='rate_directions':
  minutes=3+k%4;cards=minutes*(2+k%6);r=F(cards,minutes);inv=1/r
  return Q(f'A printer makes {cards} cards in {minutes} minutes. Find cards per minute and minutes per card.',f'{f(r)} cards/min; {f(inv)} min/card',f'Use {cards} ÷ {minutes} for cards per minute. Reverse the division and the units for minutes per card.','R-RATE',f'F({cards},{minutes})==F({r.numerator},{r.denominator}) and F({minutes},{cards})==F({inv.numerator},{inv.denominator})')
 if kind=='rate_hour':
  minutes=[10,12,15,20,30][k%5];distance=2+k%7;v=F(distance*60,minutes)
  return Q(f'A runner goes {distance} miles in {minutes} minutes at steady speed. Find miles per hour.',f(v)+' miles per hour',f'One hour contains {60//minutes} intervals of {minutes} minutes. Multiply the distance by that factor.','R-RATE',f'F({distance}*60,{minutes})==F({v.numerator},{v.denominator})')
 if kind=='rate_compare':
  n=3+k%5;m=n+2;p=F(40+5*(k%5),100);q=p+F(5,100)
  return Q(f'PackA: {n} pencils for${dec(n*p)}. PackB: {m} for${dec(m*q)}. Which costs less per pencil?',f'PackA: ${float(p):.2f} vs ${float(q):.2f}',f'Divide each price by its count. Compare costs for one pencil, not pack prices.','R-RATE',f'F("{dec(n*p)}")/{n}==F("{dec(p)}") and F("{dec(m*q)}")/{m}==F("{dec(q)}") and F("{dec(p)}")<F("{dec(q)}")')
 if kind=='rate_table':
  r=3+k%6;t=2+k%5
  return Q(f'A robot rolls {r} meters per second. Complete distances for0,{t},and{t+2} seconds.',f'0, {r*t}, {r*(t+2)} meters',f'Multiply seconds by {r}. The units seconds cancel, leaving meters.','R-TABLE',f'{r}*0==0 and {r}*{t}=={r*t} and {r}*{t+2}=={r*(t+2)}')
 if kind=='percent_part':
  pct=[10,20,25,30,35,40,60,75,125][k%9];whole=20+20*(k%8);v=F(pct*whole,100)
  return Q(f'Find {pct}% of {whole}. Name the whole.',f(v)+f'; whole={whole}',f'One percent is {whole}/100. Multiply by {pct}, or use a matching benchmark percent.','P-PART',f'F({pct}*{whole},100)==F({v.numerator},{v.denominator})')
 if kind=='percent_whole':
  pct=[10,20,25,30,40,50,75][k%7];whole=40+20*(k%7);part=F(pct*whole,100)
  return Q(f'{f(part)} stickers are {pct}% of a collection. How many stickers are in the whole collection?',str(whole),f'One percent is {f(part)} ÷ {pct}. Multiply that amount by100 to recover the whole.','P-WHOLE',f'F({part.numerator},{part.denominator})/F({pct},100)=={whole}')
 if kind=='percent_find':
  whole=20+20*(k%6);pct=[15,20,25,35,40,60,75][k%7];part=whole*pct//100
  return Q(f'{part} of {whole} books are mysteries. What percent are mysteries?',f'{pct}%',f'Divide part by whole, then multiply by100: {part}/{whole} = {pct}/100.','P-PERCENT',f'F({part},{whole})*100=={pct}')
 if kind=='percent_money':
  dollars=12+k%16;pct=[5,10,15,20,25][k%5];v=F(dollars*pct,100)
  return Q(f'Find {pct}% of${dollars}. Give a money answer.',f'${float(v):.2f}',f'Write the percent as {pct}/100 and multiply by {dollars}. Keep cents in the answer.','P-PART',f'F({dollars}*{pct},100)==F("{float(v):.2f}")')
 if kind=='div_frac':
  pairs=[(3,4,1,2),(5,6,2,3),(7,8,1,4),(2,3,3,5),(4,5,2,3),(3,5,9,10),(5,8,3,4),(7,12,1,3),(9,10,3,5)]
  n,d,m,e=pairs[k%len(pairs)];v=F(n,d)/F(m,e)
  return Q(f'How many {{{m}/{e}}}-sized groups fit in {{{n}/{d}}}? Include a part of a group.',f(v),f'Use equal pieces: {n*e}/{d*e} contains groups of {m*d}/{d*e}. Divide the piece counts {n*e} by {m*d}.','F-DIV1',f'F({n},{d})/F({m},{e})==F({v.numerator},{v.denominator})')
 if kind=='whole_nonunit':
  whole=2+k%6;d=3+k%5;n=d-1;v=F(whole)/F(n,d)
  return Q(f'How many {{{n}/{d}}}-cup scoops fit in {whole} cups? A partial scoop is allowed.',f(v)+' scoops',f'{whole} cups is {whole*d} equal {d}ths. Each scoop uses {n} of those pieces; divide {whole*d} by {n}.','F-DIV1',f'F({whole})/F({n},{d})==F({v.numerator},{v.denominator})')
 if kind=='fraction_share':
  n=2+k%3;d=5+k%4;people=2+k%5;v=F(n,d)/people
  return Q(f'Share {{{n}/{d}}} liter equally among {people} bottles. Find each share.',f(v)+' liter',f'Partition each {d}th into {people} equal pieces. Each bottle receives {n} of the smaller pieces.','F-DIV1',f'F({n},{d})/{people}==F({v.numerator},{v.denominator})')
 if kind=='mixed_div':
  whole=1+k%3;den=4+k%3;div=F(2+k%3,5);amount=whole+F(1,den);v=amount/div
  return Q(f'Find {whole} {{1/{den}}} ÷ {f(div)}. Check by multiplication.',f(v),f'Rename the mixed number as {whole*den+1}/{den}. Multiply by the reciprocal of {f(div)}; then multiply the quotient by the original divisor.','F-DIV1',f'(F({whole})+F(1,{den}))/F({div.numerator},{div.denominator})==F({v.numerator},{v.denominator})')
 if kind=='missing_side':
  width=F(2+k%3,5);length=F(3+k%5,4);area=width*length
  return Q(f'A rectangle has area {f(area)} square meter and width {f(width)} meter. Find its length.',f(length)+' meters',f'Divide area by width. Check {f(length)} × {f(width)} = {f(area)}.','F-DIV1',f'F({area.numerator},{area.denominator})/F({width.numerator},{width.denominator})==F({length.numerator},{length.denominator})')
 if kind=='frac_volume':
  x=F(2+k%3,3);y=F(1+k%3,4);z=2+k%3;v=x*y*z
  return Q(f'A box has edges {f(x)}, {f(y)}, and {z} meters. Find its volume.',f(v)+' cubic meters',f'Multiply all three edge lengths. Area of the base times height counts cubic units.','G-VOL',f'F({x.numerator},{x.denominator})*F({y.numerator},{y.denominator})*{z}==F({v.numerator},{v.denominator})')
 if kind=='decimal_add':
  x=F(24+3*k,10);y=F(137+17*k,1000);v=x+y
  return Q(f'Find {dec(x)} + {dec(y)}. Align equal place values.',dec(v),f'Rename {dec(x)} in thousandths, then add thousandths to thousandths.','D-ADD',f'F("{dec(x)}")+F("{dec(y)}")==F("{dec(v)}")')
 if kind=='decimal_sub':
  x=10+k%11;y=F(123+29*k,1000);v=x-y
  return Q(f'Find {x} − {dec(y)}. Show regrouping across zeros.',dec(v),f'Write {x}.000. Regroup through the zero columns and subtract equal place values.','D-SUB',f'{x}-F("{dec(y)}")==F("{dec(v)}")')
 if kind=='decimal_mult':
  x=F(3+k%7,10);y=F(2+k%8,100);v=x*y
  return Q(f'Find {dec(x)} × {dec(y)}. Explain the product\'s place value.',dec(v),f'{int(x*10)} tenths times {int(y*100)} hundredths produces thousandths. The answer must be below either factor because both are below1.','D-MULT',f'F("{dec(x)}")*F("{dec(y)}")==F("{dec(v)}")')
 if kind=='decimal_whole':
  x=F(125+15*k,100);n=3+k%6;v=x*n
  return Q(f'Ribbon costs${float(x):.2f} per meter. What do {n} meters cost?',f'${float(v):.2f}',f'Multiply the price per meter by {n}. The answer counts dollars.','D-MULT',f'F("{float(x):.2f}")*{n}==F("{float(v):.2f}")')
 if kind=='decimal_div':
  den=F(3+k%7,100);q=10+3*k;num=den*q
  return Q(f'Find {dec(num)} ÷ {dec(den)}. Write an equivalent whole-number division.',str(q),f'Multiply both numbers by100: {dec(num*100)} ÷ {dec(den*100)}. The quotient stays {q}.','D-DIV1',f'F("{dec(num)}")/F("{dec(den)}")=={q}')
 if kind=='whole_decimal_div':
  den=[4,5,8,16,20,25][k%6];num=13+3*k;v=F(num,den)
  return Q(f'Find {num} ÷ {den}. Continue to an exact decimal.',dec(v),f'After the whole-number places, append zeros to the dividend and continue dividing. Multiply the result by {den} to check.','D-DIV1',f'F({num},{den})==F("{dec(v)}")')
 if kind=='money_change':
  x=F(135+11*k,100);y=F(85+7*k,100);paid=10+k//6;v=paid-x-y
  return Q(f'A notebook costs${float(x):.2f} and a pen${float(y):.2f}. Pay${paid}. Find the change.',f'${float(v):.2f}',f'Add the two prices to get${float(x+y):.2f}; subtract that total from${paid}.','D-MONEY',f'{paid}-F("{float(x):.2f}")-F("{float(y):.2f}")==F("{float(v):.2f}")')
 raise ValueError(kind)

COMP=['same_den','same_num','unlike','frac_decimal','line','between','equiv','add_frac','sub_frac','facts','whole_div']
OPS=['whole_frac','frac_frac','mixed_mult','unit_groups','unit_share','scale','area_frac','add_frac','sub_frac','unlike','frac_decimal','equiv','facts','whole_div']
RATIO=['ratio_scale','ratio_down','ratio_fraction','ratio_total','ratio_whole','ratio_table','ratio_error','ratio_compare','ratio_plot']
RATE=['rate','rate_decimal','rate_directions','rate_hour','rate_compare','rate_table']
PERCENT=['percent_part','percent_whole','percent_find','percent_money']
DIV=['div_frac','whole_nonunit','fraction_share','mixed_div','missing_side','frac_volume']
DEC=['decimal_add','decimal_sub','decimal_mult','decimal_whole','money_change']
LDIV=['decimal_div','whole_decimal_div','whole_div','rate_decimal']

def make_practice(week,day,count):
 pools={
  1:{'Sat':COMP[:7],'Sun':OPS[:7],'Mon':COMP,'Tue':OPS,'Wed':COMP+OPS,'Thu':OPS+COMP[:4],'Fri':COMP+OPS},
  2:{'Sat':RATIO[:3]+['ratio_error']+OPS[:2],'Sun':RATIO[3:],'Mon':RATIO[:8]+OPS[:6],'Tue':RATIO+COMP[:5],'Wed':RATIO+OPS+COMP,'Thu':RATIO+['whole_frac','unit_groups','sub_frac','area_frac'],'Fri':RATIO+OPS},
  3:{'Sat':RATE,'Sun':PERCENT+RATE[:2],'Mon':RATE+RATIO+OPS[:3],'Tue':PERCENT+RATE+RATIO[:4],'Wed':RATE+PERCENT+RATIO+OPS,'Thu':RATE+PERCENT+['ratio_total','whole_frac','unit_groups'],'Fri':RATE+PERCENT+RATIO+OPS[:4]},
  4:{'Sat':DIV[:3]+['unit_groups','unit_share','frac_frac'],'Sun':DIV,'Mon':DIV[:3]+OPS+RATE[:3],'Tue':DIV+RATE+PERCENT,'Wed':DIV+RATE+PERCENT+RATIO+OPS,'Thu':DIV+PERCENT+RATE,'Fri':DIV+PERCENT+RATE+RATIO},
  5:{'Sat':DEC+['percent_money'],'Sun':LDIV+['decimal_sub','decimal_mult'],'Mon':DEC+DIV+PERCENT+RATE,'Tue':LDIV+DEC+DIV+PERCENT,'Wed':DEC+LDIV+DIV+PERCENT+RATE+RATIO,'Thu':DEC+LDIV+DIV+PERCENT,'Fri':DEC+LDIV+DIV+PERCENT+RATE}
 }
 pool=pools[week][day];items=[];seen=set();j=0;offset=['Sat','Sun','Mon','Tue','Wed','Thu','Fri'].index(day)
 while len(items)<count:
  kind=pool[j%len(pool)];seed=(week*5+offset*7+j//len(pool)*3+j)%24
  p=practice(kind,seed)
  if p['text'] not in seen:
   p['id']=f'N{len(items)+1}';p['case']=kind;items.append(p);seen.add(p['text'])
  j+=1
  if j>200:raise RuntimeError((week,day))
 return items

CH={}
def add(w,d,*ps):
 assert len(ps)==2
 CH[w,d]=[]
 for i,p in enumerate(ps):p['id']=f'C{i+1}';CH[w,d].append(p)
# Challenges deliberately combine a calculation with a comparison, model, decision, or check.
add(1,'Sat',
 C('Ari finishes {3/5} of a trail and Bea finishes {7/12} of the same trail. Who is farther? Find the difference and show both positions on one line.','Ari; {1/60} of the trail','Rename in sixtieths: 3/5=36/60 and7/12=35/60. Ari is one sixtieth farther. Use the same whole trail for both positions.','F-COMP','F(3,5)-F(7,12)==F(1,60)','Why must both positions use the same whole?','Rename both fractions with denominator60.'),
 C('Lina has {5/8} liter and Omar has0.6liter. Each wants {3/4} liter. Who needs less extra liquid? Find both gaps.','Lina; Lina needs {1/8} liter and Omar needs {3/20} liter','Use fortieths:3/4=30/40,5/8=25/40,and0.6=24/40. The gaps are5/40 and6/40; Lina needs less.','F-COMP','F(3,4)-F(5,8)==F(1,8) and F(3,4)-F("0.6")==F(3,20) and F(1,8)<F(3,20)','Can someone have less liquid but need less to reach the same target?','Draw each starting amount and the common target on one number line.'))
add(1,'Sun',
 C('Two batches each use {3/4} liter of smoothie. All the smoothie is poured into {1/4}-liter cups. How many full cups? Explain with a model.','6 cups','First find total smoothie:2×3/4=3/2liters. A whole liter holds four quarter-liter cups, so3/2liters holds6cups. A strip of six quarters shows both operations.','F-MULT','2*F(3,4)==F(3,2) and F(3,2)/F(1,4)==6','Where do you see the two batches and the six cups in one picture?','Draw two strips, each with three fourths shaded.'),
 C('A small rug is1{1/2}meters by{2/3}meter. A mat has area{4/5}square meter. Which covers more floor, and by how much?','The rug; {1/5} square meter more','Rename1½as3/2. The rug area is3/2×2/3=1square meter. Subtract4/5to find the difference1/5square meter.','F-MULT','F(3,2)*F(2,3)==1 and 1-F(4,5)==F(1,5)','Why do we compare area with area rather than a side length?','First label the rug length and width; multiply to get its area.'))
add(1,'Mon',
 C('Jade walks {3/8} mile, then {1/4} mile. Sam walks {2/3} mile. Who walks farther? Find the gap.','Sam; {1/24} mile','Jade walks3/8+2/8=5/8. Compare15/24with16/24; Sam walks1/24mile farther.','F-ADD','F(3,8)+F(1,4)==F(5,8) and F(2,3)-F(5,8)==F(1,24)','Which quantity has to be found before the comparison?','Find Jade’s total, then rename both totals in twenty-fourths.'),
 C('A jar is {5/6} full. Pour out {1/4} of the jar’s full capacity. Is the amount left above or below half? By how much?','Above half by {1/12} of the jar','Both fractions refer to full capacity.5/6−1/4=10/12−3/12=7/12. Half is6/12, so the remainder is1/12above half.','F-SUB','F(5,6)-F(1,4)==F(7,12) and F(7,12)-F(1,2)==F(1,12)','What whole does the one-fourth refer to?','Use a jar strip split into12equal parts.'))
add(1,'Tue',
 C('A baker has3meters of ribbon. Four packages each need{5/8}meter. Is there enough ribbon? Find the amount left or missing.','Enough; {1/2} meter left','Four packages use4×5/8=20/8=5/2meters.3−5/2=1/2meter remains.','F-MULT','4*F(5,8)==F(5,2) and 3-F(5,2)==F(1,2)','How can an estimate tell you the answer should be less than3meters?','Draw four equal lengths of5/8and combine them.'),
 C('A {1/3}-liter sample is shared equally among4cups. Another sample gives each cup{1/10}liter. Which share is larger, and by how much?','The {1/10}-liter share; larger by {1/60} liter','The first share is1/3÷4=1/12liter. Compare1/10and1/12using sixtieths:6/60−5/60=1/60.','F-DIV1','F(1,3)/4==F(1,12) and F(1,10)-F(1,12)==F(1,60)','Why is one twelfth less than one tenth even though12is larger?','Divide one third into four equal pieces before comparing.'))
add(1,'Wed',
 C('A card shows {n/12}. Its value is greater than{1/2}and less than{3/4}. Find every whole-number value ofn, then order those fractions.','n=7 or8; {7/12} < {8/12}','Half is6/12and three fourths is9/12. The whole numerators strictly between6and9are7and8. Equal denominators make the order immediate.','F-COMP','[n for n in range(13) if F(1,2)<F(n,12)<F(3,4)]==[7,8]','How do you know you have found every possible numerator?','Mark6,7,8,and9on a numerator number line.'),
 C('Three pitchers each hold{2/3}liter. After{1/2}liter is served, the rest fills{1/4}-liter cups. How many cups are filled?','6 cups','Three pitchers hold3×2/3=2liters. Serving half a liter leaves3/2liters. Six quarter-liter cups hold that amount.','F-MULT','3*F(2,3)-F(1,2)==F(3,2) and F(3,2)/F(1,4)==6','Which operation must happen before counting cups?','Write three linked amounts: total, remaining, number of cups.'))
add(1,'Thu',
 C('A garden is2{1/2}meters long and{3/5}meter wide. Half its area grows herbs. Find the garden area and herb area.','Garden: {3/2} square meters; herbs: {3/4} square meter','Multiply5/2×3/5=3/2for the full area. Half of that area is1/2×3/2=3/4. The second half must have the same area.','F-MULT','F(5,2)*F(3,5)==F(3,2) and F(1,2)*F(3,2)==F(3,4)','Does halving one side or halving both sides give half the area?','Draw one rectangle, find its whole area, then split it into two equal regions.'),
 C('Kai has{7/8}meter of fabric and uses{1/4}meter. Ren has0.7meter and uses0.1meter. Who has more left? Find the difference.','Kai; {1/40} meter more','Kai has7/8−2/8=5/8=0.625meter. Ren has0.6meter=3/5. The difference is25/40−24/40=1/40meter.','F-COMP','F(7,8)-F(1,4)==F(5,8) and F("0.7")-F("0.1")==F(3,5) and F(5,8)-F(3,5)==F(1,40)','Can you compare the starting amounts alone?','Find both remainders before comparing them.'))
add(1,'Fri',
 C('A recipe needs{2/3}cup of flour per batch. Make3batches from a2{1/2}-cup bag. How much flour remains? Is that more or less than one batch needs?','{1/2} cup remains; less than one batch by {1/6} cup','Three batches use2cups. The bag leaves1/2cup. Compare1/2and2/3:the remainder is1/6cup short of another batch.','F-MULT','3*F(2,3)==2 and F(5,2)-2==F(1,2) and F(2,3)-F(1,2)==F(1,6)','What two different comparisons are made with the remaining flour?','Find the remaining amount, then compare it with2/3cup.'),
 C('Mira says{4/5}of10must be smaller than{3/4}of12because{4/5}is greater than{3/4}. Check both products and explain what her comparison overlooks.','The products are8and9; her numerical conclusion is true, but the reasoning overlooks the different wholes.','4/5×10=8and3/4×12=9. Comparing fractions alone is not enough when they act on different whole amounts. Draw ten-unit and twelve-unit bars to show the wholes.','F-SCALE','F(4,5)*10==8 and F(3,4)*12==9 and 8<9','Can the larger fraction give the smaller amount? What else matters?','Label the whole for each fraction before comparing.'))

DEEP={
1:dict(title='One fraction, two different wholes',prompt='Two strips are1meter and2meters long. Shade{3/4}of each. Compare the shaded lengths. Then explain when a fraction comparison alone is enough.',answer='The shaded lengths are{3/4}meter and1{1/2}meters. The second is twice as long; fractions alone compare amounts only when the wholes match.',worked='Partition each strip into four equal parts. A part on the2-meter strip is twice as long as a part on the1-meter strip. Taking three parts gives3/4meter and6/4meters. The fraction is the same while the amount changes.',check='F(3,4)*1==F(3,4) and F(3,4)*2==F(3,2)',skill='F-COMP',teacher_ask='Can equal fractions name unequal lengths? What must stay fixed when we compare fractions?',teacher_hint='Align the strips at zero and label each whole length.',visual_hint='Two aligned tape diagrams, lengths1and2meters; split each into4equal parts and shade3.',steps=['Label each whole before shading.','Partition both wholes into4equal parts.','Shade3parts on each and measure the shaded lengths.','State the condition needed for comparing fractions alone.'],kind='comparison'),
2:dict(title='The same numbers can describe two kinds of division',prompt='Compare3÷{1/4}with{1/4}÷3. Write a story for each, solve both, and explain why their models need different groupings.',answer='3÷{1/4}=12groups; {1/4}÷3={1/12}per share.',worked='For3÷1/4, count quarters in three wholes:four per whole, twelve total. For1/4÷3, divide one quarter into three equal shares:each is one twelfth of a whole. The first quotient counts groups; the second measures one share.',check='3/F(1,4)==12 and F(1,4)/3==F(1,12)',skill='F-DIV1',teacher_ask='What does the quotient count or measure in each story?',teacher_hint='Circle the total amount in each story and underline the given group information.',visual_hint='One diagram shows3whole strips split intoquarters; the other shows onequarter split into3shares.',steps=['Identify the total amount and the given group information.','Model3wholes inquarter-sizedgroups.','Model onequarter shared among3people.','Attach units to each quotient and compare its meaning.'],kind='comparison')}

def normalize(s):
 import re
 for glyph,form in {'½':'{1/2}','¼':'{1/4}','¾':'{3/4}','⅓':'{1/3}','⅔':'{2/3}'}.items():s=s.replace(glyph,form)
 s=s.replace('{n/12}','n twelfths')
 s=re.sub(r'(?<![\w{])(\d+)/(\d+)(?![\w}])',r'{\1/\2}',s)
 s=re.sub(r'(?<=[A-Za-z])(?=\d)|(?<=\d)(?=[A-Za-z])',' ',s)
 s=re.sub(r'(?<=[,;:])(?=[A-Za-z0-9{])',' ',s)
 s=re.sub(r'(?<=})(?=[A-Za-z])|(?<=[A-Za-z0-9])(?={)|(?<=\))(?=[A-Za-z])|(?<=[A-Za-z])(?=\()|(?<=[,;:])(?=\()',' ',s)
 for a,b in [('LemonadeA','Lemonade A'),('LemonadeB','Lemonade B'),('andBby','and B by'),('andB','and B'),('eachAgroup','each A group'),('eachBgroup','each B group'),('favorA','favor A'),('fromdistance','from distance'),('fiveequal','five equal'),('MixA','Mix A'),('MixB','Mix B'),('PackA','Pack A'),('PackB','Pack B'),('TeamA','Team A'),('TeamB','Team B'),('Aneeds','A needs'),('Bneeds','B needs'),('Ahas','A has'),('Bhas','B has'),('Ais','A is'),('Bdoes','B does'),('ScaleAby','Scale A by'),('ScaleBby','Scale B by'),('scaleAby','scale A by'),('scaleBby','scale B by'),('ofn','of n'),('Findn','Find n'),('onebottle','one bottle'),('equalparts','equal parts'),('tenequal','ten equal'),('one thirdof','one third of')]:s=s.replace(a,b)
 s=re.sub(r'\s*([×÷=<>+−])\s*',r' \1 ',s)
 s=re.sub(r'(?<=[A-Za-z}])\.(?=[A-Za-z0-9{])','. ',s)
 s=re.sub(r'(?<=[²³])(?=[A-Za-z])',' ',s)
 s=re.sub(r'(?<=%)(?=[A-Za-z{])',' ',s)
 s=re.sub(r'(\d): (\d)',r'\1 : \2',s)
 s=re.sub(r'(?<=[A-Za-z0-9}])(?=\$)',' ',s)
 s=re.sub(r'(?<=\?)(?=[A-Za-z])',' ',s)
 return re.sub(r' +',' ',s).strip()

def clean(x):
 if isinstance(x,str):return normalize(x)
 if isinstance(x,list):return [clean(z) for z in x]
 if isinstance(x,dict):return {k:(v if k in ['check','skill','id','case'] else clean(v)) for k,v in x.items()}
 return x

def output(up_to=5):
 ws=[]
 for w in range(1,up_to+1):
  if (w,'Fri') not in CH:continue
  days=[]
  for d in ['Sat','Sun','Mon','Tue','Wed','Thu','Fri']:
   count=6 if d in ['Sat','Sun'] else 23 if d=='Wed' else 18
   days.append(dict(weekday=d,challenges=CH[w,d],practice=make_practice(w,d,count),estimated_minutes=100 if d=='Sat' else 85 if d=='Sun' else 50 if d=='Wed' else 40))
  sessions=[]
  for sid in [2*w-1,2*w]:
   dp=DEEP[sid].copy();dp['item_ids']=['C1','C2'];dp['notes']={'say':'Compare the models before choosing a calculation.','ask':dp['teacher_ask'],'expect':dp['answer'],'if_stuck':dp['teacher_hint'],'time':10}
   sessions.append(dict(session=sid,deepening=dp,discussion_moves=[{'move':'Notice','ask':dp['teacher_ask']},{'move':'Represent','ask':dp['teacher_hint']},{'move':'Connect','ask':'Point to the part of your model that matches each calculation.'},{'move':'Generalize','ask':'What stays true if the numbers change? State one condition your claim needs.'}]))
  ws.append(dict(week=w,days=days,sessions=sessions))
 result=clean({'weeks':ws,'notes':'Practice banks offer choices; root retains the strongest existing core and selects enough new items to meet20total per day or25on Wednesday, including exactly2challenges. Weekend6extra items are a bank, not6additional mandatory problems beyond the daily target.'})
 checks=[]
 for w in result['weeks']:
  for d in w['days']:
   assert len(d['challenges'])==2
   assert len({p['text'] for p in d['practice']})==len(d['practice'])
   for p in d['practice']+d['challenges']:
    if not eval(p['check'],{'F':F,'range':range,'sum':sum,'abs':abs,'min':min,'max':max,'sorted':sorted}):raise AssertionError((w['week'],d['weekday'],p))
    checks.append(p['check'])
  for s in w['sessions']:
   assert eval(s['deepening']['check'],{'F':F,'range':range,'sum':sum,'abs':abs,'min':min,'max':max,'sorted':sorted})
   checks.append(s['deepening']['check'])
 result['validation']={'weeks':len(ws),'days':sum(len(w['days']) for w in ws),'challenges':sum(len(d['challenges']) for w in ws for d in w['days']),'practice_items':sum(len(d['practice']) for w in ws for d in w['days']),'exact_checks_passed':len(checks)}
 Path('work/expanded_content_1_5.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 print(result['validation'])


add(2,'Sat',
 C('A mosaic uses3red tiles for every5blue tiles. You use18red tiles and have32blue tiles. How many blue tiles are needed? How many remain?','30blue tiles needed;2remain','18red tiles make6groups of3. Each group needs5blue, so6×5=30blue tiles. Subtract30from32to find2unused tiles.','R-EQUIV','18//3*5==30 and 32-30==2','Why must the same number of groups apply to both colors?','Circle groups of3red tiles, then match each group to5blue.'),
 C('A trail mix uses4cups oats for6cups seeds. You have10cups oats and18cups seeds. Use all the oats in the same ratio. How many cups seeds remain?','3cups seeds remain','The oats scale from4to10by5/2. Seeds must scale by5/2too:6×5/2=15cups.18−15=3cups remain.','R-EQUIV','F(10,4)==F(5,2) and 6*F(5,2)==15 and 18-15==3','How could you build2½batches without using a decimal rule?','Make two full batches and one half batch.'))
add(2,'Sun',
 C('Gold:silver beads are3:4in a42-bead bracelet kit. Add6gold beads. Find the original counts and the new gold:silver ratio.','Originally18gold and24silver; new ratio24:24=1:1','Seven equal parts share42beads, so each part has6. Gold=18and silver=24. Adding6gold gives24of each color; adding only one color changes the ratio.','R-PART1','42//7*3==18 and 42//7*4==24 and F(18+6,24)==1','Which quantity changes, and which stays fixed?','Draw seven equal boxes before adding the extra gold beads.'),
 C('MixA uses2cups concentrate for3cups water. MixB uses3cups concentrate for5cups water. Compare at15cups water, then say which tastes stronger.','MixA:10cups concentrate; MixB:9cups; MixA is stronger','Multiply MixA by5and MixB by3to get the same15cups water. More concentrate for that fixed amount of water means a stronger mixture.','R-COMP','2*5==10 and 3*3==9 and 3*5==5*3 and F(2,3)>F(3,5)','Why does the same amount of water make this comparison fair?','Use15as the common water amount.'))
add(2,'Mon',
 C('A banner repeats4red flags and7green flags. You have28red and52green flags. Make as many complete patterns as possible. How many flags of each color are unused?','7patterns;0red and3green flags unused','Red allows28÷4=7patterns. Seven patterns need49green flags, leaving3green. An eighth pattern would require32red, so it cannot be made.','R-EQUIV','28//4==7 and 52//7==7 and 28-7*4==0 and 52-7*7==3','How do you know an eighth complete pattern is impossible?','Find how many complete patterns each color could supply.'),
 C('Paint uses4cups yellow for6cups blue. A small batch uses3cups yellow. Find the blue amount and total paint. Explain a non-whole scale factor.','{9/2}cups blue; {15/2}cups total; scale factor{3/4}','Three is3/4of4. Multiply6by3/4to get9/2cups blue. Add3cups yellow to get15/2cups total.','R-EQUIV','6*F(3,4)==F(9,2) and 3+F(9,2)==F(15,2)','Why is multiplying only the yellow amount insufficient?','Find the fraction of a full batch represented by3cups yellow.'))
add(2,'Tue',
 C('A table lists(bags,marbles):(2,14),(5,35),(8,54). One pair breaks the ratio. Identify it, repair it, and give the pair for zero bags.','(8,54)should be(8,56); zero bags gives(0,0)','The first two pairs each have7marbles per bag, since14÷2=35÷5=7. Eight bags must have56marbles. Zero equal groups contain zero marbles.','R-TABLE','F(14,2)==F(35,5)==7 and 8*7==56 and F(54,8)!=7','Which two pairs agree, and how can they be used to test the third?','Find the number of marbles in one bag from each of the first two rows.'),
 C('TeamA has red:blue ribbons2:3. TeamB has3:5. Each team has40ribbons. Find red ribbons for each team and compare the red fractions.','TeamA16red; TeamB15red. {2/5}>{3/8}','TeamA has5parts,8ribbons each, so16red. TeamB has8parts,5ribbons each, so15red. The same total makes the one-ribbon difference a fair comparison.','R-PART1','40//5*2==16 and 40//8*3==15 and F(2,5)>F(3,8)','Why is2:3not the same as2/3of the total?','Add both ratio parts to name the whole.'))
add(2,'Wed',
 C('A box has72beads with red:blue4:5. Without adding or removing beads, recolor some blue beads red to make equal counts. How many must be recolored?','4blue beads must become red','There are9parts of8beads:32red and40blue. Equal counts would be36and36. Recoloring4blue as red increases red by4and decreases blue by4.','R-PART1','72//9*4==32 and 72//9*5==40 and 32+4==40-4==36','Why do you move half the difference rather than the entire difference?','Each recolored bead changes the gap by2.'),
 C('The pair(n,12)has ratio2:3. Findn. Then test whether adding6to both entries preserves the ratio. Give a correct equivalent pair with first entry14.','n=8; (14,18)is not equivalent; the correct pair is(14,21)','Since12is4times3,n=4×2=8. Adding6gives14:18=7:9, not2:3. To make the first entry14, multiply2:3by7to get14:21.','R-EQUIV','F(8,12)==F(2,3) and F(14,18)!=F(2,3) and F(14,21)==F(2,3)','How does an additive change differ from a multiplicative one?','Use a scale-factor arrow on each quantity.'))
add(2,'Thu',
 C('A recipe uses flour:sugar5:2. You have20cups flour and10cups sugar. Use all the flour. Find the sugar used, sugar left, and total ingredients in the batch.','8cups sugar used;2left;28cups ingredients','Twenty cups flour is four5-cup groups. Match with four2-cup groups of sugar:8cups. Ten minus8leaves2;20+8=28cups in the batch.','R-EQUIV','20//5*2==8 and 10-8==2 and 20+8==28','Which sugar amount belongs in the batch total?','Separate the sugar available from the sugar actually used.'),
 C('A row repeats2triangles then3squares. How many of each shape occur in the first37shapes? State the triangle:square ratio for those37shapes.','16triangles and21squares;16:21','Seven full patterns use35shapes:14triangles and21squares. The next two shapes are triangles, giving16and21. A partial pattern changes the overall ratio.','R-PART1','37//5==7 and 37%5==2 and 7*2+2==16 and 7*3==21','Why is the final ratio not2:3?','Write one five-shape pattern and identify the two shapes after35.'))
add(2,'Fri',
 C('LemonadeA has lemon:water3:7. LemonadeB has2:5. Make35cups water in each recipe. Which needs more lemon, and how much more?','Aneeds15cups lemon, Bneeds14; Aneeds1cup more','ScaleAby5andBby7to get35cups water. Lemon amounts become15and14. The comparison uses the same water amount.','R-COMP','3*5==15 and 2*7==14 and 7*5==5*7==35 and 15-14==1','Would comparing only3and2have established which is stronger?','Find a common multiple of7and5.'),
 C('A club has adults:children2:5and35people. Ten more children arrive. Find the original counts, then the new adults:children ratio in simplest form.','10adults and25children; new ratio10:35=2:7','Seven equal parts split35people into groups of5. There are10adults and25children. Ten more children make35children; simplify10:35by dividing both terms by5.','R-PART1','35//7*2==10 and 35//7*5==25 and F(10,25+10)==F(2,7)','What does the number35refer to before and after the arrival?','Label the original total and the new child count separately.'))

DEEP.update({
3:dict(title='Two equivalent-ratio methods meet',prompt='A mix uses4cups oats for6cups seeds. Find seeds for10cups oats in two ways:scale by one number, and combine full and partial batches. Explain why the methods agree.',answer='15cups seeds. The scale factor is5/2; two full batches plus one half batch gives the same amount.',worked='The scale factor10÷4=5/2multiplies both quantities, so6×5/2=15. Alternatively two batches use8cups oats and12cups seeds; half a batch adds2cups oats and3cups seeds, totaling10and15.',check='F(10,4)==F(5,2) and 6*F(5,2)==15 and 2*4+F(4,2)==10 and 2*6+F(6,2)==15',skill='R-EQUIV',teacher_ask='What does the half batch mean in both columns? Why must both quantities change together?',teacher_hint='First make8cups oats, then identify how much of one batch fills the gap to10.',visual_hint='Ratio table columns: batches0,1/2,1,2,5/2; oats0,2,4,8,10; seeds0,3,6,12,15.',steps=['Write the known ratio4:6.','Scale both entries by5/2.','Build the same amounts as two batches plus half a batch.','Connect the sum of the batches to the scale factor.'],kind='comparison',model={'kind':'table','headers':['Batches','Oats','Seeds'],'rows':[['0','0','0'],['1/2','2','3'],['1','4','6'],['2','8','12'],['5/2','10','15']]}),
4:dict(title='Same water or same total?',prompt='MixA uses2cups concentrate for3cups water. MixB uses3for5. Compare their strength using the same amount of water, then using the same total amount of mixture.',answer='MixAis stronger. At15cups water,Ahas10cups concentrate andBhas9. At40cups total,Ahas16cups concentrate andBhas15.',worked='For equal water, scaleAby5andBby3. For equal totals, eachAgroup has5cups and eachBgroup has8cups, so40cups is a common total. ScaleAby8andBby5. Both valid comparisons favorA.',check='2*5==10 and 3*3==9 and 2*8==16 and 3*5==15 and F(2,5)>F(3,8)',skill='R-COMP',teacher_ask='Why can the comparison amount be water or total mixture, but cannot silently switch between them?',teacher_hint='Label every denominator before choosing a common multiple.',visual_hint='Two ratio tables: concentrate/water values(10,15),(9,15), then concentrate/total(16,40),(15,40).',steps=['Name what each ratio compares.','Make the water amount15in both recipes.','Make the total mixture40in both recipes.','Explain why both comparisons give the same conclusion.'],kind='comparison',model={'kind':'table','headers':['Mix','Concentrate','Water','Total'],'rows':[['A','10','15','25'],['B','9','15','24'],['A','16','24','40'],['B','15','25','40']]})})
DEEP[1]['model']={'kind':'numberline','min':0,'max':2,'step':0.25,'values':[0.75,1.5],'labels':['3/4of1meter','3/4of2meters'],'caption':'The fraction stays the same; the whole changes.'}
DEEP[2]=dict(title='A multiplier changes size',prompt='Predict whether{3/4}×8,1×8,and{5/4}×8are below,equal to,or above8. Use one model to explain,then compute. Would the same strict comparisons work if the starting amount were0?',answer='6<8;8=8;10>8. With a starting amount of0,all three products are0,so the strict smaller/larger rule requires a positive starting amount.',worked='One fourth of8is2. Three fourths gives3×2=6; four fourths gives8; five fourths gives5×2=10. Compare each multiplier with1. If the starting amount is0,every selected fraction of that amount is still0.',check='F(3,4)*8==6 and 1*8==8 and F(5,4)*8==10 and F(3,4)*0==F(5,4)*0==0',skill='F-SCALE',teacher_ask='Why does comparing the factor with1predict the size for a positive amount? What changes when the starting amount is0?',teacher_hint='Split8into4equal groups,then choose3,4,or5of those groups.',visual_hint='One number line0–12,step2; mark products6,8,10and label the corresponding multipliers3/4,1,5/4.',steps=['Compare each multiplier with1before calculating.','Split8into4equal groups of2.','Take3,4,and5groups to get6,8,and10.','Test the claim at0and state its positive-amount condition.'],kind='comparison',model={'kind':'numberline','min':0,'max':12,'step':2,'values':[6,8,10],'labels':['3/4×8','1×8','5/4×8']})
add(3,'Sat',
 C('Runner A travels6miles in30minutes. Runner B travels8miles in40minutes. At steady speeds, who is faster? How far does each travel in75minutes?','Same speed:12miles per hour; each travels15miles in75minutes','A covers2miles per10minutes; B does too. One hour has six10-minute intervals, giving12miles. Seventy-five minutes is5/4hour, so12×5/4=15miles.','R-RATE','F(6*60,30)==F(8*60,40)==12 and 12*F(75,60)==15','Why is a larger distance not enough to identify the faster runner?','Compare both distances for10minutes first.'),
 C('Shop A sells4notebooks for$6. Shop B sells6for$8.40. Find each unit price. Buying12notebooks, how much does the cheaper choice save?','A:$1.50each; B:$1.40each; B saves$1.20 on12','Divide each pack price by its count. Twelve notebooks cost3×$6=$18 at A and2×$8.40=$16.80 at B. The difference is$1.20.','R-RATE','F(6,4)==F("1.50") and F("8.40")/6==F("1.40") and 18-2*F("8.40")==F("1.20")','Can the higher-priced pack still have the lower unit price?','Use twelve notebooks as a common quantity to check the unit-price comparison.'))
add(3,'Sun',
 C('Twenty-four fiction books are30%of a shelf. The shelf also has science books equal to25%of all books. Find the total and science count. Which group has more books?','80books total;20science books; fiction has4more','Three10%groups contain24books, so10%=8 and100%=80. A quarter of80is20. Compare24fiction with20science.','P-WHOLE','F(24)/F(30,100)==80 and F(25,100)*80==20 and 24-20==4','Which amount represents100%in both parts of the problem?','Find10%first, then the whole.'),
 C('Team A collects125%of its48-can goal. Team B collects150%of its40-can goal. Find both totals and compare them. Explain why the larger percent need not give more cans.','Both collect60cans','125%is one whole plus one fourth:48+12=60. 150%is one whole plus one half:40+20=60. The percents act on different goals, so percent alone cannot decide the larger amount.','P-PART','F(125,100)*48==F(150,100)*40==60','What is the whole for each percent?','Separate each percent into100%and the extra part.'))
add(3,'Mon',
 C('A machine prints8labels in3minutes. Find labels per minute and minutes per label. How long will40labels take at that rate?','{8/3}labels/min;{3/8}min/label;15minutes','The two unit rates reverse the division and units. Forty labels are five8-label groups, so five3-minute intervals take15minutes.40×3/8checks the time.','R-RATE','F(8,3)*F(3,8)==1 and 40*F(3,8)==15','Which unit rate should multiply a number of labels to give minutes?','Write the units beside both quotients before choosing one.'),
 C('A cyclist goes9miles in45minutes at steady speed. If the ride continues30more minutes at that speed, find the extra distance and the entire distance.','6extra miles;15miles altogether','Nine miles in45minutes is3miles per15minutes. Thirty more minutes is two such intervals, so6extra miles. Add9+6=15miles over75minutes.','R-RATE','F(9,45)*30==6 and 9+6==15','Why should the extra distance be added only after finding it for30minutes?','Break both time periods into15-minute intervals.'))
add(3,'Tue',
 C('A$45bag is reduced by20%of its price. A$48bag is reduced by25%of its price. Find both reductions and final prices. Which final price is lower?','Reductions:$9 and$12. Both final prices are$36','Twenty percent of45is9, leaving36. One fourth of48is12, also leaving36. The discount amounts differ because the original prices differ.','P-PART','45-F(20,100)*45==48-F(25,100)*48==36 and F(20,100)*45==9 and F(25,100)*48==12','Why do we subtract a money amount rather than the percent number?','Find the part removed from each original whole.'),
 C('A class has32students. Twelve ride bicycles and8walk. Find the percent in each group and the percent who do neither. Assume the groups do not overlap.','37.5%bicycle;25%walk;37.5%neither','Twelve out of32is3/8=37.5%. Eight out of32is1/4=25%. Twenty students are in the two groups, leaving12, or37.5%, who do neither.','P-PERCENT','F(12,32)*100==F("37.5") and F(8,32)*100==25 and F(32-12-8,32)*100==F("37.5")','What makes it valid to add the two group counts?','Mark12,8,and the remaining students in one32-part whole.'))
add(3,'Wed',
 C('Flowers occupy40%of a garden and cover24square meters. Beans use{2/3}of the remaining area. Find the whole area, bean area, and area left for paths.','Whole60m²;beans24m²;paths12m²','If40%=24,then10%=6 and100%=60. After flowers,36m²remain. Beans take2/3×36=24m², leaving12m²for paths. The three regions sum to60.','P-WHOLE','24/F(40,100)==60 and F(2,3)*(60-24)==24 and 60-24-24==12','Why is the two-thirds applied to36rather than60?','Label the new whole called remaining area before taking two-thirds.'),
 C('Cyclist A goes10km in40minutes; B goes9km in30minutes. Find both hourly rates. How long would B need for12km?','A:15km/h;B:18km/h;B needs40minutes','A covers10×60/40=15km/h; B covers9×60/30=18km/h. Twelve km is4/3of B’s9-km trip, so time is30×4/3=40minutes.','R-RATE','F(10*60,40)==15 and F(9*60,30)==18 and 30*F(12,9)==40','Why must the same distance scale factor apply to travel time at steady speed?','Scale B’s9-km and30-minute pair together.'))
add(3,'Thu',
 C('You have$15and reserve20%for a bus fare. Pens cost$1.50each. What is the reserved amount, and what is the greatest number of pens you can buy with the rest?','$3reserved;8pens','Twenty percent of15is3. The remaining budget is12. Eight pens cost8×1.50=12; a ninth would cost13.50, which is too much.','P-PART','F(20,100)*15==3 and (15-3)/F("1.50")==8 and 9*F("1.50")>12','How do you justify that8is the greatest possible whole-number count?','Subtract the reserved money before counting equal pen costs.'),
 C('A tank contains18liters, which is30%of its capacity. Water flows in at6liters per minute. How many liters are needed to fill it, and how long will that take?','42liters needed;7minutes','If30%=18,then10%=6 and100%=60liters. The missing amount is60−18=42liters. At6liters each minute,42÷6=7minutes.','P-WHOLE','18/F(30,100)==60 and 60-18==42 and 42/6==7','Does the filling time depend on the full capacity or the missing amount?','Find the whole tank first, then subtract the current water.'))
add(3,'Fri',
 C('A trip includes15%of a200-student school. The trip needs2adult guides for every15students. Find the participating students and required adults.','30students and4adults','15%of200is30students. Thirty students make two15-student groups, so two2-adult groups require4adults. Total travelers would be34.','P-PART','F(15,100)*200==30 and F(30,15)*2==4','Why should the guide ratio apply to participating students rather than all200?','Finish the percent calculation before making ratio groups.'),
 C('A basket holds30oranges. Some are used; the12remaining are40%of the original count. Check this claim, then find what percent was used.','The claim is correct;60%was used','12/30=2/5=40%. The number used is30−12=18, and18/30=3/5=60%. Used and remaining percents sum to100%.','P-PERCENT','F(12,30)*100==40 and F(30-12,30)*100==60 and 40+60==100','How can the complement to100%check your second calculation?','Draw one whole basket bar and label used versus remaining.'))
DEEP.update({
5:dict(title='Two unit rates, one relationship',prompt='A printer makes12cards in5minutes. Find cards per minute and minutes per card. Use each rate to answer a different question:cards in20minutes,and time for30cards.',answer='{12/5}cards/min and{5/12}min/card;48cards in20minutes;{25/2}minutes for30cards.',worked='Divide12by5for cards per minute; reverse the division for minutes per card. Multiply20minutes by12/5cards per minute to get48cards. Multiply30cards by5/12minutes per card to get25/2minutes. Units show which rate is useful.',check='20*F(12,5)==48 and 30*F(5,12)==F(25,2)',skill='R-RATE',teacher_ask='Which units cancel in each multiplication? Why are the two unit rates reciprocals?',teacher_hint='Write one rate with cards on top,and the other with minutes on top.',visual_hint='Double number line with minutes0,5,10,15,20and cards0,12,24,36,48; highlight one-unit interpretation separately.',steps=['Name each division and its units.','Find both unit rates.','Use cards per minute to convert time to cards.','Use minutes per card to convert cards to time.'],kind='comparison',model={'kind':'doubleline','values':[20,48],'labels':['minutes','cards'],'steps':4}),
6:dict(title='One percent relationship, three unknowns',prompt='Use one percent diagram to solve three linked questions:30%of80is what?24is what percent of80?24is30%of what?Explain what stays the same.',answer='24;30%;80. The part,whole,and percent relationship is the same; only the unknown changes.',worked='Split80into ten10%groups of8. Three groups contain24. Thus24is3of10equal groups,or30%. Working backward,24÷3=8per10%group and ten groups restore80.',check='F(30,100)*80==24 and F(24,80)*100==30 and 24/F(30,100)==80',skill='P-WHOLE',teacher_ask='Which number names100%in every version? What would go wrong if we treated24as the whole?',teacher_hint='Draw the same ten equal boxes for all three questions; only hide a different label each time.',visual_hint='Double number line percent0–100and books0–80,tenequal intervals; mark30%aligned to24.',steps=['Label80as100%and find a10%group.','Count three groups to find the part24.','Use24out of80to find30%.','Reverse the grouping to recover the whole80.'],kind='comparison',model={'kind':'doubleline','values':[100,80],'labels':['percent','books'],'steps':10})})
add(4,'Sat',
 C('A2{1/2}-meter ribbon is cut into{3/4}-meter pieces. How many full pieces can you cut? How much ribbon remains?Explain why the quotient is not the full-piece count.','3full pieces;{1/4}meter remains; quotient{10/3}counts3and{1/3}of a piece','Rename2½as10/4meters. Each piece uses3fourths,so10fourths contain3full groups with1fourth left. The leftover is1/3of a3/4-meter piece,not1/3meter.','F-DIV1','F(5,2)/F(3,4)==F(10,3) and F(5,2)-3*F(3,4)==F(1,4)','What unit does the fractional part of the quotient describe?','Draw ten fourths and circle groups of three fourths.'),
 C('Pitcher A holds{3/4}liter and fills{3/8}-liter cups. Pitcher B holds1liter and fills{5/12}-liter cups. Compare exact cup counts and full cups.','A:2cups;B:{12/5}cups;both fill2full cups. Bhas{1/6}liter left','A has6eighths,so it fills two3-eighth cups. B has12twelfths,so it contains12/5cupfuls:two full cups use10/12liter,leaving2/12=1/6liter.','F-DIV1','F(3,4)/F(3,8)==2 and 1/F(5,12)==F(12,5) and 1-2*F(5,12)==F(1,6)','Why can two different quotients give the same number of full cups?','Distinguish the exact number of cupfuls from the whole number of filled cups.'))
add(4,'Sun',
 C('A rectangular card has area{5/6}square meter and width{2/3}meter. Find its length,then the distance around its edge.','Length{5/4}meters;perimeter{23/6}meters','Length=area÷width=(5/6)÷(2/3)=5/4. Add length and width,then double:2×(5/4+2/3)=2×23/12=23/6meters. Check length×width gives the original area.','F-DIV1','F(5,6)/F(2,3)==F(5,4) and 2*(F(5,4)+F(2,3))==F(23,6)','Why does dividing area by width recover a length? Why is perimeter not another product?','Label a rectangle with the known area and width before choosing operations.'),
 C('A box measures{3/4}meter by{2/3}meter by2{1/2}meters. Find its volume. Two such boxes occupy a3-cubic-meter space;how much volume is unoccupied?','Each box:{5/4}m³;unoccupied volume:{1/2}m³','The base area is3/4×2/3=1/2m². Multiply by5/2to get5/4m³per box. Two boxes use5/2m³,leaving3−5/2=1/2m³.','G-VOL','F(3,4)*F(2,3)*F(5,2)==F(5,4) and 3-2*F(5,4)==F(1,2)','Where do square units become cubic units in your calculation?','Find the base area first,then multiply by height.'))
add(4,'Mon',
 C('A jar contains{3/5}liter and is{2/3}full. Find its full capacity and the extra liquid needed to fill it.','Capacity{9/10}liter;extra{3/10}liter','Two equal thirds of the jar hold3/5liter,so one third holds3/10liter. Three thirds hold9/10liter. The missing third is3/10liter.','F-DIV1','F(3,5)/F(2,3)==F(9,10) and F(9,10)-F(3,5)==F(3,10)','How can the missing fraction of the jar help check the top-up amount?','Split the given liquid into two equal groups,then find three such groups.'),
 C('A{3/4}-batch of dough uses{4/5}cup of oil. How much oil does one full batch need?How much for1{1/2}batches?','One batch:{16/15}cups;1{1/2}batches:{8/5}cups','Find oil per full batch:(4/5)÷(3/4)=16/15. Then scale that amount by3/2to get8/5cups. As a check,1½batches is twice the original¾batch,so oil doubles from4/5to8/5.','F-DIV1','F(4,5)/F(3,4)==F(16,15) and F(16,15)*F(3,2)==F(8,5) and 2*F(4,5)==F(8,5)','Can you check the second answer without using the first answer?','Notice how1½compares with¾.'))
add(4,'Tue',
 C('There are3{1/2}kilograms of rice. Each meal uses{2/5}kilogram. Find the greatest number of complete meals and the rice left over.','8complete meals;{3/10}kilogram left','The exact quotient is(7/2)÷(2/5)=35/4=8¾meals. Eight meals use16/5kilograms.7/2−16/5=35/10−32/10=3/10kilogram remains.','F-DIV1','F(7,2)/F(2,5)==F(35,4) and F(7,2)-8*F(2,5)==F(3,10) and 9*F(2,5)>F(7,2)','Why is¾of a meal not¾kilogram?','Track both meal units and kilogram units.'),
 C('A poster has area1{7/8}square meters and width{3/4}meter. Another poster has the same area and width{5/8}meter. Find both lengths.Which must be longer,and why?','First length2{1/2}meters;second3meters. The narrower poster is longer','Divide the common area15/8by each width. Results are5/2and3. To preserve the same area,a smaller positive width must pair with a larger length.','F-DIV1','F(15,8)/F(3,4)==F(5,2) and F(15,8)/F(5,8)==3 and 3>F(5,2)','Can you predict the longer poster before dividing?','Imagine making one side shorter while keeping the same number of area tiles.'))
add(4,'Wed',
 C('A bottle holds{7/8}liter. You pour out{1/4}liter,then share the remainder equally among5cups. Find each share and check that all liquid is accounted for.','{1/8}liter per cup;five shares plus{1/4}liter equal{7/8}liter','The remainder is7/8−2/8=5/8liter. Divide by5to get1/8liter in each cup. Five eighths plus two eighths reconstruct seven eighths.','F-DIV1','(F(7,8)-F(1,4))/5==F(1,8) and 5*F(1,8)+F(1,4)==F(7,8)','What amount is being shared, and which amount was already removed?','Mark the poured amount first;divide only the remaining region.'),
 C('A{4/5}-meter ribbon is2{2/3}times one piece’s length. Find one piece’s length. Then find the exact number of piece-lengths in2meters and the number of complete pieces.','One piece:{3/10}meter;2meters holds{20/3}piece-lengths and6complete pieces','Divide4/5meter by8/3pieces to get3/10meter per piece. Divide2meters by3/10meter per piece to get20/3piece-lengths,or6and2/3. Thus6complete pieces fit;7would exceed2meters. Repeated multiplication checks both relations.','F-DIV1','F(4,5)/F(8,3)==F(3,10) and 2/F(3,10)==F(20,3) and 6*F(3,10)<=2<7*F(3,10)','Why do the two divisions produce different kinds of units?','First label the unknown as meters per piece;then use that as the group size.'))
add(4,'Thu',
 C('A tailor has5meters of cloth and sets aside{1/2}meter. Each bag needs{3/4}meter. How many bags can be made?If one more bag is ordered,how much extra cloth is needed?','6bags;{3/4}meter extra for a seventh bag','Usable cloth is5−1/2=9/2meters. Dividing by3/4gives6exactly. No usable cloth remains,so a seventh bag needs the full3/4meter. The reserved half meter stays set aside.','F-DIV1','(5-F(1,2))/F(3,4)==6 and 7*F(3,4)-(5-F(1,2))==F(3,4)','Should the reserved fabric be counted as leftover usable fabric?','Separate the reserve from the working supply before dividing.'),
 C('A cuboid has volume{9/8}cubic meter. Its base is{3/4}meter by{1/2}meter. Find the height. Then find the volume of a cuboid with the same base and half that height.','Height3meters;new volume{9/16}cubic meter','The base area is3/8square meter. Height=(9/8)÷(3/8)=3meters. Half the height is3/2meters;3/8×3/2=9/16cubic meter,half the original volume.','G-VOL','F(3,4)*F(1,2)==F(3,8) and F(9,8)/F(3,8)==3 and F(3,8)*F(3,2)==F(9,16)','Why does halving one dimension halve the volume?','Treat the cuboid as equal base-area layers.'))
add(4,'Fri',
 C('Two groups share juice. Group A shares{5/6}liter among5people;Group B shares{3/4}liter among4people. Find each person’s share and which group receives more per person.','A:{1/6}liter;B:{3/16}liter. B receives{1/48}liter more per person','Divide each amount by its number of people. Compare1/6=8/48with3/16=9/48. The smaller total can give the larger share because fewer people share it.','F-DIV1','F(5,6)/5==F(1,6) and F(3,4)/4==F(3,16) and F(3,16)-F(1,6)==F(1,48)','Why does comparing total juice alone fail?','Find and compare one-person shares.'),
 C('A student claims{2/3}÷{4/5}={8/15}. Check that answer by multiplication,then find the correct quotient and explain why it is less than1.','The correct quotient is{5/6};{8/15}×{4/5}={32/75},not{2/3}. The dividend is smaller than one divisor-sized group','Division must undo multiplication by4/5. The claimed answer fails because8/15×4/5=32/75. The correct calculation is2/3×5/4=5/6;5/6×4/5=2/3. Since2/3<4/5,the total contains less than one full group.','F-DIV1','F(8,15)*F(4,5)==F(32,75) and F(32,75)!=F(2,3) and F(2,3)/F(4,5)==F(5,6) and F(5,6)<1','What multiplication must every candidate quotient satisfy?','Write quotient×divisor=dividend before calculating.'))
DEEP.update({
7:dict(title='A remainder has two possible units',prompt='Model2{1/2}÷{3/4}. Explain both the exact quotient and the number of full pieces. Identify the remainder as a length and as a fraction of one piece.',answer='Exact quotient{10/3}=3{1/3}pieces;3full pieces;remainder{1/4}meter,which is{1/3}of a{3/4}-meter piece.',worked='The total is10fourths of a meter. Circle three groups of3fourths;one fourth remains. A full piece contains3fourths,so the leftover one fourth is1/3of one piece. Thus3⅓counts pieces while¼measures meters.',check='F(5,2)/F(3,4)==F(10,3) and F(5,2)-3*F(3,4)==F(1,4) and F(1,4)/F(3,4)==F(1,3)',skill='F-DIV1',teacher_ask='What does the denominator3in the quotient measure,and how is that different from the denominator4in the leftover length?',teacher_hint='Put unit labels after every fraction:meters or pieces.',visual_hint='Tape of10quarter-meter cells,three outlined groups of3cells,one remaining cell. A separate three-cell piece shows the remaining cell isone thirdof a piece.',steps=['Rename the total as10quarter-meter cells.','Circle three full groups of3cells.','Name the leftover length as1/4meter.','Compare the leftover cell with a3-cellpiece to explain the1/3in the quotient.'],kind='worked_reveal',model={'kind':'tape','values':[10,3],'labels':['total:10quarter-meter cells','one piece:3quarter-meter cells']}),
8:dict(title='A reciprocal counts groups in one whole',prompt='Explain{2/3}÷{3/5}in two ways:use fifteenths to count equal pieces,and count how many{3/5}-sized groups are in one whole before taking two thirds of that count.',answer='{10/9}=1{1/9}groups. Both methods count the same groups.',worked='In fifteenths,the total is10/15and one group is9/15,so there are10/9groups. One whole contains5/3groups of size3/5;two thirds of that count is2/3×5/3=10/9. The reciprocal5/3comes from groups per whole.',check='F(2,3)/F(3,5)==F(10,9) and F(2,3)*F(5,3)==F(10,9)',skill='F-DIV1',teacher_ask='Where does5/3come from in the model? Why does it multiply the dividend?',teacher_hint='Ask how many3-fifth groups fit in5fifths before considering2/3of a whole.',visual_hint='Aligned tapes:amount10fifteenths and one group9fifteenths; label one whole15fifteenths.',steps=['Rename dividend and divisor in fifteenths.','Count10pieces in groups of9.','Find groups per whole:5/3.','Take2/3of that group count and connect it to the reciprocal rule.'],kind='comparison',model={'kind':'tape','values':[10,9],'labels':['amount:10fifteenths','one group:9fifteenths']})})
add(5,'Sat',
 C('Fabric costs$3.75per meter. Buy2.4meters and pay$20. Find the cost and change. Use an estimate to check the decimal placement.','Cost$9.00;change$11.00','Compute3.75×2.4=9.00. Subtract from20to get11. An estimate of$4×2.5=$10makes$9reasonable;answers such as$0.90or$90would not fit.','D-MONEY','F("3.75")*F("2.4")==9 and 20-9==11','Which estimate would catch a misplaced decimal without giving the exact answer?','Think of2.4meters as slightly less than2½meters at slightly less than$4per meter.'),
 C('Rectangle A is0.4meter by0.35meter. Rectangle B is0.14meter by0.9meter. Find both areas and their difference. Explain why B’s area is less than0.14square meter.','A:0.14m²;B:0.126m²;difference0.014m²','A’s area is0.4×0.35=0.14. B’s area is0.14×0.9=0.126,which is9/10of0.14. Subtract to get0.014m². Multiplying a positive amount by0.9reduces it.','D-MULT','F("0.4")*F("0.35")==F("0.14") and F("0.14")*F("0.9")==F("0.126") and F("0.14")-F("0.126")==F("0.014")','Can you predict the smaller area before doing the second multiplication?','Notice that A’s area becomes one factor in B’s area calculation.'))
add(5,'Sun',
 C('A4.8-liter container fills bottles that hold0.15liter each. Bottles are packed6to a box. How many full boxes can be made,and how many filled bottles remain?','32filled bottles;5full boxes;2bottles remain','Scale4.8÷0.15by100to get480÷15=32bottles. Divide32by6:five boxes use30bottles,and2remain. All32bottles account for4.8liters.','D-DIV1','F("4.8")/F("0.15")==32 and 32//6==5 and 32%6==2 and 32*F("0.15")==F("4.8")','Why do the two divisions use different units?','First count bottles from liters;then count boxes from bottles.'),
 C('A7.35-meter roll of tape is cut into0.35-meter strips. Nineteen strips are used. Find the original number of strips,the remaining length,and how many unused strips remain.','21strips originally;0.70meter remains;2unused strips','Multiply both numbers in7.35÷0.35by100:735÷35=21. Nineteen strips use6.65meters;7.35−6.65=0.70meter. That remainder holds two0.35-meter strips.','D-DIV1','F("7.35")/F("0.35")==21 and F("7.35")-19*F("0.35")==F("0.70") and F("0.70")/F("0.35")==2','How can you check the remainder both by length and by strip count?','Find the complete strip count before subtracting the strips used.'))
add(5,'Mon',
 C('Three notebooks cost$2.65each. Add one$1.85pen and pay$10. Is the payment enough?Find the exact change or shortfall.','Enough;change$0.20','Three notebooks cost3×2.65=$7.95. Adding$1.85gives$9.80. Ten dollars exceeds that total by$0.20. Keeping cents aligned avoids interpreting0.20as20dollars.','D-MONEY','3*F("2.65")+F("1.85")==F("9.80") and 10-F("9.80")==F("0.20")','Why should you find the full purchase total before subtracting from the payment?','Keep a separate line for notebook cost,pen cost,and total.'),
 C('A student says0.25×0.12=0.3because25×12=300. Repair the answer using both place value and a quarter-of-an-amount model. Then find0.25×1.2.','0.25×0.12=0.03;0.25×1.2=0.3','Twenty-five hundredths times twelve hundredths is300ten-thousandths,or0.03. Also0.25is one quarter,and a quarter of0.12is0.03. Increasing the second factor tenfold increases the product tenfold to0.3.','D-MULT','F("0.25")*F("0.12")==F("0.03") and F("0.25")*F("1.2")==F("0.3") and F("0.03")*10==F("0.3")','How does the quarter model show the first product must be below0.12?','Divide0.12into four equal parts.'))
add(5,'Tue',
 C('A machine cuts9.6meters of wire into0.24-meter pieces. Another machine makes0.3-meter pieces from the same length. Find both counts and explain which count is larger.','40pieces at0.24meter;32pieces at0.3meter','Scale both divisions to whole-number divisors:960÷24=40and96÷3=32. A smaller piece size fits more times into the same positive total length.','D-DIV1','F("9.6")/F("0.24")==40 and F("9.6")/F("0.3")==32 and 40>32','What must be held fixed to predict the effect of a smaller divisor?','Draw the same whole wire twice and compare the proposed piece lengths.'),
 C('A cyclist covers18.9kilometers in0.7hour. Find kilometers per hour. At the same rate,how far does the cyclist travel in1.2hours?','27km/h;32.4km in1.2hours','Scale18.9÷0.7to189÷7=27km/h. Then multiply27×1.2=32.4km. Units change fromdistance per hour times hours to distance.','D-DIV1','F("18.9")/F("0.7")==27 and 27*F("1.2")==F("32.4")','Why do you divide for the first question but multiply for the second?','Name the unknown unit at each step.'))
add(5,'Wed',
 C('A shop has12kilograms of rice. After1.8kilograms are sold, the rest is packed into0.45-kilogram bags. Find the number of full bags and rice left unpacked.','22full bags;0.30kilogram remains','The available amount is12−1.8=10.2kilograms.10.2÷0.45=22⅔bagfuls. Twenty-two bags use22×0.45=9.9kilograms,leaving0.3kilogram. That remainder is less than one0.45-kilogram bag.','D-DIV1','12-F("1.8")==F("10.2") and F("10.2")/F("0.45")==F(68,3) and F("10.2")-22*F("0.45")==F("0.3") and F("0.3")<F("0.45")','Why is the fractional bag count not a decimal kilogram remainder?','After finding the greatest whole-number bag count,multiply it by the bag size.'),
 C('A4.5-meter board costs$13.50. A3.2-meter board costs$10.24. Compare prices per meter. How much would4meters cost at each unit price?','First:$3.00/m and$12for4m;second:$3.20/m and$12.80for4m','Divide each price by length:13.50÷4.5=3,and10.24÷3.2=3.2. Multiply each unit price by4. The first board has the lower price per meter even though its total price is higher.','D-DIV1','F("13.50")/F("4.5")==3 and F("10.24")/F("3.2")==F("3.2") and 4*3==12 and 4*F("3.2")==F("12.8")','Why is a common length more useful than the listed total prices?','Find dollars for one meter before comparing.'))
add(5,'Thu',
 C('A fundraiser sells24tickets at$3.75each. Supplies cost$28.60. What money remains?If the goal is$75after costs,how much more is needed?','$61.40remains;$13.60more is needed','Revenue is24×3.75=$90. Subtract$28.60to leave$61.40. Compare that result with$75:the shortfall is$13.60.','D-MONEY','24*F("3.75")==90 and 90-F("28.60")==F("61.40") and 75-F("61.40")==F("13.60")','Which amount should be compared with the goal:revenue or money after costs?','Label revenue,cost,and remaining money separately.'),
 C('A rectangular floor is3.6meters by2.5meters. Each tile covers0.09square meter. Ignore cutting and gaps. Find the floor area and the number of tiles needed.','9square meters;100tiles','The floor area is3.6×2.5=9m². Divide the area by one tile’s area:9÷0.09=100tiles. Check100×0.09=9.','D-DIV1','F("3.6")*F("2.5")==9 and 9/F("0.09")==100','Why do you divide by tile area rather than a tile side length?','Keep square meters as the unit in both amounts being divided.'))
add(5,'Fri',
 C('Two expressions are0.84÷0.07and8.4÷0.7. Predict whether they are equal,then calculate. Now compare0.84÷0.7and explain the factor-of-ten change.','The first two both equal12;0.84÷0.7=1.2,one tenth as large','Scaling both dividend and divisor by10preserves the quotient. Scaling only the divisor by10makes each group ten times larger,so only one tenth as many groups fit. Calculations are84÷7=12and8.4÷7=1.2.','D-DIV1','F("0.84")/F("0.07")==F("8.4")/F("0.7")==12 and F("0.84")/F("0.7")==F("1.2")','Which change preserves the quotient,and which change alters it?','Compare what happened to each of the two numbers independently.'),
 C('A baker uses0.18kilogram of flour per loaf and makes35loaves from a7-kilogram bag. Find the flour left. Can the remainder make4more complete loaves?Explain.','0.70kilogram remains;no,4loaves need0.72kilogram,so0.02kilogram is missing','Thirty-five loaves use35×0.18=6.3kilograms.7−6.3=0.7kilogram remains. Four loaves need4×0.18=0.72kilogram;the remainder falls short by0.02kilogram.','D-MULT','35*F("0.18")==F("6.3") and 7-F("6.3")==F("0.7") and 4*F("0.18")-F("0.7")==F("0.02")','Why can rounding0.72to0.7give the wrong decision here?','Use the exact amounts for the final enough-or-not comparison.'))
DEEP.update({
9:dict(title='Place value explains the product',prompt='Compare0.3×0.7with0.3×0.07. Predict the factor-of-ten relationship,then explain why the products use hundredths and thousandths. Contrast both with0.3+0.07.',answer='0.21and0.021;the second product is one tenth of the first. The sum is0.37because addition combines equal place values rather than multiplying unit sizes.',worked='Three tenths times seven tenths is21hundredths:0.21. Three tenths times seven hundredths is21thousandths:0.021. Reducing one factor by10reduces the product by10. For addition,rename0.3as30hundredths and add7hundredths to get37hundredths.',check='F("0.3")*F("0.7")==F("0.21") and F("0.3")*F("0.07")==F("0.021") and F("0.21")/10==F("0.021") and F("0.3")+F("0.07")==F("0.37")',skill='D-MULT',teacher_ask='Why do addition and multiplication treat the decimal places differently?',teacher_hint='Name the size of one unit in each factor before counting how many units are in the product.',visual_hint='A unit-product table contrasts tenths×tenths=hundredths with tenths×hundredths=thousandths;avoid a hundred-grid that falsely represents0.021as0.21.',steps=['Predict how changing0.7to0.07changes the product.','Multiply counts3×7=21in both examples.','Name the product units:hundredths or thousandths.','Contrast with addition by renaming both addends in hundredths.'],kind='comparison',model={'kind':'table','headers':['Calculation','Unit','Result'],'rows':[['0.3×0.7','21hundredths','0.21'],['0.3×0.07','21thousandths','0.021'],['0.3+0.07','37hundredths','0.37']]}),
10:dict(title='Which rescaling keeps the quotient?',prompt='Start with0.48÷0.06. Compare4.8÷0.6,0.48÷0.6,and4.8÷0.06. Predict each change before calculating;explain using the sizes and numbers of groups.',answer='8,8,0.8,and80,respectively. Scaling both amounts preserves the quotient;scaling only the divisor divides it by10;scaling only the dividend multiplies it by10.',worked='0.48contains eight0.06-sized groups. Scaling both by10gives the same eight groups. A tenfold larger divisor makes only one tenth as many groups fit; a tenfold larger dividend holds ten times as many groups. Verify by multiplying each quotient by its divisor.',check='F("0.48")/F("0.06")==F("4.8")/F("0.6")==8 and F("0.48")/F("0.6")==F("0.8") and F("4.8")/F("0.06")==80',skill='D-DIV1',teacher_ask='Is moving the decimal point a reason,or a shortcut for changing units? Which quantities must be rescaled together?',teacher_hint='Draw the original total and group size,then identify which one changes in each row.',visual_hint='Four-row table of dividend,divisor,quotient;reveal one row at a time after predicting its relationship to8.',steps=['Interpret the original quotient as a count of0.06-sized groups.','Scale both quantities by10and explain why the count stays8.','Scale only the divisor and predict0.8.','Scale only the dividend and predict80;check all results by multiplication.'],kind='comparison',model={'kind':'table','headers':['Dividend','Divisor','Quotient'],'rows':[['0.48','0.06','8'],['4.8','0.6','8'],['0.48','0.6','0.8'],['4.8','0.06','80']]})})

# Explicit challenge models are unsolved scaffolds; deepening models may show the explanation.
for w,d,i,diagram in [
 (1,'Sat',0,{'kind':'numberline','min':0,'max':1,'step':1,'values':[]}),
 (1,'Sat',1,{'kind':'numberline','min':0,'max':1,'step':1,'values':[]}),
 
 (2,'Sat',0,{'kind':'table','headers':['Red','Blue'],'rows':[['3','5'],['18','?']]}),
 (2,'Sat',1,{'kind':'table','headers':['Oats','Seeds'],'rows':[['4','6'],['10','?']]}),
 (2,'Sun',0,{'kind':'tape','values':[3,4],'labels':['gold:3equalparts','silver:4equalparts']}),
 (2,'Sun',1,{'kind':'table','headers':['Mix','Concentrate','Water'],'rows':[['A','2','3'],['B','3','5']]}),
 (3,'Sat',0,{'kind':'table','headers':['Runner','Miles','Minutes'],'rows':[['A','6','30'],['B','8','40']]}),
 (3,'Sun',0,{'kind':'table','headers':['Percent','Books'],'rows':[['0','0'],['30','24'],['100','?']]}),
 (4,'Sat',0,{'kind':'numberline','min':0,'max':3,'step':0.25,'values':[]}),
 
 (5,'Sat',1,{'kind':'table','headers':['Rectangle','Length','Width'],'rows':[['A','0.4','0.35'],['B','0.14','0.9']]}),
 (5,'Sun',0,{'kind':'table','headers':['Amount','Liters'],'rows':[['total','4.8'],['onebottle','0.15']]})
]:CH[w,d][i]['diagram']=diagram


# Use different numbers in the worked deepening and the daily challenge so teaching
# the new idea does not disclose an entire challenge answer in advance.
DEEP[3].update(prompt='A mix uses3cups oats for4cups seeds. Find seeds for7{1/2}cups oats in two ways:scale by one number,and combine full and partial batches. Explain why the methods agree.',answer='10cups seeds. The scale factor is5/2;two full batches plus one half batch gives the same amount.',worked='The scale factor(15/2)÷3=5/2multiplies both quantities,so4×5/2=10. Alternatively two batches use6cups oats and8cups seeds;half a batch adds3/2cups oats and2cups seeds,totaling15/2and10.',check='F(15,2)/3==F(5,2) and 4*F(5,2)==10 and 2*3+F(3,2)==F(15,2) and 2*4+F(4,2)==10',teacher_hint='First make6cups oats,then identify what fraction of one batch fills the gap to7½.',visual_hint='Ratio table columns:batches0,1/2,1,2,5/2;oats0,3/2,3,6,15/2;seeds0,2,4,8,10.',steps=['Write the known ratio3:4.','Scale both entries by5/2.','Build the same amounts as two batches plus half a batch.','Connect the sum of the batches to the scale factor.'],model={'kind':'table','headers':['Batches','Oats','Seeds'],'rows':[['0','0','0'],['{1/2}','{3/2}','2'],['1','3','4'],['2','6','8'],['{5/2}','{15/2}','10']]})
DEEP[4].update(prompt='Mix A uses3cups concentrate for4cups water. Mix B uses4for7. Compare strength using the same amount of water,then using the same total amount of mixture.',answer='Mix A is stronger. At28cups water,A has21cups concentrate andB has16. At77cups total,A has33cups concentrate andB has28.',worked='For equal water,scale A by7and B by4. For equal totals,each A group has7cups and each B group has11cups,so77cups is a common total. Scale A by11and B by7. Both valid comparisons favor A.',check='3*7==21 and 4*4==16 and 3*11==33 and 4*7==28 and F(3,7)>F(4,11)',visual_hint='Two ratio tables:concentrate/water values(21,28),(16,28),then concentrate/total(33,77),(28,77).',steps=['Name what each ratio compares.','Make the water amount28in both recipes.','Make the total mixture77in both recipes.','Explain why both comparisons give the same conclusion.'],model={'kind':'table','headers':['Mix','Concentrate','Water','Total'],'rows':[['A','21','28','49'],['B','16','28','44'],['A','33','44','77'],['B','28','49','77']]})
DEEP[6].update(prompt='Use one percent diagram to solve three linked questions:20%of75is what?15is what percent of75?15is20%of what?Explain what stays the same.',answer='15;20%;75. The part,whole,and percent relationship is the same;only the unknown changes.',worked='Split75into five20%groups of15. One group contains15,so20%of75is15. Thus15is one of five equal groups,or20%. Working backward,five15-book groups restore75books.',check='F(20,100)*75==15 and F(15,75)*100==20 and 15/F(20,100)==75',teacher_hint='Draw the same five equal boxes for all three questions;only hide a different label each time.',visual_hint='Double number line percent0–100and books0–75,fiveequal intervals;20%aligns to15.',steps=['Label75as100%and find a20%group.','One group gives the part15.','Use15out of75to find20%.','Reverse the grouping to recover the whole75.'],model={'kind':'doubleline','values':[100,75],'labels':['percent','books'],'steps':5})
DEEP[7].update(prompt='Model2{1/3}÷{2/3}. Explain both the exact quotient and the number of full pieces. Identify the remainder as a length and as a fraction of one piece.',answer='Exact quotient{7/2}=3{1/2}pieces;3full pieces;remainder{1/3}meter,which is{1/2}of a{2/3}-meter piece.',worked='The total is7thirds of a meter. Circle three groups of2thirds;one third remains. A full piece contains2thirds,so the leftover one third is1/2of one piece. Thus3½counts pieces while⅓measures meters.',check='F(7,3)/F(2,3)==F(7,2) and F(7,3)-3*F(2,3)==F(1,3) and F(1,3)/F(2,3)==F(1,2)',teacher_ask='What does the denominator2in the quotient measure,and how is that different from the denominator3in the leftover length?',visual_hint='Tape of7third-meter cells,three outlined groups of2cells,one remaining cell. A separate two-cell piece shows the remaining cell is one half of a piece.',steps=['Rename the total as7third-meter cells.','Circle three full groups of2cells.','Name the leftover length as1/3meter.','Compare the leftover cell with a2-cell piece to explain the1/2in the quotient.'],model={'kind':'tape','values':[7,2],'labels':['total:7third-meter cells','one piece:2third-meter cells']})
DEEP[8].update(prompt='Explain{3/4}÷{2/5}in two ways:use twentieths to count equal pieces,and count how many{2/5}-sized groups are in one whole before taking three fourths of that count.',answer='{15/8}=1{7/8}groups. Both methods count the same groups.',worked='In twentieths,the total is15/20and one group is8/20,so there are15/8groups. One whole contains5/2groups of size2/5;three fourths of that count is3/4×5/2=15/8. The reciprocal5/2comes from groups per whole.',check='F(3,4)/F(2,5)==F(15,8) and F(3,4)*F(5,2)==F(15,8)',teacher_ask='Where does5/2come from in the model? Why does it multiply the dividend?',teacher_hint='Ask how many2-fifth groups fit in5fifths before considering3/4of a whole.',visual_hint='Aligned tapes:amount15twentieths and one group8twentieths;label one whole20twentieths.',steps=['Rename dividend and divisor in twentieths.','Count15pieces in groups of8.','Find groups per whole:5/2.','Take3/4of that group count and connect it to the reciprocal rule.'],model={'kind':'tape','values':[15,8],'labels':['amount:15twentieths','one group:8twentieths']})

if __name__=='__main__':output()
