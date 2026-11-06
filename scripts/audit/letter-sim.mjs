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
 *   D5 «두 분께» 편지 — 신랑·신부 주소가 같으면(대소문자 무시) 한 통만 [LETTER_ONE_ADDR 2026-09-26]
 *      청첩장 발행이 두 칸을 가입 이메일 하나로 채워 같은 메일이 두 통 갔다. 기준값의 편지들은 주소가 서로 달라 대조는 그대로이고,
 *      같은 주소 경우는 아래 oneAddrGuard 가 따로 잰다.
 *   D6 편지 몰림 응답 — 한 줄 말투(«. » → « · » · 끝 마침표 없음) + 몰림 코드 G1 [LT_RATE_G1 · LT_RATE_ECODE 2026-10-08]
 *      화면 실패 코드 장치(ERR_CODES)가 «(코드 G1)»을 붙이게. 시간당 몰림 글도 «다시 시도해» → «다시 보내»로 같은 말이 됐다.
 *   D7 하객 편지 발송 감시 [LT_SEND_WATCH 2026-11-06 사장님 «미발송은 검사하는 필터가 있어야»] — Messages 상태(G)는 «접수 → 보냄 / 보류(금지어) / 실패(주소 없음 · 메일 오류)»,
 *      뒤에 편지번호 · 재시도 · 상태시각 · 점검(I~L)이 붙는다. 관리자 알림은 보냄이 아니면 모두(번호 · 예식 · 상태만 · 본문 · 하객 이름 없음) —
 *      옛 «편지 미전달 · 수신자 이메일 없음»(본문을 실었다)은 사라졌다. 그래서 Messages 는 상태 칸과 새 칸을 빼고 대조하고, 상태 · 알림은 sendWatchGuard 가 따로 잰다.
 *   D8 getCouple 에 letterSplit(두 주소가 다 있고 다를 때만 true) [LETTER_SPLIT_A 2026-11-06 사장님 결정 2 = A] — 대조 전에 떼고 따로 잰다.
 *   D9 받는 분 거절 [B2_FIX_MA_05 · B2_FIX_L13 2026-11-06 재검증 재수정] — 잘못된 받는 분 값(weird)은 «두 분 모두»로 넓히지 않고, 두 주소가 갈리지 않는 예식의
 *      «한 분에게만»(GROOM · bride)도 «받는 분을 다시 골라 주세요.»(G0)로 막는다 — 시트에 적지 않고 메일도 없다. 그 편지(기준값 12 · 13 · 14)는 새 응답 모양으로 대조하고
 *      Messages 대조에서 그 줄을 뺀다 · splitGuard 가 따로 잰다.
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
  ss.insertSheet = (name) => ss.add(name, []);
  return ss;
}
function makeCtx({ active, byId }) {
  const log = { mails: [], admin: [], logs: [], triggersSetup: 0 };
  const cache = new Map(), props = new Map();
  const FakeDate = makeDateClass();
  const ctx = {
    Date: FakeDate, console: { log: (...a) => log.logs.push(a.join(' ')), error: (...a) => log.logs.push(a.join(' ')), warn: (...a) => log.logs.push(a.join(' ')) },
    Logger: { log: (...a) => log.logs.push(a.join(' ')) },
    _gsr_: () => {}, _trigIn_: () => {},   // [GSR_GATE 2026-10-09] 공개 함수 첫 줄 문 — 이 흉내는 서버 길 안
    _requireAdmin: () => ({ ok: true }),   // [B19_LOCK 2026-10-09] 편집기 도구는 _requireAdmin 으로 잠겼다 — 이 흉내는 소유자가 편집기에서 돌리는 것
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
const D9_RES = { ok: false, ecode: 'G0', error: '받는 분을 다시 골라 주세요.' };   // [B2_FIX_MA_05 · B2_FIX_L13] D9 막힌 응답
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

// [LETTER_ONE_ADDR] D5 — 같은 주소면 «두 분께»가 한 통만 · 주소가 다르면 종전처럼 두 통 · 한쪽만 보내는 편지는 그대로 한 통
function oneAddrGuard() {
  const A = makeSS('MAIN', TZ), B = makeSS(LETTER_ID, TZ);
  const ctx = makeCtx({ active: A, byId: { [LETTER_ID]: B } });
  run(ctx, `function setupAllTriggers() { return ''; } function getCustomersSheet() { return null; } var STAGE_EXCEPTIONS = []; function _deFormula(v) { return v; } function _nfAdminEmail() {}`);
  load(ctx, 'automation/platform/85_invitation.gs'); load(ctx, 'automation/platform/87_letter.gs');
  const send = (c, r) => { const m0 = ctx._log.mails.length; ctx.__c = c; ctx.__r = r; const n = run(ctx, '_ltSendToRecipients_(__c, "하객", "", "축하해요", __r)'); return { n, to: ctx._log.mails.slice(m0).map((m) => m.to) }; };
  const C = (g, b) => ({ eventId: 'one-addr-0101', groomName: '가나', brideName: '다라', groomEmail: g, brideEmail: b });
  let r = send(C('Same@a.test', 'same@a.test'), 'both');
  ok(r.n === 1 && r.to.length === 1 && r.to[0] === 'Same@a.test', `D5 같은 주소 «두 분께»는 한 통이어야 한다: ${JSON.stringify(r)}`);
  r = send(C('g@a.test', 'b@a.test'), 'both');
  ok(r.n === 2 && r.to.join(',') === 'g@a.test,b@a.test', `D5 주소가 다르면 두 통(종전 그대로): ${JSON.stringify(r)}`);
  r = send(C('same@a.test', 'same@a.test'), 'bride');
  ok(r.n === 0 && r.to.length === 0, `D9 같은 주소 예식의 «신부님께»는 함께 쓰는 주소로 보내지 않는다(B2_FIX_L13): ${JSON.stringify(r)}`);
  r = send(C('g@a.test', 'b@a.test'), 'bride');
  ok(r.n === 1 && r.to[0] === 'b@a.test', `D9 주소가 갈리면 «신부님께»는 신부 주소 한 통: ${JSON.stringify(r)}`);
  r = send(C('g@a.test', ''), 'groom');
  ok(r.n === 0, `D9 한쪽 주소만 있는 예식의 «신랑님께»도 보내지 않는다(하객 화면이 숨기는 선택지): ${JSON.stringify(r)}`);
  r = send(C('', 'b@a.test'), 'both');
  ok(r.n === 1 && r.to[0] === 'b@a.test', `D5 한쪽 주소만 있으면 한 통(종전 그대로): ${JSON.stringify(r)}`);
}

// [LT_SEND_WATCH] D7 · [LETTER_SPLIT_A] D8 · [LETTER_MAIL_A] — 메일 오류 · 매일 점검(다시 보내기 1회 · 보고 한 번 · 건수 시트) · 갈라 보내기 표시 · 발행 매핑
function sendWatchGuard() {
  const A = makeSS('MAIN', TZ);
  const ctx = makeCtx({ active: A, byId: {} });
  ctx._props.set('LETTER_MIGRATED', 'Y');
  run(ctx, `function setupAllTriggers() { return ''; } function getCustomersSheet() { return null; } var STAGE_EXCEPTIONS = []; function _deFormula(v) { return v; } function _nfAdminEmail(s, h) { __adminBox.push({ subject: s, body: h }); }`);
  ctx.__adminBox = [];
  load(ctx, 'automation/platform/85_invitation.gs'); load(ctx, 'automation/platform/87_letter.gs');
  const K = ['eventId', 'groomName', 'brideName', 'groomEmail', 'brideEmail', 'weddingDate'];
  A.add('Couples', [['식별'], ['예식ID'], K, ['sw-a-0101', '가나', '다라', 'g@x.test', 'b@x.test', '2027-01-01'], ['sw-b-0101', '마바', '사아', 'Same@x.test', 'same@x.test', '2027-01-01'], ['sw-c-0101', '자차', '카타', 'g@y.test', '', '2027-01-01']]);
  A.add('Messages', [['시각', 'eventId', '부부', '하객', '관계', '편지', '상태', '받는 분']]);
  A.add('Moderation', [['시각']]); A.add('Banned', [['단어', '분류'], ['씨발', '욕설']]);
  // ① getCouple letterSplit — 둘 다 있고 다를 때만 true
  const split = (id) => { ctx.__p = { eventId: id, view: 'live', fresh: '1' }; const r = J(run(ctx, 'ltGetCouple(__p)')); return r.couple && r.couple.letterSplit; };
  ok(split('sw-a-0101') === true && split('sw-b-0101') === false && split('sw-c-0101') === false, `letterSplit: 다른 주소 true · 같은 주소 false · 한쪽 없음 false 여야 한다(D8): ${[split('sw-a-0101'), split('sw-b-0101'), split('sw-c-0101')]}`);
  // ② 메일 오류 — 던지지 않고 «실패(메일 오류)» · 응답 delivered:false · 알림(본문 없음)
  const realSend = ctx.GmailApp.sendEmail; let boom = true;
  ctx.GmailApp.sendEmail = (...a) => { if (boom) throw new Error('Service invoked too many times'); return realSend(...a); };
  ctx.__p = { eventId: 'sw-a-0101', guestName: '하객 메일오류', relation: '', message: '메일이 실패하는 편지', recipient: 'both' };
  const r1 = J(run(ctx, 'ltGuestLetter(__p)'));
  const M = () => A.getSheetByName('Messages')._rows;
  const row1 = M()[M().length - 1];
  ok(r1.ok === true && r1.delivered === false, `메일 오류: 응답은 ok · delivered:false 여야 한다(편지는 보관 · 다시 보낸다): ${JSON.stringify(r1)}`);
  ok(row1[6] === '실패(메일 오류)' && /^L\d{12}[A-Z0-9]{3}$/.test(row1[8]) && row1[9] === 0, `메일 오류: 시트 상태 «실패(메일 오류)» · 편지번호 · 재시도 0: ${JSON.stringify(row1.slice(6))}`);
  ok(M()[0][8] === '편지번호' && M()[0][11] === '점검', 'Messages 1행에 새 칸 이름(편지번호 ~ 점검)이 붙어야 한다');
  const al = ctx.__adminBox.find((m) => /하객 편지 실패\(메일 오류\) · sw-a-0101/.test(m.subject));
  ok(al && al.body.includes(row1[8]) && !al.body.includes('메일이 실패하는 편지') && !al.body.includes('하객 메일오류'), `메일 오류 알림: 편지번호는 있고 본문 · 하객 이름은 없어야 한다: ${al && al.body}`);
  // ③ 매일 점검 — 한 시간 넘은 «보냄» 아닌 편지만 · 다시 보내기 1회 · 보류는 다시 안 보냄 · 보고 한 번 · 건수 시트
  boom = false;
  const old = new ctx.Date(NOW - 2 * 3600000), fresh = new ctx.Date(NOW - 10 * 60000);
  row1[0] = old;
  const sh = A.getSheetByName('Messages');
  sh._rows.push([old, 'sw-a-0101', '가나 · 다라', '하객 접수', '', '접수에 멈춘 편지', '접수', '신랑에게만', 'L260925070000AAA', 0, old, '']);
  sh._rows.push([old, 'sw-c-0101', '자차 · 카타', '하객 신부', '', '신부 주소 없는 편지', '실패(주소 없음)', '신부에게만', 'L260925070000BBB', 0, old, '']);
  sh._rows.push([old, 'sw-a-0101', '가나 · 다라', '하객 욕', '', '걸린 편지', '보류(금지어)', '두 분 함께', 'L260925070000CCC', 0, old, '']);
  sh._rows.push([fresh, 'sw-a-0101', '가나 · 다라', '하객 새', '', '방금 실패', '실패(메일 오류)', '두 분 함께', 'L260925070000DDD', 0, fresh, '']);
  const m0 = ctx._log.mails.length, a0 = ctx.__adminBox.length;
  const w1 = J(run(ctx, '_ltSendWatch_()'));
  const sentNow = ctx._log.mails.slice(m0).map((m) => m.to);
  const byId = (id) => sh._rows.find((r) => r[8] === id);
  ok(w1.retried === 3 && w1.fixed === 2, `매일 점검: 다시 보내기 3건(메일 오류 · 접수 · 주소 없음) · 그중 보냄 2: ${JSON.stringify(w1)}`);
  ok(byId(row1[8])[6] === '보냄' && byId(row1[8])[9] === 1 && byId('L260925070000AAA')[6] === '보냄' && byId('L260925070000BBB')[6] === '실패(주소 없음)' && byId('L260925070000BBB')[9] === 1, '매일 점검: 다시 보낸 편지의 상태 · 재시도 횟수');
  ok(byId('L260925070000CCC')[9] === 0 && byId('L260925070000CCC')[6] === '보류(금지어)', '매일 점검: 보류(금지어)는 다시 보내지 않는다');
  ok(byId('L260925070000DDD')[9] === 0 && !byId('L260925070000DDD')[11], '매일 점검: 한 시간이 안 된 편지는 건드리지 않는다');
  ok(sentNow.join(',') === 'g@x.test,b@x.test,g@x.test', `매일 점검: 다시 보낸 메일 받는 곳(두 분 · 신랑만): ${sentNow}`);
  const rep1 = ctx.__adminBox.slice(a0).filter((m) => /하객 편지 점검/.test(m.subject));
  ok(rep1.length === 1 && /4건/.test(rep1[0].subject) && /L260925070000CCC/.test(rep1[0].body) && !/걸린 편지|접수에 멈춘 편지|하객 욕|하객 접수/.test(rep1[0].body) && /sw-a-0101 · 접수 \d+ · 보냄 \d+ · 보류 1/.test(unhtml(rep1[0].body)), `매일 점검 메일: 한 통 · 번호 · 예식 · 상태 · 건수만: ${rep1.map((m) => m.subject + ' | ' + unhtml(m.body)).join(' // ')}`);
  const cs = A.getSheetByName('편지현황');
  const ca = cs && cs._rows.find((r) => r[0] === 'sw-a-0101');
  ok(ca && ca[1] === 4 && ca[2] === 2 && ca[3] === 1 && ca[4] === 1 && ca[5] === 0, `편지현황 시트: sw-a-0101 접수 4 · 보냄 2 · 보류 1 · 실패 1 · 처리 중 0: ${JSON.stringify(ca)}`);
  ok(cs && cs._rows[0][0] === '예식' && !cs._rows.flat().some((v) => /편지\b|하객/.test(String(v)) && !/^예식$/.test(String(v))), '편지현황 시트에 본문 · 하객 이름이 없어야 한다');
  // 다시 돌려도 — 다시 보내기 없음 · 보고할 새 줄 없음(한 시간 안 된 줄 제외)
  const m1 = ctx._log.mails.length; ctx._cache.clear();
  const w2 = J(run(ctx, '_ltSendWatch_()'));
  ok(w2.retried === 0 && w2.report === 0 && ctx._log.mails.length === m1, `매일 점검 두 번째: 다시 보내기 · 보고 없음: ${JSON.stringify(w2)}`);
  // ④ 발행 매핑 — 마이페이지 칸 > 계약서 칸 > 가입 이메일 · 이메일 모양이 아니면 다음 후보
  const map = (b, d) => { ctx.__b = b; ctx.__d = d; const f = J(run(ctx, '_invCouplesFields(__b, __d)')); return [f.groomEmail, f.brideEmail].join('|'); };
  ok(map({ email: 'join@x.test' }, {}) === 'join@x.test|join@x.test', 'LETTER_MAIL_A: 아무것도 없으면 둘 다 가입 이메일(종전과 같다)');
  ok(map({ email: 'join@x.test', ciGroomEmail: 'g@c.test', ciBrideEmail: 'b@c.test' }, {}) === 'g@c.test|b@c.test', 'LETTER_MAIL_A: 계약서 칸이 있으면 각자');
  ok(map({ email: 'join@x.test', ciGroomEmail: 'g@c.test', ciBrideEmail: 'b@c.test' }, { letterGroomEmail: 'g2@m.test', letterBrideEmail: '아니다' }) === 'g2@m.test|b@c.test', 'LETTER_MAIL_A: 마이페이지 칸이 먼저 · 모양이 아니면 다음 후보');
  ok(map({ email: 'join@x.test', ciBrideEmail: 'b@c.test' }, {}) === 'join@x.test|b@c.test', 'LETTER_MAIL_A: 한쪽만 있으면 나머지는 가입 이메일');   // [B2_FIX_K36] 걷음 — 대본 결정 대기(빈 칸 폴백을 지우면 «두 분 모두» 편지도 한 주소로만 간다)
  splitGuard(ctx, A);
}

// [B2_FIX_MA_05 · B2_FIX_L13] D9 — 받는 분 값 · 갈리지 않는 예식의 «한 분에게만»을 접수 전에 막는다(시트 · 메일 없음)
function splitGuard(ctx, A) {
  const R = (v) => { ctx.__v = v; return run(ctx, '_ltRecipient(__v)'); };
  ok(R('groom') === 'groom' && R(' GROOM ') === 'groom' && R('both') === 'both' && R('bride') === 'bride', 'D9 _ltRecipient: 바른 값은 그대로(대소문자 · 공백 무시)');
  ok(R('') === 'both' && R(null) === 'both' && R(undefined) === 'both', 'D9 _ltRecipient: 값이 없는 옛 화면은 종전대로 «두 분 모두»');
  ok(R('weird') === '' && R('groom,bride') === '' && R('신랑') === '', 'D9 _ltRecipient: 잘못된 값은 두 분으로 넓히지 않는다(빈 값)');
  const M = () => A.getSheetByName('Messages')._rows.length;
  const send = (p) => { const n0 = M(), m0 = ctx._log.mails.length; ctx._cache.clear(); ctx.__p = Object.assign({ relation: '', message: '받는 분 시험' }, p); const r = J(run(ctx, 'ltGuestLetter(__p)')); return { r, rows: M() - n0, to: ctx._log.mails.slice(m0).map((m) => m.to) }; };
  let x = send({ eventId: 'sw-b-0101', guestName: '하객 같은주소', recipient: 'bride' });
  ok(JSON.stringify(x.r) === JSON.stringify(D9_RES) && x.rows === 0 && x.to.length === 0, `D9 같은 주소 예식의 «신부에게만»은 막는다(시트 · 메일 없음): ${JSON.stringify(x)}`);
  x = send({ eventId: 'sw-c-0101', guestName: '하객 한쪽', recipient: 'groom' });
  ok(JSON.stringify(x.r) === JSON.stringify(D9_RES) && x.rows === 0, `D9 한쪽 주소만 있는 예식의 «신랑에게만»은 막는다: ${JSON.stringify(x)}`);
  x = send({ eventId: 'sw-a-0101', guestName: '하객 이상값', recipient: 'everyone' });
  ok(JSON.stringify(x.r) === JSON.stringify(D9_RES) && x.rows === 0, `D9 갈리는 예식이어도 잘못된 값은 막는다: ${JSON.stringify(x)}`);
  x = send({ eventId: 'sw-a-0101', guestName: '하객 신랑만', recipient: 'groom' });
  ok(x.r.ok === true && x.rows === 1 && x.to.join(',') === 'g@x.test', `D9 갈리는 예식의 «신랑에게만»은 신랑 주소 한 통: ${JSON.stringify(x)}`);
  x = send({ eventId: 'sw-b-0101', guestName: '하객 두분', recipient: 'both' });
  ok(x.r.ok === true && x.to.length === 1, `D9 같은 주소 예식의 «두 분 모두»는 그대로 한 통: ${JSON.stringify(x)}`);
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
oneAddrGuard();   // [LETTER_ONE_ADDR] D5
sendWatchGuard();   // [LT_SEND_WATCH] D7 · [LETTER_SPLIT_A] D8 · [LETTER_MAIL_A]
const diff = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/* [LT_RATE_G1] D6 — 기준값의 옛 몰림 글을 새 응답 모양으로 옮겨 대조한다(그 밖의 응답은 한 글자도 그대로) */
const D6 = { '편지가 연달아 도착하고 있어요. 잠시 뒤에 다시 보내 주세요.': '편지가 연달아 도착하고 있어요 · 잠시 뒤에 다시 보내 주세요', '지금은 편지가 많이 몰렸어요. 잠시 뒤에 다시 시도해 주세요.': '지금은 편지가 많이 몰렸어요 · 잠시 뒤에 다시 보내 주세요' };
const d6 = (r) => (r && r.ok === false && D6[r.error]) ? { ok: false, ecode: 'G1', error: D6[r.error] } : r;
/* [LT_SEND_WATCH · LETTER_SPLIT_A] D7 · D8 — 새로 생긴 값은 떼고 대조한다(따로 잰다) */
const noSplit = (r) => { const x = J(r); if (x && x.couple) delete x.couple.letterSplit; return x; };
const ST_OK = ['접수', '보냄', '보류(금지어)', '실패(주소 없음)', '실패(메일 오류)'];
const msgCore = (rows) => rows.map((r) => r.slice(0, 7).filter((_, j) => j !== 5));   // 시각 뺀 뒤 0~6 · 상태(5) 빼고
/* [B2_FIX_MA_05 · B2_FIX_L13] D9 — 이제 막히는 편지(잘못된 값 · 갈리지 않는 예식의 «한 분에게만»). 기준값의 그 줄(하객 이름 · 2번 칸)은 Messages 대조에서 뺀다 */
const d9Hit = (L) => { const v = String(L.recipient == null ? '' : L.recipient).toLowerCase().trim(); return (v && !['groom', 'bride', 'both'].includes(v)) || ((v === 'groom' || v === 'bride') && L.eventId === 'cc-dd-0612-x7k2mq'); };
const D9_NAMES = new Set(LETTERS.filter(d9Hit).map((L) => String(L.guestName || '').trim().substring(0, 50)));
const noD9 = (rows) => rows.filter((r) => !D9_NAMES.has(String(r[2])));
COUPLE_CASES.forEach((c, i) => ok(diff(noSplit(N.couple[i]), G.couple[i]), `getCouple ${JSON.stringify(c)} 응답이 옛 웹훅과 다르다`));
N.couple.forEach((r, i) => { if (r && r.ok && r.couple) ok(typeof r.couple.letterSplit === 'boolean', `getCouple ${JSON.stringify(COUPLE_CASES[i])} letterSplit 이 참 · 거짓이어야 한다(D8)`); });
ok(D9_NAMES.size === 3, `D9 막히는 편지는 기준값 셋(12 · 13 · 14)이어야 한다: ${D9_NAMES.size}`);
LETTERS.forEach((L, i) => {
  if (d9Hit(L)) {   // D9 — 막힌다 · 메일 · 알림 없음
    ok(diff(N.letters[i].res, D9_RES), `편지 ${i + 1}(${L.eventId} · ${L.recipient}) 는 «받는 분을 다시 골라 주세요.»로 막혀야 한다(D9): ${JSON.stringify(N.letters[i].res)}`);
    ok(N.letters[i].couple.length === 0 && N.letters[i].admin.length === 0, `편지 ${i + 1} 막힌 편지는 메일 · 알림이 없어야 한다(D9)`);
    return;
  }
  ok(diff(N.letters[i].res, d6(G.letters[i].res)), `편지 ${i + 1}(${L.eventId}) 응답이 다르다: ${JSON.stringify(N.letters[i].res)} ≠ ${JSON.stringify(d6(G.letters[i].res))}`);
  ok(diff(N.letters[i].couple, G.letters[i].couple), `편지 ${i + 1}(${L.eventId}) 두 분께 가는 메일이 다르다`);
  const nA = N.letters[i].admin.filter((m) => !/^\[Moment Edit\] 하객 편지 /.test(m.subject)), gA = G.letters[i].admin.filter((m) => !/편지 미전달 · 수신자 이메일 없음/.test(m.subject));   // D7
  ok(diff(nA, gA), `편지 ${i + 1}(${L.eventId}) 관리자 알림이 다르다: ${JSON.stringify(nA)} ≠ ${JSON.stringify(gA)}`);
  N.letters[i].admin.forEach((m) => { const t = m.subject + '\n' + m.body; ok(!(String(L.message || '').length >= 3 && t.includes(L.message)) && !(String(L.guestName || '').length >= 2 && t.includes(L.guestName)), `편지 ${i + 1} 관리자 알림에 편지 본문 · 하객 이름이 실렸다(D7): ${m.subject}`); });
});
ok(diff(msgCore(N.messages), msgCore(noD9(G.messages))), 'Messages 에 남는 행이 다르다(상태 칸 · 새 칸 빼고 · D9 막힌 편지 빼고)');
ok(!N.messages.some((r) => D9_NAMES.has(String(r[2]))), 'D9 막힌 편지가 Messages 에 적혔다');
{ /* D7 — 이번에 들어온 편지(번호가 있는 줄)의 상태가 응답과 맞고, 보냄이 아니면 그 예식 · 상태의 관리자 알림이 있다 */
  const newRows = N.messages.filter((r) => /^L\d{12}[A-Z0-9]{3}$/.test(String(r[7] || '')));
  ok(newRows.length >= 7, `편지번호가 붙은 새 줄이 너무 적다: ${newRows.length}`);   // D9 로 셋이 접수 전에 막힌다(10 → 7)
  const subs = N.letters.flatMap((x) => x.admin.map((m) => m.subject));
  newRows.forEach((r) => { ok(ST_OK.includes(r[5]) && r[5] !== '접수', `새 줄 상태가 다섯 가지 중 «접수» 아닌 하나여야 한다: ${r[5]}`);
    if (r[5] !== '보냄') ok(subs.includes(`[Moment Edit] 하객 편지 ${r[5]} · ${r[0]}`), `«${r[5]}» 편지(${r[0]})의 관리자 알림이 없다`); });
  ok(newRows.some((r) => r[5] === '보류(금지어)') && newRows.some((r) => r[5] === '실패(주소 없음)') && newRows.some((r) => r[5] === '보냄'), '보냄 · 보류 · 주소 없음 셋이 다 나와야 한다(시험 데이터가 그걸 잰다)');
}
ok(diff(N.moderation, G.moderation), 'Moderation 에 남는 행이 다르다');
ok(diff(N.vimeo, G.vimeo), `영상 점검 결과가 다르다: ${JSON.stringify(N.vimeo)} ≠ ${JSON.stringify(G.vimeo)}`);
ok(diff(N.purge.couples, G.purge.couples) && diff(N.purge.moderation, G.purge.moderation) && diff(msgCore(N.purge.messages), msgCore(noD9(G.purge.messages))), '개인정보 파기 결과(시트 상태)가 다르다');
// 기준값 자체가 «뭔가를 재고 있는가» — 비어 있는 기준값과 대조해 통과하면 안 된다
ok(G.couple.filter((x) => x.ok).length >= 40 && G.letters.filter((x) => x.couple.length).length >= 4 && G.letters.filter((x) => x.admin.length).length >= 4
  && G.vimeo.lines.length >= 2 && G.messages.length >= 10 && G.moderation.length >= 4, '기준값이 너무 비었다 — 대조가 아무것도 안 잰다');

const total = COUPLE_CASES.length + LETTERS.length * 3 + 4;
if (bad.length) { console.log(`[LETTER_SIM] ✖ ${bad.length}건`); bad.forEach((b) => console.log('  ✖ ' + b)); process.exit(1); }
console.log(`[LETTER_SIM] ✅ 옛 Letter System 과 같다 — getCouple ${COUPLE_CASES.length}건 · 편지 ${LETTERS.length}건(응답·메일·기록) · 영상 점검 · 파기 · 옮기기 방어 (대조 ${total}항목 · 의도한 차이 D1~D9 만 허용)`);
