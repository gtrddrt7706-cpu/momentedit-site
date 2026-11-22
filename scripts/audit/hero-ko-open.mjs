#!/usr/bin/env node
/* ★[HERO_KO_OPEN 2026-11-22 대표님 결정 HERO_KO_GO_1122] 첫 화면 한글 한 줄이 날짜에 따라 바뀌는지 «실제 스크립트»를 돌려 잰다.
   오픈 전  «작은 결혼식 · 2027년 4월 고양에서» / 오픈(2027-04-29 · 한국 시간)부터  «작은 결혼식 · 고양에서»(날짜만 빠짐).
   index.html 의 그 <script> 한 덩어리를 뽑아 가짜 document · 가짜 시계로 돌린다(기기 시간대와 무관해야 한다 · 경계 양쪽 1초).
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const BEFORE = '작은 결혼식 · 2027년 4월 고양에서', AFTER = '작은 결혼식 · 고양에서';
let fail = 0;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d)}`); if (!c) fail = 1; };

const p = /<p class="hero-logo-ko" id="heroKo">([^<]*)<\/p>/.exec(html);
const s = /<script>(\/\* \[HERO_KO_OPEN\][\s\S]*?)<\/script>/.exec(html);
const a = /<div class="hero-logo" id="heroLogo" role="img" aria-label="([^"]*)">/.exec(html);
if (!p || !s || !a) { console.log('hero-ko-open — 줄 · 스크립트 · 로고 이름을 못 찾았다(재지 못함)'); process.exit(2); }
ok('HTML 기본 글 = 오픈 전 문구', p[1] === BEFORE, p[1]);
ok('로고 그림 이름(aria-label)에 같은 문구', a[1].endsWith(' · ' + BEFORE), a[1]);

function run(iso, tzOffsetMin) {
  const el = { textContent: p[1] }, logo = { label: a[1], setAttribute(k, v) { if (k === 'aria-label') this.label = v; } };
  const fixed = Date.parse(iso);
  class FakeDate extends Date {
    constructor(...x) { super(...(x.length ? x : [fixed])); }
    static now() { return fixed; }
    getTimezoneOffset() { return tzOffsetMin; }   // 기기 시간대를 바꿔도 결과가 같아야 한다
  }
  const ctx = { Date: FakeDate, document: { getElementById: (id) => (id === 'heroKo' ? el : id === 'heroLogo' ? logo : null) } };
  vm.runInNewContext(s[1], ctx);
  return { text: el.textContent, label: logo.label };
}

const cases = [
  ['오늘(2026-11-22)', '2026-11-22T11:00:00Z', BEFORE],
  ['오픈 전날 한국 23:59:59', '2027-04-28T14:59:59Z', BEFORE],
  ['오픈 날 한국 00:00:00', '2027-04-28T15:00:00Z', AFTER],
  ['오픈 뒤(2027-06-01)', '2027-06-01T03:00:00Z', AFTER],
];
for (const [name, iso, want] of cases) {
  for (const tz of [-540, 0, 480]) {   // 한국 · UTC · 미국 서부 기기
    const r = run(iso, tz);
    ok(`${name} · 기기 시간대 ${-tz / 60}h → «${want}»`, r.text === want && r.label.endsWith(' · ' + want), r);
  }
}
console.log(fail ? '━━ hero-ko-open — ❌ 틀린 곳이 있습니다' : '━━ hero-ko-open — ✅ 날짜 전 · 후 모두 통과');
process.exit(fail);
