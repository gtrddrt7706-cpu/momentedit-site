// 모먼트에디트 · 예식 큐 엔진 (★ritual-cue 공유 원천 v1 — 2026-07-31)  [CUE_ENGINE_V1]
// 고객 설정 S(코스·옵션·순서) 하나를 넣으면 '당일 재생할 큐 목록'이 나온다.
// 세 곳이 이 파일 하나를 공유한다 — 화면만 다르고 엔진은 같다(기획서 §2):
//   [쓰임 A] console.html 수동 모드 — 당일 디렉터 콘솔(메인 [다음] 1개 · 예식당 10회)
//   [쓰임 B] 코스 기본형 미리듣기 — 자동 모드 + 코스 기본 S
//   [쓰임 C] 커스텀 미리듣기 — 자동 모드 + 고객 ritualDraft.S
// 문안·시간은 절대 여기 적지 않는다 — 전부 assets/ritual-data.js에서 읽는다(단일 원천).
// 브라우저: <script src="/assets/ritual-data.js"></script><script src="/assets/ritual-cue.js"></script> (이 순서 · 동기 로드)
// Node: require("./assets/ritual-cue.js")   · 검증: node scripts/check-ritual-cue.js
//
// ★CUE_FIRE_RULE — 이 파일의 심장. 기획서 §3-A 전수 판정표를 규칙 하나로 압축한 것이다.
//   판정 기준(§3-A verbatim): "다음 큐를 낼 시점이 **사람을 기다려야** 정해지는가,
//                              아니면 앞 큐가 끝나는 순간 **이미 정해져 있는가**."
//   구현: 큐마다 '이 클립 뒤에 사람 구간(live)이 붙는가'만 적는다.
//         그러면 fire는 계산된다 — 앞 큐에 live가 있으면 manual, 없으면 chain.
//   이 규칙 하나로 담백+덕담 예식이 자동 10 / 수동 10 (§3-A 표와 완전 일치)이 된다.
//   ※ 큐마다 manual/chain을 손으로 적지 말 것. 코스가 5개 · 확장 축이 640조합이라
//     손으로 적으면 반드시 어긋난다. 사람 구간의 유무만이 원천이다.
(function (root, factory) {
  var D;
  if (typeof module !== 'undefined' && module.exports) { D = require('./ritual-data.js'); module.exports = factory(D); }
  else { root.RitualCue = factory(root); }   // 브라우저: ritual-data.js가 bare 전역(ENTRY·COURSES…)으로 이미 올라와 있다
})(typeof self !== 'undefined' ? self : this, function (D) {

  // ── 튜닝 상수 (큐시트·런북 §11-C 이관 · 숫자를 코드 본문에 흩지 않는다)
  var PARAM = {
    spm: 300,              // 낭독 속도(음절/분) — build-dubbing-script.mjs와 같은 값이어야 한다
    gapMs: 2000,           // 클립 간 침묵 1.5~2.5초의 가운데
    duckSpeech: -16,       // 말이 주인공(서약·편지·안내) — 큐시트 -15~-18dB
    duckMusic: -8,         // 음악이 주인공(입장·축배) — 큐시트 -6~-10dB
    duckOff: -90,          // 사실상 무음
    fadeDownMs: 400,       // 더킹 페이드 다운 0.3~0.5초
    fadeUpMs: 1200,        // 더킹 복귀 0.8~1.5초
    declare: { preFadeMs: 8000, silenceMs: 3000, applauseMs: 8000, toLetterMs: 1500 },
    letter: { postSilenceMs: 2000, musicUpMs: 4000 },
    bless: { swellAt: 150, swellTo: -10, swellMs: 8000, longThreshold: 180 },   // 런북 §11-C
    read: { waitClipAt: 5, partnerHandoffAt: 30 },                              // 런북 §11-C
    photo: { afterCloseMs: 30000 },
    goodbye: { outroHoldMs: 90000, outroFadeMs: 20000 },
    previewLiveCap: 10,    // 미리듣기에서 사람 구간을 이 초 이상 끌지 않는다(듣는 사람이 기다릴 이유가 없다)
    previewWaitMs: 1200,   // 뒤처리의 침묵·페이드도 같은 이유로 줄인다(폐식 뒤 30초 대기 등)
    clipDir: '/assets/audio/narration/'
  };

  // ── 51클립 번호 → 파일명 (대본 `더빙_녹음_대본_최종.txt` 순서 그대로 · 인덱스+1 = 번호)
  var FILES = [
    'guest-1-arrival', 'guest-2-10min', 'guest-3-5min', 'guest-4-1min',
    'entry-A', 'entry-B', 'entry-C', 'entry-D', 'entry-E', 'entry-F',
    'narr-welcome-in', 'narr-welcome-out', 'narr-vow-in', 'narr-vow-out', 'narr-ring-in', 'narr-ring-out',
    'narr-valley-wine', 'narr-valley-cake', 'narr-song', 'narr-letter-end', 'narr-declare-family-intro',
    'narr-bless-open', 'narr-bless-mid', 'narr-bless-end', 'narr-bless-end-long', 'narr-close',
    'letter-parent', 'letter-each', 'letter-both',
    'declare-1-solemn', 'declare-2-warm', 'declare-family',
    'declare-ask-a', 'declare-ask-b', 'declare-ask-c',
    // [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
    'ringwarm-family', 'ringwarm-all',
    'tribute-in', 'tribute-out',
    'toast-toast', 'toast-cake', 'toast-both',
    'parents-letter',
    'end-0-photo', 'end-1a-farewell', 'end-1b-farewell-online', 'end-2-goodbye',
    'online-3-welcome', 'bridge-4-wait-emotion', 'bridge-5-wait-setup', 'bridge-6-resume',
    // ★[LEAD_OUT 2026-08-07] 사람의 시간이 스스로 닫는 말. **반드시 목록 끝에 붙인다** —
    //   번호가 인덱스+1이라 중간에 끼우면 기존 51개 파일이 전부 개명된다.
    'narr-entry-out', 'narr-ringwarm-out', 'narr-valley-out',
    'narr-song-out', 'narr-toast-out', 'narr-declare-family-out'
  ];
  var SLUG = {};
  for (var _i = 0; _i < FILES.length; _i++) SLUG[FILES[_i]] = _i + 1;

  // ── 식순 밖 클립 문안 (응답형 W2 · 폐식 후 브릿지 N).
  //   ★EXTRA_MIRROR — 이 문안의 원본은 scripts/build-dubbing-script.mjs다(2026-07-26 확정안 원문).
  //   ritual-data.js에 없는 것들이라 여기 사본을 둔다. scripts/check-ritual-cue.js가 생성기 원문과 전수 대조해
  //   한쪽만 고쳐 콘솔과 녹음 대본이 갈라지는 사고를 막는다. 고칠 땐 생성기 쪽을 먼저 고칠 것.
  var EXTRA = {
    'declare-ask-a': '오늘 예식에는 여러분이 함께 답해 주시는 순서가 한 번 있습니다. 짧은 한마디면 됩니다.',
    'declare-ask-c': '신랑 신부, 이제 두 사람은 부부입니다. 큰 박수로 두 사람을 축하해 주시기 바랍니다.',
    'end-0-photo': '지금부터 단체 사진을 담겠습니다. 스태프가 차례로 안내해 드리니, 편안히 기다려 주시기 바랍니다.',
    'end-1a-farewell': '오늘의 기록이 모두 담겼습니다. 이제 두 사람이 문 앞에서 여러분을 기다립니다. 서두르지 마시고, 나가시는 길에 두 사람과 인사 나눠 주시기 바랍니다. 두고 오신 물건이 없는지 한 번만 살펴 주시면 감사하겠습니다.',
    'end-1b-farewell-online': '오늘의 기록이 모두 담겼습니다. 이제 두 사람이 문 앞에서 여러분을 기다립니다. 서두르지 마시고, 나가시는 길에 두 사람과 인사 나눠 주시기 바랍니다. 두고 오신 물건이 없는지 한 번만 살펴 주시면 감사하겠습니다. 화면으로 함께해 주신 분들께도, 두 사람이 곧 인사드리겠습니다.',
    'end-2-goodbye': '오늘 이 자리를 함께 채워 주셔서 감사합니다. 여러분이 계셔서 두 사람의 처음이 외롭지 않았습니다. 돌아가시는 길, 부디 편안하시기 바랍니다.',
    'online-3-welcome': '화면으로 함께해 주시는 분들께도 인사드립니다. 오늘 이 자리는, 오시지 못한 분들의 자리까지 비워 두지 않으려고 마련했습니다. 같은 시간, 같은 마음으로 오늘을 함께 나눠 주시면 감사하겠습니다.',
    'bridge-4-wait-emotion': '잠시, 이 마음이 지나갈 시간을 함께 기다리겠습니다. 오늘은 서두를 이유가 없습니다.',
    'bridge-5-wait-setup': '잠시 준비할 것이 있어 조금만 기다려 주시기 바랍니다. 편히 앉아 계셔도 좋습니다.',
    'bridge-6-resume': '기다려 주셔서 감사합니다. 이제, 멈춘 자리에서 다시 이어가겠습니다.'
  };

  // ── 유틸
  function syl(s) { return (String(s || '').match(/[가-힣]/g) || []).length; }
  function sylSec(s) { return Math.round((syl(s) / PARAM.spm) * 60); }   // 대본 생성기와 동일 공식
  function pad2(n) { return ('0' + n).slice(-2); }
  function fileOf(slug) { var n = SLUG[slug]; return n ? pad2(n) + '_' + slug : ''; }
  function noOf(slug) { var n = SLUG[slug]; return n ? pad2(n) : ''; }

  // ── S 정규화 — order-preview.html:413 기본값 + COURSE_DEF(코스별 추천)
  var COURSE_DEF = {
    damback: { entry: 'A', declareWho: 'narr', declare: '1', letter: 'parent' },
    gamdong: { entry: 'D', declareWho: 'ask', declare: '1', letter: 'parent' },
    family: { entry: 'E', declareWho: 'family', declare: '1', letter: 'parent' },
    minimal: { entry: 'B', declareWho: 'narr', declare: '1', letter: 'parent' },
    festive: { entry: 'F', declareWho: 'narr', declare: '2', letter: 'parent' }
  };
  function norm(S) {
    var s = {}, k;
    for (k in (S || {})) if (Object.prototype.hasOwnProperty.call(S, k)) s[k] = S[k];
    if (!D.COURSES[s.course]) s.course = 'damback';
    var cd = COURSE_DEF[s.course];
    var def = {
      entry: cd.entry, welcome: 'self', vow: 'ok', ring: 'on', declare: cd.declare, declareWho: cd.declareWho,
      valley: 'none', letter: cd.letter, bless: (s.course === 'family' ? 'on' : 'off'),
      // [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
      ringwarm: 'family', tribute: 'flower', toast: 'toast', song: 'family',
      guestVoice: 'nar', entryVoice: 'nar', blessProxy: false, digital: false, ord: null, extra: {}, tune: {}
    };
    for (k in def) if (s[k] === undefined || s[k] === null) s[k] = def[k];
    if (!D.ENTRY[s.entry]) s.entry = cd.entry;
    if (!D.DECLWHO[s.declareWho]) s.declareWho = cd.declareWho;
    if (!D.LETTER[s.letter]) s.letter = cd.letter;
    if (!s.extra) s.extra = {};
    return s;
  }

  // ── 진행 순서 — order-preview.html의 defaultOrd/ordNow/curSeq를 그대로 옮긴 것(같은 결과여야 한다)
  // [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
  var GADD = { welcome: 1, bless: 1, ringwarm: 1, valley: 1, letter: 1, tribute: 1, toast: 1, song: 1 };
  var RANK = { guest: 0, entry: 10, welcome: 20, bless: 25, vow: 30, ringwarm: 35, ring: 40, declare: 50, letter: 60, tribute: 65, valley: 70, song: 80, toast: 85 };
  function isGAdd(S, k) {
    var c = D.COURSES[S.course];
    return !!GADD[k] && c.seq.indexOf(k) < 0 && !(c.opt || []).some(function (o) { return o.k === k; });
  }
  function isOptK(S, k) {
    return (D.COURSES[S.course].opt || []).some(function (o) { return o.k === k; }) || isGAdd(S, k);
  }
  function defaultOrd(S) {
    var c = D.COURSES[S.course], s = c.seq.slice();
    (c.opt || []).slice().sort(function (a, b) { return a.at - b.at; })
      .forEach(function (o, i) { s.splice(Math.min(o.at + i, s.length), 0, o.k); });
    Object.keys(S.extra || {}).forEach(function (g) {
      if (!S.extra[g] || !isGAdd(S, g) || s.indexOf(g) > -1) return;
      var pos = s.length, gr = (RANK[g] !== undefined ? RANK[g] : 99);
      for (var i = 0; i < s.length; i++) { if ((RANK[s[i]] || 0) > gr) { pos = i; break; } }
      s.splice(pos, 0, g);
    });
    return s;
  }
  function seqOf(S) {
    var def = defaultOrd(S), o = def;
    if (Array.isArray(S.ord)) {
      o = S.ord.filter(function (k) { return def.indexOf(k) > -1; });
      def.forEach(function (k, i) { if (o.indexOf(k) < 0) o.splice(Math.min(i, o.length), 0, k); });
    }
    return o.filter(function (k) { return !isOptK(S, k) || S.extra[k]; });
  }

  // ── 큐 하나 만들기. slug가 있으면 클립, 없으면 텍스트 전용(녹음 대상 아님)
  //
  //   live.self  = 그 자리를 사람이 직접 채운다 (화면 배지 '사람의 시간'의 근거)
  //   live.doing = 무엇을 하는 자리인가 — 'say'(직접 말한다) · 'move'(움직인다·말 없음) · 'sing'(노래)
  //     ★LIVE_DOING — self만 있고 doing이 없으면 화면이 입장·반지 교환 같은 '동작' 자리에까지
  //       "직접 말하는 시간입니다"를 띄운다(2026-07-31 실렌더에서 실제로 그랬다).
  //       고객에게 이 표시를 다는 목적이 '직접 대사하는 곳'을 알려 주는 것이므로 그건 의도를 뒤집는다.
  //       그래서 self가 있으면 doing은 필수다. check-ritual-cue.js가 전 조합에서 강제한다.
  function cue(o) {
    var c = {
      slug: o.slug || '', no: o.slug ? noOf(o.slug) : '', file: o.slug ? fileOf(o.slug) : '',
      name: o.name, text: o.text || '', est: o.est || sylSec(o.text),
      duck: (o.duck === undefined ? PARAM.duckSpeech : o.duck),
      live: o.live || null, post: o.post || [], hint: o.hint || '',
      k: o.k || '', blockN: o.blockN || '', pick: o.pick || '', own: !!o.own,
      fire: o.fire || '', atMin: (o.atMin === undefined ? null : o.atMin),
      note: o.note || '', alt: null
    };
    if (c.live && c.live.duck === undefined) c.live.duck = c.duck;
    if (c.live && !c.live.est) c.live.est = 30;
    // ★ALT_CLIP — 같은 자리에 문안이 둘인 큐. 어느 쪽이 나갈지는 앞 사람 구간이 얼마나 길었는지로 갈린다.
    //   디렉터가 고르는 것이 아니다 — 절단을 결정한 사람에게 문안 선택까지 시키면 그 1초가 사고가 된다.
    //   콘솔이 live 시작 시각을 재고 overSec을 넘겼으면 alt로 바꿔 발사한다(런북 §8 4단).
    if (o.alt) {
      c.alt = {
        overSec: o.alt.overSec, why: o.alt.why || '',
        slug: o.alt.slug, no: noOf(o.alt.slug), file: fileOf(o.alt.slug),
        name: o.alt.name || c.name, text: o.alt.text || '',
        est: o.alt.est || sylSec(o.alt.text)
      };
    }
    return c;
  }

  // ── 블록별 큐 생성. 각 함수는 큐 배열(또는 [])을 낸다.
  //   ★live를 붙이는 자리가 곧 '수동 버튼이 생기는 자리'다(CUE_FIRE_RULE). 신중하게.
  var BUILD = {

    // 식전 하객 맞이 — 01은 문 열림(수동) · 02~04는 시각 고정(자동)
    guest: function (S) {
      var vi = (S.guestVoice === 'couple') ? 2 : 1;   // GUEST[i] = [라벨, 나레이션, 두분목소리]
      var own = S.guestVoice === 'couple';
      var at = [null, -10, -5, -1], out = [];
      for (var i = 0; i < 4; i++) {
        out.push(cue({
          k: 'guest', blockN: '하객 맞이', slug: FILES[i], name: '하객 맞이 · ' + D.GUEST[i][0],
          text: D.GUEST[i][vi], own: own, duck: PARAM.duckSpeech,
          fire: i === 0 ? 'manual' : 'clock', atMin: at[i],
          hint: i === 0 ? '문이 열리고 하객이 들어오기 시작하면' : '',
          note: i === 0 ? '입장 시간 동안 5~7분 간격으로 반복 재생(반복은 콘솔이 자동)' :
            i === 3 ? '★앞 2문장이 안내 음성 사전 고지다(AI고지_G1-4) · 줄이지 말 것' : '',
          pick: own ? '두 분 목소리로 녹음' : ''
        }));
      }
      return out;
    },

    // [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.

    entry: function (S) {
      var e = D.ENTRY[S.entry], own = S.entryVoice === 'couple';
      return [cue({
        k: 'entry', blockN: '신랑·신부 입장', slug: 'entry-' + S.entry, name: '신랑·신부 입장',
        text: own ? e.self : e.nar, own: own, duck: -12,
        fire: 'manual', hint: '신부 준비 완료 · 문 앞 대기 확인 후',
        pick: '입장 멘트 ' + e.d + (own ? ' · 두 분 목소리' : ''),
        post: [{ music: 'to', v: 0, ms: 600 }],   // "입장!" 뒤 입장곡을 풀로 — 음악이 주인공
        // ★안전 규칙 2(§3-A) — 입장 걷는 시간(실측 1분 42초)은 타이머 자동 금지. 다음 큐는 반드시 사람이 낸다.
        live: { t: '문 열림 · 두 분이 손잡고 입장 · 중앙까지 걸어옴', est: 102, duck: 0, self: true, doing: 'move' }
      }), cue({
        k: 'entry', blockN: '신랑·신부 입장', slug: 'narr-entry-out', name: '입장 마무리',
        text: D.NARR.entryOut, duck: -12
      })];
    },

    welcome: function (S) {
      var n = D.NARR.welcome;
      return [
        cue({
          k: 'welcome', blockN: '환영·첫인사', slug: 'narr-welcome-in', name: '환영·첫인사 시작', text: n.nar,
          hint: '두 분이 중앙에서 하객 쪽으로 돌아서면 · 속으로 셋을 세고',
          live: { t: '두 분이 직접 인사 (디렉터가 핸드마이크 전달)', est: 46, self: true, doing: 'say', fallback: '말이 막히면 미리 받아 둔 인사말 카드를 건넴' }
        }),
        cue({
          k: 'welcome', blockN: '환영·첫인사', slug: 'narr-welcome-out', name: '환영·첫인사 마무리', text: n.end,
          hint: '인사가 끝나면 (46초·30초·80초 다 가능)'
        })
      ];
    },

    vow: function (S) {
      var n = D.NARR.vow;
      return [
        cue({
          k: 'vow', blockN: '혼인 서약', slug: 'narr-vow-in', name: '혼인 서약 시작', text: n.nar,
          live: {
            // ★[VOW_CHORUS 2026-08-04] 지문을 '각자 낭독'에서 '번갈아 → 마지막은 함께'로 바꿨다.
            //   ★이 문자열은 ritual-story.js 의 LIVE 키와 CAST_AT 의 'live:' 키이기도 하다.
            //     한 글자만 달라도 장면 안내와 배역 예시가 조용히 끊긴다 — 셋을 같은 커밋에서 고친다.
            //   both 는 함께 읽는 그 한 문장이다. 말만 하고 문장을 안 보여 주면 고객이 뭘 준비해야
            //   할지 모른다 — 화면이 소리를 설명하지 못하면 폴백이 조용했던 때와 같은 사고다.
            t: '두 분이 한 줄씩 번갈아 낭독 · 마지막 한 문장은 함께', est: 70, self: true, doing: 'say', peak: true,
            both: D.VOWBOTH,
            waitClipAt: PARAM.read.waitClipAt, handoffAt: PARAM.read.partnerHandoffAt,
            fallback: '멈추면 5초 뒤 [대기 클립] · 30초 넘으면 서약문을 배우자에게 건네 이어 읽기 · 마지막 합창이 어긋나면 신부가 반 박자 먼저'
          }
        }),
        cue({
          k: 'vow', blockN: '혼인 서약', slug: 'narr-vow-out', name: '혼인 서약 마무리', text: n.end,
          hint: '낭독이 끝나고 2초 (55초일 수도 75초일 수도 있다 · 오늘 처음 아는 숫자)'
        })
      ];
    },

    ringwarm: function (S) {
      var r = D.RINGWARM[S.ringwarm] || D.RINGWARM.family;
      return [cue({
        k: 'ringwarm', blockN: '링 워밍', slug: 'ringwarm-' + S.ringwarm, name: '링 워밍', text: r.nar,
        pick: r.d,
        live: { t: '반지 주머니가 손에서 손으로 · 마지막 분이 디렉터에게', est: (S.ringwarm === 'all' ? 240 : 120), self: true, doing: 'move', note: '지연 원인 1위 — 음악을 버퍼로 깔아 둔다' }
      }), cue({
        k: 'ringwarm', blockN: '링 워밍', slug: 'narr-ringwarm-out', name: '링 워밍 마무리',
        text: D.NARR.ringwarmOut
      })];
    },

    ring: function (S) {
      if (S.ring !== 'on') return [];
      var n = D.NARR.ring;
      return [
        cue({
          k: 'ring', blockN: '반지 교환', slug: 'narr-ring-in', name: '반지 교환 시작', text: n.nar,
          live: { t: '신랑 먼저, 신부 다음으로 반지 끼우기', est: 30, self: true, doing: 'move' }
        }),
        cue({
          k: 'ring', blockN: '반지 교환', slug: 'narr-ring-out', name: '반지 교환 마무리', text: n.end,
          hint: '두 사람 모두 반지를 낀 것을 확인하면'
        })
      ];
    },

    // 성혼 선언 — 택1 4종. 나레이션만 사람 구간이 없어 앞뒤가 통째로 자동이 된다.
    declare: function (S) {
      var w = S.declareWho;
      if (w === 'family') {
        return [cue({
          k: 'declare', blockN: '성혼 선언', slug: 'narr-declare-family-intro', name: '성혼 선언 · 가족 낭독 도입',
          text: D.NARR.declareFamilyIntro, pick: '가족이 낭독',
          note: '가족이 부담스러워하면 [대기 클립] 대신 ' + noOf('declare-family') + '번(가족 낭독 폴백)을 큐 목록에서 즉시 재생',
          live: { t: '가족 대표가 큰 글씨 선언문 낭독 (디렉터가 마이크·인쇄물 전달)', est: 45, self: true, doing: 'say', fallback: noOf('declare-family') + '번 폴백 클립' }
        }), cue({
          k: 'declare', blockN: '성혼 선언', slug: 'narr-declare-family-out', name: '성혼 선언 · 가족 낭독 마무리',
          text: D.NARR.declareFamilyOut
        })];
      }
      if (w === 'ask') {
        return [
          cue({
            k: 'declare', blockN: '성혼 선언', slug: 'declare-ask-b', name: '성혼 선언 · 하객께 질문',
            text: D.DECLWHO.ask.nar, pick: '하객이 함께 답하기',
            note: '"네, 그러겠습니다" 시연 문장 삭제 금지 — 없으면 답이 갈린다',
            live: { t: '하객 전원 "네, 그러겠습니다"', est: 6, self: true, doing: 'say' }
          }),
          cue({
            k: 'declare', blockN: '성혼 선언', slug: 'declare-ask-c', name: '성혼 선언 · 선언과 박수',
            text: EXTRA['declare-ask-c'], duck: PARAM.duckOff,
            hint: '하객 답이 잦아들면',
            post: [{ music: 'to', v: PARAM.duckMusic, ms: 0 }, { wait: PARAM.declare.applauseMs }]
          })
        ];
      }
      if (w === 'chorus') {
        return [cue({
          k: 'declare', blockN: '성혼 선언', slug: '', name: '성혼 선언 · 하객 합송', text: D.DECLWHO.chorus.nar,
          pick: '하객이 다 함께 · 합송', note: '★합송은 보류라 녹음된 클립이 없다 — 텍스트 카드로만 진행된다',
          live: { t: '하객 전원이 인쇄된 선언문을 함께 낭독', est: 25, self: true, doing: 'say' }
        })];
      }
      var dv = D.DECLARE[S.declare] || D.DECLARE['1'];
      return [cue({
        k: 'declare', blockN: '성혼 선언', slug: (S.declare === '2' ? 'declare-2-warm' : 'declare-1-solemn'),
        name: '성혼 선언', text: dv.nar, duck: PARAM.duckOff, pick: '나레이션 · ' + dv.d,
        note: '선언문 "신랑 신부, 이제 두 사람은 부부입니다" 앞 0.5초·뒤 1초 무음은 클립 안에 들어 있다',
        post: [{ music: 'to', v: PARAM.duckMusic, ms: 0 }, { wait: PARAM.declare.applauseMs }, { music: 'to', v: PARAM.duckOff, ms: PARAM.declare.toLetterMs }]
      })];
    },

    valley: function (S) {
      if (S.valley !== 'wine' && S.valley !== 'cake') return [];
      var wine = S.valley === 'wine';
      return [cue({
        k: 'valley', blockN: wine ? '와인 세리머니' : '케이크 커팅',
        slug: wine ? 'narr-valley-wine' : 'narr-valley-cake', name: wine ? '와인 세리머니' : '케이크 커팅',
        text: wine ? D.NARR.valleyWine : D.NARR.valleyCake, duck: -12, pick: wine ? '와인' : '케이크',
        live: { t: wine ? '두 잔을 하나에 붓고 한 모금' : '함께 나이프 잡고 커팅 · 포즈', est: 30, self: true, doing: 'move' }
      }), cue({
        k: 'valley', blockN: wine ? '와인 세리머니' : '케이크 커팅',
        slug: 'narr-valley-out', name: (wine ? '와인 세리머니' : '케이크 커팅') + ' 마무리',
        text: D.NARR.valleyOut, duck: -12
      })];
    },

    song: function (S) {
      return [cue({
        k: 'song', blockN: '축가', slug: 'narr-song', name: '축가 도입', text: D.NARR.song, duck: PARAM.duckMusic,
        pick: S.song === 'live' ? '어쿠스틱 라이브' : '가족·지인이 직접',
        live: { t: '축가 1곡', est: 210, duck: PARAM.duckOff, self: true, doing: 'sing', note: 'BGM은 완전히 끈다' }
      }), cue({
        k: 'song', blockN: '축가', slug: 'narr-song-out', name: '축가 마무리',
        text: D.NARR.songOut, duck: PARAM.duckMusic
      })];
    },

    toast: function (S) {
      var t = D.TOAST[S.toast] || D.TOAST.toast;
      return [cue({
        k: 'toast', blockN: '축배 · 케이크', slug: 'toast-' + S.toast, name: '축배 · 케이크', text: t.nar,
        duck: PARAM.duckMusic, pick: t.d, note: '축배 뒤 무음은 4~5초로 길게(온도 낙차)',
        live: { t: t.cue, est: 45, duck: 0, self: true, doing: 'move' }
      }), cue({
        k: 'toast', blockN: '축배 · 케이크', slug: 'narr-toast-out', name: '축배 · 케이크 마무리',
        text: D.NARR.toastOut, duck: PARAM.duckMusic
      })];
    },

    letter: function (S) {
      var l = D.LETTER[S.letter] || D.LETTER.parent;
      return [
        cue({
          k: 'letter', blockN: '편지 낭독', slug: 'letter-' + S.letter, name: '편지 낭독 시작', text: l.nar,
          duck: PARAM.duckOff, pick: l.d,
          note: '이 구간은 애초에 무음이라 더킹 홀드 버튼이 필요 없다(§3-A)',
          live: {
            t: '두 분이 직접 편지 낭독', est: 165, self: true, doing: 'say', peak: true,
            waitClipAt: PARAM.read.waitClipAt, handoffAt: PARAM.read.partnerHandoffAt, duck: PARAM.duckOff,
            fallback: '멈추면 5초 뒤 [대기 클립] · 30초 넘으면 배우자가 이어 읽기 · 그다음 디렉터 대독'
          }
        }),
        cue({
          k: 'letter', blockN: '편지 낭독', slug: 'narr-letter-end', name: '편지 낭독 마무리', text: D.NARR.letterEnd,
          duck: PARAM.duckOff, hint: '낭독이 끝나고 (오열이 있으면 잦아들 때까지 기다린다)',
          post: [{ wait: PARAM.letter.postSilenceMs }, { music: 'to', v: PARAM.duckSpeech, ms: PARAM.letter.musicUpMs }]
        })
      ];
    },

    tribute: function (S) {
      var m = D.TRIBUTE.modes[S.tribute] || D.TRIBUTE.modes.flower;
      return [
        cue({
          k: 'tribute', blockN: '부모님 헌정', slug: 'tribute-in', name: '부모님 헌정 시작', text: D.TRIBUTE.nar,
          pick: m.d, live: { t: m.cue, est: 70, self: true, doing: 'move' }
        }),
        cue({
          k: 'tribute', blockN: '부모님 헌정', slug: 'tribute-out', name: '부모님 헌정 마무리', text: D.TRIBUTE.end,
          hint: '두 분이 자리로 돌아오면'
        })
      ];
    },

    bless: function (S) {
      if (S.bless !== 'on') return [];
      var famOpen = (S.course === 'family');
      return [
        cue({
          k: 'bless', blockN: '부모님 덕담',
          slug: famOpen ? 'narr-bless-open' : 'narr-bless-mid', name: '부모님 덕담 시작',
          text: famOpen ? D.NARR.blessOpenFamily : D.NARR.blessMid,
          pick: S.blessProxy ? '나레이션이 대독' : (famOpen ? '예식의 문을 여는 자리' : '편지 뒤 자리'),
          live: {
            t: S.blessProxy ? '나레이션이 미리 받은 말씀을 대독' : '부모님 말씀 (디렉터가 마이크 전달)',
            est: 100, self: !S.blessProxy, doing: 'say',
            swellAt: PARAM.bless.swellAt, swellTo: PARAM.bless.swellTo, swellMs: PARAM.bless.swellMs,
            longThreshold: PARAM.bless.longThreshold,
            fallback: '2:30에 BGM이 자동으로 부풀어 신호 · 3:00 넘으면 디렉터가 한 문장으로 받아 끊는다'
          }
        }),
        cue({
          k: 'bless', blockN: '부모님 덕담', slug: 'narr-bless-end', name: '부모님 덕담 마무리', text: D.NARR.blessEnd,
          hint: '말씀이 끝나면 · 또는 3분을 넘어 절단하기로 판단하면',
          // 3분을 넘겼으면 '끝난 뒤 하는 말'로는 헐겁다 — 끊고 들어온 자리를 덮는 문안으로 자동 교체.
          alt: {
            overSec: PARAM.bless.longThreshold, slug: 'narr-bless-end-long',
            name: '부모님 덕담 마무리 (길었을 때)', text: D.NARR.blessEndLong,
            why: '덕담이 3분을 넘겨 디렉터가 받아 끊었다'
          }
        })
      ];
    }
  };

  // ── 본체
  function build(S0, opts) {
    opts = opts || {};
    var mode = opts.mode === 'preview' ? 'preview' : 'console';
    var S = norm(S0);
    var seq = seqOf(S);
    var cues = [];

    seq.forEach(function (k) {
      if (!BUILD[k]) return;
      var got = BUILD[k](S) || [];
      for (var i = 0; i < got.length; i++) cues.push(got[i]);
      // 하객 맞이 뒤에는 식전 고정 클립 2개가 붙는다(코스와 무관)
      if (k === 'guest') {
        if (S.digital) cues.push(cue({
          k: 'guest', blockN: '식전 안내', slug: 'online-3-welcome', name: '온라인 참석자 환영',
          text: EXTRA['online-3-welcome'], note: 'Couples 시트 digitalAttendance = Y인 날만'
        }));
        if (S.declareWho === 'ask') cues.push(cue({
          k: 'guest', blockN: '식전 안내', slug: 'declare-ask-a', name: '응답형 예고 (개식 직후)',
          text: EXTRA['declare-ask-a'],
          note: '응답형을 고른 예식에만 붙는다 · 성혼 선언 자리가 아니라 여기서 한 번 예고한다'
        }));
      }
    });

    // 폐식 — 목록 밖 고정
    cues.push(cue({
      k: '_close', blockN: '폐식·단체촬영', slug: 'narr-close', name: '폐식 · 단체촬영 전환', text: D.NARR.close,
      duck: -12, note: '예식의 마지막 소리 · 가장 느리게',
      post: [{ music: 'to', v: PARAM.duckMusic, ms: 2000 }, { wait: PARAM.photo.afterCloseMs }]
    }));

    if (mode === 'console') {
      // 후반부(단체촬영·배웅) — 미리듣기에는 넣지 않는다. 고객이 들을 대상이 아니라 디렉터 진행이다.
      cues.push(cue({
        k: '_photo', blockN: '단체촬영', slug: 'end-0-photo', name: '단체촬영 개시', text: EXTRA['end-0-photo'], duck: -14,
        live: { t: '단체 사진 촬영 (스태프가 차례로 안내)', est: 420 }
      }));
      cues.push(cue({
        k: '_farewell', blockN: '배웅', slug: S.digital ? 'end-1b-farewell-online' : 'end-1a-farewell',
        name: '촬영 종료 · 배웅 전환', text: EXTRA[S.digital ? 'end-1b-farewell-online' : 'end-1a-farewell'], duck: -14,
        hint: '단체촬영이 끝나면',
        live: { t: '하객 배웅 · 문 앞에서 인사', est: 480 }
      }));
      cues.push(cue({
        k: '_goodbye', blockN: '배웅', slug: 'end-2-goodbye', name: '배웅 마무리 · 귀가 인사', text: EXTRA['end-2-goodbye'], duck: -14,
        hint: '하객 대부분이 나가시면',
        note: '하객이 듣는 마지막 소리',
        post: [{ wait: PARAM.goodbye.outroHoldMs }, { music: 'to', v: PARAM.duckOff, ms: PARAM.goodbye.outroFadeMs }]
      }));
    }

    // ★CUE_FIRE_RULE 적용 — 앞 큐에 사람 구간이 있으면 수동, 없으면 자동 체인.
    //   ①fire를 이미 직접 정한 큐(01 문 열림 · 02~04 시각)는 건드리지 않는다
    //   ②체인은 다음 '수동 지점'에서 반드시 멈춘다 = 러너가 fire!=='chain'을 보면 정지(안전 규칙 1)
    for (var i = 0; i < cues.length; i++) {
      var c = cues[i], prev = cues[i - 1];
      if (!c.fire) c.fire = (i === 0 || (prev && prev.live)) ? 'manual' : 'chain';
      if (c.fire === 'manual' && !c.hint && prev && prev.live) c.hint = prev.live.t + ' 후';
      c.idx = i;
    }

    // 반지 교환 마무리 → 성혼 선언 사이는 '음악 페이드 8초 + 침묵 3초'가 시간 고정이다(§3-A · 대본 153~159행).
    // 선언이 실제로 이 예식에 있고 바로 뒤에 붙을 때만 얹는다.
    for (var j = 0; j < cues.length - 1; j++) {
      if (cues[j].slug === 'narr-ring-out' && cues[j + 1].k === 'declare' && cues[j + 1].fire === 'chain') {
        cues[j].post = [{ music: 'to', v: PARAM.duckOff, ms: PARAM.declare.preFadeMs }, { wait: PARAM.declare.silenceMs }];
      }
    }

    if (mode === 'preview') {
      // 미리듣기: 전부 자동. 사람 구간은 '이런 순간이 여기 있다'만 알면 되므로 짧게 줄인다.
      for (var m = 0; m < cues.length; m++) {
        cues[m].manualInConsole = (cues[m].fire === 'manual');
        cues[m].fire = 'chain';
        if (cues[m].live) { cues[m].live.fullEst = cues[m].live.est; cues[m].live.est = Math.min(cues[m].live.est, PARAM.previewLiveCap); }
        // 침묵·페이드도 같이 줄인다. 안 줄이면 폐식 뒤 30초 대기 같은 자리에서 듣는 사람이 앱을 닫는다.
        (cues[m].post || []).forEach(function (st) {
          if (st.wait) { st.fullWait = st.wait; st.wait = Math.min(st.wait, PARAM.previewWaitMs); }
          if (st.ms) { st.fullMs = st.ms; st.ms = Math.min(st.ms, PARAM.previewWaitMs); }
        });
      }
      if (cues[0]) cues[0].fire = 'manual';   // 첫 재생만 사람이 시작(브라우저 자동재생 정책)
    }

    return { cues: cues, S: S, seq: seq, mode: mode, meta: meta(cues, S, mode) };
  }

  function meta(cues, S, mode) {
    var manual = 0, chain = 0, clock = 0, clipSec = 0, liveSec = 0, missing = 0;
    cues.forEach(function (c) {
      if (c.fire === 'manual') manual++; else if (c.fire === 'clock') clock++; else chain++;
      clipSec += c.est; if (c.live) liveSec += c.live.est;
      if (!c.slug) missing++;
    });
    var c0 = D.COURSES[S.course];
    return {
      course: S.course, courseNm: c0.nm, mode: mode,
      total: cues.length, manual: manual, chain: chain, clock: clock,
      clipSec: clipSec, liveSec: liveSec, totalSec: clipSec + liveSec + cues.length * (PARAM.gapMs / 1000),
      noClip: missing, minLabel: c0.min
    };
  }

  return {
    build: build, norm: norm, seqOf: seqOf, PARAM: PARAM, FILES: FILES, EXTRA: EXTRA,
    COURSE_DEF: COURSE_DEF, sylSec: sylSec, fileOf: fileOf, noOf: noOf, version: 'cue-v1'
  };
});
