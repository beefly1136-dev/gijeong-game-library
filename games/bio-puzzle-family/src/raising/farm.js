/* 육성 농장 — 애정·건강·매력·지식, 5단계 성장, 진화 연출, 동행 변경 */
(function () {
  'use strict';
  const BPF = window.BPF, ui = BPF.ui, I = BPF.Input;
  const STAT = [['love', '애정', '#ff6fa8'], ['health', '건강', '#47c46b'], ['charm', '매력', '#ffb648'], ['know', '지식', '#3fb6d6']];
  const ACT = ['feed', 'study', 'decorate', 'pet'];
  const ACT_LABEL = { feed: '먹이 주기', study: '연구 놀이', decorate: '꾸미기', pet: '쓰다듬기' };
  const ACT_COLOR = { feed: '#47c46b', study: '#3fb6d6', decorate: '#ffb648', pet: '#ff6fa8' };
  const ACT_ICON = { feed: 'res_food', study: 'res_research', decorate: 'res_decor', pet: 'fx_heart' };
  const ACT_POSE = { feed: 'eat', study: 'study', decorate: 'happy', pet: 'happy' };
  const SAY = { feed: ['냠냠!', '맛있어!'], pet: ['헤헤~', '좋아좋아!'], study: ['궁금해!', '오오, 신기해!'], decorate: ['예쁘지?', '반짝반짝!'] };

  BPF.scenes.farm = {
    enter(p) {
      this.back = p.back || 'village';
      const d = BPF.save.data;
      this.cur = d.companionId || BPF.save.adoptedPets()[0];
      this.hop = 0; this.say = null; this.evo = null; this.pickTab = !!p.pickTab; this.pose = null; this.idle = 0; this.edit = false; this.drag = null;
      BPF.audio.bgm('farm');
      if (!this.cur) { BPF.go('adopt', { back: 'farm' }); }
    },
    update(dt) {
      this.hop = Math.max(0, this.hop - dt);
      if (this.pose) { this.pose.t -= dt; if (this.pose.t <= 0) this.pose = null; }
      this.idle += dt; if (I.clicked || Object.keys(I.pressed || {}).length) this.idle = 0;
      if (this.say) { this.say.t -= dt; if (this.say.t <= 0) this.say = null; }
      if (this.evo) { this.evo.t += dt; if (this.evo.t > 3.6 && (I.confirm() || this.evo.t > 7)) this.endEvo(); return; }
      if (ui.modal) return;
      if (I.key('Escape')) BPF.go(this.back, { from: 'farm' });
      ['Digit1', 'Digit2', 'Digit3', 'Digit4'].forEach((k, i) => { if (I.key(k)) this.act(ACT[i]); });
    },
    act(a) {
      const r = BPF.progress.interact(this.cur, a);
      if (!r.ok) {
        BPF.audio.sfx('bad');
        if (r.need) ui.confirm('재료가 부족해요', r.msg + '\n\n미니게임 센터로 갈까요?', () => BPF.go('gamecenter'), { yes: '게임하러 가기', no: '나중에' });
        else BPF.toast(r.msg, '#7a5a2a');
        return;
      }
      BPF.toast(r.msg, r.soft ? '#7a5a8a' : '#2e8a3a');
      this.hop = 0.6; this.say = { text: BPF.pick(SAY[a]), t: 1.6 }; this.pose = { k: ACT_POSE[a], t: 1.8 }; this.idle = 0;
      BPF.audio.sfx(a === 'pet' ? 'pop' : 'ok');
      ui.burst(320, 380, a === 'pet' ? '#ff8fd0' : a === 'feed' ? '#9dff8a' : a === 'study' ? '#7be0ff' : '#ffd84d', 16, { star: a !== 'feed' });
    },
    /* 장식 배치 모드: 상점에서 산 장식을 끌어다 방에 놓기 */
    drawEdit(ctx, d, list, RX, RY, RW, RH) {
      const TY = RY + RH - 84, TH = 76;
      const tray = { x: RX + 8, y: TY, w: RW - 16, h: TH };
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.setLineDash([10, 8]); ctx.lineWidth = 3;
      ui.path(ctx, RX + 6, RY + 6, RW - 12, RH - 12, 20); ctx.stroke(); ctx.restore();
      ui.round(ctx, tray.x, tray.y, tray.w, tray.h, 14, 'rgba(255,250,240,.95)', '#3a2a6b', 3);
      const owned = d.inventory.decor.filter(o => !list.some(p => p.id === o));
      if (!d.inventory.decor.length) ui.text(ctx, '아직 장식이 없어요. 발효 상점에서 사 오세요!', tray.x + tray.w / 2, tray.y + TH / 2, { size: 16, color: '#7a6a99' });
      else if (!owned.length) ui.text(ctx, '모든 장식을 놓았어요! 놓은 장식을 이 상자로 끌면 치워요.', tray.x + tray.w / 2, tray.y + TH / 2, { size: 15, color: '#7a6a99' });
      const slotR = i => ({ x: tray.x + 10 + i * 66, y: tray.y + 6, w: 62, h: 64 });
      owned.forEach((oid, i) => {
        const it = BPF.DECOR.find(x => x.id === oid); if (!it) return;
        const r = slotR(i);
        if (this.drag && this.drag.from === 'tray' && this.drag.id === oid) return;
        ui.round(ctx, r.x, r.y, r.w, r.h, 10, ui.hover(r) ? '#fff3a8' : '#fff', '#c9b8ff', 2);
        BPF.drawImg(ctx, it.icon, r.x + 4, r.y + 4, r.w - 8, r.h - 8, { noFallback: true });
        if (I.pressedMouse && BPF.inRect(I.px, I.py, r) && !this.drag) this.drag = { id: oid, from: 'tray', sx: I.px, sy: I.py };
      });
      // 놓인 장식 집기
      if (I.pressedMouse && !this.drag) {
        for (let i = list.length - 1; i >= 0; i--) {
          const p = list[i], r = { x: RX + p.x - 45, y: RY + p.y - 95, w: 90, h: 95 };
          if (BPF.inRect(I.px, I.py, r)) { this.drag = { id: p.id, from: 'room', idx: i, sx: I.px, sy: I.py }; break; }
        }
      }
      if (this.drag) {
        const it = BPF.DECOR.find(x => x.id === this.drag.id);
        if (it) { ctx.save(); ctx.globalAlpha = 0.85; BPF.drawImg(ctx, it.icon, I.mx - 50, I.my - 90, 100, 100, { noFallback: true, align: 'bottom' }); ctx.restore(); }
        if (I.released) {
          const inRoom = BPF.inRect(I.rx, I.ry, { x: RX, y: RY, w: RW, h: RH }) && !BPF.inRect(I.rx, I.ry, tray);
          const tap = Math.hypot(I.rx - this.drag.sx, I.ry - this.drag.sy) < 10;
          const pos = { x: BPF.clamp(I.rx - RX, 50, RW - 50), y: BPF.clamp(I.ry - RY + 10, 110, RH - 90) };
          if (this.drag.from === 'tray') {
            if (inRoom) list.push({ id: this.drag.id, x: pos.x, y: pos.y });
            else if (tap) list.push({ id: this.drag.id, x: 120 + (list.length % 5) * 95, y: RH - 100 }); // 탭하면 바닥에 놓기
            BPF.audio.sfx('pop');
          } else if (this.drag.from === 'room') {
            if (inRoom) { list[this.drag.idx].x = pos.x; list[this.drag.idx].y = pos.y; }
            else if (!tap) { list.splice(this.drag.idx, 1); BPF.audio.sfx('move'); }
          }
          this.drag = null; I.consume(); BPF.save.write('decor');
        }
      }
    },
    startEvo() {
      const id = this.cur, pet = BPF.save.data.pets[id], from = pet.stage;
      if (!BPF.progress.evolve(id)) return;
      this.evo = { id, from, to: pet.stage, t: 0 };
      BPF.audio.sfx('pet_evo');
    },
    endEvo() {
      const e = this.evo; this.evo = null;
      const D = BPF_DATA.pets[e.id], pet = BPF.save.data.pets[e.id];
      if (e.to === 5) {
        ui.alert(`${pet.name}의 엔딩`, D.ending + '\n\n(도서관에서 엔딩 앨범을 다시 볼 수 있어요)', () => BPF.go('album', { back: 'farm', pet: e.id, ending: true }));
      } else BPF.toast(`${pet.name}이(가) ${e.to}단계 「${D.stages[e.to - 1]}」(으)로 성장했어요!`, '#c2185b');
    },
    draw(ctx) {
      const d = BPF.save.data, id = this.cur; if (!id) return;
      const pet = d.pets[id], D = BPF_DATA.pets[id];
      // 방 배경 (단계에 따라 화려해짐)
      ui.bg(ctx, D.bg[0], D.bg[1]);
      ui.topBar(ctx, '육성 농장', 150);
      if (ui.button(ctx, 1120, 14, 140, 44, '마을로', { color: '#8a7dff', size: 18 })) BPF.go(this.back, { from: 'farm' });
      // 탭
      const adopted = BPF.save.adoptedPets(), slots = BPF.progress.slots();
      adopted.forEach((pid, i) => {
        const P = d.pets[pid], sel = pid === id, x = 20 + i * 190;
        if (ui.button(ctx, x, 78, 180, 48, `${P.name}${d.companionId === pid ? ' ★' : ''}`, { color: sel ? BPF_DATA.pets[pid].color : '#c8bfe0', size: 18, focus: sel })) { this.cur = pid; BPF.audio.sfx('move'); }
      });
      if (adopted.length < 4) {
        const x = 20 + adopted.length * 190;
        const can = adopted.length < slots;
        if (ui.button(ctx, x, 78, 180, 48, can ? '+ 새 입양' : `🔒 입양 슬롯 ${slots}`, { color: '#ff5fa0', size: 17, disabled: !can })) BPF.go('adopt', { back: 'farm' });
      }
      if (this.pickTab) ui.text(ctx, '◀ 탭을 눌러 고른 뒤 [동행하기]', 20 + Math.min(4, adopted.length + 1) * 190 + 10, 102, { size: 15, align: 'left', color: '#c2185b' });
      // 방
      const RX = 20, RY = 136, RW = 620, RH = 430;
      const rg = ctx.createLinearGradient(0, RY, 0, RY + RH);
      rg.addColorStop(0, ui.lighten(D.color, 0.8 - pet.stage * 0.04)); rg.addColorStop(0.62, ui.lighten(D.color, 0.9)); rg.addColorStop(0.62, '#e8d2a8'); rg.addColorStop(1, '#d4b47e');
      ui.round(ctx, RX, RY, RW, RH, 24, rg, '#3a2a6b', 4);
      ctx.save(); ui.path(ctx, RX, RY, RW, RH, 24); ctx.clip();
      const room = BPF.assets.get('room_' + id);
      if (room) {
        // 방 그림(16:9)을 방 상자에 꽉 차게
        const sc = Math.max(RW / room.width, RH / room.height), w = room.width * sc, h = room.height * sc;
        ctx.drawImage(room, RX + (RW - w) / 2, RY + (RH - h) / 2, w, h);
      } else {
        // 창문
        ui.round(ctx, RX + 40, RY + 30, 140, 110, 12, '#bfe8ff', '#3a2a6b', 3);
        ctx.strokeStyle = '#3a2a6b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(RX + 110, RY + 30); ctx.lineTo(RX + 110, RY + 140); ctx.moveTo(RX + 40, RY + 85); ctx.lineTo(RX + 180, RY + 85); ctx.stroke();
      }
      ctx.restore(); ui.round(ctx, RX, RY, RW, RH, 24, null, '#3a2a6b', 4);
      ctx.save(); ui.path(ctx, RX, RY, RW, RH, 24); ctx.clip();
      if (pet.stage >= 3) { ui.round(ctx, RX + RW - 200, RY + 40, 150, 60, 10, '#fff3c4', '#3a2a6b', 2); ui.text(ctx, `${pet.name}의 방`, RX + RW - 125, RY + 70, { size: 18, color: D.color, outline: '#3a2a6b', ow: 3 }); }
      // 장식: 플레이어가 직접 놓은 위치에 그린다 (방마다 따로)
      const placed = d.inventory.placed || (d.inventory.placed = {});
      const list = placed[id] || (placed[id] = []);
      list.forEach((pd, i) => {
        if (this.drag && this.drag.from === 'room' && this.drag.idx === i) return;
        const it = BPF.DECOR.find(x => x.id === pd.id);
        if (it) BPF.drawImg(ctx, it.icon, RX + pd.x - 50, RY + pd.y - 100, 100, 100, { noFallback: true, align: 'bottom' });
      });
      if (pet.stage >= 4) for (let k = 0; k < 6; k++) ui.star(ctx, RX + 60 + k * 100, RY + 170 + Math.sin(BPF.time * 2 + k) * 10, 7, '#ffe680', false);
      ctx.restore();
      // 동물
      const size = 210 + pet.stage * 32;
      const hop = this.hop > 0 ? Math.abs(Math.sin(this.hop * 14)) * 30 : 0;
      ctx.save(); ctx.translate(0, -hop);
      // 돌봄 직후엔 행동 스티커(먹기·공부·기쁨), 오래 가만히 두면 잠자기
      const poseKey = this.pose ? `pet_${id}_act_${this.pose.k}` : this.idle > 15 ? `pet_${id}_act_sleep` : null;
      if (!(poseKey && BPF.drawImg(ctx, poseKey, RX + RW / 2 - 150, RY + RH - 340, 300, 300, { noFallback: true, align: 'bottom' })))
        BPF.drawPet(ctx, id, pet.stage, RX + RW / 2, RY + RH - 40, Math.min(400, size));
      if (!this.pose && this.idle > 15) ui.text(ctx, 'Zzz… (클릭하면 깨어나요)', RX + RW / 2, RY + 40, { size: 16, color: '#fff', outline: '#3a2a6b' });
      ctx.restore();
      const petRect = { x: RX + RW / 2 - 140, y: RY + RH - 40 - size, w: 280, h: size };
      if (this.edit) this.drawEdit(ctx, d, list, RX, RY, RW, RH);
      else if (ui.hit(petRect) && !this.evo) { I.consume(); this.act('pet'); }
      if (!this.evo && ui.button(ctx, RX + 12, RY + 12, 158, 40, this.edit ? '✔ 배치 끝' : '🪑 장식 배치', { color: this.edit ? '#47c46b' : '#ff9a4d', size: 16, focus: this.edit })) {
        this.edit = !this.edit; this.drag = null; BPF.save.write('decor');
        if (this.edit) BPF.toast('아래 상자에서 장식을 끌어 방에 놓아요. 놓은 장식을 상자로 끌면 치워요.');
      }
      if (this.say) {
        ui.round(ctx, RX + RW / 2 + 60, RY + 40, 160, 50, 20, '#fff', '#3a2a6b', 3);
        ui.text(ctx, this.say.text, RX + RW / 2 + 140, RY + 66, { size: 20, color: D.color, outline: '#3a2a6b', ow: 3 });
      }
      // 정보 패널
      const PX = 660, PY = 136, PW = 600;
      ui.panel(ctx, PX, PY, PW, 430, {});
      ui.text(ctx, pet.name, PX + 24, PY + 32, { size: 30, align: 'left', color: D.color, outline: '#3a2a6b', ow: 4 });
      ui.text(ctx, `${D.kind} · ${pet.stage}단계 「${D.stages[pet.stage - 1]}」`, PX + 24, PY + 66, { size: 17, align: 'left', color: '#5a4a8b' });
      BPF.drawImg(ctx, `pet_${id}_${pet.stage}`, PX + PW - 90, PY + 10, 76, 76);
      const nextXp = pet.stage < 5 ? BPF_DATA.growth[pet.stage + 1].xp : 1100;
      ui.text(ctx, 'XP', PX + 24, PY + 99, { size: 16, align: 'left' });
      ui.gauge(ctx, PX + 60, PY + 88, PW - 90, 22, pet.xp, nextXp, '#a07bff', `${pet.xp} / ${nextXp}`);
      STAT.forEach(([k, nm, c], i) => {
        const y = PY + 118 + i * 30;
        ui.text(ctx, nm, PX + 24, y + 11, { size: 16, align: 'left' });
        ui.gauge(ctx, PX + 80, y, PW - 110, 22, pet.stats[k], 100, c, `${Math.round(pet.stats[k])}`);
      });
      // 진화 조건
      const ev = BPF.progress.evolveCheck(id);
      if (pet.stage < 5) {
        ui.text(ctx, `▶ ${pet.stage + 1}단계 성장 조건`, PX + 24, PY + 252, { size: 16, align: 'left', color: '#7b3fd6' });
        // 짧은 조건은 2칸씩, 긴 임무 조건은 한 줄 전체 (글자가 겹치지 않게)
        const shortI = ev.items.filter(it => it.text.length <= 14), longI = ev.items.filter(it => it.text.length > 14);
        const rowsN = Math.ceil(shortI.length / 2);
        const line = (it, x, y, w) => {
          ctx.save(); ui.path(ctx, x, y - 10, w, 22, 4); ctx.clip();
          ui.text(ctx, (it.done ? '✅ ' : '⬜ ') + it.text, x, y, { size: 14, align: 'left', color: it.done ? '#2e6a2a' : '#5a4a8b', weight: it.done ? 'bold' : 'normal' });
          ctx.restore();
        };
        shortI.forEach((it, i) => line(it, PX + 24 + (i % 2) * 280, PY + 274 + Math.floor(i / 2) * 22, 276));
        longI.forEach((it, i) => line(it, PX + 24, PY + 274 + (rowsN + i) * 22, PW - 48));
        if (ui.button(ctx, PX + PW - 214, PY + 356, 196, 56, ev.ok ? '✨ 성장하기!' : '조건 미달', { color: '#ff5fa0', size: 20, disabled: !ev.ok, focus: ev.ok })) this.startEvo();
      } else {
        ui.text(ctx, '🌟 최종 단계 달성! 엔딩 앨범이 열렸어요.', PX + 24, PY + 320, { size: 18, align: 'left', color: '#c2185b' });
        if (ui.button(ctx, PX + PW - 214, PY + 356, 196, 56, '엔딩 보기', { color: '#ffb648', size: 20 })) BPF.go('album', { back: 'farm', pet: id, ending: true });
      }
      if (d.companionId !== id) { if (ui.button(ctx, PX + 24, PY + 366, 180, 48, '동행하기 ★', { color: '#3f8cff', size: 18, focus: this.pickTab })) { d.companionId = id; BPF.save.write('companion'); BPF.toast(`이제 ${pet.name}이(가) 함께 다녀요! 미니게임 경험치도 ${pet.name}에게 가요.`); this.pickTab = false; } }
      else ui.text(ctx, '★ 함께 다니는 중', PX + 30, PY + 390, { size: 17, align: 'left', color: '#3f8cff' });
      // 행동 버튼 — 미니게임에서 얻은 재료를 써서 돌봄
      ACT.forEach((a, i) => {
        const A = BPF.progress.ACTIONS[a];
        const x = 20 + i * 250, y = 584;
        const have = A.res ? (d.res[A.res] || 0) : null;
        if (ui.button(ctx, x, y, 236, 72, `${i + 1}. ${ACT_LABEL[a]}`, { color: have === 0 ? '#b8b0c8' : ACT_COLOR[a], size: 22, icon: ACT_ICON[a] })) this.act(a);
        const nm = { love: '애정', health: '건강', charm: '매력', know: '지식' };
        ui.text(ctx, A.res ? `${A.resName} ${have}개 보유 · 1개 사용` : '무료 (애정 20까지)', x + 118, y + 90, { size: 14, color: have === 0 ? '#b03040' : '#2e6a2a' });
        ui.text(ctx, `${nm[A.stat]} +${A.amt}${A.xp ? ' · XP +' + A.xp : ''}${A.extra ? ' · 애정 +' + A.extra.love : ''}`, x + 118, y + 108, { size: 13, color: '#7a6a99', weight: 'normal' });
      });
      ui.round(ctx, 1020, 584, 240, 128, 16, '#fff6c8', '#3a2a6b', 3);
      ui.wrap(ctx, '재료는 미니게임을 클리어하면 얻어요!', 1140, 594, 220, { size: 15, align: 'center', weight: 'bold', color: '#7a4a00' });
      if (ui.button(ctx, 1040, 646, 200, 52, '미니게임 하러 가기', { color: '#ff5fa0', size: 16 })) BPF.go('gamecenter');
      if (this.evo) this.drawEvo(ctx);
      ui.drawParticles(ctx, 1 / 60);
      ui.drawModal(ctx, 1 / 60);
    },
    drawEvo(ctx) {
      const e = this.evo, t = e.t, D = BPF_DATA.pets[e.id];
      ctx.save(); ctx.fillStyle = `rgba(20,12,45,${Math.min(0.88, t)})`; ctx.fillRect(0, 0, 1280, 720); ctx.restore();
      // 빛줄기
      ctx.save(); ctx.translate(640, 380); ctx.rotate(t * 0.8);
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = i % 2 ? 'rgba(255,240,150,.25)' : 'rgba(255,180,240,.2)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-40, -600); ctx.lineTo(40, -600); ctx.fill(); }
      ctx.restore();
      const bimg = BPF.assets.get('evolve_burst');
      if (bimg) { ctx.save(); ctx.translate(640, 400); ctx.rotate(-t * 0.6); const bs = 360 + Math.min(1, t) * 260; ctx.globalAlpha = Math.min(1, t * 1.5) * 0.9; ctx.drawImage(bimg, -bs / 2, -bs / 2, bs, bs); ctx.restore(); }
      const morph = BPF.clamp((t - 0.6) / 1.8, 0, 1);
      // 깜빡이며 교대
      const showNew = morph > 0.5 ? Math.random() < morph : Math.random() < morph * 0.6;
      const size = 300 + morph * 80;
      if (t < 2.6) BPF.drawPet(ctx, e.id, showNew ? e.to : e.from, 640, 560, size, { silhouette: true, silColor: '#ffffff' });
      else {
        BPF.drawPet(ctx, e.id, e.to, 640, 560, 380);
        if (t < 2.8) { ctx.save(); ctx.globalAlpha = (2.8 - t) * 5; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1280, 720); ctx.restore(); if (!e.burst) { e.burst = 1; for (let k = 0; k < 6; k++) ui.burst(640 + BPF.rand(-200, 200), 350 + BPF.rand(-100, 100), BPF.pick(['#ffd84d', '#ff8fd0', '#7be0ff']), 18, { star: true }); } }
        ui.text(ctx, `${BPF.save.data.pets[e.id].name} 성장!`, 640, 110, { size: 54, color: '#ffe14d', outline: '#c2185b', ow: 10 });
        ui.text(ctx, `${e.to}단계 「${D.stages[e.to - 1]}」`, 640, 168, { size: 28, color: '#fff', outline: '#3a2a6b' });
        if (t > 3.6) ui.text(ctx, 'Space / 클릭으로 계속', 640, 690, { size: 18, color: '#fff', alpha: 0.5 + Math.sin(BPF.time * 4) * 0.4 });
        if (t > 3.6 && ui.hit({ x: 0, y: 0, w: 1280, h: 720 })) { I.consume(); this.endEvo(); }
      }
      if (t < 2.6) ui.text(ctx, '어라…? 모습이 변하고 있어!', 640, 130, { size: 34, color: '#fff', outline: '#7b5cff' });
    }
  };
})();
