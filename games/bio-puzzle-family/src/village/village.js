/* 연구 마을 — 선택한 플레이어로 이동, 건물 입장, NPC 대화, 단계별 확장 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  const B = [
    { id: 'institute', name: '연구소', img: 'bld_institute', x: 640, y: 262, w: 320, h: 180, stage: 1, go: 'lab', npc: 'dr' },
    { id: 'center', name: '미니게임 센터', img: 'bld_lab', x: 290, y: 300, w: 250, h: 150, stage: 1, go: 'gamecenter' },
    { id: 'farm', name: '육성 농장', img: 'bld_barn', x: 1000, y: 310, w: 240, h: 170, stage: 1, go: 'farm', npc: 'farmer' },
    { id: 'house', name: '도서관', img: 'bld_library', x: 170, y: 560, w: 200, h: 160, stage: 1, go: 'library' },
    { id: 'shop', name: '발효 상점', img: 'bld_shop', x: 420, y: 580, w: 170, h: 180, stage: 2, go: 'shop', npc: 'shop' },
    { id: 'gene', name: '유전 연구관', img: 'bld_greenhouse', x: 1100, y: 580, w: 210, h: 170, stage: 3, go: 'codex', npc: 'gene' },
    { id: 'forest', name: '환경 숲', img: 'tree', x: 850, y: 640, w: 150, h: 180, stage: 4, go: 'forest', npc: 'eco' },
    { id: 'plaza', name: '축제 광장', img: 'bld_fountain', x: 640, y: 470, w: 220, h: 120, stage: 5, go: 'festival', npc: 'fest' }
  ];
  const NPC_POS = { dr: [520, 300], farmer: [880, 330], shop: [520, 600], gene: [980, 610], eco: [760, 650], fest: [760, 480] };
  const NPC_LINES = {
    dr: () => {
      const P = BPF.progress;
      if (P.canUpgrade()) return '연구소 승급 조건을 모두 채웠구나! 연구소에 들어와서 승급하자!';
      if (P.pendingQuestCount()) return '완료한 의뢰가 있구나! 연구소에서 보고해 주렴.';
      const st = BPF.save.data.villageStage;
      if (st >= 5) return '고맙다, 연구원! 이제 이곳은 어엿한 바이오빌리지야.';
      const next = P.villageReqs(st + 1).find(r => !r.done);
      return next ? `다음 단계까지: ${next.text}` : '미니게임 센터에서 연구를 계속해 보렴!';
    },
    farmer: () => { const p = BPF.save.pet; return p ? `${p.name}을(를) 키우려면 먹이·연구키트·장식이 필요해. 미니게임을 클리어하면 얻을 수 있단다!` : '농장에서 동물을 입양해 보렴!'; },
    shop: () => '어서 와요! 미니게임 보상 BP로 먹이·연구키트·장식을 살 수 있어요.',
    gene: () => '여기서는 교배·선발 품종 개량과 유전자 변형 생물체(GMO)의 차이를 정리한 자료를 볼 수 있어.',
    eco: () => '미생물과 식물을 활용해 오염을 없애는 걸 생물 정화라고 해. 생물 정화 대작전에 도전해 볼래?',
    fest: () => BPF.save.data.villageStage >= 5 ? '축제가 시작됐어요! 광장으로 들어와요!' : '축제 준비 중이에요. 동물 친구들이 모두 최종 단계가 되면 축제를 열 수 있어요!'
  };

  let ground = null, groundStage = 0;
  function buildGround(stage, img) {
    const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 720); gr.addColorStop(0, '#a9e88a'); gr.addColorStop(1, '#7fd062');
    g.fillStyle = gr; g.fillRect(0, 0, 1280, 720);
    if (img) {
      // 원형 광장 그림을 마을 광장(640,450) 위치에 맞춰 크게 깐다
      g.drawImage(img, -160, 60, 1600, 900);
      const fade = g.createLinearGradient(0, 56, 0, 110); fade.addColorStop(0, '#a9e88a'); fade.addColorStop(1, 'rgba(169,232,138,0)');
      g.fillStyle = fade; g.fillRect(0, 56, 1280, 54);
      g.fillStyle = '#a9e88a'; g.fillRect(0, 0, 1280, 57);
      if (stage >= 2) { g.fillStyle = '#7fd0ff'; g.strokeStyle = '#3f8cff'; g.lineWidth = 5; g.beginPath(); g.ellipse(70, 360, 90, 50, 0.2, 0, 7); g.fill(); g.stroke(); }
      c.hasImg = true;
      return c;
    }
    // 풀
    for (let i = 0; i < 260; i++) {
      const x = (i * 157) % 1280, y = 80 + (i * 263) % 640;
      g.strokeStyle = 'rgba(60,140,50,.35)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y - 7); g.moveTo(x + 4, y); g.lineTo(x + 6, y - 8); g.stroke();
    }
    // 길
    const path = (pts, w) => {
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = '#c9b48a'; g.lineWidth = w + 10; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
      g.strokeStyle = '#efe0bd'; g.lineWidth = w; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
    };
    path([[640, 280], [640, 470]], 60);
    path([[290, 315], [470, 400], [640, 440], [820, 400], [1000, 325]], 50);
    path([[170, 575], [420, 520], [640, 470], [860, 520], [1100, 590]], 46);
    path([[640, 470], [640, 700]], 46);
    // 광장
    g.fillStyle = '#efe0bd'; g.strokeStyle = '#c9b48a'; g.lineWidth = 6;
    g.beginPath(); g.ellipse(640, 450, 180, 70, 0, 0, 7); g.fill(); g.stroke();
    // 물가
    if (stage >= 2) { g.fillStyle = '#7fd0ff'; g.strokeStyle = '#3f8cff'; g.lineWidth = 5; g.beginPath(); g.ellipse(70, 360, 90, 50, 0.2, 0, 7); g.fill(); g.stroke(); }
    return c;
  }

  const DECOS = [
    { img: 'tree', x: 60, y: 260, w: 110, h: 140, s: 1 }, { img: 'tree', x: 1220, y: 250, w: 110, h: 140, s: 1 },
    { img: 'bush', x: 420, y: 345, w: 70, h: 56, s: 1 }, { img: 'bush', x: 800, y: 330, w: 70, h: 56, s: 1 },
    
    { img: 'flowers', x: 300, y: 430, w: 80, h: 56, s: 2 }, { img: 'flowers', x: 990, y: 440, w: 80, h: 56, s: 2 }, { img: 'fence', x: 1150, y: 400, w: 120, h: 50, s: 2 },
    { img: 'deco_lamp', x: 520, y: 430, w: 40, h: 90, s: 3 }, { img: 'deco_lamp', x: 760, y: 430, w: 40, h: 90, s: 3 }, { img: 'tree_pink', x: 40, y: 700, w: 120, h: 140, s: 3 },
    { img: 'deco_arch', x: 640, y: 712, w: 130, h: 120, s: 4 }, { img: 'tree_pink', x: 1240, y: 710, w: 110, h: 130, s: 4 }, { img: 'flowers', x: 560, y: 680, w: 70, h: 50, s: 4 },
    { img: 'hay', x: 1130, y: 330, w: 60, h: 46, s: 2 }, { img: 'rock', x: 330, y: 690, w: 70, h: 50, s: 3 }, { img: 'bench', x: 720, y: 560, w: 80, h: 50, s: 4 }
  ];

  function drawNPC(ctx, id, x, y, talk) {
    const N = BPF_DATA.npcs.find(n => n.id === id);
    const bob = Math.sin(BPF.time * 2.5 + x) * 2;
    ctx.save();
    ctx.fillStyle = 'rgba(30,20,60,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 22, 6, 0, 0, 7); ctx.fill();
    ctx.translate(x, y + bob);
    if (BPF.drawImg(ctx, 'npc_' + id, -34, -96, 68, 98, { noFallback: true, align: 'bottom' })) { ctx.restore(); return finishNPC(); }
    ui.round(ctx, -18, -48, 36, 46, 14, N.color, '#3a2a6b', 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-4, -46, 8, 40);
    ctx.beginPath(); ctx.arc(0, -64, 22, 0, 7); ctx.fillStyle = '#ffe0c4'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#3a2a6b'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -70, 23, Math.PI * 1.05, Math.PI * 1.95); ctx.fillStyle = N.hair; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a2a6b'; ctx.beginPath(); ctx.arc(-8, -62, 3, 0, 7); ctx.arc(8, -62, 3, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c2185b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -56, 5, 0.2, Math.PI - 0.2); ctx.stroke();
    if (id === 'dr') { ctx.strokeStyle = '#3a2a6b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-8, -62, 6, 0, 7); ctx.arc(8, -62, 6, 0, 7); ctx.stroke(); }
    ctx.restore();
    finishNPC();
    function finishNPC() {
      ui.round(ctx, x - 44, y + 6, 88, 22, 11, 'rgba(255,255,255,.9)', '#3a2a6b', 2);
      ui.text(ctx, N.name, x, y + 17, { size: 13 });
      if (talk) BPF.drawImg(ctx, 'bubble_dots', x + 10, y - 120, 42, 42, { noFallback: true });
    }
  }
  BPF.drawNPC = drawNPC;

  BPF.scenes.village = {
    enter(p) {
      const d = BPF.save.data;
      if (!d.selectedPlayerId) { BPF.go('playerSelect', { first: true }); return; }
      this.pl = this.pl || { x: 640, y: 600, flip: false };
      if (p && p.from) { const b = B.find(b => b.go === p.from); if (b) { this.pl.x = b.x; this.pl.y = b.y + 30; } }
      this.pet = { x: this.pl.x - 50, y: this.pl.y + 10, flip: false };
      this.target = null; this.dialog = null; this.walking = false;
      BPF.audio.bgm('village');
      if (p && p.intro) {
        setTimeout(() => ui.alert('한빛 박사', `${BPF_DATA.players[d.selectedPlayerId].name}, 생명기술 연구마을에 온 걸 환영해!\n미니게임 센터에서 연구를 하고, 농장에서 ${BPF.save.pet ? BPF.save.pet.name : '동물 친구'}을(를) 돌봐 주렴.\n연구가 쌓이면 이 낡은 연구실이 멋진 바이오빌리지가 될 거야!`), 400);
      }
    },
    unlocked(b) { return BPF.save.data.villageStage >= b.stage; },
    near() {
      let best = null, bd = 1e9;
      B.forEach(b => { const d = Math.hypot(this.pl.x - b.x, (this.pl.y - (b.y + 20)) * 1.6); if (d < 110 && d < bd) { bd = d; best = b; } });
      return best;
    },
    nearNPC() {
      let best = null, bd = 1e9;
      Object.keys(NPC_POS).forEach(id => {
        if (!this.npcVisible(id)) return;
        const [x, y] = NPC_POS[id]; const d = Math.hypot(this.pl.x - x, this.pl.y - y);
        if (d < 70 && d < bd) { bd = d; best = id; }
      });
      return best;
    },
    npcVisible(id) { const b = B.find(b => b.npc === id); return !b || this.unlocked(b); },
    enterBuilding(b) {
      if (!this.unlocked(b)) { BPF.toast(`${b.name}은(는) 마을 ${b.stage}단계에 열려요. (연구소에서 승급!)`, '#7a5a2a'); BPF.audio.sfx('bad'); return; }
      BPF.audio.sfx('ok');
      if (b.go === 'festival' && BPF.save.data.villageStage < 5) { this.talk('fest'); return; }
      if (b.go === 'codex') { BPF.go('codex', { tab: 1, back: 'village' }); return; }
      if (b.go === 'library') { BPF.go('codex', { tab: 0, back: 'village' }); return; }
      BPF.go(b.go, { back: 'village' });
    },
    talk(id) { this.dialog = { id, text: NPC_LINES[id](), t: 0 }; BPF.audio.sfx('pop'); },
    update(dt) {
      if (ui.modal) return;
      if (this.dialog) {
        this.dialog.t += dt;
        if (this.dialog.t > 0.2 && (I.confirm() || I.key('Escape'))) this.dialog = null;
        return;
      }
      const pl = this.pl;
      let ax = 0, ay = 0;
      if (I.anyHeld('ArrowLeft', 'KeyA')) ax -= 1; if (I.anyHeld('ArrowRight', 'KeyD')) ax += 1;
      if (I.anyHeld('ArrowUp', 'KeyW')) ay -= 1; if (I.anyHeld('ArrowDown', 'KeyS')) ay += 1;
      if (ax || ay) this.target = null;
      if (this.target) {
        const dx = this.target.x - pl.x, dy = this.target.y - pl.y, d = Math.hypot(dx, dy);
        if (d < 8) { const b = this.target.b, n = this.target.npc; this.target = null; if (b) this.enterBuilding(b); if (n) this.talk(n); }
        else { ax = dx / d; ay = dy / d; }
      }
      const len = Math.hypot(ax, ay);
      this.walking = len > 0;
      if (len) {
        ax /= len; ay /= len;
        pl.x = BPF.clamp(pl.x + ax * 250 * dt, 40, 1240); pl.y = BPF.clamp(pl.y + ay * 250 * dt, 300, 705);
        if (ax) pl.flip = ax < 0;
      }
      // 동물 따라오기
      const tx = pl.x + (pl.flip ? 56 : -56), ty = pl.y + 8;
      const pd = Math.hypot(tx - this.pet.x, ty - this.pet.y);
      this.pet.walking = pd > 6;
      if (pd > 2) { this.pet.x += (tx - this.pet.x) * Math.min(1, dt * 4); this.pet.y += (ty - this.pet.y) * Math.min(1, dt * 4); this.pet.flip = tx < this.pet.x; }
      if (I.confirm()) {
        const n = this.nearNPC(), b = this.near();
        if (n) this.talk(n); else if (b) this.enterBuilding(b);
      }
      if (I.key('Escape')) BPF.go('settings', { back: 'village' });
    },
    draw(ctx) {
      const d = BPF.save.data, st = d.villageStage;
      const gim = BPF.assets.get('bg_ground');
      if (!ground || groundStage !== st || (gim && !ground.hasImg)) { ground = buildGround(st, gim); groundStage = st; }
      ctx.drawImage(ground, 0, 0);
      // 그리기 목록(깊이 정렬)
      const items = [];
      DECOS.forEach(o => { if (st >= o.s) items.push({ y: o.y, f: () => BPF.drawImg(ctx, o.img, o.x - o.w / 2, o.y - o.h, o.w, o.h, { noFallback: true, align: 'bottom' }) }); });
      if (st >= 4) [[790, 700], [910, 690], [960, 650]].forEach(([x, y], i) => items.push({ y, f: () => BPF.drawImg(ctx, i % 2 ? 'tree_pink' : 'tree', x - 60, y - 140, 120, 140, { noFallback: true, align: 'bottom' }) }));
      const nb = this.near();
      B.forEach(b => {
        items.push({ y: b.y, f: () => {
          const un = this.unlocked(b);
          const hov = ui.hover({ x: b.x - b.w / 2, y: b.y - b.h, w: b.w, h: b.h });
          ctx.save();
          if (!un) ctx.globalAlpha = 0.45;
          const sc = (hov || nb === b) && un ? 1.04 : 1;
          ctx.translate(b.x, b.y); ctx.scale(sc, sc);
          if (un) BPF.drawImg(ctx, b.id === 'institute' && BPF.assets.get('bld_institute_' + st) ? 'bld_institute_' + st : b.img, -b.w / 2, -b.h, b.w, b.h, { align: 'bottom', label: b.name });
          else {
            ctx.globalAlpha = 0.35; ctx.filter = 'grayscale(1)';
            BPF.drawImg(ctx, b.img, -b.w / 2 * 0.8, -b.h * 0.8, b.w * 0.8, b.h * 0.8, { align: 'bottom', noFallback: true });
            ctx.filter = 'none'; ctx.globalAlpha = 1;
            BPF.drawImg(ctx, 'fence', -60, -44, 120, 44, { noFallback: true });
            BPF.drawImg(ctx, 'sign', -26, -86, 52, 52, { noFallback: true });
          }
          ctx.restore();
          const ly = b.y + 4;
          ui.round(ctx, b.x - 70, ly, 140, 28, 14, un ? (nb === b ? '#ffe14d' : 'rgba(255,255,255,.92)') : '#8a80a8', '#3a2a6b', 3);
          ui.text(ctx, un ? b.name : `🔒 ${b.stage}단계 개방`, b.x, ly + 15, { size: 15, color: un ? '#3a2a6b' : '#fff' });
          if (b.id === 'institute' && (BPF.progress.canUpgrade() || BPF.progress.pendingQuestCount())) {
            BPF.drawImg(ctx, 'bubble_ex', b.x + 90, b.y - b.h - 30 + Math.sin(BPF.time * 5) * 5, 56, 56, { noFallback: true });
          }
          if (b.id === 'farm' && BPF.save.pet && BPF.progress.evolveCheck(d.companionId).ok) {
            BPF.drawImg(ctx, 'fx_heart', b.x + 80, b.y - b.h - 20 + Math.sin(BPF.time * 5) * 5, 50, 50, { noFallback: true });
          }
        } });
      });
      const nn = this.nearNPC();
      Object.keys(NPC_POS).forEach(id => { if (this.npcVisible(id)) { const [x, y] = NPC_POS[id]; items.push({ y, f: () => drawNPC(ctx, id, x, y, nn === id) }); } });
      if (d.companionId) items.push({ y: this.pet.y, f: () => BPF.drawPet(ctx, d.companionId, d.pets[d.companionId].stage, this.pet.x, this.pet.y, 50 + d.pets[d.companionId].stage * 8, { flip: this.pet.flip, walking: this.pet.walking }) });
      items.push({ y: this.pl.y, f: () => BPF.drawPlayerBody(ctx, d.selectedPlayerId, this.pl.x, this.pl.y, 120, { flip: this.pl.flip, walking: this.walking, village: true }) });
      items.sort((a, b) => a.y - b.y).forEach(i => i.f());
      // 안내
      if (!this.dialog) {
        if (nn) ui.text(ctx, `Space: ${BPF_DATA.npcs.find(n => n.id === nn).name}와(과) 대화`, this.pl.x, this.pl.y - 140, { size: 17, color: '#fff', outline: '#3a2a6b' });
        else if (nb) ui.text(ctx, `Space: ${nb.name} ${this.unlocked(nb) ? '들어가기' : '(잠김)'}`, this.pl.x, this.pl.y - 140, { size: 17, color: '#fff', outline: '#3a2a6b' });
      }
      // 클릭 이동
      if (!this.dialog && ui.hit({ x: 0, y: 72, w: 1280, h: 580 })) {
        let b = B.find(b => BPF.inRect(I.cx, I.cy, { x: b.x - b.w / 2, y: b.y - b.h, w: b.w, h: b.h + 30 }));
        let n = Object.keys(NPC_POS).find(id => this.npcVisible(id) && Math.hypot(I.cx - NPC_POS[id][0], I.cy - (NPC_POS[id][1] - 40)) < 45);
        if (n) this.target = { x: NPC_POS[n][0] + 40, y: NPC_POS[n][1], npc: n };
        else if (b) this.target = { x: b.x, y: b.y + 30, b };
        else this.target = { x: I.cx, y: Math.max(300, I.cy) };
        I.consume();
      }
      // HUD
      ui.topBar(ctx, `마을 ${st}단계 · ${BPF_DATA.village[st].name}`);
      const btns = [['캐릭터 변경', '#3f8cff', () => BPF.go('playerSelect', { back: 'village' })],
        ['동물 바꾸기', '#ff8fb8', () => BPF.go('farm', { back: 'village', pickTab: true })],
        ['도감', '#47c46b', () => BPF.go('codex', { back: 'village' })],
        ['앨범', '#ffb648', () => BPF.go('album', { back: 'village' })],
        ['설정', '#8a7dff', () => BPF.go('settings', { back: 'village' })],
        ['저장', '#3fb6d6', () => { if (BPF.save.write('manual')) BPF.toast('저장했어요! 💾'); }]];
      btns.forEach((b, i) => { if (ui.button(ctx, 12 + i * 128, 660, 120, 50, b[0], { color: b[1], size: 17 })) b[2](); });
      // 대화창
      if (this.dialog) {
        const N = BPF_DATA.npcs.find(n => n.id === this.dialog.id);
        ui.panel(ctx, 160, 470, 960, 180, {});
        drawNPC(ctx, this.dialog.id, 250, 610, false);
        ui.round(ctx, 330, 486, 200, 36, 18, N.color, '#3a2a6b', 3);
        ui.text(ctx, `${N.name} · ${N.role}`, 430, 505, { size: 17, color: '#fff' });
        ui.wrap(ctx, this.dialog.text, 340, 536, 740, { size: 21, lh: 30 });
        ui.text(ctx, 'Space/클릭 ▶', 1100, 630, { size: 15, align: 'right', color: '#7a6a99' });
        if (ui.hit({ x: 0, y: 0, w: 1280, h: 720 }) && this.dialog.t > 0.2) { I.consume(); this.dialog = null; }
      }
      ui.drawModal(ctx, 1 / 60);
    }
  };

  /* 환경 숲(4단계) — 숲지기와 특별 의뢰 */
  BPF.scenes.forest = {
    enter(p) { this.back = p.back || 'village'; BPF.audio.bgm('town'); },
    update() { if (I.key('Escape')) BPF.go(this.back, { from: 'forest' }); },
    draw(ctx) {
      ui.bg(ctx, '#bff0c0', '#5fbf7f');
      for (let i = 0; i < 9; i++) BPF.drawImg(ctx, i % 3 ? 'tree' : 'tree_pink', 20 + i * 140, 380 + (i % 2) * 40, 160, 200, { noFallback: true });
      ui.topBar(ctx, '환경 숲');
      ui.panel(ctx, 260, 110, 760, 300, { title: '숲지기 솔의 특별 의뢰', titleColor: '#2f9e6a' });
      drawNPC(ctx, 'eco', 340, 330, false);
      ui.wrap(ctx, '이 숲 옆 개울에 오염이 생겼어. 어떤 오염은 미생물과 식물이 정화할 수 있지만, 분해되지 않는 오염은 수거·세척 같은 방법이 필요해.\n\n생물 정화 대작전에서 B등급 이상을 받으면 연구소에 보고해 줘!', 420, 150, 560, { size: 19, lh: 28 });
      const pet = BPF.save.pet;
      if (pet) { BPF.drawPet(ctx, BPF.save.data.companionId, pet.stage, 900, 640, 150); ui.text(ctx, `${pet.name}: 숲 냄새가 좋아!`, 900, 660, { size: 16, color: '#fff', outline: '#2f6a4a' }); }
      if (ui.button(ctx, 420, 430, 260, 64, '환경 정화 도전! ▶', { color: '#47c46b', size: 22, focus: true })) BPF.go('play', { id: 'g09' });
      if (ui.button(ctx, 700, 430, 200, 64, '마을로', { color: '#8a7dff', size: 22 })) BPF.go(this.back, { from: 'forest' });
    }
  };
})();
