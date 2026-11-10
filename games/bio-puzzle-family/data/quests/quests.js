/* 마을 단계·스토리 의뢰 데이터 (명세 3장) */
window.BPF_DATA = window.BPF_DATA || {};
BPF_DATA.village = [
  null,
  { name: '낡은 연구실', unlock: '광장 · 미니게임 센터 · 농장 · 첫 입양', slots: 1 },
  { name: '연구 공방', unlock: '발효 상점 · 먹이 제작 · 지도 지역 추가', slots: 1,
    req: [{ type: 'clears', n: 3, text: '미니게임 3종 각 1회 클리어' }, { type: 'petStage', stage: 2, n: 1, text: '동물 1마리 2단계' }] },
  { name: '바이오센터', unlock: '유전 연구관 · 두 번째 입양 슬롯', slots: 2,
    req: [{ type: 'clears', n: 5, text: '미니게임 5종 각 1회 클리어' }, { type: 'petStage', stage: 3, n: 1, text: '동물 1마리 3단계' }] },
  { name: '연구 단지', unlock: '환경 숲 · 특별 의뢰 · 입양 슬롯 4개', slots: 4,
    req: [{ type: 'clears', n: 7, text: '미니게임 7종 각 1회 클리어' }, { type: 'petStage', stage: 4, n: 2, text: '동물 2마리 4단계' }] },
  { name: '바이오빌리지', unlock: '축제 광장 · 축제 컷신 · 연구 마을 완성 · 엔딩 앨범', slots: 4,
    req: [{ type: 'petStage', stage: 5, n: 4, text: '동물 4마리 모두 최종 단계' }, { type: 'quest', id: 'q_final', text: '마지막 윤리·GMO 스토리 의뢰 완료' }] }
];

/* 스토리 의뢰 — 박사·NPC가 주는 임무. cond 충족 후 "완료 보고" */
BPF_DATA.quests = [
  { id: 'q_intro', from: 'dr', stage: 1, title: '연구 마을에 온 걸 환영해!', text: '미니게임 센터에서 아무 게임이나 한 판 해 보렴. 연구원의 첫걸음이야!',
    cond: { type: 'plays', n: 1 }, reward: { bp: 50, food: 2 } },
  { id: 'q_care', from: 'dr', stage: 1, title: '첫 친구 돌보기', text: '농장에서 동반 동물에게 먹이를 주고 쓰다듬어 줘. 애정과 건강이 30이 되면 성장 준비 끝!',
    cond: { type: 'petStat', stat: 'love', n: 30 }, reward: { bp: 40, research: 1 } },
  { id: 'q_ferment', from: 'shop', stage: 2, title: '발효 상점 납품', text: '바이오 발효 공장에서 B등급 이상을 받아 줘. 김치·된장·치즈와 바이오 에너지를 만들어 보자!',
    cond: { type: 'grade', game: 'g02', grade: 'B' }, reward: { bp: 80, food: 4 } },
  { id: 'q_breed', from: 'farmer', stage: 2, title: '생명 기술은 어디에 쓰일까?', text: '생명 기술 분류 센터를 클리어해 봐. 생명 기술은 의료, 식량 생산·농업, 환경·에너지 분야에서 쓰인단다.',
    cond: { type: 'clear', game: 'g06' }, reward: { bp: 80, decor: 2 } },
  { id: 'q_gmo', from: 'gene', stage: 3, title: 'GMO는 어떻게 평가할까?', text: 'GMO 메이커에서 안전성 검토까지 마친 연구를 완료해 줘. 작물마다 따로 평가하는 게 핵심이야.',
    cond: { type: 'clear', game: 'g04' }, reward: { bp: 100, research: 2 } },
  { id: 'q_recomb', from: 'gene', stage: 3, title: '유전자를 자르고 붙여라', text: '유전자 재조합 연구소에서 과정을 완성해 줘. 제한 효소로 자르고 연결 효소로 붙이는 거야!',
    cond: { type: 'clear', game: 'g05' }, reward: { bp: 100, research: 2 } },
  { id: 'q_forest', from: 'eco', stage: 4, title: '숲을 살리는 미생물', text: '생물 정화 대작전 B등급 이상! 미생물과 식물로 오염을 줄이는 기술이야.',
    cond: { type: 'grade', game: 'g09', grade: 'B' }, reward: { bp: 120, decor: 3 } },
  { id: 'q_ethics', from: 'fest', stage: 4, title: '축제 준비 회의', text: '생명윤리 심판관 A등급 이상을 받아 줘. 축제에서 시민 토론회를 열 거야.',
    cond: { type: 'grade', game: 'g10', grade: 'A' }, reward: { bp: 150, research: 2 } },
  { id: 'q_final', from: 'dr', stage: 4, title: '마지막 의뢰: 시민 토론회', text: '시민들이 묻는다. "새 GM 작물을 우리 마을에서 길러도 될까?" GMO 메이커와 생명윤리 심판관을 모두 B등급 이상으로 클리어하고 토론회에 답해 줘.',
    cond: { type: 'multi', list: [{ type: 'grade', game: 'g04', grade: 'B' }, { type: 'grade', game: 'g10', grade: 'B' }] }, reward: { bp: 200 },
    finale: true }
];

/* 시민 토론회(마지막 의뢰) — 정답은 '개별 평가' 원칙 */
BPF_DATA.finale = {
  q: '시민: "새 해충 저항성 GM 옥수수를 우리 마을에서 길러도 될까요?" 연구원으로서 어떤 답이 가장 알맞을까요?',
  options: [
    { t: 'GMO는 무조건 안전하니까 바로 길러도 돼요.', ok: false, why: 'GMO를 획일적으로 안전하다고 단정할 수 없어요.' },
    { t: 'GMO는 무조건 위험하니까 절대 안 돼요.', ok: false, why: 'GMO를 획일적으로 위험하다고 단정할 수도 없어요.' },
    { t: '이 작물의 안전성 평가 결과(독성·알레르기·비의도적 변화), 우리 지역 환경 영향, 표시와 규제 기준을 확인하고 주민과 함께 결정해요.', ok: true, why: '맞아요! 작물·형질·용도·지역 환경마다 개별적으로 평가하고, 사회적 합의를 거치는 것이 원칙이에요.' }
  ]
};
