/* 엔딩 앨범 — 4종 × 5단계 성장 기록(이전 모습 보존) + 개체별 엔딩 + 마을 엔딩 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  BPF.scenes.album = {
    enter(p) {
      this.back = p.back || 'village';
      this.page = Math.max(0, BPF.save.PET_IDS.indexOf(p.pet || BPF.save.data.companionId || 'lulu'));
      this.ending = !!p.ending; this.big = null;
      BPF.audio.bgm(this.ending ? 'ending' : 'farm');
    },
    update() {
      if (I.key('Escape')) { if (this.ending || this.big) { this.ending = false; this.big = null; } else BPF.go(this.back, { from: 'album' }); }
      if (!this.ending && !this.big) {
        if (I.any('ArrowLeft', 'KeyA')) this.page = (this.page + 4) % 5;
        if (I.any('ArrowRight', 'KeyD')) this.page = (this.page + 1) % 5;
      } else if (I.confirm()) { this.ending = false; this.big = null; }
    },
    draw(ctx) {
      const d = BPF.save.data;
      ui.bg(ctx, '#ffe9c9', '#ffd0e6');
      // 앨범 책
      ui.round(ctx, 40, 20, 1200, 680, 30, '#a0522d', '#3a2a6b', 5);
      ui.round(ctx, 60, 36, 1160, 648, 22, '#fff8ec', '#7a3a1a', 3);
      ctx.strokeStyle = '#e0c8a8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(640, 40); ctx.lineTo(640, 680); ctx.stroke();
      ui.text(ctx, '📖 엔딩 앨범', 160, 70, { size: 26, color: '#7a3a1a' });
      // 탭
      const tabs = BPF.save.PET_IDS.map(id => BPF_DATA.pets[id].name).concat(['마을']);
      tabs.forEach((t, i) => {
        if (ui.button(ctx, 300 + i * 150, 48, 140, 42, t, { color: i === this.page ? '#ff5fa0' : '#c8a888', size: 17, focus: i === this.page })) { this.page = i; this.ending = false; }
      });
      if (this.page < 4) this.drawPet(ctx, BPF.save.PET_IDS[this.page]);
      else this.drawVillage(ctx);
      if (ui.button(ctx, 1080, 620, 130, 50, '닫기', { color: '#8a7dff', size: 18 })) BPF.go(this.back, { from: 'album' });
      if (this.big) this.drawBig(ctx);
    },
    drawPet(ctx, id) {
      const d = BPF.save.data, pet = d.pets[id], D = BPF_DATA.pets[id];
      if (this.ending && pet.ended) return this.drawEnding(ctx, id);
      ui.text(ctx, `${pet.adopted ? pet.name : D.name} — ${D.kind}`, 350, 130, { size: 28, color: D.color, outline: '#3a2a6b', ow: 4 });
      ui.text(ctx, pet.adopted ? `입양일 ${new Date(pet.adoptedAt || Date.now()).toLocaleDateString('ko-KR')}` : '아직 입양하지 않았어요', 350, 166, { size: 16, color: '#7a6a5a' });
      // 성장 단계 사진
      for (let s = 1; s <= 5; s++) {
        const seen = pet.adopted && pet.seenStages.includes(s);
        const x = s <= 3 ? 90 + (s - 1) * 180 : 760 + (s - 4) * 220, y = s <= 3 ? 200 : 140;
        const w = s <= 3 ? 170 : 200, h = s <= 3 ? 210 : 240;
        const r = { x, y, w, h };
        ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate((s % 2 ? -1 : 1) * 0.03);
        ui.round(ctx, -w / 2, -h / 2, w, h, 6, '#fff', '#c8a888', 3);
        ui.round(ctx, -w / 2 + 10, -h / 2 + 10, w - 20, h - 50, 4, seen ? ui.lighten(D.color, 0.8) : '#e8e0d8');
        if (seen) BPF.drawPet(ctx, id, s, 0, h / 2 - 44, Math.min(w - 24, h - 60));
        else BPF.drawPet(ctx, id, s, 0, h / 2 - 44, Math.min(w - 24, h - 60), { silhouette: true, silColor: '#b8aca0' });
        ui.text(ctx, seen ? `${s}단계 ${D.stages[s - 1]}` : `${s}단계 ???`, 0, h / 2 - 20, { size: 13, color: '#5a4a3a' });
        ctx.restore();
        if (seen && ui.hit(r)) { I.consume(); this.big = { id, s }; }
      }
      // 이야기
      ui.round(ctx, 90, 450, 520, 200, 16, '#fff3e0', '#c8a888', 2);
      ui.wrap(ctx, `${D.personality}\n\n${pet.adopted ? `지금: ${pet.stage}단계 · XP ${pet.xp} · 애정 ${Math.round(pet.stats.love)}` : '육성 농장에서 입양할 수 있어요.'}\n(사진을 누르면 크게 보여요)`, 110, 466, 480, { size: 16, lh: 24, color: '#5a3a1a' });
      // 엔딩
      ui.round(ctx, 700, 420, 480, 180, 16, pet.ended ? '#fff0f6' : '#efe8e0', '#c8a888', 2);
      if (pet.ended) {
        ui.text(ctx, '🌟 엔딩 달성!', 940, 450, { size: 22, color: '#c2185b' });
        ui.wrap(ctx, D.ending.slice(0, 60) + '…', 720, 476, 440, { size: 15, color: '#5a3a1a' });
        if (ui.button(ctx, 840, 548, 200, 44, '엔딩 다시 보기', { color: '#ff5fa0', size: 17 })) this.ending = true;
      } else {
        ui.text(ctx, '🔒 엔딩', 940, 470, { size: 22, color: '#9a8a7a' });
        ui.wrap(ctx, '최종 5단계까지 키우면 이 동물만의 엔딩을 볼 수 있어요!', 720, 500, 440, { size: 16, align: 'left', color: '#7a6a5a' });
      }
    },
    drawEnding(ctx, id) {
      const D = BPF_DATA.pets[id], pet = BPF.save.data.pets[id];
      const g = ctx.createLinearGradient(0, 100, 0, 680); g.addColorStop(0, '#1d1a4a'); g.addColorStop(1, D.color);
      ui.round(ctx, 70, 100, 1140, 580, 20, g);
      for (let i = 0; i < 40; i++) ui.star(ctx, 80 + (i * 211) % 1120, 110 + (i * 97) % 300, 3 + i % 4 * 2, '#fff8c0', false);
      BPF.drawPet(ctx, id, 5, 400, 640, 460);
      BPF.drawPlayerBody(ctx, BPF.save.player, 820, 640, 230);
      ui.round(ctx, 640, 140, 540, 250, 18, 'rgba(255,255,255,.9)', '#3a2a6b', 3);
      ui.text(ctx, `${pet.name}의 엔딩`, 910, 172, { size: 26, color: D.color, outline: '#3a2a6b', ow: 4 });
      ui.wrap(ctx, D.ending, 664, 200, 492, { size: 18, lh: 28 });
      if (ui.button(ctx, 90, 610, 160, 50, '← 앨범', { color: '#8a7dff', size: 18 })) this.ending = false;
    },
    drawVillage(ctx) {
      const d = BPF.save.data;
      ui.text(ctx, '연구 마을의 기록', 350, 130, { size: 28, color: '#7a3a1a' });
      for (let s = 1; s <= 5; s++) {
        const on = s <= d.villageStage, x = 90 + (s - 1) * 220;
        ui.round(ctx, x, 170, 200, 150, 8, on ? '#fff' : '#e8e0d8', '#c8a888', 3);
        if (on) {
          BPF.drawImg(ctx, s >= 4 ? 'bld_institute' : s >= 3 ? 'bld_greenhouse' : s >= 2 ? 'bld_shop' : 'bld_lab', x + 20, 180, 160, 100);
          ui.text(ctx, `${s}. ${BPF_DATA.village[s].name}`, x + 100, 300, { size: 15, color: '#5a3a1a' });
        } else ui.text(ctx, '🔒', x + 100, 245, { size: 36 });
      }
      // 기록 요약
      const cleared = BPF.save.clearedCount();
      const lines = [`클리어한 미니게임: ${cleared} / 10`, `총 플레이: ${d.stats.totalPlays}회 · 모은 BP: ${d.stats.totalBP}`, `동물 엔딩: ${Object.keys(d.endings).filter(k => k !== 'village').length} / 4`, `인증: ${d.certs.gmoBasic ? 'GMO 기초 ✔ ' : ''}${d.certs.gmoSafety ? 'GMO 안전성 ✔' : ''}`];
      lines.forEach((l, i) => ui.text(ctx, l, 110, 370 + i * 34, { size: 19, align: 'left', color: '#5a3a1a' }));
      ui.round(ctx, 700, 350, 480, 240, 16, d.endings.village ? '#fff0f6' : '#efe8e0', '#c8a888', 2);
      if (d.endings.village) {
        ui.text(ctx, '🎉 바이오빌리지 축제 엔딩', 940, 390, { size: 22, color: '#c2185b' });
        if (ui.button(ctx, 840, 500, 200, 50, '축제 다시 보기', { color: '#ff5fa0', size: 18 })) BPF.go('festival', { back: 'album' });
      } else {
        ui.text(ctx, '🔒 마을 엔딩', 940, 400, { size: 22, color: '#9a8a7a' });
        ui.wrap(ctx, '마을을 5단계 바이오빌리지로 키우고 축제 광장에 가면 열려요.', 720, 440, 440, { size: 16, color: '#7a6a5a' });
      }
    },
    drawBig(ctx) {
      const { id, s } = this.big, D = BPF_DATA.pets[id];
      ctx.save(); ctx.fillStyle = 'rgba(20,12,45,.7)'; ctx.fillRect(0, 0, 1280, 720); ctx.restore();
      ui.round(ctx, 340, 80, 600, 560, 20, ui.lighten(D.color, 0.8), '#3a2a6b', 5);
      BPF.drawPet(ctx, id, s, 640, 560, 420);
      ui.text(ctx, `${s}단계 · ${D.stages[s - 1]}`, 640, 600, { size: 24, color: '#3a2a6b' });
      if (ui.hit({ x: 0, y: 0, w: 1280, h: 720 })) { I.consume(); this.big = null; }
    }
  };
})();
