// 미리듣기 진입점 실렌더 점검 [PREVIEW_LINK_V1]
//   고객이 「미리 들어보기」를 누르는 자리는 둘이다 — order-preview.html 완성 화면, mypage.html 식순 행.
//   둘 다 오버레이 iframe 으로 /console.html?mode=preview&embed=1&S=… 를 연다.
//
//   $ node scripts/audit/preview-entry.mjs
//
// ★왜 화면을 실제로 띄우는가
//   이 변경의 위험은 '안 보이는 것'이 아니라 '조용히 어긋나는 것' 셋이다:
//     ① 고객이 쓴 글(서약문·편지)이 주소에 실려 방문기록에 남는다 — 주소는 화면이 만들 때만 진짜다.
//     ② 오버레이를 닫았는데 배경 스크롤 잠금이 안 풀린다(mypage `_mpLockReconcile` 리팩터 · 실기기 굳음 재발).
//     ③ 빌더의 Esc('저장 후 나가기')가 미리듣기 Esc 를 가로채 듣다 말고 통째로 닫힌다(embed 경로만).
//   셋 다 코드를 읽어서는 안 잡히고, 열고 닫아 봐야 잡힌다.
//
// ※소리는 검사하지 않는다 — 이 하네스는 소리를 듣지 못한다. 화면·DOM·주소·JS오류만 본다.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const PORT = 8127;
const VIEWPORTS = [
  { n: 'm390', viewport: { width: 390, height: 844 } },
  { n: 'd1280', viewport: { width: 1280, height: 900 } },
];

// ★주소에 절대 실리면 안 되는 값 — ritual-preview-link.js 의 NEVER 와 같은 목록.
//   저쪽은 '목록(KEYS)'을 검사하고, 여기는 '실제로 만들어진 주소'를 검사한다.
//   같은 규칙을 두 번 적는 게 아니라, 선언과 결과를 각각 본다(선언이 맞아도 조립이 틀릴 수 있다).
const NEVER = ['vowText', 'letterText', 'welcomeText', 'up', 'mPeak', 'mClose', 'growthLink'];
// 화면이 실제로 심어 둔 '고객이 쓴 글' — 주소 문자열 어디에도 이 조각이 없어야 한다(키가 아니라 값으로도 확인).
const SECRET = { vowText: '서약원문비밀ZZQ', letterText: '편지원문비밀ZZQ', welcomeText: '첫인사원문ZZQ', mPeak: '곡명비밀ZZQ' };

let fail = 0;
const ok = (cond, msg, detail) => {
  console.log(`  ${cond ? '✅' : '❌'} ${msg}${cond || !detail ? '' : ' → ' + detail}`);
  if (!cond) fail++;
};

// 주소에서 S 를 풀어 본다 — enc()는 btoa(unescape(encodeURIComponent(json))) 이므로 base64→utf8 로 되돌린다.
function decodeS(src) {
  const q = String(src || '').split('?')[1] || '';
  const raw = new URLSearchParams(q).get('S');
  if (!raw) return null;
  return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
}

function checkUrl(where, src) {
  ok(/^\/console\.html\?mode=preview&embed=1&S=/.test(src || ''), `${where} 주소 형태가 미리듣기(mode=preview·embed=1)`, String(src).slice(0, 80));
  for (const [k, v] of Object.entries(SECRET)) {
    ok(String(src).indexOf(encodeURIComponent(v)) < 0 && String(src).indexOf(v) < 0, `${where} 주소에 ${k} 값이 없다`);
  }
  let S = null;
  try { S = decodeS(src); } catch (e) { S = null; }
  ok(!!S, `${where} 주소의 S 가 풀린다`);
  if (!S) return null;
  const leak = NEVER.filter((k) => S[k] !== undefined);
  ok(leak.length === 0, `${where} S 에 고객이 쓴 글이 없다`, leak.join(','));
  return S;
}

const eng = await launchBrowser();
if (!eng) { console.log('preview-entry 건너뜀 — playwright·puppeteer 미설치.'); process.exit(0); }
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

try {
  for (const V of VIEWPORTS) {
    // ── A. order-preview 완성 화면(임베드) ────────────────────────────────
    //   embed=1 로 연다 — 빌더의 전역 Esc 핸들러가 이 블록 안에만 있어, 독립 열람으로는 ③을 못 잡는다.
    {
      console.log(`\n[${V.n}] order-preview 완성 화면 · embed=1`);
      const { page, errors } = await eng.newPage({ port: PORT, viewport: V.viewport });
      await page.goto(`http://localhost:${PORT}/order-preview.html?embed=1`, { waitUntil: 'load' });
      await new Promise((r) => setTimeout(r, 700));

      // 고객이 코스를 고르고 글까지 적어 완성 화면에 선 상태를 만든다(글은 주소에 새면 안 되는 값이다)
      await page.evaluate((sec) => {
        // [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
        S.course = 'gamdong'; S.letter = 'both'; S.bless = 'on'; S.ring = 'on';
        for (const k in sec) S[k] = sec[k];
        courseStarted = true;
        buildSteps();
        STEPS.forEach(function (s) { _seenK[s.k] = 1; });
        idx = STEPS.length - 1;
        render();
      }, SECRET);
      await new Promise((r) => setTimeout(r, 300));

      const btn = await page.evaluate(() => {
        const b = [].slice.call(document.querySelectorAll('button.rehearse-btn'))
          .filter((x) => x.textContent.trim() === '미리 들어보기')[0];
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return { w: r.width, right: r.right, vw: window.innerWidth, hint: (b.nextElementSibling || {}).textContent || '' };
      });
      ok(!!btn, '완성 화면에 「미리 들어보기」가 선다');
      if (btn) {
        ok(btn.w > 0 && btn.right <= btn.vw + 0.5, '버튼이 화면 폭 안에 들어온다', btn ? `right=${btn.right} vw=${btn.vw}` : '');
        ok(/소리로 들어봐요/.test(btn.hint), '버튼 아래 한 줄 안내가 붙는다', btn.hint.slice(0, 40));
      }

      await page.evaluate(() => {
        const b = [].slice.call(document.querySelectorAll('button.rehearse-btn'))
          .filter((x) => x.textContent.trim() === '미리 들어보기')[0];
        if (b) b.click();
      });
      await new Promise((r) => setTimeout(r, 900));

      const open = await page.evaluate(() => {
        const ov = document.getElementById('ob_rpViewer');
        const fr = document.getElementById('ob_rpFrame');
        return {
          ov: !!ov, src: fr ? fr.getAttribute('src') : '', allow: fr ? fr.getAttribute('allow') : '',
          z: ov ? getComputedStyle(ov).zIndex : '', ovf: document.body.style.overflow,
          adv: (window.ME_ADV_PAGE && typeof ME_ADV_PAGE.hideOn === 'function') ? !!ME_ADV_PAGE.hideOn() : null,
        };
      });
      ok(open.ov, '오버레이(ob_rpViewer)가 열린다');
      ok(open.allow === 'autoplay', 'iframe 에 autoplay 권한이 넘어간다', open.allow);
      ok(open.z === '9999', '오버레이가 최상단(z-index 9999)', open.z);
      ok(open.ovf === 'hidden', '여는 동안 뒤 배경 스크롤이 잠긴다', open.ovf);
      ok(open.adv === true, '미리듣기 중엔 상담사 위젯이 숨는다(hideOn)', String(open.adv));
      const S1 = checkUrl('order-preview', open.src);
      if (S1) ok(S1.course === 'gamdong' && S1.letter === 'both' && S1.bless === 'on', '고른 값이 그대로 넘어간다', JSON.stringify(S1).slice(0, 90));
      if (S1) ok(S1.digital === false, '[PREVIEW_DIGITAL] 청첩장 정보를 받기 전엔 오프라인 배웅(digital=false)', JSON.stringify(S1.digital));

      const fr = page.frames ? page.frames().filter((f) => /console\.html/.test(f.url()))[0] : null;
      ok(!!fr, '오버레이 안에서 console.html 이 실제로 로드된다');
      if (fr) {
        const inner = await fr.evaluate(() => ({
          guest: document.body.classList.contains('guest'),
          intro: !!document.getElementById('gIntro'),
          txt: ((document.getElementById('gIntro') || {}).innerText || '').slice(0, 40),
        })).catch(() => ({ guest: false, intro: false, txt: 'THROW' }));
        ok(inner.guest, '안쪽 화면이 고객용 스킨(.guest)으로 뜬다');
        ok(inner.intro, '고객 인트로 카드(#gIntro)가 선다', inner.txt);
      }

      // ③ Esc 가 빌더로 새지 않는다 — _obExit 을 세는 대역으로 바꿔 두고 누른다(진짜 나가기는 실행하지 않는다)
      await page.evaluate(() => { window.__obExit = 0; window._obExit = function () { window.__obExit++; }; });
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 400));
      const afterEsc = await page.evaluate(() => ({
        ov: !!document.getElementById('ob_rpViewer'), exits: window.__obExit, ovf: document.body.style.overflow,
        adv: (window.ME_ADV_PAGE && typeof ME_ADV_PAGE.hideOn === 'function') ? !!ME_ADV_PAGE.hideOn() : null,
      }));
      ok(!afterEsc.ov, 'Esc 로 미리듣기만 닫힌다');
      ok(afterEsc.exits === 0, 'Esc 가 빌더의 「저장 후 나가기」를 부르지 않는다', `_obExit ${afterEsc.exits}회`);
      ok(afterEsc.ovf === '', '닫으면 배경 스크롤 잠금이 열기 전 값으로 돌아온다', JSON.stringify(afterEsc.ovf));
      ok(afterEsc.adv === false, '닫으면 상담사가 다시 선다', String(afterEsc.adv));

      // ✕ 로도 같은 결과 + 소리를 먼저 끊었는지(src 가 about:blank 로 바뀐 뒤 제거되는지)
      await page.evaluate(() => {
        const b = [].slice.call(document.querySelectorAll('button.rehearse-btn'))
          .filter((x) => x.textContent.trim() === '미리 들어보기')[0];
        if (b) b.click();
      });
      await new Promise((r) => setTimeout(r, 500));
      const closed = await page.evaluate(() => {
        const fr2 = document.getElementById('ob_rpFrame');
        const ov = document.getElementById('ob_rpViewer');
        const x = ov ? ov.querySelector('button[aria-label="닫기"]') : null;
        if (x) x.click();
        return { blanked: fr2 ? fr2.getAttribute('src') : '(없음)', ov: !!document.getElementById('ob_rpViewer'), ovf: document.body.style.overflow };
      });
      ok(!closed.ov, '✕ 로도 닫힌다');
      ok(closed.blanked === 'about:blank', '닫을 때 iframe 을 about:blank 로 끊는다(소리 잔류 차단)', closed.blanked);
      ok(closed.ovf === '', '✕ 로 닫아도 잠금이 풀린다', JSON.stringify(closed.ovf));

      // 연타(열려 있는데 또 누름) — 먼저 뜬 판을 '떼기만' 하면 그 판의 뒷정리가 통째로 빠진다.
      //   그러면 새 판이 'hidden' 인 상태를 열기 전 값으로 기억해, 닫아도 배경이 잠긴 채로 남는다(실측으로 잡힌 자리).
      await page.evaluate(() => {
        window.__rp1 = openRitualPreview();
        window.__rp2 = openRitualPreview();   // 연타
      });
      await new Promise((r) => setTimeout(r, 300));
      const dbl = await page.evaluate(() => {
        const n = document.querySelectorAll('#ob_rpViewer').length;
        const same = window.__rp1 === window.__rp2 && document.getElementById('ob_rpViewer') === window.__rp1;
        const fr = document.getElementById('ob_rpFrame');
        const src = fr ? fr.getAttribute('src') : '(없음)';
        const ov = document.getElementById('ob_rpViewer');
        const x = ov ? ov.querySelector('button[aria-label="닫기"]') : null;
        if (x) { x.click(); x.click(); }
        return { n: n, same: same, src: src, ov: !!document.getElementById('ob_rpViewer'), ovf: document.body.style.overflow };
      });
      ok(dbl.n === 1, '연달아 열어도 오버레이는 하나뿐', String(dbl.n));
      ok(dbl.same, '연타는 떠 있는 판을 그대로 쓴다(듣던 소리를 처음으로 되감지 않는다)');
      ok(/\/console\.html\?mode=preview/.test(dbl.src), '연타 뒤에도 미리듣기 화면이 그대로 살아 있다', dbl.src);
      ok(!dbl.ov && dbl.ovf === '', '연타로 닫아도 잠금이 정확히 풀린다', JSON.stringify(dbl.ovf));

      /* ★빌더는 청첩장 트랙을 볼 길이 없다 [PREVIEW_DIGITAL]
         디지털 참석 여부는 부모(마이페이지)가 orderFill 에 한 칸 얹어 보낸다. 여기서 볼 것은 둘이다 —
           ① 받은 값이 실제로 주소에 실리는가 (안 실리면 배웅 장면이 조용히 오프라인으로 굳는다)
           ② 그 값이 식순 S 로 새지 않는가 (새면 _embedSave() 가 S 를 통째로 부모에 보내 서버 초안에 굳는다.
              그러면 나중에 청첩장 방식을 바꿔도 식순 초안에 박힌 옛 값이 미리듣기를 계속 지배한다) */
      const dig = await page.evaluate(() => new Promise((res) => {
        window.postMessage({ type: 'momentedit:orderFill', draft: null, done: true, digital: true }, location.origin);
        setTimeout(() => {
          const b = [].slice.call(document.querySelectorAll('button.rehearse-btn'))
            .filter((x) => x.textContent.trim() === '미리 들어보기')[0];
          if (!b) return res({ err: '버튼 없음' });
          b.click();
          const fr = document.getElementById('ob_rpFrame');
          const src = fr ? fr.getAttribute('src') : '';
          const inS = Object.prototype.hasOwnProperty.call(S, 'digital');
          const ov = document.getElementById('ob_rpViewer');
          const x = ov ? ov.querySelector('button[aria-label="닫기"]') : null;
          if (x) x.click();
          res({ src: src, inS: inS });
        }, 250);
      }));
      let Sdig = null; try { Sdig = decodeS(dig.src); } catch (e) { Sdig = null; }
      ok(!!Sdig, '[PREVIEW_DIGITAL] orderFill 뒤 미리듣기 주소가 다시 조립된다', dig.err || String(dig.src).slice(0, 60));
      if (Sdig) ok(Sdig.digital === true, '[PREVIEW_DIGITAL] 부모가 준 디지털 참석이 주소에 실린다(온라인 배웅으로 갈린다)', JSON.stringify(Sdig.digital));
      ok(dig.inS === false, '[PREVIEW_DIGITAL] 그 값이 식순 S 에는 들어가지 않는다(서버 초안에 굳지 않게)', `S.digital 존재=${dig.inS}`);

      const real = errors.filter((e) => !/favicon|net::ERR/.test(e));
      ok(real.length === 0, 'JS 오류 0건', real.slice(0, 3).join(' | '));
      await page.close();
    }

    // ── B. mypage 식순 행 ────────────────────────────────────────────────
    {
      console.log(`\n[${V.n}] mypage 식순 행`);
      const { page, errors } = await eng.newPage({ port: PORT, viewport: V.viewport });
      await page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load' });
      await new Promise((r) => setTimeout(r, 900));

      const SIG = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달', '후기'];
      const seed = {
        name: '김희준 · 이미쿠', product: '시그니처', code: 'ME-PRV',
        stage: '제작중', stageIndex: SIG.indexOf('제작중'), stageList: SIG.slice(),
        nextAction: '다음 할 일을 안내해 드릴게요.',
        contract: { signed: true }, payment: { confirmed: true }, weddingDate: '2026-10-26',
        result: null, isException: false,
        production: {
          base: { weddingDate: '2026-10-26' },
          tracks: { ritual: '완료' },
          // [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
          ritualDraft: { _v: 3, S: Object.assign({ course: 'gamdong', letter: 'both', bless: 'on' }, SECRET) },
        },
      };
      const view = await page.evaluate((st) => {
        show('mypageView');
        renderMyPage(st);
        return { ok: true, txt: (document.getElementById('mypageView').innerText || '').slice(0, 0) };
      }, seed).catch((e) => ({ ok: false, txt: String(e).slice(0, 140) }));
      ok(view.ok, '제작중 화면이 예외 없이 그려진다', view.txt);
      await new Promise((r) => setTimeout(r, 300));

      const row = await page.evaluate(() => {
        const pre = document.getElementById('mp_ritualPreview');
        const main = document.getElementById('mp_ritualStart');
        if (!pre || !main) return { pre: !!pre, main: !!main };
        const tr = main.closest('.trk');
        const nm = tr.querySelector('.trk-nm');
        const inv = document.getElementById('mp_invStart');
        const invRow = inv ? inv.closest('.trk') : null;
        const R = (el) => { const r = el.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, w: r.width, h: r.height }; };
        return {
          pre: true, main: true, label: pre.textContent.trim(),
          rPre: R(pre), rMain: R(main), rNm: R(nm), rRow: R(tr),
          invH: invRow ? R(invRow).h : null,
          nmClip: nm.scrollWidth - nm.clientWidth,
          rowOverflow: tr.scrollWidth - tr.clientWidth,
          preFont: getComputedStyle(pre).fontSize, mainFont: getComputedStyle(main).fontSize,
          preMinW: getComputedStyle(pre).minWidth, mainMinW: getComputedStyle(main).minWidth,
          vw: window.innerWidth,
        };
      });
      ok(row.pre, '식순 행에 「미리 들어보기」 보조 버튼이 선다');
      ok(row.main, '주 버튼(mp_ritualStart)은 그대로 있다');
      if (row.pre && row.main) {
        ok(row.label === '미리 들어보기', '보조 버튼 라벨', row.label);
        ok(row.rPre.r <= row.rMain.l + 0.5, '보조 버튼이 주 버튼 왼쪽에 선다', `pre.right=${row.rPre.r} main.left=${row.rMain.l}`);
        ok(row.rowOverflow <= 1, '행이 가로로 넘치지 않는다', `overflow=${row.rowOverflow}px`);
        ok(row.rMain.r <= row.vw + 0.5, '주 버튼이 화면 폭 안', `right=${row.rMain.r} vw=${row.vw}`);
        ok(row.nmClip <= 1, '이름칸(「식순」)이 잘리지 않는다', `clip=${row.nmClip}px`);
        ok(row.invH == null || Math.abs(row.rRow.h - row.invH) <= 1, '보조 버튼이 붙어도 행 높이가 그대로(줄바꿈 없음)', `식순=${row.rRow.h} 청첩장=${row.invH}`);
        ok(Math.abs(row.rPre.t - row.rMain.t) <= 2, '두 버튼이 같은 줄에 선다', `${row.rPre.t} vs ${row.rMain.t}`);
        ok(parseFloat(row.preFont) < parseFloat(row.mainFont), '보조 버튼이 주 버튼보다 작다(무엇이 주된 걸음인지 남는다)', `${row.preFont} vs ${row.mainFont}`);
        ok(row.preMinW === 'auto' && row.mainMinW !== 'auto', '보조만 min-width 를 푼다', `${row.preMinW} / ${row.mainMinW}`);
      }

      // 초안이 없으면 버튼도 없다 — '들려줄 게 있는가'의 판단이 조립기 한 곳인지
      const none = await page.evaluate((st) => {
        const s2 = JSON.parse(JSON.stringify(st));
        s2.production.ritualDraft = null;
        renderMyPage(s2);
        const a = !!document.getElementById('mp_ritualPreview');
        const s3 = JSON.parse(JSON.stringify(st));
        s3.production.ritualDraft = { _v: 2, S: { course: 'gamdong' } };   // 구 세대 초안 — 미리듣기가 못 읽는다
        renderMyPage(s3);
        const b = !!document.getElementById('mp_ritualPreview');
        const s4 = JSON.parse(JSON.stringify(st));
        s4.production.ritualDraft = { _v: 3, S: { letter: 'both' } };      // 코스가 없다 — 들려줄 게 없다
        renderMyPage(s4);
        const c = !!document.getElementById('mp_ritualPreview');
        renderMyPage(st);
        return { a, b, c, back: !!document.getElementById('mp_ritualPreview') };
      }, seed);
      ok(!none.a, '초안이 없으면 버튼도 없다');
      ok(!none.b, '구 세대(_v!==3) 초안이면 버튼이 안 뜬다');
      ok(!none.c, '코스가 없으면 버튼이 안 뜬다');
      ok(none.back, '초안이 돌아오면 버튼도 돌아온다');

      await page.evaluate(() => document.getElementById('mp_ritualPreview').click());
      await new Promise((r) => setTimeout(r, 900));
      const mOpen = await page.evaluate(() => {
        const ov = document.getElementById('mp_rpViewer');
        const fr = document.getElementById('mp_rpFrame');
        return {
          ov: !!ov, src: fr ? fr.getAttribute('src') : '', allow: fr ? fr.getAttribute('allow') : '',
          lockN: window._mpLockN, fixed: document.body.style.position === 'fixed',
          fsOpen: _mpFsOpen(), track: (typeof _prodOpenTrack === 'function') ? _prodOpenTrack() : '(없음)',
          adv: (window.ME_ADV_PAGE && typeof ME_ADV_PAGE.hideOn === 'function') ? !!ME_ADV_PAGE.hideOn() : null,
        };
      });
      ok(mOpen.ov, '오버레이(mp_rpViewer)가 열린다');
      ok(mOpen.allow === 'autoplay', 'iframe 에 autoplay 권한이 넘어간다', mOpen.allow);
      ok(mOpen.lockN > 0 && mOpen.fixed, '배경 스크롤이 잠긴다', `lockN=${mOpen.lockN} fixed=${mOpen.fixed}`);
      ok(mOpen.fsOpen === true, '[MP_FS_OVERLAYS] 단일 목록이 이 오버레이를 안다');
      ok(!mOpen.track, '[의도] 미리듣기는 「편집 중」으로 세지 않는다(듣기만 하니 저장 충돌 배너가 뜨면 안 된다)', String(mOpen.track));
      ok(mOpen.adv === true, '미리듣기 중엔 상담사 위젯이 숨는다(hideOn)', String(mOpen.adv));
      const Smp0 = checkUrl('mypage', mOpen.src);
      if (Smp0) ok(Smp0.digital === false, '[PREVIEW_DIGITAL] 청첩장 트랙이 없으면 오프라인 배웅(digital=false)', JSON.stringify(Smp0.digital));

      const mfr = page.frames ? page.frames().filter((f) => /console\.html/.test(f.url()))[0] : null;
      ok(!!mfr, '오버레이 안에서 console.html 이 실제로 로드된다');
      if (mfr) {
        const inner = await mfr.evaluate(() => ({
          guest: document.body.classList.contains('guest'), intro: !!document.getElementById('gIntro'),
        })).catch(() => ({ guest: false, intro: false }));
        ok(inner.guest && inner.intro, '안쪽이 고객용 스킨으로 뜬다');
      }

      // ★가장 위험한 자리 — 오버레이가 떠 있는데 자가치유가 잠금을 강제로 풀면 실기기 스크롤이 굳는다(2026-07-21 수정분)
      const rec = await page.evaluate(() => {
        _mpLockReconcile();
        return { lockN: window._mpLockN, fixed: document.body.style.position === 'fixed', ov: !!document.getElementById('mp_rpViewer') };
      });
      ok(rec.ov && rec.lockN > 0 && rec.fixed, '_mpLockReconcile 이 열려 있는 미리듣기를 보고 잠금을 유지한다', `lockN=${rec.lockN} fixed=${rec.fixed}`);

      const mClosed = await page.evaluate(() => {
        const fr2 = document.getElementById('mp_rpFrame');
        const ov = document.getElementById('mp_rpViewer');
        const x = ov ? ov.querySelector('button[aria-label="닫기"]') : null;
        if (x) x.click();
        return {
          blanked: fr2 ? fr2.getAttribute('src') : '(없음)', ov: !!document.getElementById('mp_rpViewer'),
          lockN: window._mpLockN, pos: document.body.style.position, ovf: document.body.style.overflow, fsOpen: _mpFsOpen(),
        };
      });
      ok(!mClosed.ov, '✕ 로 닫힌다');
      ok(mClosed.blanked === 'about:blank', '닫을 때 iframe 을 about:blank 로 끊는다(소리 잔류 차단)', mClosed.blanked);
      ok(mClosed.lockN === 0 && mClosed.pos !== 'fixed' && mClosed.ovf !== 'hidden', '닫으면 잠금이 완전히 풀린다', `lockN=${mClosed.lockN} pos=${mClosed.pos} ovf=${mClosed.ovf}`);
      ok(mClosed.fsOpen === false, '[MP_FS_OVERLAYS] 목록이 다시 비어 있다');

      // Esc 로도 닫히고, 열고 닫기를 반복해도 잠금 카운트가 새지 않는다
      const esc = await page.evaluate(() => { openRitualPreview({ ritualDraft: { _v: 3, S: { course: 'family' } } }); return !!document.getElementById('mp_rpViewer'); });
      ok(esc, '다시 열린다(다른 초안으로도)');
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 300));
      const escAfter = await page.evaluate(() => ({ ov: !!document.getElementById('mp_rpViewer'), lockN: window._mpLockN, pos: document.body.style.position }));
      ok(!escAfter.ov, 'Esc 로 닫힌다');
      ok(escAfter.lockN === 0 && escAfter.pos !== 'fixed', 'Esc 로 닫아도 잠금이 정확히 풀린다', `lockN=${escAfter.lockN} pos=${escAfter.pos}`);

      // 연타(열려 있는데 또 누름) — 여기서 새는 것은 배경 잠금 '카운트'다. 겹쳐 쌓이면 한 번 닫아도 안 풀린다.
      await page.evaluate(() => {
        window.__mp1 = openRitualPreview({ ritualDraft: { _v: 3, S: { course: 'damback' } } });
        window.__mp2 = openRitualPreview({ ritualDraft: { _v: 3, S: { course: 'festive' } } });   // 연타
      });
      await new Promise((r) => setTimeout(r, 300));
      const mDbl = await page.evaluate(() => {
        const n = document.querySelectorAll('#mp_rpViewer').length;
        const same = window.__mp1 === window.__mp2 && document.getElementById('mp_rpViewer') === window.__mp1;
        const lockOpen = window._mpLockN;
        const ov = document.getElementById('mp_rpViewer');
        const x = ov ? ov.querySelector('button[aria-label="닫기"]') : null;
        if (x) x.click();
        return { n: n, same: same, lockOpen: lockOpen, ov: !!document.getElementById('mp_rpViewer'), lockN: window._mpLockN, pos: document.body.style.position };
      });
      ok(mDbl.n === 1, '연달아 열어도 오버레이는 하나뿐', String(mDbl.n));
      ok(mDbl.same, '연타는 떠 있는 판을 그대로 쓴다(듣던 소리를 처음으로 되감지 않는다)');
      ok(mDbl.lockOpen === 1, '연타로 열어도 잠금은 한 겹만 쌓인다', `lockN=${mDbl.lockOpen}`);
      ok(!mDbl.ov && mDbl.lockN === 0 && mDbl.pos !== 'fixed', '연타 뒤 한 번 닫으면 잠금이 완전히 풀린다', `lockN=${mDbl.lockN} pos=${mDbl.pos}`);
      // ★히스토리 층 — 닫기가 뒤로가기 층을 되돌린다(bkDone→history.back). 연타가 층을 어긋나게 하면
      //   닫는 순간 마이페이지 밖으로 튕긴다. 화면은 멀쩡해 보이고 페이지만 사라지므로 주소로 본다(실측으로 겪은 자리).
      await new Promise((r) => setTimeout(r, 500));
      ok(page.url().indexOf('/mypage.html') >= 0, '연타 뒤 닫아도 페이지 밖으로 튕기지 않는다', page.url());

      /* ★배웅 장면이 갈리는 자리 [PREVIEW_DIGITAL]
         디지털 참석이면 미리듣기에 온라인 하객 맞이 큐가 서고 배웅이 end-1b-farewell-online 으로 간다.
         그런데 이 값은 식순 초안 어디에도 없다 — 청첩장 트랙이 정한 것이라 빌더가 묻지 않는다.
         그래서 '초안만 보고 조립'하면 디지털 참석 예식도 영원히 오프라인 배웅으로 흐른다(2026-08-02 실사고).
         화면은 멀쩡하고 소리만 달라서 눈으로는 안 잡힌다. 클릭 경로로 열어 주소를 풀어 본다.
         ★규칙(어떤 청첩장 방식이 디지털 참석인가)은 여기서 검사하지 않는다 — 그 규칙은 서버 한 곳(85_invitation.gs)
           의 것이고, 여기서 다시 적으면 규칙이 바뀌는 날 검사만 옛 규칙을 지킨다. 여기는 '결과가 전달되는가'만 본다. */
      const DIGCASES = [
        { n: '서버가 준 digital=true 가 주소까지 간다', inv: { digital: true }, want: true },
        { n: '서버가 준 digital=false 가 주소까지 간다', inv: { digital: false, draft: { method: 'online' } }, want: false },
        { n: '구버전 GAS(digital 칸 없음)는 발행된 라이브 주소로 알아낸다', inv: { published: { eventId: 'x', urls: { live: 'https://momentedit.kr/live.html?e=x' } } }, want: true },
        { n: '라이브 주소가 비어 있으면 오프라인 배웅', inv: { published: { eventId: 'x', urls: { live: '' } } }, want: false },
        { n: '서버 확정값이 발행 주소보다 앞선다', inv: { digital: false, published: { eventId: 'x', urls: { live: 'https://momentedit.kr/live.html?e=x' } } }, want: false },
      ];
      for (const C of DIGCASES) {
        const got = await page.evaluate((a2) => {
          const st = JSON.parse(JSON.stringify(a2.seed));
          st.invitation = a2.inv;
          renderMyPage(st);
          const b = document.getElementById('mp_ritualPreview');
          if (!b) return { err: '버튼 없음' };
          b.click();
          const fr = document.getElementById('mp_rpFrame');
          const src = fr ? fr.getAttribute('src') : '';
          const ov = document.getElementById('mp_rpViewer');
          const x = ov ? ov.querySelector('button[aria-label="닫기"]') : null;
          if (x) x.click();
          return { src: src };
        }, { seed: seed, inv: C.inv });
        let Sc = null; try { Sc = decodeS(got.src); } catch (e) { Sc = null; }
        ok(!!Sc && Sc.digital === C.want, `[PREVIEW_DIGITAL] ${C.n}`, got.err || `digital=${Sc ? JSON.stringify(Sc.digital) : '(주소 못 풂)'}`);
        await new Promise((r) => setTimeout(r, 250));   // 닫기가 히스토리 층을 되돌릴 틈(연타 사고 자리)
      }
      ok(page.url().indexOf('/mypage.html') >= 0, '[PREVIEW_DIGITAL] 여닫기를 반복해도 페이지 밖으로 튕기지 않는다', page.url());

      // 초안이 없는데도 불렸을 때 — 빈 화면 대신 이유를 말한다
      const guard = await page.evaluate(() => {
        const r = openRitualPreview({ ritualDraft: null });
        return { r: r, ov: !!document.getElementById('mp_rpViewer'), lockN: window._mpLockN };
      });
      ok(guard.r === null && !guard.ov, '초안 없이 부르면 빈 오버레이를 열지 않는다');
      ok(guard.lockN === 0, '열지 않았으니 잠금도 걸지 않는다', `lockN=${guard.lockN}`);

      const real = errors.filter((e) => !/favicon|net::ERR/.test(e));
      ok(real.length === 0, 'JS 오류 0건', real.slice(0, 3).join(' | '));
      await page.close();
    }
  }
  await eng.close();
} finally { server.kill(); }

console.log(fail ? `\n결과 — 실패 ${fail}건` : '\n결과 — 실패 0건 (전부 통과)');
process.exit(fail ? 1 : 0);
