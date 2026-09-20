#!/usr/bin/env node
/* [INV_RENDER] 청첩장 16판을 실제로 열어 본다 — 그리고 «원천(마스터)»도 같이 잰다
 *
 * 왜 이 검사인가 (2026-09-19 전수조사 후속)
 *   ① 청첩장은 «정적 파일 + 브라우저 치환»이다. `/i/cover-NN.html?e=…` 가 그대로 하객에게 가고,
 *      `shared/hydrate.js` 가 `{{TOKEN}}` 을 브라우저에서 채운다(428행 `'{{' + k + '}}'` — 동적 조립).
 *      그래서 **문자열 검사로는 무엇이 채워지는지 알 수 없다.** grep 으로 재면 74종이 «미치환»으로
 *      나오는데 전부 오탐이다(실측함). 여는 수밖에 없다 — [NOT_THE_SOURCE] 「화면은 지표로 대신하지 않는다」.
 *   ② 그런데 이 16판을 여는 검사가 저장소에 **하나도 없었다.** merge-guard 의 hydrate 관련 줄 셋은
 *      전부 `chk`(문자열 생존)이라 «토큰이 실제로 채워지는가»는 아무도 안 봤다.
 *   ③ ★그리고 이 파일들에는 **원천이 따로 있다** — `청첩장/마스터/*.master`.
 *      2026-09-19 전수조사에서 `i/cover-04·08` 의 「RSVP · 참석 회신」과 `cover-06` 의 「, 성수」를
 *      고쳤는데 **마스터 세 곳은 옛 글 그대로였다.** 다시 뽑는 순간 되살아난다.
 *      이 저장소가 이번에 반복해 맞은 자리다(원천 `ritual-data.js` vs 사본 `order-preview.html` 동류).
 *
 * 무엇을 보나
 *   ①  렌더 — 16판을 `?e=test-couple`(hydrate [HYDRATE_DEMO] · 시트 조회 없음)로 열어
 *             남은 `{{TOKEN}}` 0 · pageerror 0
 *   ②  렌더 글 — 하객이 읽는 글에 폐기어가 없는가([PAR_NO_TRADITION]·[SEATED30]·[LIVE_FEAT_REAL]·[DTL16])
 *   ③  원천 — 같은 낱말을 `청첩장/마스터/*.master` 에서도 센다. 사본만 고치면 여기서 빨개진다
 *
 * 종료코드: 0 통과 · 1 재서 틀림 · 2 재지 못함(브라우저 없음 · 포트)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

/* 하객이 읽는 글에서 사라져야 하는 낱말 — 각 줄에 «왜»를 적는다(근거 없는 금지어는 다음 사람이 지운다) */
const BAD = [
  ['폐백',       'PAR_NO_TRADITION 2026-09-19 — 전통 절차는 식순에 없다'],
  ['예단',       'PAR_NO_TRADITION'],
  ['이바지',     'PAR_NO_TRADITION'],
  ['전통 절차',  'PAR_NO_TRADITION'],
  ['전통절차',   'PAR_NO_TRADITION'],
  ['25명',       'SEATED30 — 정원은 30명 전원 착석이다'],
  ['스탠딩',     'SEATED30 — 「착석 25 + 스탠딩 5」는 폐기된 정책'],
  ['참석 회신',  'LIVE_FEAT_REAL — live.html 에 RSVP 기능이 없다'],
  ['RSVP',       'LIVE_FEAT_REAL'],
  ['성수',       'DTL16 — 시안 잔재 지명. 실제 스튜디오는 경기 고양 향동'],
];

const PAGES = [];
for (let i = 1; i <= 8; i++) {
  PAGES.push(`/i/cover-0${i}.html`);
  PAGES.push(`/i-family/family-0${i}.html`);
}
/* ★[INV_SAMPLE 2026-09-20] 공개 표본 9판도 연다.
   이 폴더는 토큰이 0개인 «손으로 채운» 표본이라 hydrate 를 안 탄다. 그래서 종전 검사가 안 봤고,
   실제로 invitation-08-noir 가 「일요일요일 · 오후 두 시」를 띄운 채 공개돼 있었다(2026-09-20 실측).
   갤러리에서 하객·예비부부가 그대로 여는 주소다 — 사본이 아니라 제품이다. */
for (const n of ['01-classic', '02-editorial', '03-letterpress', '04-Vermilion',
                 '05-botanical', '06-hangeul', '07-architect', '08-noir', '09-guide']) {
  PAGES.push(`/i/invitations/invitation-${n}.html`);
}

function serve(port) {
  return new Promise((res) => {
    const s = http.createServer((req, rq) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rq.writeHead(404); return rq.end(); }
      rq.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      rq.end(fs.readFileSync(p));
    });
    s.listen(port, () => res(s));
  });
}

let fail = 0;
const say = (ok, msg) => { if (!ok) fail = 1; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };

/* ── ③ 원천(마스터) — 브라우저가 없어도 항상 돈다. 사본만 고치는 사고를 여기서 잡는다 ── */
function checkMasters() {
  const dir = path.join(ROOT, '청첩장/마스터');
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.master')); } catch {}
  if (!files.length) { say(false, '원천 — 청첩장/마스터/*.master 를 못 찾았다(경로가 바뀌었나)'); return; }
  let hit = 0;
  for (const f of files) {
    /* ★주석은 걷고 센다 — 「되살리지 말 것」 근거 주석에는 그 낱말이 **반드시** 들어간다.
       안 걷으면 제거 지시를 적는 순간 빨개지고, 그러면 다음 사람이 주석을 지워 근거가 사라진다.
       규칙이 보는 것은 «하객이 읽는 글»이지 개발자 주석이 아니다(no-tradition.mjs ⑥과 같은 처리). */
    const src = fs.readFileSync(path.join(dir, f), 'utf8').replace(/<!--[\s\S]*?-->/g, ' ');
    for (const [w, why] of BAD) {
      if (src.includes(w)) { hit++; say(false, `원천 ${f} — 「${w}」 (${why})`); }
    }
  }
  if (!hit) say(true, `원천 ${files.length}개 마스터 — 폐기어 0건`);
}

/* ── 렌더 글만 뽑기 — 주석·script·style 은 걷는다([ATTR_BLIND] 과 같은 이유로 «보이는 글»만) ── */
/* ★[DOW_MATCH 2026-09-20] 날짜와 요일이 맞는가 — CLAUDE.md [DATE_DOW] 를 기계가 재게 한 것.
   사람은 요일을 눈대중한다. 실제로 이 저장소는 «9/8(월)»을 적었다가 화요일인 것을 나중에 알았고,
   청첩장 표본에서는 「일요일요일」이 살아남았다. 둘 다 눈으로는 안 걸린다.
   ①「요일요일」 같은 이중 접미는 그 자리에서 실패 ②날짜가 하나로 특정되면 모든 요일 라벨을 대조.
   날짜가 여럿이면 어느 것에 걸린 라벨인지 알 수 없으므로 «못 쟀다»로 넘긴다(거짓 빨강을 만들지 않는다). */
const DOW = ['월', '화', '수', '목', '금', '토', '일'];
function checkDow(text) {
  const bad = [];
  if (/요일\s*요일/.test(text)) bad.push('「요일요일」 이중 접미가 화면 글에 있다');
  const ds = new Set();
  const re = /(20\d{2})\s*[·.\-/년]\s*(\d{1,2})\s*[·.\-/월]\s*(\d{1,2})/g;
  let m;
  while ((m = re.exec(text))) {
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) ds.add(`${y}-${mo}-${d}`);
  }
  const labels = Array.from(new Set((text.match(/[월화수목금토일]요일/g) || [])));
  if (ds.size !== 1 || !labels.length) return bad;   // 특정 못 하면 조용히 넘긴다
  const [y, mo, d] = Array.from(ds)[0].split('-').map(Number);
  const want = DOW[(new Date(Date.UTC(y, mo - 1, d)).getUTCDay() + 6) % 7] + '요일';
  for (const l of labels) if (l !== want) bad.push(`${y}-${mo}-${d} 는 ${want} 인데 화면은 「${l}」`);
  return bad;
}

const VISIBLE = `(() => {
  const left = document.documentElement.innerHTML.match(/\\{\\{[A-Z0-9_]+\\}\\}/g) || [];
  const t = document.body ? (document.body.innerText || '') : '';
  return { left: Array.from(new Set(left)), text: t };
})()`;

async function main() {
  checkMasters();

  const eng = await launchBrowser();
  if (!eng) { console.log('SKIP 브라우저 없음 — 렌더 검사를 재지 못했다'); process.exit(fail ? 1 : 2); }
  const port = await freePort();
  const server = await serve(port);
  try {
    for (const p of PAGES) {
      const { page, errors } = await eng.newPage({ port });
      await page.goto(`http://localhost:${port}${p}?e=test-couple`, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout ? await page.waitForTimeout(400) : await new Promise((r) => setTimeout(r, 400));
      let got = { left: [], text: '' };
      try { got = await page.evaluate(VISIBLE); } catch (e) { say(false, `${p} — 읽지 못했다: ${e.message}`); }
      await page.close();

      say(got.left.length === 0, `${p} — 남은 토큰 ${got.left.length}건${got.left.length ? ' · ' + got.left.slice(0, 6).join(' ') : ''}`);
      const bad = BAD.filter(([w]) => got.text.includes(w));
      if (bad.length) for (const [w, why] of bad) say(false, `${p} 렌더 글 — 「${w}」 (${why})`);
      const dow = checkDow(got.text);
      for (const d of dow) say(false, `${p} 날짜·요일 — ${d}`);
      const real = errors.filter((e) => !/favicon|net::ERR/i.test(e));
      if (real.length) say(false, `${p} — pageerror ${real.length}건 · ${real[0].slice(0, 120)}`);
    }
  } finally {
    server.close();
    await eng.close();
  }
  console.log(fail ? '\n[INV_RENDER] 빨강 — 위 줄을 고칠 것' : `\n[INV_RENDER] 통과 — ${PAGES.length}판 렌더 0건 · 날짜·요일 0건 · 원천 0건`);
  process.exit(fail);
}

main().catch((e) => { console.log('SKIP 재지 못했다: ' + e.message); process.exit(2); });
