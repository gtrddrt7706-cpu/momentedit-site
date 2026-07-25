// 마이페이지 극단·경계 입력 퍼즈 — 서버가 이상한 값을 줘도 화면이 깨지거나 새지 않는지.
//   검사: pageerror · undefined/NaN 노출 · javascript: 링크 · 원문 태그 주입 · 다이얼로그 실행 · 전각 줄표 · 가로 스크롤
//   사용: node scripts/audit/mypage-fuzz.mjs [횟수(기본 200)]
//
//   ★가짜 발견을 만들지 않기 위한 두 가지 규칙(2026-07-26 점검에서 실제로 걸린 함정):
//     ① 주입 문자열에 'null'·'undefined'·'NaN' 리터럴을 넣지 않는다 — 넣으면 '받은 문자열을 정확히 표시'한 화면을 오염으로 오판한다.
//     ② 가로 넘침은 scrollWidth 비교가 아니라 '실제로 가로 스크롤이 되는지'로 본다 — 화면 밖 서랍(AI 상담 패널)이 scrollWidth를 부풀린다.
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const PORT = 8131;
const N = Number(process.argv[2] || 200);

const FLOW = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달', '후기'];
const SNAP = ['신청접수', '촬영확정', '계약완료', '입금완료', '촬영완료', '결과물전달', '후기'];
let seed = 20260726;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const STR = ['', ' ', '<script>alert(1)</script>', '"><img src=x onerror=alert(1)>', 'ㅁ'.repeat(300), '👰🏻‍♀️🤍', '0'];
const NUM = [0, -1, -99999, 0.5, 1e12, NaN, null, undefined, '', 'abc'];
const DATE = ['', '2026-13-45', '0000-00-00', '2026-08-31', '2026-02-29', '1999-01-01', '2099-12-31', 'yesterday', null];

function mk() {
  const isSnap = rnd() < 0.35;
  const list = isSnap ? SNAP : FLOW;
  const si = Math.floor(rnd() * (list.length + 2)) - 1;
  const stage = list[si] !== undefined ? list[si] : pick(['', '취소', '노쇼', '미계약', '알수없음']);
  return {
    ok: true, name: pick(STR), groom: pick(STR), bride: pick(STR),
    product: isSnap ? '웨딩스냅' : pick(['시그니처', '', '알수없는상품']),
    stage, stageList: rnd() < 0.1 ? pick([[], null]) : list, stageIndex: si,
    isException: ['취소', '노쇼', '미계약'].indexOf(stage) >= 0,
    nextAction: pick(STR), code: pick(['QQ63CW', '', null]), kakao: pick(['', 'https://pf.kakao.com/x']),
    consult: rnd() < 0.4 ? { date: pick(DATE), time: pick(['14:00', '', '99:99']) } : null,
    fitting: rnd() < 0.3 ? { status: pick(['대기', '동의요청', '동의완료', '']) } : null,
    contractInfo: null,
    contract: rnd() < 0.5 ? { signed: rnd() < 0.5, expired: rnd() < 0.2, link: pick(['', 'javascript:alert(1)', 'https://x/y']), fill: { weddingDate: pick(DATE) } } : null,
    payment: rnd() < 0.6 ? { confirmed: rnd() < 0.5, midConfirmed: rnd() < 0.5, balConfirmed: rnd() < 0.5, bundle: pick([[], ['중도금'], ['중도금', '잔금']]) } : null,
    midpayment: rnd() < 0.5 ? { confirmed: rnd() < 0.5, dday: pick(NUM), amount: pick(NUM) } : null,
    balance: rnd() < 0.5 ? { confirmed: rnd() < 0.5, dday: pick(NUM), amount: pick(NUM), extra: rnd() < 0.5 ? { amount: pick(NUM), standing: pick(NUM) } : null } : null,
    production: rnd() < 0.4 ? { base: { groomKo: pick(STR), weddingDate: pick(DATE) }, tracks: {} } : null,
    invitation: rnd() < 0.3 ? { status: pick(['', '발행', '안 함']) } : null,
    result: rnd() < 0.7 ? {
      status: pick(['대기', '원본전달', '선택완료', '보정중', '컨펌대기', '컨펌완료', '전달완료', '알수없음', null]),
      delivered: rnd() < 0.5, isSnap, survey: { status: pick(['대기', '완료', '건너뜀', '']) }, 전달일: pick(DATE),
      원본: pick(['', 'https://drive.google.com/drive/folders/A', 'javascript:alert(1)']),
      보정본: pick(['', 'https://drive.google.com/drive/folders/B', 'javascript:alert(2)']),
      영상: pick(['', 'https://vimeo.com/1']),
      선택: pick(STR), 선택수: pick(NUM), 포함컷: pick(NUM), 추가단가: pick(NUM),
      extra: { status: pick(['대기', '신청', '견적', '결제대기', '완료']), 수량: pick(NUM), 금액: pick(NUM) },
    } : null,
    coupon: rnd() < 0.2 ? { status: pick(['발급', '회수', '']), data: pick(['', 'data:image/png;base64,xxx']), 기한: pick(DATE) } : null,
    ledger: null, refund: rnd() < 0.2 ? { amount: pick(NUM), rate: pick(NUM) } : null,
    change: null, hold: rnd() < 0.25 ? { date: pick(DATE), approved: rnd() < 0.5, expires: pick(DATE) } : null,
    refundBank: null, payPolicy: { balanceDays: pick([9, 0, -3]), midDays: pick([149, 0]) }, waiting: pick(STR),
  };
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch {} });

async function main() {
  await new Promise((r) => setTimeout(r, 1200));
  const eng = await launchBrowser();
  if (!eng) { console.log('브라우저 엔진 없음 — 건너뜀'); return; }
  const { page } = await eng.newPage({ port: PORT, viewport: { width: 390, height: 1200 } });
  const issues = [];
  let CUR = null, perr = [], alerted = false;
  page.on('pageerror', (e) => perr.push(String(e.message)));
  page.on('dialog', async (d) => { alerted = true; try { await d.dismiss(); } catch {} });
  await page.route('**script.google.com**', async (route) => {
    let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch {}
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(b.action === 'getMyState' ? CUR : { ok: true }) });
  });
  await page.addInitScript(() => { try { localStorage.setItem('me_token', 'T'); } catch (e) {} });

  for (let i = 0; i < N; i++) {
    CUR = mk(); perr = []; alerted = false;
    await page.goto(`http://localhost:${PORT}/mypage.html?f=${i}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(160);
    const r = await page.evaluate(() => {
      const t = document.body.innerText;
      const m = t.match(/.{0,26}(undefined|\bNaN\b|\[object )[^\n]{0,16}/);
      return {
        pol: m && m[0].replace(/\n/g, '⏎'),
        badHref: [...document.querySelectorAll('a[href]')].filter((a) => /^javascript:/i.test(a.getAttribute('href') || '')).length,
        rawTag: document.body.innerHTML.indexOf('<script>alert(1)</script>') >= 0,
        dash: t.indexOf('—') >= 0,
        scrollX: (() => { window.scrollTo(200, 0); const x = window.scrollX || 0; window.scrollTo(0, 0); return x > 2; })(),
      };
    });
    const tag = `#${i} ${CUR.product}/${CUR.stage}/${CUR.result && CUR.result.status}`;
    if (perr.length) issues.push(`[pageerror] ${tag} :: ${perr[0].slice(0, 110)}`);
    if (r.pol) issues.push(`[오염] ${tag} :: ${r.pol}`);
    if (r.badHref) issues.push(`[링크스킴] ${tag} :: javascript: href ${r.badHref}건`);
    if (r.rawTag) issues.push(`[태그주입] ${tag}`);
    if (alerted) issues.push(`[스크립트실행] ${tag}`);
    if (r.dash) issues.push(`[전각줄표] ${tag}`);
    if (r.scrollX) issues.push(`[가로스크롤] ${tag}`);
  }
  console.log(`마이페이지 퍼즈 ${N}회`);
  if (!issues.length) console.log('  결과 — 발견 0건');
  else {
    const u = [...new Set(issues)];
    const tally = {}; u.forEach((x) => { const k = (x.match(/^\[[^\]]+\]/) || ['?'])[0]; tally[k] = (tally[k] || 0) + 1; });
    console.log(`  결과 — 발견 ${issues.length}건(고유 ${u.length}) · ${JSON.stringify(tally)}`);
    u.slice(0, 12).forEach((x) => console.log('   - ' + x));
  }
  await eng.close?.();
  process.exit(issues.length ? 1 : 0);
}
main();
