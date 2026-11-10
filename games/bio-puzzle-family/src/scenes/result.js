/* 결과 화면 — 등급, 점수, 보상(결과 ID 기준 1회), 동반 동물 경험치, 학습 피드백 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  const GC = { 'S': '#ff5fa0', 'A': '#ff9a00', 'B': '#3f8cff', 'C': '#47c46b', 'D': '#9a90b0' };
  BPF.scenes.result = {
    enter(r) {
      this.r = r;
      this.meta = BPF_DATA.games.find(g => g.id === r.gameId);
      this.rw = BPF.progress.applyResult(r); // 같은 resultId면 다시 지급하지 않음
      this.avatar = new BPF.PlayerAvatar().mount({ id: r.gameId }, BPF.save.player, BPF.save.data.selectedCostumeId, { x: 1020, y: 76, w: 252, h: 560 });
      this.avatar.setState(r.win ? 'win' : 'lose');
      this.t = 0;
      if (this.rw.newBest && r.score > 0) setTimeout(() => BPF.audio.sfx('combo'), 900);
      BPF.audio.bgm(null);
      if (r.win) for (let i = 0; i < 4; i++) setTimeout(() => ui.burst(BPF.rand(200, 800), BPF.rand(150, 350), BPF.pick(['#ffd84d', '#ff8fd0', '#7be0ff']), 20, { star: true }), i * 300);
    },
    exit() { this.avatar.unmount(); ui.clearParticles(); },
    update(dt) {
      this.avatar.update(dt);
      if (this.t > 0.8) {
        if (I.key('KeyR') || I.key('Space')) BPF.go('play', { id: this.r.gameId, skipIntro: true });
        if (I.key('Escape')) BPF.go('gamecenter');
      }
    },
    draw(ctx) {
      const r = this.r, rw = this.rw, meta = this.meta, t = this.t;
      ui.bg(ctx, r.win ? '#ffe9a8' : '#cfd8ff', r.win ? '#ffc0e0' : '#d9ccff');
      ui.round(ctx, 8, 8, 1004, 56, 18, 'rgba(255,250,240,.95)', '#3a2a6b', 4);
      ui.text(ctx, `${meta.no} ${meta.title} — 결과`, 24, 37, { size: 22, align: 'left', color: '#3a2a6b' });
      ui.text(ctx, r.win ? '🏆 연구 성공!' : '🌱 다음엔 꼭!', 990, 37, { size: 22, align: 'right', color: r.win ? '#c2185b' : '#5a4a8b' });
      // 등급
      ui.panel(ctx, 20, 90, 380, 400, {});
      const s = BPF.ease(Math.min(1, t * 2.5));
      const gc = GC[r.grade] || '#999';
      ctx.save(); ctx.translate(210, 230); ctx.scale(0.3 + s * 0.7, 0.3 + s * 0.7); ctx.rotate((1 - s) * -0.6);
      if (!BPF.drawImg(ctx, 'grade_' + r.grade, -125, -135, 250, 270, { noFallback: true })) {
        ctx.beginPath(); ctx.arc(0, 0, 110, 0, 7); ctx.fillStyle = gc; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#3a2a6b'; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 92, 0, 7); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.stroke();
        ui.text(ctx, r.grade, 0, 8, { size: 150, color: '#fff', outline: '#3a2a6b', ow: 12 });
      }
      ctx.restore();
      ui.text(ctx, `등급 점수 ${Math.round(r.score * Math.min(1, t * 1.5)).toLocaleString()} / 10000`, 210, 370, { size: 20, color: '#3a2a6b' });
      ui.text(ctx, `게임 점수 ${r.points.toLocaleString()}점 · 최대 콤보 ${r.maxCombo}`, 210, 402, { size: 16, color: '#5a4a8b' });
      ui.text(ctx, `달성 ${Math.round(r.achieve * 100)}% · 정확도 ${Math.round(r.accuracy * 100)}% · 보너스 ${Math.round(r.bonus * 100)}%`, 210, 430, { size: 14, color: '#7a6a99', weight: 'normal' });
      if (rw.newBest && t > 0.9) ui.text(ctx, 'NEW 최고 기록!', 210, 120, { size: 26 + Math.sin(BPF.time * 8) * 2, color: '#ffe14d', outline: '#c2185b' });
      if (!r.win && r.reason) ui.text(ctx, r.reason, 210, 462, { size: 16, color: '#b03040' });
      // 보상
      ui.panel(ctx, 420, 90, 580, 200, { title: '획득 보상', titleColor: '#ff9a4d' });
      let x = 446;
      const chips = [['ic_star', `${rw.bp} BP${rw.firstClear ? ' (첫 클리어 +100)' : ''}`]];
      const nm = { food: '먹이', research: '연구키트', decor: '장식', culture: '배양 재료', protein: '단백질 토큰', seed: '종자 카드', env: '환경 토큰', sticker: '도감 스티커' };
      Object.keys(rw.items).forEach(k => chips.push(['🎁', `${nm[k] || k} +${rw.items[k]}`]));
      let row = 0;
      chips.forEach(c => { const w = ui.measure(c[1], 18) + 52; if (x + w > 990) { x = 446; row++; } ui.chip(ctx, x, 124 + row * 42, c[0], c[1]); x += w + 8; });
      rw.certs.forEach((c, i) => ui.text(ctx, `🏅 ${c} 획득!`, 710, 216 + i * 26, { size: 20, color: '#c2185b' }));
      // 동반 동물 XP
      const pet = rw.petId ? BPF.save.data.pets[rw.petId] : null;
      if (pet) {
        BPF.drawPet(ctx, rw.petId, pet.stage, 480, 280, 70);
        ui.text(ctx, `${pet.name} 경험치 +${rw.xp}`, 524, 254, { size: 17, align: 'left', color: '#7b3fd6' });
        const next = pet.stage < 5 ? BPF_DATA.growth[pet.stage + 1].xp : 1100;
        ui.gauge(ctx, 740, 240, 240, 26, pet.xp, next, '#a07bff', `${pet.xp}/${next}`);
        if (BPF.progress.evolveCheck(rw.petId).ok) ui.text(ctx, '✨ 농장에서 성장할 수 있어요!', 860, 278, { size: 14, color: '#c2185b' });
      }
      // 학습 피드백
      const L = BPF_DATA.lessons[r.gameId];
      ui.panel(ctx, 420, 316, 580, 300, { title: '오늘의 생명기술: ' + L.title, titleColor: '#47c46b' });
      let yy = 348;
      L.points.forEach(p => { ui.text(ctx, '✔', 446, yy + 11, { size: 18, color: '#47a35b' }); yy += ui.wrap(ctx, p, 470, yy, 510, { size: 16, lh: 23 }) + 8; });
      // 버튼
      if (t > 0.6) {
        if (ui.button(ctx, 30, 520, 360, 60, '다시 하기 (Space)', { color: '#47c46b', size: 22, focus: true })) BPF.go('play', { id: r.gameId, skipIntro: true });
        if (ui.button(ctx, 30, 590, 175, 56, '게임 선택', { color: '#8a7dff', size: 19 })) BPF.go('gamecenter');
        if (ui.button(ctx, 215, 590, 175, 56, '마을로', { color: '#3fb6d6', size: 19 })) BPF.go('village', { from: 'gamecenter' });
        if (pet && ui.button(ctx, 620, 640, 200, 56, '농장 가기', { color: '#ff8fb8', size: 19 })) BPF.go('farm', { back: 'village' });
      }
      this.avatar.draw(ctx);
      ui.drawParticles(ctx, 1 / 60);
    }
  };
})();
