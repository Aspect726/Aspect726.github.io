import {createCanvas} from '@napi-rs/canvas';
const ctx=createCanvas(8,8).getContext('2d');
export const C={bg:'#FAF7F0',ink:'#1F1F1F',teal:'#1F5A63',brick:'#A3472B',gray:'#6B6B6B',yellow:'#F2D46B'};
export let count=0;
export function box(s,text,x,y,w,h,fs=36,font='Calibri',color=C.ink,bold=false){
 const sh=s.shapes.add({geometry:'textbox',name:'text-'+(++count),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 sh.text=String(text);sh.text.style={fontSize:fs,typeface:font,color,bold,wrap:'none',autoFit:'none',insets:0}; return sh;
}
export function line(s,x1,y1,x2,y2,color=C.ink,width=2){const x=Math.min(x1,x2),y=Math.min(y1,y2),w=Math.max(1,Math.abs(x2-x1)),h=Math.max(1,Math.abs(y2-y1));return s.shapes.add({geometry:'custom',name:'line-'+(++count),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:color,width},customPaths:[{width:w,height:h,commands:[{moveTo:{x:x1-x,y:y1-y}},{lineTo:{x:x2-x,y:y2-y}}]}]});}
export function rect(s,x,y,w,h,fill='none',stroke=C.ink){return s.shapes.add({geometry:'rect',name:'rect-'+(++count),position:{left:x,top:y,width:w,height:h},fill,line:{fill:stroke,width:2}})}
export function ellipse(s,x,y,w,h,fill='none',stroke=C.ink){return s.shapes.add({geometry:'ellipse',name:'ellipse-'+(++count),position:{left:x,top:y,width:w,height:h},fill,line:{fill:stroke,width:2}})}
export function poly(s,pts,fill='none',stroke=C.ink){const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;return s.shapes.add({geometry:'custom',name:'polygon-'+(++count),position:{left:x,top:y,width:w,height:h},fill,line:{fill:stroke,width:2},customPaths:[{width:w,height:h,commands:[{moveTo:{x:pts[0][0]-x,y:pts[0][1]-y}},...pts.slice(1).map(p=>({lineTo:{x:p[0]-x,y:p[1]-y}})),{close:{}}]}]});}
function width(text,fs,font){ctx.font=`${fs}px ${font==='Calibri'?'Arial':font}`;return ctx.measureText(text).width*1.05;}
function tokenWidth(t,fs,font){const m=t.match(/^\{([^/]+)\/([^}]+)\}$/);return m?Math.max(width(m[1],fs*.72,'Georgia'),width(m[2],fs*.72,'Georgia'))+9:width(t,fs,font);}
export function rich(s,text,x,y,w,{fs=36,font='Calibri',color=C.ink,leading=1.48,maxHeight=480}={}){
 const tokens=String(text).replace(/(?<![\w{])(-?\d+)\/(\d+)(?![\w}])/g,'{$1/$2}').replace(/\r/g,'').split(/(\{[^}]+\/[^}]+\}|\s+)/).filter(Boolean);let xx=x,yy=y;let run='';let rx=x;const lh=fs*leading;
 function flush(){if(run)box(s,run,rx,yy,width(run,fs,font)+6,lh,fs,font,color);run='';}
 for(const t of tokens){if(t.includes('\n')){flush();xx=x;yy+=lh*t.split('\n').length-lh;continue;}const tw=tokenWidth(t,fs,font);
 if(xx+tw>x+w && xx>x){flush();xx=x;yy+=lh;}
 const m=t.match(/^\{([^/]+)\/([^}]+)\}$/);
 if(m){flush();box(s,m[1],xx,yy-7,tw,fs,fs*.72,'Georgia',color);line(s,xx,yy+fs*.6,xx+tw-3,yy+fs*.6,color,1.6);box(s,m[2],xx,yy+fs*.65,tw,fs,fs*.72,'Georgia',color);xx+=tw;rx=xx;}
 else{if(!run)rx=xx;run+=t;xx+=tw;}
 }
 flush();if(yy-y>maxHeight)throw new Error('Overflow: '+text.slice(0,70)+' height '+(yy-y));return yy+lh;
}
export function label(s,text,x,y,w=250,fs=27,color=C.ink){rich(s,text,x,y,w,{fs,font:'Georgia',color,leading:1.28,maxHeight:180});}
export function diagram(s,m,x=680,y=240,w=470,h=300){if(!m)return;const k=m.kind; const vals=m.values||m.dimensions||[];
 if(k==='doubleline'){const mult=m.multiples||5;for(let r=0;r<2;r++){const yy=y+60+r*145,unit=vals[r]||1;line(s,x,yy,x+w,yy,r?C.brick:C.teal,3);for(let i=0;i<=mult;i++){const xx=x+w*i/mult;line(s,xx,yy-8,xx,yy+8);if(m.blank?i<=1:(mult<=5||i%2===0))label(s,String(i*unit),xx-12,yy+18,100,24);}label(s,m.labels?.[r]||'',x,yy-45,w,26,r?C.brick:C.teal);}}
 else if(k==='ratio'&&m.rows){const rows=[m.labels||['A','B'],...m.rows],rh=Math.min(70,h/rows.length),cw=w/2;rows.forEach((row,i)=>{row.forEach((v,j)=>{rect(s,x+j*cw,y+i*rh,cw,rh);label(s,String(v),x+j*cw+18,y+i*rh+13,cw-20,26,i===0?C.teal:C.ink);})});}
 else if(k==='numberline'){
  const min=m.min??(k==='numberline'&&vals.some(v=>typeof v==='number'&&v<0)?-8:0),max=m.max??(k==='numberline'?2:10),steps=m.steps??m.ticks??(m.step?(max-min)/m.step:(max-min<=2?8:max-min));
  for(let row=0;row<(k==='doubleline'?2:1);row++){const yy=y+h*(row? .72:.38);line(s,x,yy,x+w,yy,C.ink,3);for(let i=0;i<=steps;i++){const xx=x+w*i/steps;line(s,xx,yy-8,xx,yy+8);if(i===0||i===steps||steps<=10)label(s,String(min+(max-min)*i/steps),xx-14,yy+18,90,24);}}
  if(!m.blank)for(const v of vals.filter(v=>typeof v==='number'&&v>=min&&v<=max)){let px=x+w*(v-min)/(max-min);ellipse(s,px-5,y+h*.38-5,10,10,C.teal,C.teal);const vi=vals.indexOf(v);label(s,m.labels?.[vi]||String(v),px-18,y+h*.38-57,120,24,C.teal);}
 }
 else if(k==='tape'||k==='ratio'||k==='doubleline'){
  const a=Math.round(vals[0]??3),b=Math.round(vals[1]??2),n=Math.max(a,b,1),u=Math.min(w/n,70);for(let row=0;row<2;row++){const nn=row?b:a;for(let i=0;i<nn;i++)rect(s,x+i*u,y+row*105,u,55,'none',row?C.brick:C.teal);label(s,(m.labels||[])[row]||String(nn)+' units',x,y+row*105+62,w,25,row?C.brick:C.teal);}
 }
 else if(k==='area'){
  if(m.points){const xs=m.points.map(p=>p[0]),ys=m.points.map(p=>p[1]),sc=Math.min(w/(Math.max(...xs)-Math.min(...xs)),h/(Math.max(...ys)-Math.min(...ys)))*.8;poly(s,m.points.map(p=>[x+p[0]*sc,y+h-p[1]*sc]));m.dimensions?.forEach((v,i)=>label(s,String(v),x+i*90,y+h+5,90,24));return;}if((m.labels||[]).includes('x')){const hh=h*.65;rect(s,x,y,w*.6,hh,'none',C.teal);rect(s,x+w*.6,y,w*.3,hh,'none',C.brick);label(s,'x',x+w*.25,y+hh+15,80,30);label(s,String(m.dimensions?.[1]||3),x+w*.7,y+hh+15,80,30);label(s,String(m.dimensions?.[0]||4),x-35,y+hh*.4,80,30);return;}if(m.dimensions&&!m.rows&&!m.cols){const [a,b]=m.dimensions,sc=Math.min(w/a,h/b)*.78,ww=a*sc,hh=b*sc;rect(s,x,y+30,ww,hh);label(s,m.labels?.[0]||String(a),x,y+hh+50,w,27);label(s,m.labels?.[1]||String(b),x,y-20,w,27);return;}const cols=m.columns??m.cols??4,rows=m.rows??3;const ww=w*.85,hh=h*.7;for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)rect(s,x+i*ww/cols,y+j*hh/rows,ww/cols,hh/rows,!m.blank&&i<(m.shadeColumns??m.shade_cols??2)&&j<(m.shadeRows??m.shade_rows??2)?C.yellow:'none');label(s,m.labels?.[0]||'One whole',x,y+hh+20,w);
 }
 else if(k==='hanger'){
  line(s,x+w*.1,y+60,x+w*.9,y+60,C.ink,3);poly(s,[[x+w*.5,y+30],[x+w*.46,y+5],[x+w*.54,y+5]],'none');line(s,x+w*.5,y+30,x+w*.5,y+60);for(const p of [.25,.75]){line(s,x+w*p,y+60,x+w*p,y+170);line(s,x+w*p-70,y+170,x+w*p+70,y+170);}
  label(s,m.labels?.[0]||'x + 4',x+w*.08,y+185,w*.4,32,C.teal);label(s,m.labels?.[1]||'10',x+w*.62,y+185,w*.35,32,C.brick);
 }
 else if(k==='coordinate'&&(m.xmax||m.range?.[0]===0)){const points=m.points||[],second=m.second_points||[],xmax=m.xmax||Math.max(...points.map(p=>p[0]),...second.map(p=>p[0]))+1,ymax=m.ymax||m.range?.[1]||xmax,ux=w/xmax,uy=h/ymax;for(let i=0;i<=xmax;i++){line(s,x+i*ux,y,x+i*ux,y+h,'#C8C5BE',1);label(s,String(i),x+i*ux-8,y+h+10,70,23);}for(let i=0;i<=ymax;i++){line(s,x,y+h-i*uy,x+w,y+h-i*uy,'#C8C5BE',1);if(i>0)label(s,String(i),x-28,y+h-i*uy-12,50,23);}line(s,x,y+h,x+w,y+h);line(s,x,y+h,x,y);if(!m.blank){for(const [arr,c] of [[points,C.teal],[second,C.brick]]){for(const pt of arr)ellipse(s,x+pt[0]*ux-4,y+h-pt[1]*uy-4,8,8,c,c);if(m.connect||second.length||/straight line/.test(m.caption||''))for(let i=1;i<arr.length;i++)line(s,x+arr[i-1][0]*ux,y+h-arr[i-1][1]*uy,x+arr[i][0]*ux,y+h-arr[i][1]*uy,c,3);}if(second.length){const aa=points.at(-1),bb=second.at(-1);label(s,'A',x+aa[0]*ux+10,y+h-aa[1]*uy-25,70,26,C.teal);label(s,'B',x+bb[0]*ux+10,y+h-bb[1]*uy-25,70,26,C.brick);}}label(s,m.labels?.[0]||'x',x+w*.5,y+h+47,w*.6,24);label(s,m.labels?.[1]||'y',x,y-45,w,24);return;}
 else if(k==='coordinate'){
  const extent=m.extent??Math.max(5,...(m.range||[]).map(Math.abs),...(m.points||[]).flat().map(Math.abs)),unit=Math.min(w,h)/(2*extent),cx=x+w/2,cy=y+h/2;
  for(let i=-extent;i<=extent;i++){line(s,cx+i*unit,cy-extent*unit,cx+i*unit,cy+extent*unit,'#C8C5BE',1);line(s,cx-extent*unit,cy+i*unit,cx+extent*unit,cy+i*unit,'#C8C5BE',1);}line(s,cx-extent*unit,cy,cx+extent*unit,cy,C.ink,2);line(s,cx,cy-extent*unit,cx,cy+extent*unit,C.ink,2);label(s,'x',cx+extent*unit+10,cy,30,24);label(s,'y',cx+8,cy-extent*unit-25,30,24);label(s,'0',cx+6,cy+6,30,22);
  if(m.closed&&m.points?.length)poly(s,m.points.map(p=>[cx+p[0]*unit,cy-p[1]*unit]),'none',C.teal);for(let i=0;i<(m.blank?[]:m.points||[]).length;i++){const p=m.points[i];ellipse(s,cx+p[0]*unit-4,cy-p[1]*unit-4,8,8,C.teal,C.teal);label(s,m.point_labels?.[i]||(m.closed?String.fromCharCode(65+i):`(${p[0]}, ${p[1]})`),cx+p[0]*unit+8,cy-p[1]*unit-26,150,24);}
 }
 else if(k==='triangle'||k==='parallelogram'){
  const b=vals[0]??6,hh=vals[1]??4;let pp=m.points|| (k==='triangle'?[[0,0],[b,0],[b/2,hh]]:[[0,0],[b,0],[b+3,hh],[3,hh]]);const xs=pp.map(z=>z[0]),ys=pp.map(z=>z[1]),sc=Math.min(w/(Math.max(...xs)-Math.min(...xs)),h/(Math.max(...ys)-Math.min(...ys)))*.78,xx=x+20,yy=y+h*.8;const trans=p=>[xx+p[0]*sc,yy-p[1]*sc];poly(s,pp.map(trans));const top=k==='triangle'?pp[2]:pp[3],tip=trans(top),foot=trans([top[0],0]);if(top[0]>b)line(s,xx+b*sc,yy,foot[0],yy,C.gray,1);line(s,tip[0],tip[1],foot[0],foot[1],C.brick,2);line(s,foot[0],yy-12,foot[0]+12,yy-12,C.brick,1.5);line(s,foot[0]+12,yy-12,foot[0]+12,yy,C.brick,1.5);label(s,'base '+b,xx+b*sc*.2,yy+18,250,26);label(s,'height '+hh,foot[0]+14,tip[1]+hh*sc*.4,200,26,C.brick);
 }
 else if(k==='net'){
  if(m.solid==='rectangular_prism'){const [a,b,c]=vals,sc=Math.min(w/(2*a+2*b),h/(c+2*b))*.8,sx=x+10,sy=y+b*sc;let off=0;for(const side of [a,b,a,b]){rect(s,sx+off*sc,sy,side*sc,c*sc);off+=side;}rect(s,sx,sy-b*sc,a*sc,b*sc);rect(s,sx,sy+c*sc,a*sc,b*sc);label(s,`${a} × ${b} × ${c}`,x,y+h+5,w,27);}
  else if(m.solid==='triangular_prism'){const [a,b,c,len]=vals,sc=Math.min(w/(a+b+c),h/(len+2*b))*.85,sx=x+15,sy=y+b*sc;let off=0;for(const side of [a,b,c]){rect(s,sx+off*sc,sy,side*sc,len*sc);off+=side;}poly(s,[[sx,sy],[sx+a*sc,sy],[sx,sy-b*sc]]);poly(s,[[sx,sy+len*sc],[sx+a*sc,sy+len*sc],[sx,sy+(len+b)*sc]]);label(s,`Ends: ${a}, ${b}, ${c}; length ${len}`,x,y+h+5,w,25);}
  else if(m.solid==='square_pyramid'){const [a,hh]=vals,sc=Math.min(w/(a+2*hh),h/(a+2*hh))*.9,sx=x+w/2-a*sc/2,sy=y+h/2-a*sc/2,u=a*sc,v=hh*sc;rect(s,sx,sy,u,u);poly(s,[[sx,sy],[sx+u,sy],[sx+u/2,sy-v]]);poly(s,[[sx+u,sy],[sx+u,sy+u],[sx+u+v,sy+u/2]]);poly(s,[[sx,sy+u],[sx+u,sy+u],[sx+u/2,sy+u+v]]);poly(s,[[sx,sy],[sx,sy+u],[sx-v,sy+u/2]]);label(s,`Base ${a}; face height ${hh}`,x,y+h+5,w,25);}
  else {const unit=Math.min(w/5,h/4),sx=x+w*.15,sy=y;for(const [i,j] of [[1,0],[0,1],[1,1],[2,1],[3,1],[1,2]])rect(s,sx+i*unit,sy+j*unit,unit,unit);}
 }
 else if(k==='dotplot'){
  const data=(m.data||vals).filter(v=>typeof v==='number'),mn=Math.min(...data,0),mx=Math.max(...data,6),span=mx-mn||1;line(s,x,y+h*.8,x+w,y+h*.8);for(let v=mn;v<=mx;v++){const xx=x+(v-mn)/span*w;label(s,String(v),xx-10,y+h*.8+12,90,24);const n=m.blank?0:data.filter(z=>z===v).length;for(let j=0;j<n;j++)ellipse(s,xx-5,y+h*.8-20-j*20,10,10,C.teal,C.teal);}
 }
 else if(k==='histogram'){
  const frequencies=m.frequencies||[2,4,3,1],bw=w/frequencies.length,max=Math.max(...frequencies);line(s,x,y+h*.8,x+w,y+h*.8);frequencies.forEach((n,i)=>{if(!m.blank){rect(s,x+i*bw,y+h*.8-n/max*h*.65,bw,n/max*h*.65,'none',C.teal);label(s,String(n),x+i*bw+bw*.4,y+h*.8-n/max*h*.65-35,60,25);}label(s,m.labels?.[i]||String(i*5)+'–'+String(i*5+4),x+i*bw,y+h*.8+15,bw,22)});
 }
 else if(k==='boxplot'){
  if(m.blank){line(s,x,y+h*.6,x+w,y+h*.6);return;}const d=m.five_number||vals||[1,3,5,7,9],a=d.length>=5?d:[1,3,5,7,9],mn=a[0],mx=a[4],xx=v=>x+(v-mn)/(mx-mn)*w,cy=y+h*.5;line(s,xx(a[0]),cy,xx(a[4]),cy);for(const i of [0,4])line(s,xx(a[i]),cy-25,xx(a[i]),cy+25);rect(s,xx(a[1]),cy-50,xx(a[3])-xx(a[1]),100,'none',C.teal);line(s,xx(a[2]),cy-50,xx(a[2]),cy+50,C.brick,3);a.forEach(v=>label(s,String(v),xx(v)-12,cy+65,100,25));
 }
 else if(k==='circle'){
  const r=Math.min(w,h)*.38,cx=x+w*.45,cy=y+h*.46;ellipse(s,cx-r,cy-r,2*r,2*r);line(s,/diameter/.test(m.labels?.[0]||'')?cx-r:cx,cy,cx+r,cy,C.teal,3);label(s,m.labels?.[0]||'radius',/diameter/.test(m.labels?.[0]||'')?cx-r:cx+10,cy-40,2*r+80,27,C.teal);ellipse(s,cx-4,cy-4,8,8,C.ink,C.ink);
 }
 else {label(s,m.caption||'Draw a model and label the units.',x,y,w,30);}
 if(k==='coordinate'&&!m.caption)label(s,'One square = 1 unit',x,y+h+30,w,24);
 if(m.caption)rich(s,m.caption,x,y+h+45,w,{fs:27,font:'Georgia',color:C.gray,maxHeight:150});
}
