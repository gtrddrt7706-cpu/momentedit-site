/* 표본 화면의 사진 칸이 «실제 화면과 같은 말»을 하는지 재는 자 [DEMO_REAL_COPY]
 *
 * ★왜 만드나 — 2026-08-18 사용자 물음: "이 문구는 실제랑 같은거야?"
 *   표본(?g=demo)은 홍보에 그대로 쓰인다. 홈 목업의 폰 안이 이 화면이고,
 *   고객은 그것을 보고 «내 하객이 볼 화면»이라고 믿는다.
 *   그러니 표본이 실제보다 한 글자라도 후하게 말하면 그건 지키지 못할 약속이 된다.
 *
 * ★어떻게 재나 — 문구를 이 파일에 베껴 적지 않는다(베끼면 이 검사부터 낡는다).
 *   실제 화면을 만드는 **그 함수**(guestUploadHtml · gpDoneMsg)를 페이지 안에서 직접 부르고,
 *   표본이 실제로 그려 놓은 글과 맞춰 본다. 한쪽만 고치면 여기서 걸린다.
 *
 * 쓰는 법: node scripts/audit/demo-real-copy.mjs   (서버는 자가 확인 · page-probe 규약)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openProbe, PORT, serverRooted } from './page-probe.mjs';

/* ★서버는 스스로 띄운다 — merge-guard 안에서 돌 때 사람이 미리 띄워 둘 리가 없다.
   띄우지 않으면 이 검사는 «늘 건너뜀»이 되고, 건너뛴 검사는 없는 검사와 같다.
   이미 떠 있으면(사람이 작업 중이면) 그대로 쓴다. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
let srv = null;
if (!(await serverRooted()).ok) {
  srv = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) {
      res.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
      res.end(fs.readFileSync(f));
    } else { res.statusCode = 404; res.end('nf'); }
  });
  await new Promise((r, j) => { srv.on('error', j); srv.listen(PORT, '127.0.0.1', r); }).catch(() => { srv = null; });
}
const stopSrv = () => { if (srv) try { srv.close(); } catch { /* 이미 닫힘 */ } };

const bad = [];
const no = (m) => { bad.push(m); console.log('✗ ' + m); };
const ok = (m) => console.log('ok ' + m);

/* 태그·공백 차이는 눈에 보이는 글이 아니다 — 사람이 읽는 글로 맞춘다 */
const plain = (html) => html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/* ★브라우저가 없는 자리(CI 등)에서는 «못 봤다»고 말하고 비켜선다 — 통과라고 하지 않는다.
   page-probe 의 cantLook 규약. 안 본 것을 초록으로 세면 그게 늑대가 된다. */
let page, close;
try { ({ page, close } = await openProbe('guide.html?g=demo', { width: 390, height: 900 })); }
catch (e) {
  /* ★종료코드 2 = «안 봤다». 0(초록)과 반드시 갈라야 한다 —
     2026-08-18 실측: CI 에서 브라우저가 없어 건너뛰었는데 가드가 «ok 표본=실제 문구»라고 찍었다.
     170ms 만에 난 초록이었다. 안 본 것을 봤다고 말하는 자가 이 저장소가 가장 경계하는 늑대다. */
  if (e.cantLook) { console.log('· 못 봄(' + e.message + ') — 이 자리에선 재지 않는다. 손으로: node scripts/audit/demo-real-copy.mjs'); stopSrv(); process.exit(2); }
  stopSrv(); throw e;
}
await page.waitForTimeout(700);

const r = await page.evaluate(() => {
  const out = { real: null, done: null, sub: null, hasNote: null, statShown: null, btn: null };
  /* 실제 화면을 만드는 바로 그 함수를 부른다 — 사본이 아니라 원본이다 */
  try { out.real = window.guestUploadHtml ? guestUploadHtml() : null; } catch (e) { out.real = 'ERR:' + e.message; }
  try { out.done = window.gpDoneMsg ? gpDoneMsg(12) : null; } catch (e) { out.done = 'ERR:' + e.message; }
  try { out.sub = typeof GP_DONE_SUB === 'string' ? GP_DONE_SUB : null; } catch (e) { out.sub = null; }
  const stat = document.getElementById('gpStat');
  const btn = document.getElementById('gpPick');
  out.hasNote = !!document.getElementById('gpNote');
  out.statShown = !!(stat && getComputedStyle(stat).display !== 'none' && stat.textContent.trim());
  out.btn = btn ? btn.textContent.trim() : null;
  return out;
});

if (!r.real || String(r.real).startsWith('ERR:')) no('guestUploadHtml 을 못 불렀다 — ' + r.real);
if (!r.done || String(r.done).startsWith('ERR:')) no('gpDoneMsg 를 못 불렀다 — ' + r.done);

if (r.real && !String(r.real).startsWith('ERR:')) {
  /* ① 표본 버튼 = 실제 «처음» 라벨.
     ★2026-08-18 [GP_DONE_SHEET] 로 뒤집힌 검사다. 그전엔 표본이 「12장 전해졌어요」를 미리 띄웠으므로
       «올린 뒤» 라벨이어야 했다. 이제는 미리 그리지 않으니 «처음» 라벨이 맞다.
       검사가 옛 구조를 기대한 채 남아 있으면 그것부터 낡는다 — 구조를 바꿀 때 함께 뒤집는다. */
  const first = /id="gpPick">([^<]*)</.exec(r.real);
  if (!first) no('실제 화면에서 버튼 라벨을 못 찾았다 — 검사가 낡았다');
  else if (r.btn !== first[1]) no('표본 버튼이 실제 «처음» 라벨과 다르다 — 표본 ' + r.btn + ' / 실제 ' + first[1]);
  else ok('버튼이 실제 처음 라벨과 같다 — ' + r.btn);

  /* ② 버튼 아래 정적 안내 줄은 폐지했다(사용자 지시) — 되살아나면 잡는다.
     그 말은 사라진 게 아니라 완료 시트의 본문(GP_DONE_SUB)으로 옮겼다. */
  if (r.hasNote) no('폐지한 안내 줄(gpNote)이 되살아났다 — 완료 시트가 그 말을 맡는다');
  else ok('버튼 아래 정적 안내 줄 없음 (시트가 맡는다)');

  /* ③ 표본은 결과를 «미리 그리지» 않는다 — 누르면 시트가 답한다 */
  if (r.statShown) no('표본이 결과 줄을 미리 띄우고 있다 — 눌러야 나오는 것이 맞다');
  else ok('표본 결과 줄은 비어 있다');
}

/* ④ 완료 문구는 한 곳에서 나온다 — 시트 제목·본문 둘 다 페이지 안의 값과 같아야 한다 */
if (r.done && !String(r.done).startsWith('ERR:')) {
  if (!/\d+장 전해졌어요/.test(r.done)) no('완료 제목 꼴이 바뀌었다 — ' + r.done);
  else if (!r.sub) no('완료 본문(GP_DONE_SUB)이 없다');
  else ok('완료 문구가 한 곳에서 나온다 — 「' + r.done + '」 / 「' + r.sub + '」');
}

/* ④ 표본에만 있어도 되는 것은 «팝업» 하나뿐이다(사용자 지시: "버튼 눌렀을 때만 표본") */
const tip = await page.evaluate(() => ({
  ov: !!document.getElementById('dtipOv'),
  auto: document.getElementById('dtipOv') ? getComputedStyle(document.getElementById('dtipOv')).display : 'n/a',
  marks: document.querySelectorAll('[data-dtip]').length
}));
if (!tip.ov) no('표본 안내 시트가 없다');
else if (tip.auto !== 'none') no('표본 시트가 «저절로» 떠 있다 — 누를 때만 떠야 한다(자동 노출 금지)');
else ok('표본 시트는 눌러야 뜬다 · 붙은 버튼 ' + tip.marks + '개');

await close();
stopSrv();
console.log(bad.length ? `\nDEMO/REAL 문구 불일치 ${bad.length}건` : '\nDEMO REAL COPY OK — 표본이 실제와 같은 말을 한다');
process.exit(bad.length ? 1 : 0);
