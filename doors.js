'use strict';
/* =========================================================
   DOORS — 문이 열리고 닫히는 연출
   지도 그림에 그려진 나무 문 40개 위에, 누가 다가가면 문짝이 안쪽으로 돌아 열리고
   지나가면 다시 닫히는 애니메이션을 겹친다. 잠긴 문은 열리지 않고 자물쇠가 보인다.
   그것이 문을 열면 멀리서도 끼이익 소리가 난다.
   (game.js 다음에 로드)
   ========================================================= */
const DOORS = (() => {
  // 통로(지도의 좁은 출입구) → 문 그림 위치. 북쪽 교실 줄은 벽면이 y 345~391,
  // 남쪽 줄은 540~581 (통로가 더 긴 문은 조금 아래)
  const list = {};
  for (const f in FLOORS) {
    list[f] = FLOORS[f].walk.filter(r => { const w = r.x2 - r.x1, h = r.y2 - r.y1; return w <= 50 && h >= 60 && h <= 110; }).map((r, i) => {
      const north = r.y1 < 400, long = r.y2 > 600;
      const top = north ? 345 : long ? 547 : 540, bot = north ? 391 : long ? 591 : 581;
      return { f: +f, r, gate: r.gate || null, x1: r.x1 - 1, x2: r.x2 + 1, top, bot, north, o: 0, hold: 0, hinge: i % 2 ? 1 : -1, was: 0, lockT: 0, bumpT: 0 };
    });
  }
  const usable = (d, who) => {
    if (d.gate && !gateOpen(d.f, d.gate, who)) return false;
    if (d.f === 3 && d.gate === 'doorB' && !gateMusic(d.f, who)) return false;
    return true;
  };
  // 문 앞 판정: 통로 사각형을 조금 넓힌 범위 안에 발이 있으면
  const near = (d, x, y, pad) => x > d.r.x1 - pad && x < d.r.x2 + pad && y > d.r.y1 - pad - 8 && y < d.r.y2 + pad;

  function sndOpen(d, loud) {
    if (!A.ctx) return; const pan = panOf((d.x1 + d.x2) / 2), v = loud ? 1 : .55;
    A.tone(rnd(150, 210), 'sawtooth', .045 * v, .12, .55, pan, null, null, rnd(95, 130));      // 경첩 끼익
    A.noiseHit(.12 * v, 1100, 500, .5, pan, 'bandpass');
    A.noiseHit(.25 * v, 2400, 1200, .04, pan, 'bandpass');                                     // 손잡이 철컥
  }
  function sndClose(d) { if (!A.ctx) return; const pan = panOf((d.x1 + d.x2) / 2); A.noiseHit(.55, 220, 80, .16, pan, 'lowpass'); A.noiseHit(.2, 2600, 1400, .03, pan, 'bandpass'); }
  function sndLocked(d) { if (!A.ctx) return; const pan = panOf((d.x1 + d.x2) / 2); for (let i = 0; i < 2; i++) { const w = A.t() + i * .1; A.noiseHit(.35, 2200, 900, .05, pan, 'bandpass', w); A.tone(300, 'square', .03, .001, .04, pan, null, w); } }

  function update(dt) {
    const L = list[S.floor]; if (!L) return;
    for (const d of L) {
      let want = false, byM = false;
      if (!P.hidden && near(d, P.x, P.y, 14)) {
        if (usable(d, 'p')) want = true;
        else if (P.moving && S.t > d.bumpT) { d.bumpT = S.t + 1.6; d.lockT = S.t + 1.6; sndLocked(d); }   // 잠긴 문을 밀었다
      }
      if (M.on && M.floor === S.floor && near(d, M.x, M.y, 16) && usable(d, 'm')) { want = true; byM = true; }
      if (want) d.hold = .7; else d.hold -= dt;
      const tgt = d.hold > 0 ? 1 : 0;
      const prev = d.o;
      d.o = tgt ? Math.min(1, d.o + dt * 3.2) : Math.max(0, d.o - dt * 2.4);
      if (prev === 0 && d.o > 0) {
        const far = byM && !onScreen((d.x1 + d.x2) / 2, d.top, 0);
        sndOpen(d, byM);
        if (byM && typeof caption === 'function') caption(far ? '[어디선가 문이 천천히 열린다]' : '[문이 열린다]', 2000);
        d.byM = byM;
      }
      if (prev > 0 && d.o === 0) sndClose(d);
    }
  }

  function draw() {
    const L = list[S.floor]; if (!L) return;
    const map = IMG['map' + S.floor]; if (!map) return;
    const k = map.width / MW;
    for (const d of L) {
      const w = d.x2 - d.x1, h = d.bot - d.top;
      // 잠긴 문: 가까이 가면 자물쇠
      const locked = !usable(d, 'p');
      if (locked && d.o === 0) continue;   // 자물쇠는 drawTop에서 (캐릭터보다 위에)
      if (d.o <= 0) continue;
      const e = d.o < .5 ? 2 * d.o * d.o : 1 - Math.pow(-2 * d.o + 2, 2) / 2;   // ease
      ctx.save();
      // 문 너머 어둠 (교실 안쪽)
      const g = ctx.createLinearGradient(0, d.top, 0, d.bot);
      g.addColorStop(0, 'rgba(4,5,10,1)'); g.addColorStop(.75, 'rgba(10,12,22,.97)'); g.addColorStop(1, 'rgba(26,28,40,.92)');
      ctx.globalAlpha = Math.min(1, e * 1.6); ctx.fillStyle = g; ctx.fillRect(d.x1 + 1, d.top, w - 2, h);
      // 바닥으로 새어 나오는 희미한 빛줄기 (그것이 열었을 땐 붉게)
      if (d.byM) { ctx.globalAlpha = e * .35; ctx.fillStyle = 'rgba(120,10,24,1)'; ctx.fillRect(d.x1 + 3, d.bot - 4, w - 6, 4); }
      ctx.globalAlpha = 1;
      // 문짝: 경첩 쪽을 기준으로 좁아지며 안으로 돈다
      const lw = w * (1 - e * .82), hx = d.hinge < 0 ? d.x1 : d.x2 - lw;
      const skew = e * h * .08;
      ctx.beginPath();
      if (d.hinge < 0) { ctx.moveTo(d.x1, d.top); ctx.lineTo(d.x1 + lw, d.top + skew); ctx.lineTo(d.x1 + lw, d.bot - skew * .4); ctx.lineTo(d.x1, d.bot); }
      else { ctx.moveTo(d.x2, d.top); ctx.lineTo(d.x2 - lw, d.top + skew); ctx.lineTo(d.x2 - lw, d.bot - skew * .4); ctx.lineTo(d.x2, d.bot); }
      ctx.closePath(); ctx.clip();
      ctx.drawImage(map, d.x1 * k, d.top * k, w * k, h * k, hx, d.top, lw, h);
      // 돌아갈수록 그늘
      ctx.fillStyle = `rgba(0,0,0,${e * .55})`; ctx.fillRect(hx, d.top, lw, h);
      ctx.restore();
      // 문짝 모서리 하이라이트
      ctx.save(); ctx.strokeStyle = `rgba(230,200,150,${.35 * e})`; ctx.lineWidth = .8;
      const ex = d.hinge < 0 ? d.x1 + lw : d.x2 - lw;
      ctx.beginPath(); ctx.moveTo(ex, d.top + skew); ctx.lineTo(ex, d.bot - skew * .4); ctx.stroke(); ctx.restore();
    }
  }
  function drawTop() {
    const L = list[S.floor]; if (!L || P.hidden) return;
    for (const d of L) {
      if (d.o > 0 || usable(d, 'p')) continue;
      const cx = (d.x1 + d.x2) / 2, pd = dist(cx, d.north ? d.bot + 20 : d.top - 10, P.x, P.y), bump = d.lockT > S.t;
      const a = Math.max(clamp(1 - pd / 130, 0, 1) * .85, bump ? 1 : 0);
      if (a <= .02) continue;
      lock(cx, d.top + 8, a, bump);
      if (bump) {
        const t = 1 - (d.lockT - S.t) / 1.6;
        ctx.save(); ctx.globalAlpha = Math.min(1, (1 - t) * 2); ctx.font = '600 9px Pretendard'; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(cx - 24, d.top - 15 - t * 6, 48, 13);
        ctx.fillStyle = '#f1e6c8'; ctx.fillText('잠겨 있다', cx, d.top - 5.5 - t * 6); ctx.restore();
      }
    }
  }
  function lock(x, y, a, shake) {
    if (shake) x += Math.sin(S.t * 60) * .8;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(8,8,14,.7)'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
    ctx.strokeStyle = '#e9d9a8'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y - 1.5, 2.6, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#e9d9a8'; ctx.fillRect(x - 3.6, y - 1.5, 7.2, 5.4);
    ctx.fillStyle = '#2a2230'; ctx.fillRect(x - .5, y + .2, 1, 2.2);
    ctx.restore();
  }
  function reset() { for (const f in list) for (const d of list[f]) { d.o = 0; d.hold = 0; } }
  return { list, update, draw, drawTop, reset };
})();
window.DOORS = DOORS;
