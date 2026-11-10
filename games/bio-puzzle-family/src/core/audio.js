/* 효과음(Web Audio 합성 + 파일 3개) · 배경음(assets/audio의 mp3) */
(function () {
  'use strict';
  const BPF = window.BPF;
  let ac = null, master = null, bgmGain = null;
  function muted() { return BPF.save && BPF.save.data && BPF.save.data.settings.mute; }
  function ensure() {
    if (ac) return true;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.35; master.connect(ac.destination);
      bgmGain = ac.createGain(); bgmGain.gain.value = 0.12; bgmGain.connect(master);
      return true;
    } catch (e) { return false; }
  }
  function tone(freq, dur, type, vol, when, dest, slide) {
    if (!ac) return;
    const t = ac.currentTime + (when || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  const SFX = {
    click: () => tone(660, 0.06, 'square', 0.15),
    move: () => tone(440, 0.04, 'square', 0.08),
    ok: () => { tone(784, 0.08, 'square', 0.2); tone(1046, 0.12, 'square', 0.2, 0.07); },
    combo: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.09, 'square', 0.18, i * 0.05)); },
    bad: () => tone(220, 0.25, 'sawtooth', 0.2, 0, null, 110),
    hit: () => tone(160, 0.2, 'triangle', 0.35, 0, null, 60),
    coin: () => { tone(988, 0.06, 'square', 0.15); tone(1319, 0.15, 'square', 0.15, 0.06); },
    pop: () => tone(520, 0.08, 'sine', 0.3, 0, null, 900),
    win: () => { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.16, 'square', 0.2, i * 0.11)); },
    lose: () => { [392, 349, 311, 262].forEach((f, i) => tone(f, 0.22, 'triangle', 0.25, i * 0.16)); },
    evolve: () => { for (let i = 0; i < 10; i++) tone(400 + i * 90, 0.12, 'sine', 0.2, i * 0.07); },
    dash: () => tone(300, 0.15, 'sawtooth', 0.15, 0, null, 900),
    tick: () => tone(1200, 0.03, 'square', 0.08)
  };
  // 배경음: 선생님이 준 음원 2곡
  //  main(아케이드 반짝임) — 기본 테마(타이틀·미니게임·농장·도감 등)
  //  town(과학 마을의 아침) — 마을 탐험·연구소·NPC 대화·상점
  //  각 미니게임·육성 농장·도서관(도감)·최종 엔딩은 선생님이 준 전용 곡 (11-10 추가)
  const TRACKS = { main: 'assets/audio/bgm_main.mp3', town: 'assets/audio/bgm_town.mp3',
    farm: 'assets/audio/bgm_farm.mp3', codex: 'assets/audio/bgm_codex.mp3', ending: 'assets/audio/bgm_ending.mp3' };
  ['g01', 'g02', 'g03', 'g04', 'g05', 'g07', 'g08', 'g09', 'g10'].forEach(id => { TRACKS[id] = 'assets/audio/bgm_' + id + '.mp3'; });
  // 파일 효과음: 미니게임 성공·실패, 펫 진화
  const SFX_FILES = { mg_win: 'assets/audio/sfx_mg_win.mp3', mg_lose: 'assets/audio/sfx_mg_lose.mp3', pet_evo: 'assets/audio/sfx_pet_evo.mp3' };
  const sfxEls = {};
  function playFile(name) {
    try {
      if (!sfxEls[name]) { sfxEls[name] = new Audio(window.BPF_URL ? window.BPF_URL(SFX_FILES[name]) : SFX_FILES[name]); sfxEls[name].preload = 'auto'; }
      const a = sfxEls[name]; a.volume = 0.8; a.currentTime = 0;
      // 미니게임 성공·실패 음악(3초)이 나오는 동안은 배경음을 멈춘다
      if (name === 'mg_win' || name === 'mg_lose') {
        holdUntil = Date.now() + 3200; apply();
        a.onended = () => { holdUntil = 0; apply(); };
      }
      const p = a.play(); if (p && p.catch) p.catch(() => { holdUntil = 0; apply(); });
    } catch (e) { }
  }
  let holdUntil = 0;
  const players = {};
  let cur = null, want = null;
  function el(k) {
    if (!players[k]) { const a = new Audio(window.BPF_URL ? window.BPF_URL(TRACKS[k]) : TRACKS[k]); a.loop = true; a.preload = 'auto'; a.volume = 0.45; players[k] = a; }
    return players[k];
  }
  function allowed() { return Date.now() >= holdUntil && !muted() && BPF.save && BPF.save.data && BPF.save.data.settings.bgm !== false; }
  function apply() {
    Object.keys(players).forEach(k => { if (k !== want || !allowed()) { if (!players[k].paused) players[k].pause(); } });
    if (want && allowed()) {
      const a = el(want);
      if (cur !== want) { try { a.currentTime = 0; } catch (e) { } cur = want; }
      if (a.paused) { const p = a.play(); if (p && p.catch) p.catch(() => { }); }
    }
  }
  setInterval(apply, 500); // 설정(음소거·배경음) 변경 즉시 반영
  BPF.audio = {
    state() { const a = want && players[want]; return { want, playing: !!(a && !a.paused) }; },
    unlock() { if (ensure() && ac.state === 'suspended') ac.resume(); apply(); },
    sfx(name) { if (muted()) return; if (SFX_FILES[name]) { playFile(name); return; } if (!ensure()) return; try { SFX[name] && SFX[name](); } catch (e) { } },
    bgm(mode) {
      const map = { village: 'town', town: 'town', main: 'main', game: 'main', farm: 'farm', codex: 'codex', ending: 'ending' };
      // 'game:g05' → 그 게임 전용 곡(없으면 기본 테마)
      let k = mode ? (map[mode] || 'main') : want;
      if (mode && mode.indexOf('game:') === 0) { const id = mode.slice(5); k = TRACKS[id] ? id : 'main'; } // null이면 지금 곡 유지
      if (k === want) return;
      want = k; apply();
    }
  };
})();
