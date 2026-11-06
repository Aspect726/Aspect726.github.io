import json, math, statistics
from fractions import Fraction as F
from decimal import Decimal as D
from pathlib import Path

def P(text,answer,skill,case,check,worked='',wrong='',error='',diagram=None):
 d=dict(text=text,answer=answer,skill=skill,case=case,check=check,worked=worked,wrong=wrong,error=error)
 if diagram: d['diagram']=diagram
 return d

def V(term,meaning,example): return dict(term=term,meaning=meaning,example=example)
def M(response,why,move): return dict(response=response,why=why,move=move)
def E(text,answer,steps,check): return dict(text=text,answer=answer,steps=steps,check=check)
def S(i,title,std,goal,idea,pre,materials,vocab,ps,exit,error,example,fade,model,look,mis,discussion,frame,sort):
 return dict(id=i,title=title,standards=std,goal=goal,key_idea=idea,prerequisite=pre,materials=materials,vocab=vocab,problems=ps,exit=exit,error=error,example=example,fade=fade,model=model,look_fors=look,misconceptions=mis,discussion=discussion,summary_frame=frame,exit_sort=sort)
def Err(text,correction,wrong,why,move):return dict(text=text,correction=correction,wrong=wrong,why=why,move=move)
def Sort(g,a,r):return dict(got=g,almost=a,reteach=r)

s1=S(1,'Fractions on one number line',['4.NF.A.1','4.NF.A.2','5.NF.A.1','5.NF.B.3','5.NBT.A.3'],
'I can compare fractions and decimals by placing them on the same number line.',
'A fraction names equal parts of one whole. The size of that whole stays fixed.',
'Name numerator and denominator. Divide a whole into equal parts.',
['paper fraction strips','blank number lines','pencil'],
[V('Numerator','The top number counts equal parts.','In {3/5}, count three fifths.'),V('Denominator','The bottom number names how many equal parts make one whole.','Five fifths make one whole.'),V('Equivalent fractions','Different names for the same amount.','{1/2} = {3/6}.'),V('Quotient','The result of division.','3 ÷ 4 = {3/4}.')],
[
P('Compare {3/7} and {5/7}. Write <, >, or =.','{3/7} < {5/7}','F-COMP','Same denominator','F(3,7)<F(5,7)','Both use sevenths. Three parts are fewer than five.','>','Counting denominator size instead of the number of parts.'),
P('Compare {4/5} and {4/9}. Use strips of the same length.','{4/5} > {4/9}','F-COMP','Same numerator','F(4,5)>F(4,9)','Fifths are larger than ninths, so four fifths cover more.','<','Thinking a larger denominator makes a larger amount.'),
P('Is {5/12} less than or greater than {1/2}?','Less than {1/2}','F-COMP','Benchmark comparison','F(5,12)<F(1,2)','Half of twelve parts is six parts. Five twelfths is below half.'),
P('Compare {3/5} and {7/12}. Rename both using sixtieths.','{3/5} > {7/12}','F-COMP','Unlike denominators and numerators','F(3,5)==F(36,60) and F(7,12)==F(35,60) and F(3,5)>F(7,12)','{3/5} = {36/60}; {7/12} = {35/60}. Compare 36 and 35.'),
P('On a 0-to-2 line, place {5/4}, 1 {3/4}, and 0.5.','Left to right: 0.5, {5/4}, 1 {3/4}','F-LINE','Improper fraction, mixed number and decimal','D("0.5")<F(5,4)<F(7,4)','{5/4} = 1 {1/4}. Split each whole into four equal steps.',diagram={'kind':'numberline','min':0,'max':2,'ticks':8,'values':[],'caption':'Each tick interval is one fourth.'}),
P('Compare {7/10} and 0.68.','{7/10} > 0.68','F-COMP','Fraction versus decimal','F(7,10)>D("0.68")','{7/10} = 0.70, which is 2 hundredths more than 0.68.'),
P('A line has ticks at 0, 2, and 4. Place 2 {1/2}.','One fourth of the way from 2 to 4','F-LINE','Changed number-line scale','(F(5,2)-2)/(4-2)==F(1,4)','The interval from 2 to 4 is two units. Half a unit uses one fourth of that interval.',diagram={'kind':'numberline','min':0,'max':4,'ticks':2,'values':[],'caption':'Main ticks are two units apart.'}),
P('Three identical muffins are shared equally by four friends. How much muffin does each friend receive?','{3/4} of a muffin','F-QUOT','Fraction as division','F(3,4)*4==3','Split each muffin into fourths. Each friend gets three fourths.')],
P('Order {3/4}, {7/10}, and 0.72 from least to greatest. Place them on a 0-to-1 line.','{7/10}, 0.72, {3/4}','F-COMP','Exit: denominator misconception with decimals','F(7,10)<D("0.72")<F(3,4)','Rename as 0.70, 0.72, 0.75. Their positions increase to the right.','{3/4}, 0.72, {7/10}','The larger denominator does not make the fraction larger.',diagram={'kind':'numberline','min':0,'max':1,'ticks':10,'values':[],'caption':'Label each number between 0 and 1.'}),
Err('Nora says {4/9} is greater than {4/5} because 9 is greater than 5. Explain and repair her claim.','{4/5} > {4/9}. Nine equal pieces are smaller than five equal pieces of the same whole.','{4/9} > {4/5}','She compares denominator counts without comparing piece sizes.','Align equal-length strips. Cover four fifths and four ninths.'),
E('Compare {2/3} and {3/4}.','{2/3} < {3/4}',['Use one whole for both fractions.','Split the whole into 12 equal parts.','{2/3} = {8/12}; {3/4} = {9/12}.','Eight twelfths is less than nine twelfths.'],'F(2,3)==F(8,12) and F(3,4)==F(9,12) and F(2,3)<F(3,4)'),
{'text':'Complete: {5/6} = __ twelfths. Compare {5/6} and {3/4}.','answer':'10 twelfths; {5/6} > {3/4}','check':'F(5,6)==F(10,12) and F(5,6)>F(3,4)'},
{'kind':'numberline','min':0,'max':2,'ticks':8,'values':[0.5,1.25,1.75],'labels':['0.5','{5/4}','1 {3/4}'],'caption':'One whole keeps the same length.'},
[M('Uses equal-length wholes.','Comparisons require the same unit.','Ask the student to mark 0 and 1 on both strips.'),M('Uses a benchmark or common denominator.','Both are valid comparison methods.','Accept either method and ask where the fractions lie.'),M('Counts spaces between ticks, not tick marks.','Each space represents an equal fractional step.','Trace one interval and name its length.')],
[M('Places {5/4} between 0 and 1.','Thinks all fractions are less than one.','Build four fourths, then add one fourth.'),M('Orders by denominator size.','Confuses number of parts with part size.','Compare equal-length strips cut into fifths and ninths.')],
['Agree or disagree: More pieces always means more muffin. Use the same whole to support your answer.','Partner compare: How does a benchmark comparison differ from renaming both fractions?'],
'To compare fractions, I first keep ___ the same. Then I can ___.',
Sort('Orders all three correctly and places them in order between 0.7 and 0.8, with {3/4} at 0.75.','Order is correct, but a position or label is imprecise; explains that larger denominator means smaller equal parts.','Reverses the fractions because 10 exceeds 4, or uses inconsistent units.'))

s2=S(2,'Fraction operations with models',['5.NF.B.3','5.NF.B.4','5.NF.B.5','5.NF.B.6','5.NF.B.7'],
'I can use equal parts to explain fraction multiplication and two kinds of division.',
'Multiplication can take part of an amount. Division can count groups or find the size of each share.',
'Equivalent fractions and equal-sized parts.', ['paper rectangles','fraction strips','pencil'],
[V('Scaling','Multiplying an amount to change its size.','{1/2} × 8 takes half of eight.'),V('Unit fraction','A fraction with numerator 1.','{1/5} is one fifth.'),V('Product','The result of multiplication.','{1/2} × 8 has product 4.')],
[
P('Five bags each hold {3/4} cup of seeds. How many cups altogether?','3 {3/4} cups','F-MULT','Whole number times fraction','5*F(3,4)==F(15,4)','Five groups of three fourths make fifteen fourths.'),
P('A rectangle is {3/5} meter long and {2/3} meter wide. Find its area using equal parts.','{2/5} square meter','F-MULT','Fraction times fraction','F(3,5)*F(2,3)==F(2,5)','Divide a unit square into 5 columns and 3 rows. The overlap is 6 of 15 parts.',diagram={'kind':'area','rows':3,'cols':5,'shade_rows':2,'shade_cols':3,'caption':'The overlap covers 6 of 15 equal parts.'}),
P('Find {2/3} of 1 {1/2} cups.','1 cup','F-MULT','Fraction times mixed number','F(2,3)*F(3,2)==1','Rename 1 {1/2} as {3/2}. Two thirds of three halves is two halves.'),
P('Without multiplying first, compare {3/4} × 8 and {5/4} × 8 with 8. Then compute.','6 < 8; 10 > 8','F-SCALE','Factors below and above one','F(3,4)*8==6 and F(5,4)*8==10 and 6<8<10','Three fourths takes less than all eight. Five fourths takes more than all eight.'),
P('Three meters of ribbon are cut into {1/4}-meter pieces. How many pieces?','12 pieces','F-DIV','Whole number divided by unit fraction','3/F(1,4)==12','There are four fourths per meter. Three meters hold twelve fourths.'),
P('A {1/4}-liter juice sample is shared equally among three cups. How much goes in each cup?','{1/12} liter','F-DIV','Unit fraction divided by whole number','F(1,4)/3==F(1,12)','Split one fourth into three equal parts. Each is one twelfth of a liter.'),
P('Write one story for 2 ÷ {1/5} and one for {1/5} ÷ 2. Solve both.','10 groups; {1/10} in each share. Stories vary.','F-DIV','Contrast counting groups and sharing','2/F(1,5)==10 and F(1,5)/2==F(1,10)','Example: cut 2 meters into fifth-meter pieces; share a fifth-meter piece equally between two people.')],
P('A board is 5 meters long. Each shelf needs {1/2} meter. How many shelves can be cut?','10 shelves','F-DIV','Exit: division by a number below one','5/F(1,2)==10','Each meter contains two half-meters, so five meters contain ten.','2 {1/2}','Multiplying by one half answers a different question.'),
Err('Eli says 3 ÷ {1/4} = {3/4}, because division makes numbers smaller. Show why this fails.','Twelve quarter-meter pieces fit in 3 meters.','{3/4}','He treats division by a fraction as multiplication by that fraction.','Make one meter from four quarter-meter pieces, then repeat three times.'),
E('Find {3/4} of {2/3} cup.','{1/2} cup',['Split a whole into 3 equal columns and 4 equal rows.','Select 2 columns, then 3 fourths of those columns.','The overlap is 6 of 12 pieces: {6/12} = {1/2}.'],'F(3,4)*F(2,3)==F(6,12)==F(1,2)'),
{'text':'A model has 4 columns and 3 rows. Shade {3/4}, then {2/3} of it. Complete __ × __ = __.','answer':'{3/4} × {2/3} = {1/2}','check':'F(3,4)*F(2,3)==F(1,2)'},
{'kind':'area','rows':3,'cols':5,'shade_rows':2,'shade_cols':3,'caption':'{2/3} of {3/5} is {6/15}, or {2/5}.'},
[M('Counts overlapping equal parts in the area model.','The overlap represents multiplication.','Ask what fraction of the entire unit square is shaded twice.'),M('Predicts shrinking for a factor below one.','Connects computation to scaling.','Ask for an estimate before calculation.'),M('Distinguishes number of pieces from piece size.','These division situations have different units.','Accept a tape or a story, but require units in the answer.')],
[M('Says multiplication always increases an amount.','Uses only whole-number experience.','Take half of a familiar amount.'),M('Uses the same answer for reversed division.','Does not identify what is known and unknown.','Label total amount, number of groups, and group size.')],
['Agree or disagree: Taking three fourths of a cup gives more than one cup.','Partner compare: In the two ribbon stories, which question counts pieces and which finds their size?'],
'When I divide, I first ask whether I need the number of ___ or the size of ___.',
Sort('Gives 10 shelves and connects five meters to ten equal half-meter pieces.','Gives 10 but cannot yet explain the unit or draw equal pieces.','Gives 2 {1/2} or claims the answer must be below 5.'))

s3=S(3,'Equivalent ratios',['6.RP.A.1','6.RP.A.3a'],
'I can keep a ratio unchanged while making more or less of a mixture.',
'Equivalent ratios multiply or divide both quantities by the same factor.',
'Multiplication, division, and equal groups.', ['two colors of counters','paper strips','pencil'],
[V('Ratio','A comparison of two amounts in a stated order.','4 red to 3 blue is 4 : 3.'),V('Equivalent ratios','Ratios that describe the same relationship.','4 : 3 and 8 : 6 are equivalent.'),V('Scale factor','The number used to multiply both amounts.','From 4 : 3 to 12 : 9, the factor is 3.')],
[
P('The diagram has 4 red tiles and 3 blue tiles. Write red : blue. Write blue : red.','4 : 3; 3 : 4','R-RATIO','Read a picture and preserve order','F(4,3)!=F(3,4)','Name the requested first color before writing its count.',diagram={'kind':'tape','values':[4,3],'labels':['red tiles','blue tiles'],'caption':'Each block represents one tile.'}),
P('A trail mix uses 4 raisins for every 3 nuts. How many nuts go with 12 raisins?','9 nuts','R-EQUIV','Scale up by a whole number','F(12,4)*3==9','Twelve is three times four, so use three times three nuts.'),
P('A box has 20 red tiles and 15 blue tiles. Divide both counts by 5 to find an equivalent ratio.','4 : 3','R-EQUIV','Scale down by division','F(20,15)==F(4,3) and 20//5==4 and 15//5==3','Make five equal groups. Each has four red and three blue.'),
P('A recipe uses 6 cups of oats for every 4 cups of seeds. How many cups of seeds go with 9 cups of oats?','6 cups','R-EQUIV','Non-whole scale factor','F(9,6)*4==6','Nine is 1 {1/2} times six. Multiply four by the same factor.'),
P('Paint uses 2 cups yellow for every 5 cups blue. How much yellow goes with 15 cups blue?','6 cups yellow','R-EQUIV','Missing value in a mixture','F(15,5)*2==6','Fifteen cups blue makes three batches. Each batch uses two cups yellow.'),
P('Each game team has 3 builders for every 2 testers. How many builders go with 8 testers?','12 builders','R-EQUIV','Missing value in groups','F(8,2)*3==12','Eight testers make four groups of two. Four groups need twelve builders.')],
P('A bracelet pattern uses 7 green beads for every 4 white beads. How many green beads go with 12 white beads?','21 green beads','R-EQUIV','Exit: multiplicative versus additive reasoning','F(12,4)*7==21 and 7+(12-4)==15','Twelve white beads are three groups of four. Use three groups of seven green.','15','Adding eight to each count changes the relationship.'),
Err('Mia changes 4 red : 3 blue to 7 red : 6 blue by adding 3 to each count. Is the ratio unchanged?','No. Two copies would give 8 : 6, not 7 : 6.','7 : 6 is equivalent to 4 : 3.','She uses equal additions rather than equal multiplication.','Build two full copies of the original group and compare.'),
E('A mix uses 3 cups oats for every 2 cups seeds. Find seeds for 12 cups oats.','8 cups seeds',['12 ÷ 3 = 4 batches.','Each batch has 2 cups seeds.','4 × 2 = 8 cups seeds.'],'F(12,3)*2==8'),
{'text':'A mix uses 5 cups oats for every 2 cups seeds. Ten cups oats makes __ batches and needs __ cups seeds.','answer':'2 batches; 4 cups seeds','check':'F(10,5)==2 and F(10,5)*2==4'},
{'kind':'tape','values':[4,3],'labels':['red tiles','blue tiles'],'caption':'Repeat the whole 4 : 3 group.'},
[M('Says four red for every three blue.','Names both quantities and their order.','Ask for the reversed ratio and compare meanings.'),M('Repeats or partitions a complete group.','Shows equivalent ratios concretely.','Ask which factor acts on both amounts.'),M('Uses a half-batch or a unit batch.','Non-whole factors can preserve the ratio.','Accept either method if both quantities scale equally.')],
[M('Adds the same count to both colors.','Confuses additive and multiplicative change.','Build identical batches.'),M('Says 4 : 3 means four out of three.','Confuses part-to-part and part-to-whole.','Count the total seven tiles before naming the red fraction.')],
['Agree or disagree: Adding the same number to both counts keeps a mixture the same.','Partner compare: How do you know the recipe with nine cups of oats has the same taste?'],
'To keep a ratio the same, I ___ both quantities by ___.',
Sort('Gives 21 green beads and shows a factor of 3 on both quantities.','Gives 21 with incomplete labeling, or makes a small arithmetic slip after using factor 3.','Gives 15 or another answer from adding the same amount.'))

s4=S(4,'Ratio tables and comparisons',['6.RP.A.1','6.RP.A.3a','6.RP.A.3b'],
'I can use tables, double number lines, and equal totals to solve ratio problems.',
'A ratio table records equal groups. Comparing mixtures needs a common amount or a common total.',
'Scaling both amounts in a ratio.', ['grid paper','ruler','two colors of counters'],
[V('Ratio table','A table of matching amounts with the same ratio.','(2, 5), (4, 10), and (6, 15).'),V('Double number line','Two aligned scales showing matching amounts.','Two cups concentrate matches five cups water.'),V('Part-to-whole','A comparison between one part and the total.','2 red and 3 blue makes red {2/5} of all tiles.')],
[
P('Concentrate : water is 2 : 5. Complete pairs (2, 5), (4, __), and (6, 15).','10 cups water','R-TABLE','One missing table value','F(4,2)*5==10','Double both numbers in (2, 5).',diagram={'kind':'ratio','labels':['concentrate','water'],'rows':[[2,5],[4,'?'],[6,15]],'caption':'Each row describes the same mixture.'}),
P('For that 2 : 5 mixture, how much water matches 10 cups concentrate? Solve using a table and a double number line.','25 cups water','R-TABLE','Solve the same problem two ways','F(10,2)*5==25','Table: multiply (2, 5) by five. Line: five equal jumps of 2 match five jumps of 5.',diagram={'kind':'doubleline','values':[2,5],'labels':['concentrate','water'],'multiples':5,'caption':'Equal jumps pair matching amounts.'}),
P('Mix A uses 3 cups syrup to 4 cups water. Mix B uses 5 cups syrup to 8 cups water. Which has more syrup for the same water?','Mix A','R-COMP','Compare using a common amount','F(3,4)>F(5,8)','Double A to get 6 syrup : 8 water. Compare 6 syrup with 5 syrup.'),
P('Yellow : blue paint is 2 : 3. There are 35 cups in all. How much of each color?','14 cups yellow and 21 cups blue','R-WHOLE','Part-part-whole with total','F(35,5)*2==14 and F(35,5)*3==21','Five equal ratio parts total 35. Each part is 7 cups.'),
P('Plot (1, 3), (2, 6), and (3, 9). Let x be bags and y be marbles. Does their straight line also pass through (0, 0)?','Yes','R-GRAPH','Ratio points in the first quadrant','all(y==3*x for x,y in [(0,0),(1,3),(2,6),(3,9)])','Each y-value is three times its x-value. Zero bags have zero marbles.',diagram={'kind':'coordinate','points':[[1,3],[2,6],[3,9]],'xmax':4,'ymax':10,'labels':['bags','marbles'],'caption':'Plot the matching amounts.'})],
P('Mix A has 4 cups juice and 3 cups water. Mix B has 6 cups juice and 5 cups water. Which has the larger fraction of juice?','Mix A','R-COMP','Exit: equal differences do not imply equal ratios','F(4,7)>F(6,11) and 4-3==6-5','A is {4/7} juice; B is {6/11}. Compare {44/77} and {42/77}.','They are the same.','Both differences are one, but the fractions of juice differ.'),
Err('Leo says 2 yellow : 3 blue means {2/3} of all the paint is yellow. Repair his statement.','There are five parts in all. Yellow is {2/5} of the paint.','{2/3}','He uses the other part as the whole.','Join the two yellow parts and three blue parts into one total strip.'),
E('Orange : purple tiles is 3 : 2. There are 25 tiles. Find each count.','15 orange, 10 purple',['3 + 2 = 5 equal parts.','25 ÷ 5 = 5 tiles per part.','Orange: 3 × 5 = 15. Purple: 2 × 5 = 10.'],'F(25,5)*3==15 and F(25,5)*2==10'),
{'text':'Green : white is 4 : 1. There are 30 beads. Five equal parts means __ beads per part. Green = __; white = __.','answer':'6 per part; 24 green; 6 white','check':'30/5==6 and 4*6==24'},
{'kind':'doubleline','values':[2,5],'labels':['concentrate','water'],'multiples':5,'caption':'Two cups concentrate pairs with five cups water.'},
[M('Keeps matching values in the same row.','Pairs are meaningful together.','Ask what one complete row means.'),M('Finds a common water amount or compares part fractions.','Both are valid ratio comparisons.','Accept either method and require a shared comparison unit.'),M('Adds ratio parts before using the total.','Separates a part-to-part ratio from the whole.','Ask the student to label all five parts.')],
[M('Compares mixtures by subtraction.','A difference ignores mixture size.','Use the same amount of water in both mixtures.'),M('Divides total by one ratio number.','Treats one part as the whole.','Draw and count all ratio parts first.')],
['Agree or disagree: A mixture with more cups of juice always tastes stronger.','Partner compare: Why must the 35-cup paint total be divided into five parts?'],
'To compare two mixtures fairly, I can make ___ the same.',
Sort('Chooses A and compares equivalent ratios or correct fractions of juice.','Chooses A but does not show a valid comparison, or makes a minor arithmetic slip with the right setup.','Says equal because the differences match, or compares only the juice counts.'))

s5=S(5,'Rates and unit rates',['6.RP.A.2','6.RP.A.3b'],
'I can find an amount per one unit and use it to compare rates.',
'A unit rate names how much of one quantity goes with one unit of another. Its units show the division order.',
'Equivalent ratios and decimal division by whole numbers.', ['ratio table template','double number line template','pencil'],
[V('Rate','A ratio comparing quantities with different units.','15 kilometers in 3 hours.'),V('Unit rate','An amount per one unit of another quantity.','5 kilometers per hour.'),V('Per','For each one.','$0.60 per apple means $0.60 for one apple.')],
[
P('A rider goes 20 kilometers in 4 hours at a steady speed. Find kilometers per hour.','5 kilometers per hour','R-RATE','Whole-number unit rate','F(20,4)==5','Divide 20 kilometers by 4 hours.'),
P('Eight apples cost $6.00. Find dollars per apple.','$0.75 per apple','R-RATE','Decimal unit rate','D("6.00")/8==D("0.75")','Share the total cost equally among eight apples.'),
P('Two cups of rice make 5 servings. Find cups per serving.','{2/5} cup per serving','R-RATE','Fraction unit rate','F(2,5)==F(2,5)','Divide two cups among five servings. The unit is cups per serving.'),
P('A printer makes 15 cards in 3 minutes. Find cards per minute and minutes per card.','5 cards per minute; {1/5} minute per card','R-RATE','Both unit-rate directions','F(15,3)==5 and F(3,15)==F(1,5)','Cards per minute uses 15 ÷ 3. Minutes per card uses 3 ÷ 15.'),
P('Pack A has 6 pencils for $2.40. Pack B has 10 pencils for $3.50. Which costs less per pencil?','Pack B: $0.35 per pencil','R-COMP','Compare deals with unequal quantities','D("2.40")/6==D("0.40") and D("3.50")/10==D("0.35") and D("0.35")<D("0.40")','A costs $0.40 each. B costs $0.35 each, saving $0.05 per pencil.'),
P('A skater travels 3 miles in 20 minutes at steady speed. Find miles per hour.','9 miles per hour','R-RATE','Time below one hour','3*(60//20)==9','An hour has three 20-minute groups, so multiply 3 miles by 3.'),
P('A robot rolls 4 meters each second. Complete distances for 0, 2, and 5 seconds.','0, 8, and 20 meters','R-TABLE','Constant-speed table','[4*t for t in [0,2,5]]==[0,8,20]','Multiply seconds by 4 meters per second.')],
P('A cyclist travels 9 miles in 45 minutes at steady speed. Find miles per hour and minutes per mile.','12 miles per hour; 5 minutes per mile','R-RATE','Exit: two directions with time conversion','F(9,45)*60==12 and F(45,9)==5','Nine miles in three 15-minute groups means 3 miles per 15 minutes. Four groups give 12 miles in an hour.','5 miles per hour; 12 minutes per mile','The numbers belong to different units; label the quantity per one.'),
Err('Ava says 8 apples for $6 costs {4/3} dollars per apple because 8 ÷ 6 = {4/3}. Is her unit correct?','No. $6 ÷ 8 apples = $0.75 per apple. {4/3} describes apples per dollar.','{4/3} dollars per apple','She reverses the requested quantities.','Write dollars above the division and apples below it.'),
E('A walker travels 2 miles in 30 minutes. Find miles per hour.','4 miles per hour',['60 minutes is two groups of 30.','Two groups of 2 miles make 4 miles.','The rate is 4 miles per hour.'],'2*(60//30)==4'),
{'text':'A scooter travels 5 miles in 30 minutes. There are __ half-hours in one hour, so the speed is __ miles per hour.','answer':'2; 10 miles per hour','check':'60//30==2 and 5*2==10'},
{'kind':'doubleline','values':[15,3],'labels':['minutes','miles'],'multiples':4,'caption':'Four 15-minute intervals make one hour.'},
[M('Labels dollars per apple.','The units identify division order.','Ask what one in the rate refers to.'),M('Uses scaling or divides to one.','Both methods can find an equivalent rate.','Accept either, then connect them in a table.'),M('Converts time to 60 minutes.','Hourly rates require an hour as the time unit.','Mark 0, 15, 30, 45, 60 on the time line.')],
[M('Divides in the reverse direction.','Does not track the per unit.','Read the desired rate aloud before dividing.'),M('Treats 20 minutes as 0.20 hours.','Uses base ten instead of 60 minutes per hour.','Partition an hour into three 20-minute sections.')],
['Agree or disagree: A unit rate must be a whole number. Use the apples to decide.','Partner compare: What does {1/5} minute per card mean compared with 5 cards per minute?'],
'The word per tells me to find the amount for one ___.',
Sort('Gives 12 miles per hour and 5 minutes per mile, with correct units and scaling.','Gets one rate correct or both values correct with one unclear unit.','Reverses division, uses 45 as 0.45 hours, or assigns the rates to the wrong units.'))

s6=S(6,'Percent as a rate per hundred',['6.RP.A.3c'],
'I can find a percent, a part, or a whole using matching amounts.',
'Percent compares an amount with a whole split into 100 equal parts.',
'Equivalent ratios and unit rates.', ['percent strips','double number line template','pencil'],
[V('Percent','A rate per hundred.','35% means 35 for every 100.'),V('Whole','The amount that represents 100%.','If all 80 tiles count, 80 is the whole.'),V('Benchmark percent','A familiar percent useful for reasoning.','25% is one fourth.')],
[
P('Find 10%, 25%, 50%, and 75% of 80 counters.','8, 20, 40, and 60 counters','P-PART','Benchmark percents of a whole','[F(p,100)*80 for p in [10,25,50,75]]==[8,20,40,60]','Ten percent is a tenth. Twenty-five percent is a fourth. Fifty percent is half.'),
P('A shelf holds 40 books. Twelve are mysteries. What percent are mysteries?','30%','P-PERCENT','Find percent from part and whole','F(12,40)*100==30','{12/40} = {3/10} = {30/100}.'),
P('Twenty-four stickers are 40% of a collection. How many stickers are in the whole collection?','60 stickers','P-WHOLE','Find the whole','F(24,1)/F(40,100)==60','Four 10% groups contain 24 stickers. One group has 6; ten groups have 60.'),
P('Find 125% of 48 minutes.','60 minutes','P-PART','Percent above one hundred','F(125,100)*48==60','100% is 48. Another 25% is 12. Add 48 and 12.'),
P('Find 35% of 60 tiles.','21 tiles','P-PART','Non-benchmark percent','F(35,100)*60==21','30% is 18 and 5% is 3. Their sum is 21.'),
P('Find 15% of $18.00.','$2.70','P-PART','Decimal result','D("0.15")*D("18.00")==D("2.70")','10% is $1.80. Half of that is 5%, or $0.90. Add them.')],
P('Twenty-one marbles are 35% of a bag. How many marbles are in the bag?','60 marbles','P-WHOLE','Exit: part versus whole','F(21,1)/F(35,100)==60 and F(35,100)*21==F(147,20)','Seven 5% groups contain 21 marbles. Each 5% group has 3. Twenty groups have 60.','7.35','Taking 35% of 21 finds a part of the given part, not the whole.'),
Err('Omar says 24 is 40% of 9.6 because 0.40 × 24 = 9.6. Explain the error.','The unknown whole is 60. Check: 40% of 60 is 24.','9.6','He treats the known part as the whole.','Label 24 at 40% on a double number line and locate 100%.'),
E('Eighteen blocks are 30% of a tower set. Find the whole set.','60 blocks',['30% has three 10% groups.','18 ÷ 3 = 6 blocks per 10%.','Ten groups give 10 × 6 = 60 blocks.'],'F(18,1)/F(30,100)==60'),
{'text':'Twelve coins are 20% of a jar. Ten percent is __ coins. One hundred percent is __ coins.','answer':'6 coins; 60 coins','check':'12/2==6 and 6*10==60'},
{'kind':'doubleline','values':[10,6],'labels':['percent','stickers'],'multiples':10,'caption':'100% labels the unknown whole.'},
[M('Labels the given amount as part or whole.','The role controls the calculation.','Ask which amount belongs at 100%.'),M('Combines benchmark percentages.','Builds a non-benchmark percent from known pieces.','Accept a unit-percent method or a benchmark method.'),M('Allows a percent above 100.','A comparison amount can exceed the starting whole.','Extend the percent line beyond 100%.')],
[M('Multiplies the known part by the percent.','Treats every percent problem as finding a part.','Place the known part and its percent on aligned lines.'),M('Rejects 125%.','Thinks a percent is always a piece below one whole.','Show one whole plus one fourth of the same whole.')],
['Agree or disagree: The whole must be smaller than 24 if 24 is only 40%.','Partner compare: How does finding 35% of 60 differ from finding a whole when 21 is 35%?'],
'Before using a percent, I decide which amount represents ___.',
Sort('Finds 60 marbles and checks that 35% of 60 is 21.','Sets 21 at 35% correctly but makes a small scaling error or omits the check.','Computes 35% of 21 or gives a whole smaller than the part.'))

s7=S(7,'The meaning of fraction division',['6.NS.A.1'],
'I can show how many fractional groups fit in an amount.',
'The divisor names one group. A quotient tells how many of those groups fit, even when it is part of a group.',
'Fraction equivalence and division by unit fractions.', ['fraction strips','blank number lines','pencil'],
[V('Dividend','The amount being divided.','In 2 ÷ {3/4}, the dividend is 2.'),V('Divisor','The amount that names one group in a grouping problem.','In 2 ÷ {3/4}, one group is {3/4}.'),V('Quotient','The result of division.','{3/4} ÷ {1/4} = 3 groups.')],
[
P('Four meters are cut into {1/5}-meter pieces. How many pieces?','20 pieces','F-DIV','Whole number by unit fraction','4/F(1,5)==20','Each meter contains five fifths. Four meters contain twenty.'),
P('How many {2/3}-cup scoops fit in 4 cups?','6 scoops','F-DIV','Whole number by non-unit fraction','4/F(2,3)==6','Four cups are twelve thirds. Each scoop uses two thirds, so twelve thirds make six scoops.'),
P('How many {1/8}-meter pieces fit in {3/4} meter?','6 pieces','F-DIV','Fraction quotient is whole','F(3,4)/F(1,8)==6','Three fourths is six eighths. Count six pieces.'),
P('How many {2/3}-cup groups fit in {5/6} cup? A fraction of a group is allowed.','1 {1/4} groups','F-DIV','Fraction quotient is non-whole','F(5,6)/F(2,3)==F(5,4)','One group is four sixths. Five sixths is five fourths of that group.'),
P('What fraction of a {5/6}-cup scoop is filled by {1/3} cup?','{2/5} of a scoop','F-DIV','Quotient below one','F(1,3)/F(5,6)==F(2,5)','One scoop has five sixths. One third is two sixths, so it fills two of five equal scoop parts.'),
P('A jar is {2/3} full after {3/5} liter is poured in. How many liters fill the whole jar?','{9/10} liter','F-DIV','Find amount for one whole group','F(3,5)/F(2,3)==F(9,10)','Two thirds of the jar hold three fifths liter. One third holds three tenths, so three thirds hold nine tenths.'),
P('Write a story for {3/4} ÷ {1/2}. Solve it.','1 {1/2} groups. Stories vary.','F-DIV','Write a division story','F(3,4)/F(1,2)==F(3,2)','Example: A pitcher has three fourths liter. How many half-liter servings does it hold, including part of a serving?')],
P('How much of a {3/4}-meter length is {2/5} meter? Draw equal parts to show {2/5} ÷ {3/4}.','{8/15} of the length','F-DIV','Exit: quotient below one with different denominators','F(2,5)/F(3,4)==F(8,15)','Use twentieths. The target length is 15 twentieths; the available amount is 8 twentieths. That is eight fifteenths of one group.','{3/10}','Multiplying the two fractions finds a different amount.',diagram={'kind':'tape','values':[15,8],'labels':['one group: 15 twentieths','amount: 8 twentieths'],'caption':'Compare equal twentieths.'}),
Err('Ben says {1/3} ÷ {5/6} = {5/18}. He multiplies the fractions. Explain what division asks here.','It asks what fraction of a five-sixths group fits in one third. The answer is {2/5}.','{5/18}','He uses a familiar fraction rule without identifying the group.','Rename one third as two sixths and compare with five sixths.'),
E('Find {3/4} ÷ {1/2} with a tape.','1 {1/2}',['Rename one half as two fourths.','Three fourths contains one full pair of fourths and one fourth left.','The remaining fourth is half of a two-fourths group.'],'F(3,4)/F(1,2)==F(3,2)'),
{'text':'Find {5/8} ÷ {1/4}. One group is __ eighths. Five eighths holds __ groups.','answer':'2 eighths; 2 {1/2} groups','check':'F(1,4)==F(2,8) and F(5,8)/F(1,4)==F(5,2)'},
{'kind':'tape','values':[4,5],'labels':['one group: 4 sixths','amount: 5 sixths'],'caption':'Five sixths is five fourths of a four-sixths group.'},
[M('Labels what counts as one group.','Fractional quotients refer to the divisor-sized group.','Ask the student to circle one whole group.'),M('Renames both amounts using the same small unit.','Counting comparable pieces makes division visible.','Accept a tape or a number line with equal units.'),M('Calls the remainder a fraction of the group.','Avoids treating leftover units as the answer fraction.','Compare the leftover pieces with pieces in one group.')],
[M('Reverses dividend and divisor.','Has not named the available amount.','Label amount first and group size second.'),M('Multiplies the fractions.','Applies a rule before making sense of division.','Count equal pieces before writing a rule.')],
['Agree or disagree: A quotient below one means the division cannot be done.','Partner compare: Why is the leftover one fourth in the example half of a group?'],
'To divide by a fraction, I ask how many ___-sized groups fit in ___.',
Sort('Gives {8/15} and shows 8 equal units compared with a 15-unit group.','Correct quotient but an unclear drawing, or a correct comparison model with a simplification slip.','Multiplies, reverses the fractions, or says the answer must exceed one.'))

s8=S(8,'Fraction division and reciprocals',['6.NS.A.1','6.G.A.2'],
'I can connect the reciprocal rule to equal groups and use it in measurement problems.',
'Dividing by a fraction counts groups. Multiplying by its reciprocal gives the same count.',
'Fraction division with equal-part models and mixed-number conversion.', ['fraction strips','grid paper','small box'],
[V('Reciprocal','A number that multiplies with another number to make 1.','{3/5} and {5/3} are reciprocals.'),V('Mixed number','A whole number plus a fraction.','2 {1/3} = {7/3}.'),V('Volume','The amount of three-dimensional space a solid fills.','A box uses cubic units.')],
[
P('Share {3/4} liter equally among 5 bottles. How much per bottle?','{3/20} liter','F-DIV','Fraction divided by whole number','F(3,4)/5==F(3,20)','Each fourth is split into five parts, so each bottle gets three twentieths.'),
P('How many {3/5}-cup groups fit in 4 cups? Include a fraction of a group.','6 {2/3} groups','F-DIV','Whole number divided by fraction','4/F(3,5)==F(20,3)','Four cups are twenty fifths. Each group uses three fifths. Count twenty thirds of a group.'),
P('Find {7/8} ÷ {1/4}. Check by multiplying the quotient by {1/4}.','3 {1/2}','F-DIV','Fraction divided by fraction','F(7,8)/F(1,4)==F(7,2) and F(7,2)*F(1,4)==F(7,8)','One quarter is two eighths. Seven eighths contains seven halves of a two-eighths group.'),
P('Find 1 {7/8} ÷ {5/8}.','3','F-DIV','Mixed number divided by fraction','F(15,8)/F(5,8)==3','Rename 1 {7/8} as {15/8}. Three groups of five eighths fit.'),
P('A cord is 3 {1/2} meters long. Each piece is {7/8} meter. How many pieces?','4 pieces','F-DIV','Cutting length into pieces','F(7,2)/F(7,8)==4','Convert 3 {1/2} to {28/8}. Four groups of seven eighths fit.'),
P('A rectangle has area {5/6} square meter and width {2/3} meter. Find its length.','1 {1/4} meters','F-DIV','Missing rectangle side','F(5,6)/F(2,3)==F(5,4)','Length × width = area. Length is {5/6} ÷ {2/3}.',diagram={'kind':'area','dimensions':[1.25,2/3],'labels':['length ?','width {2/3} m'],'caption':'Area = {5/6} square meter.'}),
P('A box has edges {2/3}, {3/4}, and 2 meters. Find its volume.','1 cubic meter','G-VOL','Fractional-edge prism volume','F(2,3)*F(3,4)*2==1','Multiply the three perpendicular edge lengths. The base area is {1/2} square meter; two layers make one cubic meter.')],
P('A ribbon is 2 {5/8} yards long. Each piece is {3/8} yard. How many pieces can be cut?','7 pieces','F-DIV','Exit: mixed number and correct reciprocal','F(21,8)/F(3,8)==7','2 {5/8} = {21/8}. Twenty-one eighths make seven groups of three eighths.','{7/8} or {1/7}','Dropping the whole part or reversing the wrong fraction changes the total.'),
Err('Zoe writes {7/8} ÷ {1/4} = {8/7} × {1/4} = {2/7}. Explain which number should be inverted.','Keep the dividend {7/8}. Multiply by the reciprocal of the divisor: {7/8} × 4 = 3 {1/2}.','{2/7}','She reverses the dividend instead of changing the size of the divisor-sized group.','Check whether {2/7} groups of one fourth could make seven eighths.'),
E('Find {2/3} ÷ {3/5}.','1 {1/9}',['One whole contains {5/3} groups of size {3/5}.','Two thirds of a whole contains {2/3} × {5/3} groups.','Multiply to get {10/9}, or 1 {1/9}.'],'F(2,3)/F(3,5)==F(2,3)*F(5,3)==F(10,9)'),
{'text':'Complete: {4/5} ÷ {2/3} = {4/5} × __ = __. Check by multiplying by {2/3}.','answer':'{3/2}; 1 {1/5}','check':'F(4,5)/F(2,3)==F(6,5) and F(6,5)*F(2,3)==F(4,5)'},
{'kind':'tape','values':[3,5],'labels':['one group: 3 fifths','one whole: 5 fifths'],'caption':'One whole has {5/3} groups of size {3/5}.'},
[M('Converts the mixed number before dividing.','Preserves the total amount.','Ask how many eighths make both whole yards.'),M('Uses a model or reciprocal and checks by multiplication.','Both methods are valid and connected.','Accept either method and ask what the quotient counts.'),M('Uses square units for area and cubic units for volume.','The dimensions measure different things.','Trace one face, then point inside the box.')],
[M('Inverts the dividend.','Memorizes a rule without a division meaning.','Check quotient × divisor = dividend.'),M('Leaves out the whole-number part.','Treats a mixed number as only its fraction.','Build the whole amount with equal fractional pieces.')],
['Agree or disagree: In a division problem, either fraction can be inverted. Test the claim with a tape.','Partner compare: How does finding a missing rectangle side use the same division idea as cutting ribbon?'],
'I can check a fraction quotient by multiplying it by ___.',
Sort('Finds 7 pieces, converts to {21/8}, and shows seven groups or a valid reciprocal calculation.','Uses the correct mixed-number conversion and division setup but makes a small arithmetic slip.','Drops the 2 whole yards, multiplies by {3/8}, or inverts the dividend.'))

s9=S(9,'Decimal place value and products',['6.NS.B.3','5.NBT.B.7'],
'I can add, subtract, and multiply decimals while keeping track of the value of each digit.',
'Addition combines like-sized units. Multiplication combines both the number of parts and the size of each part.',
'Whole-number multiplication, regrouping, and decimal place names.', ['place-value paper','grid paper','pencil'],
[V('Place value','A digit’s value depends on its position.','The 4 in 0.04 means four hundredths.'),V('Estimate','A nearby value that helps check an answer.','6.2 × 3 is close to 6 × 3 = 18.'),V('Thousandth','One of 1,000 equal parts of a whole.','0.007 means seven thousandths.')],
[
P('Find 4.7 + 8.036.','12.736','D-ADD','Different decimal lengths','D("4.7")+D("8.036")==D("12.736")','Write 4.700 so tenths, hundredths, and thousandths line up.','8.083','Aligning the final digits combines different units.'),
P('Find 12 − 4.685.','7.315','D-SUB','Subtract across zeros','D("12")-D("4.685")==D("7.315")','Write 12.000. Regroup one whole into tenths, then into hundredths and thousandths.'),
P('A rope costs $2.35 per meter. What do 4 meters cost?','$9.40','D-MULT','Decimal times whole number and money','D("2.35")*4==D("9.40")','235 cents × 4 = 940 cents, or $9.40.'),
P('Find 0.6 × 0.4. Is the product less than each factor?','0.24; yes','D-MULT','Product below both factors','D("0.6")*D("0.4")==D("0.24") and D("0.24")<D("0.4")<D("0.6")','Six tenths of four tenths is twenty-four hundredths.',diagram={'kind':'area','rows':10,'cols':10,'shade_rows':4,'shade_cols':6,'caption':'24 hundredths overlap.'}),
P('Find 0.15 × 0.02.','0.003','D-MULT','Leading zeros in a product','D("0.15")*D("0.02")==D("0.003")','Fifteen hundredths times two hundredths is thirty ten-thousandths, or three thousandths.'),
P('A notebook costs $3.85 and a pen costs $1.67. You pay $10. Find the change.','$4.48','D-MONEY','Multi-step money context','D("10")-D("3.85")-D("1.67")==D("4.48")','Add costs: $5.52. Subtract from $10.00 to get $4.48.')],
P('Find 0.45 × 0.06. Explain why your decimal position is reasonable.','0.027','D-MULT','Exit: leading zeros and estimate','D("0.45")*D("0.06")==D("0.027")','45 × 6 = 270. Hundredths times hundredths makes ten-thousandths: 0.0270. It is less than 0.06.','0.27','The product is ten times too large for six hundredths of a number below one.'),
Err('Isaac says 0.6 × 0.4 = 2.4 because 6 × 4 = 24. Use place value to repair this.','Six tenths times four tenths is twenty-four hundredths, or 0.24.','2.4','He counts digits without tracking the size of the units.','Shade six tenths across and four tenths down on a hundred-square grid.'),
E('Find 3.8 + 0.475.','4.275',['Write 3.800 + 0.475.','Add thousandths to thousandths and tenths to tenths.','3.800 + 0.475 = 4.275. The sum is a little above 4.'],'D("3.8")+D("0.475")==D("4.275")'),
{'text':'Complete: 0.3 × 0.07 means 3 tenths × 7 hundredths = 21 __ = __.','answer':'thousandths; 0.021','check':'D("0.3")*D("0.07")==D("0.021")'},
{'kind':'area','rows':10,'cols':10,'shade_rows':4,'shade_cols':6,'caption':'0.6 × 0.4 = 24 hundredths.'},
[M('Aligns decimal points when adding.','Like-sized units must be combined.','Ask the student to name each column.'),M('Estimates product size before computing.','An estimate catches misplaced decimals.','Ask whether taking a fraction of a fraction can exceed either factor.'),M('Uses cents, fractions, or a grid.','Several models correctly track decimal units.','Accept any valid model and connect it to the written algorithm.')],
[M('Aligns the rightmost digits.','Treats every digit as the same unit.','Write zeros to make place-value columns visible.'),M('Makes a product larger than both small factors.','Keeps whole-number multiplication intuition.','Take a part of one shaded part of a unit square.')],
['Agree or disagree: Adding zeros at the end of 4.7 changes its value.','Partner compare: How does a grid explain the decimal point in 0.6 × 0.4?'],
'I check a decimal answer by naming the units and ___.',
Sort('Gives 0.027 and supports its size with place value or a valid estimate.','Gives 0.027 without a clear explanation, or uses correct units with an arithmetic slip.','Gives 0.27, 2.7, or another value from counting places incorrectly.'))

s10=S(10,'Long division with decimals',['6.NS.B.2','6.NS.B.3'],
'I can divide with decimals by preserving equal groups and checking my quotient.',
'Multiplying the dividend and divisor by the same power of ten preserves the quotient.',
'Whole-number multiplication and decimal place value.', ['place-value paper','pencil'],
[V('Remainder','The amount left after equal groups are made.','17 ÷ 5 gives 3 groups with 2 left.'),V('Equivalent division','A new dividend and divisor with the same quotient.','6.4 ÷ 0.8 = 64 ÷ 8.'),V('Decimal quotient','A division result with fractional places written in decimals.','7 ÷ 2 = 3.5.')],
[
P('Use long division to find 672 ÷ 24.','28','D-DIV','Three-digit by two-digit exact quotient','672//24==28 and 28*24==672','24 goes into 67 twice, leaving 19 tens. Bring down 2 ones. 192 ÷ 24 = 8.'),
P('Find 27 ÷ 8. Continue into decimal places.','3.375','D-DIV','Whole numbers with decimal quotient','D(27)/8==D("3.375")','After 3 groups, 3 remains. Rename it as 30 tenths, then continue through hundredths and thousandths.'),
P('Find 8.4 ÷ 7.','1.2','D-DIV','Decimal divided by whole number','D("8.4")/7==D("1.2")','84 tenths shared among 7 gives 12 tenths.'),
P('Find 6.3 ÷ 0.09 by writing an equivalent division with a whole-number divisor.','70','D-DIV','Decimal divided by decimal','D("6.3")/D("0.09")==70 and D("630")/9==70','Multiply both amounts by 100: 630 ÷ 9 = 70.'),
P('Find 7 ÷ 20.','0.35','D-DIV','Quotient below one','D(7)/20==D("0.35")','Seven twentieths equals thirty-five hundredths.'),
P('A 3.6-meter ribbon is cut into 0.4-meter pieces. How many pieces?','9 pieces','D-DIV','Divisor below one makes larger quotient','D("3.6")/D("0.4")==9','Rename both in tenths: 36 tenths ÷ 4 tenths = 9.'),
P('Find 1,176 ÷ 28 and check by multiplication.','42','N-DIV','Four-digit dividend and two-digit divisor','1176//28==42 and 42*28==1176','28 × 40 = 1,120. Two more groups make 56, so 42 groups make 1,176.')],
P('Find 8.4 ÷ 0.07. Write an equivalent division and check by multiplication.','120','D-DIV','Exit: scale both numbers and place quotient','D("8.4")/D("0.07")==120 and D("0.07")*120==D("8.4")','Multiply both by 100: 840 ÷ 7 = 120. Check 120 × 0.07 = 8.4.','1.2','Changing only the divisor changes the quotient.'),
Err('Lina changes 6.3 ÷ 0.09 into 6.3 ÷ 9 and gets 0.7. Which change is missing?','Both amounts must scale by 100. Use 630 ÷ 9 = 70.','0.7','She changes the group size without changing the available amount by the same factor.','Compare 63 tenths with nine hundredths by renaming both in hundredths.'),
E('Find 4.8 ÷ 0.06.','80',['Rename both quantities in hundredths.','4.8 is 480 hundredths; 0.06 is 6 hundredths.','480 ÷ 6 = 80. Check 80 × 0.06 = 4.8.'],'D("4.8")/D("0.06")==80 and 80*D("0.06")==D("4.8")'),
{'text':'Complete: 5.4 ÷ 0.03 = __ ÷ 3 = __.','answer':'540; 180','check':'D("5.4")/D("0.03")==180 and 540//3==180'},
{'kind':'ratio','labels':['dividend','divisor'],'rows':[['4.8','0.06'],['480','6']],'caption':'Multiply both quantities by 100. The quotient stays 80.'},
[M('Scales both numbers equally.','Preserves the number of groups.','Ask for the factor written beside each number.'),M('Adds zeros after a decimal point to continue.','A remainder can be renamed in smaller units.','Ask what three remaining ones become in tenths.'),M('Checks quotient × divisor.','The reverse operation tests correctness.','Accept long division or equal-group reasoning with a multiplication check.')],
[M('Moves only one decimal point.','Uses a memorized instruction without equivalence.','Rename both quantities in the same unit.'),M('Stops at a nonzero remainder.','Does not yet rename the leftover amount.','Write a decimal point and trade one unit for ten smaller units.')],
['Agree or disagree: 3.6 ÷ 0.4 must be less than 3.6 because it is division.','Partner compare: Why do 4.8 ÷ 0.06 and 480 ÷ 6 count the same number of groups?'],
'To keep a quotient unchanged, I multiply both ___ and ___ by the same number.',
Sort('Gives 120, writes 840 ÷ 7, and verifies 120 × 0.07 = 8.4.','Uses the correct equivalent division but makes a minor calculation slip, or omits the check.','Scales only one number, gives 1.2, or places the quotient decimal using a guess.'))

# Generated practice banks keep hand arithmetic friendly while varying structure.
def fmt(f):
 f=F(f)
 if f.denominator==1:return str(f.numerator)
 if f>1:
  q,r=divmod(f.numerator,f.denominator)
  return f'{q} {{{r}/{f.denominator}}}'
 return '{'+str(f.numerator)+'/'+str(f.denominator)+'}'
def calc(text,expr,skill,case,unit='',worked=''):
 a=eval(expr,dict(F=F,D=D,math=math,statistics=statistics))
 ans=str(a) if isinstance(a,D) else fmt(a)
 if isinstance(a,D): ck=f'({expr}) == D({str(a)!r})'
 else: ck=f'({expr}) == F({F(a).numerator},{F(a).denominator})'
 return P(text,ans+(' '+unit if unit else ''),skill,case,ck,worked or 'Use the named units, calculate, then check with the inverse operation.')

banks={i:[] for i in range(1,6)}
for n in range(1,5):
 b=banks[1]
 b.append(P(f'Compare {{{n}/{n+2}}} and {{{n}/{n+3}}}.',f'{{{n}/{n+2}}} > {{{n}/{n+3}}}','F-COMP','Same numerator',f'F({n},{n+2})>F({n},{n+3})','With the same numerator, the fraction with larger pieces is larger.'))
 b.append(calc(f'Find {{{n}/{n+1}}} + {{1/{n+2}}}.',f'F({n},{n+1})+F(1,{n+2})','F-ADD','Unlike denominator addition',worked='Rename both fractions with a common denominator. Add the counts of equal parts.'))
 b.append(calc(f'Find {{{n+2}/{n+3}}} − {{1/{n+2}}}.',f'F({n+2},{n+3})-F(1,{n+2})','F-SUB','Unlike denominator subtraction',worked='Rename both fractions with a common denominator. Subtract equal parts.'))
 b.append(calc(f'Find {n+2} × {{2/3}}.',f'{n+2}*F(2,3)','F-MULT','Whole number times fraction',worked='Count two thirds for each whole-number group, then rename the result.'))
 b.append(calc(f'How many {{1/{n+2}}}-meter pieces fit in {n+1} meters?',f'{n+1}/F(1,{n+2})','F-DIV','Whole number by unit fraction','pieces',worked=f'Each meter contains {n+2} equal pieces. Multiply by {n+1} meters.'))
 b.append(calc(f'Share {{1/{n+2}}} liter equally among {n+1} cups. How much per cup?',f'F(1,{n+2})/{n+1}','F-DIV','Unit fraction by whole number','liter',worked='Split the given fractional amount into the stated number of equal shares.'))
for n in range(1,5):
 b=banks[2]
 b.append(calc(f'Red : blue is 3 : 5. How many blue tiles go with {3*(n+1)} red tiles?',f'5*{n+1}','R-EQUIV','Scale up a ratio','blue tiles',worked=f'The number of batches is {3*(n+1)} ÷ 3. Multiply that count by 5.'))
 b.append(P(f'Simplify the ratio {4*(n+1)} : {7*(n+1)} by dividing both counts by {n+1}.','4 : 7','R-EQUIV','Scale down a ratio',f'F({4*(n+1)},{7*(n+1)})==F(4,7)','Divide both counts by the same factor.'))
 b.append(calc(f'A recipe uses 2 cups beans for 3 cups rice. How many cups beans go with {3*n+F(3,2)} cups rice?',f'F({6*n+3},2)/3*2','R-EQUIV','Non-whole scale factor','cups',worked='Find the number of recipe batches by dividing the rice amount by 3. Each batch needs 2 cups beans.'))
 total=7*(n+2)
 b.append(P(f'Yellow : purple is 2 : 5. There are {total} beads. Find both counts.',f'{2*(n+2)} yellow; {5*(n+2)} purple','R-WHOLE','Part-part-whole',f'{total}//7*2=={2*(n+2)} and {total}//7*5=={5*(n+2)}','Add ratio parts: 2 + 5 = 7. Divide the total by 7, then multiply each ratio part.'))
 b.append(calc(f'Complete the ratio-table pair: (3, 4), ({3*(n+2)}, __).',f'4*{n+2}','R-TABLE','Missing table value',worked='Multiply both entries in the first pair by the same factor.'))
 b.append(P(f'Mix A has {2*n} cups juice and {3*n} cups water. Mix B has {2*n+1} cups juice and {3*n+2} cups water. Which has more juice for the same water?','Mix A','R-COMP','Compare ratios',f'F({2*n},{3*n})>F({2*n+1},{3*n+2})','Use equivalent ratios with the same water amount, then compare juice.'))
for n in range(1,5):
 b=banks[3]
 b.append(calc(f'A walker travels {4*(n+1)} miles in {n+1} hours. Find miles per hour.',f'F({4*(n+1)},{n+1})','R-RATE','Whole-number unit rate','miles per hour'))
 cost=D('0.65')*(n+2)
 b.append(calc(f'{n+2} markers cost ${cost:.2f}. Find dollars per marker.',f'D("{cost}")/{n+2}','R-RATE','Decimal unit rate','dollars per marker'))
 b.append(P(f'A game uses {n+1} cups of tokens for {2*n+3} players. Find cups per player and players per cup.',f'{fmt(F(n+1,2*n+3))} cups per player; {fmt(F(2*n+3,n+1))} players per cup','R-RATE','Two directions',f'F({n+1},{2*n+3})*F({2*n+3},{n+1})==1','Divide the first quantity by the second for cups per player. Reverse for players per cup.'))
 b.append(calc(f'Find 25% of {8*(n+2)} stickers.',f'F(25,100)*{8*(n+2)}','P-PART','Find a percent part','stickers',worked='Twenty-five percent is one fourth. Divide the whole by 4.'))
 b.append(calc(f'{6*(n+1)} shells are 30% of a collection. Find the whole collection.',f'F({6*(n+1)},1)/F(30,100)','P-WHOLE','Find the whole','shells',worked='Divide the given amount into three 10% groups, then take ten such groups.'))
 b.append(calc(f'{3*(n+2)} of {4*(n+2)} tiles are green. What percent are green?',f'F({3*(n+2)},{4*(n+2)})*100','P-PERCENT','Find the percent','%',worked='Compare the green count with the total. Rename the fraction as a rate per hundred.'))
for n in range(1,5):
 b=banks[4]
 b.append(calc(f'Find {n+1} ÷ {{2/3}}.',f'{n+1}/F(2,3)','F-DIV','Whole number by non-unit fraction',worked='Rename each whole in thirds, then count groups of two thirds.'))
 b.append(calc(f'Find {{{n+1}/{n+3}}} ÷ {{1/{n+3}}}.',f'F({n+1},{n+3})/F(1,{n+3})','F-DIV','Whole quotient with fractions',worked='Both fractions use the same unit. Count how many single parts fit.'))
 b.append(calc(f'Find {{1/2}} ÷ {{{n+2}/{n+3}}}.',f'F(1,2)/F({n+2},{n+3})','F-DIV','Quotient below one',worked='The available amount is smaller than one group. Multiply by the reciprocal of the group size.'))
 b.append(calc(f'Find {n} {{1/2}} ÷ {{3/4}}.',f'F({2*n+1},2)/F(3,4)','F-DIV','Mixed number quotient',worked='Rename the mixed number as an improper fraction, then count groups of three fourths.'))
 b.append(calc(f'A rectangle has area {{{n+2}/4}} square meter and width {{3/4}} meter. Find its length.',f'F({n+2},4)/F(3,4)','F-DIV','Missing rectangle side','meters',worked='Divide area by width. Check that length times width equals area.'))
 b.append(calc(f'A box has edges {{1/2}}, {{2/3}}, and {n+1} meters. Find the volume.',f'F(1,2)*F(2,3)*{n+1}','G-VOL','Fractional-edge volume','cubic meters',worked='Multiply the three edge lengths. Track the three length units as cubic meters.'))
for n in range(1,5):
 b=banks[5]
 x=D(n)+D('0.45'); y=D(n+2)+D('0.078')
 b.append(calc(f'Find {x} + {y}.',f'D("{x}")+D("{y}")','D-ADD','Different lengths',worked='Line up decimal points. Add digits in the same place-value columns.'))
 y=D(n)+D('0.286')
 b.append(calc(f'Find 10 − {y}.',f'D(10)-D("{y}")','D-SUB','Subtract across zeros',worked='Write 10.000 and regroup through the zero columns.'))
 x=D(n+1)/100
 b.append(calc(f'Find 0.25 × {x}.',f'D("0.25")*D("{x}")','D-MULT','Leading-zero product',worked='One fourth of the second factor must be smaller than it. Use this to check the decimal position.'))
 whole=24*(n+11)
 b.append(calc(f'Find {whole} ÷ 24.',f'F({whole},24)','N-DIV','Two-digit divisor',worked='Use long division and verify quotient × 24 equals the dividend.'))
 x=D(7*(n+1))/10
 b.append(calc(f'Find {x} ÷ 0.07.',f'D("{x}")/D("0.07")','D-DIV','Scale both numbers',worked='Multiply both dividend and divisor by 100, then divide by 7.'))
 b.append(calc(f'Find {2*n+1} ÷ 8.',f'D({2*n+1})/8','D-DIV','Decimal quotient',worked='Continue the long division into tenths, hundredths, and thousandths until the remainder is zero.'))

# Weekly reasoning puzzles. Each invariant and unique solution is checked by code.
teasers=[
P('A card shows a fraction. Its denominator is 8. It lies between {1/2} and {3/4}. What fraction is on the card?','{5/8}','PUZZLE','Fraction between benchmarks','[n for n in range(1,8) if F(1,2)<F(n,8)<F(3,4)]==[5]','Half is four eighths and three fourths is six eighths. Only five eighths lies strictly between them.'),
P('A tile bag has red : blue = 3 : 2. The total is greater than 20 and less than 30. How many of each color?','15 red and 10 blue','PUZZLE','Ratio and total constraint','[(3*k,2*k) for k in range(1,10) if 20<5*k<30]==[(15,10)]','One batch contains five tiles. The only multiple of five strictly between 20 and 30 is 25.'),
P('A mystery number has this property: 25% of it is 6 more than 10% of it. Find the number.','40','PUZZLE','Difference of percent parts','F(25,100)*40-F(10,100)*40==6 and F(6,1)/(F(25,100)-F(10,100))==40','The gap is 15%, which equals 6. Five percent is 2, so 100% is 40.'),
P('A jug holds 2 liters. You have {1/3}-liter and {1/2}-liter scoops. Use both sizes and exactly five full scoops to fill it. How many of each?','3 one-third-liter scoops and 2 half-liter scoops','PUZZLE','Fraction combination','[(a,b) for a in range(1,5) for b in range(1,5) if a+b==5 and a*F(1,3)+b*F(1,2)==2]==[(3,2)]','Try five thirds first: {5/3} liters. Replacing a third with a half adds {1/6} liter. Two replacements fill the missing third.'),
P('Use digits 2, 4, and 8 once each in the form A.BC. Which number is closest to 5?','4.82','PUZZLE','Place-value reasoning','min([D("2.48"),D("2.84"),D("4.28"),D("4.82"),D("8.24"),D("8.42")],key=lambda x:abs(x-5))==D("4.82")','A ones digit of 4 places the number nearest 5. Among 4.28 and 4.82, the larger is nearer to 5.')]

week_info=[
('Fractions and equal parts','The whole stays the same when fractions are compared. Multiplication can take part of an amount. Division can count fractional groups or split a fraction into shares.','This builds on equal sharing and multiplication facts. Next, ratios compare amounts that change together.','The diagnostic samples Grade 5 rather than reteaching every standard. General fraction division waits until Week 4; unlike-denominator addition and subtraction recur in practice.',[s1,s2]),
('Ratios and matching amounts','A ratio compares two amounts in a chosen order. Equivalent ratios scale both amounts together. Tables and double number lines keep matching amounts connected.','This builds on equal groups and fraction comparison. Next, unit rates and percents describe one-unit and hundred-unit comparisons.','Ratio reasoning uses friendly two-quantity examples. Multi-stage mixtures and formal cross-multiplication are omitted.',[s3,s4]),
('Rates and percents','A unit rate describes an amount per one unit. Percent means per hundred. Label the whole before deciding whether to find a part, a whole, or a percent.','This builds on equivalent ratios. Fraction division later extends the same grouping and scaling ideas.','Discounts, tax, and percent change wait for the optional bridge previews. Compound percent calculations are omitted.',[s5,s6]),
('Dividing fractions','Division asks how many divisor-sized groups fit. Equal small units make the comparison visible. The reciprocal rule records that reasoning efficiently.','This builds on fraction multiplication and equivalent ratios. Decimal division will also preserve group counts by renaming units.','Complex fractions, algebraic fraction equations, and lengthy multi-stage fraction contexts are omitted. Fractional prism volume is included in the Sunday session.',[s7,s8]),
('Decimals and long division','Decimal digits name parts of a whole. Addition and subtraction combine equal place-value units. Division preserves its quotient when both quantities scale equally.','This builds on whole-number operations and fraction groups. Accurate decimal arithmetic supports expressions and equations next week.','Repeating decimals and divisors producing recurring expansions are omitted. Very long multiplication and division chains are deferred to targeted boosters.',[s9,s10])]
weeks=[]
for w,(title,big,conn,omit,ss) in enumerate(week_info,1):
 weeks.append(dict(week=w,title=title,big_idea=big,connections=conn,omissions=omit,teaser=teasers[w-1],sessions=ss,bank=banks[w]))

# Each week is partitioned for Monday/Saturday and Tuesday/Sunday selection.
for w in weeks:
    bank=w['bank']
    sat=[p for k,p in enumerate(bank) if k%6<3]
    sun=[p for k,p in enumerate(bank) if k%6>=3]
    for p in sat: p['session_id']=2*w['week']-1
    for p in sun: p['session_id']=2*w['week']
    w['bank']=sat+sun
# Replace repeated bank templates with additional structures for each session.
def enrich(w,saturday,sunday):
    old=weeks[w-1]['bank']
    a=saturday+old[:12-len(saturday)]
    b=sunday+old[12:24-len(sunday)]
    assert len(a)==len(b)==12
    for p in a:p['session_id']=2*w-1
    for p in b:p['session_id']=2*w
    weeks[w-1]['bank']=a+b

enrich(1,[
P('Compare {2/9} and {7/9}.','{2/9} < {7/9}','F-COMP','Same denominator','F(2,9)<F(7,9)','With ninths fixed, compare two parts and seven parts.','{2/9} > {7/9}','The numerator counts the parts.'),
P('Which is closer to 1: {7/8} or {4/5}?','{7/8}','F-COMP','Benchmark distance','1-F(7,8)<1-F(4,5)','The gaps from 1 are one eighth and one fifth. One eighth is smaller.'),
P('Compare {5/8} and {3/5}.','{5/8} > {3/5}','F-COMP','Unlike numerator and denominator','F(5,8)==F(25,40) and F(3,5)==F(24,40)','Rename as twenty-five fortieths and twenty-four fortieths.','{5/8} < {3/5}','Compare equal-sized parts, not the original denominator counts.'),
P('Order {2/5}, 0.45, and {1/2} from least to greatest.','{2/5}, 0.45, {1/2}','F-COMP','Fractions and decimals','F(2,5)<D("0.45")<F(1,2)','Rename two fifths as 0.40 and one half as 0.50.'),
P('A number line uses quarters from 0 to 2. Where does {7/4} belong?','At 1 {3/4}, the seventh quarter-step from 0','F-LINE','Improper fraction on a line','F(7,4)==1+F(3,4)','Four fourths reach 1. Three more fourths reach one and three fourths.'),
P('A line marks 0, 3, and 6. How far from 3 toward 6 is 4 {1/2}?','Halfway','F-LINE','Changed number-line scale','(F(9,2)-3)/(6-3)==F(1,2)','The interval is 3 units. One and one half units is half of that interval.'),
P('Five granola bars are shared equally among six children. How much does each get?','{5/6} of a bar','F-QUOT','Fraction as quotient','F(5,6)*6==5','Split each bar into sixths and give each child five sixths.')],[
calc('Find {3/4} × {4/5}.','F(3,4)*F(4,5)','F-MULT','Fraction times fraction',worked='An area model shows 12 of 20 equal parts, or three fifths.'),
calc('Find {3/5} of 1 {2/3} cups.','F(3,5)*F(5,3)','F-MULT','Fraction times mixed number','cup',worked='Rename one and two thirds as five thirds. Three fifths of five thirds is one.'),
P('Is {2/3} × 9 smaller or larger than 9? Compute to check.','Smaller; 6','F-SCALE','Factor below one','F(2,3)*9==6 and 6<9','Two thirds takes less than all nine.'),
P('Is {4/3} × 6 smaller or larger than 6? Compute to check.','Larger; 8','F-SCALE','Factor above one','F(4,3)*6==8 and 8>6','Four thirds takes one whole six plus one third of six.'),
P('Find both 4 ÷ {1/5} and {1/5} ÷ 4.','20; {1/20}','F-DIV','Reversed division meanings','4/F(1,5)==20 and F(1,5)/4==F(1,20)','The first counts fifths in four. The second splits one fifth into four shares.','{4/5}; {4/5}','Changing the order changes what is shared or counted.'),
calc('A garden is {4/5} meter by {5/6} meter. Find its area.','F(4,5)*F(5,6)','F-MULT','Area context','square meter',worked='Multiply the two side lengths and simplify twenty thirtieths.'),
P('Write a story for {1/6} ÷ 3 and solve it.','{1/18}; stories vary','F-DIV','Sharing story','F(1,6)/3==F(1,18)','Example: share one sixth liter equally among three cups. Each gets one eighteenth liter.')])

enrich(2,[
P('A picture shows 5 green tiles and 2 white tiles. Write green : white and white : green.','5 : 2; 2 : 5','R-RATIO','Order matters','F(5,2)!=F(2,5)','Keep the requested first color first.'),
P('Is 6 : 10 equivalent to 9 : 15?','Yes','R-EQUIV','Recognize a non-whole factor','F(6,10)==F(9,15)','Multiply both numbers in 6 : 10 by one and one half.'),
P('Ava changes 3 : 7 to 5 : 9. Is it the same ratio?','No','R-EQUIV','Additive error analysis','F(3,7)!=F(5,9)','Adding two to each count changes the relationship. Two batches would give 6 : 14.','Yes','Equal additions do not preserve a ratio.'),
P('A team has 4 runners for every 3 walkers. There are 18 walkers. How many runners?','24 runners','R-EQUIV','Missing first quantity','F(18,3)*4==24','Eighteen walkers make six groups. Six groups need twenty-four runners.')],[
P('The pairs (2, 7), (4, 14), and (6, __) have the same ratio. Complete the table.','21','R-TABLE','Table missing value','F(2,7)==F(4,14)==F(6,21)','Multiply both entries of the first pair by three.'),
P('A double number line pairs 3 minutes with 8 laps. What pairs with 12 minutes?','32 laps','R-TABLE','Double number line','F(12,3)*8==32','Four jumps of three minutes match four jumps of eight laps.'),
P('Plot (1, 2), (2, 4), and (4, 8). Do they lie on a line through the origin?','Yes','R-GRAPH','Ratio graph','all(y==2*x for x,y in [(0,0),(1,2),(2,4),(4,8)])','Every vertical value is twice the horizontal value.'),
P('A mix has 5 cups oats and 3 cups seeds. What fraction of the whole is seeds?','{3/8}','R-WHOLE','Part-to-whole fraction','F(3,5+3)==F(3,8)','Count all eight cups before forming the fraction.','{3/5}','Five counts the other part, not the whole.')])

enrich(3,[
P('A bus covers 10 miles in 25 minutes at constant speed. How many miles in one hour?','24 miles','R-RATE','Non-hour time interval','F(10,25)*60==24','Five minutes corresponds to two miles. Twelve five-minute groups make 24 miles.'),
P('Pack A has 4 erasers for $1.80. Pack B has 6 for $2.40. Which costs less per eraser?','Pack B: $0.40 each','R-COMP','Compare unit prices','D("1.80")/4==D("0.45") and D("2.40")/6==D("0.40")','Compare forty-five cents with forty cents for one eraser.'),
P('A machine makes 24 labels in 6 minutes. Find labels per minute and minutes per label.','4 labels per minute; {1/4} minute per label','R-RATE','Both unit-rate directions','F(24,6)==4 and F(6,24)==F(1,4)','Divide labels by minutes for the first rate. Reverse for the second.'),
P('A snail moves 3 centimeters each minute. Find the distance after 0, 4, and 7 minutes.','0, 12, and 21 centimeters','R-TABLE','Constant-speed table','[3*t for t in [0,4,7]]==[0,12,21]','Multiply each time by the unit rate. Zero time matches zero distance.')],[
calc('Find 140% of 30 points.','F(140,100)*30','P-PART','Percent above one hundred','points',worked='Take all 30 points, then add forty percent, which is 12 points.'),
calc('Find 35% of 80 tiles.','F(35,100)*80','P-PART','Non-benchmark percent','tiles',worked='Thirty percent is 24. Five percent is 4. Add them.'),
calc('Find 12% of $15.00.','D("0.12")*D("15.00")','P-PART','Decimal result','dollars',worked='Ten percent is $1.50 and two percent is $0.30. Add them.'),
P('Find 10%, 50%, and 75% of 40 counters.','4, 20, and 30 counters','P-PART','Benchmark percents','[F(p,100)*40 for p in [10,50,75]]==[4,20,30]','Use one tenth, one half, and three fourths of the whole.')])

enrich(4,[
P('How many {3/4}-liter groups fit in {7/8} liter? Include part of a group.','1 {1/6} groups','F-DIV','Non-whole quotient','F(7,8)/F(3,4)==F(7,6)','A group is six eighths. Seven eighths is seven sixths of that group.'),
P('A bottle is {3/4} full and holds {2/3} liter so far. Find its full capacity.','{8/9} liter','F-DIV','Amount for a whole group','F(2,3)/F(3,4)==F(8,9)','One fourth holds two ninths liter. Four fourths hold eight ninths liter.'),
P('Write a story for {5/6} ÷ {1/3}. Solve it.','2 {1/2}; stories vary','F-DIV','Story writing','F(5,6)/F(1,3)==F(5,2)','Example: how many one-third-meter lengths fit in five sixths meter, allowing part of a length?'),
P('Jules says {1/2} ÷ {2/3} = {1/3}. Find and fix the error.','{3/4}','F-DIV','Multiplication error analysis','F(1,2)/F(2,3)==F(3,4) and F(1,2)*F(2,3)==F(1,3)','One half is three sixths. A group is four sixths. Three of four group parts fit.','{1/3}','The proposed answer multiplies instead of dividing.')],[
P('Share {5/6} liter equally among 4 cups. How much goes in each cup?','{5/24} liter','F-DIV','Fraction divided by whole number','F(5,6)/4==F(5,24)','Split each sixth into four equal parts. Each cup gets five twenty-fourths.'),
P('A ribbon is 4 {1/2} meters long. Pieces measure {3/8} meter. How many pieces fit?','12 pieces','F-DIV','Cutting a mixed-number length','F(9,2)/F(3,8)==12','Rename the total as thirty-six eighths. Divide into groups of three eighths.'),
P('Find {4/7} ÷ {2/5}. Check the result by multiplying by {2/5}.','1 {3/7}','F-DIV','Reciprocal with inverse check','F(4,7)/F(2,5)==F(10,7) and F(10,7)*F(2,5)==F(4,7)','Keep four sevenths and multiply by five halves. The check recovers four sevenths.'),
P('Which is the reciprocal of 2 {1/2}: {2/5} or {5/2}? Explain using a product of 1.','{2/5}','F-DIV','Mixed number reciprocal','F(5,2)*F(2,5)==1 and F(5,2)*F(5,2)!=1','Two and one half is five halves. Five halves times two fifths equals one.')])

enrich(5,[
P('Three notebooks cost $2.45 each. What is the total cost?','$7.35','D-MULT','Decimal times whole number','D("2.45")*3==D("7.35")','245 cents times three equals 735 cents.'),
P('A ball costs $4.65 and a card costs $2.78. Find the change from $10.','$2.57','D-MONEY','Money with two steps','D(10)-D("4.65")-D("2.78")==D("2.57")','The cost is $7.43. Subtract that from $10.00.'),
P('Find 0.8 × 0.7. Is the product below both factors?','0.56; yes','D-MULT','Product below both factors','D("0.8")*D("0.7")==D("0.56") and D("0.56")<D("0.7")<D("0.8")','Eight tenths of seven tenths covers fifty-six hundredths.')],[
P('Find 9.6 ÷ 8.','1.2','D-DIV','Decimal by whole number','D("9.6")/8==D("1.2")','Ninety-six tenths shared among eight gives twelve tenths.'),
P('Find 9 ÷ 40.','0.225','D-DIV','Quotient below one','D(9)/40==D("0.225")','Use long division into tenths, hundredths, and thousandths.'),
P('Find 1,344 ÷ 32. Verify by multiplication.','42','N-DIV','Four-digit by two-digit division','1344//32==42 and 42*32==1344','Thirty-two times forty is 1,280. Two more groups add 64.')])

error_checks={
1:'F(4,9)<F(4,5)',
2:'3/F(1,4)==12 and 3*F(1,4)==F(3,4)',
3:'F(4,3)!=F(7,6) and F(4,3)==F(8,6)',
4:'F(2,2+3)==F(2,5) and F(2,5)!=F(2,3)',
5:'D(6)/8==D("0.75") and F(8,6)==F(4,3)',
6:'D("0.40")*24==D("9.6") and D("0.40")*60==24',
7:'F(1,3)/F(5,6)==F(2,5) and F(1,3)*F(5,6)==F(5,18)',
8:'F(8,7)*F(1,4)==F(2,7) and F(7,8)*4==F(7,2)',
9:'D("0.6")*D("0.4")==D("0.24") and 6*4==24',
10:'D("6.3")/9==D("0.7") and D(630)/9==70'
}
for w in weeks:
    for s in w['sessions']:
        s['error']['check']=error_checks[s['id']]
# Likely wrong-answer examples for practice keys, attached to specific items.
import ast
for w in weeks:
    for p in w['bank']:
        if p['skill']=='F-COMP' and not p['wrong'] and ' > ' in p['answer']:
            p['wrong']=p['answer'].replace(' > ',' < ')
            p['error']='A larger denominator makes smaller equal parts, not a larger fraction.'
        elif p['skill']=='R-EQUIV' and p['case']=='Scale up a ratio':
            import re
            red=int(re.search(r'with (\d+) red',p['text']).group(1))
            p['wrong']=str(5+(red-3))+' blue tiles'
            p['error']='Adding the same amount to both counts changes the ratio.'
        elif p['skill']=='P-WHOLE':
            n=int(p['text'].split()[0])
            p['wrong']=str(D(n)*D('0.30'))+' shells'
            p['error']='Taking 30% of the known part does not recover the whole.'
        elif p['skill']=='R-COMP' and 'Mix A' in p['answer']:
            p['wrong']='Mix B'
            p['error']='Comparing only the juice counts ignores the amount of water.'
        elif p['skill']=='F-DIV' and p['check'].startswith('('):
            source=p['check'].split(' == ')[0][1:-1]
            # All generated F-DIV expressions here have one top-level division.
            node=ast.parse(source,mode='eval').body
            if isinstance(node,ast.BinOp) and isinstance(node.op,ast.Div):
                left=eval(compile(ast.Expression(node.left),'','eval'),dict(F=F,D=D))
                right=eval(compile(ast.Expression(node.right),'','eval'),dict(F=F,D=D))
                wrong=left*right
                actual=left/right
                if wrong!=actual:
                    p['wrong']=fmt(wrong)
                    p['error']='Multiplying by the divisor answers a different question.'
        elif p['skill']=='D-MULT' and p['check'].startswith('('):
            source=p['check'].split(' == ')[0][1:-1]
            actual=eval(source,dict(F=F,D=D))
            p['wrong']=str(actual*10)
            p['error']='The decimal point is one place too far right. Check the product against both factors.'
        elif p['skill']=='D-DIV' and p['case']=='Scale both numbers':
            source=p['check'].split(' == ')[0][1:-1]
            actual=eval(source,dict(F=F,D=D))
            p['wrong']=str(actual/100)
            p['error']='Changing only the divisor changes the quotient. Scale both quantities by 100.'

# Replace any accidentally unstacked fraction string in child-facing bank text.
import re
for w in weeks:
 for p in w['bank']:
  p['text']=re.sub(r'(?<![\w{])(\d+)/(\d+)(?![\w}])',r'{\1/\2}',p['text'])
checks=[]
for w in weeks:
 for s in w['sessions']:
  for p in s['problems']+[s['exit'],s['example'],s['fade'],s['error']]:
   checks.append((f"S{s['id']}: {p['text']}",p['check']))
 for p in w['bank']+[w['teaser']]:checks.append((f"W{w['week']}: {p['text']}",p['check']))
for label,ck in checks:
 if not eval(ck,dict(F=F,D=D,math=math,statistics=statistics)):
  raise AssertionError((label,ck))
assert len(weeks)==5
assert all(len(w['bank'])>=24 for w in weeks)
Path('work/weeks_1_5.json').write_text(json.dumps({'weeks':weeks},indent=2,ensure_ascii=False))
print(f'Wrote {len(weeks)} weeks, {sum(len(w["sessions"]) for w in weeks)} sessions, {len(checks)} exact arithmetic checks passed.')
