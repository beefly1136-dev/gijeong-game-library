/* 진행 규칙: 등급·보상(1회 반영)·인증·마을 단계·동물 성장·의뢰 */
(function () {
  'use strict';
  const BPF = window.BPF;
  const S = () => BPF.save.data;
  const GR = ['', 'C', 'B', 'A', 'S'];
  const P = BPF.progress = {};

  P.gradeOf = function (score) { return score >= 9000 ? 'S' : score >= 7500 ? 'A' : score >= 6000 ? 'B' : score >= 4000 ? 'C' : 'D'; };
  P.gradeRank = g => Math.max(0, GR.indexOf(g));
  P.gradeAtLeast = (g, need) => P.gradeRank(g) >= P.gradeRank(need) && g !== 'D' && g !== '';
  /* 명세 6장: 달성률 60% + 정확도 25% + 시간/콤보 15% → 0~10000 */
  P.normScore = function (achieve, accuracy, bonus) {
    return Math.round(10000 * (0.6 * BPF.clamp(achieve, 0, 1) + 0.25 * BPF.clamp(accuracy, 0, 1) + 0.15 * BPF.clamp(bonus, 0, 1)));
  };
  const GRADE_BP = { S: 120, A: 80, B: 50, C: 30, D: 0 };
  const GRADE_XP = { S: 110, A: 85, B: 65, C: 45, D: 10 };

  /* 결과 반영 — resultId 기준 1회만 */
  P.applyResult = function (r) {
    const d = S();
    if (d.rewardsGiven[r.resultId]) return d.rewardsGiven[r.resultId];
    const best = d.best[r.gameId];
    const firstClear = r.win && best.clears === 0;
    const out = { bp: 0, xp: 0, items: {}, newBest: false, firstClear, certs: [], lines: [] };
    best.plays++; d.stats.totalPlays++;
    if (r.score > best.score) { best.score = r.score; best.grade = r.grade; out.newBest = true; }
    if (r.points > best.points) best.points = r.points;
    if (r.win) {
      best.clears++;
      out.bp = 100 + GRADE_BP[r.grade];
      if (firstClear) out.bp += 100;
      // 게임별 보상 아이템
      const G = BPF_DATA.games.find(g => g.id === r.gameId);
      Object.keys(G.reward).forEach(k => out.items[k] = G.reward[k] + ((r.grade === 'S' || r.grade === 'A') ? 1 : 0));
    } else {
      out.bp = 20; // 미달 시에도 20BP
    }
    // 인증
    if (r.win && r.gameId === 'g04' && !d.certs.gmoBasic) { d.certs.gmoBasic = true; out.certs.push('GMO 기초 인증'); }
    if (r.win && r.gameId === 'g10' && !d.certs.gmoSafety) { d.certs.gmoSafety = true; out.certs.push('GMO 안전성 인증'); }
    // 반영
    d.res.bp += out.bp; d.stats.totalBP += out.bp;
    BPF.save.addRes(out.items);
    // 동반 생명체 XP (플레이어와 별개)
    const pet = BPF.save.pet;
    if (pet) {
      out.xp = r.win ? GRADE_XP[r.grade] : GRADE_XP.D;
      pet.xp = Math.min(1100, pet.xp + out.xp);
      out.petId = d.companionId;
    }
    if (r.extra && r.extra.alchemy) r.extra.alchemy.forEach(id => d.codex.alchemy[id] = true);
    d.codex.lessons[r.gameId] = true;
    d.rewardsGiven[r.resultId] = out;
    // 오래된 기록 정리
    const keys = Object.keys(d.rewardsGiven);
    if (keys.length > 120) keys.slice(0, keys.length - 120).forEach(k => delete d.rewardsGiven[k]);
    BPF.save.write('result');
    return out;
  };

  /* 조건 판정 */
  P.check = function (c) {
    const d = S();
    switch (c.type) {
      case 'plays': return d.stats.totalPlays >= c.n;
      case 'clears': return BPF.save.clearedCount() >= c.n;
      case 'clear': return d.best[c.game].clears > 0;
      case 'grade': return d.best[c.game].clears > 0 && P.gradeAtLeast(d.best[c.game].grade, c.grade);
      case 'cert': return !!d.certs[c.id];
      case 'petStage': return BPF.save.adoptedPets().filter(p => d.pets[p].stage >= c.stage).length >= c.n;
      case 'petStat': { const p = BPF.save.pet; return !!p && p.stats[c.stat] >= c.n; }
      case 'quest': return !!d.quests.done[c.id];
      case 'multi': return c.list.every(P.check);
    }
    return false;
  };
  P.condText = function (c) {
    const G = id => BPF_DATA.games.find(g => g.id === id).title;
    switch (c.type) {
      case 'plays': return `미니게임 ${c.n}회 플레이`;
      case 'clear': return `${G(c.game)} 클리어`;
      case 'grade': return `${G(c.game)} ${c.grade}등급 이상 클리어`;
      case 'petStat': return `동반 동물 ${{ love: '애정', health: '건강', charm: '매력', know: '지식' }[c.stat]} ${c.n} 이상`;
      case 'multi': return c.list.map(P.condText).join(' + ');
    }
    return c.text || '';
  };

  /* 마을 단계 */
  P.villageReqs = function (stage) {
    const V = BPF_DATA.village[stage];
    if (!V || !V.req) return [];
    return V.req.map(r => ({ text: r.text, done: P.check(r) }));
  };
  P.canUpgrade = function () {
    const d = S(); if (d.villageStage >= 5) return false;
    return P.villageReqs(d.villageStage + 1).every(r => r.done);
  };
  P.upgradeVillage = function () {
    const d = S(); if (!P.canUpgrade()) return false;
    d.villageStage++; P.lastUnlocked = BPF.save.ensureUnlocks(); BPF.save.write('village'); return true;
  };
  P.slots = () => BPF_DATA.village[S().villageStage].slots;
  P.availableQuests = function () {
    const d = S();
    return BPF_DATA.quests.filter(q => q.stage === d.villageStage); // 지금 단계 의뢰만
  };
  P.completeQuest = function (q) {
    const d = S();
    if (d.quests.done[q.id] || !P.check(q.cond)) return false;
    d.quests.done[q.id] = true; BPF.save.addRes(q.reward); BPF.save.write('quest'); return true;
  };
  P.pendingQuestCount = function () {
    const d = S();
    return P.availableQuests().filter(q => !d.quests.done[q.id] && P.check(q.cond)).length;
  };

  /* 동물 성장 */
  P.missionDone = function (petId, key) {
    const m = BPF_DATA.pets[petId][key]; const d = S();
    if (!m) return true;
    return d.best[m.game].clears > 0 && P.gradeAtLeast(d.best[m.game].grade, m.grade);
  };
  P.evolveCheck = function (petId) {
    const pet = S().pets[petId];
    if (!pet.adopted || pet.stage >= 5) return { ok: false, items: [] };
    const G = BPF_DATA.growth[pet.stage + 1];
    const items = [{ text: `경험치 ${G.xp}`, done: pet.xp >= G.xp }];
    const nm = { love: '애정', health: '건강', charm: '매력', know: '지식' };
    Object.keys(G.req).forEach(k => items.push({ text: `${nm[k]} ${G.req[k]}`, done: pet.stats[k] >= G.req[k] }));
    if (G.mission) items.push({ text: (G.mission === 'mission4' ? '전용 의뢰: ' : '엔딩 임무: ') + BPF_DATA.pets[petId][G.mission].text, done: P.missionDone(petId, G.mission) });
    return { ok: items.every(i => i.done), items };
  };
  P.evolve = function (petId) {
    const pet = S().pets[petId];
    if (!P.evolveCheck(petId).ok) return false;
    pet.stage++;
    if (!pet.seenStages.includes(pet.stage)) pet.seenStages.push(pet.stage);
    if (pet.stage === 5) { pet.ended = true; S().endings[petId] = true; }
    BPF.save.write('evolve');
    return true;
  };

  /* 돌보기: 모든 성장 재료(먹이·연구키트·장식)는 미니게임 클리어로만 얻는다.
     쓰다듬기는 무료지만 애정 20까지만 오르므로 미니게임 없이 성장할 수 없다. */
  P.ACTIONS = {
    feed: { name: '먹이 주기', stat: 'health', amt: 12, extra: { love: 4 }, res: 'food', resName: '먹이', ga: '가', icon: '🍖' },
    study: { name: '연구 놀이', stat: 'know', amt: 12, xp: 25, res: 'research', resName: '연구키트', ga: '가', icon: '🔬' },
    decorate: { name: '꾸미기', stat: 'charm', amt: 12, extra: { love: 3 }, res: 'decor', resName: '장식', ga: '이', icon: '🎀' },
    pet: { name: '쓰다듬기', stat: 'love', amt: 1, cap: 20, res: null, icon: '💗' }
  };
  P.RES_FROM = function (res) { return BPF_DATA.games.filter(g => g.reward[res]).map(g => g.short); };
  P.interact = function (petId, act) {
    const d = S(), pet = d.pets[petId], A = P.ACTIONS[act];
    const nm = { love: '애정', health: '건강', charm: '매력', know: '지식' };
    const ga = { love: '이', health: '이', charm: '이', know: '이' };
    if (!A.res) {
      if (pet.stats.love >= A.cap) return { ok: true, soft: true, msg: `${pet.name}이(가) 좋아해요! (쓰다듬기로는 애정이 ${A.cap}까지만 올라요. 미니게임 재료로 돌봐 주세요)` };
      pet.stats.love = Math.min(A.cap, pet.stats.love + A.amt); BPF.save.write('care');
      return { ok: true, msg: `쓰다듬기! 애정 +${A.amt}` };
    }
    if (pet.stats[A.stat] >= 100 && !A.xp) return { ok: false, msg: `${nm[A.stat]}${ga[A.stat]} 이미 가득 찼어요!` };
    if ((d.res[A.res] || 0) <= 0) return { ok: false, need: A.res, msg: `${A.resName}${A.ga} 없어요! 이 미니게임을 클리어하면 얻어요: ${P.RES_FROM(A.res).join(', ')}` };
    d.res[A.res]--;
    pet.stats[A.stat] = Math.min(100, pet.stats[A.stat] + A.amt);
    if (A.extra) Object.keys(A.extra).forEach(k => pet.stats[k] = Math.min(100, pet.stats[k] + A.extra[k]));
    if (A.xp) pet.xp = Math.min(1100, pet.xp + A.xp);
    BPF.save.write('care');
    return { ok: true, msg: `${A.name}! ${nm[A.stat]} +${A.amt}${A.extra ? ', 애정 +' + (A.extra.love || 0) : ''}${A.xp ? ', 경험치 +' + A.xp : ''} (${A.resName} 1개 사용)` };
  };
})();
