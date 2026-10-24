#!/usr/bin/env node
/* ★★[CINE_SCOPE 2026-10-11 사장님 «여기 영상 비율 너무 큰 거 같은데 와이드로» → «짤려도 되니깐 시네마 느낌 나게 비율을 감각 있게 바꿔 봐»]
   장면 영상 = 영화관 비율 2.39 : 1. 이 검사는 order-preview.html 을 읽어
     ① 장면 자리 넷(.lv · .pv-media · .mk-vu-img · .pr-hm)이 2.39/1 인가
     ② 작은 칸 · 썸네일(.pk-media · .pr-th · .lv.mini)은 16/9 그대로인가
     ③ 자르는 높이 규칙(object-position: 50% var(--fy,35%))이 장면 그림 · 영상 일곱 자리에 다 걸렸나
     ④ 장면마다 높이(_VFY)가 실제 영상 이름(ritual-open.js VIDEO_READY)에 있고 0~100 인가 · 입장 15 · 닫는 인사 45
     ⑤ 장면을 그리는 네 곳(② · 크게 보기 _lVid 두 갈래 · 목소리 창 · ③ 연습 장면 · ① 창 _pvDraw)이 높이를 싣는가
     ⑥ _vfyN 을 실제로 돌려 entry → 15 · close → 45 · entry-look → 없음 · 빈 값 → 없음
   을 본다. ★스스로 깨 본다 — 16/9 로 되돌린 판 · 높이를 빼먹은 판을 넣으면 빨강이어야 한다. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SCOPE = ['.lv', '.pv-media', '.mk-vu-img', '.pr-hm'];
const KEEP = ['.lv.mini', '.pk-media', '.pr-th'];
const FOCUS = ['.lv video', '.lv .lv-still', '.pv-media video', '.pv-media .pv-still', '.mk-vu-img img', '.mk-vu-img video', '.pr-hm img'];
const WANT = { entry: 15, close: 45, welcome: 12, toast: 10, vow: 10, bless: 20, tribute: 20 };   // [WELCOME_FY_1023] 감사 인사 = 신랑 머리가 위 끝에 걸려 12% · [TOAST_MEDIUM_1023] 축배 = 들어 올린 잔 10% · [VOW_FY_1024] 서약 = 앵글 전환 판 · 뒤 컷 신랑 머리 10% · [FINAL17_1025] 덕담 · 부모님께 인사 20%

function rules(html) {
  const out = []; const st = /<style[^>]*>([\s\S]*?)<\/style>/g; let m;
  while ((m = st.exec(html))) { const css = m[1].replace(/\/\*[\s\S]*?\*\//g, ''); const re = /([^{}]+)\{([^{}]*)\}/g; let r; while ((r = re.exec(css))) out.push({ sels: r[1].split(',').map((x) => x.trim()), decl: r[2] }); }
  return out;
}
const ratioOf = (list, sel) => { let v = null; for (const r of list) if (r.sels.includes(sel)) { const m = /aspect-ratio\s*:\s*([^;]+)/.exec(r.decl); if (m) v = m[1].replace(/\s+/g, ''); } return v; };   // 뒤 규칙이 이긴다

export function check(html, ro) {
  const bad = []; const list = rules(html);
  for (const s of SCOPE) { const v = ratioOf(list, s); if (v !== '2.39/1') bad.push(`${s} 비율 ${v} (2.39/1 이어야)`); }
  for (const s of KEEP) { const v = ratioOf(list, s); if (v !== '16/9') bad.push(`${s} 비율 ${v} (작은 칸 · 썸네일은 16/9 그대로)`); }
  const fr = list.find((r) => /object-position\s*:\s*50%\s+var\(--fy,\s*35%\)/.test(r.decl) && FOCUS.every((f) => r.sels.includes(f)));
  if (!fr) bad.push('자르는 높이 규칙(object-position:50% var(--fy,35%))이 장면 그림 · 영상 일곱 자리에 다 걸려 있지 않다');
  const mv = /var _VFY=(\{[^}]*\});/.exec(html); let VFY = null;
  try { VFY = mv ? new Function('return ' + mv[1])() : null; } catch (e) { VFY = null; }
  if (!VFY) bad.push('_VFY(장면마다 높이)를 못 읽었다');
  else {
    const ready = ((/VIDEO_READY\s*=\s*(\[[^\]]*\])/.exec(ro || '') || [])[1]) || '[]';
    let names = []; try { names = new Function('return ' + ready)(); } catch (e) {}
    for (const [k, y] of Object.entries(VFY)) { if (!names.includes(k)) bad.push(`_VFY.${k} — 그런 영상이 없다(VIDEO_READY)`); if (!(y >= 0 && y <= 100)) bad.push(`_VFY.${k}=${y} — 0~100 이어야`); }
    for (const [k, y] of Object.entries(WANT)) if (VFY[k] !== y) bad.push(`_VFY.${k}=${VFY[k]} (정한 값 ${y})`);
  }
  const need = [
    [/return '<div class="lv"'\+_vfy\(v\)\+'><img class="lv-still"[^\n]*data-vk=/, '② 장면(_lVid 누르는 갈래)'],
    [/if\(v\) return '<div class="lv"'\+_vfy\(v\)\+'><img class="lv-still"/, '크게 보기 · 연습 장면(_lVid)'],
    [/return '<div class="mk-vu-img"'\+_vfy\(v\)\+'>'/, '목소리 창(_vcUseBody)'],
    [/'<span class="pr-hm"'\+_vfy\(_hv\)\+'>'/, '③ 연습 장면(.pr-hm)'],
    [/_fy=_vfyN\(v\); if\(_fy==null\) m\.style\.removeProperty\('--fy'\); else m\.style\.setProperty\('--fy',_fy\+'%'\)/, '① 창(_pvDraw)'],
  ];
  for (const [re, nm] of need) if (!re.test(html)) bad.push(`${nm} 이 장면 높이(--fy)를 싣지 않는다`);
  const fn = /function _vfyN\(v\)\{[^\n]*?\}\n/.exec(html);
  if (!fn || !VFY) bad.push('_vfyN 을 못 찾았다');
  else {
    let f = null; try { f = new Function('_VFY', fn[0] + '; return _vfyN;')(VFY); } catch (e) { bad.push('_vfyN 을 돌리지 못했다 · ' + e.message); }
    if (f) {
      const D = '/assets/video/moments/';
      const cases = [[{ poster: D + 'entry.webp' }, 15], [{ poster: D + 'close.webp' }, 45], [{ poster: D + 'entry-look.webp' }, null], [{ poster: D + 'guest.webp' }, null], [null, null], [{}, null]];
      /* ★[VIDEO_V 2026-10-23] 실제 영상 주소(videoOf · 끝에 ?v= 판 표시)로도 잰다 — 가짜 주소만 넣으면 ?v= 를 못 읽어 입장 · 닫는 인사 높이가 빠지는 것을 못 본다 */
      try { const RO = require(path.join(ROOT, 'assets/ritual-open.js')); cases.push([RO.videoOf('entry'), 15], [RO.videoOf('close'), 45], [RO.videoOf('table'), null]); if (!/\?v=/.test(RO.videoOf('entry').poster)) bad.push('videoOf 주소에 판 표시(?v=)가 없다 [VIDEO_V]'); } catch (e) { bad.push('ritual-open.js 를 못 읽었다 · ' + e.message); }
      for (const [v, y] of cases) { const got = f(v); if (got !== y) bad.push(`_vfyN(${JSON.stringify(v)}) = ${got} (${y} 이어야)`); }
    }
  }
  return bad;
}

const direct = !!process.argv[1] && /cine-scope\.mjs$/.test(process.argv[1]);
if (direct) {
  const html = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
  const ro = fs.readFileSync(path.join(ROOT, 'assets', 'ritual-open.js'), 'utf8');
  const bad = check(html, ro);
  for (const b of bad) console.log('FAIL ' + b);
  /* 스스로 깨 보기 — 하나라도 통과하면 검사가 죽은 것 */
  let dead = 0;
  const muts = [
    ['② 장면을 16/9 로', (h) => h.replace('.lv{position:relative;display:block;aspect-ratio:2.39/1;', '.lv{position:relative;display:block;aspect-ratio:16/9;')],
    ['① 창을 16/9 로', (h) => h.replace('.pv-media{position:relative;aspect-ratio:2.39/1;', '.pv-media{position:relative;aspect-ratio:16/9;')],
    ['썸네일까지 2.39 로', (h) => h.replace(/\.lv\.mini\{width:64px;border-radius:6px;aspect-ratio:16\/9\}/, '.lv.mini{width:64px;border-radius:6px}')],
    ['높이 규칙 빼기', (h) => h.replace(/object-position:50% var\(--fy,35%\)/, 'object-position:50% 50%')],
    ['목소리 창 높이 빼기', (h) => h.replace(`return '<div class="mk-vu-img"'+_vfy(v)+'>'`, `return '<div class="mk-vu-img">'`)],
    ['입장 높이 바꾸기', (h) => h.replace('var _VFY={entry:15,close:45,welcome:12,toast:10,vow:10,bless:20,tribute:20};', 'var _VFY={entry:35,close:45,welcome:12,toast:10,vow:10,bless:20,tribute:20};')],
    ['감사 인사 높이 빼기', (h) => h.replace('var _VFY={entry:15,close:45,welcome:12,toast:10,vow:10,bless:20,tribute:20};', 'var _VFY={entry:15,close:45,toast:10,vow:10,bless:20,tribute:20};')],
    ['축배 높이 빼기', (h) => h.replace('var _VFY={entry:15,close:45,welcome:12,toast:10,vow:10,bless:20,tribute:20};', 'var _VFY={entry:15,close:45,welcome:12,vow:10,bless:20,tribute:20};')],
    ['서약 높이 빼기', (h) => h.replace('var _VFY={entry:15,close:45,welcome:12,toast:10,vow:10,bless:20,tribute:20};', 'var _VFY={entry:15,close:45,welcome:12,toast:10,bless:20,tribute:20};')],
    ['없는 영상 이름', (h) => h.replace('var _VFY={entry:15,close:45,welcome:12,toast:10,vow:10,bless:20,tribute:20};', 'var _VFY={entry:15,close:45,welcome:12,toast:10,vow:10,bless:20,tribute:20,closing:40};')],
  ];
  for (const [nm, f] of muts) { const m = f(html); if (m === html) { dead++; console.log(`FAIL 깨 보기 «${nm}» — 바꿀 자리를 못 찾았다(검사가 낡았다)`); continue; } if (!check(m, ro).length) { dead++; console.log(`FAIL 깨 보기 «${nm}» — 빨강이 안 됐다`); } }
  const fail = bad.length + dead;
  console.log(fail ? `✗ CINE_SCOPE 실패 ${fail}건` : `ok cine-scope — 장면 영상 2.39 : 1 (네 자리) · 칸 · 썸네일 16 : 9 · 장면마다 높이(입장 15 · 감사 인사 12 · 축배 10 · 서약 10 · 덕담 · 부모님께 인사 20 · 닫는 인사 45) · 깨 보기 ${muts.length}개 빨강`);
  process.exit(fail ? 1 : 0);
}
