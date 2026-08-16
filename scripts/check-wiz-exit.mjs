// [CANT_LOOK] 0=통과 1=재서 틀림 2=못 잼 — 위저드 저장·나가기 한 벌(WIZ_EXIT_ONE) 실측
import { openProbe } from './audit/page-probe.mjs';
const W = Number(process.argv[2] || 390);
const h = await openProbe('mypage.html', { width: W, settle: 1200 });
const bad = [];
try {
  await h.page.evaluate(() => {
    const mv = document.getElementById('mypageView'); if (mv) { mv.classList.add('show'); mv.style.animation = 'none'; }
    const ld = document.getElementById('loading'); if (ld) ld.style.display = 'none';
    // 서버 호출은 다 막고 성공/실패를 우리가 정한다
    window.__calls = [];
    window.api = function (b) { window.__calls.push(b.action); return Promise.resolve(window.__fail ? { ok: false, error: '테스트 실패' } : { ok: true }); };
    window.apiTrackSave = window.api;
    window._mpRefresh = function () { window.__refreshed = (window.__refreshed || 0) + 1; };
    window.getToken = function () { return 't'; };
  });
  await h.page.waitForTimeout(500);

  const r = await h.page.evaluate(async () => {
    const w = (ms) => new Promise((s) => setTimeout(s, ms));
    const out = [];
    const box = document.getElementById('mp_production');
    const step = async (nm, fn) => { try { out.push({ nm, v: await fn() }); } catch (e) { out.push({ nm, err: String(e).slice(0, 120) }); } };

    // ── 청첩장 ──
    await step('inv: 손잡이 둘', async () => {
      box.style.display = 'block';
      INVFLOW = { active: true, step: 'method', draft: { method: 'online', groomKo: '희준', brideKo: '미쿠', groomEn: 'Heejun', brideEn: 'Miku' }, base: {} };
      _wizStart('inv'); renderInvFlow(box); await w(60);
      return { save: !!box.querySelector('[data-wiz-save]'), exit: !!box.querySelector('[data-wiz-exit]'), label: (box.querySelector('[data-wiz-exit]') || {}).textContent };
    });
    await step('inv: 안 바꾸고 나가기 = 판 없음', async () => {
      const before = document.getElementById('mpModal').classList.contains('open');
      _wizExit(); await w(120);
      const open = document.getElementById('mpModal').classList.contains('open');
      return { before, modal: open, active: INVFLOW.active };
    });
    await step('inv: 바꾸고 나가기 = 판 뜸', async () => {
      INVFLOW = { active: true, step: 'method', draft: { method: 'online', groomKo: '희준', brideKo: '미쿠', groomEn: 'Heejun', brideEn: 'Miku' }, base: {} };
      _wizStart('inv'); renderInvFlow(box); await w(60);
      document.getElementById('mp_gKo').value = '희준2';   // 화면의 칸을 바꾼다 — 수집 훅(_collect)이 DOM 을 읽으므로 draft 직접 수정은 되돌려진다
      _wizExit(); await w(150);
      const ov = document.getElementById('mpModal');
      const t = (document.getElementById('mpModalTitle') || {}).textContent || '';
      const btns = [...document.getElementById('mpModalActions').querySelectorAll('button')].map((b) => b.textContent);
      return { modal: ov.classList.contains('open'), title: t, btns };
    });
    await step('inv: Esc = 취소(안 나감)', async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await w(150);
      return { modal: document.getElementById('mpModal').classList.contains('open'), active: INVFLOW.active };
    });
    await step('inv: 그냥 나가기', async () => {
      _wizExit(); await w(150);
      const ovm = document.getElementById('mpModal');
      if (!ovm.classList.contains('open')) return { err: '판이 안 떠 있다' };
      const gh = [...document.getElementById('mpModalActions').querySelectorAll('button')].find((b) => b.textContent === '그냥 나가기');
      if (!gh) return { err: '그냥 나가기 버튼 없음' };
      gh.click(); await w(200);
      return { active: INVFLOW.active, saved: window.__calls.indexOf('saveInvitationDraft') };
    });
    await step('inv: 저장 버튼 = 안 나감 · 저장됨', async () => {
      window.__calls = [];
      INVFLOW = { active: true, step: 'method', draft: { method: 'online', groomKo: 'ㄱ', brideKo: 'ㄴ', groomEn: 'A', brideEn: 'B' }, base: {} };
      _wizStart('inv'); renderInvFlow(box); await w(60);
      const gk = document.getElementById('mp_gKo'); gk.value = 'ㄷ'; gk.dispatchEvent(new Event('input', { bubbles: true }));
      await w(60);   // 손잡이 칠하기는 다음 프레임에 예약된다(_wizPaintSoon)
      const sb = box.querySelector('[data-wiz-save]');
      const dirtyLabel = sb.textContent;
      sb.click(); await w(250);
      const after = box.querySelector('[data-wiz-save]');
      return { dirtyLabel, savedLabel: after.textContent, disabled: after.disabled, active: INVFLOW.active, calls: window.__calls.slice() };
    });
    await step('inv: 저장 뒤 나가기 = 판 없음', async () => {
      _wizExit(); await w(150);
      return { modal: document.getElementById('mpModal').classList.contains('open'), active: INVFLOW.active };
    });

    // ── 영문 이름 게이트 ──
    await step('inv: 한글만 적은 영문 칸 = 다음 막힘', async () => {
      INVFLOW = { active: true, step: 'method', draft: { method: 'online', groomKo: '희준', brideKo: '미쿠', groomEn: '희준', brideEn: '미쿠' }, base: {} };
      _wizStart('inv'); renderInvFlow(box); await w(60);
      document.getElementById('iv_next').click(); await w(200);
      const t = (document.getElementById('mpModalTitle') || {}).textContent || '';
      const open = document.getElementById('mpModal').classList.contains('open');
      const stayed = INVFLOW.step === 'method';
      document.getElementById('mpModalActions').querySelector('button').click(); await w(150);
      return { modal: open, title: t, stayed, miss: _invEnMiss({ groomEn: '희준', brideEn: 'Miku' }) };
    });
    await step('inv: 발행 직전에도 막힌다(재진입)', async () => {
      window.__calls = [];
      INVFLOW = { active: true, step: 'confirm', draft: { method: 'online', designOnline: '05', groomKo: '희', brideKo: '미', groomEn: '', brideEn: '미쿠' }, base: {} };
      _wizStart('inv'); renderInvFlow(box); await w(80);
      document.getElementById('iv_pub').click(); await w(250);
      const t = (document.getElementById('mpModalTitle') || {}).textContent || '';
      document.getElementById('mpModalActions').querySelector('button').click(); await w(250);
      return { title: t, published: window.__calls.indexOf('publishInvitation'), step: INVFLOW.step };
    });

    // ── 뒤로가기도 같은 규칙을 지나는가 (층 소비는 흉내낸다 — 실제 history.back 은 테스트 문서를 떠난다) ──
    await step('back: 바꾸고 뒤로가기 = 판 · 취소하면 층 재무장', async () => {
      INVFLOW = { active: true, step: 'method', draft: { method: 'online', groomKo: '희준', brideKo: '미쿠', groomEn: 'Heejun', brideEn: 'Miku' }, base: {} };
      // 히스토리 층은 여기서 흉내낸다 — 진짜 history.back 은 테스트 문서를 떠나 버려 잴 수가 없다.
      // 재는 것은 '우리 코드가 취소 뒤에 층을 다시 여는가' 하나다.
      const _live = {}; let _seq = 0;
      const _o = window.bkOpen, _d = window.bkDone, _a = window.bkAlive, _k = window.bkKill;
      window.bkOpen = function (fn) { const i = ++_seq; _live[i] = fn; return i; };
      window.bkDone = function (i) { delete _live[i]; };
      window.bkAlive = function (i) { return !!_live[i]; };
      window.bkKill = function (o) { if (o && o._bk != null) { delete _live[o._bk]; o._bk = null; } };
      const _restore = () => { window.bkOpen = _o; window.bkDone = _d; window.bkAlive = _a; window.bkKill = _k; };
      INVFLOW._bk = bkOpen(function () { _wizExit(); });
      _wizStart('inv'); renderInvFlow(box); await w(80);
      document.getElementById('mp_gKo').value = '희준9';
      const _cb = _live[INVFLOW._bk];       // 층에 걸린 것이 곧 _wizExit 인지도 본다
      bkDone(INVFLOW._bk);                  // 뒤로가기가 층을 소비한 상태
      const wasDead = !bkAlive(INVFLOW._bk);
      _wizExit(); await w(200);            // 층이 부르는 바로 그 함수
      const modal = document.getElementById('mpModal').classList.contains('open');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await w(250);   // 취소
      const r = { modal, wasDead, rearmed: bkAlive(INVFLOW._bk), active: INVFLOW.active, wired: typeof _cb === 'function' };
      INVFLOW.active = false; bkKill(INVFLOW); _restore();
      return r;
    });
    INVFLOW.active = false;

    // ── 단체 사진 · 스냅 ──
    await step('photo: 손잡이 둘 · 자동저장 안내 없음', async () => {
      startPhotoFlow({ photo: ['양가 가족 전체'], photoWish: [], photoShareUrl: '' }); await w(150);
      const ov = document.getElementById('mp_photoOverlay');
      const txt = ov.innerText;
      return { save: !!ov.querySelector('[data-wiz-save]'), exit: !!ov.querySelector('[data-wiz-exit]'), autoNote: /나갈 때 자동으로 저장/.test(txt) };
    });
    await step('photo: 안 바꾸고 나가기 = 판 없음', async () => {
      _wizExit(); await w(200);
      return { modal: document.getElementById('mpModal').classList.contains('open'), gone: !document.getElementById('mp_photoOverlay') };
    });
    await step('photo: 바꾸고 나가기 = 판 뜸', async () => {
      startPhotoFlow({ photo: ['양가 가족 전체'], photoWish: [], photoShareUrl: '' }); await w(150);
      PHOTOFLOW.sel.push('친구들과');
      _wizExit(); await w(200);
      const open = document.getElementById('mpModal').classList.contains('open');
      const gh = [...document.getElementById('mpModalActions').querySelectorAll('button')].find((b) => b.textContent === '그냥 나가기');
      if (gh) gh.click(); await w(250);
      return { modal: open, gone: !document.getElementById('mp_photoOverlay') };
    });
    await step('snap: 손잡이 둘', async () => {
      startSnapFlow({}); await w(150);
      const ov = document.getElementById('mp_snapOverlay');
      if (!ov) return { err: '스냅 오버레이 없음' };
      const r = { save: !!ov.querySelector('[data-wiz-save]'), exit: !!ov.querySelector('[data-wiz-exit]') };
      _wizExit(); await w(250);
      r.gone = !document.getElementById('mp_snapOverlay');
      return r;
    });
    return { out, leftovers: document.querySelectorAll('.mp-fs,[data-wiz-exit]').length };
  });

  for (const c of r.out) {
    if (c.err) { bad.push(`${c.nm}: ${c.err}`); continue; }
    console.log(`  · ${c.nm}: ${JSON.stringify(c.v)}`);
  }
  const g = (n) => (r.out.find((x) => x.nm === n) || {}).v || {};
  const chk = (cond, msg) => { if (!cond) bad.push(msg); };
  chk(g('inv: 손잡이 둘').save && g('inv: 손잡이 둘').exit, 'inv 헤더에 저장·나가기 둘이 아니다');
  chk(g('inv: 손잡이 둘').label === '나가기', 'inv 나가기 라벨이 「나가기」가 아니다');
  chk(g('inv: 안 바꾸고 나가기 = 판 없음').modal === false, '안 바꿨는데 판이 떴다');
  chk(g('inv: 안 바꾸고 나가기 = 판 없음').active === false, '안 바꾸고 나가기가 안 나갔다');
  chk(g('inv: 바꾸고 나가기 = 판 뜸').modal === true, '바꿨는데 판이 안 떴다');
  chk((g('inv: 바꾸고 나가기 = 판 뜸').btns || []).join(',') === '저장하고 나가기,그냥 나가기', '판 갈래가 둘이 아니다');
  chk(g('inv: Esc = 취소(안 나감)').active === true, 'Esc 가 「그냥 나가기」로 새어 나갔다');
  chk(g('inv: 그냥 나가기').active === false, '그냥 나가기가 안 나갔다');
  chk(g('inv: 그냥 나가기').saved === -1, '그냥 나가기가 몰래 저장했다');
  chk(g('inv: 저장 버튼 = 안 나감 · 저장됨').dirtyLabel === '저장', '변경 뒤 라벨이 「저장」이 아니다');
  chk(g('inv: 저장 버튼 = 안 나감 · 저장됨').savedLabel === '저장됨', '저장 뒤 라벨이 「저장됨」이 아니다');
  chk(g('inv: 저장 버튼 = 안 나감 · 저장됨').active === true, '저장 버튼이 화면을 닫았다');
  chk(g('inv: 저장 뒤 나가기 = 판 없음').modal === false, '저장했는데도 나가기 판이 떴다');
  chk(g('inv: 한글만 적은 영문 칸 = 다음 막힘').modal === true, '한글 영문칸이 그냥 통과됐다');
  chk(g('inv: 한글만 적은 영문 칸 = 다음 막힘').stayed === true, '막고도 다음 단계로 넘어갔다');
  chk(g('inv: 발행 직전에도 막힌다(재진입)').published === -1, '영문 이름 없이 발행이 나갔다');
  chk(g('inv: 발행 직전에도 막힌다(재진입)').step === 'method', '막은 뒤 1단계로 안 돌려보냈다');
  chk(g('photo: 손잡이 둘 · 자동저장 안내 없음').save && g('photo: 손잡이 둘 · 자동저장 안내 없음').exit, '단체 사진에 저장·나가기 둘이 아니다');
  chk(g('photo: 손잡이 둘 · 자동저장 안내 없음').autoNote === false, "'나갈 때 자동으로 저장' 안내가 남아 있다");
  chk(g('photo: 안 바꾸고 나가기 = 판 없음').modal === false && g('photo: 안 바꾸고 나가기 = 판 없음').gone, '단체 사진 조용한 나가기가 안 된다');
  chk(g('photo: 바꾸고 나가기 = 판 뜸').modal === true && g('photo: 바꾸고 나가기 = 판 뜸').gone, '단체 사진 판·그냥 나가기가 안 된다');
  chk(g('back: 바꾸고 뒤로가기 = 판 · 취소하면 층 재무장').wired === true, '뒤로가기 층에 나가기 규칙이 안 걸려 있다');
  chk(g('back: 바꾸고 뒤로가기 = 판 · 취소하면 층 재무장').wasDead === true, '층 소비 흉내가 안 됐다(재서 틀림)');
  chk(g('back: 바꾸고 뒤로가기 = 판 · 취소하면 층 재무장').modal === true, '뒤로가기가 몰래 저장하고 나갔다');
  chk(g('back: 바꾸고 뒤로가기 = 판 · 취소하면 층 재무장').active === true, '뒤로가기 취소인데 나가 버렸다');
  chk(g('back: 바꾸고 뒤로가기 = 판 · 취소하면 층 재무장').rearmed === true, '뒤로가기 층이 재무장되지 않았다');
  chk(g('snap: 손잡이 둘').save && g('snap: 손잡이 둘').exit && g('snap: 손잡이 둘').gone, '스냅 손잡이·나가기가 안 된다');

  const p = await h.probe();
  if (p.errors.length) bad.push('JS 오류 ' + p.errors[0]);
  bad.forEach((b) => console.log('  ✖ ' + b));
  console.log(bad.length ? `틀림 ${bad.length}건` : '위저드 저장·나가기 한 벌 통과');
  process.exit(bad.length ? 1 : 0);
} finally { await h.close(); }
