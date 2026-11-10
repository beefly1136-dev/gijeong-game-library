/* 공통 UI 그리기 도우미 — 2000년대 캐주얼 게임풍 굵은 외곽선·바운스 */
(function () {
  'use strict';
  const BPF = window.BPF;
  const I = BPF.Input;
  const ui = BPF.ui = {};

  ui.path = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  ui.round = function (ctx, x, y, w, h, r, fill, stroke, lw) {
    ui.path(ctx, x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw || 3; ctx.strokeStyle = stroke; ctx.stroke(); }
  };
  ui.grad = function (ctx, y0, y1, c0, c1) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; };

  /* 굵은 패널 */
  ui.panel = function (ctx, x, y, w, h, opt) {
    opt = opt || {};
    ctx.save();
    ctx.shadowColor = 'rgba(20,10,50,.35)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
    ui.round(ctx, x, y, w, h, opt.r || 22, opt.fill || '#fffaf0');
    ctx.restore();
    ui.round(ctx, x, y, w, h, opt.r || 22, null, opt.stroke || '#3a2a6b', opt.lw || 4);
    if (opt.title) {
      const tw = Math.max(160, ui.measure(opt.title, 22) + 50);
      ui.round(ctx, x + w / 2 - tw / 2, y - 22, tw, 44, 22, opt.titleColor || '#7b5cff', opt.stroke || '#3a2a6b', 4);
      ui.text(ctx, opt.title, x + w / 2, y, { size: 22, color: '#fff', outline: '#3a2a6b' });
    }
  };

  ui.measure = function (s, size, weight) {
    const ctx = BPF.ctx; ctx.save(); ctx.font = `${weight || 'bold'} ${size}px ${BPF.FONT}`; const w = ctx.measureText(s).width; ctx.restore(); return w;
  };
  /* 외곽선 텍스트 */
  ui.text = function (ctx, s, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.font = `${o.weight || 'bold'} ${o.size || 20}px ${BPF.FONT}`;
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.outline) { ctx.lineJoin = 'round'; ctx.lineWidth = o.ow || Math.max(3, (o.size || 20) / 5); ctx.strokeStyle = o.outline; ctx.strokeText(s, x, y); }
    ctx.fillStyle = o.color || '#2d2350';
    ctx.fillText(s, x, y);
    ctx.restore();
  };
  /* 줄바꿈 텍스트 — 반환: 사용한 높이 */
  ui.wrap = function (ctx, s, x, y, maxW, o) {
    o = o || {};
    const size = o.size || 18, lh = o.lh || size * 1.45;
    ctx.save();
    ctx.font = `${o.weight || 'normal'} ${size}px ${BPF.FONT}`;
    ctx.fillStyle = o.color || '#2d2350'; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'top';
    const paras = String(s).split('\n');
    let yy = y;
    paras.forEach(p => {
      let line = '';
      const chars = p.split(/(\s+)/);
      // 한글은 공백 단위가 길 수 있으므로 글자 단위로도 자름
      const tokens = [];
      chars.forEach(c => { if (ctx.measureText(c).width > maxW) tokens.push(...c.split('')); else tokens.push(c); });
      tokens.forEach(t => {
        const test = line + t;
        if (ctx.measureText(test).width > maxW && line) { if (!o.dry) ctx.fillText(line.trimEnd(), x, yy); yy += lh; line = t.trimStart(); }
        else line = test;
      });
      if (!o.dry) ctx.fillText(line, x, yy); yy += lh;
    });
    ctx.restore();
    return yy - y;
  };
  /* 상자 높이 안에 들어갈 때까지 글자 크기를 줄여 줄바꿈 (넘치면 잘라냄) */
  ui.fitWrap = function (ctx, s, x, y, maxW, maxH, o) {
    o = Object.assign({}, o || {});
    let size = o.size || 16;
    const ratio = (o.lh || size * 1.35) / size;
    for (; size > 10; size--) {
      if (ui.wrap(ctx, s, x, y, maxW, Object.assign({}, o, { size, lh: size * ratio, dry: true })) <= maxH + 1) break;
    }
    ctx.save(); ctx.beginPath(); ctx.rect(o.align === 'center' ? x - maxW / 2 - 2 : x - 2, y - 2, maxW + 4, maxH + 4); ctx.clip();
    let ty = y;
    if (o.valign === 'middle') { // 세로 가운데 정렬
      const th = ui.wrap(ctx, s, x, y, maxW, Object.assign({}, o, { size, lh: size * ratio, dry: true }));
      ty = y + Math.max(0, (maxH - th) / 2);
    }
    const h = ui.wrap(ctx, s, x, ty, maxW, Object.assign({}, o, { size, lh: size * ratio }));
    ctx.restore();
    return h;
  };

  /* 즉시모드 버튼. 반환 true = 이번 프레임 클릭 */
  ui.button = function (ctx, x, y, w, h, label, o) {
    o = o || {};
    const r = { x, y, w, h };
    const disabled = !!o.disabled;
    const blocked = ui.modal && !ui._inModal;
    const hover = !disabled && !blocked && BPF.inRect(I.mx, I.my, r);
    const pressed = hover && I.mdown;
    const focus = !!o.focus;
    const base = o.color || '#ffb648';
    const bob = (focus && !disabled) ? Math.sin(BPF.time * 6) * 2 : 0;
    const yy = y + (pressed ? 3 : 0) + bob;
    ctx.save();
    if (!pressed) ui.round(ctx, x, yy + 5, w, h, o.r || 16, 'rgba(40,20,80,.35)');
    const g = ctx.createLinearGradient(0, yy, 0, yy + h);
    const c = disabled ? '#b9b3c9' : base;
    g.addColorStop(0, ui.lighten(c, hover ? 0.35 : 0.22)); g.addColorStop(1, c);
    ui.round(ctx, x, yy, w, h, o.r || 16, g, focus ? '#ffffff' : '#3a2a6b', focus ? 5 : 4);
    if (focus) ui.round(ctx, x - 4, yy - 4, w + 8, h + 8, (o.r || 16) + 4, null, '#3a2a6b', 3);
    // 광택
    ctx.globalAlpha = 0.35; ui.round(ctx, x + 6, yy + 5, w - 12, h * 0.32, 10, '#fff'); ctx.globalAlpha = 1;
    let tx = x + w / 2;
    if (o.icon) {
      const isz = o.isz || Math.min(h - 12, 40);
      const lw = label ? ui.measure(label, o.size || 20) : 0;
      const total = isz + (label ? 8 + lw : 0);
      const ix = x + w / 2 - total / 2;
      BPF.drawImg(ctx, o.icon, ix, yy + (h - isz) / 2, isz, isz, { noFallback: true });
      tx = ix + isz + 8 + lw / 2;
    }
    if (label) ui.text(ctx, label, tx, yy + h / 2 + 1, { size: o.size || 20, color: disabled ? '#6d6780' : (o.textColor || '#fff'), outline: disabled ? null : (o.outline || '#3a2a6b') });
    if (o.badge) { ui.round(ctx, x + w - 26, yy - 10, 34, 24, 12, '#ff4d6d', '#3a2a6b', 3); ui.text(ctx, o.badge, x + w - 9, yy + 2, { size: 14, color: '#fff' }); }
    ctx.restore();
    if (hover && !disabled) BPF.canvas.style.cursor = 'pointer';
    if (!disabled && !blocked && I.clicked && BPF.inRect(I.cx, I.cy, r) && BPF.inRect(I.px, I.py, r) && !I.consumed) {
      I.consume(); BPF.audio.sfx('click'); return true;
    }
    return false;
  };
  ui.hit = function (r) { return !(ui.modal && !ui._inModal) && I.clicked && !I.consumed && BPF.inRect(I.cx, I.cy, r) && BPF.inRect(I.px, I.py, r); };
  ui.hover = function (r) { return BPF.inRect(I.mx, I.my, r); };

  ui.lighten = function (hex, a) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r + (255 - r) * a); g = Math.round(g + (255 - g) * a); b = Math.round(b + (255 - b) * a);
    return `rgb(${r},${g},${b})`;
  };

  /* 게이지 */
  ui.gauge = function (ctx, x, y, w, h, v, max, color, label) {
    ui.round(ctx, x, y, w, h, h / 2, '#3b3165', '#3a2a6b', 3);
    const t = BPF.clamp(v / max, 0, 1);
    if (t > 0) {
      ctx.save(); ui.path(ctx, x + 3, y + 3, w - 6, h - 6, (h - 6) / 2); ctx.clip();
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, ui.lighten(color, 0.4)); g.addColorStop(1, color);
      ctx.fillStyle = g; ctx.fillRect(x + 3, y + 3, (w - 6) * t, h - 6);
      ctx.restore();
    }
    if (label) ui.text(ctx, label, x + w / 2, y + h / 2 + 1, { size: Math.max(12, h * 0.55), color: '#fff', outline: '#2a1f55' });
  };

  /* 자원 칩 */
  ui.chip = function (ctx, x, y, icon, txt, color) {
    const w = ui.measure(txt, 18) + 52;
    ui.round(ctx, x, y, w, 34, 17, color || 'rgba(255,255,255,.92)', '#3a2a6b', 3);
    if (icon.length <= 2) ui.text(ctx, icon, x + 19, y + 18, { size: 18 });
    else BPF.drawImg(ctx, icon, x + 4, y + 3, 28, 28, { noFallback: true });
    ui.text(ctx, txt, x + 36, y + 18, { size: 18, align: 'left' });
    return w;
  };

  /* 별·반짝이 */
  ui.star = function (ctx, x, y, r, fill, stroke) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fillStyle = fill || '#ffd84d'; ctx.fill();
    if (stroke !== false) { ctx.lineWidth = 3; ctx.strokeStyle = stroke || '#3a2a6b'; ctx.stroke(); }
  };

  /* 기본 배경: 밝은 그라데이션 + 떠다니는 방울 */
  ui.bg = function (ctx, c0, c1, bgKey) {
    const g = ctx.createLinearGradient(0, 0, 0, BPF.H);
    g.addColorStop(0, c0 || '#8fd3ff'); g.addColorStop(1, c1 || '#c9b8ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, BPF.W, BPF.H);
    if (bgKey) {
      ctx.save(); ctx.globalAlpha = 0.28; BPF.drawImg(ctx, bgKey, 0, 0, BPF.W, BPF.H, { stretch: true, noFallback: true }); ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff';
    for (let i = 0; i < 14; i++) {
      const x = (i * 197 + BPF.time * (10 + i % 5 * 6)) % (BPF.W + 80) - 40;
      const y = (i * 131) % BPF.H + Math.sin(BPF.time + i) * 12;
      ctx.beginPath(); ctx.arc(x, y, 10 + (i % 4) * 9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  /* 파티클 */
  ui.particles = [];
  ui.burst = function (x, y, color, n, opt) {
    if (BPF.save.data.settings.reduceMotion) n = Math.ceil((n || 12) / 3);
    opt = opt || {};
    for (let i = 0; i < (n || 12); i++) {
      const a = Math.random() * Math.PI * 2, s = BPF.rand(80, opt.speed || 320);
      ui.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: BPF.rand(0.5, 1), t: 0, color: color || '#ffd84d', r: BPF.rand(3, 7), star: opt.star && Math.random() < 0.5 });
    }
  };
  ui.floatText = function (x, y, txt, color, size) {
    ui.particles.push({ x, y, vx: 0, vy: -70, life: 1.1, t: 0, text: txt, color: color || '#fff', size: size || 26 });
  };
  ui.drawParticles = function (ctx, dt) {
    for (let i = ui.particles.length - 1; i >= 0; i--) {
      const p = ui.particles[i]; p.t += dt;
      if (p.t > p.life) { ui.particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (!p.text) p.vy += 500 * dt;
      const a = 1 - p.t / p.life;
      ctx.save(); ctx.globalAlpha = a;
      if (p.text) ui.text(ctx, p.text, p.x, p.y, { size: p.size, color: p.color, outline: '#2a1f55' });
      else if (p.star) ui.star(ctx, p.x, p.y, p.r * 1.6, p.color, false);
      else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  };
  ui.clearParticles = function () { ui.particles.length = 0; };

  /* 모달(확인 팝업) */
  ui.modal = null;
  ui.confirm = function (title, msg, onYes, opt) { ui.modal = { title, msg, onYes, opt: opt || {}, t: 0 }; };
  ui.alert = function (title, msg, onOk) { ui.modal = { title, msg, onYes: onOk, opt: { okOnly: true }, t: 0 }; };
  ui.drawModal = function (ctx, dt) {
    const m = ui.modal; if (!m) return false;
    m.t += dt; ui._inModal = true;
    ctx.save(); ctx.fillStyle = 'rgba(20,12,45,.6)'; ctx.fillRect(0, 0, BPF.W, BPF.H); ctx.restore();
    const s = BPF.ease(Math.min(1, m.t * 5));
    const w = 620, h = 300, x = BPF.W / 2 - w / 2, y = BPF.H / 2 - h / 2 + (1 - s) * 40;
    ui.panel(ctx, x, y, w, h, { title: m.title });
    ui.wrap(ctx, m.msg, x + 40, y + 50, w - 80, { size: 21, align: 'left' });
    const yes = m.opt.yes || (m.opt.okOnly ? '확인' : '예');
    let done = false;
    if (m.opt.okOnly) {
      if (ui.button(ctx, x + w / 2 - 90, y + h - 80, 180, 56, yes, { color: '#47c46b', focus: true }) || I.confirm()) { done = true; ui.modal = null; m.onYes && m.onYes(); }
    } else {
      if (ui.button(ctx, x + w / 2 - 200, y + h - 80, 180, 56, yes, { color: '#47c46b', focus: true }) || I.confirm()) { done = true; ui.modal = null; m.onYes && m.onYes(); }
      else if (ui.button(ctx, x + w / 2 + 20, y + h - 80, 180, 56, m.opt.no || '아니오', { color: '#ff7a7a' }) || I.key('Escape')) { done = true; ui.modal = null; m.opt.onNo && m.opt.onNo(); }
    }
    if (!done) I.consume(); // 아래 화면으로 클릭이 새지 않게
    ui._inModal = false;
    return true;
  };

  /* 이름 입력용 DOM input */
  const inp = document.getElementById('nameInput');
  let inpRect = null;
  ui.showInput = function (x, y, w, h, val, opt) {
    opt = opt || {};
    inp.type = opt.password ? 'password' : 'text'; inp.maxLength = opt.password ? 20 : 8;
    ui.onInputEnter = opt.onEnter || null;
    inpRect = { x, y, w, h }; inp.value = val || ''; inp.style.display = 'block'; ui.layoutInput(); setTimeout(() => inp.focus(), 50);
  };
  ui.hideInput = function () { inp.style.display = 'none'; inp.type = 'text'; inp.maxLength = 8; ui.onInputEnter = null; inpRect = null; BPF.canvas.focus(); };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && ui.onInputEnter) { e.preventDefault(); ui.onInputEnter(); } });
  ui.inputValue = function () { return inp.value.trim(); };
  ui.layoutInput = function () {
    if (!inpRect) return;
    const r = BPF.canvas.getBoundingClientRect(), s = r.width / BPF.W;
    inp.style.left = (r.left + inpRect.x * s) + 'px'; inp.style.top = (r.top + inpRect.y * s) + 'px';
    inp.style.width = (inpRect.w * s - 28) + 'px'; inp.style.height = (inpRect.h * s - 20) + 'px';
    inp.style.fontSize = Math.max(14, 26 * s) + 'px';
  };

  /* 상단 공통 바(마을·농장 등) */
  ui.topBar = function (ctx, title, reserve) {
    const d = BPF.save.data;
    ui.round(ctx, 8, 8, BPF.W - 16, 56, 18, 'rgba(255,250,240,.94)', '#3a2a6b', 4);
    BPF.drawImg(ctx, `face_${BPF.save.player}_idle`, 14, 10, 52, 52);
    ui.text(ctx, title, 76, 36, { size: 22, align: 'left', color: '#3a2a6b' });
    let x = BPF.W - 20 - (reserve || 0);
    const chips = [['ic_star', `${d.res.bp} BP`], ['res_food', `먹이 ${d.res.food}`], ['res_research', `연구 ${d.res.research}`], ['res_decor', `장식 ${d.res.decor}`]];
    for (let i = chips.length - 1; i >= 0; i--) {
      const w = ui.measure(chips[i][1], 18) + 52; x -= w + 6;
      ui.chip(ctx, x, 19, chips[i][0], chips[i][1]);
    }
  };
})();
