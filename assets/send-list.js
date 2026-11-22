/* ★★[PREP_HUB_1123 2026-11-23 사장님 결정] «준비할 것» 목록의 원천 — 마이페이지 «예식 준비» 줄 · 전체 화면(지금) · 관리 화면(다음 단계)이 같은 함수를 읽는다.
   순수 함수만 둔다(DOM · 저장 · 서버 호출 없음). 들어오는 것 = 식순 초안(S · summary) · 상영 영상 상태(prevideo · midvideo) · 받은 파일(prepFiles) ·
   두 분 목소리 상태(voice.sup) · 예식일 · 오늘(한국 날짜) · 스냅 카드가 있는가.
   ★마이페이지는 ritual-open.js(318KB)를 싣지 않는다 — 여기에는 «무엇이 해당하나»를 가르는 가장 작은 규칙만 옮겨 두고,
     원천은 assets/ritual-open.js 의 prepOf · prepList · onOf · chipOf 다. 두 곳이 갈라지면 scripts/audit/send-list-sync.mjs 가 빨강이 된다 [SEND_LIST_SYNC].
   ★«두 분이 준비할 것»의 글은 빌더가 저장할 때 실어 둔 summary.prep(= RitualOpen.prepList(S)) 를 그대로 쓴다(글을 여기서 다시 짓지 않는다) ·
     체크는 빌더와 같은 칸 S.mkc['p:<순간>:<prepOf 순번>'] — 한쪽에서 누르면 다른 쪽도 같은 표시다. */
(function (root) {
  'use strict';
  /* 서버(automation/platform/80_production.gs RF_PREP)와 같은 열쇠 — 새 열쇠는 두 곳을 함께 고친다 */
  var PREP_KEYS = { mr: '축가 반주', fx: '준비한 순서 파일', bl: '덕담 원고', sp: '축사 원고' };
  /* ── ritual-open.js 에서 옮긴 최소 규칙 [SEND_LIST_SYNC] ── */
  var ALWAYS = { guest: 1, entry: 1, matjeol: 1 };               // ritual-open ALWAYS
  var RETIRED = { cake: 1 };                                    // ritual-open RETIRED
  var FREE_OLD = { stage: 'speech', dance: 'speech', show: 'speech', hand: 'gift' };   // ritual-open FREE_OLD
  var FREE_CHIPS = ['speech'];                                  // ritual-open CHIPS.free 의 값들
  var FREE_KIND = { video: 'video', etc: 'etc', gift: 'gift', hand: 'gift', speech: 'speech' };   // ritual-open FREE_KIND
  var GUEST_KEYS = ['g0', 'g1', 'g3'];                          // order-preview GUEST_KEYS · [GUEST_5MIN_OFF_1023] g2 는 걷었다
  var DUE = { song: 3, freeEtc: 7, bless: 7, speech: 3, voice: 7 };   // ritual-open prepOf 의 마감(예식 며칠 전)
  var NAME = { guest: '하객 맞이', entry: '입장', song: '축가', bless: '부모님 덕담', free: '축사', candle: '화촉', declare: '성혼 선언', ring: '반지 교환', tribute: '부모님께 인사', toast: '축배', letter: '편지 낭독' };   // ritual-open CARDS.n(축사 = nameOf free · speech)
  function onOf(S, k) { return !!(ALWAYS[k] || (!RETIRED[k] && S && S.on && S.on[k])); }
  function freeKind(S) { S = S || {}; var v = FREE_OLD[S.freeWhat] || S.freeWhat; if (FREE_CHIPS.indexOf(v) < 0) v = 'speech'; return FREE_KIND[v]; }
  function siteOf(S, k) { return ((S && S.mkc) || {})['p:' + k + ':0'] === 'site'; }   // 덕담 · 축사 «원고 없이 현장에서 바로»(prepOf 의 0번 줄)

  /* ── 날짜 ── 'YYYY-MM-DD' 만 다룬다(문자열 비교 · 한국 날짜는 부르는 쪽이 넣는다) */
  function ymdOf(v) { var m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[1] + '-' + m[2] + '-' + m[3] : ''; }
  function addDays(ymd, n) { var m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return ''; var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n)); return d.toISOString().slice(0, 10); }
  function diffDays(a, b) { var x = Date.parse(a + 'T00:00:00Z'), y = Date.parse(b + 'T00:00:00Z'); return (isNaN(x) || isNaN(y)) ? null : Math.round((x - y) / 864e5); }
  function md(ymd) { var m = String(ymd || '').match(/^\d{4}-(\d{2})-(\d{2})$/); return m ? (+m[1]) + '월 ' + (+m[2]) + '일' : ''; }

  /* 상태 낱말 — 한 곳(화면 · 관리 화면이 같은 말) */
  var WORD = { got: '받음', trim: '다듬는 중', ready: '당일 준비 완료', late: '마감 지남', part: '일부 받음', check: '확인해 주세요', edit: '수정 중' };

  function fileOf(files, key) { var f = files && files[key]; return (f && typeof f === 'object' && (f.id || f.name)) ? f : null; }
  function upHas(S, sup, k) { var u = ((S && S.up) || {})[k]; return !!((u && (typeof u !== 'object' || u.id || u.n)) || (sup && sup[k] && sup[k].id)); }

  /* 마감 · 상태 — due = 예식 며칠 전(null = 마감 없음) · got = 받았나 · st = 관리자가 매긴 상태(trim · ready · 없으면 받음) */
  function timeOf(row, wed, today) {
    var dueYmd = (row.dueDays != null && wed) ? addDays(wed, -row.dueDays) : '';
    var open = !wed || !today || today < wed;   // [PREP_UP_UNTIL] 예식 전날까지는 마감이 지나도 올릴 수 있다 · 예식 날부터는 닫는다
    row.dueYmd = dueYmd; row.open = open;
    var left = (dueYmd && today) ? diffDays(dueYmd, today) : null;
    row.left = left;
    if (row.got) { row.dueWord = ''; return row; }
    if (left == null) { row.dueWord = ''; return row; }
    if (left > 0) row.dueWord = left + '일 남음 · ' + md(dueYmd) + '까지';
    else if (left === 0) row.dueWord = '오늘까지';
    else { row.status = 'late'; row.dueWord = open ? '계속 올릴 수 있어요' : ''; if (!open) row.closed = true; }
    return row;
  }

  function build(o) {
    o = o || {};
    var S = o.S || {}, sm = o.summary || {}, files = o.files || {}, sup = (o.voice && o.voice.sup) || {}, wed = ymdOf(o.wed), today = ymdOf(o.today);
    var send = [], two = [], opt = [];
    var fin = function (r) { r.status = r.status || (r.got ? 'got' : ''); timeOf(r, wed, today); r.word = WORD[r.status] || ''; return r; };
    var fileRow = function (id, key, name, hint, src, go, dueDays, act, txt) {
      var f = fileOf(files, key), t = txt ? String(((S.tx || {})[txt]) || '').trim() : '';
      var r = { id: id, sec: 'send', kind: act === 'paste' ? 'text' : 'file', key: key, name: name, hint: hint, src: src, go: go, req: true, dueDays: dueDays, act: act, txt: txt || '', file: f, text: t, got: !!(f || t) };
      if (f && (f.st === 'trim' || f.st === 'ready')) r.status = f.st;   // [PREP_ST] 관리 화면이 매기는 상태(다음 단계) — 지금은 읽기만
      return fin(r);
    };
    /* ① 스튜디오에 보낼 것 */
    if (onOf(S, 'song')) send.push(fileRow('mr', 'mr', '축가 반주(MR)', '3분 안팎 한 곡 · 곡 이름과 부르는 분', '식순 · 축가를 담으셔서', 'ritual:song', DUE.song, 'upload'));
    if (onOf(S, 'free') && freeKind(S) === 'etc') send.push(fileRow('fx', 'fx', '준비한 순서 파일', '음악이나 화면 · 무엇을 몇 분', '식순 · 준비한 순서를 담으셔서', 'ritual:free', DUE.freeEtc, 'upload'));
    var mu = S.mu;
    if (mu && mu.src === 'up') send.push(fin({ id: 'mu', sec: 'send', kind: 'music', name: '입장 곡', hint: '직접 올리신 곡', src: '식순 · 입장 곡을 직접 올리셔서', go: 'ritual:entry', req: true, dueDays: null, act: 'open', got: !!mu.fid }));
    if (S.guestVoice === 'couple') {
      var gn = GUEST_KEYS.filter(function (k) { return upHas(S, sup, k); }).length;
      send.push(fin({ id: 'vg', sec: 'send', kind: 'voice', name: '두 분 목소리 · 하객 맞이 안내', hint: '빈 줄은 나레이션으로 나와요', src: '식순 · 하객 맞이를 두 분 목소리로', go: 'ritual:guest', req: true, dueDays: DUE.voice, act: 'open', got: gn === GUEST_KEYS.length, status: (gn && gn < GUEST_KEYS.length) ? 'part' : '' }));
    }
    if (S.entryVoice === 'couple') send.push(fin({ id: 've', sec: 'send', kind: 'voice', name: '두 분 목소리 · 입장 인사', hint: '', src: '식순 · 입장 인사를 두 분 목소리로', go: 'ritual:entry', req: true, dueDays: DUE.voice, act: 'open', got: upHas(S, sup, 'entry') }));
    [['pv', o.prevideo, '식전 영상', '상영 영상 · 식전 영상을 고르셔서', 'pvc'], ['mv', o.midvideo, '식중 영상', '상영 영상 · 식중 영상을 고르셔서', 'mvc']].forEach(function (x) {
      var v = x[1]; if (!v || !v.use) return;   // use = 그 줄이 마이페이지에 서 있는가(부르는 쪽이 _pvcRow · _mvcRow 와 같은 조건으로 정한다)
      var st = String(v.st || ''); if (st === 'off') return;
      var r = { id: x[0], sec: 'send', kind: 'video', name: x[2], hint: '', src: x[3], go: x[4], req: true, dueDays: null, act: 'open' };
      r.got = ['done', 'checking', 'making', 'editing'].indexOf(st) > -1;
      r.status = st === 'done' ? 'ready' : st === 'making' ? 'trim' : st === 'editing' ? 'edit' : st === 'review' ? 'check' : '';
      if (st === 'review') r.got = false;
      fin(r);
      var due = ymdOf(v.due);   // 영상은 서버가 기한 날짜를 준다(예식 7일 전 · [PV_DUE7_1101])
      if (due) { r.dueYmd = due; var lf = today ? diffDays(due, today) : null; r.left = lf;
        if (!r.got && r.status !== 'check' && lf != null) { if (lf > 0) r.dueWord = lf + '일 남음 · ' + md(due) + '까지'; else if (lf === 0) r.dueWord = '오늘까지'; else { r.status = 'late'; r.word = WORD.late; r.dueWord = '영상 없이 진행해요'; r.closed = true; } } }
      send.push(r);
    });
    if (onOf(S, 'bless') && !siteOf(S, 'bless')) send.push(fileRow('bl', 'bl', '덕담 원고', '한 분 300자 안팎 · 받으면 큰 글씨 카드로 돌려드려요', '식순 · 덕담을 담으셔서', 'ritual:bless', DUE.bless, 'paste', 'bless.p'));
    if (onOf(S, 'free') && freeKind(S) === 'speech' && !siteOf(S, 'free')) send.push(fileRow('sp', 'sp', '축사 원고', '1분에 300자쯤 · 받으면 큰 글씨 카드로 돌려드려요', '식순 · 축사를 담으셔서', 'ritual:free', DUE.speech, 'paste', 'free.p'));
    /* 받은 것은 아래로 · 남은 것은 가까운 마감부터(마감 없는 줄은 남은 것 맨 뒤) */
    send.forEach(function (r, i) { r._i = i; });
    send.sort(function (a, b) { var ad = a.got ? 1 : 0, bd = b.got ? 1 : 0; if (ad !== bd) return ad - bd; var x = a.dueYmd || '9999', y = b.dueYmd || '9999'; return x < y ? -1 : x > y ? 1 : a._i - b._i; });
    send.forEach(function (r) { delete r._i; });

    /* ② 두 분이 준비할 것 — 빌더가 실어 둔 준비 목록(summary.prep)의 «부탁드릴 것 · 챙길 것» · 체크 칸 = 빌더의 S.mkc */
    var mkc = S.mkc || {}, jOf = {};
    (Array.isArray(sm.prep) ? sm.prep : []).forEach(function (q) {
      if (!q || !q.k) return;
      var j = jOf[q.k] = (jOf[q.k] == null ? 0 : jOf[q.k] + 1);   // prepOf 순번 — prepList 는 순간 안 차례를 그대로 둔다(빠지는 것은 덕담 · 축사의 «현장에서» 원고뿐 · 그 순간의 0번이자 하나뿐)
      var cat = q.cat || 'send';
      if (cat !== 'ask' && cat !== 'bring') return;
      if ((q.k === 'bless' || q.k === 'free') && cat === 'ask') return;   // 덕담 · 축사 원고는 ① 에서 받는다
      if (!onOf(S, q.k)) return;
      var w = String(q.what || ''), cut = w.indexOf(' · '), id = 'p:' + q.k + ':' + j;
      two.push({ id: id, sec: 'two', kind: 'check', mk: id, k: q.k, what: w, name: cut > 0 ? w.slice(0, cut) : w, hint: cut > 0 ? w.slice(cut + 3) : String(q.note || ''), who: q.who || 'couple', req: true, got: !!mkc[id] && mkc[id] !== 'site', word: '', dueWord: q.due === 0 ? '당일 가져오기' : '' });
    });
    two.sort(function (a, b) { return (a.got ? 1 : 0) - (b.got ? 1 : 0); });

    /* ③ 보내 주시면 좋은 것(선택 · 셈에 안 든다) */
    if (o.snap) opt.push({ id: 'snapref', sec: 'opt', kind: 'link', name: '스냅 참고 사진 · 링크', hint: '원하시는 장면이 있으면 보내 주세요', src: '스냅 기획', go: 'snap', req: false, act: 'open', got: false, word: '', dueWord: '' });

    var pend = send.concat(two).filter(function (r) { return r.req && !r.got && !r.closed && r.status !== 'part'; });
    var next = ''; send.forEach(function (r) { if (!r.got && !r.closed && r.dueYmd && (!today || r.dueYmd >= today) && (!next || r.dueYmd < next)) next = r.dueYmd; });
    return { send: send, two: two, opt: opt, left: pend.length, nextDue: next, nextWord: next ? md(next) : '', any: !!(send.length || two.length), ids: send.concat(two).filter(function (r) { return r.req; }).map(function (r) { return r.id; }) };
  }
  /* 줄 아래 회색 한 줄 — «n개 남음 · 다음 마감 M월 D일» · 다 했으면 «모두 받았어요» */
  function subOf(L) { if (!L || !L.any) return ''; if (!L.left) return '모두 받았어요'; return L.left + '개 남음' + (L.nextWord ? ' · 다음 마감 ' + L.nextWord : ''); }
  /* 새 항목 점 — 마지막으로 열었을 때 본 열쇠 목록(seen)에 없는 필수 항목이 있나 */
  function hasNew(L, seen) { if (!L || !L.ids.length) return false; var s = Array.isArray(seen) ? seen : null; if (!s) return true; return L.ids.some(function (id) { return s.indexOf(id) < 0; }); }

  var API = { PREP_KEYS: PREP_KEYS, build: build, subOf: subOf, hasNew: hasNew, onOf: onOf, freeKind: freeKind, NAME: NAME, WORD: WORD, _addDays: addDays };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.SendList = API;
})(typeof window !== 'undefined' ? window : this);
