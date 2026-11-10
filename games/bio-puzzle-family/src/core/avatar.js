/* PlayerAvatar — 모든 미니게임·마을에 상시 등장하는 플레이어 캐릭터 공통 렌더러
   상태머신: idle → thinking → acting → success / mistake → combo → win / lose */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui;
  const FACE = { idle: 'idle', thinking: 'thinking', acting: 'acting', success: 'success', mistake: 'mistake', combo: 'combo', win: 'combo', lose: 'mistake' };
  const HOLD = { acting: 0.6, success: 1.0, mistake: 1.1, combo: 1.3 };
  // 게임별 특수 의상/동작 (명세 14-4)
  const COSTUME = {
    village: { label: '연구 마을', icon: 'dna_helix' },
    g01: { label: 'DNA 블록 조립', icon: 'thumb_g01' },
    g02: { label: '발효 공장장', icon: 'jar_kimchi' },
    g03: { label: '진단 연구원', icon: 'syringe' },
    g04: { label: '연구원 가운', icon: 'card_corn_gmo' },
    g05: { label: '재조합 연구원', icon: 'dna_tile' },
    g06: { label: '분류 센터장', icon: 'fu_field_agri' },
    g07: { label: '융합 기술자', icon: 'alchemy_pot' },
    g08: { label: '면역 수호대', icon: 'shield' },
    g09: { label: '정화 장치 조종', icon: 'spray' },
    g10: { label: '윤리 심판관', icon: 'scales' }
  };


  function Avatar() { this.mounted = false; }
  Avatar.prototype.mount = function (scene, pid, costumeId, anchor) {
    this.scene = scene; this.pid = BPF.save.PLAYER_IDS.includes(pid) ? pid : 'p01';
    this.costume = costumeId || 'default'; this.anchor = anchor;
    this.state = 'idle'; this.timer = 0; this.t = 0; this.combo = 0; this.mounted = true;
    this.line = this.pickLine('idle'); this.lineT = 2.5; this.gameKey = scene && scene.id;
    return this;
  };
  Avatar.prototype.unmount = function () { this.mounted = false; };
  Avatar.prototype.pickLine = function (st) {
    const P = BPF_DATA.players[this.pid];
    return BPF.pick((P.lines[st] || P.lines.idle));
  };
  Avatar.prototype.setState = function (st, opt) {
    if (!this.mounted) return;
    if ((this.state === 'win' || this.state === 'lose') && st !== 'idle') return;
    const pri = { idle: 0, thinking: 1, acting: 2, success: 3, mistake: 3, combo: 4, win: 9, lose: 9 };
    if (this.timer > 0 && pri[st] < pri[this.state] && st !== 'idle') return; // 강한 반응 유지
    if (st !== this.state || st === 'success' || st === 'combo' || st === 'mistake') {
      this.t = 0;
      if (st !== 'acting' && st !== 'thinking' || Math.random() < 0.3) { this.line = (opt && opt.line) || this.pickLine(st); this.lineT = 2.2; }
    }
    this.state = st; this.timer = HOLD[st] || 0;
    if (opt && opt.combo != null) this.combo = opt.combo;
  };
  Avatar.prototype.update = function (dt) {
    this.t += dt; this.lineT -= dt;
    if (this.timer > 0) { this.timer -= dt; if (this.timer <= 0 && this.state !== 'win' && this.state !== 'lose') this.state = 'idle'; }
  };
  /* 사이드 패널(화면 폭 약 20%) */
  Avatar.prototype.draw = function (ctx) {
    if (!this.mounted) return;
    const a = this.anchor, P = BPF_DATA.players[this.pid];
    const reduce = BPF.save.data.settings.reduceMotion;
    ui.round(ctx, a.x, a.y, a.w, a.h, 22, 'rgba(255,250,240,.95)', '#3a2a6b', 4);
    // 이름표
    ui.round(ctx, a.x + 12, a.y + 10, a.w - 24, 36, 18, P.color, '#3a2a6b', 3);
    ui.text(ctx, P.name, a.x + a.w / 2, a.y + 29, { size: 20, color: '#fff', outline: '#3a2a6b' });
    // 의상 리본
    const cos = COSTUME[this.gameKey] || COSTUME.village;
    ui.round(ctx, a.x + 12, a.y + 52, a.w - 24, 30, 10, '#efe6ff', '#3a2a6b', 2);
    BPF.drawImg(ctx, cos.icon, a.x + 16, a.y + 53, 28, 28, { noFallback: true });
    ui.text(ctx, cos.label, a.x + a.w / 2 + 14, a.y + 68, { size: 14, color: '#4a3a8b' });
    // 표정 초상
    const box = { x: a.x + 10, y: a.y + 90, w: a.w - 20, h: Math.min(a.w - 20, a.h - 220) };
    const g = ctx.createRadialGradient(box.x + box.w / 2, box.y + box.h / 2, 10, box.x + box.w / 2, box.y + box.h / 2, box.w * 0.7);
    const bgc = { success: '#fff3a8', combo: '#ffd6f5', win: '#fff3a8', mistake: '#cfd8ff', lose: '#c9c9de', thinking: '#e2f4ff', acting: '#e8ffe0' }[this.state] || '#ffffff';
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, bgc);
    ui.round(ctx, box.x, box.y, box.w, box.h, 18, g, '#3a2a6b', 3);
    let dx = 0, dy = 0, sc = 1, rot = 0;
    const t = this.t;
    if (!reduce) {
      switch (this.state) {
        case 'idle': dy = Math.sin(BPF.time * 3) * 3; sc = 1 + Math.sin(BPF.time * 3) * 0.01; break;
        case 'thinking': rot = Math.sin(BPF.time * 2) * 0.03; break;
        case 'acting': dx = Math.sin(t * 30) * 2; dy = -Math.abs(Math.sin(t * 12)) * 4; break;
        case 'success': dy = -Math.abs(Math.sin(t * 9)) * 14 * Math.max(0, 1 - t); sc = 1 + 0.06 * Math.max(0, 1 - t * 2); break;
        case 'combo': dy = -Math.abs(Math.sin(t * 12)) * 16; rot = Math.sin(t * 16) * 0.05; sc = 1.05; break;
        case 'mistake': dx = Math.sin(t * 50) * 6 * Math.max(0, 1 - t * 1.5); break;
        case 'win': dy = -Math.abs(Math.sin(t * 8)) * 18; sc = 1.06; break;
        case 'lose': dy = 8; sc = 0.97; break;
      }
    }
    // 반짝이 효과
    if (this.state === 'combo' || this.state === 'win') {
      ctx.save();
      for (let i = 0; i < 6; i++) {
        const ang = BPF.time * 2 + i * Math.PI / 3;
        ui.star(ctx, box.x + box.w / 2 + Math.cos(ang) * box.w * 0.42, box.y + box.h / 2 + Math.sin(ang) * box.h * 0.42, 9, i % 2 ? '#ffd84d' : '#ff8fd0', false);
      }
      ctx.restore();
    }
    ctx.save();
    ui.path(ctx, box.x + 3, box.y + 3, box.w - 6, box.h - 6, 16); ctx.clip();
    ctx.translate(box.x + box.w / 2 + dx, box.y + box.h / 2 + dy); ctx.rotate(rot); ctx.scale(sc, sc);
    let face = FACE[this.state];
    // 나리·시온의 '조작' 그림은 DNA 블록을 들고 있어 블록 퍼즐에서만 사용
    if (face === 'acting' && (this.pid === 'p03' || this.pid === 'p04') && this.gameKey !== 'g01' && this.gameKey !== 'g05') face = 'idle';
    let key = `face_${this.pid}_${face}`;
    if (!BPF.assets.get(key)) key = `face_${this.pid}_idle`; // 표정 이미지가 없으면 기본 표정
    if (!BPF.drawImg(ctx, key, -box.w / 2 + 6, -box.h / 2 + 6, box.w - 12, box.h - 12, { noFallback: true })) {
      // 폴백: 정적 전신 → 그래도 없으면 그림
      if (!BPF.drawImg(ctx, `body_${this.pid}`, -box.w / 2 + 6, -box.h / 2 + 6, box.w - 12, box.h - 12, { noFallback: true }))
        BPF.drawImg(ctx, 'none', -box.w / 2 + 6, -box.h / 2 + 6, box.w - 12, box.h - 12, { label: P.name, fallbackColor: P.color });
    }
    ctx.restore();
    // 상태 아이콘
    const fx = { success: 'fx_burst', combo: 'fx_burst2', mistake: 'fx_drops', thinking: 'bubble_q', win: 'fx_heart', lose: 'fx_spiral' }[this.state];
    if (fx) BPF.drawImg(ctx, fx, box.x + box.w - 52, box.y - 6, 54, 54, { noFallback: true });
    // 말풍선
    const by = box.y + box.h + 12;
    const bh = a.y + a.h - by - 12;
    // 말풍선 높이는 대사 길이에 맞춤
    const lines = Math.max(1, Math.ceil(ui.measure(this.line, 17) / (a.w - 50)));
    const bubH = Math.min(bh, 20 + lines * 25);
    if (bh > 40) {
      ui.round(ctx, a.x + 12, by, a.w - 24, bubH, 16, '#ffffff', '#3a2a6b', 3);
      ctx.beginPath(); ctx.moveTo(a.x + a.w / 2 - 10, by + 1); ctx.lineTo(a.x + a.w / 2, by - 12); ctx.lineTo(a.x + a.w / 2 + 10, by + 1);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#3a2a6b'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(a.x + a.w / 2 - 9, by, 18, 4);
      ui.wrap(ctx, this.line, a.x + a.w / 2, by + 12, a.w - 44, { size: 17, align: 'center', weight: 'bold', color: '#3a2a6b' });
      const cy = by + bubH + 8;
      const room = a.y + a.h - cy - 8;
      if (room > 80) {
        // 전신 모습(같은 캐릭터) — 성공·콤보 때 점프
        const jump = reduce ? 0 : (this.state === 'success' || this.state === 'combo' || this.state === 'win') ? Math.abs(Math.sin(BPF.time * 10)) * 10 : 0;
        BPF.drawPlayerBody(ctx, this.pid, a.x + 70, a.y + a.h - 12 - jump, Math.min(room - 6, 190), { walking: this.state === 'acting' });
        const lab = { idle: '대기', thinking: '고민 중', acting: '조작 중', success: '성공!', mistake: '실수…', combo: '콤보!', win: '승리!', lose: '아쉬움' }[this.state];
        ui.round(ctx, a.x + 132, cy + 14, a.w - 146, 34, 14, bgc, '#3a2a6b', 2);
        ui.text(ctx, lab, a.x + 132 + (a.w - 146) / 2, cy + 32, { size: 17, color: '#3a2a6b' });
        if (this.combo >= 2) ui.text(ctx, `${this.combo} COMBO!`, a.x + 132 + (a.w - 146) / 2, cy + 74, { size: 22 + (reduce ? 0 : Math.sin(BPF.time * 10) * 2), color: '#ffd84d', outline: '#c2185b' });
      } else if (this.combo >= 2 && room > 34) {
        ui.text(ctx, `${this.combo} COMBO!`, a.x + a.w / 2, cy + 18, { size: 24, color: '#ffd84d', outline: '#c2185b' });
      }
    }
  };
  BPF.PlayerAvatar = Avatar;
  BPF.avatarCostumes = COSTUME;

  /* 마을용 전신 캐릭터 그리기 (보행 바운스) */
  BPF.drawPlayerBody = function (ctx, pid, x, y, h, opt) {
    opt = opt || {};
    const reduce = BPF.save.data.settings.reduceMotion;
    const walk = opt.walking && !reduce ? Math.abs(Math.sin(BPF.time * 12)) * 5 : 0;
    const squash = opt.walking && !reduce ? 1 + Math.sin(BPF.time * 24) * 0.02 : 1 + Math.sin(BPF.time * 2.5) * 0.008;
    ctx.save();
    ctx.fillStyle = 'rgba(30,20,60,.25)'; ctx.beginPath(); ctx.ellipse(x, y, h * 0.2, h * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(x, y - walk); ctx.scale(opt.flip ? -1 : 1, squash);
    const w = h * 0.62;
    // 보행·포즈 프레임이 있는 캐릭터(현재 하루)는 마을에서 프레임 애니메이션
    let poseKey = null;
    if (opt.village && BPF.assets.get(`pose_${pid}_stand`)) {
      if (opt.walking && !reduce) poseKey = `pose_${pid}_` + ['walk1', 'walk2', 'walk3', 'walk2'][Math.floor(BPF.time * 9) % 4];
      else poseKey = opt.pose ? `pose_${pid}_${opt.pose}` : `pose_${pid}_stand`;
      if (!BPF.assets.get(poseKey)) poseKey = `pose_${pid}_stand`;
    }
    if (poseKey) {
      ctx.restore(); ctx.save();
      ctx.fillStyle = 'rgba(30,20,60,.25)';
      ctx.translate(x, y); ctx.scale(opt.flip ? -1 : 1, 1); // 포즈 원본은 오른쪽을 봄
      BPF.drawImg(ctx, poseKey, -h * 0.5, -h, h, h, { noFallback: true, align: 'bottom' });
    } else if (!BPF.drawImg(ctx, `body_${pid}`, -w / 2, -h, w, h, { noFallback: true, align: 'bottom' })) {
      const P = BPF_DATA.players[pid] || BPF_DATA.players.p01;
      ctx.fillStyle = P.color; ui.round(ctx, -w * 0.3, -h * 0.55, w * 0.6, h * 0.55, 12, P.color, '#3a2a6b', 3);
      ctx.beginPath(); ctx.arc(0, -h * 0.72, h * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffe0c4'; ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  };
  /* 동반 생명체 그리기 */
  BPF.drawPet = function (ctx, petId, stage, x, y, size, opt) {
    opt = opt || {};
    const reduce = BPF.save.data.settings.reduceMotion;
    const hop = opt.walking && !reduce ? Math.abs(Math.sin(BPF.time * 10)) * size * 0.08 : 0;
    // 2프레임 대기: 숨쉬기
    const breathe = reduce ? 1 : (Math.floor(BPF.time * 2) % 2 ? 1.02 : 0.99);
    ctx.save();
    ctx.fillStyle = 'rgba(30,20,60,.2)'; ctx.beginPath(); ctx.ellipse(x, y, size * 0.32, size * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(x, y - hop); ctx.scale(opt.flip ? -1 : 1, breathe);
    if (opt.silhouette) BPF.drawSilhouette(ctx, `pet_${petId}_${stage}`, -size / 2, -size, size, size, opt.silColor || '#3b3165');
    else if (!BPF.drawImg(ctx, `pet_${petId}_${stage}`, -size / 2, -size, size, size, { noFallback: true, align: 'bottom' })) {
      const D = BPF_DATA.pets[petId];
      ctx.beginPath(); ctx.arc(0, -size * 0.35, size * (0.2 + stage * 0.04), 0, Math.PI * 2); ctx.fillStyle = D.color; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#3a2a6b'; ctx.stroke();
      ui.text(ctx, D.name, 0, -size * 0.35, { size: 16, color: '#fff', outline: '#3a2a6b' });
    }
    ctx.restore();
  };
})();
