'use strict';
/* =========================================================
   MOBILE — 휴대폰 가로 플레이
   · 세로로 들면 「가로로 돌려 주세요」 화면 + 게임 자동 일시정지
   · 시작할 때 전체 화면 + 가로 고정 시도 (안드로이드 크롬)
   · 왼쪽 절반 아무 데나 엄지를 대면 그 자리에 조이스틱이 생긴다
   · 오른쪽 버튼: 조사(길게 = 숨 참기) · 달리기 · 손전등, 마지막 추격에선 「점프」
   (meta.js 다음에 로드)
   ========================================================= */
(() => {
  const touch = IS_TOUCH || ('ontouchstart' in window && matchMedia('(hover:none)').matches);
  document.body.classList.toggle('touch', touch);
  if (!touch) return;

  /* ---- 세로 → 가로 안내 ---- */
  const rot = $('rotate'), portrait = matchMedia('(orientation: portrait)');
  function checkRot() {
    const p = portrait.matches && S.mode !== 'boot';
    rot.classList.toggle('hidden', !p);
    if (p && (S.mode === 'play' || S.mode === 'runner') && !S.paused && !dying && !bagOpen) togglePause();
  }
  portrait.addEventListener ? portrait.addEventListener('change', checkRot) : portrait.addListener(checkRot);
  window.addEventListener('resize', checkRot);
  setInterval(checkRot, 1000);

  /* ---- 전체 화면 + 가로 고정 (첫 터치 때, 그리고 게임 시작 때) ---- */
  function goLandscape() {
    const el = document.documentElement;
    const fs = !document.fullscreenElement && (el.requestFullscreen || el.webkitRequestFullscreen);
    const p = fs ? Promise.resolve(fs.call(el, { navigationUI: 'hide' })).catch(() => { }) : Promise.resolve();
    p.then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } });
  }
  ['bGo'].forEach(id => $(id).addEventListener('click', goLandscape, true));
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#mCont,#wGo,#wCalm')) goLandscape(); }, true);

  /* ---- 좀비고 스타일 고정 방향 패드 ---- */
  $('stick').style.display = 'none';
  const pad = document.createElement('div'); pad.id = 'dpad';
  const ARW = 'M0 -9 L8 4 L-8 4 Z';
  pad.innerHTML = `<svg viewBox="-100 -100 200 200" aria-hidden="true">
    <circle r="96" class="ring"/><circle r="84" class="base"/>
    ${['up', 'right', 'down', 'left'].map((d, i) => `<g class="w w-${d}" transform="rotate(${i * 90})"><path d="M-27 -30 Q-27 -78 0 -80 Q27 -78 27 -30 L0 -6 Z" class="wb"/><path d="${ARW}" class="ar" transform="translate(0 -52)"/></g>`).join('')}
    <circle r="22" class="hub"/><circle r="9" class="dot"/></svg>`;
  $('touch').appendChild(pad);
  const ws = ['up', 'right', 'down', 'left'].map(d => pad.querySelector('.w-' + d));
  let pid = null;
  function padMove(e) {
    const r = pad.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width * .42;
    let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy);
    if (l < R * .14) { T.active = false; T.x = T.y = 0; ws.forEach(w => w.classList.remove('on')); pad.querySelector('.dot').setAttribute('transform', ''); return; }
    const k = Math.min(1, l / R); T.x = dx / l * k; T.y = dy / l * k; T.active = true;
    T.autoRun = l > R * 1.25;                                   // 패드 바깥까지 밀면 달리기
    const a = Math.atan2(dy, dx), deg = (a * 180 / Math.PI + 450) % 360;   // 0 = 위
    ws.forEach((w, i) => { const c = i * 90, dd = Math.abs(((deg - c + 540) % 360) - 180); w.classList.toggle('on', dd < 58); });
    const m = Math.min(l, R * .55); pad.querySelector('.dot').setAttribute('transform', `translate(${dx / l * m / r.width * 200} ${dy / l * m / r.width * 200})`);
  }
  pad.addEventListener('pointerdown', e => {
    if (pid !== null) return; pid = e.pointerId; pad.setPointerCapture(pid); pad.classList.add('live'); padMove(e);
    if (advanceWaiters.length) pressAdvance();
  });
  pad.addEventListener('pointermove', e => { if (e.pointerId === pid) padMove(e); });
  const padEnd = e => { if (e.pointerId !== pid) return; pid = null; pad.classList.remove('live'); T.active = false; T.x = T.y = 0; T.autoRun = false; ws.forEach(w => w.classList.remove('on')); pad.querySelector('.dot').setAttribute('transform', ''); };
  pad.addEventListener('pointerup', padEnd); pad.addEventListener('pointercancel', padEnd);
  // 왼쪽 빈 화면을 톡 치면 대사 넘기기
  const zone = document.createElement('div'); zone.id = 'tzone'; $('touch').prepend(zone);
  zone.addEventListener('pointerdown', () => { if (advanceWaiters.length) pressAdvance(); });

  /* ---- 오른쪽 둥근 버튼 (빨간 테두리) + 가방 ---- */
  const bag = document.createElement('button'); bag.id = 'tBag'; bag.setAttribute('aria-label', '가방');
  $('tbtns').appendChild(bag);
  bag.addEventListener('pointerdown', e => { e.preventDefault(); toggleBag(); });
  for (const b of ['tE', 'tRun', 'tF', 'tBag']) {
    const el = $(b);
    el.addEventListener('pointerdown', () => { el.classList.add('down'); if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) { } });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, () => el.classList.remove('down')));
  }

  /* ---- 키보드 안내 대신 터치 안내 ---- */
  const _hint = hint;
  hint = function (html, ms) {
    if (/WASD/.test(html)) html = '왼쪽 <b>방향 패드</b>로 이동 · 바깥까지 밀면 <b>달리기</b><br>오른쪽 <b>손</b> 버튼으로 조사 · 숨은 채로 <b>길게</b> 누르면 숨 참기';
    html = html.replace(/<kbd>E<\/kbd>/g, '<b>조사</b> 버튼').replace(/<kbd>F<\/kbd>/g, '<b>손전등</b> 버튼').replace(/<kbd>Shift<\/kbd>/g, '<b>달리기</b>');
    return _hint(html, ms);
  };

  /* ---- 버튼 모양 · 마지막 추격 ---- */
  const face = (ic, t) => `<i><img src="img/ui/${ic}.webp" alt=""></i><span>${t}</span>`;
  $('tE').innerHTML = face('p_hand', '조사');
  $('tRun').innerHTML = face('p_door_open', '달리기');
  $('tF').innerHTML = face('p_flashlight', '손전등');
  bag.innerHTML = face('p_bag', '가방');
  let lastMode = '';
  setInterval(() => {
    const m = S.mode === 'runner' ? 'runner' : 'play';
    if (m === lastMode) {
      // 숨어 있을 땐 버튼 이름이 「숨 참기」/「나오기」로
      if (m === 'play') {
        const lab = P.hidden ? (breathPrompt() ? '숨 참기' : '나오기') : ($('prompt').classList.contains('hidden') ? '조사' : ($('pText').textContent || '조사').replace(/^숨기 · .*/, '숨기'));
        const sp = $('tE').querySelector('span'); if (sp.textContent !== lab) sp.textContent = lab.length > 6 ? lab.slice(0, 6) + '…' : lab;
        $('tE').classList.toggle('hot', !$('prompt').classList.contains('hidden') || !!P.hidden);
        const want = P.hidden || /^숨기/.test(lab) ? 'p_locker_eyes' : 'p_hand', im = $('tE').querySelector('img');
        if (!im.src.endsWith(want + '.webp')) im.src = `img/ui/${want}.webp`;
        $('tF').classList.toggle('on', !!S.torch);
      }
      return;
    }
    lastMode = m;
    document.body.classList.toggle('t-runner', m === 'runner');
    $('tE').querySelector('span').textContent = m === 'runner' ? '점프' : '조사';
    $('tE').querySelector('img').src = m === 'runner' ? 'img/ui/p_arrow_next.webp' : 'img/ui/p_hand.webp';
  }, 150);
  // 달리기 버튼 상태 표시
  $('tRun').addEventListener('pointerdown', () => setTimeout(() => $('tRun').classList.toggle('on', !!T.run), 0));
})();
