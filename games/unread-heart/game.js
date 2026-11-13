(()=>{'use strict';
const $=s=>document.querySelector(s);
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const KEY='unread-heart-v6';
const store={get(k=KEY){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(v,k=KEY){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(){try{localStorage.removeItem(KEY)}catch(e){}}};
const fresh=()=>({v:1,name:'',sid:'',stage:'intro',map:'home',x:0,y:0,dir:0,f:{},clues:[],hyp:{a:0,b:0},chat:{class:[],yunseul:[],teacher:[],mother:[],hajun:[]},shown:{class:0,yunseul:0,teacher:0,mother:0,hajun:0},end:0,rep:null});
let S=fresh();
const P={x:0,y:0,dir:0,moving:false,path:null,then:null};
const save=()=>{S.x=P.x;S.y=P.y;S.dir=P.dir;store.set(S)};
const has=c=>S.clues.includes(c);
/* ---------- 소리 ---------- */
const SND={on:store.get('uh-snd')!=='off',vol:+(store.get('uh-vol')??.6),bgm:null,cur:'',cache:{},last:{}},SV={S1:.7,S2:.6,S3:.35,S4:.7,S5:.6,S9:.6,S11:.8};
function sfx(n){if(!SND.on)return null;const now=Date.now();if(now-(SND.last[n]||0)<140)return null;SND.last[n]=now;
  try{const a=(SND.cache[n]=SND.cache[n]||new Audio('assets/snd/'+n+'.mp3')).cloneNode();a.volume=Math.min(1,SND.vol*(SV[n]||1));a.play().catch(()=>{});return a}catch(e){return null}}
function bgm(n){const g=SND.vol*.38;if(n===SND.cur&&SND.bgm){SND.bgm.volume=SND.on?g:0;if(SND.on)SND.bgm.play().catch(()=>{});else SND.bgm.pause();return}
  const old=SND.bgm;SND.cur=n;SND.bgm=null;if(old){let v=old.volume;const t=setInterval(()=>{v-=.04;if(v<=0){clearInterval(t);old.pause()}else old.volume=v},60)}
  if(!n)return;let a;try{a=new Audio('assets/snd/'+n+'.mp3')}catch(e){return}a.loop=true;a.volume=0;SND.bgm=a;if(!SND.on)return;a.play().catch(()=>{});
  let v=0;const t=setInterval(()=>{if(SND.bgm!==a){clearInterval(t);return}v+=.02;if(v>=g){a.volume=g;clearInterval(t)}else a.volume=v},60)}
const sndApply=()=>bgm(SND.cur);
function sndWarm(){if(SND.warm)return;SND.warm=1;for(let i=1;i<=15;i++){try{const a=new Audio('assets/snd/S'+i+'.mp3');a.preload='auto';SND.cache['S'+i]=a}catch(e){}}}

/* ---------- 이미지 ---------- */
const IMG={};
const NEED=['bg_home.jpg','bg_school.jpg','bg_lib.jpg','player.png','title.jpg',...['mother','sister','grandma','jimin','teacher','yunseul','staff'].map(k=>`npc_${k}.png`),
  ...['player','mother','sister','grandma','jimin','teacher','yunseul','staff'].flatMap(k=>[0,1,2].map(i=>`p_${k}_${i}.webp`)),...[1,2,3,4,5,6,7,8,9].map(i=>`doc_C${i}.webp`),...[1,2,3,4].map(i=>`end_${i}.webp`),...['teacher','mother','yunseul','jimin'].map(k=>`av_${k}.webp`),...['h1','m1','m2','m3','g1','g3','g4','s1','r1','r2','r3','g2_0','g2_1','g2_2','g2_3','g2_4','p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11','door'].map(k=>k+'.webp')];
const loadImgs=()=>{let d=0;return Promise.all(NEED.map(n=>new Promise(r=>{const i=new Image();i.onload=i.onerror=()=>{d++;$('#tLoad').textContent=`그림을 불러오는 중… ${Math.round(d/NEED.length*100)}%`;r()};i.src='assets/'+n;IMG[n.split('.')[0]]=i})))};

/* ---------- 맵 ---------- */
const MAP={},GATEFLAG={yroom:'roomOpen',sroom:'knocked',office:'officeOpen'};
for(const k in MAPS){const m=MAPS[k],s=m.s,sc=r=>r.map(v=>v*s);
  MAP[k]={k,bg:m.bg.split('/').pop().split('.')[0],W:1536*s,H:1024*s,walk:m.walk.map(sc),block:m.block.map(sc),
    gates:Object.entries(m.gates).map(([id,r])=>({id,r:sc(r)})),start:sc(m.start),
    spots:Object.fromEntries(Object.entries(m.spots).map(([n,p])=>{p=sc(p);return[n,{x:p[0],y:p[1],ax:p[2]??p[0],ay:p[3]??p[1]+44}]}))};
}
const inR=(r,x,y)=>x>=r[0]&&x<=r[2]&&y>=r[1]&&y<=r[3];
function ptFree(m,x,y){let ok=false;for(const r of m.walk)if(inR(r,x,y)){ok=true;break}
  if(!ok)return false;for(const r of m.block)if(inR(r,x,y))return false;
  for(const g of m.gates)if(!S.f[GATEFLAG[g.id]]&&inR(g.r,x,y))return false;return true}
const boxFree=(m,x,y)=>ptFree(m,x-11,y-7)&&ptFree(m,x+11,y-7)&&ptFree(m,x-11,y+2)&&ptFree(m,x+11,y+2);
function findPath(m,sx,sy,tx,ty){
  const C=16,cols=Math.ceil(m.W/C),rows=Math.ceil(m.H/C),memo=new Int8Array(cols*rows);
  const fr=(cx,cy)=>{if(cx<0||cy<0||cx>=cols||cy>=rows)return false;const i=cy*cols+cx;if(!memo[i])memo[i]=boxFree(m,cx*C+8,cy*C+8)?1:2;return memo[i]===1};
  const nearFree=(cx,cy,R)=>{if(fr(cx,cy))return[cx,cy];for(let r=1;r<=R;r++){let b=null,bd=1e9;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;if(fr(cx+dx,cy+dy)){const d=dx*dx+dy*dy;if(d<bd){bd=d;b=[cx+dx,cy+dy]}}}if(b)return b}return null};
  const t=nearFree(Math.floor(tx/C),Math.floor(ty/C),8),s=nearFree(Math.floor(sx/C),Math.floor(sy/C),3);
  if(!t||!s)return null;
  const prev=new Int32Array(cols*rows).fill(-1),q=[s[1]*cols+s[0]],goal=t[1]*cols+t[0];prev[q[0]]=q[0];
  const D=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for(let h=0;h<q.length;h++){const c=q[h];if(c===goal)break;const cx=c%cols,cy=(c/cols)|0;
    for(const[dx,dy]of D){const nx=cx+dx,ny=cy+dy;if(!fr(nx,ny))continue;if(dx&&dy&&(!fr(cx+dx,cy)||!fr(cx,cy+dy)))continue;const n=ny*cols+nx;if(prev[n]<0){prev[n]=c;q.push(n)}}}
  if(prev[goal]<0)return null;
  const out=[];for(let c=goal;c!==prev[c];c=prev[c])out.push([(c%cols)*C+8,((c/cols)|0)*C+8]);out.reverse();
  if(boxFree(m,tx,ty)&&Math.floor(tx/C)===t[0]&&Math.floor(ty/C)===t[1])out.push([tx,ty]);
  return out;
}

/* ---------- 화면 공통 ---------- */
const cv=$('#cv'),ctx=cv.getContext('2d');let dpr=1,zoom=1,camx=0,camy=0,busy=false,touch=false;
function resize(){dpr=Math.min(window.devicePixelRatio||1,2);cv.width=Math.round(cv.clientWidth*dpr);cv.height=Math.round(cv.clientHeight*dpr)}
addEventListener('resize',resize);
const overlayOpen=()=>busy||!$('#zoom').hidden||!$('#miniOv').hidden||!$('#dlg').hidden||!$('#phone').hidden||!$('#modal').hidden||!$('#title').hidden||S.stage!=='play';
function toast(t){for(const o of $('#toast').children)if(o.textContent===t)return;const d=el('div',null,esc(t));$('#toast').append(d);setTimeout(()=>d.remove(),2600)}
async function fade(fn){$('#fade').classList.add('on');await wait(380);await fn();await wait(120);$('#fade').classList.remove('on')}

/* ---------- 대화 ---------- */
const DOCS=['C1','C2','C3','C4','C5','C6','C7','C8','C9'];
const CH={me:{n:()=>S.name||'나',p:'player'},mother:{n:'윤슬 어머니',p:'mother'},grandma:{n:'할머니',p:'grandma'},sister:{n:'윤슬 언니',p:'sister'},
  jimin:{n:'지민',p:'jimin'},vendor:{n:'단체복 업체 직원'},teacher:{n:'담임 선생님',p:'teacher'},staff:{n:'도서관 선생님',p:'staff'},yunseul:{n:'윤슬',p:'yunseul'},nar:{n:''},note:{n:'소통 노트'}};
let advance=null,pick=null;
function showLine(who,text,ex=0){const c=CH[who],por=$('#dPor'),box=$('#dBox');$('#dlg').hidden=false;
  if(c.p){por.src=`assets/p_${c.p}_${ex||0}.webp`;por.style.visibility='visible';por.alt=(typeof c.n==='function'?c.n():c.n)+' 초상'}else por.style.visibility='hidden';
  box.className=who==='note'?'note':who==='nar'?'nar':'';$('#dlg').classList.toggle('center',!c.p);
  const di=$('#dImg'),pic=typeof ex==='string'&&ex[0]==='@',doc=pic||(typeof ex==='string'&&DOCS.includes(ex));di.hidden=!doc;$('#dlg').classList.toggle('doc',doc);$('#dZoom').hidden=!doc;if(doc){di.src=pic?`assets/${ex.slice(1)}.webp`:`assets/doc_${ex}.webp`;di.alt=pic?'':CL[ex].t}const n=typeof c.n==='function'?c.n():c.n;$('#dName').textContent=n;$('#dName').style.visibility=n?'visible':'hidden';
  const dn=$('#dNext');dn.className='';dn.textContent='▼ 스페이스 또는 터치';
  if(who==='note'){const q=typeof ex==='string'?ex:'';$('#dText').innerHTML=(q?`<div class="ntq"><small>방금 고른 말</small>${esc(q)}</div>`:'')+`<div class="ntw"><small>${q?'왜 아쉬울까?':'기억해 두기'}</small>${hl(text)}</div>`;dn.className='ntb';dn.textContent=q?'다시 골라 보기 ▶':'확인 ▶'}
  else $('#dText').textContent=text;$('#dCh').innerHTML='';box.scrollTop=0}
const HL=/(공감적 경청|나 전달법|너 전달법|협력적 해결|상황 → 내 감정 → 바라는 점|\(사실\)|짐작|비난|상대의 속도|원하는 도움|역할 분담|역할을 나누는|감정을 먼저|끝까지 듣고|허락받은 범위)/g;
const hl=t=>esc(t).replace(/\n/g,'<br>').replace(HL,m=>m==='사실('?'<b>사실</b>(':`<b>${m}</b>`);
const say=(who,text,ex)=>new Promise(r=>{showLine(who,text,ex);$('#dNext').hidden=false;pick=null;advance=()=>{advance=null;r()}});
const ask=(line,opts)=>new Promise(r=>{showLine(...line);$('#dNext').hidden=true;advance=null;
  pick=i=>{if(i<0||i>=opts.length)return;pick=null;r(i)};
  opts.forEach((o,i)=>{const b=el('button','ch',`<i>${i+1}</i>${esc(o.t)}`);b.onclick=()=>pick&&pick(i);$('#dCh').append(b)})});
async function quiz(line,opts){for(;;){const o=opts[await ask(line,opts)];if(!o.ok)sfx('S9');if(o.r)await say(...o.r);if(o.ok)return;await say('note',o.why,o.t)}}
async function scene(fn){if(busy)return;busy=true;P.path=null;P.then=null;keys.clear();try{await fn()}finally{$('#dlg').hidden=true;advance=pick=null;busy=false;save();hud()}}
$('#dlg').addEventListener('click',e=>{if(e.target.closest('.ch'))return;if(e.target.id==='dImg'||e.target.id==='dZoom'){zoomImg($('#dImg').src);return}advance&&advance()});
function zoomImg(src){$('#zImg').src=src;$('#zoom').hidden=false}
$('#zoom').onclick=()=>{$('#zoom').hidden=true};

/* ---------- 자료 ---------- */
const CL={
 C1:{t:'단합대회 준비표',s:'윤슬 책상 위 행사 파일 (윤슬이 보여 주기로 한 자료)',b:'준비 항목 12개\n· 윤슬 10개: 반티 주문, 수요 조사, 업체 연락, 예산 정리, 응원 도구, 간식, 조 편성, 현수막 문구, 안전 점검표, 당일 일정표\n· 지민 1개: 사이즈 수량 입력\n· 반장(나) 1개: 당일 출석 확인'},
 C2:{t:'가족 일정 대화',s:'윤슬 어머니의 휴대전화 (어머니가 직접 보여 줌)',b:'어머니: 토요일 수학 보강 잡았다. 단합대회 끝나면 바로 와.\n어머니: 옆집 서연이는 학원 세 개 다니면서 임원도 한다더라.\n윤슬: 네.\n→ 윤슬의 생각을 묻지 않고 정한 일정, 다른 아이와의 비교'},
 C3:{t:'가족의 이야기',s:'할머니·언니 (본인이 말하고 기록을 허락함)',b:'할머니: 방을 치워 준다며 책상을 정리하다가, 반티 시안을 그린 공책을 묻지 않고 재활용 상자에 넣었다.\n언니: 시험 스트레스로 "너 때문에 집중이 안 된다"고 소리쳤다. 윤슬은 그때 업체와 통화 중이었다.'},
 C4:{t:'반티 주문 입력표',s:'우리 반 교탁 (학급 공용 출력물)',b:'입력자: 지민 / 입력 시각: 그저께 밤 11:20\nS 4벌 · M 6벌 · L 16벌 · XL 2벌 (합계 28벌)'},
 C5:{t:'사이즈 수요 조사표',s:'우리 반 게시판',b:'조사자: 윤슬\nS 4명 · M 16명 · L 6명 · XL 2명 (합계 28명)'},
 C6:{t:'업체 회신·환불 확인서',s:'교무실 우리 반 행사 서류함 (담임 선생님이 열람을 허락함)',b:'오늘 08:35 윤슬: 수량이 잘못 들어갔습니다. 정정 부탁드립니다.\n08:50 업체: 정정하면 다시 생산해야 해서 내일 배송이 불가능합니다. 아직 생산 전이라 지금 취소하시면 전액 환불됩니다.\n09:10 주문 취소 · 224,000원 전액 환불 완료 (학급비 계좌)\n업체 문의 전화: 070-0000-0142'},
 C7:{t:'단합대회 업무 분담표',s:'1층 로비 게시판',b:'1학년 3반\n총괄 윤슬 · 주문 윤슬 · 예산 윤슬 · 응원 윤슬 · 안전 윤슬\n담임 메모: "꼼꼼한 부반장이 맡아 주면 든든하겠다."'},
 C8:{t:'방문 동의 확인',s:'시립도서관 안내데스크',b:'19:20 윤슬 어머니가 전화로 윤슬의 안전을 확인함.\n도서관 선생님이 윤슬에게 물었고, 윤슬이 "10분만 이야기할게요"라고 동의함.'},
 C10:{t:'주문 수정 이력',s:'학급 행사용 노트북 (담임 선생님이 열람을 허락함)',b:'그저께 23:20 지민 최초 입력 (M 6, L 16)\n어제 23:58 윤슬 확인용 표 작성 (M 16, L 6) · 메모: 내일 아침 지민이에게 물어보기\n오늘 08:31 윤슬 업체에 정정 요청\n오늘 09:10 주문 취소\n주문번호 0528'},
 C9:{t:'윤슬의 이야기',s:'윤슬 (본인이 직접 말함)',b:'아침에 수량 오류를 발견해 업체에 연락했다. 내일까지 다시 만들 수 없다는 답을 듣고, 학급비를 지키려고 취소했다.\n설명을 쓰기 전에 "무책임하다"는 말이 먼저 올라와 알림을 열 수 없었다.\n집과 학교에서 일이 몰렸지만 못 하겠다는 말을 하지 못했다.'}};
const HY={a:{q:'가설 1. 반티 주문은 왜 취소됐을까?',need:['C4','C5','C6'],done:'입력표의 M·L 수량이 수요표와 뒤바뀌어 있었다. 윤슬은 바로잡으려 했지만 내일까지 다시 만들 수 없어서, 전액 환불이 되는 취소를 골랐다.'},
  b:{q:'가설 2. 윤슬은 왜 지쳐 있었을까?',need:['C1','C7'],done:'준비 항목 12개 중 10개, 분담표의 다섯 역할이 모두 윤슬에게 몰려 있었다. 역할을 나누는 대화가 없었다.'}};
function give(c){if(has(c))return;S.clues.push(c);sfx('S11');toast('새 자료: '+CL[c].t);hud()}
const hypDone=()=>S.hyp.a&&S.hyp.b;

/* ---------- 휴대전화 ---------- */
const RM={class:{n:'1학년 3반'},yunseul:{n:'윤슬'},teacher:{n:'담임 선생님'},mother:{n:'윤슬 어머니'},hajun:{n:'하준'}};
const AV={'윤슬':'yunseul','지민':'jimin','담임 선생님':'teacher','윤슬 어머니':'mother'};
const AVC=['#c0735a','#5f8f6a','#8a6fb0','#b08a3a','#4f86a8','#a8607c'];
const avc=w=>AVC[[...w].reduce((a,c)=>a+c.charCodeAt(0),0)%AVC.length];
const avH=w=>w==='1학년 3반'?'<span class="av" style="background:#52679f">3반</span>':AV[w]?`<span class="av" data-w="${esc(w)}" role="button" aria-label="${esc(w)} 프로필 보기" style="cursor:pointer;background:#e8e1d2 url(assets/av_${AV[w]}.webp) center/cover"></span>`:`<span class="av" data-w="${esc(w)}" role="button" aria-label="${esc(w)} 프로필 보기" style="cursor:pointer;background:${avc(w)}">${esc(w.slice(0,1))}</span>`;
let ph={app:'home',room:null},hySel={a:new Set(),b:new Set()},hyFb={a:'',b:''};
const phOpen=()=>!$('#phone').hidden;
const unread=k=>S.chat[k].slice(S.shown[k]??0).filter(m=>!m.sys&&!m.me).length;
const totU=()=>Object.keys(S.chat).reduce((a,k)=>a+unread(k),0);
let revT=0,noteT=0;
function notify(room){const ms=S.chat[room].slice(S.shown[room]??0).filter(m=>!m.sys&&!m.me),f=ms[0];if(!f)return;sfx('S2');const more=ms.length>1?` 외 ${ms.length-1}개`:'';
  if(!phOpen()){toast(`${room==='class'?'1학년 3반 · ':''}${f.w}: ${f.t.length>24?f.t.slice(0,24)+'…':f.t}`);return}
  const n=$('#phNote');n.innerHTML=`${avH(room==='class'?f.w:RM[room].n)}<div><b>${esc(room==='class'?'1학년 3반 · '+f.w:RM[room].n)}${more}</b><small>${esc(f.t)}</small></div>`;n.hidden=false;
  n.onclick=()=>{n.hidden=true;ph.app='room';ph.room=room;renderPhone()};clearTimeout(noteT);noteT=setTimeout(()=>n.hidden=true,3600)}
function pushMsg(room,w,t,o={}){const all=(S.shown[room]??0)>=S.chat[room].length,inRoom=phOpen()&&ph.app==='room'&&ph.room===room;S.chat[room].push({w,t,...o});
  if(o.me||o.sys||(inRoom&&all)){if(all)S.shown[room]=S.chat[room].length;if(inRoom&&all&&!o.me&&!o.sys)sfx('S1')}else if(!inRoom)notify(room);
  if(phOpen())renderPhone(!inRoom);hud();store.set(S)}
function openPhone(app='home'){if(S.stage==='intro'&&!S.f.unlocked)app='lock';ph={app,room:null,num:''};$('#phone').hidden=false;$('#phone').classList.toggle('intro',S.stage==='intro');keys.clear();renderPhone()}
function closePhone(){if(S.stage==='intro')return;$('#phone').hidden=true}
const ICON={cal:'<svg viewBox="0 0 40 40" width="34"><rect x="6" y="9" width="28" height="25" rx="4" fill="#fff"/><rect x="6" y="9" width="28" height="8" rx="4" fill="#ffd9cf"/><path d="M13 6v7M27 6v7" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="14" cy="23" r="2" fill="#e0704f"/><circle cx="20" cy="23" r="2" fill="#e0704f"/><circle cx="26" cy="23" r="2" fill="#e0704f"/><circle cx="14" cy="29" r="2" fill="#e0704f"/></svg>',call:'<svg viewBox="0 0 40 40" width="34"><path d="M12 6h5l3 8-4 3a16 16 0 0 0 7 7l3-4 8 3v5a3 3 0 0 1-3 3C18 31 9 22 9 9a3 3 0 0 1 3-3z" fill="#fff"/></svg>',talk:'<svg viewBox="0 0 40 40" width="36"><path d="M7 9h26a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H19l-8 6v-6H7a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3z" fill="#fff"/><circle cx="14" cy="18.500" r="2" fill="#2c8c80"/><circle cx="20" cy="18.500" r="2" fill="#2c8c80"/><circle cx="26" cy="18.500" r="2" fill="#2c8c80"/></svg>',
  data:'<svg viewBox="0 0 40 40" width="36"><path d="M5 11a3 3 0 0 1 3-3h8l4 4h12a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="#fff"/><path d="M12 20h16M12 25h11" stroke="#b9772a" stroke-width="2.500" stroke-linecap="round"/></svg>'};
function renderPhone(keep){const top=$('#phTop'),scr=$('#phScr'),bot=$('#phBot'),intro=S.stage==='intro',st=scr.scrollTop,f=S.f;
  $('#phClock').textContent=intro?'16:40':{home:'17:40',school:'18:35',lib:'19:30'}[S.map];
  top.innerHTML='';scr.innerHTML='';bot.innerHTML='';bot.hidden=true;
  const bar=(title,back,prof)=>{if(back){const b=el('button',null,'‹');b.setAttribute('aria-label','뒤로');b.onclick=back;top.append(b)}top.append(el('span',null,esc(title)));
    if(!intro){const x=el('button',null,'✕');x.setAttribute('aria-label','휴대전화 닫기');x.onclick=closePhone;top.append(x)}};
  const btn=(t,cls,on)=>{bot.hidden=false;const b=el('button',cls,esc(t));b.onclick=on;bot.append(b)};
  if(ph.app==='lock'){const w=el('div','wall lock',`<h3>16:40</h3><p>목요일</p><div class="lk">${S.chat.class.filter(m=>!m.sys).slice(2,5).map(m=>`<div><b>모아톡 · 1학년 3반</b><small>${esc(m.w)}: ${esc(m.t)}</small></div>`).join('')}<p style="padding:6px 0 0;text-align:center">알림 6개</p></div><p class="ul">화면을 눌러 잠금 해제</p>`);
    w.onclick=()=>{f.unlocked=1;store.set(S);ph.app='home';renderPhone()};scr.append(w);return}
  if(ph.app==='pass'){bar('모아톡 잠금',()=>{ph.app='home';renderPhone()});const w=el('div','wall lock pass',`<p style="padding-top:26px;font-size:1.1em;font-weight:700">모아톡이 잠겨 있습니다</p><p>비밀번호 4자리를 입력하세요</p><div class="code lt">${[0,1,2,3].map(i=>`<i>${ph.num[i]?'●':''}</i>`).join('')}</div><p class="hintp">${ph.err||'힌트: 단합대회 날짜 (월과 일)'}</p>`),kp=el('div','kp');
    for(const k of['1','2','3','4','5','6','7','8','9','','0','←']){const b=el('button',null,k);if(!k)b.style.visibility='hidden';b.onclick=()=>{if(k==='←')ph.num=ph.num.slice(0,-1);else if(ph.num.length<4)ph.num+=k;
      if(ph.num.length===4){if(ph.num==='1113'){sfx('S8');f.talkOpen=1;store.set(S);ph.app='talk';ph.num=''}else{ph.num='';ph.err='비밀번호가 맞지 않습니다. 일정 앱에서 단합대회 날짜를 찾아보세요.';sfx('S9')}}renderPhone()};kp.append(b)}
    w.append(kp);scr.append(w);return}
  if(ph.app==='home'){bar('홈');const w=el('div','wall',`<h3>${$('#phClock').textContent}</h3><p>목요일</p>`),g=el('div','apps');
    const mk=(id,name,bg,badge,on)=>{const a=el('button','app',`<span class="ic" style="background:${bg}">${ICON[id]}</span>${name}${badge?`<span class="bd">${badge}</span>`:''}`);a.onclick=on;g.append(a)};
    mk('talk','모아톡','#2c8c80',totU(),()=>{ph.app=f.talkOpen||!intro?'talk':'pass';ph.num='';ph.err='';renderPhone()});
    mk('call','전화','#4f86c6',0,()=>{if(intro&&!f.ys){toast('먼저 모아톡에서 단톡방을 확인하자');return}ph.app='call';ph.num='';renderPhone()});
    mk('cal','일정','#e0704f',0,()=>{ph.app='cal';ph.day=0;renderPhone()});
    mk('data','행사 자료','#d99a3d',0,()=>{if(intro){toast('먼저 모아톡에서 단톡방을 확인하자');return}ph.app='data';renderPhone()});
    w.append(g);if(intro)w.append(el('p',null,!f.ys?'모아톡을 눌러 학급 단톡방을 확인하세요.':f.ysSent&&!f.called?'윤슬의 프로필에서 번호를 찾아 전화해 보세요.':'모아톡에 새 소식이 있는지 확인하세요.'));scr.append(w)}
  else if(ph.app==='cal'){bar('일정',()=>{ph.app='home';renderPhone()});const EV={5:'수학 수행평가',9:'학급 회의 · 단합대회 역할 정하기',13:'1학년 단합대회',18:'도서관 책 반납',24:'기말고사 범위 발표'};
    const c=el('div','cal',`<h4>11월</h4><div class="cg">${['일','월','화','수','목','금','토'].map(d=>`<b>${d}</b>`).join('')}${Array.from({length:30},(_,i)=>i+1).map(d=>`<button data-d="${d}" class="${d===12?'today ':''}${EV[d]?'ev ':''}${ph.day===d?'sel':''}">${d}</button>`).join('')}</div><div class="cev">${ph.day?`<b>11월 ${ph.day}일${ph.day===12?' · 오늘':''}</b>${EV[ph.day]||'일정이 없습니다.'}`:'날짜를 눌러 일정을 확인하세요.<br>점이 찍힌 날에 일정이 있습니다.'}</div>`);
    c.querySelectorAll('button').forEach(x=>x.onclick=()=>{ph.day=+x.dataset.d;sfx('S3');renderPhone(true)});scr.append(c)}
  else if(ph.app==='call'){bar('전화',()=>{ph.app='home';renderPhone()});const d=el('div','dial');
    d.append(el('div','num',esc(ph.num.replace(/^(\d{3})(\d{3,4})(\d{0,4})$/,(m,a,b,c)=>c?`${a}-${b}-${c}`:`${a}-${b}`))||'<span>번호를 누르거나 연락처를 고르세요</span>'));
    const kp=el('div','kp');for(const k of'123456789*0#'){const b=el('button',null,k);b.onclick=()=>{if(ph.num.length<11&&/\d/.test(k)){ph.num+=k;renderPhone()}};kp.append(b)}d.append(kp);
    const row=el('div','crow'),del=el('button','del','지우기'),go=el('button','go','통화');del.onclick=()=>{ph.num=ph.num.slice(0,-1);renderPhone()};go.onclick=()=>dial(ph.num);row.append(del,go);d.append(row);
    d.append(el('div','sec','연락처'));d.append(el('div','tip','저장된 연락처가 없습니다. 번호를 직접 눌러 주세요.'));scr.append(d)}
  else if(ph.app==='calling'){const d=el('div','calling',`${ph.who==='010-0311-1127'?avH('윤슬'):'<span class="av" style="background:#4f86c6">☎</span>'}<b>${esc(ph.who)}</b><small>연결 중…</small>`);scr.append(d)}
  else if(ph.app==='profile'){const w=ph.pk,PF={'윤슬':['단합대회 D-1','010-0311-1127'],'담임 선생님':['1학년 3반 담임','학교 전화로 연락'],'윤슬 어머니':['윤슬 엄마','비공개'],'하준':['축구가 좋아','비공개'],'서아':['오늘도 화이팅','비공개'],'지민':['응원단장','비공개']}[w]||['','비공개'];bar('프로필',()=>{ph.app=ph.from;renderPhone()});
    scr.append(el('div','prof',`${avH(w)}<b>${esc(w)}</b><small>${PF[0]}</small><div><span>전화번호</span><strong>${PF[1]}</strong></div>`))}
  else if(ph.app==='talk'){bar('모아톡',()=>{ph.app='home';renderPhone()});
    for(const k of['class','yunseul','teacher','mother','hajun']){const ms=S.chat[k];if(!ms.length)continue;const last=[...ms].reverse().find(m=>!m.sys||m.ev)||ms[ms.length-1],un=unread(k);
      const b=el('button','rm',`${avH(RM[k].n)}<div><b>${RM[k].n}${k==='class'?' <small style="display:inline">28</small>':''}</b><small>${esc((k==='class'&&last.w&&!last.me?last.w+': ':'')+last.t.split('\n')[0])}</small></div>${un?`<span class="bd">${un}</span>`:''}`);
      b.onclick=()=>{ph.app='room';ph.room=k;renderPhone()};scr.append(b)}}
  else if(ph.app==='room'){const k=ph.room,ms=S.chat[k];if(S.shown[k]==null)S.shown[k]=ms.length;const n=S.shown[k],done=n>=ms.length;bar(RM[k].n,()=>{ph.app='talk';renderPhone()},k!=='class');
    const box=el('div','msgs');for(const m of ms.slice(0,n)){
      if(m.sys){box.append(el('div','m sys',esc(m.t)));continue}
      const d=el('div','m'+(m.me?' me':'')),tm=m.tm?`<span class="tm">${m.tm}</span>`:'';
      const body=`<div>${m.me?'':`<div class="w">${esc(m.w)}</div>`}<div class="b">${esc(m.t)}${m.q?`<span class="q">${esc(m.q)}</span>`:''}</div>${m.nr?'<span class="nr">읽지 않음</span>':''}</div>`;
      d.innerHTML=m.me?tm+body:avH(m.w)+body+tm;box.append(d)}
    if(!done&&!ms[n].sys)box.append(el('div','m typing',`${avH(ms[n].w)}<div><div class="w">${esc(ms[n].w)}</div><div class="b"><i></i><i></i><i></i></div></div>`));
    scr.append(box);clearTimeout(revT);
    if(!done)revT=setTimeout(()=>{if(phOpen()&&ph.app==='room'&&ph.room===k){if(!ms[n].sys&&!ms[n].me)sfx('S1');S.shown[k]++;store.set(S);hud();renderPhone()}},ms[n].sys?700:2100);
    if(done&&intro){
      if(k==='class'&&!f.readClass){f.readClass=1;store.set(S);introStep()}
      if(k==='yunseul'&&!f.ysSent){const send=t=>()=>{f.ysSent=1;pushMsg('yunseul','나',t,{me:1,nr:1,tm:'16:41'})};
        btn('윤슬아, 괜찮아? 무슨 일 있어?',null,send('윤슬아, 괜찮아? 무슨 일 있어?'));btn('단톡방 봤어? 다들 기다리고 있어.','sub',send('단톡방 봤어? 다들 기다리고 있어.'))}
      else if(k==='yunseul'&&!f.called){bot.hidden=false;bot.append(el('div','tip','답이 없다. <b>전화</b> 앱으로 전화해 보자.<br>윤슬의 <b>프로필 사진</b>을 누르면 번호를 볼 수 있다.'))}
      if(k==='teacher'&&f.tMsg&&!f.accepted){
        btn('네, 다녀올게요. 연락처 전해 주셔도 돼요.',null,()=>{f.accepted=1;pushMsg('teacher','나','네, 다녀올게요. 연락처 전해 주셔도 돼요.',{me:1});
          setTimeout(()=>pushMsg('teacher','담임 선생님','고맙다. 주문 서류는 교무실 프린터 옆 행사 서류함에 있으니 필요하면 봐도 된다.'),800);setTimeout(introStep,1000)});
        if(!f.asked)btn('윤슬이도 제가 가는 걸 알고 있나요?','sub',()=>{f.asked=1;pushMsg('teacher','나','윤슬이도 제가 가는 걸 알고 있나요?',{me:1});
          setTimeout(()=>pushMsg('teacher','담임 선생님','좋은 질문이다. 어머니가 윤슬이한테 먼저 물어보신단다.'),800)})}
      if(k==='mother'&&f.mMsg)btn('휴대전화를 내려놓고 윤슬의 집으로 간다',null,startPlay)}
    if(done&&k==='hajun'&&!f.hajun&&!intro){
      const bad=(t,why)=>btn(t,'sub',()=>{$('#phone').hidden=true;scene(async()=>{await say('note',why,t)}).then(()=>openPhoneRoom('hajun'))});
      bad('응, 윤슬이가 다 망친 것 같아.',WHY.fact);
      btn('아직 확인 중이야. 확인된 사실만 올릴게. 그때까지 추측은 올리지 말아 줘.','sub',()=>{f.hajun=1;pushMsg('hajun','나','아직 확인 중이야. 확인된 사실만 올릴게. 그때까지 추측은 올리지 말아 줘.',{me:1});setTimeout(()=>pushMsg('hajun','하준','…알았어. 나도 좀 심하게 말했네. 기다릴게.'),900)});
      bad('몰라, 나한테 묻지 마.','소문이 도는 동안 입을 닫으면 짐작이 사실처럼 굳어집니다. 확인 중이라는 것, 그리고 확인된 사실만 말하겠다는 것을 알려 주세요.')}
    if(!keep)setTimeout(()=>scr.scrollTop=scr.scrollHeight,0)}
  else if(ph.app==='data'){bar('행사 자료',()=>{ph.app='home';renderPhone()});
    if(['C4','C5','C6','C7'].some(has)||hypDone()){scr.append(el('div','sec','가설 세우기 · 근거가 되는 자료를 골라 확인하세요'));
      for(const h of['a','b']){const H=HY[h],d=el('div','hy'+(S.hyp[h]?' ok':''));d.append(el('h4',null,H.q));if(!S.hyp[h])d.append(el('div','need',`근거 자료 <b>${H.need.length}개</b>를 고르세요`));
        if(S.hyp[h])d.append(el('div','fb','확정: '+H.done));
        else{for(const c of['C1','C2','C3','C4','C5','C6','C7'].filter(has)){const l=el('label',null,`<input type="checkbox" ${hySel[h].has(c)?'checked':''}> ${CL[c].t}`);
            l.firstChild.onchange=e=>{e.target.checked?hySel[h].add(c):hySel[h].delete(c)};d.append(l)}
          const b=el('button',null,'이 자료로 확인하기');b.onclick=()=>checkHyp(h);d.append(b);if(hyFb[h])d.append(el('div','fb',esc(hyFb[h])))}
        scr.append(d)}}
    scr.append(el('div','sec',`모은 자료 ${S.clues.length} / 10`));
    for(const c in CL){const C=CL[c];scr.append(has(c)?el('div','cl',`<h4>${c} · ${C.t}</h4><small>출처: ${esc(C.s)}</small>${DOCS.includes(c)?`<img src="assets/doc_${c}.webp" alt="${C.t}" class="zi" style="display:block;width:100%;border-radius:8px;margin:6px 0;cursor:zoom-in"><details><summary>글로 읽기</summary><p>${esc(C.b)}</p></details>`:`<p>${esc(C.b)}</p>`}`):el('div','cl no',`<h4>${c} · 아직 찾지 못한 자료</h4>`))}}
  scr.querySelectorAll('img.zi').forEach(i=>i.onclick=()=>zoomImg(i.src));
  if(ph.app==='room'||ph.app==='talk')scr.querySelectorAll('.av[data-w]').forEach(a=>a.onclick=e=>{e.stopPropagation();ph.from=ph.app;ph.pk=a.dataset.w;ph.app='profile';renderPhone()});
  if(keep)scr.scrollTop=st;
}
function openPhoneRoom(k){$('#phone').hidden=false;ph={app:'room',room:k,num:''};renderPhone()}
async function dial(n){const f=S.f,intro=S.stage==='intro';if(!n)return;const who=n.replace(/^(\d{3})(\d{3,4})(\d{4})$/,'$1-$2-$3');
  ph.app='calling';ph.who=who;renderPhone();const ring=sfx('S4');await wait(1500);const back=()=>{ph.app=intro?'home':'call';ph.num='';if(phOpen())renderPhone()};
  await scene(async()=>{await say('nar','뚜르르…  뚜르르…  뚜르르…');ring&&ring.pause();
    if(n==='01003111127'){sfx('S5');await say('nar','"지금은 전화를 받을 수 없습니다."\n\n윤슬은 전화도 받지 않는다.');
      if(intro&&f.ysSent&&!f.called){await say('me','5교시가 끝났을 때 윤슬이 자리는 비어 있었어. 가방도 없었고…',1);await say('me','무슨 일이 있는 걸까.',1);f.called=1;pushMsg('yunseul','','부재중 통화 · 16:42',{sys:1,ev:1})}}
    else if(n==='07000000142'&&has('C6')){if(f.vendor){await say('vendor','아까 말씀드린 그대로예요. 09시 10분에 취소됐고, 환불도 끝났습니다.');return}
      $('#dlg').hidden=true;if(!await codeLock('통화 중 · 자동 안내','"주문 문의는 1번, 배송 문의는 2번을 눌러 주세요."','1','전화를 끊는다','p7'))return;
      if(!await codeLock('통화 중 · 자동 안내','"주문번호 네 자리를 눌러 주세요."','0528','전화를 끊는다','p7')){await say('me','주문번호를 모르겠어. 어딘가에 기록이 있을 텐데.',0);return}
      await say('vendor','네, 단체복 제작소입니다.');await say('me','1학년 3반 반티 주문 건으로 전화드렸어요. 오늘 아침에 취소된 게 맞나요?',0);
      await say('vendor','아, 그 건이요. 아침에 학생이 수량 정정을 요청했는데, 다시 만들면 내일까지 못 맞춰서요.');
      await say('vendor','그 학생이 한참 고민하다가 "학급비는 지켜야 하니까요" 하고 취소했어요.');await say('vendor','죄송하다는 말을 몇 번이나 하더라고요.');
      await say('me','…윤슬이는 혼자서, 손해가 제일 적은 방법을 고른 거였구나.',1);f.vendor=1;toast('업체 확인 완료: 서류 내용은 사실이다')}
    else{sfx('S5');await say('nar','없는 번호이거나, 지금은 받지 않는다.')}});
  back();if(intro)introStep()}
function checkHyp(h){const need=HY[h].need,sel=[...hySel[h]];if(sel.length!==need.length){hyFb[h]=`근거 자료를 ${need.length}개 골라야 해요. 지금은 ${sel.length}개를 골랐어요.`;sfx('S9');renderPhone(true);return}const miss=need.filter(c=>!sel.includes(c)),extra=sel.filter(c=>!need.includes(c));
  if(!miss.length&&!extra.length&&(h!=='a'||S.f.vendor)){S.hyp[h]=1;hyFb[h]='';toast('가설 확정');store.set(S);hud()}
  else if(h==='a'&&!S.f.vendor)hyFb[h]='자료는 맞게 골랐어요. 그런데 서류 내용이 사실인지 아직 확인하지 않았어요. 전화 앱으로 서류에 적힌 업체 번호에 전화해 보세요.';
  else if(need.some(c=>!has(c)))hyFb[h]='근거가 될 자료를 아직 다 찾지 못했어요. 학교를 더 살펴보세요.';
  else if(extra.length)hyFb[h]='이 질문과 직접 관계없는 자료가 섞여 있어요. 무엇이 "이 일"의 근거인지 다시 골라 보세요.';
  else hyFb[h]='근거가 부족해요. 두 자료를 서로 비교해야 보이는 것이 있습니다.';
  sfx(S.hyp[h]?'S10':'S9');renderPhone(true)}
function seedIntro(){S.chat.class=[{sys:1,t:'어제'},{w:'윤슬',t:'반티 주문은 내가 내일까지 정리해서 올릴게!',tm:'20:12'},{w:'서아',t:'고마워 윤슬아! 맨날 네가 다 하네',tm:'20:15'},
  {sys:1,t:'오늘 · 단합대회 전날'},{w:'서아',t:'윤슬아, 반티 오늘 오는 거 맞지?',tm:'08:52'},{w:'하준',t:'윤슬이 점심때도 안 보이던데',tm:'12:44'},
  {w:'서아',t:'윤슬아 5교시 끝나고 어디 갔어? 가방도 없더라',tm:'14:35'},{w:'지민',t:'반티 주문 취소됐대. 내일이 단합대회인데 이게 말이 돼?',tm:'15:50'},
  {w:'하준',t:'윤슬이가 취소해 놓고 말도 없네. 진짜 무책임하다',tm:'15:52'},{w:'서아',t:'윤슬아 톡 좀 봐… 아침에 보낸 것도 아직 안 읽었네',tm:'16:30'},
  {sys:1,t:'윤슬 님은 오늘 올라온 메시지를 아직 읽지 않았습니다'}];S.shown.class=4}
function introStep(){const f=S.f;
  if(f.readClass&&!f.ys)setTimeout(()=>scene(async()=>{await say('nar','윤슬은 우리 반 부반장이다.\n\n아침부터 올라온 말을 하나도 읽지 않았다.');await say('nar','늘 제일 먼저 답하던 애인데.');await say('nar','윤슬에게 직접 연락해 보자.');
    f.ys=1;S.chat.yunseul=[{sys:1,t:'지난주'},{w:'윤슬',t:'빌려준 시집 다 읽었어? 도서관 811번 서가에서 빌린 거라 곧 반납해야 해',tm:'18:20'},{w:'나',t:'거의 다 읽었어! 내일 줄게',me:1,tm:'18:31'},{sys:1,t:'어제'},{w:'윤슬',t:'반장, 내일 리본 색 같이 고르자',tm:'21:03'},{w:'윤슬',t:'나 좀 지쳐서 오늘은 먼저 잘게',tm:'21:04'},{w:'나',t:'응, 푹 쉬어!',me:1,tm:'21:06'},{sys:1,t:'오늘'}];
    S.shown.yunseul=S.chat.yunseul.length;ph.app='talk';renderPhone()}),1600);
  else if(f.called&&!f.tMsg)setTimeout(teacherMsgs,1500);
  else if(f.accepted&&!f.mMsg)setTimeout(motherMsgs,1500)}
function teacherMsgs(){if(S.f.tMsg)return;S.f.tMsg=1;
  pushMsg('teacher','담임 선생님','반장, 윤슬이 일로 연락한다.');
  pushMsg('teacher','담임 선생님','어머니와 통화했다. 윤슬이는 무사하고, 지금은 쉬고 싶어 한다.');
  pushMsg('teacher','담임 선생님','어머니가 내일 행사 자료를 집에서 건네주신다는데, 네가 받아올 수 있겠니?')}
function motherMsgs(){if(S.f.mMsg)return;S.f.mMsg=1;
  pushMsg('mother','윤슬 어머니','반장이지? 윤슬이 엄마야. 와 준다니 고맙다. 6시쯤 오면 된다.');
  pushMsg('mother','윤슬 어머니','윤슬이한테도 네가 온다고 말해 뒀어. 이렇게 답이 왔단다.',{q:'윤슬: 책상 위 파일함만. 번호는 내 학번이야. 다른 건 건드리지 말아 줘.'})}

/* ---------- 목표·HUD ---------- */
function goal(){const f=S.f;
  if(S.map==='home'){if(!f.mother)return['주방에 계신 윤슬 어머니와 이야기하기','mother'];if(!has('C1'))return['윤슬 방 책상 위 행사 파일 확인하기','desk'];
    if(!f.grandma)return['거실의 할머니와 이야기하기','grandma'];if(f.note===1)return['할머니가 준 공책을 윤슬 방 책상에 올려놓기','desk'];if(f.sIn&&!f.spc)return['언니 노트북의 비밀번호 찾기 (냉장고에 붙은 쪽지)','memo'];if(!f.sister)return f.knocked?['언니와 이야기하기','sister']:['언니 방 문을 노크하기','sdoor'];return['현관으로 나가 학교로 가기','exit']}
  if(S.map==='school'){if(!has('C7'))return['로비 게시판 살펴보기','c7'];if(!has('C4'))return['우리 반 교탁 살펴보기','c4'];if(!has('C5'))return['우리 반 게시판 살펴보기','c5'];
    if(!f.officeOpen)return['잠긴 교무실 열기 (담임 선생님의 톡 확인)','olock'];if(!has('C6'))return['교무실 프린터 옆 행사 서류함 확인하기','c6'];if(!f.pc)return['교무실의 학급 행사용 노트북 살펴보기','pc'];if(!f.vendor)return['[전화] 앱으로 서류에 적힌 업체 번호에 전화해 확인하기',null];if(!hypDone())return['휴대전화의 [행사 자료]에서 가설 두 개 확정하기',null];
    if(!f.jimin)return['교실의 지민과 이야기하기','jimin'];if(!f.teacher)return['상담실의 담임 선생님과 이야기하기','teacher'];return['현관으로 나가 도서관으로 가기','exit']}
  if(!f.staff)return['안내데스크에서 만나도 되는지 확인하기','staff'];if(!f.shelf)return['윤슬의 쪽지가 가리키는 서가 찾기 (윤슬과의 톡 기록 확인)',null];return['창가 쉼터의 윤슬과 이야기하기','yunseul']}
function hud(){const play=S.stage==='play';$('#hud').hidden=$('#mini').hidden=!play;if(!play)miniT(false);$('#pad').hidden=$('#act').hidden=!(play&&touch);
  if(!play){$('#hint').hidden=true;return}const g=goal(),o=$('#obj');if(o.dataset.g!==g[0]){o.dataset.g=g[0];o.innerHTML=`<small>목표</small><span>${esc(g[0])}</span>`;o.classList.remove('pop');void o.offsetWidth;o.classList.add('pop')}$('#cc').textContent=S.clues.length;
  const u=totU();$('#bdP').hidden=!u;$('#bdP').textContent=u}

/* ---------- 대본 ---------- */
const WHY={fact:'아직 확인하지 않은 일을 사실처럼 전하면 오해가 커집니다. 본 것(사실)과 짐작(해석)을 나누어 말해 보세요.',
  blame:'옳은 지적도 비난으로 들리면 상대는 방어부터 합니다. 먼저 마음을 확인한 뒤에 사실을 이야기하세요.',
  skip:'상대가 어렵게 꺼낸 말을 건너뛰거나 가볍게 넘기면 "안 들었다"는 신호가 됩니다. 공감적 경청은 들은 내용과 감정을 확인해 주는 것입니다.'};
async function checkC3(){if(S.f.grandma&&S.f.sister&&!has('C3')){give('C3');await say('nar','할머니와 언니의 이야기를 자료로 정리했다.')}}
const SC={
 async arrive(){await say('nar','윤슬의 집 현관 앞.');$('#dlg').hidden=true;await bellGame();sfx('S15');await say('mother','어서 와. 네가 반장이구나. 들어오렴, 신발은 거기 벗어 두고.',0);
   await say('me','실례하겠습니다.',0);await say('mother','나는 주방에 있을게. 숨 좀 돌리고 오렴.',2);S.f.arrived=1},
 async mother(){if(S.f.mother){await say('mother',has('C1')?'할머니랑 윤슬이 언니도 할 말이 있는 눈치더라.':'윤슬이 방은 복도 왼쪽 위야. 책상 위 행사 파일만 보면 된다.',0);return}
   await say('mother','윤슬이가 오후부터 연락이 뜸했는데, 조금 전에 문자가 왔어. 도서관에 있고, 쉬고 싶다더구나.',1);
   await quiz(['mother','단톡방에서 무슨 일이 있었던 거니? 그 애가 무책임한 애는 아닌데…',1],[
     {t:'주문을 취소하고 말이 없으니까 다들 화가 났어요.',r:['mother','…그렇구나. 윤슬이가 다 잘못한 거구나.',1],why:WHY.fact},
     {t:'주문이 취소됐다는 것만 알아요. 왜 그랬는지는 아직 아무도 확인하지 못했어요.',ok:1,r:['mother','그래, 이유부터 알아봐야겠지.',0]},
     {t:'어머니가 좀 더 신경 써 주셨어야죠.',r:['mother','…',1],why:WHY.blame}]);
   await say('mother','사실 나도 마음에 걸리는 게 있어. 저기 냉장고에 붙은 일정표 좀 보겠니?',1);await say('mother','윤슬이 일주일이야. 내가 다 짜 줬지.',0);
   $('#dlg').hidden=true;await scheduleGame();
   await say('me','토요일 칸… 윤슬이가 적은 "단합대회 뒤풀이" 위에 줄이 그어져 있어요.',1);
   await say('mother','…그 위에 내가 수학 보강을 적었구나. 물어보지도 않고.',1);
   await say('mother','그날 가족 대화방이야. 내가 보여 주는 거니까 봐도 괜찮다.',1);await say('nar','어머니가 자신의 휴대전화를 내민다.','C2');
   await quiz(['mother','옆집 애 얘기까지 했어. 윤슬이는 "네" 한마디뿐이었지.',1],[
     {t:'그래도 다 윤슬이 잘되라고 하신 거잖아요.',why:'서둘러 편을 들거나 위로하면 상대가 자기 마음을 끝까지 말하지 못합니다. 공감적 경청은 들은 내용과 감정을 그대로 확인해 주는 것입니다.'},
     {t:'저희 엄마도 그러세요. 저는 지난번에요…',why:'내 이야기로 화제를 돌리면 경청이 끊깁니다.'},
     {t:'윤슬이 생각을 묻지 못한 게 마음에 걸리시는 거군요.',ok:1,r:['mother','…그래. 그 애가 뒤처질까 봐 겁이 났던 건데.',1]}]);
   await say('mother','윤슬이한테는 "네 생각은 필요 없다"로 들렸겠구나.',1);
   await say('note','부모와의 갈등\n걱정에서 나온 말도, 의견을 묻지 않고 정하면 통제로 느껴집니다. 비교하는 말은 마음을 닫게 합니다.');
   await say('mother','지금이라도 한마디 보내고 싶은데, 뭐라고 써야 할지 모르겠다.',1);
   await quiz(['nar','어머니가 휴대전화를 든 채 망설인다.\n어떤 말이 좋을까?'],[
     {t:'"엄마가 다 너 잘되라고 그런 거 알지? 토요일 보강은 꼭 가라."',r:['mother','…이건 내 말만 또 하는 거구나.',1],why:'사과 없이 자기 뜻만 다시 전하면 갈등은 그대로 남습니다. 상대의 마음을 먼저 인정해 주세요.'},
     {t:'"네 생각을 묻지 않고 보강을 잡아서 미안하다. 토요일 일정은 네 얘기를 듣고 같이 정하고 싶어."',ok:1,r:['mother','…그래, 이게 내가 하고 싶던 말이다.',2]},
     {t:'"서운했니? 그럼 말을 하지 그랬어."',r:['mother','…이건 또 그 애 탓을 하는 거네.',1],why:WHY.blame}]);
   $('#dlg').hidden=true;sfx('S14');await picStep('m3','<div class="scr"><p>네 생각을 묻지 않고 보강을 잡아서 미안하다. 토요일 일정은 네 얘기를 듣고 같이 정하고 싶어.</p><small>윤슬에게 보냄 · 17:44</small></div>','휴대전화를 내려놓는다');
   await say('nar','어머니가 파란 펜을 들고 냉장고 앞에 섰다.','@m2');sfx('S13');await say('nar','"수학 보강"에 줄을 긋고, 그 아래에 "단합대회 뒤풀이"를 다시 적었다.','@r1');
   await say('mother','보강은 내일 취소 전화를 해야겠다. 답이 안 와도 괜찮아. 기다리마.',2);
   await say('me','보여 주신 대화, 자료로 기록해 둬도 될까요?',0);
   await say('mother','그러렴. 윤슬이 방은 복도 왼쪽 위야. 책상 위 행사 파일만 보라고 윤슬이가 그랬지.',2);S.f.mother=1;S.f.roomOpen=1;give('C2')},
 async ydoor(){await say('nar','윤슬의 방이다. 허락 없이 들어가지 않는다. 먼저 주방의 어머니와 이야기하자.')},
 async desk(){if(S.f.note===1){await say('nar','공책을 책상 위, 행사 파일 옆에 올려놓았다.','@r2');await say('nar','다른 것은 건드리지 않았다.');S.f.note=2;return}
   if(has('C1')){await say('nar','행사 파일은 제자리에 돌려놓았다.');return}
   if(!S.f.box){await say('nar','책상 위에 "단합대회" 파일함이 있다.\n네 자리 번호 자물쇠가 달려 있다.');$('#dlg').hidden=true;
     if(!await codeLock('행사 파일함','윤슬의 톡: "번호는 내 학번이야." <b>윤슬의 학번 네 자리</b>','1312',null,'p2')){await say('me','윤슬이 학번을 알아야 해. 방 안에 단서가 있을까?',0);return}S.f.box=1}
   await say('nar','파일함 안에 "단합대회" 라벨이 붙은 파일이 있다. 윤슬이 봐도 된다고 한 자료다.');
   await say('nar','준비 항목 12개.\n윤슬 10개 · 지민 1개 · 반장 1개.','C1');await say('me','열두 개 중에 열 개가 윤슬이… 내 이름은 "출석 확인" 하나뿐이네.',1);give('C1')},
 async memo(){await say('nar','냉장고 문 옆면에 작은 쪽지가 붙어 있다.');await say('nar','언니 시험 끝나는 날은\n떡볶이 파티!\n\n- 윤슬');if(S.f.sIn&&!S.f.spc)await say('me','윤슬이는 언니 시험 끝나는 날까지 챙기고 있었구나.',1)},
 async tag(){await say('nar','의자에 체육복이 걸려 있다. 가슴에 명찰이 달려 있다.');$('#dlg').hidden=true;await picStep('p1','<div class="ovt">1학년 3반 12번<b>윤슬</b></div>','확인');await say('me','학번은 학년, 반, 번호 순서로 쓰지.',0)},
 async bag(){await say('nar','윤슬의 가방이다. 윤슬이 보여 주기로 한 것은 책상 위 행사 파일뿐이다.');if(!S.f.bag){S.f.bag=1;await say('note','허락받은 범위까지만 보는 것도 상대를 존중하는 소통입니다.')}},
 async grandma(){if(!S.f.mother){await say('grandma','윤슬이 엄마가 주방에 있단다. 먼저 인사드리렴.',0);return}
   if(!has('C1')){await say('grandma','윤슬이 방에 볼일이 있다지? 먼저 다녀오렴. 이야기는 그다음에 하자꾸나.',0);return}
   if(S.f.grandma){await say('grandma',S.f.note===1?'공책은 윤슬이 책상에 올려놔 주렴.':'미안하다는 말은 얼굴 보고 직접 하마.',2);return}
   await say('grandma','아이고, 윤슬이 친구로구나. 우리 윤슬이 때문에 왔지?',0);
   await say('grandma','내가 괜한 짓을 했나 싶어. 어제 방이 어질러져 있길래 책상을 싹 치워 줬거든.',1);
   await say('grandma','종이랑 공책을 한데 묶어서 재활용 상자에 넣었지.',1);
   await quiz(['grandma','그게 반 옷 그림이었다더라. 윤슬이가 알고는 아무 말도 안 하고 방문을 닫았어.',1],[
     {t:'도와주려고 하신 건데 윤슬이가 말없이 문을 닫아서, 마음이 쓰이셨겠어요.',ok:1,r:['grandma','그래… 깨끗한 게 좋은 줄만 알았지.',1]},
     {t:'허락도 없이 남의 물건을 버리시면 어떡해요.',r:['grandma','…내가 잘못했지, 내가.',1],why:WHY.blame},
     {t:'별일 아니에요. 금방 잊을 거예요.',why:WHY.skip}]);
   await say('grandma','우리 때는 어른이 치워 주면 고맙다고 했는데.',0);await say('grandma','그 애한테는 일주일을 그린 그림이었다니… 물어보고 치울 걸 그랬다.',1);
   await say('note','조부모와의 갈등\n세대마다 "당연한 것"이 다릅니다. 도와주려는 마음도, 상대의 물건과 공간을 존중하지 않으면 상처가 됩니다.');
   await say('grandma','현관 옆 재활용 상자에 아직 있을 게다. 같이 좀 찾아 주겠니?',0);
   $('#dlg').hidden=true;await boxGame();
   await say('nar','스프링 공책을 찾았다.\n반 티셔츠 도안이 그려져 있다.');
   await say('grandma','쪽지라도 붙여 둬야겠다. 뭐라고 쓰면 좋겠니?',0);
   await quiz(['nar','할머니가 노란 쪽지와 펜을 꺼냈다.\n어떤 말을 적을까?'],[
     {t:'"방은 깨끗이 쓰는 거다. - 할머니"',r:['grandma','…이건 또 잔소리로구나.',1],why:'훈계로 시작하면 사과가 전해지지 않습니다. 먼저 내가 한 일을 바로잡았다는 것을 알려 주세요.'},
     {t:'"별것도 아닌 걸로 삐치지 마라. - 할머니"',r:['grandma','…내가 봐도 이건 아니다.',1],why:WHY.skip},
     {t:'"공책 다시 찾아 놨다. - 할머니"',ok:1}]);
   $('#dlg').hidden=true;sfx('S13');await picStep('g4','<div class="memo">공책 다시<br>찾아 놨다.<br><span>- 할머니</span></div>','쪽지를 공책에 붙인다');
   await say('nar','할머니가 공책에 쪽지를 붙였다.','C3');
   await say('grandma','미안하다는 말은 얼굴 보고 직접 하마. 다음부터는 꼭 물어보고 치우고.',2);
   await say('me','말씀해 주신 내용, 기록해도 될까요?',0);
   await say('grandma','그러렴. 그리고 이 공책, 윤슬이 책상에 좀 올려놔 주겠니?',2);await say('grandma','내가 하면 또 뭘 건드릴까 봐 그래.',1);S.f.grandma=1;S.f.note=1;toast('공책을 받았다');await checkC3()},
 async sdoor(){if(S.f.note===1){await say('nar','먼저 할머니가 준 공책을 윤슬 방 책상에 올려놓자.');return}
   if(!S.f.grandma){await say('nar','언니의 방이다.\n\n먼저 '+(!S.f.mother?'주방의 어머니와 이야기하자.':!has('C1')?'윤슬 방의 행사 파일을 확인하자.':'거실의 할머니와 이야기하자.'));return}
   sfx('S7');await say('nar','언니의 방이다. 문을 두드린다. 똑똑.');await say('sister','…누구세요? 아, 윤슬이 반 친구? 들어와.',0);S.f.knocked=1},
 async sister(){if(S.f.sister){await say('sister','보내긴 했는데… 읽으면 좋겠다.',2);return}
   if(!S.f.sIn){await say('sister','엄마한테 들었어. 윤슬이 일로 온 거지.',0);
     await say('sister','어젯밤 일은 여기 다 남아 있어. …봐도 돼.',1);await say('nar','언니가 책상 위 노트북을 이쪽으로 돌려 준다.');
     await say('sister','아, 잠겨 있네. 비밀번호는 윤슬이가 정해 준 거야.',0);await say('sister','냉장고에 걔가 붙여 둔 쪽지 그대로인데… 내 입으로는 못 말하겠다. 네가 쳐 봐.',1);S.f.sIn=1}
   if(!S.f.spc){$('#dlg').hidden=true;if(!await codeLock('언니의 노트북','비밀번호 힌트: <b>시험이 끝나면</b> (한글 세 글자)','떡볶이',null,'s1')){await say('me','냉장고에 윤슬이가 붙여 둔 쪽지가 있다고 했지. 주방에 가 보자.',0);return}S.f.spc=1}
   $('#dlg').hidden=true;await pcGame(0);
   await quiz(['sister','나 시험이 사흘 남았거든. 걔는 업체랑 통화 중이었는데, 난 소리부터 질렀어.',1],[
     {t:'언니가 그러면 안 되죠.',r:['sister','…알아. 나도 안다고.',1],why:WHY.blame},
     {t:'시험 때문에 힘드셨는데, 윤슬이한테 화낸 게 계속 마음에 남으셨군요.',ok:1,r:['sister','응. 내 스트레스를 걔한테 던진 거지.',1]},
     {t:'그건 그렇고, 윤슬이가 지금 어디 있는지 아세요?',why:WHY.skip}]);
   await say('sister','걔가 "나도 좀 힘든데"라고 보냈다가 지웠더라.',1);await say('sister','난 그것도 못 본 척했고.',1);
   await say('note','형제자매와의 갈등\n내 스트레스를 가까운 사람에게 쏟으면, 상대는 자기 어려움을 말할 기회를 잃습니다.');
   await say('sister','사과하고 싶은데 "미안" 두 글자에서 더 못 쓰겠어. 좀 도와줘.',1);
   $('#dlg').hidden=true;await pcGame(1);
   await say('nar','메시지가 전송됐다.','@r3');await say('sister','…보냈어. 읽을지는 모르겠지만.',2);await say('sister','시험 끝나면 떡볶이 사 줘야겠다. 고마워.',2);
   await say('me','지금 하신 말씀, 기록해도 될까요?',0);await say('sister','써도 돼.',2);S.f.sister=1;await checkC3()},
 async exitHome(){if(!(has('C1')&&has('C2')&&has('C3'))){await say('nar','아직 이 집에서 확인할 것이 남았다.');return}
   await say('mother','윤슬이한테서 다시 문자가 왔어. 시립도서관에 있대. 도서관에는 내가 전화해서 확인할게. 그건 어른이 할 일이니까.',0);
   await say('me','저는 학교에 가서 주문 기록을 확인해 볼게요.',2);await travel('school');
   await say('nar','저녁의 학교. 단합대회 준비로 몇몇이 남아 있다.');await say('nar','주문과 관련된 기록을 찾아보자.');setTimeout(()=>{pushMsg('teacher','담임 선생님','교무실은 잠가 뒀다. 문 옆 번호키는 복도 트로피 세 개에 적힌 숫자를 왼쪽부터 누르면 열린다.');pushMsg('teacher','담임 선생님','서류함 옆 학급 행사용 노트북도 봐도 된다. 비밀번호는 우리 반 인원수 뒤에 교실 호수를 붙인 숫자다.');pushMsg('teacher','담임 선생님','나는 상담실에서 학부모 전화를 받는 중이다. 조금 뒤에 보자.')},700);setTimeout(()=>pushMsg('hajun','하준','반장, 윤슬이 진짜 잠수 탄 거야? 애들한테 뭐라고 말해?'),9000)},
 async c7(){if(has('C7')){await say('nar','단합대회 업무 분담표가 붙어 있다.');return}await say('nar','로비 게시판에 학급별 단합대회 업무 분담표가 붙어 있다.','C7');
   await say('me','총괄, 주문, 예산, 응원, 안전… 우리 반 칸에는 전부 윤슬이 이름이야.',1);give('C7')},
 async c4(){await say('nar','교탁 위에 놓인 "반티 주문 입력표".','C4');give('C4');await cmp()},
 async c5(){await say('nar','게시판에 붙은 "사이즈 수요 조사표".','C5');give('C5');await cmp()},
 async trophy(){await say('nar','복도 트로피장. 트로피 세 개가 나란히 놓여 있다.');$('#dlg').hidden=true;await picStep('p3','<div class="ovt a">제3회<br>합창제</div><div class="ovt b">줄넘기 대회<br>1위</div><div class="ovt c">7년 연속<br>응원상</div>','확인')},
 async plate(){await picStep('p5','<div class="ovt">1학년 3반<b>103호</b></div>','확인')},
 async olock(){if(S.f.officeOpen){await say('nar','교무실 문은 열려 있다.');return}await say('nar','교무실 문이 잠겨 있다. 문 옆에 번호키가 있다.');$('#dlg').hidden=true;
   if(!await codeLock('교무실 번호키','담임 선생님의 톡: <b>복도 트로피 세 개의 숫자를 왼쪽부터</b>','317',null,'p4')){await say('me','담임 선생님 톡을 다시 읽어 보자. 트로피장은 복도 가운데에 있어.',0);return}S.f.officeOpen=1;await say('nar','철컥. 문이 열렸다.')},
 async pc(){if(S.f.pc){await say('nar','노트북은 닫아 두었다.\n\n수정 이력에 적힌 주문번호: 0528');return}
   if(!S.f.pcIn){await say('nar','서류함 옆에 "학급 행사용" 노트북이 있다.\n비밀번호를 묻는 화면이 떠 있다.');$('#dlg').hidden=true;
     if(!await codeLock('노트북 비밀번호','담임 선생님의 톡: <b>우리 반 인원수 + 교실 호수</b>','28103',null,'p6')){await say('me','인원수는 수요 조사표에 있었고… 교실 호수는 교실 문에 붙어 있을 거야.',0);return}S.f.pcIn=1}
   $('#dlg').hidden=true;await deskGame();S.f.pc=1;give('C10');
   await say('me','윤슬이는 어젯밤에 이미 확인용 표를 만들어 뒀어.',1);await say('me','아침에 지민이한테 물어보려던 게 이거였구나.',1);await say('nar','수정 이력 맨 아래에 주문번호가 적혀 있다.\n\n0528')},
 async c6(){if(has('C6')){await say('nar','서류 아래쪽에 업체 전화번호가 적혀 있다.\n\n070-0000-0142','C6');return}await say('nar','교무실 프린터 옆에 "1-3 행사 서류" 함이 있다.\n담임 선생님이 봐도 된다고 한 서류다.');
   await say('nar','서류함에서 꺼낸 두 장의 서류.','C6');
   await say('me','윤슬이는 아침부터 혼자 이걸 수습하고 있었구나.',1);give('C6');await say('nar','서류 아래쪽에 업체 전화번호가 적혀 있다.\n\n070-0000-0142\n\n전화해서 직접 확인해 볼 수 있겠다.')},
 async jimin(){if(S.f.jimin){await say('jimin','정정 글 올렸어. …윤슬이가 읽을지는 모르겠지만.',1);return}
   if(!hypDone()){await say('jimin','…반장? 나 지금 응원 도구 정리 중이야. 윤슬이 얘기면 할 말 없어.',0);
     await say('nar','근거 없이 이야기하면 말다툼이 될 것 같다.\n자료를 모아 휴대전화의 [행사 자료]에서 가설을 확정하고 오자.');return}
   await quiz(['jimin','윤슬이가 주문 취소한 거, 다들 알잖아. 내일인데 어쩌라는 거야.',0],[
     {t:'네가 잘못 입력해서 이렇게 된 거야.',r:['jimin','뭐? 지금 나한테 뒤집어씌우는 거야?',1],why:'"너는~"으로 시작하는 말(너 전달법)은 상대에게 공격으로 들립니다. 사실을 함께 확인하는 말로 시작해 보세요.'},
     {t:'입력표랑 수요표를 같이 봐 줄래? 숫자가 다른 데가 있어서 확인하고 싶어.',ok:1,r:['jimin','…뭐? 잠깐만. M 6에 L 16? 수요표는 M이 16인데…',1]},
     {t:'단톡방에 그런 식으로 쓰면 안 되지.',r:['jimin','내가 틀린 말 했어?',0],why:WHY.blame}]);
   await say('jimin','내가… 바꿔 썼네. 밤늦게 급하게 넣느라. 윤슬이가 아침에 나한테 뭘 물어보려던 게 이거였구나. 난 바쁘다고 그냥 갔는데.',1);
   await quiz(['jimin','근데 나, 단톡방에 제일 먼저 썼어. 말이 되냐고. 어떡하지.',1],[
     {t:'그러게 확인 좀 하지 그랬어.',r:['jimin','나도 일부러 그런 건 아니거든.',0],why:'이미 잘못을 알아차린 상대에게 비난을 더하면 변명이 시작됩니다. 감정을 먼저 받아 주세요.'},
     {t:'괜찮아, 누구나 그럴 수 있지. 그냥 넘어가자.',why:'문제를 덮으면 오해는 그대로 남습니다. 공감은 하되 사실은 바로잡아야 합니다.'},
     {t:'급하게 하다 생긴 실수를 지금 알게 돼서 많이 당황스럽겠다.',ok:1,r:['jimin','…응. 진짜 몰랐어.',1]}]);
   await quiz(['nar','지민에게 어떻게 부탁할까?'],[
     {t:'단톡방에 사실과 다른 말이 남아 있어서, 나는 윤슬이가 계속 오해받을까 봐 걱정돼. 네가 확인한 대로 정정 글을 올려 주면 좋겠어.',ok:1,r:['jimin','…알았어. 내가 쓴 말이니까 내가 고칠게.',2]},
     {t:'네가 저질렀으니까 당장 사과문 올려.',r:['jimin','명령하지 마.',0],why:'명령은 반발을 부릅니다. 나 전달법은 상황 → 내 감정 → 바라는 점의 순서로 말합니다.'},
     {t:'내가 대신 올려 줄게. 넌 가만히 있어.',why:'대신 해 주면 당사자가 스스로 바로잡을 기회를 잃습니다.'}]);
   await say('note','나 전달법\n① 상황: 사실과 다른 말이 남아 있어서\n② 내 감정: 나는 걱정돼\n③ 바라는 점: 정정 글을 올려 주면 좋겠어');
   S.f.jimin=1;pushMsg('class','지민','반티 수량, 내가 M이랑 L을 바꿔서 입력했어. 윤슬이는 그걸 바로잡으려다가 환불이 되는 방법을 고른 거였어. 확인도 안 하고 먼저 말해서 미안해.')},
 async teacher(){if(S.f.teacher){await say('teacher','억지로 데려오려고 하지는 마라. 듣고 오는 것만으로 충분하다.',0);return}
   if(!S.f.jimin){await say('teacher',has('C6')?'반장 왔구나. 지민이가 교실에 남아 있던데, 먼저 이야기해 보렴.':'반장 왔구나. 주문 서류는 교무실 프린터 옆 행사 서류함에 있다.',0);return}
   await say('teacher','지민이 글 봤다. 입력 실수였다니… 윤슬이가 혼자 수습하고 있었구나.',1);
   await quiz(['teacher','나는 윤슬이한테 "빨리 해결해라"는 말만 여러 번 했다. 뭐가 문제였을까.',1],[
     {t:'(근거 없이) 선생님이 윤슬이한테 너무하셨어요.',r:['teacher','…음.',1],why:'근거 없는 평가는 상대를 움직이지 못합니다. 전하려는 내용에 맞는 근거를 함께 보여 주세요.'},
     {t:'(준비표와 업무 분담표) 준비 항목 12개 중 10개가 윤슬이 담당이에요.',ok:1,r:['teacher','…열두 개 중 열 개. 꼼꼼하다는 이유로 내가 계속 얹었구나.',1]},
     {t:'(주문 입력표) 지민이가 수량을 잘못 입력했어요.',why:'그 자료는 "취소 이유"의 근거입니다. 지금 전하려는 것은 "역할이 한 사람에게 몰렸다"는 점이니 그에 맞는 근거를 고르세요.'}]);
   await quiz(['nar','선생님께 무엇을 부탁할까?'],[
     {t:'앞으로는 제가 윤슬이 몫까지 다 할게요.',why:'한 사람의 부담을 다른 한 사람에게 옮기는 것은 해결이 아닙니다. 역할 분담은 여럿이 함께 정합니다.'},
     {t:'선생님이 알아서 해 주세요.',why:'바라는 점을 구체적으로 말해야 상대가 도울 수 있습니다.'},
     {t:'역할이 한 사람에게 몰려 있어서, 저는 윤슬이도 우리 반도 걱정돼요. 역할을 다시 나누는 일을 선생님이 도와주시면 좋겠어요.',ok:1,r:['teacher','그래, 그건 내가 해야 할 일이다. 오늘 안에 역할표를 다시 짜마. 반장도 맡을 수 있는 걸 골라 주렴.',2]}]);
   await say('teacher','그리고 방금 윤슬이 어머니한테 전화가 왔다. 도서관에서 윤슬이를 확인했고, 반장이라면 잠깐 만나도 괜찮다고 했다더라.',0);
   await say('teacher','억지로 데려오려고 하지는 마라. 듣고 오는 것만으로 충분하다.',0);S.f.teacher=1;
   pushMsg('class','담임 선생님','[공지] 단합대회 역할을 다시 나눕니다. 한 사람에게 일이 몰려 있었습니다. 내일 아침 조회 때 함께 정합시다.')},
 async exitSchool(){if(!S.f.teacher){await say('nar','아직 학교에서 할 일이 남았다.');return}await travel('lib');await say('nar','시립도서관. 야간 개관 중이다.\n먼저 안내데스크에 들르자.')},
 async staff(){if(S.f.staff){await say('staff',S.f.shelf?'윤슬 학생, 찾았군요.':'쪽지에 적힌 서가를 찾아보세요. 서가 끝마다 번호 표지가 있어요.',0);return}
   await say('staff','어서 오세요. 아, 윤슬 학생 반 친구죠? 어머니께 전화 받았어요.',0);
   await say('staff','제가 조금 전에 물어봤는데, "10분만 이야기할게요"라고 했어요.',0);await say('staff','그런데 자리를 옮기면서 쪽지를 남겼어요. 여기요.',0);
   $('#dlg').hidden=true;await picStep('p8','<div class="ovt hand">조용한 데로 옮겼어.<br>내가 제일 좋아하는 시집이<br>꽂힌 서가 옆이야.<br>지난주에 빌려줬던 그 책.<span>- 윤슬</span></div>','쪽지를 접는다');await say('me','지난주에 빌려준 시집… 톡에 서가 번호가 있었던 것 같은데.',0);
   await say('staff','혹시 친구가 힘들어 보이면 바로 저한테 알려 줘요. 그건 어른이 챙길 일이니까.',1);await say('nar','안내데스크의 방문 확인 메모.','C8');S.f.staff=1;give('C8')},
 async sh1(){await picStep('p9','<div class="ovt"><b>000 ~ 499</b>총류<br>철학<br>사회과학<br>자연과학</div>','확인');if(S.f.staff&&!S.f.shelf)await say('me','찾는 번호는 여기가 아니야.',0)},
 async sh2(){await picStep('p9','<div class="ovt"><b>500 ~ 799</b>기술과학<br>예술<br>언어</div>','확인');if(S.f.staff&&!S.f.shelf)await say('me','찾는 번호는 여기가 아니야.',0)},
 async sh3(){await picStep('p9','<div class="ovt"><b>800 ~ 999</b>문학<br>역사</div>','확인');if(S.f.staff&&!S.f.shelf){await say('nar','811 한국 시. 여기다.');await say('nar','서가 너머 창가 안락의자에 윤슬이 앉아 있다.','@p10');S.f.shelf=1}},
 async yunseul(){if(!S.f.staff){await say('nar','윤슬이 쉬고 있다.\n먼저 안내데스크에서 만나도 되는지 확인하자.');return}
   bgm('B5');await say('nar','윤슬이 창밖을 보고 있다. 휴대전화는 화면이 엎어진 채 탁자 위에 놓여 있다.');
   await quiz(['yunseul','…',0],[
     {t:'야, 왜 톡을 안 봐? 다들 난리 났어.',r:['yunseul','…',1],why:'상대가 준비됐는지 묻지 않고 다그치면 대화는 시작되지 않습니다.'},
     {t:'윤슬아, 나야. 지금 잠깐 이야기해도 괜찮을까? 싫으면 그냥 갈게.',ok:1,r:['yunseul','…10분만이라고 했으니까. 앉아.',0]},
     {t:'빨리 학교 가자. 선생님이 기다리셔.',r:['yunseul','…안 가.',1],why:'데려가는 것이 목적이 되면 상대의 마음은 뒤로 밀립니다.'}]);
   await say('yunseul','수량이 틀린 걸 아침에 알았어. 업체에 전화했더니 고치면 내일까지 못 온대. 지금 취소하면 전액 환불된다고 해서… 학급비라도 지키려고 취소했어.',1);
   await quiz(['yunseul','단톡방에 설명을 쓰려는데 "무책임하다"는 말이 먼저 올라오더라. 그 뒤로는 알림을 못 열겠더라고. 읽으면 무너질 것 같아서.',1],[
     {t:'이제 다 해결됐어! 지민이가 정정 글 올렸어.',why:'좋은 소식이라도 상대의 말이 끝나기 전에 꺼내면 "내 얘기는 안 들었구나"로 들립니다. 먼저 끝까지 듣고 감정을 확인하세요.'},
     {t:'그래도 한마디는 남겼어야지.',r:['yunseul','…그러게. 내 잘못이네.',1],why:WHY.blame},
     {t:'혼자 수습하고 있었는데 그런 말부터 들어서, 읽는 것조차 무서웠구나.',ok:1,r:['yunseul','…응. 집에서도 학교에서도 "윤슬이가 하면 되지"였거든. 나도 못 하겠다는 말을 한 번도 안 했고.',1]}]);
   give('C9');
   await say('me','지민이가 단톡방에 정정 글을 올렸어. 선생님은 역할을 다시 나누기로 하셨고. ',0);await say('me','어머니는 보강을 취소하고 네 얘기를 듣고 싶다고 하셨어. 할머니는 공책을 찾아서 쪽지를 붙여 두셨고.',0);await say('me','언니는 미안하다는 메시지를 보냈대.',0);
   await quiz(['yunseul','…다들 그랬구나.',0],[
     {t:'네가 지금 바라는 건 뭐야? 내가 도울 수 있는 걸 알려 줘.',ok:1,r:['yunseul','…내일 가긴 갈 거야. 근데 반티 일은 혼자 못 하겠어. 그리고 톡은 내가 읽고 싶을 때 읽을게.',0]},
     {t:'내일 아침에 애들 다 모아서 너한테 사과하게 할게.',r:['yunseul','그런 거 싫어.',1],why:'해결책을 대신 정해 주는 것은 도움이 아닐 수 있습니다. 상대가 원하는 도움이 무엇인지 물어보세요.'},
     {t:'이제 화 풀고 지민이 용서해 줘.',r:['yunseul','…',1],why:'화해와 용서는 강요할 수 없습니다. 상대의 속도를 존중하세요.'}]);
   await quiz(['nar','반티는 내일까지 오지 못한다. 어떻게 하면 좋을까?'],[
     {t:'내가 밤새 다 준비할게. 넌 쉬어.',why:'부담을 한 사람이 떠안는 방식은 같은 문제를 되풀이합니다. 협력적 해결은 대안을 함께 찾고 역할을 나누는 것입니다.'},
     {t:'단합대회를 아예 취소하자고 하자.',why:'문제를 피하는 것은 해결이 아닙니다. 모두가 받아들일 수 있는 대안을 찾아보세요.'},
     {t:'체육복을 입고 조별 색 리본을 다는 건 어때? 리본은 내가 맡을게. 나머지 역할도 같이 나누자.',ok:1,r:['yunseul','…그건 괜찮다. 리본 색은 내가 고를게. 그것만.',2]}]);
   await say('yunseul','와 줘서… 아니, 물어봐 줘서 고마워.',2);await say('nar','10분이 지났다.\n윤슬은 엎어 둔 휴대전화를 가방에 넣고 일어났다.\n\n"내일 봐."');await say('nar','돌아가는 길.\n반장으로서 단톡방에 글을 올리기로 했다.');$('#dlg').hidden=true;const post=await factGame();pushMsg('class','나',post,{me:1});S.f.yunseul=1;S.stage='ending';S.end=-1;setTimeout(()=>fade(async()=>ending()),50)}
};
async function cmp(){if(!(has('C4')&&has('C5'))||S.f.cmp)return;await say('me','입력표와 수요표. 두 표를 나란히 놓고 비교해 보자.',0);$('#dlg').hidden=true;await compareGame();S.f.cmp=1;await say('me','M과 L의 숫자가 서로 바뀌어 들어갔어.',1)}
const mg=(html,wide)=>{const b=modal(html);$('#mBox').classList.toggle('wide',!!wide);return b},mgEnd=res=>{$('#mBox').classList.remove('wide');closeModal();res()};
function picStep(img,ov,btn){return new Promise(res=>{const b=mg(`<div class="pic p-${img}"><img src="assets/${img}.webp" alt="">${ov}</div><button class="btn" id="px">${btn}</button>`,1);b.querySelector('#px').onclick=()=>mgEnd(res)})}
function bellGame(){return new Promise(res=>{const b=mg(`<h2>윤슬의 집 앞</h2><p>초인종을 눌러 보세요.</p><div class="door"><img src="assets/h1.webp" alt="현관문과 초인종"><button id="bell" aria-label="초인종 누르기"></button><b id="ding" hidden>딩동—</b></div>`,1);
  b.querySelector('#bell').onclick=e=>{sfx('S6');e.target.disabled=true;e.target.classList.add('on');b.querySelector('#ding').hidden=false;setTimeout(()=>mgEnd(res),1200)}})}
function scheduleGame(){return new Promise(res=>{const W=[['월','영어 학원'],['화','수학 학원'],['수','논술 수업'],['목','수학 학원'],['금','피아노'],['토','수학 보강']],T=[18.6,29.3,40.2,51.2,62.1,73.1,85.4];
  const b=mg(`<h2>냉장고에 붙은 가족 일정표</h2><p><b>윤슬이 직접 적었다가 지워진 일정</b>을 찾아 눌러 보세요.</p><div class="schp"><img src="assets/m1.webp" alt="냉장고에 붙은 일정표"><h4>윤슬 이번 주</h4>${W.map((d,i)=>`<div class="r" style="top:${T[i]}%;height:${T[i+1]-T[i]}%"><i>${d[0]}</i><button data-i="${i}" class="mom">${d[1]}</button>${i===5?'<button data-i="9" class="ys">단합대회 뒤풀이</button>':''}</div>`).join('')}</div><p id="gMsg" class="gmsg">칸을 눌러 누가 적었는지 살펴보세요.</p>`);
  b.querySelectorAll('.schp button').forEach(x=>x.onclick=()=>{const m=b.querySelector('#gMsg');if(x.dataset.i==='9'){sfx('S10');x.classList.add('found');m.textContent='연필로 쓴 윤슬의 글씨다. 그 위에 줄이 그어져 있다.';b.querySelectorAll('.schp button').forEach(y=>y.disabled=true);setTimeout(()=>mgEnd(res),1700)}
    else{x.classList.add('seen');m.textContent=x.dataset.i==='5'?'파란 펜으로 쓴 어머니의 글씨다. 가장 최근에 적은 것 같다.':'파란 펜으로 쓴 어머니의 글씨다.'}})})}
function boxGame(){return new Promise(res=>{const IT=['신문 뭉치','전단지 묶음','택배 상자','우유 팩','헌 잡지'],POS=[[2,2,-8],[40,6,7],[6,38,5],[38,42,-6],[22,22,3]];let left=IT.length;
  const b=mg(`<h2>재활용 상자</h2><p>쌓인 것을 하나씩 눌러 상자 밖으로 치워 보세요.</p><div class="bxp"><img src="assets/g1.webp" alt="재활용 상자"><div class="in"><img class="nb" src="assets/g3.webp" alt="스프링 공책" hidden>${IT.map((t,i)=>`<button aria-label="${t}" style="left:${POS[i][0]}%;top:${POS[i][1]}%;--r:${POS[i][2]}deg;z-index:${i+2}"><img src="assets/g2_${i}.webp" alt=""></button>`).join('')}</div></div><p id="gMsg" class="gmsg">남은 것 ${left}개</p>`);
  b.querySelectorAll('.bxp button').forEach(x=>x.onclick=()=>{sfx('S12');x.classList.add('gone');x.disabled=true;left--;const m=b.querySelector('#gMsg');if(left===2)b.querySelector('.nb').hidden=false;if(left){m.textContent=`${x.getAttribute('aria-label')}을(를) 치웠다. 남은 것 ${left}개`}else{m.textContent='맨 아래에서 공책이 나왔다!';setTimeout(()=>mgEnd(res),1700)}})})}
function pcGame(phase){return new Promise(res=>{const CHIP=[['어젯밤 네가 통화할 때 내가 소리를 질러서',0],['네가 얼마나 놀랐을지 생각하니 미안하고 마음이 무거워.',1],['시험 끝나면 떡볶이 먹으면서 네 얘기를 듣고 싶어.',2]],ord=[1,2,0],pick=[];
  const b=mg(`<div class="pcwrap"><img class="pcbg" src="assets/s1.webp" alt=""><div class="pc"><div class="pcb"><i></i><i></i><i></i><span>모아톡 PC · 윤슬</span></div><div class="pcm"><div class="m me"><div><div class="b">야 조용히 좀 해</div></div><span class="tm">23:10</span></div><div class="m me"><div><div class="b">나 사흘 뒤가 시험인 거 몰라? 너 때문에 망치면 책임질 거야?</div></div><span class="tm">23:11</span></div>
    <div class="m"><div><div class="w">윤슬</div><div class="b">미안. 업체랑 통화 중이었어. 금방 끝낼게.</div></div><span class="tm">23:12</span></div><div class="m sys">윤슬 님이 메시지를 삭제했습니다 · 23:41</div>${phase?'<div id="sent"></div>':''}</div>
    ${phase?`<div class="pcw"><small>문장을 눌러 <b>상황 → 내 감정 → 바라는 점</b> 순서로 놓아 보세요.</small><div id="comp" class="comp"></div><div class="chips">${ord.map(i=>`<button data-k="${CHIP[i][1]}">${CHIP[i][0]}</button>`).join('')}</div><p id="gMsg" class="gmsg"></p><div class="row"><button class="btn sub" id="pcr">다시 놓기</button><button class="btn" id="pcs">보내기</button></div></div>`
      :`<div class="pcw"><div class="draft">미안<span>|</span></div><small>입력창에 보내지 못한 글이 남아 있다.</small><button class="btn" id="pcx">노트북에서 눈을 뗀다</button></div>`}</div></div>`,1);
  if(!phase){b.querySelector('#pcx').onclick=()=>mgEnd(res);return}
  const comp=b.querySelector('#comp'),draw=()=>{comp.innerHTML=pick.map(k=>`<span>${CHIP[k][0]}</span>`).join(' ')||'<em>여기에 문장이 놓입니다</em>';b.querySelectorAll('.chips button').forEach(x=>x.disabled=pick.includes(+x.dataset.k))};draw();
  b.querySelectorAll('.chips button').forEach(x=>x.onclick=()=>{pick.push(+x.dataset.k);draw()});b.querySelector('#pcr').onclick=()=>{pick.length=0;draw();b.querySelector('#gMsg').textContent=''};
  b.querySelector('#pcs').onclick=()=>{const m=b.querySelector('#gMsg');if(pick.length<3){m.textContent='세 문장을 모두 놓아 주세요.';return}
    if(pick.join('')==='012'){sfx('S14');b.querySelector('.pcw').hidden=true;b.querySelector('#sent').innerHTML=`<div class="m me"><div><div class="b">${CHIP.map(c=>c[0]).join(' ')}</div></div><span class="tm">17:58</span></div>`;const pm=b.querySelector('.pcm');pm.scrollTop=pm.scrollHeight;setTimeout(()=>mgEnd(res),2600)}
    else{sfx('S9');m.textContent='순서가 어색해요. 나 전달법은 상황 → 내 감정 → 바라는 점입니다.';pick.length=0;draw()}}})}
function codeLock(title,desc,ans,quit,img){return new Promise(res=>{let v='';const txt=/\D/.test(ans),norm=x=>x.replace(/\s/g,'').toLowerCase();
  const b=mg(`${img?`<img class="lkimg" src="assets/${img}.webp" alt="">`:''}<h2>${title}</h2><p>${desc}</p>${txt?`<input type="text" id="ctxt" maxlength="12" autocomplete="off" placeholder="여기에 입력"><button class="btn" id="cok">확인</button>`:`<div class="code">${'<i></i>'.repeat(ans.length)}</div><div class="kp">${[...'123456789'].map(k=>`<button>${k}</button>`).join('')}<button class="x">지움</button><button>0</button><button class="ok">확인</button></div>`}<p id="gMsg" class="gmsg"></p><button class="btn sub" id="lx">${quit||'나중에 다시 온다'}</button>`);
  const m=b.querySelector('#gMsg'),win=()=>{m.textContent='맞았다!';sfx(img==='p7'?'S10':'S8');b.querySelectorAll('button,input').forEach(y=>y.disabled=true);setTimeout(()=>mgEnd(()=>res(true)),700)},lose=t=>{m.textContent=t;sfx('S9')};
  if(txt){const i=b.querySelector('#ctxt'),go=()=>norm(i.value)===norm(ans)?win():lose('비밀번호가 맞지 않는다.');b.querySelector('#cok').onclick=go;i.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing)go()}}
  else{const draw=()=>b.querySelectorAll('.code i').forEach((e,i)=>e.textContent=v[i]||'');
    b.querySelectorAll('.kp button').forEach(x=>x.onclick=()=>{if(x.classList.contains('x'))v=v.slice(0,-1);
      else if(x.classList.contains('ok')){if(v===ans){win();return}lose(v.length<ans.length?`숫자 ${ans.length}개를 눌러 주세요.`:'번호가 맞지 않는다.');v=''}
      else if(v.length<ans.length)v+=x.textContent;draw()})}
  b.querySelector('#lx').onclick=()=>mgEnd(()=>res(false))})}
function deskGame(){return new Promise(res=>{const st={v:'root',log:0,rest:0};
  const TB=(m,l)=>`<table><tr><th>사이즈</th><th>수량</th></tr><tr><td>S</td><td>4</td></tr><tr><td>M</td><td>${m}</td></tr><tr><td>L</td><td>${l}</td></tr><tr><td>XL</td><td>2</td></tr></table>`;
  const F={order:['주문입력_최종.표',`<p>입력: 지민 · 그저께 23:20</p>${TB(6,16)}`],log:['수정이력.txt','<p>그저께 23:20 지민 최초 입력</p><p>어제 23:58 윤슬 확인용 표 작성 후 삭제</p><p>오늘 08:31 윤슬 업체에 정정 요청</p><p>오늘 09:10 주문 취소</p><p><b>주문번호 0528</b></p>'],song:['응원가_가사.txt','<p>하나 되어 3반!</p><p>(응원가 가사다. 지금 찾는 것은 아니다.)</p>'],
    chk:['주문확인_윤슬.표',`<p>작성: 윤슬 · 어제 23:58</p>${TB(16,6)}<p>메모: 입력표랑 숫자가 다르다. 내일 아침에 지민이한테 물어보기.</p>`]};
  const draw=()=>{const done=st.log&&st.rest;let h='';
    if(st.v==='root')h=`<p class="dkp">바탕 화면</p><button class="dki" id="dkF">폴더 · 단합대회</button><button class="dki" id="dkT">휴지통 (${st.rest?0:1})</button>`;
    else if(st.v==='folder')h=`<p class="dkp">바탕 화면 › 단합대회</p>${['order','log','song'].concat(st.rest?['chk']:[]).map(k=>`<button class="dki dkf" data-f="${k}">${F[k][0]}</button>`).join('')}<button class="btn sub" id="dkB">뒤로</button>`;
    else if(st.v==='trash')h=`<p class="dkp">바탕 화면 › 휴지통</p>${st.rest?'<p>휴지통이 비어 있다.</p>':'<button class="dki dkf" data-f="chk">주문확인_윤슬.표 (어제 23:58 삭제됨)</button>'}<button class="btn sub" id="dkB">뒤로</button>`;
    else{const k=st.v;h=`<p class="dkp">${F[k][0]}</p><div class="dkc">${F[k][1]}</div>${k==='chk'&&!st.rest?'<button class="btn" id="dkR">단합대회 폴더로 복원하기</button>':''}<button class="btn sub" id="dkB">뒤로</button>`}
    const b=mg(`<div class="pcwrap dkwrap"><img class="pcbg" src="assets/p6.webp" alt=""><div class="pc dk"><div class="pcb"><i></i><i></i><i></i><span>학급 행사용 노트북</span></div><div class="dkw">${h}</div></div></div><p class="gmsg">${done?'필요한 기록을 모두 확인했다.':`${st.log?'':'폴더의 수정 이력을 읽어 보자. '}${st.rest?'':'지워진 파일이 없는지도 살펴보자.'}`}</p><button class="btn" id="dkX" ${done?'':'disabled'}>노트북을 닫는다</button>`,1);
    const q=i=>b.querySelector(i);if(q('#dkF'))q('#dkF').onclick=()=>{st.v='folder';draw()};if(q('#dkT'))q('#dkT').onclick=()=>{st.v='trash';draw()};
    b.querySelectorAll('.dkf').forEach(x=>x.onclick=()=>{st.from=st.v;st.v=x.dataset.f;if(st.v==='log')st.log=1;draw()});
    if(q('#dkB'))q('#dkB').onclick=()=>{st.v=F[st.v]?st.from:'root';draw()};if(q('#dkR'))q('#dkR').onclick=()=>{st.rest=1;st.v='folder';draw()};q('#dkX').onclick=()=>mgEnd(res)};draw()})}
function factGame(){return new Promise(res=>{const ST=[['주문 입력표의 M과 L 수량이 수요 조사와 서로 바뀌어 있었어.',1],['윤슬이는 원래 책임감이 없는 것 같아.',0],['윤슬이는 아침에 업체에 정정을 요청했지만, 내일까지는 다시 만들 수 없다는 답을 받았어.',1],['지민이가 일부러 틀리게 넣은 거야.',0],['이건 다 업체가 잘못해서 생긴 일이야.',0],['주문은 전액 환불로 취소됐고, 학급비는 그대로 있어.',1]],sel=new Set();
  const b=mg(`<img class="lkimg" src="assets/p11.webp" alt=""><h2>단톡방에 올릴 글</h2><p>자료와 사람들의 말로 <b>확인된 사실</b>만 골라 주세요.</p><div class="facts">${ST.map((t,i)=>`<button data-i="${i}">${t[0]}</button>`).join('')}</div><p id="gMsg" class="gmsg"></p><button class="btn" id="fgo">단톡방에 올린다</button>`);
  b.querySelectorAll('.facts button').forEach(x=>x.onclick=()=>{const i=+x.dataset.i;sel.has(i)?sel.delete(i):sel.add(i);x.classList.toggle('on',sel.has(i))});
  b.querySelector('#fgo').onclick=()=>{const m=b.querySelector('#gMsg'),bad=[...sel].some(i=>!ST[i][1]),all=ST.every((t,i)=>!t[1]||sel.has(i));sfx(!bad&&all?'S10':'S9');
    if(bad)m.textContent='확인되지 않은 평가나 짐작이 섞여 있어요. 자료로 확인한 것만 남겨 주세요.';else if(!all)m.textContent='확인된 사실이 빠졌어요. 자료로 확인한 것은 세 가지입니다.';
    else mgEnd(()=>res(ST.filter(t=>t[1]).map(t=>t[0]).join(' ')))}})}
function compareGame(){return new Promise(res=>{const sel=new Set(),b=modal(`<h2>서로 다른 줄 찾기</h2><p>두 표에서 숫자가 다른 줄을 <b>모두</b> 골라 보세요. 그림을 누르면 크게 볼 수 있어요.</p>
  <div class="cmp"><figure><img class="zi" src="assets/doc_C4.webp" alt="반티 주문 입력표"><figcaption>주문 입력표</figcaption></figure><figure><img class="zi" src="assets/doc_C5.webp" alt="사이즈 수요 조사표"><figcaption>수요 조사표</figcaption></figure></div>
  <div class="rows">${['S','M','L','XL','합계'].map(r=>`<button data-r="${r}">${r}</button>`).join('')}</div><p id="cErr" style="color:#a2461f;font-weight:700;min-height:1.4em;margin:6px 0 0"></p><button class="btn" id="cgo">확인</button>`);
  $('#mBox').classList.add('wide');b.querySelectorAll('img.zi').forEach(i=>i.onclick=()=>zoomImg(i.src));
  b.querySelectorAll('.rows button').forEach(x=>x.onclick=()=>{const r=x.dataset.r;sel.has(r)?sel.delete(r):sel.add(r);x.classList.toggle('on',sel.has(r))});
  b.querySelector('#cgo').onclick=()=>{if(sel.size===2&&sel.has('M')&&sel.has('L')){sfx('S10');$('#mBox').classList.remove('wide');closeModal();res()}
    else b.querySelector('#cErr').textContent=sel.size<2?'다른 줄은 2개입니다. 숫자를 하나씩 견주어 보세요.':sel.size>2?'너무 많이 골랐어요. 다른 줄은 2개입니다.':'다시 살펴보세요. 같은 줄의 숫자끼리 비교해 보세요.'}})}

/* ---------- 상호작용 대상 ---------- */
const E=[
 {id:'mother',map:'home',kind:'npc',img:'npc_mother',label:'윤슬 어머니',act:SC.mother,mark:()=>!S.f.mother},
 {id:'grandma',map:'home',kind:'npc',img:'npc_grandma',label:'할머니',act:SC.grandma,mark:()=>has('C1')&&!S.f.grandma},
 {id:'sister',map:'home',kind:'npc',img:'npc_sister',label:'윤슬 언니',act:SC.sister,mark:()=>S.f.knocked&&!S.f.sister},
 {id:'ydoor',map:'home',kind:'gate',label:'윤슬의 방',act:SC.ydoor,show:()=>!S.f.roomOpen},
 {id:'sdoor',map:'home',kind:'gate',label:'언니 방 노크하기',act:SC.sdoor,show:()=>!S.f.knocked,mark:()=>S.f.grandma&&S.f.note!==1},
 {id:'desk',map:'home',kind:'obj',label:'책상 위 행사 파일',act:SC.desk,mark:()=>!has('C1')||S.f.note===1},
 {id:'memo',map:'home',kind:'obj',label:'냉장고에 붙은 쪽지',act:SC.memo,mark:()=>S.f.sIn&&!S.f.spc},
 {id:'tag',map:'home',kind:'obj',label:'의자에 걸린 체육복',act:SC.tag,mark:()=>S.f.roomOpen&&!S.f.box},
 {id:'bag',map:'home',kind:'obj',label:'윤슬의 가방',act:SC.bag},
 {id:'exit',map:'home',kind:'obj',label:'현관문',act:SC.exitHome,mark:()=>has('C1')&&has('C2')&&has('C3')},
 {id:'c7',map:'school',kind:'obj',label:'로비 게시판',act:SC.c7,mark:()=>!has('C7')},
 {id:'c4',map:'school',kind:'obj',label:'교탁',act:SC.c4,mark:()=>!has('C4')},
 {id:'c5',map:'school',kind:'obj',label:'교실 게시판',act:SC.c5,mark:()=>!has('C5')},
 {id:'c6',map:'school',kind:'obj',label:'행사 서류함',act:SC.c6,mark:()=>S.f.officeOpen&&!has('C6')},
 {id:'trophy',map:'school',kind:'obj',label:'트로피장',act:SC.trophy,mark:()=>has('C5')&&!S.f.officeOpen},
 {id:'olock',map:'school',kind:'obj',label:'교무실 번호키',act:SC.olock,show:()=>!S.f.officeOpen,mark:()=>has('C5')},
 {id:'plate',map:'school',kind:'obj',label:'교실 문패',act:SC.plate,mark:()=>S.f.officeOpen&&!S.f.pcIn},
 {id:'pc',map:'school',kind:'obj',label:'학급 행사용 노트북',act:SC.pc,mark:()=>S.f.officeOpen&&!S.f.pc},
 {id:'jimin',map:'school',kind:'npc',img:'npc_jimin',label:'지민',act:SC.jimin,mark:()=>hypDone()&&!S.f.jimin},
 {id:'teacher',map:'school',kind:'npc',img:'npc_teacher',label:'담임 선생님',act:SC.teacher,mark:()=>S.f.jimin&&!S.f.teacher},
 {id:'exit',map:'school',kind:'obj',label:'학교 현관',act:SC.exitSchool,mark:()=>S.f.teacher},
 {id:'staff',map:'lib',kind:'npc',img:'npc_staff',label:'도서관 선생님',act:SC.staff,mark:()=>!S.f.staff},
 {id:'sh1',map:'lib',kind:'obj',label:'첫째 서가 표지',act:SC.sh1},{id:'sh2',map:'lib',kind:'obj',label:'둘째 서가 표지',act:SC.sh2},{id:'sh3',map:'lib',kind:'obj',label:'셋째 서가 표지',act:SC.sh3},
 {id:'yunseul',map:'lib',kind:'npc',img:'npc_yunseul',label:'윤슬',act:SC.yunseul,show:()=>S.f.shelf||S.f.yunseul,mark:()=>!S.f.yunseul}];
const ents=()=>E.filter(e=>e.map===S.map&&(!e.show||e.show())).map(e=>Object.assign(e,MAP[S.map].spots[e.id]));
const RNG=64,ZB=520;
function near(){let b=null,bd=RNG;for(const e of ents()){const d=Math.hypot(P.x-e.ax,P.y-e.ay);if(d<bd){bd=d;b=e}}return b}
function interact(){if(overlayOpen())return;const e=near();if(e)scene(e.act)}
function goTo(x,y,then){const p=findPath(MAP[S.map],P.x,P.y,x,y);if(p&&p.length){P.path=p;P.then=then||null}else if(then&&Math.hypot(P.x-x,P.y-y)<RNG)then()}
async function travel(map){sfx('S15');await fade(async()=>{setMap(map)});save()}
function setMap(map,x,y){S.map=map;bgm(S.stage==='play'?{home:'B2',school:'B3',lib:'B4'}[map]:'B5');const m=MAP[map];P.x=x??m.start[0];P.y=y??m.start[1];P.dir=2;P.path=null;hud()}

/* ---------- 입력 ---------- */
const keys=new Set(),KM={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;
  if(!$('#zoom').hidden){if(e.code==='Escape'||e.code==='Space'||e.code==='Enter'){e.preventDefault();$('#zoom').hidden=true}return}
  if(!$('#modal').hidden){const k=$('#mBox .kp');if(k&&/^[0-9]$/.test(e.key)){const d=[...k.querySelectorAll('button')].find(b=>b.textContent===e.key);d&&d.click();return}if(k&&e.key==='Backspace'){const x=k.querySelector('.x');x&&x.click();return}
    if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(e.repeat)return;const ae=document.activeElement;ae&&ae.blur&&ae.blur();const p=$('#mBox .kp .ok:not(:disabled)')||$('#mBox #px,#mBox #nx,#mBox #cgo,#mBox #fgo,#mBox #pcs,#mBox #pcx,#mBox #dkX:not(:disabled),#mBox #cok,#mBox #bell:not(:disabled),#mBox #sClose');p&&p.click()}return}
  if(!$('#dlg').hidden){if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat&&advance)advance()}else if(pick&&/^Digit[1-9]$/.test(e.code))pick(+e.code.slice(5)-1);return}
  if(e.code==='Escape'){if(phOpen())closePhone();return}
  if(e.code==='Space'){e.preventDefault();if(!e.repeat)interact();return}
  if(KM[e.code]){e.preventDefault();if(!overlayOpen())keys.add(KM[e.code])}});
addEventListener('keyup',e=>{if(KM[e.code])keys.delete(KM[e.code])});
addEventListener('blur',()=>keys.clear());
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')setTouch();if(overlayOpen())return;
  const r=cv.getBoundingClientRect(),wx=camx+(e.clientX-r.left)/zoom,wy=camy+(e.clientY-r.top)/zoom;let hit=null;
  for(const en of ents())if(Math.hypot(wx-en.x,wy-(en.kind==='obj'||en.kind==='gate'?en.y:en.y-40))<48||Math.hypot(wx-en.ax,wy-en.ay)<26){hit=en;break}
  if(hit){const go=()=>{if(Math.hypot(P.x-hit.ax,P.y-hit.ay)<RNG)scene(hit.act)};if(Math.hypot(P.x-hit.ax,P.y-hit.ay)<RNG)go();else goTo(hit.ax,hit.ay,go)}else goTo(wx,wy)});
function setTouch(){if(touch)return;touch=true;$('#app').classList.add('touch');hud()}
for(const b of document.querySelectorAll('#pad button')){const k=b.dataset.k,on=e=>{e.preventDefault();setTouch();if(!overlayOpen()){keys.add(k);b.classList.add('on')}},off=()=>{keys.delete(k);b.classList.remove('on')};
  b.addEventListener('pointerdown',on);for(const ev of['pointerup','pointercancel','pointerleave'])b.addEventListener(ev,off)}
$('#act').addEventListener('pointerdown',e=>{e.preventDefault();interact()});
$('#bPhone').onclick=()=>openPhone('home');$('#bClue').onclick=()=>openPhone('data');$('#bSet').onclick=()=>settings();const sndBtn=()=>{$('#bSnd').classList.toggle('off',!SND.on);$('#bSnd span').textContent=SND.on?'소리':'꺼짐'};$('#bSnd').onclick=()=>{SND.on=!SND.on;store.set(SND.on?'on':'off','uh-snd');sndApply();sndBtn()};sndBtn();
$('#bFull').onclick=()=>{const a=$('#app');try{if(document.fullscreenElement)document.exitFullscreen();else if(a.requestFullscreen)a.requestFullscreen().catch(()=>toast('이 화면에서는 전체화면을 쓸 수 없어요. 창을 넓혀 주세요.'));else toast('이 기기는 전체화면을 지원하지 않아요. 그대로 진행할 수 있어요.')}catch(x){toast('전체화면을 쓸 수 없어요.')}};
const miniT=v=>{$('#mini').classList.toggle('big',v);$('#miniOv').hidden=!v};$('#mini').onclick=()=>miniT(!$('#mini').classList.contains('big'));$('#miniOv').onclick=()=>miniT(false);
$('#phone').addEventListener('pointerdown',e=>{if(e.target===$('#phone'))closePhone()});
if(matchMedia('(pointer:coarse)').matches){touch=true;$('#app').classList.add('touch')}

/* ---------- 갱신·그리기 ---------- */
function update(dt){if(overlayOpen()){P.moving=false;return}const m=MAP[S.map],sp=185*dt;let vx=0,vy=0;
  if(keys.has('left'))vx--;if(keys.has('right'))vx++;if(keys.has('up'))vy--;if(keys.has('down'))vy++;
  if(vx||vy){P.path=null;P.then=null;const l=Math.hypot(vx,vy);vx=vx/l*sp;vy=vy/l*sp;let mv=false;
    if(vx&&boxFree(m,P.x+vx,P.y)){P.x+=vx;mv=true}if(vy&&boxFree(m,P.x,P.y+vy)){P.y+=vy;mv=true}
    P.dir=vy>0?0:vy<0?2:vx>0?1:3;if(vx&&!vy||(vx&&!boxFree(m,P.x,P.y+vy)))P.dir=vx>0?1:3;P.moving=mv}
  else if(P.path){const[tx,ty]=P.path[0],dx=tx-P.x,dy=ty-P.y,d=Math.hypot(dx,dy);
    if(d<=sp){P.x=tx;P.y=ty;P.path.shift();if(!P.path.length){P.path=null;P.moving=false;const t=P.then;P.then=null;t&&t()}}
    else{P.x+=dx/d*sp;P.y+=dy/d*sp;P.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?0:2);P.moving=true}}
  else P.moving=false;
  const e=near(),h=$('#hint');if(e){h.hidden=false;h.innerHTML=(touch?'<b>조사</b> ':'<b>스페이스</b> ')+esc(e.label)}else h.hidden=true}
function schoolProps(){const sg=(x,y,w,t)=>{ctx.fillStyle='#fffdf8';ctx.strokeStyle='#1b2233';ctx.lineWidth=2.5;ctx.fillRect(x,y,w,30);ctx.strokeRect(x,y,w,30);ctx.fillStyle='#1b2233';ctx.font='bold 17px "Malgun Gothic","Apple SD Gothic Neo",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t,x+w/2,y+16)};
  sg(684,668,58,'1-3');sg(1808,668,72,'교무실');
  if(!S.f.officeOpen){const d=IMG.door;if(d&&d.naturalWidth)ctx.drawImage(d,1701,627,69,123);ctx.fillStyle='#9aa2b1';ctx.strokeStyle='#1b2233';ctx.lineWidth=2;ctx.fillRect(1786,676,15,24);ctx.strokeRect(1786,676,15,24);ctx.fillStyle='#1b2233';for(let i=0;i<6;i++)ctx.fillRect(1789+(i%2)*6,684+((i/2)|0)*5,3,3)}}
function draw(t){const m=MAP[S.map],W=cv.clientWidth,H=cv.clientHeight;if(!W||!H)return;zoom=Math.max(.5,Math.min(W,H)/ZB);const vw=W/zoom,vh=H/zoom;
  camx=m.W<=vw?(m.W-vw)/2:Math.max(0,Math.min(m.W-vw,P.x-vw/2));camy=m.H<=vh?(m.H-vh)/2:Math.max(0,Math.min(m.H-vh,P.y-52-vh/2+40));
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#10141f';ctx.fillRect(0,0,cv.width,cv.height);ctx.setTransform(dpr*zoom,0,0,dpr*zoom,-camx*dpr*zoom,-camy*dpr*zoom);
  const bg=IMG[m.bg];if(bg&&bg.naturalWidth)ctx.drawImage(bg,0,0,m.W,m.H);if(S.map==='school')schoolProps();
  const g=goal()[1],list=ents(),gs=g&&m.spots[g];
  if(gs){const r=16+Math.sin(t/260)*4;ctx.strokeStyle='#ffd35a';ctx.lineWidth=3;ctx.globalAlpha=.85;ctx.beginPath();ctx.ellipse(gs.ax,gs.ay,r*1.5,r*.75,0,0,7);ctx.stroke();ctx.globalAlpha=1}
  const dr=list.filter(e=>e.kind==='npc'||e.kind==='tok').map(e=>({y:e.y,e}));dr.push({y:P.y,p:1});dr.sort((a,b)=>a.y-b.y);
  for(const d of dr){if(d.p){const im=IMG.player;ctx.fillStyle='#0003';ctx.beginPath();ctx.ellipse(P.x,P.y,17,6,0,0,7);ctx.fill();
      const fr=P.moving?Math.floor(t/130)%4:1;if(im.naturalWidth)ctx.drawImage(im,fr*160,P.dir*196,160,196,P.x-40,P.y-96,80,98)}
    else{const e=d.e,im=IMG[e.img];if(!im||!im.naturalWidth)continue;
      if(e.kind==='npc'){const cw=im.naturalWidth/4,four=im.naturalHeight>400,dx=P.x-e.x,dy=P.y-e.y,f=Math.hypot(dx,dy)>220?0:Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?0:2);
        ctx.fillStyle='#0003';ctx.beginPath();ctx.ellipse(e.x,e.y,18,6,0,0,7);ctx.fill();ctx.drawImage(im,four?cw:f*cw,four?f*206:0,cw,206,e.x-cw/4,e.y-101,cw/2,103)}
      else ctx.drawImage(im,e.x-34,e.y-80,68,80)}}
  for(const e of list){if(!e.mark||!e.mark())continue;const top=e.kind==='npc'?e.y-112:e.kind==='tok'?e.y-92:e.y-18,by=top+Math.sin(t/220)*3;
    ctx.fillStyle='#e0704f';ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(e.x,by,10,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',e.x,by+.5)}
  const mc=$('#mini');if(!mc.hidden){const c=mc.getContext('2d'),k=mc.width/m.W;c.clearRect(0,0,mc.width,mc.height);if(bg&&bg.naturalWidth)c.drawImage(bg,0,0,mc.width,mc.height);
    const u=mc.width/264;if(gs){c.fillStyle='#ffd35a';c.strokeStyle='#000';c.lineWidth=1.5*u;c.beginPath();c.arc(gs.ax*k,gs.ay*k,(5+Math.sin(t/260))*u,0,7);c.fill();c.stroke()}
    c.fillStyle='#e0704f';c.strokeStyle='#fff';c.lineWidth=2*u;c.beginPath();c.arc(P.x*k,P.y*k,5*u,0,7);c.fill();c.stroke()}}
let last=0;function loop(t){const dt=Math.min(.05,(t-last)/1000||0);last=t;if(S.stage==='play'||S.stage==='ending'||S.stage==='report'){update(dt);draw(t)}requestAnimationFrame(loop)}

/* ---------- 모달: 시작·설정·엔딩·보고서 ---------- */
const modal=h=>{const b=$('#mBox');b.innerHTML=h;$('#modal').hidden=false;b.scrollTop=0;keys.clear();return b};
const closeModal=()=>{$('#modal').hidden=true};
const KEYS=`<div class="keys"><b>이동</b><span>방향키 · WASD · 바닥 클릭(터치) · 화면 방향 패드</span><b>조사·대화</b><span>스페이스 · [조사] 버튼 · 대상을 직접 클릭</span><b>대화 넘기기</b><span>스페이스 · 화면 터치 / 선택지는 숫자 키로도 고를 수 있어요</span><b>휴대전화</b><span>위쪽 [휴대전화], [자료] 버튼</span></div>`;
function applyFs(){document.documentElement.style.setProperty('--fs',store.get('uh-fs')==='big'?'20px':'')}
function settings(){const big=store.get('uh-fs')==='big',b=modal(`<h2>설정</h2><h3>글자 크기</h3><div class="row"><button class="btn ${big?'sub':''}" id="fs0">보통</button><button class="btn ${big?'':'sub'}" id="fs1">크게</button></div>
  <h3>소리</h3><div class="row"><button class="btn ${SND.on?'':'sub'}" id="sn1">켜기</button><button class="btn ${SND.on?'sub':''}" id="sn0">끄기</button></div><p style="margin:10px 0 2px;font-weight:700">음량</p><input type="range" id="svol" min="0" max="100" value="${Math.round(SND.vol*100)}" style="width:100%;accent-color:#2c8c80"><h3>조작 방법</h3>${KEYS}<button class="btn" id="sClose">닫기</button><button class="btn warn" id="sReset">처음부터 다시 시작</button>`);
  b.querySelector('#fs0').onclick=()=>{store.set('std','uh-fs');applyFs();settings()};b.querySelector('#fs1').onclick=()=>{store.set('big','uh-fs');applyFs();settings()};
  b.querySelector('#sClose').onclick=()=>{sndBtn();closeModal()};b.querySelector('#sn1').onclick=()=>{SND.on=true;store.set('on','uh-snd');sndApply();settings()};b.querySelector('#sn0').onclick=()=>{SND.on=false;store.set('off','uh-snd');sndApply();settings()};b.querySelector('#svol').oninput=e=>{SND.vol=e.target.value/100;store.set(SND.vol,'uh-vol');sndApply()};
  b.querySelector('#sReset').onclick=e=>{if(e.target.dataset.c){store.del();location.reload()}else{e.target.dataset.c=1;e.target.textContent='저장된 진행이 지워집니다. 한 번 더 누르면 다시 시작합니다.'}}}
const STORY=['당신은 1학년 3반 반장입니다.','내일은 기다리던 단합대회.','그런데 반티 주문이 갑자기 취소됐습니다.','주문을 맡았던 부반장 윤슬은 연락이 닿지 않습니다.','단톡방에는 윤슬을 탓하는 말이 올라오기 시작했습니다.','윤슬에게 무슨 일이 있었던 걸까요?','사람들을 만나 이야기를 듣고, 읽지 못한 마음을 찾아가 봅시다.'];
function newGame(i=0){const b=modal(`<div class="step"><p>${STORY[i]}</p></div><div class="dots">${STORY.map((_,j)=>`<i class="${j<=i?'on':''}"></i>`).join('')}</div><button class="btn" id="nx">다음</button>`);
  b.querySelector('#nx').onclick=()=>i<STORY.length-1?newGame(i+1):askId()}
function askId(){const b=modal(`<h2>학번과 이름</h2><p>마지막에 만드는 학습 보고서에 들어갑니다. 이 기기에만 저장됩니다.</p>
  <h3>학번 (숫자 4자리)</h3><input type="text" id="sid" inputmode="numeric" maxlength="4" placeholder="예: 1307" autocomplete="off">
  <h3>이름</h3><input type="text" id="nm" maxlength="8" placeholder="이름을 적어 주세요" autocomplete="off">
  <p id="nmErr" style="color:#a2461f;font-weight:700;min-height:1.4em;margin:6px 0 0"></p><button class="btn" id="go">시작</button>`);
  const sid=b.querySelector('#sid');sid.oninput=()=>{sid.value=sid.value.replace(/\D/g,'').slice(0,4)};
  b.querySelector('#go').onclick=()=>{const id=sid.value,nm=b.querySelector('#nm').value.trim(),er=b.querySelector('#nmErr');
    if(!/^\d{4}$/.test(id)){er.textContent='학번을 숫자 4자리로 적어 주세요.';sid.focus();return}if(!nm){er.textContent='이름을 적어 주세요.';b.querySelector('#nm').focus();return}
    S=fresh();S.sid=id;S.name=nm;seedIntro();store.set(S);closeModal();$('#title').hidden=true;openPhone('home')}}
async function startPlay(){S.stage='play';$('#phone').hidden=true;setMap('home');hud();save();await wait(60);scene(SC.arrive)}
const END=[['그날 밤, 단톡방','지민이 단톡방에 긴 글을 올렸다.\n\n"반티 수량, 내가 M이랑 L을 바꿔서 입력했어. 확인도 안 하고 먼저 말해서 미안해."\n\n읽지 않은 사람의 수가 하나씩 줄어들었다. 마지막 하나는 한참 뒤에 사라졌다.'],
 ['다시 나눈 역할','다음 날 아침, 담임 선생님이 새 역할표를 붙였다.\n\n열두 개의 준비 항목에 스물여덟 명의 이름이 나뉘어 적혔다.\n\n색 리본 준비는 반장.\n리본 색 고르기는 윤슬.\n응원 도구는 지민과 친구들.'],
 ['단합대회 날','우리 반은 체육복에 조별 색 리본을 달았다.\n\n윤슬은 조금 늦게 왔다. 단톡방은 전날 밤에 읽었다고 했다.\n\n"아직 다 괜찮아진 건 아니야. 그래도 물어봐 줘서 고마워."\n\n지민과는 짧게 눈인사만 했다. 그걸로 충분한 날이었다.'],
 ['이번 일에서 배운 것','세대 갈등: 자라 온 환경이 달라 당연하게 여기는 것이 다르다. 묻지 않고 정하거나 비교하면 갈등이 커진다.\n\n또래 갈등: 한 사람에게 몰린 역할과 확인하지 않은 말이 오해를 키운다.\n\n해결: 공감적 경청으로 끝까지 듣고, 나 전달법으로 말하고, 대안과 역할을 함께 정한다.']];
function ending(j=0){hud();const i=S.end;$('#mBox').classList.add('wide');
  if(i<0){const b=modal(`<div class="epi0"><small>후일담</small><h2>읽어 준 마음</h2><p>그날 밤부터, 단합대회 날까지의 이야기</p></div><button class="btn" id="nx">이어서 보기</button>`);b.querySelector('#nx').onclick=()=>{S.end=0;store.set(S);ending()};return}
  const c=END[i],ps=c[1].split('\n\n'),last=j>=ps.length-1,b=modal(`<img class="epi" src="assets/end_${i+1}.webp" alt=""><p style="color:#2c8c80;font-weight:800;margin:10px 0 0">후일담 ${i+1} / ${END.length} · ${c[0]}</p><div class="step sm"><p>${esc(ps[j])}</p></div><div class="dots">${ps.map((_,x)=>`<i class="${x<=j?'on':''}"></i>`).join('')}</div><button class="btn" id="nx">${!last||i<END.length-1?'다음':'학습 보고서 쓰기'}</button>`);
  b.querySelector('#nx').onclick=()=>{if(!last)ending(j+1);else if(i<END.length-1){S.end++;store.set(S);ending()}else{S.stage='report';store.set(S);$('#mBox').classList.remove('wide');report()}}}
const RQ=[{h:'가. 세대 갈등',q:'1. 할아버지가 "밥 먹을 때는 휴대전화를 보는 게 아니다"라며 민서의 휴대전화를 말없이 가져가셨고, 민서는 화가 나 방으로 들어갔습니다. 이런 세대 갈등이 생기는 가장 큰 까닭은 무엇일까요?',o:['어른은 원래 청소년을 이해하지 못해서','자라 온 환경이 달라 당연하게 여기는 것이 서로 다른데, 그 차이를 이야기하지 않아서','청소년이 예의가 없어서','가족은 원래 자주 다투는 사이여서'],a:1,ex:'세대 갈등은 어느 한쪽이 나빠서 생기는 것이 아닙니다. 자라 온 환경과 경험이 달라 생각과 생활 방식이 다르고, 그 차이를 서로 묻지 않을 때 커집니다.'},
 {q:'2. 부모님이 상의 없이 내 주말 일정을 정하셨습니다. 이 갈등을 풀기에 가장 알맞은 말은 무엇일까요?',o:['엄마는 맨날 엄마 마음대로야!','(아무 말 없이 방문을 닫는다)','제 생각을 묻지 않고 정하셔서 속상했어요. 다음에는 저와 같이 정하면 좋겠어요.','알았어요, 그냥 시키는 대로 할게요.'],a:2,ex:'상황 → 내 감정 → 바라는 점을 차분히 말하는 나 전달법입니다. 비난하거나 입을 닫거나 참기만 하면 서로의 생각을 알 수 없습니다. 어른의 걱정을 끝까지 들어 보는 공감적 경청도 함께 필요합니다.'},
 {h:'나. 또래 갈등',q:'3. 모둠 발표 준비를 한 친구가 거의 다 맡았는데, 발표 날 자료가 빠지자 단톡방에 그 친구를 탓하는 말이 올라왔습니다. 이 또래 갈등을 키운 원인을 가장 잘 설명한 것은 무엇일까요?',o:['그 친구의 성격이 원래 꼼꼼하지 못해서','역할을 고르게 나누지 않았고, 사정을 확인하지 않은 채 짐작으로 말해서','단톡방이 있어서','발표 과제가 너무 어려워서'],a:1,ex:'또래 갈등은 역할이 한 사람에게 몰리거나 확인하지 않은 말이 퍼질 때 커집니다. 얼굴을 보지 않는 온라인 대화에서는 오해가 더 빨리 번집니다.'},
 {q:'4. 3번 상황에서 갈등을 협력적으로 해결하는 행동은 무엇일까요?',o:['누가 잘못했는지 투표로 정한다','그 친구가 사과할 때까지 말을 걸지 않는다','선생님께 그 친구를 혼내 달라고 한다','사실을 먼저 확인하고 그 친구의 이야기를 들은 뒤, 역할과 대안을 함께 다시 정한다'],a:3,ex:'협력적 해결은 사람을 탓하지 않습니다. 사실을 확인하고, 서로의 이야기를 듣고, 모두가 받아들일 수 있는 대안과 역할을 함께 정합니다.'}];
const RT=[['g','5. 세대 갈등은 왜 생기고, 어떻게 풀 수 있을까요? 내 말로 적어 보세요. (필수)','예: 부모님이나 조부모님과 생각이 다를 때 나는…',1],['p','6. 또래 갈등은 왜 생기고, 어떻게 풀 수 있을까요? 내 말로 적어 보세요. (필수)','예: 친구와 오해가 생겼을 때 나는…',1],['txt','7. 가족이나 친구에게 실제로 해 보고 싶은 말이나 행동을 적어 보세요. (선택)','예: 이번 주에 엄마에게 "…"라고 말해 보고 싶다.',0]];
function report(){hud();$('#mBox').classList.remove('wide');S.rep=S.rep||{a:[null,null,null,null],g:'',p:'',txt:'',chk:0};const R=S.rep;
  const b=modal(`<h2>학습 보고서</h2><p>주제: <b>세대 갈등과 또래 갈등, 그리고 해결</b></p><p>게임 속 이야기가 아니라 새로운 상황에 대한 질문입니다. 배운 것을 떠올려 답해 보세요.</p>`+RQ.map((q,i)=>`${q.h?`<h3>${q.h}</h3>`:''}<div class="q" id="q${i}"><b>${esc(q.q)}</b>${q.o.map((o,j)=>`<label><input type="radio" name="r${i}" value="${j}" ${R.a[i]===j?'checked':''}><span>${esc(o)}</span></label>`).join('')}<div class="ex" hidden></div></div>`).join('')+
   `<h3>다. 내 말로 정리하기</h3>`+RT.map(t=>`<p style="font-weight:700;margin:12px 0 4px">${t[1]}</p><textarea id="r_${t[0]}" maxlength="300" placeholder="${t[2]}">${esc(R[t[0]]||'')}</textarea>`).join('')+
   `<p id="rErr" style="color:#a2461f;font-weight:700;margin:6px 0 0"></p><button class="btn" id="rc">답 확인하기</button><div id="rOut"></div>`);
  RT.forEach(t=>{const e=b.querySelector('#r_'+t[0]);e.oninput=()=>{R[t[0]]=e.value;store.set(S)}});
  b.querySelectorAll('input[type=radio]').forEach(r=>r.onchange=()=>{R.a[+r.name[1]]=+r.value;store.set(S)});
  const check=()=>{let ok=true;RQ.forEach((q,i)=>{const d=b.querySelector('#q'+i),ex=d.querySelector('.ex'),good=R.a[i]===q.a;ok=ok&&good;d.className='q '+(good?'good':'bad');ex.hidden=false;
      ex.textContent=R.a[i]==null?'답을 골라 주세요.':good?'맞았어요. '+q.ex:'다시 생각해 봐요. 답을 고쳐서 다시 확인해 보세요.'});
    const out=b.querySelector('#rOut'),er=b.querySelector('#rErr');out.innerHTML='';er.textContent='';if(!ok){er.textContent='틀린 문항이 있어요. 위로 올라가 다시 골라 보세요.';return}
    for(const t of RT)if(t[3]&&(R[t[0]]||'').trim().length<15){er.textContent=t[1].slice(0,2)+' 문항을 15자 이상 적어 주세요.';b.querySelector('#r_'+t[0]).focus();return}R.chk=1;store.set(S);
    out.innerHTML=`<div class="row"><button class="btn" id="sp">PNG로 저장</button><button class="btn sub" id="sj">JPG로 저장</button></div><img id="repImg" alt="학습 보고서 이미지"><p style="font-size:.84em;color:#6b7385">저장 버튼이 동작하지 않으면 위 이미지를 길게 누르거나 마우스 오른쪽 버튼으로 저장하세요.</p><button class="btn sub" id="tt">타이틀로 돌아가기</button>`;
    const c=reportCanvas();out.querySelector('#repImg').src=c.toDataURL('image/png');
    const fn='읽지못한마음_'+(S.sid||'')+'_'+(S.name||'보고서');out.querySelector('#sp').onclick=()=>c.toBlob(bl=>saveBlob(bl,fn+'.png'),'image/png');
    out.querySelector('#sj').onclick=()=>c.toBlob(bl=>saveBlob(bl,fn+'.jpg'),'image/jpeg',.92);
    out.querySelector('#tt').onclick=()=>location.reload();out.scrollIntoView({behavior:'smooth',block:'start'})};
  b.querySelector('#rc').onclick=check;if(R.chk)check()}
async function saveBlob(blob,name){if(!blob){toast('이미지를 만들지 못했어요.');return}
  try{if(window.claude&&window.claude.use){const d=await window.claude.use('downloads');if(d){await d.save({filename:name,data:blob});toast('저장했어요.');return}}}catch(e){if(e&&e.code==='declined')return}
  try{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();toast('저장을 시작했어요.')}catch(e){toast('이미지를 길게 눌러 저장해 주세요.')}}
function reportCanvas(){const W=1600,PAD=90,F='"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif',R=S.rep,ops=[];let y=PAD;
  const m=document.createElement('canvas').getContext('2d');
  const text=(s,size,color,bold,indent=0,gap=1.5)=>{m.font=`${bold?'bold ':''}${size}px ${F}`;const mw=W-PAD*2-indent;
    for(const para of String(s).split('\n')){let line='';for(const ch of para){if(m.measureText(line+ch).width>mw&&line){ops.push([line,PAD+indent,y,m.font,color]);y+=size*gap;line=ch.trimStart()}else line+=ch}
      ops.push([line,PAD+indent,y,m.font,color]);y+=size*gap}};
  const rule=()=>{ops.push(['rule',y]);y+=36};
  text('읽지 못한 마음 · 학습 보고서',58,'#1b2233',true);y+=6;const d=new Date();
  text(`학번 ${S.sid||'-'}   이름 ${S.name||'-'}`,38,'#1b2233',true);text(`작성일 ${d.getFullYear()}. ${d.getMonth()+1}. ${d.getDate()}.`,28,'#6b7385');y+=14;rule();
  text('주제 · 세대 갈등과 또래 갈등, 그리고 해결',38,'#2c8c80',true);y+=14;rule();
  RQ.forEach((q,i)=>{if(q.h){text(q.h,34,'#2c8c80',true);y+=6}text(q.q,31,'#1b2233',true);text('내 답: '+q.o[R.a[i]],30,'#1c6a5f',true,24);y+=22});rule();
  RT.forEach(t=>{text(t[1].replace(/ \((필수|선택)\)/,''),31,'#1b2233',true);text((R[t[0]]||'').trim()||'(적지 않음)',32,'#232a3b',false,24);y+=24});rule();text('중학교 기술·가정 · 청소년기의 소통',26,'#6b7385');
  const c=document.createElement('canvas');c.width=W;c.height=Math.ceil(y+PAD-30);const x=c.getContext('2d');x.fillStyle='#f7f2e8';x.fillRect(0,0,W,c.height);x.fillStyle='#fffdf8';x.fillRect(36,36,W-72,c.height-72);
  x.strokeStyle='#1b2233';x.lineWidth=4;x.strokeRect(36,36,W-72,c.height-72);x.textBaseline='top';
  for(const o of ops){if(o[0]==='rule'){x.fillStyle='#d9d2c3';x.fillRect(PAD,o[1],W-PAD*2,3)}else{x.font=o[3];x.fillStyle=o[4];x.fillText(o[0],o[1],o[2])}}return c}

/* ---------- 시작 ---------- */
function resume(){sndWarm();S=Object.assign(fresh(),store.get());$('#title').hidden=true;hySel={a:new Set(),b:new Set()};
  if(S.stage==='intro'){bgm('B1');openPhone('home');introStep();return}
  setMap(S.map,S.x||undefined,S.y||undefined);P.dir=S.dir||0;if(!boxFree(MAP[S.map],P.x,P.y))setMap(S.map);hud();
  if(S.stage==='play'&&!S.f.arrived)scene(SC.arrive);else if(S.stage==='ending')ending();else if(S.stage==='report')report()}
$('#tNew').onclick=()=>{sndWarm();bgm('B1');newGame(0)};$('#app').addEventListener('click',e=>{if(e.target.closest('.kp button,.ch,.app,.rm,.dki,.rows button,.facts button,.chips button,.schp .mom,.lock'))sfx('S3')},true);$('#tCont').onclick=resume;$('#tSet').onclick=settings;
applyFs();resize();$('#title').style.backgroundImage='url(assets/title.jpg)';
const sv=store.get();$('#tNew').disabled=true;
loadImgs().then(()=>{$('#tLoad').hidden=true;$('#tNew').disabled=false;if(sv&&sv.v===1&&(sv.stage!=='intro'||sv.f.unlocked))$('#tCont').hidden=false;requestAnimationFrame(loop)});
window.__g={get S(){return S},P,MAP,ents,boxFree,findPath,near,tp(id){const s=MAP[S.map].spots[id];const p=findPath(MAP[S.map],P.x,P.y,s.ax,s.ay);if(!p)return false;const l=p[p.length-1];P.x=l[0];P.y=l[1];return Math.hypot(P.x-s.ax,P.y-s.ay)}};
})();
