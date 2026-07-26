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
ok('ritual-data.js 로드(코스 5·NARR·MIN)', Object.keys(D.COURSES).length === 5 && !!D.NARR && !!D.MIN);

const html = fs.readFileSync(path.join(root, 'order-preview.html'), 'utf8');
ok('빌더에 식순 AI 위젯 배선 존재', html.includes('식순 AI 상담 배선 v1'));

// ★XM_MIRROR_9KEY — 소요분 상수 정합. 빌더(order-preview.html의 var XM)가 기준이고 원천이 그걸 따라간다.
//   과거 사고: 원천 5키 / 빌더 9키로 갈라져, 팔레트로 축배·링워밍·헌정·베일을 더한 고객에게
//   화면은 +2/+2/+2/+1분을 더해 보여주는데 AI 상담사는 그만큼 짧은 총시간을 말했다.
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

// ★NAR_MIRROR — 빌더는 assets/ritual-data.js를 로드하지 않고 같은 문안의 인라인 사본을 따로 들고 있다.
//   그래서 한쪽만 고치면 고객 화면과 AI 상담 답변이 갈린다. 원천 문안이 빌더에도 있는지 전수 대조한다.
//   (단방향 검사 · 빌더에만 있는 잉여 문안은 대상 아님)
const narAll = [];
const pushNar = (id, s) => { if (typeof s === 'string' && s.trim()) narAll.push([id, s]); };
['ENTRY', 'DECLARE', 'DECLWHO', 'LETTER', 'VEIL', 'RINGWARM', 'TOAST'].forEach((t) => {
  Object.keys(D[t] || {}).forEach((k) => pushNar(t + '.' + k, (D[t][k] || {}).nar));
});
(D.GUEST || []).forEach((g, i) => pushNar('GUEST.' + i, g[1]));
Object.keys(D.NARR || {}).forEach((k) => {
  const v = D.NARR[k];
  if (typeof v === 'string') pushNar('NARR.' + k, v);
  else { pushNar('NARR.' + k + '.nar', v.nar); pushNar('NARR.' + k + '.end', v.end); }
});
pushNar('TRIBUTE.nar', D.TRIBUTE.nar);
pushNar('TRIBUTE.end', D.TRIBUTE.end);
const drift = narAll.filter(([, s]) => !html.includes(s));
ok('빌더 인라인 사본이 원천 문안 ' + narAll.length + '개와 일치(drift ' + drift.length + '건)', drift.length === 0);
drift.forEach(([id, s]) => console.log('   DRIFT ' + id + ' : ' + s.slice(0, 46) + '…'));

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
ok('KB full이 소요분 상수를 인용', KB.full.includes('담백 ' + D.MIN.base.damback + '분'));
ok('KB lite 존재(축약판)', typeof KB.lite === 'string' && KB.lite.length > 500 && KB.lite.length < KB.full.length / 2);

// 토큰 추정(보수적=과대 방향): 한국어는 BPE에서 자당 토큰이 1을 넘는 경우가 많아, 캡을 일찍 걸도록 자수×1.1로 잡는다.
//   (자수/1.3은 과소추정이라 KB가 커질 때 캡을 늦게 걸어 위험 — 방향을 뒤집음)
const estTok = Math.round(KB.full.length * 1.1);
ok('KB full 토큰 추정 ≤ 20k (현재 ~' + estTok + ')', estTok <= 20000);
const liteTok = Math.round(KB.lite.length * 1.1);
ok('KB lite 토큰 추정 ≤ 6k (현재 ~' + liteTok + ')', liteTok <= 6000);

process.exit(fail);
