// [ORD_REAL_AUDIO] 「들어보기」가 진짜 그 순간의 파일을 요청하는지 실렌더로 확인한다.
//
// 왜 필요한가 (2026-08-04 사용자 제보)
//   *"여기왜 다른 오디오가나와?"* / *"전부다 줬잖아 파일"*
//   빌더가 부르던 `/assets/narration/m-<키>.mp3` 는 만들어진 적 없는 이름이었다.
//   404 → 조용히 대표 샘플로 폴백 → 어느 순간을 눌러도 같은 목소리인데 화면은 멀쩡했다.
//   ★조용한 폴백은 눈으로 못 잡는다. 그래서 「무엇을 요청했는가」를 기계가 본다.
//
// 무엇을 보는가
//   ① 엔진 3파일이 샌드박스에만 실렸는가 — 이 화면의 인라인 COURSES/ENTRY 를 덮지 않았는가
//   ② 순간마다 다른 파일이 나오는가 · 그 파일이 저장소에 실제로 있는가
//   ③ 진짜 버튼을 눌렀을 때 네트워크로 나가는 URL 이 그 순간의 파일인가 (390 · 1280)
//
//   node scripts/audit/order-audio-check.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { launchBrowser } from './_browser.mjs';
import { createRequire as _cr } from 'node:module';
/* [RETIRED_SILENT] 폐지 목록은 **원천에서 읽는다** — 여기에 손으로 적으면 다음 폐지 때 또 어긋난다. */
const ENGINE_RETIRED = (() => {
  try { return _cr(import.meta.url)('../../assets/ritual-cue.js').RETIRED || {}; }
  catch (e) { console.log('  ! ritual-cue 의 RETIRED 를 못 읽었습니다 — 폐지 면제 없이 봅니다:', e.message); return {}; }
})();

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '../..');
const PORT = 8233;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mp3': 'audio/mpeg',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(ROOT, rel === '/' ? '/index.html' : rel);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  // mp3는 헤더만 보내도 충분하다 — 이 검사가 보는 건 「무엇을 요청했는가」지 소리가 아니다(★나는 소리를 못 듣는다)
  res.end(path.extname(f) === '.mp3' ? fs.readFileSync(f).subarray(0, 2048) : fs.readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const eng = await launchBrowser();
if (!eng) { console.log('브라우저 없음 — 건너뜀'); server.close(); process.exit(0); }

let fail = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) fail++; };

for (const [tag, viewport] of [['390 (폰)', { width: 390, height: 844 }], ['1280 (데스크톱)', { width: 1280, height: 900 }]]) {
  console.log(`\n══ ${tag}`);
  const { page, errors } = await eng.newPage({ port: PORT, viewport });
  const asked = [];
  page.on('request', (r) => { const u = r.url(); if (/\.mp3(\?|$)/.test(u)) asked.push(u.replace(`http://localhost:${PORT}`, '')); });
  await page.goto(`http://localhost:${PORT}/order-preview.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('!!window.ENG', null, { timeout: 15000 }).catch(() => {});

  /* ① 샌드박스 — 엔진이 window 를 건드리지 않았는가 */
  const iso = await page.evaluate(() => ({
    loaded: !!window.ENG,
    onWindow: typeof window.RitualCue + '/' + typeof window.RitualStory,
    sameCourses: !!(window.ENG && window.COURSES === window.ENG.COURSES),
    sameEntry: !!(window.ENG && window.ENTRY === window.ENG.ENTRY),
    inlineKeys: Object.keys(window.COURSES || {}).join(','),
  }));
  ok(iso.loaded, '엔진 3파일이 샌드박스에 실렸다');
  ok(iso.onWindow === 'undefined/undefined', `window 에 RitualCue/RitualStory 없음 (${iso.onWindow})`);
  ok(!iso.sameCourses && !iso.sameEntry, '인라인 COURSES/ENTRY 가 엔진 것으로 안 바뀜');
  ok(iso.inlineKeys.length > 0, `인라인 COURSES 살아 있음 (${iso.inlineKeys})`);

  /* ② 순간마다 다른 파일 · 실존 */
  const KEYS = 'guest entry welcome vow ringwarm ring declare valley toast song letter tribute bless _close'.split(' ');
  const got = await page.evaluate((ks) => {
    const o = {};
    ks.forEach((k) => { o[k] = _srcs(window.ENG, k).map((x) => x.src); });
    o.__all = _srcs(window.ENG, null).map((x) => x.src);
    return o;
  }, KEYS);
  /* ★[RETIRED_SILENT 2026-08-10 점검] 폐지된 순서는 소리가 없는 것이 **맞다.**
     ringwarm(2026-08-07)·song(2026-08-09) 은 사용자 지시로 폐지됐고 ritual-cue 의 RETIRED 에 있다.
     그런데 이 검사는 14개 전부 소리가 있어야 한다고 못 박아 두어 그때부터 계속 붉었다.
     ★목록을 손으로 지우지 않는다 — RETIRED 를 **원천에서 읽어** 면제한다.
       손으로 지우면 다음 폐지 때 또 붉어지고, 되살릴 때 다시 넣는 것을 잊는다.
     ★'소리가 없어도 되는 키'를 넓히지는 말 것 — RETIRED 에 든 것만이다. */
  const RET = Object.keys((ENGINE_RETIRED || {}));
  const retiredKey = (k) => RET.some((f) => f === k || f.indexOf(k + '-') === 0 || f.indexOf('narr-' + k) === 0);
  const empty = KEYS.filter((k) => !got[k].length && !retiredKey(k));
  const _exempt = KEYS.filter((k) => !got[k].length && retiredKey(k));
  /* [RETIRED_SILENT] 면제한 것을 **화면에 적는다** — 몇 개를 안 봤는지 말하지 않으면
     '전부 있다'가 '전부 봤다'로 읽힌다(TAP_UNSEEN 과 같은 성격). */
  ok(!empty.length, `${KEYS.length - _exempt.length}개 순간 모두 소리가 있다`
    + (_exempt.length ? ` · 폐지라 면제 ${_exempt.length}개(${_exempt.join(' ')})` : '')
    + (empty.length ? ' — 빈 키: ' + empty.join(' ') : ''));
  const firsts = KEYS.filter((k) => got[k].length).map((k) => got[k][0]);
  ok(new Set(firsts).size === firsts.length, `순간마다 첫 소리가 다르다 (${new Set(firsts).size}/${firsts.length})`);
  const missing = [...new Set(KEYS.flatMap((k) => got[k]).concat(got.__all))].filter((u) => !fs.existsSync(path.join(ROOT, u)));
  ok(!missing.length, `참조 파일이 저장소에 실제로 있다${missing.length ? ' — 없음: ' + missing.join(' ') : ''}`);
  ok(got.__all.length >= 10, `전 순서 이어듣기 ${got.__all.length}개`);
  ok(!KEYS.some((k) => got[k].some((u) => /\/assets\/narration\//.test(u))), '옛 m-<키>.mp3 경로를 더는 안 부른다');

  /* ③ 진짜 버튼 — 순서를 고르는 화면의 순간별 「들어보기」
     ★[REHEARSE_GONE 2026-08-15 점검] 여기는 `window.openRehearse()` 를 불렀다.
       연습 공간은 2026-08-12 사용자 지시로 폐지됐고(1d63831b REHEARSE_MERGED · "연습공간 없에고
       미리듣기로 통합하자"), 그 함수도 같이 사라졌다. 그래서 이 검사가 그날부터 죽어 있었다 —
       ②까지 초록을 찍고 ③에서 터지니 화면만 보면 통과처럼 읽혔다.
     ★연습 공간을 되살리지 않는다(제거 지시 보존 규칙). 대신 **살아남은 길**을 본다:
       순간별 「들어보기」는 지금도 빌더 안에 있다(playBtn → momPlay). 고객이 실제로 누르는 그 버튼이다.
     ★덤으로 더 세게 본다 — 한 버튼만 누르던 것을 **서로 다른 순간 셋**으로 늘렸다.
       이 검사가 막으려던 사고가 「어느 순간을 눌러도 같은 목소리」였는데,
       버튼 하나만 누르면 그 사고를 정의상 못 잡는다. */
  const PROBE = ['entry', 'vow', 'declare'];
  const heard = [];
  for (const k of PROBE) {
    const drew = await page.evaluate((key) => {
      try {
        S.course = Object.keys(COURSES)[0]; courseStarted = true;
        const st = document.getElementById('stage');
        const h = renderStep(key);
        if (!h) return false;
        st.innerHTML = h;
        return !!st.querySelector('button.play');
      } catch (e) { return false; }
    }, k);
    if (!drew) { ok(false, `${k} 에 들어보기 버튼이 없다`); continue; }
    asked.length = 0;
    const b = await page.$('#stage button.play');
    const lbl = await b.evaluate((el) => el.textContent.trim());
    await b.click();
    await new Promise((r) => setTimeout(r, 700));
    ok(asked.length > 0, `${k} 탭 → 요청 나감: ${asked.join(' ') || '(없음)'}`);
    ok(asked.every((u) => /^\/assets\/audio\/(narration|cast)\//.test(u)), `${k} 요청 경로가 실제 음원 폴더다`);
    ok(!/샘플/.test(lbl), `${k} 버튼 라벨에 '샘플' 없음 — "${lbl}"`);
    if (asked.length) heard.push({ k, u: asked[0] });
  }
  /* ★이 검사의 존재 이유 그 자체 — 세 순간이 서로 **다른** 파일을 불렀는가.
     2026-08-04 사고("여기왜 다른 오디오가나와?")는 셋이 같은 파일로 폴백한 상태였다. */
  ok(heard.length === PROBE.length, `순간 ${heard.length}/${PROBE.length} 이 실제로 소리를 요청했다`);
  ok(new Set(heard.map((h) => h.u)).size === heard.length,
    `탭한 순간마다 부른 파일이 다르다 — ${heard.map((h) => h.k + ':' + h.u.split('/').pop()).join(' · ')}`);

  const hard = errors.filter((e) => !/favicon|net::ERR/.test(e));
  ok(!hard.length, `콘솔 오류 없음${hard.length ? ' — ' + hard.slice(0, 3).join(' | ') : ''}`);
  await page.close();
}

await eng.close();
server.close();
console.log(fail ? `\n★ 실패 ${fail}건\n` : '\nORDER AUDIO OK\n');
process.exit(fail ? 1 : 0);
