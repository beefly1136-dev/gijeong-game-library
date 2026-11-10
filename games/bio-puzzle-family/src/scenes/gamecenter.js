/* 미니게임 센터 — 10종 게임 선택(처음 랜덤 3개 개방, 마을 승급마다 추가 개방), 개인 최고 기록·등급 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  const GC = { 'S': '#ff5fa0', 'A': '#ff9a00', 'B': '#3f8cff', 'C': '#47c46b', 'D': '#9a90b0' };
  BPF.scenes.gamecenter = {
    enter(p) {
      this.idx = this.idx || 0;
      BPF.save.ensureUnlocks();
      this.avatar = new BPF.PlayerAvatar().mount({ id: 'village' }, BPF.save.player, BPF.save.data.selectedCostumeId, { x: 1020, y: 76, w: 252, h: 486 });
      this.avatar.line = '어떤 연구를 해 볼까?';
      BPF.audio.bgm('main');
    },
    exit() { this.avatar && this.avatar.unmount(); },
    update(dt) {
      this.avatar.update(dt);
      if (I.any('ArrowLeft', 'KeyA')) { this.idx = (this.idx + 9) % 10; this.hint(); }
      if (I.any('ArrowRight', 'KeyD')) { this.idx = (this.idx + 1) % 10; this.hint(); }
      if (I.any('ArrowUp', 'KeyW', 'ArrowDown', 'KeyS')) { this.idx = (this.idx + 5) % 10; this.hint(); }
      if (I.confirm()) this.play(this.idx);
      if (I.key('Escape')) BPF.go('village', { from: 'gamecenter' });
    },
    hint() { BPF.audio.sfx('move'); this.avatar.setState('thinking', { line: BPF_DATA.games[this.idx].title + '?' }); },
    play(i) {
      const G = BPF_DATA.games[i];
      if (!BPF.save.isUnlocked(G.id)) { BPF.audio.sfx('bad'); BPF.toast('🔒 연구소를 승급하면 새 미니게임이 열려요!'); return; }
      BPF.audio.sfx('ok'); BPF.go('play', { id: G.id });
    },
    draw(ctx) {
      const d = BPF.save.data;
      ui.bg(ctx, '#a8d8ff', '#e0c8ff', 'bg_lab2');
      ui.topBar(ctx, '미니게임 센터', 150);
      if (ui.button(ctx, 1120, 14, 140, 44, '마을로', { color: '#8a7dff', size: 18 })) BPF.go('village', { from: 'gamecenter' });
      ui.text(ctx, `열린 게임 ${d.unlockedGames.length}/10 · 클리어 ${BPF.save.clearedCount()} · 연구소를 승급하면 새 게임이 열려요`, 506, 92, { size: 17, color: '#3a2a6b' });
      BPF_DATA.games.forEach((G, i) => {
        const col = i % 5, row = Math.floor(i / 5);
        const x = 18 + col * 198, y = 112 + row * 296, w = 186, h = 280;
        const sel = this.idx === i;
        const r = { x, y, w, h };
        const hov = ui.hover(r);
        const best = d.best[G.id];
        ctx.save();
        const lift = sel ? -6 : hov ? -3 : 0;
        ctx.translate(0, lift);
        if (sel) { ctx.shadowColor = G.color; ctx.shadowBlur = 24; }
        ui.round(ctx, x, y, w, h, 20, '#fffaf0', sel ? '#ff7a00' : '#3a2a6b', sel ? 6 : 4);
        ctx.restore();
        ctx.save(); ctx.translate(0, lift);
        const g = ctx.createLinearGradient(0, y, 0, y + 150); g.addColorStop(0, ui.lighten(G.color, 0.5)); g.addColorStop(1, G.color);
        ui.round(ctx, x + 10, y + 10, w - 20, 150, 14, g);
        BPF.drawImg(ctx, G.icon, x + w / 2 - 60, y + 22, 120, 120);
        ui.round(ctx, x + 14, y + 14, 44, 32, 10, '#fff', '#3a2a6b', 2);
        ui.text(ctx, G.no, x + 36, y + 31, { size: 18 });
        ui.wrap(ctx, G.title, x + w / 2, y + 170, w - 16, { size: 18, align: 'center', weight: 'bold', lh: 22 });
        const rk = Object.keys(G.reward)[0];
        ui.round(ctx, x + 22, y + 210, w - 44, 24, 12, '#fff3c4', '#ffb648', 2);
        BPF.drawImg(ctx, BPF.RES_ICON[rk], x + 26, y + 211, 22, 22, { noFallback: true });
        ui.text(ctx, `보상: ${BPF.RES_NAME[rk]}`, x + w / 2 + 10, y + 223, { size: 13, color: '#7a4a00' });
        if (best.grade) {
          ui.round(ctx, x + 12, y + 236, 48, 36, 10, GC[best.grade] || '#999', '#3a2a6b', 2);
          ui.text(ctx, best.grade, x + 36, y + 255, { size: 22, color: '#fff', outline: '#3a2a6b' });
          ui.text(ctx, `${best.points.toLocaleString()}점`, x + 66, y + 248, { size: 14, align: 'left', color: '#c2185b' });
          ui.text(ctx, best.clears ? `클리어 ${best.clears}회` : '미클리어', x + 66, y + 266, { size: 12, align: 'left', color: '#7a6a99', weight: 'normal' });
        } else ui.text(ctx, '첫 도전!', x + w / 2, y + 256, { size: 16, color: '#47a35b' });
        ctx.restore();
        if (!BPF.save.isUnlocked(G.id)) {
          ctx.save(); ctx.translate(0, lift);
          ui.round(ctx, x, y, w, h, 20, 'rgba(60,50,90,.72)');
          ui.text(ctx, '🔒', x + w / 2, y + 110, { size: 54 });
          ui.wrap(ctx, '연구소를 승급하면 열려요', x + w / 2, y + 160, w - 24, { size: 16, align: 'center', weight: 'bold', color: '#fff' });
          ctx.restore();
        }
        if (ui.hit(r)) { I.consume(); if (this.idx === i) this.play(i); else { this.idx = i; this.hint(); } }
      });
      this.avatar.draw(ctx);
      // 동반 동물
      const pet = BPF.save.pet;
      ui.round(ctx, 1020, 570, 252, 142, 18, 'rgba(255,250,240,.95)', '#3a2a6b', 4);
      if (pet) {
        BPF.drawPet(ctx, d.companionId, pet.stage, 1080, 700, 110);
        ui.text(ctx, pet.name, 1200, 600, { size: 18, color: BPF_DATA.pets[d.companionId].color, outline: '#3a2a6b', ow: 3 });
        ui.text(ctx, `${pet.stage}단계 · XP ${pet.xp}`, 1200, 628, { size: 14, color: '#5a4a8b' });
        ui.text(ctx, `🍖${d.res.food} 🔬${d.res.research} 🎀${d.res.decor}`, 1200, 656, { size: 14, color: '#3a2a6b' });
        ui.text(ctx, '클리어하면 재료 획득!', 1200, 684, { size: 12, color: '#c2185b' });
      } else ui.text(ctx, '농장에서 동물을 입양해요', 1146, 640, { size: 15 });
    }
  };
})();
