// 감사 스크립트 공용 — GAS 샌드박스에 Customers 1행 + 상담예약 1행을 시드해 '가짜 세계'를 만든다.
//   목적: 실제 .gs 함수(adminDetail·adminForceStage·_undoConfirmCore …)를 코드 읽기가 아니라
//         진짜로 호출해서 확인하되, 시트 쓰기·캘린더 삭제 같은 부작용은 이벤트 로그로 가로챈다.
//   사용:
//     import { openWorld } from './_gasworld.mjs';
//     const { G, world } = openWorld();                  // errors 있으면 throw
//     const w = world({ 현재단계:'계약완료', ... }, { 상태:'확정' });
//     G.adminForceStagePreview('ME-TEST','신청접수');
//     w.writes() / w.holdDeletes() / w.ev / w.snapshot()
import { loadGas } from './gas-lint.mjs';

export function openWorld() {
  const { sandbox: G, errors } = loadGas();
  if (errors.length) {
    const e = errors[0];
    throw new Error(`GAS 로드 실패 — ${e.file}: ${e.message}`);
  }

  // Customers 헤더 = 공식 헤더 + 제작 트랙 컬럼 + 이 저장소가 실제로 쓰는 확장 컬럼
  const HEADERS = [].concat(G.CUSTOMER_HEADERS, G._prodCols(), ['중도금상태', '중도금입금자명', '중도금입금신호', '중도금확인일시', '중도금리마인드',
    '잔금상태', '잔금입금자명', '잔금입금신호', '잔금확인일시', '잔금리마인드', '설문상태', '설문응답', '설문일시',
    '추가보정상태', '추가보정수량', '추가보정금액', '추가보정입금자명', '선택사진', '선택수', '선택확정일시', '컨펌일시',
    '원본링크', '영상링크', '보정본폴더', '좌석공유토큰', '입금완료신호', '입금자명', '시착동의상태', '시착동의일시',
    '계약서발송일시', '계약서명일시', '계약서링크', '계약총액', '예식일', '동의기록', '처리이력', '최종수정'])
    .filter((h, i, a) => a.indexOf(h) === i);
  const COL_OF = {}; HEADERS.forEach((h, i) => { COL_OF[h] = i + 1; });
  const COL_BY_NUM = {}; HEADERS.forEach((h, i) => { COL_BY_NUM[i + 1] = h; });

  function world(cells, booking, opts) {
    /* [WORLD_DROPCOL 2026-08-15 코워크 지적 3-1] 「헤더 없는 컬럼」이 존재할 수 있는 세계 —
       진짜 writeCell 은 colOf 에 없는 헤더를 조용히 건너뛴다(저장 유실 사고의 그 모양).
       전엔 HEADERS 가 항상 전 컬럼이라 이 사고를 구조적으로 재현할 수 없었다.
       opts.dropHeaders 로 뺀 컬럼은 colOf 에 없어, 제품의 _prodColsMissing 가드가 시험된다. */
    const drop = (opts && opts.dropHeaders) || [];
    const H2 = HEADERS.filter((h) => drop.indexOf(h) === -1);
    const CO = {}; H2.forEach((h, i) => { CO[h] = i + 1; });
    const CB = {}; H2.forEach((h, i) => { CB[i + 1] = h; });
    const ev = [];                                        // 이벤트 로그(쓰기·캘린더 삭제 순서까지 기록)
    const C = Object.assign({ 개인코드: 'ME-TEST', 상품타입: '시그니처' }, cells);
    const B = booking ? Object.assign({}, booking) : null;
    const sheetC = { getRange: (r, c) => ({ setValue: (v) => { ev.push({ t: 'writeC', h: CB[c], v }); C[CB[c]] = v; } }) };
    const sheetB = { getRange: (r, c) => ({ setValue: (v) => { ev.push({ t: 'writeB', h: CB[c], v }); if (B) B[CB[c]] = v; } }) };
    const row = (o, n) => ({ num: n, get: (h) => (h in o ? o[h] : '') });

    G._AUTHED = true;                                     // 디스패처가 이미 인증한 상태로 진입(_requireAdmin 통과)
    G._CURRENT_ADMIN = '점검';
    G.findCustomerByCode = () => row(C, 2);
    G.getCustomersSheet = () => sheetC;
    G.getSheet = () => sheetB;
    G.buildHeaderIndex = () => CO;
    G.findRowByPersonalCode = () => (B ? row(B, 2) : null);
    G.deleteCalendarEvent = () => { ev.push({ t: 'calBooking' }); };
    G.coupleNames = () => '테스트 · 고객';
    G._holdCalDelete = (hold) => { ev.push({ t: 'holdCalDelete', hold }); };
    G.notifyKakao = (k) => { ev.push({ t: 'notify', k }); };
    G.notifyStudio = () => {};
    G.setCustomerStage = () => {};

    return {
      C, B, ev,
      writes: () => ev.filter((e) => e.t === 'writeC' || e.t === 'writeB'),
      holdDeletes: () => ev.filter((e) => e.t === 'holdCalDelete'),
      idx: (pred) => ev.findIndex(pred),
      snapshot: () => JSON.stringify(C),
    };
  }

  return { G, world, HEADERS, COL_OF, COL_BY_NUM };
}

// 'yyyy-MM-dd HH:mm'(KST) — hoursAgo 시간 전
export const kstAgo = (hoursAgo) => {
  const d = new Date(Date.now() - hoursAgo * 3600e3 + 9 * 3600e3);
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())} ${z(d.getUTCHours())}:${z(d.getUTCMinutes())}`;
};
