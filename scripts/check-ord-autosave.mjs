// 식순 빌더 자동 저장 — 저장이 나가기에서 떨어져 나왔는가 [ORD_AUTOSAVE]
//
// ★왜 이 검사가 생겼나 (2026-08-12 사용자 질문)
//   *"저장후 나가기 말고 그냥 나가기는없어? 저장버튼 을 만들든 아니면 팝업을 띄우든"*
//   원인은 버튼이 아니라 구조였다 — 서버 저장 갈래가 **나갈 때**와 **완성했을 때** 둘뿐이라
//   저장이 나가기에 인질로 잡혀 있었다. 그래서 저장을 사람 손에서 뺐다(orderDraft · done:false).
//
// ★이 검사가 지키는 것은 「자동 저장이 도는가」가 아니라 **네 가지 안전선**이다.
//   ① 완성본(_doneSaved)에 done:false 를 덮지 않는가 — 덮으면 완성이 초안으로 되돌아간다
//      (ORDERFILL_DONE 2026-07-25 실사고 · 「저장됨 · D-14」 화면이 초안에 뜨던 그 병)
//   ② 꾸러미에 S.seen 이 실리는가 — 빠지면 미리듣기가 안 걸어온 뒷부분까지 들려준다(PREVIEW_UPTO)
//   ③ 저장이 끝난 뒤 나가기가 **또 저장하지 않는가** — 그게 사용자가 찾던 '그냥 나가기'다
//   ④ 회신이 성공·실패 양쪽 다 도는가 — 한쪽만 받으면 표시가 한 상태에 갇혀 거짓말을 한다
//   ⑤ 걷기만 해도 저장이 나가는가 · 그런데 서버를 두들기지는 않는가 [ORD_WALK_SAVE]
//      «어디까지 걸었는지»(_seenK)가 저장 대상에 들어 있다. 걷기가 안 남으면 폰이 꺼졌을 때
//      미리듣기가 안 본 데까지 들려준다(2026-08-12 사용자 제보 그 버그). 그래서 걷기도 저장한다.
//      반대쪽 위험은 연타다 — 디바운스가 풀리면 한 사람이 스무 번을 두들긴다. 양쪽을 함께 잰다.
//
// ★[NO_GATE] 게이트는 이 검사를 돌리지 않는다 — 브라우저와 로컬 서버가 필요하다.
//   야간 잡(nightly-screen.yml)이 돌린다.  node scripts/check-ord-autosave.mjs
//
// ★종료 코드 [CANT_LOOK]  0 통과 · 1 재서 틀림 · 2 재지 못함
//
// ★이 검사가 지어내는 것 하나 — ⑧번(완성 상태)에서 `_doneSaved` 를 **직접 세운다.**
//   진짜로 완성까지 걸으려면 스무 단계를 눌러야 하고, 그 길이가 검사를 안 돌게 만든다.
//   재는 것은 「완성 상태에서 자동 저장이 멈추는가」이지 「완성까지 갈 수 있는가」가 아니다.
//   그 한계를 출력에도 적는다 — 안 잰 것을 잰 것처럼 두지 않는다.

import { openProbe } from './audit/page-probe.mjs';

/* ★★[ORD_WALK_SAVE 2026-08-12 · 클로드코드 ⑤ 판단 요청 「걷기만 하는 이동을 묶을지 정해 달라」]
   결론: **지금 그대로 둔다.** 다만 그 판단을 말로 두지 않고 여기서 잰다(목록 ★17).
   ★근거 셋
     ① 빌더를 떠나는 가장 흔한 순간이 «새 화면을 읽고 나서»다. 걷기를 5초로 늦추면 정확히 그
        순간이 창 밖으로 나간다. 나가기가 저장하긴 하지만 그건 정상 종료일 때뿐이고,
        폰이 꺼지거나 탭이 죽는 경우가 자동 저장이 존재하는 이유다.
     ② «어디까지 걸었는지»는 진짜 상태다 — 미리듣기가 그 값으로 뒷부분을 자른다(PREVIEW_UPTO).
        걷기를 안 남기면 그 버그가 하드 킬 경로로 되살아난다.
     ③ 실측상 폭주가 아니다. 사람이 읽는 속도(2500ms)면 한 단계에 **한 번**이고,
        빠르게 넘기면(900·300ms) 디바운스가 통째로 묶는다 — 9단계·17단계가 각각 1건이었다.
        즉 늘어난 저장은 «중복»이 아니라 «서로 다른 상태가 그만큼 있는 것»이다.
   ★그래서 판정은 넓게, 실측값은 좁게 찍는다 — 야간 잡이 매일 도는데 CI 가 느린 날
     8/9 로 헛붉으면 그 검사는 늑대가 된다(★9). 붉히는 것은 **양 끝** 둘뿐이다:
       · 걸었는데 저장이 **한 건뿐** → 걷기가 안 남는다. 코스를 고른 것만으로 이미 1건이 나가므로,
         걷기가 반영되면 반드시 2건 이상이다(매직 넘버가 아니라 «코스 1건 + 걷기»라는 구조에서 나온다).
         실측: _autoKey 에서 _seenK 를 빼니 9단계를 걸어도 1건이었다.
       · 걸은 수보다 많이 나감 → 한 단계에 두 번 이상(꼬리 저장이 겹쳤다 · 서버를 두들긴다)
     연타 쪽은 **사람 속도 때보다 적어야** 한다 — 더 빨리 지나갔으면 더 많이 묶여야 하니까.
   ★연타 기준을 «걸은 단계 수»로 잡았다가 고쳤다. 디바운스를 0으로 만들어도 17단계에 10건이라
     (날아간 저장을 기다리는 _autoWait 이 절반을 먹는다) 그 그물은 안 쏘였다 — 실측으로 확인.
     두 판을 **서로 견주니** 잡힌다: 평소 1 대 9 · 디바운스 0 이면 10 대 10.
     수를 박지 않아 코스가 늘어도 안 늙는다(COUNT_ROTS). */
async function walkRound(pace) {
  let w;
  try { w = await openProbe('order-preview.html?embed=1', { width: 390, settle: 2000 }); }
  catch (e) { return { can: false, why: e.message }; }
  try {
    await w.page.click('#next'); await w.page.waitForTimeout(300);
    await w.page.click('#next'); await w.page.waitForTimeout(400);
    const r = await w.page.evaluate(async (ms) => {
      const wait = (t) => new Promise((s) => setTimeout(s, t));
      let n = 0;
      /* 부모 노릇 — 실제 서버처럼 회신을 준다. 회신을 안 주면 _autoWait 에 걸려 늘 1건이 되고,
         그 1건을 «디바운스가 잘 묶었다»로 읽게 된다(안 잰 것을 잰 값으로 읽는 꼴 · 11-d). */
      window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'momentedit:orderDraft') { n++;
          setTimeout(() => parent.postMessage({ type: 'momentedit:orderDraftSaved' }, location.origin), 150); }
      });
      if (typeof startCourse !== 'function') return { can: false };
      startCourse('damback'); await wait(300);
      /* ★[ORD_WALK_SAVE · 누름과 걸음은 다르다 2026-08-12 클로드코드]
         처음엔 **누른 횟수**를 「단계」라 적었다. 연타(300ms)에서는 _navLock(400ms)이 절반을 삼켜
         17번 눌러 9칸을 간다 — 그런데 화면엔 「17단계」로 찍혀 **더 멀리 걸은 판처럼** 읽혔다.
         실측: 두 판 다 실제로는 9칸이다(STEPS 13 · idx 3→12). 같은 땅을 걸었고 저장만 9건 대 1건이다.
         ★11-d 와 같은 꼴이라(이름이 뜻과 다른 수) 둘을 나눠 센다 — 판정은 **걸음**으로 한다. */
      const start = idx;
      let taps = 0;
      while (idx < STEPS.length - 1 && taps < 40) { document.getElementById('next').click(); taps++; await wait(ms); }
      await wait(3000);   // 마지막 디바운스와 꼬리 저장까지 지나가게
      return { can: true, steps: idx - start, taps, sends: n };
    }, pace);
    return r;
  } catch (e) { return { can: false, why: String(e).slice(0, 80) }; }
  finally { await w.close(); }
}
const slow = await walkRound(2500);   // 사람이 화면을 읽는 속도
const fast = await walkRound(300);    // 연타 — 디바운스가 살아 있나

let h;
try {
  h = await openProbe('order-preview.html?embed=1', { width: 390, settle: 2200 });
} catch (e) {
  console.log(`· 식순 빌더를 못 열었습니다 — ${e.message}`);
  console.log('  ※ 종료 코드 2 = 재지 못했다(화면 결함 아님) · 1 = 재서 틀렸다');
  process.exit(2);
}

const bad = [];
try {
  const P = h.page;
  // 부모 노릇 — 이 지면이 부모에게 보내는 것을 그대로 받아 센다(임베드에서는 parent===window 라 자기 귀에 들어온다)
  await P.evaluate(() => {
    window.__sent = [];
    window.addEventListener('message', (e) => {
      if (e.data && typeof e.data.type === 'string' && /^momentedit:order/.test(e.data.type)) window.__sent.push(e.data);
    });
  });

  const label = await P.evaluate(() => (document.getElementById('obExit') || {}).textContent || '');
  const has = await P.evaluate(() => !!document.getElementById('psave'));

  /* ① 코스 고르기 전 — 저장할 게 없다. 여기서 보내면 빈 초안이 서버에 굳는다. */
  await P.click('#next'); await P.waitForTimeout(300);
  await P.click('#next'); await P.waitForTimeout(2600);
  const pre = await P.evaluate(() => window.__sent.filter((m) => m.type === 'momentedit:orderDraft').length);

  /* ② 코스를 고르고 값을 하나 바꾼다 — 진짜 함수로. 화면 버튼이 부르는 그 함수다. */
  const r = await P.evaluate(async () => {
    const wait = (ms) => new Promise((s) => setTimeout(s, ms));
    window.__sent.length = 0;
    startCourse('damback');
    await wait(300);
    pick('entry', 'B');            // 값이 실제로 바뀌는 지점(화면 칩이 부르는 그 함수)
    await wait(2600);              // 디바운스 1500 + 여유
    const drafts = window.__sent.filter((m) => m.type === 'momentedit:orderDraft');
    const d0 = drafts[0] || null;
    const saving = (document.getElementById('psave') || {}).textContent || '';
    /* ④ 성공 회신을 준다 — 부모가 하는 그대로 */
    parent.postMessage({ type: 'momentedit:orderDraftSaved' }, window.location.origin);
    await wait(300);
    const okTxt = (document.getElementById('psave') || {}).textContent || '';
    /* ③ 저장이 끝난 뒤 나가기 — 또 저장하면 안 된다 */
    window.__sent.length = 0;
    window._obExit();
    await wait(400);
    const outs = window.__sent.map((m) => m.type);
    return {
      n: drafts.length,
      seen: !!(d0 && d0.data && d0.data.S && Array.isArray(d0.data.S.seen)),
      seenN: d0 && d0.data && d0.data.S && d0.data.S.seen ? d0.data.S.seen.length : -1,
      course: !!(d0 && d0.data && d0.data.S && d0.data.S.course),
      sum: !!(d0 && d0.data && d0.data.summary && d0.data.summary.course),
      saving, okTxt, outs
    };
  });

  /* ⑤ 실패 회신 — 표시가 갈리고 다시 시도할 수 있어야 한다 */
  const f = await P.evaluate(async () => {
    const wait = (ms) => new Promise((s) => setTimeout(s, ms));
    _obExiting = false;                         // 위에서 나가기를 눌러 잠겼다 — 검사 진행을 위해 푼다
    pick('entry', 'C');
    await wait(2000);
    parent.postMessage({ type: 'momentedit:orderDraftFail' }, window.location.origin);
    await wait(300);
    const e = document.getElementById('psave');
    return { txt: e ? e.textContent : '', cls: e ? e.className : '', role: e ? e.getAttribute('role') : null };
  });

  /* ★★⑥ [ORD_SAVE_AFTER_AUTO] 자동 저장이 **날아가 있는 동안** 완성 저장이 나가면 안 된다.
     둘 다 부모의 같은 apiTrackSave 로 나가는데 하나는 done:false, 하나는 done:true 다.
     먼저 나간 done:false 가 서버에 **나중에 닿으면** 완성본이 초안으로 덮인다(ORDERFILL_DONE).
     ★보내는 쪽 순서만 보면 안 보인다 — 「이미 날아간 것」이 아직 안 끝났기 때문이다.
       그래서 회신을 **일부러 늦춰** 날아간 상태를 만들고 그 위에서 doSave() 를 부른다.
     ★기다리기만 하고 안 나가면 경주를 갇힘과 바꾼 것이다 — 회신을 준 뒤 딱 한 번 나가는지도 센다. */
  const race = await P.evaluate(async () => {
    const wait = (ms) => new Promise((s) => setTimeout(s, ms));
    _obExiting = false; _doneSaved = false; _saving = false;
    pick('entry', 'E');
    await wait(2000);                      // 자동 저장이 나갔고 회신은 아직 안 준다
    if (!_autoWait) return { can: false };
    window.__sent.length = 0;
    doSave();
    await wait(400);
    const during = window.__sent.filter((m) => m.type === 'momentedit:orderSave').length;
    parent.postMessage({ type: 'momentedit:orderDraftSaved' }, window.location.origin);
    await wait(700);
    const after = window.__sent.filter((m) => m.type === 'momentedit:orderSave').length;
    _saving = false;                        // 뒤 판을 위해 되돌린다(부모 회신을 안 줬으므로)
    return { can: true, during, after };
  });

  /* ⑦ 완성 상태 — done:false 를 덮어쓰면 안 된다 (★이 판만 상태를 직접 세운다 · 머리말 참고) */
  const done = await P.evaluate(async () => {
    const wait = (ms) => new Promise((s) => setTimeout(s, ms));
    _doneSaved = true;
    window.__sent.length = 0;
    pick('entry', 'D');
    await wait(2400);
    return { n: window.__sent.filter((m) => m.type === 'momentedit:orderDraft').length,
             txt: (document.getElementById('psave') || {}).textContent || '' };
  });

  if (!/^나가기$/.test(label.trim()))
    bad.push(`나가기 버튼 라벨이 「${label.trim()}」다 — 자동 저장이 도는데 저장이 나가기에 매달린 것처럼 읽힌다 [ORD_AUTOSAVE]`);
  if (!has) bad.push('저장 상태 자리(#psave)가 없다 — 자동 저장이 조용한 게 아니라 안 보이는 게 된다 [ORD_AUTOSAVE]');
  if (pre !== 0) bad.push(`코스를 고르기도 전에 초안을 ${pre}건 보냈다 — 빈 초안이 서버에 굳는다 [ORD_AUTOSAVE]`);
  if (r.n < 1) bad.push('값을 바꿨는데 초안이 안 나갔다 — 자동 저장이 안 돈다 [ORD_AUTOSAVE]');
  if (r.n > 2) bad.push(`한 번 바꿨는데 초안이 ${r.n}건 나갔다 — 디바운스가 안 먹는다(서버를 두들긴다) [ORD_AUTOSAVE]`);
  if (!r.course) bad.push('초안 꾸러미에 S.course 가 없다 — 복원이 안 되는 초안이다 [ORD_AUTOSAVE]');
  if (!r.sum) bad.push('초안 꾸러미에 summary 가 없다 — 마이페이지 트랙 요약이 빈다 [ORD_PAYLOAD]');
  if (!r.seen) bad.push('초안 꾸러미에 S.seen 이 없다 — 미리듣기가 안 걸어온 뒷부분까지 들려준다 [PREVIEW_UPTO]');
  else if (r.seenN < 1) bad.push(`S.seen 이 비었다(${r.seenN}) — 걸어온 자취가 안 실린다 [PREVIEW_UPTO]`);
  if (!/저장 중/.test(r.saving)) bad.push(`보내는 동안 표시가 「${r.saving || '(빈칸)'}」다 — 저장 중이라고 말해야 한다 [ORD_AUTOSAVE]`);
  if (!/저장됨/.test(r.okTxt)) bad.push(`성공 회신을 받았는데 표시가 「${r.okTxt || '(빈칸)'}」다 [ORD_AUTOSAVE]`);
  if (r.outs.indexOf('momentedit:orderExit') >= 0)
    bad.push('저장이 끝났는데 나가기가 또 저장한다(orderExit) — 사용자가 찾던 「그냥 나가기」가 아니다 [ORD_AUTOSAVE]');
  if (r.outs.indexOf('momentedit:orderClose') < 0)
    bad.push(`나가기를 눌렀는데 닫으라는 말이 안 나갔다(나간 것: ${r.outs.join('·') || '없음'}) — 갇힌다 [ORD_AUTOSAVE]`);
  if (!/저장 안 됨/.test(f.txt)) bad.push(`실패 회신을 받았는데 표시가 「${f.txt || '(빈칸)'}」다 — 조용히 실패하면 자동 저장은 거짓말이 된다 [ORD_AUTOSAVE]`);
  if (!/bad/.test(f.cls) || f.role !== 'button') bad.push('저장 실패 표시를 누를 수 없다 — 다시 시도할 길이 없다 [ORD_AUTOSAVE]');
  if (!race.can) bad.push('자동 저장이 날아간 상태를 못 만들었다 — 이 안전선이 헛돌았다(통과 아님) [ORD_SAVE_AFTER_AUTO]');
  else {
    if (race.during !== 0) bad.push(`★자동 저장이 답을 기다리는 중에 완성 저장이 ${race.during}건 나갔다 — 서버 도착 순서가 뒤집히면 완성본이 초안으로 덮인다(ORDERFILL_DONE) [ORD_SAVE_AFTER_AUTO]`);
    if (race.after !== 1) bad.push(`자동 저장이 끝난 뒤 완성 저장이 ${race.after}건 — 딱 1건이어야 한다(0이면 완성이 갇힌다) [ORD_SAVE_AFTER_AUTO]`);
  }
  if (done.n !== 0) bad.push(`완성 저장 뒤에도 초안을 ${done.n}건 보냈다 — 완성본이 done:false 로 덮여 초안으로 되돌아간다 [ORD_AUTOSAVE]`);
  if (done.txt !== '') bad.push(`완성 상태인데 저장 표시가 「${done.txt}」로 남아 있다 — 완성 화면에서 「저장 중」이 보인다 [ORD_AUTOSAVE]`);

  /* ★⑤ [ORD_WALK_SAVE] 걷기만 하는 이동 — 양 끝만 붉힌다(위 머리말 참고) */
  if (!slow.can) bad.push(`걷기(사람 속도)를 못 쟀다 — 이 안전선이 헛돌았다(통과 아님)${slow.why ? ' · ' + slow.why : ''} [ORD_WALK_SAVE]`);
  else {
    if (slow.steps < 2) bad.push(`걸은 단계가 ${slow.steps}개뿐이다 — 걷기를 재지 못했다(통과 아님) [ORD_WALK_SAVE]`);
    else if (slow.sends <= 1) bad.push(`${slow.steps}단계를 걸었는데 저장이 ${slow.sends}건뿐이다(코스 고르기 하나로도 1건은 나간다) — 걷기가 안 남는다. 폰이 꺼지면 걸어온 자취가 사라지고 미리듣기가 안 본 데까지 들려준다 [ORD_WALK_SAVE][PREVIEW_UPTO]`);
    else if (slow.sends > slow.steps) bad.push(`${slow.steps}단계 걸었는데 저장이 ${slow.sends}건이다 — 한 단계에 두 번 이상 나간다(꼬리 저장이 겹쳤다) [ORD_WALK_SAVE]`);
  }
  if (!fast.can) bad.push(`걷기(연타)를 못 쟀다 — 디바운스를 확인 못 했다(통과 아님)${fast.why ? ' · ' + fast.why : ''} [ORD_WALK_SAVE]`);
  else if (slow.can && slow.sends > 1 && fast.steps >= 2 && fast.sends >= slow.sends)   /* 걷기 자체가 안 남는 판에서는 이 견줌이 뜻을 잃는다 — 그건 위 그물이 말한다 */
    bad.push(`연타로 ${fast.steps}칸을 훑었는데 저장이 ${fast.sends}건 — 사람 속도(${slow.steps}칸 ${slow.sends}건)보다 안 줄었다. 디바운스가 풀렸다(한 사람이 서버를 두들긴다) [ORD_WALK_SAVE]`);

  const p = await h.probe();
  if (p.errors.length) bad.push(`JS 오류 ${p.errors.length}개 — ${p.errors[0]}`);

  console.log(`━━ 식순 빌더 자동 저장 @390  나가기 라벨=「${label.trim()}」 · 코스 전 초안 ${pre}건(0이어야)`);
  console.log(`   값 하나 바꿈 → 초안 ${r.n}건 · seen ${r.seenN}개 · 보내는 중 「${r.saving}」 → 성공 회신 뒤 「${r.okTxt}」`);
  console.log(`   저장 끝난 뒤 나가기 → ${r.outs.join(' · ') || '(아무것도 안 나감)'}  ← orderExit 가 없어야 '그냥 나가기'다`);
  console.log(`   실패 회신 → 「${f.txt}」(누를 수 있나=${f.role === 'button'})`);
  console.log(`   자동 저장 날아간 중 완성 누름 → 그때 ${race.during}건(0이어야) · 회신 뒤 ${race.after}건(1이어야) [ORD_SAVE_AFTER_AUTO]`);
  console.log(`   완성 상태 → 초안 ${done.n}건(0이어야) · 표시 「${done.txt || '(빈칸)'}」  ☐ 이 판은 _doneSaved 를 검사가 직접 세웠다(완성까지 걷지 않았다)`);
  /* [ORD_WALK_SAVE] 걸음과 누름을 따로 찍는다 — 연타 판은 _navLock 이 절반을 삼켜 누름이 더 많다.
     같은 걸음 수에서 저장이 몇 건인지가 볼 것이다(그 수를 「단계」로 뭉뚱그리면 딴 판처럼 읽힌다). */
  console.log(`   걷기만 함 — 사람 속도(2.5초) ${slow.can ? slow.steps + '칸 걸음(누름 ' + slow.taps + ') → 저장 ' + slow.sends + '건' : '못 잼'} · 연타(0.3초) ${fast.can ? fast.steps + '칸 걸음(누름 ' + fast.taps + ') → 저장 ' + fast.sends + '건' : '못 잼'}  ← 같은 땅을 걷는데 연타는 묶인다 [ORD_WALK_SAVE]`);
  if (p.unseen.length) p.unseen.forEach((u) => console.log('   ☐ ' + u));

  if (bad.length) { bad.forEach((b) => console.log('   ✖ ' + b)); process.exit(1); }
  console.log('   ✔ 저장이 나가기에서 떨어졌다 — 나가기는 그냥 나가기다');
  process.exit(0);
} catch (e) {
  console.log(`· 재는 도중에 멈췄습니다 — ${String(e).slice(0, 160)}`);
  console.log('  ※ 종료 코드 2 = 재지 못했다. 통과가 아닙니다.');
  process.exit(2);
} finally {
  await h.close();
}
