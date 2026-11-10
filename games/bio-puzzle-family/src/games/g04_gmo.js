/* 04 GMO 메이커 — 의뢰 → 목표 형질 → 유전자 기능 카드(드래그) → 기대 결과 판별 → 안전성 검토(필수 2개) */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  const REVIEW_BAD = [
    { t: '검토 없이 바로 판매', why: '안전성 평가 없이 판매할 수 없어요.' },
    { t: 'GMO는 모두 위험하니 무조건 폐기', why: 'GMO를 획일적으로 위험하다고 단정하지 않아요. 사례별로 평가해요.' },
    { t: 'GMO는 모두 안전하니 생략', why: 'GMO를 획일적으로 안전하다고 단정하지도 않아요.' }
  ];
  // 교과서 215쪽 「유전자 변형 농산물의 개발」: 제초제 저항성 · 가뭄 저항성 · 소비 기한 · 생산성
  const CASES = [
    { id: 'soy', who: 'farmer', crop: '콩', img: 'gm_crop_soy_trouble', done: 'gm_crop_soy',
      req: '잡초를 없애려고 제초제를 뿌리면 콩까지 함께 시들어 버려요.',
      traits: ['제초제 저항성', '꽃이 빨리 피는 성질', '열매 색 변화'], trait: 0,
      gene: '제초제에 견디도록 돕는 효소의 유전자',
      results: ['제초제를 뿌려도 콩은 자라고 잡초만 줄어든다', '제초제 없이도 잡초가 저절로 사라진다', '콩이 모든 병에 걸리지 않는다'], result: 0,
      reviews: ['알레르기·독성 검사 (사람 건강)', '기존 콩과 성분 비교 (예상하지 못한 변화 확인)', '주변 잡초·생태계 교란 영향 평가'] },
    { id: 'corn', who: 'eco', crop: '옥수수', img: 'gm_crop_corn_trouble', done: 'gm_crop_corn',
      req: '비가 적게 내리는 지역에서 옥수수가 말라 죽어 식량이 부족해요.',
      traits: ['단맛 증가', '가뭄 저항성', '잎 크기 증가'], trait: 1,
      gene: '물이 부족할 때 잘 견디도록 돕는 유전자',
      results: ['물을 전혀 주지 않아도 영원히 자란다', '가뭄에도 이전보다 잘 견디며 자란다', '사막에서도 열매가 두 배로 열린다'], result: 1,
      reviews: ['알레르기·독성 검사 (사람 건강)', '기존 옥수수와 성분 비교', '재배 지역 생태계 교란 영향 평가'] },
    { id: 'tomato', who: 'shop', crop: '토마토', img: 'gm_crop_tomato_trouble', done: 'gm_crop_tomato',
      req: '토마토가 유통 중에 너무 빨리 물러져서 버려지는 양이 많아요.',
      traits: ['소비 기한을 늘리는 성질(천천히 물러짐)', '잎이 커지는 성질', '씨앗이 없어지는 성질'], trait: 0,
      gene: '열매를 무르게 하는 효소의 작용을 줄이는 유전자',
      results: ['토마토가 영원히 썩지 않는다', '토마토가 이전보다 천천히 물러진다', '토마토 맛이 반드시 좋아진다'], result: 1,
      reviews: ['기존 토마토와 성분 비교 (예상하지 못한 변화 확인)', '알레르기·독성 검사', '표시 기준과 규제 심사 확인'] },
    { id: 'rice', who: 'dr', crop: '벼(쌀)', img: 'gm_crop_rice_trouble', done: 'gm_crop_rice',
      req: '인구가 늘어 같은 넓이의 논에서 더 많은 쌀을 거두어야 해요.',
      traits: ['생산성(수확량) 향상', '물 없이 자라는 성질', '쌀알 색 변화'], trait: 0,
      gene: '이삭의 낟알 수를 늘리도록 돕는 유전자',
      results: ['한 번 심으면 해마다 저절로 수확된다', '쌀만 먹어도 모든 영양소가 충분해진다', '같은 넓이에서 수확량이 늘어난다'], result: 2,
      reviews: ['알레르기·독성 검사', '기존 벼와 영양 성분 비교', '주변 식물로 유전자가 퍼지는지(생태계) 평가'] }
  ];
  const DISTRACT_GENES = [
    { t: '같은 품종 중 튼튼한 개체끼리 교배하고 선발하기', why: '그건 전통 육종 방법이에요! GMO는 유전자 재조합으로 특정 유전자를 넣거나 바꿔요.' },
    { t: '꽃잎 색을 바꾸는 색소 유전자', why: '목표 형질과 관계없는 유전자예요.' },
    { t: '성장 촉진 비료 뿌리기', why: '비료는 유전자가 아니에요. 유전 형질이 바뀌지 않아요.' },
    { t: '사람의 성장 호르몬 유전자', why: '이 의뢰의 목표 형질과 관계없는 유전자예요.' },
    { t: '빛을 내는 해파리 형광 단백질 유전자', why: '실험 표지용으로 쓰이지만 이 의뢰의 목표와는 달라요.' }
  ];
  const STEP_PTS = [200, 300, 200, 300];
  const STEPS = ['목표 형질', '유전자 기능 카드', '기대 결과 판별', '안전성 검토'];
  const SLOT = { x: 70, y: 470, w: 230, h: 90 }; // 왼쪽 패널(20~350) 가운데

  BPF.defineGame('g04', {
    timeLimit: 150, bg: ['#e6dcff', '#bfe0ff'], bgKey: 'bg_lab2',
    init(g) {
      g.queue = BPF.shuffle(CASES).slice(0, 3); g.ci = 0; g.done = 0; g.errors = 0; g.feedback = '';
      this.loadCase(g);
    },
    loadCase(g) {
      const c = g.queue[g.ci];
      g.c = c; g.step = 0; g.picked = {};
      const genes = BPF.shuffle(DISTRACT_GENES).slice(0, 5).map(d => ({ t: d.t, why: d.why, ok: false }));
      genes.push({ t: c.gene, ok: true });
      g.genes = BPF.shuffle(genes);
      const rv = c.reviews.map(t => ({ t, ok: true })).concat(REVIEW_BAD.map(b => ({ t: b.t, why: b.why, ok: false })));
      g.reviews = BPF.shuffle(rv); g.sel = {}; g.drag = null;
      g.feedback = '의뢰를 읽고 목표 형질을 골라요.'; g.avatar.setState('thinking');
    },
    hud(g) { return `연구 ${g.done}/3 · 오답 ${g.errors}/4`; },
    demoSetup(g) { g.queue = [CASES[0], CASES[2], CASES[1]]; g.ci = 0; this.loadCase(g); },
    demo(g) {
      const X = 370, Y = 100, W = 630, H = 500;
      const c = () => g.c;
      return [
        { x: 185, y: 170, say: '의뢰를 읽어요: 제초제를 뿌리면 콩도 시들어요.', wait: 1.2 },
        { x: X + W / 2, y: () => Y + 138 + c().trait * 100, say: '필요한 형질은 「제초제 저항성」!', act: () => this.right(g, '목표 형질: ' + c().traits[c().trait], X + W / 2, Y + 140), wait: 1.0 },
        { x: () => { const i = g.genes.findIndex(x => x.ok); return X + 115 + (i % 3) * 200; }, y: () => { const i = g.genes.findIndex(x => x.ok); return Y + 163 + Math.floor(i / 3) * 200; }, say: '알맞은 유전자 카드를 왼쪽 슬롯으로 끌어 놓아요.', wait: 0.3 },
        { x: SLOT.x + SLOT.w / 2, y: SLOT.y + 40, act: () => this.right(g, '유전자 기능 카드 연결 성공!', SLOT.x + SLOT.w / 2, SLOT.y), wait: 1.0 },
        { x: X + W / 2, y: () => Y + 140 + c().result * 100, say: '부풀린 효과 말고, 실제로 기대할 수 있는 결과를 골라요.', act: () => this.right(g, '기대 효과를 정확히 판별했어요.', X + W / 2, Y + 140), wait: 1.0 },
        { x: () => { const i = g.reviews.findIndex(r => r.ok); return X + 166 + (i % 2) * 296; }, y: () => { const i = g.reviews.findIndex(r => r.ok); return Y + 120 + Math.floor(i / 2) * 104; }, say: '안전성 검토를 2개 이상 골라요.', act: () => { g.sel[g.reviews.findIndex(r => r.ok)] = true; }, wait: 0.5 },
        { x: () => { const i = g.reviews.findIndex((r, k) => r.ok && !g.sel[k]); return X + 166 + (i % 2) * 296; }, y: () => { const i = g.reviews.findIndex((r, k) => r.ok && !g.sel[k]); return Y + 120 + Math.floor(i / 2) * 104; }, act: () => { g.sel[g.reviews.findIndex((r, k) => r.ok && !g.sel[k])] = true; }, wait: 0.5 },
        { x: X + W / 2, y: Y + H - 43, say: '검토 완료! 검토를 빼먹으면 연구가 끝나지 않아요.', act: () => this.submitReview(g), wait: 1.6 }
      ];
    },
    wrong(g, why, x, y) {
      g.errors++; g.actions++; g.feedback = '❌ ' + why;
      g.mistake(x || 600, y || 300, '다시 생각해 봐요');
      if (g.errors >= 4) g.finish(false, { achieve: (g.done + g.step / 4) / 3, accuracy: g.good / Math.max(1, g.actions) }, '오답 4회…');
    },
    right(g, msg, x, y) {
      g.actions++; g.success(STEP_PTS[g.step], x || 600, y || 300);
      g.feedback = '✅ ' + msg; g.step++;
      if (g.step === 4) {
        g.done++; g.flash = 0.25;
        if (g.done >= 3) { g.finish(true, { achieve: 1, accuracy: g.good / g.actions, bonus: 0.5 * g.timeLeft / 100 + 0.5 * (g.errors === 0 ? 1 : 0.4) }); return; }
        g.nextT = 1.6;
      } else g.avatar.setState('thinking');
    },
    update(g, dt) {
      if (g.nextT) { g.nextT -= dt; if (g.nextT <= 0) { g.nextT = 0; g.ci++; this.loadCase(g); } }
      if (g.step === 3 && I.key('Space')) this.submitReview(g);
    },
    submitReview(g) {
      const picked = g.reviews.filter((r, i) => g.sel[i]);
      const bad = picked.find(r => !r.ok);
      if (bad) { this.wrong(g, bad.why, 600, 400); g.sel = {}; return; }
      if (picked.length < 2) { this.wrong(g, '안전성 검토가 부족해요! 알맞은 검토를 2가지 이상 골라야 연구를 완료할 수 있어요.', 600, 400); return; }
      this.right(g, `${g.c.crop} 연구 완료! 독성·알레르기·성분·환경 영향을 따로 검토했어요.`, 600, 400);
    },
    onTimeUp(g) { g.finish(false, { achieve: (g.done + g.step / 4) / 3, accuracy: g.good / Math.max(1, g.actions) }, '시간 종료!'); },
    draw(g, ctx) {
      const c = g.c;
      // 왼쪽: 의뢰·작물
      ui.panel(ctx, 20, 100, 330, 600, { title: `의뢰 ${g.ci + 1} / 3` });
      // 의뢰인: 마을 사람이 말풍선으로 부탁한다
      const N = BPF_DATA.npcs.find(n => n.id === c.who) || BPF_DATA.npcs[0];
      const bob = Math.sin(BPF.time * 2.4) * 2;
      if (!BPF.drawImg(ctx, 'npc_' + N.id, 26, 132 + bob, 104, 150, { noFallback: true, align: 'bottom' })) ui.text(ctx, '🧑‍🌾', 78, 200, { size: 60 });
      ui.round(ctx, 30, 288, 98, 26, 12, N.color, '#3a2a6b', 2);
      ui.fitWrap(ctx, N.name, 79, 292, 92, 20, { size: 14, align: 'center', weight: 'bold', color: '#fff' });
      // 말풍선
      ui.round(ctx, 138, 124, 202, 182, 18, '#ffffff', '#3a2a6b', 3);
      ctx.save(); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3a2a6b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(140, 186); ctx.lineTo(120, 200); ctx.lineTo(140, 210); ctx.fill(); ctx.stroke();
      ctx.fillRect(138.5, 184, 4, 28); ctx.restore();
      ui.fitWrap(ctx, `"${c.req}"`, 239, 136, 180, 158, { size: 18, lh: 25, weight: 'bold', color: '#2d2350', align: 'center', valign: 'middle' });
      BPF.drawImg(ctx, g.step >= 4 ? c.done : c.img, 135, 318, 100, 118);
      ui.text(ctx, c.crop, 185, 452, { size: 20, color: '#3a2a6b' });
      // 유전자 슬롯
      const slot = SLOT;
      ui.round(ctx, slot.x, slot.y, slot.w, slot.h, 14, g.step >= 2 ? '#d7ffd2' : (g.drag ? '#fff3a8' : '#efe6ff'), '#3a2a6b', 3);
      ctx.save(); ctx.setLineDash([6, 5]); ui.round(ctx, slot.x + 6, slot.y + 6, slot.w - 12, slot.h - 12, 10, null, '#7b5cff', 2); ctx.restore();
      if (g.step >= 2) ui.wrap(ctx, '🧬 ' + c.gene, slot.x + slot.w / 2, slot.y + 12, slot.w - 24, { size: 14, align: 'center', weight: 'bold', color: '#2e6a2a' });
      else ui.text(ctx, '🧬 유전자 카드를 여기로', slot.x + slot.w / 2, slot.y + slot.h / 2, { size: 16, color: '#7b5cff' });
      // 단계 표시
      STEPS.forEach((s, i) => {
        const x = 29 + i * 80, y = 590;
        ui.round(ctx, x, y, 72, 40, 12, i < g.step ? '#47c46b' : i === g.step ? '#ffb648' : '#d0c8e8', '#3a2a6b', 2);
        ui.text(ctx, String(i + 1), x + 36, y + 21, { size: 18, color: '#fff', outline: '#3a2a6b' });
      });
      ui.text(ctx, g.step < 4 ? `단계: ${STEPS[g.step]}` : '완료!', 185, 655, { size: 18, color: '#c2185b' });
      // 오른쪽: 단계별 작업
      const X = 370, Y = 100, W = 630, H = 500;
      ui.panel(ctx, X, Y, W, H, { title: g.step < 4 ? `${g.step + 1}. ${STEPS[g.step]}` : '연구 완료' });
      if (g.step === 0) {
        ui.text(ctx, '이 문제를 해결하려면 어떤 형질이 필요할까요?', X + W / 2, Y + 50, { size: 20 });
        c.traits.forEach((t, i) => {
          if (ui.button(ctx, X + 60, Y + 100 + i * 100, W - 120, 76, t, { color: ['#ff9a4d', '#3fb6d6', '#d65bd6'][i], size: 24 })) {
            g.avatar.setState('acting');
            if (i === c.trait) this.right(g, `목표 형질: ${t}`, X + W / 2, Y + 140 + i * 100);
            else this.wrong(g, '이 의뢰의 문제를 해결하는 형질이 아니에요.', X + W / 2, Y + 140 + i * 100);
          }
        });
      } else if (g.step === 1) {
        ui.text(ctx, `목표 형질 「${c.traits[c.trait]}」을 만드는 카드를 왼쪽 슬롯으로 끌어 놓아요`, X + W / 2, Y + 40, { size: 17 });
        g.genes.forEach((gn, i) => {
          const cx = X + 20 + (i % 3) * 200, cy = Y + 70 + Math.floor(i / 3) * 200;
          const r = { x: cx, y: cy, w: 190, h: 186 };
          const dragging = g.drag && g.drag.i === i;
          if (!dragging) this.drawGene(ctx, gn, r, ui.hover(r));
          if (I.pressedMouse && BPF.inRect(I.px, I.py, r) && !g.drag) { g.drag = { i, ox: I.px - cx, oy: I.py - cy, sx: I.px, sy: I.py }; g.avatar.setState('acting'); }
        });
        if (g.drag) {
          const gn = g.genes[g.drag.i];
          const r = { x: I.mx - g.drag.ox, y: I.my - g.drag.oy, w: 190, h: 186 };
          ctx.save(); ctx.globalAlpha = 0.9; this.drawGene(ctx, gn, r, true); ctx.restore();
          if (I.released) {
            const moved = Math.hypot(I.rx - g.drag.sx, I.ry - g.drag.sy) > 12;
            const onSlot = BPF.inRect(I.rx, I.ry, { x: SLOT.x - 30, y: SLOT.y - 40, w: SLOT.w + 60, h: SLOT.h + 80 });
            if (onSlot || !moved) {
              if (gn.ok) this.right(g, '유전자 기능 카드 연결 성공!', SLOT.x + SLOT.w / 2, SLOT.y);
              else this.wrong(g, gn.why, SLOT.x + SLOT.w / 2, SLOT.y);
            }
            g.drag = null; I.consume();
          }
        }
      } else if (g.step === 2) {
        ui.text(ctx, '가상 결과 판별: 이 연구에서 기대할 수 있는 효과는?', X + W / 2, Y + 50, { size: 19 });
        c.results.forEach((t, i) => {
          if (ui.button(ctx, X + 40, Y + 100 + i * 100, W - 80, 80, t, { color: '#8a7dff', size: 20 })) {
            if (i === c.result) this.right(g, '기대 효과를 정확히 판별했어요. 과장된 효과는 경계해요!', X + W / 2, Y + 140 + i * 100);
            else this.wrong(g, '효과를 너무 크게 부풀렸거나 관계없는 효과예요. 목표 형질과 직접 관련된 효과만 기대할 수 있어요.', X + W / 2, Y + 140 + i * 100);
          }
        });
        ui.wrap(ctx, '※ 카드 조합은 원리를 단순화한 것이에요. 실제 유전자 도입은 여러 번 실험하고 확인해야 하며 항상 성공하지는 않아요.', X + 30, Y + 420, W - 60, { size: 15, color: '#7a6a99' });
      } else if (g.step === 3) {
        ui.text(ctx, '알맞은 안전성 검토를 2가지 이상 고른 뒤 [검토 완료]', X + W / 2, Y + 44, { size: 19 });
        g.reviews.forEach((rv, i) => {
          const cx = X + 24 + (i % 2) * 296, cy = Y + 76 + Math.floor(i / 2) * 104;
          const on = !!g.sel[i];
          // 글자가 버튼 밖으로 나가지 않게: 버튼은 빈 글자로 그리고 안쪽에 줄바꿈
          const hit = ui.button(ctx, cx, cy, 284, 88, '', { color: on ? '#47c46b' : '#b8a8e8', focus: on });
          ui.text(ctx, on ? '☑' : '☐', cx + 22, cy + 44, { size: 24, color: '#fff', outline: '#3a2a6b' });
          const th = Math.min(66, ui.wrap(ctx, rv.t, 0, 0, 226, { size: 17, lh: 22, weight: 'bold', dry: true }));
          ui.fitWrap(ctx, rv.t, cx + 46, cy + (88 - th) / 2 + 2, 226, 66, { size: 17, lh: 22, weight: 'bold', color: '#2d2350' });
          if (hit) { g.sel[i] = !on; g.avatar.setState('acting'); }
        });
        if (ui.button(ctx, X + W / 2 - 130, Y + H - 72, 260, 58, '검토 완료 (Space)', { color: '#ff5fa0', size: 22 })) this.submitReview(g);
      } else {
        BPF.drawImg(ctx, c.done, X + W / 2 - 90, Y + 80, 180, 220);
        ui.text(ctx, `${c.crop} 연구 완료!`, X + W / 2, Y + 340, { size: 32, color: '#2e8a3a', outline: '#fff' });
        ui.text(ctx, '다음 의뢰를 준비 중…', X + W / 2, Y + 390, { size: 20, color: '#7a6a99' });
      }
      // 피드백
      ui.round(ctx, 370, 612, 630, 94, 16, '#fffaf0', '#3a2a6b', 3);
      ui.fitWrap(ctx, g.feedback, 388, 622, 596, 76, { size: 17, lh: 25, weight: 'bold', color: g.feedback[0] === '❌' ? '#b03040' : '#2e6a2a' });
    },
    drawGene(ctx, gn, r, hov) {
      ui.round(ctx, r.x, r.y + (hov ? -4 : 0), r.w, r.h, 16, hov ? '#fff8d0' : '#ffffff', '#3a2a6b', 3);
      BPF.drawImg(ctx, 'gm_gene_card', r.x + r.w / 2 - 26, r.y + 8 + (hov ? -4 : 0), 52, 64, { noFallback: true });
      ui.wrap(ctx, gn.t, r.x + r.w / 2, r.y + 80 + (hov ? -4 : 0), r.w - 20, { size: 15, align: 'center', weight: 'bold', lh: 21 });
    }
  });
})();
