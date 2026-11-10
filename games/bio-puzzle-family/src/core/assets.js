/* 이미지 에셋 로더 — 지연 로드 + 실패 시 폴백 그림 */
(function () {
  'use strict';
  const BPF = window.BPF;
  const imgs = {};
  const status = {};
  const PL = ['p01', 'p02', 'p03', 'p04'];
  const FACES = ['idle', 'acting', 'thinking', 'success', 'mistake', 'combo'];
  const PETS = ['lulu', 'coco', 'tani', 'bibi'];
  const manifest = {};
  PL.forEach(p => {
    manifest['body_' + p] = `assets/players/player_body_${p}.png`;
    FACES.forEach(f => manifest[`face_${p}_${f}`] = `assets/players/player_face_${p}_${f}.png`);
  });
  PL.forEach(p => ['stand', 'walk1', 'walk2', 'walk3', 'jump', 'cheer', 'fall'].forEach(f => manifest[`pose_${p}_${f}`] = `assets/players/player_pose_${p}_${f}.png`));
  // 마을 사람(NPC)
  ['dr', 'shop', 'farmer', 'gene', 'eco', 'fest'].forEach(n => manifest['npc_' + n] = `assets/npc/npc_${n}.png`);
  // 육성: 방 배경 · 행동 스티커 · 자원 아이콘
  PETS.forEach(p => {
    manifest['room_' + p] = `assets/raising/room_${p}.jpg`;
    ['eat', 'happy', 'study', 'sleep'].forEach(a => manifest[`pet_${p}_act_${a}`] = `assets/pets/${p}/pet_${p}_act_${a}.png`);
  });
  ['food', 'research', 'decor'].forEach(r => manifest['res_' + r] = `assets/ui/icons/res_${r}.png`);
  manifest.bld_library = 'assets/village/buildings/bld_library.png';
  for (let i = 1; i <= 5; i++) manifest['bld_institute_' + i] = `assets/village/buildings/bld_institute_stage${i}.png`;
  manifest.bg_ground = 'assets/village/bg_ground.jpg';
  manifest.evolve_burst = 'assets/fx/evolve_burst.png';
  ['title_logo', 'panel_frame', 'demo_finger'].forEach(k => manifest[k] = `assets/ui/${k}.png`);
  manifest.title_bg = 'assets/ui/title_bg.jpg';
  manifest.thumb_g01 = 'assets/ui/thumb_g01.png';
  manifest.thumb_g09 = 'assets/ui/thumb_g09.png';
  manifest.drug_new = 'assets/ui/icons/drug_new.png';
  'SABC'.split('').forEach(k => manifest['grade_' + k] = `assets/ui/grade_${k}.png`);
  // 미니게임 전용 그림
  const MG = (dir, prefix, names) => names.forEach(n => manifest[prefix + n] = `assets/minigames/${dir}/${n}.png`);
  MG('ferment', 'fm_', ['vat', 'raw_cabbage', 'raw_meju', 'raw_milk', 'raw_grain', 'raw_waste', 'mic_lab', 'mic_mold', 'mic_yeast', 'mic_anaer', 'prod_doenjang', 'prod_cheese', 'prod_ethanol', 'prod_biogas']);
  MG('diagnosis', 'dg_', ['patient_1', 'patient_2', 'patient_3', 'patient_4', 'patient_5', 'patient_6', 'tool_xray', 'tool_ct', 'tool_mri', 'tool_pcr', 'result_xray', 'result_ct', 'result_mri', 'result_pcr']);
  MG('gmo', 'gm_', ['crop_soy', 'crop_corn', 'crop_tomato', 'crop_rice', 'crop_soy_trouble', 'crop_corn_trouble', 'crop_tomato_trouble', 'crop_rice_trouble', 'gene_card']);
  MG('recomb', 'rc_', ['scissors', 'glue', 'ecoli', 'vector', 'cell', 'heart']);
  // 유전자 재조합 연구소 과정 그림(선생님이 만들어 넣을 그림 — 없으면 기존 아이콘으로 대신 표시)
  MG('recomb', 'rc_', ['p1_1', 'p1_2', 'p1_3', 'p1_4', 'p1_5', 'p1_6', 'p2_1', 'p2_2', 'p2_3', 'p2_4', 'p2_5', 'p2_6', 'p3_1', 'p3_2', 'p3_3', 'p3_4', 'p3_5', 'p3_6', 'x1', 'x2', 'x3']);
  MG('fusion', 'fu_', ['field_agri', 'field_make', 'field_build', 'field_logi', 'field_med', 'field_traffic',
    'tech_iot', 'tech_robot', 'tech_ai', 'tech_drone', 'tech_bigdata', 'tech_print3d', 'tech_bio', 'tech_nano', 'tech_mobile', 'tech_sensor', 'tech_auto',
    'res_smartfarm', 'res_smartfactory', 'res_smartbuilding', 'res_fulfillment', 'res_bioprint', 'res_nanosensor', 'res_mhealth', 'res_wearable', 'res_its']);
  MG('immune', 'im_', ['vaccine', 'germ_virus', 'germ_bacteria']);
  manifest.im_bg_body = 'assets/minigames/immune/bg_body.jpg';
  MG('clean', 'cl_', ['tile_oil', 'tile_algae', 'tile_plant', 'tile_compost', 'env_coast', 'env_lake', 'env_soil', 'env_landfill', 'blocker_plastic', 'blocker_sludge', 'blocker_metal', 'blocker_vinyl']);
  MG('ethics', 'et_', ['issue_life', 'issue_safe', 'issue_fair', 'issue_eco', 'issue_privacy', 'judge_desk']);
  PETS.forEach(p => { for (let s = 1; s <= 5; s++) manifest[`pet_${p}_${s}`] = `assets/pets/${p}/pet_${p}_stage_0${s}.png`; });
  ['institute', 'lab', 'greenhouse', 'barn', 'shop', 'house', 'fountain'].forEach(b => manifest['bld_' + b] = `assets/village/buildings/bld_${b}.png`);
  manifest.deco_lamp = 'assets/village/buildings/deco_lamp.png';
  manifest.deco_arch = 'assets/village/buildings/deco_arch.png';
  ['tile_dirt', 'tile_grass', 'tile_stone', 'tile_water', 'fence', 'bush', 'tree', 'tree_pink', 'bench', 'crate', 'hay', 'sign', 'sprout', 'flowers', 'rock']
    .forEach(t => manifest[t] = `assets/village/tiles/${t}.png`);
  ['bg_lab1', 'bg_lab2', 'bg_ferment', 'bg_bench', 'bg_farm', 'bg_cell'].forEach(b => manifest[b] = `assets/minigames/bg/${b}.png`);
  ['blk_A', 'blk_T', 'blk_G', 'blk_C', 'dna_tile', 'ic_star', 'ic_heart', 'ic_tri', 'ic_clover', 'card_dna', 'card_corn', 'card_tomato', 'card_fish', 'card_corn_gmo',
    'dish_green', 'dish_pink', 'dish_purple', 'dish_yellow', 'jar_milk', 'jar_kimchi', 'jar_grape', 'jar_yellow', 'flask_pink', 'flask_green', 'tube_rack', 'dna_helix',
    'seed_0', 'seed_1', 'seed_2', 'seed_3', 'seed_4', 'alchemy_pot', 'antibody', 'cell_blue', 'virus_pink', 'virus_green', 'shield', 'syringe', 'spray', 'recycle', 'net',
    'sludge', 'trashbag', 'bottle', 'scales', 'ok', 'no', 'bubble_dots', 'bubble_ex', 'bubble_q', 'btn_play', 'btn_pause', 'btn_replay', 'btn_home',
    'fx_burst', 'fx_burst2', 'fx_heart', 'fx_x', 'fx_spiral', 'fx_drops'].forEach(i => manifest[i] = `assets/ui/icons/${i}.png`);

  function load(key) {
    if (status[key]) return;
    const src = manifest[key];
    if (!src) { status[key] = 'missing'; return; }
    if (window.BPF_HASH && !window.BPF_HASH[src]) { status[key] = 'missing'; return; } // 배포판: 아직 없는 그림은 요청하지 않음
    status[key] = 'loading';
    queue.push([key, src]); pump();
  }
  // 한꺼번에 수백 개를 요청하면 게임 서버가 밀리므로, 정해진 개수씩 차례로 불러온다
  const queue = []; let active = 0;
  const MAX_ACTIVE = window.BPF_HASH ? 8 : 64;
  function pump() {
    while (active < MAX_ACTIVE && queue.length) {
      const [key, src] = queue.shift(); active++;
      const im = new Image();
      let freed = false;
      const free = () => { if (!freed) { freed = true; active--; pump(); } };
      // 느린 그림 하나가 줄 전체를 막지 않게 6초가 지나면 자리를 비워 준다(그림은 계속 받는다)
      setTimeout(free, 6000);
      im.onload = () => { imgs[key] = im; status[key] = 'ok'; free(); };
      im.onerror = () => { status[key] = 'error'; console.warn('이미지 로드 실패', src); free(); };
      im.src = window.BPF_URL ? window.BPF_URL(src) : src; // 배포판에서는 해시 이름으로 바꿔 빠르게 전달
    }
  }

  BPF.assets = {
    manifest,
    get(key) { if (!status[key]) load(key); return status[key] === 'ok' ? imgs[key] : null; },
    ok(key) { return status[key] === 'ok'; },
    failed(key) { return status[key] === 'error' || status[key] === 'missing'; },
    /* 필수(P0) 이미지를 먼저 불러온다 */
    preload(keys, onProgress) {
      return new Promise(res => {
        let done = 0;
        const total = keys.length;
        if (!total) return res();
        keys.forEach(k => {
          load(k);
          const check = () => {
            if (status[k] === 'ok' || status[k] === 'error' || status[k] === 'missing') {
              done++; onProgress && onProgress(done / total);
              if (done === total) res();
            } else setTimeout(check, 30);
          };
          check();
        });
        setTimeout(res, 8000); // 느린 기기에서도 진행
      });
    },
    loadAll() { Object.keys(manifest).forEach(load); }
  };

  /* 이미지를 상자 안에 비율 유지로 그림. 실패하면 폴백 */
  BPF.drawImg = function (ctx, key, x, y, w, h, opt) {
    opt = opt || {};
    const im = BPF.assets.get(key);
    if (!im) {
      if (opt.noFallback) return false;
      ctx.save();
      ctx.fillStyle = opt.fallbackColor || 'rgba(255,255,255,.25)';
      ctx.strokeStyle = 'rgba(60,40,110,.6)'; ctx.lineWidth = 3;
      const r = Math.min(w, h) * 0.42;
      ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (opt.label) { ctx.fillStyle = '#3a2a6b'; ctx.font = `bold ${Math.max(12, r * 0.6) | 0}px ${BPF.FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(opt.label, x + w / 2, y + h / 2); }
      ctx.restore();
      return false;
    }
    let dw = w, dh = h;
    if (!opt.stretch) {
      const s = Math.min(w / im.width, h / im.height);
      dw = im.width * s; dh = im.height * s;
    }
    let dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
    if (opt.align === 'bottom') dy = y + h - dh;
    if (opt.align === 'top') dy = y;
    ctx.save();
    if (opt.alpha != null) ctx.globalAlpha *= opt.alpha;
    if (opt.flip) { ctx.translate(dx + dw, dy); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, dw, dh); }
    else ctx.drawImage(im, dx, dy, dw, dh);
    ctx.restore();
    return { x: dx, y: dy, w: dw, h: dh };
  };

  /* 실루엣(미발견 표시)용: 오프스크린 캐시 */
  const silCache = {};
  BPF.drawSilhouette = function (ctx, key, x, y, w, h, color) {
    const im = BPF.assets.get(key);
    if (!im) return BPF.drawImg(ctx, key, x, y, w, h, { label: '?' });
    const ck = key + color;
    if (!silCache[ck]) {
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      g.globalCompositeOperation = 'source-in'; g.fillStyle = color || '#3b3165'; g.fillRect(0, 0, c.width, c.height);
      silCache[ck] = c;
    }
    const c = silCache[ck];
    const s = Math.min(w / c.width, h / c.height);
    ctx.drawImage(c, x + (w - c.width * s) / 2, y + (h - c.height * s) / 2, c.width * s, c.height * s);
  };
})();
