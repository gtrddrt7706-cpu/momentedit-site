// GAS 로드·구문 점검 — automation/의 .gs(R3n9Mr 대상)를 node vm에 GAS 목(SpreadsheetApp 등)으로 전부 로드.
//   목적: 재배포 전에 "로드 자체가 깨지는" 구문·참조 오류를 잡는다(실제 시트 없이).
//   사용: node scripts/audit/gas-lint.mjs        (repo 루트에서)
//   확장: 특정 함수 동작까지 보려면 이 파일을 import해 sandbox를 재사용(아래 export).
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../automation');

// .claspignore와 동일하게 별도 프로젝트·백업 파일은 제외(R3n9Mr에 안 올라가는 것들)
const EXCLUDE = [/(^|\/)archive\//, /form-to-couple\.gs$/, /guest-letter.*\.gs$/, /가족청첩장빌드\.gs$/];
// 로드 순서 — 전역(var P 등)이 먼저 정의돼야 하므로 platform 번호순 → consultation → admin
const ORDER = ['platform/00', 'platform/10', 'platform/20', 'platform/30', 'platform/40', 'platform/50',
  'platform/60', 'platform/70', 'platform/80', 'platform/85', 'platform/86', 'platform/90', 'platform/95',
  'consultation/', 'admin/'];

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(fp));
    else if (e.name.endsWith('.gs')) out.push(fp);
  }
  return out;
}
const rel = (fp) => path.relative(ROOT, fp).replace(/\\/g, '/');
const files = walk(ROOT).filter((fp) => !EXCLUDE.some((re) => re.test(rel(fp))))
  .sort((a, b) => {
    const ra = rel(a), rb = rel(b);
    const ia = ORDER.findIndex((p) => ra.startsWith(p)), ib = ORDER.findIndex((p) => rb.startsWith(p));
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || ra.localeCompare(rb);
  });

// ---------- GAS 서비스 목 ----------
function chain(t = {}) { return new Proxy(t, { get(o, k) { if (k in o) return o[k]; if (k === 'then') return undefined; return () => chain(o); } }); }
function fmtDate(d, fmt) { const p = new Date(d.getTime() + 9 * 3600e3), z = (n) => String(n).padStart(2, '0');
  return String(fmt).replace(/yyyy/g, p.getUTCFullYear()).replace(/MM/g, z(p.getUTCMonth() + 1)).replace(/dd/g, z(p.getUTCDate())).replace(/HH/g, z(p.getUTCHours())).replace(/mm/g, z(p.getUTCMinutes())).replace(/ss/g, z(p.getUTCSeconds())); }
const props = new Map();
export function makeSandbox() {
  const sb = {
    console,
    SpreadsheetApp: chain({ getActive: () => chain({ getSheetByName: () => null, insertSheet: () => chain({}) }), openById: () => chain({}), getActiveSpreadsheet: () => chain({}), flush() {} }),
    CalendarApp: chain({ getCalendarById: () => chain({}), getDefaultCalendar: () => chain({}) }),
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {}, hasLock: () => true }), getDocumentLock() { return this.getScriptLock(); }, getUserLock() { return this.getScriptLock(); } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v), deleteProperty: (k) => props.delete(k), getProperties: () => Object.fromEntries(props) }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {}, removeAll() {} }) },
    Utilities: { formatDate: (d, tz, f) => fmtDate(d, f), sleep() {}, getUuid: () => crypto.randomUUID(),
      base64Encode: (s) => Buffer.from(s).toString('base64'), base64EncodeWebSafe: (s) => Buffer.from(s).toString('base64url'),
      newBlob: (data, type, name) => ({ getBytes: () => Buffer.from(String(data)), getDataAsString: () => String(data), getName: () => name }),
      computeDigest: (a, s) => Array.from(crypto.createHash('sha256').update(String(s), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)),
      computeHmacSha256Signature: (s, key) => Array.from(crypto.createHmac('sha256', String(key)).update(String(s), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)),
      DigestAlgorithm: { MD5: 'md5', SHA_1: 'sha1', SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' } },
    Logger: { log() {} },
    Session: { getScriptTimeZone: () => 'Asia/Seoul', getActiveUser: () => ({ getEmail: () => 'sim@test' }) },
    GmailApp: chain({}), MailApp: chain({}), UrlFetchApp: { fetch: () => ({ getResponseCode: () => 200, getContentText: () => '{"ok":true}' }) },
    DriveApp: chain({ getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => chain({ createFile() {} }) }),
    ScriptApp: chain({ getProjectTriggers: () => [] }), ContentService: chain({ MimeType: {} }), HtmlService: chain({}), Charts: chain({}),
  };
  sb.global = sb;
  vm.createContext(sb);
  return sb;
}

/* ★★[GAS_NOT_EMPTY 2026-08-18 내가 실제로 저지른 사고] 빈 파일도 «로드 OK» 였다.
   패치 스크립트가 파일을 읽기 전에 먼저 비워(io.open(p,'w') 가 먼저 평가된다) admin.gs 가 0바이트가 됐는데,
   이 검사는 초록을 냈다 — 빈 문자열은 완벽하게 유효한 자바스크립트이기 때문이다.
   구문만 보는 검사는 «내용이 사라진 것»을 영영 못 잡는다. 그래서 크기도 함께 본다.
   ★기준은 낮게(200자) 잡는다 — 진짜 작은 파일을 붉히려는 게 아니라 «통째로 날아간 것»만 잡는다. */
const MIN_CHARS = 200;

export function loadGas(sb = makeSandbox()) {
  const errors = [];
  for (const fp of files) {
    let src = '';
    try { src = fs.readFileSync(fp, 'utf8'); }
    catch (e) { errors.push({ file: rel(fp), message: '읽기 실패 · ' + e.message }); continue; }
    if (src.trim().length < MIN_CHARS) {
      errors.push({ file: rel(fp), message: `내용이 ${src.length}자뿐 — 통째로 비워졌을 수 있다(GAS_NOT_EMPTY)` });
      continue;
    }
    try { vm.runInContext(src, sb, { filename: rel(fp) }); }
    catch (e) { errors.push({ file: rel(fp), message: e.message }); }
  }
  return { sandbox: sb, errors, files: files.map(rel) };
}

// 직접 실행 시 리포트
if (import.meta.url === `file://${process.argv[1]}`) {
  const { errors, files: fl } = loadGas();
  if (errors.length) { for (const e of errors) console.log('❌ LOAD FAIL', e.file, '—', e.message); console.log(`\n${errors.length}건 실패 / ${fl.length}파일`); process.exit(1); }
  console.log(`✅ .gs ${fl.length}파일 로드 OK (구문·전역 참조 이상 없음)`);
}
