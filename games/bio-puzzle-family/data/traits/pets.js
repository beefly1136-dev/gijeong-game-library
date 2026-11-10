/* 플레이어 캐릭터·육성 동반 생명체 기본 데이터 (player와 companion은 절대 혼용하지 않는다) */
window.BPF_DATA = window.BPF_DATA || {};
BPF_DATA.players = {
  p01: { name: '하루', color: '#3f8cff', title: '활달한 학생 연구원', desc: '고글을 쓴 열정파!\n먼저 해 보고 배우는 타입.',
    lines: { idle: ['좋아, 해 보자!', '준비 완료!'], thinking: ['음… 어디에 둘까?', '잘 보자…'], acting: ['이쪽이다!', '간다!'],
      success: ['좋았어!', '맞았다!'], mistake: ['앗, 실수!', '으아, 다시!'], combo: ['연속이다!!', '멈출 수 없어!'], win: ['해냈다! 최고야!'], lose: ['아깝다… 다시 도전!'] } },
  p02: { name: '도하', color: '#5b4fd6', title: '차분한 학생 연구원', desc: '안경 너머 침착한 분석가.\n근거를 확인하는 습관!',
    lines: { idle: ['자료부터 확인하자.', '침착하게.'], thinking: ['조건을 따져 보면…', '근거가 뭘까.'], acting: ['여기다.', '실행.'],
      success: ['예상대로야.', '정확해.'], mistake: ['…계산 착오.', '다시 검토하자.'], combo: ['흐름이 좋아.', '완벽한 연속이군.'], win: ['연구 성공이다.'], lose: ['데이터를 더 모으자.'] } },
  p03: { name: '나리', color: '#ff6fa8', title: '호기심 많은 발명가', desc: '반짝이는 아이디어 담당.\n궁금한 건 못 참아!',
    lines: { idle: ['오늘은 뭘 발견할까?', '두근두근!'], thinking: ['흐음, 궁금한데?', '이건 어때?'], acting: ['요렇게!', '얍!'],
      success: ['딩동댕~!', '역시 나야!'], mistake: ['흐잉… 다시!', '어라라?'], combo: ['콤보 콤보!', '반짝반짝 연속!'], win: ['대발견이야~!'], lose: ['괜찮아, 다음엔 꼭!'] } },
  p04: { name: '시온', color: '#5fbf3f', title: '도전형 탐험가', desc: '자연을 사랑하는 모험가.\n어려울수록 신나!',
    lines: { idle: ['모험 시작이야!', '자연 속으로!'], thinking: ['어떤 길이 좋을까?', '관찰 중…'], acting: ['돌진!', '받아라!'],
      success: ['예스!', '아주 좋아!'], mistake: ['윽, 미끄러졌다!', '아차!'], combo: ['기세를 몰아서!', '연속 탐험 성공!'], win: ['정상 정복!'], lose: ['다시 오르면 돼!'] } }
};

BPF_DATA.pets = {
  lulu: { name: '루루', kind: '별여우', color: '#ff9a4d', bg: ['#fff1e6', '#ffd3b0'],
    stages: ['동그란 아기 여우', '귀와 꼬리가 커진 꼬마 여우', '별 목걸이의 날렵한 여우', '풍성한 꼬리의 수호 여우', '별빛 꼬리의 별여우'],
    personality: '포근하고 사랑스러운 성격. 반짝이는 것을 좋아해요.',
    ending: '별이 쏟아지는 밤, 루루는 별빛 꼬리를 펼쳐 연구 마을 하늘에 길을 그렸어요. "언제나 네 옆에서 빛날게!" 함께한 모든 날이 별자리가 되었답니다.',
    mission4: { game: 'g01', grade: 'B', text: 'DNA 짝꿍 맞추기 B등급 이상' },
    mission5: { game: 'g07', grade: 'A', text: '융합 기술 연금술 A등급 이상' } },
  coco: { name: '코코', kind: '구름토끼', color: '#ff8fb8', bg: ['#fff0f6', '#ffd1e4'],
    stages: ['손바닥 크기 아기 토끼', '리본을 단 꼬마 토끼', '꽃 장식의 푹신 토끼', '구름을 두른 우아한 토끼', '하늘을 뛰는 구름 수호자'],
    personality: '발랄하고 통통 튀는 성격. 폭신한 구름을 좋아해요.',
    ending: '코코는 구름 날개로 마을 위를 깡충 날아올라 축제 꽃잎을 뿌렸어요. "네 덕분에 하늘까지 닿았어!" 모두가 고개를 들어 웃었답니다.',
    mission4: { game: 'g02', grade: 'B', text: '바이오 발효 공장 B등급 이상' },
    mission5: { game: 'g06', grade: 'A', text: '생명 기술 분류 센터 A등급 이상' } },
  tani: { name: '탄이', kind: '숲고양이', color: '#4bb36b', bg: ['#eefbea', '#c9efc2'],
    stages: ['작은 아기 고양이', '나뭇잎 망토의 고양이', '꽃과 잎 장식의 숲 고양이', '덩굴 망토의 숲 수호 고양이', '사슴뿔 잎관의 숲의 왕'],
    personality: '시크하지만 다정한 성격. 숲과 식물을 지켜요.',
    ending: '탄이가 발을 딛는 곳마다 새싹이 돋았어요. 정화된 숲에 꽃이 가득 피자 탄이는 조용히 속삭였어요. "우리가 지킨 숲이야."',
    mission4: { game: 'g09', grade: 'B', text: '생물 정화 대작전 B등급 이상' },
    mission5: { game: 'g08', grade: 'A', text: '면역 수호대 A등급 이상' } },
  bibi: { name: '비비', kind: '꼬마용', color: '#5b8cff', bg: ['#eef3ff', '#c9d8ff'],
    stages: ['막 깨어난 미니 드래곤', '작은 날개의 통통 용', '날개가 자란 장난꾸러기 용', '왕관 뿔의 늠름한 용', '수정 날개의 수호룡'],
    personality: '익살맞고 용감한 성격. 웅장하지만 친근해요.',
    ending: '비비는 수정 날개를 활짝 펴고 연구 마을을 한 바퀴 돌았어요. "작았던 내가 이렇게 컸어! 이제 내가 너를 지켜 줄게." 축제의 불꽃이 하늘을 수놓았답니다.',
    mission4: { game: 'g05', grade: 'B', text: '유전자 재조합 연구소 B등급 이상' },
    mission5: { game: 'g04', grade: 'A', text: 'GMO 메이커 A등급 이상' } }
};

/* 성장 기준(명세 5장) */
BPF_DATA.growth = [
  null,
  { xp: 0 },
  { xp: 100, req: { love: 30, health: 30 }, desc: '애정·건강 30 이상' },
  { xp: 300, req: { love: 45, health: 45, know: 35 }, desc: '애정·건강 45, 지식 35 이상' },
  { xp: 650, req: { love: 50, health: 50, charm: 50, know: 50 }, mission: 'mission4', desc: '4지수 모두 50 이상 + 전용 의뢰' },
  { xp: 1100, req: { love: 70, health: 70, charm: 70, know: 70 }, mission: 'mission5', desc: '4지수 모두 70 이상 + 전용 엔딩 임무' }
];

BPF_DATA.npcs = [
  { id: 'dr', name: '한빛 박사', color: '#7b5cff', hair: '#e8e8f0', role: '연구소장' },
  { id: 'shop', name: '보리 상점주', color: '#ff9a4d', hair: '#7a4a2a', role: '발효 상점' },
  { id: 'farmer', name: '들풀 농부', color: '#5fbf3f', hair: '#3a2a1a', role: '품종개량 농부' },
  { id: 'gene', name: '유리 연구원', color: '#3fb6d6', hair: '#202040', role: '유전 연구관' },
  { id: 'eco', name: '솔 숲지기', color: '#2f9e6a', hair: '#5a3a1a', role: '환경 숲 관리인' },
  { id: 'fest', name: '모아 축제단장', color: '#ff5fa0', hair: '#ffcf3f', role: '축제 광장' }
];
