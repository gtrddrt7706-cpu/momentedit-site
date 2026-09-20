/* [PICK_BACK_BUILD] 「지금 이렇게 돼 있습니다 — 되돌릴 것 고르세요」 최종 판 (2026-09-20)
 *
 * ★왜 스크립트인가 — 손으로 만든 첫 판이 **하루도 못 가 낡았다.**
 *   올린 뒤 26·44·45·59·60·61·64·09·11 이 바뀌었고, 화면의 「지금 문장」이 전부 거짓이 됐다.
 *   문면이 바뀔 때마다 다시 뽑는다. 그래서 「지금」은 **저장소 실측**에서만 가져온다.
 *
 * ★모으는 곳 넷 — 한 곳만 보면 절반이 빠진다
 *   ① 판정_전체.json            코워크 전 회차 판정(이미 반영된 것)
 *   ② 큐순서읽기_반영.tsv        순서를 알고서야 보인 것
 *   ③ 어조표_문면_대조.tsv       커플이 고르는 벌
 *   ④ ritual-data 승격 문면      [ENTRY_PROMOTE] 로 자리가 바뀐 것
 *
 * ★식순 차례로 줄 세운다 — 사장님이 «읽는 순서»로 보셔야 앞뒤 겹침이 눈에 든다.
 *   [CUE_ORDER_TEXT] 와 같은 원천(엔진)에서 차례를 받는다.
 *
 *   node scripts/build-pick-back.mjs > pick-final.html
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require_ = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const man = JSON.parse(R('docs/plans/식순연구/타입캐스트/manifest.json'));
const { want: ENGINE } = (await import('./lib/engine-calls.mjs')).engineCalls();
const Cue = require_(path.join(ROOT, 'assets/ritual-cue.js'));

/* ── 지금 문면(저장소 실측) ─────────────────────────────── */
const NOW = new Map(), META = new Map();
for (const c of man.clips) {
  META.set(c.no + '_' + c.file, { label: c.label || '', role: c.role, voice: c.voice || '' });
  for (const s of c.sents) NOW.set(c.no + '_' + c.file + '#' + s.i, s.text.trim());
}

/* ── 식순 차례 ──────────────────────────────────────────── */
const ORD = new Map();
for (const S of [{ course: 'damback' }, { course: 'family', bless: 'on' }, { course: 'record' }]) {
  let b; try { b = Cue.build(S); } catch { continue; }
  b.cues.forEach((c, i) => {
    const id = String(c.file || ''); if (!id) return;
    if (!ORD.has(id) || ORD.get(id) > i) ORD.set(id, i);
  });
}
const ordOf = (id) => (ORD.has(id) ? ORD.get(id) : 900 + id.localeCompare(''));

/* ── 모으기 ─────────────────────────────────────────────── */
const items = [];
const push = (o) => { if (o.now && o.was && o.now !== o.was) items.push(o); };
const tsv = (p) => {
  const L = R(p).trim().split('\n').filter(x => x && !x.startsWith('#'));
  const h = L[0].split('\t');
  return L.slice(1).map(l => Object.fromEntries(l.split('\t').map((v, i) => [h[i], v])));
};

/* ① 코워크 판정 — 이미 반영된 것만 (지금 문면 == 제안) */
const J = JSON.parse(R('scripts/audit/copycheck/판정_전체.json'));
for (const c of J.clips) for (const s of (c.sents || [])) {
  const id = c.no + '_' + c.slug + '#' + s.i;
  const now = NOW.get(id), nw = (s.new || '').trim(), od = (s.old || '').trim();
  if (!now || !nw || nw === od || now !== nw) continue;
  push({ id, clip: c.no + '_' + c.slug, now, was: od, why: (s.why || '').trim(), must: !!s.must, kind: '문안' });
}
/* ② 큐 순서 회차 */
for (const r of tsv('docs/plans/식순연구/큐순서읽기_반영_20260920.tsv')) {
  const clip = r['번호'] + '_' + r['슬러그'], id = clip + '#' + r['문장'];
  push({ id, clip, now: (NOW.get(id) || r['후']).trim(), was: r['전'].trim(), why: r['왜'] || '', must: true, kind: '문안' });
}
/* ③ 어조 선택지 — ★「지금」은 표가 아니라 **실측**에서 가져온다.
 *   표의 「갈 문면」을 그대로 쓰면 그 뒤에 또 바뀐 자리가 거짓이 된다.
 *   실제로 entry·E 가 두 번 바뀌었고(어조표 → 큐읽기 「오늘」 제거) 표만 보면 옛 판을 보여 준다. */
const PL = (await import('node:child_process')).execFileSync('node',
  [path.join(ROOT, 'scripts/audit/pick-list.mjs')], { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] });
const SPOT = new Map(); { let ev = null;
  for (const ln of PL.split('\n')) {
    const h = ln.match(/^##\s+(.+?)\s+`(\w+)`/); if (h) { ev = h[2]; continue; }
    const m = ln.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*[\d-]+\s*\|\s*(.+?)\s*\|$/);
    if (m && ev && m[1].trim() !== '갈래' && m[1].trim() !== '---')
      SPOT.set(`${ev}·${m[1].trim()}·${m[2].trim()}`, m[3].replace(/\s+/g, ' ').trim());
  } }
if (SPOT.size < 20) { console.error('[PICK_BACK_BUILD] FAIL pick-list 에서 자리를 ' + SPOT.size + '개밖에 못 읽었다'); process.exit(1); }
for (const r of tsv('docs/plans/식순연구/어조표_문면_대조.tsv')) {
  const id = `${r['이벤트']}·${r['갈래']}·${r['판']}`;
  const now = SPOT.get(id);
  if (!now) { console.error('[PICK_BACK_BUILD] FAIL 선택지 자리가 목록에 없다 — ' + id); process.exit(1); }
  push({ id, clip: r['이벤트'], now, was: r['지금 문면(저장소)'].trim(),
         why: r['비고'] || '', must: true, kind: '선택지' });
}

/* ★중복 제거 — 같은 자리를 두 판에서 고쳤으면 «가장 옛 것 → 지금»으로 하나만 남긴다 */
const byId = new Map();
for (const it of items) {
  const p = byId.get(it.id);
  if (!p) byId.set(it.id, it);
  else byId.set(it.id, { ...it, was: p.was, why: [p.why, it.why].filter(Boolean).join(' / ') });
}
const list = [...byId.values()].sort((a, b) => {
  if ((a.kind === '선택지') !== (b.kind === '선택지')) return a.kind === '선택지' ? 1 : -1;
  return ordOf(a.clip) - ordOf(b.clip) || a.id.localeCompare(b.id);
});
for (const it of list) { const m = META.get(it.clip); it.label = m ? m.label : ''; it.voice = m ? (m.voice || m.role) : ''; it.live = ENGINE.has(it.clip); }

const DATA = JSON.stringify(list);
const KEY = crypto.createHash('sha1').update(DATA).digest('hex').slice(0, 8);
const nMust = list.filter(x => x.must).length;
process.stderr.write(`[PICK_BACK_BUILD] ${list.length}건 (문안 ${list.filter(x=>x.kind==='문안').length} · 선택지 ${list.filter(x=>x.kind==='선택지').length}) · 열쇠 ${KEY}\n`);
process.stdout.write(R('scripts/pick-back.tpl.html').replace('__DATA__', DATA).replace(/__KEY__/g, KEY).replace('__N__', String(list.length)).replace('__NMUST__', String(nMust)));
