/* [CANT_LOOK] 0=통과 1=재서 틀림 2=못 잼 — 전체화면 위저드의 가로 넘침 전수 [FS_FLEX_SHRINK]
 *
 * ★왜 만드나 (2026-08-14) — 세로 자리를 잡으려고 .mp-fs 를 flex 로 바꾼 그 변경이,
 *   긴 주소가 든 청첩장 완성 화면을 390px 칸에서 467px 로 벌려 화면을 옆으로 밀었다.
 *   flex 아이템의 기본 min-width 는 auto 라 **내용의 최소폭 아래로 안 줄어든다** — 블록일 땐 없던 성질이다.
 *   눈으로 한 화면만 보고 넘어가면 다른 위저드에서 같은 일이 난다. 그래서 전 화면을 한 번에 잰다.
 * ★판정은 '요소가 삐져나왔나'가 아니라 **스크롤 칸이 가로로 늘어났나**로 한다(사용자가 겪는 것이 그것이다).
 */
import { openProbe } from './audit/page-probe.mjs';

const W = Number(process.argv[2] || 390);
const h = await openProbe('mypage.html', { width: W, settle: 900 });
const bad = [];
try {
  await h.page.evaluate(() => {
    const mv = document.getElementById('mypageView'); if (mv) { mv.classList.add('show'); mv.style.animation = 'none'; }
    const ld = document.getElementById('loading'); if (ld) ld.style.display = 'none';
    window.api = () => Promise.resolve({ ok: true }); window.apiTrackSave = window.api;
    window.getToken = () => 't'; window._mpRefresh = () => {};
    window.bkOpen = () => 1; window.bkDone = () => {}; window.bkKill = () => {}; window.bkAlive = () => true;
  });
  await h.page.waitForTimeout(500);
  const r = await h.page.evaluate(async () => {
    const w = (ms) => new Promise((s) => setTimeout(s, ms));
    const box = document.getElementById('mp_production');
    const out = [];
    const NAMES = { groomEn: 'Jeonghee', brideEn: 'Fhixie', groomKo: '정희', brideKo: '픽시', weddingDate: '2026-10-14', weddingTime: '13:20' };
    const URLS = {
      online: 'https://momentedit.kr/i/cover-05.html?e=jeonghee-fhixie-1014',
      family: 'https://momentedit.kr/i-family/family-01.html?e=jeonghee-fhixie-1014',
      live: 'https://momentedit.kr/live.html?e=jeonghee-fhixie-1014',
    };
    const measure = (nm, host) => {
      const el = host || box;
      out.push({ nm, host: el.clientWidth, scroll: el.scrollWidth, doc: document.documentElement.scrollWidth, dw: document.documentElement.clientWidth });
    };
    box.style.display = 'block'; box.classList.add('mp-fs'); document.body.classList.add('mp-fs-on');

    const invSteps = ['method', 'parents', 'design', 'confirm'];
    for (const st of invSteps) {
      INVFLOW = { active: true, step: st, draft: { method: 'both', designFamily: '01', designOnline: '05', _onlineSame: 'N', greetingShowParents: 'Y', groomAccount: '국민 123456-78-901234 정희', brideAccount: '카카오뱅크 3333-01-2345678 픽시' }, base: NAMES };
      _wizStart('inv'); renderInvFlow(box); await w(120);
      measure('청첩장 ' + st);
    }
    INVFLOW = { active: true, step: 'done', draft: { method: 'both', designFamily: '01', designOnline: '05' }, base: NAMES };
    invStepDone(box, { ok: true, eventId: 'jeonghee-fhixie-1014', urls: URLS }); await w(150);
    measure('청첩장 완성(링크)');
    INVFLOW.active = false;

    for (const [trk, dr] of [['dining', { need: 'yes', _step: 0 }], ['dining', { need: 'none', _step: 1 }]]) {
      startTrkFlow(trk, dr, { weddingTime: '13:20', expectedGuests: '25' }); await w(200);
      measure('애프터 웨딩 _step=' + (dr._step));
      TRKFLOW.active = false;
    }
    startSeatFlow({ tables: [{ n: 1, seats: ['정희', '픽시', '', ''], drinks: ['샴페인', '', '', ''] }, { n: 2, seats: ['', '', ''], drinks: ['', '', ''] }] }, {}, 'tok', {}); await w(250);
    measure('좌석 · 음료');
    SEATFLOW.active = false; box.classList.remove('mp-fs');

    startPhotoFlow({ photo: ['양가 가족 전체', '신부 측 가족', '친구들과'], photoFx: ['잔 부딪히기'], photoShareUrl: 'https://photos.app.goo.gl/verylongsharelinkexample123456' }); await w(220);
    measure('단체 사진', document.getElementById('mp_photoBody'));
    _photoTearDown();
    startSnapFlow({ people: ['두 분 중심'], mustHaves: ['반지·손 클로즈업'], moodNote: '조용하고 따뜻하게' }); await w(220);
    measure('스냅 기획', document.getElementById('mp_snapBody'));
    _snapTearDown();
    return out;
  });
  for (const c of r) {
    const over = c.scroll > c.host + 1 || c.doc > c.dw + 1;
    console.log(`  ${over ? '✖' : '·'} ${c.nm.padEnd(22)} 칸 ${c.host} · 스크롤폭 ${c.scroll} · 문서 ${c.doc}/${c.dw}`);
    if (over) bad.push(`${c.nm}: 가로로 밀린다(칸 ${c.host} < 스크롤폭 ${c.scroll})`);
  }
  const p = await h.probe();
  if (p.errors.length) bad.push('JS 오류 ' + p.errors[0]);
  bad.forEach((b) => console.log('  ✖ ' + b));
  console.log(bad.length ? `틀림 ${bad.length}건` : '가로 넘침 없음');
  process.exit(bad.length ? 1 : 0);
} finally { await h.close(); }
