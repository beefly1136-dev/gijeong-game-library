/* 05 유전자 재조합 연구소 — 바이오 의약품 생산 공정 블록 순서 연결 + 품질 검사 타이밍 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  const CAT_COLOR = ['#ff6fa8', '#7b5cff', '#3fb6d6', '#47c46b', '#ffb648', '#ff7a7a'];
  // 교과서 217쪽 유전자 재조합 기술 · 219쪽 체외 유전자 치료 · 217쪽 동물 복제(복제 양 돌리, 핵치환)
  // 각 과정 = 짧은 글 + 그림(img). 그림 파일이 아직 없으면 fb(기존 아이콘)로 대신 보여 준다.
  // fixed: 미리 채워 두는 칸 번호(0부터)
  const PUZZLES = [
    { name: '유전자 재조합', use: '새 특성의 유전자 만들기', cats: ['찾기', '자르기', '운반체', '붙이기', '넣기', '생산'], fixed: [],
      steps: [
        { t: '필요한 유전자 찾기', img: 'rc_p1_1', fb: 'dna_helix' },
        { t: '제한 효소로 자르기', img: 'rc_p1_2', fb: 'rc_scissors' },
        { t: '운반체 DNA도 자르기', img: 'rc_p1_3', fb: 'rc_vector' },
        { t: '연결 효소로 붙이기', img: 'rc_p1_4', fb: 'rc_glue' },
        { t: '대장균에 넣기', img: 'rc_p1_5', fb: 'rc_ecoli' },
        { t: '배양하여 대량 생산', img: 'rc_p1_6', fb: 'tube_rack' }
      ], extra: [] },
    { name: '체외 유전자 치료', use: '유전자 결함 질병 치료', cats: ['진단', '세포 꺼내기', '운반체', '주입', '배양', '치료'], fixed: [1, 3],
      steps: [
        { t: '유전자 결함 진단', img: 'rc_p2_1', fb: 'dg_tool_pcr' },
        { t: '환자 세포 꺼내기', img: 'rc_p2_2', fb: 'rc_cell' },
        { t: '운반체에 정상 유전자 넣기', img: 'rc_p2_3', fb: 'rc_vector' },
        { t: '세포에 유전자 주입', img: 'rc_p2_4', fb: 'syringe' },
        { t: '세포 배양하기', img: 'rc_p2_5', fb: 'dish_pink' },
        { t: '세포를 몸에 다시 넣기', img: 'rc_p2_6', fb: 'shield' }
      ],
      extra: [{ t: '교배해서 선발하기', img: 'rc_x1', fb: 'seed_1', why: '교배·선발은 품종 개량 방법이에요. 유전자 치료 과정이 아니에요.' }] },
    // 교과서 217쪽: 1996년 이언 윌머트 연구팀의 복제 양 돌리(핵치환)
    { name: '핵치환: 복제 양 돌리', use: '체세포의 핵으로 같은 형질의 양 만들기', cats: ['체세포', '핵 꺼내기', '난자', '핵치환', '이식', '탄생'], fixed: [0],
      steps: [
        { t: '양의 체세포 얻기', img: 'rc_p3_1', fb: 'rc_cell' },
        { t: '체세포에서 핵 꺼내기', img: 'rc_p3_2', fb: 'syringe' },
        { t: '다른 양 난자의 핵 없애기', img: 'rc_p3_3', fb: 'rc_cell' },
        { t: '핵을 난자에 넣기', img: 'rc_p3_4', fb: 'syringe' },
        { t: '대리모 양에게 이식', img: 'rc_p3_5', fb: 'fx_heart' },
        { t: '복제 양 돌리 탄생', img: 'rc_p3_6', fb: 'ic_star' }
      ],
      extra: [{ t: '정자와 수정시키기', img: 'rc_x2', fb: 'no', why: '핵치환은 수정 없이 체세포의 핵을 난자에 넣어요.' },
        { t: '난자의 핵 그대로 쓰기', img: 'rc_x3', fb: 'fx_x', why: '난자의 핵은 없애고, 복제할 양의 체세포 핵을 넣어야 같은 형질이 나와요.' }] }
  ];
  const SLOT_Y = 200, POOL_Y = 410, BW = 146, BH = 120, BLOCK_W = 146;
  // 과정 블록 줄: 블록이 많아도 겹치지 않게 폭을 줄여 한 줄에 나란히
  const poolLayout = n => { const gap = Math.min(160, 940 / Math.max(1, n)); return { gap, w: Math.min(BW, Math.floor(gap) - 8) }; };
  const slotX = i => 34 + i * 160;

  BPF.defineGame('g05', {
    timeLimit: 150, bg: ['#d2f3ff', '#d9ccff'], bgKey: 'bg_lab1',
    init(g) { g.pi = 0; g.errors = 0; g.done = 0; g.credited = {}; this.load(g); },
    load(g) {
      const P = PUZZLES[g.pi]; g.P = P; this.cur = P;
      const blocks = P.steps.map((st, i) => ({ t: st.t, img: st.img, fb: st.fb, cat: i, ok: true, id: 'b' + i }));
      P.extra.forEach((e, i) => blocks.push({ t: e.t, img: e.img, fb: e.fb, why: e.why, cat: -1, ok: false, id: 'x' + i }));
      g.slots = new Array(6).fill(null);
      // 미리 채워 두는 칸(어려운 과정은 중간 3칸을 고정)
      P.fixed.forEach(k => { const b = blocks.find(x => x.cat === k); b.fixed = true; g.slots[k] = b; g.credited[g.pi + b.id] = 1; });
      g.pool = BPF.shuffle(blocks.filter(b => !b.fixed)); g.cur = 0;
      g.phase = 'build'; g.qc = 0; g.qcDir = 1; g.msg = `「${P.name}」 순서 맞추기! (${P.use})` + (P.fixed.length ? ' — 회색 칸은 미리 채워져 있어요.' : ''); g.bad = {};
      g.avatar.setState('thinking');
    },
    hud(g) { return `과정 ${g.done}/3 · 오류 ${g.errors}/5`; },
    demo(g) {
      const poolXY = id => { const i = g.pool.findIndex(b => b.id === id); const L = poolLayout(g.pool.length); return { x: 40 + i * L.gap + L.w / 2, y: POOL_Y + 60 }; };
      const st = [];
      st.push({ x: 506, y: 260, say: '흩어진 과정 블록을 1번 칸부터 순서대로 채워요.', wait: 1.0 });
      for (let k = 0; k < 6; k++) st.push({ x: () => poolXY('b' + k).x, y: () => poolXY('b' + k).y, say: k === 0 ? '첫 단계: 필요한 유전자 찾기!' : k === 1 ? '제한 효소로 자르고…' : k === 3 ? '연결 효소로 이어 붙여요.' : undefined, act: () => { const i = g.pool.findIndex(b => b.id === 'b' + k); this.place(g, i); }, wait: 0.35 });
      st.push({ x: 505, y: 597, say: '다 채우면 순서 확인!', act: () => this.check(g), wait: 0.6 });
      st.push({ x: 506, y: 552, say: '바늘이 초록 구간에 오면 눌러요!', act: () => { g.qc = 0.5; this.qcHit(g); }, wait: 1.4 });
      return st;
    },
    place(g, idx) {
      const e = g.slots.indexOf(null); if (e < 0 || !g.pool[idx]) return;
      g.slots[e] = g.pool.splice(idx, 1)[0]; g.cur = Math.min(g.cur, Math.max(0, g.pool.length - 1));
      BPF.audio.sfx('pop'); g.avatar.setState('acting');
    },
    unplace(g, si) { if (!g.slots[si] || g.slots[si].fixed) return; g.pool.push(g.slots[si]); g.slots[si] = null; BPF.audio.sfx('move'); },
    check(g) {
      if (g.slots.includes(null)) { g.msg = '빈칸을 모두 채운 뒤 확인해요.'; return; }
      g.actions++;
      let wrong = 0, why = '';
      g.slots.forEach((b, i) => {
        if (b.ok && b.cat === i) {
          if (!g.credited[g.pi + b.id]) { g.credited[g.pi + b.id] = 1; g.addPoints(150, slotX(i) + BW / 2, SLOT_Y); }
        } else { wrong++; if (!b.ok) why = b.why; g.bad[i] = 0.8; }
      });
      if (!wrong) {
        g.success(0, 506, SLOT_Y + 60); g.phase = 'qc'; g.qc = 0; g.msg = '과정 연결 완료! 마지막 확인: 바늘이 초록 구간에 있을 때 Space(또는 클릭)!';
        return;
      }
      g.errors++;
      g.mistake(506, SLOT_Y + 60, `${wrong}곳이 틀렸어요`);
      g.msg = why || `틀린 위치 ${wrong}곳의 블록을 되돌렸어요. 단계 이름을 잘 봐요!`;
      // 틀린 블록 되돌리기
      g.slots.forEach((b, i) => { if (!(b.ok && b.cat === i)) { g.pool.push(b); g.slots[i] = null; } });
      if (g.errors >= 5) g.finish(false, { achieve: (g.done + 0.5) / 3, accuracy: g.good / Math.max(1, g.actions) }, '오류 5회…');
    },
    qcHit(g) {
      g.actions++;
      if (Math.abs(g.qc - 0.5) <= 0.14) {
        g.done++; g.success(300, 506, 520); g.flash = 0.2;
        g.msg = `✅ ${g.P.name} 완성!`;
        if (g.done >= 3) { g.finish(true, { achieve: 1, accuracy: g.good / g.actions, bonus: 0.5 * g.timeLeft / 100 + 0.5 * Math.max(0, 1 - g.errors / 5) }); return; }
        g.pi++; g.phase = 'wait'; g.waitT = 1.4;
      } else {
        g.errors++; g.mistake(506, 520, '검사 불합격!'); g.msg = '확인에 실패했어요. 초록 구간에서 다시!';
        if (g.errors >= 5) g.finish(false, { achieve: (g.done + 0.8) / 3, accuracy: g.good / Math.max(1, g.actions) }, '오류 5회…');
      }
    },
    update(g, dt) {
      Object.keys(g.bad).forEach(k => { g.bad[k] -= dt; if (g.bad[k] <= 0) delete g.bad[k]; });
      if (g.phase === 'wait') { g.waitT -= dt; if (g.waitT <= 0) this.load(g); return; }
      if (g.phase === 'qc') {
        g.qc += g.qcDir * dt * (0.9 + g.done * 0.35);
        if (g.qc > 1) { g.qc = 1; g.qcDir = -1; } if (g.qc < 0) { g.qc = 0; g.qcDir = 1; }
        if (I.key('Space') || I.key('KeyZ')) this.qcHit(g);
        return;
      }
      if (I.any('ArrowLeft', 'KeyA')) { g.cur = Math.max(0, g.cur - 1); BPF.audio.sfx('move'); }
      if (I.any('ArrowRight', 'KeyD')) { g.cur = Math.min(g.pool.length - 1, g.cur + 1); BPF.audio.sfx('move'); }
      if (I.key('Backspace')) { for (let i = 5; i >= 0; i--) if (g.slots[i]) { this.unplace(g, i); break; } }
      if (I.key('Space')) { if (g.slots.includes(null)) this.place(g, g.cur); else this.check(g); }
    },
    onTimeUp(g) { g.finish(false, { achieve: g.done / 3, accuracy: g.good / Math.max(1, g.actions) }, '시간 종료!'); },
    drawBlock(ctx, b, x, y, hov, focus, reveal, BW = BLOCK_W) {
      const c = b.fixed ? '#9a90b0' : reveal && b.cat >= 0 ? CAT_COLOR[b.cat] : '#8a7dff';
      const yy = y - (hov ? 4 : 0);
      ui.round(ctx, x, yy, BW, BH, 16, b.fixed ? '#ece8f4' : ui.lighten(c, 0.8), focus ? '#ff7a00' : '#3a2a6b', focus ? 5 : 3);
      // 그림 (선생님이 만든 과정 그림 → 없으면 기존 아이콘)
      if (!BPF.drawImg(ctx, b.img, x + BW / 2 - 34, yy + 6, 68, 64, { noFallback: true }))
        BPF.drawImg(ctx, b.fb, x + BW / 2 - 30, yy + 8, 60, 60, { noFallback: true });
      ui.round(ctx, x + 4, yy + 74, BW - 8, BH - 78, 10, b.fixed ? '#d8d2e6' : c);
      ui.fitWrap(ctx, b.t, x + BW / 2, yy + 78, BW - 16, 36, { size: 16, align: 'center', weight: 'bold', lh: 18, color: '#fff' });
      if (b.fixed) ui.text(ctx, '🔒', x + BW - 14, yy + 14, { size: 16 });
    },
    draw(g, ctx) {
      ui.panel(ctx, 20, 100, 972, 600, { title: `${g.pi + 1}번 과정: ${g.P.name}` });
      ui.text(ctx, '과정 라인 (1번부터 순서대로)', 40, 168, { size: 18, align: 'left', color: '#3a2a6b' });
      // 연결선
      ctx.save(); ctx.strokeStyle = '#7b5cff'; ctx.lineWidth = 6; ctx.setLineDash([12, 8]); ctx.lineDashOffset = -BPF.time * 30;
      ctx.beginPath(); ctx.moveTo(slotX(0) + BW / 2, SLOT_Y + BH / 2); ctx.lineTo(slotX(5) + BW / 2, SLOT_Y + BH / 2); ctx.stroke(); ctx.restore();
      for (let i = 0; i < 6; i++) {
        const x = slotX(i), b = g.slots[i];
        const shake = g.bad[i] ? Math.sin(BPF.time * 50) * 5 : 0;
        if (b) {
          const r = { x, y: SLOT_Y, w: BW, h: BH };
          this.drawBlock(ctx, b, x + shake, SLOT_Y, ui.hover(r) && g.phase === 'build', false, !!g.credited[g.pi + b.id] && b.cat === i);
          if (g.phase === 'build' && ui.hit(r)) { I.consume(); this.unplace(g, i); }
        } else {
          ui.round(ctx, x, SLOT_Y, BW, BH, 16, g.bad[i] ? 'rgba(255,120,120,.5)' : 'rgba(255,255,255,.7)', '#3a2a6b', 3);
          ui.text(ctx, String(i + 1), x + BW / 2, SLOT_Y + BH / 2 - 10, { size: 40, color: '#c9b8ff' });
          ui.text(ctx, g.P.cats[i], x + BW / 2, SLOT_Y + BH - 22, { size: 15, color: '#9a8acc' });
        }
      }
      if (g.phase === 'build') {
        ui.text(ctx, '과정 블록 (클릭하면 다음 빈칸에 들어가요 · 라인의 블록을 클릭하면 되돌아와요)', 40, POOL_Y - 22, { size: 16, align: 'left', color: '#5a4a8b' });
        const L = poolLayout(g.pool.length);
        g.pool.forEach((b, i) => {
          const x = 40 + i * L.gap, y = POOL_Y + (i % 2) * 8;
          const r = { x, y, w: L.w, h: BH };
          this.drawBlock(ctx, b, x, y, ui.hover(r), BPF.Input.lastDevice === 'key' && g.cur === i, false, L.w);
          if (ui.hit(r)) { I.consume(); this.place(g, i); }
        });
        const full = !g.slots.includes(null);
        if (ui.button(ctx, 380, 568, 250, 58, full ? '순서 확인! (Space)' : '빈칸을 채우세요', { color: '#ff5fa0', size: 22, disabled: !full })) this.check(g);
        if (ui.button(ctx, 650, 568, 150, 58, '⟲ 비우기', { color: '#8a7dff', size: 20 })) for (let i = 0; i < 6; i++) this.unplace(g, i);
      } else if (g.phase === 'qc') {
        const x = 206, y = 430, w = 600, h = 56;
        ui.text(ctx, '🧪 최종 확인 — 초록 구간에서 멈추기', 506, 400, { size: 24, color: '#3a2a6b' });
        ui.round(ctx, x, y, w, h, 16, '#4a3a6b', '#3a2a6b', 4);
        ctx.fillStyle = '#ff7a7a'; ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
        ctx.fillStyle = '#ffd84d'; ctx.fillRect(x + 4 + (w - 8) * 0.24, y + 4, (w - 8) * 0.52, h - 8);
        ctx.fillStyle = '#47c46b'; ctx.fillRect(x + 4 + (w - 8) * 0.36, y + 4, (w - 8) * 0.28, h - 8);
        const nx = x + 4 + (w - 8) * g.qc;
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3a2a6b'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(nx, y - 4); ctx.lineTo(nx - 12, y - 24); ctx.lineTo(nx + 12, y - 24); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillRect(nx - 3, y, 6, h);
        if (ui.button(ctx, 406, 520, 200, 64, '검사! (Space)', { color: '#47c46b', size: 24, focus: true })) this.qcHit(g);
      } else {
        ui.text(ctx, '✨ 다음 과정 준비 중…', 506, 470, { size: 28, color: '#2e8a3a', outline: '#fff' });
      }
      ui.round(ctx, 40, 636, 932, 52, 14, '#fffaf0', '#c9b8ff', 2);
      ui.wrap(ctx, g.msg, 56, 646, 900, { size: 17, weight: 'bold', color: '#3a2a6b' });
    }
  });
})();
