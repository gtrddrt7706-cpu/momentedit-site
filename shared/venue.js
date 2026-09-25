/* ★★[PREVIEW_GUARD 2026-09-25] 운영 주소가 아니면 «서버 연결 막는 장치»를 먼저 끼워 넣는다.
   청첩장 템플릿(i/ · i-family/)은 손으로 고치지 않는다 — 대신 템플릿이 모두 «동기로 먼저» 부르는
   이 파일에서 끼운다. 파서가 이 스크립트를 실행하는 중이라 document.write 로 넣은 스크립트가
   hydrate.js(defer)보다 먼저 돈다. ★운영 주소에서는 판정 한 줄만 돌고 아무것도 안 한다.
   ★운영 주소 목록은 shared/preview-guard.js 의 PROD_HOSTS 와 같아야 한다(scripts/audit/preview-guard.mjs 가 대조). */
(function () {
  var h = String((window.location && window.location.hostname) || '').toLowerCase().replace(/\.$/, '');
  if (h !== 'momentedit.kr' && h !== 'www.momentedit.kr' && !window.__mePreviewGuardInstalled) {
    document.write('<script src="/shared/preview-guard.js"><\/script>');
  }
})();

/*
 * Moment Edit · 고정 식장 정보 (모든 청첩장 공통)
 * ──────────────────────────────────────────────────────────────
 * 식장은 모먼트 에디트 스튜디오 한 곳으로 고정이다(커플마다 다르지 않음).
 * 그래서 시트가 아니라 여기 한 곳에서만 관리한다.
 *
 * ⚠️ 사업장 본계약 후 ADDRESS / TRANSPORT / PARKING / MAP_IFRAME 네 줄만
 *    채우면 모든 청첩장(라이브·가족)에 한 번에 반영된다. 커플별 입력 불필요.
 */
window.MOMENT_VENUE = {
  nameKo:    '모먼트 에디트 스튜디오',
  nameEn:    'Moment Edit Studio',

  // 계약 전 — 정확 주소 미정. 본계약 후 정확 주소로 교체.
  address:   '경기 고양시 덕양구 향동동 (정확한 주소는 본계약 후 안내드립니다)',

  // 본계약 후 채울 항목 (비어 있으면 청첩장에서 해당 줄 자동 숨김)
  transport: '',   // 예: '6호선 디지털미디어시티역 1번 출구 차량 8분'
  parking:   '',   // 예: '건물 지하 1~3층 주차 가능 (3시간 무료)'
  mapIframe: ''    // 예: 'https://maps.google.com/maps?q=...&output=embed'
};
