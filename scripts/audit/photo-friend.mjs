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

// 관리자 · 당일 콘솔 · 서버
t(/row\('친구들과 자유롭게',_pfr\)/.test(adm) && /\|\|_pfr\) h\+=/.test(adm), '관리자 고객 상세 — «친구들과 자유롭게» 줄');
t(/_cS\.photoFriend=String\(gi\.photoFriend\)\.slice\(0,200\)/.test(adm), '관리자 «당일 콘솔» 단추가 친구 부탁을 넘긴다');
t(/S && S\.photoFriend[\s\S]{0,200}textContent = '친구들과 자유롭게 · '/.test(con), '당일 콘솔 판 머리에 친구 부탁(textContent 로만)');
t(/var _pfr = String\(gir\.photoFriend \|\| ''\)\.replace\(\/\[<>\]\/g, ''\)\.slice\(0, 200\)\.trim\(\);\s*\n\s*if \(_pfr\) body\.draft\.photoFriend = _pfr;/.test(gs), '서버 화이트리스트에 photoFriend(200자 · <> 지움 · 비면 키 없음)');
t(/photoFriendOk: true,/.test(gs), '서버가 photoFriendOk 표시를 준다');

if (bad.length) { console.log('━━ photo-friend — 빨강 ' + bad.length + '건'); bad.forEach((b) => console.log('   · ' + b)); process.exit(1); }
console.log(`━━ photo-friend OK — ${okn.length}항목 · 구도는 가족만 · 친구들과 자유롭게 한 칸(화면·저장·좌석 통과·확인서·관리자·당일 콘솔·서버)`);
process.exit(0);
