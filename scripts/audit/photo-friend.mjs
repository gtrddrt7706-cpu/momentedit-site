// «가족 · 친구 스냅» — 친구들과 자유롭게 · 구도는 가족만 [PHOTO_FRIEND] [PHOTO_FAMILY_ONLY] (2026-09-26 사장님 G1·G2·G3)
//   사장님 원문: «단체사진 계획된거 전부 가족들과 찍고 후에 친구들과 자유스럽게 찍데 촬영작가님에게 도움요청 그걸 대략적으로 적을수있게만»
//   화면 · 저장 · 통과 · 확인서 · 관리자 · 당일 콘솔이 같은 칸(photoFriend)을 말하는지 잰다. 서버 동작은 automation/tests/photo-friend.test.js.
//   ★guideinfo 는 트랙 통째 교체다 — 한 곳이라도 빠지면 «저장됐어요»인데 지워진다(photoWish · photoCaller 가 겪은 사고).
//   ★[SERVED_OURS] 원천을 못 찾으면 «틀렸다(1)»가 아니라 «못 쟀다(2)».
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (r) => { try { return fs.readFileSync(path.join(ROOT, r), 'utf8'); } catch (e) { return null; } };
const my = read('mypage.html'), adm = read('admin.html'), con = read('console.html'), gs = read('automation/platform/80_production.gs');
if (!my || !adm || !con || !gs) { console.log('━━ photo-friend — 원천 파일을 못 찾았습니다 · 재지 못했습니다'); process.exit(2); }
const bad = [], okn = [];
const t = (c, m) => (c ? okn : bad).push(m);
const slice = (src, a, b) => { const i = src.indexOf(a); if (i < 0) return ''; const j = src.indexOf(b, i + a.length); return j < 0 ? '' : src.slice(i, j); };

// G3 — 구도 목록은 가족만
const presets = slice(my, 'var PHOTO_PRESETS=[', '];');
t(!!presets, '구도 목록(PHOTO_PRESETS)을 찾았다');
t(presets.indexOf("n:'친구들과'") === -1 && presets.indexOf("n:'직장·지인과'") === -1, '구도 목록에 «친구들과»·«직장·지인과»가 없다(계획된 구도는 전부 가족 · G3)');
t(my.indexOf('placeholder="직접 추가 (예: 대학 동기)"') === -1, '«직접 추가» 예시가 친구 무리가 아니다');

// G1·G2 — 친구들과 자유롭게 한 칸 · 서버가 알 때만
const rp = slice(my, 'function renderPhoto(box){', '\nfunction ');
t(/if\(PHOTOFLOW\.friendOk\)\{[\s\S]{0,400}친구들과 자유롭게[\s\S]{0,900}id="mp_photoFriend"/.test(rp), '화면 — «친구들과 자유롭게» 칸은 서버가 알 때만(friendOk) 그린다');
t((rp.match(/<textarea|<input/g) || []).length > 0 && (rp.match(/id="mp_photoFriend"/g) || []).length === 1, '친구 칸은 하나(G2 «대략 적을 수 있게만»)');
t(rp.indexOf('mp_pcBride') > -1 && rp.indexOf('mp_photoFriend') > rp.indexOf('mp_pcBride'), '자리 — «불러 모아 주실 분» 뒤(가족 → 친구 순서)');
t(/!!p\.photoFriendOk\)/.test(my) && /function startPhotoFlow\(gi, rd, dig, fok\)/.test(my) && /friendOk:!!fok/.test(my), '여는 곳이 서버 표시(photoFriendOk)를 넘긴다');
t(/data:function\(\)\{ return \{s:PHOTOFLOW\.sel, w:PHOTOFLOW\.wish, u:PHOTOFLOW\.share, c:PHOTOFLOW\.caller, f:PHOTOFLOW\.friend\}; \}/.test(my), '«바뀐 게 있나» 판정에 친구 칸이 들어 있다');
const sp = slice(my, 'function savePhoto(){', '\n}');
t(/photoFriend:PHOTOFLOW\.friendOk \? /.test(sp), '사진 화면 저장 — 서버가 알 때만 싣는다(옛 서버엔 undefined → 빠진다)');
const gc = slice(my, 'function wireGuideInfoEditor(box, gi){', '// 공개 방식');
t(/photoFriend: gi\.photoFriend \? String\(gi\.photoFriend\) : undefined/.test(gc), '좌석 화면 저장 — 친구 부탁을 그대로 실어 보낸다(트랙 통째 교체로 지워지지 않게)');
const cf = slice(my, 'function prodConfirmHtml(', '\nfunction ');
t(/var _phF=String\(gi\.photoFriend\|\|''\)\.trim\(\)/.test(cf) && /\|\|_phF\)\{ var _pv=''/.test(cf) && /친구들과 자유롭게 · /.test(cf), '예식 확인서 — 친구 부탁이 «가족 · 친구 스냅» 줄에 붙는다(부탁만 있어도 줄이 선다)');
// [PHOTO_FRIEND_ROW] 2026-09-26 통합 점검 L2 — 예식 준비 행도 같은 판정: 부탁만 적은 부부가 확인서엔 적히는데 행은 «구도 고르기»(✓ 없음)였다
const pd = slice(my, 'function productionDashHtml(', '\nfunction ');
t(/_frB2=!!String\(_gpB2\.photoFriend\|\|''\)\.trim\(\)/.test(pd) && /done: !!\(_phB2\|\|_fxB2\|\|_frB2\)/.test(pd)
  && /_fr=!!String\(_gp\.photoFriend\|\|''\)\.trim\(\)/.test(pd) && /\(_fr\?'완료 · 수정':'구도 고르기'\)/.test(pd) && /\(_ph\.length\|\|_wc\|\|_fr\)\?'완료':''/.test(pd),
  '예식 준비 행 — 친구 부탁만 적어도 ✓ · 「완료 · 수정」(확인서와 같은 판정 · 버튼 122px 레일 안)');

// [PHOTO_FLOW_LINE] 첫눈에 뼈대 · [PHOTO_FRIEND_EX] 누르면 담기는 예시(칸은 하나 그대로)
t(/var _flw=\[\['다 함께 한 장',false\],\['가족 구도',true\],\['친구들과 자유롭게',!!PHOTOFLOW\.friendOk\]\];/.test(rp) && rp.indexOf('class="snp-flow"') > -1, '흐름 줄 — 다 함께 한 장 › 가족 구도 › 친구들과 자유롭게(친구 칸은 서버가 알 때만 칠한다)');
t(/사진작가가 자연스럽게 이끌어요/.test(rp), '«가족 구도는 … 사진작가가 자연스럽게 이끌어요» — 세미웨딩 느낌 · 누가 하는지 붙임');
t(/var PHOTO_FRIEND_EX=\['대기실처럼 편하게 모여서','친구들 폰으로도 몇 장','다 같이 셀카 한 장','부케 받는 친구와 한 장'\];/.test(my) && /<button type="button" class="ph-chip" data-pfex=/.test(rp), '친구 칸 예시 칩 넷(단추 · 44px 칩)');
t(/if\(cur\.indexOf\(t\)>-1\) return;/.test(rp) && /dispatchEvent\(new Event\('input',\{bubbles:true\}\)\)/.test(rp), '칩은 이미 있는 말을 다시 안 붙이고 · input 을 흘려 저장 손잡이가 따라온다');

// [GROUP_TIME_WORD] «본식 뒤 단체 사진 시간이» (코워크 명세 ③ · 최종판 2-6 고침)
const capNote = slice(my, 'function photoCapNote(sel){', '\n}');
t(capNote.indexOf("'두 분 식순이면 본식 뒤 단체 사진 시간이 약&nbsp;'") > -1 && my.indexOf("'두 분 식순이면 단체 사진이 약") === -1, '«두 분 식순이면 본식 뒤 단체 사진 시간이 약 A~B분이에요»');

// [WISH_MIN_SAME] «지금 N컷 · 약 M분» = 단체 사진 줄(photoCapOf)과 같은 셈 — 진짜 함수를 꺼내 돌린다(사본을 재지 않는다)
{
  const cm = my.match(/var PHOTO_DAY=(\d+), PHOTO_PRE=(\d+), PHOTO_ALL=(\d+), PHOTO_PER=(\d+), PHOTO_ONLINE=(\d+);/);
  const wm = my.match(/var PHOTO_WISH_MAX=(\d+);/), xm = my.match(/var PHOTO_MAX=(\d+)/);
  const src = (a) => slice(my, a, '\n}') + '\n}';
  const fns = ['function photoMinNote(sel){', 'function photoCapOf(rd, dig, wishN){', 'function photoWishN(){', 'function wishClean(list){'];
  const miss = fns.filter((a) => my.indexOf(a) < 0);
  const pm = (my.match(/function photoMins\(sel, w\)\{[^\n]*\}/) || [''])[0];
  if (!cm || !wm || !xm || miss.length || !pm) t(false, '«약 M분» 셈을 꺼내지 못했다 — ' + (miss.join(' · ') || '상수/photoMins'));
  else {
    const one = (a) => a === 'function photoWishN(){' || a === 'function wishClean(list){' ? (my.match(new RegExp(a.replace(/[()[\]{}]/g, '\\$&') + '[^\\n]*'))[0]) : src(a);
    const body = [pm, ...fns.map(one)].join('\n');
    const mk = new Function('PHOTO_DAY', 'PHOTO_PRE', 'PHOTO_ALL', 'PHOTO_PER', 'PHOTO_ONLINE', 'PHOTO_WISH_MAX', 'PHOTO_MAX', 'PHOTOFLOW', 'wishNorm',
      body + '\nreturn { note: photoMinNote, cap: photoCapOf, mins: photoMins };');
    const PF = { wish: [] };
    const F = mk(+cm[1], +cm[2], +cm[3], +cm[4], +cm[5], +wm[1], +xm[1], PF, (w) => ({ what: String((w && w.what) || '').trim() }));
    const wrong = [];
    // 약 M분 = 전체 하객 + 3분 × 구도 + 1분 × 글 있는 요청(둘까지) — 상한 셈의 all(= PHOTO_ALL + 요청)과 같은 상수
    for (const n of [0, 1, 3]) for (const w of [0, 1, 2, 3]) {
      const got = F.mins(new Array(n).fill('x'), w), want = +cm[3] + n * +cm[4] + Math.min(w, +wm[1]);
      if (got !== want) wrong.push(`구도 ${n} · 요청 ${w}: ${got} ≠ ${want}`);
    }
    // 같은 식순에서 «약 M분 ≤ 단체 사진 − 숨 고르기»이면 그 구도 수가 «알맞은 수» 안이다(두 줄이 서로 어긋나지 않는다)
    for (const w of [0, 2]) for (const late of [900, 1200, 1500]) {
      const c = F.cap({ summary: { sec: [late - 300, late] } }, false, w), room = +cm[1] - late / 60 - +cm[2];
      for (let n = 0; n <= 5; n++) { const fit = F.mins(new Array(n).fill('x'), w) <= room; if (fit !== (n <= c.k)) { wrong.push(`본식 ${late / 60}분 · 요청 ${w} · 구도 ${n}: «약 ${F.mins(new Array(n).fill('x'), w)}분» 과 k ${c.k} 가 어긋남`); break; } }
    }
    // 글 있는 칸만 센다 — 빈 요청 칸은 분도 개수도 잡지 않는다
    PF.wish = [{ what: '할머니 옆 한 컷' }, { what: '' }];
    const note = F.note(['양가 부모님']);
    if (note !== '지금 <b>2컷 · 약 10분</b>이에요 · <b>요청 1개</b>') wrong.push('한 줄: ' + note);
    t(!wrong.length, '«지금 N컷 · 약 M분» = 단체 사진 줄과 같은 셈(요청 하나 1분 · 둘까지 · 글 있는 칸만)' + (wrong.length ? ' — ' + wrong.join(' / ') : ''));
  }
}
t(/var mn=document\.getElementById\('mp_photoMin'\); if\(mn\) mn\.innerHTML=photoMinNote\(sel\);/.test(rp), '요청 칸에 칠 때 «약 M분» 줄도 함께 고친다(다시 그리지 않는다 · 커서 그대로)');

// 관리자 · 당일 콘솔 · 서버
t(/row\('친구들과 자유롭게',_pfr\)/.test(adm) && /\|\|_pfr\) h\+=/.test(adm), '관리자 고객 상세 — «친구들과 자유롭게» 줄');
t(/_cS\.photoFriend=String\(gi\.photoFriend\)\.slice\(0,200\)/.test(adm), '관리자 «당일 콘솔» 단추가 친구 부탁을 넘긴다');
t(/S && S\.photoFriend[\s\S]{0,200}textContent = '친구들과 자유롭게 · '/.test(con), '당일 콘솔 판 머리에 친구 부탁(textContent 로만)');
t(/var _pfr = String\(gir\.photoFriend \|\| ''\)\.replace\(\/\[<>\]\/g, ''\)\.slice\(0, 200\)\.trim\(\);\s*\n\s*if \(_pfr\) body\.draft\.photoFriend = _pfr;/.test(gs), '서버 화이트리스트에 photoFriend(200자 · <> 지움 · 비면 키 없음)');
t(/photoFriendOk: true,/.test(gs), '서버가 photoFriendOk 표시를 준다');

if (bad.length) { console.log('━━ photo-friend — 빨강 ' + bad.length + '건'); bad.forEach((b) => console.log('   · ' + b)); process.exit(1); }
console.log(`━━ photo-friend OK — ${okn.length}항목 · 구도는 가족만 · 친구들과 자유롭게 한 칸(화면·저장·좌석 통과·확인서·관리자·당일 콘솔·서버)`);
process.exit(0);
