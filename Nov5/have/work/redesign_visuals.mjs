import {C,box,rich,line,rect,ellipse,poly,diagram} from './deck_helpers_revised.mjs';
export {C,box,rich,line,rect,ellipse,poly,diagram};
export const V={pale:'#E5EDE9',paper:'#FFFFFF',brickPale:'#F5E6DC',grid:'#D4D7D0'};
export function tag(s,t,x,y,w=600,fs=22,color=C.gray){box(s,t,x,y,w,fs*1.6,fs,'Calibri',color);}
export function scaffold(s,ss,x,y,w,h,caption=true){
 const id=ss.id,q=ss.scaffoldProblem||{},skill=q.skill||'';
 if(id===9){const heads=['tens','ones','tenths','hundredths','thousandths'],cw=w/5;heads.forEach((v,i)=>{tag(s,w<400?['10','1','0.1','0.01','0.001'][i]:v,x+i*cw,y,cw,w<400?15:17,C.teal);for(let r=0;r<3;r++){line(s,x+i*cw+8,y+70+r*55,x+(i+1)*cw-14,y+70+r*55,V.grid,1.5);}});if(caption)tag(s,'Name the places. Line up equal units.',x,y+h-8,w,23,C.gray);}
 else if(id===11){for(const [i,l] of ['Quantity','Expression','Value'].entries()){tag(s,l,x,y+i*82,w,25,i===1?C.teal:C.gray);line(s,x+150,y+25+i*82,x+w,y+25+i*82,V.grid,1.5);} }
 else if(id===20&&/percent|%|increase|decrease/i.test(q.text||'')){for(let r=0;r<2;r++){const yy=y+h*(r?.65:.18);line(s,x,yy,x+w,yy,r?C.brick:C.teal,3);line(s,x,yy-7,x,yy+7);line(s,x+w,yy-7,x+w,yy+7);tag(s,r?'0':'0%',x,yy+15,80,25);tag(s,r?'whole':'100%',x+w-90,yy+15,110,25);tag(s,r?'amount':'percent',x,yy-35,w,25,r?C.brick:C.teal);}}
 else if([7,8].includes(id)){if(/volume|prism|box/i.test(q.text||'')){const xx=x+w*.15,yy=y+h*.2,ww=w*.55,hh=h*.45,dx=w*.15,dy=-h*.15;rect(s,xx,yy,ww,hh,'none',C.teal);poly(s,[[xx,yy],[xx+dx,yy+dy],[xx+ww+dx,yy+dy],[xx+ww,yy]],'none',C.teal);poly(s,[[xx+ww,yy],[xx+ww+dx,yy+dy],[xx+ww+dx,yy+hh+dy],[xx+ww,yy+hh]],'none',C.teal);if(caption)tag(s,'Label the edge lengths and units.',x,y+h-12,w,23,C.gray);}else{rect(s,x,y+h*.2,w,h*.3,'none',C.teal);tag(s,'total amount',x,y+h*.2-35,w,25,C.teal);if(caption)tag(s,'Mark one group. Compare it with the total.',x,y+h-12,w,23,C.gray);}}
 else if(id===15){line(s,x,y+h*.45,x+w,y+h*.45,C.teal,3);line(s,x+w/2,y+h*.45-10,x+w/2,y+h*.45+10);tag(s,'0',x+w/2-8,y+h*.45+20,60,25);if(caption)tag(s,'Choose a scale. Place the given numbers.',x,y+h-10,w,23,C.gray);}
 else if(id===1){const scaled=/ticks at 0, 2, and 4/.test(q.text||'');diagram(s,{kind:'numberline',min:0,max:scaled?4:2,ticks:scaled?2:8,blank:true},x+15,y,w-35,h*.7);if(caption)tag(s,'Choose one whole. Mark equal parts.',x,y+h-12,w,23,C.teal);}
 else if([2,9].includes(id)){const cols=id===9?10:4,rows=id===9?10:3,ww=Math.min(w*.8,h*1.1),hh=Math.min(h*.78,ww*.65);for(let a=0;a<cols;a++)for(let b=0;b<rows;b++)rect(s,x+a*ww/cols,y+b*hh/rows,ww/cols,hh/rows,'none',V.grid);if(caption)tag(s,id===9?'One whole = 100 hundredths':'Shade the parts named in the problem.',x,y+h-12,w,23,C.teal);}
 else if([3,4,5,6,19].includes(id)){const labels=id===6?['percent','amount']:id===5?['quantity','amount per 1']:['quantity A','quantity B'];const rh=Math.min(h/4,55),cw=w/3;labels.forEach((v,r)=>{tag(s,v,x,y+r*rh*2,w,25,r?C.brick:C.teal);for(let i=0;i<3;i++){line(s,x+i*cw,y+rh+r*rh*2,x+(i+1)*cw-20,y+rh+r*rh*2,C.gray,1.5);}});if(caption)tag(s,'Label the units before you calculate.',x,y+h-12,w,23,C.gray);}
 else if(id===12){diagram(s,{kind:'hanger',labels:['left side','right side']},x,y,w,h*.7);if(caption)tag(s,'Keep both sides equal.',x,y+h-10,w,23,C.teal);}
 else if(id===10){line(s,x+w*.25,y+15,x+w*.25,y+h*.7,C.teal,3);line(s,x+w*.25,y+15,x+w*.85,y+15,C.teal,3);tag(s,'divisor',x,y+h*.23,w*.25,23,C.brick);tag(s,'dividend',x+w*.3,y+h*.23,w*.6,23,C.teal);tag(s,'quotient',x+w*.3,y-25,w*.6,23,C.gray);if(caption)tag(s,'Estimate. Divide. Check by multiplying.',x,y+h-12,w,23,C.gray);}
 else if([13,14].includes(id)){if(id===13&&/rectangle/i.test(q.text||'')){diagram(s,{kind:'area',dimensions:[6,2.5],labels:['6 cm','2.5 cm']},x,y,w,h*.85);}else if(id===13){poly(s,[[x,y+h*.75],[x+w*.8,y+h*.75],[x+w*.45,y+10]],'none',C.teal);line(s,x+w*.45,y+10,x+w*.45,y+h*.75,C.brick,2);tag(s,'base',x+w*.3,y+h*.75+10,w*.5,23);tag(s,'height',x+w*.47,y+h*.28,w*.5,23,C.brick);}else{const nums=(q.text||'').match(/\d+(?:\.\d+)?/g)?.map(Number)||[];if(/pyramid/i.test(q.text||'')&&nums.length>=2)diagram(s,{kind:'net',solid:'square_pyramid',dimensions:nums.slice(0,2)},x,y,w,h*.7);else if(/box|prism/i.test(q.text||'')&&nums.length>=3)diagram(s,{kind:'net',solid:'rectangular_prism',dimensions:nums.slice(0,3)},x,y,w,h*.7);else diagram(s,{kind:'net'},x,y,w,h*.8);}}
 else if(id===16&&/inequal|at least|x >|x ≥|greater than/i.test(q.text||'')){if(Math.max(0,...((q.text||'').match(/\d+/g)||[]).map(Number))>10){tag(s,'Write the inequality.',x,y+25,w,25,C.teal);line(s,x,y+100,x+w,y+100,V.grid,2);return;}const two=/separate|x >.*x ≥/.test(q.text||'');for(let r=0;r<(two?2:1);r++){const yy=y+40+r*110;line(s,x,yy,x+w,yy,C.teal,2);for(let i=0;i<=5;i++){const xx=x+i*w/5;line(s,xx,yy-7,xx,yy+7);tag(s,String(i*2),xx-7,yy+14,50,22,C.gray);}}}
 else if(id===16){diagram(s,{kind:'coordinate',range:[-5,5],points:[],blank:true},x,y,w,h*.85);}
 else if([17,18].includes(id)){line(s,x,y+h*.65,x+w,y+h*.65,C.ink,2);for(let i=0;i<8;i++){line(s,x+i*w/7,y+h*.65-7,x+i*w/7,y+h*.65+7,C.ink,2);}if(caption)tag(s,/MAD|distances|distance from the mean/i.test((q.text||'')+' '+skill)?'Find the mean. Mark each distance from it.':/range/i.test((q.text||'')+' '+skill)?'Order the data. Compare the endpoints.':id===17?'Order the data. Keep repeated values.':'Order first. Split by the number of values.',x,y+h-8,w,23,C.teal);}
 else if(id===20){diagram(s,{kind:'circle',labels:['radius']},x,y,w,h*.8);}
}
export function styledModel(s,m,x,y,w,h){let mm={...m,caption:'',connect:m.connect||/straight.line/.test(m.caption||'')};if(m.kind==='coordinate'&&!m.range&&!m.xmax&&m.points?.length&&m.points.every(p=>p[0]>=0&&p[1]>=0)){mm.xmax=Math.max(...m.points.map(p=>p[0]));mm.ymax=Math.max(...m.points.map(p=>p[1]));}diagram(s,mm,x,y,w,h);}
export function mathSteps(s,steps,x,y,w,{fs=31,gap=105}={}){steps.forEach((t,i)=>{tag(s,String(i+1).padStart(2,'0'),x,y+i*gap,50,24,C.brick);rich(s,t,x+60,y+i*gap-4,w-60,{fs,leading:1.3,maxHeight:gap-15});if(i<steps.length-1)line(s,x+16,y+i*gap+40,x+16,y+(i+1)*gap-14,V.grid,2);});}
export function fractionBars(s,a,b,den,x,y,w,h,blank=false){const rh=h/3;for(let r=0;r<2;r++){for(let i=0;i<den;i++)rect(s,x+i*w/den,y+r*rh*1.4,w/den,rh,!blank&&i<(r?b:a)?(r?C.brick:C.teal):'none',C.ink);}}
export const workedModels={
 1:{kind:'numberline',min:0,max:1,ticks:12,values:[2/3,3/4],labels:['{2/3}','{3/4}']},
 2:{kind:'area',rows:4,cols:3,shade_rows:3,shade_cols:2},
 3:{kind:'doubleline',values:[3,2],labels:['cups oats','cups seeds'],multiples:4},
 4:{kind:'tape',values:[3,2],labels:['orange: 3 groups of 5','purple: 2 groups of 5']},
 5:{kind:'doubleline',values:[30,2],labels:['minutes','miles'],multiples:2},
 6:{kind:'doubleline',values:[10,6],labels:['percent','blocks'],multiples:10},
 7:{kind:'tape',values:[3,2],labels:['amount: 3 fourths','one group: 2 fourths']},
 8:{kind:'tape',values:[10,9],labels:['amount: 10 fifteenths','one group: 9 fifteenths']},
 10:{kind:'ratio',labels:['dividend','divisor'],rows:[['4.8','0.06'],['480','6']]},
 11:{kind:'area',dimensions:[3,4],labels:['x','4','3']},
 12:{kind:'hanger',labels:['x + 2.75','8']},
 13:{kind:'parallelogram',points:[[0,0],[6,0],[8,3],[2,3]],dimensions:[6,3]},
 14:{kind:'net',solid:'rectangular_prism',dimensions:[2,2,3]},
 15:{kind:'numberline',min:-2,max:1,step:.5,values:[-1.5,-.5],labels:['−1.5','−0.5']},
 16:{kind:'coordinate',points:[[-1,-3],[-1,2]],point_labels:['A','B'],range:[-5,5]},
 17:{kind:'dotplot',values:[3,4,5,8]},
 18:{kind:'boxplot',five_number:[2,4,7,10,12]},
 20:{kind:'circle',labels:['radius 5 m']}
};
export function workedVisual(s,ss,x,y,w,h){if(ss.id===9){const rows=[['ones','tenths','hundredths','thousandths'],['3','8','0','0'],['0','4','7','5'],['4','2','7','5']],cw=w/4,rh=60;rows.forEach((row,r)=>row.forEach((v,c)=>{if(r===0)tag(s,v,x+c*cw,y+r*rh,cw,18,C.gray);else box(s,v,x+c*cw+20,y+r*rh,cw,60,38,'Georgia',r===3?C.teal:C.ink);if(r===2)line(s,x,y+(r+1)*rh-5,x+w,y+(r+1)*rh-5,C.ink,2);}));}
 else if(ss.id===11){const cols=6,rows=3,ww=w*.85,hh=h*.55;for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)rect(s,x+i*ww/cols,y+j*hh/rows,ww/cols,hh/rows,i<2?C.teal:C.brick,'#FAF7F0');tag(s,'2 columns',x,y+hh+20,w/2,24,C.teal);tag(s,'4 columns',x+ww/2,y+hh+20,w/2,24,C.brick);tag(s,'3 rows in each part',x,y+hh+65,w,23);}
 else if(ss.id===19){const sc=Math.min(w/16,h/11),yy=y+h*.7;rect(s,x,yy-3*sc,5*sc,3*sc,'none',C.teal);rect(s,x+6*sc,yy-6*sc,10*sc,6*sc,'none',C.brick);tag(s,'3 × 5',x,yy+15,5*sc,27,C.teal);tag(s,'6 × 10',x+6*sc,yy+15,10*sc,27,C.brick);tag(s,'Every length × 2',x,y,w,24,C.gray);}
 else styledModel(s,workedModels[ss.id]||ss.model,x,y,w,h);}
