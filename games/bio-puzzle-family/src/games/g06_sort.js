/* 06 생명 기술 분류 센터 — 교과서 214~215쪽 [Ⅶ-2] 생명 기술의 활용 분야
   컨베이어로 내려오는 생명 기술 상자를 의료 / 식량 생산·농업 / 환경·에너지 분야 출구로 보내기 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  // 분야 (교과서 214~215쪽)
  const FIELDS = [
    { id: 'med', name: '의료', key: '←', color: '#ff7a9a', icon: 'fu_field_med',
      desc: '의약품·의료 기술 개발: 백신, 바이오 의약품, 신약, 질병 진단·치료, 줄기세포 연구' },
    { id: 'food', name: '식량·농업', key: '↓', color: '#5fbf3f', icon: 'fu_field_agri',
      desc: '농업·임업·수산업에 적용: 우수한 동식물 품종 개발, 종자 개발, 작물 보호' },
    { id: 'env', name: '환경·에너지', key: '→', color: '#3fb6d6', icon: 'cl_env_lake',
      desc: '친환경 에너지 생산(바이오 에너지)과 환경 정화(생물 정화)' }
  ];
  const ITEMS = [
    // 의료
    { t: '독감 백신', f: 'med', icon: 'im_vaccine', why: '백신은 감염병 예방을 위한 의약품이라 의료 분야예요.' },
    { t: '바이오 의약품 생산', f: 'med', icon: 'rc_ecoli', why: '미생물로 단백질 의약품(인슐린 등)을 만드는 의료 분야 기술이에요.' },
    { t: '신약 개발', f: 'med', icon: 'drug_new', why: '새로운 의약품을 개발하는 일은 의료 분야예요.' },
    { t: '유전적 질병 진단', f: 'med', icon: 'dg_tool_pcr', why: 'DNA를 분석해 질병을 진단하는 기술은 의료 분야예요.' },
    { t: '유전자 치료', f: 'med', icon: 'rc_vector', why: '정상 유전자를 넣어 질병을 치료하는 의료 분야 기술이에요.' },
    { t: '줄기세포 연구', f: 'med', icon: 'rc_cell', why: '줄기세포로 손상된 장기를 대체하는 연구는 의료 분야예요.' },
    { t: '인공 장기 개발', f: 'med', icon: 'rc_heart', why: '손상된 장기를 대신하는 인공 장기는 의료 분야예요.' },
    // 식량 생산·농업
    { t: '제초제 저항성 콩', f: 'food', icon: 'gm_crop_soy', why: '제초제에 견디는 작물 품종 개발은 식량 생산·농업 분야예요.' },
    { t: '가뭄 저항성 옥수수', f: 'food', icon: 'gm_crop_corn', why: '가뭄에 강한 작물을 만드는 것은 식량 생산·농업 분야예요.' },
    { t: '소비 기한 늘린 토마토', f: 'food', icon: 'gm_crop_tomato', why: '오래 보관되는 농산물 개발은 식량 생산·농업 분야예요.' },
    { t: '우수한 벼 품종 개발', f: 'food', icon: 'gm_crop_rice', why: '수확량이 많은 우수 품종 개발은 식량 생산·농업 분야예요.' },
    { t: '종자 개발', f: 'food', icon: 'seed_0', why: '더 좋은 씨앗을 만드는 종자 개발은 농업 분야예요.' },
    { t: '병충해에서 작물 보호', f: 'food', icon: 'gm_crop_soy_trouble', why: '작물 보호는 식량 생산·농업 분야의 일이에요.' },
    { t: '양식 물고기 품종 개량', f: 'food', icon: 'card_fish', why: '수산업에 생명 기술을 적용하는 것도 식량 생산 분야예요.' },
    // 환경·에너지
    { t: '바이오에탄올', f: 'env', icon: 'fm_prod_ethanol', why: '곡물·식물로 만드는 연료는 바이오 에너지(환경·에너지 분야)예요.' },
    { t: '바이오가스', f: 'env', icon: 'fm_prod_biogas', why: '가축 분뇨·음식물 쓰레기로 만드는 가스 연료는 환경·에너지 분야예요.' },
    { t: '기름 분해 미생물', f: 'env', icon: 'cl_tile_oil', why: '미생물로 기름 오염을 없애는 생물 정화는 환경 분야예요.' },
    { t: '오염 흡수 정화 식물', f: 'env', icon: 'cl_tile_plant', why: '식물로 토양·물의 오염을 줄이는 생물 정화는 환경 분야예요.' },
    { t: '미세조류 수질 정화', f: 'env', icon: 'cl_tile_algae', why: '미세조류로 물속 질소·인을 흡수하는 것은 환경 정화예요.' },
    { t: '음식물 쓰레기 퇴비화', f: 'env', icon: 'cl_tile_compost', why: '미생물로 유기물 쓰레기를 분해하는 것은 환경 분야예요.' }
  ];
  const GOAL = 20, MAX_MISS = 5;
  const CX = 520, TOP = 150, BOTTOM = 445;            // 상자가 내려오는 길
  const GATE_Y = 540, GATE_W = 290, GATE_H = 150;
  const gateX = k => 40 + k * 320;

  BPF.defineGame('g06', {
    timeLimit: 90, bg: ['#e8fff0', '#d6ecff'], bgKey: 'bg_lab2',
    init(g) {
      g.right = 0; g.miss = 0; g.deck = []; g.box = null; g.fly = []; g.flashGate = null;
      g.msg = '상자에 적힌 생명 기술이 어느 분야인지 골라 출구로 보내요!';
      this.spawn(g);
    },
    hud(g) { return `분류 성공 ${g.right}/${GOAL} · 실수 ${g.miss}/${MAX_MISS}`; },
    nextItem(g) { if (!g.deck.length) g.deck = BPF.shuffle(ITEMS.slice()); return g.deck.pop(); },
    fallTime(g) { return g.mode === 'real' ? Math.max(2.6, 6.2 - g.right * 0.18) : 9; },
    spawn(g) { g.box = { it: this.nextItem(g), p: 0, dur: this.fallTime(g) }; },
    send(g, k) {
      const b = g.box; if (!b || g.over) return;
      const F = FIELDS[k], ok = b.it.f === F.id, y = TOP + (BOTTOM - TOP) * b.p;
      g.actions++;
      g.fly.push({ it: b.it, x0: CX, y0: y, x1: gateX(k) + GATE_W / 2, y1: GATE_Y + 40, t: 0, ok });
      g.flashGate = { k, ok, t: 0.5 };
      if (ok) {
        g.right++;
        const quick = Math.round((1 - b.p) * 40);
        g.success(100 + quick + (g.combo >= 2 ? 20 * g.combo : 0), gateX(k) + GATE_W / 2, GATE_Y);
        g.msg = `⭕ ${b.it.t} → ${F.name}. ${b.it.why}`;
        if (g.right >= GOAL) { g.box = null; g.finish(true, { achieve: 1, accuracy: g.good / g.actions, bonus: 0.5 * g.timeLeft / 50 + 0.5 * Math.min(1, g.maxCombo / 10) }); return; }
      } else {
        const R = FIELDS.find(f => f.id === b.it.f);
        g.miss++;
        g.mistake(gateX(k) + GATE_W / 2, GATE_Y, `${R.name} 분야예요!`);
        g.msg = `❌ ${b.it.t}은(는) 「${R.name}」 분야! ${b.it.why}`;
        if (this.checkFail(g)) return;
      }
      this.spawn(g);
    },
    checkFail(g) {
      if (g.miss >= MAX_MISS) { g.box = null; g.finish(false, { achieve: g.right / GOAL, accuracy: g.good / Math.max(1, g.actions) }, `실수 ${MAX_MISS}번…`); return true; }
      return false;
    },
    update(g, dt) {
      g.fly.forEach(f => f.t += dt * 2.4); g.fly = g.fly.filter(f => f.t < 1);
      if (g.flashGate) { g.flashGate.t -= dt; if (g.flashGate.t <= 0) g.flashGate = null; }
      const b = g.box; if (!b) return;
      if (!g.demoHold) b.p += dt / b.dur;
      if (b.p >= 1) {
        const R = FIELDS.find(f => f.id === b.it.f);
        g.actions++; g.miss++;
        g.mistake(CX, BOTTOM, '놓쳤어요!');
        g.msg = `⏱ 놓쳤어요! ${b.it.t}은(는) 「${R.name}」 분야. ${b.it.why}`;
        if (this.checkFail(g)) return;
        this.spawn(g);
        return;
      }
      if (I.any('ArrowLeft', 'KeyA', 'Digit1')) this.send(g, 0);
      else if (I.any('ArrowDown', 'KeyS', 'Digit2')) this.send(g, 1);
      else if (I.any('ArrowRight', 'KeyD', 'Digit3')) this.send(g, 2);
    },
    onTimeUp(g) { g.finish(false, { achieve: g.right / GOAL, accuracy: g.good / Math.max(1, g.actions) }, '시간 종료!'); },
    demoSetup(g) {
      g.demoHold = true;
      g.deck = [ITEMS.find(i => i.t === '바이오에탄올'), ITEMS.find(i => i.t === '가뭄 저항성 옥수수')];
      g.box = { it: ITEMS.find(i => i.t === '독감 백신'), p: 0.25, dur: 9 };
    },
    demo(g) {
      const gate = k => ({ x: gateX(k) + GATE_W / 2, y: GATE_Y + 70 });
      return [
        { x: CX, y: () => TOP + (BOTTOM - TOP) * (g.box ? g.box.p : 0.3) + 40, say: '컨베이어로 생명 기술 상자가 내려와요. 「독감 백신」!', wait: 1.4 },
        { x: gate(0).x, y: gate(0).y, say: '백신은 의료 분야! ← 키나 왼쪽 출구를 눌러요.', act: () => this.send(g, 0), wait: 1.3 },
        { x: CX, y: 220, say: '「가뭄 저항성 옥수수」는 어느 분야일까?', act: () => { if (g.box) g.box.p = 0.25; }, wait: 1.2 },
        { x: gate(1).x, y: gate(1).y, say: '작물 품종 개발은 식량·농업! ↓ 키', act: () => this.send(g, 1), wait: 1.3 },
        { x: gate(2).x, y: gate(2).y, say: '바이오에탄올은 바이오 에너지라서 환경·에너지! → 키', act: () => { if (g.box) g.box.p = 0.3; this.send(g, 2); }, wait: 1.3 },
        { x: CX, y: 300, say: '상자가 바닥에 닿기 전에 보내야 해요. 점점 빨라져요!', act: () => { g.demoHold = false; }, wait: 1.4 }
      ];
    },
    drawBox(ctx, it, x, y, s, alpha) {
      ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
      const w = 250 * s, h = 132 * s;
      ui.round(ctx, x - w / 2, y - h / 2, w, h, 14 * s, '#f6d9a8', '#3a2a6b', 4 * s);
      ctx.fillStyle = 'rgba(160,110,50,.35)'; ctx.fillRect(x - 12 * s, y - h / 2 + 3, 24 * s, h - 6);
      BPF.drawImg(ctx, it.icon, x - w / 2 + 10 * s, y - h / 2 + 12 * s, 84 * s, 84 * s, { noFallback: true });
      ui.round(ctx, x - w / 2 + 10 * s, y + h / 2 - 34 * s, w - 20 * s, 26 * s, 8 * s, '#fffaf0', '#3a2a6b', 2);
      const fs = Math.min(17, Math.floor((w - 30 * s) / Math.max(1, it.t.length) * 1.05)) * Math.min(1, s * 1.1);
      ui.text(ctx, it.t, x, y + h / 2 - 21 * s, { size: Math.max(10, fs), color: '#3a2a6b' });
      ui.text(ctx, '?', x + w / 2 - 50 * s, y - 14 * s, { size: 46 * s, color: '#fff', outline: '#c08a3a' });
      ctx.restore();
    },
    draw(g, ctx) {
      // 컨베이어
      ui.round(ctx, CX - 160, TOP - 30, 320, BOTTOM - TOP + 120, 24, 'rgba(70,60,110,.85)', '#3a2a6b', 4);
      ctx.save(); ui.path(ctx, CX - 150, TOP - 20, 300, BOTTOM - TOP + 100, 18); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 6;
      const off = (BPF.time * 60) % 40;
      for (let y = TOP - 60 + off; y < BOTTOM + 120; y += 40) { ctx.beginPath(); ctx.moveTo(CX - 150, y); ctx.lineTo(CX + 150, y); ctx.stroke(); }
      ctx.restore();
      ui.text(ctx, '📦 생명 기술 분류 센터', CX, TOP - 48, { size: 20, color: '#3a2a6b', outline: '#fff' });
      // 다음 상자 미리보기
      const nx = g.deck.length ? g.deck[g.deck.length - 1] : null;
      if (nx) {
        ui.text(ctx, '다음', CX + 230, TOP - 6, { size: 15, color: '#5a4a8b' });
        this.drawBox(ctx, nx, CX + 230, TOP + 50, 0.45, 0.8);
      }
      // 현재 상자
      if (g.box) {
        const y = TOP + (BOTTOM - TOP) * g.box.p;
        this.drawBox(ctx, g.box.it, CX, y, 1);
        const danger = g.box.p > 0.72;
        if (danger) ui.text(ctx, '서둘러요!', CX, y - 84, { size: 20 + Math.sin(BPF.time * 14) * 2, color: '#ff4d6d', outline: '#fff' });
      }
      // 출구(게이트)
      FIELDS.forEach((F, k) => {
        const x = gateX(k), r = { x, y: GATE_Y, w: GATE_W, h: GATE_H };
        const fl = g.flashGate && g.flashGate.k === k ? g.flashGate : null;
        const hov = ui.hover(r);
        ui.round(ctx, x, GATE_Y - (hov ? 3 : 0), GATE_W, GATE_H, 20, fl ? (fl.ok ? '#e3ffd8' : '#ffe0e0') : ui.lighten(F.color, 0.78), fl ? (fl.ok ? '#47c46b' : '#ff4d6d') : '#3a2a6b', fl ? 6 : 4);
        ui.round(ctx, x, GATE_Y - (hov ? 3 : 0), GATE_W, 40, 18, F.color);
        ui.text(ctx, `${F.key}  ${F.name} 분야`, x + GATE_W / 2, GATE_Y + 20 - (hov ? 3 : 0), { size: 21, color: '#fff', outline: '#3a2a6b' });
        BPF.drawImg(ctx, F.icon, x + 8, GATE_Y + 46, 64, 64, { noFallback: true });
        ui.fitWrap(ctx, F.desc, x + 78, GATE_Y + 48, GATE_W - 88, 96, { size: 14, lh: 19, color: '#3a2a6b' });
        if (ui.hit(r)) { I.consume(); this.send(g, k); }
      });
      // 날아가는 상자
      g.fly.forEach(f => {
        const e = BPF.ease ? BPF.ease(f.t) : f.t;
        this.drawBox(ctx, f.it, f.x0 + (f.x1 - f.x0) * e, f.y0 + (f.y1 - f.y0) * e, 1 - e * 0.7, 1 - f.t * 0.6);
      });
      // 안내
      ui.round(ctx, CX + 175, TOP + 110, 300, 230, 16, 'rgba(255,250,240,.95)', '#3a2a6b', 3);
      ui.text(ctx, '💡 분류 결과', CX + 325, TOP + 130, { size: 16, color: '#7b3fd6' });
      ui.fitWrap(ctx, g.msg || '', CX + 190, TOP + 148, 270, 184, { size: 16, lh: 23, weight: 'bold', color: (g.msg || '')[0] === '⭕' ? '#2e6a2a' : (g.msg || '')[0] === '❌' || (g.msg || '')[0] === '⏱' ? '#b03040' : '#3a2a6b' });
      ui.round(ctx, 20, TOP + 110, 170, 230, 16, 'rgba(255,250,240,.95)', '#3a2a6b', 3);
      ui.fitWrap(ctx, '생명 기술의 활용 분야는 크게 의료, 식량 생산·농업, 환경·에너지 분야로 나눠요. (교과서 214~215쪽)', 32, TOP + 124, 146, 206, { size: 15, lh: 22, weight: 'bold', color: '#5a4a8b' });
    }
  });
})();
