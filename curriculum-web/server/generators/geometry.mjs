import { rng, escapeHTML, math } from './common.mjs';
import { rational, format } from '../math.mjs';

export const geometrySkills = ['G-PERIM', 'G-PARA', 'G-TRI', 'G-COMP', 'G-SA', 'P-SCALE', 'P-MAP', 'G-CIRC', 'G-CAREA', 'G-VOL'];
const shapes = ['calculation', 'story', 'missing', 'mistake', 'reason', 'picture'];
const names = ['Maya', 'Leo', 'Sam', 'Ari', 'Nora', 'Ben', 'Zoe', 'Isha'];
const exact = (n, d = 1) => format(rational(n, d));
const p = text => `<p>${text}</p>`;
const m = value => math(String(value));
const txt = (x, y, label, attrs = '') => `<text x="${x}" y="${y}" ${attrs}>${escapeHTML(String(label))}</text>`;
const line = (x1, y1, x2, y2, attrs = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs}/>`;
const svg = (title, content, desc = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 300" role="img" aria-label="${escapeHTML(title)}"><title>${escapeHTML(title)}</title><desc>${escapeHTML(desc || title)}</desc><g fill="none" stroke="#1D2A2E" stroke-width="2" stroke-linejoin="round">${content}</g><style>text{font-family:'Source Serif 4',serif;font-size:24px;fill:#1D2A2E;stroke:#FBF8F1;stroke-width:7px;paint-order:stroke fill;stroke-linejoin:round} .accent{stroke:#1F5A63}.guide{stroke:#A3472B;stroke-dasharray:5 4}</style></svg>`;

function rectangle(w, h, labels = {}) {
  const scale = Math.min(320 / w, 165 / h), x = 115, y = 55, rw = w * scale, rh = h * scale;
  return svg('A rectangle with labelled side lengths', `<rect x="${x}" y="${y}" width="${rw}" height="${rh}"/>${txt(x + rw / 2, y + rh + 30, labels.w ?? `${w} cm`, 'text-anchor="middle"')}${txt(x - 16, y + rh / 2 + 6, labels.h ?? `${h} cm`, 'text-anchor="end"')}`);
}

function parallelogram(b, h, offset, side, missing = false) {
  const scale = Math.min(350 / (b + offset), 170 / h), x = 75, y = 230, by = y - h * scale, dx = offset * scale, bx = x + b * scale;
  return svg('A parallelogram with a perpendicular height', `<path d="M ${x} ${y} L ${bx} ${y} L ${bx + dx} ${by} L ${x + dx} ${by} Z"/>${line(x + dx, by, x + dx, y, 'class="guide"')}<path d="M ${x + dx} ${y - 12} h 12 v 12" class="guide"/>${txt(x + b * scale / 2, y + 29, `${b} cm`, 'text-anchor="middle"')}${txt(x + dx + 17, (y + by) / 2, missing ? 'height ?' : `${h} cm`)}${txt(x + dx / 2 - 18, (y + by) / 2 - 9, `${side} cm`, 'text-anchor="end"')}`);
}

function triangle(b, h, missing = false) {
  const scale = Math.min(345 / b, 175 / h), x = 85, y = 230, apex = x + b * scale * 0.4, top = y - h * scale;
  return svg('A triangle with a perpendicular height', `<path d="M ${x} ${y} L ${x + b * scale} ${y} L ${apex} ${top} Z"/>${line(apex, top, apex, y, 'class="guide"')}<path d="M ${apex} ${y - 12} h 12 v 12" class="guide"/>${txt(x + b * scale / 2, y + 29, `${b} cm`, 'text-anchor="middle"')}${txt(apex + 17, top + h * scale * 0.6, missing ? 'height ?' : `${h} cm`)}`);
}

function composite(w, h, cutW, cutH, missing = false) {
  const scale = Math.min(310 / w, 170 / h), x = 125, y = 65, right = x + w * scale, bottom = y + h * scale, elbowX = right - cutW * scale, elbowY = y + cutH * scale;
  return svg('An L-shaped region cut from a rectangle', `<path d="M ${x} ${y} H ${elbowX} V ${elbowY} H ${right} V ${bottom} H ${x} Z"/><path d="M ${elbowX} ${y} H ${right} V ${elbowY}" class="guide"/>${txt(x + w * scale / 2, bottom + 29, `${w} cm`, 'text-anchor="middle"')}${txt(x - 16, y + h * scale / 2, `${h} cm`, 'text-anchor="end"')}${txt((elbowX + right) / 2, y - 18, missing ? '? cm' : `${cutW} cm`, 'text-anchor="middle"')}${txt(right + 16, (y + elbowY) / 2 + 5, `${cutH} cm`)}`);
}

function net(l, w, h, missing = false) {
  const scale = Math.min(370 / (2 * l + 2 * w), 180 / (h + 2 * w));
  const x = 75, y = 50 + w * scale, L = l * scale, W = w * scale, H = h * scale;
  const rect = (rx, ry, rw, rh) => `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}"/>`;
  return svg('Six rectangles form a cuboid net', `${rect(x,y,L,H)}${rect(x+L,y,W,H)}${rect(x+L+W,y,L,H)}${rect(x+2*L+W,y,W,H)}${rect(x,y-W,L,W)}${rect(x,y+H,L,W)}${txt(x+L/2,y-W-15,`${l} cm`,'text-anchor="middle"')}${txt(x-14,y-W/2+5,`${w} cm`,'text-anchor="end"')}${txt(x+2*L+2*W+14,y+H/2+5,missing?'? cm':`${h} cm`)}`);
}

function cuboid(l, w, h, missing = false) {
  // Parallel edges use the same projection; the depth scale is fixed for every edge.
  const scale = Math.min(260 / (l + w * 0.5), 155 / (h + w * 0.35));
  const x = 100, y = 245, L = l*scale, H=h*scale, dx=w*scale*0.5, dy=-w*scale*0.35;
  return svg('A rectangular prism with labelled dimensions', `<path d="M ${x} ${y} h ${L} v ${-H} h ${-L} Z M ${x} ${y-H} l ${dx} ${dy} h ${L} v ${H} l ${-dx} ${-dy} M ${x+L} ${y-H} l ${dx} ${dy}"/>${txt(x+L/2,y+28,`${l} cm`,'text-anchor="middle"')}${txt(x-15,y-H/2,missing?'? cm':`${h} cm`,'text-anchor="end"')}${txt(x+L+dx+14,y+dy/2,`${w} cm`)}`);
}

function scaleDrawing(w,h,k) {
  const scale = Math.min(310/(w*(k+1)),155/(h*k)), y=235, x=55, firstW=w*scale, gap=65, secondX=x+firstW+gap;
  return svg('An original rectangle and its scaled copy', `<rect x="${x}" y="${y-h*scale}" width="${firstW}" height="${h*scale}"/><rect x="${secondX}" y="${y-h*k*scale}" width="${w*k*scale}" height="${h*k*scale}" class="accent"/>${txt(x,y-h*scale-25,'Original')}${txt(secondX,y-h*k*scale-25,`Scale factor ${k}`)}${txt(x+firstW/2,y+28,`${w} cm`,'text-anchor="middle"')}${txt(x-12,y-h*scale/2,`${h} cm`,'text-anchor="end"')}`);
}

function mapDrawing(n, meters, missing = false) {
  const x=90, y=140, width=330;
  return svg('A map path with a labelled scale', `<path d="M ${x} ${y} H ${x+width}" class="accent"/>${line(x,y-8,x,y+8)}${line(x+width,y-8,x+width,y+8)}${txt(x,y-27,'Park')}${txt(x+width,y-27,'Pool','text-anchor="end"')}${txt(x+width/2,y+35,missing?'Map distance ?':`Map distance ${n} cm`,'text-anchor="middle"')}${txt(x,y+90,`Scale: 1 cm represents ${meters} m`)}`);
}

function circle(r, diameter = false, missing = false) {
  const cx=260, cy=135, radius=90;
  return svg(diameter?'A circle with its diameter marked':'A circle with its radius marked', `<circle cx="${cx}" cy="${cy}" r="${radius}"/>${line(diameter?cx-radius:cx,cy,cx+radius,cy,'class="accent"')}<circle cx="${cx}" cy="${cy}" r="3" fill="#1D2A2E"/>${txt(diameter?cx:cx+radius/2,cy-18,missing?'? cm':`${diameter?2*r:r} cm`,'text-anchor="middle"')}${txt(cx,265,diameter?'Diameter':'Radius','text-anchor="middle"')}`);
}

function uniqueHints(answer, rows) {
  const seen=new Set([String(answer)]);
  return rows.filter(([wrong])=>{if(seen.has(String(wrong)))return false;seen.add(String(wrong));return true;}).map(([wrong,text])=>({answer:String(wrong),text}));
}

function definition(skill, random, hard) {
  const name=random.pick(names), high=hard?16:10;
  let model, direct, story, missing, value, missingValue, wrong, hint, solution, missingSolution, methods, picture;
  if(skill==='G-PERIM') {
    const l=random.int(7,hard?30:22), w=random.int(2,hard?15:10), result=2*(l+w);
    model={l,w,result}; value=result;missingValue=l;
    direct=`A rectangle is ${m(l)} cm long and ${m(w)} cm wide. Find its perimeter in cm.`;
    story=`${name} puts a border around a ${l} cm by ${w} cm game board. How many centimetres are needed?`;
    missing=`A rectangle has perimeter ${m(result)} cm and width ${m(w)} cm. Find its length in cm.`;
    wrong=[[l*w,'Perimeter measures the border. Add all four sides.'],[l+w,'A rectangle has two lengths and two widths.'],[2*l+w,'Count both short sides as well as both long sides.']];
    hint='Trace the border and add the four side lengths.';
    solution=[`The two long sides total ${2*l} cm.`,`The two short sides total ${2*w} cm.`,`Add them: ${2*l} + ${2*w} = ${result} cm.`];
    missingSolution=[`Half the perimeter is ${result} ÷ 2 = ${l+w} cm.`,`That is one length plus one width.`,`Subtract the width: ${l+w} − ${w} = ${l} cm.`];
    methods=[['Add both lengths and both widths.','area'],['Multiply length by width.','perimeter'],['Add one length and one width.','sides']];
    picture=isMissing=>rectangle(l,w,isMissing?{w:'? cm'}:{});
  } else if(skill==='G-PARA') {
    const t=random.int(1,hard?8:5), h=3*t, offset=4*t, side=5*t, b=offset+random.int(3,hard?24:20), result=b*h;
    model={b,h,offset,side,result};value=result;missingValue=h;
    direct=`A parallelogram has base ${m(b)} cm and perpendicular height ${m(h)} cm. Find its area in cm².`;
    story=`${name} cuts a parallelogram for a model. Its base is ${b} cm and perpendicular height is ${h} cm. Find the area in cm².`;
    missing=`A parallelogram has area ${m(result)} cm² and base ${m(b)} cm. Find its perpendicular height in cm.`;
    wrong=[[2*(b+side),'Area counts squares inside. Use base × perpendicular height.'],[b*side,'The slanted side is not the perpendicular height. Look for the square corner.'],[exact(b*h,2),'A parallelogram rearranges into a whole rectangle, not half a rectangle.'],[b+h,'Multiply the number of rows by the number of squares in each row.']];
    hint='The perpendicular height meets the base at a square corner.';
    solution=[`Move the triangular end to the other side.`,`The rectangle has base ${b} cm and height ${h} cm.`,`Its area is ${b} × ${h} = ${result} cm².`];
    missingSolution=[`Area = base × perpendicular height.`,`Divide the area by the base.`,`${result} ÷ ${b} = ${h} cm.`];
    methods=[['Multiply base by perpendicular height.','area'],['Multiply base by the slanted side.','slant'],['Add the four side lengths.','perimeter']];
    picture=isMissing=>parallelogram(b,h,offset,side,isMissing);
  } else if(skill==='G-TRI') {
    const b=2*random.int(3,hard?16:11),h=random.int(3,hard?24:16),result=b*h/2;
    model={b,h,result,apexFraction:0.4};value=result;missingValue=h;
    direct=`A triangle has base ${m(b)} cm and perpendicular height ${m(h)} cm. Find its area in cm².`;
    story=`${name} makes a triangular flag with base ${b} cm and perpendicular height ${h} cm. Find its area in cm².`;
    missing=`A triangle has area ${m(result)} cm² and base ${m(b)} cm. Find its perpendicular height in cm.`;
    wrong=[[b*h,'Two matching triangles make a parallelogram. Your triangle is half of it.'],[b+h,'Area counts squares inside. Start with base × perpendicular height.'],[exact(b*h,4),'Halve base × perpendicular height once, not twice.'],[2*(b+h),'Adding side lengths does not count the squares inside.'],[b*b*h/2,'Use the base once. The formula does not square the base.']];
    hint='Two copies of this triangle make one parallelogram.';
    solution=[`Two matching triangles form a parallelogram.`,`Its area is ${b} × ${h} = ${b*h} cm².`,`One triangle has area ${b*h} ÷ 2 = ${result} cm².`];
    missingSolution=[`Double the triangle's area: ${result} × 2 = ${2*result} cm².`,`Divide that by the base.`,`${2*result} ÷ ${b} = ${h} cm.`];
    methods=[['Multiply base by perpendicular height, then halve.','area'],['Multiply base by perpendicular height without halving.','whole'],['Add base and perpendicular height.','sum']];
    picture=isMissing=>triangle(b,h,isMissing);
  } else if(skill==='G-COMP') {
    const cutW=random.int(2,5),cutH=random.int(2,5),w=cutW+random.int(3,8),h=cutH+random.int(3,8),result=w*h-cutW*cutH;
    model={w,h,cutW,cutH,result};value=result;missingValue=cutW;
    direct=`Remove a ${m(cutW)} cm by ${m(cutH)} cm corner from a ${m(w)} cm by ${m(h)} cm rectangle. Find the remaining area in cm².`;
    story=`${name} makes an L-shaped game mat. A ${w} cm by ${h} cm rectangle loses a ${cutW} cm by ${cutH} cm corner. Find the remaining area in cm².`;
    missing=`The L-shape has area ${m(result)} cm². Find the missing width of the cut-out corner in cm.`;
    wrong=[[w*h,'The large rectangle includes the missing corner. Subtract its area.'],[w*h+cutW*cutH,'The corner was removed. Its area must be subtracted.'],[(w-cutW)*(h-cutH),'The remaining shape includes two arms. Do not shorten both full sides.'],[w*h-cutW-cutH,'Find the corner’s area before subtracting.']];
    hint='Find the full rectangle’s area, then subtract the missing corner.';
    solution=[`The full rectangle has area ${w} × ${h} = ${w*h} cm².`,`The corner has area ${cutW} × ${cutH} = ${cutW*cutH} cm².`,`Subtract: ${w*h} − ${cutW*cutH} = ${result} cm².`];
    missingSolution=[`The full rectangle has area ${w*h} cm².`,`The removed area is ${w*h} − ${result} = ${cutW*cutH} cm².`,`Its width is ${cutW*cutH} ÷ ${cutH} = ${cutW} cm.`];
    methods=[['Subtract the corner’s area from the full rectangle’s area.','area'],['Add the corner’s area to the full rectangle’s area.','add'],['Multiply the two shortened sides.','shorten']];
    picture=isMissing=>composite(w,h,cutW,cutH,isMissing);
  } else if(skill==='G-SA') {
    const l=random.int(5,hard?16:12),w=random.int(2,hard?8:6),h=random.int(3,hard?12:9),result=2*(l*w+l*h+w*h);
    model={l,w,h,result};value=result;missingValue=h;
    direct=`A closed box measures ${m(l)} cm by ${m(w)} cm by ${m(h)} cm. Find its surface area in cm².`;
    story=`${name} covers all six faces of a gift box. It measures ${l} cm by ${w} cm by ${h} cm. How many cm² of paper are needed?`;
    missing=`The closed box has surface area ${m(result)} cm². Its length is ${m(l)} cm and width is ${m(w)} cm. Find its height in cm.`;
    wrong=[[l*w*h,'Volume counts cubes inside. Surface area counts the squares on all six faces.'],[l*w+l*h+w*h,'Each face has an opposite face of the same size. Count both.'],[2*(l+w+h),'Multiply each pair of dimensions to find the face areas.'],[2*l*w,'The top and bottom are only two of the six faces.'],[result-l*w,'This is a closed box. Include the top face as well.']];
    hint='The net has three pairs of equal rectangles.';
    solution=[`One of each face has area ${l*w}, ${l*h}, and ${w*h} cm².`,`Their total is ${l*w+l*h+w*h} cm².`,`Each face occurs twice: 2 × ${l*w+l*h+w*h} = ${result} cm².`];
    missingSolution=[`Remove top and bottom: ${result} − ${2*l*w} = ${result-2*l*w} cm².`,`The four side faces have total width ${2*(l+w)} cm.`,`Height = ${result-2*l*w} ÷ ${2*(l+w)} = ${h} cm.`];
    methods=[['Find the three face areas, add them, then double.','area'],['Multiply all three dimensions.','volume'],['Add the three dimensions, then double.','edges']];
    picture=isMissing=>net(l,w,h,isMissing);
  } else if(skill==='P-SCALE') {
    const w=random.int(3,hard?14:9),h=random.int(2,hard?11:7),k=random.int(2,hard?4:3),result=w*h*k*k;
    model={w,h,k,result};value=result;missingValue=k;
    direct=`A ${m(w)} cm by ${m(h)} cm rectangle is enlarged by scale factor ${m(k)}. Find the new area in cm².`;
    story=`${name} enlarges a ${w} cm by ${h} cm game card. Every length becomes ${k} times as long. Find the new area in cm².`;
    missing=`An original rectangle has area ${m(w*h)} cm². Its enlarged copy has area ${m(result)} cm². Find the scale factor.`;
    wrong=[[w*h*k,'Both width and height grow by the scale factor. Apply it to both.'],[w*h,'The copy has new dimensions. Scale both side lengths.'],[w*h+k,'A scale factor multiplies lengths; it does not add to area.'],[2*w*h*k,'Write both new side lengths, then multiply them.']];
    hint='Both side lengths change. Find each new length before multiplying.';
    solution=[`The new width is ${w} × ${k} = ${w*k} cm.`,`The new height is ${h} × ${k} = ${h*k} cm.`,`The new area is ${w*k} × ${h*k} = ${result} cm².`];
    missingSolution=[`Divide the areas: ${result} ÷ ${w*h} = ${k*k}.`,`The area factor is the length factor multiplied by itself.`,`${k} × ${k} = ${k*k}, so the scale factor is ${k}.`];
    methods=[['Multiply area by the scale factor twice.','area'],['Multiply area by the scale factor once.','once'],['Add the scale factor to the area.','add']];
    picture=()=>scaleDrawing(w,h,k);
  } else if(skill==='P-MAP') {
    const n=random.int(2,hard?24:16),meters=random.pick(hard?[20,25,40,50,60,75,80,100,125,150,200,250]:[20,25,40,50,75,100,125,150,200]),result=n*meters;
    model={n,meters,result};value=result;missingValue=n;
    direct=`A map uses ${m(1)} cm for ${m(meters)} m. Two places are ${m(n)} cm apart on the map. Find the real distance in metres.`;
    story=`${name} follows a map from the park to the pool. The route is ${n} cm long. Each centimetre represents ${meters} m. Find the distance in metres.`;
    missing=`A map uses ${m(1)} cm for ${m(meters)} m. The real distance is ${m(result)} m. Find the map distance in centimetres.`;
    wrong=[[n+meters,'Each centimetre represents the same distance. Use equal groups.'],[exact(n,meters),'The real distance is larger than the map number. Multiply by the metres per centimetre.'],[result*100,'The scale already gives metres. Do not convert it to centimetres.'],[meters,'There is more than one centimetre on the map. Count all the groups.']];
    hint='Use one equal group of metres for each centimetre on the map.';
    solution=[`Each 1 cm on the map represents ${meters} m.`,`There are ${n} equal groups of ${meters} m.`,`${n} × ${meters} = ${result} m.`];
    missingSolution=[`Each map centimetre represents ${meters} m.`,`Divide the real distance by ${meters}.`,`${result} ÷ ${meters} = ${n} cm on the map.`];
    methods=[['Multiply map centimetres by metres per centimetre.','distance'],['Add map centimetres to metres per centimetre.','add'],['Divide map centimetres by metres per centimetre.','divide']];
    picture=isMissing=>mapDrawing(n,meters,isMissing);
  } else if(skill==='G-CIRC') {
    const radiusTenths=(hard?random.int(20,180):5*random.int(4,30)),r=radiusTenths/10,count=random.int(1,9),diameter=random.int(0,1)===1,result=exact(628*radiusTenths*count,1000);
    model={r,radiusTenths,count,diameter,result};value=result;missingValue=r;
    const one=exact(628*radiusTenths,1000);
    direct=`There are ${m(count)} equal circles. Each has ${diameter?'diameter':'radius'} ${m(diameter?2*r:r)} cm. Use π = ${m('3.14')}. Find their total circumference in cm.`;
    story=`${name} puts ribbon around ${count} equal circular lids. Each lid has radius ${r} cm. Use π = 3.14. Find the total ribbon length in cm.`;
    missing=`${m(count)} equal circles have total circumference ${m(result)} cm. Use π = ${m('3.14')}. Find each radius in cm.`;
    wrong=[[exact(314*radiusTenths*count,1000),'Circumference uses the diameter, which is twice the radius.'],[exact(314*radiusTenths*radiusTenths*count,10000),'That formula finds area. Circumference measures the distance around.'],[exact(1256*radiusTenths*count,1000),'Use twice the radius once. Do not double the diameter.'],[one,'That is one circumference. Count all the circles.'],[exact(2*radiusTenths*count,10),'The diameter crosses a circle. Multiply it by π to go around.']];
    hint='Circumference equals π times diameter. Then count all the circles.';
    solution=[`Each diameter is 2 × ${r} = ${2*r} cm.`,`One circumference is 3.14 × ${2*r} = ${one} cm.`,`For ${count} circles: ${one} × ${count} = ${result} cm.`];
    missingSolution=[`One circumference is ${result} ÷ ${count} = ${one} cm.`,`Divide by π: ${one} ÷ 3.14 = ${2*r} cm.`,`The radius is ${2*r} ÷ 2 = ${r} cm.`];
    methods=[['Find π × diameter, then multiply by the number of circles.','circumference'],['Find π × radius squared, then multiply by the number of circles.','area'],['Find π × radius, then multiply by the number of circles.','half']];
    picture=isMissing=>circle(r,diameter,isMissing);
  } else if(skill==='G-CAREA') {
    const radiusTenths=(hard?random.int(20,150):5*random.int(4,24)),r=radiusTenths/10,count=random.int(1,9),diameter=random.int(0,1)===1,result=exact(314*radiusTenths*radiusTenths*count,10000);
    model={r,radiusTenths,count,diameter,result};value=result;missingValue=r;
    const square=exact(radiusTenths*radiusTenths,100),one=exact(314*radiusTenths*radiusTenths,10000);
    direct=`There are ${m(count)} equal circles. Each has ${diameter?'diameter':'radius'} ${m(diameter?2*r:r)} cm. Use π = ${m('3.14')}. Find their total area in cm².`;
    story=`${name} covers ${count} equal circular game mats. Each radius is ${r} cm. Use π = 3.14. Find their total area in cm².`;
    missing=`${m(count)} equal circles have total area ${m(result)} cm². Use π = ${m('3.14')}. Find each radius in cm.`;
    wrong=[[exact(1256*radiusTenths*radiusTenths*count,10000),'Area uses the radius. If given a diameter, halve it first.'],[exact(628*radiusTenths*count,1000),'That formula measures around the circles. Area uses radius squared.'],[exact(314*radiusTenths*count,1000),'Square the radius before multiplying by π.'],[one,'That is one circle’s area. Count all the circles.'],[exact(radiusTenths*radiusTenths*count,100),'Radius squared still needs to be multiplied by π.']];
    hint='Use each radius, multiply it by itself, then multiply by π. Count all the circles.';
    solution=[`Each radius is ${r} cm.`,`Radius squared is ${r} × ${r} = ${square} cm².`,`One area is 3.14 × ${square} = ${one} cm².`,`For ${count} circles: ${one} × ${count} = ${result} cm².`];
    missingSolution=[`One area is ${result} ÷ ${count} = ${one} cm².`,`Divide by π: ${one} ÷ 3.14 = ${square}.`,`Since ${r} × ${r} = ${square}, each radius is ${r} cm.`];
    methods=[['Find π × radius squared, then multiply by the number of circles.','area'],['Find π × diameter squared, then multiply by the number of circles.','diameter'],['Find π × diameter, then multiply by the number of circles.','circumference']];
    picture=isMissing=>circle(r,diameter,isMissing);
  } else if(skill==='G-VOL') {
    const l=random.int(5,hard?12:9),w=random.int(2,5),h=random.int(3,8),result=l*w*h;
    model={l,w,h,result};value=result;missingValue=h;
    direct=`A box measures ${m(l)} cm by ${m(w)} cm by ${m(h)} cm. Find its volume in cm³.`;
    story=`${name} builds a solid block from 1 cm cubes. The block measures ${l} cm by ${w} cm by ${h} cm. How many cubes are used?`;
    missing=`A box has volume ${m(result)} cm³. Its base is ${m(l)} cm by ${m(w)} cm. Find its height in cm.`;
    wrong=[[l*w,'That counts one layer. Count all the layers.'],[2*(l*w+l*h+w*h),'Surface area counts faces. Volume counts cubes inside.'],[l+w+h,'Multiply to count equal rows, then multiply by the layers.'],[l*w+h,'Each layer holds the same number of cubes. Multiply by the number of layers.']];
    hint='Find the number of cubes in one layer, then count all the layers.';
    solution=[`One layer holds ${l} × ${w} = ${l*w} cubes.`,`The box has ${h} layers.`,`Volume = ${l*w} × ${h} = ${result} cm³.`];
    missingSolution=[`The base area is ${l} × ${w} = ${l*w} cm².`,`Divide volume by base area.`,`${result} ÷ ${l*w} = ${h} cm.`];
    methods=[['Multiply base area by height.','volume'],['Add length, width and height.','sum'],['Add the areas of all six faces.','surface']];
    picture=isMissing=>cuboid(l,w,h,isMissing);
  } else throw new Error(`Unknown geometry skill: ${skill}`);
  const extraMethods={
    'G-PERIM':['Count only the two long sides.','long'],
    'G-PARA':['Multiply base by perpendicular height, then halve.','half'],
    'G-TRI':['Multiply base by perpendicular height, then divide by four.','quarter'],
    'G-COMP':['Use the full rectangle’s area without removing the corner.','full'],
    'G-SA':['Count only the top and bottom faces.','two-faces'],
    'P-SCALE':['Use the original area without changing it.','unchanged'],
    'P-MAP':['Use the scale number without counting map centimetres.','one-group'],
    'G-CIRC':['Use the diameter without multiplying by π.','diameter-only'],
    'G-CAREA':['Use radius squared without multiplying by π.','square-only'],
    'G-VOL':['Multiply length by width without counting layers.','one-layer']
  };
  methods.push(extraMethods[skill]);
  const reasonHints={
    'G-PERIM':['Perimeter measures the border. Add all four sides.','A rectangle has two lengths and two widths.','Include both short sides too.'],
    'G-PARA':['The slanted side is not the perpendicular height. Look for the square corner.','Area counts squares inside. Adding side lengths finds perimeter.','A parallelogram rearranges into a whole rectangle. Do not halve it.'],
    'G-TRI':['Two triangles make a parallelogram. Find half its area.','Adding lengths does not count squares inside.','Halve once. Dividing by four halves the area twice.'],
    'G-COMP':['The corner was removed. Subtract its area.','The two arms remain. Do not shorten both full sides.','The full rectangle includes the removed corner.'],
    'G-SA':['Multiplying all three dimensions finds volume. Surface area counts six faces.','Find each face area by multiplying its two dimensions.','Include all six faces, not only the top and bottom.'],
    'P-SCALE':['Both width and height grow by the scale factor.','A scale factor multiplies lengths; it does not add to area.','Both dimensions change, so the area changes too.'],
    'P-MAP':['Use equal groups of metres. Adding does not apply the scale.','The real distance is larger. Multiply by the metres per centimetre.','Count one group for every map centimetre.'],
    'G-CIRC':['Radius squared is used for area. This question asks for distance around.','Use the diameter, which is twice the radius.','The diameter crosses a circle. Multiply it by π to go around.'],
    'G-CAREA':['Use the radius in the area formula. Halve a diameter first.','π × diameter gives circumference. Area uses radius squared.','Radius squared still needs to be multiplied by π.'],
    'G-VOL':['Multiply to count equal rows and layers of cubes.','Adding face areas finds surface area. Volume counts cubes inside.','Length × width counts one layer. Count all the layers.']
  }[skill];
  return {model,direct,story,missing,value:String(value),missingValue:String(missingValue),wrong,hint,solution,missingSolution,methods,reasonHints,picture,name};
}

export function generateGeometry(skill, seed, options = {}) {
  const random=rng(`${skill}:${seed}`), shape=options.shape ?? shapes[random.int(0,shapes.length-1)];
  if(!shapes.includes(shape)) throw new Error(`Unknown geometry shape: ${shape}`);
  const d=definition(skill,random,Number(options.difficulty)>1), missing=shape==='missing';
  let prompt=d.direct,answer=d.value,solution=d.solution,choices;
  let hints=uniqueHints(answer,d.wrong);
  if(shape==='story') prompt=escapeHTML(d.story);
  if(missing) {
    prompt=d.missing;answer=d.missingValue;solution=d.missingSolution;
    const val=Number(answer);
    const missingHints={
      'G-PERIM': () => [[d.model.result-d.model.w,'Halve the perimeter before subtracting the width.'],[d.model.result/2,'Half the perimeter includes both one length and one width.'],[d.model.result,'The whole perimeter includes all four sides.']],
      'G-PARA': () => [[d.model.result,'The area is not a length. Divide by the base.'],[d.model.result*d.model.b,'Undo multiplication by dividing by the base.'],[d.model.side,'Use the perpendicular height, not the slanted side.']],
      'G-TRI': () => [[exact(d.model.h,2),'First double the triangle’s area, then divide by the base.'],[d.model.result,'Area is measured in squares. Find the missing length.'],[2*d.model.h,'Double the area only once before dividing.']],
      'G-COMP': () => [[d.model.w*d.model.h-d.model.result,'That gives the missing corner’s area. Divide by its height.'],[d.model.w,'The full width includes the part that remains.'],[d.model.result,'Find the removed area before finding its width.'],[exact(d.model.w*d.model.h,d.model.cutH),'Subtract the remaining area before dividing by the corner height.'],[d.model.cutW*d.model.cutH*d.model.cutH,'Undo multiplication by the corner height with division.']],
      'G-SA': () => [[d.model.result,'Remove the top and bottom areas before finding the height.'],[exact(d.model.result,2*(d.model.l+d.model.w)),'The top and bottom do not depend on height. Remove them first.'],[2*val,'The side faces include two of each width. Count all four faces.'],[d.model.result-2*d.model.l*d.model.w,'That is the total side-face area. Divide by the total width of those faces.']],
      'P-SCALE': () => [[d.model.k*d.model.k,'That is the area factor. Find the length factor multiplied by itself.'],[d.model.result,'Compare the two areas first.'],[d.model.w*d.model.h,'That is the original area. The answer is a scale factor.'],[exact(1,d.model.k),'The copy is larger. Compare copy area to original area in that order.']],
      'P-MAP': () => [[d.model.result*d.model.meters,'Undo the scale multiplication by dividing.'],[d.model.result,'The real distance is in metres. Convert it to map centimetres.'],[d.model.meters,'That is the scale, not the map distance.'],[exact(d.model.meters,d.model.result),'Divide the real distance by metres per centimetre, not the reverse.']],
      'G-CIRC': () => [[2*d.model.r,'Dividing circumference by π gives the diameter. Halve it for the radius.'],[d.model.result,'Circumference measures around. You need the centre-to-edge distance.'],[exact(d.model.radiusTenths,20),'Once you have the diameter, halve it only once.']],
      'G-CAREA': () => [[exact(d.model.radiusTenths*d.model.radiusTenths,100),'Dividing area by π gives radius squared. Find the radius.'],[2*d.model.r,'The question asks for the radius, not the diameter.'],[d.model.result,'First divide the total area by the number of circles, then by π.'],[exact(d.model.radiusTenths,20),'Do not halve the radius again. Only a diameter needs halving.']],
      'G-VOL': () => [[d.model.l*d.model.w,'That is the base area. Divide the volume by it.'],[d.model.result,'The volume counts all layers. Find the number of layers.'],[d.model.result/d.model.l,'You have divided by only one base dimension. Use the full base area.'],[exact(d.model.result,d.model.l*d.model.w*d.model.w),'Divide by each base dimension once.'],[d.model.result*d.model.w,'Divide by the base area rather than multiplying.']]
    };
    hints=uniqueHints(answer,missingHints[skill]());
  }
  if(shape==='mistake') {
    const wrong=hints[0].answer;
    prompt=`${escapeHTML(d.story)} ${d.name} gets ${m(wrong)}. What is the correct value?`;
  }
  if(shape==='reason') {
    prompt=`${d.direct} Which method gives the answer?`;
    const ordered=random.shuffle(d.methods.map(([label,key],index)=>({label:escapeHTML(label),correct:index===0,hint:d.reasonHints[index-1]})));
    choices=ordered.map((choice,index)=>({value:`option-${index}`,label:choice.label}));
    answer=`option-${ordered.findIndex(choice=>choice.correct)}`;
    hints=ordered.flatMap((choice,index)=>choice.correct?[]:[{answer:`option-${index}`,text:choice.hint}]);
    solution=[d.methods[0][0],...d.solution.slice(1)];
  }
  if(shape==='picture') {
    const ask={
      'G-PERIM':'Read the rectangle. Find its perimeter in cm.',
      'G-PARA':'Read the parallelogram. Find its area in cm². Use the perpendicular height.',
      'G-TRI':'Read the triangle. Find its area in cm². Use the perpendicular height.',
      'G-COMP':'Read the L-shape. Find its area in cm².',
      'G-SA':'This net folds into a closed box. Find its surface area in cm².',
      'P-SCALE':'Read the original rectangle and its scale factor. Find the copy’s area in cm².',
      'P-MAP':'Read the map and scale. Find the real distance in metres.',
      'G-CIRC':`There are ${d.model.count} equal circles like this one. Use π = 3.14. Find their total circumference in cm.`,
      'G-CAREA':`There are ${d.model.count} equal circles like this one. Use π = 3.14. Find their total area in cm².`,
      'G-VOL':'Read the box. Find its volume in cm³.'
    };
    prompt=escapeHTML(ask[skill]);
  }
  // Missing scale factor must not be labelled on a diagram.
  const drawing=(skill==='P-SCALE'&&missing)?undefined:d.picture(missing);
  const z=d.model;
  const shown={
    'G-PERIM': missing?[z.result,z.w]:[z.l,z.w],
    'G-PARA': missing?[z.result,z.b]:[z.b,z.h],
    'G-TRI': missing?[z.result,z.b]:[z.b,z.h],
    'G-COMP': missing?[z.result,z.w,z.h,z.cutH]:[z.w,z.h,z.cutW,z.cutH],
    'G-SA': missing?[z.result,z.l,z.w]:[z.l,z.w,z.h],
    'P-SCALE': missing?[z.w*z.h,z.result]:[z.w,z.h,z.k],
    'P-MAP': missing?[z.meters,z.result]:[z.meters,z.n],
    'G-CIRC': missing?[...(z.count===1?[]:[z.count]),z.result]:[...(z.count===1?[]:[z.count]),shape==='story'?z.r:z.diameter?2*z.r:z.r],
    'G-CAREA': missing?[...(z.count===1?[]:[z.count]),z.result]:[...(z.count===1?[]:[z.count]),shape==='story'?z.r:z.diameter?2*z.r:z.r],
    'G-VOL': missing?[z.result,z.l,z.w]:[z.l,z.w,z.h]
  };
  const numbers=shown[skill].map(String);
  solution=solution.map(step=>step.replace(/\b\d{4,}(?:\.\d+)?\b/g,value=>{const [whole,part]=value.split('.');return whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(part?`.${part}`:'');}));
  return {skill,seed,shape,prompt:p(prompt),plainPrompt:prompt.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(),answer,choices,svg:drawing,hints,hint:d.hint,solution,numbers,model:d.model};
}
