/* 발효 상점(2단계) — BP로 먹이·연구키트·장식, 토큰으로 먹이 제작 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  const GOODS = [
    { id: 'food', name: '발효 먹이 ×3', icon: 'res_food', cost: 400, give: { food: 3 }, desc: '건강 +15 (먹이 1개당)' },
    { id: 'research', name: '연구키트 ×2', icon: 'res_research', cost: 500, give: { research: 2 }, desc: '지식 +10, 경험치 +20' },
    { id: 'decor', name: '장식 재료 ×2', icon: 'res_decor', cost: 400, give: { decor: 2 }, desc: '매력 +8' }
  ];
  const DECOR = [
    { id: 'd_flowers', name: '꽃밭', icon: 'flowers', cost: 60, stage: 2 }, { id: 'd_bench', name: '나무 벤치', icon: 'bench', cost: 70, stage: 2 },
    { id: 'd_hay', name: '푹신 건초', icon: 'hay', cost: 50, stage: 2 }, { id: 'd_crate', name: '채소 상자', icon: 'crate', cost: 60, stage: 2 },
    { id: 'd_pink', name: '벚꽃 나무', icon: 'tree_pink', cost: 120, stage: 3 }, { id: 'd_lamp', name: '가로등', icon: 'deco_lamp', cost: 90, stage: 3 },
    { id: 'd_rock', name: '이끼 바위', icon: 'rock', cost: 80, stage: 3 }, { id: 'd_arch', name: '꽃 아치', icon: 'deco_arch', cost: 150, stage: 4 },
    { id: 'd_fountain', name: '작은 분수', icon: 'bld_fountain', cost: 200, stage: 4 }, { id: 'd_tree', name: '큰 나무', icon: 'tree', cost: 100, stage: 3 }
  ];
  BPF.DECOR = DECOR;
  BPF.scenes.shop = {
    enter(p) { this.back = p.back || 'village'; BPF.audio.bgm('town'); },
    update() { if (I.key('Escape')) BPF.go(this.back, { from: 'shop' }); },
    buy(cost, fn) {
      const d = BPF.save.data;
      if (d.res.bp < cost) { BPF.toast('BP가 부족해요! 미니게임으로 모아요.', '#b03040'); BPF.audio.sfx('bad'); return; }
      d.res.bp -= cost; fn(); BPF.save.write('shop'); BPF.audio.sfx('coin');
    },
    draw(ctx) {
      const d = BPF.save.data;
      ui.bg(ctx, '#ffe6c7', '#ffd0e0', 'bg_ferment');
      ui.topBar(ctx, '발효 상점', 150);
      BPF.drawNPC(ctx, 'shop', 110, 300, false);
      ui.round(ctx, 40, 340, 150, 60, 14, '#fff', '#3a2a6b', 2);
      ui.wrap(ctx, '천천히 골라요~', 115, 360, 130, { size: 15, align: 'center' });
      // 소모품
      ui.panel(ctx, 220, 96, 1040, 230, { title: '돌봄 재료', titleColor: '#ff9a4d' });
      GOODS.forEach((gd, i) => {
        const x = 250 + i * 336;
        ui.round(ctx, x, 120, 316, 190, 16, '#fffaf0', '#c9b8ff', 2);
        BPF.drawImg(ctx, gd.icon, x + 12, 130, 90, 90);
        ui.text(ctx, gd.name, x + 110, 150, { size: 20, align: 'left' });
        ui.text(ctx, gd.desc, x + 110, 180, { size: 14, align: 'left', color: '#5a4a8b', weight: 'normal' });
        if (ui.button(ctx, x + 70, 240, 180, 52, `${gd.cost} BP`, { color: '#47c46b', size: 20, icon: 'ic_star' })) this.buy(gd.cost, () => { BPF.save.addRes(gd.give); BPF.toast(`${gd.name} 구입!`); });
      });
      // 먹이 제작
      const tk = d.tokens;
      const mats = (tk.culture || 0) + (tk.seed || 0) + (tk.protein || 0) + (tk.env || 0);
      ui.round(ctx, 40, 420, 170, 270, 16, '#fff6e8', '#3a2a6b', 3);
      ui.text(ctx, '🍳 먹이 제작', 125, 446, { size: 18 });
      ui.wrap(ctx, `미니게임 재료 토큰 1개 → 먹이 2개\n\n보유 토큰: ${mats}개`, 125, 470, 150, { size: 14, align: 'center' });
      if (ui.button(ctx, 55, 610, 140, 56, '제작!', { color: '#ff9a4d', size: 20, disabled: mats <= 0 })) {
        const k = ['culture', 'seed', 'protein', 'env'].find(k => tk[k] > 0);
        tk[k]--; d.res.food += 2; BPF.save.write('craft'); BPF.audio.sfx('coin'); BPF.toast('먹이 2개를 만들었어요!');
      }
      // 장식
      ui.panel(ctx, 220, 356, 1040, 340, { title: '농장 장식 (사서 육성 방에 직접 놓아요)', titleColor: '#ff5fa0' });
      DECOR.forEach((dc, i) => {
        const x = 240 + (i % 5) * 204, y = 380 + Math.floor(i / 5) * 152;
        const own = d.inventory.decor.includes(dc.id), lock = d.villageStage < dc.stage;
        ui.round(ctx, x, y, 194, 144, 14, own ? '#e3ffd8' : '#fffaf0', '#c9b8ff', 2);
        ctx.save(); if (lock) ctx.globalAlpha = 0.4;
        BPF.drawImg(ctx, dc.icon, x + 10, y + 8, 70, 70);
        ctx.restore();
        ui.text(ctx, dc.name, x + 136, y + 30, { size: 16 });
        ui.text(ctx, lock ? `🔒 ${dc.stage}단계` : own ? '보유 중' : `${dc.cost} BP`, x + 136, y + 58, { size: 15, color: lock ? '#9a90b0' : '#c2185b' });
        if (!own && !lock && ui.button(ctx, x + 30, y + 90, 134, 44, '구입', { color: '#ff5fa0', size: 17 })) this.buy(dc.cost, () => { d.inventory.decor.push(dc.id); BPF.save.addRes({ decor: 1 }); BPF.toast(`${dc.name} 구입! 육성 농장의 [🪑 장식 배치]로 방에 직접 놓아요. (장식 +1)`); });
      });
      if (ui.button(ctx, 1120, 14, 140, 44, '마을로', { color: '#8a7dff', size: 18 })) BPF.go(this.back, { from: 'shop' });
    }
  };
})();
