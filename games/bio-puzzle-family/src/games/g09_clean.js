/* 09 환경 정화 대작전 — 8×8 매치 타일, 환경 카드별 효과 차이, 비생물학적 처리 카드 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  const N = 8, CS = 66, BX = 300, BY = 104;
  const TYPES = [
    { id: 'oil', name: '기름 분해 미생물', icon: 'dish_yellow', color: '#ffcf5a' },
    { id: 'algae', name: '미세조류·수생식물', icon: 'dish_green', color: '#7ee0a0' },
    { id: 'plant', name: '정화 식물', icon: 'sprout', color: '#b7e86a' },
    { id: 'compost', name: '퇴비화 미생물', icon: 'recycle', color: '#8fc8ff' }
  ];
  const ENVS = [
    { name: '해안 기름 유출', kind: '수질·토양', eff: { oil: 1, algae: 0, plant: 0.5, compost: 0 }, block: '플라스틱 쓰레기', img: 'cl_env_coast', blockImg: 'cl_blocker_plastic', blockN: 4, cards: 3,
      tip: '기름 분해 미생물이 기름을 분해해요. 플라스틱 쓰레기는 미생물로 빨리 분해되지 않아 수거(비생물학적 처리)가 필요해요.' },
    { name: '부영양화 호수', kind: '수질', eff: { oil: 0, algae: 1, plant: 0.5, compost: 0 }, block: '쌓인 퇴적물', img: 'cl_env_lake', blockImg: 'cl_blocker_sludge', blockN: 4, cards: 3,
      tip: '미세조류·수생식물이 질소·인을 흡수해요. 바닥에 쌓인 퇴적물은 준설(비생물학적 처리)로 걷어내요.' },
    { name: '중금속 오염 토양', kind: '토양', eff: { oil: 0, algae: 0, plant: 0.5, compost: 0 }, block: '중금속 덩어리', img: 'cl_env_soil', blockImg: 'cl_blocker_metal', blockN: 7, cards: 4,
      tip: '중금속은 분해되지 않아요! 일부 식물이 흡수(식물 정화)할 수 있지만 느려서, 토양 세척·흡착 같은 처리가 함께 필요해요.' },
    { name: '음식물 쓰레기 매립지', kind: '토양', eff: { oil: 0, algae: 0, plant: 0.5, compost: 1 }, block: '비닐·금속 쓰레기', img: 'cl_env_landfill', blockImg: 'cl_blocker_vinyl', blockN: 4, cards: 3,
      tip: '퇴비화 미생물이 유기물을 분해해요. 비닐·금속은 분해되지 않으니 분리 수거가 필요해요.' }
  ];
  const CARD_HELP = [
    { name: '처리 카드', tag: '비생물 처리', img: 'recycle', color: '#ffb648', desc: '플라스틱·중금속·비닐처럼 생물이 분해하지 못하는 오염은 처리 카드로 치워요. 수거·세척 같은 비생물학적 처리예요.' },
    { name: '① 카드 들기', tag: '버튼 또는 Space', img: 'cl_blocker_metal', color: '#ff7a9a', desc: '오른쪽 아래 「처리 카드」 버튼을 누르거나 Space 키를 눌러요. 다시 누르면 취소돼요.' },
    { name: '② 칸 고르기', tag: '주변 3×3 처리', img: 'cl_env_soil', color: '#3fb6d6', desc: '판에서 오염이 몰린 칸을 클릭하면 그 칸과 주변 8칸(3×3)의 오염이 한 번에 사라져요. 빈 곳에 쓰면 실수예요.' },
    { name: '③ 아껴 쓰기', tag: '환경마다 +1장', img: 'ic_star', color: '#47c46b', desc: '처음엔 3장이고 환경 카드가 바뀔 때마다 1장씩 늘어요. 남은 카드가 많을수록 보너스 점수!' }
  ];
  const TURNS = 16, PER_ENV = 4; // 4턴마다 환경 카드가 바뀌어 4가지 환경을 모두 겪는다(운 요소 줄이기)

  BPF.defineGame('g09', {
    timeLimit: 0, bg: ['#d8fff0', '#b8e0ff'], bgKey: 'bg_farm',
    // 시작 전 큰 팝업: 처리 카드 사용법
    infoCard: { title: '처리 카드 사용법', sub: '생물로 없앨 수 없는 오염은 처리 카드로! 쓰는 방법을 알아 둬요.', items: CARD_HELP },
    init(g) {
      g.order = BPF.shuffle(ENVS.slice()); g.envIdx = 0; g.env = g.order[0]; g.swaps = 0; g.nextEnv = false;
      g.turns = TURNS; g.cards = 3; g.cardMode = false;
      g.envPop = { t: 2.6 }; // 시작할 때 첫 환경 카드를 크게 보여 준다
      g.tile = []; g.pol = []; g.lock = [];
      for (let y = 0; y < N; y++) { g.tile.push([]); g.pol.push([]); g.lock.push([]); for (let x = 0; x < N; x++) { g.tile[y].push(0); g.pol[y].push(0); g.lock[y].push(false); } }
      // 오염 덩어리
      const cx = BPF.randi(2, 5), cy = BPF.randi(2, 5);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d < 1.6) g.pol[y][x] = 2; else if (d < 3.1) g.pol[y][x] = 1; else if (Math.random() < 0.08) g.pol[y][x] = 1;
      }
      let k = 0, guard = 0;
      while (k < g.env.blockN && guard++ < 200) {
        const x = BPF.clamp(cx + BPF.randi(-2, 2), 0, N - 1), y = BPF.clamp(cy + BPF.randi(-2, 2), 0, N - 1);
        if (!g.lock[y][x]) { g.lock[y][x] = true; g.pol[y][x] = 2; k++; }
      }
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let t; do { t = BPF.randi(0, 3); } while ((x >= 2 && g.tile[y][x - 1] === t && g.tile[y][x - 2] === t) || (y >= 2 && g.tile[y - 1][x] === t && g.tile[y - 2][x] === t));
        g.tile[y][x] = t;
      }
      g.start = this.index(g); g.sel = null; g.anim = []; g.busy = 0; g.chain = 0; g.msg = '환경 카드를 먼저 확인해요! 효과 있는 정화 생물 타일을 오염 칸 위에서 3개 이상 이어요.';
      g.drag = null;
    },
    bestSwap(g) {
      let best = null, bv = -1;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const a = { x, y }, b = { x: x + dx, y: y + dy };
        if (b.x >= N || b.y >= N || g.lock[y][x] || g.lock[b.y][b.x]) continue;
        this.swap(g, a, b); const m = this.findMatches(g); let v = 0;
        m.forEach(c => { v += Math.min(g.pol[c.y][c.x], g.env.eff[TYPES[g.tile[c.y][c.x]].id]); });
        this.swap(g, a, b);
        if (m.length && v > bv) { bv = v; best = [a, b]; }
      }
      return best;
    },
    demoSetup(g) { g.order = [ENVS[0], ENVS[1], ENVS[2], ENVS[3]]; g.env = ENVS[0]; g.envPop = null; },
    demo(g) {
      const c = (cell) => ({ x: BX + (cell.x + 0.5) * CS, y: BY + (cell.y + 0.5) * CS });
      return [
        { x: 149, y: 250, say: '환경 카드를 봐요: 기름 오염엔 「기름 분해 미생물」이 효과 커요!', wait: 1.6 },
        { x: () => { g.demoSw = this.bestSwap(g); return g.demoSw ? c(g.demoSw[0]).x : 500; }, y: () => g.demoSw ? c(g.demoSw[0]).y : 400, say: '갈색 오염 칸 위에서 같은 타일 3개가 이어지도록 바꿔요.', wait: 0.3 },
        { x: () => g.demoSw ? c(g.demoSw[1]).x : 500, y: () => g.demoSw ? c(g.demoSw[1]).y : 400, act: () => { if (g.demoSw) this.trySwap(g, g.demoSw[0], g.demoSw[1]); }, wait: 1.5 },
        { x: 892, y: 558, say: '생물로 못 없애는 쓰레기는 「처리 카드」로 치워요.', act: () => { g.cardMode = true; }, wait: 0.6 },
        { x: () => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g.lock[y][x]) return c({ x, y }).x; return 500; }, y: () => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g.lock[y][x]) return c({ x, y }).y; return 400; },
          act: () => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g.lock[y][x]) { this.useCard(g, x, y); return; } }, wait: 1.6 }
      ];
    },
    index(g) { let s = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) s += g.pol[y][x]; return s; },
    reduced(g) { return g.start ? 1 - this.index(g) / g.start : 1; },
    hud(g) { return `오염 감소 ${Math.round(this.reduced(g) * 100)}% / 80% · 남은 턴 ${g.turns}`; },
    hudRight(g) { return `🃏 처리 카드 ${g.cards}`; },
    findMatches(g) {
      const m = [];
      const mark = {};
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (g.lock[y][x]) continue;
        const t = g.tile[y][x];
        let l = 1; while (x + l < N && !g.lock[y][x + l] && g.tile[y][x + l] === t) l++;
        if (l >= 3) { for (let i = 0; i < l; i++) mark[(x + i) + ',' + y] = l; }
        let h = 1; while (y + h < N && !g.lock[y + h][x] && g.tile[y + h][x] === t) h++;
        if (h >= 3) { for (let i = 0; i < h; i++) mark[x + ',' + (y + i)] = Math.max(mark[x + ',' + (y + i)] || 0, h); }
      }
      Object.keys(mark).forEach(k => { const [x, y] = k.split(',').map(Number); m.push({ x, y, len: mark[k] }); });
      return m;
    },
    swap(g, a, b) { const t = g.tile[a.y][a.x]; g.tile[a.y][a.x] = g.tile[b.y][b.x]; g.tile[b.y][b.x] = t; },
    trySwap(g, a, b) {
      if (g.busy > 0 || g.over || g.envPop) return;
      if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) { g.sel = b; return; }
      if (g.lock[a.y][a.x] || g.lock[b.y][b.x]) { g.msg = `「${g.env.block}」은(는) 움직일 수 없어요. 처리 카드를 써요!`; g.sel = null; BPF.audio.sfx('bad'); return; }
      this.swap(g, a, b);
      const m = this.findMatches(g);
      if (!m.length) { this.swap(g, a, b); g.sel = null; g.msg = '이어지는 타일이 없어서 되돌렸어요.'; BPF.audio.sfx('bad'); g.anim.push({ x: a.x, y: a.y, t: 0.3, bad: 1 }, { x: b.x, y: b.y, t: 0.3, bad: 1 }); return; }
      if (g.mode === 'real') g.turns--; g.chain = 0; g.sel = null; g.actions++; g.turnGood = false;
      g.swaps++; if (g.swaps % PER_ENV === 0 && g.envIdx < g.order.length - 1) g.nextEnv = true;
      g.avatar.setState('acting');
      this.resolve(g, m);
    },
    resolve(g, m) {
      g.chain++;
      let cleaned = 0, wasted = 0;
      m.forEach(({ x, y, len }) => {
        const t = TYPES[g.tile[y][x]], e = g.env.eff[t.id];
        if (g.pol[y][x] > 0) {
          if (e > 0) { const before = g.pol[y][x]; g.pol[y][x] = Math.max(0, g.pol[y][x] - e); cleaned += before - g.pol[y][x]; }
          else wasted++;
        }
        if (len >= 4 && e > 0) {
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < N && ny < N && !g.lock[ny][nx] && g.pol[ny][nx] > 0) { const b = g.pol[ny][nx]; g.pol[ny][nx] = Math.max(0, b - e * 0.5); cleaned += b - g.pol[ny][nx]; }
          });
        }
        g.anim.push({ x, y, t: 0.35 });
        g.tile[y][x] = BPF.randi(0, 3);
      });
      const mult = Math.pow(2, g.chain - 1);
      const cx = BX + (m[0].x + 0.5) * CS, cy = BY + (m[0].y + 0.5) * CS;
      if (cleaned > 0) {
        if (!g.turnGood) { g.good++; g.turnGood = true; }
        g.success(Math.round(50 * cleaned * 2 * mult), cx, cy);
        if (g.chain >= 2) ui.floatText(cx, cy - 36, `연쇄 ×${mult}!`, '#ffd84d', 28);
        ui.burst(cx, cy, '#9dff8a', 10);
        g.msg = `정화 성공! 오염 ${cleaned.toFixed(1)} 감소`;
      } else if (wasted > 0) {
        g.msg = '오염 칸이지만 이 환경에서는 효과가 없는 정화 생물이에요! 환경 카드를 확인해요.';
        ui.floatText(cx, cy, '효과 없음', '#ff9a9a', 22);
        if (g.chain === 1) g.avatar.setState('mistake', { line: '이 오염엔 효과가 없네…' });
      } else { g.msg = '오염이 없는 칸에서 이어졌어요. 오염 칸(갈색) 위에서 이어 봐요.'; g.addPoints(10); }
      g.busy = 0.35;
      g.pending = true;
    },
    useCard(g, x, y) {
      if (g.envPop) return;
      if (g.cards <= 0) { g.msg = '처리 카드가 없어요.'; return; }
      if (g.mode === 'real') g.cards--; g.cardMode = false; let c = 0;
      for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) {
        if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
        c += g.pol[yy][xx]; g.pol[yy][xx] = 0; g.lock[yy][xx] = false; g.anim.push({ x: xx, y: yy, t: 0.45 });
      }
      g.actions++; if (c > 0) g.success(Math.round(40 * c), BX + (x + 0.5) * CS, BY + (y + 0.5) * CS); else g.mistake(BX + (x + 0.5) * CS, BY + (y + 0.5) * CS, '빈 곳에 썼어요');
      g.msg = `비생물학적 처리(${g.env.block} 수거·세척)! 오염 ${c.toFixed(1)} 제거`;
      BPF.audio.sfx('dash'); g.flash = 0.15;
      this.checkEnd(g);
    },
    checkEnd(g) {
      if (g.over) return;
      const r = this.reduced(g);
      if (r >= 0.8) { g.finish(true, { achieve: 1, accuracy: g.good / Math.max(1, g.actions), bonus: 0.6 * g.turns / 8 + 0.4 * Math.min(1, g.cards / 3) }); return true; }
      if (g.turns <= 0) { g.finish(false, { achieve: r / 0.8, accuracy: g.good / Math.max(1, g.actions) }, '턴을 다 썼어요'); return true; }
      return false;
    },
    hasMove(g) {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const a = { x, y }, b = { x: x + dx, y: y + dy };
        if (b.x >= N || b.y >= N || g.lock[y][x] || g.lock[b.y][b.x]) continue;
        this.swap(g, a, b); const ok = this.findMatches(g).length > 0; this.swap(g, a, b); if (ok) return true;
      }
      return false;
    },
    // 환경 카드 바꾸기: 화면에 크게 새 환경 카드를 보여 준다
    changeEnv(g) {
      g.nextEnv = false; g.envIdx++; g.env = g.order[g.envIdx]; g.cards++;
      g.envPop = { t: 2.6 }; g.cardMode = false; g.sel = null;
      g.msg = `환경이 「${g.env.name}」(으)로 바뀌었어요! 효과 있는 정화 생물을 다시 확인해요. (처리 카드 +1)`;
      BPF.audio.sfx('win');
    },
    update(g, dt) {
      g.anim.forEach(a => a.t -= dt); g.anim = g.anim.filter(a => a.t > 0);
      if (g.help) { if (I.clicked || I.key('Space') || I.key('Enter') || I.key('Escape')) { if (I.clicked) I.consume(); g.help = false; } return; }
      if (g.envPop) { g.envPop.t -= dt; if (g.envPop.t <= 0 || ((I.clicked || I.key('Space') || I.key('Enter')) && g.envPop.t < 2.1)) { if (I.clicked) I.consume(); g.envPop = null; } return; }
      if (g.nextEnv && g.busy <= 0 && !g.pending && !g.over) { this.changeEnv(g); return; }
      if (g.busy > 0) {
        g.busy -= dt;
        if (g.busy <= 0 && g.pending) {
          const m = this.findMatches(g);
          if (m.length) this.resolve(g, m);
          else {
            g.pending = false;
            if (!this.checkEnd(g) && !this.hasMove(g)) {
              for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!g.lock[y][x]) g.tile[y][x] = BPF.randi(0, 3);
              g.msg = '움직일 수 있는 타일이 없어 섞었어요.';
              const mm = this.findMatches(g); if (mm.length) { g.busy = 0.2; g.pending = true; }
            }
          }
        }
      }
      if (I.key('Space')) { g.cardMode = !g.cardMode && g.cards > 0; g.msg = g.cardMode ? '처리 카드: 오염 칸을 클릭하면 주변 3×3을 처리해요.' : g.msg; }
    },
    draw(g, ctx) {
      // 환경 카드
      ui.panel(ctx, 16, 100, 266, 600, { title: '환경 카드', titleColor: '#2f9e6a' });
      ui.fitWrap(ctx, g.env.name, 149, 124, 240, 30, { size: 22, align: 'center', weight: 'bold', color: '#2f6a4a' });
      const left = PER_ENV - (g.swaps % PER_ENV);
      ui.text(ctx, g.envIdx < g.order.length - 1 ? `환경 ${g.envIdx + 1}/4 · ${left}번 더 바꾸면 다음 환경` : `환경 ${g.envIdx + 1}/4 · 마지막 환경`, 149, 166, { size: 13, color: '#5a8a6a', weight: 'normal' });
      TYPES.forEach((t, i) => {
        const y = 186 + i * 66, e = g.env.eff[t.id];
        ui.round(ctx, 28, y, 242, 58, 12, ui.lighten(t.color, 0.5), '#3a2a6b', 2);
        BPF.drawImg(ctx, t.icon, 32, y + 4, 50, 50);
        ui.text(ctx, t.name, 88, y + 18, { size: 14, align: 'left' });
        ui.text(ctx, e >= 1 ? '✔ 효과 큼' : e > 0 ? '△ 일부 효과' : '✖ 효과 없음', 88, y + 40, { size: 15, align: 'left', color: e >= 1 ? '#2e8a3a' : e > 0 ? '#b07a00' : '#b03040' });
      });
      ui.round(ctx, 28, 454, 242, 50, 12, '#e8e0f0', '#3a2a6b', 2);
      BPF.drawImg(ctx, 'sludge', 32, 456, 46, 46);
      ui.wrap(ctx, `${g.env.block}: 생물로 처리 불가`, 84, 462, 182, { size: 14, weight: 'bold', color: '#5a3a6b' });
      ui.fitWrap(ctx, g.env.tip, 30, 516, 238, 176, { size: 14, lh: 20, color: '#3a5a4a' });
      // 판
      BPF.boardFrame(ctx, BX, BY, N * CS, N * CS, 'rgba(60,110,80,.85)');
      const envBg = null; // 판 배경 그림은 복잡해서 쓰지 않음
      if (envBg) { ctx.drawImage(envBg, BX, BY, N * CS, N * CS); }
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const px = BX + x * CS, py = BY + y * CS, p = g.pol[y][x];
        ctx.fillStyle = (x + y) % 2 ? (envBg ? 'rgba(240,255,240,.62)' : '#dff5e0') : (envBg ? 'rgba(225,250,225,.7)' : '#cfeecf'); ctx.fillRect(px, py, CS, CS);
        if (p > 0) { ctx.fillStyle = `rgba(120,70,30,${0.25 + p * 0.25})`; ctx.fillRect(px, py, CS, CS); }
      }
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const px = BX + x * CS, py = BY + y * CS;
        const an = g.anim.find(a => a.x === x && a.y === y);
        let s = 1, dx = 0;
        if (an) { if (an.bad) dx = Math.sin(an.t * 60) * 5; else s = 0.6 + (0.35 - an.t) * 1.2; }
        if (g.lock[y][x]) { BPF.drawImg(ctx, 'sludge', px + 4, py + 4, CS - 8, CS - 8, { fallbackColor: '#555' }); continue; }
        const t = TYPES[g.tile[y][x]];
        ctx.save(); ctx.translate(px + CS / 2 + dx, py + CS / 2); ctx.scale(s, s);
        ui.round(ctx, -CS / 2 + 4, -CS / 2 + 4, CS - 8, CS - 8, 12, ui.lighten(t.color, 0.25), '#3a2a6b', 2.5);
        BPF.drawImg(ctx, t.icon, -CS / 2 + 9, -CS / 2 + 9, CS - 18, CS - 18, { noFallback: true });
        ctx.restore();
        if (g.sel && g.sel.x === x && g.sel.y === y) ui.round(ctx, px + 1, py + 1, CS - 2, CS - 2, 12, null, '#ff7a00', 5);
      }
      // 입력
      const board = { x: BX, y: BY, w: N * CS, h: N * CS };
      const cellAt = (mx, my) => ({ x: Math.floor((mx - BX) / CS), y: Math.floor((my - BY) / CS) });
      if (g.cardMode && BPF.inRect(I.mx, I.my, board)) {
        const c = cellAt(I.mx, I.my);
        ui.round(ctx, BX + (c.x - 1) * CS, BY + (c.y - 1) * CS, CS * 3, CS * 3, 14, 'rgba(255,220,80,.35)', '#ffd84d', 4);
      }
      if (I.pressedMouse && BPF.inRect(I.px, I.py, board) && !g.cardMode) g.drag = cellAt(I.px, I.py);
      if (I.released && g.drag) {
        const a = g.drag; g.drag = null;
        if (BPF.inRect(I.rx, I.ry, board)) {
          const b = cellAt(I.rx, I.ry);
          if (b.x !== a.x || b.y !== a.y) this.trySwap(g, a, b);
          else if (g.sel && (g.sel.x !== a.x || g.sel.y !== a.y)) this.trySwap(g, g.sel, a);
          else { g.sel = (g.sel && g.sel.x === a.x && g.sel.y === a.y) ? null : a; BPF.audio.sfx('move'); }
        }
        I.consume();
      } else if (g.cardMode && ui.hit(board)) { const c = cellAt(I.cx, I.cy); I.consume(); this.useCard(g, c.x, c.y); }
      // 오른쪽 정보
      const RX = BX + N * CS + 24;
      ui.panel(ctx, RX, 100, 1000 - RX, 600, { title: '정화 현황' });
      const r = this.reduced(g);
      ui.text(ctx, '오염 지수', RX + (1000 - RX) / 2, 140, { size: 18 });
      ui.text(ctx, `${this.index(g).toFixed(1)}`, RX + (1000 - RX) / 2, 176, { size: 34, color: '#8a4a1a' });
      ui.text(ctx, `/ 처음 ${g.start.toFixed(0)}`, RX + (1000 - RX) / 2, 208, { size: 15, color: '#7a6a5a' });
      // 세로 게이지
      const gx = RX + (1000 - RX) / 2 - 22, gy = 230, gh = 220;
      ui.round(ctx, gx, gy, 44, gh, 14, '#4a3a6b', '#3a2a6b', 3);
      ctx.fillStyle = '#47c46b'; ctx.fillRect(gx + 4, gy + 4 + (gh - 8) * (1 - Math.min(1, r)), 36, (gh - 8) * Math.min(1, r));
      ctx.fillStyle = '#ffd84d'; ctx.fillRect(gx - 6, gy + 4 + (gh - 8) * 0.2 - 2, 56, 4);
      ui.text(ctx, '목표 80%', gx + 22, gy + (gh - 8) * 0.2 - 12, { size: 13, color: '#b07a00' });
      ui.text(ctx, `${Math.round(r * 100)}% 감소`, RX + (1000 - RX) / 2, 476, { size: 20, color: '#2e8a3a' });
      ui.text(ctx, `남은 턴 ${g.turns}`, RX + (1000 - RX) / 2, 506, { size: 20, color: g.turns <= 3 ? '#c2185b' : '#3a2a6b' });
      if (!g.envPop && !g.help && ui.button(ctx, RX + 12, 596, 1000 - RX - 24, 40, '❓ 카드 사용법', { color: '#9a8aff', size: 14 })) g.help = true;
      if (ui.button(ctx, RX + 12, 528, 1000 - RX - 24, 60, g.cardMode ? '취소' : `처리 카드 (${g.cards})`, { color: g.cardMode ? '#ff7a7a' : '#ffb648', size: 16, disabled: g.cards <= 0 && !g.cardMode, focus: g.cardMode })) {
        g.cardMode = !g.cardMode; if (g.cardMode) g.msg = '처리 카드: 판에서 처리할 곳을 클릭해요(주변 3×3).';
      }
      // 안내 메시지: 판 아래 넓은 상자 (좁은 오른쪽 패널에서 넘치지 않게)
      ui.round(ctx, BX, BY + N * CS + 8, N * CS, 66, 12, '#fffaf0', '#c9b8ff', 2);
      ui.fitWrap(ctx, g.msg || '', BX + 12, BY + N * CS + 15, N * CS - 24, 52, { size: 15, lh: 20, weight: 'bold', color: '#3a2a6b' });
      if (g.envPop) this.drawEnvPop(g, ctx);
      if (g.help) this.drawHelp(ctx);
    },
    drawHelp(ctx) {
      ctx.save(); ctx.fillStyle = 'rgba(20,12,45,.6)'; ctx.fillRect(0, 72, 1012, 648); ctx.restore();
      const x = 60, y = 96, w = 892, h = 600, cw = (w - 60) / 2, ch = 222;
      ui.panel(ctx, x, y, w, h, { title: '처리 카드 사용법', titleColor: '#2f9e6a' });
      CARD_HELP.forEach((it, i) => {
        const cx = x + 20 + (i % 2) * (cw + 20), cy = y + 40 + Math.floor(i / 2) * (ch + 14);
        ui.round(ctx, cx, cy, cw, ch, 18, ui.lighten(it.color, 0.85), it.color, 4);
        BPF.drawImg(ctx, it.img, cx + 12, cy + 40, 120, 120, { noFallback: true });
        ui.round(ctx, cx + 144, cy + 14, 130, 40, 14, it.color, '#3a2a6b', 3);
        ui.text(ctx, it.name, cx + 209, cy + 34, { size: 20, color: '#fff', outline: '#3a2a6b' });
        ui.fitWrap(ctx, it.tag, cx + 284, cy + 24, cw - 294, 24, { size: 14, color: '#5a4a8b' });
        ui.fitWrap(ctx, it.desc, cx + 144, cy + 66, cw - 160, 146, { size: 17, lh: 25, weight: 'bold', color: '#2d2350' });
      });
      ui.text(ctx, '화면을 누르면 계속해요', x + w / 2, y + h - 28, { size: 18, color: '#7b5cff' });
    },
    drawEnvPop(g, ctx) {
      const e = g.env, k = Math.min(1, (2.6 - g.envPop.t) * 5), sc = 0.7 + 0.3 * BPF.ease(k);
      ctx.save(); ctx.fillStyle = `rgba(20,40,30,${0.55 * k})`; ctx.fillRect(0, 70, 1000, 650);
      ctx.translate(500, 400); ctx.scale(sc, sc);
      ui.round(ctx, -330, -230, 660, 460, 28, '#f4fff4', '#2f6a4a', 7);
      ui.round(ctx, -330, -230, 660, 70, 28, '#2f9e6a');
      ui.text(ctx, `🌍 환경 카드 ${g.envIdx + 1}/4`, 0, -194, { size: 26, color: '#fff', outline: '#1f5a3a' });
      BPF.drawImg(ctx, e.img, -300, -140, 220, 220, { noFallback: true });
      ui.text(ctx, e.name, 110, -110, { size: 36, color: '#2f6a4a' });
      ui.text(ctx, `(${e.kind} 오염)`, 110, -70, { size: 18, color: '#5a8a6a', weight: 'normal' });
      const best = TYPES.filter(t => e.eff[t.id] >= 1), half = TYPES.filter(t => e.eff[t.id] > 0 && e.eff[t.id] < 1);
      const lines = best.length ? best : half;
      ui.text(ctx, best.length ? '✔ 이 환경에 효과 큰 정화 생물' : '△ 일부만 효과 있는 정화 생물', 110, -30, { size: 18, color: best.length ? '#2e8a3a' : '#b07a00' });
      lines.forEach((t, i) => {
        ui.round(ctx, -50 + i * 0, -10 + i * 60, 320, 54, 14, ui.lighten(t.color, 0.4), '#3a2a6b', 3);
        BPF.drawImg(ctx, t.icon, -44, -6 + i * 60, 46, 46, { noFallback: true });
        ui.text(ctx, t.name, 130, 17 + i * 60, { size: 20 });
      });
      ui.fitWrap(ctx, e.tip, -300, 100, 600, 80, { size: 17, lh: 24, color: '#3a5a4a' });
      ui.text(ctx, '화면을 누르면 시작', 0, 205, { size: 16, color: '#7a8a7a', weight: 'normal' });
      ctx.restore();
    }
  });
})();
