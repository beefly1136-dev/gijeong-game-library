/* 07 융합 기술 연금술 — 교과서 228~232쪽: 분야 1장 + 기술 2장을 조합해 융합 기술 제품·시스템 발견 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  const A = () => BPF_DATA.alchemy;
  const POT = { x: 400, y: 150, w: 260, h: 260 };
  const CAT = { field: { name: '분야', color: '#ffb648' }, tech: { name: '기술', color: '#3fb6d6' } };
  const same = (a, b) => a.length === b.length && a.every(x => b.includes(x));
  const techName = id => (A().cards.tech.find(c => c.id === id) || {}).name || id;
  // 정답 판정: 분야가 같고, 기술 2장이 모두 그 제품의 인정 기술(pool) 안에 있으며, must가 있으면 1장 이상 포함
  const poolOf = r => r.pool || r.tech;
  const fits = (r, sel) => r.field === sel.field && sel.tech.length === 2 && sel.tech[0] !== sel.tech[1]
    && sel.tech.every(t => poolOf(r).includes(t)) && (!r.must || sel.tech.some(t => r.must.includes(t)));
  // 한 분야에 제품이 여럿이면 필수 기술(must)이 좁은 제품부터 확인 (예: 로봇+센서 → 웨어러블 로봇)
  const ordered = () => A().recipes.slice().sort((a, b) => (a.must ? a.must.length : 99) - (b.must ? b.must.length : 99));
  BPF.alchemyMatch = sel => ordered().find(r => fits(r, sel)) || null;

  BPF.defineGame('g07', {
    timeLimit: 0, bg: ['#f3dcff', '#d6ecff'], bgKey: 'bg_lab2',
    init(g) {
      g.chances = 12; g.found = []; g.goal = 5; g.slot = { field: null, tech: [] };
      g.msg = '분야 카드 1장 + 기술 카드 2장을 넣고 [조합하기]!'; g.anim = 0; g.result = null;
    },
    hud(g) { return `발견 ${g.found.length}/${g.goal}`; },
    hudRight(g) { return g.mode === 'real' ? `⚗ 남은 기회 ${g.chances}/12` : '⚗ 연습: 기회 무제한'; },
    add(g, cat, card) {
      if (cat === 'field') g.slot.field = g.slot.field === card.id ? null : card.id;
      else {
        if (g.slot.tech.includes(card.id)) g.slot.tech = g.slot.tech.filter(t => t !== card.id);
        else { g.slot.tech.push(card.id); if (g.slot.tech.length > 2) g.slot.tech.shift(); }
      }
      BPF.audio.sfx('pop'); g.avatar.setState('acting');
    },
    combine(g) {
      if (g.anim > 0) return;
      if (!g.slot.field || g.slot.tech.length < 2) { g.msg = '분야 카드 1장과 기술 카드 2장을 모두 넣어야 해요!'; BPF.audio.sfx('bad'); return; }
      if (g.mode === 'real') g.chances--;
      g.actions++; g.anim = 1.0;
      const sel = g.slot;
      const rec = BPF.alchemyMatch(sel);
      if (rec) {
        if (g.found.includes(rec.id)) { g.result = { ok: true, rec }; g.msg = `${rec.name} — 이미 발견했어요! 다른 조합을 찾아봐요.`; g.addPoints(30); g.avatar.setState('thinking'); }
        else {
          g.found.push(rec.id); g.result = { ok: true, rec };
          const first = !BPF.save.data.codex.alchemy[rec.id];
          g.success(200 + (g.combo >= 1 ? 50 * g.combo : 0), POT.x + POT.w / 2, POT.y + 60);
          if (first && g.mode === 'real') ui.floatText(POT.x + POT.w / 2, POT.y + 20, '도감 첫 발견! 🏷', '#ffd84d', 26);
          g.msg = `✨ ${rec.name} 발견! ${rec.hint}` + (same(rec.tech, sel.tech) ? '' : ` (교과서 대표 조합: ${rec.tech.map(t => techName(t)).join('+')})`);
          if (g.found.length >= g.goal) { g.finish(true, { achieve: 1, accuracy: g.good / g.actions, bonus: g.chances / 7 }, '', { alchemy: g.found.slice() }); return; }
        }
      } else {
        let best = null, bs = -1;
        A().recipes.filter(r => !g.found.includes(r.id)).forEach(r => {
          const sc = (r.field === sel.field ? 1 : 0) + sel.tech.filter(t => poolOf(r).includes(t)).length;
          if (sc > bs) { bs = sc; best = r; }
        });
        g.result = { ok: false };
        g.mistake(POT.x + POT.w / 2, POT.y + 60, '펑! 실패');
        const fieldOk = best && best.field === sel.field, techOk = best ? sel.tech.filter(t => poolOf(best).includes(t)).length : 0;
        g.msg = `실패… 힌트: 분야 ${fieldOk ? '✔ 맞는 조합이 있어요' : '✖'} · 기술 ${techOk}장이 어떤 제품과 맞아요. 단서 목록을 참고해요!`;
      }
      g.slot = { field: null, tech: [] };
      if (g.mode === 'real' && g.chances <= 0) g.finish(false, { achieve: g.found.length / g.goal, accuracy: g.good / Math.max(1, g.actions) }, '연구 기회 소진', { alchemy: g.found.slice() });
    },
    update(g, dt) {
      g.anim = Math.max(0, g.anim - dt);
      if (I.key('Space')) this.combine(g);
      if (I.key('Backspace')) g.slot = { field: null, tech: [] };
    },
    cardPos(cat, i) {
      if (cat === 'field') return { x: 24 + (i % 2) * 178, y: 122 + Math.floor(i / 2) * 56 };
      return { x: 24 + (i % 2) * 178, y: 324 + Math.floor(i / 2) * 56 };
    },
    demo(g) {
      const C = A().cards;
      const at = (cat, id) => { const i = C[cat].findIndex(c => c.id === id); const p = this.cardPos(cat, i); return { x: p.x + 85, y: p.y + 25 }; };
      return [
        { x: 845, y: 160, say: '오른쪽 단서를 봐요: 「작물을 자동으로 돌보는 농장」', wait: 1.3 },
        { x: at('field', 'agri').x, y: at('field', 'agri').y, say: '분야 카드: 농업!', act: () => this.add(g, 'field', C.field[0]), wait: 0.6 },
        { x: at('tech', 'iot').x, y: at('tech', 'iot').y, say: '기술 카드: 사물 인터넷(센서로 원격 관찰)', act: () => this.add(g, 'tech', C.tech.find(c => c.id === 'iot')), wait: 0.6 },
        { x: at('tech', 'drone').x, y: at('tech', 'drone').y, say: '기술 카드: 드론(병충해 탐색·농약 살포)', act: () => this.add(g, 'tech', C.tech.find(c => c.id === 'drone')), wait: 0.6 },
        { x: POT.x + 80, y: POT.y + 410, say: '조합하기! 스마트 팜 발견!', act: () => this.combine(g), wait: 1.8 }
      ];
    },
    drawCard(ctx, card, cat, x, y, w, h, on) {
      const hov = ui.hover({ x, y, w, h });
      ui.round(ctx, x, y - (hov ? 3 : 0), w, h, 12, on ? '#fff3a8' : '#fff', on ? '#ff7a00' : '#3a2a6b', on ? 4 : 2.5);
      ui.round(ctx, x, y - (hov ? 3 : 0), 8, h, 4, CAT[cat].color);
      BPF.drawImg(ctx, card.icon, x + 12, y + 6 - (hov ? 3 : 0), h - 12, h - 12, { noFallback: true });
      ui.text(ctx, card.name, x + h + 6 + (w - h - 10) / 2, y + h / 2 - (hov ? 3 : 0), { size: card.name.length > 6 ? 14 : 16 });
    },
    draw(g, ctx) {
      const C = A().cards;
      ui.round(ctx, 14, 86, 370, 624, 18, 'rgba(255,250,240,.93)', '#3a2a6b', 4);
      ui.text(ctx, '분야 카드 (1장)', 28, 108, { size: 17, align: 'left', color: CAT.field.color, outline: '#3a2a6b', ow: 3 });
      C.field.forEach((c, i) => {
        const p = this.cardPos('field', i), r = { x: p.x, y: p.y, w: 170, h: 50 };
        this.drawCard(ctx, c, 'field', p.x, p.y, 170, 50, g.slot.field === c.id);
        if (ui.hit(r)) { I.consume(); this.add(g, 'field', c); }
      });
      ui.text(ctx, '기술 카드 (2장)', 28, 310, { size: 17, align: 'left', color: CAT.tech.color, outline: '#3a2a6b', ow: 3 });
      C.tech.forEach((c, i) => {
        const p = this.cardPos('tech', i), r = { x: p.x, y: p.y, w: 170, h: 50 };
        this.drawCard(ctx, c, 'tech', p.x, p.y, 170, 50, g.slot.tech.includes(c.id));
        if (ui.hit(r)) { I.consume(); this.add(g, 'tech', c); }
      });
      // 조합 장치
      const shake = g.anim > 0 && g.result && !g.result.ok ? Math.sin(BPF.time * 60) * 6 * g.anim : 0;
      const bob = Math.sin(BPF.time * 3) * 4;
      ui.round(ctx, POT.x - 10, POT.y - 50, POT.w + 20, 46, 14, '#7b3fd6', '#3a2a6b', 3);
      ui.text(ctx, '⚗ 융합 기술 조합 장치', POT.x + POT.w / 2, POT.y - 27, { size: 19, color: '#fff' });
      BPF.drawImg(ctx, 'alchemy_pot', POT.x + shake, POT.y + bob, POT.w, POT.h * 0.8);
      if (g.anim > 0 && g.result) {
        if (g.result.ok) {
          ctx.save(); ctx.globalAlpha = Math.min(1, g.anim * 2);
          for (let k = 0; k < 10; k++) { const a = k * 0.63 + BPF.time * 3; ui.star(ctx, POT.x + POT.w / 2 + Math.cos(a) * 110, POT.y + 100 + Math.sin(a) * 80, 12, '#ffd84d', false); }
          BPF.drawImg(ctx, g.result.rec.icon, POT.x + POT.w / 2 - 60, POT.y - 10 - (1 - g.anim) * 40, 120, 120);
          ctx.restore();
        } else {
          ctx.save(); ctx.globalAlpha = g.anim; ctx.fillStyle = '#6a6a7a';
          for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(POT.x + 60 + k * 25, POT.y + 40 - (1 - g.anim) * 80 - (k % 3) * 15, 24 + k % 3 * 8, 0, 7); ctx.fill(); }
          ctx.restore();
        }
      }
      const nm = (cat, id) => (C[cat].find(c => c.id === id) || {}).name || '';
      const slots = [['field', '분야', g.slot.field ? nm('field', g.slot.field) : ''], ['tech', '기술 ①', g.slot.tech[0] ? nm('tech', g.slot.tech[0]) : ''], ['tech', '기술 ②', g.slot.tech[1] ? nm('tech', g.slot.tech[1]) : '']];
      slots.forEach(([cat, label, val], i) => {
        const yy = POT.y + 220 + i * 52;
        ui.round(ctx, POT.x - 10, yy, POT.w + 20, 44, 12, val ? ui.lighten(CAT[cat].color, 0.6) : 'rgba(255,255,255,.85)', '#3a2a6b', 3);
        ui.text(ctx, label, POT.x + 30, yy + 23, { size: 16, color: '#3a2a6b' });
        ui.text(ctx, val || '(비어 있음)', POT.x + POT.w / 2 + 30, yy + 23, { size: 16, color: val ? '#3a2a6b' : '#9a90b0', weight: val ? 'bold' : 'normal' });
      });
      if (ui.button(ctx, POT.x - 10, POT.y + 380, 180, 60, '조합하기! (Space)', { color: '#ff5fa0', size: 19 })) this.combine(g);
      if (ui.button(ctx, POT.x + 180, POT.y + 380, 90, 60, '비우기', { color: '#8a7dff', size: 17 })) g.slot = { field: null, tech: [] };
      // 단서 목록
      ui.round(ctx, 690, 86, 310, 624, 18, 'rgba(255,250,240,.93)', '#3a2a6b', 4);
      ui.text(ctx, '🔎 찾아낼 융합 기술 (5개 이상)', 845, 108, { size: 16, color: '#3a2a6b' });
      A().recipes.forEach((r, i) => {
        const yy = 128 + i * 64, got = g.found.includes(r.id);
        ui.round(ctx, 700, yy, 290, 58, 12, got ? '#e3ffd8' : '#f3edff', got ? '#47c46b' : '#c9b8ff', 2);
        if (got) BPF.drawImg(ctx, r.icon, 706, yy + 4, 50, 50); else BPF.drawSilhouette(ctx, r.icon, 706, yy + 4, 50, 50, '#8a7dbb');
        ui.text(ctx, got ? r.name : '???', 764, yy + 18, { size: 15, align: 'left', color: got ? '#2e6a2a' : '#7a6a99' });
        ui.wrap(ctx, r.clue, 764, yy + 30, 220, { size: 13, color: '#6a5a89' });
      });
      ui.round(ctx, 390, 646, 294, 64, 12, '#fffaf0', '#3a2a6b', 2);
      ui.wrap(ctx, g.msg, 400, 652, 278, { size: 13, lh: 17, weight: 'bold', color: g.result && !g.result.ok ? '#b03040' : '#3a2a6b' });
    }
  });
})();
