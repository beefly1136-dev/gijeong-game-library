/* 욕설·비속어·혐오 표현 차단 필터
   - 공백·숫자·특수문자 끼워 넣기(시1발, 씨 발), 비슷한 모음·된소리 바꾸기(씌발, 쉬발),
     자음만 쓰기(ㅅㅂ), 영문 자판으로 치기(tlqkf), 영어 욕설까지 막는다.
   - 걸리면 이름으로 쓸 수 없고, 3번 이상 시도하면 기본 이름으로 고정된다. */
(function () {
  'use strict';
  const BPF = window.BPF;
  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
  const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  // 비슷하게 들리는 글자를 하나로 모음
  const SIMPLE = {
    'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ', 'ㅋ': 'ㄱ', 'ㅌ': 'ㄷ', 'ㅍ': 'ㅂ', 'ㅊ': 'ㅈ',
    'ㅐ': 'ㅔ', 'ㅒ': 'ㅔ', 'ㅖ': 'ㅔ', 'ㅑ': 'ㅏ', 'ㅕ': 'ㅓ', 'ㅛ': 'ㅗ', 'ㅠ': 'ㅜ',
    'ㅟ': 'ㅣ', 'ㅢ': 'ㅣ', 'ㅚ': 'ㅔ', 'ㅙ': 'ㅔ', 'ㅞ': 'ㅔ', 'ㅘ': 'ㅏ', 'ㅝ': 'ㅓ', 'ㅡ': 'ㅜ'
  };
  // 영문 자판 → 한글 자모 (tlqkf → ㅅㅣㅂㅏㄹ)
  const QWERTY = { q: 'ㅂ', w: 'ㅈ', e: 'ㄷ', r: 'ㄱ', t: 'ㅅ', y: 'ㅛ', u: 'ㅕ', i: 'ㅑ', o: 'ㅐ', p: 'ㅔ', a: 'ㅁ', s: 'ㄴ', d: 'ㅇ', f: 'ㄹ', g: 'ㅎ', h: 'ㅗ', j: 'ㅓ', k: 'ㅏ', l: 'ㅣ', z: 'ㅋ', x: 'ㅌ', c: 'ㅊ', v: 'ㅍ', b: 'ㅠ', n: 'ㅜ', m: 'ㅡ', Q: 'ㅃ', W: 'ㅉ', E: 'ㄸ', R: 'ㄲ', T: 'ㅆ', O: 'ㅒ', P: 'ㅖ' };
  const LOOK = { '8': '팔', '1': 'ㅣ', 'l': 'ㅣ', '|': 'ㅣ', '!': 'ㅣ', 'i': 'ㅣ', '0': 'ㅇ', 'o': 'ㅇ' };

  function toJamo(str) {
    let out = '';
    for (const ch of str) {
      const c = ch.charCodeAt(0);
      if (c >= 0xAC00 && c <= 0xD7A3) {
        const k = c - 0xAC00;
        out += CHO[Math.floor(k / 588)] + JUNG[Math.floor((k % 588) / 28)] + (JONG[k % 28] || '∅'); // 받침 없음 표시로 음절 경계 유지
      } else out += ch;
    }
    return out;
  }
  function simplify(j) { return j.split('').map(x => SIMPLE[x] || x).join(''); }
  function clean(str) { return str.replace(/[\s\d_\-.,~!@#$%^&*()+=\[\]{}<>?/\\|'"`:;·ㆍ♡♥☆★]/g, ''); }
  function squeeze(s) { return s.replace(/(.)\1+/g, '$1'); }

  // 한글 욕설·비하·성적·혐오 표현 (자모 단순화 후 비교)
  const KO = ['시발', '씨발', '씨팔', '시팔', '쓰발', '시빨', '씨빨', '씹', '좆', '좃', '존나', '졸라', '조낸', '병신', '븅신', '빙신', '병쉰', '등신', '머저리',
    '개새', '개색', '개세', '새끼', '쌔끼', '섀끼', '새기', '개년', '개놈', '미친', '미췬', '또라이', '돌아이', '지랄', '염병', '엠창', '앰창', '니미', '니애미', '느금', '느그애미', '니애비',
    '닥쳐', '꺼져', '호로새', '쌍놈', '쌍년', '썅', '찐따', '병맛', '년아', '놈아', '창녀', '걸레', '보지', '자지', '섹스', '야동', '강간', '성교', '변태',
    '한남', '한녀', '김치녀', '맘충', '급식충', '틀딱', '장애새', '죽어라', '뒤져', '디져', '자살', '꼴통', '빡대가리', '대가리', '멍청이', '바보새', '똥개', '개돼지'];
  // 자음만 쓴 욕 (따로 떨어진 자음 입력에서만 검사)
  const CHO_ONLY = ['ㅅㅂ', 'ㅆㅂ', 'ㅂㅅ', 'ㅄ', 'ㅈㄹ', 'ㅁㅊ', 'ㄱㅅㄲ', 'ㅅㄲ', 'ㅈㄴ', 'ㄲㅈ', 'ㄷㅊ', 'ㅗ', 'ㅈㄹㄴ', 'ㅆㄹㄱ', 'ㅂㄹ', 'ㄴㄱㅁ', 'ㅇㅁ'];
  const EN = ['fuck', 'fuk', 'fck', 'shit', 'bitch', 'btch', 'asshole', 'dick', 'pussy', 'cunt', 'bastard', 'slut', 'whore', 'nigg', 'retard', 'sex', 'porn', 'stupid', 'idiot', 'wtf', 'stfu', 'sibal', 'ssibal', 'shibal', 'byungsin', 'byeongsin', 'gaesaekki', 'jiral', 'jonna', 'michin'];
  const KO_J = KO.map(w => squeeze(simplify(toJamo(w))));

  const F = BPF.filter = {
    /* true면 사용할 수 없는 말 */
    isBad(input) {
      if (!input) return false;
      const raw = String(input).normalize('NFC');
      const lower = raw.toLowerCase();
      // 1) 영어 욕설 (특수문자·숫자 끼워 넣기 제거, 0/1 같은 모양 치환)
      const en = lower.replace(/0/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/4|@/g, 'a').replace(/5|\$/g, 's').replace(/[^a-z]/g, '');
      if (EN.some(w => en.includes(w))) return true;
      // 2) 영문 자판으로 친 한글 (tlqkf, qudtls)
      const typed = raw.replace(/[^A-Za-z]/g, '').split('').map(c => QWERTY[c] || QWERTY[c.toLowerCase()] || '').join('');
      // 3) 한글: 자모 분해 → 숫자·기호 제거 → 비슷한 소리 통일 → 반복 축약
      const looked = raw.split('').map(c => LOOK[c] || c).join('');
      const variants = [looked, typed, raw];
      for (const v of variants) {
        const j = squeeze(simplify(toJamo(clean(v))));
        if (KO_J.some(w => w && j.includes(w))) return true;
        // 자음만 따로 쓴 경우(ㅅㅂ, ㅅ ㅂ, ㅅ1ㅂ)
        const consonants = clean(v).split('').filter(c => CHO.includes(c) || c === 'ㅄ' || c === 'ㅗ').join('');
        if (consonants.length >= 1 && CHO_ONLY.some(w => consonants.includes(w))) return true;
      }
      // 4) 같은 글자만 반복(ㅋㅋㅋㅋ 등 의미 없는 이름)도 막지는 않음
      return false;
    },
    strikes: 0,
    /* 이름 검사: {ok, name, msg} */
    checkName(name, fallback) {
      const n = String(name || '').replace(/[<>&"']/g, '').trim().slice(0, 8);
      if (!n) return { ok: true, name: fallback };
      if (F.isBad(n)) {
        F.strikes++;
        if (F.strikes >= 3) { F.strikes = 0; return { ok: false, forced: true, name: fallback, msg: `바르지 않은 말을 여러 번 써서 이름이 「${fallback}」(으)로 정해졌어요.` }; }
        return { ok: false, name: '', msg: `욕설·비속어·놀리는 말은 이름으로 쓸 수 없어요! (경고 ${F.strikes}/3)` };
      }
      return { ok: true, name: n };
    }
  };
})();
