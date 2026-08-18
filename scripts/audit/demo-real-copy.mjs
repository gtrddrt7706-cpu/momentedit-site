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
  if (e.cantLook) { console.log('· 못 봄(' + e.message + ') — 이 자리에선 재지 않는다. 손으로: node scripts/audit/demo-real-copy.mjs'); stopSrv(); process.exit(0); }
  stopSrv(); throw e;
}
await page.waitForTimeout(700);

const r = await page.evaluate(() => {
  const out = { real: null, done: null, shown: null, stat: null, btn: null };
  /* 실제 화면을 만드는 바로 그 함수를 부른다 — 사본이 아니라 원본이다 */
  try { out.real = window.guestUploadHtml ? guestUploadHtml() : null; } catch (e) { out.real = 'ERR:' + e.message; }
  try { out.done = window.gpDoneMsg ? gpDoneMsg(12) : null; } catch (e) { out.done = 'ERR:' + e.message; }
  const note = document.getElementById('gpNote');
  const stat = document.getElementById('gpStat');
  const btn = document.getElementById('gpPick');
  out.shown = note ? note.innerHTML : null;
  out.stat = stat ? stat.innerHTML : null;
  out.btn = btn ? btn.textContent.trim() : null;
  return out;
});

if (!r.real || String(r.real).startsWith('ERR:')) no('guestUploadHtml 을 못 불렀다 — ' + r.real);
if (!r.done || String(r.done).startsWith('ERR:')) no('gpDoneMsg 를 못 불렀다 — ' + r.done);

if (r.real && !String(r.real).startsWith('ERR:')) {
  /* ① 안내 한 줄 — 실제 함수가 만든 것에서 그 자리만 떼어 표본과 맞춘다.
     ★오늘은 표본이 이 함수를 그대로 그리므로 «항상 같다». 그래도 둔다 —
       미래에 누가 표본용으로 문구를 베껴 넣으면 그 순간부터 이 줄이 진짜 검사가 된다.
       (실측: 결과 줄을 베껴 두었더니 한쪽만 고친 순간 바로 걸렸다) */
  const m = /id="gpNote">([\s\S]*?)<\/div>/.exec(r.real);
  if (!m) no('실제 화면에서 안내 줄(gpNote)을 못 찾았다 — 검사가 낡았다');
  else if (r.shown === null) no('표본에 안내 줄이 없다');
  else if (plain(m[1]) !== plain(r.shown)) {
    no('안내 줄이 다르다\n   실제: ' + plain(m[1]) + '\n   표본: ' + plain(r.shown));
  } else ok('안내 줄이 실제와 같다 — ' + plain(r.shown));

  /* ② 버튼 — 표본은 '올린 뒤' 상태를 보여주므로 실제의 «올린 뒤» 라벨과 같아야 한다 */
  const first = /id="gpPick">([^<]*)</.exec(r.real);
  if (!first) no('실제 화면에서 버튼 라벨을 못 찾았다');
  else if (r.btn === first[1]) {
    no('표본 버튼이 «처음» 라벨이다(' + r.btn + ') — 표본은 12장을 이미 받은 화면이라 어긋난다');
  } else ok('버튼이 올린 뒤 라벨이다 — ' + r.btn + ' (처음 라벨은 ' + first[1] + ')');
}

/* ③ 다 올린 뒤 문구 — 실제와 «글자 그대로» 같아야 한다 */
if (r.done && !String(r.done).startsWith('ERR:')) {
  if (r.stat === null) no('표본에 결과 줄(gpStat)이 없다');
  else if (r.stat !== r.done) no('결과 줄이 다르다\n   실제: ' + r.done + '\n   표본: ' + r.stat);
  else ok('결과 줄이 실제와 같다 — ' + plain(r.stat));
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
