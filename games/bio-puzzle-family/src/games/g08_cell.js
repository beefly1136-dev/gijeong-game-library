/* 08 면역 수호대 — 교과서 218쪽 면역·백신: 면역 에너지 수집, 백신 카드로 일시 면역, 병원체·감염 구역 회피 (게임적 은유) */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  const AR = { x: 24, y: 86, w: 964, h: 620 };
  const NUT = [{ name: '면역 에너지', c: '#ffd23d' }, { name: '면역 에너지', c: '#6fe06f' }, { name: '면역 에너지', c: '#7ad0ff' }];
  const VAC = [{ name: '비활성화 백신', c: '#9a8aff' }, { name: '재조합 단백질 백신', c: '#ff8fb8' }, { name: 'mRNA 백신', c: '#47c4b0' }];

  BPF.defineGame('g08', {
    timeLimit: 90, bg: ['#ffd9e8', '#e3c9ff'], bgKey: 'im_bg_body',
    touchKeys: [
      { label: '▲', code: 'ArrowUp', x: 1088, y: 486, w: 72, h: 70 }, { label: '▼', code: 'ArrowDown', x: 1088, y: 636, w: 72, h: 70 },
      { label: '◀', code: 'ArrowLeft', x: 1016, y: 561, w: 72, h: 70 }, { label: '▶', code: 'ArrowRight', x: 1160, y: 561, w: 72, h: 70 },
      { label: '대시', code: 'Space', x: 1196, y: 646, w: 76, h: 60, size: 20 }
    ],
    init(g) {
      g.p = { x: AR.x + AR.w / 2, y: AR.y + AR.h / 2, r: 34, vx: 0, vy: 0, face: 1 };
      g.hp = 3; g.inv = 0; g.dashT = 0; g.dashCd = 0; g.got = 0; g.goal = 35;
      g.nuts = []; g.nutT = 0; g.toxins = []; g.zones = []; g.zoneT = 6; g.waveT = 20; g.wave = null; g.hits = 0;
      for (let i = 0; i < 6; i++) this.spawnNut(g);
      for (let i = 0; i < 2; i++) this.spawnToxin(g);
    },
    spawnNut(g) {
      if (g.nuts.length >= 9) return;
      let x, y, tries = 0;
      do { x = BPF.rand(AR.x + 30, AR.x + AR.w - 30); y = BPF.rand(AR.y + 30, AR.y + AR.h - 30); } while (Math.hypot(x - g.p.x, y - g.p.y) < 120 && ++tries < 10);
      g.nuts.push({ x, y, k: BPF.randi(0, 2), t: Math.random() * 6 });
    },
    spawnToxin(g) {
      const side = BPF.randi(0, 3);
      const x = side === 0 ? AR.x + 20 : side === 1 ? AR.x + AR.w - 20 : BPF.rand(AR.x, AR.x + AR.w);
      const y = side === 2 ? AR.y + 20 : side === 3 ? AR.y + AR.h - 20 : BPF.rand(AR.y, AR.y + AR.h);
      const a = Math.atan2(g.p.y - y, g.p.x - x) + BPF.rand(-0.6, 0.6), s = BPF.rand(90, 140) + g.time * 0.8;
      g.toxins.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 22, rot: 0 });
    },
    demoSetup(g) { g.zoneT = 3.5; g.waveT = 99; g.vacSpawn = 2; g.toxins.length = 1; },
    demo(g) {
      return [
        { x: () => g.p.x, y: () => g.p.y, say: '가운데가 나! 방향키로 움직여요.', wait: 0.8 },
        { x: () => g.p.x + 40, y: () => g.p.y, say: '반짝이는 면역 에너지(항체)를 모아요.', act: () => { g.auto = true; }, wait: 2.6 },
        { x: () => g.vac ? g.vac.x : g.p.x, y: () => g.vac ? g.vac.y : g.p.y, say: '백신 카드를 먹으면 잠깐 동안 면역이 생겨요!', act: () => { if (g.vac) { g.p.x = g.vac.x; g.p.y = g.vac.y; } }, wait: 1.4 },
        { x: () => g.p.x, y: () => g.p.y, say: '바이러스·세균과 붉은 감염 구역은 피해요. Space로 대시!', act: () => { g.dashT = 0.22; g.dashCd = 1.6; g.p.dx = 1; g.p.dy = 0; BPF.audio.sfx('dash'); }, wait: 2.2 }
      ];
    },
    hud(g) { return `면역 에너지 ${g.got}/${g.goal} · 체력 ${'❤'.repeat(g.hp)}${'♡'.repeat(Math.max(0, 3 - g.hp))}`; },
    hurt(g, why) {
      if (g.inv > 0 || g.dashT > 0 || g.vacT > 0) return;
      g.hp--; g.hits++; g.inv = 1.3; g.mistake(g.p.x, g.p.y - 50, why);
      BPF.audio.sfx('hit');
      if (g.mode !== 'real' && g.hp <= 0) { g.hp = 3; BPF.toast('연습에서는 체력이 다시 차요!'); return; }
      if (g.hp <= 0) g.finish(false, { achieve: Math.min(1, g.got / g.goal) * 0.5 + 0.5 * g.time / 90, accuracy: g.got / Math.max(1, g.got + g.hits * 3) }, '체력이 다 떨어졌어요');
    },
    update(g, dt) {
      const p = g.p;
      // 이동
      let ax = 0, ay = 0;
      if (I.anyHeld('ArrowLeft', 'KeyA')) ax -= 1; if (I.anyHeld('ArrowRight', 'KeyD')) ax += 1;
      if (I.anyHeld('ArrowUp', 'KeyW')) ay -= 1; if (I.anyHeld('ArrowDown', 'KeyS')) ay += 1;
      // 마우스 누르고 있으면 그쪽으로 이동
      if (I.mdown && BPF.inRect(I.mx, I.my, AR)) { const dx = I.mx - p.x, dy = I.my - p.y, d = Math.hypot(dx, dy); if (d > 12) { ax = dx / d; ay = dy / d; } }
      if (g.auto && g.nuts.length) { // 시범: 가장 가까운 에너지로 이동
        const n = g.nuts.reduce((a, b) => Math.hypot(a.x - p.x, a.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? a : b);
        const dx = n.x - p.x, dy = n.y - p.y, d = Math.hypot(dx, dy) || 1; ax = dx / d; ay = dy / d;
      }
      const len = Math.hypot(ax, ay); if (len > 0) { ax /= len; ay /= len; if (ax) p.face = ax > 0 ? 1 : -1; }
      g.dashCd = Math.max(0, g.dashCd - dt); g.dashT = Math.max(0, g.dashT - dt); g.inv = Math.max(0, g.inv - dt);
      if (I.key('Space') && g.dashCd <= 0) {
        g.dashT = 0.22; g.dashCd = 1.6; BPF.audio.sfx('dash'); g.avatar.setState('acting', { line: '대시!' });
        if (!len) { ax = p.face; }
        p.dx = ax; p.dy = ay;
      }
      const sp = g.dashT > 0 ? 760 : 270;
      if (g.dashT > 0) { p.x += (p.dx || ax) * sp * dt; p.y += (p.dy || ay) * sp * dt; }
      else { p.x += ax * sp * dt; p.y += ay * sp * dt; }
      p.x = BPF.clamp(p.x, AR.x + p.r, AR.x + AR.w - p.r); p.y = BPF.clamp(p.y, AR.y + p.r, AR.y + AR.h - p.r);
      p.moving = len > 0;
      // 영양분
      g.nutT -= dt; if (g.nutT <= 0) { this.spawnNut(g); g.nutT = 0.55; }
      for (let i = g.nuts.length - 1; i >= 0; i--) {
        const n = g.nuts[i]; n.t += dt;
        if (Math.hypot(n.x - p.x, n.y - p.y) < p.r + 14) {
          g.nuts.splice(i, 1); g.got++; g.actions++;
          g.success(20, n.x, n.y - 10);
          if (g.got === g.goal) { BPF.toast('면역 에너지 목표 달성! 끝까지 버텨요!', '#2e8a3a'); }
        }
      }
      // 백신 카드: 먹으면 4초 동안 병원체를 막는 면역 획득
      g.vacT = Math.max(0, (g.vacT || 0) - dt);
      g.vacSpawn = (g.vacSpawn == null ? 8 : g.vacSpawn) - dt;
      if (g.vacSpawn <= 0 && !g.vac) { g.vac = { x: BPF.rand(AR.x + 60, AR.x + AR.w - 60), y: BPF.rand(AR.y + 60, AR.y + AR.h - 60), k: BPF.randi(0, 2), life: 7 }; g.vacSpawn = 14; }
      if (g.vac) {
        g.vac.life -= dt;
        if (Math.hypot(g.vac.x - p.x, g.vac.y - p.y) < p.r + 22) { g.vacT = 4; g.success(50, g.vac.x, g.vac.y - 20); ui.floatText(g.vac.x, g.vac.y - 50, `${VAC[g.vac.k].name} → 면역 획득!`, '#ffe14d', 22); g.vac = null; }
        else if (g.vac.life <= 0) g.vac = null;
      }
      // 병원체
      const want = Math.min(7, 2 + Math.floor(g.time / 14));
      if (g.toxins.length < want) this.spawnToxin(g);
      g.toxins.forEach(t => {
        t.x += t.vx * dt; t.y += t.vy * dt; t.rot += dt * 2;
        if (t.x < AR.x + t.r || t.x > AR.x + AR.w - t.r) { t.vx *= -1; t.x = BPF.clamp(t.x, AR.x + t.r, AR.x + AR.w - t.r); }
        if (t.y < AR.y + t.r || t.y > AR.y + AR.h - t.r) { t.vy *= -1; t.y = BPF.clamp(t.y, AR.y + t.r, AR.y + AR.h - t.r); }
        if (Math.hypot(t.x - p.x, t.y - p.y) < t.r + p.r - 8) this.hurt(g, '병원체 침입!');
      });
      // 유해 구역
      g.zoneT -= dt;
      if (g.zoneT <= 0) {
        g.zoneT = Math.max(3, 7 - g.time * 0.04);
        g.zones.push({ x: BPF.rand(AR.x + 90, AR.x + AR.w - 90), y: BPF.rand(AR.y + 90, AR.y + AR.h - 90), r: BPF.rand(70, 110), t: 0, warn: 1.6, life: 4.5 });
      }
      for (let i = g.zones.length - 1; i >= 0; i--) {
        const z = g.zones[i]; z.t += dt;
        if (z.t > z.warn + z.life) { g.zones.splice(i, 1); continue; }
        if (z.t > z.warn && Math.hypot(z.x - p.x, z.y - p.y) < z.r + p.r * 0.5) this.hurt(g, '감염 구역!');
      }
      // 고농도 독성 파도
      g.waveT -= dt;
      if (g.waveT <= 0 && !g.wave) {
        const horiz = Math.random() < 0.5;
        g.wave = { horiz, t: 0, warn: 2, gap: BPF.rand(0.2, 0.8), pos: 0 };
        g.avatar.setState('thinking', { line: '감염병이 유행해! 초록 틈으로!' });
        BPF.toast('⚠ 감염병 유행 파도! 초록 틈으로 피하세요', '#b03040');
      }
      if (g.wave) {
        const w = g.wave; w.t += dt;
        if (w.t > w.warn) {
          w.pos += dt / 2.2;
          const thick = 46;
          if (w.horiz) {
            const wy = AR.y + w.pos * AR.h;
            const gx = AR.x + w.gap * AR.w;
            if (Math.abs(p.y - wy) < thick / 2 + p.r * 0.6 && Math.abs(p.x - gx) > 90) this.hurt(g, '감염병 유행!');
          } else {
            const wx = AR.x + w.pos * AR.w;
            const gy = AR.y + w.gap * AR.h;
            if (Math.abs(p.x - wx) < thick / 2 + p.r * 0.6 && Math.abs(p.y - gy) > 90) this.hurt(g, '감염병 유행!');
          }
          if (w.pos >= 1) { g.wave = null; g.waveT = 18; }
        }
      }
    },
    onTimeUp(g) {
      const win = g.got >= g.goal;
      g.addPoints(win ? 500 : 0, g.p.x, g.p.y - 60);
      g.finish(win, { achieve: Math.min(1, g.got / g.goal), accuracy: Math.max(0, 1 - g.hits / 3), bonus: Math.min(1, (g.got - g.goal) / 15) * 0.5 + g.hp / 6 }, win ? '' : '면역 에너지가 부족해요');
    },
    draw(g, ctx) {
      // 세포 바깥 환경
      ui.round(ctx, AR.x, AR.y, AR.w, AR.h, 30, 'rgba(255,240,250,.55)', '#7b3fd6', 5);
      ctx.save(); ui.path(ctx, AR.x, AR.y, AR.w, AR.h, 30); ctx.clip();
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < 18; i++) { ctx.fillStyle = i % 2 ? '#ffb3d9' : '#c9b3ff'; ctx.beginPath(); ctx.arc(AR.x + (i * 173) % AR.w, AR.y + (i * 97 + BPF.time * 8) % AR.h, 20 + i % 4 * 8, 0, 7); ctx.fill(); }
      ctx.restore();
      // 유해 구역
      g.zones.forEach(z => {
        ctx.save();
        if (z.t < z.warn) {
          ctx.setLineDash([10, 8]); ctx.lineWidth = 4; ctx.strokeStyle = `rgba(255,60,80,${0.5 + Math.sin(BPF.time * 15) * 0.4})`;
          ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.stroke();
          ui.text(ctx, '!', z.x, z.y, { size: 40, color: '#ff4d6d', outline: '#fff' });
        } else {
          const gr = ctx.createRadialGradient(z.x, z.y, 10, z.x, z.y, z.r);
          gr.addColorStop(0, 'rgba(255,40,70,.7)'); gr.addColorStop(1, 'rgba(255,40,70,.15)');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.fill();
          ctx.strokeStyle = '#c2185b'; ctx.lineWidth = 3; ctx.stroke();
          ui.text(ctx, '감염 구역', z.x, z.y, { size: 16, color: '#fff', outline: '#c2185b' });
        }
        ctx.restore();
      });
      // 파도
      if (g.wave) {
        const w = g.wave, thick = 46;
        ctx.save();
        const warn = w.t < w.warn;
        ctx.globalAlpha = warn ? 0.35 + Math.sin(BPF.time * 14) * 0.2 : 0.85;
        ctx.fillStyle = '#8a2be2';
        if (w.horiz) {
          const wy = warn ? AR.y + 10 : AR.y + w.pos * AR.h, gx = AR.x + w.gap * AR.w;
          ctx.fillRect(AR.x, wy - thick / 2, gx - 90 - AR.x, thick); ctx.fillRect(gx + 90, wy - thick / 2, AR.x + AR.w - gx - 90, thick);
          ctx.fillStyle = '#47c46b'; ctx.globalAlpha = 0.6; ctx.fillRect(gx - 90, wy - thick / 2, 180, thick);
        } else {
          const wx = warn ? AR.x + 10 : AR.x + w.pos * AR.w, gy = AR.y + w.gap * AR.h;
          ctx.fillRect(wx - thick / 2, AR.y, thick, gy - 90 - AR.y); ctx.fillRect(wx - thick / 2, gy + 90, thick, AR.y + AR.h - gy - 90);
          ctx.fillStyle = '#47c46b'; ctx.globalAlpha = 0.6; ctx.fillRect(wx - thick / 2, gy - 90, thick, 180);
        }
        ctx.restore();
      }
      // 영양분
      g.nuts.forEach(n => {
        const N = NUT[n.k], bob = Math.sin(n.t * 4) * 4;
        ctx.save(); ctx.fillStyle = N.c; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(n.x, n.y + bob, 16, 0, 7); ctx.fill(); ctx.restore();
        if (!BPF.drawImg(ctx, 'antibody', n.x - 15, n.y - 15 + bob, 30, 30, { noFallback: true })) { ctx.fillStyle = N.c; ctx.beginPath(); ctx.arc(n.x, n.y + bob, 12, 0, 7); ctx.fill(); }
      });
      // 백신 카드
      if (g.vac) {
        const V = VAC[g.vac.k], bob = Math.sin(BPF.time * 5) * 4;
        ui.round(ctx, g.vac.x - 26, g.vac.y - 30 + bob, 52, 60, 10, '#fff', V.c, 4);
        BPF.drawImg(ctx, 'im_vaccine', g.vac.x - 24, g.vac.y - 28 + bob, 48, 48, { noFallback: true });
        ui.text(ctx, '백신', g.vac.x, g.vac.y + 20 + bob, { size: 13, color: V.c });
      }
      // 병원체(바이러스·세균)
      g.toxins.forEach((t, i) => {
        ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.rot);
        BPF.drawImg(ctx, i % 2 ? 'im_germ_bacteria' : 'im_germ_virus', -t.r - 6, -t.r - 6, t.r * 2 + 12, t.r * 2 + 12, { fallbackColor: '#ff4d6d' });
        ctx.restore();
      });
      // 플레이어 세포 (선택 캐릭터가 주인공)
      const p = g.p;
      if (!(g.inv > 0 && Math.floor(BPF.time * 16) % 2)) {
        ctx.save();
        if (g.dashT > 0) { ctx.globalAlpha = 0.3; ctx.fillStyle = '#7ad0ff'; ctx.beginPath(); ctx.arc(p.x - (p.dx || p.face) * 30, p.y - (p.dy || 0) * 30, p.r, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
        const wob = Math.sin(BPF.time * 6) * 2;
        const gr = ctx.createRadialGradient(p.x - 10, p.y - 10, 5, p.x, p.y, p.r + 8);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#9fe3ff');
        ctx.fillStyle = gr; ctx.strokeStyle = '#2a7ac2'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r + 8 + wob, p.r + 8 - wob, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.clip();
        let st = g.avatar.state === 'mistake' ? 'mistake' : g.avatar.state === 'combo' ? 'combo' : g.avatar.state === 'success' ? 'success' : 'idle';
        if (!BPF.assets.get(`face_${g.avatar.pid}_${st}`)) st = 'idle';
        BPF.drawImg(ctx, `face_${g.avatar.pid}_${st}`, p.x - p.r * 1.25, p.y - p.r * 1.1, p.r * 2.5, p.r * 2.5, { flip: p.face < 0, fallbackColor: BPF_DATA.players[g.avatar.pid].color });
        ctx.restore();
        if (g.vacT > 0) { ctx.save(); ctx.strokeStyle = '#47c4b0'; ctx.lineWidth = 6; ctx.globalAlpha = 0.6 + Math.sin(BPF.time * 12) * 0.3; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 22, 0, 7); ctx.stroke(); ctx.restore(); ui.text(ctx, '면역!', p.x, p.y - p.r - 30, { size: 16, color: '#fff', outline: '#2a8a7a' }); }
        if (g.dashT > 0 || g.inv > 0) { ctx.save(); ctx.strokeStyle = '#ffd84d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 16, 0, 7); ctx.stroke(); ctx.restore(); }
      }
      // 대시 게이지
      ui.round(ctx, AR.x + 16, AR.y + AR.h - 44, 210, 32, 14, 'rgba(255,255,255,.85)', '#3a2a6b', 2);
      ui.gauge(ctx, AR.x + 92, AR.y + AR.h - 38, 126, 20, 1.6 - g.dashCd, 1.6, g.dashCd <= 0 ? '#47c46b' : '#9a9ab0');
      ui.text(ctx, 'Space 대시', AR.x + 54, AR.y + AR.h - 27, { size: 14 });
      // 범례
      ui.round(ctx, AR.x + AR.w - 300, AR.y + AR.h - 44, 284, 32, 14, 'rgba(255,255,255,.85)', '#3a2a6b', 2);
      [['면역 에너지', '#ffd23d'], ['백신=면역', '#47c4b0'], ['병원체 피하기', '#ff4d6d']].forEach((n, i) => { ctx.fillStyle = n[1]; ctx.beginPath(); ctx.arc(AR.x + AR.w - 284 + i * 92, AR.y + AR.h - 28, 8, 0, 7); ctx.fill(); ui.text(ctx, n[0], AR.x + AR.w - 270 + i * 92, AR.y + AR.h - 27, { size: 12, align: 'left' }); });
    }
  });
})();
