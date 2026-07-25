// 결과물 여정 정합 매트릭스 감사 — 단계(예식완료/촬영완료/결과물전달) × 결과물상태 7종 × 상품 2종 = 32조합을
//   실제 mypage 렌더로 돌려 진행바 제목(STEP)·NOW 헤드·대기 카드 제목이 서로 모순 없는지 검사한다.
//   2026-07 실사고에서 출발: 결과물전달 진입 직후 '후기 11/11' 점프 · 카드 "예식이 무사히 끝났어요" 톤 불일치.
//   기대값은 DELIV_STEP_HONEST · DELIV_FLOW_STEP · DELIV_WAIT_TITLE 마커의 합의 동작과 세트다 —
//   그 동작을 의도적으로 바꾸면 이 스크립트의 기대값도 같은 커밋에서 갱신할 것(merge-guard: DELIV_MATRIX).
//   사용: node scripts/audit/deliv-matrix.mjs   (playwright 우선 · puppeteer 폴백 · 둘 다 없으면 건너뜀 안내)
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 8112;

const eng = await launchBrowser();
if (!eng) {
  console.log('deliv-matrix 건너뜀 — playwright·puppeteer 미설치. `npm i puppeteer` 후 다시 실행하세요.');
  process.exit(0);
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

let fail = 0;
try {
  const { page, errors } = await eng.newPage({ port: PORT });
  await page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 900));

  const rows = await page.evaluate(() => {
    const SIG = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달'];
    const SNAP = ['신청접수', '촬영확정', '계약완료', '입금완료', '촬영완료', '결과물전달'];
    const FLOW = ['원본전달', '선택완료', '보정중', '컨펌대기', '컨펌완료'];
    const out = [];
    const combos = [];
    [['시그니처', SIG, '예식완료'], ['시그니처', SIG, '결과물전달'], ['웨딩스냅', SNAP, '촬영완료'], ['웨딩스냅', SNAP, '결과물전달']].forEach(function (pc) {
      ['대기'].concat(FLOW).concat(['전달완료']).forEach(function (st) {
        combos.push({ product: pc[0], list: pc[1], stage: pc[2], rs: st, sv: '' });
        if (st === '전달완료') combos.push({ product: pc[0], list: pc[1], stage: pc[2], rs: st, sv: '완료' });
      });
    });
    combos.forEach(function (c) {
      const delivered = (c.stage === '결과물전달');
      const isSnap = (c.product === '웨딩스냅');
      try {
        show('mypageView');
        renderMyPage({
          name: '검사', product: c.product, code: 'ME-MTX', stage: c.stage, stageIndex: c.list.indexOf(c.stage), stageList: c.list.slice(),
          nextAction: 'x.',
          result: {
            stage: c.stage, status: c.rs, delivered: delivered, survey: { status: c.sv }, extra: {}, isSnap: isSnap,
            원본: (['대기'].indexOf(c.rs) < 0 ? 'https://x/o' : ''), 보정본: (FLOW.slice(3).concat(['전달완료']).indexOf(c.rs) >= 0 ? 'https://x/r' : ''),
            선택수: 8, 포함컷: 10,
          },
          production: null, contract: { signed: true }, payment: { confirmed: true }, isException: false,
        });
        const $id = (i) => document.getElementById(i);
        const stepNow = $id('mp_stageNow').textContent;
        const stepCnt = $id('mp_stageCount').textContent;
        const nowHead = $id('mp_nowHead').textContent;
        const res = $id('mp_result');
        const cardTxt = (res && getComputedStyle(res).display !== 'none') ? res.innerText.replace(/\s+/g, ' ') : '';
        // ── 기대값(마커 합의 동작) ──
        const svDone = (c.sv === '완료' || c.sv === '건너뜀');
        let expStep;
        if (c.rs === '전달완료') expStep = svDone ? '여정 완료' : '후기';
        else if (delivered || FLOW.indexOf(c.rs) >= 0) expStep = '결과물 전달';
        else expStep = isSnap ? '촬영' : '예식 완료';
        const probs = [];
        if (stepNow !== expStep) probs.push('STEP "' + stepNow + '" (기대 "' + expStep + '")');
        if (/NaN|undefined/.test(stepCnt + stepNow + nowHead)) probs.push('NaN/undefined 노출');
        if (c.rs === '대기') {
          if (nowHead !== '결과물을 준비하고 있어요') probs.push('NOW "' + nowHead + '"');
          const expCard = delivered ? '그날의 기록을 준비하고 있어요' : ((isSnap ? '촬영' : '예식') + '이 무사히 끝났어요');
          if (cardTxt.indexOf(expCard) < 0) probs.push('대기 카드 제목 누락: "' + expCard + '"');
        }
        if (c.rs === '원본전달' && nowHead !== '원본이 도착했어요') probs.push('NOW "' + nowHead + '"');
        if (c.rs === '전달완료' && !svDone && nowHead !== '마지막으로 후기를 들려주세요') probs.push('NOW "' + nowHead + '"');
        if (c.rs === '전달완료' && svDone && nowHead !== '모든 순간이 마무리됐어요') probs.push('NOW "' + nowHead + '"');
        out.push({ label: c.product.slice(0, 2) + '/' + c.stage + '/' + c.rs + (c.sv ? '/설문완료' : ''), probs: probs });
      } catch (e) {
        out.push({ label: c.product + '/' + c.stage + '/' + c.rs, probs: ['THROW ' + String(e).slice(0, 80)] });
      }
    });
    return out;
  });

  for (const r of rows) {
    if (r.probs.length) { fail++; console.log('  ❌ ' + r.label + ' → ' + r.probs.join(' · ')); }
  }
  if (errors.length) { fail++; console.log('  ❌ pageerror: ' + errors.slice(0, 3).join(' | ')); }
  console.log(`\n결과 — ${rows.length}조합 중 불일치 ${fail}건` + (fail ? '' : ' (전부 정합)'));
  await page.close();
  await eng.close();
} finally { server.kill(); }

process.exit(fail ? 1 : 0);
