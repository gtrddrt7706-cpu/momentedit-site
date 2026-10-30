// ★★[NARROW_170_1030 · PARENT_ONE_NAME_1030 검토 170 2026-10-30] 좁게 읽히는 글 2차 + 실제 막힘 — 원함수로 잰다(운영 저장 · 발행 없음)
//   F5 혼주 성함 한 분 → 계좌 예금주 · N2 축가 «두 분이 직접»이면 부탁할 사람 줄 없음 · N1 · N3 ~ N8 · F6 · 화촉 카드
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d == null ? '' : ' → ' + d}`); if (!c) fail++; };
const fnSrc = (src, name) => { const i = src.indexOf('function ' + name + '('); if (i < 0) return null; let d = 0, j = src.indexOf('{', i); for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return null; };
/* F5 — 청첩장(hydrate) 원함수 */
{ const sp = new Function(fnSrc(rd('shared/hydrate.js'), 'splitParents') + '; return splitParents;')();
  const a = sp('김영숙', '', '국민 123'), b = sp('이재환·최미경', '국민 1', '신한 2')   /* 저장값은 가운뎃점(마이페이지가 띄어쓰기를 바꾼다) */, c = sp('이재환', '국민 1', ''), e = sp('최미경', '국민 1', '신한 2');
  ok('F5 청첩장 — 어머니 성함만 + 어머니 계좌만 → 어머니 계좌 예금주 = 그 이름', a.mother === '김영숙' && a.father === '', JSON.stringify(a));
  ok('F5 청첩장 — 두 분 성함 → 앞 아버지 · 뒤 어머니(종전 그대로) · 한 분 + 아버지 계좌 → 아버지', b.father === '이재환' && b.mother === '최미경' && c.father === '이재환' && c.mother === '' && e.father === '최미경', JSON.stringify([b, c, e])); }
/* F5 — 마이페이지 계좌 칸의 «예금주» 표시(같은 규칙 · 원함수) */
{ const my = rd('mypage.html'), src = fnSrc(my, '_paHolder'), mk = (d) => new Function('d', src + '; return _paHolder;')(d);
  const d1 = { brideParents: '김영숙', brideMotherAccount: '국민 123', brideFatherAccount: '' }, d2 = { groomParents: '이재환·최미경', groomFatherAccount: '국민 1', groomMotherAccount: '신한 2' };
  ok('F5 마이페이지 — 계좌 칸 옆 예금주가 청첩장과 같다(한 분 · 두 분)', !!src && mk(d1)('brideMotherAccount') === '김영숙' && mk(d1)('brideFatherAccount') === '' && mk(d2)('groomFatherAccount') === '이재환' && mk(d2)('groomMotherAccount') === '최미경' && /pf-h">· 예금주 /.test(my));
  ok('F5 모바일 참석 화면(live) — 같은 규칙', /const _one = names\.length === 1 && String\(motherCell \|\| ''\)\.trim\(\) && !String\(fatherCell \|\| ''\)\.trim\(\);/.test(rd('live.html'))); }
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
ok('N2 축가 «두 분이 직접» → 부탁할 사람 «축가를 불러 주실 분» 없음 · MR 준비는 그대로 · 가까운 분이 부르면 그대로', !O.helpersOf({ on: { song: 1 }, songBy: 'self' }).some((x) => /축가/.test(x[0])) && O.helpersOf({ on: { song: 1 } }).some((x) => x[0] === '축가를 불러 주실 분') && O.prepList({ course: 'open', on: { song: 1 }, songBy: 'self' }).some((x) => x.k === 'song' && /MR/.test(x.what)));
ok('N1 축가 글 «가까운 분이 부르거나, 두 분 중 한 분 또는 함께»', /^가까운 분이 부르거나, 두 분 중 한 분 또는 함께 부를 수 있어요\./.test(O.CARDS.song.one) && !/가족이나 친구가 두 분을 위해/.test(rd('order-preview.html') + rd('assets/ritual-story.js')));
ok('N3 도와주실 분 «필요한 경우에만 · 한 분이 함께 맡아도 돼요» · «촬영하실 분들»', (() => { const h = O.helpersOf({ on: {} }); return h.some((x) => x[0] === '어르신을 모실 분' && /필요한 경우에만 · 한 분이 함께 맡아도 돼요/.test(x[1])) && h.some((x) => x[0] === '가족사진 때 촬영하실 분들을 불러 모아 주실 분') && !h.some((x) => /양가 한 분씩|친척분들/.test(x.join(' '))); })());
ok('N4 성혼 선언 예시 · 원고 «오늘 함께해 주신 모든 분을 모신 이 자리» · 옛 글은 REF_OLD', ['assets/ritual-ref.js', 'assets/ritual-data.js'].every((f) => !/그 일가친척과 친지를 모신/.test(rd(f)) && /오늘 함께해 주신 모든 분을 모신 이 자리/.test(rd(f))) && /"514_declare-reader": \[[^\]]*그 일가친척과 친지를 모신/.test(rd('order-preview.html')));
ok('N5 가족사진 «참석하신 가족 구성에 맞춰» · «형제·자매와 함께»(옛 이름은 읽을 때 바꾼다)', (() => { const my = rd('mypage.html'); return !/부모님 없이 또래끼리|부모님 \+ 형제·자매까지/.test(my) && /n:'형제·자매와 함께'/.test(my) && /PHOTO_RENAME=\{'형제·자매만':'형제·자매와 함께'\}/.test(my) && /name: '형제·자매와 함께'/.test(rd('assets/photo-refs.js')); })());
ok('N6 · N7 · F6 마이페이지 — «혼주 성함 · 마음 전하실 곳» · «성함 표기 없이도» · «청첩장에 표시할 이름» · «링크 주소에 쓰여요»', (() => { const my = rd('mypage.html'); return /inv-q">혼주 성함 · 마음 전하실 곳</.test(my) && !/혼주\(부모님\) · 마음/.test(my) && /성함 표기 없이도 만들 수 있어요/.test(my) && /청첩장에 표시할 신랑·신부 이름을 적어 주세요/.test(my) && !/이름\(한글\)을 입력해 주세요/.test(my) && /영문 이름은 링크 주소에 쓰여요 · 꼭 영문으로 적어 주세요/.test(my); })());
ok('N8 FAQ «최소 인원 조건 없이» · «일반적으로 10~30명» 없음(두 벌)', (() => { const ix = rd('index.html'); return !/일반적으로 10~30명/.test(ix) && (ix.match(/최소 인원 조건 없이, 가족과 친구 가운데 가장 가까운 30명까지/g) || []).length === 2 && !/마이크로웨딩은 가까운 분들만/.test(ix); })());
ok('화촉 카드 — 고르기 전 «양가 대표 두 분» · 어머님 · 아버님 · 다른 분을 고르면 그 호칭', O.tileOf('candle', {}) === '양가 대표 두 분이 초에 불을 밝혀요' && O.tileOf('candle', { candleWho: 'mothers' }) === '양가 어머님이 초에 불을 밝혀요' && /아버님/.test(O.tileOf('candle', { candleWho: 'fathers' })));
console.log(fail ? `\nNARROW 170 FAIL ${fail}` : '\nNARROW 170 OK'); process.exit(fail ? 1 : 0);
