/* 바이오 퍼즐 패밀리 — 공통 엔진: 캔버스, 스케일, 입력, 씬 관리, 루프 */
(function () {
  'use strict';
  const W = 1280, H = 720;
  const BPF = window.BPF = window.BPF || {};
  BPF.W = W; BPF.H = H;
  BPF.FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  BPF.time = 0;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  BPF.canvas = canvas; BPF.ctx = ctx;
  let scale = 1, dpr = 1;

  // 모바일(터치) 기기 판단 — 주소에 ?touch=1 을 붙이면 PC에서도 터치 버튼을 볼 수 있다
  BPF.isTouch = /[?&]touch=1/.test(location.search) || (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vv = window.visualViewport;
    const vw = vv ? vv.width : window.innerWidth, vh = vv ? vv.height : window.innerHeight;
    // 세로로 들고 있으면 '가로로 돌려 주세요' 안내
    const rot = document.getElementById('rotateHint');
    if (rot) rot.style.display = (BPF.isTouch && vh > vw * 1.05) ? 'flex' : 'none';
    scale = Math.min(vw / W, vh / H);
    const cw = Math.floor(W * scale), ch = Math.floor(H * scale);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    canvas.width = Math.floor(cw * dpr); canvas.height = Math.floor(ch * dpr);
    BPF.viewScale = scale;
    if (BPF.ui && BPF.ui.layoutInput) BPF.ui.layoutInput();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  resize();

  /* ---------- 입력 ---------- */
  const Input = BPF.Input = {
    down: {}, pressed: {}, mx: -1, my: -1, mdown: false,
    clicked: false, cx: 0, cy: 0,          // 클릭(눌렀다 뗀 위치)
    pressedMouse: false, px: 0, py: 0,     // 누른 순간
    released: false, rx: 0, ry: 0,
    wheel: 0, consumed: false, lastDevice: 'mouse',
    key(k) { return !!this.pressed[k]; },
    held(k) { return !!this.down[k]; },
    any(...ks) { return ks.some(k => this.pressed[k]); },
    anyHeld(...ks) { return ks.some(k => this.down[k]); },
    confirm() { return this.any('Space', 'KeyZ', 'Enter', 'NumpadEnter'); },
    consume() { this.clicked = false; this.pressedMouse = false; this.consumed = true; },
    // 화면 터치 버튼(가상 키): 매 프레임 그릴 때 등록 → 손가락으로 누르면 해당 키가 눌린 것으로 처리
    vkeys: [], vkeysLast: [], vptr: {},
    endFrame() {
      this.vkeysLast = this.vkeys; this.vkeys = [];
      this.pressed = {}; this.clicked = false; this.pressedMouse = false; this.released = false;
      this.wheel = 0; this.consumed = false;
    }
  };
  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
  }
  const BLOCK = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Tab'];
  window.addEventListener('keydown', e => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Escape') Input.pressed[e.code] = true;
      return;
    }
    if (BLOCK.includes(e.code)) e.preventDefault();
    if (!Input.down[e.code]) Input.pressed[e.code] = true;
    Input.down[e.code] = true; Input.lastDevice = 'key';
    BPF.audio && BPF.audio.unlock();
  });
  window.addEventListener('keyup', e => { Input.down[e.code] = false; });
  window.addEventListener('blur', () => { Input.down = {}; Input.mdown = false; });
  canvas.addEventListener('pointermove', e => { [Input.mx, Input.my] = toLogical(e); Input.lastDevice = 'mouse'; });
  canvas.addEventListener('pointerdown', e => {
    canvas.focus();
    BPF.audio && BPF.audio.unlock();
    if (e.pointerType === 'touch') BPF.isTouch = true;
    // 가상 키를 눌렀으면 키보드처럼 처리하고 클릭으로는 쓰지 않는다 (여러 손가락 동시 가능)
    { const [lx, ly] = toLogical(e); const vk = Input.vkeysLast.find(k => lx >= k.x && lx <= k.x + k.w && ly >= k.y && ly <= k.y + k.h);
      if (vk) { Input.vptr[e.pointerId] = vk.code; if (!Input.down[vk.code]) Input.pressed[vk.code] = true; Input.down[vk.code] = true; Input.lastDevice = 'key'; e.preventDefault(); return; } }
    [Input.mx, Input.my] = toLogical(e);
    Input.mdown = true; Input.pressedMouse = true; Input.px = Input.mx; Input.py = Input.my;
    Input.lastDevice = 'mouse';
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    BPF.audio && BPF.audio.unlock();
  });
  const vRelease = e => { const c = Input.vptr[e.pointerId]; if (c) { delete Input.vptr[e.pointerId]; if (!Object.values(Input.vptr).includes(c)) Input.down[c] = false; return true; } return false; };
  canvas.addEventListener('pointercancel', e => { vRelease(e); Input.mdown = false; });
  canvas.addEventListener('pointerup', e => {
    if (vRelease(e)) return;
    [Input.mx, Input.my] = toLogical(e);
    Input.mdown = false; Input.released = true; Input.rx = Input.mx; Input.ry = Input.my;
    Input.clicked = true; Input.cx = Input.mx; Input.cy = Input.my;
  });
  canvas.addEventListener('pointerleave', () => { if (!Input.mdown) { Input.mx = -1; Input.my = -1; } });
  // 첫 터치·키 입력 때 소리 잠금 해제(브라우저 자동 재생 정책)
  ['pointerdown', 'keydown', 'touchend'].forEach(t => window.addEventListener(t, () => { if (BPF.audio) BPF.audio.unlock(); }, true));
  // 모바일: 길게 눌러 생기는 메뉴·확대·스크롤 막기
  ['touchstart', 'touchmove'].forEach(t => canvas.addEventListener(t, e => e.preventDefault(), { passive: false }));
  document.addEventListener('gesturestart', e => e.preventDefault());
  canvas.addEventListener('wheel', e => { Input.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  /* ---------- 유틸 ---------- */
  BPF.rand = (a, b) => a + Math.random() * (b - a);
  BPF.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  BPF.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  BPF.shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  BPF.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  BPF.lerp = (a, b, t) => a + (b - a) * t;
  BPF.inRect = (x, y, r) => x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;
  BPF.ease = t => 1 - Math.pow(1 - t, 3);
  BPF.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /* ---------- 씬 관리 ---------- */
  BPF.scenes = {};
  BPF.scene = null; BPF.sceneName = '';
  let fade = 0, fadeDir = 0, pending = null;
  BPF.go = function (name, params) {
    if (!BPF.scenes[name]) { console.error('scene 없음', name); return; }
    if (BPF.audio && BPF.audio.prepare) {
      const modes = { title:'main', playerSelect:'main', gamecenter:'main', village:'town', lab:'town', shop:'town', farm:'farm', adopt:'farm', album:'farm', codex:'codex', festival:'ending' };
      const mode = name === 'play' ? 'game:' + (params && params.id || '') : modes[name];
      if (mode) BPF.audio.prepare(mode);
    }
    pending = { name, params: params || {} };
    fadeDir = 1;
    if (BPF.save && BPF.save.data && BPF.save.data.settings.reduceMotion) fade = 1;
  };
  function switchNow() {
    const { name, params } = pending; pending = null;
    if (BPF.scene && BPF.scene.exit) { try { BPF.scene.exit(); } catch (e) { console.error(e); } }
    if (BPF.ui) { BPF.ui.hideInput(); BPF.ui.modal = null; }
    BPF.scene = BPF.scenes[name]; BPF.sceneName = name;
    BPF.scene.t = 0;
    try { BPF.scene.enter && BPF.scene.enter(params); } catch (e) { console.error(e); BPF.toast('화면 오류: ' + e.message); }
    fadeDir = pending ? 1 : -1; // enter 안에서 다른 화면으로 넘긴 경우 바로 이어서 전환
  }

  /* ---------- 토스트 ---------- */
  const toasts = [];
  BPF.toast = function (msg, color) { toasts.push({ msg, t: 0, color: color || '#3a2a6b' }); if (toasts.length > 4) toasts.shift(); };

  /* ---------- 루프 ---------- */
  let last = performance.now();
  BPF.errorCount = 0;
  function frame(now) {
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    BPF.time += dt;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    canvas.style.cursor = 'default';
    try {
      if (BPF.scene) {
        BPF.scene.t = (BPF.scene.t || 0) + dt;
        if (!pending) BPF.scene.update && BPF.scene.update(dt);
        BPF.scene.draw && BPF.scene.draw(ctx);
      }
    } catch (e) {
      BPF.errorCount++;
      console.error(e);
      if (BPF.errorCount < 5) BPF.toast('오류가 발생했어요: ' + e.message, '#b03040');
    }
    // 페이드
    if (fadeDir !== 0) {
      fade += dt * 5 * fadeDir;
      if (fadeDir > 0 && fade >= 1) { fade = 1; if (pending) switchNow(); }
      if (fadeDir < 0 && fade <= 0) { fade = 0; fadeDir = 0; }
    }
    if (fade > 0) { ctx.fillStyle = `rgba(27,22,54,${fade})`; ctx.fillRect(0, 0, W, H); }
    // 토스트
    for (let i = toasts.length - 1; i >= 0; i--) {
      const t = toasts[i]; t.t += dt;
      if (t.t > 3) { toasts.splice(i, 1); continue; }
    }
    toasts.forEach((t, i) => {
      const a = Math.min(1, (3 - t.t) * 3, t.t * 6);
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = `bold 20px ${BPF.FONT}`;
      const w = ctx.measureText(t.msg).width + 40;
      const y = 82 + i * 46;
      BPF.ui.round(ctx, W / 2 - w / 2, y, w, 38, 19, t.color, '#fff', 3);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t.msg, W / 2, y + 20);
      ctx.restore();
    });
    Input.endFrame();
    requestAnimationFrame(frame);
  }
  BPF.start = function (first) { BPF.go(first); fade = 1; requestAnimationFrame(frame); };
})();
