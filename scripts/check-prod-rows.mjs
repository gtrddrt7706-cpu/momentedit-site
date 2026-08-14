/* [CANT_LOOK] 0=통과 1=재서 틀림 2=못 잼 — 「예식 준비」 행의 말과 진실이 같은가 [PROD_ROW_TRUTH]
 *
 * ★왜 만드나 (2026-08-14 사용자 지시 "이런식의 버그들이너무많아 전수점검후 확실하게 개선하자 · 원인도찾고")
 *   실사고: 「좌석 · 음료」 행이 `t.final` 을 읽는데, 그 행의 버튼은 2026-07-19 이후
 *   최종 확정 위저드가 아니라 **좌석 편집기**를 연다. 그래서 좌석을 끝내도 행은 '시작하기'였다.
 *   원인은 한 줄의 오타가 아니라 **행이 읽는 값과 그 행이 바꾸는 값이 갈린 것**이다.
 *   화면을 옮길 때마다 이 짝이 조용히 어긋나므로, 짝을 여기 적어 두고 기계가 지킨다.
 *
 * ★규칙 (행마다)
 *   ① 트랙이 '완료'면 행도 완료로 보여야 한다 — ✓ 가 서고, 버튼이 '시작하기'가 아니어야 한다
 *   ② 트랙이 '진행중'이면 '시작하기'가 아니라 이어서 하는 말이어야 한다
 *   ③ 트랙이 비었으면 ✓ 가 서면 안 된다
 *   ★새 행을 만들면 ROWS 에 그 짝을 적는다. 안 적으면 이 검사가 그 행을 안 본다.
 */
import { openProbe } from './audit/page-probe.mjs';

/* 행 이름 → 그 행의 진실이 사는 곳. set(state, 상태) 로 그 상태를 만든다. */
const ROWS = [
  { nm: '청첩장',      set: (S, v) => { S.inv.status = v; if (v === '완료') S.inv.published = { urls: { family: 'https://x/a' } }; } },
  { nm: '식순',        set: (S, v) => { S.t.ritual = v; } },
  { nm: '애프터 웨딩', set: (S, v) => { S.t.dining = v; S.dd = { need: 'yes', venuePick: '어느 식당' }; } },
  { nm: '좌석 · 음료', set: (S, v) => { S.t.seat = v; S.sd = { tables: [{ seats: ['', ''], drinks: ['', ''] }] }; } },
];

const base = () => ({ t: {}, inv: {}, dd: null, fd: null, sd: null, p: {} });

const h = await openProbe('mypage.html', { width: 390, settle: 900 });
const bad = [];
try {
  const r = await h.page.evaluate((ROWS_S) => {
    const rows = ROWS_S.map((x) => ({ nm: x.nm, set: new Function('S', 'v', x.setSrc) }));
    const out = [];
    // 행 하나를 HTML 에서 뽑는다 — 이름으로 찾고, ✓ 유무와 버튼 글자를 돌려준다
    function readRow(html, nm) {
      const box = document.createElement('div'); box.innerHTML = html;
      const els = [...box.querySelectorAll('.trk')];
      for (const el of els) {
        const t = (el.querySelector('.trk-nm') || {}).textContent || '';
        if (t.replace(/\s+/g, ' ').trim().indexOf(nm) !== 0) continue;
        const btn = el.querySelector('button,a');
        return { done: !!el.querySelector('.trk-ok'), label: (btn ? btn.textContent : '').trim(), nmTxt: t.trim() };
      }
      return null;
    }
    for (const row of rows) {
      for (const v of ['', '진행중', '완료']) {
        const S = { t: {}, inv: {}, dd: null, fd: null, sd: null, p: {} };
        row.set(S, v);
        let html = '';
        try { html = productionDashHtml(S.t, S.inv, S.dd, S.fd, { weddingDate: '2026-12-24' }, null, S.sd, { tracks: S.t, seatDraft: S.sd, diningDraft: S.dd, guideinfoDraft: {} }); }
        catch (e) { out.push({ nm: row.nm, v, err: String(e).slice(0, 100) }); continue; }
        const got = readRow(html, row.nm);
        if (!got) { out.push({ nm: row.nm, v, err: '행을 못 찾음' }); continue; }
        out.push({ nm: row.nm, v, done: got.done, label: got.label });
      }
    }
    return out;
  }, ROWS.map((x) => ({ nm: x.nm, setSrc: '(' + x.set.toString() + ')(S,v)' })));

  const START = /^시작하기$/;
  for (const c of r) {
    if (c.err) { bad.push(`${c.nm}[${c.v || '시작전'}]: ${c.err}`); continue; }
    console.log(`  · ${c.nm.padEnd(12)} [${(c.v || '시작전').padEnd(3)}] ✓=${c.done ? 'Y' : 'n'} · 「${c.label}」`);
    if (c.v === '완료') {
      if (!c.done) bad.push(`${c.nm}: 트랙이 '완료'인데 행에 ✓ 가 없다`);
      if (START.test(c.label)) bad.push(`${c.nm}: 트랙이 '완료'인데 버튼이 「시작하기」다`);
    }
    if (c.v === '진행중' && START.test(c.label)) bad.push(`${c.nm}: 트랙이 '진행중'인데 버튼이 「시작하기」다(이어서 할 수 있다고 말해야 한다)`);
    if (c.v === '' && c.done) bad.push(`${c.nm}: 아무것도 안 했는데 ✓ 가 섰다`);
  }
  const p = await h.probe();
  if (p.errors.length) bad.push('JS 오류 ' + p.errors[0]);
  bad.forEach((b) => console.log('  ✖ ' + b));
  console.log(bad.length ? `틀림 ${bad.length}건` : '행의 말과 진실 일치');
  process.exit(bad.length ? 1 : 0);
} finally { await h.close(); }
