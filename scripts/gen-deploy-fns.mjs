#!/usr/bin/env node
/* ★[FNS_FULL 2026-09-05] deploy-marks.json 에 «파일별 최상위 함수 전체 목록»을 채운다.
 *
 * 왜 필요했나 — 실측(2026-09-05):
 *   점검이 파일마다 «센티넬 함수 1개 + 표식 몇 개»만 보다 보니, 그 지점보다 아래는 안 봤다.
 *   90_test-utils 는 343줄 중 19줄(6%)까지만, 40_signup 7%, 50_auth-handlers 8%, 10_customers-setup 9%.
 *   → 붙여넣다 뒷부분이 잘려도 「누락 0건」이 나왔다. 사용자가 물은 «누락 없는지»의 사각지대가 여기였다.
 *
 * 무엇을 하나 — 각 .gs 의 `^function 이름(` 을 전부 모아 fns 에 넣는다.
 *   GAS 쪽 deployCheck 가 이름마다 typeof 로 확인하니, 파일 «어느 줄이 잘려도» 그 아래 함수가 사라져 잡힌다.
 *   ★목록은 사이트(deploy-marks.json)에 있으므로 99_deployCheck.gs 를 다시 붙여넣을 필요는 없다.
 *
 * 쓰는 법
 *
 * ★[FNS_MORE 2026-09-05 사용자 "이 테스트의 완성도를 체크해 빈틈과 …"]
 *   함수만 보던 것을 넷으로 넓혔다 — 함수·최상위 var·트리거·시트 컬럼.
 *   ★못 싣는 것도 적어 둔다(빈칸을 «통과»로 읽지 않게):
 *     · consultation-booking 의 const 5개(CONFIG·SYS·HEADERS·ST·LOCKED_STATES)
 *       — const 는 전역 속성이 아니라 렉시컬 바인딩이라, 시뮬레이터(node vm)가 파일을 따로 올리는 순간
 *         파일 밖에서 안 보인다(실측). 진짜 GAS 에서는 보일 수 있지만 «여기서 확인할 수 없는 검사»는
 *         넣지 않는다 — 틀리면 있지도 않은 누락을 쫓게 만든다. 그 파일은 함수 130개로 덮인다.
 *     · 별도 GAS 프로젝트(form-to-couple · guest-letter-webhook · 가족청첩장빌드)는 이 점검 밖이다.
 *
 *   node scripts/gen-deploy-fns.mjs          → deploy-marks.json 갱신
 *   node scripts/gen-deploy-fns.mjs --check  → 낡았으면 종료코드 1 (감사·CI 용)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const SRC = {};
for (const f of fs.readdirSync(path.join(ROOT, 'automation/platform')))
  if (f.endsWith('.gs')) SRC[f.replace(/\.gs$/, '')] = 'automation/platform/' + f;
SRC['admin'] = 'automation/admin/admin.gs';
SRC['consultation-booking'] = 'automation/consultation/consultation-booking.gs';

/* 99_deployCheck 자신은 뺀다 — 점검 도구라 «올렸는지»의 대상이 아니고,
   이 파일이 돌고 있다는 사실 자체가 존재 증명이다. */
delete SRC['99_deployCheck'];

const fns = {};
for (const [name, rel] of Object.entries(SRC)) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const list = [...src.matchAll(/^function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/gm)].map(m => m[1]);
  if (list.length) fns[name] = list;
}

/* ── 최상위 var — GAS·vm 모두 전역 속성이 된다(그래서 확인도 되고 시뮬레이션도 된다).
   CUSTOMER_HEADERS·STAGE_FLOW·PRICING·NOTIFY_EVENTS 같은 표가 여기 있다. */
const vars = {};
for (const [name, rel] of Object.entries(SRC)) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const list = [...src.matchAll(/^var\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm)].map((m) => m[1]);
  if (list.length) vars[name] = list;
}

/* ── 트리거 — 코드를 붙이고 재배포해도 «예약 실행»은 안 걸린다. setupAllTriggers 를 사람이 돌려야 한다.
   그 사실을 점검이 안 봐서, 새 일일 작업이 영영 안 도는데 「누락 0건」이 나올 수 있었다. */
const jSrc = fs.readFileSync(path.join(ROOT, 'automation/platform/70_journey.gs'), 'utf8');
const planM = jSrc.match(/function setupAllTriggers\s*\(\)\s*\{\s*var plan = \[([\s\S]*?)\];/);
if (!planM) { console.error('★setupAllTriggers 의 plan 배열을 못 찾았습니다 — 파싱이 깨졌습니다'); process.exit(2); }
const triggers = [...planM[1].matchAll(/fn:\s*'([^']+)'/g)].map((m) => m[1]);
if (triggers.length < 10) { console.error('★트리거가 ' + triggers.length + '개 — 파싱이 깨졌습니다'); process.exit(2); }

/* ── 시트 컬럼 — 헤더가 없으면 writeCell 이 조용히 건너뛰어 저장이 통째로 사라진다(화면엔 「저장됐어요」).
   ★리터럴을 베끼지 않는다. 진짜 add*Columns 를 «빈 시트»에 대고 실행해 무엇을 만들려 하는지 받아 적는다.
   베껴 두면 원본이 늘 때 조용히 어긋난다 — 이 저장소가 반복해 밟은 함정이다. */
const { loadGas } = await import('./audit/gas-lint.mjs');
const { sandbox: G, errors: gErr } = loadGas();
if (gErr.length) { console.error('★GAS 로드 실패 — ' + gErr[0].file + ': ' + gErr[0].message); process.exit(2); }
const ADDERS = ['addBalanceColumns', 'addProdTrackColumns', 'addGuideTokenColumn',
  'addGuestPhotoColumns', 'addResultSelectionColumns'];
const columns = [];
for (const fn of ADDERS) {
  if (typeof G[fn] !== 'function') { console.error('★' + fn + ' 이 없습니다 — 이름이 바뀌었습니다'); process.exit(2); }
  const got = [];
  let width = 0;
  G.getCustomersSheet = () => ({
    getLastRow: () => 1,
    getLastColumn: () => width,
    getRange: (r, c) => ({
      getValues: () => [got.slice()],
      setValue: (v) => { got[c - 1] = String(v); width = Math.max(width, c); },
    }),
  });
  try { G[fn](); } catch (e) { console.error('★' + fn + ' 실행 실패: ' + e.message); process.exit(2); }
  const made = got.filter(Boolean);
  if (!made.length) { console.error('★' + fn + ' 이 컬럼을 하나도 안 만들었습니다 — 흉내가 틀렸습니다'); process.exit(2); }
  columns.push({ fn, file: fn === 'addBalanceColumns' ? '70_journey' : '80_production', need: made });
}

/* ── GAS 안 HTML 4벌 — 종전엔 Admin.html 을 「화면 틀이라 코드로 확인 불가」로 비워 두었고,
   상담 화면 셋(ScreenA·B·C)은 아예 언급조차 없었다. 넷을 합쳐 361KB 가 통째로 점검 밖이었다.
   사실은 볼 수 있다 — 넷 다 HtmlService.createTemplateFromFile 로 읽히므로 getRawContent() 로 본문이 잡힌다.
   ★GAS 파일 이름(확장자 없음)으로 적는다 — createTemplateFromFile 이 그 이름을 쓴다. */
const HTMLS = [
  ['Admin', 'automation/admin/Admin.html'],
  ['ScreenA_apply', 'automation/consultation/ScreenA_apply.html'],
  ['ScreenB_schedule', 'automation/consultation/ScreenB_schedule.html'],
  ['ScreenC_change', 'automation/consultation/ScreenC_change.html'],
];
const html = HTMLS.map(([name, rel]) => {
  const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const marks = [...new Set([...raw.matchAll(/\[([A-Z][A-Z0-9_]{3,})\]/g)].map((m) => m[1]))];
  if (!marks.length) {
    console.error('★' + name + ' 에 표식이 하나도 없습니다 — 붙었는지 확인할 근거가 없습니다.');
    console.error('  그 파일 맨 위에 <!-- [이름] 설명 --> 한 줄을 넣고 다시 실행하세요.');
    process.exit(2);
  }
  return { file: name, marks, bytes: raw.length };
});
const htmlMarks = html.reduce((a, h) => a.concat(h.marks), []);

/* ── 스크립트 속성 — «비어 있어도 코드는 멀쩡해 보이고 기능만 조용히 안 도는» 자리.
   ★분류는 코드에서 기계적으로 못 뽑는다(무엇이 «필수»인지는 그 기능을 쓰느냐에 달렸다).
     그래서 표로 적되, «표에 없는 키가 생기면 게이트가 막는다» — 그래야 조용히 늘지 않는다.
   ★값은 절대 싣지 않는다. GAS 쪽도 «있음/없음»만 본다(비밀이 로그로 새지 않게).
   갈래
     state  코드가 스스로 쓴다 — 사람이 넣는 설정이 아니다(판정 대상 아님)
     switch 기능 스위치 — 비어 있음 = 그 기능 꺼짐(정상)
     tuning 기본값이 있다 — 비어 있어도 돈다(참고만)
     needs  어떤 스위치가 켜지면 반드시 있어야 한다 → 없으면 누락
     option 없어도 무해 — 그 곁가지 기능만 조용해진다(참고만) */
const PROPS = {
  /* state */
  AIH_REMIND_AT: ['state'], AIH_REMIND_CNT: ['state'], AI_HANDOFF_NIGHT_PENDING: ['state'],
  AI_LAST_HANDOFF_ALERT: ['state'], AI_MONTH_BUDGET_KRW: ['state'], LOCK_BUSY_MAILED: ['state'],
  LOCK_BUSY_N: ['state'], NOTIFY_HOLD: ['state'], SOLAPI_BAL_CHK_AT: ['state'],
  WEDDING_BLOCKS: ['state'], DEPLOY_CODE_FINGERPRINT: ['state'],
  NOTIFY_FAIL_: ['state'], NOTIFY_FAILMAIL_: ['state'],   /* 날짜가 뒤에 붙는 접두사 */
  KAKAO_REST_KEY: ['state'], KAKAO_TEMPLATES: ['state'],  /* 설정 함수가 넣어 두는 값 */

  /* switch */
  NOTIFY_ENABLED: ['switch', '알림 발송 (true 면 켜짐)'],
  PAY_CARD_ENABLED: ['switch', '카드결제 (true 면 켜짐)'],
  ADMIN_NOTIFY_INFO: ['switch', '관리자 정보성 알림'],
  CUSTOMER_PURGE_OFF: ['switch', "미계약 개인정보 자동파기 정지 (Y 면 «꺼짐»)"],
  LEAD_CONFIRM_SMS: ['switch', '상담 접수 확인 문자 (N 면 «끔»)'],

  /* tuning */
  SOLAPI_LOW_BALANCE: ['tuning', '잔액 경고 임계 (기본 3000원)'],
  AIH_EXPIRE_DAYS: ['tuning', '인계 만료 일수 (기본 30일)'],
  CUSTOMER_PURGE_DAYS: ['tuning', '개인정보 파기 일수 (기본값 있음)'],
  SOLAPI_PRICE: ['tuning', '문자 단가표 (기본 {})'],
  DBG_RESET: ['tuning', '디버그용'],

  /* needs — 조건부 필수 */
  SOLAPI_API_KEY: ['needs', 'NOTIFY_ENABLED', '문자·알림톡 발송 (95_notify 계열)'],
  SOLAPI_API_SECRET: ['needs', 'NOTIFY_ENABLED', '문자·알림톡 발송 (95_notify 계열)'],
  SOLAPI_SENDER: ['needs', 'NOTIFY_ENABLED', '발신번호 — 없으면 한 건도 안 나간다'],
  SOLAPI_KEY: ['needs', 'NOTIFY_ENABLED', '★아이디·코드 찾기 문자 (50_auth-handlers 계열 · 이름이 다르다)'],
  SOLAPI_SECRET: ['needs', 'NOTIFY_ENABLED', '★아이디·코드 찾기 문자 (50_auth-handlers 계열 · 이름이 다르다)'],
  TOSS_SECRET_KEY: ['needs', 'PAY_CARD_ENABLED', '카드결제 승인'],
  TOSS_CLIENT_KEY: ['needs', 'PAY_CARD_ENABLED', '카드결제 화면'],

  /* option */
  ADMIN_ALERT_EMAIL: ['option', '관리자 경고 메일 수신처'],
  ADMIN_PHONE: ['option', '관리자 테스트 문자 수신처 (관리자 알림은 메일 전용)'],
  AI_HANDOFF_SECRET: ['option', 'AI 인계 API 인증'],
  AI_SAFETY_SECRET: ['option', 'AI 안전점검 API 인증'],
  AI_WIDGET_SECRET: ['option', 'AI 위젯 API 인증'],
  SOLAPI_PFID: ['option', '알림톡 채널 (50_auth-handlers 계열)'],
  SOLAPI_PF_ID: ['option', '알림톡 채널 (95_notify 계열)'],
  SOLAPI_TPL_FINDCODE: ['option', '코드찾기 알림톡 템플릿'],
};

/* ★표가 저장소를 따라가는지 — getProperty 로 읽는 키가 표에 다 있는가.
   새 키를 넣고 표에 안 적으면 여기서 막힌다(조용히 늘지 않게). */
{
  const used = new Set();
  for (const rel of Object.values(SRC)) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const m of src.matchAll(/getProperty\(\s*['"]([A-Z][A-Z0-9_]*)['"]/g)) used.add(m[1]);
  }
  const missing = [...used].filter((k) => !PROPS[k]);
  if (missing.length) {
    console.error('★스크립트 속성 표에 없는 키: ' + missing.join(', '));
    console.error('  scripts/gen-deploy-fns.mjs 의 PROPS 에 갈래를 적어 주세요 (state/switch/tuning/needs/option).');
    process.exit(2);
  }
}
const props = Object.keys(PROPS).sort().map((k) => ({ key: k, kind: PROPS[k][0], a: PROPS[k][1] || '', b: PROPS[k][2] || '' }));

/* ── 별도 GAS 프로젝트 — 이 저장소에 있지만 «다른 프로젝트»라 deployCheck 가 못 닿는다.
   한 프로젝트 안에서만 typeof 가 통하므로, 각자에게 자기 몫 목록을 주고 스스로 세게 한다
   (99_projectCheck.gs 를 세 곳에 붙여넣으면, 자기가 어느 프로젝트인지 알아보고 자기 것만 본다). */
const PROJECTS = [
  ['form-to-couple', 'automation/form-to-couple.gs', '부부폼(예식 영상·D-3 점검)'],
  ['guest-letter-webhook', 'automation/guest-letter-webhook.gs', '하객 편지 웹훅'],
  ['가족청첩장빌드', 'automation/가족청첩장빌드.gs', '가족 청첩장 빌드'],
];
const projects = PROJECTS.map(([name, rel, why]) => {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const list = [...src.matchAll(/^function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/gm)].map((m) => m[1]);
  const vlist = [...src.matchAll(/^var\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm)].map((m) => m[1]);
  if (!list.length) { console.error('★' + name + ' 에 최상위 함수가 없습니다 — 파싱이 깨졌습니다'); process.exit(2); }
  /* ★기준 함수는 «이 프로젝트에만 있는» 이름이어야 한다 — 첫 함수를 그냥 쓰면 안 된다.
     guest-letter-webhook 의 첫 함수는 doGet 이고, 그건 본 프로젝트에도 있어 서로를 오인한다(실측). */
  const mine = new Set(Object.values(fns).reduce((a, b) => a.concat(b), []));
  const uniq = list.find((f) => !mine.has(f) && !PROJECTS.some(([n2, r2]) =>
    n2 !== name && new RegExp('^function\\s+' + f + '\\s*\\(', 'm').test(fs.readFileSync(path.join(ROOT, r2), 'utf8'))));
  if (!uniq) { console.error('★' + name + ' 에 «그 프로젝트에만 있는» 함수가 없습니다'); process.exit(2); }
  return { name, why, sentinel: uniq, fns: list, vars: vlist };
});
/* 세 프로젝트가 서로를 «자기»로 오인하면 안 된다 — 기준 함수가 겹치지 않아야 한다. */
{
  const sent = projects.map((p) => p.sentinel);
  if (new Set(sent).size !== sent.length) { console.error('★프로젝트 기준 함수가 겹칩니다: ' + sent.join(', ')); process.exit(2); }
  const mainFns = new Set(Object.values(fns).reduce((a, b) => a.concat(b), []));
  const clash = sent.filter((x) => mainFns.has(x));
  if (clash.length) { console.error('★기준 함수가 본 프로젝트에도 있습니다(오인식): ' + clash.join(', ')); process.exit(2); }
}

/* 같은 이름이 두 파일에 있으면 GAS 는 전역 하나뿐이라 한쪽이 조용히 덮인다 — 생성 단계에서 막는다. */
const seen = new Map(); const dup = [];
for (const [file, list] of Object.entries(fns))
  for (const fn of list) { if (seen.has(fn)) dup.push(`${fn} (${seen.get(fn)} · ${file})`); else seen.set(fn, file); }
if (dup.length) { console.error('★이름이 겹치는 함수 — GAS 전역이 하나라 한쪽이 덮입니다:\n  ' + dup.join('\n  ')); process.exit(2); }

const total = Object.values(fns).reduce((a, b) => a + b.length, 0);
const varN = Object.values(vars).reduce((a, b) => a + b.length, 0);
const colN = columns.reduce((a, c) => a + c.need.length, 0);
const PACK = { fns, vars, triggers, columns, html, props, projects };
const P = path.join(ROOT, 'deploy-marks.json');
const cur = JSON.parse(fs.readFileSync(P, 'utf8'));
const same = ['fns', 'vars', 'triggers', 'columns', 'html', 'props', 'projects']
  .every((k) => JSON.stringify(cur[k] ?? null) === JSON.stringify(PACK[k]));

if (process.argv.includes('--check')) {
  if (same) { console.log(`✅ 목록 최신 — 함수 ${total} · var ${varN} · 트리거 ${triggers.length} · 컬럼 ${colN} · HTML ${html.length}벌 · 속성 ${props.length} · 별도프로젝트 ${projects.length}`); process.exit(0); }
  console.error('★deploy-marks.json 의 점검 목록이 낡았습니다 → node scripts/gen-deploy-fns.mjs 로 갱신하세요');
  for (const k of ['vars', 'triggers', 'columns', 'html', 'props', 'projects'])
    if (JSON.stringify(cur[k] ?? null) !== JSON.stringify(PACK[k])) console.error(`  ${k} 가 다릅니다`);
  const before = cur.fns || {};
  for (const f of new Set([...Object.keys(before), ...Object.keys(fns)])) {
    const a = new Set(before[f] || []), b = new Set(fns[f] || []);
    const add = [...b].filter(x => !a.has(x)), del = [...a].filter(x => !b.has(x));
    if (add.length || del.length) console.error(`  ${f}: +${add.join(',') || '-'} / -${del.join(',') || '-'}`);
  }
  process.exit(1);
}

/* ★[MARKS_AGE] 목록이 «언제 것인지» 남긴다 — deployCheck 가 그대로 찍어 준다.
   사이트가 배포에 실패했거나 옛 판이 걸려 있으면, 사람이 날짜만 보고 안다.
   ★내용이 그대로면 날짜도 그대로 둔다 — 돌릴 때마다 바뀌면 커밋이 지저분해지고 아무도 안 본다. */
if (!same || !cur._생성) {
  let sha = '';
  try { sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim(); } catch (e) {}
  cur._생성 = new Date().toISOString().slice(0, 16).replace('T', ' ') + (sha ? (' · ' + sha) : '');
}
Object.assign(cur, PACK);
fs.writeFileSync(P, JSON.stringify(cur, null, 1) + '\n');
console.log(`✅ 갱신 — 함수 ${total} · var ${varN} · 트리거 ${triggers.length} · 컬럼 ${colN} · HTML ${html.length}벌 · 속성 ${props.length} · 별도프로젝트 ${projects.length} · ${(fs.statSync(P).size / 1024).toFixed(1)}KB`);
