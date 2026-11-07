import { renderStudent } from './student.mjs';
import { renderTeacher } from './teacher.mjs';
const app = document.querySelector('#app');
const notice = document.querySelector('#notice');
const state = {user:null, setupRequired:false, studentId:null, students:[], summary:null, routeVersion:0};
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mathMarkup(value, trusted = false) {
  const template = document.createElement('template');
  if (trusted) template.innerHTML = String(value ?? '');
  else template.content.append(document.createTextNode(String(value ?? '')));
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) if (!walker.currentNode.parentElement?.closest('math,svg,script,style')) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const text = node.nodeValue;
    const pattern = /(?<![\w/])([−-]?\d+)\s+(\d+)\/(\d+)(?![\d/])|(?<![\w/])([−-]?\d+)\/(\d+)(?![\d/])/g;
    let match, previous = 0;
    const fragment = document.createDocumentFragment();
    while ((match = pattern.exec(text))) {
      fragment.append(document.createTextNode(text.slice(previous, match.index)));
      const math = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'math');
      if (match[1] !== undefined) {
        const whole = document.createElementNS(math.namespaceURI, 'mn');
        whole.textContent = match[1].replace('-', '−');
        math.append(whole);
        const space = document.createElementNS(math.namespaceURI, 'mspace');
        space.setAttribute('width', '0.15em');
        math.append(space);
      }
      const fraction = document.createElementNS(math.namespaceURI, 'mfrac');
      for (const value of match[1] !== undefined ? [match[2], match[3]] : [match[4], match[5]]) {
        const number = document.createElementNS(math.namespaceURI, 'mn');
        number.textContent = value.replace('-', '−');
        fraction.append(number);
      }
      math.append(fraction);
      fragment.append(math);
      previous = pattern.lastIndex;
    }
    if (previous) { fragment.append(document.createTextNode(text.slice(previous))); node.replaceWith(fragment); }
  }
  return template.innerHTML;
}

let noticeTimer;
function tell(message,error=false){clearTimeout(noticeTimer);notice.textContent=message;notice.className='notice'+(error?' error':'');notice.hidden=false;noticeTimer=setTimeout(()=>notice.hidden=true,6000);}
async function api(path,body,method=body===undefined?'GET':'POST'){
 const response=await fetch('/api'+path,{method,credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const result=await response.json().catch(()=>({error:'The response could not be read. Try again.'}));
 if(!response.ok){if(response.status===401&&state.user){state.user=null;state.summary=null;state.routeVersion++;renderAuth('Your session ended. Sign in again.');}throw Object.assign(new Error(result.error||"That didn’t save. Check the connection and try again."),{status:response.status});}return result;
}
const icons={today:'M3 5h18v16H3z M7 2v6 M17 2v6 M3 11h18',map:'M4 4h6l4 3 6-3v16l-6 2-4-3H4z M10 4v15 M14 7v15',learn:'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3z M12 6v15',practice:'m4 20 4-1L20 7l-3-3L5 16z M14 7l3 3',review:'M4 8a9 9 0 1 1-1 8 M4 3v6h6',library:'M4 3h4v18H4z M10 3h4v18h-4z M17 3l4 17-4 1-4-17z',progress:'M3 3v18h18 M6 16l5-6 4 3 5-8',rewards:'M3 8h18v5H3z M5 13v8h14v-8 M12 8v13 M12 8C3 8 6 0 12 8c6-8 9 0 0 0',students:'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-3a6 6 0 0 1 12 0v3 M17 4a4 4 0 0 1 0 8 M17 15a5 5 0 0 1 5 5',checks:'M5 3h14v18H5z M8 7h8 M8 12l2 2 5-5',assign:'M4 4h16v16H4z M8 12h8 M12 8v8',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v4 M12 18v4 M2 12h4 M18 12h4 M5 5l3 3 M16 16l3 3 M5 19l3-3 M16 8l3-3',exit:'M9 3H3v18h6 M8 12h13 M17 8l4 4-4 4'};
const icon=name=>'<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+(icons[name]||icons.learn)+'"/></svg>';
const studentNav=[['/s/today','Classroom','today'],['/s/map','The course','map'],['/s/learn','Lessons','learn'],['/s/practice','Practice','practice'],['/s/review','Review','review'],['/s/library','Reference','library'],['/s/progress','My learning','progress'],['/s/rewards','Rewards','rewards']];
const teacherNav=[['/t/dashboard','Classroom','today'],['/t/students','Student work','students'],['/t/plan','Course plan','map'],['/t/checks','Weekly checks','checks'],['/t/assign','Assignments','assign'],['/t/rewards','Rewards','rewards'],['/t/questions','Question bank','library']];
function navigate(path){if(!path.startsWith('/'))path='/'+path;const changed=path!==location.pathname+location.search;history.pushState(null,'',path);if(changed)window.scrollTo(0,0);route();}
const mathDecoration=path=>{
 const axes='<path d="M16 81h130M40 90V12"/><path d="M18 26Q40 109 68 60T139 17" stroke-width="2.5"/><circle cx="68" cy="60" r="4" fill="var(--gold)"/><text x="145" y="86">x</text><text x="34" y="11">y</text>';
 const geometry='<path d="M24 81 76 16l61 65Z" stroke-width="2"/><path d="M76 16v65" stroke-dasharray="4 4"/><path d="M76 71h10v10"/><text x="83" y="52">h</text><text x="74" y="98">b</text><text x="101" y="24">½bh</text><circle cx="24" cy="81" r="3" fill="var(--gold)"/>';
 const numbers='<path d="M12 61h143m-6-5 6 5-6 5M23 55v12M53 55v12M83 55v12M113 55v12"/><text x="16" y="83">−1</text><text x="48" y="83">0</text><text x="80" y="83">1</text><text x="110" y="83">2</text><path d="M53 50Q83 8 113 50" stroke-width="2"/><path d="m105 47 8 3-2-9"/><text x="70" y="24">+2</text>';
 return '<svg viewBox="0 0 170 106" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><g font-family="Georgia,serif" font-style="italic" font-size="13">'+(/map|plan|learn|library/.test(path)?geometry:/progress|students|checks/.test(path)?axes:numbers)+'</g></svg>';
};
const schoolBrand=href=>'<a class="brand" aria-label="Double Advanced home" href="'+href+'" data-nav><img class="brand-mark" src="/assets/favicon.svg" alt="" width="44" height="44"><span>Double Advanced<small>MATHEMATICS</small></span></a>';
function shell(html,{title='Classroom',focus=false}={}){
 const teacher=state.user?.role==='teacher';
 document.body.className=focus?'focus-mode':teacher?'teacher-app':'student-app';
 document.title=title+' · Double Advanced';
 if(focus){app.innerHTML='<main id="main" class="focus-main" tabindex="-1"><a href="/s/today" data-nav class="practice-brand">Double Advanced <span>Mathematics</span></a>'+html+'</main>';return;}
 const nav=teacher?teacherNav:studentNav;
 const link=([href,label,name])=>{
  if(href==='/t/students'&&state.studentId)href+='/'+encodeURIComponent(state.studentId);
  const active=location.pathname===href||((href==='/s/learn'||href.startsWith('/t/students'))&&location.pathname.startsWith(href));
  return '<a class="side-link'+(active?' active':'')+'" href="'+href+'" data-nav title="'+label+'" '+(active?'aria-current="page"':'')+'>'+icon(name)+'<span>'+label+'</span></a>';
 };
 const summary=state.summary||{},total=summary.answered??summary.todayAnswered??0,target=summary.dailyTarget??summary.target??20;
 const maths='<div class="sidebar-maths" aria-hidden="true"><svg viewBox="0 0 180 100"><path d="M15 78h150M28 90V12" fill="none" stroke="currentColor" opacity=".4"/><path d="M33 72Q65 73 88 44T155 20" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="88" cy="44" r="4" fill="#E7B65A"/><text x="114" y="73" font-family="Georgia,serif" font-size="22" fill="currentColor">x² + y²</text><path d="m45 29 14-16 14 16Z" fill="none" stroke="#D27E69" stroke-width="2"/></svg><p>See the pattern.<br>Make it your own.</p></div>';
 app.innerHTML='<button class="drawer-shade" aria-label="Close menu" hidden></button><aside class="sidebar" aria-label="Main navigation">'+schoolBrand(teacher?'/t/dashboard':'/s/today')+'<div class="sidebar-person"><span class="avatar" aria-hidden="true">'+escape(state.user.name.slice(0,1))+'</span><div class="school-person"><strong>'+escape(state.user.name)+'</strong><small>'+(teacher?'Teacher’s classroom':'Your learning space')+'</small></div></div><p class="nav-label">'+(teacher?'YOUR CLASSROOM':'YOUR MATHEMATICS')+'</p><div class="sidebar-navigation" id="school-navigation"><nav aria-label="'+(teacher?'Teacher':'Student')+' navigation">'+nav.map(link).join('')+'</nav></div><div class="sidebar-bottom">'+maths+'<div class="school-account"><a class="account-link" href="'+(teacher?'/t/settings':'/s/settings')+'" data-nav title="Settings">'+icon('settings')+'<span>Settings</span></a><button class="account-link" id="signout" title="Sign out">'+icon('exit')+'<span>Sign out</span></button></div></div></aside><div class="workspace"><header class="topbar"><div class="topbar-start"><button class="menu-button" id="menu-toggle" aria-label="Open course navigation" aria-controls="school-navigation" aria-expanded="false">☰</button><span class="course-breadcrumb">Mathematics</span><span class="breadcrumb-divider" aria-hidden="true">/</span><span>'+escape(title)+'</span></div><div class="topbar-status">'+(teacher?'<label for="student-switch">Learning with</label><select id="student-switch">'+(state.students.length?state.students.map(s=>'<option value="'+escape(s.id)+'" '+(s.id===state.studentId?'selected':'')+'>'+escape(s.name)+'</option>').join(''):'<option>No student yet</option>')+'</select>':'<a href="/s/today" data-nav class="today-count">'+total+' / '+target+' today</a><a href="/s/rewards" data-nav class="points-pill">'+(summary.points??0)+' points</a>')+'</div></header><main id="main" class="page-content" tabindex="-1">'+html+'</main><footer class="app-footer"><span class="footer-brand">Double Advanced <small>Mathematics</small></span><span>A pencil. A little paper. Room to think.</span><span class="footer-math" aria-hidden="true">π &nbsp; × &nbsp; √ &nbsp; ∞</span></footer></div>';
 document.querySelectorAll('.page-heading,.teacher-chapter-heading').forEach(heading=>{heading.querySelector('.page-math,.teacher-chapter-mark')?.remove();const art=document.createElement('span');art.className='math-heading-decoration';art.setAttribute('aria-hidden','true');art.innerHTML=mathDecoration(location.pathname);heading.append(art);});
 const menu=document.querySelector('#menu-toggle'),shade=document.querySelector('.drawer-shade');
 menu.onclick=()=>{const open=document.body.classList.toggle('drawer-open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close course navigation':'Open course navigation');syncDrawer();if(open&&innerWidth<768)document.querySelector('.sidebar .brand').focus();};
 shade.onclick=closeDrawer;
 syncDrawer();
 document.querySelector('#signout').onclick=async()=>{try{await api('/logout',{});state.user=null;state.summary=null;state.students=[];state.studentId=null;history.replaceState(null,'','/login');renderAuth();}catch(e){tell(e.message,true);}};
 document.querySelector('#student-switch')?.addEventListener('change',event=>{state.studentId=event.target.value;navigate(location.pathname.startsWith('/t/students')?'/t/students/'+state.studentId:location.pathname);});
}
function renderAuth(message=''){
 document.body.className='auth-page';const setup=state.setupRequired;
 app.innerHTML='<main class="login-layout" id="main"><section class="login-story">'+schoolBrand('/login')+'<div class="login-story-content"><p class="eyebrow">THE DOUBLE ADVANCED MATHEMATICS COURSE</p><h1>A little further,<br>every day.</h1><p>See the pattern. Understand the idea.<br>Make the mathematics your own.</p><img class="login-art" src="/assets/math-playground.svg" alt="" width="320" height="340"><div class="login-math-tags" aria-hidden="true"><span>01 &nbsp; Explore the lesson</span><span>02 &nbsp; See an example</span><span>03 &nbsp; Have a go</span></div></div><small>Numbers, algebra, geometry &amp; the joy of figuring things out.</small></section><section class="login-form-area"><div class="auth-panel"><p class="eyebrow">'+(setup?'LET’S BEGIN':'WELCOME BACK')+'</p><h1>'+(setup?'Teacher setup':'Sign in')+'</h1><p class="muted">'+(setup?'Create the first teacher account to begin.':'Your lessons, practice and saved work are waiting.')+'</p><form id="auth-form">'+(setup?'<div class="field"><label for="name">First name or nickname</label><input id="name" name="name" autocomplete="given-name" required maxlength="32"></div>':'')+'<div class="field"><label for="username">Username</label><input id="username" name="username" autocomplete="username" autocapitalize="none" required maxlength="24"></div><div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="'+(setup?'new-password':'current-password')+'" '+(setup?'minlength="8"':'')+' required maxlength="72"></div>'+(!setup?'<label class="check-label"><input name="remember" type="checkbox">Stay signed in on this device</label>':'')+'<p class="form-error" role="alert" '+(message?'':'hidden')+'>'+escape(message)+'</p><button class="button wide" type="submit">'+(setup?'Create teacher account':'Sign in')+'</button></form><p class="login-note">Student accounts are created by a teacher.</p></div></section></main>';
 document.querySelector('#auth-form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,button=f.querySelector('button'),error=f.querySelector('.form-error');button.disabled=true;error.hidden=true;const data=new FormData(f);try{const r=await api(setup?'/setup':'/login',{username:data.get('username'),password:data.get('password'),name:data.get('name'),remember:data.get('remember')==='on'});state.user=r.user;state.setupRequired=false;navigate(state.user.role==='teacher'?'/t/dashboard':'/s/today');}catch(err){error.textContent=err.message;error.hidden=false;}finally{button.disabled=false;}};
}
async function route(){
 if(!state.user)return renderAuth(); const version=++state.routeVersion,teacher=state.user.role==='teacher';let path=location.pathname;
 if(path==='/'||path==='/login'||(teacher&&!path.startsWith('/t/'))||(!teacher&&!path.startsWith('/s/'))){path=teacher?'/t/dashboard':'/s/today';history.replaceState(null,'',path);}
 const context={api,shell:(...args)=>{if(version===state.routeVersion)shell(...args);},navigate,escape,mathMarkup,tell,state};
 try{
  if(teacher){const result=await api('/v2/teacher/students');state.students=result.students||result.accounts||[];if(!state.students.some(s=>s.id===state.studentId))state.studentId=state.students[0]?.id||null;if(version!==state.routeVersion)return;await renderTeacher(path+location.search,context);}
  else{state.summary=await api('/v2/student/summary');if(version!==state.routeVersion)return;if(path==='/s/settings'){shell('<div class="page-heading"><div><p class="eyebrow">YOUR ACCOUNT</p><h1>Settings</h1></div></div><section class="panel"><h2>'+escape(state.user.name)+'</h2><p>Username: '+escape(state.user.username)+'</p><p>Your teacher can reset your password. Your answers and progress are saved to your account.</p><button class="button secondary" id="account-signout">Sign out</button></section>',{title:'Settings'});document.querySelector('#account-signout').onclick=()=>document.querySelector('#signout').click();}else await renderStudent(path+location.search,context);}
 }catch(error){if(version!==state.routeVersion||!state.user)return;shell('<section class="empty-state"><h1>Let’s try that again.</h1><p>'+escape(error.message)+'</p><button class="button" id="retry-page">Try again</button></section>',{title:'Connection'});document.querySelector('#retry-page').onclick=route;}
}
document.addEventListener('click',e=>{const a=e.target.closest('a[data-nav]');if(a&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey){e.preventDefault();navigate(a.getAttribute('href'));}});
function syncDrawer(){const mobile=innerWidth<768,open=document.body.classList.contains('drawer-open'),sidebar=document.querySelector('.sidebar'),navigation=document.querySelector('#school-navigation'),workspace=document.querySelector('.workspace'),shade=document.querySelector('.drawer-shade');if(navigation)navigation.hidden=mobile&&!open;if(sidebar)sidebar.inert=mobile&&!open;if(workspace)workspace.inert=mobile&&open;if(shade)shade.hidden=!(mobile&&open);}
function closeDrawer(){document.body.classList.remove('drawer-open');const button=document.querySelector('#menu-toggle');button?.setAttribute('aria-expanded','false');button?.setAttribute('aria-label','Open course navigation');syncDrawer();button?.focus();}
window.addEventListener('resize',syncDrawer);
document.addEventListener('keydown',e=>{if(!document.body.classList.contains('drawer-open'))return;if(e.key==='Escape')closeDrawer();if(e.key==='Tab'&&innerWidth<768){const links=[...document.querySelectorAll('.sidebar a,.sidebar button')];if(e.shiftKey&&document.activeElement===links[0]){e.preventDefault();links.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===links.at(-1)){e.preventDefault();links[0]?.focus();}}});
window.addEventListener('popstate',route);
async function boot(){try{const s=await api('/session');state.user=s.user;state.setupRequired=s.setupRequired;if(!state.user){history.replaceState(null,'','/login');renderAuth();}else await route();}catch(e){renderAuth(e.message);}}
boot();
