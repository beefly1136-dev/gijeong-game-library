/* 미니게임 공통 틀
   안내(게임 방법 1문장) → 시범(자동 플레이) → 연습(점수·보상 없음) → [연습 완료] → 실전 → 결과
   각 게임은 BPF.defineGame(id, def)로 등록한다.
   def.demo(g) : 시범 단계 목록 [{ x, y, say, act(g), wait }] (x, y는 숫자 또는 함수) */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  BPF.gameDefs = {};
  BPF.GAME_AREA = { x: 0, y: 72, w: 1012, h: 648 };
  BPF.SIDE = { x: 1020, y: 72, w: 252, h: 640 };
  BPF.defineGame = function (id, def) { BPF.gameDefs[id] = def; };
  const RES_NAME = { food: '먹이', research: '연구키트', decor: '장식' };
  const RES_ICON = { food: 'res_food', research: 'res_research', decor: 'res_decor' };
  BPF.RES_NAME = RES_NAME; BPF.RES_ICON = RES_ICON;

  BPF.scenes.play = {
    enter(p) {
      this.id = p.id; this.def = BPF.gameDefs[p.id]; this.meta = BPF_DATA.games.find(g => g.id === p.id);
      if (p.skipIntro) this.restart('real');
      else { this.restart('demo'); this.phase = 'intro'; }
      BPF.audio.bgm('game:' + p.id);
    },
    restart(mode) {
      ui.clearParticles();
      const g = this.g = {
        id: this.id, scene: this, meta: this.meta, mode, practice: mode !== 'real', time: 0, timeLeft: this.def.timeLimit || 0,
        points: 0, combo: 0, maxCombo: 0, mistakes: 0, actions: 0, good: 0,
        avatar: new BPF.PlayerAvatar().mount({ id: this.id }, BPF.save.player, BPF.save.data.selectedCostumeId, BPF.SIDE),
        shake: 0, flash: 0, over: false
      };
      g.addPoints = (n, x, y, color) => { g.points = Math.max(0, g.points + Math.round(n)); if (x != null) ui.floatText(x, y, (n >= 0 ? '+' : '') + Math.round(n), color || '#fff59d'); };
      g.success = (n, x, y) => {
        g.combo++; g.good++; g.maxCombo = Math.max(g.maxCombo, g.combo);
        if (n) g.addPoints(n, x, y);
        if (g.combo >= 3) { g.avatar.setState('combo', { combo: g.combo }); BPF.audio.sfx('combo'); }
        else { g.avatar.setState('success', { combo: g.combo }); BPF.audio.sfx('ok'); }
        if (x != null) ui.burst(x, y, '#ffd84d', 14, { star: true });
      };
      g.mistake = (x, y, msg) => {
        g.combo = 0; g.mistakes++; g.avatar.combo = 0;
        g.avatar.setState('mistake'); BPF.audio.sfx('bad'); g.shake = 0.3;
        if (x != null) { ui.floatText(x, y, msg || '앗!', '#ff8a8a'); ui.burst(x, y, '#8a8aff', 8); }
      };
      g.finish = (win, st, reason, extra) => {
        if (g.over) return; g.over = true;
        if (g.mode !== 'real') { // 연습·시범: 결과 없이 다시 연습
          this.practiceEnd = { win, reason: reason || '', t: 0 };
          g.avatar.setState(win ? 'win' : 'lose');
          BPF.audio.sfx(win ? 'mg_win' : 'mg_lose');
          return;
        }
        st = st || {};
        const achieve = BPF.clamp(st.achieve != null ? st.achieve : (win ? 1 : 0), 0, 1);
        const accuracy = BPF.clamp(st.accuracy != null ? st.accuracy : (g.actions ? g.good / g.actions : 1), 0, 1);
        const bonus = BPF.clamp(st.bonus != null ? st.bonus : 0, 0, 1);
        let score = BPF.progress.normScore(achieve, accuracy, bonus);
        if (!win) score = Math.min(score, 5999);
        let grade = BPF.progress.gradeOf(score);
        if (win && grade === 'D') grade = 'C';
        this.result = { gameId: this.id, win, points: g.points, score, grade, achieve, accuracy, bonus, maxCombo: g.maxCombo, reason: reason || '', resultId: BPF.uid(), extra: extra || null };
        this.phase = 'ending'; this.endT = 0;
        g.avatar.setState(win ? 'win' : 'lose');
        BPF.audio.sfx(win ? 'mg_win' : 'mg_lose');
        if (win) for (let i = 0; i < 5; i++) ui.burst(BPF.rand(100, 900), BPF.rand(150, 500), BPF.pick(['#ffd84d', '#ff8fd0', '#7be0ff', '#9dff8a']), 16, { star: true });
      };
      this.countT = 0; this.endT = 0; this.result = null; this.practiceEnd = null;
      this.phase = mode === 'real' ? 'count' : mode;
      try { this.def.init(g); } catch (e) { console.error(e); BPF.toast('게임 준비 오류: ' + e.message, '#b03040'); }
      if (mode === 'demo') this.setupDemo();
    },
    setupDemo() {
      const g = this.g;
      try { if (this.def.demoSetup) this.def.demoSetup(g); } catch (e) { console.error(e); }
      this.steps = this.def.demo ? this.def.demo(g) : [];
      this.si = -1; this.stepT = 0; this.ptr = { x: 506, y: 400, fx: 506, fy: 400, tx: 506, ty: 400, tap: 0 };
      this.demoSay = '잘 보세요! 시범을 보여 줄게요.';
      this.nextStep();
    },
    nextStep() {
      this.si++; this.stepT = 0;
      const s = this.steps[this.si];
      if (!s) { this.demoDone = 0.01; return; }
      const val = v => typeof v === 'function' ? v(this.g) : v;
      this.ptr.fx = this.ptr.x; this.ptr.fy = this.ptr.y;
      this.ptr.tx = s.x != null ? val(s.x) : this.ptr.x; this.ptr.ty = s.y != null ? val(s.y) : this.ptr.y;
      if (s.say) this.demoSay = s.say;
      this.stepDone = false;
    },
    startPractice() {
      this.restart('practice');
      BPF.toast('이제 직접 연습해 보세요! 점수와 보상은 없어요.', '#2e8a3a');
    },
    startReal() { this.restart('real'); BPF.audio.sfx('ok'); },
    exit() { this.g && this.g.avatar.unmount(); ui.clearParticles(); },
    /* 플레이 로직 한 프레임 (시범·연습·실전 공통) */
    step(dt, live) {
      const g = this.g;
      g.time += dt;
      if (this.def.timeLimit && g.mode === 'real') {
        const before = g.timeLeft;
        g.timeLeft = Math.max(0, g.timeLeft - dt);
        if (before > 10 && g.timeLeft <= 10) BPF.toast('남은 시간 10초!', '#c2185b');
        if (g.timeLeft <= 10 && Math.floor(before) !== Math.floor(g.timeLeft)) BPF.audio.sfx('tick');
        if (g.timeLeft <= 0) { this.def.onTimeUp ? this.def.onTimeUp(g) : g.finish(false, null, '시간 종료'); }
      }
      g.shake = Math.max(0, g.shake - dt); g.flash = Math.max(0, g.flash - dt);
      if (!g.over) {
        if (!live) { const sv = I.pressed; I.pressed = {}; const dn = I.down; I.down = {}; try { this.def.update(g, dt); } finally { I.pressed = sv; I.down = dn; } }
        else this.def.update(g, dt);
      }
      g.avatar.update(dt);
    },
    update(dt) {
      const g = this.g;
      if (ui.modal) return;
      switch (this.phase) {
        case 'intro':
          if (I.confirm()) { this.afterIntro(); BPF.audio.sfx('click'); }
          if (I.key('Escape')) BPF.go('gamecenter');
          return;
        case 'info':
          if (I.confirm() || I.key('Enter')) { this.restart('demo'); BPF.audio.sfx('click'); }
          if (I.key('Escape')) BPF.go('gamecenter');
          return;
        case 'demo': {
          if (I.key('Escape') || I.key('Enter')) { this.startPractice(); return; }
          this.step(dt, false);
          if (this.practiceEnd) { this.practiceEnd.t += dt; }
          if (this.demoDone) { this.demoDone += dt; if (this.demoDone > 1.6) this.startPractice(); return; }
          const s = this.steps[this.si]; if (!s) return;
          this.stepT += dt;
          const move = 0.55, k = BPF.ease(Math.min(1, this.stepT / move));
          this.ptr.x = BPF.lerp(this.ptr.fx, this.ptr.tx, k); this.ptr.y = BPF.lerp(this.ptr.fy, this.ptr.ty, k);
          if (!this.stepDone && this.stepT >= move) {
            this.stepDone = true; this.ptr.tap = 0.25;
            try { s.act && s.act(g); } catch (e) { console.error(e); }
          }
          this.ptr.tap = Math.max(0, this.ptr.tap - dt);
          if (this.stepDone && this.stepT >= move + (s.wait != null ? s.wait : 0.8)) this.nextStep();
          return;
        }
        case 'practice':
          if (I.key('Escape') || I.key('KeyP')) { this.phase = 'paused'; this.pausedFrom = 'practice'; return; }
          if (I.key('Enter') || I.key('NumpadEnter')) { this.startReal(); return; }
          if (this.practiceEnd) { this.practiceEnd.t += dt; g.avatar.update(dt); if (this.practiceEnd.t > 2.2) { this.restart('practice'); } return; }
          this.step(dt, true);
          return;
        case 'count':
          this.countT += dt; g.avatar.update(dt);
          if (this.countT >= 1.6) { this.phase = 'play'; g.avatar.setState('thinking'); }
          return;
        case 'paused':
          if (I.key('Escape')) this.phase = this.pausedFrom || 'play';
          return;
        case 'ending':
          this.endT += dt; g.avatar.update(dt);
          if (this.endT > 1.8) BPF.go('result', this.result);
          return;
        case 'play':
          if (I.key('Escape') || I.key('KeyP')) { this.phase = 'paused'; this.pausedFrom = 'play'; return; }
          this.step(dt, true);
      }
    },
    draw(ctx) {
      const g = this.g, def = this.def;
      ui.bg(ctx, def.bg ? def.bg[0] : '#8fd3ff', def.bg ? def.bg[1] : '#c9b8ff', def.bgKey);
      ctx.save();
      if (g.shake > 0 && !BPF.save.data.settings.reduceMotion) ctx.translate(BPF.rand(-5, 5) * g.shake * 3, BPF.rand(-5, 5) * g.shake * 3);
      // 플레이 중(연습·실전)이 아닐 때는 게임판이 마우스 입력을 받지 않게
      const live = (this.phase === 'play' || this.phase === 'practice') && !g.over && !this.practiceEnd;
      const saved = live ? null : { c: I.clicked, p: I.pressedMouse, r: I.released, m: ui.modal };
      if (!live) { I.clicked = false; I.pressedMouse = false; I.released = false; ui.modal = ui.modal || { dummy: true }; }
      try { def.draw(g, ctx); } catch (e) { console.error(e); }
      if (saved) { I.clicked = saved.c; I.pressedMouse = saved.p; I.released = saved.r; ui.modal = saved.m; }
      ctx.restore();
      ui.drawParticles(ctx, 1 / 60);
      this.drawHUD(ctx);
      g.avatar.draw(ctx);
      if (g.flash > 0) { ctx.save(); ctx.globalAlpha = g.flash; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, BPF.W, BPF.H); ctx.restore(); }
      if (this.phase === 'demo') this.drawDemo(ctx);
      if (this.phase === 'practice') this.drawPracticeBar(ctx);
      if (BPF.isTouch && def.touchKeys && (this.phase === 'play' || this.phase === 'practice') && !g.over) this.drawTouchKeys(ctx, def.touchKeys);
      if (this.practiceEnd && (this.phase === 'practice' || this.phase === 'demo')) {
        const pe = this.practiceEnd;
        ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = '#1b1636'; ctx.fillRect(0, 72, 1012, 648); ctx.restore();
        ui.text(ctx, pe.win ? '연습 성공! 잘했어요' : `연습 종료${pe.reason ? ' — ' + pe.reason : ''}`, 506, 360, { size: 40, color: '#ffe14d', outline: '#3a2a6b', ow: 8 });
        ui.text(ctx, '잠시 뒤 다시 연습할 수 있어요. 준비되면 [연습 완료 → 실전]!', 506, 410, { size: 20, color: '#fff', outline: '#3a2a6b' });
      }
      if (this.phase === 'intro') this.drawIntro(ctx);
      else if (this.phase === 'info') this.drawInfo(ctx);
      else if (this.phase === 'count') {
        const n = 3 - Math.floor(this.countT / 0.5);
        const s = 1 + (this.countT % 0.5) * 1.2;
        ctx.save(); ctx.fillStyle = 'rgba(20,12,45,.35)'; ctx.fillRect(0, 72, 1012, 648); ctx.restore();
        ui.text(ctx, '실전!', 506, 250, { size: 40, color: '#ffe14d', outline: '#c2185b', ow: 8 });
        ui.text(ctx, n > 0 ? String(n) : '시작!', 506, 380, { size: 110 * (n > 0 ? s * 0.8 : 1), color: '#fff', outline: '#7b5cff', ow: 12 });
      } else if (this.phase === 'paused') this.drawPause(ctx);
      else if (this.phase === 'ending') {
        const r = this.result;
        ctx.save(); ctx.globalAlpha = Math.min(0.5, this.endT); ctx.fillStyle = '#1b1636'; ctx.fillRect(0, 72, 1012, 648); ctx.restore();
        const s = BPF.ease(Math.min(1, this.endT * 3));
        ui.text(ctx, r.win ? '연구 성공!' : (r.reason || '아쉬워요!'), 506, 360, { size: 72 * s, color: r.win ? '#ffd84d' : '#d8d8ff', outline: r.win ? '#c2185b' : '#3a2a6b', ow: 12 });
      }
      ui.drawModal(ctx, 1 / 60);
    },
    drawHUD(ctx) {
      const g = this.g, def = this.def, meta = this.meta;
      ui.round(ctx, 8, 8, 1004, 56, 18, 'rgba(255,250,240,.95)', '#3a2a6b', 4);
      ui.round(ctx, 16, 16, 44, 40, 12, meta.color, '#3a2a6b', 3);
      ui.text(ctx, meta.no, 38, 37, { size: 20, color: '#fff', outline: '#3a2a6b' });
      ui.text(ctx, meta.title, 70, 37, { size: 21, align: 'left', color: '#3a2a6b' });
      const goal = def.hud ? def.hud(g) : '';
      ui.text(ctx, goal, 300, 37, { size: 17, align: 'left', color: '#7b3fd6' });
      ui.text(ctx, g.mode === 'real' ? `${g.points.toLocaleString()}점` : (g.mode === 'demo' ? '시범' : '연습'), 742, 37, { size: 22, align: 'right', color: g.mode === 'real' ? '#c2185b' : '#2e8a3a' });
      if (this.phase === 'practice') {
        if (ui.button(ctx, 752, 14, 178, 44, '연습 완료 → 실전!', { color: '#ff5fa0', size: 16, focus: true })) this.startReal();
      } else if (this.phase === 'demo') {
        if (ui.button(ctx, 752, 14, 178, 44, '시범 건너뛰기 ▶', { color: '#ff9a4d', size: 16 })) this.startPractice();
      } else if (def.timeLimit) {
        ui.gauge(ctx, 756, 22, 170, 30, g.timeLeft, def.timeLimit, g.timeLeft <= 10 ? '#ff5d5d' : '#3fc1ff', `⏱ ${Math.ceil(g.timeLeft)}초`);
      } else if (def.hudRight) ui.text(ctx, def.hudRight(g), 840, 37, { size: 18, color: '#3a2a6b' });
      if ((this.phase === 'play' || this.phase === 'practice') && ui.button(ctx, 936, 14, 68, 44, '', { icon: 'btn_pause', color: '#ffb648', r: 14 })) { this.pausedFrom = this.phase; this.phase = 'paused'; }
    },
    drawIntro(ctx) {
      const meta = this.meta;
      ctx.save(); ctx.fillStyle = 'rgba(20,12,45,.6)'; ctx.fillRect(0, 0, BPF.W, BPF.H); ctx.restore();
      const x = 90, y = 120, w = 840, h = 520;
      ui.panel(ctx, x, y, w, h, { title: `${meta.no}  ${meta.title}`, titleColor: meta.color });
      BPF.drawImg(ctx, meta.icon, x + 34, y + 44, 130, 130, { noFallback: true });
      ui.text(ctx, '🎯 게임 방법', x + 190, y + 60, { size: 20, align: 'left', color: '#7b5cff' });
      ui.wrap(ctx, meta.how, x + 190, y + 84, w - 230, { size: 25, lh: 36, weight: 'bold' });
      const rows = [['🎮 조작', meta.keys], ['🏆 목표', meta.goal], ['📖 교과서', meta.page]];
      let yy = y + 200;
      rows.forEach(r => {
        ui.round(ctx, x + 34, yy, w - 68, 44, 14, '#f3edff', '#c9b8ff', 2);
        ui.text(ctx, r[0], x + 54, yy + 23, { size: 18, align: 'left', color: '#3a2a6b' });
        ui.text(ctx, r[1], x + 170, yy + 23, { size: 18, align: 'left', weight: 'normal' });
        yy += 52;
      });
      const rw = Object.keys(meta.reward)[0];
      ui.round(ctx, x + 34, yy + 4, w - 68, 48, 14, '#fff3c4', '#ffb648', 2);
      BPF.drawImg(ctx, RES_ICON[rw], x + 44, yy + 8, 40, 40, { noFallback: true });
      ui.text(ctx, `클리어 보상: 동물 육성 재료 「${RES_NAME[rw]}」 ${meta.reward[rw]}개 (A등급 이상 +1)`, x + 94, yy + 29, { size: 18, align: 'left', color: '#7a4a00' });
      const best = BPF.save.data.best[this.id];
      if (best.score) ui.text(ctx, `개인 최고: ${best.grade}등급 · ${best.points.toLocaleString()}점`, x + w - 40, y + 40, { size: 16, align: 'right', color: '#c2185b' });
      if (ui.button(ctx, x + w / 2 - 250, y + h - 82, 280, 62, '시범 보고 연습하기 ▶', { color: '#47c46b', focus: true, size: 22 })) { this.afterIntro(); }
      if (ui.button(ctx, x + w / 2 + 50, y + h - 82, 200, 62, '게임 선택', { color: '#8a7dff', size: 21 })) BPF.go('gamecenter');
    },
    // 게임 방법 다음, 시범 전에 보여 줄 큰 설명 카드(def.infoCard)가 있으면 먼저 보여 준다
    afterIntro() { if (this.def.infoCard) this.phase = 'info'; else this.restart('demo'); },
    drawInfo(ctx) {
      const C = this.def.infoCard;
      ctx.save(); ctx.fillStyle = 'rgba(20,12,45,.62)'; ctx.fillRect(0, 0, BPF.W, BPF.H); ctx.restore();
      const x = 50, y = 84, w = 920, h = 624;
      ui.panel(ctx, x, y, w, h, { title: C.title, titleColor: this.meta.color });
      if (C.sub) ui.text(ctx, C.sub, x + w / 2, y + 40, { size: 18, color: '#5a4a8b' });
      const cw = (w - 60) / 2, ch = 222;
      C.items.forEach((it, i) => {
        const cx = x + 20 + (i % 2) * (cw + 20), cy = y + 62 + Math.floor(i / 2) * (ch + 14);
        ui.round(ctx, cx, cy, cw, ch, 18, ui.lighten(it.color, 0.85), it.color, 4);
        BPF.drawImg(ctx, it.img, cx + 12, cy + 30, 130, 130, { noFallback: true });
        if (it.img2) BPF.drawImg(ctx, it.img2, cx + 12, cy + 150, 130, 64, { noFallback: true });
        ui.round(ctx, cx + 156, cy + 14, 120, 40, 14, it.color, '#3a2a6b', 3);
        ui.text(ctx, it.name, cx + 216, cy + 34, { size: 22, color: '#fff', outline: '#3a2a6b' });
        if (it.tag) ui.text(ctx, it.tag, cx + 290, cy + 34, { size: 15, align: 'left', color: '#5a4a8b' });
        ui.fitWrap(ctx, it.desc, cx + 156, cy + 66, cw - 172, 146, { size: 18, lh: 27, weight: 'bold', color: '#2d2350' });
      });
      if (ui.button(ctx, x + w / 2 - 150, y + h - 72, 300, 58, '알겠어요! 시범 보기 ▶', { color: '#47c46b', focus: true, size: 22 })) this.restart('demo');
    },
    drawDemo(ctx) {
      // 시범 설명은 내 캐릭터가 말풍선으로 해 준다
      this.g.avatar.line = '🎬 시범: ' + this.demoSay;
      ui.round(ctx, 14, 680, 150, 32, 14, 'rgba(58,42,107,.9)', '#ffe14d', 2);
      ui.text(ctx, '🎬 시범 중', 89, 697, { size: 16, color: '#fff' });
      // 손가락 포인터
      const p = this.ptr; if (!p) return;
      const tap = p.tap > 0 ? 1 - p.tap / 0.25 : 0;
      if (p.tap > 0) { ctx.save(); ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 5; ctx.globalAlpha = 1 - tap; ctx.beginPath(); ctx.arc(p.x, p.y, 14 + tap * 30, 0, 7); ctx.stroke(); ctx.restore(); }
      const fim = BPF.assets.get('demo_finger');
      if (fim) { const fw = 78, fh = fw * fim.height / fim.width; ctx.drawImage(fim, p.x - fw * 0.08, p.y - fh * 0.05 + (p.tap > 0 ? 4 : 0), fw, fh); return; }
      ctx.save(); ctx.translate(p.x, p.y + (p.tap > 0 ? 4 : 0));
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3a2a6b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, 34); ctx.lineTo(18, 26); ctx.lineTo(30, 44); ctx.lineTo(38, 38); ctx.lineTo(26, 20); ctx.lineTo(38, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    },
    /* 모바일 터치 버튼 (키보드가 필요한 게임용) — 오른쪽 캐릭터 칸 아래에 표시 */
    drawTouchKeys(ctx, keys) {
      keys.forEach(k => {
        const on = I.held(k.code);
        ctx.save(); ctx.globalAlpha = 0.9;
        ui.round(ctx, k.x, k.y + (on ? 3 : 0), k.w, k.h, 18, on ? '#ffd84d' : 'rgba(255,255,255,.92)', '#3a2a6b', 4);
        ui.text(ctx, k.label, k.x + k.w / 2, k.y + k.h / 2 + (on ? 3 : 0), { size: k.size || 30, color: '#3a2a6b' });
        ctx.restore();
        I.vkeys.push({ x: k.x, y: k.y, w: k.w, h: k.h, code: k.code });
      });
    },
    drawPracticeBar(ctx) {
      ui.round(ctx, 14, 680, 210, 32, 14, 'rgba(46,138,58,.92)', '#fff', 2);
      ui.text(ctx, '✏ 연습 중 (점수·보상 없음)', 119, 697, { size: 15, color: '#fff' });
    },
    drawPause(ctx) {
      ctx.save(); ctx.fillStyle = 'rgba(20,12,45,.6)'; ctx.fillRect(0, 0, BPF.W, BPF.H); ctx.restore();
      const x = 330, y = 170, w = 360, h = 420, pr = this.pausedFrom === 'practice';
      ui.panel(ctx, x, y, w, h, { title: '일시정지' });
      if (ui.button(ctx, x + 50, y + 50, w - 100, 64, '계속하기', { color: '#47c46b', focus: true, size: 24 }) || I.confirm()) this.phase = this.pausedFrom || 'play';
      if (ui.button(ctx, x + 50, y + 135, w - 100, 64, pr ? '연습 처음부터' : '다시 시작', { color: '#ffb648', size: 24 })) this.restart(pr ? 'practice' : 'real');
      if (pr) { if (ui.button(ctx, x + 50, y + 220, w - 100, 64, '시범 다시 보기', { color: '#3fb6d6', size: 24 })) this.restart('demo'); }
      else if (ui.button(ctx, x + 50, y + 220, w - 100, 64, '마을로', { color: '#3fb6d6', size: 24 })) BPF.go('village');
      if (ui.button(ctx, x + 50, y + 305, w - 100, 64, '게임 선택', { color: '#8a7dff', size: 24 })) BPF.go('gamecenter');
    }
  };

  BPF.boardFrame = function (ctx, x, y, w, h, fill) {
    ui.round(ctx, x - 8, y - 8, w + 16, h + 16, 20, fill || 'rgba(40,28,90,.85)', '#3a2a6b', 5);
    ui.round(ctx, x - 8, y - 8, w + 16, h + 16, 20, null, 'rgba(255,255,255,.35)', 2);
  };
})();
