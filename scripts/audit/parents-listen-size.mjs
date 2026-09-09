#!/usr/bin/env node
/* [PAR_COMBO] 부모님 안내가 «글자 크기 × 재생 중» 조합에서도 성립하는가 — 라운드 3
 *
 * 왜 조합인가 (2026-09-08 코워크 지적)
 *   각각은 멀쩡한데 겹칠 때 깨지는 자리가 있다. 이 페이지의 최악 조합은 «아주 크게 + 재생 중»이다 —
 *   글이 커져 문서가 길어진 상태에서, 화면 아래에 멈춤 막대가 고정으로 선다.
 *   ★어른께 드리는 안내라 그 조합을 «실제로 쓰는 분»이 있다. 가정이 아니라 기본 사용법이다.
 *
 * ★재생은 진짜로 누른다. LEAD_IN(2초) 동안의 «잠시 뒤 시작해요» 상태도 따로 잰다 —
 *   그 2초는 사람이 화면을 가장 많이 보는 시간이다.
 *
 * 무엇을 보나
 *   ① 막대가 «글을 가리는가» — 맨 아래까지 내린 뒤, 막대와 겹치는 글이 있는지 실좌표로 본다.
 *      body.listening 의 아래 여백은 70px «고정»인데 막대 높이는 글이 접히면 늘어난다.
 *      좁은 화면에서 막대가 70px 을 넘으면 그 차이만큼 마지막 줄이 가려진다 — 그것을 찾는 검사다.
 *   ② 가로 넘침 · ③ 멈춤 버튼 탭 크기(44px) · ④ 단계 라벨과 버튼 비활성이 맞는가
 *
 * 종료코드: 0 통과 · 1 위반 · 2 못 쟀다(브라우저 없음 · 포트)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';
import { settle } from './_settle.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SHOTS = path.join(ROOT, 'scripts/audit/_shots');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.json': 'application/json' };

const PORT = await freePort();
const srv = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) {
    res.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
    res.setHeader('content-length', fs.statSync(f).size);
    if (req.method === 'HEAD') { res.end(); return; }   // 듣기 버튼은 이 HEAD 응답으로 «음원 모드»를 정한다
    res.end(fs.readFileSync(f));
  } else { res.statusCode = 404; res.end('nf'); }
});
await new Promise((r, j) => { srv.on('error', j); srv.listen(PORT, '127.0.0.1', r); })
  .catch((e) => { console.log('· 못 봄(포트 · ' + String(e && e.code || e) + ')'); process.exit(2); });

const eng = await launchBrowser();
if (!eng) { console.log('· 못 봄(브라우저 없음) — 이 자리에선 재지 않는다.'); srv.close(); process.exit(2); }
fs.mkdirSync(SHOTS, { recursive: true });

/* 화면을 «맨 아래»로 내린 뒤 잰다 — 고정 막대가 글을 가리는 것은 거기서만 드러난다. */
const MEASURE = `(() => {
  const bar = document.getElementById('playBar');
  const on = bar && bar.classList.contains('on');
  const br = bar ? bar.getBoundingClientRect() : null;
  const box = (e) => { const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, w: r.width, h: r.height }; };
  /* 글이 든 요소만 — 자식이 또 글을 가지면 부모는 뺀다(부모×자식이 두 번 세지는 것을 막는다) */
  const texted = [...document.querySelectorAll('body *')].filter((e) => {
    if (bar && (e === bar || bar.contains(e))) return false;
    if (!e.childNodes.length) return false;
    let own = false;
    for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) own = true;
    if (!own) return false;
    const c = getComputedStyle(e);
    return c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.05;
  });
  const 가림 = [];
  if (on && br) for (const e of texted) {
    const r = e.getBoundingClientRect();
    if (r.height < 1 || r.bottom < 0 || r.top > innerHeight) continue;
    const ov = Math.min(r.bottom, br.bottom) - Math.max(r.top, br.top);
    if (ov > 1 && r.left < br.right && r.right > br.left)
      가림.push({ 글: (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 34), 겹침: Math.round(ov) });
  }
  const stop = document.getElementById('playBarStop');
  return {
    단계: (document.getElementById('fontLabel') || {}).textContent || null,
    글자px: getComputedStyle(document.documentElement).getPropertyValue('--letter-size').trim(),
    루트px: parseFloat(getComputedStyle(document.documentElement).fontSize),
    문서높이: Math.round(document.documentElement.scrollHeight),
    가로넘침: document.documentElement.scrollWidth > innerWidth + 1,
    막대: on ? { 높이: Math.round(br.height), 글: (bar.textContent || '').replace(/\\s+/g, ' ').trim() } : null,
    아래여백: Math.round(parseFloat(getComputedStyle(document.body).paddingBottom)),
    멈춤: stop && on ? box(stop) : null,
    가림,
    /* ★[BAR_SLACK] «막대 높이 vs body 아래여백 70px» 은 대리 지표다 — 어긋나도 글이 안 가릴 수 있다.
       실제로 그랬다(아래 주석). 그래서 «마지막 글줄과 막대 사이가 실제로 몇 px 인가»를 함께 잰다.
       이게 음수일 때만 진짜 가려진 것이고, 그건 위 가림[] 이 이미 잡는다. */
    여유: (() => { if (!on || !br) return null;
      let low = -1e9, txt = '';
      for (const e of texted) { const r = e.getBoundingClientRect();
        if (r.height < 1) continue; if (r.bottom > low) { low = r.bottom; txt = (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 24); } }
      return low === -1e9 ? null : { px: Math.round(br.top - low), 마지막글: txt }; })(),
    가플러스잠김: (document.getElementById('fontPlus') || {}).disabled,
    가마이너스잠김: (document.getElementById('fontMinus') || {}).disabled,
  };
})()`;

async function state(width, idx, { play = false, wait = false, shot = '' } = {}) {
  const { page } = await eng.newPage({ port: PORT, viewport: { width, height: 780 } });
  await page.goto(`http://localhost:${PORT}/parents.html`, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await page.evaluate(() => { try { localStorage.removeItem('meParentsFont'); } catch (e) {} });
  await page.waitForTimeout(400);
  // 기본은 1(보통) — 실제 버튼을 눌러 옮긴다(값을 심으면 버튼이 안 도는 것을 못 잡는다)
  for (let i = 1; i < idx; i++) await page.click('#fontPlus');
  for (let i = 1; i > idx; i--) await page.click('#fontMinus');
  if (play) {
    await page.waitForSelector('#listenBtn:not([hidden])', { timeout: 6000 }).catch(() => {});
    await page.click('#listenBtn').catch(() => {});
    /* ★[SETTLE_STATE 2026-09-09 코워크 지적] 리드인이 끝났는지를 «시간»이 아니라 «상태»로 본다.
       종전엔 2600ms 를 기다렸다 — LEAD_IN 2000ms 에 여유를 더한 어림수다. 느린 기기에선 모자라고
       빠른 기기에선 헛되이 기다린다. 실제 상태는 .play-bar 의 waiting 클래스가 쥐고 있다
       (barSay() 가 붙였다 뗀다). 그걸 직접 본다. */
    const waiting = () => page.waitForFunction((want) => {
      const b = document.getElementById('playBar');
      return !!b && b.classList.contains('waiting') === want;
    }, wait, { timeout: 8000 }).catch(() => {});
    await waiting();          // wait=true 면 «리드인 중» · false 면 «리드인이 끝난 뒤»
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  /* [SETTLE] 막대가 올라오는 transition(transform 0.3s)이 «끝났는지»를 상태로 확인한다.
     종전 waitForTimeout(500) 은 「아마 끝났겠지」였다 — 라운드 3 오류 넷 중 셋이 그 자리였다. */
  const 가라앉음 = await settle(page);
  if (!가라앉음) console.log('   · 전환이 안 끝났다 — 아래 값은 «못 쟀다»로 볼 것');
  const m = await page.evaluate(MEASURE);
  if (shot) await page.screenshot({ path: path.join(SHOTS, shot) });
  await page.close();
  return m;
}

let bad = 0;
const fail = (m) => { bad++; console.log('   ✗ ' + m); };
const good = (m) => console.log('   ✓ ' + m);
const LABEL = ['작게', '보통', '크게', '아주 크게'];

for (const w of [320, 390]) {
  console.log(`\n════════ ${w}px ════════`);
  for (let idx = 0; idx < 4; idx++) {
    const 정지 = await state(w, idx);
    const 재생 = await state(w, idx, { play: true, shot: (idx === 3 ? `parents-${w}-아주크게-재생중.png` : '') });
    console.log(`\n── ${LABEL[idx]} (${정지.글자px}) ──`);
    console.log(`   문서 ${정지.문서높이}px · 가로넘침 ${정지.가로넘침 ? '★있음' : '없음'} · root ${정지.루트px}px · 라벨「${정지.단계}」`);
    if (재생.막대) console.log(`   재생 중: 막대 ${재생.막대.높이}px · body 아래여백 ${재생.아래여백}px · 멈춤 ${Math.round(재생.멈춤.w)}×${Math.round(재생.멈춤.h)}`);
    else { fail('듣기를 눌렀는데 멈춤 막대가 안 섰다'); continue; }

    정지.가로넘침 || 재생.가로넘침 ? fail(`가로로 넘친다(정지=${정지.가로넘침} 재생=${재생.가로넘침})`)
      : good('가로로 안 넘친다');
    재생.가림.length === 0 ? good('맨 아래까지 내려도 막대가 글을 안 가린다')
      : fail(`막대가 글을 가린다 ${재생.가림.length}곳 — ` + 재생.가림.map((x) => `「${x.글}」 ${x.겹침}px`).join(' · '));
    /* ★[BAR_SLACK] 여기서 «막대 높이 > body 아래여백(70px)» 을 위반으로 세지 않는다.
       처음엔 그렇게 짰고 8건이 떴다. 그런데 같은 판에서 «가림 0곳»이 나왔다 — 지표 둘이 어긋났다.
       실좌표 쪽이 옳았다. 마지막 글 아래에 다른 여백이 이미 있어, 70px 이 모자라도 글은 안 가린다.
       ★70px 은 «어림수»다(막대는 320px 에서 97px · 390px 에서 73px). 우연히 덮이고 있을 뿐이라
         값은 남겨 보고하되, 가려지지 않는 한 위반이 아니다. 대리 지표로 없는 결함을 만들지 않는다. */
    /* ★[BAR_SLACK] 여유는 «통과/실패»가 아니라 «얼마나 아슬아슬한가»를 말하는 자리다.
       실좌표 검사(가림[])는 «지금 안 아프다»만 말한다 — 남는 틈이 8px 인지 36px 인지는 안 말한다.
       고치기 전이 8px 이었고, 그게 --bar-h 를 넣게 만든 값이다. 그러니 이 숫자를 지우지 않는다.
       ★16px 아래면 경고를 찍는다(위반은 아니다). 다음 화면 폭에서 먼저 아플 자리라서다. */
    const 여유px = 재생.여유 ? 재생.여유.px : null;
    console.log(`   여유: 마지막 글「${재생.여유 && 재생.여유.마지막글}」과 막대 사이 ${여유px}px`
      + (여유px !== null && 여유px < 16 ? '  ⚠ 아슬아슬하다 — 지금은 안 가리지만 폭이 바뀌면 먼저 아플 자리' : ''));
    /* [BAR_HEIGHT_REAL] 이제는 어림수가 아니라 «잰 값»이어야 한다 — 320px 97px · 390px 73px.
       어긋나면 재는 코드가 안 도는 것이다(그 자체로는 글을 안 가려서 위 가림[] 만으론 안 잡힌다). */
    재생.아래여백 === 재생.막대.높이 ? good(`아래 여백이 막대 실측(${재생.막대.높이}px)과 같다`)
      : fail(`아래여백 ${재생.아래여백}px ≠ 막대 ${재생.막대.높이}px — 막대를 재서 넣는 코드가 안 돈다`);
    재생.멈춤.w >= 44 && 재생.멈춤.h >= 44 ? good('멈춤 버튼이 44px 이상')
      : fail(`멈춤 ${Math.round(재생.멈춤.w)}×${Math.round(재생.멈춤.h)}`);
    const 끝 = idx === 3, 처음 = idx === 0;
    정지.가플러스잠김 === 끝 && 정지.가마이너스잠김 === 처음 ? good('끝에 닿으면 그쪽 버튼이 잠긴다')
      : fail(`버튼 잠김이 단계와 안 맞는다(가+ ${정지.가플러스잠김} · 가− ${정지.가마이너스잠김})`);
  }
}

/* 리드인 2초 — 「잠시 뒤 시작해요」가 서 있는 동안의 조합도 한 장 남긴다(가장 오래 보는 화면).
   ★[LEAD_IN_NO_JUMP] 그 2초와 소리가 난 뒤의 «막대 높이가 같은가»가 이 검사의 요점이다.
     달라지면 소리가 시작되는 순간 막대가 커지며 글이 밀린다 — 배려로 만든 것이 고장으로 읽힌다. */
for (const w of [320, 390]) {
  const 리드 = await state(w, 3, { play: true, wait: true, shot: `parents-${w}-아주크게-리드인.png` });
  const 소리 = await state(w, 3, { play: true });
  console.log(`\n── ${w}px 아주 크게 · 리드인 ──\n   막대「${리드.막대 && 리드.막대.글}」 ${리드.막대 && 리드.막대.높이}px → 소리 뒤 ${소리.막대 && 소리.막대.높이}px`);
  /잠시 뒤 시작해요/.test((리드.막대 && 리드.막대.글) || '')
    ? good('소리 전 2초 동안 «잠시 뒤 시작해요»라고 말한다')
    : fail('리드인 문구가 안 뜬다: ' + (리드.막대 && 리드.막대.글));
  리드.막대 && 소리.막대 && 리드.막대.높이 === 소리.막대.높이
    ? good(`리드인과 재생 중의 막대 높이가 같다(${소리.막대.높이}px) — 소리가 시작돼도 글이 안 밀린다`)
    : fail(`막대가 ${리드.막대 && 리드.막대.높이}px → ${소리.막대 && 소리.막대.높이}px 로 튄다 — [HINT_NO_POP] 가 없앤 움직임이 되살아났다`);
}

srv.close(); await eng.close();
console.log(bad ? `\n부모님 안내 조합 위반 ${bad}건` : '\nPAR COMBO OK — 글자를 키워도 · 재생 중이어도 글이 안 가린다');
process.exit(bad ? 1 : 0);
