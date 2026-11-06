#!/usr/bin/env node
/* ★[REFUND_TERMS_SAME 2026-11-06 대본 지시 3 · L20] «옛 판 서명 건은 그 판 조건» — 70_journey REFUND_TERMS_SAME 목록이 보존본과 맞는가.
 *
 *   환불 조항 = 시그니처 제4조 ⑧(시착 공제) · 제7조 · 제8조 · 제9조 / 스냅 제7조 · 제8조 · 제9조.
 *   보존본(contract/archive/v1-N · snap-v1-N)의 그 조문이 지금 판(contract/v1-1.html · snap-v1-0.html)과 글자까지 같으면 «같은 판»이다.
 *   ① 같은 판인데 목록에 없다 → 그 판 서명자가 괜히 «확인 필요»를 받는다(빨강)
 *   ② 다른 판인데 목록에 있다 → 그 판 서명자의 환불을 지금 판 표로 자동 계산한다(빨강 · 위험한 쪽)
 *   ③ 깨 보기 — 다른 판 하나를 목록에 몰래 넣거나 같은 판 하나를 빼면 빨강이 되는지
 * 판 번호 · 고객에게 안 보이는 주석 · 스크립트는 빼고 잰다. 종료: 0 통과 · 1 빨강 · 2 재지 못함
 */
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const strip = (h) => h.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<style\b[\s\S]*?<\/style>/g, '')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').replace(/(Snap )?v1\.\d+/g, 'V').trim();
function art(html, n) {   // <span class="art-num">제N조</span> 부터 다음 art-num 앞까지
  const a = html.indexOf('<span class="art-num">제' + n + '조</span>'); if (a < 0) return null;
  const b = html.indexOf('<span class="art-num">', a + 10); return strip(html.slice(a, b < 0 ? undefined : b));
}
function terms(html, sig) {
  const o = { 7: art(html, 7), 8: art(html, 8), 9: art(html, 9) };
  if (sig) { const a4 = art(html, 4) || ''; const m = a4.match(/⑧[^⑨]*/); o['4⑧'] = m ? m[0] : null; }
  return o;
}
const same = (a, b) => Object.keys(a).every((k) => a[k] != null && a[k] === b[k]);
const J = rd('automation/platform/70_journey.gs');
const m = J.match(/var REFUND_TERMS_SAME = (\{[^\n]*\});/);
if (!m) { console.log('━━ refund-terms-same — 70_journey 에 REFUND_TERMS_SAME 이 없다 · 재지 못함'); process.exit(2); }
const LIST = Function('return ' + m[1])();
const curDoc = (J.match(/docVersion: '(v1\.\d+)'/) || [])[1], curSnap = (J.match(/snapDocVersion: '(snap-v1\.\d+)'/) || [])[1];
const curSig = terms(rd('contract/v1-1.html'), true), curSn = terms(rd('contract/snap-v1-0.html'), false);
if (Object.values(curSig).some((v) => !v) || Object.values(curSn).some((v) => !v)) { console.log('━━ refund-terms-same — 지금 판에서 환불 조문을 못 찾았다 · 재지 못함'); process.exit(2); }

function judge(list) {
  const bad = [], seen = { sig: [], snap: [] };
  for (const f of fs.readdirSync(path.join(ROOT, 'contract/archive'))) {
    let k, v, t;
    if (/^v1-(\d+)\.html$/.test(f)) { k = 'sig'; v = 'v1.' + f.match(/^v1-(\d+)/)[1]; t = same(terms(rd('contract/archive/' + f), true), curSig); }
    else if (/^snap-v1-(\d+)\.html$/.test(f)) { k = 'snap'; v = 'snap-v1.' + f.match(/v1-(\d+)/)[1]; t = same(terms(rd('contract/archive/' + f), false), curSn); }
    else continue;
    if (v === (k === 'sig' ? curDoc : curSnap)) continue;   // 지금 판(보존본이 먼저 생긴 순간)은 목록에 적지 않는다
    seen[k].push(v);
    const inList = list[k].indexOf(v) !== -1;
    if (t && !inList) bad.push(`① ${v} 은 환불 조항이 지금 판과 같은데 목록에 없다 — 그 판 서명자가 괜히 «확인 필요»를 받는다`);
    if (!t && inList) bad.push(`② ${v} 은 환불 조항이 다른데 목록에 있다 — 그 판 서명자를 지금 판 표로 자동 계산한다`);
  }
  for (const k of ['sig', 'snap']) for (const v of list[k]) if (seen[k].indexOf(v) === -1) bad.push(`목록의 ${v} 에 맞는 보존본이 없다`);
  return bad;
}
const bad = judge(LIST);
// ③ 깨 보기
const mut1 = { sig: LIST.sig.concat(['v1.7']), snap: LIST.snap };
const mut2 = { sig: LIST.sig.slice(1), snap: LIST.snap };
const selfOk = judge(mut1).some((x) => /^②/.test(x)) && judge(mut2).some((x) => /^①/.test(x));
if (!selfOk) bad.push('③ 깨 보기 — 다른 판을 넣거나 같은 판을 빼도 빨강이 안 된다(검사가 죽었다)');
if (bad.length) { console.log('━━ refund-terms-same — 빨강 ' + bad.length + '건 [REFUND_TERMS_SAME]'); bad.forEach((b) => console.log('  ✖ ' + b)); process.exit(1); }
console.log(`━━ refund-terms-same — 통과 · 같은 환불 조건 옛 판 시그니처 ${LIST.sig.length} · 스냅 ${LIST.snap.length} · 지금 판 ${curDoc} · ${curSnap} · 깨 보기 둘 [REFUND_TERMS_SAME]`);
