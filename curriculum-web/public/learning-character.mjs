// Original geometric companions. Decorative poses never change scores or focus.
const CHARACTER_NAMES = new Set(['pip','tess','quad','dot']);
const CHARACTER_POSES = new Set(['welcome','think','point','explain','cheer','encourage']);
const characterName = variant => ({circle:'pip',triangle:'tess',square:'quad'}[variant] || (CHARACTER_NAMES.has(variant) ? variant : 'tess'));
function characterArt(name,pose) {
  const ink='#243653',stroke=`stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;
  const bodies={
    pip:`<circle cx="60" cy="54" r="35" fill="#7399EC" ${stroke}/>` ,
    tess:`<path d="M56 18q4-7 8 0l35 62q5 9-5 9H26q-10 0-5-9Z" fill="#ED927F" ${stroke}/>` ,
    quad:`<rect x="27" y="23" width="66" height="66" rx="8" fill="#B6A2DF" ${stroke}/><path d="M60 25V87M29 56H91" ${stroke} opacity=".16"/>` ,
    dot:`<circle cx="60" cy="59" r="28" fill="#F3CE70" ${stroke}/>`
  };
  const arms={
    welcome:'M26 65 15 55 10 38M94 65l11 7 6-6',
    think:'M27 66 17 77 34 79M94 66l9-10-15-5',
    point:'M26 65l-12 8M94 65l16-12m-2-3 4 1-1 5',
    explain:'M26 65 15 63 10 55M94 65l12-3 5-9',
    cheer:'M26 65 14 48 10 31M94 65l12-17 4-17',
    encourage:'M26 65l-12 7-4-5M94 65l11-12 6 3'
  };
  const brows={
    welcome:'M42 47q5-4 10 0M68 47q5-4 10 0',
    think:'M42 48l10-2M68 45l10 3',
    point:'M42 47q5-3 10 0M68 46l10 1',
    explain:'M42 46q5-3 10 0M68 46q5-3 10 0',
    cheer:'M42 44q5-4 10 0M68 44q5-4 10 0',
    encourage:'M42 46q5-3 10 0M68 46q5-3 10 0'
  };
  return `<g class="friend-body"><ellipse cx="60" cy="102" rx="29" ry="3" fill="#243653" opacity=".08"/><path d="m45 84-6 14m36-14 6 14" ${stroke}/><path d="${arms[pose]}" ${stroke}/>${bodies[name]}<g ${name==='dot'?'transform="translate(12 13) scale(.8)"':''}><path d="${brows[pose]}" ${stroke}/><circle cx="47" cy="57" r="2.8" fill="${ink}"/><circle cx="73" cy="57" r="2.8" fill="${ink}"/><path d="${pose==='think'?'M55 71q5 2 10 0':pose==='cheer'?'M51 69q9 12 18 0':'M53 71q7 6 14 0'}" ${stroke}/></g></g>`;
}
export function learningCharacter({ celebrate = false, small = false, variant = 'triangle', pose = 'welcome', size } = {}) {
  const name=characterName(variant),selectedPose=celebrate?'cheer':CHARACTER_POSES.has(pose)?pose:'welcome';
  const icon=small||size==='icon',shape=name==='tess'?'triangle':name==='quad'?'square':'circle';
  return `<span class="geometry-friend ${shape}-friend${celebrate?' celebrating':''}${icon?' small':''} ${name}-friend" data-character="${name}" data-pose="${selectedPose}" data-size="${icon?'icon':'illustration'}" aria-hidden="true"><svg viewBox="0 0 120 110" width="${icon?40:180}" height="${icon?37:165}" fill="none" focusable="false">${celebrate?'<g class="friend-sparks" stroke="#8A6414" stroke-width="3" stroke-linecap="round"><path d="M15 20v8m-4-4h8m83-4 5-6m2 17 7 1"/></g>':''}${characterArt(name,selectedPose)}</svg></span>`;
}

// These are teaching diagrams, rather than decorative wallpaper. Their labels
// and exact geometry are checked in tests and read aloud by assistive software.
export function mathCharacterDiagram({variant='pip'}={}) {
  const name=characterName(variant);
  const diagrams={
    pip:{label:'A number line from 0 to 4 with Pip above 2.',caption:'Equal spaces. Pip is at 2.',art:`<path d="M20 146H220"/><g>${[0,1,2,3,4].map(n=>`<path d="M${20+n*50} 140v12"/><text x="${20+n*50}" y="170">${n}</text>`).join('')}</g><g transform="translate(80 64) scale(.6666667)">${characterArt('pip','point')}</g>`},
    tess:{label:'A right triangle with a square corner marked 90 degrees.',caption:'The square corner marks a 90° angle.',art:`<path d="M36 32V142H146Z" fill="#EDF3FF"/><path d="M36 128H50V142"/><text x="65" y="126">90°</text><g transform="translate(143 53) scale(.7)">${characterArt('tess','point')}</g>`},
    quad:{label:'Four equal tiles, three shaded lavender: three fourths.',caption:'Three of four equal parts: 3/4.',art:`${[0,1,2,3].map(n=>`<rect x="${24+n*48}" y="121" width="48" height="40" fill="${n<3?'#B6A2DF':'#FFFFFF'}"/>`).join('')}<g transform="translate(74 26) scale(.75)">${characterArt('quad','explain')}</g>`},
    dot:{label:'Three labelled milestones in order, 1, 2 and 3. Dot points to milestone 2.',caption:'One milestone at a time.',art:`<path d="M36 144H204" stroke-dasharray="4 5"/>${[1,2,3].map((n,i)=>`<circle cx="${36+i*84}" cy="144" r="12" fill="${n===2?'#F3CE70':'#FFFFFF'}"/><text x="${36+i*84}" y="149">${n}</text>`).join('')}<g transform="translate(80 62) scale(.6666667)">${characterArt('dot','point')}</g>`}
  };
  const d=diagrams[name];
  return `<figure class="character-math-diagram"><svg viewBox="0 0 240 180" role="img" aria-label="${d.label}" fill="none" stroke="#243653" stroke-width="2" stroke-linejoin="round"><g class="character-diagram-art">${d.art}</g></svg><figcaption>${d.caption}</figcaption></figure>`;
}

export function pointProgress(summary = {}) {
  const dailyTarget = Math.max(1, Number(summary.dailyTarget ?? 20));
  const bonusFirst = Math.max(1, Number(summary.bonusFirst ?? 15));
  const bonusStep = Math.max(1, Number(summary.bonusStep ?? 10));
  const answered = Math.max(0, Number(summary.answered ?? 0));
  const first = dailyTarget + bonusFirst;
  const computedNext = answered < first ? first : first + (Math.floor((answered - first) / bonusStep) + 1) * bonusStep;
  const next = Number(summary.nextPointAt) > answered ? Number(summary.nextPointAt) : computedNext;
  const previous = next === first ? 0 : Math.max(0, next - bonusStep);
  return { dailyTarget, bonusFirst, bonusStep, answered, first, next, previous,
    remaining: Math.max(0, next - answered), completed: Math.max(0, answered - previous),
    span: Math.max(1, next - previous), points: Math.max(0, Number(summary.points ?? 0)) };
}
