#!/usr/bin/env node
/* ★★[CLOSING_LINE_1031 검토 178 사장님 19:41 «사진은 작가님 몫»] 닫는 인사 뒤 «마무리 멘트» · 사진 구간은 소리 없음.
   ① 세 판(식사 있음 · 식사 · 카페만 · 애프터 웨딩 없음) × 하객 안내 있음/없음 × 디지털 있음/없음 — 고른 클립 · 글이 명세 그대로
      식사 있음 = 47#0 + 266 두 문장 + (264) + 44 · 식사 · 카페만 = 47#0 + (264) + 44 · 없음 = 47 전체 + (264) + 44 · 264 는 하객 안내 날만
   ② 차례 — 닫는 인사(박수 · 디렉터 GO) → (디지털 날 온라인 인사 2분) → 마무리 멘트(GO 에 바로 · 디지털 날 2초) → 소리 없는 사진 큐(전체 하객 · 가족 구도 · 자유 사진 · 촬영 마무리)
   ③ 사진 구간 나레이션 0 — 마무리 멘트 뒤에는 소리 나는 큐가 없다(새 코스) · 265 · 266 · 26 · 219 · 262 · 85 · 47 · 44 큐가 없다
   ④ 새 녹음 0 — 마무리 멘트 문장마다 창고 자리가 빌려 온 소리(from)이고 그 글이 원천 클립 문장과 같다 · mp3 가 있다 · 줄 주인(화자) = 빌려 온 자리의 목소리
   ⑤ 흐름 쉼 — 47 의 두 문장이 이어지는 판(287 · 288)은 47 의 쉼(1.35)을 그대로 · 대장(manifest)에 들어갔다
   ⑥ 화면 글 — 마이페이지 · 하객 안내 · AI 상담 지식이 사진 «모여 달라»를 안내 음성 몫으로 말하지 않는다
   스스로 깨 보기 셋. node scripts/audit/closing-line.mjs   종료 코드 0 통과 · 1 실패 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
const rd = (f) => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { return ''; } };
let bad = 0;
const ok = (m, c, d) => { if (c) console.log('ok   ' + m); else { bad++; console.log('FAIL ' + m + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 400) : '')); } };
const sents = (t) => String(t || '').match(/[^.!?]+[.!?]/g).map((x) => x.trim());
const E = C.EXTRA, A = sents(E['end-2-goodbye']), M = sents(E['narr-photo-pre-meal']).slice(3, 5), U = E['narr-photo-upload'], W = E['end-0-photo'];

export function want(o) {
  const meal = o.meal && o.mealFull && o.resv && o.guide;
  const body = meal ? [A[0]].concat(M) : o.meal ? [A[0]] : A.slice();
  return { slug: meal ? 'narr-closing-meal' : o.meal ? (o.guide ? 'narr-closing-soft-guide' : 'narr-closing-soft') : (o.guide ? 'narr-closing-guide' : 'narr-closing'),
    text: body.concat(o.guide ? [U] : [], [W]).join(' ') };
}
export function check(build) {
  const out = [];
  const CASES = [];
  for (const meal of [{ meal: 1, mealFull: 1, resv: 1 }, { meal: 1, mealFull: 0, resv: 1 }, { meal: 0 }]) for (const guide of [0, 1]) for (const digital of [0, 1]) CASES.push(Object.assign({}, meal, { guide, digital }));
  for (const o of CASES) {
    const tag = JSON.stringify(o), w = want(o);
    const q = build(Object.assign({ course: 'open', on: { toast: 1 } }, o), 'console').cues;
    const bow = q.findIndex((c) => c.slug === 'narr-close-bow'), ic = q.findIndex((c) => /^narr-closing/.test(c.slug || '')), cl = q[ic] || {};
    if (cl.slug !== w.slug) out.push(`① ${tag} 판 ${cl.slug} ≠ ${w.slug}`);
    if (cl.text !== w.text) out.push(`① ${tag} 글이 명세와 다르다 — «${cl.text}»`);
    const mid = q.slice(bow + 1, ic).map((c) => c.slug);
    if (JSON.stringify(mid) !== JSON.stringify(o.digital ? ['narr-online-in'] : [])) out.push(`② ${tag} 닫는 인사와 마무리 사이 ${JSON.stringify(mid)}`);
    if (cl.fire !== 'manual' || (cl.goLeadMs || 0) !== (o.digital ? 2000 : 0)) out.push(`② ${tag} 마무리 멘트 GO · 간격(${cl.fire} · ${cl.goLeadMs})`);
    const after = q.slice(ic + 1);
    if (after.some((c) => c.slug)) out.push(`③ ${tag} 마무리 뒤 소리 나는 큐 — ${after.filter((c) => c.slug).map((c) => c.slug).join(' · ')}`);
    if (after.map((c) => c.actId).join(',') !== 'photo-all,photo-family,photo-free,photo-end') out.push(`② ${tag} 사진 큐 차례 ${after.map((c) => c.actId || c.slug).join(',')}`);
    const gone = ['narr-photo-pre', 'narr-photo-pre-meal', 'narr-close', 'narr-close-ex2', 'narr-photo-free', 'narr-photo-send', 'end-2-goodbye', 'end-0-photo'].filter((s) => q.some((c) => c.slug === s));
    if (gone.length) out.push(`③ ${tag} 걷은 큐가 남았다 — ${gone.join(' · ')}`);
  }
  return out;
}

const direct = !!process.argv[1] && /closing-line\.mjs$/.test(process.argv[1]);
if (direct) {
  const bld = (S, mode) => C.build(S, { mode });
  const r = check(bld);
  ok('① ② ③ 세 판 × 하객 안내 × 디지털 = 12 조합 — 글 · 차례 · 간격 · 사진 구간 나레이션 0', !r.length, r);
  /* 미리 듣기도 마무리 멘트가 끝 · 사진 큐 없음 */
  const pv = C.build({ course: 'open', on: {} }, { mode: 'preview' }).cues;
  ok('미리 듣기 — 마무리 멘트가 맨 끝(사진 구간은 당일 콘솔에만)', /^narr-closing/.test((pv[pv.length - 1] || {}).slug || ''), pv.slice(-3).map((c) => c.slug));
  /* ④ 소리 */
  const idx = JSON.parse(rd('assets/audio/_src/_index.json') || '{}').slots || {};
  const man = JSON.parse(rd('docs/plans/식순연구/타입캐스트/manifest.json') || '{}');
  const s4 = [];
  for (const [sl, parts] of Object.entries(C.CLOSING_PARTS || {})) {
    const id = C.noOf(sl) + '_' + sl;
    if (!fs.existsSync(path.join(ROOT, 'assets/audio/narration', id + '.mp3'))) s4.push(`${id}.mp3 없음`);
    const mc = (man.clips || []).find((c) => `${c.no}_${c.file}` === id);
    parts.forEach((p, i) => { const e = idx[id + '#' + i], src = idx[p[2]];
      if (!e || !e.from) s4.push(`${id}#${i} 창고 자리가 빌려 온 소리가 아니다`);
      else if (e.from !== p[2]) s4.push(`${id}#${i} 빌려 온 자리 ${e.from} ≠ ${p[2]}`);
      if (!src || src.text !== p[1]) s4.push(`${id}#${i} 원천 ${p[2]} 글이 다르다`);
      if (src && e && src.voice !== e.voice) s4.push(`${id}#${i} 목소리 ${e.voice} ≠ 원천 ${src.voice}`);
      const ms = mc && mc.sents[i]; if (!ms || ms.text !== p[1] || (ms.role || mc.role) !== p[0]) s4.push(`${id}#${i} 대장 줄 주인 · 글이 다르다`); });
  }
  ok('④ 새 녹음 0 — 마무리 멘트 17문장이 전부 빌려 온 녹음 · 글 · 목소리 · 줄 주인 그대로 · mp3 다섯', !s4.length, s4);
  /* ⑤ 흐름 쉼 */
  const s5 = [];
  for (const id of ['287_narr-closing', '288_narr-closing-guide']) { const mc = (man.clips || []).find((c) => `${c.no}_${c.file}` === id); if (!mc || mc.sents[0].after !== 1.35) s5.push(`${id}#0 뒤 쉼 ${mc && mc.sents[0].after}`); }
  ok('⑤ 47 두 문장을 잇는 판(287 · 288)은 47 의 쉼 1.35초 그대로', !s5.length, s5);
  /* ⑥ 화면 글 */
  const mp = rd('mypage.html'), gd = rd('guide.html'), kb = rd('api/_kb.js');
  ok('⑥ 마이페이지 · 하객 안내 · AI 상담 — 사진은 작가님 안내 · 안내 음성이 모으지 않는다', /마무리 인사가 끝나면 작가님 안내에 따라 진행해요/.test(mp) && mp.indexOf('시작할 때 안내 음성이 «촬영 차례가 아닌 분들은') < 0
    && /예식 뒤: 작가님 안내에 따라 모두 함께 한 장/.test(gd) && /마무리 인사\(안내 음성\) 뒤 작가님 안내에 따라/.test(kb) && kb.indexOf('사진 전 안내 뒤 하객 모두와') < 0);
  /* 스스로 깨 보기 */
  let dead = 0;
  const brk = (mut) => (S, mode) => { const r0 = C.build(S, { mode }); return { cues: mut(r0.cues.slice()) }; };
  if (!check(brk((q) => { const i = q.findIndex((c) => /^narr-closing/.test(c.slug || '')); q.splice(i + 1, 0, { slug: 'narr-photo-free' }); return q; })).length) { dead++; console.log('FAIL 깨 보기 «사진 구간에 262 되살림» — 빨강이 안 됐다'); }
  if (!check(brk((q) => q.map((c) => /^narr-closing/.test(c.slug || '') ? Object.assign({}, c, { text: c.text.replace('작가님이', '사진작가가') }) : c))).length) { dead++; console.log('FAIL 깨 보기 «글 바꿈» — 빨강이 안 됐다'); }
  if (!check(brk((q) => q.map((c) => /^narr-closing/.test(c.slug || '') ? Object.assign({}, c, { goLeadMs: 2000 }) : c))).length) { dead++; console.log('FAIL 깨 보기 «간격 2초를 늘 줌» — 빨강이 안 됐다'); }
  if (bad || dead) { console.log(`✗ CLOSING_LINE_1031 실패 ${bad + dead}건`); process.exit(1); }
  console.log('ok closing-line — 마무리 멘트 12 조합 · 사진 구간 나레이션 0 · 새 녹음 0(17문장 빌림) · 흐름 쉼 · 화면 글 · 깨 보기 3개 맞음');
  process.exit(0);
}
