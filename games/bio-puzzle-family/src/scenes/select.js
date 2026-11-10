/* 플레이어 캐릭터 선택(14-3) + 동반 생명체 입양 화면 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  const IDS = ['p01', 'p02', 'p03', 'p04'];

  BPF.scenes.playerSelect = {
    enter(p) {
      this.first = !!p.first; this.back = p.back || 'village';
      const cur = BPF.save.data.selectedPlayerId;
      this.idx = Math.max(0, IDS.indexOf(cur)); this.confirming = false;
      BPF.audio.bgm('main');
    },
    choose() {
      const pid = IDS[this.idx], P = BPF_DATA.players[pid];
      ui.confirm('캐릭터 결정', `「${P.name}」(으)로 연구를 시작할까요?\n${P.title}\n※ 캐릭터마다 능력치 차이는 없어요. 마을 메뉴에서 언제든 바꿀 수 있어요.`, () => {
        const d = BPF.save.data;
        d.selectedPlayerId = pid; d.selectedCostumeId = 'default'; d.firstRunDone = true;
        BPF.save.write('player');
        BPF.audio.sfx('win');
        if (this.first || !BPF.save.adoptedPets().length) BPF.go('adopt', { first: true });
        else { BPF.toast(`플레이어 캐릭터를 ${P.name}(으)로 바꿨어요! 기록과 동물은 그대로예요.`); BPF.go(this.back); }
      }, { yes: '결정!', no: '다시 고르기' });
    },
    update() {
      if (ui.modal) return;
      if (I.any('ArrowLeft', 'KeyA')) { this.idx = (this.idx + 3) % 4; BPF.audio.sfx('move'); }
      if (I.any('ArrowRight', 'KeyD')) { this.idx = (this.idx + 1) % 4; BPF.audio.sfx('move'); }
      if (I.confirm()) this.choose();
      if (I.key('Escape') && !this.first) BPF.go(this.back);
    },
    draw(ctx) {
      BPF.canvas.style.cursor = 'default';
      ui.bg(ctx, '#7b5cff', '#ff9fd0');
      ui.round(ctx, 390, 18, 500, 62, 30, '#ffe14d', '#3a2a6b', 5);
      ui.text(ctx, '플레이어 캐릭터 선택', 640, 50, { size: 32, color: '#3a2a6b' });
      ui.text(ctx, '← → 이동 · Z/Space/클릭 확정 — 고른 캐릭터가 마을과 모든 미니게임에 함께해요!', 640, 102, { size: 17, color: '#fff', outline: '#3a2a6b' });
      IDS.forEach((pid, i) => {
        const P = BPF_DATA.players[pid];
        const sel = i === this.idx;
        const w = 280, h = 506, x = 50 + i * 300, y = 128 + (sel ? -8 : 0);
        const r = { x, y, w, h };
        ctx.save();
        if (sel) { ctx.shadowColor = P.color; ctx.shadowBlur = 30; }
        ui.round(ctx, x, y, w, h, 26, sel ? '#fffaf0' : 'rgba(255,250,240,.82)', sel ? P.color : '#3a2a6b', sel ? 8 : 4);
        ctx.restore();
        const g = ctx.createLinearGradient(0, y, 0, y + 360); g.addColorStop(0, ui.lighten(P.color, 0.7)); g.addColorStop(1, '#ffffff');
        ui.round(ctx, x + 14, y + 14, w - 28, 350, 18, g);
        const bob = sel ? Math.sin(BPF.time * 5) * 6 : 0;
        BPF.drawPlayerBody(ctx, pid, x + w / 2, y + 356 + bob, 330);
        ui.round(ctx, x + 20, y + 374, w - 40, 44, 22, P.color, '#3a2a6b', 3);
        ui.text(ctx, P.name, x + w / 2, y + 397, { size: 26, color: '#fff', outline: '#3a2a6b' });
        ui.text(ctx, P.title, x + w / 2, y + 438, { size: 17, color: '#3a2a6b' });
        ui.wrap(ctx, P.desc, x + w / 2, y + 462, w - 30, { size: 15, align: 'center', color: '#5a4a8b' });
        if (sel) ui.text(ctx, '▼', x + w / 2, y - 14 + Math.sin(BPF.time * 8) * 5, { size: 34, color: '#ffe14d', outline: '#3a2a6b' });
        if (ui.hit(r)) { I.consume(); if (this.idx === i) this.choose(); else { this.idx = i; BPF.audio.sfx('move'); } }
        if (ui.hover(r)) BPF.canvas.style.cursor = 'pointer';
      });
      if (ui.button(ctx, 540, 652, 200, 56, '이 캐릭터로!', { color: '#47c46b', size: 22, focus: true })) this.choose();
      if (!this.first && ui.button(ctx, 1080, 650, 170, 56, '돌아가기', { color: '#8a7dff', size: 20 })) BPF.go(this.back);
      ui.drawModal(ctx, 1 / 60);
    }
  };

  /* 동반 생명체 입양 (플레이어와 별개) */
  BPF.scenes.adopt = {
    enter(p) {
      this.first = !!p.first; this.back = p.back || 'village';
      this.list = BPF.save.PET_IDS.filter(id => !BPF.save.data.pets[id].adopted);
      this.idx = 0; this.naming = false;
      BPF.audio.bgm('farm');
      if (!this.list.length) { BPF.toast('모든 동물을 이미 입양했어요!'); BPF.go(this.back); }
    },
    exit() { ui.hideInput(); },
    startNaming() {
      this.naming = true;
      const id = this.list[this.idx];
      ui.showInput(440, 520, 400, 64, BPF_DATA.pets[id].name);
    },
    adopt() {
      const id = this.list[this.idx], d = BPF.save.data;
      const chk = BPF.filter.checkName(ui.inputValue(), BPF_DATA.pets[id].name);
      if (!chk.ok && !chk.forced) {
        BPF.toast(chk.msg, '#b03040'); BPF.audio.sfx('bad'); this.warn = 1;
        ui.showInput(440, 520, 400, 64, ''); return;
      }
      if (chk.forced) BPF.toast(chk.msg, '#b03040');
      const name = chk.name;
      const pet = d.pets[id];
      pet.adopted = true; pet.name = name; pet.stage = 1; pet.seenStages = [1]; pet.adoptedAt = Date.now();
      if (!d.companionId) d.companionId = id;
      BPF.save.write('adopt');
      ui.hideInput(); this.naming = false;
      BPF.audio.sfx('evolve');
      BPF.toast(`${name}(${BPF_DATA.pets[id].kind})을(를) 입양했어요! 💕`, '#c2185b');
      BPF.go(this.first ? 'village' : this.back, this.first ? { intro: true } : {});
    },
    update() {
      if (ui.modal) return;
      if (this.naming) {
        if (I.key('Enter') || I.key('NumpadEnter')) this.adopt();
        if (I.key('Escape')) { this.naming = false; ui.hideInput(); }
        return;
      }
      const n = this.list.length;
      if (I.any('ArrowLeft', 'KeyA')) { this.idx = (this.idx + n - 1) % n; BPF.audio.sfx('move'); }
      if (I.any('ArrowRight', 'KeyD')) { this.idx = (this.idx + 1) % n; BPF.audio.sfx('move'); }
      if (I.confirm()) this.startNaming();
      if (I.key('Escape') && !this.first) BPF.go(this.back);
    },
    draw(ctx) {
      BPF.canvas.style.cursor = 'default';
      const id = this.list[this.idx]; if (!id) return;
      const D = BPF_DATA.pets[id];
      ui.bg(ctx, D.bg[0], D.bg[1]);
      ui.round(ctx, 390, 18, 500, 62, 30, '#ff8fb8', '#3a2a6b', 5);
      ui.text(ctx, this.first ? '첫 동반 동물 입양' : '새 동물 입양', 640, 50, { size: 30, color: '#fff', outline: '#3a2a6b' });
      ui.text(ctx, '플레이어와는 별도로 함께 지내며 돌보고 키우는 친구예요. 5단계로 자라요!', 640, 102, { size: 17, color: '#3a2a6b' });
      // 후보 탭
      this.list.forEach((pid, i) => {
        const P = BPF_DATA.pets[pid], sel = i === this.idx;
        const x = 640 - this.list.length * 75 + i * 150, y = 130;
        const r = { x, y, w: 140, h: 120 };
        ui.round(ctx, x, y, 140, 120, 18, sel ? '#fff' : 'rgba(255,255,255,.6)', sel ? P.color : '#3a2a6b', sel ? 6 : 3);
        BPF.drawPet(ctx, pid, 1, x + 70, y + 98, 86);
        ui.text(ctx, P.name, x + 70, y + 110, { size: 15, color: '#3a2a6b' });
        if (!this.naming && ui.hit(r)) { I.consume(); this.idx = i; BPF.audio.sfx('move'); }
      });
      // 큰 미리보기
      ui.panel(ctx, 140, 270, 1000, 360, {});
      BPF.drawPet(ctx, id, 1, 340, 560, 260);
      ui.text(ctx, `${D.name} — ${D.kind}`, 560, 310, { size: 32, align: 'left', color: D.color, outline: '#3a2a6b', ow: 4 });
      ui.wrap(ctx, D.personality, 560, 340, 540, { size: 19 });
      ui.text(ctx, '성장하면 이렇게 변해요 →', 560, 400, { size: 17, align: 'left', color: '#7b5cff' });
      for (let s = 2; s <= 5; s++) {
        const x = 560 + (s - 2) * 140;
        ui.round(ctx, x, 412, 130, 150, 16, '#f3edff', '#c9b8ff', 2);
        BPF.drawSilhouette(ctx, `pet_${id}_${s}`, x + 10, 422, 110, 110, '#8f80c8');
        ui.text(ctx, `${s}단계 ?`, x + 65, 548, { size: 15, color: '#7a6a99' });
      }
      if (this.naming) {
        ctx.save(); ctx.fillStyle = 'rgba(20,12,45,.55)'; ctx.fillRect(0, 0, 1280, 720); ctx.restore();
        ui.panel(ctx, 390, 400, 500, 280, { title: '이름 지어 주기' });
        ui.text(ctx, '최대 8글자 · Enter로 확정 · 바르고 고운 말만!', 640, 480, { size: 17, color: '#7a6a99' });
        if (ui.button(ctx, 470, 600, 160, 56, '입양하기!', { color: '#47c46b', size: 22 })) this.adopt();
        if (ui.button(ctx, 650, 600, 160, 56, '취소', { color: '#ff7a7a', size: 20 })) { this.naming = false; ui.hideInput(); }
      } else {
        if (ui.button(ctx, 520, 648, 240, 60, `${D.name} 입양하기`, { color: '#ff5fa0', size: 22, focus: true })) this.startNaming();
        if (!this.first && ui.button(ctx, 1080, 652, 170, 56, '돌아가기', { color: '#8a7dff', size: 20 })) BPF.go(this.back);
      }
      ui.drawModal(ctx, 1 / 60);
    }
  };
})();
