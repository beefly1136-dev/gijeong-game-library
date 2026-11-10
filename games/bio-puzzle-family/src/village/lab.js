/* 연구소 — 마을 단계 승급(연구소 이사/승급), 스토리 의뢰, 마지막 시민 토론회 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  BPF.scenes.lab = {
    enter(p) { this.back = p.back || 'village'; this.scroll = 0; this.finale = null; this.upAnim = 0; BPF.audio.bgm('village'); },
    update(dt) {
      this.upAnim = Math.max(0, this.upAnim - dt);
      if (ui.modal) return;
      if (I.key('Escape')) { if (this.finale) this.finale = null; else BPF.go(this.back, { from: 'lab' }); }
      if (I.wheel) this.scroll = BPF.clamp(this.scroll + I.wheel * 40, 0, Math.max(0, this.maxScroll || 0));
    },
    draw(ctx) {
      const d = BPF.save.data, P = BPF.progress, st = d.villageStage;
      ui.bg(ctx, '#cfe8ff', '#e8dcff', 'bg_lab1');
      ui.topBar(ctx, '연구소', 150);
      // 왼쪽: 마을 단계
      ui.panel(ctx, 20, 96, 480, 600, { title: '연구 마을 단계', titleColor: '#7b5cff' });
      for (let s = 1; s <= 5; s++) {
        const y = 128 + (s - 1) * 44, on = s <= st;
        ui.round(ctx, 40, y, 440, 38, 12, s === st ? '#ffe14d' : on ? '#d7ffd2' : '#eee8f8', '#3a2a6b', 2);
        ui.text(ctx, `${s}. ${BPF_DATA.village[s].name}`, 56, y + 20, { size: 18, align: 'left', color: on ? '#3a2a6b' : '#9a90b0' });
        if (s === st) ui.text(ctx, '현재', 466, y + 20, { size: 15, align: 'right', color: '#c2185b' });
      }
      if (st < 5) {
        const next = BPF_DATA.village[st + 1];
        ui.text(ctx, `다음: ${next.name}`, 260, 362, { size: 21, color: '#7b3fd6' });
        ui.wrap(ctx, `개방: ${next.unlock}`, 260, 380, 420, { size: 15, align: 'center', color: '#5a4a8b' });
        P.villageReqs(st + 1).forEach((r, i) => {
          const y = 440 + i * 46;
          ui.round(ctx, 40, y, 440, 40, 12, r.done ? '#e3ffd8' : '#fff', r.done ? '#47c46b' : '#c9b8ff', 2);
          ui.text(ctx, (r.done ? '✅ ' : '⬜ ') + r.text, 54, y + 21, { size: 16, align: 'left', color: r.done ? '#2e6a2a' : '#3a2a6b' });
        });
        const can = P.canUpgrade();
        if (ui.button(ctx, 110, 616, 300, 64, can ? '🏗 연구소 승급!' : '조건을 채워 주세요', { color: '#ff5fa0', size: 22, disabled: !can, focus: can })) {
          if (P.upgradeVillage()) {
            this.upAnim = 2.5; BPF.audio.sfx('evolve'); ui.burst(260, 300, '#ffd84d', 40, { star: true });
            const ng = (P.lastUnlocked || []).map(id => BPF_DATA.games.find(g => g.id === id).title);
            ui.alert('연구소 승급!', `마을이 「${BPF_DATA.village[d.villageStage].name}」(으)로 성장했어요!\n새로 열린 곳: ${BPF_DATA.village[d.villageStage].unlock}` + (ng.length ? `\n🎮 새 미니게임: ${ng.join(', ')}` : ''));
          }
        }
      } else {
        ui.text(ctx, '🎉 바이오빌리지 완성!', 260, 420, { size: 28, color: '#c2185b' });
        ui.wrap(ctx, '축제 광장에서 엔딩 축제를 볼 수 있어요. 도서관에서 모든 추억을 다시 볼 수 있어요.', 260, 460, 400, { size: 17, align: 'center' });
        if (ui.button(ctx, 130, 560, 260, 60, '축제 보러 가기 ▶', { color: '#ff5fa0', size: 21 })) BPF.go('festival', { back: 'lab' });
      }
      // 오른쪽: 의뢰
      ui.panel(ctx, 520, 96, 740, 600, { title: '연구 의뢰', titleColor: '#ff9a4d' });
      BPF.drawNPC(ctx, 'dr', 580, 200, false);
      ui.wrap(ctx, '박사: "의뢰를 해결하면 BP와 재료를 줄게. 조건을 채우면 [보고]를 눌러!"', 630, 120, 600, { size: 16, color: '#5a4a8b' });
      const qs = P.availableQuests();
      ctx.save(); ui.path(ctx, 530, 160, 720, 526, 10); ctx.clip();
      let y = 166 - this.scroll;
      qs.forEach(q => {
        const done = !!d.quests.done[q.id], ok = P.check(q.cond);
        const N = BPF_DATA.npcs.find(n => n.id === q.from);
        const h = 112;
        ui.round(ctx, 630, y, 610, h - 8, 14, done ? '#eeeeee' : ok ? '#fff6c8' : '#fff', done ? '#bbb' : '#3a2a6b', 2);
        ui.text(ctx, `${q.title}`, 646, y + 18, { size: 18, align: 'left', color: done ? '#999' : '#3a2a6b' });
        ui.text(ctx, `— ${N.name}`, 1226, y + 18, { size: 14, align: 'right', color: '#9a8acc' });
        ui.wrap(ctx, q.text, 646, y + 34, 440, { size: 14, lh: 19, color: done ? '#aaa' : '#4a3a6b' });
        const rw = Object.keys(q.reward).map(k => `${{ bp: 'BP', food: '먹이', research: '연구키트', decor: '장식' }[k] || k} ${q.reward[k]}`).join(' · ');
        ui.text(ctx, '보상: ' + rw, 646, y + h - 20, { size: 13, align: 'left', color: '#c2185b' });
        if (done) ui.text(ctx, '완료 ✔', 1160, y + 56, { size: 20, color: '#47a35b' });
        else if (y > 150 && y < 640) {
          if (q.finale && ok) { if (ui.button(ctx, 1100, y + 34, 130, 50, '토론회!', { color: '#ff5fa0', size: 18, focus: true })) this.finale = { pick: -1 }; }
          else if (ui.button(ctx, 1100, y + 34, 130, 50, ok ? '보고!' : '진행 중', { color: '#47c46b', size: 18, disabled: !ok, focus: ok })) {
            if (P.completeQuest(q)) { BPF.audio.sfx('coin'); BPF.toast(`의뢰 완료! ${rw}`, '#2e8a3a'); }
          }
        }
        y += h;
      });
      ctx.restore();
      this.maxScroll = Math.max(0, y + this.scroll - 166 - 520);
      if (this.maxScroll > 0) ui.text(ctx, '휠로 스크롤 ↕', 1240, 684, { size: 13, align: 'right', color: '#9a8acc' });
      if (ui.button(ctx, 1120, 14, 140, 44, '마을로', { color: '#8a7dff', size: 18 })) BPF.go(this.back, { from: 'lab' });
      if (this.finale) this.drawFinale(ctx);
      ui.drawModal(ctx, 1 / 60);
    },
    drawFinale(ctx) {
      const F = BPF_DATA.finale, f = this.finale;
      ctx.save(); ctx.fillStyle = 'rgba(20,12,45,.7)'; ctx.fillRect(0, 0, 1280, 720); ctx.restore();
      ui.panel(ctx, 140, 90, 1000, 580, { title: '마지막 의뢰: 시민 토론회', titleColor: '#ff5fa0' });
      BPF.drawNPC(ctx, 'fest', 230, 300, false); BPF.drawNPC(ctx, 'farmer', 300, 310, false);
      BPF.drawPlayerBody(ctx, BPF.save.player, 1040, 330, 180);
      ui.wrap(ctx, F.q, 360, 130, 600, { size: 21, lh: 31, weight: 'bold' });
      F.options.forEach((o, i) => {
        const y = 340 + i * 90;
        const picked = f.pick === i;
        if (ui.button(ctx, 180, y, 920, 76, o.t, { color: picked ? (o.ok ? '#47c46b' : '#ff7a7a') : '#8a7dff', size: 18 }) && !f.done) {
          f.pick = i;
          if (o.ok) {
            f.done = true; BPF.audio.sfx('win');
            const q = BPF_DATA.quests.find(q => q.id === 'q_final');
            BPF.progress.completeQuest(q);
            ui.alert('토론회 성공!', o.why + '\n\n마지막 스토리 의뢰를 완료했어요! (+200 BP)', () => { this.finale = null; });
          } else { BPF.audio.sfx('bad'); ui.alert('다시 생각해 봐요', o.why); }
        }
      });
      if (ui.button(ctx, 1000, 610, 120, 46, '닫기', { color: '#9a90b0', size: 17 })) this.finale = null;
    }
  };

  /* 축제(5단계 엔딩) */
  BPF.scenes.festival = {
    enter(p) {
      this.back = p.back || 'village';
      if (BPF.save.data.villageStage < 5) { BPF.toast('축제는 마을 5단계에서 열려요!'); BPF.go(this.back); return; }
      BPF.save.data.endings.village = true; BPF.save.write('festival');
      BPF.audio.sfx('win'); BPF.audio.bgm('ending');
    },
    update() { if (I.key('Escape')) BPF.go(this.back, { from: 'festival' }); if (Math.random() < 0.08) ui.burst(BPF.rand(100, 1180), BPF.rand(100, 300), BPF.pick(['#ffd84d', '#ff8fd0', '#7be0ff', '#9dff8a']), 18, { star: true }); },
    draw(ctx) {
      ui.bg(ctx, '#2d2a6a', '#ff9fd0');
      ctx.save(); ctx.fillStyle = '#7fd062'; ctx.beginPath(); ctx.ellipse(640, 760, 900, 260, 0, 0, 7); ctx.fill(); ctx.restore();
      BPF.drawImg(ctx, BPF.assets.ok('bld_institute_5') ? 'bld_institute_5' : 'bld_institute', 440, 150, 400, 270, { noFallback: true });
      BPF.drawImg(ctx, 'deco_arch', 140, 260, 180, 170, { noFallback: true }); BPF.drawImg(ctx, 'deco_arch', 960, 260, 180, 170, { noFallback: true });
      BPF.drawImg(ctx, 'bld_fountain', 540, 420, 200, 110, { noFallback: true });
      ui.drawParticles(ctx, 1 / 60);
      const d = BPF.save.data;
      BPF.save.PET_IDS.forEach((p, i) => BPF.drawPet(ctx, p, d.pets[p].adopted ? d.pets[p].stage : 5, 200 + i * 290 + (i > 1 ? 40 : -40), 640, 210, { silhouette: !d.pets[p].adopted }));
      BPF.drawPlayerBody(ctx, d.selectedPlayerId, 640, 690, 200);
      ui.text(ctx, '🎉 바이오빌리지 축제 🎉', 640, 70, { size: 54, color: '#ffe14d', outline: '#c2185b', ow: 10 });
      ui.round(ctx, 240, 110, 800, 70, 20, 'rgba(255,255,255,.9)', '#3a2a6b', 3);
      ui.wrap(ctx, '낡은 연구실은 이제 생명기술로 모두를 돕는 바이오빌리지가 되었어요. 기술의 힘과 책임을 함께 배운 연구원, 고마워요!', 640, 122, 760, { size: 18, align: 'center', weight: 'bold' });
      if (ui.button(ctx, 1080, 640, 180, 60, '돌아가기', { color: '#8a7dff', size: 20 })) BPF.go(this.back, { from: 'festival' });
      if (ui.button(ctx, 20, 640, 180, 60, '엔딩 앨범', { color: '#ffb648', size: 20 })) BPF.go('album', { back: 'village' });
    }
  };
})();
