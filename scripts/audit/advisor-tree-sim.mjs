#!/usr/bin/env node
/* [ADVISOR_TREE] 챗봇 1단(즉답 트리) 시뮬레이션 — 고객이 «누르는» 쪽을 전수로 친다.
 *
 * 2단 자유질문은 모델이 답하니 advisor-sim.mjs(핸들러)와 ai-live-sim-ci.js(운영)가 맡는다.
 * ★1단은 모델이 없다 — 우리가 쓴 글이 그대로 고객에게 간다. 그래서 여기서 전부 읽고 규칙을 댄다.
 *
 * ①트리 전수(데이터) — 죽은 가지·빈 답·중복 id·브랜드 규칙 위반
 * ②숫자 정합 — 답이 말하는 금액이 홈 화면과 같은가(두 입이 다르면 그게 결함이다)
 * ③실제 클릭 — 위젯을 열어 눌러 보고, 화면에 그 답이 «실제로» 뜨는지 본다
 *
 * 종료코드: 0 통과 · 1 위반 · 2 못 쟀다(브라우저 없음)
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.json': 'application/json' };
const PORT = await freePort();
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!(f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile())) { r.statusCode = 404; return r.end('nf'); }
  r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); r.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
const eng = await launchBrowser();
if (!eng) { console.log('· 못 봄(브라우저 없음) — 이 자리에선 재지 않는다.'); srv.close(); process.exit(2); }
let bad = 0, n = 0;
const ok = (m) => { n++; console.log('   ✓ ' + m); };
const no = (m) => { n++; bad++; console.log('   ✗ ' + m); };

const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: 390, height: 844 } });
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
await page.waitForTimeout(1200);

/* ══════════ ① 트리 전수 ══════════ */
console.log('\n══ ① 대화트리 전수 ══');
const tree = await page.evaluate(() => {
  const KB = window.MOMENT_ADVISOR_KB;
  if (!KB) return { err: 'KB 가 window 에 없다' };
  const leaves = [], cats = [], ids = [], deep = [];
  (function walk(nodes, depth, trail) {
    (nodes || []).forEach((nd) => {
      ids.push(nd.id);
      const t = trail.concat(nd.label || nd.id);
      if (nd.children) { cats.push({ id: nd.id, kids: nd.children.length, trail: t.join(' › ') }); walk(nd.children, depth + 1, t); }
      else { leaves.push({ id: nd.id, label: nd.label || '', answer: nd.answer || '', escalate: !!nd.escalate, depth, trail: t.join(' › ') }); }
      if (depth > 5) deep.push(t.join(' › '));
    });
  })(KB.topics || KB.tree || KB.root || [], 0, []);
  return { leaves, cats, ids, deep, hasEsc: !!KB.escalation, keys: Object.keys(KB) };
});
if (tree.err) { no(tree.err); }
else {
  ok(`트리를 읽었다 — 카테고리 ${tree.cats.length} · 답 ${tree.leaves.length} · 노드 ${tree.ids.length}`);
  if (tree.leaves.length < 20) no('답이 ' + tree.leaves.length + '개뿐 — 트리를 제대로 못 읽은 것 아닌가(0건은 «못 잼»이다)');
  else ok('충분히 읽었다(답 ' + tree.leaves.length + '개) — 0건이 «못 잼»이 아님을 확인');

  const dupes = tree.ids.filter((v, i, a) => a.indexOf(v) !== i);
  dupes.length ? no('id 중복 ' + dupes.length + '건: ' + [...new Set(dupes)].join(', ')) : ok('id 중복 0');

  const dead = tree.cats.filter((c) => !c.kids);
  dead.length ? no('자식 없는 카테고리(죽은 가지) ' + dead.length + '건: ' + dead.map((d) => d.id).join(', ')) : ok('죽은 가지 0 — 누르면 반드시 다음이 있다');

  const empty = tree.leaves.filter((l) => !l.answer.trim());
  empty.length ? no('빈 답 ' + empty.length + '건: ' + empty.map((e) => e.id).join(', ')) : ok('빈 답 0');

  const noLabel = tree.leaves.filter((l) => !l.label.trim());
  noLabel.length ? no('라벨 없는 항목 ' + noLabel.length + '건') : ok('라벨 없는 항목 0');

  const dash = tree.leaves.filter((l) => /—/.test(l.answer) || /—/.test(l.label));
  dash.length ? no('전각 줄표(—) ' + dash.length + '건: ' + dash.map((d) => d.id).join(', ')) : ok('전각 줄표 0 (브랜드 규칙)');

  /* 장식 이모지 — 기능 아이콘(🍽🍃🔊🎵)·감정 정점(🤍) 말고는 금지 */
  const EMO = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  const ALLOW = /[🍽🍃🔊🎵🤍]/u;
  const emoji = tree.leaves.filter((l) => EMO.test(l.answer) && !ALLOW.test(l.answer));
  emoji.length ? no('허용 밖 이모지 ' + emoji.length + '건: ' + emoji.map((e) => e.id).join(', ')) : ok('허용 밖 이모지 0');

  const tooLong = tree.leaves.filter((l) => l.answer.length > 420);
  tooLong.length ? no('한 화면을 넘는 답 ' + tooLong.length + '건(420자 초과): ' + tooLong.map((t) => t.id + '=' + t.answer.length).join(', '))
                 : ok('답 길이 전부 420자 이하 (가장 긴 것 ' + Math.max(...tree.leaves.map((l) => l.answer.length)) + '자)');

  tree.hasEsc ? ok('상담 연결 정보(escalation)가 있다') : no('escalation 블록이 없다 — 막혔을 때 갈 곳이 없다');

  const esc = tree.leaves.filter((l) => l.escalate);
  ok('사람에게 넘기는 답 ' + esc.length + '개 / 전체 ' + tree.leaves.length);
}

/* ══════════ ② 숫자 정합 — 챗봇과 홈 화면이 같은 수를 말하는가 ══════════ */
console.log('\n══ ② 챗봇 답 vs 홈 화면 숫자 ══');
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const all = (tree.leaves || []).map((l) => l.answer).join('\n');
  /* 화면에 있는 값만 말해야 한다. 값이 갈리면 어느 쪽이 맞는지는 사람이 정할 문제 → 여기선 «갈렸다»를 잡는다 */
  const MUST = [
    ['330만', '주말·공휴일 올인원'], ['250만', '평일 올인원'],
    ['25명', '착석 상한'], ['2.5~4만', '인근 식당 1인 [FAQ_DINE_BAND]'],
    ['60~100만', '25명 환산 [FAQ_DINE_BAND]'],
  ];
  for (const [num, what] of MUST) {
    const inKb = all.includes(num), inSite = html.includes(num);
    if (inKb && inSite) ok(`${num} — 챗봇·홈 둘 다 같은 수 (${what})`);
    else if (!inSite) no(`${num} 가 홈 화면에 없다 — 챗봇만 말하는 수다 (${what})`);
    else no(`${num} 를 챗봇이 말하지 않는다 — 홈만 말하는 수다 (${what})`);
  }
  /* 되살아나면 안 되는 옛 표현 */
  for (const dead of ['파트너사', '파트너 식당', '보증인원이 있']) {
    all.includes(dead) ? no('옛 표현이 챗봇 답에 되살아났다: ' + dead) : ok('옛 표현 없음: ' + dead);
  }
}

/* ══════════ ③ 실제 클릭 — 화면에 «진짜로» 뜨는가 ══════════ */
console.log('\n══ ③ 위젯을 열어 실제로 눌러 본다 ══');
{
  const opened = await page.evaluate(() => {
    /* ★진입은 클래스가 아니라 aria-label 로 찾는다 — 레일 버튼은 전부 .me-fab 라 클래스로는 못 가른다
       (2026-09-11: '.me-adv-fab' 로 찾다가 «FAB 없음»이 나왔다. 그건 제품이 아니라 선택자 문제였다) */
    const fab = [...document.querySelectorAll('button, a')]
      .find((b) => /상담 도우미/.test(b.getAttribute('aria-label') || ''));
    if (!fab) return 'aria-label «상담 도우미» 버튼 없음';
    fab.click(); return 'ok';
  });
  await page.waitForTimeout(700);
  const panelOpen = await page.evaluate(() => !!document.querySelector('.me-adv-panel.open'));
  (opened === 'ok' && panelOpen) ? ok('상담사 버튼을 누르면 패널이 열린다') : no('패널이 안 열린다 (' + opened + ' · open=' + panelOpen + ')');

  /* 다이닝 → 메뉴·가격대 로 파고들어 «이번에 고친 답»이 화면에 뜨는지 본다 */
  const trail = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const hit = (re) => [...document.querySelectorAll('.me-adv-panel button, .me-adv-panel [role="button"]')]
      .find((b) => re.test((b.textContent || '').trim()));
    const steps = [];
    for (const re of [/애프터 웨딩|식사/, /메뉴.*가격대|가격대/]) {
      const b = hit(re);
      if (!b) return { steps, fail: '못 찾음: ' + re + ' · 그 자리의 선택지 = '
        + [...document.querySelectorAll('.me-adv-panel button, .me-adv-panel [role="button"]')]
            .map((x) => (x.textContent || '').trim().slice(0, 16)).filter(Boolean).slice(0, 12).join(' / ') };
      steps.push((b.textContent || '').trim().slice(0, 24));
      b.click(); await sleep(650);
    }
    const msgs = [...document.querySelectorAll('.me-adv-msg.bot')].map((m) => m.textContent.trim());
    return { steps, last: msgs[msgs.length - 1] || '' };
  });
  if (trail.fail) no('경로를 못 눌렀다 — ' + trail.fail);
  else {
    ok('눌러 들어간 경로: ' + trail.steps.join(' › '));
    /2\.5~4만/.test(trail.last) ? ok('화면에 뜬 답에 «1인 2.5~4만» 이 있다 [FAQ_DINE_BAND]') : no('화면 답에 가격대가 없다: ' + trail.last.slice(0, 90));
    /60~100만/.test(trail.last) ? ok('화면에 뜬 답에 «25명 약 60~100만» 이 있다') : no('화면 답에 25명 환산이 없다');
    !/—/.test(trail.last) ? ok('화면에 뜬 답에 전각 줄표 없음') : no('화면 답에 전각 줄표');
  }
}
console.log('\n· pageerror/console err: ' + errors.length);
if (errors.length) { bad++; console.log('   ✗ 콘솔 오류 ' + errors.slice(0, 3).join(' | ')); }

srv.close(); await eng.close?.();
console.log('\n' + (bad ? '✗ ADVISOR TREE — 위반 ' + bad + '건 / ' + n + '검사' : '✓ ADVISOR TREE OK — ' + n + '검사 전부 통과'));
process.exit(bad ? 1 : 0);
