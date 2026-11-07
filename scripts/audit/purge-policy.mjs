#!/usr/bin/env node
/* ★[PURGE_POLICY_1106 2026-11-06 사장님 결정 3 = A] 자료 정리가 처리방침 문구대로 도는가 — 가짜 시트 · 가짜 드라이브로 실제 GAS 함수를 돌린다.
   ① 기간: 하객 사진 · 결과물 = 인도 완료 후 6개월(달력) · 목소리 파일 = 예식 뒤 30일 · 식전 영상 = 예식 후 6개월 · 말일 넘김 없음(8/31 → 2/28)
   ② 시험 모드(PURGE_LIVE 없음) = 아무것도 안 지움(DELETE 0 · 칸 · 표시 그대로) · 건수만
   ③ 실제 모드 = 드라이브 API 로 영구 삭제(DELETE) · 지운 것만 «지움 · RFGONE · 결과물파기» · 결과물은 원본 폴더까지
   ④ 실패(L18) = 표시 안 함 · 식별자 남김 · 다음 날 다시 · 관리자 메일(개인코드 · 까닭만)
   ⑤ 건수 = «자료정리기록» 시트에 종류별 대상 · 지움 · 실패
   종료 코드: 0 통과 · 1 빨강 · 2 재지 못함 */
import { loadGas, makeSandbox } from './gas-lint.mjs';

const sb = makeSandbox();
const { errors } = loadGas(sb);
if (errors.length) { console.log('━━ purge-policy — GAS 로드 실패 · 재지 못했습니다: ' + errors[0].file); process.exit(2); }
const bad = []; let n = 0;
const ok = (c, label, info) => { n++; if (!c) bad.push(label + (info ? ' → ' + JSON.stringify(info) : '')); };
const TODAY = '2026-11-06';

// ── ① 달력 개월
ok(sb._pgAddMonths_('2026-08-31', 6) === '2027-02-28' && sb._pgAddMonths_('2027-08-31', 6) === '2028-02-29' && sb._pgAddMonths_('2026-05-06', 6) === '2026-11-06' && sb._pgAddMonths_('2026-12-15', 6) === '2027-06-15', '달력 6개월 · 말일 넘김 없음', [sb._pgAddMonths_('2026-08-31', 6), sb._pgAddMonths_('2027-08-31', 6)]);
ok(sb._pgIdOf_('https://drive.google.com/drive/folders/AAAAAAAAAAAAAAAAAAAAAAAA?usp=x') === 'AAAAAAAAAAAAAAAAAAAAAAAA' && sb._pgIdOf_('https://drive.google.com/file/d/BBBBBBBBBBBBBBBBBBBBBBBB/view') === 'BBBBBBBBBBBBBBBBBBBBBBBB' && sb._pgIdOf_('https://vimeo.com/123') === '', '드라이브 링크에서 ID · 비메오는 아님');

function world() {
  const props = new Map(), calls = [], mails = [], logRows = [];
  const FAIL = new Set(['FOLDER_GP_A2_xxxxxxxxxxxxxxx', 'FOLDER_RESULT_G_xxxxxxxxxxxxxxxx', 'FILE_RF_V4_a_xxxxxxxxxxxxxxxx']);
  const H = ['개인코드', '예식일', '동의기록', '하객사진폴더ID', '원본폴더ID', '원본링크', '보정본폴더', '영상링크', '결과물상태'];
  const colOf = Object.fromEntries(H.map((h, i) => [h, i + 1]));
  const R = (o) => H.map((h) => (h === '동의기록' ? JSON.stringify(o.rec || {}) : (o[h] ?? '')));
  const rows = [
    R({ 개인코드: 'A', 예식일: '2026-04-01', 하객사진폴더ID: 'FOLDER_GP_A_xxxxxxxxxxxxxxxx', rec: { 결과물전달일: '2026-05-06 10:00', 보관만료통지: '2026-10-30 11:00' } }),   // 인도 + 6개월 = 오늘 · [GUEST_WITH_NOTICE_1107] 통지 뒤 7일
    R({ 개인코드: 'A2', 예식일: '2026-04-01', 하객사진폴더ID: 'FOLDER_GP_A2_xxxxxxxxxxxxxxx', rec: { 결과물전달일: '2026-05-01', 보관만료통지: '2026-10-25' } }),   // 지우기 실패
    R({ 개인코드: 'A3', 예식일: '2026-04-01', 하객사진폴더ID: 'FOLDER_GP_A3_xxxxxxxxxxxxxxx', rec: { 결과물전달일: '2026-05-01' } }),   // [GUEST_WITH_NOTICE_1107] 통지 없음 = 안 지움
    R({ 개인코드: 'A4', 예식일: '2026-04-01', 하객사진폴더ID: 'FOLDER_GP_A4_xxxxxxxxxxxxxxx', rec: { 결과물전달일: '2026-05-01', 보관만료통지: '2026-11-03' } }),   // 통지 3일째 = 안 지움
    R({ 개인코드: 'B', 예식일: '2026-04-01', 하객사진폴더ID: 'FOLDER_GP_B_xxxxxxxxxxxxxxxx', rec: { 결과물전달일: '2026-05-07' } }),          // 내일
    R({ 개인코드: 'C', 예식일: '2025-01-01', 하객사진폴더ID: 'FOLDER_GP_C_xxxxxxxxxxxxxxxx', rec: {} }),                                      // 인도 전
    R({ 개인코드: 'D', 예식일: '2026-04-01', 원본폴더ID: 'FOLDER_RESULT_D_xxxxxxxxxxxxxxxx', 원본링크: 'https://drive.google.com/drive/folders/FOLDER_RESULT_D_xxxxxxxxxxxxxxxx', 영상링크: 'https://vimeo.com/1', 보정본폴더: 'https://drive.google.com/drive/folders/FOLDER_EDIT_D_xxxxxxxxxxxxxxxxx', 결과물상태: '전달완료', rec: { 결과물전달일: '2026-05-06', 보관만료통지: '2026-10-30 09:00' } }),
    R({ 개인코드: 'E', 예식일: '2026-04-01', 원본폴더ID: 'FOLDER_RESULT_E_xxxxxxxxxxxxxxxx', 원본링크: 'x', 결과물상태: '전달완료', rec: { 결과물전달일: '2026-05-06', 보관만료통지: '2026-11-02' } }),   // 통지 뒤 7일 안
    R({ 개인코드: 'F', 예식일: '2026-01-01', 원본폴더ID: 'FOLDER_RESULT_F_xxxxxxxxxxxxxxxx', rec: { 결과물전달일: '2026-02-01', 보관만료통지: '2026-07-25', 결과물파기: '2026-08-02' } }),   // 옛 판(링크만 비움)
    R({ 개인코드: 'G', 예식일: '2026-04-01', 원본폴더ID: 'FOLDER_RESULT_G_xxxxxxxxxxxxxxxx', 원본링크: 'y', 결과물상태: '전달완료', rec: { 결과물전달일: '2026-05-01', 보관만료통지: '2026-10-25' } }),   // 지우기 실패
    R({ 개인코드: 'V1', 예식일: '2026-10-07' }), R({ 개인코드: 'V2', 예식일: '2026-10-08' }), R({ 개인코드: 'V3', 예식일: '2026-01-01' }), R({ 개인코드: 'V4', 예식일: '2026-09-01' }),
    R({ 개인코드: 'P1', 예식일: '2026-05-06' })];
  const cust = { getLastRow: () => rows.length + 1, getLastColumn: () => H.length, getRange: (r, c, nr) => ({ getValues: () => rows.slice(r - 2, r - 2 + nr).map((x) => x.slice()) }) };
  const get = (code, h) => rows.find((x) => x[0] === code)[colOf[h] - 1];
  sb.getCustomersSheet = () => cust; sb.buildHeaderIndex = () => colOf; sb.P = { DATA_START_ROW: 2 };
  sb.touchCustomer = (s, co, num, up) => { Object.entries(up).forEach(([h, v]) => { rows[num - 2][co[h] - 1] = v; }); };
  sb._stampConsentKey = (s, co, num, mut) => { const rec = JSON.parse(rows[num - 2][co['동의기록'] - 1] || '{}'); mut(rec); rows[num - 2][co['동의기록'] - 1] = JSON.stringify(rec); };
  sb.findCustomerByCode = (code) => { const i = rows.findIndex((x) => x[0] === code); return i < 0 ? null : sb.rowFromValues(colOf, rows[i], i + 2); };
  sb._recordHandler = () => {}; sb._vcPurge = () => {};
  // 드라이브 — 폴더 안 파일
  const tree = { FOLDER_RF_V1_xxxxxxxxxxxxxxxx: { files: ['FILE_RF_V1_a_xxxxxxxxxxxxxxxx', 'FILE_RF_V1_b_xxxxxxxxxxxxxxxx'], dirs: { SUB_AI_V1_xxxxxxxxxxxxxxxxxx: { files: ['FILE_RF_V1_ai_xxxxxxxxxxxxxxx'], dirs: {} } } },
    FOLDER_RF_V2_xxxxxxxxxxxxxxxx: { files: ['FILE_RF_V2_a_xxxxxxxxxxxxxxxx'], dirs: {} }, FOLDER_RF_V3_xxxxxxxxxxxxxxxx: { files: ['FILE_RF_V3_old_xxxxxxxxxxxxxx'], dirs: {} },
    FOLDER_RF_V4_xxxxxxxxxxxxxxxx: { files: ['FILE_RF_V4_a_xxxxxxxxxxxxxxxx'], dirs: {} } };
  const it = (a) => { let i = 0; return { hasNext: () => i < a.length, next: () => a[i++] }; };
  const fo = (id, node) => ({ getId: () => id, getFiles: () => it(node.files.map((f) => ({ getId: () => f }))), getFolders: () => it(Object.entries(node.dirs).map(([k, v]) => fo(k, v))) });
  const backups = Array.from({ length: 10 }, (_, i) => ({ getId: () => 'BACKUP_' + i + '_xxxxxxxxxxxxxxxxxx', getName: () => '[백업] 2026-0' + i, getDateCreated: () => new Date(2026, 0, 30 - i), isTrashed: () => false }));
  sb.DriveApp = { getFolderById: (id) => { if (!tree[id]) throw new Error('no folder'); return fo(id, tree[id]); }, getFoldersByName: () => it([{ getFiles: () => it(backups) }]) };
  props.set('RF_V1', 'FOLDER_RF_V1_xxxxxxxxxxxxxxxx'); props.set('RF_V2', 'FOLDER_RF_V2_xxxxxxxxxxxxxxxx'); props.set('RF_V3', 'FOLDER_RF_V3_xxxxxxxxxxxxxxxx'); props.set('RFGONE_V3', '2026-02-05');
  props.set('RF_V4', 'FOLDER_RF_V4_xxxxxxxxxxxxxxxx'); props.set('RFOK_V1', '{}');
  sb.PropertiesService = { getScriptProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => props.set(k, String(v)), deleteProperty: (k) => props.delete(k), getProperties: () => Object.fromEntries(props) }) };
  sb.ScriptApp = Object.assign({}, sb.ScriptApp, { getOAuthToken: () => 'tok' });
  sb.UrlFetchApp = { fetch: (u, o) => { const id = decodeURIComponent(u.split('/files/')[1].split('?')[0]); calls.push([String(o.method).toUpperCase(), id]); return { getResponseCode: () => (FAIL.has(id) ? 500 : o.method === 'delete' ? 204 : 200) }; } };
  sb._nfAdminEmail = (s, h) => mails.push({ s, h });
  // 식전 영상 시트
  const pv = [['P1', '올림', 'x', '{"t":"초안"}', JSON.stringify({ folder: 'FOLDER_PV_P1_xxxxxxxxxxxxxxxx' }), ''], ['P9', '올림', 'x', '{"t":"초안"}', JSON.stringify({ folder: 'FOLDER_PV_P9_xxxxxxxxxxxxxxxx' }), '']];
  sb._pvSheet_ = () => ({ getLastRow: () => pv.length + 1, getRange: (r, c, nr, nc) => ({ getValues: () => pv.slice(r - 2, r - 2 + nr).map((x) => x.slice(0, nc)), setValues: (v) => { v[0].forEach((x, j) => { pv[r - 2][c - 1 + j] = x; }); } }) });
  const logSheet = { getLastRow: () => logRows.length, appendRow: (a) => logRows.push(a) };
  sb.SpreadsheetApp = { getActive: () => ({ getSheetByName: (nm) => (nm === '자료정리기록' ? logSheet : null), insertSheet: () => logSheet }) };
  sb._kstYmd = () => TODAY;
  return { props, calls, mails, logRows, rows, get, pv };
}

// ── ② 시험 모드
{
  const W = world();
  const r = sb._purgeDaily_();
  const by = Object.fromEntries(r.rows.map((x) => [x.kind, x]));
  ok(r.live === false, '스크립트 속성 PURGE_LIVE 가 없으면 시험 모드');
  ok(W.calls.every((c) => c[0] === 'GET'), '시험 모드는 DELETE 를 한 번도 부르지 않는다', W.calls.filter((c) => c[0] !== 'GET'));
  ok(W.get('A', '하객사진폴더ID') && W.get('D', '원본폴더ID') && !W.props.has('RFGONE_V1') && !W.props.has('RFPERM_V3') && W.pv[0][1] === '올림', '시험 모드는 칸 · 표시를 하나도 안 바꾼다');
  ok(by['하객 사진'].target === 2 && by['결과물'].target === 3 && by['목소리 파일'].target === 3 && by['식전 영상'].target === 2 && by['백업 사본'].target === 2, '시험 모드 대상: 하객 사진 2(A · 인도+6개월 = 오늘 · A2) · 결과물 3(D · F 옛 판 · G) · 목소리 3(V1 30일 · V3 옛 판 · V4) · 식전 영상 2 · 백업 2', r.rows);
  ok(W.logRows.length === 7 && W.logRows[1][1] === '시험' && W.logRows[0][4].includes('시험'), '«자료정리기록» 시트에 머리 + 종류별 6줄(모드 «시험»)', W.logRows.slice(0, 2));
  ok(!W.logRows.flat().some((v) => /^[A-Z]\d?$/.test(String(v)) || /FOLDER|FILE/.test(String(v))), '건수 시트에 개인코드 · 파일 ID 가 없다(건수만)');
}
// ── ③ ④ 실제 모드
{
  const W = world(); W.props.set('PURGE_LIVE', 'Y');
  const r = sb._purgeDaily_(); const by = Object.fromEntries(r.rows.map((x) => [x.kind, x]));
  const del = W.calls.filter((c) => c[0] === 'DELETE').map((c) => c[1]);
  ok(r.live === true, 'PURGE_LIVE=Y 면 실제 모드');
  ok(del.includes('FOLDER_GP_A_xxxxxxxxxxxxxxxx') && !del.includes('FOLDER_GP_B_xxxxxxxxxxxxxxxx') && !del.includes('FOLDER_GP_C_xxxxxxxxxxxxxxxx') && !del.includes('FOLDER_GP_A3_xxxxxxxxxxxxxxx') && !del.includes('FOLDER_GP_A4_xxxxxxxxxxxxxxx') && W.get('A', '하객사진폴더ID') === '' && W.get('B', '하객사진폴더ID') && W.get('A2', '하객사진폴더ID') === 'FOLDER_GP_A2_xxxxxxxxxxxxxxx' && by['하객 사진'].fail === 1, '하객 사진: 인도+6개월 된 폴더만 영구 삭제 · 지운 것만 ID 를 비운다 · 실패(A2)는 ID 를 남긴다');
  ok(del.includes('FOLDER_RESULT_D_xxxxxxxxxxxxxxxx') && del.includes('FOLDER_EDIT_D_xxxxxxxxxxxxxxxxx') && W.get('D', '원본링크') === '' && W.get('D', '원본폴더ID') === '' && W.get('D', '영상링크') === '' && !!JSON.parse(W.get('D', '동의기록')).결과물파기, '결과물: 원본 · 보정본 폴더까지 영구 삭제 → 링크 · 원본폴더ID 비움 → «결과물파기»');
  ok(!del.includes('FOLDER_RESULT_E_xxxxxxxxxxxxxxxx') && W.get('E', '원본폴더ID'), '결과물: 통지 뒤 7일이 안 됐으면 그대로(계약서 12조③)');
  ok(del.includes('FOLDER_RESULT_F_xxxxxxxxxxxxxxxx') && W.get('F', '원본폴더ID') === '', '결과물: 옛 판이 링크만 비운 예식은 남은 원본 폴더를 이번에 지운다');
  ok(W.get('G', '원본폴더ID') === 'FOLDER_RESULT_G_xxxxxxxxxxxxxxxx' && W.get('G', '원본링크') === 'y' && !JSON.parse(W.get('G', '동의기록')).결과물파기 && by['결과물'].fail === 1, '결과물 지우기 실패(L18): «결과물파기» 안 적고 ID · 링크를 남긴다');
  ok(W.props.has('RFGONE_V1') && W.props.has('RFPERM_V1') && del.includes('FILE_RF_V1_ai_xxxxxxxxxxxxxxx') && !W.props.has('RFGONE_V2') && !del.includes('FILE_RF_V2_a_xxxxxxxxxxxxxxxx'), '목소리 파일: 예식 뒤 30일(오늘)에 하위 AI 폴더까지 영구 삭제 · 29일째는 그대로');
  ok(W.props.has('RFPERM_V3') && del.includes('FILE_RF_V3_old_xxxxxxxxxxxxxx'), '목소리 파일: 옛 판이 휴지통으로만 보낸 예식은 영구 삭제로 한 번 더(RFPERM)');
  ok(!W.props.has('RFGONE_V4') && by['목소리 파일'].fail === 1, '목소리 파일 지우기 실패(L18): RFGONE 을 적지 않는다(다음 날 다시)');
  ok(W.pv[0][1] === '지움' && W.pv[1][1] === '올림' && by['식전 영상'].fail === 1, '식전 영상: 예식+6개월 지운 것만 «지움» · 고객 줄 없는 것은 «영영 빠짐»이 아니라 실패로 센다');
  ok(del.filter((x) => /^BACKUP_/.test(x)).length === 2 && del.includes('BACKUP_8_xxxxxxxxxxxxxxxxxx') && del.includes('BACKUP_9_xxxxxxxxxxxxxxxxxx'), '백업 사본: 최근 8개 밖 2개를 영구 삭제(가장 오래된 둘)');
  const m = W.mails.find((x) => /자료 정리 실패/.test(x.s));
  ok(m && /G\(fail:500\)/.test(m.h) && /V4\(fail:500\)/.test(m.h) && !/시험 모드/.test(m.s), '실패는 바로 관리자 메일(종류 · 개인코드 · 까닭)', W.mails.map((x) => x.s));
  ok(W.logRows.slice(1).every((x) => x[1] === '실제') && W.logRows.find((x) => x[2] === '결과물')[5] === 1, '건수 시트: 모드 «실제» · 결과물 실패 1');
  // 다음 날 다시 — 지운 것은 다시 대상이 아니고 실패만 다시
  W.calls.length = 0; const r2 = sb._purgeDaily_(); const b2 = Object.fromEntries(r2.rows.map((x) => [x.kind, x]));
  ok(b2['하객 사진'].target === 1 && b2['하객 사진'].fail === 1 && b2['결과물'].target === 1 && b2['결과물'].fail === 1 && b2['목소리 파일'].target === 1 && b2['식전 영상'].target === 1, '이튿날: 지운 것은 다시 대상이 아니고 실패한 것만 다시(A2 · G · V4 · P9)', r2.rows);
}
// ── 주간 정리에서 빠졌고 매일 정리에 매달렸다
ok(!/purgeRitualFiles\(false\)|purgeSnapRefs\(false\)/.test(String(sb.purgeAdvisorLog)), '주간 정리(purgeAdvisorLog)는 목소리 파일 · 스냅을 더 부르지 않는다(매일로 옮김)');
ok(/_purgeDaily_\(\)/.test(String(sb.vimeoGuardDaily)), '매일 07시(vimeoGuardDaily)가 _purgeDaily_ 를 부른다');
ok(!/setTrashed\(true\)/.test(String(sb.sendArchiveExpiryNotices)) && !/결과물파기 = fmtKST/.test(String(sb.sendArchiveExpiryNotices)), '결과물 통지 함수는 더 링크를 비우거나 «결과물파기»를 적지 않는다(삭제는 _pgResults_ 한 곳)');
ok(!/setTrashed/.test(String(sb.weeklyBackup)), '주간 백업은 휴지통으로 보내지 않는다(8개 밖은 매일 정리가 영구 삭제)');

if (bad.length) { console.log('━━ purge-policy — 빨강 ' + bad.length + '건 [PURGE_POLICY_1106]'); bad.forEach((b) => console.log('  ✖ ' + b)); process.exit(1); }
console.log(`━━ purge-policy — 초록 ${n}항목 [PURGE_POLICY_1106] 시험 모드 0 삭제 · 실제 모드 영구 삭제 · 실패는 표시 안 함 · 달력 6개월`);
