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

  /* ---- 떠다니는 조이스틱 ---- */
  const zone = document.createElement('div'); zone.id = 'tzone'; $('touch').prepend(zone);
  const st = $('stick'), knob = st.querySelector('i');
  st.style.pointerEvents = 'none';
  const home = () => { st.classList.remove('live'); st.style.left = ''; st.style.top = ''; st.style.bottom = ''; knob.style.transform = ''; };
  let pid = null, cx = 0, cy = 0;
  const R = 52;
  function move(e) {
    let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    T.x = dx / R; T.y = dy / R; T.active = Math.hypot(T.x, T.y) > .12;
    // 끝까지 밀면 자동으로 달리기 (달리기 버튼을 켜 두지 않았을 때)
    T.autoRun = l > R * 1.45;
    knob.style.transform = `translate(${dx}px,${dy}px)`;
  }
  zone.addEventListener('pointerdown', e => {
    if (pid !== null || S.mode === 'runner') return;
    pid = e.pointerId; zone.setPointerCapture(pid);
    cx = e.clientX; cy = e.clientY;
    st.classList.add('live'); st.style.left = (cx - st.offsetWidth / 2) + 'px'; st.style.top = (cy - st.offsetHeight / 2) + 'px'; st.style.bottom = 'auto';
    T.active = false; T.x = T.y = 0;
    if (advanceWaiters.length) pressAdvance();     // 대사 넘기기도 된다
  });
  zone.addEventListener('pointermove', e => { if (e.pointerId === pid) move(e); });
  const end = e => { if (e.pointerId !== pid) return; pid = null; T.active = false; T.x = T.y = 0; T.autoRun = false; home(); };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);

  /* ---- 키보드 안내 대신 터치 안내 ---- */
  const _hint = hint;
  hint = function (html, ms) {
    if (/WASD/.test(html)) html = '왼쪽 화면을 끌어서 <b>이동</b> · 끝까지 밀면 <b>달리기</b><br>오른쪽 <b>조사</b> 버튼 · 숨은 채로 <b>길게</b> 누르면 숨 참기';
    html = html.replace(/<kbd>E<\/kbd>/g, '<b>조사</b> 버튼').replace(/<kbd>F<\/kbd>/g, '<b>손전등</b> 버튼').replace(/<kbd>Shift<\/kbd>/g, '<b>달리기</b>');
    return _hint(html, ms);
  };

  /* ---- 버튼 모양 · 마지막 추격 ---- */
  $('tE').innerHTML = '<img src="img/ui/c_hand_reach.webp" alt=""><span>조사</span>';
  $('tRun').innerHTML = '<img src="img/ui/c_key_shift.webp" alt=""><span>달리기</span>';
  $('tF').innerHTML = '<img src="img/ui/c_flashlight_on.webp" alt=""><span>손전등</span>';
  let lastMode = '';
  setInterval(() => {
    const m = S.mode === 'runner' ? 'runner' : 'play';
    if (m === lastMode) {
      // 숨어 있을 땐 버튼 이름이 「숨 참기」/「나오기」로
      if (m === 'play') {
        const lab = P.hidden ? (breathPrompt() ? '숨 참기' : '나오기') : ($('prompt').classList.contains('hidden') ? '조사' : ($('pText').textContent || '조사').replace(/^숨기 · .*/, '숨기'));
        const sp = $('tE').querySelector('span'); if (sp.textContent !== lab) sp.textContent = lab.length > 6 ? lab.slice(0, 6) + '…' : lab;
        $('tE').classList.toggle('hot', !$('prompt').classList.contains('hidden') || !!P.hidden);
      }
      return;
    }
    lastMode = m;
    document.body.classList.toggle('t-runner', m === 'runner');
    $('tE').querySelector('span').textContent = m === 'runner' ? '점프' : '조사';
  }, 150);
  // 달리기 버튼 상태 표시
  $('tRun').addEventListener('pointerdown', () => setTimeout(() => $('tRun').classList.toggle('on', !!T.run), 0));
})();
