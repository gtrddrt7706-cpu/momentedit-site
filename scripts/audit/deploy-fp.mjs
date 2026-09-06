// [FP_BROAD] 배포 지문이 «표본 밖» 변경도 보는가 — 2026-09-06 관리자 점검이 찾은 구멍의 회귀 검사.
//   실제로 났던 일: adminHome 을 고쳐 배포했는데 지문이 변경 전후 똑같아(1lzcle2),
//   deployCheck ④ 가 «배포본이 지금 저장된 코드와 같다»를 재배포 여부와 무관하게 말했다.
//   지금은 전역 함수 전체의 «이름:소스길이» 서명이 지문에 함께 들어간다.
//   사용: node scripts/audit/deploy-fp.mjs   (브라우저 불필요 · 실패 0이어야 한다)
const { openWorld } = await import('./_gasworld.mjs');
const { G } = openWorld();
let fail = 0;
const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : ' → ' + String(d).slice(0, 160)}`); if (!c) fail++; };

console.log('\n[FP_BROAD] 배포 지문 범위');
ok(typeof G._dsGlobalSig === 'function', '_dsGlobalSig 가 있다');
const sig = String(G._dsGlobalSig() || '');
ok(/^\d+#[0-9a-z]+$/.test(sig), '전역 서명이 «개수#해시» 모양으로 나온다', sig.slice(0, 40));
const n = Number(sig.split('#')[0] || 0);
ok(n > 400, `전역 함수를 충분히 센다(${n}개)`, sig);

const base = G.deployFingerprint();
ok(/^[0-9a-z]+$/.test(String(base)), 'deployFingerprint 가 값을 낸다', base);

/* ★핵심 회귀 — DEPLOY_STAMP_FNS 표본 «밖»의 함수 하나만 달라져도 지문이 바뀌어야 한다.
   adminHome 은 그 표본에 없다(doPost·handleSaveProductionTrack·adminSendContract·_refundQuote·handleGetMyState).
   이 검사가 빨개지면 ④ 가 다시 «재배포를 안 해도 같다»고 말하기 시작한 것이다. */
const SAMPLE = ['doPost', 'handleSaveProductionTrack', 'adminSendContract', '_refundQuote', 'handleGetMyState'];
ok(SAMPLE.indexOf('adminHome') === -1, 'adminHome 은 표본 밖이다(전제)');
const orig = G.adminHome;
try {
  G.adminHome = function adminHome() { return { ok: true, changed: '표본 밖 변경 흉내' }; };
  const after = G.deployFingerprint();
  ok(after !== base, '★표본 밖(adminHome) 한 함수만 달라져도 지문이 바뀐다', `전 ${base} · 후 ${after}`);
} finally { G.adminHome = orig; }
ok(G.deployFingerprint() === base, '되돌리면 지문도 되돌아온다(계산이 결정적)', G.deployFingerprint() + ' vs ' + base);

/* 표본 «안» 변경도 종전대로 잡히는가(내용 해시 쪽) */
const orig2 = G._refundQuote;
try {
  G._refundQuote = function _refundQuote() { return null; };
  ok(G.deployFingerprint() !== base, '표본 안(_refundQuote) 변경도 여전히 잡힌다');
} finally { G._refundQuote = orig2; }

console.log(`\n결과 — 실패 ${fail}건`);
process.exit(fail ? 1 : 0);
