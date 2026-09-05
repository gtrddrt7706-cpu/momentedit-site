// 99_deployCheck.gs 가 「안 붙인 파일」·「옛 버전」을 정말로 잡는지, GAS 없이 실제로 돌려 확인한다
//
//   node scripts/audit/deploycheck-sim.mjs
//
// [DEPLOY_CHECK_SIM]
// 왜 (2026-08-30 사용자 지시 "너가 임의로 메인 파일 살짝 변경하고 필터되는지 체크")
//   점검 파일 자체가 «점검받지 않은 코드»였다. 사용자 GAS 에서 「누락 0건」이 나온 것은
//   지금이 실제로 온전하다는 뜻이지, «망가뜨렸을 때 붉어진다»는 뜻이 아니다.
//   초록만 확인한 검사는 아무것도 지키지 못한다 — 그래서 일부러 망가뜨려 본다.
//
// 어떻게
//   GAS 편집기 대신 node vm 에 .gs 를 순서대로 올린다(gas-lint 의 샌드박스를 그대로 쓴다).
//   「그 파일을 안 붙였다」 = 그 파일만 빼고 올린다.
//   「옛 버전을 붙였다」   = git 의 옛 커밋에서 그 파일을 꺼내 대신 올린다.
//   그러고 deployCheck() 를 진짜로 호출해 MISS 줄을 읽는다.
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeSandbox } from './gas-lint.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const AUT = path.join(ROOT, 'automation');

const EXCLUDE = [/(^|\/)archive\//, /form-to-couple\.gs$/, /guest-letter.*\.gs$/, /가족청첩장빌드\.gs$/];
const ORDER = ['platform/00', 'platform/10', 'platform/20', 'platform/30', 'platform/40', 'platform/50',
  'platform/60', 'platform/70', 'platform/80', 'platform/85', 'platform/86', 'platform/90', 'platform/95',
  'consultation/', 'admin/'];

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(fp)); else if (e.name.endsWith('.gs')) out.push(fp);
  }
  return out;
}
const rel = (fp) => path.relative(AUT, fp).replace(/\\/g, '/');
const FILES = walk(AUT).filter((fp) => !EXCLUDE.some((re) => re.test(rel(fp)))).sort((a, b) => {
  const ra = rel(a), rb = rel(b);
  const ia = ORDER.findIndex((p) => ra.startsWith(p)), ib = ORDER.findIndex((p) => rb.startsWith(p));
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || ra.localeCompare(rb);
});
// GAS 편집기의 파일 이름(확장자·폴더 없는 이름) ↔ 저장소 경로
const nameOf = (r) => path.basename(r, '.gs');

/* 한 「붙여넣기 상태」를 만들어 deployCheck() 를 돌린다.
   skip: 안 붙인 파일 이름들 · old: {파일이름: 커밋} 으로 옛 버전을 대신 올린다 */
/* ★[SIM_MARKS_REMOTE 2026-08-30] 점검이 목록을 사이트(deploy-marks.json)에서 읽어 오게 바뀌었다.
   샌드박스의 UrlFetch 는 가짜라 그냥 두면 «못 읽음» 경로로만 돌고, 그러면 ② 를 통째로 건너뛰어
   무엇을 망가뜨려도 초록이 난다. 그래서 저장소의 그 파일을 그대로 응답으로 준다.
   ★즉 여기서 검사하는 것은 «저장소 JSON 대로 점검이 무는가»다. 사이트에 실제로 올라갔는지는
     Vercel 이 main 을 자동 배포하므로 병합 자체가 보장한다. */
function marksJson() {
  return fs.readFileSync(path.join(ROOT, 'deploy-marks.json'), 'utf8');
}

function run({ skip = [], old = {}, noMarks = false, stamp = undefined } = {}) {
  const sb = makeSandbox();
  const lines = [];
  sb.Logger = { log: (m) => lines.push(String(m)) };
  /* [SIM_DEPLOY_STAMP] ④ 는 «배포된 코드가 남긴 지문»과 «저장된 코드의 지문»을 대조한다.
     stamp: undefined = 기록 없음(아직 모름) · 'MATCH' = 저장본과 같게 · 그 밖 문자열 = 다르게 */
  const store = new Map();
  if (stamp !== undefined && stamp !== 'MATCH') store.set('DEPLOY_CODE_FINGERPRINT', stamp + '|2026-08-30T00:00:00Z');
  sb.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (k) => store.get(k) ?? null,
      setProperty: (k, v) => store.set(k, v),
      deleteProperty: (k) => store.delete(k),
      getProperties: () => Object.fromEntries(store),
    }),
  };
  sb.__seedMatch = () => { try { store.set('DEPLOY_CODE_FINGERPRINT', sb.deployFingerprint() + '|2026-08-30T00:00:00Z'); } catch (e) {} };
  sb.UrlFetchApp = {
    fetch: (url) => (!noMarks && String(url).includes('deploy-marks.json'))
      ? { getResponseCode: () => 200, getContentText: () => marksJson() }
      : { getResponseCode: () => 500, getContentText: () => '' },
  };
  vm.createContext(sb);
  for (const fp of FILES) {
    const nm = nameOf(rel(fp));
    if (skip.includes(nm)) continue;
    let src;
    if (old[nm]) {
      const gitPath = path.relative(ROOT, fp).replace(/\\/g, '/');
      try { src = execFileSync('git', ['show', `${old[nm]}:${gitPath}`], { cwd: ROOT, maxBuffer: 64e6 }).toString(); }
      catch { throw new Error(`${old[nm]} 에서 ${gitPath} 를 못 꺼냈습니다`); }
    } else src = fs.readFileSync(fp, 'utf8');
    try { vm.runInContext(src, sb, { filename: rel(fp) }); }
    catch (e) { /* 옛 버전이 지금 세계와 안 맞아 로드가 깨질 수 있다 — 그 파일만 빠진 셈이 된다 */
      lines.push(`  (로드실패 ${nm}: ${e.message})`); }
  }
  if (stamp === 'MATCH') sb.__seedMatch();
  if (typeof sb.deployCheck !== 'function') throw new Error('deployCheck 가 없습니다 — 99_deployCheck.gs 를 못 읽었습니다');
  sb.deployCheck();
  const out = lines.join('\n');
  /* ★[SIM_BLIND] 여기서는 «잴 수 없는» 항목이 둘 있다 — 실제 GAS 에서는 통과한다.
       ④ 배포본 판정 = 살아 있는 /exec 에 요청을 보내 본다(샌드박스의 UrlFetch 는 가짜 응답을 준다)
       ⑤ 시트 확인   = 진짜 스프레드시트의 컬럼을 읽는다(샌드박스에 시트가 없다)
     이 둘을 세면 무엇을 해도 늘 «2건 붉음»이라 「망가뜨렸을 때 더 붉어지는가」를 잴 수 없다.
     ★빼는 것이지 «괜찮다»는 뜻이 아니다 — 그 둘은 사용자가 GAS 에서 실행할 때만 의미가 있다. */
  const BLIND = ['배포본 판정', '시트 확인'];
  const all = (out.match(/^ *MISS .*$/gm) || []).map((s) => s.trim());
  const miss = all.filter((l) => !BLIND.some((b) => l.includes(b)));
  return { out, miss, blind: all.length - miss.length, bad: miss.length };
}

/* 점검 파일 자신과, 점검 파일이 «못 잰다»고 스스로 밝힌 파일은 훑기에서 뺀다.
   - 99_deployCheck : 이게 검사기다. 이걸 안 붙이면 돌릴 것 자체가 없다(잡고 말고가 없다).
   - 86_dining_ai   : 주석만 있는 빈 슬롯이라 실행으로 확인할 함수가 없다 —
                      점검 파일이 결과에 「-- 확인 불가」로 «밝히고» 있다. 숨긴 구멍이 아니다. */
const NOT_SWEPT = ['99_deployCheck', '86_dining_ai'];

let fail = 0;
const ng = (m) => { console.log(`  ✗ ${m}`); fail++; };
const show = (r, n = 3) => r.miss.slice(0, n).forEach((x) => console.log('     ' + x));

console.log(`.gs ${FILES.length}개 · GAS 편집기 파일명 ${FILES.map((f) => nameOf(rel(f))).join(', ')}\n`);

/* ── 0 ── 지금 저장소 그대로: 초록이어야 한다(빨간불이면 이 시뮬레이터부터 틀린 것) */
{
  console.log('── 0) 지금 저장소 그대로 (기준선)');
  const r = run();
  console.log(`   누락 ${r.bad}건  (샌드박스가 못 재는 항목 ${r.blind}개는 제외 — SIM_BLIND 주석 참고)`);
  if (r.bad !== 0) { ng('기준선이 이미 붉습니다 — 아래 결과를 믿을 수 없습니다'); show(r, 6); }
}

/* ── 1 ── 파일을 통째로 안 붙였다 — 전 파일을 하나씩 빼 본다(하나라도 조용히 지나가면 구멍) */
{
  const sweep = FILES.map((fp) => nameOf(rel(fp))).filter((n) => !NOT_SWEPT.includes(n));
  console.log(`\n── 1) 파일을 통째로 안 붙였을 때 — ${sweep.length}개를 하나씩 (${NOT_SWEPT.join('·')} 제외)`);
  for (const nm of sweep) {
    const r = run({ skip: [nm] });
    const caught = r.miss.some((l) => l.includes('파일 ' + nm));
    console.log(`   ${nm.padEnd(22)} 누락 ${String(r.bad).padStart(2)}건  ${caught ? '잡힘' : (r.bad > 0 ? '△ 다른 줄로만 잡힘' : '✗ 못 잡음')}`);
    if (r.bad === 0) ng(`${nm} 를 안 붙였는데 「누락 0건」이 나왔습니다 — 이 파일은 점검 밖입니다`);
    else if (!caught) ng(`${nm} 를 안 붙였는데 「파일 ${nm}」 줄이 아니라 다른 줄만 붉었습니다 — 원인을 못 짚어 줍니다`);
  }
}

/* ── 2 ── 붙였는데 옛 내용이다 — 확정 기능이 들어오기 «전» 커밋의 파일로 바꿔 올린다 */
{
  console.log('\n── 2) 붙였는데 옛 버전일 때');
  // 확정(CF_*) 이 들어온 커밋을 찾아 그 «부모» 를 쓴다 — 그때의 80_production 은 확정을 모른다
  let base = '';
  try {
    const sha = execFileSync('git', ['log', '--format=%H', '-1', '-S', 'CF_CORE_TRUTH', '--', 'automation/platform/80_production.gs'],
      { cwd: ROOT }).toString().trim();
    if (sha) base = execFileSync('git', ['rev-parse', sha + '^'], { cwd: ROOT }).toString().trim();
  } catch { /* 얕은 클론이면 부모가 없을 수 있다 */ }
  if (!base) console.log('   · 옛 커밋을 못 찾아 건너뜁니다(얕은 클론) — git fetch --unshallow 뒤 다시 도세요');
  else {
    const r = run({ old: { '80_production': base } });
    console.log(`   80_production 을 ${base.slice(0, 8)} 판으로 → 누락 ${r.bad}건`);
    show(r, 5);
    if (r.bad === 0) ng('옛 80_production 을 붙였는데 「누락 0건」이 나왔습니다 — ②가 통째로 안 잡힙니다');
    else if (!r.miss.some((l) => /CF_|확정/.test(l))) ng('옛 버전을 잡긴 했는데 확정 관련 줄이 아닙니다');
  }
}

/* ── 3 ── 함수는 있는데 «안»이 옛것이다 — 표식 한 줄만 지운다(가장 잡기 어려운 모양) */
{
  console.log('\n── 3) 함수는 있는데 그 안이 옛 내용일 때 (표식 한 줄만 지움)');
  const target = path.join(AUT, 'platform/80_production.gs');
  const keep = fs.readFileSync(target, 'utf8');
  /* ★바꿔 넣을 이름이 원래 표식을 «품으면» 안 된다. 점검은 문자열 포함으로 보므로
     CF_CORE_TRUTH → CF_CORE_TRUTH_예전이름 은 여전히 통과한다(처음에 그렇게 짰다가 헛수고했다).
     겸사 알아 둘 것: 표식 이름 앞에 무언가를 «덧붙이는» 개명은 이 점검이 못 잡는다.
     표식은 이름을 바꾸지 말고 그대로 두거나, 바꿀 땐 점검 목록도 같은 커밋에서 고칠 것. */
  try {
    fs.writeFileSync(target, keep.replace(/CF_CORE_TRUTH/g, 'ZZ_옛표식'), 'utf8');
    const r = run();
    console.log(`   CF_CORE_TRUTH 표식을 딴 이름으로 → 누락 ${r.bad}건`);
    show(r, 3);
    if (r.bad === 0) ng('표식이 사라졌는데 「누락 0건」입니다 — 함수 «안»의 옛 내용은 못 잡습니다');
  } finally { fs.writeFileSync(target, keep, 'utf8'); }

  /* ── 3-나 ── 그 «덧붙이는 개명» 이 정말 안 잡히는지도 적어 둔다(성질을 아는 것과 모르는 것은 다르다) */
  try {
    fs.writeFileSync(target, keep.replace(/CF_CORE_TRUTH/g, 'CF_CORE_TRUTH_구판'), 'utf8');
    const r = run();
    console.log(`   (참고) 표식 뒤에 글자를 «덧붙인» 개명 → 누락 ${r.bad}건 ${r.bad === 0 ? '· 못 잡음(문자열 포함 방식의 한계 · 위 주석)' : '· 잡힘'}`);
  } finally { fs.writeFileSync(target, keep, 'utf8'); }
}

/* ── 4 ── 사이트를 못 읽을 때: «조용히 줄어든 점검»이 통과로 읽히면 안 된다 */
{
  console.log('\n── 4) 목록(사이트)을 못 읽을 때 — 건너뛴 것을 통과로 세지 않는가');
  const r = run({ noMarks: true });
  const said = /못 읽어|★★목록/.test(r.out);
  const skipped = /건너뜁니다/.test(r.out);
  const stillFile = /OK   파일 admin/.test(r.out);
  console.log(`   크게 알리는가=${said} · ②를 건너뛴다고 말하는가=${skipped} · ①파일 확인은 계속하는가=${stillFile}`);
  if (!said) ng('사이트를 못 읽었는데 조용히 넘어갔습니다 — 줄어든 점검이 통과로 읽힙니다');
  if (!skipped) ng('②를 못 했는데 그렇다고 말하지 않았습니다');
  if (!stillFile) ng('사이트를 못 읽었다고 ①파일 확인까지 죽었습니다 — 폴백이 없습니다');
  // 이 상태에서 파일을 빼면 그래도 잡혀야 한다(최소 보장)
  const r2 = run({ noMarks: true, skip: ['admin'] });
  const caught = r2.miss.some((l) => l.includes('파일 admin'));
  console.log(`   사이트 없이도 「파일 통째 누락」은 잡히는가=${caught}`);
  if (!caught) ng('사이트가 없으면 파일 누락조차 못 잡습니다');
}

/* ── 5 ── [DEPLOY_STAMP] ④ 가 «재배포 했는가»를 실제로 말하는가
   사용자 질문: "재배포가 최신인지 그것도 같이 체크는 불가해?"
   종전엔 자기 /exec 를 찔러 늘 「확인 불가」였다(구글이 막는다 · HTTP 401).
   이제는 배포된 코드가 남긴 지문과 저장된 코드의 지문을 대조한다. 세 상태가 각각 «다르게» 나와야 한다. */
{
  console.log('\n── 5) ④ 재배포 확인 — 세 상태가 구분되는가');
  const noRec = run();                                   // 기록 없음
  const same  = run({ stamp: 'MATCH' });                 // 배포본 = 저장본
  const diff  = run({ stamp: 'ZZ옛지문' });               // 배포본 ≠ 저장본

  const sNo = /아직 모름/.test(noRec.out);
  const sOk = /OK   배포본이 지금 저장된 코드와 같다/.test(same.out);
  const sNg = same.bad === diff.bad - 1 && /MISS 배포본이 지금 저장된 코드와 «다르다»/.test(diff.out);
  /* ★[STAMP_MISS_WORDING 2026-09-05] 실패 줄이 «같다»고 말하면 안 된다.
     종전 이 검사는 「MISS … 같다」를 **정답으로 고정**하고 있었다 — 게이트가 모순을 지켜 준 자리다.
     이제 문구까지 본다: MISS 줄에 «같다»가 남아 있으면 붉어진다. */
  const sWord = !/MISS 배포본이 지금 저장된 코드와 같다/.test(diff.out);
  console.log(`   기록 없음 → «아직 모름»=${sNo}`);
  console.log(`   배포본=저장본 → OK=${sOk}`);
  console.log(`   배포본≠저장본 → MISS=${/MISS 배포본이/.test(diff.out)} (누락 ${same.bad}건 → ${diff.bad}건)`);
  console.log(`   그 MISS 줄이 «다르다»고 말하는가 = ${sWord && sNg}`);

  if (!sNo) ng('배포 기록이 없는데 «아직 모름»이라고 말하지 않습니다 — 실패로 세면 누락 0건이 영영 안 나옵니다');
  if (noRec.bad !== 0) ng('배포 기록이 없다고 실패로 셌습니다');
  if (!sOk) ng('배포본이 저장본과 같은데 OK 가 안 나옵니다');
  if (same.bad !== 0) ng('배포본이 최신인데 누락이 잡혔습니다');
  if (!sNg) ng('배포본이 옛것인데 MISS 로 안 잡힙니다 — 재배포 안 한 것을 못 알려 줍니다');
  if (!sWord) ng('실패 줄이 «배포본이 저장된 코드와 같다»고 말합니다 — 실패인데 성공 문장입니다(STAMP_MISS_WORDING)');

  /* 지문이 «코드가 바뀌면 저절로 달라지는가» — 손으로 버전을 올리지 않아도 되는 근거 */
  const fingerprint = () => {
    const sb = makeSandbox(); vm.createContext(sb);
    for (const fp of FILES) { try { vm.runInContext(fs.readFileSync(fp, 'utf8'), sb, { filename: rel(fp) }); } catch (e) {} }
    return sb.deployFingerprint();
  };
  const a = fingerprint();
  const target = path.join(AUT, 'platform/80_production.gs');
  const keep = fs.readFileSync(target, 'utf8');
  let b;
  try {
    fs.writeFileSync(target, keep.replace('function handleSaveProductionTrack', 'function handleSaveProductionTrack /* 바뀜 */'), 'utf8');
    b = fingerprint();
  } finally { fs.writeFileSync(target, keep, 'utf8'); }
  console.log(`   코드를 고치면 지문이 달라지는가 = ${a !== b}  (${a} → ${b})`);
  if (a === b) ng('코드를 고쳤는데 지문이 그대로입니다 — 재배포 안 함을 영영 못 잡습니다');
}

/* ── 6 ── [DEPLOY_STAMP] 지문 남기기가 고객 요청을 망가뜨리지 않는가
   /exec 는 고객의 길이다. 배포 확인은 편의 기능이다. 편의가 길을 막으면 안 된다. */
{
  console.log('\n── 6) 지문 남기기가 터져도 고객 요청은 살아 있는가');
  const sb = makeSandbox();
  const lines = [];
  sb.Logger = { log: (m) => lines.push(String(m)) };
  sb.PropertiesService = { getScriptProperties: () => { throw new Error('Property 서비스 장애'); } };
  vm.createContext(sb);
  for (const fp of FILES) {
    try { vm.runInContext(fs.readFileSync(fp, 'utf8'), sb, { filename: rel(fp) }); } catch (e) {}
  }
  let ok = false, err = '';
  try {
    const r = sb.doPost({ postData: { contents: JSON.stringify({ action: '없는액션' }) } });
    ok = !!r;                                   // 던지지 않고 무언가 돌려주면 길은 살아 있다
  } catch (e) { err = String(e && e.message); }
  console.log(`   Property 서비스가 죽은 채로 doPost → 응답 있음=${ok}${err ? ' · 예외: ' + err : ''}`);
  if (!ok) ng(`지문 남기기가 터지자 doPost 가 함께 죽었습니다 — 고객 요청이 막힙니다 (${err})`);
}

/* ── 7 ── [SECTION_GAP] 섹션 제목 앞엔 빈 줄이 있어야 한다
   두 번 같은 실수를 했다 — ②③ 사이(MARKS_REMOTE 리팩터), ④⑤ 사이(DEPLOY_STAMP 리팩터).
   둘 다 «블록을 통째로 다시 쓰며 끝의 L.push('') 를 옮겨 적지 않아서»다. 기능은 멀쩡하지만
   40줄짜리 목록이 다음 제목과 붙어 한 덩어리로 읽힌다 — 이 로그는 사람이 눈으로 훑는 것이다.
   세 번째를 막으려면 사람의 주의가 아니라 검사가 필요하다. */
{
  console.log('\n── 7) 섹션 제목 앞 빈 줄 (사람이 눈으로 훑는 로그다)');
  const out = run({ stamp: 'MATCH' }).out;
  const bad = [];
  for (const n of ['②', '③', '④', '⑤']) {
    const i = out.indexOf('══ ' + n);
    if (i < 0) { bad.push(n + '(섹션 자체가 없음)'); continue; }
    if (!out.slice(Math.max(0, i - 2), i).endsWith('\n\n')) bad.push(n);
  }
  console.log(`   빈 줄 없는 섹션: ${bad.length ? bad.join(', ') : '없음'}`);
  if (bad.length) ng(`섹션 ${bad.join('·')} 앞에 빈 줄이 없습니다 — 앞 목록과 붙어 한 덩어리로 읽힙니다`);
}

/* ── 8 ── [COVER_PAIR] 같은 표식이 여러 .gs 에 있는데 «한 파일 몫»만 목록에 있는가
   사용자 지시: "왜못잡앗는지 추적해서 확실하게 개선해"
   실사고: PAY_LOCK_REENTRANT 가 70_journey·admin·98_pay_card 셋에 있는데 목록엔 70_journey 한 줄뿐이라
           98_pay_card 를 안 붙여도 「누락 0건」이 나왔다.
   ★커버리지 게이트도 (파일,표식) 짝으로 고쳤지만 그건 «최근 7일 창» 안에서만 본다.
     이 검사는 창과 무관하게 저장소 전체를 훑는다 — 옛날에 벌어진 짝은 그 창에 안 잡히기 때문이다.
     (실제로 이 방식으로 6짝을 더 찾아 목록에 넣었다: ROLLBACK_SLOT·SNAP_BALANCE_D7×2·
      SIGN_SLOT_REQUIRED·STAGE_REVIEW_DOOR·OLD_SIGNER_TERMS) */
{
  console.log('\n── 8) 같은 표식이 여러 파일에 있는데 한 파일 몫만 목록에 있는가');
  const marks = JSON.parse(fs.readFileSync(path.join(ROOT, 'deploy-marks.json'), 'utf8')).marks || [];
  const listed = new Set(marks.map((m) => m.file + '|' + m.mark));
  const names = [...new Set(marks.map((m) => m.mark))];
  const gap = [];
  for (const mk of names) {
    for (const fp of FILES) {
      const nm = nameOf(rel(fp));
      if (nm === '99_deployCheck') continue;
      if (!fs.readFileSync(fp, 'utf8').includes('[' + mk)) continue;
      if (!listed.has(nm + '|' + mk)) gap.push(`${mk}@${nm}`);
    }
  }
  console.log(`   목록 표식 ${names.length}개 · 파일 몫이 빠진 짝 ${gap.length}개${gap.length ? ': ' + gap.slice(0, 6).join(', ') : ''}`);
  if (gap.length) ng(`(파일,표식) 짝 ${gap.length}개가 목록에 없습니다 — 그 파일은 옛 판을 붙여도 안 잡힙니다`);
}

console.log(fail ? `\n✗ ${fail}건 — 점검 파일에 구멍이 있습니다` : '\n✓ 전부 통과 — 안 붙인 파일·옛 버전·옛 내용 셋 다 붉어집니다');
process.exit(fail ? 1 : 0);
