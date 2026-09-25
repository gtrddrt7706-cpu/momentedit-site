// 설문 «문항별 기타 의견»이 서버에서 제대로 저장·표시되는지 재는 검사.
//
// ★[SV_NOTES 2026-09-25 사장님 「관리자페이지 설문조사 고객페이지랑 동일하게 보여줘 · 선택한 거 전부
//                              수기로 작성한 부분까지 · 각 문항마다 기타로 수기로 적을 수 있는 공간」]
//   고객 화면(mypage.html)에 문항마다 «기타 의견» 칸을 붙였다. 그 글이 사라지는 길은 셋이다 —
//     ① 서버가 notes 를 모르고 버린다          → handleSubmitSurvey 가 저장하는가
//     ② 옛 서버인데 화면이 칸을 연다             → buildResultState 가 survey.notes 로 «받는다»고 말하는가
//                                                  (화면은 이 표시가 있을 때만 칸을 연다 · SV_NOTES_CAP)
//     ③ 저장은 됐는데 관리자가 못 본다           → adminHome 이 notesN 을 세는가 (SV_HOME_NOTESN)
//   그리고 «고객페이지랑 동일하게»는 제출 순간의 문항 원문(snap)을 함께 저장해야 성립한다 —
//   나중에 문구를 고치면 관리자 화면이 고객이 본 것과 달라진다. 그래서 snap 이 원문 그대로 남는지도 본다.
//
//   ★상한도 잰다 — 누가 거대한 값을 보내도 시트 셀(5만 자)이 터지지 않아야 한다.
//     셀이 터지면 설문만이 아니라 그 고객 행 쓰기가 통째로 실패한다.
//
//   ★[SERVED_OURS] 세계를 못 만들거나 함수를 못 찾으면 «틀렸다(1)»가 아니라 «못 쟀다(2)»로 빠진다.
//     환경 탓으로 붉는 검사는 사람이 곧 무시한다.
//
//   종료 코드: 0 통과 · 1 재서 틀렸다 · 2 재지 못했다
import { openWorld } from './_gasworld.mjs';

let rc = 0;
const say = (c, m, d) => {
  console.log(`  ${c ? '✅' : '❌'} ${m}${c || d === undefined ? '' : ' → ' + String(d).slice(0, 160)}`);
  if (!c) rc = 1;
};

let G, world;
try { ({ G, world } = openWorld()); }
catch (e) { console.log('━━ survey-notes — GAS 세계를 못 만들었습니다 · 재지 못했습니다: ' + e.message); process.exit(2); }
for (const fn of ['handleSubmitSurvey', 'buildResultState', 'adminHome', 'adminSurveySeen']) {
  if (typeof G[fn] !== 'function') { console.log(`━━ survey-notes — ${fn} 이 없습니다 · 재지 못했습니다`); process.exit(2); }
}

const mk = (extra) => world(Object.assign({ 개인코드: 'ME-SV', 신랑이름: '김', 신부이름: '이', 현재단계: '결과물전달',
  상품타입: '시그니처', 설문상태: '대기', 연락처: '01012345678' }, extra || {}), null);
// 세션은 이 세계의 고객 행으로 풀어 준다(토큰 시트를 흉내 내지 않고 그 자리만 채운다)
const bind = (w) => { G.resolveSession = function () { return { ok: true, row: { get: (h) => w.C[h] } }; }; };
const cell = (w) => { try { return JSON.parse(w.C['설문응답'] || '{}'); } catch (e) { return null; } };

console.log('━━ survey-notes — ① 정상 제출: 기타 의견 둘 · 문항 원문');
{
  const w = mk(); bind(w);
  const Q = '140분의 호흡은 어떠셨어요?';
  const r = G.handleSubmitSurvey({ token: 'T',
    answers: { pace: 'good', overall: 'very', recommend: 'definitely', source: 'etc' },
    notes: { pace: '사진 구간이 조금 더 여유 있었으면', source: '웨딩박람회', empty: '   ' },
    snap: [{ k: 'pace', q: Q, req: 0, v: 'good', o: [['good', '딱 좋았어요'], ['short', '조금 짧게 느껴졌어요']] }],
    review: '좋았어요', reviewPublic: 'Y' });
  say(r && r.ok === true, '제출이 성공한다', JSON.stringify(r));
  const sp = cell(w) || {};
  say(!!(sp.notes && sp.notes.pace && sp.notes.source), '기타 의견 두 건이 저장된다', JSON.stringify(sp.notes));
  say(!!sp.notes && !('empty' in sp.notes), '공백뿐인 칸은 버린다', JSON.stringify(sp.notes));
  say(Array.isArray(sp.snap) && !!sp.snap[0] && sp.snap[0].q === Q && sp.snap[0].o.length === 2,
    '문항 원문이 고객이 본 그대로 저장된다', JSON.stringify(sp.snap));
  say(!!sp.answers && !('notes' in sp.answers) && sp.answers.pace === 'good', '고른 답과 섞이지 않는다', JSON.stringify(sp.answers));
  say(w.C['설문상태'] === '완료', '설문상태가 완료가 된다', w.C['설문상태']);
}

console.log('━━ survey-notes — ② 상한: 거대한 값을 보내도 셀이 터지지 않는다');
{
  const w = mk(); bind(w);
  const big = '가'.repeat(5000);
  const notes = {}; for (let i = 0; i < 50; i++) notes['k' + i] = big;
  const snap = []; for (let i = 0; i < 50; i++) snap.push({ k: 'k' + i, q: big, v: big, o: Array.from({ length: 30 }, () => [big, big]) });
  const r = G.handleSubmitSurvey({ token: 'T', answers: { overall: 'very', recommend: 'definitely' }, notes, snap });
  const sp = cell(w) || {};
  const nk = Object.keys(sp.notes || {});
  say(r && r.ok === true, '제출이 성공한다', JSON.stringify(r));
  say(nk.length === 20, '의견은 20건까지', nk.length);
  say(nk.every((k) => sp.notes[k].length <= 500), '의견 한 건은 500자까지');
  say((sp.snap || []).length === 20 && sp.snap.every((x) => x.q.length <= 160 && x.o.length <= 8 && x.o.every((o) => o[1].length <= 80)),
    '원문은 문항 20 · 질문 160자 · 보기 8 · 보기 80자까지');
  const len = String(w.C['설문응답'] || '').length;
  say(len < 50000, '셀 한도(5만 자) 안쪽', len + '자');
}

console.log('━━ survey-notes — ③ 이상한 모양: 배열·숫자·null 을 보내도 던지지 않는다');
for (const [label, notes, snap] of [['notes 가 배열', ['a', 'b'], null], ['snap 이 객체', null, { k: 'x' }], ['둘 다 숫자', 7, 9]]) {
  const w = mk(); bind(w);
  let r; try { r = G.handleSubmitSurvey({ token: 'T', answers: { overall: 'very', recommend: 'definitely' }, notes, snap }); }
  catch (e) { r = { ok: false, error: 'THROW ' + e.message }; }
  const sp = cell(w) || {};
  say(r && r.ok === true && Array.isArray(sp.snap) && sp.snap.length === 0 && sp.notes && !Array.isArray(sp.notes),
    label + ' → 제출은 되고 의견·원문은 빈 값', JSON.stringify(r) + ' ' + JSON.stringify({ notes: sp.notes, snap: sp.snap }));
}

console.log('━━ survey-notes — ④ 능력 표시: 이 서버는 «기타 의견을 받는다»고 말한다');
{
  const w = mk();
  const st = G.buildResultState({ get: (h) => w.C[h] });
  say(!!st && !!st.survey && st.survey.notes === 1, 'buildResultState 의 survey.notes = 1', JSON.stringify(st && st.survey));
}

console.log('━━ survey-notes — ⑤ 관리자 홈: 응답마다 기타 의견 수를 센다');
for (const [label, raw, want] of [
  ['새 응답(의견 2)', JSON.stringify({ product: '시그니처', answers: { overall: 'very', recommend: 'definitely' }, notes: { pace: 'a', source: 'b' }, snap: [] }), 2],
  ['옛 응답(notes 없음)', JSON.stringify({ product: '시그니처', answers: { overall: 'satisfied', recommend: 'maybe' } }), 0],
  ['깨진 응답', '{깨짐', null]]) {
  mk({ 현재단계: '후기', 설문상태: '완료', 설문응답: raw, 설문일시: '2026-09-24 15:20' });
  G._AUTHED = true;
  let r; try { r = G.adminHome(); } catch (e) { r = { ok: false, error: 'THROW ' + e.message }; }
  say(!!r && r.ok !== false, label + ' → 관리자 홈이 던지지 않는다', r && r.error);
  if (want !== null) {
    const me = ((r && r.survey && r.survey.recent) || []).find((x) => x.code === 'ME-SV');
    say(!!me && me.notesN === want, label + ' → notesN = ' + want, JSON.stringify(me));
  }
}

console.log('━━ survey-notes — ⑥ 새 후기 알림 · 확인하면 사라진다 [SV_UNSEEN]·[SV_SEEN]');
/* 사장님 지시 — 「리뷰 남기면 알람 뜨고 확인하면 알람 없어지고 · 하지만 커피 쿠폰 미발송 시 계속 메인 화면에는 지금처럼」 */
{
  const SP = { product: '시그니처', answers: { overall: 'very', recommend: 'definitely' }, notes: { pace: '사진 구간이 조금 더 여유 있었으면' },
    snap: [{ k: 'pace', q: '140분의 호흡은 어떠셨어요?', req: 0, v: 'good', o: [['good', '딱 좋았어요']] }], review: '좋았어요', reviewPublic: 'Y' };
  const w = mk({ 현재단계: '후기', 설문상태: '완료', 설문응답: JSON.stringify(SP), 설문일시: '2026-09-24 15:20', 쿠폰상태: '' });
  G._AUTHED = true;
  let h1; try { h1 = G.adminHome(); } catch (e) { h1 = { ok: false, error: 'THROW ' + e.message }; }
  const it1 = (((h1 || {}).survey || {}).recent || []).find((x) => x.code === 'ME-SV');
  say(!!h1 && h1.survey && h1.survey.unseen === 1, '새 후기 1건 → 알림 수 1', JSON.stringify(h1 && h1.survey && h1.survey.unseen));
  say(!!it1 && it1.seen === '' && !!it1.full && !!it1.full.notes && it1.full.notes.pace === SP.notes.pace, '새 후기엔 원문이 함께 실린다(알림을 누르면 바로 읽고 확인)', JSON.stringify(it1));
  say(!!it1 && !('_p' in it1), '서버 안쪽 참조(_p)는 화면으로 나가지 않는다', JSON.stringify(Object.keys(it1 || {})));
  let r; try { r = G.adminSurveySeen('ME-SV'); } catch (e) { r = { ok: false, error: 'THROW ' + e.message }; }
  say(!!r && r.ok === true && !!r.seen, '확인 → ok · 확인 시각', JSON.stringify(r));
  let after = null; try { after = JSON.parse(w.C['설문응답']); } catch (e) {}
  say(!!after && after.seen === (r && r.seen) && JSON.stringify(Object.assign({}, after, { seen: undefined })) === JSON.stringify(SP),
    '고객이 쓴 글은 한 글자도 안 바뀐다(seen 만 더해진다)', w.C['설문응답']);
  let h2; try { h2 = G.adminHome(); } catch (e) { h2 = { ok: false, error: 'THROW ' + e.message }; }
  const it2 = (((h2 || {}).survey || {}).recent || []).find((x) => x.code === 'ME-SV');
  say(!!h2 && h2.survey && h2.survey.unseen === 0, '확인 뒤 알림 수 0', JSON.stringify(h2 && h2.survey && h2.survey.unseen));
  say(!!it2 && !!it2.seen && !it2.full, '확인한 후기는 목록에 남되 요약만 싣는다', JSON.stringify(it2));
  let r2; try { r2 = G.adminSurveySeen('ME-SV'); } catch (e) { r2 = { ok: false, error: 'THROW ' + e.message }; }
  say(!!r2 && r2.ok === true && r2.already === true && r2.seen === (r && r.seen), '두 번 눌러도 처음 확인 시각을 지킨다', JSON.stringify(r2));
  console.log('━━ survey-notes — ⑦ 쿠폰 미발송은 확인과 무관하게 홈에 남는다 [CPN_QUEUE]');
  const q2 = [...((h2 && h2.queue && h2.queue.urgent) || []), ...((h2 && h2.queue && h2.queue.normal) || [])].filter((x) => x.code === 'ME-SV' && x.kind === '쿠폰발급');
  say(q2.length === 1, '후기를 확인해도 «쿠폰발급»은 처리할 일에 그대로 있다', JSON.stringify(q2));
}
{
  mk({ 현재단계: '후기', 설문상태: '완료', 설문응답: JSON.stringify({ product: '시그니처', answers: { overall: 'very' }, seen: '2026-09-25 10:00' }), 설문일시: '2026-09-24 15:20', 쿠폰상태: '발급' });
  G._AUTHED = true;
  let h3; try { h3 = G.adminHome(); } catch (e) { h3 = { ok: false, error: 'THROW ' + e.message }; }
  const q3 = [...((h3 && h3.queue && h3.queue.urgent) || []), ...((h3 && h3.queue && h3.queue.normal) || [])].filter((x) => x.code === 'ME-SV' && x.kind === '쿠폰발급');
  say(q3.length === 0, '쿠폰을 발급하면 그때 처리할 일에서 빠진다', JSON.stringify(q3));
}
{
  mk({ 설문상태: '' });
  let r; try { r = G.adminSurveySeen('ME-SV'); } catch (e) { r = { ok: false, error: 'THROW ' + e.message }; }
  say(!!r && r.ok === false && !/THROW/.test(String(r.error)), '제출 전이면 «확인할 후기가 없다»고 알린다(던지지 않는다)', JSON.stringify(r));
}
{
  const w = mk({ 현재단계: '후기', 설문상태: '완료', 설문응답: '{깨짐' });
  const before = w.C['설문응답'];
  let r; try { r = G.adminSurveySeen('ME-SV'); } catch (e) { r = { ok: false, error: 'THROW ' + e.message }; }
  say(!!r && r.ok === false && w.C['설문응답'] === before, '못 읽는 칸은 덮어쓰지 않는다(원문 보존)', JSON.stringify(r) + ' ' + w.C['설문응답']);
}

console.log(rc ? '━━ survey-notes — 틀린 곳이 있습니다' : '━━ survey-notes — 전부 통과');
process.exit(rc);
