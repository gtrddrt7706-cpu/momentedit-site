#!/usr/bin/env node
/* ★[B2_FIX_R1 2026-11-06 재검증 재수정 1묶음] 검증 세션이 «구현됨»을 다시 재서 남은 것으로 찾은 여덟 — 엔진을 직접 돌려 동작으로 잰다(문자열 표식만으로 «고쳐짐»이라 하지 않게).
   나28 두 분 목소리 날 5분 전 = 나레이션 판과 같은 판 고르기(경로 + 사진 · 하객 안내를 끈 날도 사진) · 확정 규칙 «사진 올리기 안내는 늘»
   나33 서약 맺는 말이 박수를 청하면 박수 구간(다음은 디렉터 GO) · 청하지 않으면 종전 4.5초 사슬
   나35 축사 → 축가는 여는 말이 박수를 청해도 246 + 박수
   NI05 개식 기본 «여러분의 박수로 시작하겠습니다!» 뒤 화촉 힌트 = «박수가 줄기 시작하면»
   글19 · 나62 · 나64 · 글18 = 화면 쪽 줄(order-preview) — 원천 글이 있는지 정적으로
   --selftest : 판정 함수가 옛 동작을 빨강으로 읽는지 스스로 깨 본다 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
const OP = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
let fail = 0;
const ok = (name, cond, info) => { if (cond) console.log('ok   ' + name); else { fail++; console.log('FAIL ' + name + (info ? ' → ' + JSON.stringify(info).slice(0, 300) : '')); } };
const q = (S) => C.build(Object.assign({ course: 'open' }, S), { mode: 'console' }).cues;

/* 판정 함수 — 셀프테스트가 옛 값을 넣어 본다 */
const photoAt5 = (cs) => { const c = cs.find((x) => x.k === 'guest' && x.atMin === -5); return !!(c && /사진/.test(c.text || '')); };
const vowClapOk = (cs) => { const i = cs.findIndex((c) => c.slug === 'narr-vow-out'); if (i < 0) return null; const c = cs[i], n = cs[i + 1] || {}; const asks = /박수[^.!?]*(부탁|바랍니다|주세요)/.test(c.text || '');
  return asks ? !!(c.live && c.live.applause) && n.fire === 'manual' : !c.live && n.fire === 'chain'; };
const speechClap = (cs) => cs.some((c) => c.slug === 'bridge-b10-speech-clap' && c.live && c.live.applause);

if (process.argv.includes('--selftest')) {
  let bad = 0; const t = (n, v) => { if (v) { console.log('ok   selftest ' + n); } else { bad++; console.log('FAIL selftest ' + n); } };
  t('5분 전 사진 없음 = 빨강', photoAt5([{ k: 'guest', atMin: -5, text: '시작 오 분 전입니다.' }]) === false);
  t('5분 전 큐 없음 = 빨강', photoAt5([]) === false);
  t('박수 청인데 live 없음 = 빨강', vowClapOk([{ slug: 'narr-vow-out', text: '큰 박수 부탁드립니다.' }, { fire: 'chain' }]) === false);
  t('246 없음 = 빨강', speechClap([{ slug: 'narr-song' }]) === false);
  process.exit(bad ? 1 : 0);
}

for (const [nm, S] of [['하객 안내', {}], ['하객 안내 끔', { guide: 0 }], ['식사 · 예약', { meal: 1, mealFull: 1, resv: '13:30' }], ['식사 · 하객 안내 끔', { meal: 1, mealFull: 1, guide: 0 }], ['온라인', { digital: 1 }]]) {
  const cs = q(Object.assign({ on: {}, guestVoice: 'couple' }, S));
  ok('[B2_FIX_NA_28] 두 분 목소리 · ' + nm + ' — 5분 전에 사진 올리기 문장', photoAt5(cs), cs.filter((c) => c.k === 'guest').map((c) => c.slug));
}
{ const cs = q({ on: {}, guestVoice: 'couple', meal: 1, mealFull: 1, resv: '13:30' }); const c = cs.find((x) => x.atMin === -5) || {};
  ok('[B2_FIX_NA_28] 두 분 목소리 · 식사 날 5분 전에 장소 · 예약 경로', /장소/.test(c.text || '') && /예약 시각/.test(c.text || ''), c.text); }
{ const cs = q({ on: {}, guestVoice: 'couple', digital: 1 }); const c = cs.find((x) => x.atMin === -5) || {};
  ok('[B2_FIX_NA_28] 두 분 목소리 · 온라인 문장은 5분 전 묶음 맨 끝', /온라인으로 함께하시는 분들은[^.]*\.$/.test(c.text || ''), c.text); }
for (const v of [0, 1, 2, 3]) { const r = vowClapOk(q({ on: { vow: 1, ring: 1 }, narEx: { vow: v } }));
  ok('[B2_FIX_NA_33] 서약 맺는 말 예시 ' + v + ' — 박수를 청하면 박수 구간 + GO · 아니면 4.5초 사슬', r === true); }
for (const v of [0, 1, 2, 3, 4]) ok('[B2_FIX_NA_35] 축사 → 축가(여는 말 예시 ' + v + ') — 246 + 박수', speechClap(q({ on: { free: 1, song: 1 }, freeWhat: 'speech', narEx: { song: v } })));
{ const cs = q({ on: { candle: 1 } }); const c = cs.find((x) => x.k === 'candle') || {};
  ok('[B2_FIX_NI05] 개식(기본 박수 청) 뒤 화촉 = 디렉터 GO · «박수가 줄기 시작하면»', c.fire === 'manual' && c.hint === '박수가 줄기 시작하면', [c.slug, c.fire, c.hint]); }
ok('[B2_FIX_GEUL_19] 한눈에 보기 «본식 뒤 · » · 옛 «식후 · » 없음', OP.includes('<p class="mk-note">본식 뒤 · \'') && !OP.includes('<p class="mk-note">식후 · \''));
ok('[B2_FIX_GEUL_19] 다음 단추에 «본식 뒤» 안 붙음', OP.includes("return '다음 · '+_post('_photo').n+' · '+_post('_after').n;") && !OP.includes("return '다음 · 본식 뒤 '"));
ok('[B2_FIX_NA_62] «그 밖의 분» 이름이 바뀌면 덕담 답 열쇠를 무른다(lsDeclWho)', /window\.lsDeclWho=function[\s\S]{0,900}if\(_chg&&\(S\.declBless==='yes'\|\|S\.declBless==='no'\)&&S\.declBlessKey\)\{ S\.declBlessKey='';/.test(OP));
ok('[B2_FIX_GEUL_18] 첫 덕담 차례 = 선언한 그 밖의 분(② · ③)', OP.includes("function _blessFirstWho(){") && OP.includes("esc('첫 덕담 · '+_blessFirstWho())") && OP.includes("grp[0].lab=grp[0].who+' 차례';"));
/* [B2_FIX_R1] 글 고치기가 따옴표를 어긋내 화면 전체가 멈춘 일(2026-11-06 · «Invalid or unexpected token») — 식순 화면의 안쪽 스크립트를 문법만 읽어 본다 */
{ const vm = require('node:vm'); const bad = []; let n = 0;
  OP.replace(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g, (m, at, body) => { if (/type="(?!text\/javascript|module)[^"]+"/.test(at)) return m; n++; try { new vm.Script(body); } catch (e) { bad.push(String(e.message).slice(0, 80)); } return m; });
  ok('[B2_FIX_R1] 식순 화면 안쪽 스크립트 ' + n + '개가 문법 오류 없이 읽힌다', n > 0 && bad.length === 0, bad); }
console.log(fail ? `✗ b2-fix-r1 ${fail}건` : 'ok b2-fix-r1 — 나28 · 나33 · 나35 · NI05 · 글19 · 나62 · 나64 · 글18');
process.exit(fail ? 1 : 0);
