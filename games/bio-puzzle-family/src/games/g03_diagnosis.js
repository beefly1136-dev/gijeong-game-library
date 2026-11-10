/* 03 질병 진단 센터 — 교과서 218쪽 「질병 진단 기술」: X선 · CT · MRI · PCR 중 알맞은 진단 기술 고르기 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  const TOOLS = [
    { id: 'xray', name: 'X선', emoji: '🦴', color: '#3f8cff', desc: '뼈처럼 단단한 조직을 평면 흑백 사진으로' },
    { id: 'ct', name: 'CT', emoji: '🌀', color: '#7b5cff', desc: '여러 방향 X선을 컴퓨터로 조합한 가로 단면' },
    { id: 'mri', name: 'MRI', emoji: '🧲', color: '#ff7a7a', desc: '자기장·라디오파로 뇌·척추·관절 같은 연한 조직' },
    { id: 'pcr', name: 'PCR', emoji: '🧬', color: '#47c46b', desc: '검체의 DNA를 증폭·분석해 감염병 확인' }
  ];
  const CASES = [
    { t: '넘어져서 팔뼈가 부러진 것 같아요.', a: 'xray' }, { t: '축구를 하다가 발목뼈를 다쳤어요.', a: 'xray' }, { t: '손가락뼈에 금이 갔는지 사진으로 보고 싶어요.', a: 'xray' },
    { t: '교통사고로 몸속 장기를 가로 단면으로 빠르게 봐야 해요.', a: 'ct' }, { t: '머리를 부딪쳐 뇌 속 출혈을 단면 영상으로 확인해요.', a: 'ct' }, { t: '배 속 장기를 여러 방향 X선으로 조합해 보고 싶어요.', a: 'ct' },
    { t: '허리(척추) 디스크가 의심돼요.', a: 'mri' }, { t: '무릎 관절의 연골이 다친 것 같아요.', a: 'mri' }, { t: 'CT로 확인하기 어려운 신경계 질환이 의심돼요.', a: 'mri' },
    { t: '열이 나고 기침해요. 감염병인지 확인해요.', a: 'pcr' }, { t: '코와 목에서 검체를 채취해 바이러스를 찾아요.', a: 'pcr' }, { t: '아주 적은 양의 바이러스 DNA를 증폭해서 확인해요.', a: 'pcr' }
  ];
  const PCOL = ['#ffd6c4', '#f0c8a8', '#ffe0c4', '#e8b896'];
  const HAIR = ['#3a2a1a', '#7a4a2a', '#202040', '#c08040', '#5a3a6b'];

  // 환자 그림: 1 팔걸이 · 2 발목 · 3 열·기침 · 4 허리 · 5 무릎 · 6 머리 붕대
  const PIMG = { xray: [1, 2], ct: [6], mri: [4, 5], pcr: [3] };
  function drawPatient(ctx, x, y, s, k, mood, c) {
    if (c) {
      const arr = PIMG[c.a], key = 'dg_patient_' + arr[k % arr.length];
      if (BPF.drawImg(ctx, key, x - 62, y - 66, 124, 120, { noFallback: true })) {
        if (mood === 'happy') BPF.drawImg(ctx, 'fx_heart', x + 30, y - 70, 34, 34, { noFallback: true });
        return;
      }
    }
    ctx.save(); ctx.translate(x, y);
    ui.round(ctx, -34 * s, 6 * s, 68 * s, 44 * s, 14, '#9fd0ff', '#3a2a6b', 3);
    ctx.beginPath(); ctx.arc(0, -16 * s, 26 * s, 0, 7); ctx.fillStyle = PCOL[k % 4]; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#3a2a6b'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -22 * s, 27 * s, Math.PI * 1.05, Math.PI * 1.95); ctx.fillStyle = HAIR[k % 5]; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a2a6b'; ctx.beginPath(); ctx.arc(-9 * s, -14 * s, 3.2 * s, 0, 7); ctx.arc(9 * s, -14 * s, 3.2 * s, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3a2a6b'; ctx.lineWidth = 2.5; ctx.beginPath();
    if (mood === 'happy') ctx.arc(0, -6 * s, 7 * s, 0.2, Math.PI - 0.2); else ctx.arc(0, 2 * s, 7 * s, Math.PI + 0.3, -0.3);
    ctx.stroke();
    if (mood !== 'happy') { ctx.fillStyle = '#7ad0ff'; ctx.beginPath(); ctx.ellipse(18 * s, -22 * s, 4 * s, 6 * s, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  BPF.defineGame('g03', {
    // 시작 전 큰 팝업: 진단 기기 4가지 설명 (교과서 214쪽)
    infoCard: {
      title: '진단 기기 알아보기', sub: '증상에 맞는 기기를 고르려면 먼저 4가지 기기를 알아 둬요!',
      items: [
        { name: 'X선', tag: '뼈 사진', img: 'dg_tool_xray', color: '#3f8cff', desc: '몸을 통과하는 X선으로 뼈처럼 단단한 부분을 흑백 사진으로 찍어요. 뼈가 부러졌는지 볼 때 써요.' },
        { name: 'CT', tag: '단면 사진', img: 'dg_tool_ct', color: '#7b5cff', desc: '여러 방향에서 찍은 X선을 컴퓨터로 합쳐 몸을 가로로 자른 모습(단면)을 보여 줘요. 머리 다침·몸속 출혈 확인에 좋아요.' },
        { name: 'MRI', tag: '연한 조직', img: 'dg_tool_mri', color: '#ff7a7a', desc: '강한 자기장과 라디오파로 뇌·척추·관절 같은 연한 조직을 자세히 보여 줘요. 허리 디스크·인대 확인에 써요.' },
        { name: 'PCR', tag: '유전자 검사', img: 'dg_tool_pcr', color: '#47c46b', desc: '검체 속 DNA를 아주 많이 늘려서(증폭) 병원체의 유전자가 있는지 확인해요. 감염병 진단에 써요.' }
      ]
    },
    timeLimit: 90, bg: ['#d8f5ff', '#e0f0e8'], bgKey: 'bg_bench',
    init(g) {
      g.beds = []; g.sel = 0; g.right = 0; g.goal = 12; g.late = 0; g.wrong = 0; g.deck = [];
      this.setCount(g, 3);
    },
    nextCase(g) { if (!g.deck.length) g.deck = BPF.shuffle(CASES); return g.deck.pop(); },
    setCount(g, n) { while (g.beds.length < n) g.beds.push({ state: 'empty', t: 0.6 + g.beds.length * 0.7, k: g.beds.length }); },
    bedPos(g, i) { const n = g.beds.length, gap = Math.min(196, 970 / n); return { x: 506 - (n - 1) * gap / 2 + i * gap, y: 290, w: gap - 14 }; },
    hud(g) { return `정확한 진단 ${g.right}/${g.goal} · 오진 ${g.wrong}/5 · 지연 ${g.late}/3`; },
    patience(g) { return Math.max(6.5, 11 - g.time * 0.05); },
    update(g, dt) {
      if (g.time > 25 && g.beds.length < 4) { this.setCount(g, 4); BPF.toast('환자가 늘었어요!'); }
      if (g.time > 55 && g.beds.length < 5) { this.setCount(g, 5); BPF.toast('진료실 5곳! 빠르게!'); }
      g.beds.forEach((b, i) => {
        b.t -= dt; b.anim = Math.max(0, (b.anim || 0) - dt);
        if (b.state === 'empty' && b.t <= 0) { b.state = 'wait'; b.c = this.nextCase(g); b.max = this.patience(g); b.t = b.max; b.k = BPF.randi(0, 9); }
        else if (b.state === 'wait' && b.t <= 0) {
          if (g.mode === 'real') {
            g.late++; const p = this.bedPos(g, i); g.mistake(p.x, p.y - 80, '진단 지연!');
            if (g.late >= 3) { g.finish(false, { achieve: g.right / g.goal, accuracy: this.acc(g) }, '진단 지연 3회…'); return; }
            b.state = 'empty'; b.t = 1.2;
          } else b.t = b.max; // 연습에서는 기다려 줌
        } else if (b.state === 'done' && b.t <= 0) { b.state = 'empty'; b.t = BPF.rand(0.6, 1.6); }
      });
      if (I.any('ArrowLeft', 'KeyA')) { g.sel = (g.sel + g.beds.length - 1) % g.beds.length; BPF.audio.sfx('move'); }
      if (I.any('ArrowRight', 'KeyD')) { g.sel = (g.sel + 1) % g.beds.length; BPF.audio.sfx('move'); }
      for (let k = 0; k < 4; k++) if (I.key('Digit' + (k + 1)) || I.key('Numpad' + (k + 1))) this.diagnose(g, k);
    },
    acc(g) { return g.actions ? g.good / g.actions : 0; },
    diagnose(g, k) {
      const b = g.beds[g.sel], T = TOOLS[k], p = this.bedPos(g, g.sel);
      if (!b || b.state !== 'wait') { BPF.toast('진단할 환자를 먼저 골라요.'); return; }
      g.actions++; g.avatar.setState('acting');
      if (b.c.a === T.id) {
        const quick = Math.round(Math.max(0, b.t) / b.max * 50);
        g.right++; b.state = 'done'; b.t = 0.9; b.anim = 0.9; b.used = T.id;
        g.success(100 + quick, p.x, p.y - 60);
        g.msg = `✅ ${T.name}: ${T.desc}`;
        if (g.right >= g.goal) g.finish(true, { achieve: 1, accuracy: this.acc(g), bonus: (g.late === 0 ? 0.6 : 0.2) + 0.4 * g.timeLeft / 60 });
      } else {
        const R = TOOLS.find(t => t.id === b.c.a);
        g.mistake(p.x, p.y - 80, `${T.name}은(는) 알맞지 않아요`);
        g.msg = `❌ 이 환자에겐 ${R.name}! (${R.desc})`;
        g.wrong++;
        if (g.wrong >= 5) g.finish(false, { achieve: g.right / g.goal, accuracy: this.acc(g) }, '오진 5회…');
      }
    },
    demoSetup(g) {
      g.beds.forEach((b, i) => { b.state = 'wait'; b.c = [CASES[0], CASES[9], CASES[6]][i]; b.max = 99; b.t = 99; b.k = i; });
    },
    demo(g) {
      const tb = k => ({ x: 34 + k * 244 + 112, y: 590 });
      return [
        { x: () => this.bedPos(g, 0).x, y: 250, say: '환자 카드의 상황을 읽어요. 팔뼈가 부러졌대요!', act: () => { g.sel = 0; }, wait: 1.2 },
        { x: tb(0).x, y: tb(0).y, say: '뼈처럼 단단한 조직은 X선으로 찍어요.', act: () => this.diagnose(g, 0), wait: 1.2 },
        { x: () => this.bedPos(g, 1).x, y: 250, say: '열이 나고 기침하는 환자예요.', act: () => { g.sel = 1; }, wait: 1.0 },
        { x: tb(3).x, y: tb(3).y, say: '감염병은 PCR로 DNA를 증폭해 확인해요.', act: () => this.diagnose(g, 3), wait: 1.2 },
        { x: () => this.bedPos(g, 2).x, y: 250, say: '척추 디스크처럼 연한 조직은…', act: () => { g.sel = 2; }, wait: 0.9 },
        { x: tb(2).x, y: tb(2).y, say: 'MRI로 정밀하게! 시간이 다 되기 전에 진단해요.', act: () => this.diagnose(g, 2), wait: 1.4 }
      ];
    },
    onTimeUp(g) { g.finish(false, { achieve: g.right / g.goal, accuracy: this.acc(g) }, '시간 종료!'); },
    draw(g, ctx) {
      ui.round(ctx, 16, 130, 980, 330, 26, 'rgba(255,255,255,.8)', '#3a2a6b', 4);
      ui.text(ctx, '🏥 진료실 — 환자를 고르고(←→ 또는 클릭) 아래에서 진단 기술을 눌러요', 506, 150, { size: 17, color: '#2f6a8a' });
      g.beds.forEach((b, i) => {
        const p = this.bedPos(g, i), sel = g.sel === i;
        const r = { x: p.x - p.w / 2, y: 168, w: p.w, h: 282 };
        ui.round(ctx, r.x, r.y, r.w, r.h, 18, sel ? '#fff3c4' : '#ffffff', sel ? '#ff9a00' : '#c9b8ff', sel ? 5 : 2);
        if (b.state === 'empty') { ui.text(ctx, '다음 환자 대기 중', p.x, 310, { size: 15, color: '#9a90b0' }); }
        else {
          const bob = b.anim > 0 ? -Math.abs(Math.sin(b.anim * 12)) * 10 : 0;
          if (b.state === 'done') BPF.drawImg(ctx, 'dg_result_' + b.used, p.x - 64, 176 + bob, 128, 110, { noFallback: true });
          else drawPatient(ctx, p.x, 236 + bob, 1, b.k, 'sick', b.c);
          if (b.state === 'done') {
            const T = TOOLS.find(t => t.id === b.used);
            ui.text(ctx, `${T.emoji} ${T.name} 진단 완료!`, p.x, 330, { size: 17, color: '#2e8a3a' });
          } else {
            ui.round(ctx, r.x + 8, 292, r.w - 16, 120, 12, '#f3f8ff', '#9fc0e0', 2);
            ui.wrap(ctx, b.c.t, p.x, 300, r.w - 30, { size: 15, align: 'center', weight: 'bold', lh: 21 });
            ui.gauge(ctx, r.x + 12, 420, r.w - 24, 18, b.t, b.max, b.t / b.max < 0.3 ? '#ff5d5d' : '#47c46b');
          }
        }
        if (sel) ui.text(ctx, '▼', p.x, 162 + Math.sin(BPF.time * 8) * 4, { size: 24, color: '#ff7a00', outline: '#fff' });
        if (ui.hit(r)) { I.consume(); g.sel = i; BPF.audio.sfx('move'); }
      });
      // 진단 기술 버튼
      ui.round(ctx, 16, 478, 980, 234, 20, 'rgba(255,250,240,.95)', '#3a2a6b', 4);
      ui.text(ctx, `▶ ${g.sel + 1}번 환자 진단하기 (숫자 1~4)`, 36, 500, { size: 17, align: 'left', color: '#3a2a6b' });
      TOOLS.forEach((T, k) => {
        const x = 34 + k * 244;
        if (ui.button(ctx, x, 518, 224, 84, `${k + 1}. ${T.name}`, { color: T.color, size: 26, icon: 'dg_tool_' + T.id, isz: 66 })) this.diagnose(g, k);
        ui.wrap(ctx, T.desc, x + 112, 612, 216, { size: 14, align: 'center', color: '#5a4a8b', lh: 19 });
      });
      if (g.msg) { ui.round(ctx, 34, 660, 950, 42, 12, '#fffaf0', '#c9b8ff', 2); ui.text(ctx, g.msg, 50, 682, { size: 16, align: 'left', color: g.msg[0] === '❌' ? '#b03040' : '#2e6a2a' }); }
    }
  });
})();
