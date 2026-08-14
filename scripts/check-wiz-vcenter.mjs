// [CANT_LOOK] 0=통과 1=재서 틀림 2=못 잼 — 오버레이 세로 자리(WIZ_VCENTER) + 가로 넘침 실측
import { openProbe } from './audit/page-probe.mjs';
const W = Number(process.argv[2] || 390), H = Number(process.argv[3] || 844);
const h = await openProbe('mypage.html', { width: W, settle: 1200 });
const bad = [];
try {
  await h.page.setViewportSize({ width: W, height: H });
  await h.page.evaluate(() => {
    const mv = document.getElementById('mypageView'); if (mv) { mv.classList.add('show'); mv.style.animation = 'none'; }
    const ld = document.getElementById('loading'); if (ld) ld.style.display = 'none';
    window.api = function () { return Promise.resolve({ ok: true }); };
    window.apiTrackSave = window.api; window.getToken = function () { return 't'; };
    window._mpRefresh = function () {};
    window.bkOpen = function () { return 1; }; window.bkDone = function () {}; window.bkKill = function () {}; window.bkAlive = function () { return true; };   // 히스토리 층은 재는 대상이 아니다 — 층 불균형이 페이지를 떠나게 하므로 막아 둔다
  });
  await h.page.waitForTimeout(700);
  const r = await h.page.evaluate(async () => {
    const w = (ms) => new Promise((s) => setTimeout(s, ms));
    const box = document.getElementById('mp_production');
    const out = [];
    const meas = (nm, host, card) => {
      if (!host || !card) { out.push({ nm, err: '요소 없음' }); return; }
      const hr = host.getBoundingClientRect(), cr = card.getBoundingClientRect();
      out.push({ nm, top: Math.round(cr.top - hr.top), bot: Math.round(hr.bottom - cr.bottom), h: Math.round(cr.height), host: Math.round(hr.height), ovf: document.documentElement.scrollWidth > innerWidth });
    };
    box.style.display = 'block';
    // 청첩장 — 짧은 단계(확인)와 긴 단계(이름)
    INVFLOW = { active: true, step: 'confirm', draft: { method: 'both', designFamily: '01', designOnline: '05', _onlineSame: 'N', greetingShowParents: 'Y' }, base: { groomEn: 'Heejun', brideEn: 'Miku' } };
    _wizStart('inv'); _prodFsSync(); renderInvFlow(box); await w(120);
    meas('청첩장 확인(짧음)', box, box.firstElementChild);
    INVFLOW.step = 'method'; renderInvFlow(box); await w(120);
    meas('청첩장 이름(김)', box, box.firstElementChild);
    INVFLOW.active = false; _prodFsSync();
    // 애프터 웨딩 — 2/2 안내 없이(짧음)
    startTrkFlow('dining', { need: 'none', _step: 1 }, {}); await w(200);
    meas('애프터 웨딩 2/2(짧음)', box, box.firstElementChild);
    TRKFLOW.active = false; _prodFsSync();
    // 단체 사진 · 스냅 — 자체 오버레이
    startPhotoFlow({ photo: ['양가 가족 전체'], photoFx: [], photoShareUrl: '' }); await w(220);
    meas('단체 사진', document.getElementById('mp_photoBody'), document.getElementById('mp_photoBody').firstElementChild);
    _photoTearDown();
    startSnapFlow({}); await w(220);
    meas('스냅 기획', document.getElementById('mp_snapBody'), document.getElementById('mp_snapBody').firstElementChild);
    _snapTearDown();
    return out;
  });
  for (const c of r) {
    if (c.err) { bad.push(`${c.nm}: ${c.err}`); continue; }
    const tall = c.h > c.host - 20;
    const skew = !tall && c.bot > c.top * 3 && c.bot > 120;
    console.log(`  ${skew || c.ovf ? '✖' : '·'} ${c.nm}: 위 ${c.top} / 카드 ${c.h} / 아래 ${c.bot} (칸 ${c.host}) ${tall ? '· 길어서 흐름' : ''}`);
    if (skew) bad.push(`${c.nm}: 위쪽 쏠림(위 ${c.top} · 아래 ${c.bot})`);
    if (c.ovf) bad.push(`${c.nm}: 가로 넘침`);
  }
  const p = await h.probe();
  if (p.errors.length) bad.push('JS 오류 ' + p.errors[0]);
  bad.forEach((b) => console.log('  ✖ ' + b));
  console.log(bad.length ? `틀림 ${bad.length}건` : '세로 자리 통과');
  process.exit(bad.length ? 1 : 0);
} finally { await h.close(); }
