// ★★[PREVIEW_GUARD_API 2026-09-25 사장님 결정 «가지 미리보기를 켜되 안전장치를 먼저»]
//   운영 시트에 «쓰는» 서버 호출의 GAS 주소를 여기서만 꺼낸다.
//   미리보기 배포(VERCEL_ENV=preview)·vercel dev(development)에서는 빈 값을 돌려 쓰지 못하게 한다.
//   ★왜 — 페이지 쪽 장치(shared/preview-guard.js)는 브라우저만 막는다. 그런데 AI 상담사·문의 접수는
//     미리보기 주소의 /api 를 부르고, 그 서버 함수가 HANDOFF_WEBHOOK_URL 로 운영 시트에 쓴다
//     (문의리드 · AI 인계 · 질문 로그 · 비용 로그 · 클릭 로그). 환경 변수가 미리보기에도 걸려 있는지는
//     베르셀 설정이라 저장소에서 알 수 없다 — 모르니 코드에서 막는다.
//   ★읽기(_facts · _kbnotes)는 막지 않는다 — 시트를 바꾸지 않고, 막으면 미리보기 답변이 낡은 값을 말한다.
//   ★VERCEL_ENV 가 비어 있으면(노드로 직접 돌리는 검사) 종전대로 둔다 — 검사는 가짜 주소를 넣어 돈다.
module.exports = function writeHook() {
  const env = String(process.env.VERCEL_ENV || '');
  if (env && env !== 'production') return '';
  return process.env.HANDOFF_WEBHOOK_URL || '';
};
module.exports.isPreview = function () {
  const env = String(process.env.VERCEL_ENV || '');
  return !!env && env !== 'production';
};
