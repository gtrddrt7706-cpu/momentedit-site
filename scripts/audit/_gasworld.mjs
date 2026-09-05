// 감사 스크립트 공용 — GAS 샌드박스에 Customers 1행 + 상담예약 1행을 시드해 '가짜 세계'를 만든다.
//   목적: 실제 .gs 함수(adminDetail·adminForceStage·_undoConfirmCore …)를 코드 읽기가 아니라
//         진짜로 호출해서 확인하되, 시트 쓰기·캘린더 삭제 같은 부작용은 이벤트 로그로 가로챈다.
//   사용:
//     import { openWorld } from './_gasworld.mjs';
//     const { G, world } = openWorld();                  // errors 있으면 throw
//     const w = world({ 현재단계:'계약완료', ... }, { 상태:'확정' });
//     G.adminForceStagePreview('ME-TEST','신청접수');
//     w.writes() / w.holdDeletes() / w.ev / w.snapshot()
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGas } from './gas-lint.mjs';

/* ★[WORLD_BOOKING] 예약 시트 헤더는 consultation-booking.gs 의 `const HEADERS = [...]` 다.
   const 는 샌드박스 전역에 안 올라와 G.HEADERS 로 못 읽는다(실측: undefined) —
   그렇다고 여기 베껴 두면 원본이 늘 때 조용히 어긋난다(우리가 반복해 밟은 그 함정).
   그래서 **원본 리터럴을 읽어 온다.** 못 읽으면 던진다 — 못 잼은 통과가 아니다. */
function bookingHeaders() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const file = path.resolve(here, '../../automation/consultation/consultation-booking.gs');
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/const\s+HEADERS\s*=\s*\[([\s\S]*?)\];/);
  if (!m) throw new Error('WORLD_BOOKING: consultation-booking.gs 의 const HEADERS 를 못 찾음');
  const list = (m[1].match(/'([^']*)'|"([^"]*)"/g) || []).map((q) => q.slice(1, -1)).filter(Boolean);
  if (list.length < 10) throw new Error('WORLD_BOOKING: 예약 헤더가 ' + list.length + '개 — 파싱이 깨졌다');
  return list;
}

export function openWorld() {
  const { sandbox: G, errors } = loadGas();
  if (errors.length) {
    const e = errors[0];
    throw new Error(`GAS 로드 실패 — ${e.file}: ${e.message}`);
  }

  const BOOK_H = bookingHeaders();          // [WORLD_BOOKING] 예약 시트 헤더(원본 리터럴에서)
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
    /* ★[WORLD_BOOKING 2026-08-15 코워크 지적 3바퀴 9-2] 예약 시트도 제 헤더를 갖는다.
       전엔 buildHeaderIndex 가 시트를 안 보고 Customers 헤더 하나만 돌려줘,
       예약 시트 쓰기(환불계좌·취소일시·확정일시·토큰·캘린더이벤트ID…)가 **전부 조용히 사라지고
       그래도 검사는 초록**이었다 — [WORLD_DROPCOL] 이 메운 구멍의 쌍둥이(검사가 안 보는 곳).
       진짜 buildHeaderIndex(sheet) 처럼 **시트마다 다른 표**를 준다. */
    const BH = BOOK_H;
    const BO = {}; BH.forEach((h, i) => { BO[h] = i + 1; });
    const BN = {}; BH.forEach((h, i) => { BN[i + 1] = h; });
    const ev = [];                                        // 이벤트 로그(쓰기·캘린더 삭제 순서까지 기록)
    const C = Object.assign({ 개인코드: 'ME-TEST', 상품타입: '시그니처' }, cells);
    const B = booking ? Object.assign({ 개인코드: 'ME-TEST' }, booking) : null;   // [WORLD_READ] adminHome 이 예약↔고객을 개인코드로 잇는다 — 픽스처마다 적지 않게 기본값
    /* ★[WORLD_RANGE 2026-08-17 stage-reach 가 걸림] 시트 목이 1칸 setValue 만 알았다.
       진짜 코드에는 «행 전체를 한 번에 읽는» 길이 따로 있다 — row(sheet,colOf,n) 이
       getRange(n,1,1,getLastColumn()).getValues() 로 읽는다(consultation-booking 1577).
       그 길을 모르면 adminApprove·adminAcceptProposal·adminCancel 이 **던지고**,
       검사기는 그걸 «문이 없다»로 읽는다 — 가짜 막다른 길이 만들어진다(실제로 만들어졌다).
       읽기를 열어 두면 못 재는 칸이 줄고, 검사기가 못 재는 것을 통과로 세지 않는다. */
    const rangeFor = (store, byNum, width, tag) => (r, c, nr, nc) => ({
      setValue: (v) => { ev.push({ t: tag, h: byNum[c], v }); store[byNum[c]] = v; },
      getValue: () => (byNum[c] in store ? store[byNum[c]] : ''),
      getValues: () => [Array.from({ length: nc || 1 }, (_, i) => { const h = byNum[(c || 1) + i]; return h && (h in store) ? store[h] : ''; })],
      setValues: (vv) => { (vv[0] || []).forEach((v, i) => { const h = byNum[(c || 1) + i]; if (h) { ev.push({ t: tag, h, v }); store[h] = v; } }); },
      setNumberFormat: () => {}, setBackground: () => {}, setFontColor: () => {}, setNote: () => {},
    });
    const sheetC = { getLastRow: () => 2, getLastColumn: () => H2.length, getMaxColumns: () => H2.length,
      getRange: rangeFor(C, CB, H2.length, 'writeC') };
    const sheetB = { _isBooking: true, getLastRow: () => 2, getLastColumn: () => BH.length, getMaxColumns: () => BH.length,
      getRange: rangeFor(B || {}, BN, BH.length, 'writeB') };
    const row = (o, n) => ({ num: n, get: (h) => (h in o ? o[h] : '') });

    G._AUTHED = true;                                     // 디스패처가 이미 인증한 상태로 진입(_requireAdmin 통과)
    G._CURRENT_ADMIN = '점검';
    G.findCustomerByCode = () => row(C, 2);
    G.getCustomersSheet = () => sheetC;
    G.getSheet = () => sheetB;
    G.buildHeaderIndex = (sh) => (sh && sh._isBooking ? BO : CO);   // [WORLD_BOOKING] 시트마다 제 표
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
/* ★[KST_AHEAD 2026-09-05 점검] 미래 날짜(yyyy-mm-dd, KST). 시뮬레이터가 상담·예식 날짜를 «고정»으로 박으면
   시간이 흘러 그 날짜가 과거가 되고, 서버의 PAST_SLOT_REJECT 가 «정상적으로» 거절해 여정이 막힌다
   (2026-09-05 실측: '2026-09-01' 이 과거가 되어 rollback-fuzz·roundtrip 이 통째로 붉었다).
   지금 기준으로 계산하면 다시 썩지 않는다. */
export const kstAhead = (days) => {
  const d = new Date(Date.now() + days * 86400e3 + 9 * 3600e3);
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())}`;
};

export const kstAgo = (hoursAgo) => {
  const d = new Date(Date.now() - hoursAgo * 3600e3 + 9 * 3600e3);
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())} ${z(d.getUTCHours())}:${z(d.getUTCMinutes())}`;
};
