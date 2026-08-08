#!/usr/bin/env node
// 식순 문안 단일 원천 정합 검사 — merge-guard.sh가 호출(수동: node scripts/check-ritual-mirror.js)
// ①ritual-data.js가 Node에서 로드되는지 ②빌더에 리터럴이 재복제되지 않았는지(이중 원천 부활 감지)
// ③KB가 원천의 대표 문안을 실제로 담는지 ④full KB 토큰 추정이 캡(20k) 이내인지
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

let fail = 0;
const ok = (name, cond) => { console.log((cond ? 'ok ' : 'FAIL ') + name); if (!cond) fail = 1; };

let D, KB;
try { D = require(path.join(root, 'assets/ritual-data.js')); } catch (e) { ok('ritual-data.js 로드', false); process.exit(1); }
ok('ritual-data.js 로드(코스 6·NARR·MIN)', Object.keys(D.COURSES).length === 6 && !!D.NARR && !!D.MIN);   // [RECORD_COURSE] 기록형 추가로 5→6

const html = fs.readFileSync(path.join(root, 'order-preview.html'), 'utf8');
ok('빌더에 식순 AI 위젯 배선 존재', html.includes('식순 AI 상담 배선 v1'));

// ★XM_MIRROR_9KEY — 소요분 상수 정합(현재 8키 · 마커 문자열은 다른 곳에서 참조하므로 그대로 둔다).
//   빌더(order-preview.html의 var XM)가 기준이고 원천이 그걸 따라간다.
//   과거 사고: 원천 5키 / 빌더 9키로 갈라져, 팔레트로 축배·링워밍·헌정을 더한 고객에게
//   화면은 +2/+2/+2분을 더해 보여주는데 AI 상담사는 그만큼 짧은 총시간을 말했다.
// [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
//   (veil이 빠져 원천 XM은 8키다. 빌더 var XM에서도 veil:1을 빼면 이 검사가 다시 초록이 된다)
const xmM = html.match(/var XM=\{([^}]*)\}/);
if (!xmM) { ok('빌더 var XM 파싱', false); }
else {
  const bx = {};
  xmM[1].split(',').forEach((kv) => {
    const m = kv.match(/^\s*([A-Za-z_$][\w$]*)\s*:\s*(-?\d+)\s*$/);
    if (m) bx[m[1]] = Number(m[2]);
  });
  const sx = D.MIN.XM || {};
  const bk = Object.keys(bx).sort(), sk = Object.keys(sx).sort();
  const miss = bk.filter((k) => !(k in sx)), extra = sk.filter((k) => !(k in bx));
  const diff = bk.filter((k) => k in sx && sx[k] !== bx[k]).map((k) => k + '(빌더' + bx[k] + '≠원천' + sx[k] + ')');
  const same = miss.length === 0 && extra.length === 0 && diff.length === 0;
  ok('MIN.XM이 빌더 var XM과 키·값 일치(' + bk.length + '키)'
    + (same ? '' : ' — 원천누락:' + (miss.join(',') || '없음') + ' / 원천잉여:' + (extra.join(',') || '없음') + ' / 값불일치:' + (diff.join(',') || '없음')), same);
}

// ★BASE_MIRROR — 코스별 기본 소요분. XM 과 달리 **원천(MIN.base)이 기준**이다.
//   코스 카드의 '약 N분' 라벨이 원천에서 나오므로, 빌더 사본이 갈리면 고객이 같은 화면에서
//   두 숫자를 본다. 실제로 갈려 있었다 — family 30(원천 24)·damback 25(원천 20)·gamdong 29(원천 28)·
//   record 키 누락(원천 16). 가족 코스를 고르면 카드는 '약 24분'인데 다듬기 화면은 아무것도 안
//   더했는데 '지금 약 30분이에요' 경고를 띄웠다. XM 만 대조하고 base 는 안 봐서 계속 초록이었다.
//   ※ 'var base=' 는 이 파일에 셋 있다(1202 얕은복사 · 1409 다른 표 · estMin). [S.course] 로 그 하나만 집는다.
const bsM = html.match(/var base=\{([^}]*)\}\[S\.course\]/);
if (!bsM) { ok('빌더 var base 파싱', false); }
else {
  const bb = {};
  bsM[1].split(',').forEach((kv) => {
    const m = kv.match(/^\s*([A-Za-z_$][\w$]*)\s*:\s*(-?\d+)\s*$/);
    if (m) bb[m[1]] = Number(m[2]);
  });
  const sb = D.MIN.base || {};
  const bk = Object.keys(bb).sort(), sk = Object.keys(sb).sort();
  const miss = sk.filter((k) => !(k in bb)), extra = bk.filter((k) => !(k in sb));
  const diff = bk.filter((k) => k in sb && sb[k] !== bb[k]).map((k) => k + '(빌더' + bb[k] + '≠원천' + sb[k] + ')');
  const same = miss.length === 0 && extra.length === 0 && diff.length === 0;
  ok('MIN.base가 빌더 var base와 키·값 일치(' + sk.length + '키)'
    + (same ? '' : ' — 빌더누락:' + (miss.join(',') || '없음') + ' / 빌더잉여:' + (extra.join(',') || '없음') + ' / 값불일치:' + (diff.join(',') || '없음')), same);
}

// ★NAR_MIRROR — 빌더는 assets/ritual-data.js를 로드하지 않고 같은 문안의 인라인 사본을 따로 들고 있다.
//   그래서 한쪽만 고치면 고객 화면과 AI 상담 답변이 갈린다. 원천 문안이 빌더에도 있는지 전수 대조한다.
//   (단방향 검사 · 빌더에만 있는 잉여 문안은 대상 아님)
const narAll = [];
const pushNar = (id, s) => { if (typeof s === 'string' && s.trim()) narAll.push([id, s]); };
// [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
['ENTRY', 'DECLARE', 'DECLWHO', 'LETTER', 'RINGWARM', 'TOAST'].forEach((t) => {
  Object.keys(D[t] || {}).forEach((k) => pushNar(t + '.' + k, (D[t][k] || {}).nar));
});
(D.GUEST || []).forEach((g, i) => pushNar('GUEST.' + i, g[1]));
// [NARR_CONSOLE_ONLY] 빌더가 보여주지 않는 키는 사본을 요구하지 않는다.
//   목록은 원천(assets/ritual-data.js)에 있다 — 검사에 또 적으면 두 곳이 갈린다.
const CONSOLE_ONLY = new Set(D.NARR_CONSOLE_ONLY || []);
Object.keys(D.NARR || {}).forEach((k) => {
  if (CONSOLE_ONLY.has(k)) return;
  const v = D.NARR[k];
  if (typeof v === 'string') pushNar('NARR.' + k, v);
  else { pushNar('NARR.' + k + '.nar', v.nar); pushNar('NARR.' + k + '.end', v.end); }
});
pushNar('TRIBUTE.nar', D.TRIBUTE.nar);
pushNar('TRIBUTE.end', D.TRIBUTE.end);
const drift = narAll.filter(([, s]) => !html.includes(s));
ok('빌더 인라인 사본이 원천 문안 ' + narAll.length + '개와 일치(drift ' + drift.length + '건)', drift.length === 0);
drift.forEach(([id, s]) => console.log('   DRIFT ' + id + ' : ' + s.slice(0, 46) + '…'));

// ★[VOW_CHORUS 2026-08-04] 서약 마지막 합창 문장도 인라인 사본이다 — 위 NAR_MIRROR 는 nar/end 만 훑어서 안 걸린다.
//   이 문장은 다른 문안과 달리 **소리로도 나간다**(26_vow-both). 화면·대본·소리 셋이 같은 글자여야 하고,
//   소리 쪽은 check-text-audio.mjs 가 본다. 여기선 화면 쪽 사본이 원천을 따라가는지만 본다.
//   ★빌더가 엔진을 동기로 못 읽어서 사본을 두는 것이므로, 사본을 없애는 대신 검사를 붙인다.
const vb = D.VOWBOTH || [];
const vbMiss = vb.filter((t) => !html.includes(t));
ok('빌더 VOWBOTH 사본이 원천과 일치(' + vb.length + '문장 · drift ' + vbMiss.length + '건)', vb.length > 0 && vbMiss.length === 0);
vbMiss.forEach((t) => console.log('   DRIFT VOWBOTH : ' + t));

// ★[ENTRY_SELF_MIRROR 2026-08-04] 입장 인사 예시문(ENTRY[v].self)도 인라인 사본이다 — 위 NAR_MIRROR 는 .nar 만 훑어서 안 걸렸다.
//   이 글은 화면에만 있는 설명이 아니라 **고객이 보고 녹음해 올리는 대본**이고, 같은 글자로 성우 대본과
//   예시 mp3 까지 만들어진다. 원천만 고치고 화면을 남겨 두면 화면에 적힌 문장과 들리는 목소리가 갈라진다.
//   ※문장별 화자(신랑/신부 교대)가 맞는지는 scripts/check-entry-alt.mjs 가 따로 본다 — 여기에 같은 검사를 두 번 적지 않는다.
const selfAll = Object.keys(D.ENTRY).map((k) => [k, (D.ENTRY[k] || {}).self]).filter(([, s]) => typeof s === 'string' && s.trim());
const selfMiss = selfAll.filter(([, s]) => !html.includes(s));
ok('빌더 ENTRY.self 사본이 원천과 일치(' + selfAll.length + '종 · drift ' + selfMiss.length + '건)',
  selfAll.length === Object.keys(D.ENTRY).length && selfMiss.length === 0);
selfMiss.forEach(([k]) => console.log('   DRIFT ENTRY.' + k + '.self'));

// ★DECL_SET_INVARIANT — 성혼 선언은 '택1 세트'다. 세 곳(원천 DECLWHO · 빌더 선택지 배열 · 생성기 총량 서술)이
//   서로 다른 개수를 말하면 화면·대본·AI가 각각 다른 예식을 설명하게 된다.
//   실사고(2026-07-26): 응답형(W2)이 택1인데 코드·KB·생성기가 '선언 뒤에 덧붙임'으로 서술 →
//   그대로 녹음했으면 성혼 선언이 20초 간격으로 두 번 나갈 뻔했다(W2-c가 선언문 자체).
const declKeys = Object.keys(D.DECLWHO);
const pickM = html.match(/\[([^\]]*)\]\.forEach\(function\(w\)\{\s*var sel=S\.declareWho===w/);
const builderKeys = pickM ? (pickM[1].match(/'([^']+)'/g) || []).map((x) => x.replace(/'/g, '')) : null;
ok('빌더 선언 선택지 배열이 DECLWHO ' + declKeys.length + '종과 일치'
  + (builderKeys ? ' (빌더 ' + builderKeys.length + '종)' : ' — 배열 파싱 실패'),
  !!builderKeys && builderKeys.length === declKeys.length && declKeys.every((k) => builderKeys.includes(k)));

const gen = fs.readFileSync(path.join(root, 'scripts/build-dubbing-script.mjs'), 'utf8');
const genM = gen.match(/선언 (\d+)종/);
ok('녹음 대본 생성기의 "선언 N종" 서술이 DECLWHO와 일치' + (genM ? ' (생성기 ' + genM[1] + '종)' : ' — 서술 없음'),
  !!genM && Number(genM[1]) === declKeys.length);

// ★DECL_PICK_MIRROR — 코스 상세의 성혼 선언 요약(`pick`)이 그 코스의 실제 기본값을 말하는지.
//   실사고(2026-07-26): #318이 감동 코스만 고쳐서, 나머지 4개 코스의 pick이 방금 출시한 응답형을 빠뜨리고
//   보류 상태인 합송을 앞세웠다. 가족 코스는 아예 다른 축(엄숙/따뜻 = DECLARE 톤)을 섞어 놨다.
//   선택기(DECLWHO 4종 순회)는 정상이었기에 기존 검사가 전부 초록이었다 → 요약 문자열을 4번째 대조로 추가.
//   ※ pick은 사람이 읽는 요약이라 DECLWHO 라벨과 표기가 다르다(예: family.d='가족이 낭독' vs pick='가족 낭독').
//     그래서 키→요약표기 대응을 여기서 명시한다. 합송은 보류라 pick에서 내렸고, 그건 데이터에 없는 정책이라 검사하지 않는다.
// ★편집 규칙: pick의 첫 항목은 그 코스의 기본값과 같게 쓴다(가드는 '포함'만 보므로 순서는 사람이 지킨다).
const PICK_LABEL = { narr: '나레이션', ask: '하객 응답', chorus: '하객 합송', family: '가족 낭독' };
if (builderKeys) {
  const cdM = html.match(/var COURSE_DEF=\{[\s\S]*?\n\};/);
  if (!cdM) { ok('빌더 COURSE_DEF 파싱', false); }
  else {
    const CD = new Function(cdM[0] + ' return COURSE_DEF;')();
    const badPick = [];
    for (const c of Object.keys(D.COURSES)) {
      const det = (D.COURSES[c].detail || []).find((x) => /성혼 선언/.test(x.n));
      const def = (CD[c] || {}).declareWho;
      const want = PICK_LABEL[def];
      if (!det || !det.pick) { badPick.push(c + '(선언 항목 없음)'); continue; }
      if (!want) { badPick.push(c + '(기본값 ' + def + ' 미매핑)'); continue; }
      if (!det.pick.includes(want)) badPick.push(c + '(기본 "' + want + '"이 pick에 없음: ' + det.pick + ')');
    }
    ok('코스 상세 pick이 코스별 기본 선언 주체를 포함' + (badPick.length ? ' — ' + badPick.join(' / ') : ''), badPick.length === 0);
  }
}

// ★DECL_ADMIN_MIRROR — 운영자 화면 두 곳이 선언 주체 4종을 전부 다루는지.
//   실사고(2026-07-26): #318이 'ask'를 추가했는데 admin 두 표면이 안 따라왔다.
//   admin.html은 하드코딩 맵에 없어 row()가 falsy를 받아 '성혼 선언' 행이 통째로 사라졌고(감동 코스 기본값이라 전원 해당),
//   Admin.html은 else로 떨어져 '나레이션'이라고 틀린 값을 보여줬다(빈칸보다 나쁘다 · 운영자가 예고 클립 준비를 통째로 빠뜨린다).
//   admin.html은 원천을 직접 읽게 고쳤으므로 '하드코딩 맵으로 되돌아가지 않았는지'를 본다.
//   Admin.html은 GAS라 ritual-data.js를 못 읽어 손분기가 불가피하다 → 라벨 문자열 존재만 대조한다(약한 검사임을 인정).
const adminHtml = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
ok('admin.html이 선언 주체 라벨을 원천에서 읽음(_declWhoLabel · 하드코딩 맵 아님)',
  adminHtml.includes('<script src="/assets/ritual-data.js">') && adminHtml.includes('_declWhoLabel')
  && !/\{narr:'나레이션',chorus:/.test(adminHtml));
const gasAdmin = fs.readFileSync(path.join(root, 'automation/admin/Admin.html'), 'utf8');
const gasMiss = declKeys.filter((k) => !new RegExp("declareWho==='" + k + "'").test(gasAdmin) && k !== 'narr');
ok('Admin.html(GAS)이 선언 주체 4종을 분기' + (gasMiss.length ? ' — 누락: ' + gasMiss.join(',') : ' (narr은 else 기본값)'),
  gasMiss.length === 0);

// 택1 원칙: 선언 자리에서 '덧붙임'을 뜻하는 서술이 남아 있으면 안 된다.
const addOn = [
  ['order-preview.html', html], ['api/_ritual-kb.js', fs.readFileSync(path.join(root, 'api/_ritual-kb.js'), 'utf8')],
].filter(([, s]) => /선언 뒤에[^.]*답하는/.test(s)).map(([f]) => f);
ok('선언 택1 원칙 위반 서술("선언 뒤에 …답하는") 0건' + (addOn.length ? ' — ' + addOn.join(',') : ''), addOn.length === 0);

try { KB = require(path.join(root, 'api/_ritual-kb.js')); } catch (e) { ok('_ritual-kb.js 로드', false); process.exit(1); }
const probes = [
  D.ENTRY.A.nar, D.DECLARE['1'].nar, D.LETTER.parent.nar, D.NARR.vow.nar, D.NARR.close, D.RINGWARM.family.nar,
];
ok('KB full이 원천 대표 문안 6종을 그대로 인용', probes.every((s) => KB.full.includes(s)));
/* [COURSE_HIDDEN 2026-08-08] 옛 검사는 '담백 25분'이라는 **한 코스의 이름과 숫자**를 박아 두고 있었다.
   코스 이름이 「약속」으로 바뀌고 숨긴 코스가 생기자 곧바로 실패했다.
   ★이름을 적지 말고 **보이는 코스 전부가 자기 숫자와 함께 실려 있는가**를 본다. */
{
  const shown = Object.keys(D.COURSES).filter((k) => !D.COURSES[k].hidden);
  const missing = shown.filter((k) => !KB.full.includes(D.COURSES[k].nm + ' ' + D.MIN.base[k] + '분'));
  ok(`KB full이 보이는 코스 ${shown.length}종의 소요분을 인용` + (missing.length ? ' — 빠짐: ' + missing.join(',') : ''), !missing.length);
}
/* ★숨긴 코스는 KB 에 **없어야** 한다 — 상담사가 고를 수 없는 코스를 권하면 안 된다. */
{
  const hid = Object.keys(D.COURSES).filter((k) => D.COURSES[k].hidden);
  const leaked = hid.filter((k) => KB.full.includes('- ' + D.COURSES[k].nm + ' 코스'));
  ok('KB full에 숨긴 코스가 안 새어 나감' + (leaked.length ? ' — 샘: ' + leaked.join(',') : ''), !leaked.length);
}
ok('KB lite 존재(축약판)', typeof KB.lite === 'string' && KB.lite.length > 500 && KB.lite.length < KB.full.length / 2);

// 토큰 추정(보수적=과대 방향): 한국어는 BPE에서 자당 토큰이 1을 넘는 경우가 많아, 캡을 일찍 걸도록 자수×1.1로 잡는다.
//   (자수/1.3은 과소추정이라 KB가 커질 때 캡을 늦게 걸어 위험 — 방향을 뒤집음)
const estTok = Math.round(KB.full.length * 1.1);
ok('KB full 토큰 추정 ≤ 20k (현재 ~' + estTok + ')', estTok <= 20000);
const liteTok = Math.round(KB.lite.length * 1.1);
ok('KB lite 토큰 추정 ≤ 6k (현재 ~' + liteTok + ')', liteTok <= 6000);

process.exit(fail);
