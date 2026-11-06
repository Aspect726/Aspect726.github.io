from pdf_engine import *
def p(t,a,skill,check,worked='',wrong='',error=''):
 return dict(text=t,answer=str(a),skill=skill,case=skill,check=check,worked=worked,wrong=wrong,error=error)
def frac(v):
 v=F(v);return str(v.numerator) if v.denominator==1 else '{'+str(v)+'}'
def foundations(seed=1):
 a=seed%7+2;b=seed%5+2
 return [p(f'{a*12} ÷ {a}',12,'N-FACT',f'{a*12}/{a}==12'),p(f'{a} × {b}',a*b,'N-FACT',f'{a}*{b}=={a*b}'),p(f'{{1/{b}}} + {{1/{b}}}',frac(F(2,b)),'F-ADD',f'F(1,{b})+F(1,{b})==F(2,{b})'),p(f'{a}.5 + 0.25',str(D(a)+D('.75')),'D-OPS',f'D("{a}.5")+D(".25")==D("{a}.75")'),p(f'A box is {a} cm by {b} cm by 3 cm. Find its volume.',f'{a*b*3} cm³','G-VOL',f'{a}*{b}*3=={a*b*3}'),p(f'{a*100} ÷ 100',a,'N-SCALE',f'{a*100}/100=={a}')]
def warmup(w,d):
 a=w+2
 if d==1:return [p(f'{a} × {b}',a*b,'N-FACT',f'{a}*{b}=={a*b}') for b in [3,7,4,9]]
 if d==2:
  return [p(f'Write {frac(q)} as a decimal and a percent.',f'{float(q):g}; {float(q*100):g}%','F-EQUIV',f'F("{q}")*100==F("{q*100}")') for q in [F(1,2),F(1,4),F(3,4),F(1,8)]]
 if d==3:return [p(f'{a}.2 × 10',f'{a*10+2}','N-SCALE',f'D("{a}.2")*10=={a*10+2}'),p(f'{a*100} ÷ 100',a,'N-SCALE',f'{a*100}/100=={a}'),p(f'Double {a}.5',2*a+1,'N-SCALE',f'D("{a}.5")*2=={2*a+1}'),p(f'Half of {a*6}',a*3,'N-SCALE',f'{a*6}/2=={a*3}')]
 return [p(f'Round {a*100+48} to the nearest hundred.',a*100,'N-EST',f'{a*100+48}-{a*100}<50'),p(f'Round {a}.72 to the nearest whole number.',a+1,'N-EST',f'D("{a}.72").quantize(D("1"))=={a+1}'),p('Use 20 × 5 to estimate 19.8 × 5.1.','About 100','N-EST','20*5==100'),p('Use 60 ÷ 3 to estimate 59.4 ÷ 3.1.','About 20','N-EST','60/3==20')]
def diagnostic():
 ps=[p('426 × 23',9798,'N-MULT','426*23==9798'),p('1,368 ÷ 6',228,'N-DIV','1368//6==228'),p('2,184 ÷ 24',91,'N-DIV','2184//24==91'),p('4.65 + 13.8','18.45','D-OPS','D("4.65")+D("13.8")==D("18.45")'),p('8.1 − 3.47','4.63','D-OPS','D("8.1")-D("3.47")==D("4.63")'),p('0.7 × 0.4','0.28','D-OPS','D(".7")*D(".4")==D(".28")'),p('6.3 ÷ 0.9','7','D-OPS','D("6.3")/D(".9")==7'),p('{3/5} × {5/6}','{1/2}','F-MULT','F(3,5)*F(5,6)==F(1,2)'),p('{5/6} + {1/4}','1 {1/12}','F-ADD','F(5,6)+F(1,4)==F(13,12)'),p('How many {1/4}s fit in 3?',12,'F-DIV','F(3)/F(1,4)==12'),p('{1/5} ÷ 3','{1/15}','F-DIV','F(1,5)/3==F(1,15)'),p('2 {1/3} × 3',7,'F-MULT','F(7,3)*3==7'),p('Compare {4/9} and {1/2}.','{4/9} < {1/2}','F-COMP','F(4,9)<F(1,2)'),p('Place {3/4}, {4/3}, {5/8}, and 1 {1/2} on the line.','Left to right: {5/8}, {3/4}, {4/3}, 1 {1/2}','F-COMP','sorted([F(3,4),F(4,3),F(5,8),F(3,2)])==[F(5,8),F(3,4),F(4,3),F(3,2)]'),p('Order 0.6, 0.56, and 0.506 from least to greatest.','0.506, 0.56, 0.6','D-COMP','D(".506")<D(".56")<D(".6")'),p('A bag has 3 red tiles for every 2 blue. There are 15 red tiles. How many blue tiles?',10,'R-RATIO','15*F(2,3)==10','15 reds form five groups. Each group has 2 blues.'),p('Find 25% of 64.',16,'R-PERCENT','F(25,100)*64==16'),p('Evaluate 4n + 3 when n = 6.',27,'E-EXPR','4*6+3==27'),p('Morning temperature is −4°C. Noon is 2°C. How much warmer is noon?','6°C','N-SIGNED','2-(-4)==6'),p('A rectangle is {3/4} m long and {2/3} m wide. Find its area.','{1/2} m²','G-AREA','F(3,4)*F(2,3)==F(1,2)'),p('A box is 4 cm by 3 cm by 5 cm. Find its volume.','60 cm³','G-VOL','4*3*5==60'),p('Plot A(2, 4) and B(5, 4). How far apart are they?','3 units','N-COORD','abs(5-2)==3'),p('Explain why {2/3} × 9 is smaller than 9.','6 is two of three equal shares of 9. A factor between 0 and 1 scales down.','F-SCALE','F(2,3)*9==6 and 6<9'),p('Persistence problem. A pattern starts 2, 5, 9, 14. Each jump grows by 1. Find the next two terms.','20, 27','P-LOGIC','14+6==20 and 20+7==27','The jumps are 3, 4, 5, then 6 and 7.'),p('Persistence problem. Three boxes hold 18 tiles. Each box has two more than the box before it. Find the three counts.','4, 6, 8','P-LOGIC','4+6+8==18 and 6-4==8-6==2','Remove the extra 2 and 4. Divide the remaining 12 equally.')]
 ps[13]['diagram']={'kind':'numberline','min':0,'max':2,'ticks':8}
 ps[21]['diagram']={'kind':'coordinate','limit':5,'points':[]}
 facts=[]
 import random
 pairs=random.Random(73).sample([(a,b) for a in range(2,13) for b in range(2,13)],30)
 for a,b in pairs:
  facts.append(p(f'{a} × {b}',a*b,'N-FACT',f'{a}*{b}=={a*b}'))
 return ps,facts

def booster_sets():
 out={}
 out['01_Fractions']=[p(f'{frac(F(k%5+1,6))} + {frac(F(k%3+1,4))}',frac(F(k%5+1,6)+F(k%3+1,4)),'F-ADD',f'F({k%5+1},6)+F({k%3+1},4)==F("{F(k%5+1,6)+F(k%3+1,4)}")') if k%3==0 else p(f'Compare {frac(F(k%7+1,8))} and {frac(F(k%4+1,5))}.',f'{frac(F(k%7+1,8))} '+('<' if F(k%7+1,8)<F(k%4+1,5) else '>')+f' {frac(F(k%4+1,5))}','F-COMP',f'F({k%7+1},8) != F({k%4+1},5)') if k%3==1 else p(f'{frac(F(k%5+6,6))} − {frac(F(k%3+1,4))}',frac(F(k%5+6,6)-F(k%3+1,4)),'F-ADD',f'F({k%5+6},6)-F({k%3+1},4)==F("{F(k%5+6,6)-F(k%3+1,4)}")') for k in range(20)]
 out['02_Fraction_Operations']=[p(f'{frac(F(k%5+2,3))} '+('×' if k%2 else '÷')+f' {frac(F(k%4+1,5))}',frac(F(k%5+2,3)*F(k%4+1,5) if k%2 else F(k%5+2,3)/F(k%4+1,5)),'F-MULT' if k%2 else 'F-DIV',f'F({k%5+2},3){"*" if k%2 else "/"}F({k%4+1},5)==F("{F(k%5+2,3)*F(k%4+1,5) if k%2 else F(k%5+2,3)/F(k%4+1,5)}")') for k in range(20)]
 out['03_Decimals']=[p(f'{k+2}.4 '+('× 0.5' if k%2 else '+ 1.75'),str((D(k+2)+D('.4'))*D('.5') if k%2 else D(k+2)+D('2.15')),'D-OPS',f'D("{k+2}.4"){"*D(\".5\")" if k%2 else "+D(\"1.75\")"}==D("{(D(k+2)+D('.4'))*D('.5') if k%2 else D(k+2)+D('2.15')}")') for k in range(20)]
 out['04_Multi_Digit']=[p(f'{(k+12)*(k+3)} ÷ {k+3}',k+12,'N-DIV',f'{(k+12)*(k+3)}/{k+3}=={k+12}') if k%2 else p(f'{117+k*13} × {12+k}',(117+k*13)*(12+k),'N-MULT',f'{117+k*13}*{12+k}=={(117+k*13)*(12+k)}') for k in range(20)]
 out['05_Facts']=[p(f'{k%11+2} × {(k*7)%11+2}',(k%11+2)*((k*7)%11+2),'N-FACT',f'{k%11+2}*{(k*7)%11+2}=={(k%11+2)*((k*7)%11+2)}') for k in range(20)]
 out['06_Ratios']=[p(f'Red : blue = 3 : 4. Complete the pair ({3*(k+1)}, ___).',4*(k+1),'R-RATIO',f'{3*(k+1)}*F(4,3)=={4*(k+1)}') for k in range(20)]
 out['07_Percent']=[p(f'Find {10*(k%5+1)}% of {20*(k//5+1)}.',2*(k%5+1)*(k//5+1),'R-PERCENT',f'F({10*(k%5+1)},100)*{20*(k//5+1)}=={2*(k%5+1)*(k//5+1)}') for k in range(20)]
 out['08_Negatives']=[p(f'Which is greater, −{k+2} or −{k+5}? How far is −{k+2} from zero?',f'−{k+2}; distance {k+2}','N-SIGNED',f'-{k+2}>-{k+5} and abs(-{k+2})=={k+2}') for k in range(20)]
 out['09_Equations']=[p(f'Solve {k%5+2}x = {(k%5+2)*(k+1)}.',f'x = {k+1}','E-EQ',f'{(k%5+2)*(k+1)}/{k%5+2}=={k+1}') if k%2 else p(f'Solve x + {k+3} = {2*k+9}.',f'x = {k+6}','E-EQ',f'{2*k+9}-{k+3}=={k+6}') for k in range(20)]
 out['10_Area_Volume']=[p(f'A rectangle has sides {k+2} cm and 4 cm. Find its area.',f'{(k+2)*4} cm²','G-AREA',f'{k+2}*4=={(k+2)*4}') if k%2 else p(f'A box measures {k+2} cm by 3 cm by 2 cm. Find its volume.',f'{(k+2)*6} cm³','G-VOL',f'{k+2}*3*2=={(k+2)*6}') for k in range(20)]
 out['11_Puzzles']=[p(f'Three consecutive whole numbers add to {3*(k+5)}. Find them.',f'{k+4}, {k+5}, {k+6}','P-LOGIC',f'{k+4}+{k+5}+{k+6}=={3*(k+5)}','The middle number is one third of the sum.') for k in range(20)]
 return out
