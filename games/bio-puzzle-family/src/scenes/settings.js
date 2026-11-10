/* 설정 — 소리, 애니메이션 간소화, 캐릭터 변경, 저장 내보내기/가져오기, 초기화 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  BPF.scenes.settings = {
    enter(p) { this.back = p.back || 'village'; this.pw = null; },
    exit() { ui.hideInput(); this.pw = null; },
    update() { if (!ui.modal && !this.pw && I.key('Escape')) BPF.go(this.back); },
    // 교사용 관리자 모드: 비밀번호 확인
    openPw() {
      this.pw = { err: '' };
      ui.showInput(440, 330, 400, 64, '', { password: true, onEnter: () => this.checkPw() });
    },
    checkPw() {
      if (ui.inputValue() === BPF.ADMIN_PW) { ui.hideInput(); this.pw = null; BPF.adminOK = true; BPF.audio.sfx('ok'); BPF.go('admin', { back: 'settings', back2: this.back }); }
      else { this.pw.err = '비밀번호가 맞지 않아요.'; BPF.audio.sfx('bad'); document.getElementById('nameInput').value = ''; }
    },
    draw(ctx) {
      const d = BPF.save.data, S = d.settings;
      ui.bg(ctx, '#d9ccff', '#bfe0ff');
      const realModal = ui.modal; if (this.pw && !realModal) ui.modal = { block: true }; // 비밀번호 창이 떠 있으면 뒤 버튼 막기
      ui.panel(ctx, 240, 60, 800, 620, { title: '설정' });
      const toggle = (y, label, key, desc) => {
        ui.text(ctx, label, 300, y + 28, { size: 22, align: 'left' });
        ui.text(ctx, desc, 300, y + 56, { size: 14, align: 'left', color: '#7a6a99', weight: 'normal' });
        if (ui.button(ctx, 820, y + 6, 160, 52, S[key] ? '켜짐' : '꺼짐', { color: S[key] ? '#47c46b' : '#b8b0c8', size: 20 })) { S[key] = !S[key]; BPF.save.write('settings'); }
      };
      ui.text(ctx, '효과음', 300, 128, { size: 22, align: 'left' });
      if (ui.button(ctx, 820, 106, 160, 52, S.mute ? '꺼짐' : '켜짐', { color: S.mute ? '#b8b0c8' : '#47c46b', size: 20 })) { S.mute = !S.mute; BPF.save.write('settings'); }
      toggle(170, '배경음', 'bgm', '아케이드 반짝임 · 과학 마을의 아침');
      toggle(250, '애니메이션 간소화', 'reduceMotion', '흔들림·반짝임을 줄여요 (어지러울 때)');
      ui.text(ctx, '플레이어 캐릭터', 300, 360, { size: 22, align: 'left' });
      BPF.drawImg(ctx, `face_${BPF.save.player}_idle`, 520, 326, 60, 60);
      if (ui.button(ctx, 820, 338, 160, 52, '변경', { color: '#3f8cff', size: 20 })) BPF.go('playerSelect', { back: 'settings' });
      ui.text(ctx, '저장 파일', 300, 440, { size: 22, align: 'left' });
      ui.text(ctx, '브라우저 자동 저장 + 파일로 백업(다른 컴퓨터로 옮길 때)', 300, 468, { size: 14, align: 'left', color: '#7a6a99', weight: 'normal' });
      if (ui.button(ctx, 640, 418, 160, 52, '내보내기', { color: '#ffb648', size: 19 })) BPF.save.export();
      if (ui.button(ctx, 820, 418, 160, 52, '가져오기', { color: '#ff9a4d', size: 19 })) BPF.save.import();
      if (BPF.save.lastError) ui.text(ctx, '⚠ 최근 저장 실패: 내보내기로 백업하세요', 300, 500, { size: 15, align: 'left', color: '#b03040' });
      ui.text(ctx, '처음부터', 300, 540, { size: 22, align: 'left' });
      if (ui.button(ctx, 820, 516, 160, 52, '초기화', { color: '#ff7a7a', size: 19 })) {
        ui.confirm('정말 초기화할까요?', '최고 기록·동물·마을이 모두 지워지고 되돌릴 수 없어요.', () => { BPF.save.reset(); BPF.save.write(); BPF.go('title'); });
      }
      if (ui.button(ctx, 300, 600, 200, 60, '🔒 교사용', { color: '#5a4a8b', size: 20 })) this.openPw();
      if (ui.button(ctx, 540, 600, 200, 60, '돌아가기', { color: '#8a7dff', size: 22, focus: true })) BPF.go(this.back);
      if (ui.modal && ui.modal.block) ui.modal = realModal;
      if (this.pw) {
        ctx.fillStyle = 'rgba(30,20,60,.6)'; ctx.fillRect(0, 0, BPF.W, BPF.H);
        ui.round(ctx, 400, 220, 480, 280, 24, '#fffaf0', '#3a2a6b', 5);
        ui.text(ctx, '🔒 교사용 관리자 모드', 640, 268, { size: 26, color: '#3a2a6b' });
        ui.text(ctx, '비밀번호를 입력하세요', 640, 306, { size: 16, color: '#7a6a99', weight: 'normal' });
        if (this.pw.err) ui.text(ctx, this.pw.err, 640, 412, { size: 16, color: '#b03040' });
        if (ui.button(ctx, 450, 430, 170, 54, '취소', { color: '#b8b0c8', size: 20 })) { ui.hideInput(); this.pw = null; }
        else if (ui.button(ctx, 660, 430, 170, 54, '확인', { color: '#3f8cff', size: 20, focus: true })) this.checkPw();
      }
      ui.drawModal(ctx, 1 / 60);
    }
  };
})();
