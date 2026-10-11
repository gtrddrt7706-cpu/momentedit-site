/* ★[CONTRACT_VER_ONE 2026-10-11] 계약서 버전은 «보이는 자리 다섯 + 서명 기록 + 보존본 분기»가 한 값이어야 한다.
 *
 * 왜 — v1.13 으로 올리며 머리 · 설명 · 주석만 고치고, 고객이 읽는 세 자리(16조③ «예: » · 서명 문구 «버전 » · 바닥글)를
 *   v1.12 로 남겼다. 종전 검사(merge-guard `chk 'v1\.NN' contract/v1-1.html 6`)는 «그 글자가 든 줄 수»만 세서,
 *   새로 단 주석에 옛 버전이 들어 있으면 그대로 통과했다(실제로 통과했다). 주석은 고객이 못 본다.
 *
 * 무엇을 보나
 *   ① contract/v1-1.html — 주석 · 스크립트를 뺀 «보이는 글»의 버전이 하나뿐이고 다섯 자리 이상
 *   ② 70_journey.gs CONTRACT.docVersion = ①   (서명 스냅샷이 찍는 값 · 다르면 서명자가 엉뚱한 판을 본다)
 *   ③ 보존본 contract/archive/v1-N.html — 보이는 버전이 이름과 같다(v1-12 → v1.12)
 *   ④ v1.1 ~ 바로 앞 판까지 보존본이 다 있다 · mypage · admin 이 각각 그 판을 보존본으로 연다
 *   ⑤ 현행 판은 보존본으로 보내지 않는다 · 기본 줄 주석 «현행(v1.NN)»이 ①과 같다
 *
 * 사용: node scripts/audit/contract-version.mjs [--selftest]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const visible = (t) => t.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[\s\S]*?<\/script>/g, '');
const vers = (t) => visible(t).match(/v1\.\d+/g) || [];
const minor = (v) => +String(v).split('.')[1];

function load() {
  const files = { cur: rd('contract/v1-1.html'), gas: rd('automation/platform/70_journey.gs'), mypage: rd('mypage.html'), admin: rd('admin.html'), archive: {} };
  for (const f of fs.readdirSync(path.join(ROOT, 'contract/archive'))) {
    const m = /^v1-(\d+)\.html$/.exec(f);
    if (m) files.archive[+m[1]] = rd('contract/archive/' + f);
  }
  return files;
}

function check(F) {
  const bad = [];
  const cv = vers(F.cur), set = [...new Set(cv)];
  if (set.length !== 1) bad.push(`① 계약서 보이는 글에 버전이 여럿이다: ${set.join(' · ') || '(없음)'} — 머리 · 16조③ 예시 · 서명 문구 · 바닥글을 한 값으로`);
  if (cv.length < 5) bad.push(`① 계약서 보이는 버전 자리가 ${cv.length}곳 — 다섯(설명 · 머리 · 16조③ · 서명 문구 · 바닥글)이 있어야 한다`);
  const V = set.length === 1 ? set[0] : null;
  const dv = (/docVersion:\s*'(v1\.\d+)'/.exec(F.gas) || [])[1];
  if (!dv) bad.push('② 70_journey.gs 에서 docVersion 을 찾지 못했다');
  else if (V && dv !== V) bad.push(`② 서명 기록 docVersion ${dv} ≠ 계약서 ${V} — 서명자가 다른 판으로 찍힌다(GAS 재배포도 함께)`);
  for (const [n, t] of Object.entries(F.archive)) {
    const s = [...new Set(vers(t))];
    if (s.length !== 1 || s[0] !== 'v1.' + n) bad.push(`③ 보존본 v1-${n}.html 보이는 버전이 ${s.join(' · ') || '(없음)'} — v1.${n} 이어야 한다`);
  }
  if (V) {
    const top = minor(V);
    for (let k = 1; k < top; k++) {
      if (!F.archive[k]) { bad.push(`④ v1.${k} 보존본(contract/archive/v1-${k}.html)이 없다 — 그 판 서명자가 새 판을 보게 된다`); continue; }
      for (const who of ['mypage', 'admin']) {
        const re = new RegExp(`if\\(v==='v1\\.${k}'\\)\\s*return\\s*'/contract/archive/v1-${k}\\.html'`);
        if (!re.test(F[who])) bad.push(`④ ${who}.html 이 v1.${k} 서명자를 보존본으로 보내지 않는다`);
      }
    }
    if (F.archive[top]) bad.push(`⑤ 현행 ${V} 의 보존본이 이미 있다 — 판을 올리고 계약서를 안 고쳤나`);
    for (const who of ['mypage', 'admin']) {
      if (new RegExp(`if\\(v==='v1\\.${top}'\\)`).test(F[who])) bad.push(`⑤ ${who}.html 이 현행 ${V} 서명자를 보존본으로 보낸다`);
      const line = (F[who].split('\n').find((l) => /return '\/contract\/v1-1\.html';/.test(l)) || '');
      const cm = (/현행\((v1\.\d+)\)/.exec(line) || [])[1];
      if (cm !== V) bad.push(`⑤ ${who}.html 기본 줄 주석 «현행(${cm || '?'})» ≠ ${V}`);
    }
  }
  return { V, bad };
}

function selftest() {
  const real = load();
  const clone = () => ({ ...real, archive: { ...real.archive } });
  const r0 = check(real);
  const V = r0.V, prev = 'v1.' + (minor(V) - 1), pk = minor(V) - 1;
  const cases = [
    ['바닥글만 옛 판', (F) => { F.cur = F.cur.replace(/(class="f-ver">[^<]*?)v1\.\d+/, `$1${prev}`); }],
    ['서명 문구만 옛 판(주석엔 새 판이 여럿)', (F) => { F.cur = F.cur.replace(/버전 v1\.\d+\)/, `버전 ${prev})`) + `\n<!-- ${V} ${V} ${V} -->`; }],
    ['docVersion 옛 판', (F) => { F.gas = F.gas.replace(/docVersion:\s*'v1\.\d+'/, `docVersion: '${prev}'`); }],
    ['바로 앞 판 보존본 없음', (F) => { delete F.archive[pk]; }],
    ['mypage 분기 빠짐', (F) => { F.mypage = F.mypage.replace(`if(v==='${prev}')`, `if(v==='x${prev}')`); }],
    ['admin 기본 줄 주석 낡음', (F) => { F.admin = F.admin.replace(`현행(${V})`, `현행(${prev})`); }],
    ['보존본 안 버전 어긋남', (F) => { F.archive[pk] = F.archive[pk].replace(/class="hero-meta">Version v1\.\d+/, 'class="hero-meta">Version v1.99'); }],
  ];
  let ok = r0.bad.length === 0;
  console.log(`${ok ? 'ok' : 'FAIL'} 진짜 저장소 → 초록 (현행 ${V})`);
  for (const [name, mut] of cases) {
    const F = clone(); mut(F);
    const red = check(F).bad.length > 0;
    console.log(`${red ? 'ok' : 'FAIL'} 깨 보기: ${name} → ${red ? '빨강' : '초록(못 잡음)'}`);
    ok = ok && red;
  }
  return ok;
}

if (process.argv.includes('--selftest')) {
  const ok = selftest();
  console.log(ok ? 'CONTRACT_VER_ONE selftest OK' : 'FAIL CONTRACT_VER_ONE selftest');
  process.exit(ok ? 0 : 1);
}
const { V, bad } = check(load());
if (bad.length) { for (const b of bad) console.log('FAIL [CONTRACT_VER_ONE] ' + b); process.exit(1); }
console.log(`ok [CONTRACT_VER_ONE] 계약서 ${V} · 보이는 자리 · 서명 기록 · 보존본 ${minor(V) - 1}판 · 마이페이지 · 관리자 분기가 한 값`);
