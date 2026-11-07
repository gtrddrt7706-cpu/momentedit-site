#!/usr/bin/env node
/* ★[SEAM_WORD_1107 2026-11-07 대본 · 사장님 실청 승인용] 실청 비교 판(listen-speed-1107.html)에 «이음매» 칸을 붙인다(다시 뽑아도 이 스크립트를 한 번 더 돌리면 된다 · 같은 칸은 갈아 끼운다).
   J01 입장 → 맞절 · J06 맞절 → 감사 인사 — «지금 / 바뀐 뒤» 두 단추 · 소리는 assets/audio/preview/seam-1107/(앞 순간 마지막 말 → 다음 순간 첫 말 · 엔진 빠르기 · 사람 구간은 1초)
   쓰기: node scripts/listen-seam-word.mjs */
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..'); const P = path.join(ROOT, 'listen-speed-1107.html');
let h = fs.readFileSync(P, 'utf8');
const J = [
  ['J01', '입장 → 맞절', '[144] «…두 사람이 한자리에 섰습니다.» → 쉼 1.25초 → [160] 첫 문장', '«다음은 여러 하객과 가족 앞에서 부부의 예를 드리는 신랑 신부 맞절이 있겠습니다.»', '«이어서 신랑 신부의 맞절이 있겠습니다.»(132#0) · 160#1 · 160#2 · 앞뒤 쉼 그대로'],
  ['J06', '맞절 → 감사 인사', '[160] 맞절 구호 → (맞절 12초) → 첫머리', '[244] «이제 신랑 신부는 하객 여러분을 향해 서시겠습니다.» → 1.0초 → [11] «자리해 주신 하객들을 향한 신랑 신부의 감사 인사가 있겠습니다.»', '[350] «신랑 신부는 하객을 향해 서주시기 바랍니다.»(215#1) → 돌아서는 1.0초 → «이제 두 사람의 감사 인사를 듣겠습니다.»(260#2)'],
  /* ★[SEAM_WORD_1107 b 대본 18:25] 예시 칩 조합 — 208 앞 244 를 뺀다 · 215 는 지금도 244 없이(«향해 서») · 214 는 그대로 */
  ['J06-208', '맞절 → 감사 인사', '[160] → (맞절 12초) → 첫머리', '[244] «이제 신랑 신부는 하객 여러분을 향해 서시겠습니다.» → [208] «이제 신랑 신부가 이 자리를 가득 채워 주신 하객 여러분께 감사 인사를 올리겠습니다.»', '[208] 만(244 뺌 · 돌아서기는 디렉터 힌트 «맞절을 마치면»)'],
  ['J06-215', '맞절 → 감사 인사', '[160] → (맞절 12초) → 첫머리', '[215] «이어서 하객 여러분께 감사의 인사가 있겠습니다. 신랑 신부는 하객을 향해 서주시기 바랍니다.»(244 는 지금도 붙지 않는다)', '[215] 그대로 — 바뀐 것은 앞 맞절 첫 문장(J01)뿐']];
const LAB = { J01: '기본 판', J06: '기본 판', 'J06-208': '예시 2번 칩(다정하게)', 'J06-215': '예시 4번 칩(격식 있게)' };
const row = (j) => `<div class="sw-j"><p class="sw-h"><b>${j[0].replace(/-\d+$/, '')}</b> ${j[1]} · <b>${LAB[j[0]]}</b> <span class="sw-s">${j[2]}</span></p>`
  + `<p class="sw-l">지금: ${j[3]}</p><p class="sw-l">바뀐 뒤: ${j[4]}</p>`
  + `<p class="sw-b"><button type="button" onclick="swPlay(this,'${j[0]}-now')">지금</button> <button type="button" onclick="swPlay(this,'${j[0]}-new')">바뀐 뒤</button></p></div>`;
const box = `<!--SEAM_WORD_1107--><section class="sw" id="seamWord"><h2>이음매</h2>${J.map(row).join('')}`
  + `<p class="sw-n">85개 이음매 중 2곳 바꿈 · 83곳 그대로(자료집 기준 · 대본 판정)</p></section>`
  /* ★[MEAL_NODIR_1107] «식사 안내» 칸 — 식사 날 5분 전(하객 안내를 끈 날) «현장 디렉터에게 여쭤 주세요» → «모바일 청첩장의 하객 안내에서 확인해 주세요» · 소리는 녹음된 판 그대로(엔진 빠르기) */
  + `<section class="sw" id="mealNoDir"><h2>식사 안내</h2>`
  + [['5분 전 · 예약 시각 있음', '331_guest-w-5m-mr', '329_guest-w-5m-mgr', '«장소와 예약 시각은 현장 디렉터에게 여쭤 주세요.»', '«장소와 예약 시각은 모바일 청첩장의 하객 안내에서 확인해 주세요.»'],
     ['5분 전 · 예약 시각 없음', '332_guest-w-5m-m', '330_guest-w-5m-mg', '«장소와 시간은 현장 디렉터에게 여쭤 주세요.»', '«장소는 모바일 청첩장의 하객 안내에서 확인해 주세요.»']]
    .map((m) => `<div class="sw-j"><p class="sw-h"><b>${m[0]}</b> <span class="sw-s">${m[1].split('_')[0]} → ${m[2].split('_')[0]}</span></p><p class="sw-l">지금: ${m[3]}</p><p class="sw-l">바뀐 뒤: ${m[4]}</p>`
      + `<p class="sw-b"><button type="button" onclick="swPlayF('${m[1]}')">지금</button> <button type="button" onclick="swPlayF('${m[2]}')">바뀐 뒤</button></p></div>`).join('')
  + `<p class="sw-n">10분 전(302 등) · 촬영 뒤(322)의 디렉터 판은 이미 식순에서 나가지 않아요(INFO_SPLIT_200 · 10분 전은 식사 줄만 · 경로는 5분 전) — 남은 곳은 위 5분 전 판뿐이었어요</p></section>`
  + `<script>function swPlayF(f){ if(_swA){ _swA.pause(); } _swA=new Audio('assets/audio/narration/'+f+'.mp3'); _swA.play(); }</script>`
  + `<style>.sw{margin:12px 0 18px;padding:12px 14px;border:1px solid var(--line,#ddd);border-radius:10px}.sw h2{font-size:16px;margin:0 0 8px}.sw-j{margin:0 0 12px}.sw-h{margin:0 0 4px}.sw-s,.sw-l,.sw-n{font-size:13px;color:var(--light,#777)}.sw-l{margin:2px 0}.sw-b button{min-height:40px;padding:0 14px;margin:6px 6px 0 0}</style>`
  + `<script>var _swA=null;function swPlay(b,k){ if(_swA){ _swA.pause(); } _swA=new Audio('assets/audio/preview/seam-1107/'+k+'.mp3'); _swA.play(); }</script><!--/SEAM_WORD_1107-->`;
h = h.replace(/<!--SEAM_WORD_1107-->[\s\S]*?<!--\/SEAM_WORD_1107-->/, '');
if (!/<h1>[^<]*<\/h1>/.test(h)) { console.log('✗ <h1> 을 못 찾았다'); process.exit(1); }
h = h.replace(/(<h1>[^<]*<\/h1>)/, '$1\n' + box);
for (const k of ['J01-now', 'J01-new', 'J06-now', 'J06-new', 'J06-208-now', 'J06-208-new', 'J06-215-now', 'J06-215-new']) if (!fs.existsSync(path.join(ROOT, 'assets/audio/preview/seam-1107', k + '.mp3'))) { console.log('✗ 소리 없음 ' + k); process.exit(1); }
fs.writeFileSync(P, h); console.log('✓ «이음매» 칸 · J01 · J06 · J06-208 · J06-215 · «식사 안내» 칸 · 소리 8');
