#!/usr/bin/env node
/* ★[BLESS_CARD_WHO_N06 2026-11-18 야간 점검 #06] 말씀하실 분을 고른 날(NARR_ROLE_1115) 연습 · 이어 보기의 덕담 카드 이름 = 고른 분.
   종전엔 나레이션 «먼저, 신랑 아버님의 …»(362) 바로 뒤 카드가 예시 인물 «신부 아버지 차례»였다.
   order-preview.html 의 _lRefExpand 안 — _blessFirstWho 판 다음 · _vowPract 앞에 «고른 분» 판이 있는지 · 판정 순서를 정적으로 잰다.
   --selftest : 그 줄을 지운 글을 넣어 빨강이 되는지 스스로 깨 본다 */
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OP = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
const LINE = "else if(x.k==='bless'&&grp.length&&!_scrT&&!S.blessProxy&&R.blessWhoOf){ var _bwA=R.blessWhoOf(S)||[]; if(_bwA.length){ grp.forEach(function(q,i){ var n=_bwA.length===grp.length?R.whoLabel(R.BLESS_WHO,_bwA[i]):_bwA.length===1?R.whoLabel(R.BLESS_WHO,_bwA[0]):'부모님'; q.who=n; q.lab=n+' 차례'; }); } }";
const FIRST = "if(x.k==='bless'&&grp.length&&_blessFirstWho()){ grp[0].who=_blessFirstWho(); grp[0].lab=grp[0].who+' 차례'; }";
const judge = (src) => { const a = src.indexOf(FIRST), b = src.indexOf(LINE), c = src.indexOf("if(x.k==='vow') grp=_vowPract(grp,x);");
  return a > -1 && b > a && c > b && src.slice(a + FIRST.length, b).replace(/\/\*[\s\S]*?\*\//g, '').trim() === ''; };
/* 고른 분 → 카드 이름 셈(위 줄과 같은 규칙) — 표로 잰다 */
const L = { gf: '신랑 아버님', bf: '신부 아버님', gm: '신랑 어머님', bm: '신부 어머님' };
const names = (picks, cards) => Array.from({ length: cards }, (_, i) => picks.length === cards ? L[picks[i]] : picks.length === 1 ? L[picks[0]] : '부모님');
if (process.argv.includes('--selftest')) {
  let bad = 0; const t = (n, v) => { console.log((v ? 'ok   ' : 'FAIL ') + 'selftest ' + n); if (!v) bad++; };
  t('줄을 지우면 빨강', judge(OP.replace(LINE, '')) === false);
  t('_blessFirstWho 앞으로 옮기면 빨강', judge(OP.replace(LINE, '').replace(FIRST, LINE + FIRST)) === false);
  process.exit(bad ? 1 : 0);
}
let fail = 0; const ok = (n, v, i) => { console.log((v ? 'ok   ' : 'FAIL ') + n + (v || !i ? '' : ' → ' + JSON.stringify(i))); if (!v) fail++; };
ok('[BLESS_CARD_WHO_N06] 덕담 카드 이름 = 고른 분(_blessFirstWho 다음 · _vowPract 앞)', judge(OP));
ok('[BLESS_CARD_WHO_N06] 두 분 · 예시 한 장 → «부모님»', names(['gf', 'bf'], 1).join() === '부모님');
ok('[BLESS_CARD_WHO_N06] 두 분 · 예시 두 장 → 고른 차례', names(['gf', 'bf'], 2).join() === '신랑 아버님,신부 아버님');
ok('[BLESS_CARD_WHO_N06] 한 분 → 그 역할', names(['bm'], 2).join() === '신부 어머님,신부 어머님');
console.log(fail ? `✗ bless-card-who ${fail}건` : 'ok bless-card-who');
process.exit(fail ? 1 : 0);
