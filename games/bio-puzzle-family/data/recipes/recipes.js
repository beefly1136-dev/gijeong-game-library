/* 교과서 Ⅶ단원 기반 조합 데이터
   - 바이오 발효 공장: 발효 식품(214쪽 김치·된장·치즈) + 바이오 에너지(215쪽 바이오에탄올·바이오가스)
   - 융합 기술 연금술: 228~232쪽 융합 기술 제품·산업·미래 사례 */
window.BPF_DATA = window.BPF_DATA || {};

BPF_DATA.ferment = {
  raws: [{ id: 'cabbage', name: '배추' }, { id: 'meju', name: '메주(콩)' }, { id: 'milk', name: '우유' }, { id: 'grain', name: '곡물(옥수수)', short: '옥수수' }, { id: 'waste', name: '가축 분뇨·음식물 쓰레기', short: '분뇨·음식물' }],
  starters: [{ id: 'lab', name: '유산균' }, { id: 'mold', name: '곰팡이·고초균', short: '곰팡이' }, { id: 'yeast', name: '효모' }, { id: 'anaer', name: '혐기성 미생물', short: '혐기성균' }],
  conds: [{ id: 'cold', name: '저온 숙성' }, { id: 'warm', name: '따뜻하게' }, { id: 'seal', name: '산소 차단(밀폐)' }],
  orders: [
    { id: 'kimchi', name: '김치', kind: '발효 식품', raw: 'cabbage', starter: 'lab', cond: 'cold', icon: 'jar_kimchi', time: 9 },
    { id: 'doenjang', name: '된장', kind: '발효 식품', raw: 'meju', starter: 'mold', cond: 'warm', icon: 'fm_prod_doenjang', time: 10 },
    { id: 'cheese', name: '치즈', kind: '발효 식품', raw: 'milk', starter: 'lab', cond: 'warm', icon: 'fm_prod_cheese', time: 7 },
    { id: 'ethanol', name: '바이오에탄올', kind: '바이오 에너지', raw: 'grain', starter: 'yeast', cond: 'seal', icon: 'fm_prod_ethanol', time: 8 },
    { id: 'biogas', name: '바이오가스', kind: '바이오 에너지', raw: 'waste', starter: 'anaer', cond: 'seal', icon: 'fm_prod_biogas', time: 8 }
  ]
};

BPF_DATA.alchemy = {
  cards: {
    field: [
      { id: 'agri', name: '농업', icon: 'fu_field_agri' }, { id: 'make', name: '제조(공장)', icon: 'fu_field_make' },
      { id: 'build', name: '건설(건물)', icon: 'fu_field_build' }, { id: 'logi', name: '물류', icon: 'fu_field_logi' },
      { id: 'med', name: '의료·건강', icon: 'fu_field_med' }, { id: 'traffic', name: '교통', icon: 'fu_field_traffic' }
    ],
    tech: [
      { id: 'iot', name: '사물 인터넷', icon: 'fu_tech_iot' }, { id: 'robot', name: '로봇', icon: 'fu_tech_robot' },
      { id: 'ai', name: '인공지능', icon: 'fu_tech_ai' }, { id: 'drone', name: '드론', icon: 'fu_tech_drone' },
      { id: 'bigdata', name: '빅데이터', icon: 'fu_tech_bigdata' }, { id: 'print3d', name: '3D 프린팅', icon: 'fu_tech_print3d' },
      { id: 'bio', name: '생명 기술', icon: 'fu_tech_bio' }, { id: 'nano', name: '나노 기술', icon: 'fu_tech_nano' },
      { id: 'mobile', name: '모바일', icon: 'fu_tech_mobile' }, { id: 'sensor', name: '센서', icon: 'fu_tech_sensor' },
      { id: 'auto', name: '자율주행', icon: 'fu_tech_auto' }
    ]
  },
  // 분야 1장 + 기술 2장 (교과서 사례를 3장 카드로 단순화)
  // tech: 교과서 대표 조합(시범·도감 표시용) / pool: 정답으로 인정하는 기술(2장 모두 이 안에서)
  // must: 이 중 1장 이상 꼭 포함(의료 분야처럼 한 분야에 제품이 여럿일 때 구분용)
  recipes: [
    { id: 'smartfarm', name: '스마트 팜', field: 'agri', tech: ['iot', 'drone'], pool: ['iot', 'sensor', 'drone', 'ai', 'bigdata', 'robot'], icon: 'fu_res_smartfarm', hint: '센서·사물 인터넷으로 생육 상태를 원격으로 살피고 드론으로 병충해를 탐색·방제해요.', clue: '작물을 자동으로 돌보는 농장' },
    { id: 'smartfactory', name: '스마트 공장', field: 'make', tech: ['iot', 'robot'], pool: ['iot', 'robot', 'ai', 'bigdata', 'sensor', 'print3d'], icon: 'fu_res_smartfactory', hint: '로봇으로 공정을 자동화하고 사물 인터넷으로 설비를 연결해 정밀하게 제어해요.', clue: '생산 전 과정을 자동 제어하는 공장' },
    { id: 'smartbuilding', name: '스마트 빌딩', field: 'build', tech: ['iot', 'ai'], pool: ['iot', 'ai', 'sensor', 'bigdata'], icon: 'fu_res_smartbuilding', hint: '인공지능이 센서 정보로 냉난방·조명·보안·에너지를 통합 관리해요.', clue: '에너지를 아끼는 똑똑한 건물' },
    { id: 'fulfillment', name: '풀필먼트 시스템', field: 'logi', tech: ['bigdata', 'robot'], pool: ['bigdata', 'robot', 'ai', 'drone', 'iot', 'auto'], icon: 'fu_res_fulfillment', hint: '빅데이터로 수요를 예측해 미리 배치하고, 주문 즉시 로봇이 포장해 배송해요.', clue: '주문하면 바로 배송하는 물류' },
    { id: 'bioprint', name: '3D 바이오 프린팅', field: 'med', tech: ['print3d', 'bio'], must: ['print3d'], pool: ['print3d', 'bio', 'ai'], icon: 'fu_res_bioprint', hint: '줄기세포·단백질을 재료로 피부·혈관 같은 신체 조직을 3D 프린터로 만들어요.', clue: '프린터로 신체 조직을 만든다면?' },
    { id: 'nanosensor', name: '나노 바이오 센서', field: 'med', tech: ['nano', 'bio'], must: ['nano'], pool: ['nano', 'bio', 'sensor', 'ai'], icon: 'fu_res_nanosensor', hint: '혈액·DNA에서 특정 분자를 찾아 컴퓨터가 읽을 수 있는 신호로 바꿔요.', clue: '아주 작은 것으로 몸속 분자를 찾는 장치' },
    { id: 'mhealth', name: '모바일 헬스케어', field: 'med', tech: ['mobile', 'sensor'], must: ['mobile', 'sensor'], pool: ['mobile', 'sensor', 'iot', 'ai', 'bigdata'], icon: 'fu_res_mhealth', hint: '심장 박동 수·혈압 등 건강 정보를 측정·관리하고 위급하면 알려 줘요.', clue: '손안에서 건강을 관리해요' },
    { id: 'wearable', name: '웨어러블 로봇', field: 'med', tech: ['robot', 'ai'], must: ['robot'], pool: ['robot', 'ai', 'sensor', 'iot'], icon: 'fu_res_wearable', hint: '입는 로봇이 부족한 근력을 보조해 재활 치료나 움직임을 도와요.', clue: '입으면 힘이 세지는 로봇' },
    { id: 'its', name: '협력 지능형 교통 시스템', field: 'traffic', tech: ['auto', 'ai'], pool: ['auto', 'ai', 'iot', 'sensor', 'bigdata'], icon: 'fu_res_its', hint: '자율주행차가 보행자·도로 시설과 통신하며 안전하게 달려요.', clue: '차와 도로가 대화하는 교통' }
  ]
};
