// [COURSE_LOST_LOUD] 모르는 코스는 큰 소리로 실패하는가 — 엔진과 콘솔 둘 다 본다.
//   사고 모양: 코스 키가 사라진 초안이 norm() 에서 조용히 «약속»으로 떨어져, 고객이 고르지 않은 예식이 흐른다.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const C = require('../../assets/ritual-cue.js');
let bad = 0;
const ok = (name, cond, note = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (note ? '  ' + note : '')); if (!cond) bad++; };
const _err = console.error; const said = []; console.error = (...a) => said.push(a.join(' '));
const lost = C.build({ course: 'zzz-gone' }, { mode: 'console' }).meta;
const fine = C.build({ course: 'record' }, { mode: 'console' }).meta;
const blank = C.build({}, { mode: 'console' }).meta;
console.error = _err;
ok('모르는 코스 → meta.lostCourse 에 원래 키가 실린다', lost.lostCourse === 'zzz-gone', JSON.stringify(lost.lostCourse));
ok('모르는 코스 → 콘솔에 오류를 남긴다', said.some((s) => s.includes('COURSE_LOST_LOUD') && s.includes('zzz-gone')));
ok('모르는 코스 → 멈추지 않고 대신 흐른다(당일 콘솔이 죽지 않게)', lost.course === 'damback');
ok('아는 코스 → 조용하다', fine.lostCourse === '' && fine.course === 'record');
ok('빈 코스(아직 안 고름) → 조용하다', blank.lostCourse === '');
const html = fs.readFileSync(new URL('../../console.html', import.meta.url), 'utf8');
ok('console.html 이 lostCourse 를 화면과 알림으로 올린다', /m\.lostCourse/.test(html) && /__meLostAlerted/.test(html));
process.exit(bad ? 1 : 0);
