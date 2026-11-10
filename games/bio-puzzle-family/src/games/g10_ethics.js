/* 10 생명윤리 심판관 — 사례 카드의 관련 쟁점을 빠르게 분류 (찬반 정답 없음) */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  // 교과서 222~223쪽: 생명 경시·인간 존엄성 경시, 생명의 빈익빈 부익부, 유전자 변형 생물체의 안전성·생태계 교란 + 개인정보
  const ISSUES = [
    { id: 'life', name: '생명 존중', color: '#ff7a7a', desc: '생명의 가치·인간 존엄성을 해치지 않는가?' },
    { id: 'safe', name: '안전성', color: '#ffb648', desc: '사람의 건강에 위험은 없는가?' },
    { id: 'fair', name: '공정성', color: '#3fb6d6', desc: '혜택이 경제적 여건에 따라 불평등하지 않은가?' },
    { id: 'eco', name: '생태계', color: '#47c46b', desc: '자연과 생태계를 교란하지 않는가?' },
    { id: 'privacy', name: '개인정보·동의', color: '#7b5cff', desc: '유전 정보를 동의받고 보호하는가?' }
  ];
  const CASES = [
    { t: '유전자 편집 기술로 태어날 아기의 외모와 능력을 부모가 원하는 대로 골라 정하려 한다.', k: ['life', 'safe'], why: '사람을 골라 만드는 것은 생명 경시 우려가 있고, 예상하지 못한 위험도 있어요. 해결 방안 예: 유전적 질병 치료 목적으로만 허용.' },
    { t: '사람의 체세포를 이용해 똑같은 사람을 복제하는 연구를 하려 한다.', k: ['life'], why: '생명 복제는 생명의 가치와 인간 존엄성을 경시하는 풍조를 낳을 수 있어요. 해결 방안 예: 연구·치료 목적으로만 제한.' },
    { t: '수명을 늘려 주는 새 기술이 너무 비싸서 부유한 사람만 이용할 수 있다.', k: ['fair'], why: '생명 기술의 혜택이 경제적 여건에 따라 불평등하게 나뉘는 「빈익빈 부익부」 문제예요.' },
    { t: '유전자 변형 작물을 넓은 들판에 심었더니 주변 식물과 곤충에 영향을 줄까 걱정된다.', k: ['eco', 'safe'], why: '유전자 변형 생물체는 안전성 문제와 생태계 교란에 대한 우려가 있어요.' },
    { t: '새 의약품을 개발하기 위해 많은 동물을 실험에 사용하려 한다.', k: ['life'], why: '동물의 생명도 존중해야 해요. 해결 방안 예: 조직 배양이나 컴퓨터 모의실험으로 대체.' },
    { t: '유전자 검사 회사가 고객의 DNA 정보를 고객 동의 없이 다른 회사에 팔았다.', k: ['privacy'], why: '유전 정보는 매우 민감한 개인정보예요. 동의 없이 제공하면 안 돼요.' },
    { t: '감염병 백신이 일부 부유한 나라에만 먼저 공급되어 다른 나라 사람들은 접종을 못 한다.', k: ['fair'], why: '꼭 필요한 의료 혜택이 공정하게 나뉘는지가 쟁점이에요.' },
    { t: '부작용을 충분히 확인하지 않은 유전자 치료제를 환자에게 바로 쓰려 한다.', k: ['safe'], why: '사람의 건강을 지키기 위해 안전성 확인이 먼저예요.' },
    { t: '질병을 옮기는 모기를 줄이려고 유전자를 바꾼 모기를 야생에 풀려 한다.', k: ['eco', 'safe'], why: '야생 생태계에 퍼지는 영향과 예상하지 못한 위험을 신중히 평가해야 해요.' },
    { t: '학교가 학생들의 유전자 정보를 보호자 동의 없이 수집하려 한다.', k: ['privacy'], why: '민감한 유전 정보는 반드시 동의를 받고 철저히 보호해야 해요.' },
    { t: '실험에 쓴 유전자 변형 미생물을 아무 처리 없이 하수구에 버렸다.', k: ['safe', 'eco'], why: '안전 기준에 따른 처리 없이 버리면 사람과 생태계 모두에 위험할 수 있어요.' },
    { t: '실험실에서 만든 인공 생명체를 마음대로 사고팔 수 있게 하자는 주장이 나왔다.', k: ['life'], why: '생명을 물건처럼 다루면 생명의 가치를 가볍게 여기게 될 수 있어요.' }
  ];
  const PER = 13;

  BPF.defineGame('g10', {
    timeLimit: 120, bg: ['#fff3d6', '#e6d8ff'], bgKey: 'bg_lab2',
    init(g) {
      g.deck = BPF.shuffle(CASES).slice(0, 10); g.i = 0; g.pick = {}; g.right = 0; g.wrongN = 0; g.goal = 8;
      g.caseT = PER; g.reveal = 0; g.last = null; g.streak = 0; g.cur = 0;
    },
    demoSetup(g) { g.deck = [CASES[2], CASES[3]].concat(BPF.shuffle(CASES.slice(4)).slice(0, 8)); },
    demo(g) {
      const ib = k => ({ x: 30 + k * 196 + 90, y: 496 });
      return [
        { x: 500, y: 290, say: '사례를 읽어요: 비싼 기술을 부유한 사람만 쓸 수 있대요.', wait: 1.6 },
        { x: ib(2).x, y: ib(2).y, say: '혜택이 불평등한 문제 → 「공정성」!', act: () => { g.pick.fair = true; }, wait: 0.7 },
        { x: 505, y: 653, say: '판정 제출! 찬성·반대가 아니라 따져 볼 쟁점을 고르는 거예요.', act: () => this.submit(g), wait: 2.4 },
        { x: 200, y: 650, say: '제출하면 바로 다음 사례! 앞 사례의 해설은 왼쪽 아래에 나와요.', wait: 1.6 },
        { x: ib(3).x, y: ib(3).y, say: '쟁점이 여러 개일 수도 있어요: 생태계 + 안전성!', act: () => { g.pick.eco = true; }, wait: 0.5 },
        { x: ib(1).x, y: ib(1).y, act: () => { g.pick.safe = true; }, wait: 0.6 },
        { x: 505, y: 653, act: () => this.submit(g), wait: 2.0 }
      ];
    },
    hud(g) { return `정확 ${g.right}/${g.goal} · 오분류 ${g.wrongN}/4 · 사례 ${Math.min(g.i + 1, 10)}/10`; },
    submit(g, timeout) {
      if (g.reveal > 0) return;
      const c = g.deck[g.i];
      const chosen = ISSUES.filter(s => g.pick[s.id]).map(s => s.id);
      const ok = !timeout && chosen.length === c.k.length && c.k.every(k => chosen.includes(k));
      g.actions++;
      if (ok) { g.right++; g.streak++; g.success(100 + (g.streak >= 2 ? 30 * (g.streak - 1) : 0), 500, 300); }
      else { g.wrongN++; g.streak = 0; g.mistake(500, 300, timeout ? '시간 초과!' : '쟁점이 달라요'); }
      // 버튼 없이 바로 다음 사례로 — 결과·해설은 왼쪽 아래 상자에 잠시 남겨 둔다
      g.prev = { ok, c, chosen, timeout }; g.prevT = 6;
      this.next(g);
    },
    next(g) {
      g.i++; g.pick = {}; g.caseT = PER; g.last = null;
      if (g.right >= g.goal) { g.finish(true, { achieve: 1, accuracy: g.right / g.actions, bonus: 0.5 * g.timeLeft / 60 + 0.5 * Math.min(1, g.maxCombo / 6) }); return; }
      if (g.wrongN >= 4) { g.finish(false, { achieve: g.right / g.goal, accuracy: g.right / Math.max(1, g.actions) }, '오분류 4회…'); return; }
      if (g.i >= g.deck.length) { g.finish(g.right >= g.goal, { achieve: g.right / g.goal, accuracy: g.right / Math.max(1, g.actions) }, '사례를 모두 봤어요'); return; }
      g.avatar.setState('thinking');
    },
    update(g, dt) {
      if (g.prevT > 0) g.prevT -= dt;
      if (g.reveal > 0) {
        g.reveal -= dt;
        if (g.reveal <= 0 || (g.reveal < 2.2 && (I.key('Space') || I.key('Enter')))) { g.reveal = 0; this.next(g); }
        return;
      }
      if (g.mode === 'real') g.caseT -= dt;
      if (g.caseT <= 0) { this.submit(g, true); return; }
      for (let k = 0; k < 5; k++) if (I.key('Digit' + (k + 1)) || I.key('Numpad' + (k + 1))) { const id = ISSUES[k].id; g.pick[id] = !g.pick[id]; g.avatar.setState('acting'); BPF.audio.sfx('move'); }
      if (I.key('Space')) this.submit(g);
    },
    onTimeUp(g) { g.finish(g.right >= g.goal, { achieve: g.right / g.goal, accuracy: g.right / Math.max(1, g.actions) }, '시간 종료!'); },
    draw(g, ctx) {
      const c = g.deck[Math.min(g.i, g.deck.length - 1)];
      // 판정대
      BPF.drawImg(ctx, 'et_judge_desk', 30, 100, 140, 100, { noFallback: true });
      ui.text(ctx, '생명윤리 판정대', 170, 140, { size: 26, align: 'left', color: '#7a4a00', outline: '#fff' });
      ui.text(ctx, '찬반이 아니라 "따져 볼 쟁점"을 고르세요 (여러 개 가능)', 170, 176, { size: 17, align: 'left', color: '#5a4a8b' });
      // 사례 카드
      const cx = 110, cy = 214, cw = 790, ch = 200;
      const flip = g.reveal > 0;
      ui.round(ctx, cx, cy, cw, ch, 22, flip ? (g.last.ok ? '#e3ffd8' : '#ffe0e0') : '#fffaf0', '#3a2a6b', 5);
      ui.round(ctx, cx + 16, cy - 16, 120, 36, 18, '#7b3fd6', '#3a2a6b', 3);
      ui.text(ctx, `사례 ${g.i + 1}`, cx + 76, cy + 2, { size: 18, color: '#fff' });
      // 정답(관련 쟁점) 개수 안내
      const nPick = ISSUES.filter(x => g.pick[x.id]).length;
      ui.round(ctx, cx + 150, cy - 16, 250, 36, 18, '#ffb648', '#3a2a6b', 3);
      ui.text(ctx, `🎯 관련 쟁점 ${c.k.length}개 고르기 (${nPick}/${c.k.length})`, cx + 275, cy + 2, { size: 16, color: '#fff', outline: '#3a2a6b', ow: 3 });
      ui.wrap(ctx, c.t, cx + 30, cy + 34, cw - 60, { size: 23, lh: 34, weight: 'bold' });
      if (!flip) {
        ui.gauge(ctx, cx + 30, cy + ch - 40, cw - 60, 22, g.caseT, PER, g.caseT < 4 ? '#ff5d5d' : '#ffb648', `⏱ ${Math.ceil(g.caseT)}초`);
      } else {
        const ans = c.k.map(k => ISSUES.find(s => s.id === k).name).join(' + ');
        ui.text(ctx, (g.last.ok ? '⭕ 정확해요! ' : '❌ ') + '관련 쟁점: ' + ans, cx + 30, cy + ch - 62, { size: 19, align: 'left', color: g.last.ok ? '#2e6a2a' : '#b03040' });
        ui.wrap(ctx, c.why, cx + 30, cy + ch - 44, cw - 60, { size: 16, color: '#3a2a6b' });
      }
      // 쟁점 버튼
      ISSUES.forEach((s, k) => {
        const x = 30 + k * 196, y = 450;
        const on = !!g.pick[s.id] || (flip && c.k.includes(s.id));
        if (ui.button(ctx, x, y, 180, 92, `${k + 1}. ${s.name}`, { color: on ? s.color : '#c8bfe0', size: s.name.length > 4 ? 18 : 24, focus: !!g.pick[s.id], disabled: flip && !c.k.includes(s.id) && !g.pick[s.id] }) && !flip) {
          g.pick[s.id] = !g.pick[s.id]; g.avatar.setState('acting');
        }
        BPF.drawImg(ctx, 'et_issue_' + s.id, x - 10, y - 18, 46, 46, { noFallback: true });
        ui.wrap(ctx, s.desc, x + 90, y + 104, 176, { size: 14, align: 'center', color: '#5a4a8b' });
      });
      if (!flip && !g.over && ui.button(ctx, 400, 620, 250, 66, '판정 제출 (Space)', { color: '#ff5fa0', size: 24 })) this.submit(g);
      // 바로 앞 사례의 결과·해설
      if (g.prev && g.prevT > 0) {
        const P = g.prev, ans = P.c.k.map(k => ISSUES.find(s => s.id === k).name).join(' + ');
        ctx.save(); ctx.globalAlpha = Math.min(1, g.prevT);
        ui.round(ctx, 16, 596, 372, 86, 14, P.ok ? '#eaffe4' : '#ffecec', P.ok ? '#47c46b' : '#ff7a7a', 3);
        ui.fitWrap(ctx, (P.ok ? '⭕ 정확해요! ' : P.timeout ? '⏱ 시간 초과! ' : '❌ 아쉬워요! ') + '앞 사례 쟁점: ' + ans, 28, 602, 350, 26, { size: 16, weight: 'bold', color: P.ok ? '#2e6a2a' : '#b03040' });
        ui.fitWrap(ctx, P.c.why, 28, 630, 350, 48, { size: 14, lh: 18, color: '#3a2a6b' });
        ctx.restore();
      }
      // 진행
      for (let k = 0; k < 10; k++) {
        const done = k < g.i || (k === g.i && flip);
        ctx.fillStyle = k < g.i ? '#9a8acc' : k === g.i ? '#ffb648' : '#e0d8f0';
        ctx.beginPath(); ctx.arc(700 + k * 30, 652, 10, 0, 7); ctx.fill(); ctx.strokeStyle = '#3a2a6b'; ctx.lineWidth = 2; ctx.stroke();
      }
      ui.text(ctx, `연속 ${g.streak}`, 850, 682, { size: 16, color: '#c2185b' });
    }
  });
})();
