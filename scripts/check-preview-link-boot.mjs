/* [CANT_LOOK] 0=통과 1=재서 틀림 2=못 잼 — 「미리듣기」가 캐시 첫 페인트에도 서는가 [PREVIEW_LINK_BOOT]
 *
 * ★사용자 제보(2026-08-14): "식순에 어쩔땐 미리듣기가 안보이고 언쩔땐 보이고"
 *   원인은 **로드 순서**였다. 마이페이지는 localStorage 캐시로 첫 화면을 즉시 그리는데
 *   (boot 의 Promise.resolve().then = 마이크로태스크는 인라인 스크립트가 끝나는 즉시 돈다),
 *   그 시점엔 뒤에 있던 assets/ritual-preview-link.js 가 아직 안 왔다.
 *   버튼을 세울지 말지는 그 파일의 urlFromDraft 가 정하므로 캐시 페인트에는 늘 없었고,
 *   서버 갱신이 끝나 다시 그릴 때 나타났다. 망이 느리면 몇 초, 갱신이 실패하면 끝내 안 나온다.
 *   실측으로 갈랐다(찬 캐시 · 스크립트 2초 지연): 뒤에 두면 첫 페인트 2861자·버튼 없음,
 *   앞에 두면 2959자·버튼 있음.
 *
 * ★검사를 둘로 나눈 이유
 *   ① 정적(순서) — 이것이 **진짜 지켜야 할 성질**이다. 캐시가 더우면 브라우저 재현은 조용히 통과한다
 *      (실제로 한 번 속았다 — 같은 코드가 찬 캐시에서만 붉었다). 순서는 언제나 결정적이다.
 *   ② 실측(렌더) — 순서가 맞아도 조립기 조건이 바뀌면 버튼이 안 설 수 있다. 그건 브라우저만 안다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openProbe } from './audit/page-probe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bad = [];

/* ── ① 정적: 태그가 인라인 스크립트(=boot 이 사는 곳)보다 앞인가 ── */
{
  const src = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');
  const tag = src.indexOf('src="/assets/ritual-preview-link.js"');
  const boot = src.indexOf('(function boot(){');
  if (tag < 0) bad.push('mypage.html 에 ritual-preview-link.js 태그가 없다');
  else if (boot < 0) bad.push('boot() 를 못 찾음 — 이 검사의 기준점이 사라졌다(재서 틀림)');
  else if (tag > boot) bad.push('ritual-preview-link.js 가 boot() 뒤에 있다 — 캐시 첫 페인트에 「미리듣기」가 빠진다');
  else console.log(`  · 순서 OK — 태그 ${tag} < boot ${boot}`);
}

/* ── ② 실측: 캐시만으로 그린 화면에 버튼이 서는가(서버는 막는다) ── */
const S = { course: 'record', entry: 'A', letter: 'parent', tribute: 'flower', toast: 'toast', declare: '1', declareWho: 'narr', ringwarm: 'family', valley: 'none', bless: 'off', ring: 'on', song: 'family' };
const STATE = {
  ok: true, name: '테스트', code: 'TEST01', stage: '제작중',
  production: { tracks: { ritual: '진행중' }, ritualDraft: { _v: 3, S: S, summary: {} }, base: { weddingDate: '2026-10-14' } },
  invitation: {},
};
const h = await openProbe('mypage.html', { width: 390, settle: 300 });
try {
  await h.page.route('**/script.google.com/**', (r) => r.abort());   // 서버 없음 = 캐시 페인트만 남는다
  await h.page.evaluate(([tok, st]) => {
    localStorage.setItem('me_token', tok);
    localStorage.setItem('me_state_v1', JSON.stringify({ t: tok, d: st }));
  }, ['tok-test', STATE]);
  await h.page.reload({ waitUntil: 'domcontentloaded' });
  await h.page.waitForTimeout(1500);
  const r = await h.page.evaluate(() => ({
    hasLib: !!window.RitualPreviewLink,
    url: (() => { try { return !!window.RitualPreviewLink.urlFromDraft({ _v: 3, S: { course: 'record' } }); } catch (e) { return 'ERR:' + e; } })(),
    btn: !!document.getElementById('mp_ritualPreview'),
    drawn: !!(document.getElementById('mp_production') || {}).innerHTML,
  }));
  console.log('  · ' + JSON.stringify(r));
  if (!r.drawn) { console.log('못 잼: 제작 카드가 안 그려졌다(캐시 주입이 안 먹었다)'); process.exit(2); }
  if (!r.hasLib) bad.push('RitualPreviewLink 가 안 실린다');
  if (r.url !== true) bad.push('urlFromDraft 가 주소를 못 만든다: ' + r.url);
  if (!r.btn) bad.push('서버 없이 캐시만으로 그린 화면에 「미리듣기」 버튼이 없다');
  const p = await h.probe();
  if (p.errors.length) bad.push('JS 오류 ' + p.errors[0]);
} finally { await h.close(); }

bad.forEach((b) => console.log('  ✖ ' + b));
console.log(bad.length ? `틀림 ${bad.length}건` : '미리듣기 로드 순서·렌더 통과');
process.exit(bad.length ? 1 : 0);
