/* 타이틀 화면 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  BPF.scenes.title = {
    enter() { this.focus = 0; BPF.audio.bgm('main'); },
    update() { },
    start() {
      const d = BPF.save.data;
      if (!d.firstRunDone || !d.selectedPlayerId) BPF.go('playerSelect', { first: true });
      else if (!BPF.save.adoptedPets().length) BPF.go('adopt', { first: true });
      else BPF.go('village');
    },
    draw(ctx) {
      BPF.canvas.style.cursor = 'default';
      ui.bg(ctx, '#7fd0ff', '#ffd6f0');
      const tbg = BPF.assets.get('title_bg');
      if (tbg) ctx.drawImage(tbg, 0, 0, BPF.W, BPF.H);
      else {
        // 언덕
        ctx.save();
        ctx.fillStyle = '#9be37a'; ctx.beginPath(); ctx.moveTo(0, 560); ctx.quadraticCurveTo(320, 470, 640, 540); ctx.quadraticCurveTo(960, 610, 1280, 520); ctx.lineTo(1280, 720); ctx.lineTo(0, 720); ctx.fill();
        ctx.fillStyle = '#7fd062'; ctx.beginPath(); ctx.moveTo(0, 620); ctx.quadraticCurveTo(400, 560, 800, 630); ctx.quadraticCurveTo(1100, 680, 1280, 620); ctx.lineTo(1280, 720); ctx.lineTo(0, 720); ctx.fill();
        ctx.restore();
        BPF.drawImg(ctx, 'bld_institute', 760, 330, 420, 230, { noFallback: true });
        BPF.drawImg(ctx, 'bld_greenhouse', 80, 380, 230, 170, { noFallback: true });
        BPF.drawImg(ctx, 'tree_pink', 1130, 380, 140, 170, { noFallback: true });
        BPF.drawImg(ctx, 'tree', 20, 330, 120, 160, { noFallback: true });
      }
      // 로고
      const s = 1 + Math.sin(BPF.time * 2) * 0.015;
      const logo = BPF.assets.get('title_logo');
      ctx.save(); ctx.translate(640, 128); ctx.scale(s, s);
      if (logo) ctx.drawImage(logo, -390, -150, 780, 780 * logo.height / logo.width);
      // 로고 틀 안쪽(크림색 칸)의 세로 가운데에 제목을 둔다 (틀 높이의 56% 지점)
      const lh = logo ? 780 * logo.height / logo.width : 0;
      const ts = logo ? 62 : 84, ty = logo ? -150 + lh * 0.563 - 26 : -8;
      ui.text(ctx, '바이오 퍼즐 패밀리', 0, ty, { size: ts, color: '#ecc96a', outline: '#4b3a86', ow: 12 }); // 채도를 낮춘 부드러운 금색
      ui.text(ctx, '바이오 퍼즐 패밀리', 0, ty - 3, { size: ts, color: '#f7e7b4', outline: null });
      ctx.restore();
      const sy = logo ? 128 + ty + 46 : 180;
      ui.round(ctx, 490, sy, 300, 38, 19, '#ff5fa0', '#3a2a6b', 4);
      ui.text(ctx, '🧬 생명기술 연구마을 🧪', 640, sy + 20, { size: 19, color: '#fff', outline: '#3a2a6b' });
      // 캐릭터들
      ['p01', 'p02', 'p03', 'p04'].forEach((p, i) => {
        const x = 230 + i * 120 + (i > 1 ? 330 : 0), y = 640 + Math.sin(BPF.time * 3 + i) * 4;
        BPF.drawPlayerBody(ctx, p, x, y, 260);
      });
      ['lulu', 'coco', 'tani', 'bibi'].forEach((p, i) => {
        BPF.drawPet(ctx, p, 1, 520 + i * 80, 690, 90);
      });
      // 버튼
      const d = BPF.save.data;
      const cont = d.firstRunDone && d.selectedPlayerId;
      const bx = 520, by = BPF.assets.ok('title_logo') ? 320 : 270;
      ui.panel(ctx, bx - 20, by - 10, 280, cont ? 250 : 176, { r: 26 });
      if (ui.button(ctx, bx, by + 10, 240, 64, cont ? '이어하기 ▶' : '시작하기 ▶', { color: '#47c46b', size: 26, focus: this.focus === 0 }) || (!ui.modal && I.confirm())) { BPF.audio.unlock(); this.start(); }
      if (ui.button(ctx, bx, by + 90, 240, 56, '설정', { color: '#8a7dff', size: 22, focus: this.focus === 1 })) BPF.go('settings', { back: 'title' });
      if (cont && ui.button(ctx, bx, by + 160, 240, 56, '처음부터 하기', { color: '#ff7a7a', size: 20, focus: this.focus === 2 })) {
        ui.confirm('처음부터 하기', '지금까지의 기록(최고 점수·동물·마을)이 모두 지워져요.\n먼저 설정에서 저장 파일을 내보낼 수 있어요.\n정말 처음부터 할까요?', () => { BPF.save.reset(); BPF.save.write(); BPF.toast('새로 시작합니다!'); });
      }
      ui.text(ctx, '중학교 기술·가정 「생명기술」 학습용 오리지널 게임', 640, 708, { size: 14, color: '#3a2a6b', alpha: 0.8 });
      ui.drawModal(ctx, 1 / 60);
    }
  };

  /* 로딩 화면 */
  BPF.scenes.boot = {
    enter() {
      this.p = 0; this.done = false;
      BPF.audio.prepare('main'); // 첫 곡을 이미지보다 먼저 준비하되 자동 재생하지 않습니다.
      const keys = ['title_bg', 'title_logo', 'body_p01', 'body_p02', 'body_p03', 'body_p04'];
      ['p01', 'p02', 'p03', 'p04'].forEach(p => ['idle', 'success', 'mistake', 'combo', 'thinking', 'acting'].forEach(f => keys.push(`face_${p}_${f}`)));
      ['lulu', 'coco', 'tani', 'bibi'].forEach(p => keys.push(`pet_${p}_1`));
      ['bld_institute', 'bld_lab', 'bld_barn', 'bld_house', 'bld_greenhouse', 'tree', 'tree_pink', 'scales', 'alchemy_pot'].forEach(k => keys.push(k));
      BPF.assets.preload(keys, p => this.p = p).then(() => {
        this.done = true; // 이후 그림은 assets.get()이 해당 화면에서 필요할 때 준비합니다.
        // 유전자 재조합 과정 그림(rc_p*, rc_x*)은 선생님이 나중에 넣는 그림이라 없으면 조용히 대체
        const fails = Object.keys(BPF.assets.manifest).filter(k => BPF.assets.failed(k) && !/^rc_(p\d|x\d)/.test(k));
        if (fails.length) BPF.toast(`이미지 ${fails.length}개를 불러오지 못해 대체 그림을 씁니다.`, '#b03040');
        // 검수용 주소(?scene=…)면 바로 타이틀로
        if (/[?&]scene=/.test(location.search)) setTimeout(() => BPF.go('title'), 200);
      });
    },
    // 브라우저는 사용자가 한 번 누르기 전에는 소리를 못 낸다 → '눌러서 시작' 화면에서 누르는 순간 타이틀 음악 시작
    start() { if (!this.done || this.going) return; this.going = true; BPF.audio.unlock(); BPF.audio.bgm('main'); BPF.go('title'); },
    update() { if (this.done && (I.clicked || I.key('Space') || I.key('Enter'))) { I.consume(); this.start(); } },
    draw(ctx) {
      ui.bg(ctx, '#6a5acd', '#2d2350');
      ui.text(ctx, '바이오 퍼즐 패밀리', 640, 300, { size: 56, color: '#ecc96a', outline: '#3a2a6b', ow: 10 });
      if (!this.done) ui.gauge(ctx, 390, 380, 500, 34, this.p, 1, '#47c46b', `불러오는 중… ${Math.round(this.p * 100)}%`);
      else {
        const a = 0.65 + Math.sin(BPF.time * 4) * 0.35;
        ctx.save(); ctx.globalAlpha = a;
        ui.round(ctx, 440, 372, 400, 64, 32, '#ff5fa0', '#fff', 4);
        ui.text(ctx, '▶ 화면을 눌러 시작', 640, 405, { size: 28, color: '#fff', outline: '#3a2a6b' });
        ctx.restore();
        ui.text(ctx, '🎵 소리를 켜고 시작해요', 640, 470, { size: 18, color: '#e8deff' });
      }
    }
  };
})();
