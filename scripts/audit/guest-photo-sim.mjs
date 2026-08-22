#!/usr/bin/env node
/* [GUEST_PHOTO_SIM] handleGuestPhoto 단위 시뮬 — GAS 없이 서버 판정만 떼어 돌린다.
   ★왜 필요한가: 이 경로가 틀리면 예식 당일 하객 사진이 통째로 사라지는데, 그날은 재시도가 없다.
     배포 전에 '거절해야 할 것을 거절하는지'를 기계가 확인한다(열 없음·만료·형식·크기·총량·토큰).
   ★DriveApp·LockService·시트는 가짜로 세운다 — 판정 로직만 보는 것이 목적이다. */
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../../automation/platform/80_production.gs', import.meta.url), 'utf8');
const from = src.indexOf('var GP_ROOT_FOLDER');
const to   = src.indexOf('function purgeGuestPhotosApply');
if (from < 0 || to < 0) { console.error('✗ GUEST_PHOTO_IN 블록을 찾지 못했다 — 마커가 바뀌었나?'); process.exit(1); }
/* ★[GUIDE_EXPIRE_REASON 2026-08-21] 이 검사는 사진 블록만 잘라 쓴다 — 그런데 그 블록이
   _guideCloseInfo(만료 사유 구분 헬퍼)를 부른다. 잘라낸 조각 밖에 있으면 «정의되지 않음»으로 터진다.
   ★사본을 만들지 않고 **실제 헬퍼 원문을 함께 떼어** 붙인다 — 사본을 두면 둘이 갈라진다. */
const grab = (name) => {                       // 함수 하나를 중괄호로 정확히 떼어 온다(사본 금지 · 원문 그대로)
  const i = src.indexOf('function ' + name);
  if (i < 0) return '';
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); }
  }
  return '';
};
const constLine = (src.match(/var GUIDE_EXPIRE_DAYS[^\n]*/) || [''])[0];   // 만료 일수 상수도 원문에서(사본 금지)
const helper = [constLine, grab('_guideExpired'), grab('_guideCloseInfo')].join('\n');
if (!/\_guideCloseInfo/.test(helper) || !/_guideExpired/.test(helper)) { console.error('✗ 만료 헬퍼를 찾지 못했다 — 이름이 바뀌었나?'); process.exit(1); }
const code = helper + '\n' + src.slice(from, to);

let created = [], written = [];
const mk = (over={}) => {
  const row = { 안내공유토큰:'G1234567890abcd', 개인코드:'ME-0001', 예식일:'2026-09-05',
                하객사진수:0, 하객사진MB:0, 하객사진폴더ID:'', ...over };
  return { num: 7, get: h => (h in row ? row[h] : ''), _row: row };
};
let CUR = mk(), COLS = { 하객사진수:1, 하객사진MB:2, 하객사진최근:3, 하객사진폴더ID:4 };
const sandbox = {
  DriveApp: {
    getFoldersByName: () => ({ hasNext: () => true, next: () => ({ createFolder: n => ({ getId: () => 'FID_' + n }) }) }),
    createFolder: n => ({ createFolder: m => ({ getId: () => 'FID_' + m }) }),
    getFolderById: id => ({ createFile: b => { created.push(b); return { getId: () => 'FILE1' }; }, getName: () => 'f', setTrashed(){} })
  },
  Utilities: { newBlob: (b, m, n) => ({ bytes:b, mime:m, name:n }), base64Decode: s => Buffer.from(s, 'base64'),
               formatDate: () => '0817-120000', getUuid: () => 'u' },
  LockService: { getScriptLock: () => ({ waitLock(){}, releaseLock(){} }) },
  Logger: { log(){} },
  _findCustomerBy: () => CUR,
  _guideExpired: ymd => ymd === '2020-01-01',
  _ymdOf: v => String(v || ''),
  getCustomersSheet: () => ({}),
  buildHeaderIndex: () => COLS,
  touchCustomer: (s, c, n, upd) => { written.push(upd); Object.assign(CUR._row, upd); },
  fmtKST: () => '2026-08-17 12:00',
  P: { DATA_START_ROW: 2 }, rowFromValues: () => null
};
const fn = new Function(...Object.keys(sandbox), code + '\nreturn { handleGuestPhoto, _gpSafeName };');
const { handleGuestPhoto, _gpSafeName } = fn(...Object.values(sandbox));

const B64 = n => Buffer.alloc(n, 1).toString('base64');
let fail = 0;
const t = (name, got, want) => {
  const ok = want(got);
  console.log((ok ? '  ok  ' : '  ✗   ') + name + (ok ? '' : '  → ' + JSON.stringify(got)));
  if (!ok) fail++;
};
const reset = over => { CUR = mk(over); created = []; written = []; };

console.log('[거절해야 하는 것]');
reset(); t('토큰 없음',      handleGuestPhoto({ mime:'image/jpeg', data:B64(10) }),               r => !r.ok);
reset(); t('토큰 너무 짧음',  handleGuestPhoto({ g:'abc', mime:'image/jpeg', data:B64(10) }),      r => !r.ok);
reset(); t('사진·영상 아님',  handleGuestPhoto({ g:'G1234567890abcd', mime:'application/pdf', data:B64(10) }), r => !r.ok);
reset(); t('빈 파일',        handleGuestPhoto({ g:'G1234567890abcd', mime:'image/jpeg', data:'' }), r => !r.ok);
reset(); t('20MB 초과',      handleGuestPhoto({ g:'G1234567890abcd', mime:'image/jpeg', data:B64(21*1048576) }), r => !r.ok);
reset({ 예식일:'2020-01-01' });
         t('예식 후 만료',    handleGuestPhoto({ g:'G1234567890abcd', mime:'image/jpeg', data:B64(10) }), r => !r.ok && r.expired);
reset({ 하객사진수:400 });
         t('장수 상한(400)',  handleGuestPhoto({ g:'G1234567890abcd', mime:'image/jpeg', data:B64(10) }), r => !r.ok && r.full);
reset({ 하객사진MB:4000 });
         t('총량 상한(4GB)',  handleGuestPhoto({ g:'G1234567890abcd', mime:'image/jpeg', data:B64(10) }), r => !r.ok && r.full);
COLS = { 하객사진수:1 };   // 폴더ID 열 없음 = 마이그레이션 전
reset(); t('열 없으면 거절',  handleGuestPhoto({ g:'G1234567890abcd', mime:'image/jpeg', data:B64(10) }), r => !r.ok);
COLS = { 하객사진수:1, 하객사진MB:2, 하객사진최근:3, 하객사진폴더ID:4 };

console.log('[받아야 하는 것]');
reset(); const ok1 = handleGuestPhoto({ g:'G1234567890abcd', name:'IMG_1.jpg', mime:'image/jpeg', data:B64(1024) });
t('사진 1장 저장',  ok1, r => r.ok && r.n === 1);
t('드라이브에 씀',  created.length, v => v === 1);
t('폴더ID 기록',    written.some(w => w['하객사진폴더ID']), v => !!v);
t('장수·용량 집계', written.some(w => w['하객사진수'] === 1), v => !!v);
reset(); t('영상도 받음',   handleGuestPhoto({ g:'G1234567890abcd', name:'v.mp4', mime:'video/mp4', data:B64(2048) }), r => r.ok);

console.log('[파일 이름]');
t('경로 문자 제거', _gpSafeName('../../etc/pw.jpg', 'image/jpeg'), n => !n.includes('/') && !n.includes('..'));
t('확장자 보강',    _gpSafeName('사진', 'image/jpeg'),              n => n.endsWith('.jpeg'));
t('앞에 시각',      _gpSafeName('a.jpg', 'image/jpeg'),             n => /^\d{4}-\d{6}_/.test(n));

console.log(fail ? `\nGUEST PHOTO SIM: ✗ ${fail}건 실패` : '\nGUEST PHOTO SIM OK');
process.exit(fail ? 1 : 0);
