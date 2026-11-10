/* 교사용 관리자 모드 — 설정 > 🔒 교사용 > 비밀번호(tech30)
   학생 진행 현황 확인 + 수업 운영에 필요한 빠른 조정(게임 열기, 마을 단계, 자원, 동물 단계, 초기화) */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  BPF.ADMIN_PW = 'tech30';
  const PETS = ['lulu', 'coco', 'tani', 'bibi'];
  const PET_NAME = { lulu: '루루', coco: '코코', tani: '타니', bibi: '비비' };

  BPF.scenes.admin = {
    enter(p) {
      if (!BPF.adminOK) { BPF.go('settings', { back: 'village' }); return; }
      this.back = p.back || 'settings'; this.back2 = p.back2 || 'village';
      this.msg = '관리자 모드예요. 바꾼 내용은 바로 저장돼요.';
    },
    update() { if (!ui.modal && I.key('Escape')) this.leave(); },
    leave() { BPF.adminOK = false; BPF.go(this.back, { back: this.back2 }); },
    done(msg) { BPF.save.write('admin'); this.msg = '✅ ' + msg; BPF.audio.sfx('ok'); },
    draw(ctx) {
      const d = BPF.save.data;
      ui.bg(ctx, '#2d2350', '#4a3a8b');
      ui.round(ctx, 12, 10, 1256, 60, 18, '#fffaf0', '#3a2a6b', 4);
      ui.text(ctx, '🔒 교사용 관리자 모드', 32, 40, { size: 24, align: 'left', color: '#3a2a6b' });
      ui.text(ctx, this.msg, 760, 40, { size: 16, color: '#5a4a8b', weight: 'bold' });

      /* ───── 왼쪽: 학생 진행 현황 ───── */
      ui.round(ctx, 12, 80, 700, 630, 18, '#fffaf0', '#3a2a6b', 4);
      const P = BPF_DATA.players[d.selectedPlayerId] || null;
      const pet = BPF.save.pet;
      ui.text(ctx, '학생 진행 현황', 32, 108, { size: 20, align: 'left', color: '#7b3fd6' });
      const info = [
        `캐릭터: ${P ? P.name : (d.selectedPlayerId || '-')}   마을: ${d.villageStage}단계 「${BPF_DATA.village[d.villageStage].name}」`,
        `BP ${d.res.bp} · 먹이 ${d.res.food} · 연구키트 ${d.res.research} · 장식 재료 ${d.res.decor} · 총 플레이 ${d.stats.totalPlays}회`,
        `동물: ${PETS.filter(p => d.pets[p].adopted).map(p => `${PET_NAME[p]} ${d.pets[p].stage}단계`).join(', ') || '아직 입양 전'}` + (pet ? `  (함께: ${PET_NAME[d.companionId]})` : ''),
        `열린 게임 ${d.unlockedGames.length}/10 · 클리어 ${BPF.save.clearedCount()}/10 · 완료한 의뢰 ${Object.keys(d.quests.done).length}개`
      ];
      info.forEach((t, i) => ui.text(ctx, t, 32, 138 + i * 26, { size: 15, align: 'left', color: '#3a2a6b', weight: i ? 'normal' : 'bold' }));
      // 게임별 표
      const TX = 28, TY = 250, cols = [['번호', 0], ['미니게임', 50], ['상태', 280], ['플레이', 360], ['클리어', 440], ['최고 등급', 520], ['최고점', 610]];
      ui.round(ctx, TX - 6, TY - 4, 676, 30, 8, '#e8dcff');
      cols.forEach(([t, x]) => ui.text(ctx, t, TX + x, TY + 11, { size: 15, align: 'left', color: '#5a4a8b' }));
      BPF_DATA.games.forEach((G, i) => {
        const b = d.best[G.id], y = TY + 34 + i * 40, open = BPF.save.isUnlocked(G.id);
        if (i % 2) ui.round(ctx, TX - 6, y - 6, 676, 36, 8, '#f6f0ff');
        ui.text(ctx, G.no, TX, y + 12, { size: 15, align: 'left' });
        ui.text(ctx, G.title, TX + 50, y + 12, { size: 15, align: 'left' });
        ui.text(ctx, open ? '열림' : '🔒 잠김', TX + 280, y + 12, { size: 14, align: 'left', color: open ? '#2e6a2a' : '#b03040' });
        ui.text(ctx, `${b.plays}`, TX + 380, y + 12, { size: 15 });
        ui.text(ctx, `${b.clears}`, TX + 460, y + 12, { size: 15 });
        ui.text(ctx, b.grade || '-', TX + 555, y + 12, { size: 17, color: b.grade === 'S' ? '#ff5fa0' : b.grade === 'A' ? '#ff9a00' : '#3a2a6b' });
        ui.text(ctx, b.score ? `${b.score}` : '-', TX + 640, y + 12, { size: 15 });
      });

      /* ───── 오른쪽: 빠른 조정 ───── */
      ui.round(ctx, 724, 80, 544, 630, 18, '#fffaf0', '#3a2a6b', 4);
      ui.text(ctx, '수업 운영 도구', 744, 108, { size: 20, align: 'left', color: '#7b3fd6' });
      const btn = (x, y, w, label, color) => ui.button(ctx, x, y, w, 48, label, { color, size: 17 });
      const row = (y, label) => ui.text(ctx, label, 744, y + 24, { size: 16, align: 'left', color: '#3a2a6b' });

      row(128, '미니게임');
      if (btn(880, 128, 180, '모두 열기', '#47c46b')) { d.unlockedGames = BPF_DATA.games.map(g => g.id); this.done('미니게임 10개를 모두 열었어요.'); }
      if (btn(1070, 128, 180, '단계대로 되돌리기', '#ffb648')) {
        d.unlockedGames = []; BPF.save.ensureUnlocks(); this.done(`마을 ${d.villageStage}단계 기준으로 ${d.unlockedGames.length}개만 열었어요(해 본 게임은 유지).`);
      }

      row(188, `마을 단계 (${d.villageStage})`);
      if (btn(880, 188, 120, '− 내리기', '#b8a8e8') && d.villageStage > 1) { d.villageStage--; this.done(`마을을 ${d.villageStage}단계로 내렸어요.`); }
      if (btn(1010, 188, 120, '+ 올리기', '#3f8cff') && d.villageStage < 5) { d.villageStage++; BPF.save.ensureUnlocks(); this.done(`마을을 ${d.villageStage}단계로 올렸어요. (게임 ${d.unlockedGames.length}개 열림)`); }
      if (btn(1140, 188, 110, '의뢰 완료', '#8a7dff')) {
        BPF_DATA.quests.filter(q => q.stage === d.villageStage).forEach(q => d.quests.done[q.id] = true);
        this.done('이번 단계 의뢰를 모두 완료로 표시했어요.');
      }

      row(248, '자원 지급');
      if (btn(880, 248, 120, 'BP +1000', '#ffb648')) { d.res.bp += 1000; this.done('BP 1000을 줬어요.'); }
      if (btn(1010, 248, 240, '먹이·연구·장식 각 +10', '#ff9a4d')) { d.res.food += 10; d.res.research += 10; d.res.decor += 10; this.done('육성 재료를 10개씩 줬어요.'); }

      row(308, '동물');
      if (btn(880, 308, 180, '4마리 모두 입양', '#47c46b')) {
        PETS.forEach(p => { const pt = d.pets[p]; if (!pt.adopted) { pt.adopted = true; pt.name = pt.name || PET_NAME[p]; pt.adoptedAt = Date.now(); if (!pt.seenStages.includes(1)) pt.seenStages.push(1); } });
        if (!d.companionId) d.companionId = 'lulu';
        this.done('동물 4마리를 모두 입양했어요.');
      }
      const cp = pet;
      if (btn(1070, 308, 85, '단계 −', '#b8a8e8') && cp && cp.stage > 1) { cp.stage--; this.done(`${PET_NAME[d.companionId]}을(를) ${cp.stage}단계로 내렸어요.`); }
      if (btn(1165, 308, 85, '단계 +', '#3f8cff') && cp && cp.stage < 5) {
        cp.stage++; if (!cp.seenStages.includes(cp.stage)) cp.seenStages.push(cp.stage);
        this.done(`${PET_NAME[d.companionId]}을(를) ${cp.stage}단계로 올렸어요.`);
      }
      ui.text(ctx, cp ? `(함께 다니는 ${PET_NAME[d.companionId]} ${cp.stage}단계)` : '(입양한 동물 없음)', 1160, 368, { size: 13, color: '#7a6a99', weight: 'normal' });

      row(388, '저장 파일');
      if (btn(880, 388, 180, '내보내기(백업)', '#ffb648')) { BPF.save.export(); this.msg = '✅ 저장 파일을 내려받았어요.'; }
      if (btn(1070, 388, 180, '가져오기', '#ff9a4d')) BPF.save.import();

      row(448, '학생 저장');
      if (btn(880, 448, 370, '⚠ 이 컴퓨터의 학생 기록 모두 지우기', '#ff7a7a')) {
        ui.confirm('정말 지울까요?', '이 브라우저의 모든 기록(최고 점수·동물·마을)이 지워지고 되돌릴 수 없어요.', () => {
          BPF.save.reset(); BPF.save.write(); BPF.adminOK = false; BPF.go('title');
        });
      }

      ui.round(ctx, 744, 520, 504, 104, 12, '#f3edff', '#c9b8ff', 2);
      ui.fitWrap(ctx, '· 기록은 이 컴퓨터(브라우저)에만 저장돼요. 학생마다 다른 컴퓨터를 쓰면 [내보내기]로 모아 보세요.\n· 관리자 모드를 나가면 다시 들어올 때 비밀번호가 필요해요.', 758, 530, 478, 90, { size: 14, lh: 20, color: '#5a4a8b' });
      if (ui.button(ctx, 896, 640, 200, 56, '나가기', { color: '#8a7dff', size: 21, focus: true })) this.leave();
      ui.drawModal(ctx, 1 / 60);
    }
  };
})();
