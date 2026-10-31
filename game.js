'use strict';
/* =========================================================
   블루베리 마법학교 · CHAPTER 01 「야간자율학습」
   탑뷰 추격 탈출 공포 — 단일 캔버스 엔진 + 스크립트형 스토리
   ========================================================= */

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const dist = (a, b, c, d) => Math.hypot(a - c, b - d);
const DEV = /[?&]dev/.test(location.search);

/* ---------------- 캐릭터 ---------------- */
const CHARS = [
  { id: 'char_01', en: 'READER',   kr: '책을 읽는 아이' },
  { id: 'char_02', en: 'LISTENER', kr: '소리를 듣는 아이', main: true },
  { id: 'char_03', en: 'DREAMER',  kr: '꿈을 꾸는 아이' },
  { id: 'char_04', en: 'POET',     kr: '시를 쓰는 아이' },
  { id: 'char_05', en: 'SUNNY',    kr: '밝게 웃는 아이' },
  { id: 'char_06', en: 'REBEL',    kr: '삐딱한 아이' },
];

/* ---------------- 이미지 ---------------- */
const IMG = {};
function loadImg(key, src) {
  return new Promise(res => { const i = new Image(); i.onload = () => { IMG[key] = i; res(); }; i.onerror = () => res(); i.src = src; });
}
const MAPSRC = { 1: 'img/map_floor_entrance_lobby.jpg', 2: 'img/map_floor_library.jpg', 3: 'img/map_floor_music_art.jpg', 4: 'img/map_floor_science_atrium.jpg' };
async function loadAll(charId) {
  const jobs = [];
  for (const f in MAPSRC) jobs.push(loadImg('map' + f, MAPSRC[f]));
  for (const d of ['down', 'up', 'side1', 'side2']) {
    jobs.push(loadImg('p_' + d, `sprites/${charId}_${d}.png`));
    jobs.push(loadImg('m_' + d, `sprites/doll_${d}.png`));
  }
  await Promise.all(jobs);
}

/* =========================================================
   지도 기하 (지도 원본 1448×1086 px 좌표)
   ========================================================= */
const MW = 1448, MH = 1086;
const R = (x1, y1, x2, y2, o) => Object.assign({ x1, y1, x2, y2 }, o || {});
const inR = (r, x, y) => x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2;

const NORTH = [
  R(30, 405, 1420, 518),                         // 중앙 복도
  R(35, 188, 188, 342), R(80, 328, 124, 412, { gate: 'wDoor' }),
  R(1260, 188, 1418, 342), R(1328, 328, 1372, 412, { gate: 'eDoor' }),
  R(218, 108, 562, 330), R(260, 322, 298, 412, { gate: 'doorA' }),
  R(596, 62, 852, 330), R(637, 322, 676, 412, { gate: 'doorB' }),
  R(886, 108, 1235, 330), R(1151, 322, 1190, 412, { gate: 'doorC' }),
];
const REST_S = [R(42, 580, 305, 835), R(58, 512, 96, 585), R(258, 512, 296, 585)];
const STALLS = R(40, 648, 256, 752);

const FLOORS = {
  1: {
    name: '1층',
    walk: [...NORTH, ...REST_S,
      R(336, 580, 470, 835), R(347, 512, 385, 585),
      R(600, 545, 848, 862), R(600, 512, 848, 550),
      R(612, 860, 802, 905, { gate: 'front' }), R(40, 900, 1420, 1080, { gate: 'outside' }),
      R(895, 580, 1115, 835), R(1062, 512, 1100, 585),
      R(1146, 580, 1420, 835), R(1147, 512, 1186, 585, { gate: 'office' }), R(1347, 512, 1386, 585, { gate: 'office' }),
    ],
    block: [STALLS, R(628, 50, 818, 195), R(730, 296, 806, 330),
      R(895, 672, 955, 835), R(1000, 655, 1056, 832), R(1208, 640, 1292, 792), R(1370, 700, 1420, 800)],
    rooms: [['서쪽 계단', R(30, 40, 190, 345)], ['1-1 교실', R(210, 60, 570, 340)], ['방송실', R(590, 40, 860, 340)], ['1-2 교실', R(880, 60, 1240, 340)], ['동쪽 계단', R(1255, 40, 1420, 345)],
      ['복도', R(20, 345, 1430, 520)], ['화장실', R(30, 520, 310, 840)], ['창고', R(330, 520, 475, 840)], ['중앙 로비', R(490, 520, 860, 880)],
      ['보건실', R(880, 520, 1120, 840)], ['교무실', R(1140, 520, 1430, 840)], ['학교 앞', R(0, 880, 1448, 1086)]],
  },
  2: {
    name: '2층',
    walk: [...NORTH,
      R(45, 598, 758, 838), R(58, 512, 96, 612), R(617, 512, 656, 612),
      R(792, 580, 936, 838), R(800, 512, 935, 582),
      R(946, 580, 1080, 838), R(961, 512, 1000, 585),
      R(1106, 580, 1420, 838), R(1347, 512, 1386, 585)],
    block: [R(203, 618, 252, 782), R(313, 618, 362, 782), R(418, 618, 467, 782), R(508, 618, 557, 782), R(92, 622, 160, 742),
      R(790, 655, 905, 775), R(672, 172, 792, 258)],
    rooms: [['서쪽 계단', R(30, 40, 190, 345)], ['2-1 교실', R(210, 60, 570, 340)], ['자료실', R(590, 40, 860, 340)], ['2-2 교실', R(880, 60, 1240, 340)], ['동쪽 계단', R(1255, 40, 1420, 345)],
      ['복도', R(20, 345, 1430, 520)], ['도서관', R(30, 520, 765, 845)], ['화장실', R(785, 520, 940, 845)], ['청소도구실', R(941, 520, 1090, 845)], ['2-3 교실', R(1095, 520, 1430, 845)]],
  },
  3: {
    name: '3층',
    walk: [...NORTH, ...REST_S,
      R(336, 512, 408, 840),
      R(500, 580, 572, 835), R(540, 512, 577, 585),
      R(700, 600, 1425, 840), R(703, 512, 742, 614), R(1351, 512, 1390, 614)],
    block: [STALLS, R(603, 80, 712, 178), R(735, 92, 820, 165),
      R(755, 645, 832, 832), R(900, 645, 977, 832), R(1058, 645, 1137, 832), R(1228, 665, 1290, 832), R(1365, 625, 1425, 832),
      R(1238, 400, 1252, 520, { gate: 'shutter' })],
    rooms: [['서쪽 계단', R(30, 40, 190, 345)], ['3-1 교실', R(210, 60, 570, 340)], ['음악실', R(590, 40, 860, 340)], ['3-2 교실', R(880, 60, 1240, 340)], ['동쪽 계단', R(1255, 40, 1420, 345)],
      ['복도', R(20, 345, 1430, 520)], ['화장실', R(30, 520, 310, 840)], ['복도', R(330, 520, 415, 845)], ['미술 준비실', R(420, 520, 620, 845)], ['미술실', R(690, 520, 1430, 845)]],
  },
  4: {
    name: '4층',
    walk: [...NORTH, ...REST_S,
      R(336, 580, 470, 835), R(347, 512, 385, 585),
      R(498, 548, 850, 840), R(498, 512, 850, 552),
      R(905, 580, 1420, 838), R(1062, 512, 1100, 585), R(1347, 512, 1386, 585),
      R(1328, 62, 1400, 190)],   // 옥상 문 앞 계단참
    block: [STALLS, R(583, 645, 802, 795), R(1080, 672, 1242, 742), R(648, 148, 800, 195), R(948, 165, 1155, 210), R(948, 258, 1155, 300)],
    rooms: [['서쪽 계단', R(30, 40, 190, 345)], ['4-1 교실', R(210, 60, 570, 340)], ['과학실', R(590, 40, 860, 340)], ['컴퓨터실', R(880, 60, 1240, 340)], ['동쪽 계단', R(1255, 40, 1420, 345)],
      ['복도', R(20, 345, 1430, 520)], ['화장실', R(30, 520, 310, 840)], ['과학 준비실', R(330, 520, 475, 840)], ['중정', R(490, 520, 860, 845)], ['석고상 보관실', R(880, 520, 1430, 845)]],
  },
};

/* 문/통로 개폐 */
function gateOpen(f, g, who) {
  switch (g) {
    case 'wDoor': return true;
    case 'eDoor': return f >= 3;
    case 'doorA': return f !== 1 || who === 'm' || S.flags.bag;
    case 'doorB': return f !== 1 || who === 'm' || S.flags.brKey;
    case 'doorC': return true;
    case 'office': return who === 'm' || !S.flags.officeLock;
    case 'front': return S.flags.frontOpen;
    case 'outside': return S.flags.frontOpen;
    case 'shutter': return !S.flags.shutterOpen; // block 쪽: 닫혀 있으면 막음
  }
  if (f === 3 && g === 'doorB') return true;
  return true;
}
function gateMusic(f, who) { return !(f === 3 && who !== 'm' && !S.flags.musicKey); }

function canWalk(f, x, y, who) {
  const F = FLOORS[f]; let ok = false;
  for (const r of F.walk) {
    if (inR(r, x, y)) {
      if (r.gate && !gateOpen(f, r.gate, who)) continue;
      if (f === 3 && r.gate === 'doorB' && !gateMusic(f, who)) continue;
      ok = true; break;
    }
  }
  if (!ok) return false;
  for (const r of F.block) {
    if (inR(r, x, y)) { if (r.gate) { if (gateOpen(f, r.gate, who)) return false; continue; } return false; }
  }
  return true;
}
function canStand(f, x, y, who) {
  return canWalk(f, x, y, who) && canWalk(f, x - 7, y, who) && canWalk(f, x + 7, y, who) && canWalk(f, x, y - 4, who) && canWalk(f, x, y + 4, who);
}

/* ---------------- 경로 탐색 (괴물) ---------------- */
const CELL = 10, GW = Math.ceil(MW / CELL), GH = Math.ceil(MH / CELL);
const gridCache = {};
function grid(f) {
  const key = f + ':' + gateKey();
  if (gridCache[f] && gridCache[f].key === key) return gridCache[f].g;
  const g = new Uint8Array(GW * GH);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) g[j * GW + i] = canWalk(f, i * CELL + 5, j * CELL + 5, 'm') ? 1 : 0;
  gridCache[f] = { key, g }; return g;
}
function gateKey() { const fl = S.flags; return [fl.frontOpen, fl.shutterOpen].join(); }
function nearestOpen(g, i, j) {
  if (i >= 0 && j >= 0 && i < GW && j < GH && g[j * GW + i]) return [i, j];
  for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < GW && b < GH && g[b * GW + a]) return [a, b];
  }
  return null;
}
function findPath(f, sx, sy, tx, ty) {
  const g = grid(f);
  const s = nearestOpen(g, Math.floor(sx / CELL), Math.floor(sy / CELL));
  const t = nearestOpen(g, Math.floor(tx / CELL), Math.floor(ty / CELL));
  if (!s || !t) return null;
  const N = GW * GH, start = s[1] * GW + s[0], goal = t[1] * GW + t[0];
  const gs = new Float32Array(N).fill(1e9), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = []; const push = (n, p) => { heap.push([p, n]); let k = heap.length - 1; while (k > 0) { const q = (k - 1) >> 1; if (heap[q][0] <= heap[k][0]) break; [heap[q], heap[k]] = [heap[k], heap[q]]; k = q; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const h = n => { const x = n % GW, y = (n / GW) | 0; return Math.hypot(x - t[0], y - t[1]); };
  gs[start] = 0; push(start, h(start));
  const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  let it = 0;
  while (heap.length && it++ < 20000) {
    const [, n] = pop(); if (closed[n]) continue; closed[n] = 1;
    if (n === goal) break;
    const x = n % GW, y = (n / GW) | 0;
    for (const [dx, dy, c] of D) {
      const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= GW || b >= GH) continue;
      const m = b * GW + a; if (!g[m] || closed[m]) continue;
      if (dx && dy && (!g[y * GW + a] || !g[b * GW + x])) continue;
      const ng = gs[n] + c; if (ng < gs[m]) { gs[m] = ng; came[m] = n; push(m, ng + h(m)); }
    }
  }
  if (came[goal] < 0 && goal !== start) return null;
  const pts = []; let n = goal;
  while (n !== start && n >= 0) { pts.push([(n % GW) * CELL + 5, ((n / GW) | 0) * CELL + 5]); n = came[n]; }
  pts.reverse(); pts.push([tx, ty]);
  // 줄 당기기
  const out = []; let cx = sx, cy = sy, k = 0;
  while (k < pts.length) {
    let far = k;
    for (let q = Math.min(pts.length - 1, k + 40); q > k; q--) if (los(f, cx, cy, pts[q][0], pts[q][1], 'm')) { far = q; break; }
    out.push(pts[far]); cx = pts[far][0]; cy = pts[far][1]; k = far + 1;
  }
  return out;
}
function los(f, x1, y1, x2, y2, who) {
  if (who === 'm' || !who) {
    const g = grid(f), d = dist(x1, y1, x2, y2), n = Math.ceil(d / 5);
    for (let i = 1; i < n; i++) { const t = i / n, cx = (lerp(x1, x2, t) / CELL) | 0, cy = (lerp(y1, y2, t) / CELL) | 0; if (cx < 0 || cy < 0 || cx >= GW || cy >= GH || !g[cy * GW + cx]) return false; }
    return true;
  }
  const d = dist(x1, y1, x2, y2), n = Math.ceil(d / 6);
  for (let i = 1; i < n; i++) { const t = i / n; if (!canWalk(f, lerp(x1, x2, t), lerp(y1, y2, t), who || 'm')) return false; }
  return true;
}

/* =========================================================
   오디오 — 전부 WebAudio 합성
   ========================================================= */
const A = {
  ctx: null, master: null, noise: null,
  init() {
    if (this.ctx) return;
    const C = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = C.createGain(); this.master.gain.value = 0.9; this.master.connect(C.destination);
    const len = C.sampleRate * 2, b = C.createBuffer(1, len, C.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = b;
    this.bus = {};
    for (const k of ['orgel', 'piano', 'drone', 'hum', 'chase', 'heart', 'sfx']) { const g = C.createGain(); g.gain.value = 0; g.connect(this.master); this.bus[k] = g; }
    this.bus.sfx.gain.value = 1;
    // 앰비언트 드론
    const o = C.createOscillator(); o.type = 'sine'; o.frequency.value = 46; const og = C.createGain(); og.gain.value = .35; o.connect(og).connect(this.bus.drone); o.start();
    const n = C.createBufferSource(); n.buffer = this.noise; n.loop = true; const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; const ng = C.createGain(); ng.gain.value = .5;
    n.connect(lp).connect(ng).connect(this.bus.drone); n.start();
    // 형광등 험
    // (지지직거리지 않게: 사인 120Hz + 살짝 섞은 배음, 0.2Hz로 아주 느리게 숨쉬듯)
    const h = C.createOscillator(); h.type = 'sine'; h.frequency.value = 120; const hb = C.createOscillator(); hb.type = 'triangle'; hb.frequency.value = 240;
    const hbg = C.createGain(); hbg.gain.value = .12; const hf = C.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 600;
    const h2 = C.createOscillator(); h2.type = 'sine'; h2.frequency.value = .2; const h2g = C.createGain(); h2g.gain.value = .08;
    const hg = C.createGain(); hg.gain.value = .35; h2.connect(h2g).connect(hg.gain); h.connect(hf); hb.connect(hbg).connect(hf); hf.connect(hg).connect(this.bus.hum); h.start(); hb.start(); h2.start();
    // 추격 루프: 낮은 맥동 + 긴장 현
    const c1 = C.createOscillator(); c1.type = 'sawtooth'; c1.frequency.value = 110; const c2 = C.createOscillator(); c2.type = 'sawtooth'; c2.frequency.value = 116.5;
    const cf = C.createBiquadFilter(); cf.type = 'lowpass'; cf.frequency.value = 700; const cg = C.createGain(); cg.gain.value = .18;
    const lfo = C.createOscillator(); lfo.frequency.value = 6; const lg = C.createGain(); lg.gain.value = .12; lfo.connect(lg).connect(cg.gain);
    c1.connect(cf); c2.connect(cf); cf.connect(cg).connect(this.bus.chase); c1.start(); c2.start(); lfo.start();
    this.lastPulse = 0; this.lastHeart = 0;
  },
  t() { return this.ctx ? this.ctx.currentTime : 0; },
  setBus(k, v, tc) { if (!this.ctx) return; this.bus[k].gain.setTargetAtTime(v, this.t(), tc || .3); },
  env(node, t, a, peak, dec) { node.gain.setValueAtTime(0, t); node.gain.linearRampToValueAtTime(peak, t + a); node.gain.exponentialRampToValueAtTime(.0001, t + a + dec); },
  pan(v) { const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : this.ctx.createGain(); if (p.pan) p.pan.value = clamp(v, -1, 1); return p; },
  noiseHit(vol, f1, f2, dur, pan, type, when) {
    if (!this.ctx) return; const C = this.ctx, t = when || this.t();
    const s = C.createBufferSource(); s.buffer = this.noise; const fl = C.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.setValueAtTime(f1, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = C.createGain(); this.env(g, t, .004, vol, dur); s.connect(fl).connect(g).connect(this.pan(pan || 0)).connect(this.bus.sfx); s.start(t, Math.random()); s.stop(t + dur + .1);
  },
  tone(freq, type, vol, a, dec, pan, bus, when, f2) {
    if (!this.ctx) return; const C = this.ctx, t = when || this.t();
    const o = C.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + dec);
    const g = C.createGain(); this.env(g, t, a, vol, dec); o.connect(g).connect(this.pan(pan || 0)).connect(bus || this.bus.sfx); o.start(t); o.stop(t + a + dec + .05);
  },
  mbox(midi, when, bus, vol) { const f = 440 * Math.pow(2, (midi - 69) / 12); this.tone(f, 'sine', .22 * vol, .003, 1.6, 0, bus, when); this.tone(f * 3.01, 'sine', .05 * vol, .002, .5, 0, bus, when); this.tone(f * 5.4, 'sine', .02 * vol, .001, .18, 0, bus, when); },
  pianoN(midi, when, bus, vol) { const f = 440 * Math.pow(2, (midi - 69) / 12); this.tone(f, 'triangle', .3 * vol, .004, 2.2, 0, bus, when); this.tone(f * 2, 'sine', .08 * vol, .003, 1.1, 0, bus, when); this.tone(f * .5, 'sine', .05 * vol, .01, 1.5, 0, bus, when); },
  // 효과음
  step(vol, pan) { this.noiseHit(vol * .5, 380, 160, .07, pan, 'lowpass'); },
  click(vol, pan) { this.noiseHit(vol * .9, 3200, 1800, .035, pan, 'bandpass'); this.tone(1800, 'square', vol * .04, .001, .02, pan); },
  rattle() { for (let i = 0; i < 4; i++) { const w = this.t() + i * .09 + rnd(0, .02); this.noiseHit(.5, 2400, 900, .06, 0, 'bandpass', w); this.tone(320, 'square', .05, .001, .04, 0, null, w); } },
  knock() { for (let i = 0; i < 3; i++) this.noiseHit(.9, 300, 120, .1, 0, 'lowpass', this.t() + i * .22); },
  creak() { this.tone(180, 'sawtooth', .07, .3, .9, 0, null, null, 120); this.noiseHit(.15, 900, 400, 1.1, 0, 'bandpass'); },
  clack() { this.noiseHit(1, 200, 60, .2, 0, 'lowpass'); this.click(.7, 0); },
  unlock() { this.click(.8, 0); setTimeout(() => this.click(.6, 0), 120); this.noiseHit(.4, 1500, 800, .12); },
  paper() { this.noiseHit(.25, 4000, 2000, .25, 0, 'highpass'); },
  thud() { this.noiseHit(1, 160, 50, .3, 0, 'lowpass'); },
  shutter() { for (let i = 0; i < 14; i++) this.noiseHit(.35, 600, 300, .12, 0, 'bandpass', this.t() + i * .08); this.noiseHit(.6, 120, 60, 1.4, 0, 'lowpass'); },
  vibrate() { for (let i = 0; i < 2; i++) this.tone(150, 'square', .06, .01, .35, 0, null, this.t() + i * .5); },
  dial() { this.tone(425, 'sine', .12, .02, 1.6); },
  beep(f) { this.tone(f || 950, 'sine', .1, .005, .12); },
  stinger() { [61, 62, 67, 68].forEach(m => this.tone(440 * Math.pow(2, (m - 69) / 12), 'sawtooth', .07, .05, 1.8)); this.noiseHit(.6, 300, 3000, 1.2, 0, 'bandpass'); },
  ring() { this.tone(3400, 'sine', .05, .25, 2.2); this.tone(3420, 'sine', .03, .3, 2.2); this.noiseHit(.08, 6000, 4000, 1.5, 0, 'highpass'); },
  scream() { [70, 71, 77, 82].forEach(m => this.tone(440 * Math.pow(2, (m - 69) / 12), 'sawtooth', .14, .01, .7)); this.noiseHit(1.2, 1200, 4000, .6, 0, 'bandpass'); },
  giggle(vol, pan) {
    const v = vol == null ? .5 : vol;
    for (let i = 0; i < 5; i++) { const w = this.t() + i * .13; this.tone(820 + i * 20, 'triangle', .09 * v, .01, .09, pan, null, w, 980); this.noiseHit(.08 * v, 2600, 1800, .08, pan, 'bandpass', w); }
  },
  breath(vol, pan) { this.noiseHit(.25 * vol, 700, 500, 1.1, pan, 'bandpass'); },
  gasp() { this.noiseHit(.8, 1200, 600, .5, 0, 'bandpass'); },
  heart() { this.tone(62, 'sine', .7, .005, .16, 0, this.bus.heart, null, 40); this.tone(58, 'sine', .45, .005, .14, 0, this.bus.heart, this.t() + .18, 38); },
  dissonance() { this.pianoN(61, null, this.bus.sfx, .7); this.pianoN(62, null, this.bus.sfx, .7); },
};

/* 오르골·피아노 루프 */
const MELODY = [88, 84, 81, 83, 84, 76, 77, 81, 84, 83, 80, 76, 81, 84, 88, 86, 84, 83, 81, 76, 81];
const PIANO_SEQ = ['ArrowUp', 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];   // E6 C6 A5 B5 C6
const KEY_NOTE = { ArrowUp: 88, ArrowRight: 84, ArrowLeft: 81, ArrowDown: 83 };
class Looper {
  constructor(bus, kind) { this.bus = bus; this.kind = kind; this.on = false; this.i = 0; this.next = 0; this.beat = .42; }
  start() { if (!A.ctx) return; if (!this.on) { this.on = true; this.next = A.t() + .1; } }
  stop() { this.on = false; }
  tick() {
    if (!this.on || !A.ctx) return;
    while (this.next < A.t() + .15) {
      const m = MELODY[this.i % MELODY.length];
      if (this.kind === 'piano') A.pianoN(m - 12, this.next, A.bus[this.bus], .9); else A.mbox(m, this.next, A.bus[this.bus], 1);
      const end = (this.i % MELODY.length) === MELODY.length - 1;
      this.next += this.beat * (end ? 3 : (this.i % 3 === 2 ? 1.5 : 1)); this.i++;
    }
  }
}
const ORGEL = new Looper('orgel', 'mbox');
const PIANO = new Looper('piano', 'piano');

/* =========================================================
   상태
   ========================================================= */
const S = {
  mode: 'boot', floor: 1, flags: {}, items: [], memos: [], time: '22:48', battery: 23, signal: 0,
  torch: true, lock: true, busy: false, paused: false, t: 0, cp: null, char: 'char_02',
  lights: [], timers: [], footprints: [], visited: {}, shake: 0, flash: 0, chaseLevel: 0,
};
const P = { x: 330, y: 236, dir: 'down', vx: 0, vy: 0, moving: false, run: false, stam: 1, hidden: null, ang: Math.PI / 2, bob: 0, still: 0, holding: false, breath: 1 };
const M = { on: false, floor: 1, x: 0, y: 0, dir: 'down', state: 'off', path: null, pathT: 0, speed: 50, cfg: { react: 1, open: .3, vision: 210 },
  stateT: 0, last: null, searchQ: [], seenT: 0, lostT: 0, stepT: 0, mv: 0, offT: 0, target: null, checking: null, bob: 0, onArrive: null, leaveCb: null, forceSafe: false, scriptV: 0, stairQ: null };

/* =========================================================
   입력
   ========================================================= */
const K = {};
let ePressed = false, eHeld = false, advanceWaiters = [];
const IS_TOUCH = matchMedia('(pointer:coarse)').matches;
window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(e.key)) e.preventDefault();
  if (S.mode === 'select') return selectKey(e);
  if (S.mode === 'boot') { bootPress(); return; }
  if (S.mode === 'title') { const b = $('bStart'); if (e.key === 'Enter' && b) b.click(); return; }
  if (bagOpen && !['m', 'M', 'Escape', '1', '2', '3', '4'].includes(e.key)) return;
  if (bagOpen && ['1', '2', '3', '4'].includes(e.key)) { bagFloor(+e.key); return; }
  if (e.repeat) { if (e.key === 'e' || e.key === 'E' || e.key === ' ') eHeld = true; return; }
  K[e.key.toLowerCase()] = true;
  if (miniActive) return miniKey(e.key);
  if (S.mode === 'runner' && !S.paused && [' ', 'w', 'W', 'ArrowUp', 'e', 'E'].includes(e.key)) { runJump(); return; }
  if (e.key === 'Escape') { if (bagOpen) { toggleBag(); return; } togglePause(); return; }
  if (S.paused) return;
  if (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') { ePressed = true; eHeld = true; pressAdvance(); }
  if ((e.key === 'f' || e.key === 'F') && S.mode === 'play') toggleTorch();
  if ((e.key === 'm' || e.key === 'M') && S.mode === 'play') toggleBag();
  if (e.key === 'Tab' && S.mode === 'play') toggleMemo();
});
window.addEventListener('keyup', e => { K[e.key.toLowerCase()] = false; if (e.key === 'e' || e.key === 'E' || e.key === ' ') eHeld = false; });
window.addEventListener('blur', () => { for (const k in K) K[k] = false; eHeld = false; });
function pressAdvance() {
  if (!$('memo').classList.contains('hidden')) { toggleMemo(); return; }
  if (advanceWaiters.length) { const w = advanceWaiters.shift(); w(); ePressed = false; }
}
$('note').addEventListener('click', () => pressAdvance());
$('say').addEventListener('click', () => pressAdvance());
$('memo').addEventListener('click', () => toggleMemo());
$('phone').addEventListener('click', () => toggleMemo());
$('prompt').addEventListener('click', () => { ePressed = true; eHeld = true; setTimeout(() => eHeld = false, 400); pressAdvance(); });
$('menuBtn').addEventListener('click', togglePause);
document.addEventListener('pointerdown', e => { if (S.mode === 'play' && e.target.id === 'c') pressAdvance(); if (S.mode === 'runner' && e.target.id === 'c') runJump(); });

/* 터치 */
const T = { x: 0, y: 0, active: false, run: false };
if (IS_TOUCH) {
  const st = $('stick'), knob = st.querySelector('i');
  const mv = e => { const r = st.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2); const l = Math.hypot(dx, dy), m = 46; if (l > m) { dx *= m / l; dy *= m / l; } T.x = dx / m; T.y = dy / m; T.active = true; knob.style.transform = `translate(${dx}px,${dy}px)`; };
  st.addEventListener('pointerdown', e => { st.setPointerCapture(e.pointerId); mv(e); });
  st.addEventListener('pointermove', e => { if (T.active) mv(e); });
  const end = () => { T.active = false; T.x = T.y = 0; knob.style.transform = ''; };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  $('tE').addEventListener('pointerdown', () => { if (S.mode === 'runner') return runJump(); ePressed = true; eHeld = true; pressAdvance(); });
  $('tE').addEventListener('pointerup', () => { eHeld = false; });
  $('tRun').addEventListener('pointerdown', () => { T.run = !T.run; $('tRun').style.background = T.run ? '#2b3a80' : ''; });
  $('tF').addEventListener('pointerdown', () => toggleTorch());
}

/* =========================================================
   UI 헬퍼
   ========================================================= */
let sayTimer = null;
function showSay(text, narr) {
  const el = $('say'); el.classList.remove('hidden'); el.classList.toggle('narr', !!narr);
  el.innerHTML = text;
}
function hideSay() { $('say').classList.add('hidden'); }
function waitAdvance() { return new Promise(res => advanceWaiters.push(res)); }
/* 대사: 기본은 E/클릭으로 넘김. auto: ms 후 자동 */
async function say(text, opt) {
  opt = opt || {};
  if (opt.auto) { showSay(text, opt.narr); await wait(opt.auto); hideSay(); return; }
  showSay(text + '<span class="more">▼ E</span>', opt.narr);
  await Promise.race([waitAdvance(), wait(opt.max || 60000)]);
  hideSay(); await wait(80);
}
function bark(text, ms) { showSay(text); clearTimeout(bark.t); bark.t = setTimeout(() => { if (!S.busy) hideSay(); }, ms || 1800); }
const narr = (t, o) => say(t, Object.assign({ narr: true }, o || {}));
async function note(html, cls) {
  A.paper();
  const p = $('noteP'); p.className = 'paper ' + (cls || ''); p.innerHTML = html;
  $('note').classList.remove('hidden');
  await wait(250); await waitAdvance();
  $('note').classList.add('hidden'); await wait(120);
}
function hint(html, ms) {
  const h = $('hint'); h.innerHTML = html; h.classList.remove('hidden'); h.style.opacity = 1;
  clearTimeout(hint.t); hint.t = setTimeout(() => { h.style.opacity = 0; setTimeout(() => h.classList.add('hidden'), 600); }, ms || 5000);
}
function memo(text) { if (S.memos.some(m => m.t === text)) return; S.memos.push({ t: text, time: S.time }); $('phone').classList.remove('buzz'); void $('phone').offsetWidth; $('phone').classList.add('buzz'); A.vibrate(); }
function toggleMemo() {
  const m = $('memo');
  if (m.classList.contains('hidden')) {
    if (S.busy && !S.flags.allowMemo) { /* 이벤트 중에도 열람 허용 */ }
    $('memoT').textContent = S.time;
    $('memoL').innerHTML = S.memos.length ? S.memos.map(x => `<li><small>${x.time}</small>${x.t}</li>`).join('') : '<li style="color:#7d86ab">아직 적어 둔 게 없다.</li>';
    m.classList.remove('hidden');
  } else m.classList.add('hidden');
}
function addItem(id, name) { if (!S.items.some(i => i.id === id)) S.items.push({ id, name }); renderItems(); A.unlock(); }
function hasItem(id) { return S.items.some(i => i.id === id); }
function renderItems() { $('items').innerHTML = S.items.map(i => `<span class="chip">${i.name}</span>`).join(''); }
function setTime(t) {   // 시계는 앞으로만 간다 (사건 순서가 바뀌어도 거꾸로 돌지 않게)
  const v = x => { const [h, m] = x.split(':').map(Number); return (h < 12 ? h + 24 : h) * 60 + m; };
  if (!S.time || v(t) >= v(S.time)) S.time = t;
}
function fadeTo(v, ms) { const f = $('fade'); f.style.transition = `opacity ${ms || 600}ms`; f.style.opacity = v; return wait(ms || 600); }
function toggleTorch() { if (S.battery <= 0) { S.torch = false; return; } S.torch = !S.torch; A.click(.4, 0); }
function updatePhone() {
  $('pTime').textContent = S.time;
  $('pBatT').textContent = Math.ceil(S.battery) + '%';
  $('pBatE').style.width = clamp(S.battery, 0, 100) * .18 + 'px';
  $('pBat').classList.toggle('low', S.battery < 15);
  const bars = $('pBars').children; for (let i = 0; i < 4; i++) bars[i].classList.toggle('on', i < S.signal);
  $('pSig').textContent = S.signal ? (S.signal >= 4 ? 'LTE' : '신호 약함') : '서비스 없음';
  $('pTorch').classList.toggle('on', S.torch);
  $('pStam').style.width = (P.stam * 100) + '%';
}
/* =========================================================
   가방 지도 — 가 본 공간만 보인다
   ========================================================= */
let bagOpen = false, bagF = 1;
S.seen = {};             // 'f:방이름' → true
S.floorsSeen = { 1: true };
function markSeen() {
  if (P.hidden) return;
  const n = roomName(S.floor, P.x, P.y); if (!n) return;
  const k = S.floor + ':' + n;
  if (!S.seen[k]) {
    S.seen[k] = true;
    if (Object.keys(S.seen).length > 1) { const b = $('bagBtn'); b.classList.remove('new'); void b.offsetWidth; b.classList.add('new'); }
  }
  S.floorsSeen[S.floor] = true;
}
function toggleBag() {
  if (S.mode !== 'play' || dying) return;
  if (!bagOpen && (S.paused || miniActive)) return;
  bagOpen = !bagOpen; $('bag').classList.toggle('hidden', !bagOpen);
  S.paused = bagOpen; A.paper();
  if (bagOpen) { bagF = S.floor; drawBag(); }
}
let bagView = 'map';
function setBagView(v) {
  bagView = v;
  document.querySelectorAll('#bagViews button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  $('bvMap').classList.toggle('hidden', v !== 'map'); $('bvMemo').classList.toggle('hidden', v !== 'memo'); $('bvItems').classList.toggle('hidden', v !== 'items');
  A.paper(); drawBag();
}
document.querySelectorAll('#bagViews button').forEach(b => b.addEventListener('click', () => setBagView(b.dataset.v)));
function bagFloor(f) { if (S.floorsSeen[f]) { bagF = f; drawBag(); } }
function drawBag() {
  $('bagTabs').innerHTML = [1, 2, 3, 4].map(f => `<button data-f="${f}" class="${f === bagF ? 'on' : ''}" ${S.floorsSeen[f] ? '' : 'disabled'}>${S.floorsSeen[f] ? f + '층' : '?'}</button>`).join('');
  $('bagTabs').querySelectorAll('button').forEach(b => b.onclick = () => bagFloor(+b.dataset.f));
  const bat = Math.ceil(S.battery);
  $('bagItems').innerHTML = `<div class="slot"><img src="img/ui/c_phone_nosignal.webp" alt=""><div>휴대폰<small>${S.time} · 신호 ${S.signal ? S.signal + '칸' : '없음'}</small></div></div>`
    + `<div class="slot"><img src="img/ui/${bat > 60 ? 'c_battery_full' : bat > 30 ? 'c_battery_half' : bat > 8 ? 'c_battery_low' : 'c_battery_empty'}.webp" alt=""><div>배터리 ${bat}%<small>${S.flags.batteryOn ? '손전등을 켜면 닳는다' : '아직 넉넉하다'}</small></div></div>`
    + `<div class="slot"><img src="img/ui/p_flashlight.webp" alt=""><div>손전등<small>F · ${S.torch ? '켜짐' : '꺼짐'}</small></div></div>`
    + S.items.map(i => `<div class="slot"><img src="img/ui/p_key_heart.webp" alt=""><div>${i.name}<small>열쇠</small></div></div>`).join('');
  $('bagMemo').innerHTML = S.memos.length ? S.memos.map(x => `<li><small>${x.time}</small>${x.t}</li>`).join('') : '<li style="color:#7d86ab">아직 적어 둔 게 없다.</li>';
  const c = $('bagMap'), g = c.getContext('2d'), map = IMG['map' + bagF];
  g.fillStyle = '#07060d'; g.fillRect(0, 0, MW, MH);
  g.strokeStyle = 'rgba(160,140,220,.06)'; g.lineWidth = 1;
  for (let x = 0; x < MW; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, MH); g.stroke(); }
  for (let y = 0; y < MH; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(MW, y); g.stroke(); }
  const rooms = FLOORS[bagF].rooms;
  for (const [n, r] of rooms) {
    if (!S.seen[bagF + ':' + n]) continue;
    g.save(); g.beginPath(); g.rect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1); g.clip();
    if (map) { g.filter = 'saturate(.55) brightness(.8)'; g.drawImage(map, 0, 0, MW, MH); g.filter = 'none'; }
    g.fillStyle = 'rgba(40,30,90,.18)'; g.fillRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1);
    g.restore();
  }
  g.font = '700 22px Pretendard'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [n, r] of rooms) {
    if (!S.seen[bagF + ':' + n] || n === '복도') continue;
    const x = (r.x1 + r.x2) / 2, y = (r.y1 + r.y2) / 2;
    g.fillStyle = 'rgba(0,0,0,.55)'; const w = g.measureText(n).width + 18; g.fillRect(x - w / 2, y - 16, w, 32);
    g.fillStyle = '#f0eaff'; g.fillText(n, x, y);
  }
  if (bagF === S.floor) {
    g.fillStyle = '#ff7ac8'; g.strokeStyle = '#fff'; g.lineWidth = 4;
    g.beginPath(); g.arc(P.x, P.y - 10, 14, 0, 7); g.fill(); g.stroke();
    g.font = '700 18px Pretendard'; g.fillStyle = '#ffd6ef'; g.fillText('나', P.x, P.y - 40);
  }
}
$('bagBtn').addEventListener('click', toggleBag);
const CTRL_HTML = [['c_key_wasd', '이동'], ['c_key_e', '조사·숨기'], ['c_key_shift', '달리기'], ['p_flashlight', 'F 손전등'], ['p_bag', 'M 가방'], ['c_key_tab', '메모']]
  .map(([i, t]) => `<span class="c"><img src="img/ui/${i}.webp" alt="">${t}</span>`).join('');
$('titleCtrls').innerHTML = CTRL_HTML; $('pauseCtrls').innerHTML = CTRL_HTML;
$('bag').addEventListener('click', e => { if (e.target.id === 'bag') toggleBag(); });

/* 주인공의 '생각' = 다음 행동 힌트 (명령이 아니라 혼잣말 톤) */
function currentGoal() {
  const f = S.flags, fl_ = S.floor;
  if (f.finale) return '1층 현관까지 달려…!';
  if (!f.bag) return '일단 가방부터 챙기자.';
  if (!f.front) return '집에 가자. 1층 현관으로.';
  if (!f.guard) return '경비실에 누가 있겠지.';
  if (!f.officeDoc) return '학교 열쇠면…… 교무실(1층 동쪽)에 있지 않을까?';
  if (!f.hide1) return '숨어야 해.';
  if (!f.brKey) return '열쇠류는 1층 창고(로비 왼쪽)로 옮겼다고 했지.';
  if (!f.power) return f.bcVisit ? '복도 동쪽 끝, 배전반을 올려 보자.' : '방송실(1층 가운데) 전화로 신고할 수 있을지도.';
  if (!f.chase1Done) return '숨을 곳…… 사물함, 화장실 칸!';
  if (!f.bc2) return '전원이 들어왔으니 방송실에 다시 가 보자.';
  if (fl_ === 1 && !f.f2) return hasItem('stairKey1') ? '2층 도서관 창가…… 서쪽 계단 철문을 열자.' : '계단 철문 열쇠…… 방송실 책상 서랍.';
  if (!f.signalTry) return '도서관 창가에서 신호가 잡힌다고 했어.';
  if (!f.archive) return f.book3 ? '행정 기록이라면…… 2층 가운데 자료실?' : '도서관을 좀 더 둘러볼까.';
  if (!hasItem('ironKey')) return '계단 철문 열쇠는 2층 청소도구실 열쇠함.';
  if (!f.f3) return '서쪽 계단 철문을 열고 3층으로.';
  if (!f.musicKey) return '음악실 열쇠는 미술 준비실에 있다고 했지.';
  if (!f.notebook) return '음악실을 조사해 보자.';
  if (!f.pianoDone) return '악보대로 피아노를 쳐 볼까……';
  if (!f.shutterOpen) return '3층 복도 동쪽, 방화셔터를 열자.';
  if (!f.f4) return '동쪽 계단으로 4층에.';
  if (!f.pc5) return '불이 켜진 컴퓨터가 있었던 것 같은데.';
  return '옥상…… 동쪽 계단 위.';
}
let goalLast = '', goalIdle = 0;
function updateGoal(dt) {
  const g = currentGoal(), el = $('goal');
  if (g !== goalLast) { goalLast = g; $('goalT').textContent = g; el.classList.remove('new'); void el.offsetWidth; el.classList.add('new'); goalIdle = 0; }
  // 오래 진행이 없으면 생각을 혼잣말로 한 번 더
  if (!S.busy && !S.lock && !P.hidden && !(M.on && M.floor === S.floor && dist(M.x, M.y, P.x, P.y) < 300)) goalIdle += dt; else goalIdle = 0;
  if (goalIdle > 35) { goalIdle = 0; bark(g, 3200); }
}
function roomName(f, x, y) { for (const [n, r] of FLOORS[f].rooms) if (inR(r, x, y)) return n; return ''; }

/* 게임 시간 기반 타이머 (일시정지 중 멈춤) */
function wait(ms) { return new Promise(res => S.timers.push({ t: S.t + ms / 1000, res })); }
function waitUntil(fn, timeout) {
  return new Promise(res => { const t0 = S.t; const iv = { check: () => fn() || (timeout && S.t - t0 > timeout / 1000), res }; S.timers.push(iv); });
}
function tickTimers() {
  const rest = [];
  for (const t of S.timers) {
    if (t.check) { if (t.check()) t.res(); else rest.push(t); }
    else if (S.t >= t.t) t.res(); else rest.push(t);
  }
  S.timers = rest;
}

/* 스크립트 실행기 */
async function run(fn, keepControl) {
  if (S.busy) return; S.busy = true; if (!keepControl) S.lock = true;
  try { await fn(); } catch (e) { if (e !== 'abort') console.error(e); }
  S.busy = false; S.lock = false;
}

/* =========================================================
   조명
   ========================================================= */
const CORR_X = [105, 255, 405, 555, 705, 855, 1005, 1155, 1305];
function setLights(list) { S.lights = list; }
/* 깜빡임: 평소엔 켜져 있다가, 가끔(초당 rate번 꼴) 0.3~0.5초짜리 '깜-빡-깜빡'을 한 번 */
const BLINK_PAT = [[0, 1, .15, 1], [.2, 1, 0, .7, 1], [0, .5, 1]];
function blink(o, rate) {
  if (o.bk) { if (S.t >= o.bk.t0 && S.t < o.bk.end) { const v = o.bk.p[Math.max(0, Math.min(o.bk.p.length - 1, Math.floor((S.t - o.bk.t0) / .075)))]; return v == null ? 1 : v; } o.bk = null; }
  if (Math.random() < rate / 60) { const p = BLINK_PAT[(Math.random() * BLINK_PAT.length) | 0]; o.bk = { t0: S.t, end: S.t + p.length * .075, p }; }
  return 1;
}
function corridorLights(on, flick) { return CORR_X.map(x => ({ x, y: 452, r: 125, on, flick: flick || 0, a: 1 })); }
function floorLights(f) {
  const fl = S.flags;
  if (f === 1) {
    const L = corridorLights(!!fl.power, 0);
    if (fl.officeLit) L.push({ x: 1220, y: 640, r: 120, on: true, flick: .02 }, { x: 1360, y: 640, r: 110, on: true, flick: 0 });
    if (fl.power) L.push({ x: 720, y: 240, r: 120, on: true, flick: .03 }, { x: 1000, y: 650, r: 110, on: true, flick: .01 });
    if (fl.finale) L.forEach(l => l.flick = .25);
    return L;
  }
  if (f === 2) {
    const L = CORR_X.map(x => ({ x, y: 452, r: 120, on: !fl.f2dark && x < 720, flick: .04, a: 1 }));
    L.push({ x: 400, y: 700, r: 140, on: !fl.f2dark, flick: .12 });
    if (fl.finale) L.forEach(l => { l.on = true; l.flick = .25; });
    return L;
  }
  if (f === 3) { const L = corridorLights(true, .12); L.push({ x: 720, y: 220, r: 120, on: !!fl.pianoDone, flick: .1 }); return L; }
  if (f === 4) { const L = corridorLights(true, .38); L.push({ x: 1050, y: 230, r: 110, on: true, flick: .3 }, { x: 690, y: 720, r: 130, on: true, flick: .2 }); return L; }
  return [];
}

/* =========================================================
   상호작용 오브젝트 / 숨는 곳
   ========================================================= */
const HIDES = [
  // 1층
  { f: 1, x: 300, y: 118, kind: 'locker', s: .75, n: '사물함' }, { f: 1, x: 1180, y: 118, kind: 'locker', s: .75, n: '사물함' },
  { f: 1, x: 72, y: 768, kind: 'stall', s: .8, n: '화장실 칸' }, { f: 1, x: 124, y: 768, kind: 'stall', s: .8, n: '화장실 칸' }, { f: 1, x: 176, y: 768, kind: 'stall', s: .8, n: '화장실 칸' }, { f: 1, x: 228, y: 768, kind: 'stall', s: .8, n: '화장실 칸' },
  { f: 1, x: 362, y: 805, kind: 'closet', s: .7, n: '청소도구함' }, { f: 1, x: 978, y: 712, kind: 'curtain', s: .45, n: '침대 커튼 뒤' },
  { f: 1, x: 1162, y: 650, kind: 'locker', s: .8, n: '교사용 캐비닛', office: 1 }, { f: 1, x: 1250, y: 808, kind: 'desk', s: .4, n: '책상 밑', office: 1 }, { f: 1, x: 1356, y: 752, kind: 'curtain', s: .55, n: '소파 뒤', office: 1 },
  // 2층
  { f: 2, x: 300, y: 118, kind: 'locker', s: .75, n: '사물함' }, { f: 2, x: 1180, y: 118, kind: 'locker', s: .75, n: '사물함' },
  { f: 2, x: 815, y: 795, kind: 'stall', s: .8, n: '화장실 칸' }, { f: 2, x: 875, y: 795, kind: 'stall', s: .8, n: '화장실 칸' },
  { f: 2, x: 966, y: 812, kind: 'closet', s: .7, n: '청소도구함' }, { f: 2, x: 1336, y: 625, kind: 'locker', s: .7, n: '사물함' }, { f: 2, x: 126, y: 765, kind: 'desk', s: .4, n: '사서 책상 밑' },
  { f: 2, x: 228, y: 802, kind: 'shelf', s: .9, n: '책장 뒤', req: 'book3' }, { f: 2, x: 338, y: 802, kind: 'shelf', s: .9, n: '책장 뒤', req: 'book3' },
  { f: 2, x: 443, y: 802, kind: 'shelf', s: .9, n: '책장 뒤', req: 'book3' }, { f: 2, x: 533, y: 802, kind: 'shelf', s: .9, n: '책장 뒤', req: 'book3' },
  // 3층
  { f: 3, x: 300, y: 118, kind: 'locker', s: .75, n: '사물함' }, { f: 3, x: 1180, y: 118, kind: 'locker', s: .75, n: '사물함' },
  { f: 3, x: 72, y: 768, kind: 'stall', s: .8, n: '화장실 칸' }, { f: 3, x: 124, y: 768, kind: 'stall', s: .8, n: '화장실 칸' }, { f: 3, x: 176, y: 768, kind: 'stall', s: .8, n: '화장실 칸' }, { f: 3, x: 228, y: 768, kind: 'stall', s: .8, n: '화장실 칸' },
  { f: 3, x: 536, y: 805, kind: 'closet', s: .7, n: '준비실 캐비닛' }, { f: 3, x: 1190, y: 790, kind: 'desk', s: .4, n: '작업대 밑' },
  // 4층
  { f: 4, x: 300, y: 118, kind: 'locker', s: .75, n: '사물함' }, { f: 4, x: 72, y: 768, kind: 'stall', s: .8, n: '화장실 칸' }, { f: 4, x: 176, y: 768, kind: 'stall', s: .8, n: '화장실 칸' },
  { f: 4, x: 362, y: 805, kind: 'closet', s: .7, n: '청소도구함' }, { f: 4, x: 1050, y: 318, kind: 'desk', s: .4, n: '컴퓨터 책상 밑' },
];

const I = []; // 상호작용
const add = o => I.push(Object.assign({ r: 42 }, o));

/* =========================================================
   괴물
   ========================================================= */
const PATROL = {
  1: [[150, 460], [400, 460], [700, 460], [1000, 460], [1300, 460], [390, 230], [1060, 230], [170, 720], [400, 700], [1000, 740], [1280, 700]],
  2: [[150, 460], [450, 460], [750, 460], [1050, 460], [1300, 460], [390, 230], [1060, 230], [720, 290], [400, 810], [650, 700], [130, 800], [870, 620], [1250, 700]],
  3: [[150, 460], [450, 460], [750, 460], [1050, 460], [1200, 460], [390, 230], [1060, 230], [170, 720], [370, 700], [536, 700], [860, 600], [1180, 610]],
  4: [[150, 460], [700, 460], [1300, 460]],
};
function mSpawn(f, x, y, state) {
  Object.assign(M, { on: true, floor: f, x, y, state: state || 'patrol', path: null, stateT: 0, searchQ: [], lostT: 0, target: null, checking: null, offT: 0, seenT: 0, speed: 50, pause: 1, alpha: null, forceSafe: M.forceSafe });
}
function mOff() { M.on = false; M.state = 'off'; M.checking = null; }
function setState(st, extra) { M.state = st; M.stateT = 0; M.path = null; Object.assign(M, extra || {}); }
function mSetTarget(x, y) { M.target = [x, y]; M.path = findPath(M.floor, M.x, M.y, x, y); M.pathT = 0; }
function mStep(dt, spd) {
  if (!M.path || !M.path.length) return true;
  const [tx, ty] = M.path[0]; const d = dist(M.x, M.y, tx, ty);
  const s = spd * dt;
  if (d <= s) { M.x = tx; M.y = ty; M.path.shift(); M.mv += d; return !M.path.length; }
  const dx = (tx - M.x) / d, dy = (ty - M.y) / d; M.x += dx * s; M.y += dy * s; M.mv += s;
  M.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  return false;
}
/* 스크립트용 직선/경로 이동 */
function mWalk(x, y, spd, direct) {
  return new Promise(res => {
    M.state = 'script'; M.path = direct ? [[x, y]] : (findPath(M.floor, M.x, M.y, x, y) || [[x, y]]); M.speed = spd || 50; M.onArrive = res;
  });
}
function mSeesPlayer() {
  if (!M.on || M.floor !== S.floor || P.hidden) return false;
  const d = dist(M.x, M.y, P.x, P.y);
  let range = M.cfg.vision + (S.torch ? 80 : 0) + (litAt(P.x, P.y) > .5 ? 60 : 0);
  if (d > range) return false;
  if (d > 70) {
    const fa = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[M.dir];
    let da = Math.atan2(P.y - M.y, P.x - M.x) - fa; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > 1.25) return false;
  }
  return los(S.floor, M.x, M.y - 10, P.x, P.y - 10, 'm');
}
function litAt(x, y) { let v = 0; for (const l of S.lights) if (l.on && l.a > .5) v = Math.max(v, 1 - dist(x, y, l.x, l.y) / l.r); return v; }
function hear(x, y, r) {
  if (!M.on || M.floor !== S.floor) return;
  if (['patrol', 'suspicious', 'search'].includes(M.state) && dist(M.x, M.y, x, y) < r) { setState('suspicious'); mSetTarget(x, y); }
}
function noise(r) { hear(P.x, P.y, r); S.noiseRing = { x: P.x, y: P.y, r, t: 0 }; }

function mUpdate(dt) {
  if (!M.on || S.transit) return;
  M.stateT += dt;
  const same = M.floor === S.floor;
  let spd = 0;
  const sees = same && M.state !== 'script' && M.state !== 'watch' && mSeesPlayer();
  if (sees) { M.last = [P.x, P.y]; M.lostT = 0; }
  switch (M.state) {
    case 'script': {
      spd = M.speed; if (mStep(dt, spd)) { M.state = 'idle'; const cb = M.onArrive; M.onArrive = null; cb && cb(); }
      break;
    }
    case 'idle': case 'watch': break;
    case 'patrol': {
      if (sees) { setState('alert'); A.giggle(.35, panOf(M.x)); break; }
      spd = 48;
      if (!M.path || !M.path.length) {
        if (M.stateT > M.pause) {
          const pts = PATROL[M.floor]; const p = pts[(Math.random() * pts.length) | 0];
          mSetTarget(p[0] + rnd(-20, 20), p[1] + rnd(-10, 10)); M.pause = rnd(1, 3.2); M.stateT = 0;
        }
      } else if (mStep(dt, spd)) { M.stateT = 0; M.dir = ['left', 'right', 'up', 'down'][(Math.random() * 4) | 0]; }
      // 화면 밖 순간이동
      if (!onScreen(M.x, M.y, 40)) M.offT += dt; else M.offT = 0;
      if (M.offT > 5 && Math.random() < .004) {
        const cands = PATROL[M.floor].filter(p => dist(p[0], p[1], P.x, P.y) > 380 && !onScreen(p[0], p[1], 60));
        if (cands.length) { const c = cands[(Math.random() * cands.length) | 0]; M.x = c[0]; M.y = c[1]; M.path = null; M.offT = 0; }
      }
      break;
    }
    case 'alert': {
      M.dir = faceTo(M.x, M.y, P.x, P.y);
      if (!sees && M.stateT > .3) { setState('suspicious'); mSetTarget(M.last[0], M.last[1]); break; }
      if (M.stateT > M.cfg.react) { setState('chase'); A.stinger(); S.shake = 8; M.chaseT = 0; }
      break;
    }
    case 'suspicious': {
      if (sees) { setState('alert'); break; }
      spd = 62;
      if (!M.path || !M.path.length || mStep(dt, spd)) {
        if (!M.path || !M.path.length) { if (M.stateT > 3) { setState('patrol'); M.pause = 1; } else if (Math.random() < .02) M.dir = ['left', 'right', 'up', 'down'][(Math.random() * 4) | 0]; }
      }
      break;
    }
    case 'chase': {
      M.chaseT += dt;
      spd = M.chaseT < 1 ? 60 : 150;
      if (P.hidden) {
        const seenHide = M.last && dist(M.last[0], M.last[1], P.hidden.x, P.hidden.y) < 30 && M.lostT < .2 && dist(M.x, M.y, P.x, P.y) < 160;
        startSearch(seenHide ? P.hidden : null); break;
      }
      if (!sees) { M.lostT += dt; if (M.lostT > 2.5) { startSearch(null); break; } }
      M.pathT -= dt;
      const tx = sees ? P.x : M.last[0], ty = sees ? P.y : M.last[1];
      if (M.pathT <= 0 || !M.path || !M.path.length) { M.path = sees && los(M.floor, M.x, M.y, P.x, P.y, 'm') ? [[P.x, P.y]] : findPath(M.floor, M.x, M.y, tx, ty); M.pathT = .35; }
      mStep(dt, spd);
      if (same && touching()) caught();
      break;
    }
    case 'search': {
      spd = 70;
      if (sees) { setState('chase'); M.chaseT = .6; A.stinger(); break; }
      if (M.checking) {
        if (!M.path || !M.path.length || mStep(dt, spd)) {
          M.dir = 'up'; M.checkT = (M.checkT || 0) + dt;
          if (M.checkT > 1.6) { resolveCheck(M.checking); M.checking = null; M.checkT = 0; }
        }
      } else if (M.searchQ.length) {
        M.checking = M.searchQ.shift(); mSetTarget(M.checking.x, M.checking.y + 18); M.checkT = 0;
      } else if (!M.path || !M.path.length || mStep(dt, spd)) {
        if (M.stateT > 4) { setState('patrol'); M.pause = 2; if (M.onSearchEnd) { const cb = M.onSearchEnd; M.onSearchEnd = null; cb(); } }
      }
      break;
    }
    case 'pursue': {   // 피날레: 일정 거리 유지하며 계속 따라옴
      if (!same) break;
      const d = dist(M.x, M.y, P.x, P.y);
      spd = d > 220 ? 210 : d > 120 ? 160 : (P.still > 1.1 ? 170 : 105);
      M.pathT -= dt;
      if (M.pathT <= 0 || !M.path || !M.path.length) { M.path = los(M.floor, M.x, M.y, P.x, P.y, 'm') ? [[P.x, P.y]] : findPath(M.floor, M.x, M.y, P.x, P.y); M.pathT = .3; }
      mStep(dt, spd);
      if (touching() && !S.flags.ending) caught();
      break;
    }
    case 'leave': {
      M.alpha = Math.max(0, (M.alpha == null ? 1 : M.alpha) - dt * .8);
      if (M.alpha <= 0) { const cb = M.leaveCb; M.alpha = null; mOff(); cb && cb(); break; }
      spd = 80;
      if (!onScreen(M.x, M.y, 30)) M.offT += dt; else M.offT = 0;
      if (!M.path || !M.path.length || mStep(dt, spd) || M.offT > 1.2) { const cb = M.leaveCb; mOff(); cb && cb(); }
      break;
    }
  }
  // 연출 중(조작 잠김·안전 연출)이 아니면, 어떤 상태든 맞닿는 순간 잡힌다
  if (same && M.on && !M.forceSafe && !S.lock && !dying && M.state !== 'leave' && touching()) { caught(); return; }
  // 발소리 & 흔적
  if (same && spd > 0 && M.state !== 'idle') {
    M.stepT -= dt * (spd / 50);
    if (M.stepT <= 0) {
      M.stepT = .48; const d = dist(M.x, M.y, P.x, P.y);
      const v = clamp(1 - d / 650, 0, 1); if (v > 0) A.click(v * .75, panOf(M.x));
      S.footprints.push({ x: M.x + rnd(-3, 3), y: M.y, t: S.t, d: M.dir });
      if (S.footprints.length > 140) S.footprints.shift();
    }
  }
  M.bob += dt * (spd > 0 ? spd / 9 : 0);
}
/* 잡힘 판정: 두 캐릭터 그림이 실제로 겹쳐 보이는 범위 (가로 30, 세로 34 타원 — 앞뒤로 겹쳐 서도 잡힘) */
function touching() { const dx = (M.x - P.x) / 30, dy = (M.y - P.y) / 34; return !P.hidden && dx * dx + dy * dy < 1; }
function startSearch(spot) {
  setState('search', { checking: null, checkT: 0 });
  const lx = M.last ? M.last[0] : P.x, ly = M.last ? M.last[1] : P.y;
  const spots = HIDES.filter(h => h.f === M.floor && dist(h.x, h.y, lx, ly) < 170).sort((a, b) => dist(a.x, a.y, lx, ly) - dist(b.x, b.y, lx, ly)).slice(0, 2);
  if (spot && !spots.includes(spot)) spots.unshift(spot);
  // 학습: 같은 곳에 연달아 숨으면 그곳부터 확인한다
  const fav = S.hideFav; if (fav && fav.n >= 2 && fav.h.f === M.floor && dist(fav.h.x, fav.h.y, lx, ly) < 320) { const i = spots.indexOf(fav.h); if (i > 0) spots.splice(i, 1); if (i !== 0) spots.unshift(fav.h); }
  M.searchQ = spots; M.sawHide = spot;
  mSetTarget(lx, ly);
}
function resolveCheck(spot) {
  if (P.hidden !== spot) { if (Math.random() < M.cfg.open + .2) { A.creak(); S.flash = .15; } return; }
  if (M.forceSafe) return;
  let chance;
  if (P.holding && P.breath > .02) chance = M.cfg.open * (1 - spot.s) * (M.sawHide === spot ? 2.4 : S.hideFav && S.hideFav.h === spot && S.hideFav.n >= 2 ? 1.9 : 1.4);
  else chance = .85;
  if (Math.random() < chance) { A.creak(); caught(); } else { A.creak(); }
}
function faceTo(x, y, tx, ty) { const dx = tx - x, dy = ty - y; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
function panOf(x) { return clamp((x - P.x) / 500, -1, 1); }

/* =========================================================
   플레이어
   ========================================================= */
function pUpdate(dt) {
  let ix = 0, iy = 0;
  if (!S.lock && !P.hidden) {
    if (K['a'] || K['arrowleft']) ix -= 1; if (K['d'] || K['arrowright']) ix += 1;
    if (K['w'] || K['arrowup']) iy -= 1; if (K['s'] || K['arrowdown']) iy += 1;
    if (T.active) { ix = T.x; iy = T.y; }
    else if (typeof GP !== 'undefined' && GP.active) { ix = GP.x; iy = GP.y; }
  }
  const l = Math.hypot(ix, iy); if (l > 1) { ix /= l; iy /= l; }
  const wantRun = (K['shift'] || T.run || T.autoRun) && l > .1;
  const infinite = S.flags.finale;
  if (wantRun && (P.stam > .05 || infinite) && !(P.tired && !infinite)) { P.run = true; if (!infinite) P.stam -= dt * .19; if (P.stam <= .02) P.tired = true; }
  else { P.run = false; P.stam = Math.min(1, P.stam + dt * .14); if (P.stam > .35) P.tired = false; }
  const spd = (P.run ? 165 : 92) * l;
  P.moving = l > .1;
  if (P.moving) {
    const nx = P.x + ix / Math.max(l, 1e-6) * spd * dt, ny = P.y + iy / Math.max(l, 1e-6) * spd * dt;
    const sx = nx - P.x, sy = ny - P.y;
    if (canStand(S.floor, nx, P.y, 'p')) P.x = nx; else if (Math.abs(sx) > Math.abs(sy)) slide(0, Math.sign(sx), Math.abs(sx));
    if (canStand(S.floor, P.x, ny, 'p')) P.y = ny;
    else if (Math.abs(sy) > Math.abs(sx) * 1.4) { slide(Math.sign(sy), 0, Math.max(Math.abs(sy), 1.5)); if (canStand(S.floor, P.x, ny, 'p')) P.y = ny; }
    P.dir = Math.abs(ix) > Math.abs(iy) ? (ix > 0 ? 'right' : 'left') : (iy > 0 ? 'down' : 'up');
    const ta = Math.atan2(iy, ix); let da = ta - P.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); P.ang += da * Math.min(1, dt * 10);
    P.bob += dt * spd / 7; P.still = 0;
    P.stepT = (P.stepT || 0) - dt * spd / 92;
    if (P.stepT <= 0) { P.stepT = .42; A.step(P.run ? .55 : .22, 0); if (P.run) noise(165); }
  } else P.still += dt;
  // 숨 참기
  if (P.hidden) {
    P.holding = eHeld && breathPrompt();
    if (P.holding) { P.breath -= dt * .3; if (P.breath <= 0) { P.breath = 0; P.holding = false; A.gasp(); noise(220); if (M.on && dist(M.x, M.y, P.x, P.y) < 130 && !M.forceSafe) { caught(); } P.breath = .35; } }
    else P.breath = Math.min(1, P.breath + dt * .22);
  } else { P.breath = Math.min(1, P.breath + dt * .4); P.holding = false; }
  // 배터리
  if (S.torch && !P.hidden && S.flags.batteryOn && !S.busy && !S.flags.finale && !S.transit) {
    let r = .022; if (litAt(P.x, P.y) > .45) r *= .35;
    const before = S.battery; S.battery = Math.max(0, S.battery - dt * r);
    if (before >= 15 && S.battery < 15) bark('배터리가 얼마 안 남았어…… 보건실에 콘센트가 있었지.', 3200);
    if (S.battery <= 0) { S.torch = false; bark('……배터리가 다 됐다. 불 켜진 곳으로 다니자.', 3000); }
  }
}
function dangerNear() { return (M.on && M.floor === S.floor && dist(M.x, M.y, P.x, P.y) < 170) || (S.busy && M.forceSafe); }
/* 문틀·모서리에 걸리면 열린 쪽으로 미끄러지기 (dy: 세로로 막힘, dx: 가로로 막힘) */
function slide(dy, dx, step) {
  for (let o = 2; o <= 16; o += 2) for (const sgn of [1, -1]) {
    if (dy) { const tx = P.x + o * sgn; if (canStand(S.floor, tx, P.y + dy * 6, 'p') && canStand(S.floor, P.x + sgn * step, P.y, 'p')) { P.x += sgn * Math.min(step, o); return; } }
    if (dx) { const ty = P.y + o * sgn; if (canStand(S.floor, P.x + dx * 6, ty, 'p') && canStand(S.floor, P.x, P.y + sgn * step, 'p')) { P.y += sgn * Math.min(step, o); return; } }
  }
}
function breathPrompt() { return M.on && M.floor === S.floor && dist(M.x, M.y, P.x, P.y) < 120 && ['search', 'chase', 'script', 'idle', 'suspicious', 'patrol'].includes(M.state); }

function hideIn(h) {
  P.hidden = h; P.x = h.x; P.y = h.y; A.creak(); P.breath = 1; S.torchBefore = S.torch;
  S.hideFav = S.hideFav && S.hideFav.h === h ? { h, n: S.hideFav.n + 1 } : { h, n: 1 };
  hideSay();
}
function unhide() { const h = P.hidden; P.hidden = null; A.creak(); P.x = h.x; P.y = h.y + 2; noise(60); }

/* 상호작용 탐색 */
function nearest() {
  if (P.hidden) { if (dangerNear()) return null; return { label: '나오기', act: () => unhide(), hideExit: true }; }
  let best = null, bd = 1e9;
  for (const o of I) {
    if (o.f !== S.floor) continue; if (o.when && !o.when()) continue;
    const d = dist(o.x, o.y, P.x, P.y); if (d < o.r && d < bd) { bd = d; best = o; }
  }
  for (const h of HIDES) {
    if (h.f !== S.floor) continue; if (h.req && !S.flags[h.req]) continue;
    const d = dist(h.x, h.y, P.x, P.y); if (d < 30 && d < bd) { bd = d; best = { label: '숨기 · ' + h.n, act: () => hideIn(h), hide: h }; }
  }
  return best;
}

/* =========================================================
   층 이동
   ========================================================= */
const ARRIVE = { w: [102, 382, 'down'], e: [1350, 382, 'down'] };
async function changeFloor(f, side, opts) {
  opts = opts || {};
  S.lock = true; S.transit = true; A.step(.5); await fadeTo(1, 450);
  const chasing = M.on && ['chase', 'alert', 'pursue'].includes(M.state);
  S.floor = f; const a = ARRIVE[side]; P.x = a[0]; P.y = a[1]; P.dir = a[2]; P.ang = Math.PI / 2;
  S.footprints = [];
  if (M.on && !chasing) mOff();
  if (chasing) { M.on = false; S.mFollow = { f, side, t: S.t + (M.state === 'pursue' ? 2.0 : 3.2), st: M.state }; }
  setLights(floorLights(f));
  directorFloor(f);
  snapCam();
  await fadeTo(0, 450); S.lock = false; S.transit = false;
}
async function goFloor(f, side, after) {
  if (S.busy) return; S.busy = true; S.lock = true;
  await changeFloor(f, side);
  S.busy = false; S.lock = false;
  if (S.flags.finale && f === 1 && !S.flags.ending) { startRunner(); return; }
  if (after) after();
}
function followUpdate() {
  const fw = S.mFollow; if (!fw || S.t < fw.t) return;
  S.mFollow = null;
  if (fw.f !== S.floor) return;
  const a = ARRIVE[fw.side]; mSpawn(fw.f, a[0], a[1] - 30, fw.st === 'pursue' ? 'pursue' : 'chase'); M.chaseT = 1; M.last = [P.x, P.y];
  A.click(.9, panOf(a[0]));
}

/* =========================================================
   디렉터 — 층별 괴물·조명·사운드 설정
   ========================================================= */
function directorFloor(f) {
  const fl = S.flags;
  ORGEL.stop(); PIANO.stop();
  if (f === 2 && !fl.f2done) {
    M.cfg = { react: 1, open: .45, vision: 220 };
    if (!fl.f2spawned) { S.spawnAt = S.t + 22; } else if (!M.on && !S.mFollow) { S.spawnAt = S.t + 6; }
  }
  if (f === 3 && !fl.pianoDone) {
    M.cfg = { react: 1.6, open: .25, vision: 210 };
    if (!fl.knocked && !fl.musicKey) PIANO.start(); S.spawnAt = S.t + 18;
  }
  if (f === 1 && fl.chase1Done && !fl.finale) { S.spawnAt = 0; }
}
function directorUpdate(dt) {
  const fl = S.flags, f = S.floor;
  // 지연 스폰
  if (S.spawnAt && S.t > S.spawnAt && !M.on && !S.mFollow && !S.busy) {
    S.spawnAt = 0;
    if (f === 2 && !fl.f2done) { fl.f2spawned = true; mSpawn(2, 1300, 460, 'patrol'); M.pause = 1; }
    if (f === 3 && !fl.pianoDone) { mSpawn(3, 1180, 460, 'patrol'); M.pause = 1; }
  }
  // 오르골 볼륨 = 괴물 거리
  let og = 0;
  if (M.on && M.floor === f && M.state !== 'off') {
    const d = dist(M.x, M.y, P.x, P.y);
    if (d > 130) og = clamp(1 - (d - 130) / 900, .04, .55); else og = 0;   // 가까우면 오히려 끊김
    if (M.state === 'chase' || M.state === 'pursue') og = Math.max(og, .35);
    if (d < 130 && Math.random() < dt * .8) A.breath(.5, panOf(M.x));
    if (!ORGEL.on && !S.orgelMute) ORGEL.start();
  } else if (S.orgelAmb) { og = S.orgelAmb; if (!ORGEL.on) ORGEL.start(); }
  else if (!S.orgelForce) { if (ORGEL.on) ORGEL.stop(); }
  if (S.orgelForce) { og = S.orgelForce; if (!ORGEL.on) ORGEL.start(); }
  A.setBus('orgel', S.orgelMute ? 0 : og, .4);
  // 피아노(3층 음악실)
  if (PIANO.on) { const d = dist(720, 200, P.x, P.y); A.setBus('piano', f === 3 ? clamp(1 - d / 900, .03, .6) : 0, .3); } else A.setBus('piano', 0, .2);
  // 추격 레벨
  const chasing = M.on && M.floor === f && (M.state === 'chase' || M.state === 'pursue');
  S.chaseLevel = lerp(S.chaseLevel, chasing ? 1 : 0, dt * (chasing ? 3 : .8));
  A.setBus('chase', S.chaseLevel * .55, .2);
  // 심장
  const near = M.on && M.floor === f ? Math.pow(clamp(1 - dist(M.x, M.y, P.x, P.y) / 380, 0, 1), 1.3) : 0;
  const hv = Math.max(near * (P.hidden ? 1.15 : 1), S.chaseLevel * .8);
  A.setBus('heart', hv * .9, .2);
  if (hv > .1 && A.t() - A.lastHeart > 60 / (70 + hv * 80)) { A.lastHeart = A.t(); A.heart(); }
  // 험/드론
  const lit = S.lights.some(l => l.on);
  A.setBus('hum', lit ? (f === 4 ? .035 : .018) : 0, .8);
  A.setBus('drone', f === 4 ? .32 : .18, 1);
  // 1층 첫 추격 종료 감지
  if (fl.chase1 && !fl.chase1Done && M.on && M.state === 'patrol' && M.stateT > .2) {
    fl.chase1Done = true; afterChase1();
  }
}

/* =========================================================
   카메라 & 렌더
   ========================================================= */
const cv = $('c'), ctx = cv.getContext('2d');
let VW = 0, VH = 0, DPR = 1;
const cam = { x: 330, y: 236, z: 2, ov: null };
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2); VW = innerWidth; VH = innerHeight;
  cv.width = VW * DPR; cv.height = VH * DPR;
  dark.width = cv.width; dark.height = cv.height;
}
const dark = document.createElement('canvas'); const dctx = dark.getContext('2d');
const grain = document.createElement('canvas'); grain.width = grain.height = 256;
(() => { const g = grain.getContext('2d'), d = g.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); })();
window.addEventListener('resize', resize);
function baseZoom() { return clamp(Math.min(VW / 620, VH / 380), 1.15, 2.3); }
function snapCam() { cam.x = P.x; cam.y = P.y - 20; }
function w2s(x, y) { return [(x - cam.x) * cam.z + VW / 2, (y - cam.y) * cam.z + VH / 2]; }
function onScreen(x, y, m) { const [sx, sy] = w2s(x, y); return sx > -m && sy > -m && sx < VW + m && sy < VH + m; }

function updateCam(dt) {
  let tx = P.x, ty = P.y - 20, tz = baseZoom();
  if (P.hidden) tz *= 1.22;
  if (cam.ov) { tx = cam.ov[0]; ty = cam.ov[1]; if (cam.ov[2]) tz *= cam.ov[2]; }
  const k = Math.min(1, dt * (cam.ov ? 2.2 : 6));
  cam.x = lerp(cam.x, tx, k); cam.y = lerp(cam.y, ty, k); cam.z = lerp(cam.z, tz, Math.min(1, dt * 3));
  const hw = VW / 2 / cam.z, hh = VH / 2 / cam.z;
  cam.x = clamp(cam.x, hw, MW - hw); cam.y = clamp(cam.y, hh, MH - hh);
  if (hw * 2 > MW) cam.x = MW / 2; if (hh * 2 > MH) cam.y = MH / 2;
}

function drawSprite(pre, dir, x, y, h, bob, alpha, still) {
  const key = pre + (dir === 'left' ? 'side1' : dir === 'right' ? 'side2' : dir);
  const img = IMG[key]; if (!img) return;
  const w = h * img.width / img.height;
  const b = still ? 0 : Math.abs(Math.sin(bob)) * 2.2;
  // 그림자
  ctx.save(); ctx.globalAlpha = .35 * (alpha == null ? 1 : alpha); ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(x, y, w * .32, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
  const tf = window.HORROR ? HORROR.spriteTf(pre, dir, still, bob) : null;
  if (tf) { ctx.translate(x + tf.dx, y - b); ctx.rotate(tf.rot); ctx.scale(tf.sx, tf.sy); ctx.drawImage(img, -w / 2, -h, w, h); }
  else ctx.drawImage(img, x - w / 2, y - h - b, w, h);
  ctx.restore();
}

function render(dt) {
  if (!cv.width || !cv.height || !dark.width || !dark.height) { resize(); if (!cv.width || !cv.height) return; }
  const z = cam.z * DPR;
  let sx = 0, sy = 0; const shk = typeof SET === 'undefined' || SET.shake ? S.shake : 0; if (S.shake > 0) { sx = rnd(-shk, shk); sy = rnd(-shk, shk); S.shake = Math.max(0, S.shake - dt * 20); }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (S.mode !== 'play' && S.mode !== 'end') return;
  ctx.setTransform(z, 0, 0, z, (VW / 2 - cam.x * cam.z + sx) * DPR, (VH / 2 - cam.y * cam.z + sy) * DPR);
  ctx.imageSmoothingQuality = 'high';
  const map = IMG['map' + S.floor]; if (map) ctx.drawImage(map, 0, 0, MW, MH);
  // 이벤트 그리기 (분필 글씨 등)
  drawDecals();
  if (window.DOORS) DOORS.draw();
  // 젖은 발자국
  for (const f of S.footprints) {
    const age = S.t - f.t; if (age > 16) continue; const a = (1 - age / 16) * .55;
    ctx.fillStyle = `rgba(20,30,50,${a})`;
    const off = (f.d === 'left' || f.d === 'right') ? [0, 4] : [4, 0];
    ctx.beginPath(); ctx.ellipse(f.x - off[0], f.y - off[1], 2.6, 4, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(f.x + off[0], f.y + off[1] + 3, 2.6, 4, 0, 0, 7); ctx.fill();
  }
  // 상호작용 반짝임
  if (!P.hidden) for (const o of I) {
    if (o.f !== S.floor || (o.when && !o.when()) || o.noGlint) continue;
    const d = dist(o.x, o.y, P.x, P.y); if (d > 210) continue;
    const pulse = .5 + .5 * Math.sin(S.t * 3 + o.x), a = (1 - d / 210);
    ctx.fillStyle = `rgba(215,232,255,${a * (.55 + .35 * pulse)})`; ctx.beginPath(); ctx.arc(o.x, o.y, 3.2, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(170,205,255,${a * .5 * (1 - pulse)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(o.x, o.y, 5 + pulse * 7, 0, 7); ctx.stroke();
  }
  if (S.hideGlow) for (const h of HIDES) {
    if (h.f !== S.floor || !h.office) continue;
    ctx.strokeStyle = `rgba(140,200,255,${.45 + .3 * Math.sin(S.t * 5)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x, h.y - 12, 16, 0, 7); ctx.stroke();
  }
  // 정렬 그리기
  const list = [];
  if (!P.hidden && S.drawP !== false) list.push({ y: P.y, f: () => drawSprite('p_', P.dir, P.x, P.y, 62, P.bob, null, !P.moving) });
  if (M.on && M.floor === S.floor) { const mp = window.HORROR ? HORROR.mDraw() : [M.x, M.y]; list.push({ y: M.y, f: () => drawSprite('m_', M.dir, mp[0], mp[1], 58, M.bob * .3, M.alpha) }); }
  list.sort((a, b) => a.y - b.y).forEach(o => o.f());
  if (window.HORROR) HORROR.world(dt);
  if (window.DOORS) DOORS.drawTop();
  // 소음 고리
  if (S.noiseRing) { const n = S.noiseRing; n.t += dt; if (n.t > .6) S.noiseRing = null; else { ctx.strokeStyle = `rgba(255,255,255,${.18 * (1 - n.t / .6)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(n.x, n.y, n.r * (n.t / .6) * .5, 0, 7); ctx.stroke(); } }

  // ---- 색조: 차갑고 눅눅한 블루 ----
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = S.floor === 4 ? 'rgb(92,90,140)' : 'rgb(98,112,170)'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.globalCompositeOperation = 'source-over';

  // ---- 어둠 + 빛 ----
  drawDarkness();
  ctx.drawImage(dark, 0, 0);
  if (window.HORROR) HORROR.screen(dt);

  // 추가광: 비상구, 방송 ON AIR, 붉은 추격
  ctx.globalCompositeOperation = 'lighter';
  const glow = (x, y, r, col, a) => { const [gx, gy] = w2s(x, y); const g = ctx.createRadialGradient(gx * DPR, gy * DPR, 0, gx * DPR, gy * DPR, r * cam.z * DPR); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height); };
  glow(102, 336, 22, 'rgba(60,255,140,A)', .16); glow(1350, 336, 22, 'rgba(60,255,140,A)', .16);
  if (S.floor === 1 && S.flags.power) glow(720, 60, 40, 'rgba(255,40,60,A)', .25 + .1 * Math.sin(S.t * 4));
  if (S.chaseLevel > .02) { ctx.fillStyle = `rgba(160,0,20,${S.chaseLevel * (.08 + .06 * Math.sin(S.t * 9))})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  ctx.globalCompositeOperation = 'source-over';
  if (S.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${S.flash * (typeof SET !== 'undefined' && SET.calm ? .35 : 1)})`; ctx.fillRect(0, 0, cv.width, cv.height); S.flash = Math.max(0, S.flash - dt * 2); }

  // 비네트
  const vg = ctx.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * .3, cv.width / 2, cv.height / 2, Math.max(cv.width, cv.height) * .72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,6,${.7 + S.chaseLevel * .2})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, cv.width, cv.height);
  if (S.chaseLevel > .05) { const rg = ctx.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * .35, cv.width / 2, cv.height / 2, Math.max(cv.width, cv.height) * .7); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, `rgba(200,10,30,${S.chaseLevel * .35})`); ctx.fillStyle = rg; ctx.fillRect(0, 0, cv.width, cv.height); }
  // 필름 그레인
  ctx.globalAlpha = typeof SET === 'undefined' || SET.grain ? .035 : 0; ctx.globalCompositeOperation = 'overlay';
  if (!render.gT || S.t - render.gT > 1 / 12 || S.t < render.gT) { render.gT = S.t; render.gO = [rnd(0, 256), rnd(0, 256)]; }
  const pat = ctx.createPattern(grain, 'repeat'); ctx.translate(render.gO[0], render.gO[1]); ctx.fillStyle = pat; ctx.fillRect(-256, -256, cv.width + 512, cv.height + 512);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  drawGlintsTop();
  // 숨기 틈 시야
  if (P.hidden) drawSlit(P.hidden.kind);
  if (window.HORROR) HORROR.post(dt);
}

/* ---- 빛 가림: 벽을 만나면 빛이 멈춘다 ---- */
const LC = 8, LW = Math.ceil(MW / LC), LH = Math.ceil(MH / LC), lgCache = {};
function lightGrid(f) {
  if (lgCache[f]) return lgCache[f];
  const g = new Uint8Array(LW * LH), F = FLOORS[f];
  for (let j = 0; j < LH; j++) for (let i = 0; i < LW; i++) {
    const x = i * LC + 4, y = j * LC + 4;
    for (const r of F.walk) if (inR(r, x, y)) { g[j * LW + i] = 1; break; }
  }
  return (lgCache[f] = g);
}
const PEN = 34;   // 벽면을 살짝 비추는 깊이(옆 공간까지는 닿지 않음)
function castPoly(f, ox, oy, a0, a1, n, maxR) {
  const g = lightGrid(f), pts = [];
  const open = (x, y) => { const i = (x / LC) | 0, j = (y / LC) | 0; return i >= 0 && j >= 0 && i < LW && j < LH && g[j * LW + i] === 1; };
  const start = open(ox, oy);
  for (let k = 0; k <= n; k++) {
    const ang = a0 + (a1 - a0) * k / n, dx = Math.cos(ang), dy = Math.sin(ang);
    let r = 0, wall = 0, started = start, end = maxR;
    while (r < maxR) {
      r += 4; const o = open(ox + dx * r, oy + dy * r);
      if (!o) { if (started) { wall += 4; if (wall > PEN) { end = r; break; } } }
      else if (!started) { started = true; }
      else if (wall > 0) { end = r - 3; break; }   // 벽 너머 다른 공간 → 여기서 멈춤
    }
    pts.push([ox + dx * end, oy + dy * end]);
  }
  return pts;
}
function fillPoly(d, ox, oy, pts, r, a, mid, fan) {
  const z = cam.z * DPR, [sx, sy] = w2s(ox, oy);
  const g = d.createRadialGradient(sx * DPR, sy * DPR, fan ? 8 : 0, sx * DPR, sy * DPR, r * z);
  g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(mid || .55, `rgba(0,0,0,${a * .6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  d.fillStyle = g; d.beginPath();
  if (fan) d.moveTo(sx * DPR, sy * DPR);
  pts.forEach((p, i) => { const [x, y] = w2s(p[0], p[1]); i || fan ? d.lineTo(x * DPR, y * DPR) : d.moveTo(x * DPR, y * DPR); });
  d.closePath(); d.fill();
}

function drawDarkness() {
  const d = dctx, W = dark.width, H = dark.height, z = cam.z * DPR;
  d.setTransform(1, 0, 0, 1, 0, 0); d.globalCompositeOperation = 'source-over';
  const base = S.floor === 4 ? .94 : .92;
  d.fillStyle = `rgba(3,5,14,${base})`; d.fillRect(0, 0, W, H);
  d.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a) => { const [sx, sy] = w2s(x, y); const g = d.createRadialGradient(sx * DPR, sy * DPR, 0, sx * DPR, sy * DPR, r * z); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.55, `rgba(0,0,0,${a * .55})`); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.beginPath(); d.arc(sx * DPR, sy * DPR, r * z, 0, 7); d.fill(); };
  const f = S.floor;
  // 천장 조명 (벽에 가려짐, 한 번 계산 후 캐시)
  for (const l of S.lights) {
    if (!l.on || (window.HORROR && HORROR.isLightOff(l))) continue;
    l.a = l.flick ? blink(l, l.flick * 1.4) : 1;
    if (l.a <= .05) continue;
    if (!l.poly || l.polyF !== f) { l.poly = castPoly(f, l.x, l.y, 0, Math.PI * 2, 72, l.r * 1.12); l.polyF = f; }
    fillPoly(d, l.x, l.y, l.poly, l.r * 1.12, .9 * l.a);
  }
  // 플레이어 주변
  const px = P.hidden ? P.hidden.x : P.x, py = (P.hidden ? P.hidden.y : P.y) - 10;
  const amb = P.hidden ? 170 : 92;
  fillPoly(d, px, py, castPoly(f, px, py, 0, Math.PI * 2, 56, amb), amb, P.hidden ? .62 : .82);
  // 손전등 (부채꼴, 벽에서 멈춤)
  if (S.torch && !P.hidden && S.mode === 'play') {
    const flick = (S.battery < 10 ? .3 + .7 * blink(S, .35) : 1) * (window.HORROR ? HORROR.torchK() : 1), len = 290, spread = .5;
    const ox = P.x, oy = P.y - 12, ta = P.ang + (window.HORROR ? HORROR.sway : 0);
    fillPoly(d, ox, oy, castPoly(f, ox, oy, ta - spread, ta + spread, 64, len), len, .95 * flick, .6, true);
  }
  // 엔딩: 학교 앞은 달빛
  if (S.flags.ending) hole(707, 980, 360, .7);
  if (cam.ov && cam.ov[3]) hole(cam.ov[0], cam.ov[1], cam.ov[3], .7);
  d.globalCompositeOperation = 'source-over';
}

function drawSlit(kind) {
  const W = cv.width, H = cv.height;
  const h = H * (kind === 'shelf' ? .5 : kind === 'curtain' ? .42 : kind === 'desk' ? .34 : .22);
  const cy = H * .52;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, cy - h / 2); ctx.fillRect(0, cy + h / 2, W, H);
  const g1 = ctx.createLinearGradient(0, cy - h / 2, 0, cy - h / 2 + 40 * DPR); g1.addColorStop(0, '#000'); g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1; ctx.fillRect(0, cy - h / 2, W, 40 * DPR);
  const g2 = ctx.createLinearGradient(0, cy + h / 2 - 40 * DPR, 0, cy + h / 2); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, '#000');
  ctx.fillStyle = g2; ctx.fillRect(0, cy + h / 2 - 40 * DPR, W, 40 * DPR);
  if (kind === 'locker' || kind === 'closet') { ctx.fillStyle = 'rgba(10,12,18,.92)'; for (let i = 1; i < 4; i++) ctx.fillRect(0, cy - h / 2 + h * i / 4 - 5 * DPR, W, 10 * DPR); }
  if (kind === 'stall') { ctx.fillStyle = 'rgba(14,20,34,.95)'; ctx.fillRect(0, 0, W * .12, H); ctx.fillRect(W * .88, 0, W * .12, H); }
  if (kind === 'curtain') { ctx.fillStyle = 'rgba(40,70,70,.45)'; for (let i = 0; i < 9; i++) ctx.fillRect(W * (i / 9) + Math.sin(S.t + i) * 6, 0, W * .05, H); }
  if (kind === 'shelf') { ctx.fillStyle = 'rgba(40,24,14,.9)'; ctx.fillRect(0, 0, W * .3, H); ctx.fillRect(W * .7, 0, W * .3, H); }
  if (kind === 'desk') { ctx.fillStyle = 'rgba(46,30,18,.95)'; ctx.fillRect(0, 0, W, cy - h / 2 + 20 * DPR); }
}

/* 어둠 위에 살짝 보이는 조사 표시 (가까울 때만) */
function drawGlintsTop() {
  if (P.hidden || S.lock) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const o of I) {
    if (o.f !== S.floor || (o.when && !o.when()) || o.noGlint) continue;
    const d = dist(o.x, o.y, P.x, P.y); if (d > 210) continue;
    const [sx, sy] = w2s(o.x, o.y); const pulse = .5 + .5 * Math.sin(S.t * 3 + o.x), a = (1 - d / 210) * .5;
    ctx.fillStyle = `rgba(150,190,255,${a * (.4 + .6 * pulse)})`; ctx.beginPath(); ctx.arc(sx * DPR, sy * DPR, 3 * DPR, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function drawStairGate(x, kind) {
  const w = kind === 'block' && x === 1262 ? 64 : 84, y = 190;
  ctx.save();
  if (kind === 'gate') {
    ctx.fillStyle = 'rgba(20,22,30,.55)'; ctx.fillRect(x, y, w, 26);
    ctx.strokeStyle = 'rgba(150,156,170,.95)'; ctx.lineWidth = 2.2;
    for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(x + i * w / 8, y); ctx.lineTo(x + i * w / 8, y + 26); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + w, y + 2); ctx.moveTo(x, y + 24); ctx.lineTo(x + w, y + 24); ctx.stroke();
    ctx.fillStyle = '#d9b44a'; ctx.fillRect(x + w / 2 - 5, y + 9, 10, 9);
  } else {
    ctx.fillStyle = 'rgba(46,32,24,.95)'; ctx.fillRect(x, y - 4, w, 30);
    ctx.fillStyle = 'rgba(90,64,44,.95)'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 4 + i * (w / 4), y + (i % 2) * 6, w / 4 - 6, 14);
  }
  ctx.fillStyle = 'rgba(255,200,60,.75)'; for (let i = 0; i < w; i += 14) ctx.fillRect(x + i, y + 28, 8, 4);
  ctx.restore();
}
/* 분필 글씨 같은 연출 레이어 */
function drawDecals() {
  const fl = S.flags;
  ctx.save(); ctx.font = '600 15px Pretendard'; ctx.textAlign = 'center';
  if (S.floor === 2 && fl.c23second) { ctx.fillStyle = 'rgba(235,240,230,.85)'; ctx.fillText('늦었네', 1255, 604); }
  if (S.floor === 1) { ctx.fillStyle = 'rgba(230,236,226,.35)'; ctx.font = '600 9px Pretendard'; ctx.fillText('야자 22:00 종료', 410, 90); }
  if (S.floor === 3 && !fl.shutterOpen) { ctx.fillStyle = 'rgba(70,74,84,.95)'; ctx.fillRect(1236, 398, 18, 124); ctx.fillStyle = 'rgba(255,200,60,.6)'; for (let y = 404; y < 518; y += 14) ctx.fillRect(1238, y, 14, 5); }
  if ((S.floor === 1 || S.floor === 2)) { ctx.fillStyle = 'rgba(70,74,84,.9)'; ctx.fillRect(1328, 334, 46, 10); }
  // 잠긴 계단 철문(위로 가는 계단 입구)
  const gateLocked = (S.floor === 1 && !fl.gate1Open) || (S.floor === 2 && !fl.ironOpen) || S.floor === 3 || (S.floor === 4);
  if (gateLocked) drawStairGate(S.floor >= 3 ? (S.floor === 3 ? 42 : 132) : 42, S.floor === 4 ? 'block' : 'gate');
  if (S.floor === 3) drawStairGate(1262, 'block');
  ctx.restore();
}

/* =========================================================
   잡힘 / 체크포인트
   ========================================================= */
function checkpoint() {
  S.cp = JSON.parse(JSON.stringify({ floor: S.floor, x: P.x, y: P.y, dir: P.dir, flags: S.flags, items: S.items, memos: S.memos, time: S.time, battery: Math.max(S.battery, 12), torch: S.torch }));
  S.cp.resume = S.resumeFn || null;
}
let dying = false;
async function caught() {
  if (dying) return; dying = true;
  S.lock = true; S.busy = true;
  if (typeof RN !== 'undefined') RN.on = false;
  // 모든 소리를 끊는다 — 정적
  ['orgel', 'piano', 'chase', 'heart', 'hum', 'drone'].forEach(k => A.setBus(k, 0, .02)); ORGEL.stop(); PIANO.stop(); S.orgelForce = 0;
  const faces = ['img/scare_smile.jpg', 'img/scare_stare.jpg', 'img/scare_eyes.jpg'].sort(() => Math.random() - .5);
  const sc = $('scare'); sc.className = '';
  sc.innerHTML = `<img class="far" src="img/closeup.png" alt=""><img class="face f1" src="${faces[0]}" alt=""><img class="face rgbR" src="${faces[0]}" alt=""><img class="face rgbB" src="${faces[0]}" alt=""><img class="face f2" src="${faces[1]}" alt=""><div class="noise"></div><div class="txt">${['찾았다.', '여기 있었네.', '술래는 너야.'][(Math.random() * 3) | 0]}</div>`;
  const T = ms => new Promise(r => setTimeout(r, ms));
  await T(60);
  A.ring();                                            // 1) 귀가 먹먹한 정적
  await T(420);
  sc.classList.add('s1'); A.breath(1.2, 0); A.giggle(.55, 0);   // 2) 어둠 속 멀리 서 있는 그것
  await T(720);
  sc.classList.add('s2'); A.scream(); A.noiseHit(1, 200, 60, .6, 0, 'lowpass');   // 3) 얼굴이 덮쳐 온다
  await T(240);
  const calm = typeof SET !== 'undefined' && SET.calm;
  if (!calm) for (let i = 0; i < 3; i++) { sc.classList.add('s3'); await T(70 + i * 20); sc.classList.remove('s3'); await T(90); }   // 4) 다른 얼굴이 번쩍번쩍
  sc.classList.add('s3'); await T(260);
  sc.classList.add('s4'); A.noiseHit(.8, 3000, 800, .3);       // 5) 붉게 물든다
  await T(180);
  sc.classList.add('s5'); A.heart(); A.giggle(.35, .3);        // 6) 암전, 글자만
  await T(1500);
  $('dead').classList.remove('hidden'); sc.classList.add('hidden');
  mOff(); S.paused = true;
}
$('bAgain').addEventListener('click', () => restoreCP());
function restoreCP() {
  const c = S.cp; if (!c) return location.reload();
  $('dead').classList.add('hidden'); $('pause').classList.add('hidden'); $('note').classList.add('hidden'); $('scene').classList.add('hidden'); hideSay();
  S.mode = 'play'; $('scare').classList.add('hidden');
  S.flags = JSON.parse(JSON.stringify(c.flags)); S.items = JSON.parse(JSON.stringify(c.items)); S.memos = JSON.parse(JSON.stringify(c.memos));
  S.floor = c.floor; P.x = c.x; P.y = c.y; P.dir = c.dir; P.hidden = null; S.time = c.time; S.battery = c.battery; S.torch = c.torch;
  S.timers = []; advanceWaiters = []; S.transit = false; S.busy = false; S.lock = false; S.paused = false; dying = false; S.mFollow = null; S.spawnAt = 0;
  S.orgelForce = 0; S.orgelAmb = 0; S.orgelMute = false; cam.ov = null; S.hideGlow = false; S.footprints = []; S.chaseLevel = 0;
  M.forceSafe = false; mOff(); if (window.DOORS) DOORS.reset(); renderItems(); setLights(floorLights(S.floor)); directorFloor(S.floor); snapCam();
  if (c.resume && RESUME[c.resume]) RESUME[c.resume]();
  $('fade').style.opacity = 0;
}
let muted = false;
try { muted = localStorage.getItem('berry_mute') === '1'; } catch (e) { }
function applyMute() {
  if (A.master) A.master.gain.setTargetAtTime(muted ? 0 : .9, A.t(), .05);
  const src = muted ? 'img/ui/p_sound_off.webp' : 'img/ui/p_sound_on.webp';
  ['bSoundI', 'sndTI'].forEach(id => { const el = $(id); if (el) el.src = src; });
  if ($('bSoundT')) $('bSoundT').textContent = muted ? '소리 꺼짐' : '소리 켜짐';
}
function toggleMute() { muted = !muted; try { localStorage.setItem('berry_mute', muted ? '1' : '0'); } catch (e) { } applyMute(); }
$('bSound').addEventListener('click', toggleMute);
$('sndT').addEventListener('click', e => { e.stopPropagation(); A.init(); toggleMute(); });
function togglePause() {
  if (!(S.mode === 'play' || S.mode === 'runner') || dying) return;
  S.paused = !S.paused; $('pause').classList.toggle('hidden', !S.paused);
  if (A.ctx) S.paused ? A.ctx.suspend() : A.ctx.resume();
}
$('bResume').addEventListener('click', togglePause);
$('bRetry').addEventListener('click', () => { if (A.ctx) A.ctx.resume(); restoreCP(); });
$('bTitle').addEventListener('click', () => location.reload());

/* =========================================================
   스토리 — 1층
   ========================================================= */
const fl = () => S.flags;
const RESUME = {
  breaker: () => { /* 배전반 앞에서 다시 */ },
};

function buildInteractions() {
  I.length = 0;
  /* ---- 1층 · 1-1 교실 ---- */
  add({ f: 1, x: 330, y: 262, label: '가방', when: () => !fl().bag, act: () => run(async () => { fl().bag = true; A.paper(); await say('챙겨야지.'); }) });
  add({ f: 1, x: 410, y: 128, label: '칠판', act: () => run(async () => { await note('<b style="font-size:20px">야간자율학습</b>\n\n22:00 종료\n\n<span style="color:#666">· 귀가 시 창문 확인\n· 마지막 사람은 소등</span>', 'doc'); await say(fl().woke2 ? '……마지막 사람이 나잖아.' : '……10시에 끝났구나.'); fl().woke2 = true; }) });
  add({ f: 1, x: 385, y: 238, label: '옆자리 책상', act: () => run(async () => { await narr('펼쳐진 문제집. 반쯤 남은 식은 커피.'); await say('다들 급하게 갔나.'); }) });
  add({ f: 1, x: 280, y: 360, label: '교실 문', r: 34, when: () => !fl().bag, act: () => run(async () => { await say('아, 가방. 챙겨야지.'); }) });
  /* ---- 1층 · 로비 / 현관 / 경비실 ---- */
  add({ f: 1, x: 724, y: 690, label: '바닥 문장', act: () => run(async () => { await narr('바닥에 그려진 블루베리 문장. 달빛에 희미하게 빛난다.'); await say('우리 학교 마크…가 이렇게 생겼었나?'); }) });
  add({ f: 1, x: 707, y: 852, label: '현관문', r: 60, when: () => !fl().frontOpen, act: () => run(async () => {
    if (!fl().front) {
      A.rattle(); S.shake = 2; await wait(600); await say('……?'); A.rattle(); await wait(400); A.rattle(); S.shake = 3; await wait(500);
      await say('잠겼네……?'); await say('이 시간에 학생 남았는지 확인도 안 하고 잠그나?');
      await narr('옆 유리문도 잠겨 있다. 유리 너머로 정문 가로등과 아무도 없는 운동장이 보인다.');
      await narr('로비 왼쪽 부스 창에 붙은 작은 표지판 — 「경비실」.');
      await say('경비 아저씨한테 말하면 되겠다.');
      fl().front = true; memo('현관 잠김 → 경비실');
    } else { A.rattle(); await say('역시 안 열린다.'); }
  }) });
  add({ f: 1, x: 614, y: 645, label: '경비실', act: () => run(async () => {
    if (!fl().guard) {
      A.knock(); await wait(900); await say('……계세요?'); await wait(700); A.rattle(); await wait(500);
      await narr('창 너머 — 꺼진 CCTV 모니터, 반쯤 남은 컵라면, 열쇠걸이에 빈 고리 몇 개.');
      await say('여기도 잠겼어?'); await say('학교 열쇠면…… 교무실에 있지 않나?');
      fl().guard = true; memo('경비실도 잠김. 열쇠는 교무실?');
    } else { await narr('꺼진 모니터. 아무도 없다.'); }
  }) });
  /* ---- 1층 · 교무실 ---- */
  add({ f: 1, x: 1180, y: 700, label: '선생님 서랍', act: () => run(async () => { A.rattle(); await narr('대부분 잠겨 있다.'); }) });
  add({ f: 1, x: 1300, y: 598, label: '키 보관함', act: () => run(async () => {
    await note('<h4>KEY BOX</h4>[ 1-1 ] [ 1-2 ] [ 과학실 ] [ 음악실 ]\n[ <b style="color:#a33">현관 — 비어 있음</b> ]\n[ <b style="color:#a33">경비실 — 비어 있음</b> ]\n[ 방송실 ] [ 체육창고 ]\n[ <b style="color:#a33">옥상 — 비어 있음</b> ]', 'doc');
    await say('누가 가져갔지……?'); fl().keybox = true;
  }) });
  add({ f: 1, x: 1398, y: 640, label: '출석부', act: () => run(async () => { await narr('야자 출석부. 내 이름 옆만 체크가 비어 있다.'); await say('……선생님도 날 못 봤던 거야?'); }) });
  add({ f: 1, x: 1300, y: 826, label: '창문', act: () => run(async () => { await narr('밖은 멈춘 듯 조용하다. 나뭇잎 하나 흔들리지 않는다.'); }) });
  add({ f: 1, x: 1250, y: 628, label: '공용 책상 서류', r: 40, when: () => !fl().officeDoc, act: () => run(officeDocEvent) });
  /* ---- 1층 · 창고 ---- */
  add({ f: 1, x: 402, y: 640, label: '분실물 박스', act: () => run(async () => { await narr('우산, 학생증, USB, 구겨진 체육복……'); if (!fl().officeDoc) await say('잡동사니뿐이네.'); }) });
  add({ f: 1, x: 442, y: 770, label: '「열쇠류」 박스', when: () => !fl().brKey, act: () => run(storageEvent) });
  /* ---- 1층 · 방송실 ---- */
  add({ f: 1, x: 657, y: 398, label: '방송실 문', r: 34, when: () => !fl().brKey, act: () => run(async () => { A.rattle(); await say(fl().officeDoc ? '잠겨 있다.' : '방송실…… 잠겨 있네.'); }) });
  add({ f: 1, x: 614, y: 242, label: '전화기', act: () => run(phoneEvent) });
  add({ f: 1, x: 770, y: 206, label: '방송 콘솔', act: () => run(consoleEvent) });
  add({ f: 1, x: 662, y: 206, label: '컴퓨터', when: () => fl().power, act: () => run(pcEvent) });
  /* ---- 1층 · 배전반 / 보건실 ---- */
  add({ f: 1, x: 1252, y: 414, label: '배전반', r: 44, when: () => !fl().power, act: () => run(breakerEvent) });
  add({ f: 1, x: 1098, y: 606, label: '콘센트 (충전)', act: () => run(async () => {
    if (S.battery >= 99) return say('배터리는 충분하다.');
    showSay('충전 중… <span class="more">E를 떼면 멈춤</span>', true); S.lock = true;
    while (eHeld && S.battery < 100) { S.battery = Math.min(100, S.battery + .8); await wait(80); }
    hideSay();
  }, false) });
  add({ f: 1, x: 978, y: 640, label: '보건실 거울', act: () => run(async () => { await narr('거울 속 커튼이…… 내 뒤에서 살짝 흔들린 것 같다.'); await wait(300); await say('……기분 탓이야.'); }) });
  /* ---- 1층 · 계단 ---- */
  add({ f: 1, x: 82, y: 236, label: '올라가기', r: 50, act: () => run(async () => {
    if (!hasItem('stairKey1')) {
      A.rattle(); await narr('계단 입구에 접이식 철문이 내려와 있다. 「야간 출입 금지」 — 자물쇠로 잠겨 있다.');
      return say(fl().bc2 ? '열쇠는 방송실 서랍에 넣어 뒀다고 했지.' : '위층은…… 아니, 일단 1층에서 나갈 방법부터 찾자.');
    }
    if (!fl().gate1Open) { A.unlock(); noise(120); fl().gate1Open = true; await narr('철컥. 접이식 철문을 밀어 올린다.'); }
  }).then(() => hasItem('stairKey1') && goFloor(2, 'w', arrive2)) });
  add({ f: 1, x: 760, y: 300, label: '책상 서랍', when: () => fl().bc2 && !hasItem('stairKey1'), act: () => run(async () => {
    await narr('서랍 안쪽에 테이프로 붙여 둔 열쇠. 태그에 「1층 계단」.'); addItem('stairKey1', '1층 계단 열쇠');
    await say('……정말로 날 위해 남겨 둔 거네.'); memo('1층 서쪽 계단 철문 → 2층'); checkpoint();
  }) });
  add({ f: 1, x: 1352, y: 400, label: '동쪽 계단', r: 36, act: () => run(async () => { A.rattle(); await narr('방화셔터가 내려와 있다. 손으로는 꿈쩍도 하지 않는다.'); }) });

  /* ---- 2층 ---- */
  add({ f: 2, x: 158, y: 236, label: '내려가기', r: 50, act: () => goFloor(1, 'w') });
  add({ f: 2, x: 82, y: 236, label: '올라가기', r: 50, act: () => run(async () => {
    if (!hasItem('ironKey')) { A.rattle(); await narr('3층으로 가는 계단에 철문이 내려와 있다. 자물쇠로 잠겨 있다.'); if (!fl().book3) await say('여기도 잠겼어……'); return; }
    if (!fl().ironOpen) { A.unlock(); noise(160); fl().ironOpen = true; await narr('철컥. 녹슨 자물쇠가 풀린다. 소리가 복도 끝까지 울린다.'); }
  }).then(() => hasItem('ironKey') && goFloor(3, 'w', arrive3)) });
  add({ f: 2, x: 1352, y: 400, label: '동쪽 계단', r: 36, act: () => run(async () => { A.rattle(); await narr('여기도 방화셔터. 내려와 있다.'); }) });
  add({ f: 2, x: 360, y: 828, label: '창가', r: 70, when: () => !fl().signalTry, act: () => run(windowEvent, true) });
  add({ f: 2, x: 600, y: 828, label: '창가', r: 60, when: () => fl().signalTry, act: () => run(async () => { await narr('신호 막대는 다시 비어 있다.'); }) });
  add({ f: 2, x: 442, y: 796, label: '거꾸로 꽂힌 책', r: 36, when: () => !fl().book3, act: () => run(bookEvent) });
  add({ f: 2, x: 732, y: 276, label: '서류함', when: () => !fl().archive, act: () => run(archiveEvent) });
  add({ f: 2, x: 812, y: 230, label: '책상 서랍', when: () => !fl().pb2, act: () => run(async () => { fl().pb2 = true; await narr('서랍 안에 누군가 두고 간 보조배터리.'); S.battery = Math.min(100, S.battery + 35); A.unlock(); await say('……살았다.'); }) });
  add({ f: 2, x: 1046, y: 610, label: '열쇠함', when: () => !hasItem('ironKey'), act: () => run(janitorEvent) });
  add({ f: 2, x: 1262, y: 606, label: '칠판', when: () => fl().c23second, act: () => run(async () => { await narr('분필 글씨. 아까는 분명 비어 있었다.'); await say('늦었네……?'); }) });
  add({ f: 2, x: 870, y: 610, label: '세면대', act: () => run(async () => { await narr('수도꼭지에서 물이 한 방울씩 떨어진다. 잠가도 멈추지 않는다.'); }) });

  /* ---- 3층 ---- */
  add({ f: 3, x: 158, y: 236, label: '내려가기', r: 50, act: () => goFloor(2, 'w') });
  add({ f: 3, x: 82, y: 236, label: '올라가기', r: 50, act: () => run(async () => { await narr('위로 가는 계단은 부서진 책상과 의자로 꽉 막혀 있다.'); await say('……다른 길을 찾아야 해.'); }) });
  add({ f: 3, x: 657, y: 402, label: '음악실 문', r: 36, when: () => !fl().musicKey, act: () => run(musicDoorEvent) });
  add({ f: 3, x: 536, y: 640, label: '비품 상자', when: () => !fl().musicKey, act: () => run(prepEvent) });
  add({ f: 3, x: 536, y: 760, label: '선반', when: () => !fl().pb3, act: () => run(async () => { fl().pb3 = true; await narr('선반 구석에 보조배터리 하나.'); S.battery = Math.min(100, S.battery + 35); A.unlock(); }) });
  add({ f: 3, x: 1256, y: 650, label: '이젤 위 그림', act: () => run(paintingEvent) });
  add({ f: 3, x: 704, y: 194, label: '피아노 위 공책', when: () => fl().musicKey, act: () => run(notebookEvent) });
  add({ f: 3, x: 640, y: 194, label: '피아노', when: () => fl().musicKey && !fl().pianoDone, act: () => run(pianoEvent) });
  add({ f: 3, x: 1226, y: 462, label: '방화셔터', r: 46, when: () => !fl().shutterOpen, act: () => run(shutterEvent) });
  add({ f: 3, x: 1294, y: 236, label: '올라가기', r: 50, act: () => goFloor(4, 'e', arrive4) });
  add({ f: 3, x: 1374, y: 236, label: '내려가기', r: 50, act: () => run(async () => { await narr('아래층 쪽은 방화셔터가 막고 있다.'); }) });

  /* ---- 4층 ---- */
  add({ f: 4, x: 1294, y: 236, label: '내려가기', r: 50, act: () => goFloor(3, 'e') });
  add({ f: 4, x: 158, y: 236, label: '서쪽 계단', r: 50, act: () => run(async () => { await narr('계단은 책상과 의자로 막혀 있다. 누군가 일부러 쌓아 놓은 것 같다.'); }) });
  add({ f: 4, x: 690, y: 630, label: '난간 아래', act: () => run(wellEvent) });
  add({ f: 4, x: 616, y: 160, label: '인체 모형', act: () => run(async () => { if (!fl().skel) { fl().skel = true; await narr('인체 모형이…… 들어올 때와 다른 쪽을 보고 있다.'); } else await narr('……문 쪽을 보고 있다.'); }) });
  add({ f: 4, x: 1376, y: 800, label: '천 덮인 조각상', act: () => run(async () => { if (!fl().cloth) { fl().cloth = true; await narr('천을 덮은 조각상들. 그중 하나만 키가 작다.'); await wait(500); await narr('……천이 바닥에 떨어져 있다. 그 아래는 비어 있다.'); } else await narr('빈 받침대.'); }) });
  add({ f: 4, x: 410, y: 124, label: '칠판', act: () => run(async () => { await note('<b>분필로 적힌 이름들</b>\n\n김ㅇㅇ　이ㅇㅇ　박ㅇㅇ\n최ㅇㅇ　정ㅇㅇ　한ㅇㅇ\n<span style="color:#999">──────  (지워짐)</span>', 'doc'); await say('……마지막 이름만 지워져 있어.'); }) });
  add({ f: 4, x: 1050, y: 236, label: '켜져 있는 컴퓨터', when: () => !fl().pc5, act: () => run(pc5Event) });
  add({ f: 4, x: 1352, y: 84, label: '옥상 문', r: 40, when: () => !fl().finale, act: () => run(roofEvent) });
  /* ---- 3층 피날레 경로 ---- */
}

/* ---------- 1층 이벤트 ---------- */
async function prologue() {
  S.lock = true; P.x = 330; P.y = 236; P.dir = 'down'; S.floor = 1; setLights(floorLights(1)); snapCam();
  S.drawP = true; S.torch = false;
  await wait(400);
  for (let i = 0; i < 4; i++) { A.click(.25, 0); await wait(500); }
  await fadeTo(0, 1600);
  await say('……망했다.'); await say('야자 때 너무 잤나?');
  showPhone();
  await narr('22:48 · 배터리 23% · 서비스 없음', { auto: 2600 });
  await say('근데…… 왜 아무도 안 깨웠지?');
  S.torch = true; A.click(.4, 0);
  S.lock = false;
  hint('<kbd>WASD</kbd>·<kbd>방향키</kbd> 이동　<kbd>E</kbd> 조사　<kbd>Shift</kbd> 달리기　<kbd>F</kbd> 손전등　<kbd>Tab</kbd> 메모', 8000);
  checkpoint();
  await say('……일단 가방부터 챙기고 집에 가자.', { auto: 2600 });
  setTimeout(() => { if (!S.flags.bag) hint('반짝이는 곳 가까이에서 <kbd>E</kbd> — 조사할 수 있다', 6000); }, 9000);
}
function showPhone() { ['phone', 'loc', 'items', 'menuBtn', 'goal', 'bagBtn'].forEach(i => $(i).classList.remove('hidden')); if (IS_TOUCH) $('touch').classList.remove('hidden'); }

async function officeDocEvent() {
  await note('<h4>분실물 · 비품 정리</h4>· 우산 / 체육복 / 학생증\n· 열쇠류\n\n<b>장기 미수령 물품 → 1층 창고 임시보관</b>\n\n<span style="color:#888">— 행정실</span>', 'doc');
  fl().officeDoc = true;
  await say('열쇠도 창고로 옮겼나?'); memo('열쇠류 → 1층 창고');
  await say('일단 가보자.', { auto: 900 });
  // ---- 최초의 숨기 ----
  fl().officeLock = true;
  S.orgelAmb = .05; await wait(1800); S.orgelAmb = 0;
  A.rattle(); S.shake = 2; await wait(900);
  A.rattle(); await wait(250); A.rattle(); S.shake = 3;
  await wait(500);
  for (let i = 0; i < 3; i++) { A.click(.4, .4); await wait(620); }
  await say('……누구 있어요?', { auto: 1300 });
  S.hideGlow = true; S.lock = false;
  hint('누군가 온다 — 빛나는 곳으로 가서 <kbd>E</kbd> <b>숨기</b>', 9000);
  const t0 = S.t;
  let nag = false;
  await waitUntil(() => { if (!nag && S.t - t0 > 10) { nag = true; A.rattle(); say('숨어야 돼……!', { auto: 1600 }); } return !!P.hidden; });
  S.hideGlow = false; S.lock = true; $('hint').classList.add('hidden');
  const spot = P.hidden;
  await wait(1500);
  A.creak();
  mSpawn(1, 1166, 540, 'script'); M.forceSafe = true; M.cfg = { react: 1, open: 0, vision: 200 };
  await mWalk(1166, 600, 34, true);
  await mWalk(1260, 612, 34);
  await wait(900);
  await mWalk(spot.x + (spot.x > 1300 ? -30 : 30), spot.y + 4, 30);
  M.dir = faceTo(M.x, M.y, spot.x, spot.y); M.state = 'idle';
  $('breath').classList.remove('hidden');
  await wait(2600);
  A.giggle(.5, 0);
  await wait(900);
  $('breath').classList.add('hidden');
  await mWalk(1366, 600, 36); await mWalk(1366, 520, 36, true);
  mOff(); M.forceSafe = false;
  S.orgelAmb = .05; await wait(2200); S.orgelAmb = 0;
  fl().officeLock = false; fl().hide1 = true; setTime('23:07');
  S.lock = false;
  hint('<kbd>E</kbd> 나오기', 3000);
  await waitUntil(() => !P.hidden);
  S.lock = true;
  await narr('바닥에 젖은 작은 발자국. 그리고…… 솜뭉치 하나.');
  await say('……뭐야.'); await say('애……? 이 시간에?');
  await narr('휴대폰을 본다. 배터리 23%.');
  await say('……손전등, 아껴 써야 해. 불 켜진 데선 꺼 두자.');
  fl().batteryOn = true;
  hint('<kbd>F</kbd> 손전등 끄기·켜기 — 이제부터 배터리가 닳는다', 6000);
  checkpoint();
}
async function storageEvent() {
  if (!fl().officeDoc) { await narr('열쇠가 잔뜩 든 상자. 태그는 다 처음 보는 곳들이다.'); return; }
  await narr('「열쇠류」 상자. 태그를 하나씩 확인한다.');
  await narr('과학실… 체육창고… 2-3… 비품실…', { auto: 2200 });
  await say('경비실은…… 없잖아.');
  await wait(300);
  await narr('상자 바닥에 공책 한 장이 끼어 있다.');
  await note('<span class="hand">현관 X\n뒤쪽 출입구 X\n경비실 X\n\n방송실 전화 확인</span>\n\n<span class="hand pen2">전화만 되면 신고할 수 있을 텐데.</span>', 'wet');
  await say('……뭐야 이거?'); await say('나 말고도 누가…… 못 나갔었나?');
  await narr('메모 옆에 열쇠 하나. 작은 태그에 「방송실」.');
  await say('방송실……');
  addItem('brKey', '방송실 열쇠'); fl().brKey = true; fl().memo1 = true;
  memo('누군가 먼저 갇혔었다? → 방송실 전화');
  checkpoint();
}
async function phoneEvent() {
  if (!fl().power) {
    A.click(.3, 0); await wait(400); await narr('……무음.'); A.knock(); await wait(500);
    await say('전화도 죽었어?'); fl().phoneDead = true;
    if (fl().bcVisit) await say('배전반부터 확인하자.');
    return;
  }
  if (fl().bc2Phone) return narr('신호음조차 들리지 않는다.');
  A.dial(); await wait(1400); await say('됐다……!');
  for (const k of [1, 1, 2]) { A.beep(700 + k * 120); await wait(260); }
  A.tone(425, 'sine', .12, .02, 4.5); await wait(1500);
  await narr('연결음이 이상하게 늘어진다—', { auto: 2200 });
  await wait(800); A.click(.6, 0);
  await narr('……뚝. 끊겼다.'); fl().bc2Phone = true;
  await say('……왜.');
}
async function consoleEvent() {
  if (!fl().power) {
    await narr('방송 콘솔. 버튼을 눌러도 아무 반응이 없다.');
    await note('<h4>방송실 설비 안내</h4>1. 전원 이상 시 <b>복도 배전반(동측 계단 앞)</b> 확인\n2. 차단기 복구 후 콘솔 재기동\n3. 외부 회선 문의: 행정실', 'doc');
    await say('차단기가 내려간 거야?'); fl().bcVisit = true; memo('방송실 전원 없음 → 복도 배전반(동쪽 끝)');
    return;
  }
  if (fl().broadcasted) return narr('스피커는 조용하다.');
  fl().broadcasted = true;
  await narr('콘솔에 불이 들어와 있다. 「전체 방송」 버튼.');
  A.click(.6, 0); await wait(600);
  S.orgelForce = .6; await wait(3800); S.orgelForce = 0;
  await say('……내가 튼 거 아니야.');
}
async function breakerEvent() {
  if (!fl().hide1) { await narr('배전반. 차단기가 전부 내려가 있다.'); await say('……괜히 건드리지 말자. 일단 나가는 게 먼저야.'); return; }
  S.resumeFn = 'breaker'; checkpoint();
  await narr('배전반 문을 연다. 차단기가 전부 내려가 있다.');
  A.clack(); S.shake = 3; await wait(700);
  fl().power = true;
  S.lights = corridorLights(false, 0);
  for (let i = CORR_X.length - 1; i >= 0; i--) { S.lights[i].on = true; S.lights[i].a = 0; A.clack(); await wait(380); }
  setLights(floorLights(1));
  // 서쪽 끝에 무언가
  mSpawn(1, 70, 466, 'idle'); M.dir = 'right'; M.cfg = { react: 1, open: 0, vision: 260 }; M.forceSafe = true;
  S.orgelForce = .45;
  cam.ov = [140, 440, 1.15];
  await wait(1800);
  ORGEL.beat = .6; await wait(1200); ORGEL.beat = .9; await wait(900); S.orgelForce = 0; S.orgelMute = true; ORGEL.stop(); ORGEL.beat = .42;
  await wait(1500);
  cam.ov = null; await wait(500);
  S.orgelMute = false;
  fl().chase1 = true;
  setState('chase'); M.chaseT = 0; M.last = [P.x, P.y]; A.stinger(); S.shake = 10;
  S.lock = false; S.busy = false;
  hint('도망쳐서 <b>숨어라</b>', 3500);
}
async function afterChase1() {
  M.forceSafe = false;
  await waitUntil(() => !S.busy);
  await run(async () => {
    M.state = 'leave'; M.offT = 0; M.path = findPath(1, M.x, M.y, 100, 300); M.leaveCb = null;
    await waitUntil(() => !M.on, 30000); mOff();
    setTime('23:21'); S.resumeFn = null;
    await wait(600);
    if (P.hidden) { S.lock = false; await waitUntil(() => !P.hidden, 30000); S.lock = true; }
    await say('진짜…… 있어.'); await say('방송실. 이제 전원은 들어왔을 거야.');
    checkpoint();
  });
}
async function pcEvent() {
  if (fl().bc2) return note(PC2, 'screen');
  await narr('컴퓨터 한 대가 켜져 있다. 바탕화면이 아니라 이미 열려 있는 문서 하나.');
  await note(PC2, 'screen');
  await say('이거…… 아까 그 메모랑 같은 사람이잖아.'); await say('신호…… 2층.');
  fl().bc2 = true; memo('2층 도서관 창가 → 신호?'); setTime('23:28');
  checkpoint();
  await wait(1500); A.click(.35, -.8);
}
const PC2 = '<div class="meta">메모장 — 제목 없음 · 마지막 수정 22:31</div>밖으로 연결 안 됨.\n방송도 안 됨.\n\n2층 도서관 창가에서 신호 한 칸 잡혔다.\n2층은 아직 다 못 봤다.\n\n계단 철문 열쇠는 이 방 책상 서랍에 넣어 뒀다.\n\n계단 쪽에서 또 봤다.';

/* ---------- 2층 ---------- */
async function arrive2() {
  if (fl().f2) return;
  fl().f2 = true; setTime('23:30'); checkpoint();
  await run(async () => { await wait(400); await say('2층…… 도서관 창가.'); });
}
async function windowEvent() {
  S.lock = false;
  showSay('신호를 찾는 중… 움직이지 마', true);
  const t0 = S.t; let moved = false;
  await waitUntil(() => { if (P.moving) moved = true; return moved || S.t - t0 > 3.5; });
  hideSay();
  if (moved) { await say('……움직이니까 다시 끊겼어.', { auto: 1500 }); return; }
  S.lock = true;
  S.signal = 1; A.vibrate(); await wait(600);
  await note('<div class="meta">메시지 → 엄마</div>엄마 나 학교에 갇혔어. 데리러 와줘\n\n<span style="color:#7aa">전송 중…</span>', 'screen');
  showSay('전송 중…', true);
  await wait(1500);
  A.thud(); S.shake = 4; await wait(500); hideSay();
  await say('……!');
  fl().signalTry = true;
  // 도서관으로 들어오는 그것
  if (!M.on) { mSpawn(2, 636, 540, 'script'); fl().f2spawned = true; S.spawnAt = 0; }
  M.cfg = { react: 1, open: .45, vision: 220 };
  S.signal = 0; await narr('전송 실패.', { auto: 1400 });
  await say('……안 가.', { auto: 1200 });
  if (M.on && (M.state === 'script' || M.state === 'idle')) { setState('suspicious'); mSetTarget(360, 805); }   // 책 떨어진 소리 쪽(창가)으로 찾아온다
  memo('도서관 창가 — 신호 한 칸. 문자 실패.');
  checkpoint();
}
async function bookEvent() {
  await narr('책장에 책 한 권이 거꾸로 꽂혀 있다. 꺼내 보니 여백에 글씨가 빼곡하다.');
  await note('<span class="hand">이걸 읽고 있는 사람이 있다면\n나처럼 여기 남겨진 거겠지.\n\n여기서는 발소리가 잘 안 들린다.\n책장 뒤에 붙어 있으면\n그게 그냥 지나갈 때가 있음.</span>');
  await note('<span class="hand">위로 갈수록 신호가 잡힌다. 옥상이면 될 거다.\n\n3층 계단 철문 잠겨 있음.\n교무실엔 열쇠 없었음.\n행정 쪽 기록 어딘가에 있을 텐데.</span>');
  fl().book3 = true; await say('……날 위해 남긴 거야?');
  memo('책장 뒤에 숨을 수 있다'); memo('위로 갈수록 신호 → 옥상'); memo('3층 철문 열쇠 → 행정 기록?');
  hint('이제 도서관 <b>책장 끝</b>에서 <kbd>E</kbd> 로 숨을 수 있다', 4500);
}
async function archiveEvent() {
  await narr('서류함을 하나씩 열어 본다.');
  await note('<h4>시설 관리 일지</h4>· 계단 철문 개폐 — 각 층 청소 담당\n· <b>열쇠: 2층 청소도구실 열쇠함 보관</b>\n· 방화셔터 수동 개폐 열쇠 — 음악과 비품 참조', 'doc');
  await note('<h4>음악과 비품 대여 기록</h4>· 음악실 예비 열쇠 / 악기장 열쇠\n· 공사 기간 중 <b>미술 준비실 임시 보관</b>\n\n<span style="color:#888">대여자: 음악 담당</span>', 'doc');
  fl().archive = true;
  await say('청소도구실……. 그리고 음악실 열쇠는 미술 준비실?');
  memo('계단 철문 열쇠 → 2층 청소도구실'); memo('음악실 열쇠 → 3층 미술 준비실');
}
async function janitorEvent() {
  if (!fl().archive) { await narr('작은 열쇠함. 태그가 빛바래서 뭐가 뭔지 모르겠다.'); return; }
  await narr('열쇠함 맨 아래 칸 — 「계단 철문」.');
  addItem('ironKey', '계단 철문 열쇠');
  await wait(400);
  // 불이 꺼진다
  fl().f2dark = true;
  for (let i = 0; i < S.lights.length; i++) { S.lights[i].on = false; A.clack(); await wait(220); }
  await wait(600);
  if (M.on) { M.x = 102; M.y = 430; setState('suspicious'); mSetTarget(P.x, P.y); }
  else { mSpawn(2, 102, 430, 'suspicious'); mSetTarget(P.x, P.y); }
  M.cfg = { react: .8, open: .45, vision: 230 };
  A.click(.8, -1); await wait(400); A.click(.8, -1);
  await say('……서쪽 계단 쪽이야.', { auto: 1600 });
  checkpoint();
}
// 2-3 교실 진입 이벤트는 트리거로 처리

/* ---------- 3층 ---------- */
async function arrive3() {
  if (fl().f3) return;
  fl().f3 = true; fl().f2done = true; setTime('23:43'); checkpoint();
  await run(async () => { await wait(600); await say('……피아노 소리?'); });
}
async function musicDoorEvent() {
  A.knock(); await wait(400);
  if (!fl().knocked) { fl().knocked = true; PIANO.stop(); await wait(600); await narr('……피아노 소리가 뚝 멈췄다.'); }
  A.rattle(); await say(fl().archive ? '잠겨 있다. 음악실 열쇠…… 미술 준비실.' : '잠겨 있다.');
  if (fl().archive) memo('음악실 열쇠 → 미술 준비실');
}
async function prepEvent() {
  if (!fl().archive) { await narr('비품 상자들. 뭘 찾아야 할지 모르겠다.'); return; }
  await narr('상자 사이로 고무줄에 묶인 열쇠 꾸러미. 태그에 「음악실」.');
  addItem('musicKey', '음악실 열쇠'); fl().musicKey = true; PIANO.stop();
  checkpoint();
}
async function paintingEvent() {
  if (!fl().paint1) { fl().paint1 = true; await narr('이젤 위 그림. 이 학교 복도다. 복도 끝에 작고 붉은 형체가 서 있다.'); }
  else { await narr('……아까보다 가까이 그려져 있다.'); await say('그림이…… 바뀌었어?'); }
}
async function notebookEvent() {
  await narr('피아노 위의 공책. 앞부분은 평범한 악보다.');
  await note('<span class="hand">그게 또 왔다.</span>');
  await note('<span class="hand">왜 날 쫓는 건지 모르겠다.</span>');
  await note('<span class="hand">이상하다.</span>');
  await note('<span class="hand">잡을 수 있었는데\n그냥 보고 갔다.</span>');
  await note('<span class="hand">마지막 장 — 악보 한 줄.\n\n♪　↑　→　←　↓　→</span>\n\n<span style="color:#777;font-size:13px">(오르골이랑…… 같은 멜로디다)</span>');
  fl().notebook = true; memo('악보: ↑ → ← ↓ →');
}
let miniActive = false, miniRes = null, miniIn = [];
function miniKey(k) {
  if (!KEY_NOTE[k]) { if (k === 'Escape') { /* 무시 */ } return; }
  const i = miniIn.length; if (i >= 5) return;
  const ok = PIANO_SEQ[i] === k; miniIn.push(ok);
  A.pianoN(KEY_NOTE[k] - 12, null, A.bus.sfx, 1);
  if (!ok) { A.dissonance(); noise(140); }
  const b = document.querySelector(`#mini .k[data-k="${k}"]`); b.classList.add(ok ? 'hit' : 'bad'); setTimeout(() => b.classList.remove('hit', 'bad'), 200);
  renderSlots();
  if (miniIn.length >= 5) setTimeout(() => { miniActive = false; $('mini').classList.add('hidden'); miniRes(miniIn.every(Boolean)); }, 700);
}
document.querySelectorAll('#mini .k').forEach(b => b.addEventListener('pointerdown', () => miniKey(b.dataset.k)));
function renderSlots() { $('miniSlots').innerHTML = [0, 1, 2, 3, 4].map(i => `<i class="${miniIn[i] === undefined ? '' : miniIn[i] ? 'ok' : 'no'}"></i>`).join(''); }
function pianoGame() { miniIn = []; renderSlots(); $('miniSeq').textContent = fl().notebook ? '악보: ↑ → ← ↓ →' : '건반을 눌러 보자'; $('mini').classList.remove('hidden'); miniActive = true; return new Promise(r => miniRes = r); }
async function pianoEvent() {
  if (!fl().notebook) { A.pianoN(69, null, A.bus.sfx, .8); await narr('피아노다. 공책이 하나 올려져 있다.'); return; }
  const good = await pianoGame();
  await wait(1200);
  mOff();
  // 문간에 서 있는 그것
  A.creak(); await wait(900);
  mSpawn(3, 657, 360, 'watch'); M.dir = 'up'; M.alpha = 1;
  cam.ov = [680, 290, 1.1, 120];
  await wait(1800);
  M.dir = 'down'; A.click(.3, 0);            // 천천히 이쪽(화면)을 돌아본다
  await wait(1800);
  A.giggle(.25, 0); await wait(900);
  await mWalk(657, 470, 40, true); mOff();
  cam.ov = null;
  await say('……왜 그냥 가?'); await say('메모랑 똑같아.');
  if (!good) await say('……틀렸는데도.');
  fl().pianoDone = true; setLights(floorLights(3));
  await narr('피아노 의자 덮개가 살짝 들려 있다. 안에 열쇠 하나 — 「방화셔터」.');
  addItem('shutterKey', '방화셔터 열쇠');
  memo('방화셔터 → 3층 복도 동쪽'); setTime('23:52');
  checkpoint();
}
async function shutterEvent() {
  if (!hasItem('shutterKey')) { A.rattle(); await narr('방화셔터가 복도를 막고 있다. 수동 개폐 열쇠 구멍이 있다.'); return; }
  A.unlock(); await wait(400); A.shutter(); S.shake = 6; noise(600);
  fl().shutterOpen = true;
  await wait(1600);
  await say('……안 와?'); await wait(500);
  await narr('오르골 소리가 들리지 않는다.');
  checkpoint();
}

/* ---------- 4층 ---------- */
async function arrive4() {
  if (fl().f4) return;
  fl().f4 = true; setTime('23:54'); checkpoint();
  await run(async () => { await wait(2500); await say('여기까지 온 거 아니었어?'); await say('……메모가 하나도 없어.'); });
}
async function wellEvent() {
  const sc = $('scene'), b = $('sceneBox');
  b.className = 'box well';
  let h = ''; for (let i = 0; i < 6; i++) { const s = 90 - i * 14; h += `<div class="sq" style="width:${s}vmin;height:${s * .8}vmin;opacity:${1 - i * .12}"></div>`; }
  h += `<div class="emb"></div><img class="doll" src="sprites/doll_up.png" id="wellDoll">`;
  b.innerHTML = h; sc.classList.remove('hidden');
  await narr('난간 아래로 4개 층이 뚫려 있다. 맨 아래, 1층 로비의 문장—');
  if (!fl().well) { await wait(400); await narr('문장 한가운데에 무언가 서서 위를 올려다보고 있다.'); A.giggle(.15, 0); }
  $('wellDoll') && ($('wellDoll').style.display = 'none');
  await wait(700); sc.classList.add('hidden');
  if (!fl().well) { fl().well = true; await say('……없어.'); }
}
async function pc5Event() {
  await narr('컴퓨터 한 대만 켜져 있다. 파일 하나.');
  await note('<div class="meta">마지막 기록.txt — 수정 23:59</div>옥상까지 가봤다.\n나가는 길은 아니었다.\n\n이제 알 것 같다.\n\n그건 우리를 쫓는 게 아니다.\n그건', 'screen');
  setTime('23:58'); fl().pc5 = true;
  await say('……23시 59분?'); await say('지금이 58분인데.');
  memo('옥상 — 동쪽 계단 위');
  checkpoint();
}
async function roofEvent() {
  if (!fl().pc5) { await narr('옥상 문. 키 보관함에서 비어 있던 「옥상」 열쇠가 꽂혀 있다.'); await say('……먼저 이 층을 둘러보자.'); return; }
  await narr('옥상 문에 열쇠가 꽂혀 있다. 키 보관함에서 비어 있던 그 열쇠.');
  A.creak(); await fadeTo(1, 700);
  const sc = $('scene'), b = $('sceneBox'); b.className = 'box roof'; b.innerHTML = '<div class="stars"></div><div class="city"></div><div class="rail"></div>';
  sc.classList.remove('hidden'); sc.style.background = '#000';
  await fadeTo(0, 900);
  A.setBus('hum', 0); A.setBus('drone', .1);
  setTime('00:00'); await wait(500);
  S.signal = 4; A.vibrate(); await wait(700);
  await narr('00:00 — 신호가 전부 잡혔다.');
  await note('<div class="meta">메시지 → 엄마</div>엄마 나 학교에 갇혔어. 데리러 와줘\n\n<span style="color:#7aa">전송됨</span>　<span style="color:#ffd65a">1</span>', 'screen');
  await say('……읽지를 않아.');
  await narr('난간 아래를 내려다본다.');
  await narr('1층 현관문이 열려 있다. 로비 불빛이 운동장으로 새어 나온다.');
  await say('열렸어……!');
  await fadeTo(1, 600); sc.classList.add('hidden');
  // 피날레 준비
  fl().finale = true; fl().frontOpen = true; S.floor = 4; P.x = 1296; P.y = 262; P.dir = 'down';
  setLights(floorLights(4)); snapCam();
  checkpoint(); S.cp.resume = 'finale';
  await fadeTo(0, 500);
  await finaleStart();
}
RESUME.finale = () => { run(finaleStart); };
async function finaleStart() {
  fl().finale = true; fl().frontOpen = true;
  S.lock = true;
  await say('……돌아가야 해. 1층으로.', { auto: 1300 });
  S.orgelMute = true; await wait(500);
  // 클로즈업 정면 노출
  A.stinger(); $('jump').classList.remove('hidden'); S.shake = 12;
  await wait(900); $('jump').classList.add('hidden');
  S.orgelMute = false;
  await say('……뛰어!', { auto: 700 });
  S.busy = false;
  startRunner();   // 4층 복도 → 계단 → 3층 → 계단 → 2층 → 계단 → 1층 → 현관
}
function finaleTriggers() {
  if (!fl().finale || fl().ending) return;
  if (S.floor === 1 && P.y > 864 && P.x > 612 && P.x < 802) { fl().ending = true; run(endingEvent); }
}

/* ---------- 엔딩 ---------- */
async function endingEvent() {
  S.lock = true;
  // 문 밖으로
  M.state = 'idle'; M.x = 707; M.y = 846; M.dir = 'down'; M.path = null;
  P.y = 900; S.orgelForce = 0; S.orgelMute = true; A.setBus('chase', 0, .1);
  const tgt = [707, 975];
  while (dist(P.x, P.y, tgt[0], tgt[1]) > 6) { const d = dist(P.x, P.y, tgt[0], tgt[1]); P.x += (tgt[0] - P.x) / d * 3; P.y += (tgt[1] - P.y) / d * 3; P.dir = 'down'; P.moving = true; P.bob += .5; await wait(16); }
  P.moving = false; P.dir = 'up'; cam.ov = [707, 920, 1.05];
  await wait(1200);
  await narr('돌아본다. 그것은 현관 문턱 안쪽에 멈춰 서 있다. 따라 나오지 않는다. 그냥…… 본다.');
  await wait(600);
  A.thud(); fl().frontOpen = false; mOff(); S.shake = 3;
  await narr('문이 저절로 닫힌다. 철컥.');
  A.setBus('drone', .05);
  await wait(1200);
  await say('……나왔다.'); await say('끝난 거…… 맞지?');
  await wait(800);
  A.vibrate(); $('phone').classList.add('buzz'); await wait(900);
  await note('<div class="meta">메시지 · 알 수 없는 번호 · 00:03</div>나갔어?', 'screen');
  await say('……누구야?');
  await wait(500);
  await narr('가방이 묘하게 무겁다.');
  const sc = $('scene'), b = $('sceneBox');
  b.className = 'box'; b.innerHTML = '<div class="bunny"></div>'; sc.classList.remove('hidden');
  await narr('가방 안에 — 토끼 인형. 솜이 터진 한쪽 눈.');
  b.className = 'box hand'; b.innerHTML = EMBLEM_SVG;
  await narr('가방을 쥔 손등에 푸른 무늬가 희미하게 떠오른다.');
  await narr('……학교 바닥의 그 문장과 닮았다.');
  b.className = 'box facade'; b.innerHTML = '<div class="wall">' + Array.from({ length: 18 }, (_, i) => `<div class="win ${i === 4 ? 'lit' : ''}">${i === 4 ? '<img src="sprites/doll_down.png">' : ''}</div>`).join('') + '</div>';
  await narr('학교를 올려다본다. 4층 창문 하나에, 작은 그림자가 붙어 서 있다.');
  b.innerHTML = ''; b.className = 'box'; sc.style.background = '#000';
  await wait(1400);
  S.orgelMute = false; S.orgelForce = .4; await wait(2600); S.orgelForce = 0; S.orgelMute = true;
  await wait(700); A.giggle(.9, 0); await wait(1600);
  b.className = 'box tbc'; b.innerHTML = '<div class="tbc"><h2>TO BE CONTINUED</h2><p>다음 챕터에서 계속</p><button class="btn" onclick="location.reload()">타이틀로</button></div>';
  A.setBus('drone', 0, 2); A.setBus('hum', 0);
  S.mode = 'end';
}
const EMBLEM_SVG = `<svg viewBox="0 0 200 200" fill="none" stroke="#9fd8ff" stroke-width="5" stroke-linecap="round">
<circle cx="100" cy="100" r="86" opacity=".7"/><circle cx="100" cy="100" r="74" opacity=".35" stroke-width="2"/>
<path d="M100 120 C100 90 100 70 100 44"/><path d="M100 70 C82 58 66 58 56 66 C70 76 86 78 100 74"/><path d="M100 70 C118 58 134 58 144 66 C130 76 114 78 100 74"/>
<path d="M100 54 C92 44 92 34 100 26 C108 34 108 44 100 54"/>
<circle cx="78" cy="132" r="15"/><circle cx="122" cy="132" r="15"/><circle cx="100" cy="150" r="15"/></svg>`;

/* ---------- 구역 트리거 ---------- */
function triggers() {
  const f = S.floor, r = roomName(f, P.x, P.y), key = f + r;
  const first = !S.visited[key]; if (first) S.visited[key] = 1;
  if (S.busy) return;
  if (f === 1 && r === '복도' && first && fl().bag) bark('일단 집에 가자.', 1800);
  if (f === 1 && r === '교무실' && !fl().officeIn) { fl().officeIn = true; fl().officeLit = true; setLights(floorLights(1)); run(async () => { await say('……문이 열려 있네?'); await narr('형광등이 절반만 켜져 있다. 책상마다 서류와 컵이 그대로다. 사람들이 갑자기 자리를 비운 것처럼.'); }); }
  if (f === 2 && r === '2-3 교실') {
    if (!fl().c23first) { fl().c23first = true; A.creak(); run(async () => { await narr('……책상이 전부 뒤쪽을 보고 있다.'); await say('누가 이렇게 해 놓은 거야.'); }); }
    else if (fl().c23left && !fl().c23second) { fl().c23second = true; run(async () => { await narr('책상들이 원래대로 돌아와 있다.'); await say('아까는…… 아니었는데.'); }); }
  }
  if (f === 2 && fl().c23first && r !== '2-3 교실') fl().c23left = true;
  finaleTriggers();
}

/* =========================================================
   메인 루프
   ========================================================= */
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  if (S.mode === 'runner') {
    if (!S.paused) { S.t += dt; tickTimers(); runUpdate(dt); updatePhone(); }
    runRender(dt);
  } else if (S.mode === 'play' || S.mode === 'end') {
    if (!S.paused) {
      S.t += dt;
      tickTimers();
      if (S.mode === 'play') {
        pUpdate(dt); mUpdate(dt); followUpdate(); directorUpdate(dt);
        ORGEL.tick(); PIANO.tick();
        triggers();
        // 상호작용 프롬프트
        let n = !S.lock && !dying ? nearest() : null;
        if (n && S.busy && !(n.hide || n.hideExit)) n = null;
        const pr = $('prompt');
        if (n) { pr.classList.remove('hidden'); $('pText').textContent = n.label; const alt = !!(n.hide || n.hideExit); pr.classList.toggle('alt', alt);
          const src = alt ? 'img/ui/p_locker_eyes.webp' : 'img/ui/c_key_e.webp'; if (!$('pKey').src.endsWith(src)) $('pKey').src = src; }
        else pr.classList.add('hidden');
        if (ePressed) { ePressed = false; if (n) n.act(); }
        // 숨 참기 UI
        const showB = P.hidden && breathPrompt() && !M.forceSafe;
        const bEl = $('breath');
        if (showB || (P.hidden && M.forceSafe && M.on)) { bEl.classList.remove('hidden'); $('bBar').style.width = P.breath * 100 + '%'; bEl.classList.toggle('hold', P.holding); bEl.classList.toggle('warn', P.breath < .25); }
        else if (!S.busy) bEl.classList.add('hidden');
        $('loc').innerHTML = `${FLOORS[S.floor].name}<b>${roomName(S.floor, P.hidden ? P.hidden.x : P.x, P.hidden ? P.hidden.y : P.y)}</b>`;
        updatePhone(); updateGoal(dt); markSeen();
        if (window.HORROR) HORROR.update(dt);
        if (window.DOORS) DOORS.update(dt);
      } else { ORGEL.tick(); }
      updateCam(dt);
    }
    render(dt);
  }
  if (!loop.manual) requestAnimationFrame(loop);
}
// 보조 틱: requestAnimationFrame이 멈춘 환경(일부 임베드 뷰 등)에서도 진행되도록
setInterval(() => { if (performance.now() - lastT > 60) { loop.manual = true; loop(performance.now()); loop.manual = false; } }, 16);

/* =========================================================
   타이틀 / 캐릭터 선택
   ========================================================= */
let selIdx = 1;
try { const s = localStorage.getItem('berry_char'); const i = CHARS.findIndex(c => c.id === s); if (i >= 0) selIdx = i; } catch (e) { }
function renderSelect() {
  const c = CHARS[selIdx];
  $('selImg').src = `img/${c.id}_full.png`; $('selName').textContent = c.en; $('selDesc').textContent = c.kr + (c.main ? ' · 메인 설정' : '');
  $('selGrid').innerHTML = CHARS.map((x, i) => `<button class="card ${i === selIdx ? 'on' : ''}" data-i="${i}" aria-label="${x.en}"><img src="img/${x.id}_face.png" alt="">${x.main ? '<span class="tag">MAIN</span>' : ''}</button>`).join('');
  $('selGrid').querySelectorAll('.card').forEach(b => b.addEventListener('click', () => { selIdx = +b.dataset.i; renderSelect(); A.init(); A.click(.3, 0); }));
}
function selectKey(e) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { selIdx = (selIdx + 1) % CHARS.length; renderSelect(); }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { selIdx = (selIdx + CHARS.length - 1) % CHARS.length; renderSelect(); }
  if (e.key === 'Enter' || e.key === ' ') $('bGo').click();
}
$('bStart').addEventListener('click', () => {
  A.init(); A.ctx.resume(); A.setBus('drone', .12, 1); A.click(.4, 0);
  stopTitleFx();
  $('title').classList.add('hidden'); $('select').classList.remove('hidden'); S.mode = 'select'; renderSelect();
});
$('bGo').addEventListener('click', async () => {
  if (S.mode !== 'select') return; S.mode = 'loading';
  const c = CHARS[selIdx]; S.char = c.id; try { localStorage.setItem('berry_char', c.id); } catch (e) { }
  $('select').classList.add('hidden'); $('fade').style.opacity = 1;
  await loadAll(c.id);
  buildInteractions();
  S.mode = 'play'; resize();
  if (DEV && devStart()) return;
  run(prologue);
});

/* 개발용 워프: ?dev&f=2 등 */
function devStart() {
  const m = location.search.match(/f=(\d)/); if (!m) return false;
  const f = +m[1]; const F = S.flags;
  Object.assign(F, { batteryOn: 1, bag: 1, front: 1, guard: 1, officeDoc: 1, hide1: 1, brKey: 1, bcVisit: 1, power: 1, chase1: 1, chase1Done: 1, bc2: 1 });
  S.items = [{ id: 'brKey', name: '방송실 열쇠' }, { id: 'stairKey1', name: '1층 계단 열쇠' }]; F.gate1Open = 1;
  if (f >= 3) { Object.assign(F, { f2: 1, signalTry: 1, book3: 1, archive: 1, ironOpen: 1, f2done: 1 }); S.items.push({ id: 'ironKey', name: '계단 철문 열쇠' }); }
  if (f >= 4) { Object.assign(F, { f3: 1, musicKey: 1, notebook: 1, pianoDone: 1, shutterOpen: 1 }); S.items.push({ id: 'shutterKey', name: '방화셔터 열쇠' }); }
  renderItems(); showPhone();
  S.floor = f; const a = f === 4 ? ARRIVE.e : ARRIVE.w; P.x = a[0]; P.y = a[1];
  if (f === 1) { P.x = 700; P.y = 460; }
  if (/run/.test(location.search)) { Object.assign(F, { finale: 1, frontOpen: 1, pc5: 1 }); S.floor = 1; setTimeout(startRunner, 300); }
  setLights(floorLights(f)); directorFloor(f); snapCam(); $('fade').style.opacity = 0; S.lock = false;
  if (f === 2) arrive2(); if (f === 3) arrive3(); if (f === 4) arrive4();
  checkpoint();
  window.S = S; window.P = P; window.M = M;
  return true;
}
if (DEV) { window.S = S; window.P = P; window.M = M; }

/* =========================================================
   부팅(로딩) 화면 → 애니메이션 타이틀
   ========================================================= */
const PRELOAD = ['img/logo.webp', 'img/title.jpg', 'img/title_p.jpg', 'img/closeup.png', 'img/icon.png',
  ...Object.values(MAPSRC),
  ...['down', 'up', 'side1', 'side2'].map(d => `sprites/doll_${d}.png`),
  ...CHARS.flatMap(c => [`img/${c.id}_face.png`, `img/${c.id}_full.png`, ...['down', 'up', 'side1', 'side2'].map(d => `sprites/${c.id}_${d}.png`)])];
let bootReady = false;
async function boot() {
  let done = 0; const t0 = performance.now();
  const set = () => { const p = Math.round(done / PRELOAD.length * 100); $('bootBar').style.width = p + '%'; $('bootPct').textContent = p; };
  await Promise.all(PRELOAD.map(src => new Promise(res => { const i = new Image(); i.onload = i.onerror = () => { done++; set(); res(); }; i.src = src; })));
  if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
  const min = 2600 - (performance.now() - t0); if (min > 0) await new Promise(r => setTimeout(r, min));
  $('bootTxt').innerHTML = 'READY'; $('bootPress').classList.remove('hidden'); bootReady = true;
}
function bootPress() {
  if (!bootReady || S.mode !== 'boot') return;
  S.mode = 'title';
  A.init(); A.ctx.resume(); A.setBus('drone', .1, 1.5); applyMute();
  A.clack(); setTimeout(() => A.clack(), 140);         // 형광등 켜지는 소리
  $('boot').classList.add('out');
  $('title').classList.remove('hidden');
  requestAnimationFrame(() => $('title').classList.add('show'));
  setTimeout(() => $('boot').classList.add('hidden'), 1000);
  startTitleFx();
}
$('boot').addEventListener('pointerdown', bootPress);

/* 타이틀 효과: 떠다니는 먼지 + 가끔 화면이 튀는 글리치 */
let dustRaf = 0, glitchT = 0;
function startTitleFx() {
  const c = $('dust'), g = c.getContext('2d');
  const fit = () => { c.width = innerWidth * DPR; c.height = innerHeight * DPR; };
  fit(); window.addEventListener('resize', fit);
  const N = Math.round(Math.min(90, innerWidth / 14));
  const ps = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), r: rnd(.6, 2.2), vx: rnd(-.006, .006), vy: rnd(-.012, -.002), a: rnd(.15, .6), ph: rnd(0, 6) }));
  let last = performance.now();
  const tick = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    g.clearRect(0, 0, c.width, c.height);
    for (const p of ps) {
      p.x += p.vx * dt + Math.sin(now / 1800 + p.ph) * .0004; p.y += p.vy * dt;
      if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); } if (p.x < -.02) p.x = 1.02; if (p.x > 1.02) p.x = -.02;
      const tw = .6 + .4 * Math.sin(now / 700 + p.ph);
      g.fillStyle = `rgba(200,215,255,${p.a * tw})`; g.beginPath(); g.arc(p.x * c.width, p.y * c.height, p.r * DPR, 0, 7); g.fill();
    }
    dustRaf = requestAnimationFrame(tick);
  };
  dustRaf = requestAnimationFrame(tick);
  const glitch = () => {
    const t = $('title'); t.classList.add('glitch'); if (A.ctx) A.noiseHit(.04, 2200, 1200, .08);
    setTimeout(() => t.classList.remove('glitch'), 120 + Math.random() * 90);
    glitchT = setTimeout(glitch, 6000 + Math.random() * 7000);
  };
  glitchT = setTimeout(glitch, 4500);
}
function stopTitleFx() { cancelAnimationFrame(dustRaf); clearTimeout(glitchT); }

resize();
requestAnimationFrame(loop);
if (DEV && /f=\d/.test(location.search)) { bootReady = true; bootPress(); } else boot();
