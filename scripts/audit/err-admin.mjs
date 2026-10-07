#!/usr/bin/env node
/* ★★[ERR_CODE_ADMIN 2026-10-07 사장님 «직접 테스트 · 표기 안 된 다른 에러는 없는지 딥하게 · 라운드별로 개선책이 없을 때까지»]
   관리자 화면(admin.html) · 촬영 브리프(brief.html) · 내부 도구 화면의 실패가 «무엇이 · 왜» 한 줄로 보이는지 «실제로 실패시켜» 잰다.
   ⓪ 정적 — 고친 자리의 표식 · 옛 문구(«오류: Failed to fetch» · «검색 실패» · «서버 연결이 안 돼요» · 빈 catch)가 돌아오지 않았나 · 생성기와 생성물이 같이 고쳐졌나
   ① 노드(vm) — admin.html 의 ADM_WHY 블록만 떼어 돌린다: _why(연결 X6 · 오래 끊김 X5 · 깨진 답 X7 · 화면 오류 · 서버 글 그대로 · 옛 GAS 배포 안내) ·
      _admLost(«로그인이 필요»만 · 예외 원문의 «권한»은 로그아웃 아님) · _nb(코드 괄호 안 U+00A0 · U+2060) · _admHtmlWhy(실행 시간 · 권한 · 할당량) ·
      _errParse(«.» «-» «ㆍ» «/» «:» · U+00A0 · U+2060 · 전각 괄호 · «코드 V6이요» · S10 · M8 · Q6 · 전화번호는 코드 아님)
   ② 실브라우저(가짜 GAS) — 첫 화면 실패 셋(끊김 · HTML · 서버 예외)과 로그인 풀림 · 코드 검색(폴링이 안 덮는다 · 표에 없는 코드 · «고객으로 찾기» ·
      사고번호 · 조회 실패) · 고객 검색 실패 · 상세(최근 실패 실패 · 세 줄 + 더 보기 · 코드 누르면 뜻 · 카드 하나 고장 · 식전 영상 소개만 두 분 목소리) ·
      확인판 끊김 · 환불 큐 상세 실패 · 보관 실패 · 전역 안전망 · 복사 거짓 없음 · 실패 토스트 · 메모 · 휴무 목록 · 시간 제안 · 검색 안내 폭 · 코드 괄호 한 줄
   ③ 내부 화면 — brief(X5 · X6 · X7) · audio-review(로컬 전용 안내) · 어조 실청(못 여는 소리) · order-audit(엔진 오류 수) · 실청판(충돌 글은 글자로) · 문안 되돌리기(복사 · 저장 막힘)
   종료 코드 0 통과 · 1 실패 · 2 재지 못함(브라우저 없음 · ⓪ ① 은 그래도 잰다) */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + (typeof d === 'string' ? d : JSON.stringify(d))}`); if (!c) fail++; };
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const N = (s) => String(s == null ? '' : s).replace(/\u2060/g, '').replace(/\u00A0/g, ' ');   // 화면 글 → 비교용(U+2060 · U+00A0 를 걷는다)
const ADM = rd('admin.html');

/* ══════════ ⓪ 정적 ══════════ */
{
  const has = (f, s) => rd(f).includes(s);
  ok('⓪ 표식 [ERR_CODE_ADMIN] 이 고친 자리마다 있다(20곳 이상)', (ADM.match(/ERR_CODE_ADMIN/g) || []).length >= 20, String((ADM.match(/ERR_CODE_ADMIN/g) || []).length));
  for (const fn of ['function _why(x, o)', 'function _admLost(x)', 'function toastErr(msg)', 'function _nb(t)', 'function _errParse(q)', 'function _cardSafe(k,d,isSnap)', 'function _arcFail(line)', 'function _bkLoad()', 'function _refundNoData(code,names,line)', 'function _playWhy(e)', 'function _admPlay(blob)', 'function _errUnknownHtml(c)', 'function _searchFail(q, line, note)', 'function _admHtmlWhy(status, t)', 'function _errLogFail(q,P,card,line)'])
    ok('⓪ 함수가 있다 · ' + fn, ADM.includes(fn));
  const gone = [
    ["mErr('오류: '", '확인판 «오류: Failed to fetch»(#5)'], ["textContent='오류: '", '로그인 «오류: Load failed»(#5)'],
    ["toast('검색 실패')", '검색 실패(#18)'], ["toast('검색 오류')", '검색 오류(#18)'], ["toast('서버 연결이 안 돼요 · 잠시 후 다시 시도해 주세요')", '전역 안전망 오진(#6)'],
    ["toast(d&&d.ok?'저장됨':'저장 실패')", '메모 저장 실패(#19)'], ["toast('슬롯 로드 실패')", '시간 제안(#21)'], ["if(!d||!d.ok){ toast('불러오기 실패'); return; }", '보관 고착(#3)'],
    ["init:function(){ gas('adminListWeddingBlocks').then(function(r){ if(r&&r.ok) _bkRender(r.blocks); }).catch(function(){}); },", '휴무 목록 무음(#20)'],
    ["gas('adminRitualFileOk', code, key, on).then(function(){ admRfLoad(); }); }", '확인 ✓ 무음(#17)'], ['legacyCopy(text); done();', '복사 거짓 «복사됨»(P4)'],
    [".catch(function(){ doMarkRefunded(code, names, null); });", '환불 큐 «계좌 미입력» 거짓(#7)'], ["if(!r||!r.ok) return; var c=document.getElementById('admVcChars')", '목소리 사용량 무음(#16)'],
    ["toast((r&&r.error)||'실패')", '스냅 «실패»'], ["return {ok:false,error:'서버 연결이 안 돼요'}", '교육 «서버 연결» 오진'],
    ["toast('서명 진본을 불러오지 못했어요 · 서명칸이 빈 채로 인쇄됩니다')", '서명 진본 실패가 2초 만에 사라지고 까닭 · 코드 없음(ADM_SIG_WHY)'],
  ];
  const left = gone.filter(([s]) => ADM.includes(s)).map(([s, w]) => w + ' «' + s + '»');
  ok('⓪ 옛 실패 문구 · 빈 catch 가 남지 않았다', !left.length, left.join(' | '));
  ok('⓪ 토스트가 판 위에 뜬다(z-index · AI 직원실 9990 · 계약서 뷰어 99999 · 확인판 100010 보다 위) · 실패 토스트는 눌러서 닫는다', /#toast\{[^}]*z-index:100020/.test(ADM) && /#toast\.show\.err\{pointer-events:auto/.test(ADM));
  ok('⓪ 식전 영상 소개만 두 분 목소리여도 «파일 보기»(#15)', ADM.includes("if(s3d.guestVoice==='couple'||s3d.entryVoice==='couple'||s3d.pvVoice==='couple') h+='<div class=\"grp-l\">두 분 목소리"));
  ok('⓪ 검색 안내 문구가 짧아졌다(#27)', /id="q" placeholder="이름·연락처·코드 · 오류 코드"/.test(ADM));
  const B = rd('brief.html');
  ok('⓪ brief — 늦음 X5 · 끊김 X6 · 깨진 답 X7 · 화면 오류를 가른다(#31) · 옛 «연결이 끊겼어요.<br>잠시 뒤 새로고침해 주세요.» 한 줄 catch 없음',
    /\(코드 X5\)/.test(B) && /\(코드 X6\)/.test(B) && /\(코드 X7\)/.test(B) && B.includes('BRIEF_ERR_CODE') && !B.includes("}).catch(function(){ state('연결이 끊겼어요.<br>잠시 뒤 새로고침해 주세요.'); });"));
  const AR = rd('audio-review.html');
  ok('⓪ audio-review — 받기는 getJson(HTTP 번호 · 파일 이름) · «로컬 전용» 안내 · 틀린 «momentedit.kr/audio-review.html 로 열거나» 없음(#32)', AR.includes('AR_LOCAL_ONLY') && AR.includes('function getJson(url, name)') && !AR.includes("'<br>momentedit.kr/audio-review.html 로 열거나"));
  const TG = rd('scripts/build-listen-tone.mjs'), TP = rd('audio-review-tone.html');
  ok('⓪ 어조 실청 — 생성기와 생성물 둘 다 playSafe(onerror · play().catch)(#33)', TG.includes('TONE_PLAY_FAIL') && TP.includes('TONE_PLAY_FAIL') && /function playSafe\(a, label, onBad\)/.test(TP) && !/a\.onended = function \(\) \{ cur = null; if \(done\) done\(\); \}; a\.play\(\);/.test(TP));
  const OA = rd('order-audit.html');
  ok('⓪ order-audit — 엔진 오류를 세어 머리에(#34) · 복사는 execCommand 결과를 본다', OA.includes('AUDIT_ENGINE_ERRS') && OA.includes('ERRS.n++') && OA.includes("okc = !!document.execCommand('copy')") && !OA.includes("catch(e){ return; }"));
  const LG = rd('scripts/build-listen-all.mjs'), LPs = fs.readdirSync(ROOT).filter((f) => /^listen-.*\.html$/.test(f));
  ok('⓪ 실청판 — 충돌 글은 textContent(생성기 · 판 둘 다 · #35)', LG.includes('CRASH_TEXT') && LPs.length > 0 && LPs.every((f) => rd(f).includes('CRASH_TEXT') && !rd(f).includes("String((e && (e.message || e.error)) || '알 수 없음').slice(0, 200) + '</code>'")), LPs.join(','));
  const PT = rd('scripts/pick-back.tpl.html'), PF = rd('pick-final.html');
  ok('⓪ 문안 되돌리기 — 복사 결과를 보고(PICK_COPY_TRUTH) · 저장 막힘 안내(PICK_CAN_SAVE) · 틀(tpl)과 판 둘 다(#36)', [PT, PF].every((s) => s.includes('PICK_COPY_TRUTH') && s.includes('PICK_CAN_SAVE') && s.includes('id="noSave"') && !s.includes("try { document.execCommand('copy'); b.textContent = '복사됨'; }")));
}

/* ══════════ ① 노드 — ADM_WHY 블록 ══════════ */
const i0 = ADM.indexOf('/* ==ADM_WHY:START=='), i1 = ADM.indexOf('/* ==ADM_WHY:END== */');
ok('① ADM_WHY 블록이 있다(시작 · 끝 표시)', i0 > 0 && i1 > i0);
const X = { console }; X.window = X; vm.createContext(X);
let vmOk = false;
try { vm.runInContext(rd('assets/err-codes.js'), X); vm.runInContext(ADM.slice(i0, i1), X); vmOk = true; } catch (e) { ok('① 블록이 노드에서 돈다(DOM 을 만지지 않는다)', false, e.message); }
if (vmOk) {
  const W = (x, o) => N(X._why(x, o));
  const net = (ms) => Object.assign(new TypeError('Failed to fetch'), { meNet: 1, meMs: ms || 300 });
  ok('① 연결 끊김 → «연결이 끊겼어요 · 다시 눌러 주세요 (코드 X6)»', W(net()) === '연결이 끊겼어요 · 다시 눌러 주세요 (코드 X6)', W(net()));
  ok('① 쓰기 동작의 끊김 → «처리됐는지 확인한 뒤» (X6)', W(net(), { write: true }) === '연결이 끊겼어요 · 처리됐는지 확인한 뒤 다시 눌러 주세요 (코드 X6)', W(net(), { write: true }));
  ok('① 아이폰 «Load failed»(표시 없이 와도) → X6', /\(코드 X6\)$/.test(W(new TypeError('Load failed'))), W(new TypeError('Load failed')));
  ok('① 61초 기다린 끊김 = 결과 모름 → «(코드 X5 · 61초)»', /서버는 끝냈을 수 있으니 처리됐는지 확인해 주세요 \(코드 X5 · 61초\)$/.test(W(net(61000))), W(net(61000)));
  const ab = new Error('aborted'); ab.name = 'AbortError';
  ok('① 기다리다 멈춤(AbortError) → X5', /\(코드 X5\)$/.test(W(ab)), W(ab));
  const html = Object.assign(new Error('서버가 JSON 대신 오류 페이지(HTML)를 돌려줬어요 (HTTP 200) · …'), { __meHtml: 1 });
  ok('① 깨진 답(HTML) → 그 설명 + (코드 X7) 한 번', /\(코드 X7\)$/.test(W(html)) && (W(html).match(/코드/g) || []).length === 1, W(html));
  const te = new TypeError("Cannot read properties of undefined (reading 'x')");
  ok('① 화면 코드 예외 → «화면 오류 · TypeError: …» · 코드 없음(서버 · 연결 탓으로 말하지 않는다)', /^화면 오류 · TypeError: Cannot read/.test(W(te)) && !/코드/.test(W(te)), W(te));
  const na = new Error('play() failed'); na.name = 'NotAllowedError';
  ok('① 브라우저가 막음(NotAllowedError) → «브라우저가 막았어요»(서버 탓 아님)', /^브라우저가 막았어요/.test(W(na)), W(na));
  ok('① 서버 거절 글은 그대로', W({ ok: false, error: '계약 서명 완료 후 입금 확인이 가능합니다.' }) === '계약 서명 완료 후 입금 확인이 가능합니다.');
  const x9 = { ok: false, error: '서버에서 오류가 났어요 · TypeError: x (코드 X9 · AB23)' };
  ok('① 서버가 붙인 코드는 두 번 안 붙인다 · 괄호 안 띄어쓰기는 U+00A0 · «코»«드» 사이 U+2060', W(x9) === x9.error && X._why(x9).includes('(코\u2060드\u00A0X9\u00A0·\u00A0AB23)'), JSON.stringify(X._why(x9)));
  ok('① 옛 GAS «알 수 없는 요청: fn» → 배포 안내를 덧붙인다(#23) · 이미 붙은 글엔 두 번 안 붙인다', W({ ok: false, error: '알 수 없는 요청: adminErrLog' }) === '알 수 없는 요청: adminErrLog · GAS 새 버전 배포가 필요해요(99_deployCheck 의 deployStampCheck)'
    && W({ ok: false, error: '알 수 없는 요청: adminErrLog · GAS 새 버전 배포가 필요해요(99_deployCheck 의 deployStampCheck)' }).split('배포').length === 2);
  ok('① 옛 서버 글의 «…주세요. (코드 B1)» → 코드 앞 끝 마침표를 걷는다(P2)', W({ ok: false, error: '잠시 후 다시 시도해 주세요. (코드 B1)' }) === '잠시 후 다시 시도해 주세요 (코드 B1)', W({ ok: false, error: '잠시 후 다시 시도해 주세요. (코드 B1)' }));
  ok('① 까닭 없는 거절 → base', W({ ok: false }, { base: '고객 정보를 불러오지 못했어요' }) === '고객 정보를 불러오지 못했어요');
  ok('① _admLost — «로그인이 필요» · reason expired 만 로그아웃', X._admLost({ ok: false, error: '로그인이 필요합니다. (관리자 전용)' }) && X._admLost({ ok: false, reason: 'expired' }));
  ok('① _admLost — 예외 원문의 «권한» · 업무 글의 «만료»는 로그아웃이 아니다 · 던져진 것도 아니다', !X._admLost({ ok: false, error: '서버에서 오류가 났어요 · Exception: 권한이 필요합니다 (코드 X9 · AB23)' }) && !X._admLost({ ok: false, error: '임시고정이 만료됐어요' }) && !X._admLost(net()));
  ok('① _nb 는 몇 번 해도 같다', X._nb(X._nb('연결이 끊겼어요 (코드 X6)')) === X._nb('연결이 끊겼어요 (코드 X6)') && X._nb('연결이 끊겼어요 (코드 X6)').endsWith('(코\u2060드\u00A0X6)'));
  const H = (b) => N(X._admHtmlWhy(200, '<!DOCTYPE html><html><head><title>Error</title><style>p{}</style></head><body><div>' + b + '</div><script>var x=1;</script></body></html>'));
  ok('① HTML 본문 글을 싣고 진단을 고른다 — 실행 시간 한도 · 권한 재승인 · 할당량 · 그 밖 deployStampCheck(#22)',
    /실행 시간 한도/.test(H('Exceeded maximum execution time')) && /서버 글 «Exceeded maximum execution time»/.test(H('Exceeded maximum execution time'))
    && /권한 재승인/.test(H('Authorization is required to perform that action.')) && /할당량/.test(H('Service invoked too many times for one day: email.'))
    && /deployStampCheck/.test(H('SyntaxError: Unexpected token (line 12, file "admin")')) && !/var x=1|p\{\}|<title>/.test(H('x')), H('Exceeded maximum execution time'));
  const P = (q) => { const r = X._errParse(q); return r ? [r.code, r.eid, String(r.ex ? r.ex.code : null), !!r.bare].join('|') : 'null'; };
  const cases = [
    ['V6', 'V6||V6|true'], ['v6', 'V6||V6|true'], ['(코드 V6 · 61초)', 'V6||V6|true'], ['코드 S9 · 7KQ2', 'S9|7KQ2|S9|false'],
    ['S9.7KQ2', 'S9|7KQ2|S9|false'], ['S9-7KQ2', 'S9|7KQ2|S9|false'], ['S9ㆍ7KQ2', 'S9|7KQ2|S9|false'], ['S9/7KQ2', 'S9|7KQ2|S9|false'], ['S9:7KQ2', 'S9|7KQ2|S9|false'],
    ['（코드 B9 · 7KQ2）', 'B9|7KQ2|B9|false'], ['(코드\u00A0B9\u00A0·\u00A07KQ2)', 'B9|7KQ2|B9|false'], ['(코\u2060드\u00A0B9\u00A0·\u00A07KQ2)', 'B9|7KQ2|B9|false'], ['Ｓ６', 'S6||S6|true'],
    ['코드 V6이요', 'V6||V6|false'], ['S10', 'S10||null|true'], ['M8', 'M8||null|true'], ['Q6', 'Q6||null|true'], ['7kq2', '|7KQ2|null|false'], ['A3', 'A3||A3|true'], ['5678', '|5678|null|false'],
    ['김희준', 'null'], ['010-1234-5678', 'null'], ['A3C7KM', 'null'], ['', 'null'],
  ];
  const bad = cases.filter(([q, want]) => P(q) !== want).map(([q, want]) => JSON.stringify(q) + ' → ' + P(q) + ' (기대 ' + want + ')');
  ok(`① 코드 읽기 — 고객이 옮겨 적은 모양 ${cases.length}가지(구분자 · U+00A0 · U+2060 · 전각 괄호 · 문장 속 · 표에 없는 코드 · 전화번호는 아님 · #12)`, !bad.length, bad.join(' | '));
}

/* ══════════ ② 실브라우저 ══════════ */
if (!pw) { console.log('못 쟀다 — playwright 없음'); console.log(fail ? `\nFAIL ${fail}건` : '\n⓪ ① 통과 · ② ③ 못 잼'); process.exit(fail ? 1 : 2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const FAKE404 = new Set();
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); if (FAKE404.has(u)) { r.writeHead(404, { 'Content-Type': 'text/html' }); r.end('<!doctype html><title>404</title>'); return; }
  const p = path.join(ROOT, u); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}`;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저를 못 띄움 ' + e.message); srv.close(); process.exit(fail ? 1 : 2); }

/* 가짜 GAS — 진짜 adminDetail 은 GAS 함수를 노드에서 돌려 받는다(_gasworld) */
const { openWorld, kstAgo } = await import('./_gasworld.mjs');
const { G, world } = openWorld();
const REC = JSON.stringify({ 시착: '2026-07-01', 계약: '2026-07-02', 영수증기준일: { 예약금: kstAgo(1) } });
const SEED = { 개인코드: 'ME-A', 신랑이름: '가나다', 신부이름: '라마바', 연락처: '010-1234-5678', 이메일: 't@example.com', 현재단계: '제작중', 계약상태: '서명완료', 계약총액: '2500000', 예식일: '2026-10-26', 입금상태: '확인', 입금자명: '가나다', 입금완료신호: '2026-07-01 10:00', 중도금상태: '확인', 중도금확인일시: kstAgo(2), 잔금상태: '확인', 잔금확인일시: kstAgo(2), 시착동의상태: '동의완료', 시착동의일시: '2026-07-01 10:00', 계약서발송일시: '2026-07-01 12:00', 계약서명일시: '2026-07-02 08:00', 동의기록: REC };
const BOOK = { 상태: '확정', 캘린더이벤트ID: 'BK1', 개인코드: 'ME-A', '성함(신랑)': '가나다', '성함(신부)': '라마바', 연락처: '010-1234-5678', 이메일: 't@example.com', 예식일자: '2026-10-26', 하객: '30', 상담일시: '2026-06-20 14:00' };
const detailOf = (code) => { world(Object.assign({}, SEED, { 개인코드: code }), Object.assign({}, BOOK, { 개인코드: code })); return G.adminDetail(code); };
const HOME = { ok: true, name: '점검', counts: { total: 1, urgent: 0 }, queue: { urgent: [], normal: [{ kind: '입금확인', code: 'ME-A', names: '가나다 · 라마바', sub: '계약금 250,000원' }] }, results: [], pipeline: {}, survey: { n: 0 }, blocks: [], stageFlow: {}, stageEx: [] };
const CORS = { 'Access-Control-Allow-Origin': '*' };
let GAS = {}; const seen = [];
const DEF = { adminHome: () => ({ json: HOME }), adminDetail: (p) => ({ json: detailOf(String((p.args || [])[0] || 'ME-A')) }), adminErrLog: () => ({ json: { ok: true, rows: [] } }), adminSilentContacts: () => ({ json: { ok: true, list: [] } }) };

async function open(w, init) {
  const ctx = await br.newContext({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 });
  await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true;');
  if (init !== null) await ctx.addInitScript(init || "try{ localStorage.setItem('me_admin_token','TOK'); }catch(e){}");
  await ctx.route('**/*', async (rt) => {
    const u = rt.request().url();
    if (u.includes('script.google.com')) {
      let p = {}; try { p = JSON.parse(rt.request().postData() || '{}'); } catch {}
      const key = p.action === 'adminCall' ? String(p.fn || '') : String(p.action || '');
      seen.push({ fn: key, args: p.args || [] });
      let h = GAS[key] || DEF[key]; if (typeof h === 'function') h = h(p);
      if (!h) return rt.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: '{"ok":true}' });
      if (h.abort) return rt.abort('failed');
      if (h.hold) await new Promise((r) => setTimeout(r, h.hold));
      try {
        if (h.html) return await rt.fulfill({ status: h.status || 200, contentType: 'text/html', headers: CORS, body: h.html });
        return await rt.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(h.json) });
      } catch { return; }
    }
    if (u.startsWith(BASE)) return rt.continue();
    return rt.fulfill({ status: 200, body: '' });
  });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  return { ctx, pg, errs };
}
async function sec(name, fn) { try { await fn(); } catch (e) { ok(name + ' — 재다가 멈췄다', false, String(e && e.message || e).split('\n')[0]); } }
const txt = (pg, sel) => pg.evaluate((s) => { const e = document.querySelector(s); return e ? (e.innerText || e.textContent || '') : null; }, sel).then(N);
const SHOTS = process.env.SHOTS || '';

/* ②-A 첫 화면 실패 셋 + 로그인 풀림 */
await sec('②-A', async () => {
  const { ctx, pg, errs } = await open(390);
  const tok = () => pg.evaluate(() => localStorage.getItem('me_admin_token'));
  GAS = { adminHome: { abort: 1 } };
  await pg.goto(`${BASE}/admin.html`); await pg.waitForTimeout(2300);
  const a1 = await txt(pg, '#lgErr');
  ok('②-A 첫 화면 끊김 → «연결이 끊겼어요 · … (코드 X6)» · 로그인 정보 그대로(#2 · #5)', /^연결이 끊겼어요 · 로그인 정보는 그대로라 새로고침\(F5\)하면 다시 열려요 \(코드 X6\)$/.test(a1) && (await tok()) === 'TOK', a1);
  /* [ADM_CODE_NB] 코드 괄호가 어느 폭에서도 두 줄로 갈리지 않는다(되돌리면 빨강 — 보통 띄어쓰기면 좁은 폭에서 «(코드» / «X6)»로 갈린다) */
  const split = await pg.evaluate(() => { const el = document.getElementById('lgErr'); const keep = el.style.width; const out = [];
    for (let w = 90; w <= 360; w += 2) { el.style.width = w + 'px'; el.style.display = 'block'; const tn = [...el.childNodes].find((n) => n.nodeType === 3); if (!tn) break; const t = tn.data, i = t.lastIndexOf('('), j = t.indexOf(')', i);
      const r = document.createRange(); r.setStart(tn, i); r.setEnd(tn, j + 1); const tops = new Set([...r.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top))); if (tops.size > 1) out.push(w); }
    el.style.width = keep; return out; });
  ok('②-A 코드 괄호 «(코드 X6)»가 90~360px 어느 폭에서도 한 줄(U+00A0 · U+2060 · 코워크 요청)', !split.length, 'split at ' + split.slice(0, 6).join(','));
  if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'admin-home-net-390.png') });
  GAS = { adminHome: { html: '<!DOCTYPE html><html><head><title>Error</title></head><body><div style="x">Exceeded maximum execution time</div></body></html>' } };
  await pg.goto(`${BASE}/admin.html`); await pg.waitForTimeout(2300);
  const a2 = await txt(pg, '#lgErr');
  ok('②-A 첫 화면이 HTML → LOAD_WHY 설명 + 실행 시간 한도 + 서버 글 + (코드 X7) · «연결이 잠시 불안정» 아님(#2 · #22)', /서버가 JSON 대신 오류 페이지\(HTML\)/.test(a2) && /실행 시간 한도/.test(a2) && /서버 글 «Exceeded maximum execution time»/.test(a2) && /\(코드 X7\)$/.test(a2) && !/불안정/.test(a2), a2);
  GAS = { adminHome: { json: { ok: false, error: '서버에서 오류가 났어요 · TypeError: x (코드 X9 · AB23)' } } };
  await pg.goto(`${BASE}/admin.html`); await pg.waitForTimeout(1200);
  const a3 = await txt(pg, '#lgErr');
  ok('②-A 첫 화면 서버 예외 → 서버 글 그대로(X9 · 사고번호) · 로그인 정보 그대로', /^서버에서 오류가 났어요 · TypeError: x \(코드 X9 · AB23\) · 로그인 정보는 그대로예요$/.test(a3) && (await tok()) === 'TOK', a3);
  GAS = { adminHome: { json: { ok: false, error: '서버에서 오류가 났어요 · Exception: 권한이 필요합니다 (코드 X9 · AB24)' } } };
  await pg.goto(`${BASE}/admin.html`); await pg.waitForTimeout(1200);
  ok('②-A 예외 원문에 «권한»이 있어도 로그아웃하지 않는다(_admLost · 2026-06-12 «됐다가 안 됨» 재발 방지)', (await tok()) === 'TOK', await tok());
  GAS = { adminHome: { json: { ok: false, error: '로그인이 필요합니다. (관리자 전용)' } } };
  await pg.goto(`${BASE}/admin.html`); await pg.waitForTimeout(1200);
  const a5 = await txt(pg, '#lgErr');
  ok('②-A 로그인 풀림 → 토큰을 지우고 로그인 화면 + 까닭', !(await tok()) && /로그인/.test(a5), a5);
  ok('②-A 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});

/* ②-B 코드 검색 · 고객 검색 */
await sec('②-B', async () => {
  GAS = {};
  const { ctx, pg, errs } = await open(1280);
  await pg.goto(`${BASE}/admin.html`); await pg.waitForTimeout(1200);
  const q = async (s, ms) => { await pg.evaluate((v) => { document.getElementById('q').value = v; doSearch(); }, s); await pg.waitForTimeout(ms || 400); return txt(pg, '#queueWrap'); };
  let t = await q('S6');
  ok('②-B «S6» → 코드 카드(저장 · 연결 끊김) · 개인코드에 없는 글자(S)라 «고객으로 찾기»는 안 단다', /S6 · 연결이 끊겼어요/.test(t) && !/고객으로 찾기/.test(t), t.slice(0, 80));
  ok('②-B 코드 카드에서 _lastQuery 가 그 검색어다(#9)', (await pg.evaluate(() => _lastQuery)) === 'S6');
  await pg.evaluate(() => { loadHome(true); }); await pg.waitForTimeout(800);
  t = await txt(pg, '#queueWrap');
  ok('②-B 75초 폴링(조용한 갱신)이 코드 카드를 홈 목록으로 덮지 않는다(#9 · 되돌리면 빨강)', /S6 · 연결이 끊겼어요/.test(t) && !/처리할 일/.test(t), t.slice(0, 60));
  if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'admin-search-S6-1280.png') });
  t = await q('S10'); ok('②-B «S10» → «표에 없는 코드예요» · 글자 하나 + 숫자 하나(#12)', /S10 · 표에 없는 코드예요/.test(t) && /글자 하나 \+ 숫자 하나/.test(t), t.slice(0, 120));
  t = await q('M8'); ok('②-B «M8» → «M(기기)은 1~7만»', /M8 · 표에 없는 코드예요/.test(t) && /1~7만/.test(t), t.slice(0, 120));
  t = await q('Q6'); ok('②-B «Q6» → 앞 글자 목록', /Q6 · 표에 없는 코드예요/.test(t) && /앞 글자는/.test(t), t.slice(0, 120));
  t = await q('A3');
  ok('②-B «A3» → 코드 카드 + «\'A3\' 고객으로 찾기»(#28)', /A3 · /.test(t) && /'A3' 고객으로 찾기/.test(t), t.slice(0, 120));
  seen.length = 0; await pg.click('[data-people="A3"]'); await pg.waitForTimeout(500);
  ok('②-B «고객으로 찾기» → adminSearch(«A3»)', seen.some((s) => s.fn === 'adminSearch' && s.args[0] === 'A3'), JSON.stringify(seen.slice(0, 3)));
  const ROWS = [{ at: '2026-10-07 21:10', eid: '7KQ2', ec: 'B9', act: 'cancelReservation', code: 'ME-A', text: '요청을 처리하지 못했어요 (코드 B9 · 7KQ2)', why: 'TypeError: boom', extra: '' }];
  GAS.adminErrLog = (p) => ({ json: { ok: true, rows: p.args && p.args[2] === '7KQ2' ? ROWS : [] } });
  seen.length = 0; t = await q('（코드\u00A0B9\u00A0·\u00A07KQ2）', 700);
  ok('②-B 전각 괄호 · U+00A0 이 섞여 와도 사고번호 7KQ2 로 찾는다(코워크 요청)', seen.some((s) => s.fn === 'adminErrLog' && s.args[2] === '7KQ2') && /사고번호 7KQ2/.test(t), JSON.stringify(seen.slice(0, 2)) + ' ' + t.slice(0, 60));
  await pg.click('#queueWrap [data-ec="B9"]'); await pg.waitForTimeout(200);
  const ex = await txt(pg, '#queueWrap .adm-ecx');
  ok('②-B 줄의 코드를 누르면 그 줄 아래에 뜻 · 할 일(#14)', /^B9 · 서버에서 예상 못 한 오류/.test(ex || ''), ex);
  seen.length = 0; t = await q('S9ㆍ7KQ2', 700);
  ok('②-B 한글 자판 가운뎃점 «S9ㆍ7KQ2» 도 사고번호로', seen.some((s) => s.fn === 'adminErrLog' && s.args[2] === '7KQ2') && /사고번호 7KQ2/.test(t), t.slice(0, 60));
  t = await q('(코\u2060드\u00A0S9\u00A0·\u00A07KQ2)', 700);
  ok('②-B U+2060 이 섞여 와도 사고번호로', /사고번호 7KQ2/.test(t), t.slice(0, 60));
  GAS.adminErrLog = { json: { ok: false, error: '알 수 없는 요청: adminErrLog' } };
  seen.length = 0; t = await q('S9 · 7KQ2', 700);
  ok('②-B 사고번호 조회가 거절되면 까닭 카드(옛 GAS → 배포 안내) · 고객 검색으로 조용히 넘어가지 않는다(#11)', /사고번호 7KQ2 를 찾지 못했어요 · 알 수 없는 요청: adminErrLog · GAS 새 버전 배포가 필요해요/.test(t) && !seen.some((s) => s.fn === 'adminSearch'), t.slice(0, 160));
  if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'admin-errlog-fail-1280.png') });
  seen.length = 0; t = await q('5678', 900);
  ok('②-B 숫자 넷(전화 끝자리일 수 있다)은 조회가 실패해도 고객 검색을 하고 위에 한 줄', seen.some((s) => s.fn === 'adminSearch' && s.args[0] === '5678') && /오류기록은 불러오지 못했어요/.test(t), t.slice(0, 160));
  GAS.adminSearch = { abort: 1 };
  t = await q('김희준', 700);
  ok('②-B 고객 검색 끊김 → 그 자리에 «검색하지 못했어요 · 연결이 끊겼어요 (코드 X6)» · 앞 결과가 남지 않는다(#18)', /'김희준' 검색하지 못했어요/.test(t) && /\(코드 X6\)/.test(t) && !/5678/.test(t), t.slice(0, 160));
  GAS.adminSearch = { json: { ok: false, error: '로그인이 필요합니다. (관리자 전용)' } };
  await q('김희준', 600);
  ok('②-B 고객 검색이 로그인 풀림이면 로그인 화면으로(#18)', (await pg.evaluate(() => document.getElementById('loginView').style.display)) === 'block' && !(await pg.evaluate(() => localStorage.getItem('me_admin_token'))));
  ok('②-B 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});

/* ②-C 상세 */
await sec('②-C', async () => {
  GAS = { adminErrLog: { json: { ok: false, error: '알 수 없는 요청: adminErrLog' } } };
  const { ctx, pg, errs } = await open(390);
  await pg.goto(`${BASE}/admin.html`); await pg.waitForTimeout(1200);
  await pg.evaluate(() => openDetail('ME-A', 'home')); await pg.waitForTimeout(1500);
  const c1 = await pg.evaluate(() => { const c = document.getElementById('admErrCard'); return { hidden: !c || c.hidden, t: c ? c.textContent : '' }; });
  ok('②-C «최근 실패» 조회가 거절되면 카드를 보이고 «못 불러왔어요 · 실패가 없다는 뜻이 아니에요»(#10 · 되돌리면 빨강)', !c1.hidden && /오류기록을 불러오지 못했어요 · 실패가 없다는 뜻이 아니에요/.test(N(c1.t)) && /배포가 필요해요/.test(N(c1.t)), JSON.stringify(c1).slice(0, 200));
  const R8 = Array.from({ length: 8 }, (_, i) => ({ at: '2026-10-0' + (i % 7 + 1) + ' 10:0' + i, eid: i === 0 ? '7KQ2' : '', ec: ['S6', 'V9', 'L8', 'U4', 'S6', 'B5', 'P4', 'G7'][i], act: 'saveProductionTrack', code: 'ME-A', text: '저장이 안 됐어요 · 다시 눌러 주세요 (코드 S6)', why: '', extra: '' }));
  GAS.adminErrLog = { json: { ok: true, rows: R8 } };
  await pg.evaluate(() => openDetail('ME-A', 'home')); await pg.waitForTimeout(1500);
  const c2 = await pg.evaluate(() => { const l = document.getElementById('admErrList'); const vis = [...l.querySelectorAll('.hl')].filter((x) => !x.hidden).length; const more = l.querySelector('[data-errmorebtn]'); return { vis, more: more ? more.textContent : '', note: (document.getElementById('admErrNote') || {}).textContent || '', box: getComputedStyle(l).maxHeight }; });
  ok('②-C 여덟 줄 → 세 줄 + «5건 더 보기» · 높이 상자 없음 · 안내는 상자 밖(#13)', c2.vis === 3 && c2.more === '5건 더 보기' && c2.box === 'none' && /코드를 누르면 뜻이 나와요/.test(c2.note), JSON.stringify(c2));
  if (SHOTS) { await pg.evaluate(() => document.getElementById('admErrCard').scrollIntoView()); await pg.screenshot({ path: path.join(SHOTS, 'admin-recent-fail-390.png') }); }
  await pg.click('#admErrList [data-errmorebtn]'); await pg.waitForTimeout(150);
  await pg.click('#admErrList [data-ec="V9"]'); await pg.waitForTimeout(150);
  const c3 = await pg.evaluate(() => ({ vis: [...document.querySelectorAll('#admErrList .hl')].filter((x) => !x.hidden).length, ex: (document.querySelector('#admErrList .adm-ecx') || {}).textContent || '' }));
  ok('②-C «더 보기» → 여덟 줄 · 코드 «V9» 누르면 뜻(서버에서 멈춤 · 초 안내)(#14)', c3.vis === 8 && /^V9 · /.test(c3.ex) && /61초/.test(c3.ex), JSON.stringify(c3).slice(0, 200));
  /* 카드 하나가 던져도 상세는 열린다(#4) */
  await pg.evaluate(() => { window.__cp = window.cardPayment; window.cardPayment = function () { throw new TypeError('시험 오류'); }; openDetail('ME-A', 'home'); }); await pg.waitForTimeout(1500);
  const c4 = await pg.evaluate(() => ({ view: _view, bad: (document.querySelector('.card[data-k="payment"] .adm-why') || {}).textContent || '', n: document.querySelectorAll('#detailBody .card[data-k]').length }));
  ok('②-C 결제 카드가 던져도 상세가 열리고 그 카드에만 «이 카드를 못 그렸어요 · TypeError»(#4 · 되돌리면 빨강)', c4.view === 'detail' && /이 카드를 못 그렸어요 · 화면 오류 · TypeError: 시험 오류/.test(N(c4.bad)) && c4.n >= 3, JSON.stringify(c4));
  await pg.evaluate(() => { window.cardPayment = window.__cp; });
  /* 식순 v3 초안이 있는 고객 — 진짜 길(openDetail)로 연다. [ADM_AI_LINE_D] 종전엔 제작 카드가 «d is not defined» 로 죽어 상세 전체가 «오류» + 홈이었다(#4 의 실제 원인) */
  let PV_S = null;
  GAS.adminDetail = (p) => { const d = detailOf(String((p.args || [])[0] || 'ME-A')); d.mirror = d.mirror || {}; d.mirror.production = Object.assign({}, d.mirror.production || {}, { tracks: { ritual: '진행중' }, ritualDraft: { _v: 3, S: PV_S || {}, summary: { flow: [] } } }); return { json: d }; };
  const pvOpen = async (S) => { PV_S = S; await pg.evaluate(() => openDetail('ME-A', 'home')); await pg.waitForTimeout(1300);
    return pg.evaluate(() => ({ view: _view, btn: !!document.querySelector('[data-fk="admrf"]'), prodBad: (document.querySelector('.card[data-k="production"] .adm-why') || {}).textContent || '', print: !!document.querySelector('.card[data-k="production"] [onclick="printOrderSheet()"]') })); };
  const g1 = await pvOpen({ guestVoice: 'couple' });
  ok('②-C 식순 v3 초안이 있는 고객도 상세가 열리고 제작 카드가 그려진다(식순지 프린트 · 두 분 목소리) · «d is not defined» 없음(ADM_AI_LINE_D · 되돌리면 빨강)', g1.view === 'detail' && !g1.prodBad && g1.print && g1.btn, JSON.stringify(g1));
  const pvA = await pvOpen({ pvVoice: 'couple' }), pvB = await pvOpen({ pvVoice: 'nar' });
  ok('②-C 식전 영상 소개만 «두 분 목소리»여도 «파일 보기»가 뜬다 · 나레이션이면 안 뜬다(#15 · 되돌리면 빨강)', pvA.btn && !pvB.btn && !pvA.prodBad, JSON.stringify([pvA, pvB]));
  delete GAS.adminDetail;
  /* 메모 저장 실패(#19) */
  await pg.evaluate(() => openDetail('ME-A', 'home')); await pg.waitForTimeout(1500);
  GAS.adminSaveMemo = { abort: 1 };
  await pg.evaluate(() => { document.getElementById('memoArea').value = '메모 시험'; document.getElementById('memoSave').click(); }); await pg.waitForTimeout(700);
  const m1 = await txt(pg, '#memoNote');
  ok('②-C 메모 저장 끊김 → 버튼 아래 «저장 안 됨 · 연결이 끊겼어요 … (코드 X6)»가 남는다 · 적은 글 그대로(#19)', /^저장 안 됨 · 연결이 끊겼어요 · 처리됐는지 확인한 뒤 다시 눌러 주세요 \(코드 X6\)$/.test(m1 || '') && (await pg.evaluate(() => document.getElementById('memoArea').value)) === '메모 시험', m1);
  GAS.adminSaveMemo = { json: { ok: false, error: '로그인이 필요합니다. (관리자 전용)' } };
  await pg.evaluate(() => document.getElementById('memoSave').click()); await pg.waitForTimeout(600);
  ok('②-C 메모 저장이 로그인 풀림이어도 로그인 화면으로 튕기지 않는다(적은 메모를 지키려고) · 까닭은 남는다', (await pg.evaluate(() => _view)) === 'detail' && /로그인이 풀렸어요/.test((await txt(pg, '#memoNote')) || ''));
  ok('②-C 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});

/* ②-D 확인판 · 환불 큐 · 보관 · 휴무 · 시간 제안 */
await sec('②-D', async () => {
  GAS = {};
  const { ctx, pg, errs } = await open(390);
  await pg.goto(`${BASE}/admin.html`); await pg.waitForTimeout(1200);
  GAS.adminApprove = { abort: 1 };
  await pg.evaluate(() => { doApprove('ME-A', '가나다 · 라마바'); }); await pg.waitForTimeout(400);
  await pg.evaluate(() => document.getElementById('cm_yes').click()); await pg.waitForTimeout(700);
  const d1 = await pg.evaluate(() => ({ open: document.getElementById('confirmModal').classList.contains('show'), err: document.getElementById('cm_err').textContent, yes: document.getElementById('cm_yes').disabled }));
  ok('②-D 확인판 끊김 → «연결이 끊겼어요 · 처리됐는지 확인한 뒤 다시 눌러 주세요 (코드 X6)» · 판은 열린 채 · 다시 누를 수 있다(#5 · 되돌리면 빨강)', d1.open && !d1.yes && N(d1.err) === '연결이 끊겼어요 · 처리됐는지 확인한 뒤 다시 눌러 주세요 (코드 X6)' && !/Failed to fetch|Load failed/.test(d1.err), JSON.stringify(d1));
  if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'admin-modal-net-390.png') });
  await pg.evaluate(() => closeModal());
  GAS.adminDetail = { abort: 1 };
  await pg.evaluate(() => doMarkRefundedInline('ME-A', '가나다 · 라마바')); await pg.waitForTimeout(700);
  const d2 = await pg.evaluate(() => ({ t: document.getElementById('cm_title').textContent, b: document.getElementById('cm_text').textContent, y: document.getElementById('cm_yes').textContent }));
  ok('②-D 환불 큐 · 상세를 못 받으면 «환불 정보를 불러오지 못했어요» · 거짓 «환불 계좌 미입력» 없음 · «상세 열기»(#7)', d2.t === '환불 정보를 불러오지 못했어요' && !/계좌 미입력/.test(d2.b) && d2.y === '상세 열기' && /\(코드 X6\)/.test(N(d2.b)), JSON.stringify(d2));
  await pg.evaluate(() => closeModal()); delete GAS.adminDetail;
  GAS.adminArchive = { json: { ok: false, error: '서버에서 오류가 났어요 · boom (코드 X9 · QW34)' } };
  await pg.evaluate(() => openArchive()); await pg.waitForTimeout(800);
  const d3 = await pg.evaluate(() => ({ arc: document.getElementById('archiveView').style.display, ld: document.getElementById('loading').style.display, t: document.getElementById('archiveBody').textContent, retry: !!document.getElementById('arcRetry') }));
  ok('②-D 보관 실패 → 해골에 갇히지 않고 아카이브 화면에 까닭 + «다시 불러오기»(#3 · 되돌리면 빨강)', d3.arc === 'block' && d3.ld === 'none' && /아카이브를 불러오지 못했어요/.test(d3.t) && /X9/.test(d3.t) && d3.retry, JSON.stringify(d3).slice(0, 200));
  await pg.evaluate(() => loadHome()); await pg.waitForTimeout(800);
  GAS.adminListWeddingBlocks = { json: { ok: false, error: '알 수 없는 요청: adminListWeddingBlocks' } };
  await pg.evaluate(() => openBlocksModal()); await pg.waitForTimeout(700);
  const d4 = await txt(pg, '#bkList');
  ok('②-D 휴무 목록을 못 받으면 «불러오는 중…»에 멈추지 않고 까닭 + «다시 불러오기»(#20)', /막은 날짜 목록을 불러오지 못했어요 · 알 수 없는 요청: adminListWeddingBlocks · GAS 새 버전 배포가 필요해요/.test(d4 || '') && /다시 불러오기/.test(d4 || ''), d4);
  await pg.evaluate(() => closeModal());
  GAS.adminAvailability = { json: { ok: false, error: '잠시 후 다시 시도해 주세요. (코드 X1)' } };
  await pg.evaluate(() => openPropose('ME-A', '가나다')); await pg.waitForTimeout(700);
  const d5 = await pg.evaluate(() => ({ open: document.getElementById('confirmModal').classList.contains('show'), toast: document.getElementById('toast').textContent }));
  ok('②-D 시간표를 못 받으면 제안 창을 열지 않고 까닭(#21)', !d5.open && /시간표를 불러오지 못해 제안 창을 열지 않았어요/.test(N(d5.toast)), JSON.stringify(d5));
  ok('②-D 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});

/* ②-E 전역 안전망 · 복사 · 토스트 · 검색 안내 폭 */
await sec('②-E', async () => {
  GAS = {};
  const { ctx, pg, errs } = await open(360);
  await pg.goto(`${BASE}/admin.html`); await pg.waitForTimeout(1200);
  const rej = async (code) => { await pg.evaluate((c) => { window._lastNetToast = 0; (0, eval)(c); }, code); await pg.waitForTimeout(300); return txt(pg, '#toast'); };
  let t = await rej("Promise.reject(Object.assign(new Error('play() failed'), { name: 'NotAllowedError' }))");
  ok('②-E 잡히지 않은 재생 막힘 → «브라우저가 막았어요» · «서버 연결이 안 돼요» 아님(#6 · 되돌리면 빨강)', /^브라우저가 막았어요/.test(t) && !/서버 연결/.test(t), t);
  t = await rej("Promise.reject(Object.assign(new TypeError('Failed to fetch'), { meNet: 1, meMs: 200 }))");
  ok('②-E 잡히지 않은 연결 끊김 → «연결이 끊겼어요 · 다시 눌러 주세요 (코드 X6)»', t === '연결이 끊겼어요 · 다시 눌러 주세요 (코드 X6)', t);
  const tz = await pg.evaluate(() => ({ z: +getComputedStyle(document.getElementById('toast')).zIndex, err: document.getElementById('toast').classList.contains('err') }));
  ok('②-E 실패 토스트는 판들 위(z 100020) · 눌러서 닫는 표시(err)(#24)', tz.z >= 100011 && tz.err, JSON.stringify(tz));
  await pg.waitForTimeout(3200);
  ok('②-E 실패 토스트는 3초 뒤에도 보인다(종전 2.2초)', await pg.evaluate(() => document.getElementById('toast').classList.contains('show')));
  await pg.click('#toast'); await pg.waitForTimeout(200);
  ok('②-E 실패 토스트는 누르면 닫힌다', !(await pg.evaluate(() => document.getElementById('toast').classList.contains('show'))));
  /* 복사 — 거절 + execCommand false 면 «복사됨»이 아니다(P4) */
  const cp = await pg.evaluate(async () => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' })) } }); const ex0 = document.execCommand; document.execCommand = () => false;
    const b = document.createElement('button'); b.textContent = '복사'; document.body.appendChild(b); copyText('ME-A 계좌 123', b); await new Promise((r) => setTimeout(r, 250));
    const o = { btn: b.textContent, dlg: document.getElementById('admDlgOv').classList.contains('show'), t: document.getElementById('admDlgT').textContent, pre: document.getElementById('admDlgPre').textContent };
    try { _admDlgEnd(false); } catch (e) {} document.execCommand = () => true; copyText('x', b); await new Promise((r) => setTimeout(r, 250)); o.btn2 = b.textContent; document.execCommand = ex0; return o; });
  ok('②-E 복사가 막히면 «복사 안 됨» + 글을 판에 띄운다 · 거짓 «복사됨» 없음 · 되면 «복사됨»(P4 · 되돌리면 빨강)', cp.btn === '복사 안 됨' && cp.dlg && cp.t === '복사가 안 됐어요' && cp.pre === 'ME-A 계좌 123' && cp.btn2 === '복사됨', JSON.stringify(cp));
  /* 검색 안내 폭(#27) — 같은 글꼴로 잰다 */
  for (const w of [360, 375, 390]) {
    await pg.setViewportSize({ width: w, height: 800 }); await pg.waitForTimeout(150);
    const m = await pg.evaluate(() => { const i = document.getElementById('q'); const cs = getComputedStyle(i); const c = document.createElement('canvas').getContext('2d'); c.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; return { need: Math.ceil(c.measureText(i.placeholder).width), room: Math.floor(i.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) }; });
    ok(`②-E ${w}px — 검색칸 안내가 잘리지 않는다(필요 ${m.need}px ≤ 칸 ${m.room}px · #27)`, m.need <= m.room, JSON.stringify(m));
  }
  ok('②-E 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});

/* ══════════ ③ 내부 화면 ══════════ */
await sec('③-brief', async () => {
  const shrink = 'window.__st0=window.setTimeout; window.setTimeout=function(f,ms){ var a=[].slice.call(arguments,2); return window.__st0.apply(window,[f, ms===12000?250:ms].concat(a)); };';
  const go = async (h) => { GAS = { snapBrief: h }; const { ctx, pg, errs } = await open(390, shrink); await pg.goto(`${BASE}/brief.html?b=${'a'.repeat(40)}`); await pg.waitForTimeout(h.hold ? h.hold + 400 : 700); const t = await txt(pg, '#root'); const raw = await pg.evaluate(() => document.getElementById('root').textContent); return { ctx, pg, errs, t, raw }; };
  let r = await go({ abort: 1 });
  ok('③ brief 끊김 → «연결이 끊겼어요. 잠시 뒤 새로고침해 주세요 (코드 X6)»(#31)', /연결이 끊겼어요\.\s*잠시 뒤 새로고침해 주세요 \(코드 X6\)/.test(r.t) && r.raw.includes('(코\u2060드\u00A0X6)'), r.t);
  if (SHOTS) await r.pg.screenshot({ path: path.join(SHOTS, 'brief-net-390.png') });
  await r.ctx.close();
  r = await go({ html: '<!DOCTYPE html><html><body>Error</body></html>' });
  ok('③ brief 서버 답이 깨짐(HTML) → X7', /서버 답이 깨졌어요\.\s*잠시 뒤 새로고침해 주세요 \(코드 X7\)/.test(r.t), r.t); await r.ctx.close();
  r = await go({ hold: 900, json: { ok: true } });
  ok('③ brief 12초(시험에선 0.25초) 넘김 → «응답이 늦어요 … (코드 X5)»', /응답이 늦어요\.\s*잠시 뒤 새로고침해 주세요 \(코드 X5\)/.test(r.t), r.t); await r.ctx.close();
  r = await go({ json: { ok: false, error: '주소가 닫혔어요 (코드 X0)', expired: true } });
  ok('③ brief 서버 거절 글은 그대로', /주소가 닫혔어요/.test(r.t), r.t); await r.ctx.close();
});
await sec('③-audio-review', async () => {
  const man = '/docs/plans/식순연구/타입캐스트/manifest.json'; FAKE404.add(man);
  const { ctx, pg } = await open(390, null);
  await pg.goto(`${BASE}/audio-review.html`); await pg.waitForTimeout(900);
  const t = await txt(pg, '#stage');
  ok('③ audio-review — manifest 404 → 어느 파일 · HTTP 번호 · 로컬 서버 안내 · 틀린 «momentedit.kr/… 로 열거나» 없음(#32)', /manifest\.json 를 못 받았습니다\(HTTP 404\)/.test(t || '') && /python3 -m http\.server/.test(t || '') && !/momentedit\.kr\/audio-review\.html 로 열거나/.test(t || ''), t);
  FAKE404.delete(man); await ctx.close();
});
await sec('③-tone', async () => {
  const { ctx, pg, errs } = await open(390, null);
  await pg.goto(`${BASE}/audio-review-tone.html`); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async () => { const junk = URL.createObjectURL(new Blob([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], { type: 'audio/wav' })); const c = D.clips.find((x) => x.n.length >= 2); c.n.forEach((s) => { AUD[s.i] = junk; });
    let got = []; const p0 = window.play1; window.play1 = function (i, done) { got.push(i); return p0(i, done); };
    playClip(D.clips.indexOf(c)); await new Promise((res) => setTimeout(res, 2500)); window.play1 = p0;
    return { got: got.length, want: c.n.length, msg: (document.getElementById('playErr') || {}).textContent || '', cls: (document.getElementById('playErr') || {}).className }; });
  ok('③ 어조 실청 — 못 여는 소리면 «이 소리를 못 열었어요 · audio_N» · «클립 통째»는 다음 문장으로 넘어간다(#33)', r.got === r.want && /^이 소리를 못 열었어요 · audio_\d+/.test(r.msg) && r.cls !== 'hide', JSON.stringify(r));
  ok('③ 어조 실청 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});
await sec('③-order-audit', async () => {
  const { ctx, pg } = await open(390, null);
  await pg.route('**/assets/ritual-cue.js', async (rt) => { const body = fs.readFileSync(path.join(ROOT, 'assets/ritual-cue.js'), 'utf8') + "\n;(function(){ var C=self.RitualCue; if(!C) return; var b=C.build, n=0; C.build=function(){ n++; if(n%40===7) throw new Error('엔진 시험 오류 '+n); return b.apply(this, arguments); }; })();"; await rt.fulfill({ status: 200, contentType: 'text/javascript', body }); });
  await pg.goto(`${BASE}/order-audit.html`); await pg.waitForTimeout(2500);
  const t = await pg.evaluate(() => (document.querySelector('.lede') || {}).textContent || '');
  ok('③ order-audit — 엔진이 던진 조합 수와 첫 글을 머리에 적는다(#34)', /★엔진 오류 \d+건 · 그 조합의 자리는 이 목록에서 빠졌어요 · 첫 글: .*엔진 시험 오류/.test(t), t.slice(0, 200));
  await ctx.close();
});
await sec('③-listen', async () => {
  const lp = fs.readdirSync(ROOT).find((f) => /^listen-.*\.html$/.test(f));
  const { ctx, pg } = await open(390, null);
  await pg.goto(`${BASE}/${lp}`); await pg.waitForTimeout(600);
  const r = await pg.evaluate(() => { const el = document.getElementById('canDo'); if (el) delete el.dataset.crashed; window.dispatchEvent(new ErrorEvent('error', { message: "Unexpected token '<', \"<!DOCTYPE <b>x</b>\" is not valid JSON" })); const c = el && el.querySelector('code'); return { code: c ? c.textContent : '', tags: c ? c.children.length : -1 }; });
  ok('③ 실청판 — 충돌 글이 태그로 읽히지 않고 글자 그대로(#35)', r.code === "Unexpected token '<', \"<!DOCTYPE <b>x</b>\" is not valid JSON" && r.tags === 0, JSON.stringify(r));
  await ctx.close();
});
await sec('③-pick', async () => {
  const block = "try{ var _s=Storage.prototype.setItem; Storage.prototype.setItem=function(){ throw new Error('blocked'); }; }catch(e){}";
  const { ctx, pg } = await open(390, block);
  await pg.goto(`${BASE}/pick-final.html`); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async () => { const ns = document.getElementById('noSave'); const vis = !!ns && ns.style.display !== 'none';
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } }); document.execCommand = () => false;
    document.getElementById('cpy').click(); await new Promise((res) => setTimeout(res, 200)); return { vis, btn: document.getElementById('cpy').textContent }; });
  ok('③ 문안 되돌리기 — 저장이 막힌 창이면 안내 · 복사가 안 되면 «길게 눌러 복사»(거짓 «복사됨» 없음 · #36)', r.vis && r.btn === '길게 눌러 복사', JSON.stringify(r));
  await ctx.close();
});

await br.close(); srv.close();
console.log(fail ? `\nFAIL ${fail}건` : '\n전부 통과');
process.exit(fail ? 1 : 0);
