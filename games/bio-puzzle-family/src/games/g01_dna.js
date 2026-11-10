/* 01 DNA 짝꿍 맞추기 — 낙하 블록 + 상보 염기쌍 소거 + 연쇄 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  const COLS = 6, ROWS = 10, CS = 58;
  const BX = 300, BY = 92;
  const COLOR = { A: '#ff6fa8', T: '#ffc23d', G: '#47c46b', C: '#3f8cff' };
  const PAIR = { A: 'T', T: 'A', G: 'C', C: 'G' };
  const MULT = [1, 1, 1.2, 1.5, 2, 2.5, 3];
  const OFF = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  function drawBlock(ctx, b, x, y, s, alpha) {
    ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
    const c = COLOR[b];
    const g = ctx.createLinearGradient(0, y, 0, y + s);
    g.addColorStop(0, ui.lighten(c, 0.45)); g.addColorStop(1, c);
    ui.round(ctx, x + 2, y + 2, s - 4, s - 4, 12, g, '#3a2a6b', 3);
    ctx.globalAlpha *= 0.45; ui.round(ctx, x + 8, y + 6, s - 16, s * 0.25, 6, '#fff'); ctx.globalAlpha = alpha != null ? alpha : 1;
    ui.text(ctx, b, x + s / 2, y + s / 2 + 2, { size: s * 0.5, color: '#fff', outline: '#3a2a6b' });
    ctx.restore();
  }
  function rndBase() { return BPF.pick(['A', 'T', 'G', 'C']); }
  function newPiece() {
    const a = rndBase(); let b = rndBase();
    while (PAIR[a] === b) b = rndBase(); // 조각 자체는 짝이 아니게
    return { a, b };
  }

  BPF.defineGame('g01', {
    timeLimit: 90, bg: ['#ffd6ec', '#c9b8ff'], bgKey: 'bg_lab1',
    touchKeys: [
      { label: '◀', code: 'ArrowLeft', x: 1018, y: 560, w: 80, h: 70 }, { label: '▶', code: 'ArrowRight', x: 1186, y: 560, w: 80, h: 70 },
      { label: '▼', code: 'ArrowDown', x: 1102, y: 636, w: 80, h: 70 }, { label: '⟳', code: 'Space', x: 1102, y: 484, w: 80, h: 70 }
    ],
    
    init(g) {
      g.grid = []; for (let r = 0; r < ROWS; r++) g.grid.push(new Array(COLS).fill(null));
      g.pairs = 0; g.goal = 30; g.placed = 0; g.placedClear = 0; g.maxChain = 0;
      g.next = newPiece(); g.fallT = 0; g.st = 'fall'; g.anim = 0; g.marked = []; g.chain = 0;
      g.dasT = 0; g.dasDir = 0; g.dangerWarned = false;
      this.spawn(g);
    },
    spawn(g) {
      const p = g.next; g.next = newPiece();
      g.piece = { x: 2, y: 0, rot: 0, a: p.a, b: p.b };
      if (!this.fits(g, g.piece)) { g.finish(false, { achieve: g.pairs / g.goal, accuracy: this.acc(g), bonus: 0 }, '블록이 가득 찼어요!'); return; }
      g.st = 'fall'; g.fallT = 0;
    },
    cells(p) { const o = OFF[p.rot]; return [[p.x, p.y, p.a], [p.x + o[0], p.y + o[1], p.b]]; },
    fits(g, p) {
      return this.cells(p).every(([x, y]) => x >= 0 && x < COLS && y < ROWS && (y < 0 || !g.grid[y][x]));
    },
    demoSetup(g) {
      g.grid[9][0] = 'T'; g.grid[9][1] = 'C'; g.grid[9][4] = 'G'; g.grid[9][5] = 'A';
      g.piece = { x: 3, y: 0, rot: 1, a: 'A', b: 'G' }; g.next = { a: 'C', b: 'T' }; g.demoHold = true;
    },
    demo(g) {
      const px = () => BX + (g.piece ? g.piece.x : 1) * CS + CS, py = BY + CS / 2;
      return [
        { x: px, y: py, say: '블록 2개가 한 조각으로 떨어져요.', wait: 1.0 },
        { x: () => BX + 2 * CS, y: py, say: '← 키로 왼쪽으로 옮겨요.', act: () => this.tryMove(g, -1, 0), wait: 0.4 },
        { x: () => BX + 1.5 * CS, y: py, act: () => this.tryMove(g, -1, 0), wait: 0.4 },
        { x: () => BX + 1 * CS, y: py, act: () => this.tryMove(g, -1, 0), wait: 0.6 },
        { x: BX + CS, y: BY + 9.5 * CS, say: 'A는 T와, G는 C와 짝이에요. 바닥의 T·C 위에 A·G를 놓아요.', wait: 1.4 },
        { x: BX + CS, y: BY + 3 * CS, say: '↓ 키로 바로 내려요!', act: () => { while (this.tryMove(g, 0, 1)); this.lock(g); }, wait: 1.6 },
        { x: BX + 3 * CS, y: BY + 8 * CS, say: '짝이 맞닿으면 함께 사라져요! 연쇄하면 점수 2배!', wait: 1.6 }
      ];
    },
    acc(g) { return g.placed ? g.placedClear / g.placed : 0; },
    interval(g) { return Math.max(0.22, 0.55 - g.time * 0.0035); },
    update(g, dt) {
      if (g.st === 'clear') {
        g.anim -= dt;
        if (g.anim <= 0) {
          g.marked.forEach(([x, y]) => g.grid[y][x] = null);
          g.marked = [];
          this.gravity(g);
          this.resolve(g);
        }
        return;
      }
      if (g.st !== 'fall' || !g.piece) return;
      const p = g.piece;
      // 이동 (꾹 누르면 반복)
      const dir = (I.held('ArrowLeft') || I.held('KeyA')) ? -1 : (I.held('ArrowRight') || I.held('KeyD')) ? 1 : 0;
      const pressed = I.any('ArrowLeft', 'KeyA') ? -1 : I.any('ArrowRight', 'KeyD') ? 1 : 0;
      if (pressed) { this.tryMove(g, pressed, 0); g.dasT = 0.18; g.dasDir = pressed; }
      else if (dir && dir === g.dasDir) { g.dasT -= dt; if (g.dasT <= 0) { this.tryMove(g, dir, 0); g.dasT = 0.06; } }
      if (I.any('Space', 'ArrowUp', 'KeyW', 'KeyZ')) {
        const np = Object.assign({}, p, { rot: (p.rot + 1) % 4 });
        if (this.fits(g, np)) g.piece = np;
        else { np.x += (np.rot === 1 ? -1 : 1); if (this.fits(g, np)) g.piece = np; }
        BPF.audio.sfx('move'); g.avatar.setState('acting');
      }
      // 마우스: 판 위 클릭 → 그 열로 이동, 우클릭 없이 클릭 = 회전은 버튼으로
      if (I.clicked && !I.consumed && BPF.inRect(I.cx, I.cy, { x: BX, y: BY, w: COLS * CS, h: ROWS * CS })) {
        const col = Math.floor((I.cx - BX) / CS);
        let guard = 6; while (g.piece.x < col && guard--) this.tryMove(g, 1, 0);
        guard = 6; while (g.piece.x > col && guard--) this.tryMove(g, -1, 0);
      }
      if (I.any('ArrowDown', 'KeyS')) { while (this.tryMove(g, 0, 1)); this.lock(g); return; } // ↓ 바로 낙하
      if (g.demoHold) return; // 시범 중에는 자동 낙하 멈춤
      g.fallT += dt;
      if (g.fallT >= this.interval(g)) {
        g.fallT = 0;
        if (!this.tryMove(g, 0, 1)) this.lock(g);
      }
    },
    tryMove(g, dx, dy) {
      const np = Object.assign({}, g.piece, { x: g.piece.x + dx, y: g.piece.y + dy });
      if (this.fits(g, np)) { g.piece = np; if (dx) { BPF.audio.sfx('move'); g.avatar.setState('acting'); } return true; }
      return false;
    },
    lock(g) {
      const cs = this.cells(g.piece);
      if (cs.some(([x, y]) => y < 0)) { g.finish(false, { achieve: g.pairs / g.goal, accuracy: this.acc(g) }, '블록이 가득 찼어요!'); return; }
      cs.forEach(([x, y, b]) => g.grid[y][x] = b);
      g.piece = null; g.placed++; g.chain = 0; g.clearedThisLock = false;
      BPF.audio.sfx('pop');
      this.gravity(g);
      this.resolve(g);
    },
    gravity(g) {
      for (let x = 0; x < COLS; x++) {
        let w = ROWS - 1;
        for (let y = ROWS - 1; y >= 0; y--) if (g.grid[y][x]) { const b = g.grid[y][x]; g.grid[y][x] = null; g.grid[w][x] = b; w--; }
      }
    },
    resolve(g) {
      const used = {}; const marked = [];
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const b = g.grid[y][x]; if (!b || used[x + ',' + y]) continue;
        const nb = [[x + 1, y], [x, y + 1], [x - 1, y], [x, y - 1]];
        for (const [nx, ny] of nb) {
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
          const c = g.grid[ny][nx];
          if (c && PAIR[b] === c && !used[nx + ',' + ny]) { used[x + ',' + y] = used[nx + ',' + ny] = 1; marked.push([x, y], [nx, ny]); break; }
        }
      }
      if (marked.length) {
        g.chain++; g.maxChain = Math.max(g.maxChain, g.chain);
        const n = marked.length / 2;
        g.pairs += n;
        if (!g.clearedThisLock) { g.placedClear++; g.clearedThisLock = true; }
        const mult = MULT[Math.min(g.chain, MULT.length - 1)];
        const cx = BX + (marked[0][0] + 0.5) * CS, cy = BY + (marked[0][1] + 0.5) * CS;
        g.success(100 * n * mult, cx, cy);
        if (g.chain >= 2) { ui.floatText(cx, cy - 40, `${g.chain}연쇄! ×${mult}`, '#ffd84d', 30); g.avatar.setState('combo', { combo: g.combo }); }
        g.marked = marked; g.st = 'clear'; g.anim = 0.3;
        if (g.pairs >= g.goal) {
          g.marked.forEach(([x, y]) => g.grid[y][x] = null);
          g.finish(true, { achieve: 1, accuracy: this.acc(g), bonus: 0.5 * g.timeLeft / 60 + 0.5 * Math.min(1, g.maxChain / 4) });
        }
        return;
      }
      // 연쇄 끝
      if (!g.clearedThisLock) { g.combo = 0; g.avatar.combo = 0; }
      // 위험 경고
      const high = g.grid[2].some(Boolean);
      if (high && !g.dangerWarned) { g.dangerWarned = true; g.mistake(BX + COLS * CS / 2, BY + 60, '위험해!'); g.mistakes--; }
      if (!high) g.dangerWarned = false;
      this.spawn(g);
    },
    onTimeUp(g) { g.finish(g.pairs >= g.goal, { achieve: g.pairs / g.goal, accuracy: this.acc(g), bonus: Math.min(1, g.maxChain / 4) * 0.5 }, '시간 종료!'); },
    hud(g) { return `소거한 쌍 ${g.pairs} / ${g.goal}`; },
    draw(g, ctx) {
      // 범례
      ui.panel(ctx, 30, 100, 236, 260, { title: '짝 규칙' });
      drawBlock(ctx, 'A', 60, 135, 56); ui.text(ctx, '—', 148, 163, { size: 30 }); drawBlock(ctx, 'T', 180, 135, 56);
      drawBlock(ctx, 'G', 60, 205, 56); ui.text(ctx, '—', 148, 233, { size: 30 }); drawBlock(ctx, 'C', 180, 205, 56);
      ui.wrap(ctx, '맞닿은 상보 염기쌍이\n함께 사라져요!', 148, 278, 210, { size: 16, align: 'center', weight: 'bold', color: '#7b3fd6' });
      ui.panel(ctx, 30, 390, 236, 300, { title: '기록' });
      ui.text(ctx, `쌍: ${g.pairs} / ${g.goal}`, 148, 440, { size: 22, color: '#c2185b' });
      ui.gauge(ctx, 50, 465, 196, 26, g.pairs, g.goal, '#ff6fa8');
      ui.text(ctx, `최대 연쇄: ${g.maxChain}`, 148, 520, { size: 20 });
      ui.text(ctx, `콤보: ${g.combo}`, 148, 555, { size: 20 });
      ui.wrap(ctx, '←→ 이동 ↓ 바로 낙하\nSpace/↑ 회전\n판 클릭: 그 열로 이동', 148, 585, 210, { size: 15, align: 'center', color: '#5a4a8b' });
      // 판
      BPF.boardFrame(ctx, BX, BY, COLS * CS, ROWS * CS);
      ctx.save();
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        ctx.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.12)';
        ctx.fillRect(BX + x * CS, BY + y * CS, CS, CS);
      }
      ctx.restore();
      // 위험선
      ctx.save(); ctx.strokeStyle = 'rgba(255,90,120,.7)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(BX, BY + 2 * CS); ctx.lineTo(BX + COLS * CS, BY + 2 * CS); ctx.stroke(); ctx.restore();
      const mk = {}; g.marked.forEach(([x, y]) => mk[x + ',' + y] = 1);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const b = g.grid[y][x]; if (!b) continue;
        if (mk[x + ',' + y]) {
          const s = 1 + (0.3 - g.anim) * 1.5;
          ctx.save(); ctx.translate(BX + x * CS + CS / 2, BY + y * CS + CS / 2); ctx.scale(s, s);
          drawBlock(ctx, b, -CS / 2, -CS / 2, CS, Math.max(0, g.anim / 0.3));
          ctx.restore();
        } else drawBlock(ctx, b, BX + x * CS, BY + y * CS, CS);
      }
      // 내려오는 조각 + 그림자
      if (g.piece && g.st === 'fall') {
        let gp = Object.assign({}, g.piece); while (this.fits(g, Object.assign({}, gp, { y: gp.y + 1 }))) gp.y++;
        this.cells(gp).forEach(([x, y, b]) => { if (y >= 0) drawBlock(ctx, b, BX + x * CS, BY + y * CS, CS, 0.25); });
        this.cells(g.piece).forEach(([x, y, b]) => { if (y >= 0) drawBlock(ctx, b, BX + x * CS, BY + y * CS, CS); });
      }
      // 다음 조각
      const nx = BX + COLS * CS + 34;
      ui.panel(ctx, nx, 100, 150, 190, { title: '다음' });
      drawBlock(ctx, g.next.a, nx + 46, 190, 58); drawBlock(ctx, g.next.b, nx + 46, 132, 58);
      // 회전 버튼(마우스용)
      if (ui.button(ctx, nx, 320, 150, 56, '↻ 회전', { color: '#7b5cff' }) && g.st === 'fall' && g.piece) {
        const np = Object.assign({}, g.piece, { rot: (g.piece.rot + 1) % 4 }); if (this.fits(g, np)) g.piece = np;
      }
      if (ui.button(ctx, nx, 390, 150, 56, '⬇ 내리기', { color: '#3fb6d6' }) && g.st === 'fall' && g.piece) {
        while (this.tryMove(g, 0, 1)); this.lock(g);
      }
    }
  });
})();
