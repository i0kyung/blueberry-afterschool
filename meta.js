'use strict';
/* =========================================================
   META — 게임 바깥 레이어
   설정 · 저장/이어하기 · 도전과제 · 통계 · 게임패드 · 메뉴 이동
   경고 화면 · 챕터 카드 · 결과 화면 · 크레딧 · 갤러리
   (game.js, runner.js 다음에 로드. S, P, M, A, $ 등 공용 상태 사용)
   ========================================================= */
const VERSION = 'v1.0.0';
const LINKS = { x: 'https://x.com/i0kyung', insta: 'https://instagram.com/i0k.zip', github: 'https://github.com/i0kyung' };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } },
};

/* ---------------- 설정 ---------------- */
const SET_DEF = { master: 90, music: 80, sfx: 90, bright: 100, shake: true, grain: true, calm: false, text: 1, captions: false, warned: false };
const SET = Object.assign({}, SET_DEF, store.get('berry_settings_v1', {}));
function saveSet() { store.set('berry_settings_v1', SET); }
function applySet() {
  document.documentElement.style.setProperty('--txt', SET.text);
  document.body.classList.toggle('calm', !!SET.calm);
  const b = SET.bright / 100;
  $('c').style.filter = b === 1 ? '' : `brightness(${b}) contrast(${1 + (b - 1) * .25})`;
  if (A.ctx && A.cat) {
    A.cat.music.gain.setTargetAtTime(SET.music / 100, A.t(), .05);
    A.cat.sfx.gain.setTargetAtTime(SET.sfx / 100, A.t(), .05);
  }
  applyMute();
}
/* 소리 버스를 음악/효과음 묶음으로 다시 연결 → 볼륨을 따로 조절 */
const _Ainit = A.init;
A.init = function () {
  if (this.ctx) return;
  _Ainit.call(this);
  const C = this.ctx; this.cat = { music: C.createGain(), sfx: C.createGain() };
  this.cat.music.connect(this.master); this.cat.sfx.connect(this.master);
  for (const k in this.bus) { this.bus[k].disconnect(); this.bus[k].connect(['sfx', 'heart'].includes(k) ? this.cat.sfx : this.cat.music); }
  if (window.HORROR) HORROR.audio(this);
  applySet();
};
applyMute = function () {
  if (A.master) A.master.gain.setTargetAtTime(muted ? 0 : .9 * SET.master / 100, A.t(), .05);
  const src = muted ? 'img/ui/p_sound_off.webp' : 'img/ui/p_sound_on.webp';
  ['bSoundI', 'sndTI'].forEach(id => { const el = $(id); if (el) el.src = src; });
  if ($('bSoundT')) $('bSoundT').textContent = muted ? '소리 꺼짐' : '소리 켜짐';
};

/* ---------------- 효과음 (메뉴) ---------------- */
const UI = {
  move() { if (A.ctx) A.tone(1250, 'sine', .035, .002, .05); },
  ok() { if (A.ctx) { A.tone(880, 'sine', .06, .003, .12); A.tone(1320, 'sine', .04, .003, .16, 0, null, A.t() + .06); } },
  back() { if (A.ctx) A.tone(520, 'sine', .05, .003, .1); },
  chime() { if (A.ctx) [76, 81, 88].forEach((m, i) => A.mbox(m, A.t() + i * .11, A.bus.sfx, .7)); },
};

/* ---------------- 통계 · 도전과제 ---------------- */
const ST = { deaths: 0, hides: 0, play: 0, char: '' };
function resetStats() { Object.assign(ST, { deaths: 0, hides: 0, play: 0, char: S.char }); }
const ACH = [
  { id: 'hide', name: '숨바꼭질', desc: '처음으로 몸을 숨겼다', icon: 'p_locker_eyes' },
  { id: 'breath', name: '숨죽여', desc: '그것이 바로 앞에 있을 때 숨을 참았다', icon: 'p_heart_patched' },
  { id: 'caught', name: '찾았다', desc: '처음으로 잡혔다', icon: 'c_heart_broken', hidden: true },
  { id: 'power', name: '불을 켜다', desc: '복도 배전반을 올렸다', icon: 'c_flashlight_on' },
  { id: 'chase1', name: '첫 번째 술래잡기', desc: '첫 추격에서 살아남았다', icon: 'p_door_open' },
  { id: 'signal', name: '신호 한 칸', desc: '도서관 창가에서 신호를 찾았다', icon: 'c_phone_nosignal' },
  { id: 'piano', name: '연주회', desc: '악보대로 피아노를 연주했다', icon: 'p_notebook', hidden: true },
  { id: 'midnight', name: '자정', desc: '옥상에서 00:00을 맞았다', icon: 'p_school', hidden: true },
  { id: 'clear', name: '방과 후', desc: 'CHAPTER 01을 끝까지 봤다', icon: 'p_blueberry' },
  { id: 'nodeath', name: '들키지 않은 아이', desc: '한 번도 잡히지 않고 CHAPTER 01 클리어', icon: 'p_key_heart' },
  { id: 'speed', name: '막차', desc: '25분 안에 CHAPTER 01 클리어', icon: 'c_save' },
  { id: 'memo', name: '기록광', desc: '휴대폰 메모를 14개 이상 남기고 클리어', icon: 'c_paper' },
  { id: 'allchars', name: '전원 출석', desc: '여섯 학생 모두로 CHAPTER 01 클리어', icon: 'p_hand' },
];
const GOT = store.get('berry_ach_v1', {});
function unlock(id) {
  if (GOT[id] || DEV) return; const a = ACH.find(x => x.id === id); if (!a) return;
  GOT[id] = Date.now(); store.set('berry_ach_v1', GOT); toast(a);
}
const toastQ = []; let toastBusy = false;
function toast(a) { toastQ.push(a); if (!toastBusy) nextToast(); }
function nextToast() {
  const a = toastQ.shift(); if (!a) { toastBusy = false; return; }
  toastBusy = true; const el = $('toast');
  el.innerHTML = `<img src="img/ui/${a.icon}.webp" alt=""><div><small>도전과제 달성</small><b>${a.name}</b><span>${a.desc}</span></div>`;
  el.classList.remove('hidden', 'out'); void el.offsetWidth; el.classList.add('in'); UI.chime();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.classList.remove('in'); el.classList.add('hidden'); nextToast(); }, 450); }, 4200);
}
/* 게임 진행을 지켜보며 달성 판정 */
let holdT = 0;
function watch(dt) {
  if (S.mode === 'play' || S.mode === 'runner') {
    if (!S.paused) ST.play += dt;
    const f = S.flags;
    if (f.power) unlock('power');
    if (f.chase1Done) unlock('chase1');
    if (f.signalTry) unlock('signal');
    if (f.pianoDone) unlock('piano');
    if (S.time === '00:00') unlock('midnight');
    if (P.holding && breathPrompt() && !S.paused) { holdT += dt; if (holdT > 1.6) unlock('breath'); } else holdT = 0;
  }
}

/* ---------------- 저장 / 이어하기 ---------------- */
const SAVE_KEY = 'berry_save_v1';
function readSave() { const s = store.get(SAVE_KEY, null); return s && s.v === 1 && s.cp ? s : null; }
function writeSave() {
  if (!S.cp) return;
  store.set(SAVE_KEY, { v: 1, char: S.char, cp: S.cp, seen: S.seen, floorsSeen: S.floorsSeen, stats: ST, at: Date.now() });
  const el = $('saving'); el.classList.remove('hidden'); clearTimeout(writeSave.t);
  writeSave.t = setTimeout(() => el.classList.add('hidden'), 1800);
}
const _checkpoint = checkpoint;
checkpoint = function () { _checkpoint(); setTimeout(writeSave, 0); };   // resume 표시가 붙은 뒤 저장
const _caught = caught;
caught = async function () { if (dying) return; ST.deaths++; unlock('caught'); writeSave(); return _caught(); };
const _hideIn = hideIn;
hideIn = function (h) { ST.hides++; unlock('hide'); return _hideIn(h); };

async function startGame(cont) {
  const sv = cont ? readSave() : null;
  if (!cont) { store.del(SAVE_KEY); }
  A.init(); A.ctx.resume(); A.setBus('drone', .12, 1);
  stopTitleFx(); $('title').classList.add('hidden');
  if (!sv) { $('select').classList.remove('hidden'); S.mode = 'select'; renderSelect(); setTimeout(() => focusFirst($('select')), 50); return; }
  // 이어하기
  S.mode = 'loading'; S.char = sv.char; $('fade').style.opacity = 1;
  await loadAll(sv.char);
  buildInteractions();
  Object.assign(ST, sv.stats || {}); S.seen = sv.seen || {}; S.floorsSeen = sv.floorsSeen || { 1: true };
  S.cp = sv.cp; S.drawP = true;
  resize(); restoreCP(); showPhone();
  S.mode = S.mode === 'runner' ? 'runner' : 'play';
  card(FLOOR_CARD[S.floor] ? FLOOR_CARD[S.floor][0] : '', '이어하기', S.time);
}

/* ---------------- 챕터 · 층 카드 ---------------- */
const FLOOR_CARD = { 1: ['1F', '현관 층'], 2: ['2F', '도서관 층'], 3: ['3F', '음악·미술 층'], 4: ['4F', '과학 층 · 중정'] };
function card(big, small, time) {
  const el = $('card'); el.innerHTML = `<b>${big}</b><span>${small}</span>${time ? `<em>${time}</em>` : ''}`;
  el.classList.remove('hidden', 'go'); void el.offsetWidth; el.classList.add('go');
  clearTimeout(card.t); card.t = setTimeout(() => el.classList.add('hidden'), 4300);
}
const _prologue = prologue;
prologue = async function () {
  resetStats(); ST.char = S.char;
  const el = $('chap'); el.classList.remove('hidden'); el.classList.add('go'); A.clack();
  await wait(4200); el.classList.add('hidden'); el.classList.remove('go');
  return _prologue();
};
for (const n of [2, 3, 4]) {
  const name = 'arrive' + n, orig = window[name] || { 2: arrive2, 3: arrive3, 4: arrive4 }[n];
  const wrapped = async function () { const r = orig.apply(this, arguments); setTimeout(() => card(FLOOR_CARD[n][0], FLOOR_CARD[n][1], S.time), 500); return r; };
  if (n === 2) arrive2 = wrapped; if (n === 3) arrive3 = wrapped; if (n === 4) arrive4 = wrapped;
}

/* ---------------- 결과 · 크레딧 (엔딩 뒤) ---------------- */
function fmtTime(s) { s = Math.round(s); const m = Math.floor(s / 60), r = s % 60; return `${m}분 ${String(r).padStart(2, '0')}초`; }
function rank() {
  const d = ST.deaths, m = ST.play / 60;
  if (d === 0 && m < 30) return ['S', '그림자처럼'];
  if (d <= 1 && m < 45) return ['A', '침착한 탈출자'];
  if (d <= 4) return ['B', '살아남은 학생'];
  return ['C', '자주 잡힌 술래'];
}
async function finishChapter() {
  const cleared = store.get('berry_cleared', {}); cleared[S.char] = 1; store.set('berry_cleared', cleared);
  unlock('clear');
  if (ST.deaths === 0) unlock('nodeath');
  if (ST.play < 25 * 60) unlock('speed');
  if (S.memos.length >= 14) unlock('memo');
  if (CHARS.every(c => cleared[c.id])) unlock('allchars');
  store.del(SAVE_KEY);
  const [r, rn] = rank(), c = CHARS.find(x => x.id === S.char) || CHARS[1];
  const box = $('result');
  box.innerHTML = `<div class="rpanel">
    <div class="rhead"><small>CHAPTER 01 · 야간자율학습</small><h2>CLEAR</h2></div>
    <div class="rbody"><img class="rface" src="img/${c.id}_face.png" alt="">
      <div class="rrank"><b>${r}</b><span>${rn}</span></div>
      <dl><dt>학생</dt><dd>${c.en}</dd><dt>플레이 시간</dt><dd>${fmtTime(ST.play)}</dd><dt>잡힌 횟수</dt><dd>${ST.deaths}번</dd>
      <dt>숨은 횟수</dt><dd>${ST.hides}번</dd><dt>휴대폰 메모</dt><dd>${S.memos.length}개</dd>
      <dt>도전과제</dt><dd>${Object.keys(GOT).length} / ${ACH.length}</dd></dl></div>
    <button class="btn primary" id="rNext">계속</button></div>`;
  box.classList.remove('hidden'); blockInput(1800); setTimeout(() => focusFirst(box), 100);
  await new Promise(res => $('rNext').onclick = () => { if (performance.now() < inputBlockUntil) return; UI.ok(); res(); });
  box.classList.add('hidden');
  await rollCredits(true);
}
function creditsHTML() {
  return `<img class="clogo" src="img/logo.webp" alt="BLUEBERRY 방과 후">
  <p class="cs">CHAPTER 01 · 야간자율학습</p>
  <h4>기획 · 시나리오</h4><p>김민경</p>
  <h4>아트 디렉션 · 캐릭터 · 배경</h4><p>김민경</p>
  <h4>게임 개발</h4><p>김민경</p>
  <h4>사운드</h4><p>Web Audio 실시간 합성<br><small>오르골, 피아노, 발소리, 숨소리까지 전부 코드로 만든 소리</small></p>
  <h4>글꼴</h4><p>Pretendard <small>(SIL Open Font License)</small></p>
  <h4>등장 학생</h4><p>${CHARS.map(c => c.en).join(' · ')}</p>
  <h4>그리고</h4><p>끝까지 숨을 참아 준 당신</p>
  <div class="cend"><p>소식과 개선 의견은 X에서 받아요</p><a href="${LINKS.x}" target="_blank" rel="noopener">x.com/i0kyung</a>
  <p class="cv">${VERSION} · © 2026 김민경 (i0kyung)</p></div>`;
}
function rollCredits(ending) {
  return new Promise(res => {
    const el = $('credits'); el.querySelector('.roll').innerHTML = creditsHTML();
    el.classList.remove('hidden'); el.classList.toggle('ending', !!ending);
    const roll = el.querySelector('.roll'); roll.style.animation = 'none'; void roll.offsetWidth; roll.style.animation = '';
    if (ending && A.ctx) { A.setBus('orgel', .22, 1.5); ORGEL.start(); }
    const done = () => { el.classList.add('hidden'); el.onclick = null; roll.onanimationend = null; credits.close = null; if (ending && A.ctx) { A.setBus('orgel', 0, 1.2); setTimeout(() => ORGEL.stop(), 2500); } res(); };
    credits.close = () => { if (performance.now() >= inputBlockUntil) done(); }; roll.onanimationend = done; blockInput(ending ? 2500 : 400);
    $('cSkip').onclick = e => { e.stopPropagation(); UI.back(); done(); };
    setTimeout(() => focusFirst(el), 50);
  });
}
function credits() { return rollCredits(false); }
/* 엔딩 끝의 TO BE CONTINUED 직전에 결과 → 크레딧을 끼운다 */
const _ending = endingEvent;
endingEvent = async function () {
  const box = $('sceneBox');
  const obs = new MutationObserver(() => {
    if (box.classList.contains('tbc')) {
      obs.disconnect();
      box.innerHTML = '';
      finishChapter().then(() => {
        box.innerHTML = `<div class="tbc"><h2>TO BE CONTINUED</h2><p>다음 챕터에서 계속</p>
          <p class="tnext">CHAPTER 02 준비 중 · 소식은 <a href="${LINKS.x}" target="_blank" rel="noopener">X @i0kyung</a></p>
          <button class="btn" id="tbcBack">타이틀로</button></div>`;
        $('tbcBack').onclick = () => location.reload();
        setTimeout(() => focusFirst(box), 60);
      });
    }
  });
  obs.observe(box, { attributes: true, attributeFilter: ['class'] });
  return _ending();
};

/* ---------------- 오버레이 패널 (설정 · 도전과제 · 갤러리 · 확인) ---------------- */
function openPanel(id) {
  const el = $(id); openPanel.from = openPanel.from || {}; openPanel.from[id] = document.activeElement; el.classList.remove('hidden'); el.dataset.prevPause = S.paused ? '1' : '';
  if (id === 'settings') renderSettings(); if (id === 'achv') renderAch(); if (id === 'gallery') renderGallery();
  UI.ok(); setTimeout(() => focusFirst(el), 30);
}
function closePanel(id) { $(id).classList.add('hidden'); UI.back(); const fr = openPanel.from && openPanel.from[id]; if (fr && document.contains(fr) && fr.offsetParent !== null) { fr.focus(); return; } const back = topLayer(); if (back) focusFirst(back); }
function renderSettings() {
  const row = (k, label, min, max, step, unit) => `<label class="srow"><span>${label}</span><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${SET[k]}"><output>${SET[k]}${unit || ''}</output></label>`;
  const tog = (k, label, sub) => `<button class="srow tog ${SET[k] ? 'on' : ''}" data-t="${k}"><span>${label}${sub ? `<small>${sub}</small>` : ''}</span><i></i></button>`;
  $('setBody').innerHTML = `
    <h5>소리</h5>${row('master', '전체 볼륨', 0, 100, 5)}${row('music', '음악 · 분위기', 0, 100, 5)}${row('sfx', '효과음', 0, 100, 5)}
    ${tog('captions', '소리 자막', '오르골·발소리 같은 중요한 소리를 글자로도 보여 줘요')}
    <h5>화면</h5>${row('bright', '밝기', 60, 160, 5, '%')}
    <div class="gamma"><img src="img/ui/p_blueberry.webp" alt=""><span>블루베리가 <b>겨우 보일 만큼</b> 맞추면 제작 의도대로 보여요</span></div>
    ${tog('shake', '화면 흔들림')}${tog('grain', '필름 노이즈')}
    ${tog('calm', '번쩍임 줄이기', '잡혔을 때 깜빡이는 연출을 부드럽게 바꿔요')}
    <button class="srow" data-act="fs"><span>전체 화면</span><em>${document.fullscreenElement ? '켜짐' : '꺼짐'}</em></button>
    <h5>자막</h5><div class="srow seg"><span>대사 크기</span><div>${[[.9, '작게'], [1, '보통'], [1.2, '크게']].map(([v, t]) => `<button data-txt="${v}" class="${SET.text == v ? 'on' : ''}">${t}</button>`).join('')}</div></div>
    <h5>조작</h5><div class="keys">
      <div><b>이동</b><span>WASD · 방향키 · 왼쪽 스틱</span></div><div><b>조사 · 숨기 · 넘기기</b><span>E · Space · Ⓐ</span></div>
      <div><b>숨 참기</b><span>숨은 채로 E 길게 · Ⓐ 길게</span></div><div><b>달리기</b><span>Shift · LB/RB/LT/RT</span></div>
      <div><b>손전등</b><span>F · Ⓧ</span></div><div><b>가방 (지도)</b><span>M · Ⓨ · View</span></div>
      <div><b>메모</b><span>Tab · Ⓑ</span></div><div><b>일시정지</b><span>Esc · Menu</span></div></div>
    <button class="srow danger" data-act="reset"><span>저장 · 도전과제 초기화</span><em>주의</em></button>`;
  $('setBody').querySelectorAll('input[type=range]').forEach(inp => inp.addEventListener('input', () => {
    SET[inp.dataset.k] = +inp.value; inp.nextElementSibling.textContent = inp.value + (inp.dataset.k === 'bright' ? '%' : ''); applySet(); saveSet();
    if (inp.dataset.k !== 'bright') UI.move();
  }));
  $('setBody').querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { SET[b.dataset.t] = !SET[b.dataset.t]; b.classList.toggle('on', SET[b.dataset.t]); applySet(); saveSet(); UI.ok(); }));
  $('setBody').querySelectorAll('[data-txt]').forEach(b => b.addEventListener('click', () => { SET.text = +b.dataset.txt; applySet(); saveSet(); UI.ok(); renderSettingsKeep(b.dataset.txt); }));
  $('setBody').querySelector('[data-act=fs]').addEventListener('click', toggleFS);
  $('setBody').querySelector('[data-act=reset]').addEventListener('click', async () => {
    if (await confirmBox('저장된 진행과 도전과제를 모두 지울까요?', '지우기')) { store.del(SAVE_KEY); store.del('berry_ach_v1'); store.del('berry_cleared'); location.reload(); }
  });
}
function renderSettingsKeep(txt) { renderSettings(); const b = $('setBody').querySelector(`[data-txt="${txt}"]`); if (b) b.focus(); }
function toggleFS() {
  const d = document;
  if (!d.fullscreenElement) (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen || (() => { })).call(d.documentElement);
  else (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  UI.ok(); setTimeout(() => { if (!$('settings').classList.contains('hidden')) { const f = document.activeElement && document.activeElement.dataset.act; renderSettings(); if (f) $('setBody').querySelector(`[data-act=${f}]`).focus(); } }, 300);
}
function renderAch() {
  const n = Object.keys(GOT).length;
  $('achHead').innerHTML = `<b>${n}</b> / ${ACH.length}<i><em style="width:${n / ACH.length * 100}%"></em></i>`;
  $('achList').innerHTML = ACH.map(a => {
    const got = GOT[a.id], hid = a.hidden && !got;
    return `<li class="${got ? 'got' : ''}" tabindex="0"><img src="img/ui/${hid ? 'c_lock' : a.icon}.webp" alt=""><div><b>${hid ? '숨겨진 도전과제' : a.name}</b><span>${hid ? '조금 더 깊이 들어가 보세요' : a.desc}</span></div>${got ? `<time>${new Date(got).toLocaleDateString('ko-KR')}</time>` : ''}</li>`;
  }).join('');
}
const GALLERY = [
  ['keyart_classroom', '키 아트 · 교실', 0], ['keyart_candle', '키 아트 · 촛불', 0], ['keyart_dollroom', '키 아트 · 인형의 방', 1],
  ['keyart_highangle', '키 아트 · 내려다보는 시선', 1], ['enemy_doll', '그것 · 인형 소녀', 1], ['enemy_nurse', '??? · 유령 간호사', 2],
  ['enemy_shadow', '??? · 그림자 소년', 2], ['enemy_ragged', '??? · 누더기 소년', 2],
];
function renderGallery() {
  const cleared = Object.keys(store.get('berry_cleared', {})).length > 0;
  $('galList').innerHTML = GALLERY.map(([f, t, lv]) => {
    const open = lv === 0 || (lv >= 1 && cleared);
    return `<button class="gi ${open ? '' : 'lock'}" data-f="${f}" ${open ? '' : 'disabled'}><img src="img/gallery/${f}_s.webp" alt="" loading="lazy"><span>${open ? t : lv === 2 ? '다음 챕터에서' : '클리어 후 열림'}</span></button>`;
  }).join('');
  $('galList').querySelectorAll('.gi:not(.lock)').forEach(b => b.addEventListener('click', () => {
    const v = $('galView'); v.innerHTML = `<img src="img/gallery/${b.dataset.f}.webp" alt=""><p>${b.querySelector('span').textContent}</p>`; v.classList.remove('hidden'); UI.ok();
    v.onclick = () => { v.classList.add('hidden'); b.focus(); };
  }));
}
function confirmBox(msg, yes) {
  return new Promise(res => {
    const el = $('confirm'); el.querySelector('p').textContent = msg; $('cfYes').textContent = yes || '확인';
    el.classList.remove('hidden'); setTimeout(() => $('cfNo').focus(), 30);
    const end = v => { el.classList.add('hidden'); $('cfYes').onclick = $('cfNo').onclick = null; v ? UI.ok() : UI.back(); const t = topLayer(); if (t) focusFirst(t); res(v); };
    $('cfYes').onclick = () => end(true); $('cfNo').onclick = () => end(false); confirmBox.cancel = () => end(false);
  });
}

/* ---------------- 타이틀 메뉴 ---------------- */
function buildTitle() {
  const sv = readSave(), cleared = Object.keys(store.get('berry_cleared', {})).length > 0;
  const btn = (id, icon, t, sub, cls) => `<button class="mi ${cls || ''}" id="${id}"><img src="img/ui/${icon}.webp" alt=""><span>${t}${sub ? `<small>${sub}</small>` : ''}</span></button>`;
  let h = '';
  if (sv) {
    const c = CHARS.find(x => x.id === sv.char), fl = FLOOR_CARD[sv.cp.floor];
    h += btn('mCont', 'p_play', '이어하기', `${c ? c.en : ''} · ${fl ? fl[0] + ' ' + fl[1] : ''} · ${sv.cp.time}`, 'primary');
  }
  h += btn('mNew', sv ? 'p_arrow_next' : 'p_play', '새 게임', '', sv ? '' : 'primary');
  h += btn('mSet', 'p_settings', '설정') + btn('mAch', 'p_heart_patched', '도전과제', `${Object.keys(GOT).length} / ${ACH.length}`)
    + btn('mGal', 'p_map', '갤러리') + btn('mCred', 'p_notebook', '크레딧');
  $('tmenu').innerHTML = h;
  if (sv) $('mCont').onclick = () => { UI.ok(); startGame(true); };
  $('mNew').onclick = async () => { if (sv && !(await confirmBox('저장된 진행이 지워져요. 처음부터 시작할까요?', '새로 시작'))) return; UI.ok(); startGame(false); };
  $('mSet').onclick = () => openPanel('settings');
  $('mAch').onclick = () => openPanel('achv');
  $('mGal').onclick = () => openPanel('gallery');
  $('mCred').onclick = () => { UI.ok(); credits().then(() => $('mCred').focus()); };
  $('tstamp').classList.toggle('hidden', !cleared);
  $('tver').textContent = VERSION;
}
$('bStart').remove();
buildTitle();
/* 타이틀이 뜰 때 첫 버튼에 초점 */
new MutationObserver(() => { if ($('title').classList.contains('show')) setTimeout(() => focusFirst($('title')), 2200); }).observe($('title'), { attributes: true, attributeFilter: ['class'] });
/* 일시정지 메뉴에 설정 추가 */
(() => {
  const b = document.createElement('button'); b.className = 'btn ico'; b.id = 'bSettings';
  b.innerHTML = '<img src="img/ui/p_settings.webp" alt="">설정'; $('bSound').replaceWith(b);
  b.addEventListener('click', () => openPanel('settings'));
})();
$('bTitle').addEventListener('click', e => { writeSave(); }, true);

/* ---------------- 경고 화면 (부팅 직후 한 번) ---------------- */
const _bootPress = bootPress;
bootPress = function () {
  if (!bootReady || S.mode !== 'boot') return;
  if (!bootPress.warned) {
    bootPress.warned = true; A.init(); A.ctx.resume();
    const w = $('warn'); w.classList.remove('hidden'); $('boot').classList.add('hidden');
    setTimeout(() => focusFirst(w), 400);
    const go = calm => { if (calm != null) { SET.calm = calm; saveSet(); applySet(); } w.classList.add('out'); setTimeout(() => w.classList.add('hidden'), 700); $('boot').classList.remove('hidden'); _bootPress(); };
    $('wGo').onclick = () => { UI.ok(); go(null); };
    $('wCalm').onclick = () => { UI.ok(); go(true); };
    return;
  }
};
$('boot').removeEventListener('pointerdown', _bootPress);
$('boot').addEventListener('pointerdown', () => bootPress());
/* 로딩 중 팁 */
const TIPS = ['달리면 발소리가 커진다. 그것은 소리를 따라온다.', '오르골 소리가 끊기면…… 가까이 있다는 뜻이다.', '같은 곳에 계속 숨으면, 그것도 기억한다.',
  '책상 밑과 커튼 뒤는 들키기 쉽다. 캐비닛과 화장실 칸이 더 안전하다.', '손전등은 배터리를 먹는다. 불 켜진 곳에서는 꺼 두자.', '휴대폰 메모가 길을 알려 준다. Tab으로 열어 보자.', '설정에서 밝기를 맞추면 어둠 속이 조금 더 잘 보인다.'];
(() => { const t = document.querySelector('#boot .tip'); let i = Math.floor(Math.random() * TIPS.length); t.textContent = TIPS[i]; setInterval(() => { i = (i + 1) % TIPS.length; t.classList.add('fade'); setTimeout(() => { t.textContent = TIPS[i]; t.classList.remove('fade'); }, 400); }, 4200); })();

/* ---------------- 메뉴 초점 이동 (키보드 · 패드) ---------------- */
let inputBlockUntil = 0;
function blockInput(ms) { inputBlockUntil = performance.now() + ms; }
const LAYERS = ['confirm', 'galView', 'gallery', 'achv', 'settings', 'credits', 'result', 'warn', 'dead', 'pause', 'scene', 'select', 'title'];
function topLayer() {
  for (const id of LAYERS) { const el = $(id); if (el && !el.classList.contains('hidden')) { if (id === 'scene' && !el.querySelector('button')) continue; return el; } }
  return null;
}
function focusables(root) { return [...root.querySelectorAll('button:not([disabled]),input,a[href],li[tabindex]')].filter(e => e.offsetParent !== null && !e.closest('.hidden')); }
function focusFirst(root) { if (!root) return; const f = focusables(root); const p = f.find(e => e.classList.contains('primary')) || f[0]; if (p) p.focus({ preventScroll: false }); }
function moveFocus(root, dir) {
  const f = focusables(root); if (!f.length) return;
  const cur = document.activeElement; if (!f.includes(cur)) { focusFirst(root); return; }
  const r0 = cur.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  let best = null, bd = 1e9;
  for (const e of f) {
    if (e === cur) continue; const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, dx = x - cx, dy = y - cy;
    const ok = dir === 'up' ? dy < -4 : dir === 'down' ? dy > 4 : dir === 'left' ? dx < -4 : dx > 4; if (!ok) continue;
    const d = (dir === 'up' || dir === 'down') ? Math.abs(dy) + Math.abs(dx) * 2.5 : Math.abs(dx) + Math.abs(dy) * 2.5;
    if (d < bd) { bd = d; best = e; }
  }
  if (!best && (dir === 'down' || dir === 'up')) { const i = f.indexOf(cur); best = f[(i + (dir === 'down' ? 1 : -1) + f.length) % f.length]; }
  if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); UI.move(); }
}
function backLayer(el) {
  const id = el.id;
  if (id === 'confirm') return confirmBox.cancel && confirmBox.cancel();
  if (id === 'galView') { el.click(); return; }
  if (['gallery', 'achv', 'settings'].includes(id)) return closePanel(id);
  if (id === 'credits') return credits.close && (UI.back(), credits.close());
  if (id === 'select') { $('select').classList.add('hidden'); $('title').classList.remove('hidden'); S.mode = 'title'; startTitleFx(); buildTitle(); UI.back(); setTimeout(() => focusFirst($('title')), 50); }
}
window.addEventListener('keydown', e => {
  lastInput('key');
  const L = topLayer(); if (!L) return;
  if (performance.now() < inputBlockUntil && ['result', 'credits'].includes(L.id)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
  // 게임 쪽 처리가 필요한 화면은 통과 (캐릭터 선택은 자체 방향키 처리 / 일시정지 Esc / 잡힘)
  const k = e.key, dirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  if (L.id === 'select') { if (k === 'Escape' || k === 'Backspace') { e.stopImmediatePropagation(); backLayer(L); } return; }
  if (L.id === 'scene' && S.mode !== 'end') return;
  const cur = document.activeElement;
  if (dirs[k]) {
    e.preventDefault(); e.stopImmediatePropagation();
    if (cur && cur.type === 'range' && (dirs[k] === 'left' || dirs[k] === 'right')) { cur.value = +cur.value + (dirs[k] === 'right' ? 1 : -1) * +cur.step; cur.dispatchEvent(new Event('input')); return; }
    moveFocus(L, dirs[k]); return;
  }
  if (k === 'Enter' || k === ' ' || k === 'e' || k === 'E') {
    e.preventDefault(); e.stopImmediatePropagation();
    if (L.id === 'credits') { credits.close && credits.close(); return; }
    if (L.id === 'galView') { L.click(); return; }
    if (cur && L.contains(cur) && cur.tagName !== 'INPUT') cur.click(); else focusFirst(L);
    return;
  }
  if (k === 'Escape' || k === 'Backspace') {
    if (L.id === 'pause') return;                      // 게임이 일시정지 해제
    e.preventDefault(); e.stopImmediatePropagation(); backLayer(L);
  }
  if (L.id !== 'pause' && L.id !== 'dead') e.stopImmediatePropagation();
}, true);
/* 일시정지가 열리면 첫 버튼에 초점 */
new MutationObserver(() => { if (!$('pause').classList.contains('hidden')) setTimeout(() => focusFirst($('pause')), 30); }).observe($('pause'), { attributes: true, attributeFilter: ['class'] });
new MutationObserver(() => { if (!$('dead').classList.contains('hidden')) setTimeout(() => focusFirst($('dead')), 30); }).observe($('dead'), { attributes: true, attributeFilter: ['class'] });
document.querySelectorAll('.btn,.mi').forEach(b => b.addEventListener('mouseenter', () => { if (b !== document.activeElement) { b.focus({ preventScroll: true }); UI.move(); } }));
document.addEventListener('mouseover', e => { const b = e.target.closest && e.target.closest('.mi,.btn,.srow,.gi,#selGrid .card'); if (b && b !== document.activeElement && !b.disabled) { b.focus({ preventScroll: true }); } });

/* ---------------- 게임패드 ---------------- */
const GP = { x: 0, y: 0, active: false, prev: [], rep: {} };
let lastKind = 'key';
function lastInput(k) { if (k === lastKind) return; lastKind = k; document.body.classList.toggle('pad', k === 'pad'); }
const press = (key, down) => (document.activeElement || document.body).dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key, bubbles: true, cancelable: true }));
window.addEventListener('gamepadconnected', e => { card('🎮', '컨트롤러 연결됨', ''); lastInput('pad'); });
function padPoll(now) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null;
  for (const p of pads) if (p && p.connected) { gp = p; break; }
  if (!gp) { GP.active = false; return; }
  const b = i => gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > .5);
  let ax = gp.axes[0] || 0, ay = gp.axes[1] || 0; const m = Math.hypot(ax, ay);
  if (m < .22) { ax = ay = 0; } else { const s = (m - .22) / .78 / m; ax *= s; ay *= s; }
  const inMenu = !!topLayer() || ['boot', 'title', 'select'].includes(S.mode) || bagOpen || !$('memo').classList.contains('hidden') || miniActive;
  GP.x = ax; GP.y = ay; GP.active = !inMenu && (ax !== 0 || ay !== 0);
  if (ax || ay) lastInput('pad');
  // 버튼 → 키
  const play = !inMenu;
  const memoOpen = !$('memo').classList.contains('hidden');
  const map = [[0, play || miniActive ? 'e' : 'Enter'], [1, play || memoOpen ? 'Tab' : 'Escape'], [2, 'f'], [3, 'm'], [8, 'm'], [9, 'Escape'],
    [12, 'ArrowUp'], [13, 'ArrowDown'], [14, 'ArrowLeft'], [15, 'ArrowRight']];
  const cur = [];
  for (const [i, key] of map) {
    const d = b(i); cur[i] = d;
    if (d && !GP.prev[i]) { lastInput('pad'); GP.key = GP.key || {}; GP.key[i] = key; press(key, true); GP.rep[i] = now + 380; }
    else if (!d && GP.prev[i]) { press(GP.key ? GP.key[i] : key, false); }
    else if (d && i >= 12 && inMenu && now > GP.rep[i]) { press(key, true); GP.rep[i] = now + 120; }
  }
  // 달리기: 숄더/트리거
  const run = b(4) || b(5) || b(6) || b(7); K['shift'] = run || K['shift_kb'] || false;
  // 메뉴에서 스틱 → 방향
  if (inMenu) {
    const dir = Math.abs(ay) > .6 ? (ay < 0 ? 'ArrowUp' : 'ArrowDown') : Math.abs(ax) > .6 ? (ax < 0 ? 'ArrowLeft' : 'ArrowRight') : null;
    if (dir && (dir !== GP.sdir || now > GP.srep)) { press(dir, true); press(dir, false); GP.srep = now + (dir === GP.sdir ? 140 : 380); }
    GP.sdir = dir;
  } else GP.sdir = null;
  GP.prev = cur;
}
/* 키보드 Shift와 패드 달리기가 서로 지우지 않게 */
window.addEventListener('keydown', e => { if (e.key === 'Shift') K['shift_kb'] = true; });
window.addEventListener('keyup', e => { if (e.key === 'Shift') K['shift_kb'] = false; });
window.addEventListener('blur', () => { K['shift_kb'] = false; });

/* ---------------- 소리 자막 ---------------- */
let capT = 0;
function caption(t, ms) {
  if (!SET.captions) return; const el = $('cap'); el.textContent = t; el.classList.remove('hidden'); clearTimeout(caption.t);
  caption.t = setTimeout(() => el.classList.add('hidden'), ms || 1800);
}
for (const [fn, txt] of [['giggle', '[키득거리는 웃음]'], ['knock', '[노크 소리]'], ['rattle', '[문손잡이가 덜컥거린다]'], ['shutter', '[셔터가 움직인다]'], ['thud', '[쿵]'], ['vibrate', '[휴대폰 진동]'], ['dissonance', '[어긋난 피아노 소리]']]) {
  const o = A[fn]; A[fn] = function () { if (S.mode === 'play') caption(txt); return o.apply(this, arguments); };
}
function captionTick(dt) {
  if (!SET.captions || !A.ctx || S.mode !== 'play' || S.paused) return;
  capT -= dt; if (capT > 0) return; capT = 2.5;
  const o = A.bus.orgel.gain.value, c = A.bus.chase.gain.value, h = A.bus.heart.gain.value;
  if (c > .15) caption('[추격 음악]', 2400);
  else if (o > .05) caption(o > .35 ? '[오르골 소리 — 아주 가깝다]' : o > .15 ? '[오르골 소리가 또렷하다]' : '[멀리서 희미한 오르골 소리]', 2400);
  else if (h > .2) caption('[두근, 두근]', 2400);
}

/* ---------------- 기타: 탭 이동 시 자동 일시정지 · 마우스 숨기기 ---------------- */
document.addEventListener('visibilitychange', () => { if (document.hidden && (S.mode === 'play' || S.mode === 'runner') && !S.paused && !dying && !bagOpen) togglePause(); });
let mouseT = 0; window.addEventListener('mousemove', () => { mouseT = 0; document.body.classList.remove('nocur'); });

/* ---------------- 메타 루프 ---------------- */
let metaLast = performance.now();
function metaLoop(now) {
  const dt = Math.min(.1, (now - metaLast) / 1000); metaLast = now;
  padPoll(now); watch(dt); captionTick(dt);
  mouseT += dt; document.body.classList.toggle('nocur', mouseT > 2.2 && (S.mode === 'play' || S.mode === 'runner') && !S.paused);
  requestAnimationFrame(metaLoop);
}
requestAnimationFrame(metaLoop);
applySet();
window.META = { SET, ST, GOT, unlock, writeSave, readSave, card, credits, toggleFS };
