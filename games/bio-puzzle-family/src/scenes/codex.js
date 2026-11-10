/* 생명기술 도감 — 개념 카드, 전통 육종 vs GMO, 연금술 발견 도감, 기록·배지 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  const TABS = ['개념 카드', '품종 개량 vs GMO', '융합 기술 도감', '기록·배지'];
  const GC = { 'S': '#ff5fa0', 'A': '#ff9a00', 'B': '#3f8cff', 'C': '#47c46b', 'D': '#9a90b0' };
  BPF.scenes.codex = {
    enter(p) { this.back = p.back || 'village'; this.tab = p.tab || 0; this.sel = 0; BPF.audio.bgm('codex'); },
    update() {
      if (I.key('Escape')) BPF.go(this.back, { from: 'codex' });
      if (I.key('Tab')) this.tab = (this.tab + 1) % 4;
    },
    draw(ctx) {
      const d = BPF.save.data;
      ui.bg(ctx, '#d8f5e0', '#cfe0ff');
      ui.topBar(ctx, '도서관 · 생명기술 도감', 150);
      if (ui.button(ctx, 1120, 14, 140, 44, '돌아가기', { color: '#8a7dff', size: 18 })) BPF.go(this.back, { from: 'codex' });
      TABS.forEach((t, i) => { if (ui.button(ctx, 20 + i * 210, 76, 200, 46, t, { color: i === this.tab ? '#ff5fa0' : '#b8a8e8', size: 18, focus: i === this.tab })) this.tab = i; });
      if (ui.button(ctx, 1060, 76, 200, 46, '📖 엔딩 앨범', { color: '#ffb648', size: 18 })) BPF.go('album', { back: 'codex' });
      [this.lessons, this.compare, this.alchemy, this.records][this.tab].call(this, ctx, d);
    },
    lessons(ctx, d) {
      BPF_DATA.games.forEach((G, i) => {
        const x = 20 + (i % 2) * 300, y = 136 + Math.floor(i / 2) * 114;
        const open = !!d.codex.lessons[G.id], sel = this.sel === i;
        const r = { x, y, w: 290, h: 104 };
        ui.round(ctx, x, y, 290, 104, 14, sel ? '#fff3c4' : open ? '#fff' : '#e8e4f0', sel ? '#ff7a00' : '#3a2a6b', sel ? 4 : 2);
        BPF.drawImg(ctx, G.icon, x + 8, y + 12, 80, 80);
        ui.wrap(ctx, open ? BPF_DATA.lessons[G.id].title : '???', x + 96, y + 18, 186, { size: 17, weight: 'bold', color: open ? '#3a2a6b' : '#9a90b0' });
        ui.text(ctx, G.no + ' ' + G.short, x + 96, y + 84, { size: 13, align: 'left', color: '#7a6a99', weight: 'normal' });
        if (ui.hit(r)) { I.consume(); this.sel = i; BPF.audio.sfx('move'); }
      });
      const G = BPF_DATA.games[this.sel], L = BPF_DATA.lessons[G.id], open = !!d.codex.lessons[G.id];
      ui.panel(ctx, 640, 136, 620, 560, { title: open ? L.title : '아직 모르는 개념' });
      BPF.drawImg(ctx, G.icon, 660, 160, 120, 120);
      ui.text(ctx, `${G.no} ${G.title}`, 800, 200, { size: 22, align: 'left', color: G.color, outline: '#3a2a6b', ow: 3 });
      if (open) {
        let y = 300;
        L.points.forEach(p => { ui.text(ctx, '📌', 670, y + 12, { size: 18 }); y += ui.wrap(ctx, p, 700, y, 530, { size: 18, lh: 27 }) + 14; });
      } else ui.wrap(ctx, '이 미니게임을 한 번 플레이하면 개념 카드가 열려요!', 670, 320, 560, { size: 19, color: '#7a6a99' });
    },
    compare(ctx) {
      const C = BPF_DATA.compare;
      ui.panel(ctx, 20, 140, 1240, 470, { title: C.title, titleColor: '#7b5cff' });
      const cols = [40, 260, 760], ws = [210, 490, 480];
      ui.round(ctx, 260, 170, 490, 50, 12, '#5fbf3f', '#3a2a6b', 3); ui.text(ctx, '🌾 교배·선발 품종 개량', 505, 196, { size: 21, color: '#fff', outline: '#3a2a6b' });
      ui.round(ctx, 760, 170, 480, 50, 12, '#7b5cff', '#3a2a6b', 3); ui.text(ctx, '🧬 유전자 변형 생물체(GMO)', 1000, 196, { size: 21, color: '#fff', outline: '#3a2a6b' });
      C.rows.forEach((row, i) => {
        const y = 232 + i * 74;
        row.forEach((c, k) => {
          ui.round(ctx, cols[k], y, ws[k], 66, 10, k === 0 ? '#ffe9a8' : '#fffaf0', '#c9b8ff', 2);
          ui.wrap(ctx, c, cols[k] + ws[k] / 2, y + (c.length > 26 ? 10 : 22), ws[k] - 20, { size: k === 0 ? 19 : 17, align: 'center', weight: k === 0 ? 'bold' : 'normal', lh: 23 });
        });
      });
      ui.round(ctx, 20, 622, 1240, 80, 14, '#fff3f6', '#ff8fb8', 3);
      ui.wrap(ctx, '⚖ 기억해요: 유전자 변형 생물체는 안전성 문제와 생태계 교란 우려가 있어요. 무조건 찬성·반대하기보다 작물과 형질마다 안전성과 환경 영향을 꼼꼼히 확인해요. (교과서 215쪽·222쪽)', 40, 634, 1200, { size: 17, lh: 26, weight: 'bold', color: '#7a2a4a' });
    },
    alchemy(ctx, d) {
      const R = BPF_DATA.alchemy.recipes;
      const n = R.filter(r => d.codex.alchemy[r.id]).length;
      ui.text(ctx, `융합 기술 발견 도감 ${n} / ${R.length}`, 640, 146, { size: 22, color: '#7b3fd6' });
      R.forEach((r, i) => {
        const x = 30 + (i % 3) * 412, y = 170 + Math.floor(i / 3) * 176;
        const got = !!d.codex.alchemy[r.id];
        ui.round(ctx, x, y, 400, 164, 16, got ? '#fff' : '#e8e4f0', '#3a2a6b', 3);
        if (got) BPF.drawImg(ctx, r.icon, x + 12, y + 20, 110, 110); else BPF.drawSilhouette(ctx, r.icon, x + 12, y + 20, 110, 110, '#9a90c0');
        ui.text(ctx, got ? r.name : '???', x + 134, y + 30, { size: 22, align: 'left', color: got ? '#3a2a6b' : '#9a90b0' });
        if (got) {
          const C = BPF_DATA.alchemy.cards;
          const nm = (list, id) => list.find(c => c.id === id).name;
          ui.text(ctx, `${nm(C.field, r.field)} + ${r.tech.map(t => nm(C.tech, t)).join(' + ')}` + (r.pool && r.pool.length > 2 ? ' 등' : ''), x + 134, y + 58, { size: 13, align: 'left', color: '#c2185b' });
          ui.fitWrap(ctx, r.hint + (r.pool && r.pool.length > 2 ? ` (함께 쓸 수 있는 기술: ${r.pool.map(t => nm(C.tech, t)).join('·')})` : ''), x + 134, y + 74, 254, 84, { size: 14, lh: 19 });
          ui.star(ctx, x + 375, y + 24, 14, '#ffd84d');
        } else ui.wrap(ctx, '단서: ' + r.clue, x + 134, y + 60, 254, { size: 15, color: '#7a6a99' });
      });
    },
    records(ctx, d) {
      BPF_DATA.games.forEach((G, i) => {
        const x = 30 + (i % 5) * 246, y = 140 + Math.floor(i / 5) * 200, b = d.best[G.id];
        ui.round(ctx, x, y, 234, 188, 16, b.clears ? '#fff' : '#ece8f4', '#3a2a6b', 3);
        // 배지
        ctx.save(); ctx.translate(x + 60, y + 70);
        ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.lineTo(Math.cos(a) * 46, Math.sin(a) * 46); } ctx.closePath();
        ctx.fillStyle = b.clears ? G.color : '#c8c0d8'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#3a2a6b'; ctx.stroke();
        ctx.restore();
        BPF.drawImg(ctx, G.icon, x + 30, y + 40, 60, 60, { alpha: b.clears ? 1 : 0.35, noFallback: true });
        ui.text(ctx, G.short, x + 160, y + 40, { size: 17 });
        if (b.grade) { ui.text(ctx, b.grade, x + 160, y + 82, { size: 40, color: GC[b.grade], outline: '#3a2a6b' }); }
        else ui.text(ctx, '-', x + 160, y + 82, { size: 34, color: '#b8b0c8' });
        ui.text(ctx, `${b.points.toLocaleString()}점`, x + 117, y + 136, { size: 16, color: '#c2185b' });
        ui.text(ctx, `플레이 ${b.plays} · 클리어 ${b.clears}`, x + 117, y + 162, { size: 13, color: '#7a6a99', weight: 'normal' });
      });
      // 마스터 배지 & 랭크
      const cleared = BPF.save.clearedCount();
      const sCount = BPF_DATA.games.filter(G => d.best[G.id].grade === 'S').length;
      const total = BPF_DATA.games.reduce((s, G) => s + d.best[G.id].score, 0);
      const rank = total >= 85000 ? '수석 연구원' : total >= 65000 ? '선임 연구원' : total >= 40000 ? '연구원' : total >= 15000 ? '보조 연구원' : '견습 연구원';
      ui.panel(ctx, 30, 560, 1220, 140, {});
      ui.star(ctx, 100, 630, 44, cleared >= 10 ? '#ffd84d' : '#d0c8e0');
      ui.text(ctx, cleared >= 10 ? '마스터 배지 획득!' : `마스터 배지: 10종 모두 클리어 (${cleared}/10)`, 170, 600, { size: 22, align: 'left', color: '#3a2a6b' });
      ui.text(ctx, `연구원 랭크: ${rank}  ·  등급 점수 합계 ${total.toLocaleString()} / 100,000  ·  S등급 ${sCount}개`, 170, 640, { size: 18, align: 'left', color: '#7b3fd6' });
      ui.text(ctx, `인증: ${d.certs.gmoBasic ? '🏅 GMO 기초 인증' : '⬜ GMO 기초 인증'}   ${d.certs.gmoSafety ? '🏅 GMO 안전성 인증' : '⬜ GMO 안전성 인증'}`, 170, 674, { size: 17, align: 'left' });
    }
  };
})();
