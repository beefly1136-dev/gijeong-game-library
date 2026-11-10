/* 02 발효의 달인 — 4개 발효조 동시 관리, 원료·스타터·조건, 수거 타이밍 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  const F = () => BPF_DATA.ferment;
  const VAT_Y = 232, VAT_W = 220, VAT_H = 240;
  const vatX = i => 32 + i * 244;
  const ZONE = { done: 0.72, sweetA: 0.84, sweetB: 0.95, over: 1.0, spoil: 1.18 };
  const nameOf = (list, id) => (list.find(x => x.id === id) || {}).name || '?';

  BPF.defineGame('g02', {
    timeLimit: 120, bg: ['#ffe6c7', '#ffc9a8'], bgKey: 'bg_ferment',
        init(g) {
      g.orders = []; g.vats = [0, 1, 2, 3].map(() => ({ state: 'empty' }));
      g.sel = 0; g.delivered = 0; g.bad = 0; g.goal = 8; g.spawnT = 0.5; g.missed = 0; g.sweet = 0;
      this.spawnOrder(g); this.spawnOrder(g);
    },
    spawnOrder(g) {
      if (g.orders.length >= 4) return;
      const o = BPF.pick(F().orders);
      g.orders.push({ o, patience: 34, max: 34, id: BPF.uid() });
    },
    demoSetup(g) {
      const k = F().orders[0];
      g.orders = [{ o: Object.assign({}, k, { time: 4.3 }), patience: 99, max: 99, id: 'd1' }, { o: F().orders[3], patience: 99, max: 99, id: 'd2' }];
      g.spawnT = 999;
    },
    demo(g) {
      const btn = (row, j) => ({ x: 150 + j * 166 + 78, y: 526 + row * 60 + 24 });
      return [
        { x: 142, y: 160, say: '먼저 주문 카드를 눌러 발효조에 넣어요.', act: () => this.assign(g, 0), wait: 0.8 },
        { x: btn(0, 0).x, y: btn(0, 0).y, say: '김치의 원료는 배추!', act: () => this.setPart(g, 'raw', 'cabbage'), wait: 0.6 },
        { x: btn(1, 0).x, y: btn(1, 0).y, say: '김치를 익히는 미생물은 유산균!', act: () => this.setPart(g, 'starter', 'lab'), wait: 0.6 },
        { x: btn(2, 0).x, y: btn(2, 0).y, say: '김치는 낮은 온도에서 천천히 숙성해요.', act: () => this.setPart(g, 'cond', 'cold'), wait: 0.6 },
        { x: 142, y: 445, say: '게이지가 초록 구간, 특히 노란 적정 구간에 오길 기다려요…', wait: 2.1 },
        { x: 142, y: 340, say: '지금! 발효조를 눌러 수거하면 납품 완료!', act: () => this.collect(g, 0), wait: 1.4 }
      ];
    },
    hud(g) { return `납품 ${g.delivered}/${g.goal} · 불량 ${g.bad}/4`; },
    update(g, dt) {
      if (g.mode !== 'real') g.orders.forEach(o => o.patience = Math.max(o.patience, 20)); // 연습: 주문이 취소되지 않음
      g.spawnT -= dt;
      if (g.spawnT <= 0) { this.spawnOrder(g); g.spawnT = Math.max(5, 9 - g.time * 0.03); }
      for (let i = g.orders.length - 1; i >= 0; i--) {
        g.orders[i].patience -= dt;
        if (g.orders[i].patience <= 0) { g.orders.splice(i, 1); g.missed++; BPF.toast('주문 하나가 취소됐어요…', '#8a5a2a'); g.avatar.setState('mistake', { line: '주문을 놓쳤어!' }); }
      }
      let hot = false;
      g.vats.forEach((v, i) => {
        if (v.state !== 'ferment') return;
        v.p += dt / v.order.time;
        if (v.p > ZONE.over) hot = true;
        if (v.p >= ZONE.spoil) { this.spoil(g, i, '과발효! 너무 오래 두었어요'); }
      });
      if (hot && g.avatar.state === 'idle') g.avatar.setState('thinking', { line: '과열 주의! 빨리 수거!' });
      // 키보드
      ['Digit1', 'Digit2', 'Digit3', 'Digit4'].forEach((k, i) => { if (I.key(k) || I.key('Numpad' + (i + 1))) { g.sel = i; BPF.audio.sfx('move'); } });
      if (I.key('ArrowLeft')) g.sel = (g.sel + 3) % 4;
      if (I.key('ArrowRight')) g.sel = (g.sel + 1) % 4;
      if (I.key('Space')) this.collect(g, g.sel);
    },
    spoil(g, i, why) {
      const v = g.vats[i];
      g.bad++; g.actions++;
      g.mistake(vatX(i) + VAT_W / 2, VAT_Y + 80, '불량!');
      BPF.toast(why, '#b03040');
      g.vats[i] = { state: 'empty' };
      if (g.bad >= 4) g.finish(false, { achieve: g.delivered / g.goal, accuracy: g.good / Math.max(1, g.actions) }, '불량 4개…');
    },
    assign(g, idx) {
      let vi = g.vats[g.sel].state === 'empty' ? g.sel : g.vats.findIndex(v => v.state === 'empty');
      if (vi < 0) { BPF.toast('빈 발효조가 없어요! 먼저 수거하세요.'); return; }
      const od = g.orders.splice(idx, 1)[0];
      g.vats[vi] = { state: 'setup', order: od.o, raw: null, starter: null, cond: null };
      g.sel = vi; g.avatar.setState('acting'); BPF.audio.sfx('pop');
    },
    setPart(g, key, id) {
      const v = g.vats[g.sel];
      if (v.state !== 'setup') { BPF.toast('먼저 주문을 발효조에 넣어 주세요.'); return; }
      v[key] = id; g.avatar.setState('acting'); BPF.audio.sfx('pop');
      if (v.raw && v.starter && v.cond) {
        const o = v.order;
        const wrong = [];
        if (v.raw !== o.raw) wrong.push(`원료 「${nameOf(F().raws, o.raw)}」`);
        if (v.starter !== o.starter) wrong.push(`균 「${nameOf(F().starters, o.starter)}」`);
        if (v.cond !== o.cond) wrong.push(`조건 「${nameOf(F().conds, o.cond)}」`);
        if (wrong.length) { this.spoil(g, g.sel, `불량! ${o.name}에는 ${wrong.join(', ')} 필요`); return; }
        v.state = 'ferment'; v.p = 0;
        ui.floatText(vatX(g.sel) + VAT_W / 2, VAT_Y + 40, '발효 시작!', '#9dff8a');
      }
    },
    collect(g, i) {
      const v = g.vats[i];
      if (v.state !== 'ferment') return;
      g.actions++;
      if (v.p < ZONE.done) { this.spoil(g, i, '아직 덜 발효됐어요! 초록 구간을 기다려요.'); return; }
      const sweet = v.p >= ZONE.sweetA && v.p <= ZONE.sweetB;
      let pts = 150 + (sweet ? 100 : 0);
      g.delivered++; if (sweet) g.sweet++;
      g.success(pts, vatX(i) + VAT_W / 2, VAT_Y + 60);
      if (sweet) ui.floatText(vatX(i) + VAT_W / 2, VAT_Y + 20, '적정 숙성!', '#ffd84d', 28);
      g.vats[i] = { state: 'empty' };
      if (g.delivered >= g.goal) g.finish(true, { achieve: 1, accuracy: g.good / g.actions, bonus: 0.6 * (g.sweet / g.delivered) + 0.4 * g.timeLeft / 60 });
    },
    onTimeUp(g) { g.finish(false, { achieve: g.delivered / g.goal, accuracy: g.good / Math.max(1, g.actions) }, '시간 종료!'); },
    draw(g, ctx) {
      // 주문 카드
      ui.text(ctx, '📋 주문 (클릭하면 선택한 발효조에 배정)', 32, 92, { size: 17, align: 'left', color: '#7a3a10' });
      g.orders.forEach((od, i) => {
        const x = 32 + i * 244, y = 106, w = 220, h = 104;
        const r = { x, y, w, h };
        const hov = ui.hover(r);
        ui.round(ctx, x, y + (hov ? -3 : 0), w, h, 16, hov ? '#fffbe0' : '#fff6e8', '#3a2a6b', 3);
        BPF.drawImg(ctx, od.o.icon, x + 8, y + 10, 64, 64);
        ui.text(ctx, od.o.name, x + 80, y + 26, { size: 21, align: 'left', color: '#8a3a10' });
        ui.text(ctx, od.o.kind, x + 80, y + 54, { size: 14, align: 'left', color: '#aa7744', weight: 'normal' });
        ui.gauge(ctx, x + 10, y + 78, w - 20, 16, od.patience, od.max, od.patience < 10 ? '#ff5d5d' : '#47c46b');
        if (ui.hit(r)) { I.consume(); this.assign(g, i); }
      });
      // 발효조
      g.vats.forEach((v, i) => {
        const x = vatX(i), y = VAT_Y, sel = g.sel === i;
        const r = { x, y, w: VAT_W, h: VAT_H };
        ui.round(ctx, x, y, VAT_W, VAT_H, 20, sel ? '#fff3c4' : 'rgba(255,250,240,.92)', sel ? '#ff7a00' : '#3a2a6b', sel ? 6 : 4);
        ui.round(ctx, x + 8, y + 8, 36, 30, 10, '#3a2a6b'); ui.text(ctx, String(i + 1), x + 26, y + 24, { size: 18, color: '#fff' });
        // 통
        const tx = x + 50, ty = y + 40, tw = 120, th = 120;
        ctx.save();
        if (!BPF.drawImg(ctx, 'fm_vat', tx - 10, ty - 14, tw + 20, th + 20, { noFallback: true })) {
          ui.round(ctx, tx, ty, tw, th, 24, '#d9a066', '#3a2a6b', 4);
          ui.round(ctx, tx - 6, ty - 4, tw + 12, 22, 10, '#a5672e', '#3a2a6b', 3);
        }
        if (v.state === 'ferment') {
          const fill = Math.min(1, v.p);
          const col = v.p > ZONE.over ? '#b05ad6' : v.p >= ZONE.done ? '#7ddc6a' : '#ffd36b';
          ctx.save(); ui.path(ctx, tx + 14, ty + 26, tw - 28, th - 40, 14); ctx.clip(); ctx.globalAlpha = 0.72;
          ctx.fillStyle = col; ctx.fillRect(tx, ty + th - (th - 20) * fill, tw, th);
          // 거품
          ctx.fillStyle = 'rgba(255,255,255,.6)';
          for (let b = 0; b < 5; b++) { const bx = tx + 15 + ((b * 23 + BPF.time * 30) % (tw - 30)); const by = ty + th - ((BPF.time * 40 + b * 37) % (th * fill + 1)); ctx.beginPath(); ctx.arc(bx, by, 4 + b % 3, 0, 7); ctx.fill(); }
          ctx.restore();
          if (v.p > ZONE.over) ui.text(ctx, '⚠과열', tx + tw / 2, ty - 18, { size: 18 + Math.sin(BPF.time * 12) * 2, color: '#ff4d6d', outline: '#fff' });
        }
        ctx.restore();
        if (v.state === 'empty') ui.text(ctx, '빈 발효조', x + VAT_W / 2, y + 185, { size: 18, color: '#9a8aaa' });
        else {
          BPF.drawImg(ctx, v.order.icon, x + VAT_W - 56, y + 6, 48, 48, { noFallback: true });
          ui.text(ctx, v.order.name, x + VAT_W / 2, y + 182, { size: 20, color: '#8a3a10' });
        }
        if (v.state === 'setup') {
          const done = [v.raw, v.starter, v.cond].filter(Boolean).length;
          ui.text(ctx, `재료 ${done}/3 넣는 중`, x + VAT_W / 2, y + 212, { size: 16, color: '#7b3fd6' });
        }
        if (v.state === 'ferment') {
          // 게이지와 구간
          const gx = x + 14, gy = y + 200, gw = VAT_W - 28, gh = 26;
          ui.round(ctx, gx, gy, gw, gh, 10, '#4a3a6b', '#3a2a6b', 3);
          const z = (a, b, c) => { ctx.fillStyle = c; ctx.fillRect(gx + 3 + (gw - 6) * a / ZONE.spoil, gy + 3, (gw - 6) * (b - a) / ZONE.spoil, gh - 6); };
          z(ZONE.done, ZONE.over, '#47c46b'); z(ZONE.sweetA, ZONE.sweetB, '#ffd84d'); z(ZONE.over, ZONE.spoil, '#b05ad6');
          const px = gx + 3 + (gw - 6) * Math.min(v.p, ZONE.spoil) / ZONE.spoil;
          ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3a2a6b'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(px, gy - 6); ctx.lineTo(px - 7, gy - 14); ctx.lineTo(px + 7, gy - 14); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillRect(px - 2, gy, 4, gh);
        }
        if (ui.hit(r)) { I.consume(); g.sel = i; BPF.audio.sfx('move'); if (v.state === 'ferment') this.collect(g, i); }
      });
      // 재료 트레이
      const v = g.vats[g.sel];
      ui.round(ctx, 20, 488, 972, 222, 20, 'rgba(255,250,240,.95)', '#3a2a6b', 4);
      ui.text(ctx, `▶ ${g.sel + 1}번 발효조에 넣기`, 36, 506, { size: 17, align: 'left', color: '#c2185b' });
      if (ui.button(ctx, 820, 494, 160, 30, g.book ? '노트 닫기' : '📖 발효 노트', { color: '#8a7dff', size: 15, r: 10 }) || I.key('KeyN')) g.book = !g.book;
      const rowsDef = [['원료', 'raw', F().raws, '#ffb648'], ['미생물', 'starter', F().starters, '#47c46b'], ['조건', 'cond', F().conds, '#3fb6d6']];
      rowsDef.forEach((rd, k) => {
        const y = 526 + k * 60;
        ui.text(ctx, rd[0], 36, y + 24, { size: 18, align: 'left', color: '#3a2a6b' });
        rd[2].forEach((it, j) => {
          const chosen = v.state === 'setup' && v[rd[1]] === it.id;
          const ic = rd[1] === 'raw' ? 'fm_raw_' + it.id : rd[1] === 'starter' ? 'fm_mic_' + it.id : null;
          const lb = it.short || it.name, room = ic ? 98 : 140;
          if (ui.button(ctx, 150 + j * 166, y, 156, 48, lb, { icon: ic, isz: 40, color: chosen ? '#ff5fa0' : rd[3], size: Math.min(18, Math.floor(room / lb.length * 1.05)), disabled: v.state !== 'setup', focus: chosen })) this.setPart(g, rd[1], it.id);
        });
      });
      if (g.book) {
        ui.panel(ctx, 120, 120, 760, 340, { title: '발효·바이오 에너지 노트 (시간은 계속 흘러요!)' });
        F().orders.forEach((o, k) => {
          const y = 160 + k * 56;
          BPF.drawImg(ctx, o.icon, 175, y, 46, 46);
          ui.text(ctx, o.name, 235, y + 24, { size: 20, align: 'left', color: '#8a3a10' });
          ui.text(ctx, `${nameOf(F().raws, o.raw)} + ${nameOf(F().starters, o.starter)} + ${nameOf(F().conds, o.cond)}`, 370, y + 24, { size: 17, align: 'left', weight: 'normal' });
        });
      }
    }
  });
})();
