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
