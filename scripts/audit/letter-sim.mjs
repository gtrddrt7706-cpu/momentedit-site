/* 청첩장 조회 · 하객 편지 · 영상 점검 · 개인정보 파기 · 시트 옮기기 — 옛 Letter System 과 같게 도는가  [LETTER_SIM]
 *   TZ=Asia/Seoul node scripts/audit/letter-sim.mjs            → 새 코드(87_letter)를 기준값(letter-golden.json)과 대조
 *   TZ=Asia/Seoul node scripts/audit/letter-sim.mjs --capture  → 옛 코드를 돌려 기준값을 만든다(옛 파일이 저장소에 있을 때만)
 *
 * ★왜 — 2026-09-25 옛 「Moment Edit Letter System」 GAS 프로젝트의 필요한 부분만 본 프로젝트(87_letter)로 옮겼다.
 *   청첩장 16종·라이브·공유 미리보기·하객 편지가 그대로 이 응답에 기대고, 이 세션에선 실서버(GAS·momentedit.kr)가
 *   막혀 있어 옮긴 뒤를 직접 열어 볼 수 없다. 그래서 옛 코드와 새 코드를 «같은 시험 데이터 · 같은 요청»으로 돌려
 *   응답·시트에 남는 행·나가는 메일을 한 글자씩 대조하고, 그 결과를 기준값으로 저장소에 남긴다 —
 *   옛 파일을 지운 뒤에도 새 코드가 그 기준을 계속 지키는지 이 검사가 본다.
 *
 * 의도한 차이(여기 적힌 것만 허용한다 — 늘리려면 이유를 함께 적는다)
 *   D1 편지 메일 텍스트본 끝 「— Moment Edit」 → 「Moment Edit」(고객 문구 전각 줄표 금지)
 *   D2 관리자 알림 경로 GmailApp(스튜디오) → _nfAdminEmail(본 프로젝트 규칙 · 이모지 제거) · 제목의 « — » → « · »
 *   D3 영상 점검이 Customers 를 보고 닫힌(미계약·취소·노쇼) 예식을 건너뛴다 [VIMEO_GUARD_XPROJ]
 *   D4 영상 점검 메일 본문 끝 «끄는 법» 안내 문장(관리자 페이지 취소로 멈춘다)
 * 시험 데이터는 전부 지어낸 값이다(실제 고객 정보 없음).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GOLDEN = path.join(ROOT, 'scripts/audit/letter-golden.json');
const CAPTURE = process.argv.includes('--capture');
if (process.env.TZ !== 'Asia/Seoul') { console.log('✖ TZ=Asia/Seoul 로 실행하세요(날짜·시간 정규화가 시간대에 걸린다)'); process.exit(2); }

const LETTER_ID = '1GJX2pkaxbtER1xZq7hGrMVxm9kKh4-J1d2x-T5WwSq4';
const NOW = Date.parse('2026-09-25T09:00:00+09:00');   // 시험 기준 «지금» — 고정
const TZ = 'Asia/Seoul';
const bad = [];
const ok = (cond, label) => { if (!cond) bad.push(label); return cond; };

// ─────────── 가짜 GAS ───────────
function makeDateClass() {
  const Real = Date;
  class FakeDate extends Real {
    constructor(...a) { if (a.length === 0) super(NOW); else super(...a); }
    static now() { return NOW; }
  }
  return FakeDate;
}
function fmt(date, tz, pattern) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(date).map((x) => [x.type, x.value]));
  return pattern.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute).replace('ss', p.second).replace(/'([^']*)'/g, '$1');
}
function makeSheet(ss, name, rows) {
  const sh = {
    _rows: rows.map((r) => r.slice()),
    _name: name,
    getName: () => sh._name,
    setName: (n) => { sh._name = n; return sh; },
    getParent: () => ss,
    getLastRow() { for (let i = sh._rows.length - 1; i >= 0; i--) if (sh._rows[i].some((v) => v !== '' && v != null)) return i + 1; return 0; },
    getLastColumn() { let m = 0; sh._rows.forEach((r) => { for (let j = r.length - 1; j >= 0; j--) if (r[j] !== '' && r[j] != null) { m = Math.max(m, j + 1); break; } }); return m; },
    _cell(r, c) { const row = sh._rows[r - 1] || []; const v = row[c - 1]; return v == null ? '' : v; },
    getRange(r, c, nr = 1, nc = 1) {
      return {
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => sh._cell(r + i, c + j))),
        getDisplayValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => {
          const v = sh._cell(r + i, c + j);
          return (v instanceof Date || Object.prototype.toString.call(v) === '[object Date]') ? fmt(v, ss._tz, 'yyyy-MM-dd HH:mm') : String(v);
        })),
        setValues: (vals) => { vals.forEach((row, i) => row.forEach((v, j) => { while (sh._rows.length < r + i) sh._rows.push([]); sh._rows[r + i - 1][c + j - 1] = v; })); },
        setValue: (v) => { while (sh._rows.length < r) sh._rows.push([]); sh._rows[r - 1][c - 1] = v; }
      };
    },
    getDataRange() { return sh.getRange(1, 1, Math.max(1, sh.getLastRow()), Math.max(1, sh.getLastColumn())); },
    appendRow(arr) { const at = sh.getLastRow(); sh._rows.splice(at, 0, arr.slice()); sh._rows.length = Math.max(sh._rows.length, at + 1); },
    copyTo(dst) { const c = makeSheet(dst, 'Copy of ' + sh._name, sh._rows.map((r) => r.slice())); dst._sheets.push(c); return c; },
    getDrawings: () => []
  };
  return sh;
}
function makeSS(id, tz) {
  const ss = { _id: id, _tz: tz, _sheets: [] };
  ss.getId = () => id;
  ss.getSpreadsheetTimeZone = () => tz;
  ss.getSheetByName = (n) => ss._sheets.find((s) => s._name === n) || null;
  ss.deleteSheet = (s) => { ss._sheets = ss._sheets.filter((x) => x !== s); };
  ss.add = (name, rows) => { const s = makeSheet(ss, name, rows); ss._sheets.push(s); return s; };
  return ss;
}
function makeCtx({ active, byId }) {
  const log = { mails: [], admin: [], logs: [], triggersSetup: 0 };
  const cache = new Map(), props = new Map();
  const FakeDate = makeDateClass();
  const ctx = {
    Date: FakeDate, console: { log: (...a) => log.logs.push(a.join(' ')), error: (...a) => log.logs.push(a.join(' ')), warn: (...a) => log.logs.push(a.join(' ')) },
    Logger: { log: (...a) => log.logs.push(a.join(' ')) },
    SpreadsheetApp: { getActive: () => active, openById: (id) => { const s = byId[id]; if (!s) throw new Error('openById 없음 ' + id); return s; } },
    CacheService: { getScriptCache: () => ({ get: (k) => (cache.has(k) ? cache.get(k) : null), put: (k, v) => { cache.set(k, String(v)); }, remove: (k) => cache.delete(k), removeAll: (ks) => ks.forEach((k) => cache.delete(k)) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (props.has(k) ? props.get(k) : null), setProperty: (k, v) => { props.set(k, String(v)); } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    GmailApp: { sendEmail: (to, subject, body, opts) => log.mails.push({ to, subject, body, html: (opts && opts.htmlBody) || '', name: (opts && opts.name) || '', from: (opts && opts.from) || '' }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ _s: s, setMimeType() { return this; }, getContent() { return this._s; } }) },
    Utilities: { formatDate: (d, tz, p) => fmt(d, tz, p) }
  };
  ctx._log = log; ctx._cache = cache; ctx._props = props;
  vm.createContext(ctx);
  return ctx;
}
const run = (ctx, code) => vm.runInContext(code, ctx);
const load = (ctx, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel });
const J = (x) => JSON.parse(JSON.stringify(x));

// ─────────── 시험 데이터(지어낸 값) ───────────
const KEYS = ['eventId', 'groomName', 'brideName', 'groomNameEn', 'brideNameEn', 'groomEmail', 'brideEmail', 'weddingDate', 'weddingTime',
  'designFamily', 'designOnline', 'digitalAttendance', 'groomBank', 'groomAccount', 'brideBank', 'brideAccount', 'groomParents', 'brideParents',
  'greetingShowParents', 'envelopeShowParents', 'groomFatherAccount', 'groomMotherAccount', 'brideFatherAccount', 'brideMotherAccount',
  'invitationText', 'digInvitationText', 'pullQuote', 'groomBio', 'brideBio', 'famInvTitle', 'famInvSubKo', 'digInvTitle', 'digInvSubKo',
  'digPullQuote', 'digGroomBio', 'digBrideBio', 'accountOnline', 'accountLive', 'accountFamily', 'groomChildTitle', 'brideChildTitle',
  'vimeoId', 'vimeoHash', 'cancelled'];
function couple(o) { return KEYS.map((k) => (k in o ? o[k] : '')); }
function fixtures(FD) {
  const d = (s) => new FD(s);
  const day = (n) => fmt(new Date(NOW + n * 86400000), TZ, 'yyyy-MM-dd');
  const base = { groomName: '가나', brideName: '다라', groomNameEn: 'Ga Na', brideNameEn: 'Da Ra', groomBank: '가은행', groomAccount: '111-1', brideBank: '나은행', brideAccount: '222-2',
    groomParents: '가부·가모', brideParents: '다부·다모', greetingShowParents: 'Y', envelopeShowParents: 'Y', groomFatherAccount: 'gf 1', groomMotherAccount: 'gm 2', brideFatherAccount: 'bf 3', brideMotherAccount: 'bm 4',
    invitationText: '인사말 *강조*', digInvitationText: '온라인 인사말', pullQuote: '대표 문구', groomBio: '신랑 한마디', brideBio: '신부 한마디', famInvTitle: '큰 제목', famInvSubKo: '부제',
    digInvTitle: '온 큰 제목', digInvSubKo: '온 부제', digPullQuote: '온 대표', digGroomBio: '온 신랑', digBrideBio: '온 신부', groomChildTitle: '장남', brideChildTitle: '장녀', designFamily: '02', designOnline: '08' };
  const rows = [
    ['식별', '기본 정보'], ['예식ID', '신랑 한글 이름'], KEYS.slice(),
    couple({ ...base, eventId: 'aa-bb-1024', groomEmail: 'g@a.test', brideEmail: 'b@a.test', weddingDate: '2027-10-24', weddingTime: '14:00', digitalAttendance: 'Y', accountOnline: 'Y', accountLive: 'Y', accountFamily: 'N', vimeoId: 'v1', vimeoHash: 'h1' }),
    couple({ ...base, eventId: 'cc-dd-0612-x7k2mq', groomEmail: 'g@c.test', weddingDate: d('2027-06-12T00:00:00+09:00'), weddingTime: new FD(1899, 11, 30, 15, 0, 0), digitalAttendance: 'Y', accountOnline: 'N', accountLive: 'N', accountFamily: 'Y' }),
    couple({ ...base, eventId: 'ee-ff-0101', weddingDate: '2027/1/1', weddingTime: '오후 2:30', digitalAttendance: 'N', accountOnline: 'y', accountLive: 'N', accountFamily: 'N', groomAccount: '' }),
    couple({ ...base, eventId: 'test-couple', weddingDate: day(1), weddingTime: '오전 12:05', digitalAttendance: 'Y' }),
    // 영상 점검(오늘 2026-09-25 기준 3일 안)
    couple({ ...base, eventId: 'vm-a-0926', weddingDate: day(1), digitalAttendance: 'Y' }),                   // 미등록 → 경고
    couple({ ...base, eventId: 'vm-b-0927', weddingDate: day(2), digitalAttendance: 'N' }),                   // 디지털 아님
    couple({ ...base, eventId: 'vm-c-0928', weddingDate: day(3), digitalAttendance: 'Y', vimeoId: 'x' }),     // 등록됨
    couple({ ...base, eventId: 'vm-d-0927', weddingDate: day(2), digitalAttendance: 'Y', cancelled: 'Y' }),   // cancelled 열
    couple({ ...base, eventId: 'vm-e-0926', weddingDate: day(1), digitalAttendance: 'Y' }),                   // Customers 에서 취소 → 새 코드만 건너뜀(D3)
    couple({ ...base, eventId: 'vm-f-0930', weddingDate: day(5), digitalAttendance: 'Y' }),                   // 3일 밖
    couple({ ...base, eventId: 'vm-g-0924', weddingDate: day(-1), digitalAttendance: 'Y' }),                  // 지남
    couple({ ...base, eventId: 'vm-h-0928', weddingDate: d(day(3) + 'T00:00:00+09:00'), digitalAttendance: '' }), // Date 값 · 디지털 칸 비움 → 경고
    // 개인정보 파기(6개월 = 183일 · 기준일 2026-03-26 이전 예식)
    couple({ ...base, eventId: 'pg-old-1201', groomEmail: '=HYPERLINK("x")', weddingDate: '2025-12-01', digitalAttendance: 'Y', vimeoId: 'old', vimeoHash: 'oh' }),
    couple({ ...base, eventId: 'pg-new-0601', groomEmail: 'n@n.test', weddingDate: '2026-06-01', digitalAttendance: 'Y' })
  ];
  const messages = [['시각', 'eventId', '커플', '하객', '관계', '메시지', '상태', '구분'],
    [d('2026-01-02T10:00:00+09:00'), 'pg-old-1201', '가나 · 다라', '하객1', '친구', '축하해', '전송됨', '두 분 함께'],
    [d('2025-01-02T10:00:00+09:00'), 'other-0101', '마바 · 사아', '하객2', '동료', '오래된 편지', '전송됨', '두 분 함께'],
    [d('2026-09-01T10:00:00+09:00'), 'pg-new-0601', '가나 · 다라', '하객3', '가족', '최근 편지', '전송됨', '두 분 함께']];
  const moderation = [['타임스탬프', '예식ID', '하객명', '관계', '수신인', '메시지 전문', '걸린 단어', '카테고리', '상태'],
    [d('2026-01-03T10:00:00+09:00'), 'pg-old-1201', '하객4', '지인', 'both', '나쁜 말', '나쁜', '욕설', 'BLOCKED']];
  const banned = [['단어', '카테고리', '타입', '메모'], ['[', '깨진정규식', 'regex', ''], ['씨발', '욕설', 'word', ''], ['이혼', '저주', 'word', ''], ['\\d{6}-\\d{7}', '개인정보', 'regex', '']];
  const customers = [['개인코드', '현재단계', 'eventId'], ['C1', '취소', 'vm-e-0926'], ['C2', '제작중', 'vm-a-0926'], ['C3', '노쇼', '']];
  return { rows, messages, moderation, banned, customers };
}

// ─────────── 시나리오 ───────────
const LETTERS = [
  { eventId: 'aa-bb-1024', guestName: '하객 가', relation: '신랑 친구', message: '축하해요!\n오래오래 행복하게.', recipient: 'both' },
  { eventId: 'aa-bb-1024', guestName: '하객 나', relation: '', message: '신랑에게만', recipient: 'groom' },
  { eventId: 'aa-bb-1024', guestName: '하객 다', relation: '신부 동료', message: '신부에게만 <b>굵게</b> & "따옴표"', recipient: 'bride' },
  { eventId: 'aa-bb-1024', guestName: '하객 라', relation: '', message: '네 번째(속도 제한)', recipient: 'both' },
  { eventId: 'INVALID!', guestName: 'x', message: 'y' },
  { eventId: 'cc-dd-0612-x7k2mq', guestName: '', relation: '', message: '이름 없음', recipient: 'both' },
  { eventId: 'zz-zz-0000', guestName: '누구', relation: '', message: '없는 예식', recipient: 'both' },
  { eventId: 'cc-dd-0612-x7k2mq', guestName: '하객 마', relation: '', message: '빨리 이혼해라', recipient: 'both' },
  { eventId: 'ee-ff-0101', guestName: '씨 발', relation: '', message: '이름 칸 우회', recipient: 'both' },
  { eventId: 'pg-new-0601', guestName: '하객 바', relation: '900101-1234567', message: '관계 칸에 주민번호', recipient: 'both' },
  { eventId: 'ee-ff-0101', guestName: '=HYPERLINK("http://x")', relation: '@관계', message: '받을 주소 없는 예식', recipient: 'both' },
  { eventId: 'cc-dd-0612-x7k2mq', guestName: '하객 사', relation: '', message: '신랑 대문자', recipient: ' GROOM ' },
  { eventId: 'cc-dd-0612-x7k2mq', guestName: '하객 아', relation: '', message: '신부 주소 없음', recipient: 'bride' },
  { eventId: 'vm-a-0926', guestName: 'ㄱ'.repeat(60), relation: 'ㄴ'.repeat(40), message: 'ㄷ'.repeat(2100), recipient: 'weird' }
];
const COUPLE_CASES = [];
for (const id of ['aa-bb-1024', 'cc-dd-0612-x7k2mq', 'ee-ff-0101', 'test-couple', 'zz-zz-0000', '', 'INVALID ID!', 'ab', 'pg-old-1201'])
  for (const view of ['', 'online', 'family', 'live', 'LIVE'])
    for (const fresh of ['', '1']) COUPLE_CASES.push({ eventId: id, view, fresh });

function seed(ss, FD) {
  const f = fixtures(FD);
  ss.add('Couples', f.rows); ss.add('Messages', f.messages); ss.add('Moderation', f.moderation); ss.add('Banned', f.banned);
  return f;
}
const rowsNoTs = (sh) => sh._rows.slice(1).map((r) => r.slice(1).map((v) => (Object.prototype.toString.call(v) === '[object Date]' ? 'DATE' : v)));
const coupleState = (sh) => sh._rows.map((r) => r.map((v) => (Object.prototype.toString.call(v) === '[object Date]' ? 'DATE:' + fmt(v, TZ, 'yyyy-MM-dd HH:mm') : v)));
const unhtml = (s) => String(s).replace(/<br>/g, '\n').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

// 옛 코드 — 옛 Letter System 프로젝트처럼 getActive() 가 곧 Letter System
function runOld() {
  const B = makeSS(LETTER_ID, TZ);
  const ctx = makeCtx({ active: B, byId: { [LETTER_ID]: B } });
  seed(B, ctx.Date);
  load(ctx, 'automation/guest-letter-webhook.gs');
  load(ctx, 'automation/form-to-couple.gs');
  const out = { couple: [], letters: [], vimeo: null, purge: null };
  ctx.__p = null;
  for (const c of COUPLE_CASES) {
    ctx.__p = { parameter: { action: 'getCouple', eventId: c.eventId, view: c.view, fresh: c.fresh } };
    out.couple.push(JSON.parse(run(ctx, 'doGet(__p).getContent()')));
  }
  for (const L of LETTERS) {
    const m0 = ctx._log.mails.length;
    ctx.__p = { postData: { contents: JSON.stringify(L) } };
    const res = JSON.parse(run(ctx, 'doPost(__p).getContent()'));
    const mails = ctx._log.mails.slice(m0);
    out.letters.push({
      res,
      couple: mails.filter((m) => m.to !== 'contact@momentedit.kr').map((m) => ({ to: m.to, subject: m.subject, body: m.body.replace('\n\n— Moment Edit\n', '\n\nMoment Edit\n'), html: m.html, name: m.name, from: m.from })),   // D1
      admin: mails.filter((m) => m.to === 'contact@momentedit.kr').map((m) => ({ subject: m.subject.replace(/⚠️\s*/g, '').replace(' — ', ' · '), body: m.body }))   // D2
    });
  }
  out.messages = rowsNoTs(B.getSheetByName('Messages'));
  out.moderation = rowsNoTs(B.getSheetByName('Moderation'));
  // 영상 점검(+ 파기) — 새 코드는 Customers 에서 닫힌 vm-e-0926 을 건너뛴다(D3)
  const m0 = ctx._log.mails.length;
  run(ctx, 'vimeoGuardDaily()');
  const vm0 = ctx._log.mails.slice(m0).find((m) => /영상 미등록/.test(m.subject));
  const lines = vm0 ? vm0.body.split('\n').filter((l) => /^\d{4}-\d{2}-\d{2} · /.test(l)).filter((l) => !/ · vm-e-0926$/.test(l)) : [];   // D3
  out.vimeo = { subject: vm0 ? vm0.subject.replace(/\d+건/, lines.length + '건') : null, lines };
  out.purge = { couples: coupleState(B.getSheetByName('Couples')), messages: rowsNoTs(B.getSheetByName('Messages')), moderation: rowsNoTs(B.getSheetByName('Moderation')) };
  return out;
}

// 새 코드 — 본 프로젝트(getActive = 본 스프레드시트 A). 옮긴 뒤 상태로 돌린다(letterMigrate 를 실제로 부른다).
function runNew() {
  const A = makeSS('MAIN', TZ), B = makeSS(LETTER_ID, TZ);
  const ctx = makeCtx({ active: A, byId: { [LETTER_ID]: B } });
  const f = seed(B, ctx.Date);
  const cust = A.add('Customers', f.customers);
  // 본 프로젝트에서 87_letter 가 기대는 것만 — 진짜 파일(85_invitation)은 그대로 싣고, 나머지는 같은 뜻의 작은 대역
  run(ctx, `
    var STAGE_EXCEPTIONS = ['미계약', '취소', '노쇼'];
    function _deFormula(value) { return (typeof value === 'string' && /^[=\\t\\r]/.test(value)) ? ("'" + value) : value; }
    function getCustomersSheet() { return SpreadsheetApp.getActive().getSheetByName('Customers'); }
    function _nfAdminEmail(subject, bodyHtml) { __adminBox.push({ subject: subject, bodyHtml: bodyHtml }); }
    function setupAllTriggers() { __trigBox.n++; return '트리거 13개 설치 완료'; }
  `);
  ctx.__adminBox = []; ctx.__trigBox = { n: 0 };
  load(ctx, 'automation/platform/85_invitation.gs');
  load(ctx, 'automation/platform/87_letter.gs');

  // ── 옮기기 전: 옛 시트를 그대로 읽는다 [LETTER_FALLBACK]
  ctx.__p = { eventId: 'aa-bb-1024', view: 'live', fresh: '1' };
  const pre = J(run(ctx, 'ltGetCouple(__p)'));
  ok(pre.ok === true && pre.couple.groomName === '가나', '옮기기 전 폴백: 옛 Letter System 에서 읽어야 한다');
  ok(run(ctx, '_couplesSheet()') === B.getSheetByName('Couples'), '옮기기 전 85_invitation 발행도 옛 Couples 를 봐야 한다(조회와 같은 곳)');

  // ── 옮기기
  const log1 = run(ctx, 'letterMigrate()');
  ok(['Couples', 'Messages', 'Moderation', 'Banned'].every((n) => A.getSheetByName(n)), 'letterMigrate: 탭 4개가 본 스프레드시트에 생겨야 한다');
  ok(ctx._props.get('LETTER_MIGRATED') === 'Y', 'letterMigrate: LETTER_MIGRATED=Y');
  ok(ctx.__trigBox.n === 1, 'letterMigrate: setupAllTriggers 를 한 번 불러야 한다(vimeoGuardDaily 트리거)');
  ok(/원본과 한 칸도 다르지 않음/.test(log1), 'letterMigrate: 원본 대조 결과를 찍어야 한다');
  const log2 = run(ctx, 'letterMigrate()');
  ok((log2.match(/이미 옮겨져 있어 건너뜀/g) || []).length === 4 && A._sheets.length === 5, 'letterMigrate 재실행: 네 개 모두 건너뛰고 새 탭을 만들지 말아야 한다');
  ok(run(ctx, '_couplesSheet()') === A.getSheetByName('Couples'), '옮긴 뒤 85_invitation 발행은 본 Couples 를 봐야 한다');
  // 옮긴 뒤에는 옛 시트를 건드리지 않는다 — 옛 쪽을 망가뜨려도 결과가 같아야 한다
  B.getSheetByName('Couples')._rows[3][1] = '옛쪽이바뀜';
  B.getSheetByName('Banned')._rows = [['단어']];

  const out = { couple: [], letters: [], vimeo: null, purge: null };
  for (const c of COUPLE_CASES) { ctx.__p = { eventId: c.eventId, view: c.view, fresh: c.fresh }; out.couple.push(J(run(ctx, 'ltGetCouple(__p)'))); }
  for (const L of LETTERS) {
    const m0 = ctx._log.mails.length, a0 = ctx.__adminBox.length;
    ctx.__p = Object.assign({ action: 'guestLetter' }, L);   // live.html 이 붙여 보낼 모양 그대로
    const res = J(run(ctx, 'ltGuestLetter(__p)'));
    out.letters.push({
      res,
      couple: ctx._log.mails.slice(m0).map((m) => ({ to: m.to, subject: m.subject, body: m.body, html: m.html, name: m.name, from: m.from })),
      admin: ctx.__adminBox.slice(a0).map((m) => ({ subject: m.subject, body: unhtml(m.bodyHtml) }))
    });
  }
  out.messages = rowsNoTs(A.getSheetByName('Messages'));
  out.moderation = rowsNoTs(A.getSheetByName('Moderation'));
  const a0 = ctx.__adminBox.length;
  run(ctx, 'vimeoGuardDaily()');
  const vm0 = ctx.__adminBox.slice(a0).find((m) => /영상 미등록/.test(m.subject));
  const lines = vm0 ? unhtml(vm0.bodyHtml).split('\n').filter((l) => /^\d{4}-\d{2}-\d{2} · /.test(l)) : [];
  out.vimeo = { subject: vm0 ? vm0.subject : null, lines };
  ok(vm0 && /관리자 페이지에서 취소로 처리하면/.test(unhtml(vm0.bodyHtml)), '영상 점검 메일에 «관리자 페이지에서 취소하면 멈춘다» 안내가 있어야 한다(D4)');
  out.purge = { couples: coupleState(A.getSheetByName('Couples')), messages: rowsNoTs(A.getSheetByName('Messages')), moderation: rowsNoTs(A.getSheetByName('Moderation')) };

  // ── 캐시: 발행이 지우는 열쇠가 조회가 쓰는 열쇠와 같은가
  ctx.__p = { eventId: 'aa-bb-1024', view: 'online', fresh: '' };
  run(ctx, 'ltGetCouple(__p)');
  ok(ctx._cache.has('couple_aa-bb-1024_online'), '조회가 couple_<id>_<view> 로 캐시해야 한다');
  run(ctx, "_ltBustCouple('aa-bb-1024')");
  ok(!['def', 'online', 'family', 'live'].some((v) => ctx._cache.has('couple_aa-bb-1024_' + v)), '_ltBustCouple 이 네 화면 캐시를 모두 지워야 한다');

  // ── [VIMEO_GUARD_XPROJ] «모르면 보낸다» — Customers 를 못 읽으면 아무것도 건너뛰지 않는다
  run(ctx, "getCustomersSheet = function () { throw new Error('읽기 실패'); }");
  ok(J(run(ctx, '_ltClosedEvents()')) && Object.keys(J(run(ctx, '_ltClosedEvents()'))).length === 0, 'Customers 조회 실패면 닫힌 예식 목록이 비어야 한다(모르면 보낸다)');

  // ── 옮긴 뒤 탭이 사라지면 옛 데이터로 조용히 새지 않고 멈춘다
  A.deleteSheet(A.getSheetByName('Banned'));
  let threw = false; try { run(ctx, "_ltSheet('Banned')"); } catch (e) { threw = /옮기기 완료 상태/.test(String(e.message)); }
  ok(threw, '옮긴 뒤 탭이 없으면 _ltSheet 가 멈춰야 한다(옛 시트로 새면 안 된다)');
  return out;
}

// letterMigrate 의 방어 두 가지 — 같은 이름의 다른 탭 · 어긋난 사본
function migrateGuards() {
  {
    const A = makeSS('MAIN', TZ), B = makeSS(LETTER_ID, TZ);
    const ctx = makeCtx({ active: A, byId: { [LETTER_ID]: B } });
    seed(B, ctx.Date);
    A.add('Messages', [['전혀', '다른', '표']]);
    run(ctx, `function setupAllTriggers() { return ''; } function getCustomersSheet() { return null; } var STAGE_EXCEPTIONS = []; function _deFormula(v) { return v; } function _nfAdminEmail() {}`);
    load(ctx, 'automation/platform/85_invitation.gs'); load(ctx, 'automation/platform/87_letter.gs');
    let msg = ''; try { run(ctx, 'letterMigrate()'); } catch (e) { msg = String(e.message); }
    ok(/덮지 않고 멈춥니다/.test(msg), 'letterMigrate: 같은 이름의 다른 탭이 있으면 덮지 않고 멈춰야 한다');
    ok(A.getSheetByName('Messages')._rows[0][0] === '전혀', 'letterMigrate: 그 다른 탭은 그대로 남아야 한다');
  }
  {
    const A = makeSS('MAIN', TZ), B = makeSS(LETTER_ID, TZ);
    const ctx = makeCtx({ active: A, byId: { [LETTER_ID]: B } });
    seed(B, ctx.Date);
    const src = B.getSheetByName('Banned'), orig = src.copyTo;
    src.copyTo = (dst) => { const c = orig(dst); c._rows[1][0] = '망가짐'; return c; };
    run(ctx, `function setupAllTriggers() { return ''; } function getCustomersSheet() { return null; } var STAGE_EXCEPTIONS = []; function _deFormula(v) { return v; } function _nfAdminEmail() {}`);
    load(ctx, 'automation/platform/85_invitation.gs'); load(ctx, 'automation/platform/87_letter.gs');
    let msg = ''; try { run(ctx, 'letterMigrate()'); } catch (e) { msg = String(e.message); }
    ok(/원본과 다릅니다/.test(msg), 'letterMigrate: 사본이 원본과 다르면 멈춰야 한다');
    ok(!A.getSheetByName('Banned') && !A._sheets.some((s) => /Banned/.test(s._name)), 'letterMigrate: 어긋난 사본은 지워야 한다(다음 실행이 «이미 있음»으로 건너뛰지 않게)');
    ok(ctx._props.get('LETTER_MIGRATED') !== 'Y', 'letterMigrate: 실패하면 LETTER_MIGRATED 를 켜지 말아야 한다');
  }
}

// ─────────── 실행 ───────────
if (CAPTURE) {
  if (!fs.existsSync(path.join(ROOT, 'automation/guest-letter-webhook.gs'))) { console.log('✖ 옛 파일이 없어 기준값을 만들 수 없습니다(git 기록에서 꺼내 두고 다시)'); process.exit(2); }
  const g = runOld();
  fs.writeFileSync(GOLDEN, JSON.stringify(g, null, 1) + '\n');
  console.log(`기준값 저장 — getCouple ${g.couple.length}건 · 편지 ${g.letters.length}건 · 영상 ${g.vimeo.lines.length}줄 → ${path.relative(ROOT, GOLDEN)}`);
  process.exit(0);
}
if (!fs.existsSync(GOLDEN)) { console.log('✖ 기준값(letter-golden.json)이 없습니다 — --capture 로 먼저 만드세요'); process.exit(2); }
const G = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
const N = runNew();
migrateGuards();
const diff = (a, b) => JSON.stringify(a) === JSON.stringify(b);
COUPLE_CASES.forEach((c, i) => ok(diff(N.couple[i], G.couple[i]), `getCouple ${JSON.stringify(c)} 응답이 옛 웹훅과 다르다`));
LETTERS.forEach((L, i) => {
  ok(diff(N.letters[i].res, G.letters[i].res), `편지 ${i + 1}(${L.eventId}) 응답이 다르다: ${JSON.stringify(N.letters[i].res)} ≠ ${JSON.stringify(G.letters[i].res)}`);
  ok(diff(N.letters[i].couple, G.letters[i].couple), `편지 ${i + 1}(${L.eventId}) 두 분께 가는 메일이 다르다`);
  ok(diff(N.letters[i].admin, G.letters[i].admin), `편지 ${i + 1}(${L.eventId}) 관리자 알림이 다르다: ${JSON.stringify(N.letters[i].admin)} ≠ ${JSON.stringify(G.letters[i].admin)}`);
});
ok(diff(N.messages, G.messages), 'Messages 에 남는 행이 다르다');
ok(diff(N.moderation, G.moderation), 'Moderation 에 남는 행이 다르다');
ok(diff(N.vimeo, G.vimeo), `영상 점검 결과가 다르다: ${JSON.stringify(N.vimeo)} ≠ ${JSON.stringify(G.vimeo)}`);
ok(diff(N.purge, G.purge), '개인정보 파기 결과(시트 상태)가 다르다');
// 기준값 자체가 «뭔가를 재고 있는가» — 비어 있는 기준값과 대조해 통과하면 안 된다
ok(G.couple.filter((x) => x.ok).length >= 40 && G.letters.filter((x) => x.couple.length).length >= 4 && G.letters.filter((x) => x.admin.length).length >= 4
  && G.vimeo.lines.length >= 2 && G.messages.length >= 10 && G.moderation.length >= 4, '기준값이 너무 비었다 — 대조가 아무것도 안 잰다');

const total = COUPLE_CASES.length + LETTERS.length * 3 + 4;
if (bad.length) { console.log(`[LETTER_SIM] ✖ ${bad.length}건`); bad.forEach((b) => console.log('  ✖ ' + b)); process.exit(1); }
console.log(`[LETTER_SIM] ✅ 옛 Letter System 과 같다 — getCouple ${COUPLE_CASES.length}건 · 편지 ${LETTERS.length}건(응답·메일·기록) · 영상 점검 · 파기 · 옮기기 방어 (대조 ${total}항목 · 의도한 차이 D1~D4 만 허용)`);
