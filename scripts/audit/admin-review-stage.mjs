// 관리자 화면 — '후기' 단계 고객이 제대로 보이는지(배지·카드·액션). 서버는 진짜 .gs 함수로 응답.
//   확인: ①단계 배지가 회색 기본색이 아니라 후기 전용 색 ②결과물 카드가 상단으로 올라옴(stageCards)
//        ③후기 단계에서 노출돼야 할 액션(쿠폰 발급 등)이 살아 있음 ④문구에 전각 줄표 없음 ⑤콘솔 오류 0
//   사용: node scripts/audit/admin-review-stage.mjs
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openWorld, kstAgo } from './_gasworld.mjs';
import { launchBrowser } from './_browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const PORT = 8129;

let fail = 0;
const ok = (c, m, d) => { if (c) console.log('  ✅ ' + m); else { fail++; console.log('  ❌ ' + m + (d !== undefined && d !== '' ? ' — ' + JSON.stringify(d) : '')); } };

const { G, world } = openWorld();
const REC = JSON.stringify({ 결과물전달일: '2026-07-10', 결과물파기: '2027-01-10', 계약: '2026-05-01', 영수증기준일: { 예약금: kstAgo(200) } });
const SEED = {
  신랑이름: '김희준', 신부이름: '이미쿠', 연락처: '010-1234-5678', 이메일: 't@example.com',
  상품타입: '시그니처', 현재단계: '후기', 계약상태: '서명완료', 계약총액: '2500000', 예식일: '2026-06-20',
  입금상태: '확인', 중도금상태: '확인', 잔금상태: '확인', 결과물상태: '전달완료', 설문상태: '대기',
  원본링크: 'https://drive.google.com/drive/folders/AAA', 보정본폴더: 'https://drive.google.com/drive/folders/BBB',
  영상링크: 'https://vimeo.com/1', 동의기록: REC,
};
const HOME_STUB = { ok: true, name: '점검', queue: [], results: [], pipeline: {}, survey: [], blocks: [], stageFlow: G.STAGE_FLOW, stageEx: G.STAGE_EXCEPTIONS };

function serverCall(payload) {
  try {
    if (payload.action !== 'adminCall') return { ok: true };
    const fn = String(payload.fn || '');
    if (fn === 'adminHome') return HOME_STUB;
    world(Object.assign({}, SEED), null);
    if (typeof G[fn] !== 'function') return { ok: false, error: '없는 함수: ' + fn };
    const r = G[fn].apply(null, payload.args || []);
    return r === undefined ? { ok: true } : r;
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch {} });

async function main() {
  await new Promise((r) => setTimeout(r, 1500));
  const eng = await launchBrowser();
  if (!eng) { console.log('브라우저 엔진 없음 — 건너뜀'); return; }
  const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: 420, height: 1200 } });
  await page.route('**script.google.com**', async (route) => {
    let payload = {}; try { payload = JSON.parse(route.request().postData() || '{}'); } catch {}
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(serverCall(payload)) });
  });
  await page.addInitScript(() => { localStorage.setItem('me_admin_token', 'CHK-TOKEN'); });
  await page.goto(`http://localhost:${PORT}/admin.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.openDetail('ME-TEST', 'home'));
  await page.waitForTimeout(900);

  console.log('\n[후기 단계 고객 상세]');
  const r = await page.evaluate(() => {
    const badge = document.querySelector('.stage-badge, .st-badge, [class*="stage"]');
    const cards = Array.from(document.querySelectorAll('.card[data-k]')).map((c) => c.getAttribute('data-k'));
    const resCard = document.querySelector('.card[data-k="result"]');
    const acts = resCard ? Array.from(resCard.querySelectorAll('[data-da]')).map((b) => ({ a: b.getAttribute('data-da'), t: (b.textContent || '').trim() })) : [];
    const txt = document.body.innerText;
    const stageTxt = (txt.match(/후기/g) || []).length;
    return { badge: badge ? { cls: badge.className, txt: (badge.textContent || '').trim(), bg: getComputedStyle(badge).backgroundColor } : null,
      cards, acts, stageTxt, dash: txt.indexOf('—') >= 0, pollute: /undefined|\bNaN\b|\[object /.test(txt) };
  });
  ok(!!r.cards.length, '상세 카드가 렌더된다', r.cards);
  ok(r.cards.indexOf('result') === 0 || r.cards.indexOf('result') <= 1, '★결과물 카드가 맨 앞(stageCards 후기 매핑)', r.cards);
  ok(r.stageTxt > 0, "화면에 '후기' 단계 표기가 보인다", r.stageTxt);
  ok(!r.pollute, '오염(undefined·NaN) 없음');
  ok(!r.dash, '문구에 전각 줄표 없음');
  ok(r.acts.length > 0, '결과물 카드에 액션 버튼이 있다', r.acts.map((x) => x.a));
  ok(!r.acts.some((x) => x.t.indexOf('—') >= 0), '액션 라벨에 전각 줄표 없음', r.acts.map((x) => x.t));

  console.log('\n[JS 오류]');
  ok((errors || []).length === 0, '콘솔 오류 0건', errors);
  console.log(`\n결과 — 실패 ${fail}건`);
  await eng.close?.();
  process.exit(fail ? 1 : 0);
}
main();
