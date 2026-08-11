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
//   이 규칙 하나로 「약속」(damback) 코스가 §3-A 표와 완전 일치한다.
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
    /* [GATHER_WAIT 2026-08-08] photo.afterCloseMs(30초 타이머) 삭제 — 폐식 뒤 사람이 모이는
       시간을 live 로 옮겼다. 타이머로 다음 큐를 자동으로 밀던 자리라, 남겨 두면 다음 사람이
       "왜 안 쓰지" 하고 되살린다. 되살리지 말 것. */
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
    'narr-song-out', 'narr-toast-out', 'narr-declare-family-out',
    // ★[FREE_SLOT 2026-08-07] 자유 한 칸 — 무엇이 들어오든 담기게 **지목하지 않는** 두 줄
    'narr-free-in', 'narr-free-out',
    /* ★[AFTER_PARTY 2026-08-08] 예식 뒤 30분 — 전환 6 + 골라 트는 판 10.
       ★반드시 목록 **끝**에 붙였다. 번호가 인덱스+1이라 중간에 끼우면 기존 음원이 전부 개명된다.
       앞 6개는 순서 고정(큐 체인) · 뒤 10개는 디렉터가 골라 트는 판(D.PHOTOCUE) */
    'narr-photo-split', 'narr-round-open', 'narr-online-in', 'narr-final-warn', 'narr-final-call', 'narr-photo-out',
    'call-family-all', 'call-parents',
    'fx-seatrow', 'fx-vshape', 'fx-clink', 'fx-wave', 'fx-surround', 'fx-lean', 'fx-clap', 'fx-selfie',
    /* ★[TOAST_SCENE 2026-08-09] 축배·케이크를 장면으로 나누며 늘어난 두 자리.
       ★반드시 목록 **끝**이다 — 번호가 인덱스+1이라 중간에 끼우면 기존 74개가 전부 개명된다.
       toast-both-b : 나이프를 걷고 잔을 쥐여 드리는 사이를 덮는 두 번째 문안
       narr-cake-out: 케이크만 고른 자리의 마무리(잔 이야기가 나가던 자리) */
    'toast-both-b', 'narr-cake-out',
    /* [PHOTO_COUNT 2026-08-09] 단체촬영 셔터 신호 — 목록 **끝**(번호 = 인덱스+1). */
    'fx-count',
    /* ★[ENTRY_OUT_TONE 2026-08-11] 도착 직후 멘트를 입장 느낌 B~F 로 나누며 늘어난 다섯.
       ★★여기가 **진짜 끝**이다. 처음엔 'narr-cake-out' 옆에 끼웠다가 실제로 당했다 —
         그 뒤에 있던 fx-count 가 78 → 83 으로 밀렸고, 이미 녹음된 78_fx-count.mp3 가
         제 번호를 잃었다. 그리고 새 클립 B 가 78 을 가져가 **한 번호에 두 소리**가 됐다.
         이 파일이 위에서 두 번이나 경고하는 바로 그 사고를 내가 그대로 냈다(2026-08-11 실측).
       ★다음에 늘릴 때도 「비슷한 것 옆」이 아니라 **파일 맨 끝**에 붙일 것.
         옆에 두면 읽기 좋지만, 읽기 좋으라고 번호를 밀면 이미 녹음된 소리가 이름을 잃는다.
       A 는 늘리지 않는다 — 종전 문안 그대로라 52_narr-entry-out.mp3 를 그대로 쓴다. */
    'narr-entry-out-B', 'narr-entry-out-C', 'narr-entry-out-D', 'narr-entry-out-E', 'narr-entry-out-F'
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
    /* ★[ROUND_SCENE 2026-08-09] "모두 모이셨습니다"는 **모이는 중에 나가는 단정**이었다.
       25명이 앞으로 나오는 데 1분쯤 걸리는데, 그 말이 먼저 나가면 아직 걷고 있는 사람이
       "나 때문에 늦나" 하고 서두른다. 다 모였다고 말하지 말고, 무엇을 하면 되는지만 말한다.
       ★자세 다듬기(앞줄 앉기·어깨 돌리기)는 디렉터의 골라 트는 판(D.PHOTOCUE.fx)이 맡는다 —
         여기서 겹쳐 말하면 같은 지시가 두 번 나간다. 여는 말은 열기만 하고 넘긴다.
       ★"신호를 드립니다"가 78 fx-count(「찍겠습니다. 하나, 둘, 셋.」)로 이어진다. */
    'end-0-photo': '이제 다 함께 한 장 남기겠습니다. 두 분을 가운데 두고 편하게 서 주세요. 자리를 잡으시면 제가 신호를 드립니다.',
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
    festive: { entry: 'F', declareWho: 'narr', declare: '2', letter: 'parent' },
    /* ★[RECORD_COURSE] 기록형 기본값.
       entry 'F'(이야기의 시작) — 행진이 아니라 "지금부터 시작된다"는 말이라 걸어오는 동선과 맞는다.
       declareWho 'ask'(하객이 함께) — ★주례도 권위자도 없는 게 이 코스의 핵심이고, 동시에
         격식 축을 지키는 최소 형식이다. 선언을 빼면 "화보만 찍었다"가 된다. */
    record: { entry: 'F', declareWho: 'ask', declare: '1', letter: 'parent', ring: 'off' }
  };
  function norm(S) {
    var s = {}, k;
    for (k in (S || {})) if (Object.prototype.hasOwnProperty.call(S, k)) s[k] = S[k];
    if (!D.COURSES[s.course]) s.course = 'damback';
    var cd = COURSE_DEF[s.course];
    var def = {
      /* ★[RING_OPT 2026-08-07] 반지 교환 기본값은 코스가 정한다 — 하드코딩 'on' 이었다.
         사용자 결정: "반지교환은 희망하면 추가할수있도록만 하자"(기록형 한정).
         ★seq 에서 빼지 않고 기본값만 끄는 이유 — 켰을 때 제자리(선언 앞)로 돌아와야 한다.
           seq 에서 빼면 켜는 길이 사라진다(ring 은 GADD 팔레트에 없다 · 137행). */
      entry: cd.entry, welcome: 'self', vow: 'ok', ring: (cd.ring || 'on'), declare: cd.declare, declareWho: cd.declareWho,
      valley: 'none', letter: cd.letter, bless: (s.course === 'family' ? 'on' : 'off'),
      // [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
      ringwarm: 'family', tribute: 'flower', toast: 'toast', song: 'family',
      guestVoice: 'nar', entryVoice: 'nar', blessProxy: false, digital: false, ord: null, extra: {}, tune: {}, off: {}
    };
    for (k in def) if (s[k] === undefined || s[k] === null) s[k] = def[k];
    if (!D.ENTRY[s.entry]) s.entry = cd.entry;
    if (!D.DECLWHO[s.declareWho]) s.declareWho = cd.declareWho;
    if (!D.LETTER[s.letter]) s.letter = cd.letter;
    if (!s.extra) s.extra = {};
    /* ★[ALL_OPTIONAL 2026-08-07] 코스의 순서는 '추천 조합'이지 '못 빼는 목록'이 아니다.
       사용자 결정(6코스 전부): "전부 선택사항으로전환 한다 입장부분만 고정".
       ★뜻은 '전부 꺼짐'이 아니라 '전부 끌 수 있음'이다 — 코스를 고르면 그 코스의 추천 조합이
         이미 켜져 있고(= seq), 고객은 아무것도 안 해도 완성된 식순을 받는다. off 는 뺀 것만 담는다.
       ★고정은 입장 하나뿐. 예식이 시작됐다는 신호가 없으면 나머지가 전부 공중에 뜬다.
         (성혼 선언도 뺄 수 있게 열었다 — 같은 날 사용자 결정. 대신 아래 warn 이 소리 내어 알린다.) */
    if (!s.off || typeof s.off !== 'object') s.off = {};
    else { var _o = {}; for (k in s.off) if (s.off[k]) _o[k] = 1; s.off = _o; }
    delete s.off.entry;   // ★입장은 끌 수 없다 — 목록을 늘리지 말 것(늘리면 '전부 선택'이 거짓말이 된다)
    /* ★[PEAK_ONE 2026-08-07] 정점은 하나다 — 편지를 넣으면 서약을 끈다(peakOne 코스 한정).
       왜 코스 정의가 아니라 여기인가: seq/opt 만으로는 "둘 중 하나"를 표현할 수 없다.
       둘 다 켜진 조합이 만들어지는 순간 **말하는 자리가 2개**가 되고, 그때 디렉터는
       카메라를 놓아야 한다(끝을 사람이 재야 하는 자리라서). 그러면 이 코스가 성립하지 않는다.
       ★고르는 것은 고객이다 — 편지를 **더한** 쪽을 정점으로 본다(기본은 서약). */
    if (D.COURSES[s.course].peakOne && s.extra.letter) s.vow = 'off';
    return s;
  }

  // ── 진행 순서 — order-preview.html의 defaultOrd/ordNow/curSeq를 그대로 옮긴 것(같은 결과여야 한다)
  // [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
  /* ★★[RINGWARM_RETIRED 2026-08-07] 링 워밍 폐지 — 사용자 지시 *"링워밍은 유치하고 별로인거같아 제거하자"*.
     되살리지 말 것. 이후 리뷰·리팩터링이 '빠진 순간 복원' 후보로 다루더라도 복원 금지.
     ★클립(ringwarm-family · ringwarm-all · narr-ringwarm-out)과 빌더는 **남겨 둔다**:
       ①FILES 번호가 인덱스+1이라 중간에서 빼면 그 뒤 파일이 전부 개명된다(기존 음원이 어긋난다)
       ②지우면 FILES·판정표·대본 생성기까지 연쇄로 밀린다
     팔레트(GADD)에서만 뺐다 — 그래서 **새로 넣을 길이 없다**. 그게 폐지의 실체다.
     ★부작용을 정직하게 적어 둔다: GADD 에서 빠지면 isGAdd 가 false 가 되어,
       **이미 S.extra.ringwarm 을 저장해 둔 초안에서도 이 순간이 사라진다.**
       실측으로 확인했다(옛 초안 흉내 → 0큐). 폐지 지시의 당연한 귀결이지만,
       그 고객이 있다면 화면이 조용히 달라지는 것이므로 사람이 알고 있어야 한다. */
  /* ★[RETIRED_SLUG 2026-08-08] FILES 에는 있지만 **녹음하지 않는** 슬러그.
     번호가 인덱스+1이라 폐지해도 목록에서 뺄 수 없다(빼면 뒤가 전부 개명된다).
     그래서 자리는 남기고 여기 표시한다 — 안 하면 녹음 대기 목록이
     "소리가 없으니 녹음하라"고 하고, 폐지한 것을 다시 녹음하게 된다(실제로 한 번 그렇게 나왔다).
     ★되살리려면 여기서 빼는 것만으로는 안 된다. GADD 부터 되돌려야 하고 그건 사용자 지시에 반한다. */
  var RETIRED = { 'narr-ringwarm-out': 1, 'ringwarm-family': 1, 'ringwarm-all': 1,
    /* [SONG_RETIRED 2026-08-09] 축가 팔레트 폐지 — 자리는 남기고 '녹음 안 함'으로 표시한다.
       ★이미 녹음된 mp3 는 지우지 않는다. 지우면 번호가 밀리고, 되살릴 일이 생겼을 때
         다시 녹음해야 한다. 폐지의 실체는 '새로 넣을 길이 없다'는 것이지 파일 삭제가 아니다. */
    'narr-song': 1, 'narr-song-out': 1 };

  /*
   ★[SONG_RETIRED 2026-08-09 사용자 지시 *"팔레트 빼자"*] 축가를 팔레트에서도 뺐다.
      2026-08-07 에 기본 선택지에서 내리고(TRIM_EVENTS) 팔레트에는 남겨 뒀는데, 그 자리마저 닫는다.
      근거는 그때 잰 그대로다 — 실측 210초로 **사람이 서 있는 시간 1위**인데 도입 7초·닫는 말 없음.
      예식 전체에서 준비 부담 대비 화면에 남는 것이 가장 적은 자리였다.
      ★없애는 것이 아니라 **옮기는 것**이다 — 노래하고 싶은 두 분은 「자유 한 칸(free)」에 넣는다.
        그 칸은 애초에 '두 사람이 따로 준비한 것'을 위해 만든 자리다.
      ★되살리지 말 것(제거 지시 보존 규칙) — 리뷰가 '유실된 기능'으로 보고 복원하기 쉬운 모양이다.
        큐 함수·문안·클립(narr-song · narr-song-out)은 **그대로 둔다**: 번호가 인덱스+1이라
        지우면 뒤 클립이 전부 개명된다. 팔레트에서만 닫힌 상태가 정상이다.
   */
  var GADD = { welcome: 1, bless: 1, valley: 1, letter: 1, tribute: 1, toast: 1, free: 1 };   // [RINGWARM_RETIRED] ringwarm 제거 · [SONG_RETIRED] song 제거
  var RANK = { guest: 0, entry: 10, welcome: 20, bless: 25, vow: 30, ringwarm: 35, ring: 40, declare: 50, letter: 60, tribute: 65, valley: 70, free: 75, song: 80, toast: 85 };
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
    // [ALL_OPTIONAL] 고객이 뺀 것을 걷어낸다 — 순서 자체는 그대로라 다시 켜면 제자리로 돌아온다.
    return o.filter(function (k) { return (!isOptK(S, k) || S.extra[k]) && !S.off[k]; });
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
        /* ★[RECORD_COURSE] 기록형은 행진하지 않는다 — 문·통로가 아니라 하객 사이에서 온다.
           문이 열리고 통로를 걷는 그림이 '틀에 맞춰진 예식'의 얼굴이라서다. 대신 걸어오는 동선은
           남긴다 — 사진의 시작 컷이 거기서 나온다.
           ★현장 안내를 여기 한 곳에서만 갈라 둔다. 두 군데 적으면 리허설에서 두 분이 문 앞에 선다. */
        live: { t: (S.course === 'record' ? '두 분이 하객분들 사이를 지나 가운데로 걸어옴 (문 열림 없음)' : '문 열림 · 두 분이 손잡고 입장 · 중앙까지 걸어옴'), est: 102, duck: 0, self: true, doing: 'move' }
      }), (function () {
        /* ★[ENTRY_OUT_TONE 2026-08-11] 도착 직후 멘트는 **입장 느낌을 따라간다.**
           같은 순간을 두 번 묻지 않기 위해서다 — 두 분은 이미 입장 느낌을 골랐다.
           ★덮어쓰기 전용 키를 두지 않는다 — 아무도 값을 안 만드는 키는 문이 아니라 구멍이다
             ([PREVIEW_KEYS] 가 실제로 막았다 · digital 2026-08-02 사고와 같은 꼴).
             따로 고르게 하려면 빌더에서 묻는 화면과 함께 되살릴 것.
           ★A 는 슬러그를 안 바꾼다 — 종전 문안 그대로라 이미 녹음된 파일을 그대로 쓴다.
             바꾸면 멀쩡한 음원 하나가 이름만 달라져 통째로 다시 녹음해야 한다. */
        var t = String(S.entry || 'A').toUpperCase();
        if (!D.NARR.entryOutBy[t]) t = 'A';
        return cue({
          k: 'entry', blockN: '신랑·신부 입장',
          slug: (t === 'A' ? 'narr-entry-out' : 'narr-entry-out-' + t), name: '입장 마무리',
          text: D.NARR.entryOutBy[t], duck: -12
        });
      })()];
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
      /* ★[PEAK_ONE] 서약을 끌 수 있어야 한다 — 기록형에서 편지를 정점으로 고르면 여기가 빠진다.
         norm() 이 s.vow='off' 로 만들어 주는데, 여기서 안 보면 그 결정이 조용히 무시된다.
         (ring 은 원래부터 S.ring 을 본다 — 같은 규칙을 vow 에도 둔다) */
      if (S.vow !== 'ok') return [];
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

    /* ★[FREE_SLOT] 자유 한 칸 — 두 분이 하고 싶은 것 하나가 들어오는 자리.
       ★무엇이 올지 모르므로 문안이 **지목하지 않는다**. "노래를"·"영상을" 이라 적는 순간
         다른 것을 넣은 예식에서 거짓말이 된다. 그게 이 두 줄이 이렇게 밋밋한 이유다.
       ★길이도 모른다 → est 는 넉넉히 잡고 끝은 사람이 낸다(앞에 live 가 있어 다음 큐가 자동 manual). */
    free: function () {
      return [cue({
        k: 'free', blockN: '자유 한 칸', slug: 'narr-free-in', name: '자유 한 칸 시작',
        text: D.NARR.freeIn, duck: PARAM.duckMusic, pick: '두 분이 정한 순서',
        live: { t: '두 분이 준비한 것 (디렉터는 필요한 것만 건넨다)', est: 120, duck: PARAM.duckOff, self: true, doing: 'move', note: '무엇이 올지 모른다 — 음악·마이크·화면 필요 여부를 리허설에서 미리 물어 둔다' }
      }), cue({
        k: 'free', blockN: '자유 한 칸', slug: 'narr-free-out', name: '자유 한 칸 마무리',
        text: D.NARR.freeOut, duck: PARAM.duckMusic
      })];
    },

    /* ★[TOAST_SCENE 2026-08-09] 한 덩어리 → **박자가 있는 장면**으로.
       옛 판은 문안 하나 + 45초짜리 사람 구간 하나 + 마무리였다. 그 45초 안에서
       잔을 집고 · 선창을 듣고 · 답하고 · 케이크를 자르고 · 포즈까지 다 일어나야 했다.
       한 덩어리라 큐 화면도 "그냥 기다려라"밖에 못 말했다.
       이제 데이터가 박자를 들고 있고(nar / nar2 · est / est2) 엔진은 그대로 편다:
         [문안] → [사람 구간] → (둘 다면) [문안2] → [사람 구간2] → [마무리]
       마무리 문안도 모드에서 고른다 — 케이크만 골랐는데 잔 이야기가 나가던 자리를 막는다. */
    toast: function (S) {
      var t = D.TOAST[S.toast] || D.TOAST.toast;
      var seq = [cue({
        k: 'toast', blockN: '축배 · 케이크', slug: 'toast-' + S.toast, name: '축배 · 케이크', text: t.nar,
        duck: PARAM.duckMusic, pick: t.d, note: t.note,
        live: { t: t.cue, est: t.est, duck: 0, self: true, doing: t.doing }
      })];
      if (t.nar2) seq.push(cue({
        k: 'toast', blockN: '축배 · 케이크', slug: 'toast-both-b', name: '축배 · 잔을 들고 선창',
        text: t.nar2, duck: PARAM.duckMusic, hint: '두 분 손에 잔이 들어가면', note: t.note2,
        live: { t: t.cue2, est: t.est2, duck: 0, self: true, doing: 'say' }
      }));
      seq.push(cue({
        k: 'toast', blockN: '축배 · 케이크',
        slug: t.out === 'cakeOut' ? 'narr-cake-out' : 'narr-toast-out',
        name: t.out === 'cakeOut' ? '케이크 커팅 마무리' : '축배 마무리',
        text: D.NARR[t.out], duck: PARAM.duckMusic
      }));
      return seq;
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

    /* ★[ASK_PRECUE 2026-08-07] 응답형 예고는 '하객 맞이'에 얹혀 있었다.
       [ALL_OPTIONAL] 로 하객 맞이를 뺄 수 있게 되면서, 빼는 순간 예고가 조용히 사라지고
       하객은 답할 줄 모른 채 선언만 듣게 된다(화면은 멀쩡하다 — 가장 나쁜 종류의 구멍).
       그래서 예고는 '하객 맞이가 있으면 거기, 없으면 선언 바로 앞'에 선다. 두 번 나가지 않는다. */
    /* ★예고는 '선언이 실제로 남아 있을 때만' 나간다 — 선언을 뺐는데 예고만 나가면
       하객이 답할 준비를 한 채로 아무 일도 안 일어난다(빈 약속). S.declareWho 만 보면 이걸 놓친다. */
    var askOn = (S.declareWho === 'ask') && seq.indexOf('declare') > -1;
    var askPre = false;
    function askCue() {
      askPre = true;
      return cue({
        k: 'guest', blockN: '식전 안내', slug: 'declare-ask-a', name: '응답형 예고 (개식 직후)',
        text: EXTRA['declare-ask-a'],
        note: '응답형을 고른 예식에만 붙는다 · 성혼 선언 자리가 아니라 여기서 한 번 예고한다'
      });
    }

    seq.forEach(function (k) {
      if (!BUILD[k]) return;
      if (k === 'declare' && askOn && !askPre) cues.push(askCue());
      var got = BUILD[k](S) || [];
      for (var i = 0; i < got.length; i++) cues.push(got[i]);
      // 하객 맞이 뒤에는 식전 고정 클립 2개가 붙는다(코스와 무관)
      if (k === 'guest') {
        if (S.digital) cues.push(cue({
          k: 'guest', blockN: '식전 안내', slug: 'online-3-welcome', name: '온라인 참석자 환영',
          text: EXTRA['online-3-welcome'], note: 'Couples 시트 digitalAttendance = Y인 날만'
        }));
        if (askOn) cues.push(askCue());
      }
    });

    // 폐식 — 목록 밖 고정
    cues.push(cue({
      k: '_close', blockN: '폐식·단체촬영', slug: 'narr-close', name: '폐식 · 단체촬영 전환', text: D.NARR.close,
      duck: -12, note: '예식의 마지막 소리 · 가장 느리게',
      /* ★[GATHER_WAIT 2026-08-08] 사람이 모이는 시간을 큐가 알아야 한다.
         전에는 post wait 30초 뒤 다음 큐가 **자동으로** 나갔다. 그런데 이 클립이
         "모두 앞으로 나와, 두 분 곁에 서 주세요" 라고 부르는 말이 됐다([CLOSE_V2]).
         25명이 30초 만에 모인다는 보장이 없고, 안 모였는데 "모두 모이셨습니다"가
         나가면 거짓말이 된다. live 를 주면 다음 큐가 manual 로 내려와 디렉터가 보고 누른다.
         ★[CUE_FIRE_RULE] 이 전환은 규칙이 자동으로 계산한다 — 손으로 적지 않는다. */
      live: { t: '하객이 앞으로 모임 · 두 분을 가운데로', est: 60, self: true, doing: 'move' },
      post: [{ music: 'to', v: PARAM.duckMusic, ms: 2000 }]
    }));

    if (mode === 'console') {
      // 후반부(단체촬영·배웅) — 미리듣기에는 넣지 않는다. 고객이 들을 대상이 아니라 디렉터 진행이다.
      /* ★★[AFTER_PARTY 2026-08-08] 예식 뒤 30분을 세 토막으로. 옛 구조는 '단체촬영' 큐 하나(420초)였고
         그 문안이 *"스태프가 차례로 안내해 드리니 편안히 기다려 주시기 바랍니다"* 였다 — 사회자 없이
         나레이션이 이끈다는 결정과 어긋나고, 5차 리서치 실측(전체컷만 6~10분)과도 안 맞았다.
         ★live.est 근거: 전체컷 360(25명은 하단값 6분) · 가족 구도 300 · 인사 라운드 1200 · 마지막 240.
           코스에 따라 라운드가 늘어난다(본식이 짧으면 그만큼) — 그건 진행표가 현장에서 흡수한다.
         ★호명·연출은 여기 없다. 순서가 당일 유동적이라 D.PHOTOCUE 의 '골라 트는 판'이 맡는다. */
      /* ★★[ROUND_FIT 2026-08-09 · 2패스] 라운드는 손으로 더한 합이 아니라 **큐를 세어** 정한다.
         1차 판은 `_grFixed = 60+300+240+…` 처럼 고정 자리의 est 를 사람이 더했다. 하루 만에
         주석·리터럴·실제 큐 합이 셋 다 달라졌다(코드 세션 실측: 1230 · 990 · 930) —
         한 자리를 고치면 나머지를 같이 고쳐야 하는 구조는 반드시 어긋난다.
         이제 큐를 전부 밀어 넣은 **뒤에** live.est 를 합산해 남는 시간을 라운드로 준다.
         고정 자리 값을 바꾸면 라운드가 알아서 따라 움직인다. narr-photo-out 뒤의 IIFE 가 그 일을 한다.
         ★하한 10분 — 그 아래로는 '인사했다'가 성립하지 않는다(리서치 3차 · 테이블당 하한). */
      cues.push(cue({
        k: '_photo', blockN: '단체촬영', slug: 'end-0-photo', name: '전체 하객컷', text: EXTRA['end-0-photo'], duck: -14,
        live: { t: '전체 하객 단체컷 (전원이 앞에 모인 상태)', est: 300, note: '25명 정렬에 5분 · 20명 이상은 6~10분이 업계 실측이지만 [DAY_PLAN]으로 다 함께가 짧아져 5분으로 당겼다' }
      }));
      cues.push(cue({
        k: '_photo', blockN: '단체촬영', slug: 'narr-photo-split', name: '나눠 담기 · 대기 안내', text: D.NARR.photoSplit, duck: -14,
        hint: '전체컷을 담고 나면',
        note: '★뒤 문장이 대기를 「알려진 대기」로 바꾼다 — 순번을 알려 주면 이탈이 준다(하버드)',
        live: { t: '불러 모으는 구도 촬영 (호명은 골라 트는 판에서)', est: 240, self: true, doing: 'move' }   // [PHOTO_CAP] 구도 상한 6→5
      }));
      cues.push(cue({
        k: '_greet', blockN: '인사 사진', slug: 'narr-round-open', name: '인사 시작', text: D.NARR.roundOpen, duck: -14,
        hint: '불러 모으는 구도가 끝나면',
        note: '★여기서 하객이 풀어진다. 두 분은 그 사이 카메라 앞으로 간다',
        /* ★[GATHER_WAIT] digital 이면 이 뒤에 온라인 인사가 온다. live 가 없으면 그 큐가 chain 이 되어
           안내가 끝나자마자 "두 분, 카메라 앞으로" 가 나간다 — 하객이 아직 안 풀어졌고 두 분도 안 움직였다.
           짧은 사람 구간을 줘서 디렉터가 보고 누르게 한다. */
        live: S.digital
          ? { t: '하객이 자리에서 풀어짐 · 두 분이 카메라 앞으로 이동', est: 90, self: true, doing: 'move' }
          : { t: '두 분이 자리마다 인사 · 작가가 따라 돌며 그 자리 컷', est: 0, self: true, doing: 'move' }   // [ROUND_FIT] 2패스가 라운드를 더한다
      }));
      if (S.digital) cues.push(cue({
        k: '_greet', blockN: '인사 사진', slug: 'narr-online-in', name: '온라인 인사', text: D.NARR.onlineIn, duck: -14,
        note: '★[MIC_ROUTE] 두 분 마이크를 라이브로만 (현장 스피커 내림) · 끝나면 라이브 종료 + 마이크 off',
        live: { t: '온라인 인사 2분 → 라이브 종료·마이크 off → 두 분이 자리마다 인사 (작가가 따라 돌며 그 자리 컷)', est: 120, self: true, doing: 'say' }   // [ROUND_FIT] 2패스가 라운드를 더한다
      }));
      /* ★'자리 돌며 인사' 20분은 **소리가 없다.** 별도 큐로 두면 슬러그 없는 큐가 되어
         전 조합 검사가 잡는다(실제로 잡혔다 · 20736건). 소리 없는 자리는 큐가 아니라
         **앞 큐의 사람 구간**이다 — 디렉터는 앞 큐를 누르고 시간만 본다.
         그래서 digital 이면 온라인 인사 큐가, 아니면 인사 시작 큐가 이 시간을 안고 간다. */
      cues.push(cue({
        k: '_final', blockN: '다 함께 마지막', slug: 'narr-final-warn', name: '마지막 예고', text: D.NARR.finalWarn, duck: -14,
        hint: '한 바퀴가 거의 끝나갈 때',
        note: '★2단계의 1단 — 단순 신호는 13%만 반응하고 이유를 말한 음성 안내는 75%가 즉시 반응한다(실측)'
      }));
      cues.push(cue({
        k: '_final', blockN: '다 함께 마지막', slug: 'narr-final-call', name: '모이는 신호', text: D.NARR.finalCall, duck: -14,
        hint: '예고 뒤 5분쯤',
        note: '★2단계의 2단 · 이 뒤 연출은 골라 트는 판에서',
        live: { t: '다 함께 마지막 한 장 · 연출 2개 (골라 트는 판)', est: 180, self: true, doing: 'move' }   // [PHOTO_CAP] 연출 상한 3→2
      }));
      cues.push(cue({
        k: '_final', blockN: '다 함께 마지막', slug: 'narr-photo-out', name: '마지막 닫는 말', text: D.NARR.photoOut, duck: -12,
        note: '★예식 전체에서 마지막으로 나가는 감정이다(피크엔드) · 없으면 배웅 안내로 끝난다'
      }));
      /* [ROUND_FIT 2패스 본체] 다 함께 블록의 est 합을 세고, 남는 시간을 캐리어(라운드를 안는 큐)에 더한다 */
      (function () {
        var IN = { 'narr-close': 1, 'end-0-photo': 1, 'narr-photo-split': 1, 'narr-round-open': 1,
                   'narr-online-in': 1, 'narr-final-warn': 1, 'narr-final-call': 1, 'narr-photo-out': 1 };
        var fixed = 0, carrier = null;
        for (var i = 0; i < cues.length; i++) {
          var c = cues[i];
          if (!IN[c.slug]) continue;
          if (c.live && c.live.est) fixed += c.live.est;
          if (c.slug === (S.digital ? 'narr-online-in' : 'narr-round-open')) carrier = c;
        }
        var budget = (D.DAY.total - D.DAY.ready - D.DAY.snap - D.DAY.farewell)
          - (D.MIN.base[S.course] || D.MIN.base.damback);   // 분 · 다 함께 몫
        var round = Math.max(600, budget * 60 - fixed - 120);   // 120초 = 나레이션 여덟 클립의 말 시간
        if (carrier && carrier.live) carrier.live.est += round;
      })();
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

    return { cues: cues, S: S, seq: seq, mode: mode, meta: meta(cues, S, mode, seq) };
  }

  /* ★[THIN_WARN 2026-08-07] [ALL_OPTIONAL] 로 전부 뺄 수 있게 되면서 '입장만 남은 예식'이 만들어질 수 있다.
     막지는 않는다 — 사용자가 "전부 선택사항"이라고 결정했고, 못 빼게 하면 그 결정이 거짓말이 된다.
     대신 **소리 내어 알린다**. 화면이 이 문장을 띄우지 않으면 고객은 빈 예식을 만들어 놓고 모른다.
     ★셋 다 '예식이 성립하는가'를 보는 것이지 취향이 아니다. 취향 항목을 여기에 늘리지 말 것. */
  function warnOf(seq, S) {
    var has = {}, w = [];
    seq.forEach(function (k) { has[k] = 1; });
    if (S.extra) for (var e in S.extra) if (S.extra[e]) has[e] = 1;
    if (has.vow && S.vow !== 'ok') delete has.vow;
    if (has.ring && S.ring !== 'on') delete has.ring;
    if (has.bless && S.bless !== 'on') delete has.bless;
    if (!has.vow && !has.letter && !has.tribute && !has.bless) w.push('마음을 전하는 자리가 하나도 없어요. 서약·편지 중 하나는 두시는 편이 좋아요.');
    if (!has.declare) w.push('성혼 선언이 빠졌어요. 예식이 언제 성립했는지 하객분들이 알 수 없어요.');
    if (!has.guest) w.push('하객 맞이 안내가 빠졌어요. 시작 시점을 아무도 모른 채 입장이 시작돼요.');
    return w;
  }

  function meta(cues, S, mode, seq) {
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
      noClip: missing, minLabel: c0.min, warn: warnOf(seq, S)
    };
  }

  return {
    build: build, norm: norm, seqOf: seqOf, PARAM: PARAM, FILES: FILES, EXTRA: EXTRA,
    COURSE_DEF: COURSE_DEF, sylSec: sylSec, fileOf: fileOf, noOf: noOf, RETIRED: RETIRED, version: 'cue-v1'
  };
});
