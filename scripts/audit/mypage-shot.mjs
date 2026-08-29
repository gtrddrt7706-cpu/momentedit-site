// 마이페이지 화면 눈확인 하네스 — renderMyPage()를 대표 단계별로 직접 호출해 실제 화면을 찍고,
//   화면에 실제로 뜬 '텍스트'를 규칙(전각 줄표 금지 · 장식 이모지 절제 · NaN/undefined 노출 금지)으로 검사한다.
//   deliv-matrix.mjs가 '결과물 여정 정합'만 본다면, 이쪽은 여정 전체를 훑어 눈으로 볼 스크린샷을 남기는 쪽.
//   사용: node scripts/audit/mypage-shot.mjs      (스크린샷 → scripts/audit/_shots/mp-*.png)
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const OUT = path.join(HERE, '_shots');
const PORT = 8124;

// CLAUDE.md 문구 규칙: 고객 화면 장식 이모지 금지. 허용은 감정 정점 1곳(🤍)과 기능 아이콘뿐.
const EMOJI_OK = ['🤍', '🍽', '🍃', '🔊', '🎵', '⚠', '★', '✓'];
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

// STAGE_FLOW(00_platform-config.gs) 그대로 — 끝의 '후기' 포함(빼면 스텝 수가 어긋난다)
const SIG = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달', '후기'];
const SNAP = ['신청접수', '촬영확정', '계약완료', '입금완료', '촬영완료', '결과물전달', '후기'];

const base = (stage, extra) => Object.assign({
  name: '김희준 · 이미쿠', product: '시그니처', code: 'ME-SHOT',
  stage: stage, stageIndex: SIG.indexOf(stage), stageList: SIG.slice(),
  nextAction: '다음 할 일을 안내해 드릴게요.',
  contract: null, payment: { confirmed: false },
  result: null, production: null, isException: false,
}, extra || {});

// ★contract는 서버(buildContractState·70_journey.gs)가 '발송' 또는 '서명완료'일 때만 객체를 준다 —
//   {signed:false}를 아무 단계에나 주면 실제로 생길 수 없는 화면(NOW만 '계약서가 도착했어요')이 나온다. 시드를 서버 계약과 맞출 것.
const SENT = { signed: false, expired: false, deadlineKst: '2026-07-28 18:00', remainingSec: 86400, link: '' };
const CASES = [
  { f: 'mp-1-상담확정.png', label: '상담확정 · 시착 안내 전', s: base('상담확정') },
  { f: 'mp-2-계약서명대기.png', label: '상담완료 · 계약서 발송 후 서명 대기', s: base('상담완료', { contract: SENT }) },
  { f: 'mp-3-제작중.png', label: '제작중 · 예식 준비 카드', s: base('제작중', { contract: { signed: true }, payment: { confirmed: true }, weddingDate: '2026-10-26' }) },
  { f: 'mp-3b-계약금대기.png', label: '계약완료 · 계약금 입금 대기', s: base('계약완료', { contract: { signed: true } }) },
  { f: 'mp-4-원본전달.png', label: '결과물전달 · 원본 도착', s: base('결과물전달', { contract: { signed: true }, payment: { confirmed: true },
      result: { stage: '결과물전달', status: '원본전달', delivered: true, survey: { status: '' }, extra: {}, isSnap: false, 원본: 'https://example.com/o', 보정본: '', 선택수: 0, 포함컷: 10 } }) },
  { f: 'mp-5-전달완료.png', label: '전달완료 · 후기 대기', s: base('결과물전달', { contract: { signed: true }, payment: { confirmed: true },
      result: { stage: '결과물전달', status: '전달완료', delivered: true, survey: { status: '' }, extra: {}, isSnap: false, 원본: 'https://example.com/o', 보정본: 'https://example.com/r', 선택수: 10, 포함컷: 10 } }) },
  /* ★[TRK_TAP44] 아래 tap 검사가 **잴 것이 있으려면** 예식 준비 카드가 그려지는 상태가 하나는 있어야 한다.
     추가 전에는 여섯 케이스 모두 production 이 없어 `.trk-act` 가 0개였고, 검사가 늘 초록인 죽은 검사였다
     (돌연변이로 히트영역 규칙을 둘 다 죽여도 초록이었다 — 그래서 이 케이스를 만든다). */
  { f: 'mp-7-제작중-준비카드.png', label: '제작중 · 예식 준비 카드(행 버튼)', s: base('제작중', { contract: { signed: true }, payment: { confirmed: true }, weddingDate: '2026-10-26',
      invitation: { status: '완료', draft: { method: 'both', designOnline: '05', designFamily: '05' }, published: { eventId: 'e', urls: {} } },
      production: { entered: true, base: { groomKo: '희준', brideKo: '미쿠', weddingDate: '2026-10-26', weddingTime: '13:20' },
        tracks: { invitation: '완료', dining: '완료', ritual: '완료', final: '완료', seat: '완료' },
        ritualDraft: { _v: 3, summary: { course: '담백', count: 7, min: '약 19분', flow: [] }, S: {} },
        diningDraft: { dining_on: 'Y', venue: '잔치연' }, finalDraft: { headcount: '6', standing: 0, extraFee: 0, drink: '샴페인' },
        seatDraft: { tables: [{ name: 'A', seats: ['가', '나', '다', '라', '마', '바'], drinks: ['C', 'C', 'C', 'C', 'N', 'K'] }] },
        guideinfoDraft: { seatMode: 'all' }, guideToken: 'tok', confirm: null, confirmStale: false, rev: 'r', trackRevs: {} } }) },
  { f: 'mp-6-스냅-촬영확정.png', label: '웨딩스냅 · 촬영확정(계약서 발송 후)', s: Object.assign(base('촬영확정'), { product: '웨딩스냅', stageList: SNAP.slice(), stageIndex: SNAP.indexOf('촬영확정'), contract: SENT }) },
];

let fail = 0;
const ok = (cond, msg, detail) => { console.log(`  ${cond ? '✅' : '❌'} ${msg}${cond || !detail ? '' : ' → ' + detail}`); if (!cond) fail++; };

fs.mkdirSync(OUT, { recursive: true });
const eng = await launchBrowser();
if (!eng) { console.log('mypage-shot 건너뜀 — playwright·puppeteer 미설치.'); process.exit(0); }
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

try {
  const { page, errors } = await eng.newPage({ port: PORT });
  await page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 900));

  for (const c of CASES) {
    console.log(`\n[${c.label}]`);
    const view = await page.evaluate((st) => {
      show('mypageView');
      renderMyPage(st);
      const v = document.getElementById('mypageView');
      return { text: (v.innerText || '').replace(/ /g, ' '), h: v.scrollHeight };
    }, c.s).catch((e) => ({ text: 'THROW ' + String(e).slice(0, 120), h: 0 }));

    ok(view.text.indexOf('THROW') !== 0, '렌더가 예외 없이 끝난다', view.text.slice(0, 120));
    ok(!/NaN|undefined|\[object Object\]/.test(view.text), 'NaN·undefined·[object Object] 노출 없음',
      (view.text.match(/.{0,30}(NaN|undefined|\[object Object\]).{0,30}/) || [''])[0]);
    ok(view.text.indexOf('—') === -1, '전각 줄표(—) 없음',
      (view.text.match(/.{0,30}—.{0,30}/) || [''])[0]);
    const bad = [...new Set((view.text.match(EMOJI_RE) || []).filter((e) => EMOJI_OK.indexOf(e) === -1))];
    ok(bad.length === 0, '허용 밖 장식 이모지 없음', bad.join(' '));

    /* ★[TRK_TAP44 2026-08-17 · 폭별 실측 감사가 짚은 취약 구조] 행 버튼은 **보이는 크기 36px · 누르는 자리 44px** 다.
       그런데 그 44px 는 `.trk-act::after`(inset:-4px 0)와 `.cc-btn-ghost::after`(top:50%/height:44px)가
       같은 특이도로 겹친 결과라, **규칙 순서가 바뀌면 조용히 36px 로 떨어진다.**
       크기가 줄어도 화면은 멀쩡해 보여 사람 눈으로는 못 잡는다 — 실좌표로 눌러 본다(위·아래 4px 지점). */
    const tap = await page.evaluate(() => {
      const out = []; let seen = 0;
      /* ★스크롤을 즉시로 바꿔 두고 잰다 — `html{scroll-behavior:smooth}` 때문에 애니메이션 도중 좌표를 읽으면
         멀쩡한 버튼도 '뷰포트 밖'으로 잡혀 거짓 실패가 난다(첫 판에서 실제로 그렇게 났다). */
      const _sb = document.documentElement.style.scrollBehavior; document.documentElement.style.scrollBehavior = 'auto';
      document.querySelectorAll('#mp_production .trk-act').forEach((b) => {
        seen++;
        b.scrollIntoView({ block: 'center' });
        const r = b.getBoundingClientRect(); if (!r.width) return;
        const x = Math.round(r.left + r.width / 2);
        const hit = (y) => { const e = document.elementFromPoint(x, y); return !!(e && (e === b || b.contains(e) || e.parentNode === b)); };
        if (!hit(Math.round(r.top - 3)) || !hit(Math.round(r.bottom + 3))) out.push((b.textContent || '').trim() + ' ' + Math.round(r.height) + 'px');
      });
      document.documentElement.style.scrollBehavior = _sb;
      return { out: out, seen: seen };
    }).catch((e) => ({ out: ['THROW ' + String(e).slice(0, 60)], seen: -1 }));
    /* ★잴 것이 0개면 **통과가 아니다** — 그 상태는 이 검사의 대상이 아니라고 말하고 넘어간다.
       (0개를 조용히 통과로 세는 순간 죽은 검사가 된다. 실제로 그렇게 만들었다가 돌연변이로 들켰다) */
    if (tap.seen === 0) console.log('  · 행 버튼 없는 화면 — [TRK_TAP44] 대상 아님');
    else ok(tap.seen > 0 && tap.out.length === 0, `행 버튼 ${tap.seen}개의 누르는 자리가 44px로 남아 있다 [TRK_TAP44]`, tap.out.join(' / '));

    await page.screenshot({ path: path.join(OUT, c.f), fullPage: true });
    console.log(`  📸 ${c.f}`);
  }

  console.log('\n[JS 오류]');
  const real = errors.filter((e) => !/favicon|net::ERR/.test(e));
  ok(real.length === 0, '콘솔 오류 0건', real.slice(0, 3).join(' | '));

  await page.close();
  await eng.close();
} finally { server.kill(); }

console.log(fail ? `\n결과 — 실패 ${fail}건` : '\n결과 — 실패 0건 (전부 통과)');
process.exit(fail ? 1 : 0);
