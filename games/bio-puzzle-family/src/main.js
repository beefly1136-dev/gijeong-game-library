/* 시작 */
(function () {
  'use strict';
  const BPF = window.BPF;
  BPF.save.load();
  // 개발·검수용: 주소 뒤에 ?scene=play&id=g01 처럼 붙이면 바로 이동
  const q = new URLSearchParams(location.search);
  BPF.start('boot');
  if (q.get('scene')) {
    const wait = setInterval(() => {
      if (BPF.sceneName === 'title') {
        clearInterval(wait);
        const d = BPF.save.data;
        if (!d.selectedPlayerId) { d.selectedPlayerId = q.get('pid') || 'p01'; d.firstRunDone = true; }
        BPF.go(q.get('scene'), { id: q.get('id'), back: 'village' });
      }
    }, 100);
  }
})();
