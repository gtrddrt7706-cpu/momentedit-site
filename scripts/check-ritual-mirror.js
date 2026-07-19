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
ok('빌더가 공유 모듈을 로드', html.includes('src="/assets/ritual-data.js"'));
ok('빌더에 리터럴 재복제 없음(var ENTRY=)', !html.includes('var ENTRY={'));
ok('빌더에 리터럴 재복제 없음(var COURSES=)', !html.includes('var COURSES={'));
ok('빌더 estMin이 MIN 상수 사용', html.includes('MIN.base[S.course]'));

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
