'use strict';
/* =========================================================
   HORROR — 공포 연출 · 애니메이션 레이어
   · 공포 디렉터: 조용할 때만 가끔 — 스쳐 지나가는 그림자, 어둠 속 눈, 뒤에서 나는 발소리,
     속삭임, 꺼지는 형광등, 휴대폰 글리치, 어긋난 오르골 허밍
   · 그것: 어둠 속에서 빛나는 눈, 끊기는 스톱모션 걸음, 고개 꺾임, 수색 중 속삭이는 대사
   · 주인공: 숨쉬기 · 걸음 기울기 · 위험할수록 빨라지는 호흡
   · 화면: 손전등 먼지, 그것이 가까우면 손전등이 떨림, 추격 중 화면 찢김, 숨으면 소리가 먹먹해짐
   (game.js 다음, meta.js 앞에 로드)
   ========================================================= */
const HORROR = (() => {
  const H = { ev: null, nextAt: 0, sway: 0, mdraw: null, mdrawT: 0, twitch: 0, twitchR: 0, dust: [], subUsed: {}, whisperT: 0, lastState: '' };
  const calm = () => typeof SET !== 'undefined' && SET.calm;
  const IMGS = {};
  ['img/scare_stare.jpg'].forEach(s => { const i = new Image(); i.src = s; IMGS[s] = i; });
  for (let i = 0; i < 46; i++) H.dust.push({ x: Math.random(), y: Math.random(), z: Math.random(), ph: Math.random() * 6 });

  /* ---------------- 오디오: 복도 울림 + 숨으면 먹먹하게 ---------------- */
  H.audio = function (A) {
    const C = A.ctx; if (!C || A.rev) return;
    // 2.4초짜리 복도 잔향(감쇠 노이즈로 만든 임펄스)
    const len = C.sampleRate * 2.4, ir = C.createBuffer(2, len, C.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < 900 ? i / 900 : 1); }
    const rev = C.createConvolver(); rev.buffer = ir;
    const wet = C.createGain(); wet.gain.value = .32;
    rev.connect(wet).connect(A.master);
    for (const k of ['sfx', 'orgel', 'piano']) A.bus[k].connect(rev);
    // 마스터 뒤에 저역 필터: 숨으면 바깥 소리가 벽 너머처럼 들린다
    const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 20000; lp.Q.value = .4;
    A.master.disconnect(); A.master.connect(lp).connect(C.destination);
    A.rev = rev; A.lp = lp;
  };

  /* ---------------- 효과음 (합성) ---------------- */
  const snd = {
    stepsBehind() {          // 등 뒤를 한 바퀴 도는 작은 구두 소리
      for (let i = 0; i < 7; i++) { const w = A.t() + .25 + i * .44; const pan = -.9 + i * .3; A.noiseHit(.28, 2600, 1500, .045, pan, 'bandpass', w); A.tone(1700, 'square', .012, .001, .02, pan, null, w); }
    },
    whisper(pan) {           // 알아들을 수 없는 속삭임
      for (let i = 0; i < 14; i++) { const w = A.t() + i * rnd(.06, .13); A.noiseHit(rnd(.05, .11), rnd(2200, 5200), rnd(1200, 2500), rnd(.05, .14), pan + rnd(-.1, .1), 'bandpass', w); }
    },
    hum() {                  // 음이 어긋난 오르골 허밍 — 아이 목소리처럼
      const mel = [88, 84, 81, 83, 84, 76]; mel.forEach((m, i) => { const w = A.t() + .2 + i * .62; A.tone(440 * Math.pow(2, (m - 24.35 - 69) / 12), 'triangle', .05, .18, .7, rnd(-.6, .6), A.bus.sfx, w); A.tone(440 * Math.pow(2, (m - 12.4 - 69) / 12), 'sine', .025, .2, .6, 0, A.bus.sfx, w); });
    },
    slam(pan) { A.noiseHit(1, 140, 50, .45, pan, 'lowpass'); A.noiseHit(.4, 900, 300, .2, pan, 'bandpass'); },
    runAbove() { for (let i = 0; i < 9; i++) A.noiseHit(.35, 120, 70, .09, rnd(-.4, .4), 'lowpass', A.t() + i * .17); },
    pop() { A.noiseHit(.5, 5000, 2000, .04, 0, 'highpass'); A.tone(90, 'sine', .3, .003, .25); },
    scrape(pan) { A.tone(260, 'sawtooth', .05, .1, 1.1, pan, null, null, 180); A.noiseHit(.2, 1400, 700, 1.1, pan, 'bandpass'); },
  };

  /* ---------------- 위치 도우미 ---------------- */
  function spotAt(dist0, angOff, needLos) {
    for (let k = 0; k < 14; k++) {
      const a = P.ang + angOff + rnd(-.18, .18), d = dist0 + rnd(-30, 30);
      const x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
      if (x < 30 || y < 30 || x > MW - 30 || y > MH - 30) continue;
      if (!canStand(S.floor, x, y, 'm')) continue;
      if (needLos && !los(S.floor, P.x, P.y - 10, x, y - 10, 'm')) continue;
      if (!onScreen(x, y - 30, -10)) continue;
      return [x, y];
    }
    return null;
  }
  const quiet = () => S.mode === 'play' && !S.paused && !S.busy && !S.lock && !S.transit && !P.hidden && !dying && S.chaseLevel < .08
    && !(M.on && M.floor === S.floor && dist(M.x, M.y, P.x, P.y) < 520) && $('note').classList.contains('hidden');

  /* ---------------- 공포 디렉터 ---------------- */
  const EVENTS = {
    glimpse: { w: f => 3 + f, run() {                 // 손전등 끝에 스쳐 지나가는 그것
      const p = spotAt(255, 0, true); if (!p) return false;
      H.ev = { k: 'glimpse', x: p[0], y: p[1], t: 0, dur: .42, dir: Math.random() < .5 ? 'side1' : 'side2' };
      if (Math.random() < .5) A.giggle(.18, panOf(p[0])); return true; } },
    eyes: { w: f => 2 + f, run() {                    // 어둠 속에서 눈이 뜨인다 (손전등이 닿지 않는 쪽)
      let p = null; for (let i = 0; i < 8 && !p; i++) p = spotAt(rnd(150, 300), rnd(.9, 2.9) * (Math.random() < .5 ? -1 : 1), false); if (!p) return false;
      H.ev = { k: 'eyes', x: p[0], y: p[1] - 40, t: 0, dur: 2.4 }; return true; } },
    steps: { w: () => 3, run() { snd.stepsBehind(); cap('[등 뒤에서 작은 구두 소리]'); H.ev = { k: 'snd', t: 0, dur: 3.4 }; return true; } },
    whisper: { w: () => 2, run() { const pan = Math.random() < .5 ? -.8 : .8; snd.whisper(pan); cap(pan < 0 ? '[왼쪽에서 속삭이는 소리]' : '[오른쪽에서 속삭이는 소리]'); H.ev = { k: 'snd', t: 0, dur: 2 }; return true; } },
    hum: { w: f => f >= 2 ? 2 : 0, run() { snd.hum(); cap('[어디선가 콧노래가 들린다]'); H.ev = { k: 'snd', t: 0, dur: 4.2 }; return true; } },
    slam: { w: () => 2, run() { const pan = rnd(-1, 1); snd.slam(pan); S.shake = Math.max(S.shake, 2.5); cap('[멀리서 문이 쾅 닫힌다]'); H.ev = { k: 'snd', t: 0, dur: 1.5 }; return true; } },
    above: { w: f => f < 4 ? 2 : 0, run() { snd.runAbove(); cap('[위층에서 누가 뛰어간다]'); H.ev = { k: 'snd', t: 0, dur: 1.8 }; return true; } },
    scrape: { w: () => 1.5, run() { snd.scrape(rnd(-.8, .8)); cap('[책상이 끌리는 소리]'); H.ev = { k: 'snd', t: 0, dur: 1.4 }; return true; } },
    blackout: { w: f => S.lights.some(l => l.on) ? 3 : 0, run() {   // 가까운 형광등이 꺼졌다 켜지고, 그 아래에 —
      const L = S.lights.filter(l => l.on && dist(l.x, l.y, P.x, P.y) < 420 && dist(l.x, l.y, P.x, P.y) > 110 && onScreen(l.x, l.y, 0)).sort(() => Math.random() - .5)[0];
      if (!L) return false; snd.pop(); L.offUntil = S.t + 1.5;
      H.ev = { k: 'blackout', L, x: L.x, y: L.y + 30, t: 0, dur: 1.9 }; return true; } },
    phone: { w: () => 1.5, run() { A.vibrate(); H.ev = { k: 'phone', t: 0, dur: .9 }; return true; } },
  };
  function pickEvent() {
    const f = S.floor, pool = [];
    for (const k in EVENTS) { const w = EVENTS[k].w(f); if (w > 0 && k !== H.lastEv) pool.push([k, w]); }
    let r = Math.random() * pool.reduce((s, x) => s + x[1], 0);
    for (const [k, w] of pool) { r -= w; if (r <= 0) return k; }
    return pool[0] && pool[0][0];
  }
  function cap(t) { if (typeof caption === 'function') caption(t, 2600); }

  /* ---------------- 매 프레임 ---------------- */
  H.update = function (dt) {
    const fl = S.flags;
    // 숨으면 먹먹하게
    if (A.lp) A.lp.frequency.setTargetAtTime(P.hidden ? 1100 : 20000, A.t(), .15);
    // 손전등 흔들림(걸음)
    H.sway = P.moving ? Math.sin(P.bob * .5) * (P.run ? .07 : .035) : Math.sin(S.t * 1.3) * .012;
    // 디렉터: 첫 숨기 이벤트(교무실) 이후부터만. 프롤로그는 '혼자 남겨진 학교'로 둔다
    if (H.ev) { H.ev.t += dt; if (H.ev.t > H.ev.dur) H.ev = null; }
    if (fl.hide1 && !fl.ending && !fl.finale) {
      if (!H.nextAt) H.nextAt = S.t + rnd(18, 30);
      if (!H.ev && S.t > H.nextAt && quiet()) {
        const k = pickEvent();
        if (k && EVENTS[k].run()) { H.lastEv = k; H.nextAt = S.t + rnd(26, 52) - (S.floor - 1) * 4; }
        else H.nextAt = S.t + 3;
      }
      if (!quiet() && H.nextAt - S.t < 8) H.nextAt = S.t + 8;   // 추격 직후엔 숨 돌릴 틈
    }
    // 휴대폰 글리치
    if (H.ev && H.ev.k === 'phone') {
      const g = ['뒤에', '??:??', '여기', '00:00', '보고있어'][Math.floor(H.ev.t * 9) % 5];
      $('pTime').textContent = H.ev.t < .65 ? g : S.time; $('phone').classList.add('glitch');
    } else $('phone').classList.remove('glitch');
    // 그것의 대사 — 숨어 있을 때 바로 앞에서 / 추격 시작
    const sameF = M.on && M.floor === S.floor;
    if (sameF && M.state !== H.lastState) {
      if (M.state === 'chase' && !M.forceSafe && Math.random() < .55) whisper(['찾았다.', '어디 가?', '같이 놀자.', '술래는 너야.'][(Math.random() * 4) | 0]);
      H.lastState = M.state;
    }
    H.whisperT -= dt;
    if (sameF && P.hidden && ['search', 'suspicious'].includes(M.state) && dist(M.x, M.y, P.x, P.y) < 210 && H.whisperT <= 0) {
      H.whisperT = rnd(3.2, 5);
      whisper(['어디 숨었어……?', '여기……?', '……아니네.', '숨 참지 마.', '다 들려.', '나와도 돼.'][(Math.random() * 6) | 0]);
    }
    // 그것의 고개 꺾임(가끔, 갑자기)
    H.twitch -= dt;
    if (sameF && H.twitch < -rnd(1.5, 4) && Math.random() < dt * 1.5) { H.twitch = .16; H.twitchR = rnd(.12, .22) * (Math.random() < .5 ? -1 : 1); }
  };
  function whisper(t) {
    const el = $('whisper'); el.textContent = t; el.classList.remove('hidden', 'go'); void el.offsetWidth; el.classList.add('go');
    clearTimeout(whisper.t); whisper.t = setTimeout(() => el.classList.add('hidden'), 2600);
    snd.whisper(panOf(M.x));
  }

  /* ---------------- 스프라이트 애니메이션 ---------------- */
  H.spriteTf = function (pre, dir, still, bob) {
    if (pre === 'p_') {
      const danger = (typeof dangerNear === 'function' && dangerNear()) || S.chaseLevel > .3;
      const rate = danger ? 7.5 : 2.2, amp = danger ? .02 : .011;
      if (still) { const b = Math.sin(S.t * rate); return { sx: 1 - b * amp * .5, sy: 1 + b * amp, rot: 0, dx: danger ? rnd(-.25, .25) : 0 }; }
      const lean = P.run ? (dir === 'left' ? -.07 : dir === 'right' ? .07 : 0) : 0;
      const s = Math.sin(bob * 2) * (P.run ? .035 : .02);
      return { sx: 1 + s * .6, sy: 1 - s, rot: lean + Math.sin(bob) * (P.run ? .03 : .018), dx: 0 };
    }
    if (pre === 'm_') {
      const hunt = ['chase', 'pursue', 'search'].includes(M.state);
      return { sx: 1, sy: 1, rot: (H.twitch > 0 ? H.twitchR : 0) + (hunt ? Math.sin(S.t * 23) * .012 : 0), dx: hunt ? rnd(-.5, .5) : 0 };
    }
    return null;
  };
  /* 스톱모션처럼 뚝뚝 끊기는 그것의 걸음 */
  H.mDraw = function () {
    const hunt = ['chase', 'pursue', 'search', 'suspicious'].includes(M.state);
    if (!H.mdraw || !hunt || calm()) { H.mdraw = [M.x, M.y]; H.mdrawT = S.t; return H.mdraw; }
    const step = M.state === 'chase' || M.state === 'pursue' ? .075 : .11;
    if (S.t - H.mdrawT >= step || dist(H.mdraw[0], H.mdraw[1], M.x, M.y) > 40) { H.mdraw = [M.x, M.y]; H.mdrawT = S.t; }
    return H.mdraw;
  };
  H.torchK = function () {
    let k = 1;
    if (M.on && M.floor === S.floor) { const d = dist(M.x, M.y, P.x, P.y); if (d < 280) { const p = (1 - d / 280) * .5; if (Math.random() < p) k = Math.random() < .5 ? .05 : .45; } }
    if (H.ev && H.ev.k === 'glimpse' && H.ev.t > H.ev.dur - .12) k = .15;
    return k;
  };

  /* ---------------- 그리기: 월드 좌표 ---------------- */
  H.world = function () {
    const e = H.ev;
    if (e && e.k === 'glimpse') {
      const img = IMG['m_' + e.dir]; if (img) {
        const h = 58, w = h * img.width / img.height, a = Math.sin(Math.min(1, e.t / e.dur) * Math.PI) * .9;
        ctx.save(); ctx.globalAlpha = a; ctx.filter = 'brightness(.35) contrast(1.4)';
        ctx.drawImage(img, e.x - w / 2 + (e.t / e.dur) * (e.dir === 'side2' ? 26 : -26), e.y - h, w, h); ctx.restore();
      }
    }
    if (e && e.k === 'blackout' && e.t > .5 && e.t < 1.35) {      // 꺼진 불 아래 서 있는 실루엣
      const img = IMG.m_down; if (img) { const h = 58, w = h * img.width / img.height; ctx.save(); ctx.globalAlpha = .55; ctx.filter = 'brightness(.12)'; ctx.drawImage(img, e.x - w / 2, e.y - h, w, h); ctx.restore(); }
    }
  };
  /* ---------------- 그리기: 어둠 위 (화면 좌표) ---------------- */
  function eye(sx, sy, r, a, open) {
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3.2);
    g.addColorStop(0, `rgba(255,70,80,${a})`); g.addColorStop(.25, `rgba(255,20,40,${a * .55})`); g.addColorStop(1, 'rgba(255,0,30,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, sy, r * 3.2, r * 3.2 * Math.max(.08, open), 0, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(255,230,230,${a})`; ctx.beginPath(); ctx.ellipse(sx, sy, r * .55, r * .55 * Math.max(.05, open), 0, 0, 7); ctx.fill();
  }
  H.screen = function (dt) {
    const z = cam.z * DPR;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // 손전등 빛 속 먼지
    if (S.torch && !P.hidden && S.mode === 'play') {
      const ox = P.x, oy = P.y - 12, ang = P.ang + H.sway;
      for (const p of H.dust) {
        p.ph += dt * .6; const d = 40 + p.z * 230, a0 = ang + (p.x - .5) * .9;
        const wx = ox + Math.cos(a0) * d + Math.sin(p.ph) * 6, wy = oy + Math.sin(a0) * d + Math.cos(p.ph * .8) * 6 - (p.y - .5) * 20;
        const [sx, sy] = w2s(wx, wy); const al = (1 - p.z) * .22 * (.5 + .5 * Math.sin(p.ph * 2.3));
        ctx.fillStyle = `rgba(220,230,255,${al})`; ctx.beginPath(); ctx.arc(sx * DPR, sy * DPR, (.5 + p.z * .7) * z * .6, 0, 7); ctx.fill();
      }
    }
    // 그것의 눈 — 어둠 속에서도 보인다
    if (M.on && M.floor === S.floor && M.dir !== 'up' && (M.alpha == null || M.alpha > .2) && S.mode === 'play') {
      const d = dist(M.x, M.y, P.x, P.y);
      if (d < 640) {
        const [mx, my] = H.mDraw(); const hunt = ['chase', 'pursue'].includes(M.state);
        const a = (hunt ? .85 : .45) * clamp(1.15 - d / 640, 0, 1) * (H.twitch > 0 ? .3 : 1);
        const blink = (Math.sin(S.t * 1.7 + 1) > .985) ? .1 : 1;
        const pts = M.dir === 'down' ? [[-5, -40], [1, -41]] : M.dir === 'left' ? [[-7.5, -42]] : [[4, -42]];
        for (const [ex, ey] of pts) { const [sx, sy] = w2s(mx + ex, my + ey); eye(sx * DPR, sy * DPR, 1.3 * z, a, blink); }
      }
    }
    // 디렉터 이벤트: 어둠 속 눈
    const e = H.ev;
    if (e && e.k === 'eyes') {
      const t = e.t, open = t < .5 ? t / .5 : t > 1.15 && t < 1.3 ? .1 : t > 2 ? Math.max(0, 1 - (t - 2) / .3) : 1;
      for (const ex of [-4, 4]) { const [sx, sy] = w2s(e.x + ex, e.y); eye(sx * DPR, sy * DPR, 1.2 * z, .75, open); }
    }
    ctx.restore();
    // 심장 박동에 맞춰 조여 오는 테두리
    const near = M.on && M.floor === S.floor ? clamp(1 - dist(M.x, M.y, P.x, P.y) / 380, 0, 1) : 0;
    const beat = A.ctx ? Math.max(0, 1 - (A.t() - A.lastHeart) / .35) : 0;
    const k = Math.max(near, S.chaseLevel * .8) * beat;
    if (k > .02) {
      const W = cv.width, Hh = cv.height, g = ctx.createRadialGradient(W / 2, Hh / 2, Math.min(W, Hh) * .25, W / 2, Hh / 2, Math.max(W, Hh) * .62);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(40,0,8,${k * .55})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
    }
  };
  /* ---------------- 후처리: 화면 찢김 · 순간 이미지 ---------------- */
  H.post = function () {
    if (S.mode !== 'play' || S.paused) return;
    const W = cv.width, Hh = cv.height;
    const near = M.on && M.floor === S.floor ? clamp(1 - dist(M.x, M.y, P.x, P.y) / 260, 0, 1) : 0;
    let tear = Math.max(S.chaseLevel * .5 * near + (S.chaseLevel > .5 ? .12 : 0), H.ev && H.ev.k === 'glimpse' && H.ev.t > H.ev.dur - .15 ? .9 : 0);
    if (calm()) tear *= .3;
    if (Math.random() < tear * .35) {
      for (let i = 0; i < 2 + (Math.random() * 3 | 0); i++) {
        const y = Math.random() * Hh, h = rnd(4, 26) * DPR, dx = rnd(-22, 22) * DPR * (.4 + tear);
        ctx.drawImage(cv, 0, y, W, h, dx, y, W, h);
      }
      if (Math.random() < .4) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,30,60,${.05 * tear})`; ctx.fillRect(0, 0, W, Hh); ctx.globalCompositeOperation = 'source-over'; }
    }
    // 아주 가끔, 두 프레임짜리 얼굴 (층마다 최대 한 번, 번쩍임 줄이기면 끔)
    const f = S.floor;
    if (!calm() && S.flags.power && !H.subUsed[f] && H.ev && H.ev.k === 'blackout' && H.ev.t > .6 && H.ev.t < .66) {
      H.subUsed[f] = true; const im = IMGS['img/scare_stare.jpg'];
      if (im.complete) { ctx.globalAlpha = .1; const s = Math.max(W / im.width, Hh / im.height); ctx.drawImage(im, (W - im.width * s) / 2, (Hh - im.height * s) / 2, im.width * s, im.height * s); ctx.globalAlpha = 1; }
    }
  };
  H.isLightOff = l => l.offUntil && S.t < l.offUntil;
  H.force = k => EVENTS[k] && EVENTS[k].run();   // 개발·테스트용
  return H;
})();
window.HORROR = HORROR;
