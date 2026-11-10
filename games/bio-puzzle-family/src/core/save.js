/* 저장 — localStorage JSON schema v1, 자동저장, 내보내기·가져오기 */
(function () {
  'use strict';
  const BPF = window.BPF;
  const KEY = 'bioPuzzleFamily_save_v1';
  const PLAYER_IDS = ['p01', 'p02', 'p03', 'p04'];
  const PET_IDS = ['lulu', 'coco', 'tani', 'bibi'];
  const GAME_IDS = ['g01', 'g02', 'g03', 'g04', 'g05', 'g06', 'g07', 'g08', 'g09', 'g10'];

  function newPet() {
    return { adopted: false, name: '', stage: 1, xp: 0, stats: { love: 15, health: 15, charm: 5, know: 5 },
      cool: {}, missions: {}, seenStages: [], adoptedAt: 0, ended: false };
  }
  function defaults() {
    const pets = {}; PET_IDS.forEach(p => pets[p] = newPet());
    const best = {}; GAME_IDS.forEach(g => best[g] = { score: 0, points: 0, grade: '', clears: 0, plays: 0 });
    return {
      schema: 1,
      firstRunDone: false,
      selectedPlayerId: null,
      selectedCostumeId: 'default',
      unlockedPlayerIds: PLAYER_IDS.slice(),
      companionId: null,
      pets,
      villageStage: 1,
      unlockedGames: [], // 처음엔 랜덤 3개, 마을 승급마다 새 게임 개방
      best,
      res: { bp: 0, food: 0, research: 0, decor: 0 }, // 육성 재료는 미니게임으로만 얻는다
      tokens: { ferment: 0, culture: 0, protein: 0, seed: 0, env: 0, sticker: 0 },
      inventory: { decor: [], placed: {} }, // placed: 동물 방마다 직접 놓은 장식 위치
      codex: { lessons: {}, alchemy: {} },
      certs: { gmoBasic: false, gmoSafety: false },
      quests: { done: {} },
      endings: {},
      rewardsGiven: {},
      stats: { totalPlays: 0, totalBP: 0 },
      settings: { mute: false, bgm: true, reduceMotion: false },
      updatedAt: 0
    };
  }
  /* 미니게임 해금: 마을 단계별 개방 수 (1단계 3개 → 2단계 5개 → 3단계 7개 → 4단계 10개 전부)
     승급할 때 그 단계 의뢰에 필요한 게임을 먼저 열고, 나머지는 랜덤 */
  const UNLOCK_COUNT = [0, 3, 5, 7, 10, 10];
  function stageNeeds(stage) {
    const out = [];
    const add = c => { if (!c) return; if (c.game) out.push(c.game); if (c.list) c.list.forEach(add); };
    (BPF_DATA.quests || []).filter(q => q.stage === stage).forEach(q => add(q.cond));
    return out;
  }
  function ensureUnlocks(d) {
    if (!Array.isArray(d.unlockedGames)) d.unlockedGames = [];
    // 예전 저장: 이미 해 본 게임은 열어 둔다
    GAME_IDS.forEach(g => { if ((d.best[g].plays > 0 || d.best[g].clears > 0) && !d.unlockedGames.includes(g)) d.unlockedGames.push(g); });
    const target = UNLOCK_COUNT[d.villageStage] || 10;
    const added = [];
    const pick = g => { if (d.unlockedGames.length < target && !d.unlockedGames.includes(g)) { d.unlockedGames.push(g); added.push(g); } };
    if (d.villageStage > 1) for (let s = 2; s <= d.villageStage; s++) stageNeeds(s).forEach(pick);
    const rest = GAME_IDS.filter(g => !d.unlockedGames.includes(g));
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    rest.forEach(pick);
    return added;
  }
  // 깊은 병합(누락된 키 보충)
  function merge(def, src) {
    if (src == null || typeof src !== 'object' || Array.isArray(def)) return src == null ? def : src;
    const out = {};
    Object.keys(def).forEach(k => { out[k] = (k in src) ? merge(def[k], src[k]) : def[k]; });
    Object.keys(src).forEach(k => { if (!(k in out)) out[k] = src[k]; });
    return out;
  }
  function sanitize(d) {
    if (!PLAYER_IDS.includes(d.selectedPlayerId)) {
      if (d.selectedPlayerId != null) console.warn('잘못된 플레이어 ID → p01로 복구');
      d.selectedPlayerId = d.firstRunDone ? 'p01' : null;
    }
    if (d.companionId && !PET_IDS.includes(d.companionId)) d.companionId = null;
    if (d.companionId && !d.pets[d.companionId].adopted) d.companionId = null;
    if (!d.companionId) { const a = PET_IDS.find(p => d.pets[p].adopted); if (a) d.companionId = a; }
    d.villageStage = BPF.clamp(d.villageStage | 0 || 1, 1, 5);
    if (!Array.isArray(d.unlockedGames)) d.unlockedGames = [];
    d.unlockedGames = d.unlockedGames.filter((g, i, a) => GAME_IDS.includes(g) && a.indexOf(g) === i);
    ensureUnlocks(d);
    PET_IDS.forEach(p => {
      const pt = d.pets[p];
      ['love', 'health', 'charm', 'know'].forEach(s => pt.stats[s] = BPF.clamp(+pt.stats[s] || 0, 0, 100));
      pt.stage = BPF.clamp(pt.stage | 0 || 1, 1, 5);
      pt.xp = BPF.clamp(+pt.xp || 0, 0, 1100);
      if (pt.adopted && !pt.seenStages.includes(pt.stage)) pt.seenStages.push(pt.stage);
      if (pt.name && BPF.filter && BPF.filter.isBad(pt.name)) pt.name = BPF_DATA.pets[p].name; // 가져온 파일의 부적절한 이름 차단
    });
    return d;
  }

  const S = BPF.save = {
    data: defaults(),
    KEY, PLAYER_IDS, PET_IDS, GAME_IDS,
    lastError: null,
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) this.data = sanitize(merge(defaults(), JSON.parse(raw)));
        else { this.data = defaults(); ensureUnlocks(this.data); }
      } catch (e) {
        console.error(e); this.lastError = e;
        BPF.toast('저장 데이터를 읽지 못해 새로 시작합니다.', '#b03040');
        this.data = defaults();
      }
      return this.data;
    },
    write(reason) {
      this.data.updatedAt = Date.now();
      try {
        localStorage.setItem(KEY, JSON.stringify(this.data));
        this.lastError = null;
        return true;
      } catch (e) {
        this.lastError = e;
        BPF.toast('⚠ 저장 실패! 저장 공간이 부족하거나 차단되었어요. 설정에서 내보내기를 해 두세요.', '#b03040');
        return false;
      }
    },
    reset() { this.data = defaults(); ensureUnlocks(this.data); try { localStorage.removeItem(KEY); } catch (e) { } },
    export() {
      const blob = new Blob([JSON.stringify(this.data, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      const d = new Date();
      a.download = `바이오퍼즐패밀리_저장_${d.getMonth() + 1}월${d.getDate()}일.json`;
      a.href = URL.createObjectURL(blob);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      BPF.toast('저장 파일을 내보냈어요.');
    },
    import(cb) {
      const fi = document.getElementById('fileInput');
      fi.value = '';
      fi.onchange = () => {
        const f = fi.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          try {
            const obj = JSON.parse(r.result);
            if (!obj || obj.schema !== 1) throw new Error('형식이 다른 파일');
            this.data = sanitize(merge(defaults(), obj));
            this.write('import');
            BPF.toast('저장 파일을 불러왔어요!');
            cb && cb(true);
          } catch (e) { BPF.toast('불러오기 실패: ' + e.message, '#b03040'); cb && cb(false); }
        };
        r.readAsText(f);
      };
      fi.click();
    },
    get player() { return this.data.selectedPlayerId || 'p01'; },
    get pet() { return this.data.companionId ? this.data.pets[this.data.companionId] : null; },
    adoptedPets() { return PET_IDS.filter(p => this.data.pets[p].adopted); },
    clearedCount() { return GAME_IDS.filter(g => this.data.best[g].clears > 0).length; },
    isUnlocked(g) { return this.data.unlockedGames.includes(g); },
    unlockCount: s => UNLOCK_COUNT[s] || 10,
    ensureUnlocks() { const a = ensureUnlocks(this.data); if (a.length) this.write('unlock'); return a; },
    addRes(obj) {
      Object.keys(obj).forEach(k => {
        if (k in this.data.res) this.data.res[k] = Math.max(0, (this.data.res[k] || 0) + obj[k]);
        else this.data.tokens[k] = Math.max(0, (this.data.tokens[k] || 0) + obj[k]);
      });
    }
  };
  window.addEventListener('beforeunload', () => { try { localStorage.setItem(KEY, JSON.stringify(S.data)); } catch (e) { } });
})();
