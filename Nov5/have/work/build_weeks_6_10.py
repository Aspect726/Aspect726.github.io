import json, math, statistics
from fractions import Fraction as F
from decimal import Decimal as D
from pathlib import Path

def p(text,answer,skill,case,check,worked='',wrong='',error='',diagram=None):
 d=dict(text=text,answer=answer,skill=skill,case=case,check=check,worked=worked or answer,wrong=wrong,error=error)
 if diagram:d['diagram']=diagram
 return d

def vocab(*triples):return [dict(term=a,meaning=b,example=c) for a,b,c in triples]
def rows(*triples):return [dict(response=a,why=b,move=c) for a,b,c in triples]
def session(id,title,standards,goal,key,pre,materials,v,probs,exit,error,example,fade,looks,mis,discussion,frame,model,sort):
 return dict(id=id,title=title,standards=standards,goal=goal,key_idea=key,prerequisite=pre,materials=materials,vocab=v,problems=probs,exit=exit,error=error,example=example,fade=fade,look_fors=looks,misconceptions=mis,discussion=discussion,summary_frame=frame,model=model,exit_sort=dict(zip(['got','almost','reteach'],sort)))
def err(text,correction,wrong,why,move):return dict(text=text,correction=correction,wrong=wrong,why=why,move=move)
def ex(text,steps,answer,check):return dict(text=text,steps=steps,answer=answer,check=check)
def fade(text,answer,check):return dict(text=text,answer=answer,check=check)

s11=session(11,'Expressions and equivalent forms',['6.EE.A.1','6.EE.A.2','6.EE.A.3','6.EE.A.4','6.EE.B.6'],
 'Write expressions and show why two forms have the same value.',
 'An expression names a quantity. Equivalent expressions name the same quantity for every allowed value.',
 'Multiplication, fraction products, and grouping symbols.', ['square tiles','grid paper','pencil'],
 vocab(('variable','A letter that can stand for a number.','In 5n, n can be 2 or 7.'),('expression','Numbers, variables, and operations without an equals sign.','5n + 3'),('exponent','The number of equal factors to multiply.','4² means 4 × 4.'),('equivalent','Having the same value for every allowed input.','2(x + 5) and 2x + 10')),
 [p('A sticker sheet costs n dollars. Write the cost of 5 sheets. Find it when n = 2 and when n = 4.','5n; $10; $20','E-EXPR','expression from a story; variable takes different values','5*2==10 and 5*4==20','Five equal costs give 5n. Substitute each sheet price.','n = 5','Confuses the number of sheets with the price.'),
 p('Find 2a + 5 when a = 6. Write the multiplication before adding.','17','E-EVAL','evaluate using order of operations','2*6+5==17','2 × 6 + 5 = 12 + 5 = 17.','22','Adds before multiplying.'),
 p('Find 4², 4 × 2, 3³, and ({2/3})². Which pair has different meanings?','16; 8; 27; {4/9}. 4² and 4 × 2 have different meanings.','E-EXP','square versus doubling; cube; fractional base','4**2==16 and 4*2==8 and 3**3==27 and F(2,3)**2==F(4,9)','Write repeated factors: 4 × 4, 4 × 2, 3 × 3 × 3, and {2/3} × {2/3}.','4² = 8','Treats the exponent as a factor.'),
 p('A rectangle is 4 units high and x + 3 units wide. Split the width into x and 3. Write its area two ways.','4(x + 3) = 4x + 12 square units','E-DIST','distributive property from area','all(4*(x+3)==4*x+12 for x in [0,1,2,7,F(1,2)])','The two smaller areas are 4x and 4 × 3. Their sum is 4x + 12.','4x + 3','Does not multiply the second width by the height.',dict(kind='area',dimensions=[4,3],labels=['x','3','height 4'],caption='Split width x + 3 into two parts.')),
 p('Simplify x + x + x + 2x. Then check your result when x = 3.','5x; 15 when x = 3','E-LIKE','combine like terms','1+1+1+2==5 and 5*3==15','There are five groups of x.','x⁵','Confuses adding equal terms with multiplying equal factors.'),
 p('Are 4(t + 2) and 4t + 2 equivalent? Check t = 1. Write a form that is equivalent to 4(t + 2).','No: 12 ≠ 6. The equivalent form is 4t + 8.','E-DIST','distinguish equivalent from non-equivalent','4*(1+2)==12 and 4*1+2==6 and all(4*(t+2)==4*t+8 for t in range(8))','One counterexample proves the forms differ. Distribution gives 4t + 8.','Yes, both have 4t and 2','Matches symbols without comparing quantities.')],
 p('Which expression equals 3(2x + 4) for every x? Choose 6x + 12, 6x + 4, or 5x + 7. Show how the 3 acts on both parts.','6x + 12','E-DIST','distribute to both terms','all(3*(2*x+4)==6*x+12 for x in range(10)) and 3*(2+4)!=6+4 and 3*(2+4)!=5+7','3 × 2x = 6x and 3 × 4 = 12.','6x + 4','Distributes only to the variable term.'),
 err('Lena wrote 5(z + 2) = 5z + 2. Find the mistake and repair it.','5z + 10. Each of the five groups contains two extra units.','5z + 2','Lena multiplied one part only.','Draw five equal rows, each with z and 2.'),
 ex('Find 3(2 + 4).',['The parentheses name one group: 2 + 4 = 6.','Three groups give 3 × 6 = 18.','Split each group instead: 3 × 2 + 3 × 4 = 6 + 12 = 18.'],'18','3*(2+4)==18 and 3*2+3*4==18'),
 fade('Complete: 2(y + 6) = 2y + __. Check when y = 5.','12; both forms give 22','2*6==12 and 2*(5+6)==22'),
 rows(('Draws repeated groups before writing 5n.','Connects a variable to a quantity.','Ask what changes when one sheet costs more.'),('Partitions the rectangle and counts both areas.','Explains distribution visually.','Ask which area matches each term.'),('Uses either repeated addition or a rectangle correctly.','More than one model can show equivalence.','Accept both and compare the matching groups.')),
 rows(('Writes 4² = 8.','Reads the exponent as multiplication by two.','Write two factors of 4, then compare.'),('Writes 4(x + 3) = 4x + 3.','Loses the four groups of 3.','Shade the numeric part in all four rows.'),('Checks one value and claims equivalence.','A single match can be accidental.','Ask for an area argument that works for any x.')),
 ['Partner compare: How does each smaller rectangle match one term?', 'Agree or disagree: Does one matching input prove two expressions are equivalent?'],
 'Distributing works because each group contains __ and __.',dict(kind='area',dimensions=[4,3],labels=['x','3','4'],caption='Four rows each contain x + 3.'),
 ['Selects 6x + 12 and explains that 3 multiplies both 2x and 4.','Selects 6x + 12 but gives an incomplete explanation or one arithmetic slip in the check.','Selects 6x + 4 or another form and cannot show both products.'])

s12=session(12,'Equations and related quantities',['6.EE.B.5','6.EE.B.6','6.EE.B.7','6.EE.C.9'],
 'Solve equations by keeping both sides equal and connect a rule to a table and graph.',
 'A solution makes the equation true. The same operation on both sides preserves equality.',
 'Equivalent expressions and inverse operations.', ['paper strips','counters','grid paper'],
 vocab(('equation','A statement that two quantities are equal.','x + 7 = 19'),('solution','A value that makes an equation true.','12 solves x + 7 = 19.'),('independent variable','The input you choose.','Number of notebooks, n.'),('dependent variable','The output determined by the input.','Total cost, c = 2.5n.')),
 [p('Solve x + 7 = 19. Show the same change on both sides.','x = 12','E-ADD','additive equation with whole numbers','12+7==19','Subtract 7 from each side.','x = 26','Adds instead of undoing the addition.'),
 p('Four identical bags hold 28 marbles. Write and solve an equation for marbles per bag, b.','4b = 28; b = 7 marbles','E-MULT','multiplicative equation with whole numbers','4*7==28','Split 28 into four equal groups.','b = 24','Subtracts the coefficient.'),
 p('Solve 1.2x = 5.4. Check with multiplication.','x = 4.5','E-MULT','decimal coefficient and solution',"D('1.2')*D('4.5')==D('5.4')",'Divide both sides by 1.2. Then 1.2 × 4.5 = 5.4.','x = 4.2','Subtracts 1.2 from 5.4.'),
 p('Solve ({2/3})x = 10. Draw three equal parts of x first.','x = 15','E-MULT','fractional coefficient','F(2,3)*15==10','Two parts total 10, so one part is 5. All three parts total 15.','x = {20/3}','Multiplies by the coefficient instead of finding the whole.'),
 p('A game costs $18. Mina has $6.50 saved. Write and solve an equation for the extra amount, a, she needs.','a + 6.50 = 18; a = $11.50','E-STORY','write an equation from a story',"D('11.50')+D('6.50')==18",'The saved amount plus the extra amount equals the price.','a = $24.50','Combines the given amounts without matching their roles.'),
 p('Notebooks cost $2.50 each. Use c = 2.5n for n = 0, 1, 2, 4. Plot (n, c). Name the input and output.','(0, 0), (1, 2.5), (2, 5), (4, 10). Input n; output c.','E-RELATE','equation; table; graph; independent and dependent variables',"[D('2.5')*n for n in [0,1,2,4]]==[0,D('2.5'),5,10]",'Multiply each notebook count by 2.5. The chosen count determines the cost.','(2.5, 1) for one notebook','Reverses the input and output.',dict(kind='coordinate',points=[[0,0],[1,2.5],[2,5],[4,10]],labels=['notebooks n','cost c'],caption='n is horizontal. c is vertical.'))],
 p('Solve ({3/5})x = 12. Show equal parts or an equation step. Check your value.','x = 20','E-MULT','fractional coefficient; whole unknown','F(3,5)*20==12','Three fifths total 12, so one fifth is 4. Five fifths total 20.','x = {36/5}','Multiplies 12 by {3/5} instead of finding the whole.'),
 err('Omar solves 6x = 42 by writing x = 42 − 6 = 36. Explain and repair his work.','x = 7. Six equal groups total 42.','x = 36','Treats multiplication as addition.','Draw six equal boxes with a total of 42.'),
 ex('Solve x + 2.75 = 8.',['Both sides must stay equal.','Subtract 2.75 from each side: x = 5.25.','Check: 5.25 + 2.75 = 8.'],'x = 5.25',"D('5.25')+D('2.75')==8"),
 fade('Complete: 5x = 35. Divide both sides by __. Then x = __.','5; 7','35//5==7 and 5*7==35'),
 rows(('Removes or divides equally on both sides.','Preserves equality.','Ask the student to state why the balance remains level.'),('Splits the fractional whole into equal parts.','Keeps the unknown whole visible.','Ask which parts the given amount represents.'),('Uses a tape or inverse operations and checks.','Both methods preserve the same relationship.','Accept either and connect each step to the other.')),
 rows(('Subtracts the coefficient.','Does not read juxtaposition as multiplication.','Read 4b as four equal groups of b.'),('Changes one side only.','Loses equality.','Use matching actions on a balance drawing.'),('Reverses graph coordinates.','Does not identify the chosen input.','Label horizontal n and vertical c before plotting.')),
 ['Partner compare: Which part of your tape shows 10 in ({2/3})x = 10?', 'Agree or disagree: Does a solution have to work when we put it back into the original equation?'],
 'I can check a solution by __.',dict(kind='hanger',values=[4,28],labels=['4 equal bags','28 marbles'],caption='Four equal unknown groups balance 28.'),
 ['Finds 20 and checks ({3/5}) × 20 = 12, with equal parts or a valid inverse operation.','Finds 20 using a valid method but omits the check or makes one calculation slip after a correct setup.','Multiplies 12 by {3/5}, subtracts {3/5}, or cannot connect 12 to three parts.'])

s13=session(13,'Area from a base and height',['6.G.A.1'],
 'Find area by matching a base with its perpendicular height.',
 'A parallelogram rearranges into a rectangle. Two copies of a triangle make a parallelogram.',
 'Rectangle area and multiplication with fractions.', ['grid paper','scissors','ruler','paper triangle'],
 vocab(('area','The amount of flat surface inside a shape.','A 2 by 3 rectangle covers 6 square units.'),('base','The side chosen to match a height.','The bottom side can be the base.'),('height','The perpendicular distance from the base line to the opposite side or vertex.','A height meets the base line at a right angle.')),
 [p('A rectangle is 6 cm long and 2.5 cm wide. Find its area and perimeter.','Area 15 square cm; perimeter 17 cm','G-AREA','rectangle area review; area versus perimeter',"6*D('2.5')==15 and 2*(6+D('2.5'))==17",'Area counts square units: 6 × 2.5. Perimeter adds all four edge lengths.','17 square cm','Uses perimeter as area.'),
 p('A parallelogram has base 7 cm, height 4 cm, and slanted side 5 cm. Cut and move the end triangle. Find its area.','28 square cm','G-PARA','parallelogram; height differs from slanted side','7*4==28 and 3**2+4**2==5**2','Moving the end triangle makes a 7 by 4 rectangle.','35 square cm','Uses the slanted side as height.',dict(kind='parallelogram',points=[[0,0],[7,0],[10,4],[3,4]],dimensions=[7,4,5],labels=['base 7','height 4','side 5'],caption='The height is perpendicular to the base.')),
 p('A right triangle has perpendicular legs of 6 cm and 8 cm. Find its area. Use either leg as the base.','24 square cm both ways','G-TRI','right triangle; same triangle with another base','F(1,2)*6*8==24 and F(1,2)*8*6==24 and 6**2+8**2==10**2','Half of 6 × 8 equals half of 8 × 6.','48 square cm','Finds the surrounding rectangle area.',dict(kind='triangle',points=[[0,0],[6,0],[0,8]],dimensions=[6,8,10],labels=['6','8','10'],caption='Each leg can be the base.')),
 p('An isosceles triangle has sides 13, 13, and 10 cm. Its height to the 10 cm base is 12 cm. Find the area.','60 square cm','G-TRI','height is not a side; interior height','5**2+12**2==13**2 and F(1,2)*10*12==60','The height splits the base into two 5 cm parts. Area = {1/2} × 10 × 12.','65 square cm','Uses a slanted side as height.',dict(kind='triangle',points=[[0,0],[10,0],[5,12]],dimensions=[10,12,13],labels=['base 10','height 12','side 13'],caption='The dashed height lies inside.')),
 p('A triangle has vertices A(0, 0), B(4, 0), and C(6, 3), measured in cm. The height meets the extended base at (6, 0). Find its area.','6 square cm','G-TRI','obtuse triangle; exterior height','F(1,2)*4*3==6 and 6*3-0*6==18 and (6-4)**2+3**2==13','The base AB is 4 cm. The perpendicular height is 3 cm even though it lies outside.','9 square cm','Uses the extended base length instead of AB.',dict(kind='triangle',points=[[0,0],[4,0],[6,3]],dimensions=[4,3],labels=['base AB = 4','height = 3'],caption='Extend the base to the foot of the height.')),
 p('A triangle has base 5 cm and matching height 2.4 cm. Find its area. Would base × slanted side always work?','6 square cm; no, the height must be perpendicular','G-TRI','rational dimensions; explain matching height',"F(1,2)*5*D('2.4')==6",'Area = {1/2} × 5 × 2.4. A slanted side usually gives the wrong distance between base and vertex.','12 square cm','Omits the half.')],
 p('A triangle has sides 10, 10, and 12 cm. The height to the 12 cm base is 8 cm. Find its area and name the length you used as height.','48 square cm; height 8 cm','G-TRI','separate slanted side from height','6**2+8**2==10**2 and F(1,2)*12*8==48','Half of the 12 by 8 surrounding rectangle is 48.','60 square cm','Uses the side 10 as the height.',dict(kind='triangle',points=[[0,0],[12,0],[6,8]],dimensions=[12,8,10],labels=['12','height 8','side 10'],caption='The perpendicular height is marked.')),
 err('Theo uses a triangle’s base 9 cm and height 4 cm. He writes 9 × 4 = 36 square cm. What is missing?','The triangle is half the parallelogram: 18 square cm.','36 square cm','Counts both copies of the triangle.','Place two matching paper triangles together.'),
 ex('A parallelogram has base 6 cm and height 3 cm.',['Cut a triangle from one end and move it to the other.','The new rectangle has the same area, base 6 and height 3.','Area = 6 × 3 = 18 square cm.'],'18 square cm','6*3==18'),
 fade('A triangle has base 8 cm and height 2.5 cm. Complete: A = {1/2} × 8 × __ = __.','2.5; 10 square cm',"F(1,2)*8*D('2.5')==10"),
 rows(('Marks a right angle at the foot of the height.','Identifies the distance the formula needs.','Ask whether the slanted side makes that angle.'),('Rearranges without gaps or overlaps.','Shows why area is preserved.','Compare the original and rearranged boundaries.'),('Chooses either leg of a right triangle as base.','Different valid choices give the same area.','Accept both and compare base-height pairs.')),
 rows(('Uses a slanted side as height.','Treats any given length as interchangeable.','Trace the perpendicular distance with a ruler.'),('Omits the half for a triangle.','Uses the containing parallelogram.','Pair congruent copies and split the area equally.'),('Uses cm for area.','Confuses boundary length and surface coverage.','Count a row of unit squares.')),
 ['Partner compare: Why does moving a cut piece preserve area?', 'Agree or disagree: Can a height lie outside its triangle? Point to the base line.'],
 'For this base, the matching height is __ because __.',dict(kind='parallelogram',points=[[0,0],[7,0],[10,4],[3,4]],dimensions=[7,4,5],labels=['base 7','height 4','side 5'],caption='Cut and slide the left end to make a rectangle.'),
 ['Gives 48 square cm and identifies 8 cm as perpendicular height.','Uses {1/2} × 12 × 8 but makes one arithmetic or unit slip.','Uses 10 as height, omits the half, or cannot identify a perpendicular height.'])

s14=session(14,'Nets and surface area',['6.G.A.1','6.G.A.4'],
 'Use decompositions and nets to count every part of a surface.',
 'A net unfolds every face. Surface area adds face areas in square units.',
 'Rectangle and triangle area; multiplication and addition.', ['paper nets','scissors','tape','ruler'],
 vocab(('composite polygon','A shape made by joining simpler polygons.','An L can split into two rectangles.'),('net','A flat arrangement that folds into a solid.','Six rectangles can form a box.'),('surface area','The total area of all outside faces.','A closed box includes its bottom.'),('volume','The space inside a solid.','Volume uses cubic units.')),
 [p('An 8 cm by 6 cm rectangle loses a 3 cm by 2 cm corner from the upper right. Find the L-shaped area two ways.','42 square cm','G-COMP','L-shaped polygon split two ways','8*6-3*2==42 and 8*4+5*2==42 and 5*6+3*4==42','Subtract the missing corner, or add two rectangles: 32 + 10 = 42. A third valid split gives 30 + 12.','48 square cm','Counts the removed corner.',dict(kind='area',points=[[0,0],[8,0],[8,4],[5,4],[5,6],[0,6]],dimensions=[8,6,3,2],caption='The upper-right corner is removed.')),
 p('A closed box is 2 cm by 3 cm by 4 cm. Label all six rectangles on a net. Find surface area and volume.','Surface area 52 square cm; volume 24 cubic cm','G-SA','rectangular prism net; distinguish square and cubic units','2*(2*3+2*4+3*4)==52 and 2*3*4==24','There are two faces of each size: 6, 8, and 12. Add twice their sum.','24 square cm','Uses the volume formula.',dict(kind='net',solid='rectangular_prism',dimensions=[2,3,4],labels=['2','3','4'],caption='A closed prism has six faces.')),
 p('A triangular prism has right-triangle ends with sides 6, 8, and 10 cm. Its length is 5 cm. List the five faces and find surface area.','Two triangles of area 24 each; rectangles of area 30, 40, 50; total 168 square cm','G-SA','triangular prism net','6**2+8**2==10**2 and 2*F(1,2)*6*8+5*(6+8+10)==168','The two ends total 48. The three side rectangles total 120.','144 square cm','Counts only one triangular end.',dict(kind='net',solid='triangular_prism',dimensions=[6,8,10,5],caption='Two matching triangles and three rectangles.')),
 p('A square pyramid has base side 6 cm. Each triangular face has perpendicular height 5 cm. Find its surface area.','96 square cm','G-SA','square pyramid net; slant height of each face','3**2+4**2==5**2 and 6*6+4*F(1,2)*6*5==96','The square base is 36. Four triangular faces each have area 15.','156 square cm','Forgets the half on each triangular face.',dict(kind='net',solid='square_pyramid',dimensions=[6,5],caption='The 5 cm height lies on each triangular face.')),
 p('A closed 2 cm by 4 cm by 5 cm box has a claimed surface area of 68 square cm. Its 2 by 4 bottom was left out. Repair the answer.','76 square cm','G-SA','find a missing face in a surface-area calculation','2*(2*4+2*5+4*5)==76 and 68+2*4==76','Add the missing bottom area, 8 square cm.','68 square cm','Counts only the visible faces.')],
 p('A triangular prism has right-triangle ends with sides 3, 4, and 5 cm. It is 8 cm long. Find the area of all five faces together.','108 square cm','G-SA','triangular prism with hidden faces','3**2+4**2==5**2 and 2*F(1,2)*3*4+8*(3+4+5)==108','Two triangle ends total 12. Three rectangles total 24 + 32 + 40 = 96. Total 108.','102 square cm','Leaves out one triangular end.',dict(kind='net',solid='triangular_prism',dimensions=[3,4,5,8],caption='Include both triangular ends.')),
 err('Ava finds a cube’s surface area by adding five faces. Each face is 9 square cm. She gets 45. Explain and repair it.','A closed cube has six faces: 6 × 9 = 54 square cm.','45 square cm','One hidden face was omitted.','Label each face of the folded cube and net with matching letters.'),
 ex('Find the surface area of a 2 cm by 2 cm by 3 cm closed box.',['Two square ends each have area 4.','Four side rectangles each have area 6.','Total area = 2 × 4 + 4 × 6 = 32 square cm.'],'32 square cm','2*4+4*6==32'),
 fade('A square pyramid has base side 4 cm and face height 3 cm. Complete: SA = 16 + 4 × ({1/2} × 4 × __) = __.','3; 40 square cm','4*4+4*F(1,2)*4*3==40'),
 rows(('Labels both hidden and visible faces.','Prevents missing areas.','Match each label on the solid and the net.'),('Uses different decompositions for the L.','Area is independent of a valid split.','Accept both and compare the totals.'),('Uses square units for faces and cubic units for volume.','Distinguishes surface from capacity.','Ask what one unit would look like.')),
 rows(('Uses length × width × height for surface area.','Confuses space inside with covering outside.','Imagine covering every face with paper.'),('Counts only one triangular end.','A sketch hides the other end.','Fold the net and point to both ends.'),('Uses full base × height for triangular faces.','Treats a triangle as its rectangle.','Pair two matching triangular faces.')),
 ['Partner compare: Where is every part of the L in each split?', 'Agree or disagree: Does a hidden face still need wrapping paper?'],
 'To find surface area, I list __ and add __.',dict(kind='net',solid='rectangular_prism',dimensions=[2,3,4],labels=['2','3','4'],caption='Match each rectangle to one face.'),
 ['Gives 108 square cm and includes two triangles and three rectangles.','Lists all five faces correctly but makes one area or addition slip.','Leaves out a face, uses volume, or doubles a triangular face area.'])

s15=session(15,'Negative numbers and distance from zero',['6.NS.C.5','6.NS.C.6','6.NS.C.7'],
 'Order positive and negative numbers and describe their distances from zero.',
 'Numbers increase to the right. Absolute value measures distance from zero, regardless of direction.',
 'Fractions and decimals on a number line.', ['number line from −10 to 10','counters','pencil'],
 vocab(('negative number','A number less than zero.','−4 can mean four degrees below zero.'),('opposites','Numbers the same distance from zero on opposite sides.','−6 and 6'),('absolute value','A number’s distance from zero.','|−6| = 6')),
 [p('Write a signed number for 4 degrees below zero, 7 m above sea level, and owing $9. State what zero means in each setting.','−4°C; +7 m; −$9. Zero means 0°C, sea level, or no money owed or held.','N-CONTEXT','temperature; elevation; money','-4<0 and 7>0 and -9<0','Use negative for below the reference point or a debt.','+4°C for below zero','Ignores the reference point.'),
 p('Place −6, 1, and −2 on a number line. Which is least?','Left to right: −6, −2, 1; least −6','N-ORDER','integers on a number line','sorted([-6,1,-2])==[-6,-2,1]','The leftmost point is the least.','−2 is least','Compares only the positive digits.',dict(kind='numberline',values=[-6,1,-2],min=-8,max=4,labels=['−6','1','−2'],caption='Each tick is one unit.')),
 p('Place −2.5, −{3/4}, and 0.5 on a number line. Order them from least to greatest.','−2.5, −{3/4}, 0.5','N-ORDER','fraction and decimal negative numbers',"sorted([F('-2.5'),F(-3,4),F('0.5')])==[F('-2.5'),F(-3,4),F('0.5')]",'−2.5 lies farther left than −{3/4}. Both are below 0.5.','−{3/4}, −2.5, 0.5','Uses distance from zero as order.',dict(kind='numberline',values=[-2.5,-0.75,0.5],min=-3,max=1,step=0.25,labels=['−2.5','−3/4','0.5'],caption='Four equal parts make each unit.')),
 p('Find the opposite of −9. Then find the opposite of that result. Write −(−9).','9; −9; −(−9) = 9','N-OPP','opposite; opposite of the opposite','-(-9)==9 and -9==-9','Reflect across zero once for each opposite.','−(−9) = −9','Treats two negative signs as one.'),
 p('Find |−8|, |8|, and |0|. Describe each as a distance.','8, 8, 0 units from zero','N-ABS','absolute value of negative; positive; zero','abs(-8)==8 and abs(8)==8 and abs(0)==0','Both −8 and 8 lie eight units from zero.','|−8| = −8','Gives a direction instead of a distance.'),
 p('Compare −9 and −4 using < or >. Compare their absolute values. Which temperature is warmer, −9°C or −4°C?','−9 < −4; 9 > 4; −4°C is warmer','N-ABS','number order versus absolute-value order; context','-9<-4 and abs(-9)>abs(-4)','−4 is farther right, but −9 is farther from zero.','−9 > −4','Orders by absolute value.')],
 p('Order −6, 1.5, −{1/4}, and −2.5. Which number has the greatest absolute value? Give that absolute value.','−6, −2.5, −{1/4}, 1.5; number −6, absolute value 6','N-ORDER','order rational numbers; distinguish distance',"sorted([F(-6),F('1.5'),F(-1,4),F('-2.5')])==[F(-6),F('-2.5'),F(-1,4),F('1.5')] and max(abs(x) for x in [F(-6),F('1.5'),F(-1,4),F('-2.5')])==6",'Place all four points, then compare their distances from zero.','1.5 has the greatest absolute value','Confuses greatest number with greatest distance.'),
 err('Ben says −10 > −3 because 10 > 3. Use a number line to explain and repair his statement.','−10 < −3 because −10 lies farther left.','−10 > −3','Uses whole-number order without considering direction.','Find zero, then trace left to each point.'),
 ex('Compare −1.5 and −0.5.',['Locate zero, then mark both numbers to its left.','−1.5 lies one unit left of −0.5.','Therefore −1.5 < −0.5, but |−1.5| > |−0.5|.'],'−1.5 < −0.5',"F('-1.5')<F('-0.5') and abs(F('-1.5'))>abs(F('-0.5'))"),
 fade('Complete: −7 is __ units from zero, so |−7| = __. Its opposite is __.','7; 7; 7','abs(-7)==7 and -(-7)==7'),
 rows(('Locates negatives to the left of zero.','Anchors order to direction.','Ask which point is farther right.'),('Separates a number from its distance.','Prevents order and absolute-value confusion.','Ask for both the signed location and the unsigned distance.'),('Uses fractions or decimal equivalents accurately.','Both name the same point.','Accept either representation and check the unit scale.')),
 rows(('Orders negatives by their digits.','Extends positive-number rules unchanged.','Walk rightward on a number line and read the labels.'),('Gives a negative absolute value.','Keeps direction in a distance measure.','Count unit steps from zero.'),('Says the opposite of −9 is −9.','Does not reflect across zero.','Fold a paper number line at zero.')),
 ['Partner compare: Which is greater, and which is farther from zero?', 'Agree or disagree: Can two different numbers have the same absolute value? Show them.'],
 'The greater number lies __. The greater absolute value means __.',dict(kind='numberline',values=[-8,-3,0,3,8],min=-10,max=10,step=1,labels=['−8','−3','0','3','8'],caption='Opposites have equal distances from zero.'),
 ['Orders all four correctly and names −6 as the number with absolute value 6.','Orders correctly but confuses the name −6 with distance 6, or makes one placement slip.','Orders negatives by positive digits or selects 1.5 because it is the greatest number.'])

s16=session(16,'Coordinates and inequalities',['6.NS.C.6','6.NS.C.8','6.EE.B.5','6.EE.B.8'],
 'Use coordinates to locate and reflect points, and graph sets of solutions.',
 'A coordinate pair gives horizontal then vertical position. An inequality can describe many solutions.',
 'Signed number order and horizontal or vertical distance.', ['four-quadrant grid','ruler','blank number line'],
 vocab(('coordinate pair','Two numbers naming horizontal and vertical position.','(−2, 3) means left 2, up 3.'),('reflection','A mirror image across a line.','Across the y-axis, (−2, 3) becomes (2, 3).'),('inequality','A comparison using <, >, ≤, or ≥.','h ≥ 10 includes 10 and larger numbers.'),('solution set','All values that make a statement true.','x > 4 includes 4.5 and 5, but not 4.')),
 [p('Plot A(2, 3), B(−4, 1), C(−3, −2), and D(1, −4). Name the quadrant of each.','A I; B II; C III; D IV','N-COORD','plot points in all four quadrants','2>0 and 3>0 and -4<0 and 1>0 and -3<0 and -2<0 and 1>0 and -4<0','Read x first, then y. Their signs identify the quadrant.','A at (3, 2)','Swaps x and y.',dict(kind='coordinate',points=[[2,3],[-4,1],[-3,-2],[1,-4]],point_labels=['A','B','C','D'],labels=['x','y'],range=[-5,5],caption='One square is one unit.')),
 p('Read P and Q from the grid. State the horizontal move first.','P(−2, 4); Q(3, −1)','N-COORD','read coordinates from a graph','(-2,4)!= (4,-2) and (3,-1)!=(-1,3)','P is left 2, up 4. Q is right 3, down 1.','P(4, −2)','Reads vertical first.',dict(kind='coordinate',points=[[-2,4],[3,-1]],point_labels=['P','Q'],labels=['x','y'],range=[-5,5],caption='Read each labeled point.')),
 p('Reflect (−2, 3) across the x-axis. Then reflect the original point across the y-axis.','Across x-axis: (−2, −3). Across y-axis: (2, 3).','N-REFLECT','reflect across each axis','(-2,-3)==(-2,-(3)) and (2,3)==(-(-2),3)','A reflection keeps distance from the mirror line and changes the coordinate across it.','Across x-axis: (2, 3)','Reflects across the wrong axis.'),
 p('Find the distance from (−2, 3) to (−2, −4), and from (−2, 3) to (5, 3).','7 units; 7 units','N-DIST','vertical and horizontal distances','abs(3-(-4))==7 and abs(5-(-2))==7','Only one coordinate changes. Count across zero or subtract the endpoints.','1 unit','Subtracts magnitudes instead of positions.'),
 p('A rectangle has vertices (−3, 2), (2, 2), (2, −1), and (−3, −1). Find its perimeter.','16 units','N-DIST','polygon perimeter on coordinate plane','2*(abs(2-(-3))+abs(2-(-1)))==16','Horizontal sides are 5. Vertical sides are 3. Add 5 + 3 + 5 + 3.','15 square units','Finds area instead of perimeter.',dict(kind='coordinate',points=[[-3,2],[2,2],[2,-1],[-3,-1]],closed=True,range=[-5,5],labels=['x','y'],caption='Join the points in order.')),
 p('Graph x > 2 and x ≥ 2 on separate number lines. Is 2 a solution of each?','x > 2: open circle, shade right, excludes 2. x ≥ 2: closed circle, shade right, includes 2.','E-INEQ','open and closed circles; endpoint membership','not (2>2) and 2>=2 and 3>2','The equality bar decides whether the endpoint belongs.','Both include 2','Does not distinguish strict and inclusive comparisons.'),
 p('A ride requires a height of at least 48 inches. Write an inequality for h. Is 48 included?','h ≥ 48; yes','E-INEQ','at least; write inequality from words','48>=48 and not (47>=48)','At least means equal to or greater than.','h > 48','Excludes the allowed boundary value.')],
 p('Reflect A(−4, 1.5) across the y-axis. Give the image and the distance from A to its image.','A′(4, 1.5); distance 8 units','N-REFLECT','rational coordinate; reflection and distance',"(-(-4),F('1.5'))==(4,F('1.5')) and abs(4-(-4))==8",'The y-coordinate stays 1.5. Both points are 4 units from the y-axis, so the gap is 8.','(−4, −1.5); distance 3','Reflects across the x-axis.'),
 err('Nia writes x > 6 for “at least 6.” She leaves 6 out. Explain and repair her graph.','Use x ≥ 6, a closed circle at 6, and shade right.','x > 6','Treats at least as more than.','Test the exact boundary value in the words.'),
 ex('Find the distance from (−1, −3) to (−1, 2).',['The x-coordinate stays −1, so the segment is vertical.','From −3 to 0 is 3 units. From 0 to 2 is 2 units.','Total distance = 3 + 2 = 5 units.'],'5 units','abs(2-(-3))==5'),
 fade('Reflect (−5, −2) across the y-axis: (__, __). The distance between the points is __.','(5, −2); 10 units','-(-5)==5 and abs(5-(-5))==10'),
 rows(('Moves horizontally before vertically.','Keeps coordinate order fixed.','Have the student trace each move with a finger.'),('Preserves distance from the reflection axis.','Shows a mirror relationship.','Count equal squares on each side of the axis.'),('Finds distance by counting or subtracting positions.','Both methods measure the same gap.','Accept both and compare across zero.')),
 rows(('Swaps the coordinates.','Reads vertical position first.','Use horizontal then vertical every time.'),('Changes both signs for an axis reflection.','Confuses reflection with a half-turn.','Fold along the named axis.'),('Leaves out the boundary for at least.','Misses the equality part.','Try the boundary value in the original words.')),
 ['Partner compare: Which coordinate stays fixed when reflecting across the y-axis?', 'Agree or disagree: Does at least include the boundary? Test the boundary in the sentence.'],
 'A reflection across the y-axis changes __ and keeps __.',dict(kind='coordinate',points=[[-2,3],[2,3]],point_labels=['A','A′'],labels=['x','y'],range=[-5,5],caption='The y-axis lies midway between A and A′.'),
 ['Gives (4, 1.5) and distance 8, with the y-coordinate fixed.','Gives the correct image but makes one distance error, or states the correct rule with one sign slip.','Reflects across the x-axis, changes both signs, or gives distance 4 because only one half is counted.'])

s17=session(17,'Data displays and center',['6.SP.A.1','6.SP.A.2','6.SP.A.3','6.SP.B.4','6.SP.B.5'],
 'Read data displays and use mean or median to describe a typical value.',
 'A statistical question expects different answers. Mean shares the total equally; median locates the ordered middle.',
 'Ordering numbers, division, and reading a scale.', ['small counters','grid paper','ruler'],
 vocab(('statistical question','A question answered with data that are expected to vary.','How many books did each classmate read?'),('mean','The total shared equally among all data values.','The mean of 2 and 6 is 4.'),('median','The middle of ordered data. With two middles, use their mean.','The median of 1, 4, 8 is 4.'),('histogram','A display counting values in number intervals.','A bar can count heights from 120 to under 130 cm.')),
 [p('Which asks a statistical question: “How many pages are in this book?” or “How many pages are in each library book on this shelf?” Explain.','The shelf question; page counts can vary across books.','S-QUESTION','statistical versus non-statistical questions','len(set([48,64,80]))>1 and len(set([64]))==1','The first asks for one fixed book. The second expects several different values.','Both, because both have numbers','Confuses numerical answers with variability.'),
 p('Build a dot plot for 1, 2, 2, 3, 4, 4, 5 books read. Describe its shape and total number of dots.','Seven dots; counts 1, 2, 1, 2, 1 at 1 through 5. Symmetric around 3.','S-DISPLAY','dot plot from data; distribution shape','[ [1,2,2,3,4,4,5].count(i) for i in range(1,6)]==[1,2,1,2,1]','Stack one dot for each student at that student’s number of books.','Five dots','Counts distinct values instead of observations.',dict(kind='dotplot',values=[1,2,2,3,4,4,5],labels=['books read','students'],caption='Each dot represents one student.')),
 p('Build a histogram for 0, 1, 1, 2, 2, 3, 4, 5. Use bins 0 to under 2, 2 to under 4, and 4 to under 6.','Bin counts: 3, 3, 2','S-DISPLAY','histogram with specified nonoverlapping bins','[sum(a<=x<b for x in [0,1,1,2,2,3,4,5]) for a,b in [(0,2),(2,4),(4,6)]]==[3,3,2]','A boundary value such as 2 goes into the bin that starts at 2.','Counts 2 in both first and second bins','Overlaps the interval endpoints.',dict(kind='histogram',values=[0,1,1,2,2,3,4,5],bins=[0,2,4,6],frequencies=[3,3,2],labels=['0 to <2','2 to <4','4 to <6'],caption='Every value belongs in exactly one bin.')),
 p('Four jars hold 2, 4, 5, and 9 counters. Share all counters equally. Find the mean and show how it balances the deviations.','Mean 5; deviations −3, −1, 0, 4 sum to 0','S-MEAN','mean as fair share and balance point','F(2+4+5+9,4)==5 and sum([-3,-1,0,4])==0','There are 20 counters for four jars. Move four from the jar of 9 to fill the two low jars.','Mean 9','Chooses the largest value.'),
 p('Find each median: (a) 8, 2, 4, 4, 7; (b) 5, 2, 9, 3, 6, 5. Order first.','(a) 4; (b) 5','S-MEDIAN','odd and even number of values','statistics.median([8,2,4,4,7])==4 and statistics.median([5,2,9,3,6,5])==5','(a) 2, 4, 4, 7, 8. (b) 2, 3, 5, 5, 6, 9; average the two middle 5s.','(a) 4; (b) 6','Uses the displayed middle without ordering.'),
 p('Data are 2, 3, 4, 4, 7. Replace 7 with 27. Compare the old and new mean and median. Which center changes less?','Mean: 4 to 8. Median: 4 to 4. The median changes less.','S-CENTER','outlier effect; choose a resistant center','statistics.mean([2,3,4,4,7])==4 and statistics.mean([2,3,4,4,27])==8 and statistics.median([2,3,4,4,7])==statistics.median([2,3,4,4,27])==4','The outlier increases the total by 20, so the five-value mean increases by 4. The middle value stays 4.','Both centers increase by 20','Does not distinguish middle position from fair-share total.'),
 p('Four game scores have mean 6. Three scores are 3, 5, and 7. Find the missing score.','9','S-MEAN','missing value for a specified mean','4*6-(3+5+7)==9 and statistics.mean([3,5,7,9])==6','The total must be 24. The known scores total 15, leaving 9.','6','Assumes every score must equal the mean.')],
 p('Data are 8, 2, 11, 5, 6, 4. Find the median and the mean. Show your ordered list.','Ordered: 2, 4, 5, 6, 8, 11. Median 5.5; mean 6.','S-MEDIAN','even median and mean on unsorted data','sorted([8,2,11,5,6,4])==[2,4,5,6,8,11] and statistics.median([8,2,11,5,6,4])==F(11,2) and statistics.mean([8,2,11,5,6,4])==6','The middle values are 5 and 6. Their mean is 5.5. The total is 36, and 36 ÷ 6 = 6.','Median 8','Averages the displayed middle values 11 and 5 without ordering.'),
 err('Luis finds the median of 9, 2, 6, 3 by averaging 2 and 6. He gets 4. What should he change?','Order 2, 3, 6, 9, then average 3 and 6. Median = 4.5.','4','Finds the displayed middle before ordering.','Put the values on separate cards and order them.'),
 ex('Find the mean of 3, 4, 5, and 8.',['The total is 3 + 4 + 5 + 8 = 20.','There are four values, so share 20 among four groups.','Mean = 20 ÷ 4 = 5. The deviations −2, −1, 0, 3 balance to zero.'],'5','statistics.mean([3,4,5,8])==5 and sum([-2,-1,0,3])==0'),
 fade('Ordered data are 1, 3, 6, 8. Complete: median = (3 + __) ÷ 2 = __.','6; 4.5','F(3+6,2)==F(9,2)'),
 rows(('Uses one dot per observation, including repeats.','Preserves data frequency.','Check that dot count equals data count.'),('Orders values before finding the middle.','Makes median a position measure.','Ask which values are on each side.'),('Uses redistribution or sum divided by count for mean.','Both describe fair sharing.','Accept both and relate the moved counters to the calculation.')),
 rows(('Omits repeated values in a dot plot.','Treats the display as a list of categories.','Cross out each raw value after plotting one dot.'),('Chooses one middle value in an even set.','Uses an odd-set rule.','Mark both middle values and find their midpoint.'),('Uses median for every total-sharing question.','Does not connect mean to a fixed total.','Redistribute real counters equally.')),
 ['Partner compare: How does your fair-share model match total divided by count?', 'Agree or disagree: A very large value always moves the median as much as the mean. Use our data.'],
 'The mean tells __. The median tells __.',dict(kind='dotplot',values=[1,2,2,3,4,4,5],labels=['books read','students'],caption='The seven values balance around 3.'),
 ['Orders all six values and gives median 5.5 and mean 6 with correct methods.','Orders correctly and uses both middle values, but makes one arithmetic slip.','Uses the unsorted middle, chooses one middle value, or divides the total by the wrong count.'])

s18=session(18,'Spread and box plots',['6.SP.A.2','6.SP.A.3','6.SP.B.5'],
 'Compare how data vary using range, IQR, and mean absolute deviation.',
 'Center describes a typical value. Spread describes how far values are apart or away from the center.',
 'Ordering data, mean, median, and absolute value.', ['data cards','ruler','number line'],
 vocab(('range','Largest value minus smallest value.','For 2, 4, 9, range is 7.'),('quartiles','Medians of the lower and upper halves of ordered data.','Exclude the middle value when the count is odd.'),('IQR','Upper quartile minus lower quartile.','Q3 = 9 and Q1 = 3 give IQR 6.'),('MAD','The mean of the distances from the mean.','Use positive distances before averaging.')),
 [p('Data are 3, 7, 8, 10, 12. Find the range.','9','S-RANGE','range','max([3,7,8,10,12])-min([3,7,8,10,12])==9','12 − 3 = 9.','12','Uses only the maximum.'),
 p('Find the five-number summary of 1, 3, 4, 6, 8, 9, 11. Exclude the median from each half.','Minimum 1; Q1 3; median 6; Q3 9; maximum 11','S-IQR','five-number summary with odd count','statistics.median([1,3,4])==3 and statistics.median([1,3,4,6,8,9,11])==6 and statistics.median([8,9,11])==9','The halves are 1, 3, 4 and 8, 9, 11. Their medians are 3 and 9.','Q1 = 3.5','Includes the overall median in a half under a different convention.'),
 p('Find the five-number summary and IQR of 1, 2, 4, 6, 8, 10, 12, 13.','1, 3, 7, 11, 13; IQR 8','S-IQR','five-number summary with even count; IQR','statistics.median([1,2,4,6])==3 and statistics.median([1,2,4,6,8,10,12,13])==7 and statistics.median([8,10,12,13])==11 and 11-3==8','The halves contain four values each. Average each half’s two middle values.','Q1 = 4; Q3 = 10','Splits the numerical range into quarters.',dict(kind='boxplot',values=[1,2,4,6,8,10,12,13],five_number=[1,3,7,11,13],caption='The box spans Q1 to Q3.')),
 p('Data are 2, 4, 6, 8. Find the mean, each distance from the mean, and the MAD.','Mean 5; distances 3, 1, 1, 3; MAD 2','S-MAD','MAD computed step by step','F(2+4+6+8,4)==5 and [abs(x-5) for x in [2,4,6,8]]==[3,1,1,3] and F(3+1+1+3,4)==2','Average the nonnegative distances: 8 ÷ 4 = 2.','MAD 0','Averages signed differences, which cancel.'),
 p('A box plot has five-number summary 0, 2.5, 5, 9, 12. Which interval represents the upper quarter? Does a longer interval mean more data?','Upper quarter: 9 to 12. No; each quarter represents about 25% of the data.','S-BOX','read box plot; lengths versus counts','12-9==3 and 9-5==4 and F(1,4)==F(25,100)','The plot groups data by ordered positions, not equal numerical lengths.','5 to 9 has more data because it is longer','Confuses spread with frequency.',dict(kind='boxplot',values=[0,2,3,4,6,8,10,12],five_number=[0,2.5,5,9,12],caption='Different interval lengths can hold equal shares.')),
 p('Compare A: 4, 4, 6, 6 and B: 1, 3, 7, 9. Find each mean and MAD. Which set is more spread out?','Both means 5. MAD A = 1, MAD B = 3. B is more spread out.','S-SPREAD','same center; different spreads','statistics.mean([4,4,6,6])==statistics.mean([1,3,7,9])==5 and F(sum(abs(x-5) for x in [4,4,6,6]),4)==1 and F(sum(abs(x-5) for x in [1,3,7,9]),4)==3','B’s values lie farther from the shared mean on average.','They have the same spread because their means match','Uses center alone to describe a distribution.'),
 p('Data are 1, 3, 4, 5, 6, 7, 9, 11. Replace 11 with 31. Compare the old and new range and IQR.','Range 10 to 30; IQR stays 4.5','S-SPREAD','outlier effect on range versus IQR','11-1==10 and 31-1==30 and statistics.median([6,7,9,11])-statistics.median([1,3,4,5])==F(9,2) and statistics.median([6,7,9,31])-statistics.median([1,3,4,5])==F(9,2)','Q1 is 3.5 and Q3 is 8 in both sets. The maximum changes, but these middle-half markers do not.','IQR increases by 20','Assumes every spread measure reacts the same way.')],
 p('For 1, 3, 3, 5, 7, 9, 11, 13, find Q1, the median, Q3, and the IQR. Show the two halves.','Q1 3; median 6; Q3 10; IQR 7','S-IQR','quartiles from ordered data rather than range','statistics.median([1,3,3,5])==3 and statistics.median([1,3,3,5,7,9,11,13])==6 and statistics.median([7,9,11,13])==10 and 10-3==7','Lower half: 1, 3, 3, 5. Upper half: 7, 9, 11, 13. Use each half’s median.','Q1 4; Q3 10; IQR 6','Divides the min-to-max interval into four equal lengths.'),
 err('Zoe averages −3, −1, 1, and 3 to find MAD. She gets 0. What should she average?','The distances 3, 1, 1, 3. Their mean is 2.','0','Signed deviations cancel instead of measuring distance.','Measure each gap from the mean with a ruler.'),
 ex('Find the IQR for 2, 4, 6, 8, 10, 12.',['Split the ordered data into 2, 4, 6 and 8, 10, 12.','The two half-medians are Q1 = 4 and Q3 = 10.','IQR = 10 − 4 = 6.'],'6','statistics.median([2,4,6])==4 and statistics.median([8,10,12])==10 and 10-4==6'),
 fade('Data are 3, 5, 7, 9. Mean = 6. Distances are 3, __, __, 3. MAD = __.','1; 1; 2','[abs(x-6) for x in [3,5,7,9]]==[3,1,1,3] and F(8,4)==2'),
 rows(('Splits the ordered list by count.','Finds quartiles from data positions.','Count the values in each half.'),('Uses distances for MAD.','Prevents cancellation.','Ask why every gap is nonnegative.'),('Explains spread with numbers or a plot.','Both provide evidence beyond the center.','Accept either and connect the displayed gaps to the measure.')),
 rows(('Splits the range into four equal lengths.','Confuses numerical intervals with data quarters.','Place each value on a card and divide the cards.'),('Averages signed deviations.','Finds balance rather than distance.','Replace each difference with its absolute value.'),('Says a longer box segment has more data.','Treats length like a frequency bar.','Count positions represented by each quarter.')),
 ['Partner compare: Why can two sets share a mean but have different MADs?', 'Agree or disagree: A long quarter of a box plot must contain more observations.'],
 'IQR measures __. MAD measures __.',dict(kind='boxplot',values=[1,2,4,6,8,10,12,13],five_number=[1,3,7,11,13],caption='The median splits the ordered data. Quartiles split each half.'),
 ['Gives Q1 3, median 6, Q3 10, IQR 7 and splits by data count.','Splits the data correctly but makes one median or subtraction error.','Splits the range into equal lengths, uses unordered halves, or cannot identify the middle two values.'])

s19=session(19,'Scale and proportional relationships',['7.G.A.1','7.RP.A.1','7.RP.A.2'],
 'Use scale factors and identify relationships with a constant rate per one.',
 'A scaled copy multiplies every length by the same factor. Proportional relationships have the form y = kx.',
 'Ratios, unit rates, rectangle area, and coordinate graphs.', ['grid paper','ruler','paper rectangles'],
 vocab(('scale factor','The multiplier from an original length to a copy length.','A factor of 2 doubles every length.'),('scaled copy','A shape with matching angles and one multiplier for every length.','A 2 by 3 rectangle becomes 4 by 6.'),('constant of proportionality','The same y per one x in a proportional relationship.','For y = 4x, k = 4.'),('proportional','Related by a fixed multiplier with zero matched to zero.','At $3 each, cost = 3 × item count.')),
 [p('A 4 cm by 6 cm rectangle is copied with scale factor 2. Find the new side lengths and compare areas.','8 cm by 12 cm; area 24 to 96 square cm, factor 4','P-SCALE','whole-number scale factor; area factor squared','4*2==8 and 6*2==12 and 4*6==24 and 8*12==96 and F(96,24)==4','Both dimensions double, so four originals fit in the copy.','Area 48 square cm','Applies the length factor once to area.'),
 p('A triangle has side lengths 6, 8, and 10 cm. Copy it with scale factor {1/2}. Find its side lengths. What happens to its angles?','3, 4, 5 cm; corresponding angles stay equal','P-SCALE','fractional scale factor; unchanged angles','[F(1,2)*x for x in [6,8,10]]==[3,4,5] and 6**2+8**2==10**2 and 3**2+4**2==5**2','Multiply every length by one half. Matching sides have the same ratio.','5, 7, 9 cm','Subtracts one from each length instead of multiplying.'),
 p('A map uses 1 cm for 25 km. Two towns are 3.6 cm apart on the map. Find their actual distance.','90 km','P-MAP','map scale with units; decimal length',"D('3.6')*25==90",'Each map centimeter represents 25 km, so multiply 3.6 × 25.','0.144 km','Reverses map and actual units.'),
 p('A drawing has area 5 square cm. A scaled copy has all lengths three times as large. Find its area.','45 square cm','P-SCALE','area multiplier is square of length multiplier','5*3**2==45','There are three times as many units in each of two directions: factor 9.','15 square cm','Uses the length factor for area.'),
 p('A table pairs x = 1, 2, 4 with y = 2.5, 5, 10. Find k and write y = kx.','k = 2.5; y = 2.5x','P-PROP','proportional table; unit rate; equation',"all(F(str(y))/x==F('2.5') for x,y in [(1,2.5),(2,5),(4,10)])",'Each y divided by its x gives 2.5.','k = 0.4','Finds x per y instead of y per x.'),
 p('Compare two straight-line graphs: A passes through (0, 0), (1, 2), (2, 4). B passes through (0, 3), (1, 5), (2, 7). Which is proportional?','A: y = 2x. B is not proportional because it starts at 3 when x = 0.','P-PROP','graph through origin versus nonzero intercept','all(y==2*x for x,y in [(0,0),(1,2),(2,4)]) and all(y==2*x+3 for x,y in [(0,3),(1,5),(2,7)]) and F(5,1)!=F(7,2)','Both have equal increases, but only A has zero output for zero input.','Both, because both increase by 2','Mistakes constant differences for a constant ratio.',dict(kind='coordinate',points=[[0,0],[1,2],[2,4]],second_points=[[0,3],[1,5],[2,7]],labels=['x','y'],range=[0,8],caption='Graph A starts at zero. Graph B starts at 3.')),
 p('A ride costs $4 to start and $3 per mile. Write cost c for m miles. Is it proportional?','c = 3m + 4; not proportional','P-PROP','non-proportional story with fixed fee','3*0+4==4 and F(3*1+4,1)!=F(3*2+4,2)','At zero miles the cost is $4. Cost per mile changes as the fee is spread out.','c = 7m','Treats the starting fee as a per-mile charge.'),
 p('A faucet fills {3/4} liter in {1/2} minute at a constant rate. Write liters L after t minutes.','L = 1.5t, or L = ({3/2})t','P-PROP','fractional unit rate; equation from a story','F(3,4)/F(1,2)==F(3,2)','Double the half-minute amount to get 1.5 liters per minute.','L = ({2/3})t','Reverses liters per minute and minutes per liter.')],
 p('A table pairs x = 1, 3, 5 with y = 5, 11, 17. Is y proportional to x? Support your answer with ratios or the value at zero.','No. Ratios 5, {11/3}, {17/5} differ. The rule y = 3x + 2 gives y = 2 at zero.','P-PROP','constant difference does not prove proportionality','len({F(5,1),F(11,3),F(17,5)})==3 and all(y==3*x+2 for x,y in [(1,5),(3,11),(5,17)])','The change in y is always 6 when x increases by 2, but the ratio y to x is not constant.','Yes, y increases by 6 each time','Uses additive pattern instead of a constant multiplier.'),
 err('Eli triples every length of a drawing. He says its area also triples. Explain and repair his claim.','The area is multiplied by 9 because both dimensions are tripled.','Area triples','Applies one length multiplier to a two-dimensional measure.','Tile a 3 by 3 array of original rectangles.'),
 ex('A copy of a 3 cm by 5 cm rectangle uses scale factor 2.',['The new lengths are 6 cm and 10 cm.','The original area is 15 square cm; the copy area is 60 square cm.','The area factor is 60 ÷ 15 = 4 = 2².'],'6 by 10 cm; area 60 square cm','3*2==6 and 5*2==10 and 6*10==60 and F(60,15)==4'),
 fade('A proportional relationship has (x, y) = (4, 14). Complete: k = 14 ÷ __ = __, so y = __x.','4; 3.5; 3.5','F(14,4)==F(7,2)'),
 rows(('Uses the same multiplier on every side.','Preserves the shape and angles.','Ask for a ratio for each matching side.'),('Squares the scale factor for area.','Accounts for two dimensions.','Count rows and columns of original copies.'),('Tests ratios or the zero point.','Both can disprove proportionality.','Accept either clear counterexample.')),
 rows(('Adds the same amount to every length.','Confuses additive change with scaling.','Compare each copy-to-original ratio.'),('Uses the length factor for area.','Counts one changing direction.','Build an array of scaled unit squares.'),('Calls any straight line proportional.','Misses the origin requirement.','Find the output when the input is zero.')),
 ['Partner compare: Where does the squared area factor appear in your drawing?', 'Agree or disagree: Equal changes in a table are enough to prove proportionality.'],
 'A proportional relationship has __ for every nonzero input and passes through __.',dict(kind='coordinate',points=[[0,0],[1,2],[2,4],[3,6]],labels=['x','y'],range=[0,7],caption='The straight line y = 2x passes through the origin.'),
 ['Says no and shows unequal y-to-x ratios or the nonzero intercept 2.','Says no with a correct idea but incomplete ratio calculation or explanation.','Says yes because both columns increase by constant amounts.'])

s20=session(20,'Circles and first previews',['7.G.B.4','7.RP.A.3 (preview)','7.NS.A.1 (preview)'],
 'Find circle measures and connect percent change and signed steps to earlier models.',
 'Circumference measures the boundary. Circle area uses the square of the radius. π is exact; 3.14 is an approximation.',
 'Area, squares, percent of a whole, and negative-number order.', ['round lid','string','ruler','number line'],
 vocab(('radius','Distance from the center to the circle.','A radius of 3 cm gives diameter 6 cm.'),('diameter','Distance across the circle through its center.','Diameter = 2 × radius.'),('circumference','The distance around a circle.','C = πd'),('π','The ratio of a circle’s circumference to its diameter.','π is about 3.14, not exactly 3.14.')),
 [p('A circle has diameter 8 cm. Find its circumference in terms of π and using 3.14.','8π cm; about 25.12 cm','G-CIRCLE','circumference from diameter; exact and approximate',"8*D('3.14')==D('25.12')",'C = πd = 8π. Approximate with 8 × 3.14.','64π cm','Uses a squared length for a boundary.',dict(kind='circle',dimensions=[4],values=[4],labels=['diameter 8 cm'],caption='The diameter goes through the center.')),
 p('A circle has radius 3 cm. Find its diameter and circumference in terms of π.','Diameter 6 cm; circumference 6π cm','G-CIRCLE','circumference from radius','2*3==6','Double the radius before multiplying by π.','3π cm','Uses the radius as the diameter.'),
 p('Find the area of a circle with radius 4 cm. Give an exact answer and an approximation using 3.14.','16π square cm; about 50.24 square cm','G-CIRCLE','area from radius; exact and approximate',"4**2==16 and 16*D('3.14')==D('50.24')",'A = πr². Square the radius first, then multiply by π.','8π square cm','Uses circumference as area.'),
 p('A circle has diameter 6 cm. Find its area in terms of π and using 3.14.','9π square cm; about 28.26 square cm','G-CIRCLE','area from diameter; halve first',"F(6,2)==3 and 3**2==9 and 9*D('3.14')==D('28.26')",'The radius is 3 cm, so A = π × 3² = 9π.','36π square cm','Squares the diameter.'),
 p('Circle A has diameter 4 cm and circumference 4π cm. Circle B has diameter 10 cm and circumference 10π cm. Compare C ÷ d.','Both ratios equal π','G-CIRCLE','constant circumference-to-diameter ratio','F(4,4)==F(10,10)==1','Each circumference is π times its diameter. Dividing by the diameter leaves π.','The larger circle has the larger ratio','Confuses a larger circumference with a larger ratio.'),
 p('A collection grows from 80 cards to 100. Find the percent increase. Then find the percent decrease from 100 back to 80.','25% increase; 20% decrease','P-CHANGE','percent increase and decrease; original whole','F(100-80,80)*100==25 and F(100-80,100)*100==20','The same change of 20 is compared with different starting amounts.','25% for both','Uses the first starting value for both changes.'),
 p('Start with 80 tokens. Increase by 25%, then decrease the result by 25%. Find the final amount. Explain why it is not 80.','75 tokens; the decrease uses the larger whole 100','P-CHANGE','equal percent increase and decrease do not cancel','80*F(125,100)==100 and 100*F(75,100)==75','First add 20. Then subtract 25 from 100. The percent applies to a new starting amount.','80 tokens','Assumes equal percentages are equal amounts.'),
 p('Use steps on a number line for −2 + 5, −3 + (−4), and 2 − 6.','3; −7; −4','N-ADD','positive addend; negative addend; subtraction across zero','-2+5==3 and -3+(-4)==-7 and 2-6==-4','A positive addend moves right. A negative addend or subtracting a positive moves left.','7 for −2 + 5','Adds distances without direction.',dict(kind='numberline',values=[-2,3],min=-8,max=6,labels=['start −2','finish 3'],caption='Adding 5 moves five units to the right.'))],
 p('A circle has diameter 12 cm. Find its area in terms of π and using 3.14. Show the radius you used.','Radius 6 cm; area 36π square cm; about 113.04 square cm','G-CIRCLE','area from diameter; distinguish radius',"F(12,2)==6 and 6**2==36 and 36*D('3.14')==D('113.04')",'Half of 12 is 6. A = π × 6² = 36π.','144π square cm','Squares the diameter instead of the radius.',dict(kind='circle',dimensions=[6],values=[6],labels=['diameter 12 cm'],caption='Find the radius before the area.')),
 err('Maya finds area from a diameter of 14 cm by writing π × 14² = 196π. Explain and repair it.','Radius = 7 cm, so area = 49π square cm.','196π square cm','Uses diameter where the formula requires radius.','Mark the center and split the diameter into two equal radii.'),
 ex('Find area when a circle’s diameter is 10 m.',['The radius is half the diameter: 5 m.','Square the radius: 5² = 25.','Area = 25π square m, or about 78.5 square m using 3.14.'],'25π square m; about 78.5 square m',"F(10,2)==5 and 5**2==25 and 25*D('3.14')==D('78.5')"),
 fade('A circle has diameter 16 cm. Complete: radius = __; area = π × __² = __π square cm.','8; 8; 64','F(16,2)==8 and 8**2==64'),
 rows(('Marks the center and halves the diameter.','Keeps the area input correct.','Ask which segment runs from center to circle.'),('Names linear versus square units.','Separates circumference from area.','Trace the edge, then shade the interior.'),('Uses a percent table or a tape to track the new whole.','Both models can show why changes do not cancel.','Accept either and label the starting amount for each step.')),
 rows(('Squares the diameter.','Uses the given number without identifying it.','Mark two equal radii along the diameter.'),('Writes π = 3.14 exactly.','Confuses approximation with an exact constant.','Keep the π form and label the decimal answer about.'),('Cancels equal percent increases and decreases.','Ignores the changed whole.','Write the starting amount beside each percent calculation.')),
 ['Partner compare: How can the units tell us which circle formula fits?', 'Agree or disagree: A 25% increase and a 25% decrease return to the start. Use 80 tokens.'],
 'For circle area, I first identify __. A percent change compares the change with __.',dict(kind='circle',dimensions=[4],values=[4],labels=['radius 4','diameter 8'],caption='A diameter contains two radii.'),
 ['Uses radius 6 and gives 36π square cm and about 113.04 square cm.','Halves the diameter and squares the radius but makes one arithmetic or unit slip.','Uses 12 as the radius, uses circumference, or treats 3.14 as an exact value.'])

# A separate, labeled bank supports spiral packets without reusing exit tickets.
def bank6():
 b=[]
 for k,a in [(2,7),(3,6),(4,5)]:
  b.append(p(f'Expand {k}(x + {a}).',f'{k}x + {k*a}','E-DIST','distribute both terms',f'all({k}*(x+{a})=={k}*x+{k*a} for x in range(10))',f'Multiply x and {a} by {k}.',f'{k}x + {a}','Multiplies only the first term.'))
 for base,e in [(5,2),(2,4),(3,2)]:
  b.append(p(f'Find {base}^{e}. Write the repeated factors.',str(base**e),'E-EXP','whole-number exponent',f'{base}**{e}=={base**e}',f'Multiply {e} factors of {base}.',str(base*e),'Multiplies the base by the exponent.'))
 for k,a,x in [(4,3,2),(2,7,5),(3,1,4)]:
  b.append(p(f'Find {k}n + {a} when n = {x}.',str(k*x+a),'E-EVAL','evaluate an expression',f'{k}*{x}+{a}=={k*x+a}',f'{k} × {x} + {a} = {k*x+a}.'))
 for count in [3,6,8]:
  b.append(p(f'Each pack has b beads. Write the total in {count} packs. Find it when b = 4.',f'{count}b; {count*4} beads','E-EXPR','story to expression',f'{count}*4=={count*4}',f'{count} equal groups of b give {count}b.'))
 for q,a in [(23,9),(31,14),(18,11)]:
  b.append(p(f'Solve x + {a} = {q}.',f'x = {q-a}','E-ADD','additive equation',f'{q-a}+{a}=={q}',f'Subtract {a} from both sides.'))
 for k,x in [(7,8),(6,9),(8,4)]:
  b.append(p(f'Solve {k}x = {k*x}.',f'x = {x}','E-MULT','whole-number multiplicative equation',f'{k}*{x}=={k*x}',f'Divide both sides by {k}.',str(k*x-k),'Subtracts instead of dividing.'))
 for k,x in [('1.5','3.2'),('0.8','4.5')]:
  q=D(k)*D(x)
  b.append(p(f'Solve {k}x = {q}.',f'x = {x}','E-MULT','decimal multiplicative equation',f"D('{k}')*D('{x}')==D('{q}')",f'Divide both sides by {k}; then check the product.'))
 for num,den,x in [(3,4,16),(2,5,25)]:
  q=F(num,den)*x
  b.append(p(f'Solve ({{{num}/{den}}})x = {q}.',f'x = {x}','E-MULT','fractional coefficient',f'F({num},{den})*{x}==F({q.numerator},{q.denominator})',f'{num} equal parts total {q}. Find one part, then all {den}.'))
 for k,xs in [(4,[0,2,3]),(2,[1,3,5])]:
  ys=[k*x for x in xs]
  b.append(p(f'Use y = {k}x for x = {", ".join(map(str,xs))}. Give the ordered pairs.',', '.join(f'({x}, {y})' for x,y in zip(xs,ys)),'E-RELATE','equation to table',f'[{k}*x for x in {xs}]=={ys}',f'Multiply each input by {k}.'))
 return b

def bank7():
 b=[]
 for a,h in [(7,3),(8,2),(6,F(3,2))]:
  ans=a*h; hs='{3/2}' if isinstance(h,F) else str(h)
  b.append(p(f'A rectangle is {a} cm by {hs} cm. Find its area.',f'{ans} square cm','G-AREA','rectangle area',f'F({a})*F({str(h)!r})==F({str(ans)!r})',f'Multiply the two perpendicular side lengths.'))
 for a,h,side in [(9,4,5),(8,3,5),(6,8,10)]:
  b.append(p(f'A parallelogram has base {a}, height {h}, and slanted side {side} cm. Find its area.',f'{a*h} square cm','G-PARA','perpendicular height versus slanted side',f'{a}*{h}=={a*h} and {side}**2>{h}**2',f'Use base × perpendicular height: {a} × {h}.',str(a*side),'Uses the slanted side.'))
 for a,h in [(9,4),(7,6),(5,8)]:
  ans=F(a*h,2)
  b.append(p(f'A triangle has base {a} cm and height {h} cm. Find its area.',f'{ans} square cm','G-TRI','triangle area',f'F(1,2)*{a}*{h}=={ans}',f'Half of {a} × {h} is {ans}.',str(a*h),'Omits the half.'))
 for a,h,ca,ch in [(9,5,2,3),(7,6,2,2),(10,4,3,1)]:
  ans=a*h-ca*ch
  b.append(p(f'A {a} by {h} cm rectangle loses a {ca} by {ch} cm corner. Find the remaining area.',f'{ans} square cm','G-COMP','composite area by subtraction',f'{a}*{h}-{ca}*{ch}=={ans}',f'Subtract the corner area from the full rectangle.'))
 for a,c,h in [(2,3,5),(3,3,4),(2,4,6),(1,4,5)]:
  ans=2*(a*c+a*h+c*h)
  b.append(p(f'Find the surface area of a closed {a} by {c} by {h} cm box.',f'{ans} square cm','G-SA','rectangular prism surface area',f'2*({a}*{c}+{a}*{h}+{c}*{h})=={ans}',f'Two faces of each type: 2 × ({a*c} + {a*h} + {c*h}).',str(a*c*h),'Uses volume.'))
 for length in [4,6,9]:
  ans=12+12*length
  b.append(p(f'A prism has right-triangle ends with sides 3, 4, 5 cm and length {length} cm. Find surface area.',f'{ans} square cm','G-SA','triangular prism surface area',f'2*F(1,2)*3*4+{length}*(3+4+5)=={ans}',f'Two ends give 12 square cm. The three rectangles give {12*length}.',str(ans-6),'Omits one triangular end.'))
 for side,h in [(4,3),(6,5),(8,5)]:
  ans=side**2+2*side*h
  b.append(p(f'A square pyramid has base side {side} cm and triangular-face height {h} cm. Find surface area.',f'{ans} square cm','G-SA','square pyramid surface area',f'{side}**2+4*F(1,2)*{side}*{h}=={ans} and {h}**2>F({side},2)**2',f'Add the square base and four half-base-times-height triangles.'))
 for side in [2,4]:
  b.append(p(f'A closed cube has side {side} cm. Jo counts five faces and gets {5*side**2} square cm. Repair the total.',f'{6*side**2} square cm','G-SA','missing face error',f'6*{side}**2=={6*side**2}',f'Six faces are needed. Each has area {side**2}.',str(5*side**2),'Leaves out the hidden face.'))
 return b

def bank8():
 b=[]
 for vals in [[-7,2,-1],[-4,0,-9],[-3,1,-6],[-2,4,-5]]:
  ans=sorted(vals)
  b.append(p(f'Order {", ".join(str(x).replace("-","−") for x in vals)} from least to greatest.',', '.join(str(x).replace('-','−') for x in ans),'N-ORDER','order signed integers',f'sorted({vals})=={ans}','Read the numbers from left to right on a number line.'))
 for x in [-12,5,-3,0]:
  b.append(p(f'Find |{str(x).replace("-","−")}| and describe it as a distance.',f'{abs(x)} units from zero','N-ABS','absolute value as distance',f'abs({x})=={abs(x)}','Count the unit steps between the number and zero.'))
 for x in [-6,4,-1,9]:
  b.append(p(f'Find the opposite of {str(x).replace("-","−")}.',str(-x).replace('-','−'),'N-OPP','opposite',f'-({x})=={-x}','Reflect the point across zero.'))
 for x,y,axis in [(-3,4,'y'),(2,-5,'x'),(-4,-2,'y')]:
  ans=(-x,y) if axis=='y' else (x,-y)
  b.append(p(f'Reflect ({x}, {y}) across the {axis}-axis.',str(ans).replace('-','−'),'N-REFLECT','axis reflection',f'{ans}=={(-x,y) if axis=="y" else (x,-y)}',f'Keep the coordinate along the {axis}-axis fixed; change the other sign.'))
 for x1,y1,x2,y2 in [(-4,2,3,2),(1,-5,1,4),(-2,-3,-2,2)]:
  ans=abs(x2-x1)+abs(y2-y1)
  b.append(p(f'Find the distance from ({x1}, {y1}) to ({x2}, {y2}).',f'{ans} units','N-DIST','horizontal or vertical distance',f'abs({x2}-({x1}))+abs({y2}-({y1}))=={ans}','One coordinate stays fixed. Count the gap in the other coordinate.'))
 for text,ans,k,op in [('at least 9','x ≥ 9',9,'>='),('less than 5','x < 5',5,'<'),('no more than 12','x ≤ 12',12,'<=')]:
  included=op!='<'
  b.append(p(f'Write an inequality for x that means {text}. Is the boundary included?',ans+('; yes' if included else '; no'),'E-INEQ','word inequality and boundary',f'bool({k}{op}{k})=={included}', 'Use a closed circle if equality is allowed; otherwise use an open circle.'))
 for w,h in [(4,3),(6,2),(5,4)]:
  b.append(p(f'A rectangle runs from x = −2 to x = {w-2}, and y = −1 to y = {h-1}. Find perimeter.',f'{2*(w+h)} units','N-DIST','coordinate rectangle perimeter',f'2*(({w-2}-(-2))+({h-1}-(-1)))=={2*(w+h)}',f'The side lengths are {w} and {h}. Add two of each.'))
 # Explicitly taught in weekday material, not inserted into the weekend session.
 for a,c in [(12,18),(8,20)]:
  ans=math.gcd(a,c)
  b.append(p(f'List common factors of {a} and {c}. Find the greatest common factor.',f'Common factors: {", ".join(str(x) for x in range(1,min(a,c)+1) if a%x==c%x==0)}; GCF {ans}','N-GCF','basic greatest common factor',f'math.gcd({a},{c})=={ans}','List factors of both numbers and choose the greatest shared one.'))
 for a,c in [(4,6),(6,8)]:
  ans=math.lcm(a,c)
  b.append(p(f'List multiples of {a} and {c}. Find the least positive common multiple.',f'LCM {ans}','N-LCM','basic least common multiple',f'math.lcm({a},{c})=={ans}','List positive multiples until the lists first meet.'))
 return b

def quart(data):
 a=sorted(data); n=len(a); mid=n//2
 return [a[0],statistics.median(a[:mid]),statistics.median(a),statistics.median(a[mid+(n%2):]),a[-1]]
def bank9():
 b=[]
 for vals in [[2,3,7,8],[1,4,5,6],[3,5,6,10]]:
  ans=F(sum(vals),len(vals))
  b.append(p(f'Find the mean of {", ".join(map(str,vals))}.',str(ans),'S-MEAN','mean',f'F(sum({vals}),len({vals}))==F({str(ans)!r})',f'Total {sum(vals)} divided by {len(vals)} values gives {ans}.'))
 for vals in [[9,1,5,3,7],[8,2,4,6],[10,3,5,7,2,9]]:
  ans=F(statistics.median(vals))
  b.append(p(f'Find the median of {", ".join(map(str,vals))}.',str(float(ans)) if ans.denominator!=1 else str(ans),'S-MEDIAN','median after ordering',f'F(statistics.median({vals}))==F({str(ans)!r})',f'Order: {", ".join(map(str,sorted(vals)))}. Use the middle value or mean of two middles.'))
 for vals,mean in [([2,4,7],5),([3,6,8],6),([4,5,9],7)]:
  ans=4*mean-sum(vals)
  b.append(p(f'Four scores have mean {mean}. Three are {", ".join(map(str,vals))}. Find the fourth.',str(ans),'S-MEAN','missing value for given mean',f'F(sum({vals})+{ans},4)=={mean}',f'The total is {4*mean}; subtract the known total {sum(vals)}.'))
 for vals,target in [([1,1,2,3,3,3,4],3),([0,2,2,2,4,5],2),([1,2,4,4,5,6,6],4)]:
  ans=vals.count(target)
  b.append(p(f'Data are {", ".join(map(str,vals))}. How many dots belong above {target} in a dot plot?',str(ans),'S-DISPLAY','frequency in a dot plot',f'{vals}.count({target})=={ans}',f'Count every occurrence of {target}.'))
 for vals in [[2,5,8,11],[3,4,6,9,15],[0,2,5,10]]:
  ans=max(vals)-min(vals)
  b.append(p(f'Find the range of {", ".join(map(str,vals))}.',str(ans),'S-RANGE','range',f'max({vals})-min({vals})=={ans}',f'{max(vals)} − {min(vals)} = {ans}.'))
 for vals in [[1,2,4,5,7,8,10,11],[2,3,5,6,8,10,12],[0,2,3,5,7,9,10,12]]:
  q=quart(vals); ans=F(q[3])-F(q[1])
  b.append(p(f'Find Q1, Q3, and IQR for {", ".join(map(str,vals))}. Exclude the median if the count is odd.',f'Q1 {q[1]}; Q3 {q[3]}; IQR {float(ans) if ans.denominator!=1 else ans}','S-IQR','quartiles and IQR',f'F(statistics.median({sorted(vals)[:len(vals)//2]}))==F({str(q[1])!r}) and F(statistics.median({sorted(vals)[len(vals)//2+len(vals)%2:]}))==F({str(q[3])!r}) and F({str(q[3])!r})-F({str(q[1])!r})==F({str(ans)!r})','Split the ordered list into equal-count halves. Subtract the two half-medians.'))
 for vals in [[1,3,5,7],[2,5,5,8],[3,3,9,9]]:
  mean=F(sum(vals),len(vals)); ans=sum(abs(F(x)-mean) for x in vals)/len(vals)
  b.append(p(f'Find the MAD of {", ".join(map(str,vals))}.',str(ans),'S-MAD','mean absolute deviation',f'sum(abs(F(x)-F({str(mean)!r})) for x in {vals})/len({vals})==F({str(ans)!r})',f'Mean {mean}. Average the distances from {mean}.','0','Averages signed differences instead of distances.'))
 for center in [4,6,8]:
  a=[center-1,center,center+1]; c=[center-3,center,center+3]
  b.append(p(f'A: {", ".join(map(str,a))}. B: {", ".join(map(str,c))}. Compare their means and ranges.',f'Both means {center}. Range A 2; range B 6. B is more spread out.','S-SPREAD','same center; compare spread',f'statistics.mean({a})==statistics.mean({c})=={center} and max({a})-min({a})==2 and max({c})-min({c})==6','Find the center, then compare the endpoint gaps.'))
 return b

def bank10():
 b=[]
 for a,c,k in [(3,4,2),(5,6,3),(8,12,F(1,2))]:
  ks='{1/2}' if isinstance(k,F) else str(k)
  b.append(p(f'A {a} by {c} cm rectangle is copied with scale factor {ks}. Find the new side lengths.',f'{a*k} cm and {c*k} cm','P-SCALE','scaled side lengths',f'{a}*F({str(k)!r})==F({str(a*k)!r}) and {c}*F({str(k)!r})==F({str(c*k)!r})','Multiply both lengths by the same factor.'))
 for scale,distance in [(20,4),(30,3),(50,2)]:
  b.append(p(f'A map uses 1 cm for {scale} km. A route is {distance} cm long. Find the actual distance.',f'{scale*distance} km','P-MAP','map scale',f'{scale}*{distance}=={scale*distance}',f'{distance} map centimeters represent {distance} groups of {scale} km.'))
 for area,k in [(6,2),(8,3),(20,F(1,2))]:
  ans=area*k*k;ks='{1/2}' if isinstance(k,F) else str(k)
  b.append(p(f'A shape has area {area} square cm. All lengths scale by {ks}. Find the new area.',f'{ans} square cm','P-SCALE','area factor squared',f'{area}*F({str(k)!r})**2==F({str(ans)!r})','Multiply area by the square of the scale factor.'))
 for k,x in [(3,4),(F(3,2),6),(F(5,2),4)]:
  y=k*x;ks=str(float(k)) if isinstance(k,F) else str(k)
  b.append(p(f'A proportional table contains ({x}, {y}). Find k in y = kx.',f'k = {ks}','P-PROP','constant of proportionality',f'F({str(y)!r})/{x}==F({str(k)!r})','Divide the output by the input.'))
 for d in [3,5,7]:
  approx=D(d)*D('3.14')
  b.append(p(f'A circle has diameter {d} cm. Find circumference exactly and using 3.14.',f'{d}π cm; about {approx} cm','G-CIRCLE','circumference from diameter',f"D({d})*D('3.14')==D('{approx}')",'Use C = πd.'))
 for r in [2,5,6]:
  coeff=2*r;approx=D(coeff)*D('3.14')
  b.append(p(f'A circle has radius {r} cm. Find circumference exactly and using 3.14.',f'{coeff}π cm; about {approx} cm','G-CIRCLE','circumference from radius',f"2*{r}=={coeff} and D({coeff})*D('3.14')==D('{approx}')",'Double the radius for the diameter, then multiply by π.'))
 for r in [2,3,5]:
  coeff=r*r;approx=D(coeff)*D('3.14')
  b.append(p(f'A circle has radius {r} cm. Find area exactly and using 3.14.',f'{coeff}π square cm; about {approx} square cm','G-CIRCLE','area from radius',f"{r}**2=={coeff} and D({coeff})*D('3.14')==D('{approx}')",'Square the radius, then multiply by π.'))
 for d in [4,8,14]:
  r=d//2;coeff=r*r;approx=D(coeff)*D('3.14')
  b.append(p(f'A circle has diameter {d} cm. Find area exactly and using 3.14.',f'{coeff}π square cm; about {approx} square cm','G-CIRCLE','area from diameter',f"{d}//2=={r} and {r}**2=={coeff} and D({coeff})*D('3.14')==D('{approx}')",'Halve the diameter, square the radius, then multiply by π.',f'{d*d}π square cm','Squares the diameter.'))
 return b

weeks=[
 dict(week=6,title='Expressions and equations',big_idea='Expressions name quantities. Equivalent forms describe the same quantity. Equations can be solved by keeping both sides equal.',connections='Ratios and fraction division help solve equations. These same equations will describe proportional relationships.',omissions='Core one-step equations only. Multi-step rational equations, formal inequalities with several steps, and a full survey of algebraic properties are deferred.',sessions=[s11,s12],bank=bank6(),teaser=p('Two whole numbers total 17. One is 5 more than the other. Find both numbers and show a way to check.','6 and 11','E-STORY','reasoning puzzle with sum and difference','[(a,17-a) for a in range(18) if (17-a)-a==5]==[(6,11)]','Remove the extra 5: 17 − 5 = 12. Split the rest equally: 6 and 6. Restore 5 to one number.','5 and 12','Uses the difference as one of the numbers.')),
 dict(week=7,title='Area and surface area',big_idea='Area counts square units that cover a surface. Cutting and rearranging reveal triangle and parallelogram formulas. A net helps count every face of a solid.',connections='Multiplication and fraction multiplication measure flat regions. Nets connect those regions to three-dimensional solids.',omissions='Surface area is limited to rectangular prisms, right triangular prisms, and square pyramids. Non-square pyramid bases, cylinders, and complex composite solids are deferred.',sessions=[s13,s14],bank=bank7(),teaser=p('A rectangle has whole-number side lengths, perimeter 24 cm, and area 35 square cm. Find its side lengths.','5 cm and 7 cm','G-AREA','area and perimeter reasoning','[(a,b) for a in range(1,13) for b in range(a,13) if 2*(a+b)==24 and a*b==35]==[(5,7)]','The sides sum to 12. Test factor pairs of 35: 1 and 35 fail; 5 and 7 sum to 12.','3 cm and 8 cm','Checks neither condition completely.')),
 dict(week=8,title='Negative numbers, coordinates, and inequalities',big_idea='A signed number gives a position relative to zero. Coordinates use two such positions. Inequalities describe all positions that meet a condition.',connections='Number lines extend fraction and decimal ideas to negatives. Coordinates will show proportional relationships and data.',omissions='Signed-number operations remain previews. GCF and LCM receive short weekday instruction and basic practice, without elaborate word problems or prime-factor methods.',sessions=[s15,s16],bank=bank8(),teaser=p('A point lies left of the y-axis and above the x-axis. It is 3 units from the y-axis and 2 from the x-axis. Find it, then reflect it across both axes in turn.','Start (−3, 2); after y-axis (3, 2); after x-axis (3, −2)','N-REFLECT','coordinate reasoning puzzle','(-3,2)==(-abs(3),abs(2)) and (-(-3),-(2))==(3,-2)','The vertical axis measures horizontal distance. The horizontal axis measures vertical distance. Each reflection changes one sign.','(−2, 3)','Swaps the distances to the axes.')),
 dict(week=9,title='Data, center, and spread',big_idea='Data vary. Center describes a typical value, and spread describes the variation. A display makes both easier to see.',connections='Mean uses equal sharing, and MAD uses distance from zero. A cumulative check links these new ideas with earlier Grade 6 work.',omissions='Histograms use supplied, equal-width bins. Unequal bins, advanced outlier rules, inference, and alternate software quartile conventions are deferred. Quartiles use the median of each half, excluding the overall median for odd counts.',sessions=[s17,s18],bank=bank9(),teaser=p('Find two sets of five different whole numbers with minimum 2, maximum 12, median 5, and mean 6.','2, 3, 5, 8, 12 and 2, 4, 5, 7, 12','S-MEAN','data constraints puzzle','[(2,a,5,b,12) for a in range(3,5) for b in range(6,12) if 2+a+5+b+12==30]==[(2,3,5,8,12),(2,4,5,7,12)]','The total must be 30. Known values 2, 5, 12 total 19. The remaining values must total 11, with one below 5 and one above.','2, 5, 5, 6, 12','Repeats a number despite the distinct-value condition.')),
 dict(week=10,title='Scale, proportions, circles, and review',big_idea='A fixed multiplier connects scaled lengths and proportional quantities. Circle formulas use radius or diameter in different ways. The final weekdays revisit the entire program.',connections='The bridge joins ratios, equations, and geometry. Future lessons can revisit these ideas with more complex percent and signed-number problems.',omissions='Grade 7 work is a bridge, not a replacement course. Formal similarity proofs, extensive circle composites, full signed-number arithmetic, and multi-step equation fluency are deferred. Weekday packets are cumulative review.',sessions=[s19,s20],bank=bank10(),teaser=p('A garden is 3 cm by 4 cm on a map where 1 cm means 10 m. Redraw it where 1 cm means 20 m. Find the new drawing dimensions and the actual garden area.','New drawing: 1.5 cm by 2 cm. Actual area: 1,200 square m.','P-SCALE','scale and area capstone','F(3*10,20)==F(3,2) and F(4*10,20)==2 and (3*10)*(4*10)==1200','The garden is 30 m by 40 m. Divide those lengths by 20 for the new drawing. The garden itself stays the same.','600 square m','Changes the actual area when only the drawing scale changes.')),
]

weeks[2]['weekday_teaching']=[
 {'title':'Common factors','text':'A factor divides a whole number with no remainder. The greatest common factor is the largest shared factor. For 12 and 18, the common factors are 1, 2, 3, 6. GCF = 6.','check':'math.gcd(12,18)==6 and [x for x in range(1,13) if 12%x==18%x==0]==[1,2,3,6]'},
 {'title':'Common multiples','text':'A multiple is a whole-number product of a number. List positive multiples until the lists meet. Multiples of 4 begin 4, 8, 12. Multiples of 6 begin 6, 12. LCM = 12.','check':'math.lcm(4,6)==12'},
]
# Checks for every planted correction, distinct from the problem checks.
error_checks={11:'all(5*(z+2)==5*z+10 for z in range(12))',12:'6*7==42 and 6*36!=42',13:'F(1,2)*9*4==18 and 9*4==36',14:'6*9==54 and 5*9==45',15:'-10 < -3 and 10>3',16:'6>=6 and not (6>6)',17:'statistics.median([9,2,6,3])==F(9,2) and F(2+6,2)==4',18:'F(sum([3,1,1,3]),4)==2 and sum([-3,-1,1,3])==0',19:'3**2==9',20:'14//2==7 and 7**2==49 and 14**2==196'}
for w in weeks:
 for s in w['sessions']:
  s['error']['check']=error_checks[s['id']]
  if 'dimensions' in s['model']:s['model'].setdefault('values',s['model']['dimensions'])
  for pr in s['problems']+[s['exit']]:
   if 'diagram' in pr and 'dimensions' in pr['diagram']:pr['diagram'].setdefault('values',pr['diagram']['dimensions'])
 for i,pr in enumerate(w['bank']):
  pr['session']=w['sessions'][0 if i<12 else 1]['id']
  if w['week']==8 and i>=24:pr['session']=None

# Correct mixed exact numeric types before evaluating. Display notation stays stacked.
for obj in [s13]:
 for pr in obj['problems']:
  pr['check']=pr['check'].replace("F(1,2)*5*D('2.4')","F(1,2)*5*F('2.4')")
 obj['fade']['check']=obj['fade']['check'].replace("F(1,2)*8*D('2.5')","F(1,2)*8*F('2.5')")

import re

def normalize(obj):
 if isinstance(obj,dict):return {k:(v if k=='check' else normalize(v)) for k,v in obj.items()}
 if isinstance(obj,list):return [normalize(v) for v in obj]
 if isinstance(obj,str):
  obj=re.sub(r'(?<![\w{])(\d+)/(\d+)(?![\w}])',r'{\1/\2}',obj)
  obj=obj.replace('^2','²').replace('^3','³').replace('^4','⁴')
  return obj
 return obj
weeks=normalize(weeks)

def verify(obj,path='root'):
 count=0
 if isinstance(obj,dict):
  if 'check' in obj:
   try: ok=eval(obj['check'],dict(F=F,D=D,statistics=statistics,math=math))
   except Exception as e:raise RuntimeError((path,obj['check'],str(e)))
   assert ok,(path,obj['check'],obj.get('answer'))
   count+=1
  for k,v in obj.items():
   if k!='check':count+=verify(v,path+'.'+k)
 elif isinstance(obj,list):
  for i,v in enumerate(obj):count+=verify(v,path+f'[{i}]')
 return count
count=verify(weeks)
Path('work/weeks_6_10.json').write_text(json.dumps({'weeks':weeks},indent=2,ensure_ascii=False))
print(f'Wrote 5 weeks, 10 sessions, {sum(len(w["bank"]) for w in weeks)} bank problems; {count} checks passed.')
