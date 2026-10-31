'use strict';
/* =========================================================
   마지막 추격 — 옥상에서 1층 현관까지, 옆에서 본 학교를 뛰어 내려간다
   방 구간(옆모습 배경) + 계단 구간(비스듬히 내려감)을 이어 붙인 한 줄짜리 코스
   (game.js 다음에 로드. S, P, A, IMG, $ 등 공용 상태 사용)
   ========================================================= */
const ROOM_W = 2172, STAIR_L = 1150, STAIR_D = 520;
const RUN_COURSE = [
  { room: 'hallway', feet: 505, name: '4층 복도' },
  { stairs: true, name: '계단 · 4층 → 3층', to: '3F' },
  { room: 'music', feet: 565, name: '3층 음악실' },
  { stairs: true, name: '계단 · 3층 → 2층', to: '2F' },
  { room: 'hallway_open', feet: 505, name: '2층 복도' },
  { stairs: true, name: '계단 · 2층 → 1층', to: '1F' },
  { room: 'broadcast', feet: 580, name: '1층 방송실' },
  { room: 'hallway', feet: 505, name: '현관 앞 복도', exit: true },
];
const OB_TYPES = {   // h: 그릴 높이(원본 px), top: 충돌 높이 비율
  bucket: { h: 92, top: .85 }, cone: { h: 96, top: .9 }, chair: { h: 118, top: .7 },
  chair_fallen: { h: 74, top: .9 }, desk: { h: 116, top: .72 }, plant: { h: 104, top: .75 }, extinguisher: { h: 84, top: .9 },
};
const OB_ROOMS = [   // 방 구간마다 (구간 안 x, 종류)
  [[900, 'bucket'], [1450, 'chair_fallen'], [1900, 'cone']],
  [[500, 'chair'], [950, 'plant'], [1400, 'desk'], [1850, 'chair_fallen']],
  [[450, 'cone'], [850, 'chair'], [1300, 'extinguisher'], [1750, 'bucket']],
  [[400, 'desk'], [800, 'chair'], [1200, 'chair_fallen'], [1650, 'plant'], [2000, 'bucket']],
  [[450, 'cone'], [900, 'desk'], [1300, 'extinguisher']],
];
const RN = { on: false };
let COURSE = [], RUN_END = 0;

function buildCourse() {
  let x = 0, y = 0, ri = 0; COURSE = [];
  for (const c of RUN_COURSE) {
    const seg = Object.assign({ x0: x, y0: y }, c);
    if (c.stairs) { seg.len = STAIR_L; seg.y1 = y + STAIR_D; y += STAIR_D; }
    else { seg.len = ROOM_W; seg.y1 = y; seg.ri = ri++; }
    x += seg.len; COURSE.push(seg);
  }
  RUN_END = x - 360;
}
function segAt(x) { for (const s of COURSE) if (x < s.x0 + s.len) return s; return COURSE[COURSE.length - 1]; }
// 바닥 높이(아래로 갈수록 +). 계단은 양 끝에 평평한 계단참이 있다
function groundY(x) {
  const s = segAt(x); if (!s.stairs) return s.y0;
  const t = clamp((x - s.x0 - 150) / (s.len - 300), 0, 1);
  return s.y0 + STAIR_D * t;
}

async function loadRunAssets() {
  const jobs = [];
  for (const c of new Set(RUN_COURSE.filter(c => c.room).map(c => c.room))) jobs.push(loadImg('run_' + c, `img/run/bg_${c}.jpg`));
  for (const k in OB_TYPES) jobs.push(loadImg('ob_' + k, `img/run/ob_${k}.webp`));
  await Promise.all(jobs);
}

async function startRunner() {
  S.mFollow = null; mOff(); S.busy = true; S.lock = true;
  await fadeTo(1, 350);
  await loadRunAssets(); buildCourse();
  Object.assign(RN, { on: true, started: false, x: 160, h: 0, vy: 0, spd: 0, stumble: 0, dx: -260, dspd: 0, t: 0, obs: [], seg: null, done: false, shake: 0, jumpBuf: 0, coyote: 0, hits: 0, blink: 0, camY: 0 });
  COURSE.forEach(s => { if (!s.stairs) OB_ROOMS[s.ri].forEach(([x, k]) => RN.obs.push({ x: s.x0 + x, k, hit: false, rot: 0, vx: 0 })); });
  ['prompt', 'goal', 'breath'].forEach(id => $(id).classList.add('hidden'));
  S.mode = 'runner'; S.orgelForce = .55; ORGEL.start();
  checkpoint(); S.cp.resume = 'runner';
  await fadeTo(0, 450);
  hint('<kbd>Space</kbd>·<kbd>W</kbd>·<kbd>↑</kbd> 점프 — 1층 현관까지 멈추지 마', 4200);
  RN.started = true; S.busy = false; S.lock = false;
}
RESUME.runner = () => { S.mode = 'play'; startRunner(); };
function runJump() { if (RN.on) RN.jumpBuf = .14; }

function runUpdate(dt) {
  if (!RN.on || !RN.started) return;
  RN.t += dt;
  const seg = segAt(RN.x);
  // 달리기: 계단은 조금 더 빠르게 뛰어 내려간다
  const base = seg.stairs ? 430 : 380;
  const target = RN.stumble > 0 ? 170 : base;
  RN.spd = lerp(RN.spd, target, Math.min(1, dt * (RN.stumble > 0 ? 8 : 2.4)));
  RN.stumble = Math.max(0, RN.stumble - dt);
  RN.x += RN.spd * dt;
  // 점프 (입력 버퍼 + 코요테 타임)
  RN.jumpBuf -= dt; RN.coyote = RN.h <= 0 ? .1 : RN.coyote - dt;
  if (RN.jumpBuf > 0 && RN.coyote > 0 && RN.stumble <= .15) { RN.vy = 820; RN.jumpBuf = 0; RN.coyote = 0; A.step(.4); }
  RN.vy -= 2150 * dt; RN.h += RN.vy * dt; if (RN.h <= 0) { if (RN.vy < -300) A.step(.35); RN.h = 0; RN.vy = 0; }
  // 장애물
  for (const o of RN.obs) {
    const T = OB_TYPES[o.k], img = IMG['ob_' + o.k]; if (!img) continue;
    if (o.hit) { o.x += o.vx * dt; o.vx *= .96; o.rot += dt * 4; continue; }
    const w = T.h * img.width / img.height;
    if (Math.abs(RN.x - o.x) < w / 2 - 16 && RN.h < T.h * T.top - 6) {
      o.hit = true; o.vx = 260; RN.stumble = .45; RN.hits++; RN.shake = 14; A.thud(); A.noiseHit(.6, 900, 300, .25);
      bark(['윽……!', '아악!', '……!'][RN.hits % 3], 900);
    }
  }
  // 인형: 일정 거리를 두고 따라오다가, 넘어지면 확 좁혀 온다
  const gap = RN.x - RN.dx;
  let ds = seg.stairs ? 410 : 362;
  if (gap > 560) ds = 470; else if (gap > 380) ds += 22; else if (gap < 200) ds -= 60; else if (gap < 280) ds -= 18;
  if (RN.t < 1.4) ds = 140;
  RN.dspd = lerp(RN.dspd, ds, Math.min(1, dt * 3));
  RN.dx += RN.dspd * dt;
  // 구간이 바뀌면 표시 + 그것이 한 번 '순간이동'하듯 다가온다
  if (seg !== RN.seg) {
    const first = !RN.seg; RN.seg = seg;
    $('loc').innerHTML = seg.name.replace(/^(\S+)\s/, '$1 <b>') + '</b>';
    if (!first) { RN.dx = Math.max(RN.dx, RN.x - 400); RN.blink = .3; A.giggle(.5, -.6); S.flash = .1; }
    if (seg.stairs) A.noiseHit(.4, 400, 200, .4, 0, 'lowpass');
  }
  RN.blink = Math.max(0, RN.blink - dt);
  // 사운드
  const g = Math.max(0, RN.x - RN.dx), near = clamp(1 - (g - 70) / 500, 0, 1);
  A.setBus('heart', .3 + near * .7, .1); A.setBus('chase', .45 + near * .2, .2);
  if (A.t() - A.lastHeart > 60 / (90 + near * 90)) { A.lastHeart = A.t(); A.heart(); }
  RN.stepT = (RN.stepT || 0) - dt; if (RN.stepT <= 0 && RN.h <= 0) { RN.stepT = seg.stairs ? .19 : .26; A.step(.45, 0); }
  RN.dstep = (RN.dstep || 0) - dt; if (RN.dstep <= 0) { RN.dstep = .3; A.click(.35 + near * .5, -.7); }
  ORGEL.tick();
  RN.shake = Math.max(0, RN.shake - dt * 30);
  // 카메라 높이: 바닥선을 부드럽게 따라감
  RN.camY = lerp(RN.camY, groundY(RN.x), Math.min(1, dt * 6));
  // 잡힘 — 그림이 맞닿는 거리(약 64px)에서 바로 잡힌다
  if (g < 64 && !RN.done) { RN.on = false; caught(); return; }
  if (RN.x >= RUN_END && !RN.done) { RN.done = true; runExit(); }
}

async function runExit() {
  S.busy = true; S.lock = true;
  A.setBus('chase', 0, .3); S.orgelForce = 0;
  S.flash = .9; await fadeTo(1, 500);
  RN.on = false;
  S.mode = 'play'; S.floor = 1; setLights(floorLights(1));
  P.x = 707; P.y = 878; P.dir = 'down'; snapCam();
  S.busy = false; fl().ending = true;
  await fadeTo(0, 400);
  run(endingEvent);
}

/* ---------------- 그리기 ---------------- */
function drawStairs(seg, camX, s, toScreenY, W, H) {
  const sx0 = (seg.x0 - camX) * s, sx1 = (seg.x0 + seg.len - camX) * s;
  if (sx1 < 0 || sx0 > W) return;
  const g = ctx.createLinearGradient(0, toScreenY(seg.y0 - 420), 0, toScreenY(seg.y1 + 200));
  g.addColorStop(0, '#1b1d26'); g.addColorStop(1, '#0c0d13');
  ctx.fillStyle = g; ctx.fillRect(sx0, 0, sx1 - sx0, H);
  ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1;
  for (let yy = seg.y0 - 400; yy < seg.y1 + 200; yy += 90) { ctx.beginPath(); ctx.moveTo(sx0, toScreenY(yy)); ctx.lineTo(sx1, toScreenY(yy)); ctx.stroke(); }
  ctx.save(); ctx.font = `800 ${46 * s}px Pretendard`; ctx.fillStyle = 'rgba(220,226,255,.18)'; ctx.textAlign = 'center';
  ctx.fillText(seg.to + ' ↓', (seg.x0 + seg.len * .7 - camX) * s, toScreenY(seg.y1 - 250)); ctx.restore();
  const ex = (seg.x0 + 90 - camX) * s, ey = toScreenY(seg.y0 - 300);
  ctx.fillStyle = '#0d3a22'; ctx.fillRect(ex - 34 * s, ey - 14 * s, 68 * s, 28 * s); ctx.fillStyle = '#42f59b'; ctx.fillRect(ex - 28 * s, ey - 9 * s, 56 * s, 18 * s);
  const n = 16, x1 = seg.x0 + 150, x2 = seg.x0 + seg.len - 150, tw = (x2 - x1) / n, rh = STAIR_D / n;
  const bottom = toScreenY(seg.y1 + 400);
  ctx.fillStyle = '#2a2c36';
  ctx.beginPath(); ctx.moveTo(sx0, toScreenY(seg.y0));
  ctx.lineTo((x1 - camX) * s, toScreenY(seg.y0));
  for (let i = 0; i < n; i++) { const xa = x1 + i * tw; ctx.lineTo((xa - camX) * s, toScreenY(seg.y0 + (i + 1) * rh)); ctx.lineTo((xa + tw - camX) * s, toScreenY(seg.y0 + (i + 1) * rh)); }
  ctx.lineTo(sx1, toScreenY(seg.y1)); ctx.lineTo(sx1, bottom); ctx.lineTo(sx0, bottom); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(200,205,230,.35)'; ctx.lineWidth = 2 * s;
  for (let i = 0; i < n; i++) { const xa = x1 + i * tw, ya = toScreenY(seg.y0 + (i + 1) * rh); ctx.beginPath(); ctx.moveTo((xa - camX) * s, ya); ctx.lineTo((xa + tw - camX) * s, ya); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,200,60,.5)';
  for (let i = 0; i < n; i++) { const xa = x1 + i * tw, ya = toScreenY(seg.y0 + (i + 1) * rh); ctx.fillRect((xa - camX) * s, ya - 1 * s, tw * s * .9, 3 * s); }
  ctx.strokeStyle = 'rgba(120,124,140,.9)'; ctx.lineWidth = 4 * s;
  ctx.beginPath(); ctx.moveTo((x1 - 60 - camX) * s, toScreenY(seg.y0 - 120)); ctx.lineTo((x2 + 60 - camX) * s, toScreenY(seg.y1 - 120)); ctx.stroke();
  ctx.lineWidth = 2 * s;
  for (let i = 0; i <= n; i += 2) { const xa = x1 + i * tw, ya = seg.y0 + i * rh; ctx.beginPath(); ctx.moveTo((xa - camX) * s, toScreenY(ya - 120)); ctx.lineTo((xa - camX) * s, toScreenY(ya)); ctx.stroke(); }
}

function runRender(dt) {
  const W = cv.width, H = cv.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (!RN.x || !COURSE.length) return;
  const s = Math.min(H / 560, W / 1100);
  const camX = RN.x - (W / s) * .34;
  const feetScr = Math.min(H * .74, H / 2 + 200 * s);
  const toScreenY = wy => feetScr + (wy - RN.camY) * s;
  const sh = RN.shake ? [rnd(-RN.shake, RN.shake), rnd(-RN.shake, RN.shake)] : [0, 0];
  ctx.save(); ctx.translate(sh[0], sh[1]);
  for (const seg of COURSE) {
    if (seg.stairs) { drawStairs(seg, camX, s, toScreenY, W, H); continue; }
    const sx = (seg.x0 - camX) * s; if (sx > W || sx + seg.len * s < 0) continue;
    const img = IMG['run_' + seg.room]; if (!img) continue;
    ctx.drawImage(img, sx, toScreenY(seg.y0) - seg.feet * s, seg.len * s, 724 * s);
    const g = ctx.createLinearGradient(sx - 60 * s, 0, sx + 60 * s, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, 'rgba(0,0,0,.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - 60 * s, 0, 120 * s, H);
  }
  const ex = (RUN_END + 200 - camX) * s, ey = toScreenY(groundY(RUN_END)) - 120 * s;
  if (ex < W + 400) { const g = ctx.createRadialGradient(ex, ey, 10, ex, ey, 420 * s); g.addColorStop(0, 'rgba(255,250,235,.95)'); g.addColorStop(1, 'rgba(255,250,235,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  for (const o of RN.obs) {
    const T = OB_TYPES[o.k], img = IMG['ob_' + o.k]; if (!img) continue;
    const h = T.h * s, w = h * img.width / img.height, x = (o.x - camX) * s; if (x < -w || x > W + w) continue;
    const fy = toScreenY(groundY(o.x));
    ctx.save(); ctx.translate(x, fy);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(0, 0, w * .45, 6 * s, 0, 0, 7); ctx.fill();
    if (o.hit) { ctx.rotate(o.rot); ctx.globalAlpha = .8; }
    ctx.drawImage(img, -w / 2, -h, w, h); ctx.restore();
  }
  const dimg = IMG['m_side2'], near = clamp(1 - (RN.x - RN.dx - 70) / 500, 0, 1);
  const dFeet = toScreenY(groundY(RN.dx));
  if (dimg) {
    const dh = 140 * s, dw = dh * dimg.width / dimg.height, dx = (RN.dx - camX) * s;
    for (let k = 3; k >= 0; k--) {
      ctx.save(); ctx.globalAlpha = k ? .12 * (1 - k / 4) * (.4 + near) : 1;
      const jx = k ? -k * 22 * s : rnd(-near * 4, near * 4) * s;
      ctx.drawImage(dimg, dx - dw / 2 + jx, dFeet - dh - Math.abs(Math.sin(RN.t * 9)) * 3 * s, dw, dh); ctx.restore();
    }
  }
  const pimg = IMG['p_side2'], pFeet = toScreenY(groundY(RN.x));
  if (pimg) {
    const ph = 150 * s, pw = ph * pimg.width / pimg.height, px = (RN.x - camX) * s;
    const bob = RN.h > 0 ? 0 : Math.abs(Math.sin(RN.t * 14)) * 5 * s;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(px, pFeet, pw * .32 * (1 - Math.min(.5, RN.h / 300)), 6 * s, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(px, pFeet - RN.h * s - bob);
    if (RN.stumble > 0) ctx.rotate(.25 * Math.sin(RN.stumble * 20));
    else if (segAt(RN.x).stairs && RN.h <= 0) ctx.rotate(.08);
    ctx.drawImage(pimg, -pw / 2, -ph, pw, ph); ctx.restore();
  }
  ctx.restore();
  const px = (RN.x - camX) * s, py = pFeet - 90 * s;
  const d = dctx; d.setTransform(1, 0, 0, 1, 0, 0); d.globalCompositeOperation = 'source-over';
  d.fillStyle = 'rgba(3,4,12,.86)'; d.fillRect(0, 0, W, H); d.globalCompositeOperation = 'destination-out';
  let g = d.createRadialGradient(px, py, 0, px, py, 220 * s); g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(0, 0, W, H);
  const fx = px + 260 * s, fy = toScreenY(groundY(RN.x + 260)) - 90 * s;
  g = d.createRadialGradient(fx, fy, 0, fx, fy, 460 * s); g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(0, 0, W, H);
  if (Math.random() < .93) { g = d.createRadialGradient(ex, ey, 0, ex, ey, 520 * s); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(0, 0, W, H); }
  d.globalCompositeOperation = 'source-over';
  ctx.drawImage(dark, 0, 0);
  if (dimg) {
    const dh = 140 * s, dw = dh * dimg.width / dimg.height, dx = (RN.dx - camX) * s;
    ctx.save(); ctx.globalAlpha = .35 + (RN.blink > 0 ? .5 : 0); ctx.filter = 'brightness(.55)';
    ctx.drawImage(dimg, dx - dw / 2, dFeet - dh, dw, dh); ctx.restore();
    // 어둠 속에서 빛나는 눈 — 가까울수록 또렷하게
    const ex2 = dx - dw / 2 + dw * .52, ey2 = dFeet - dh * .71, er = 5 * s * (1 + near);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const eg = ctx.createRadialGradient(ex2, ey2, 0, ex2, ey2, er * 3); eg.addColorStop(0, `rgba(255,80,90,${.5 + near * .5})`); eg.addColorStop(1, 'rgba(255,0,30,0)');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex2, ey2, er * 3, 0, 7); ctx.fill(); ctx.restore();
  }
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .25, W / 2, H / 2, Math.max(W, H) * .7);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(150,0,20,${.35 + near * .35 + .08 * Math.sin(RN.t * 10)})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (S.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${S.flash})`; ctx.fillRect(0, 0, W, H); S.flash = Math.max(0, S.flash - dt * 2); }
  const bw = Math.min(W * .62, 520 * DPR), bx = (W - bw) / 2, by = 76 * DPR;
  ctx.fillStyle = 'rgba(10,8,20,.6)'; ctx.fillRect(bx - 8 * DPR, by - 8 * DPR, bw + 16 * DPR, 26 * DPR);
  const prog = clamp(RN.x / RUN_END, 0, 1), dprog = clamp(RN.dx / RUN_END, 0, 1);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(bx, by + 4 * DPR, bw, 3 * DPR);
  ctx.fillStyle = '#ff5c8a'; ctx.fillRect(bx, by + 4 * DPR, bw * dprog, 3 * DPR);
  ctx.font = `600 ${9 * DPR}px Pretendard`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(210,205,240,.7)';
  COURSE.forEach(c => { if (c.stairs) { const t = clamp((c.x0 + c.len / 2) / RUN_END, 0, 1); ctx.fillRect(bx + bw * t - .5 * DPR, by + 1 * DPR, 1 * DPR, 9 * DPR); ctx.fillText(c.to, bx + bw * t, by - 2 * DPR); } });
  ctx.fillStyle = '#e8ecff'; ctx.beginPath(); ctx.arc(bx + bw * prog, by + 5.5 * DPR, 6 * DPR, 0, 7); ctx.fill();
  ctx.fillStyle = '#ff3b5c'; ctx.beginPath(); ctx.arc(bx + bw * dprog, by + 5.5 * DPR, 5 * DPR, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff6d8'; ctx.fillRect(bx + bw - 3 * DPR, by - 2 * DPR, 6 * DPR, 15 * DPR);
  ctx.font = `600 ${11 * DPR}px Pretendard`; ctx.fillStyle = '#cfc7ee'; ctx.textAlign = 'left'; ctx.fillText('현관', bx + bw + 8 * DPR, by + 10 * DPR);
}
