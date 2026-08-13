// 식순 빌더 저장 — 사람이 누를 때만 나가고, 그래도 잃지 않는가 [ORD_SAVE_BTN]
//
// ★이 검사의 내력 (자를 두 번 갈았다)
//   2026-08-12 사용자 질문 *"저장후 나가기 말고 그냥 나가기는없어?"* → 저장을 나가기에서 뗐다.
//     그때 고른 답은 **자동 저장**이었다(orderDraft · 1.5초 디바운스).
//   2026-08-13 사용자 지시 *"지금은 자동저장이잖아 그렇게하지말고 저장 버튼을 따로 만들자"*
//     → 자동을 걷고 **저장 버튼**으로 바꿨다. 이 파일은 그 판을 지킨다.
//   ★옛 이름(check-ord-autosave)은 버렸다. 이름이 하는 일과 어긋나면 다음 사람이 그 이름을
//     근거로 읽는다 — 이 저장소가 반복해 적어 온 병이다(사본은 늙는다).
//
// ★지금 구조 — 서버로 가는 갈래 셋
//   저장 버튼(나가지 않고 지금 · done:false) · 나가기(있으면 저장하고 닫기) · 완성(done:true)
//   그래서 「저장 안 하고 나가는 길」이 없고, 나갈 때 묻는 팝업도 없다.
//   기기에는 늘 남아 있다(localStorage) — 서버로 보내는 것만 사람 손이 정한다.
//
// ★안전선 일곱
//   ① 사람이 안 눌렀으면 서버로 안 나간다 — 자동 저장이 되살아나면 여기서 붉는다 [ORD_SAVE_BTN]
//   ② 저장 안 한 채 나가도 **잃지 않는다** — 나가기가 orderExit(저장하고 닫기)로 나간다
//   ③ 저장이 끝난 뒤 나가기는 **또 저장하지 않는다** — 그게 「그냥 나가기」다
//   ④ 완성본(_doneSaved)에 done:false 를 덮지 않는다 (ORDERFILL_DONE 2026-07-25 실사고)
//   ⑤ 꾸러미에 S.seen 이 실린다 — 빠지면 미리듣기가 안 걸어온 뒷부분까지 들려준다(PREVIEW_UPTO)
//   ⑥ 회신이 성공·실패 양쪽 다 돈다 — 한쪽만 받으면 버튼이 한 상태에 갇혀 거짓말을 한다
//   ⑦ 날아간 저장이 안 끝났는데 완성 저장이 나가지 않는다 [ORD_SAVE_AFTER_AUTO]
//      둘 다 같은 apiTrackSave 로 나가는데 하나는 done:false 다. 도착 순서가 뒤집히면
//      완성본이 초안으로 덮인다. 「안 보낸다」로 막은 자리는 「이미 보낸 것」을 못 막는다.
//   ⑧ 눈에 보이는 글과 **귀에 읽히는 이름이 같은가** [BADGE_GAP]
//      ★처음엔 「「기본」이 붙어 읽히지 않는가」를 재려 했다. 돌연변이로 배지 앞 한 칸을 지워 봤더니
//        **안 붉었다** — 크로미움이 접근성 이름을 만들 때 스스로 한 칸을 넣기 때문이다(실측 2회).
//        즉 그 그물은 이 엔진에서 늘 참인 죽은 그물이었다(★11-c). 그래서 겨냥을 바꿨다.
//      ★한 칸 자체는 정적 chk 가 지킨다(merge-guard 의 BADGE_GAP 네 줄) — 소스에서 사라지면 붉는다.
//        엔진이 넣어 주는 것에 기대지 않으려고 넣은 칸이고, 그 목적엔 정적 검사가 맞는 자다.
//      ★여기서 재는 것은 **다른 위험**이다: aria-label 로 버튼 이름을 통째로 갈아끼우면
//        눈에 보이는 글과 귀에 읽히는 글이 두 벌이 되고, 둘 중 하나만 고치는 날이 온다.
//        그 길은 2026-08-13 에 일부러 안 골랐다 — 나중에 누가 고르면 여기서 붉는다(돌연변이 확인).
//      ★재는 자리 — 배지가 있는 화면까지 걸어가서 찍는다. 다듬기엔 토글뿐이고 완성 화면엔 카드가 없다.
//
// ★[NO_GATE] 게이트는 이 검사를 돌리지 않는다 — 브라우저와 로컬 서버가 필요하다.
//   야간 잡(nightly-screen.yml)이 돌린다.  node scripts/check-ord-save.mjs
//
// ★종료 코드 [CANT_LOOK]  0 통과 · 1 재서 틀림 · 2 재지 못함
//
// ★이 검사가 지어내는 것 하나 — ④에서 `_doneSaved` 를 **직접 세운다.**
//   진짜로 완성까지 걸으려면 스무 번을 눌러야 하고, 그 길이가 검사를 안 돌게 만든다.
//   재는 것은 「완성 상태에서 초안 저장이 멈추는가」이지 「완성까지 갈 수 있는가」가 아니다.
//   그 한계를 출력에도 적는다 — 안 잰 것을 잰 것처럼 두지 않는다.

import { openProbe } from './audit/page-probe.mjs';

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

  /* 코스 고르기 전 — 저장할 게 없다. 버튼도 안 보여야 한다(누를 것이 없는 버튼은 소음이다). */
  await P.click('#next'); await P.waitForTimeout(300);
  await P.click('#next'); await P.waitForTimeout(1200);
  const pre = await P.evaluate(() => ({
    n: window.__sent.filter((m) => m.type === 'momentedit:orderDraft').length,
    btn: !!document.getElementById('obSave'),
    shown: (() => { const b = document.getElementById('obSave'); return !!b && getComputedStyle(b).display !== 'none'; })()
  }));

  /* ★① 값을 바꾸고 **아무것도 안 누른 채** 기다린다 — 자동으로 나가면 안 된다.
     옛 판의 디바운스는 1.5초였다. 그보다 넉넉히 기다려 「안 나간다」를 확인한다. */
  const idle = await P.evaluate(async () => {
    const wait = (ms) => new Promise((s) => setTimeout(s, ms));
    window.__sent.length = 0;
    startCourse('damback');
    await wait(300);
    pick('entry', 'B');
    await wait(3000);                       // 옛 디바운스(1.5s)의 두 배
    const b = document.getElementById('obSave');
    return { n: window.__sent.filter((m) => m.type === 'momentedit:orderDraft').length,
             btn: b ? b.textContent.trim() : '', on: b ? b.className.indexOf('on') >= 0 : false,
             dis: b ? b.disabled : null };
  });

  /* ★⑧ [BADGE_GAP] 낭독기가 읽는 이름 — textContent 가 아니라 접근성 트리에서 읽는다.
     ★배지가 **있는 화면까지 걸어가서** 찍는다. 코스를 막 고른 자리(다듬기)엔 토글뿐이라 배지가 없고,
       뒤로 가면 완성 화면이라 카드가 없다 — 첫 두 판이 각각 그래서 「배지가 하나도 없다」로 붉었다.
       겨냥이 있는 자리를 찾아가는 것이지, 없으면 넘어가는 것이 아니다(못 찾으면 붉는다 ★11-c). */
  await P.evaluate(async () => {
    const wait = (ms) => new Promise((s) => setTimeout(s, ms));
    for (let i = 0; i < 12; i++) {
      if (document.querySelector('.oc-rec, .seg-b .df')) return;
      document.getElementById('next').click(); await wait(240);
    }
  });
  const ear = await (async () => {
    try {
      const snap = await P.accessibility.snapshot();
      const out = []; (function walk(n) { if (!n) return; if (n.role === 'button' && n.name) out.push(n.name); (n.children || []).forEach(walk); })(snap);
      return out;
    } catch (e) { return null; }
  })();
  /* 눈 — 같은 버튼들의 보이는 글. 귀와 **짝지어** 견주려고 같은 순서로 긁는다. */
  const eye = await P.evaluate(() => [...document.querySelectorAll('button')]
    .filter((b) => b.offsetParent !== null && b.textContent.trim())
    .map((b) => b.textContent.replace(/\s+/g, '')));
  const flat = (x) => String(x).replace(/\s+/g, '');
  const withBadge = ear ? ear.filter((n) => /기본/.test(n)) : [];
  /* ★겨냥을 **배지 붙은 버튼**으로 좁힌다. 전체 버튼에 「귀==눈」을 걸었더니 기준선에서 넷이 걸렸다 —
     아이콘뿐이라 aria-label 이 **옳은 도구**인 자리들이다(예: 「안내 문구 전문 보기」).
     그것까지 붉히면 늑대가 된다(★9). 여기서 막으려는 것은 「글자가 보이는데 이름을 갈아끼우는 것」뿐이다. */
  const orphan = ear ? withBadge.filter((n) => flat(n) && eye.indexOf(flat(n)) < 0) : [];

  /* 저장 버튼을 누른다 — 그제서야 나가야 한다 */
  const hit = await P.evaluate(async () => {
    const wait = (ms) => new Promise((s) => setTimeout(s, ms));
    window.__sent.length = 0;
    document.getElementById('obSave').click();
    await wait(400);
    const b = document.getElementById('obSave');
    const drafts = window.__sent.filter((m) => m.type === 'momentedit:orderDraft');
    const d0 = drafts[0] || null;
    const busy = b.textContent.trim();
    parent.postMessage({ type: 'momentedit:orderDraftSaved' }, window.location.origin);
    await wait(300);
    return {
      n: drafts.length, busy, done: b.textContent.trim(), dis: b.disabled,
      seen: !!(d0 && d0.data && d0.data.S && Array.isArray(d0.data.S.seen)),
      seenN: d0 && d0.data && d0.data.S && d0.data.S.seen ? d0.data.S.seen.length : -1,
      course: !!(d0 && d0.data && d0.data.S && d0.data.S.course),
      sum: !!(d0 && d0.data && d0.data.summary && d0.data.summary.course)
    };
  });

  /* ★③ 저장이 끝난 뒤 나가기 — 또 저장하면 안 된다 */
  const outs = await P.evaluate(async () => {
    const wait = (ms) => new Promise((s) => setTimeout(s, ms));
    window.__sent.length = 0;
    window._obExit();
    await wait(400);
    _obExiting = false;                     // 뒤 판을 위해 잠금을 푼다(부모가 안 닫아 줬으므로)
    return window.__sent.map((m) => m.type);
  });

  /* ★② 저장 안 한 채 나가기 — 잃으면 안 된다(저장하고 닫아야 한다) */
  const dirty = await P.evaluate(async () => {
    const wait = (ms) => new Promise((s) => setTimeout(s, ms));
    pick('entry', 'C');
    await wait(300);
    const btn = (document.getElementById('obSave') || {}).textContent.trim();
    window.__sent.length = 0;
    window._obExit();
    await wait(500);
    _obExiting = false;
    return { btn, outs: window.__sent.map((m) => m.type) };
  });

  /* ★⑥ 실패 회신 — 버튼이 갈리고 다시 누를 수 있어야 한다 */
  const f = await P.evaluate(async () => {
    const wait = (ms) => new Promise((s) => setTimeout(s, ms));
    parent.postMessage({ type: 'momentedit:orderDraftFail' }, window.location.origin);
    await wait(300);
    const b = document.getElementById('obSave');
    return { txt: b.textContent.trim(), cls: b.className, dis: b.disabled };
  });

  /* ★⑦ [ORD_SAVE_AFTER_AUTO] 저장이 **날아가 있는 동안** 완성 저장이 나가면 안 된다.
     둘 다 부모의 같은 apiTrackSave 로 나가는데 하나는 done:false, 하나는 done:true 다.
     먼저 나간 done:false 가 서버에 **나중에 닿으면** 완성본이 초안으로 덮인다(ORDERFILL_DONE).
     ★보내는 쪽 순서만 보면 안 보인다 — 「이미 날아간 것」이 아직 안 끝났기 때문이다.
       그래서 회신을 **일부러 늦춰** 날아간 상태를 만들고 그 위에서 doSave() 를 부른다.
     ★기다리기만 하고 안 나가면 경주를 갇힘과 바꾼 것이다 — 회신을 준 뒤 딱 한 번 나가는지도 센다. */
  const race = await P.evaluate(async () => {
    const wait = (ms) => new Promise((s) => setTimeout(s, ms));
    _obExiting = false; _doneSaved = false; _saving = false; _autoLast = '';
    pick('entry', 'E');
    await wait(300);
    document.getElementById('obSave').click();   // 회신은 아직 안 준다 — 날아간 상태를 만든다
    await wait(400);
    if (!_autoWait) return { can: false };
    window.__sent.length = 0;
    doSave();
    await wait(400);
    const during = window.__sent.filter((m) => m.type === 'momentedit:orderSave').length;
    parent.postMessage({ type: 'momentedit:orderDraftSaved' }, window.location.origin);
    await wait(700);
    const after = window.__sent.filter((m) => m.type === 'momentedit:orderSave').length;
    /* [DONE_SEEN_EMPTY] 완성 저장 꾸러미는 seen 을 비워야 한다 — _doneSaved(회신 뒤에야 참)로
       비우던 옛 판은 모든 단계 키를 실어 보냈고, 그 초안으로 연 미리듣기가 폐식을 잘랐다(실사고). */
    const sv = window.__sent.find((m) => m.type === 'momentedit:orderSave');
    const doneSeen = sv && sv.data && sv.data.S && Array.isArray(sv.data.S.seen) ? sv.data.S.seen.length : -1;
    _saving = false;
    return { can: true, during, after, doneSeen };
  });

  /* ★④ 완성 상태 — done:false 를 덮어쓰면 안 된다 (★이 판만 상태를 직접 세운다 · 머리말 참고) */
  const done = await P.evaluate(async () => {
    const wait = (ms) => new Promise((s) => setTimeout(s, ms));
    _doneSaved = true;
    window.__sent.length = 0;
    pick('entry', 'D');
    await wait(1200);
    const b = document.getElementById('obSave');
    return { n: window.__sent.filter((m) => m.type === 'momentedit:orderDraft').length,
             shown: !!b && getComputedStyle(b).display !== 'none' };
  });

  if (!/^나가기$/.test(label.trim()))
    bad.push(`나가기 버튼 라벨이 「${label.trim()}」다 — 저장은 이 버튼의 일이 아니다 [ORD_SAVE_BTN]`);
  if (!pre.btn) bad.push('저장 버튼(#obSave)이 없다 — 손으로 저장할 길이 없다 [ORD_SAVE_BTN]');
  if (pre.shown) bad.push('코스를 고르기도 전에 저장 버튼이 보인다 — 누를 것이 없는 버튼은 소음이다 [ORD_SAVE_BTN]');
  if (pre.n !== 0) bad.push(`코스를 고르기도 전에 초안을 ${pre.n}건 보냈다 — 빈 초안이 서버에 굳는다 [ORD_SAVE_BTN]`);

  if (idle.n !== 0)
    bad.push(`★아무것도 안 눌렀는데 초안이 ${idle.n}건 나갔다 — 자동 저장이 되살아났다(사용자 지시로 걷은 것) [ORD_SAVE_BTN]`);
  if (idle.btn !== '저장') bad.push(`값을 바꿨는데 버튼이 「${idle.btn}」다 — 「저장」이어야 손이 간다 [ORD_SAVE_BTN]`);
  if (!idle.on) bad.push('보낼 것이 있는데 저장 버튼이 진해지지 않는다 — 눌러야 할 것으로 안 읽힌다 [ORD_SAVE_BTN]');
  if (idle.dis) bad.push('보낼 것이 있는데 저장 버튼이 안 눌린다 [ORD_SAVE_BTN]');

  if (hit.n !== 1) bad.push(`저장을 한 번 눌렀는데 초안이 ${hit.n}건 나갔다(1이어야) [ORD_SAVE_BTN]`);
  if (!/저장 중/.test(hit.busy)) bad.push(`누른 뒤 버튼이 「${hit.busy}」다 — 들어갔는지 알 수 없다(EXIT_FEEDBACK 과 같은 병) [ORD_SAVE_BTN]`);
  if (!/저장됨/.test(hit.done)) bad.push(`성공 회신을 받았는데 버튼이 「${hit.done}」다 [ORD_SAVE_BTN]`);
  if (!hit.dis) bad.push('더 보낼 것이 없는데 저장 버튼이 여전히 눌린다 — 같은 것을 두 번 보낸다 [ORD_SAVE_BTN]');
  if (!hit.course) bad.push('초안 꾸러미에 S.course 가 없다 — 복원이 안 되는 초안이다 [ORD_SAVE_BTN]');
  if (!hit.sum) bad.push('초안 꾸러미에 summary 가 없다 — 마이페이지 트랙 요약이 빈다 [ORD_PAYLOAD]');
  if (!hit.seen) bad.push('초안 꾸러미에 S.seen 이 없다 — 미리듣기가 안 걸어온 뒷부분까지 들려준다 [PREVIEW_UPTO]');
  else if (hit.seenN < 1) bad.push(`S.seen 이 비었다(${hit.seenN}) — 걸어온 자취가 안 실린다 [PREVIEW_UPTO]`);

  if (outs.indexOf('momentedit:orderExit') >= 0)
    bad.push('저장이 끝났는데 나가기가 또 저장한다(orderExit) — 그냥 나가기가 아니다 [ORD_SAVE_BTN]');
  if (outs.indexOf('momentedit:orderClose') < 0)
    bad.push(`나가기를 눌렀는데 닫으라는 말이 안 나갔다(나간 것: ${outs.join('·') || '없음'}) — 갇힌다 [ORD_SAVE_BTN]`);

  if (dirty.btn !== '저장') bad.push(`저장 안 한 변경이 있는데 버튼이 「${dirty.btn}」다 [ORD_SAVE_BTN]`);
  if (dirty.outs.indexOf('momentedit:orderExit') < 0)
    bad.push(`★저장 안 한 채 나갔는데 저장이 안 나갔다(나간 것: ${dirty.outs.join('·') || '없음'}) — 고친 것이 서버에 안 남는다 [ORD_SAVE_BTN]`);

  if (!/다시 저장/.test(f.txt)) bad.push(`실패 회신을 받았는데 버튼이 「${f.txt}」다 — 조용히 실패하면 저장은 거짓말이 된다 [ORD_SAVE_BTN]`);
  if (!/bad/.test(f.cls) || f.dis) bad.push('저장이 실패했는데 다시 누를 수 없다 [ORD_SAVE_BTN]');

  if (!race.can) bad.push('저장이 날아간 상태를 못 만들었다 — 이 안전선이 헛돌았다(통과 아님) [ORD_SAVE_AFTER_AUTO]');
  else {
    if (race.during !== 0) bad.push(`★초안 저장이 답을 기다리는 중에 완성 저장이 ${race.during}건 나갔다 — 도착 순서가 뒤집히면 완성본이 초안으로 덮인다(ORDERFILL_DONE) [ORD_SAVE_AFTER_AUTO]`);
    if (race.after !== 1) bad.push(`초안 저장이 끝난 뒤 완성 저장이 ${race.after}건 — 딱 1건이어야 한다(0이면 완성이 갇힌다) [ORD_SAVE_AFTER_AUTO]`);
    if (race.doneSeen !== 0) bad.push(`완성 저장 꾸러미의 seen 이 ${race.doneSeen}개다(0이어야) — 서버 초안이 그 모양으로 굳어 미리듣기가 폐식을 자른다 [DONE_SEEN_EMPTY]`);
  }

  if (done.n !== 0) bad.push(`완성 저장 뒤에도 초안을 ${done.n}건 보냈다 — 완성본이 done:false 로 덮여 초안으로 되돌아간다 [ORD_SAVE_BTN]`);
  if (done.shown) bad.push('완성 상태인데 저장 버튼이 남아 있다 — 누르면 완성이 초안으로 되돌아간다 [ORD_SAVE_BTN]');

  if (!ear) bad.push('접근성 트리를 못 읽었다 — 낭독기가 읽는 이름을 재지 못했다(통과 아님) [BADGE_GAP]');
  else if (!withBadge.length) bad.push('「기본」 배지가 붙은 버튼이 하나도 없다 — 겨냥이 사라졌다(통과 아님) [BADGE_GAP]');
  else if (orphan.length)
    bad.push(`귀에 읽히는 이름이 눈에 보이는 글과 다르다 — 「${orphan[0]}」는 화면 어디에도 없는 말이다(aria-label 로 갈아끼운 자리) [BADGE_GAP]`);

  const p = await h.probe();
  if (p.errors.length) bad.push(`JS 오류 ${p.errors.length}개 — ${p.errors[0]}`);

  console.log(`━━ 식순 빌더 저장 @390  나가기 라벨=「${label.trim()}」 · 코스 전: 초안 ${pre.n}건 · 버튼 보임=${pre.shown}(둘 다 아니어야)`);
  console.log(`   ★값만 바꾸고 3초 기다림 → 초안 ${idle.n}건(0이어야 · 자동 저장이 걷혔다) · 버튼 「${idle.btn}」`);
  console.log(`   저장 누름 → 초안 ${hit.n}건 · seen ${hit.seenN}개 · 「${hit.busy}」 → 회신 뒤 「${hit.done}」(안 눌림=${hit.dis})`);
  console.log(`   저장 끝난 뒤 나가기 → ${outs.join(' · ') || '(아무것도 안 나감)'}  ← orderExit 가 없어야 그냥 나가기다`);
  console.log(`   ★저장 안 한 채 나가기 → ${dirty.outs.join(' · ') || '(아무것도 안 나감)'}  ← orderExit 가 있어야 안 잃는다`);
  console.log(`   실패 회신 → 「${f.txt}」(다시 누를 수 있나=${!f.dis})`);
  console.log(`   저장 날아간 중 완성 누름 → 그때 ${race.during}건(0이어야) · 회신 뒤 ${race.after}건(1이어야) [ORD_SAVE_AFTER_AUTO]`);
  console.log(`   완성 상태 → 초안 ${done.n}건(0이어야) · 버튼 보임 ${done.shown}(아니어야)  ☐ 이 판은 _doneSaved 를 검사가 직접 세웠다`);
  console.log(`   낭독기가 읽는 이름(접근성 트리 · textContent 아님) — ${withBadge.length ? withBadge.map((n) => '「' + n + '」').join(' · ') : '(「기본」 붙은 버튼 없음)'} · 배지 버튼 중 눈과 어긋난 것 ${orphan.length}개(0이어야 · 아이콘 버튼의 aria-label 은 셈에서 뺀다) [BADGE_GAP]`);
  if (p.unseen.length) p.unseen.forEach((u) => console.log('   ☐ ' + u));

  if (bad.length) { bad.forEach((b) => console.log('   ✖ ' + b)); process.exit(1); }
  console.log('   ✔ 사람이 누를 때만 나가고, 안 누른 채 나가도 잃지 않습니다');
  process.exit(0);
} catch (e) {
  console.log(`· 재는 도중에 멈췄습니다 — ${String(e).slice(0, 160)}`);
  console.log('  ※ 종료 코드 2 = 재지 못했다. 통과가 아닙니다.');
  process.exit(2);
} finally {
  await h.close();
}
