/* ★[SNAP_WORD 2026-09-13 점검 라운드 2] 웨딩스냅 고객에게 «예식»이라 말하지 않는다.
 *
 * ── 왜 (실측이 근거다)
 *   api/_kb.js 22행: 「평일 웨딩스냅(**촬영만**): … 60~90분 프라이빗 촬영」.
 *   웨딩스냅에는 우리가 진행하는 예식이 없다. 그런데 여정 로드맵의 결과물 줄 부제가
 *   두 갈래에 **같은 문장으로 복사**돼 있어, 스냅 고객이 여덟 화면 중 **다섯**에서
 *   「예식 후 · 마이페이지에서 확인」을 읽고 있었다(2026-09-13 렌더 실측).
 *   바로 그 갈림(mypage.html `product === '웨딩스냅'`)은 촬영 단계는 「촬영 · 예정일에 진행」으로
 *   옳게 부르고 있었다 — 두 벌 중 한 벌만 고친 전형이다.
 *
 * ── 무엇을 하나
 *   스냅 여정 전 단계를 **실제로 렌더해** 화면 글자에서 「예식」을 센다. 코드를 읽지 않는다
 *   (mypage 는 _payWord·isSnap 분기가 스물아홉 곳이라, 어느 분기가 화면에 닿는지는 렌더로만 확정된다).
 *
 * 종료코드: 0 통과 · 1 스냅 화면에 «예식» 이 있다 · 2 브라우저가 없어 못 쟀다
 * 쓰기: node scripts/audit/snap-word.mjs
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 8489;
const SNAP = ['신청접수', '촬영확정', '계약완료', '입금완료', '촬영완료', '결과물전달', '후기'];

const base = (stage, extra) => Object.assign({
  name: '김희준 · 이미쿠', product: '웨딩스냅', code: 'ME-SNAPWORD',
  stage, stageIndex: SNAP.indexOf(stage), stageList: SNAP.slice(),
  nextAction: '다음 할 일을 안내해 드릴게요.', contract: null, payment: { confirmed: false },
  result: null, production: null, isException: false,
}, extra || {});
const res = (status, done) => ({ stage: '결과물전달', status, delivered: true, survey: { status: '' }, extra: {},
  isSnap: true, 원본: 'https://x/o', 보정본: done ? 'https://x/r' : '', 선택수: done ? 10 : 0, 포함컷: 10 });
const SIGNED = { contract: { signed: true }, payment: { confirmed: true } };

const CASES = [
  ['신청접수', base('신청접수')],
  ['촬영확정', base('촬영확정')],
  ['계약완료', base('계약완료', { contract: { signed: true } })],
  ['입금완료', base('입금완료', SIGNED)],
  ['촬영완료', base('촬영완료', SIGNED)],
  ['결과물전달 · 원본', base('결과물전달', { ...SIGNED, result: res('원본전달', 0) })],
  ['결과물전달 · 전달완료', base('결과물전달', { ...SIGNED, result: res('전달완료', 1) })],
  ['후기', base('후기', { ...SIGNED, result: res('전달완료', 1) })],
];

/* ★«예식»이 들어가도 되는 자리 — 있으면 여기에 이유와 함께 적는다(지금은 없다).
     예: 스냅 고객이 시그니처를 «안내»받는 문장이 생기면 그건 예식이 맞다. */
const ALLOW = [];

const eng = await launchBrowser();
if (!eng) { console.log('· 브라우저가 없어 이번에 아무것도 재지 못했습니다(화면 결함이 아닙니다). 종료 2 = 못 쟀다'); process.exit(2); }
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch {} });
await new Promise(r => setTimeout(r, 1500));

let bad = 0, seen = 0;
try {
  const { page } = await eng.newPage({ port: PORT, viewport: { width: 390, height: 900 } });
  await page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 900));
  for (const [label, st] of CASES) {
    const hits = await page.evaluate((s) => {
      show('mypageView'); renderMyPage(s);
      const t = (document.getElementById('mypageView').innerText || '');
      return [...new Set((t.match(/[^\n]*예식[^\n]*/g) || []).map(x => x.trim()))];
    }, st).catch(e => ['THROW ' + String(e).slice(0, 80)]);
    const left = hits.filter(h => !ALLOW.some(a => h.indexOf(a) !== -1));
    seen++;
    if (left.length) { bad += left.length; console.log(`  ✗ 스냅 · ${label} — 「예식」 ${left.length}줄`); left.forEach(h => console.log(`      ${h.slice(0, 80)}`)); }
    else console.log(`  ok 스냅 · ${label}`);
  }
  await page.close();
} finally { await eng.close(); try { server.kill(); } catch {} }

console.log(`\n[SNAP_WORD] 스냅 화면 ${seen}개 — 「예식」 ${bad}줄`);
if (bad) console.log('  웨딩스냅은 «촬영만» 상품이다(api/_kb.js 22행). 그 고객에게 우리가 하는 예식은 없다 — 「촬영」으로 부른다.');
process.exit(bad ? 1 : 0);
