#!/usr/bin/env node
/* ★★[DRESS_REFS 2026-10-23 코워크 설계 명세 «시착 준비»] 원천(assets/dress-refs.js) 모양 · 줄 세우기 규칙(명세 6장) · 스위치 · 표본 · 서버 짝을 한 번에 잰다.
 *
 * ① 모양 — 라인 다섯(slip · column · aline · empire · twopiece)과 핏 짝(몸 선을 따라 = 슬립 · 컬럼 / 허리만 잡고 아래는 여유 = 라이트 A라인 · 투피스 / 전체적으로 여유 = 엠파이어) ·
 *          길이 셋 · 물음 셋의 답 값 · 드레스 칸(expo · sleeve · 길이 · 라인) · 그림 파일(같은 캔버스 · 채움 없음 · 금색 선) · 사진 파일
 * ② 줄 세우기 — 답의 모든 조합(길이 5 × 핏 5 × 편한 쪽 4)마다 R.rank 를 «명세 문장을 그대로 옮긴 셈»과 대조한다(다른 손으로 쓴 셈 · 같은 함수를 다시 부르지 않는다)
 * ③ 표본 — 운영 주소(momentedit.kr)에서는 0벌 · 그 밖에서는 보인다 · 이름은 «표본 NN» · 운영 판정 목록 = shared/preview-guard.js PROD_HOSTS
 * ④ 스위치 — 꺼짐: dress.html noindex · 홈/신청서 자리는 hidden · 켜짐: 표본 0벌 · noindex 없음 · sitemap 에 /dress.html
 * ⑤ GAS 0 — dress.html · dress-refs.js 에 GAS 주소 · fetch · XHR · sendBeacon 이 없다(저장은 마이페이지가 한다)
 * ⑥ 서버 짝 — consultation-booking.gs DRESS_PICK(마감 일수 · 벌 수) · DRESS_ANS(답 값) = 원천 · 드레스 id 가 서버 id 규칙을 지난다
 * ⑦ 고객 문구 금지어 — 추천 · 맞춤 · 담기 · 하트 · 커버 · 콤플렉스 · 피하세요 · 체형 · 골격 · 전각 줄표(원천 글 · dress.html · 마이페이지 카드)
 * ⑧ 마이페이지 · 관리자 — 같은 원천을 읽는다 · 카드 자리(mp_consult → mp_dress → mp_fitting) · 카드 판정(스위치 · 시그니처 · 상담확정 · 확정 · 자체 준비) · 겹화면 주소 · 미리 보기
 * ⑨ 코워크 검토 1(10/23) — 아래 막대는 #pkBar 가 붙는다 · «Nº» 배지 칠 없음 · 마감 뒤 «준비해 둘게요» · 건너뛰기 옅게 · 진행 표시 높이 그대로 ·
 *    칸 한 줄 «라인 · 길이 · 소재»(넥라인은 자세히) · 슬립 그림이 퍼지지 않는다 · 남길 말 자리 글 · 마감 날 숫자(요일 계산) · 메일 글자 링크 #7A5F37
 *
 * 종료: 0 통과 · 1 어긋남 · 2 못 쟀다(원천 없음)
 * ★깨 보고 믿는다 — --selftest 는 일부러 틀린 원천(핏 짝 바꿈 · 표본 운영 노출 · 마감 일수 다름)을 넣어 셋 다 빨강이 되는지 본다.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch (e) { return null; } };
const SRC = rd('assets/dress-refs.js'), PAGE0 = rd('dress.html'), MP0 = rd('mypage.html'), AD = rd('admin.html'), IDX = rd('index.html'), INQ = rd('inquiry.html');
const GAS = rd('automation/consultation/consultation-booking.gs'), PG = rd('shared/preview-guard.js'), SITEMAP = rd('sitemap.xml') || '';
if (!SRC || !PAGE0 || !MP0 || !GAS || !PG || !IDX || !INQ || !AD) { console.log('못 쟀다 — 원천 파일이 없다'); process.exit(2); }

const load = (src, host) => { const ctx = { window: { location: { hostname: host || 'localhost' } } }; vm.createContext(ctx); vm.runInContext(src, ctx); return ctx.window.DRESS_REFS; };

function audit(src, gas, PAGE = PAGE0, MP = MP0) {
  const bad = [], okn = [];
  const t = (c, m) => { (c ? okn : bad).push(m); };
  let R; try { R = load(src); } catch (e) { return { bad: ['원천을 읽지 못했다 · ' + e.message], okn }; }
  if (!R) return { bad: ['window.DRESS_REFS 가 없다'], okn };

  // ① 모양
  t(typeof R.live === 'boolean', '① live 는 참/거짓');
  t(R.pick === 2, '① 시착 기본 2벌(pick:2)');
  t(R.changeUntilDays === 2, '① 바꾸기 마감 = 상담 이틀 전(changeUntilDays:2)');
  t(typeof R.fitNote === 'string', '① fitNote 는 글(비면 줄을 숨긴다)');
  t(/\blive:\s*(true|false)\s*,\s*\/\/\s*\[DRESS_LIVE\]/.test(src), '① 스위치 줄 «live: …, // [DRESS_LIVE]» — 서버(_dressLive_)가 이 모양으로 읽는다');
  const FIT = { slip: 'body', column: 'body', aline: 'waist', twopiece: 'waist', empire: 'loose' };
  t(R.lines.map((l) => l.key).join() === 'slip,column,aline,empire,twopiece', '① 라인 다섯 · 순서(슬립 · 컬럼 · 라이트 A라인 · 엠파이어 · 투피스)');
  R.lines.forEach((l) => {
    t(FIT[l.key] === l.fit, `① 핏 짝 ${l.key} = ${FIT[l.key]}(명세 6장)`);
    t(!!(l.en && l.ko && l.lead && l.note && l.svg), `① ${l.key} 칸(en · ko · lead · note · svg)`);
    const svg = rd(String(l.svg).replace(/^\//, ''));
    t(!!svg, `① ${l.key} 그림 파일이 있다(${l.svg})`);
    if (svg) t(/viewBox="0 0 150 200"/.test(svg) && /fill="none"/.test(svg) && /stroke="#b89a75"/i.test(svg) && /stroke-width="1"/.test(svg) && !/<(rect|circle|text|image)\b/.test(svg), `① ${l.key} 그림 = 같은 캔버스 · 채움 없음 · 금색 1px 선`);
  });
  t(R.lengths.map((g) => g.key + ':' + g.ko).join() === 'ankle:발목,calf:미디,knee:미니', '① 길이 셋(발목 · 미디 · 미니)');
  const qk = (k) => (R.questions.find((q) => q.key === k) || { opts: [] }).opts.map((o) => o[0]).join();
  t(qk('len') === 'ankle,calf,knee,unsure', '① 길이 물음 답 = 길이 셋 + 아직 몰라요');
  t(qk('fit') === 'body,waist,loose,unsure', '① 핏 물음 답 = 핏 셋 + 아직 몰라요');
  t(qk('pref') === 'low,arms', '① 편한 쪽 = 노출은 적게 · 팔을 덮는 쪽');
  const ids = new Set();
  R.dresses.forEach((d) => {
    t(/^[A-Za-z0-9_-]{1,16}$/.test(d.id) && !ids.has(d.id), `① 드레스 id «${d.id}» 모양 · 겹침 없음`); ids.add(d.id);
    t(!!R.line(d.line) && !!R.lengthOf(d.length), `① ${d.id} 라인 · 길이가 목록에 있다`);
    t(['deep', 'soft'].includes(d.expo) && ['none', 'sleeve', 'bolero'].includes(d.sleeve), `① ${d.id} expo · sleeve 값`);
    t(Array.isArray(d.ex) && d.ex.every((e) => e && typeof e.t === 'string'), `① ${d.id} 넘겨 보는 사진 칸(ex)`);
    t(typeof d.img === 'string', `① ${d.id} img 는 글(비면 라인 그림)`);
    if (d.img) t(!!rd('assets/dress-refs/' + d.img + '.webp') && !!rd('assets/dress-refs/' + d.img + '.jpg'), `① ${d.id} 사진 파일 webp · jpg`);
    (d.ex || []).forEach((e) => { if (e.img) t(!!rd('assets/dress-refs/' + e.img + '.webp') && !!rd('assets/dress-refs/' + e.img + '.jpg'), `① ${d.id} 넘겨 보는 사진 ${e.img}`); });
    if (d.sample) t(/^표본 \d{2}$/.test(d.name), `① 표본 이름 «표본 NN»(실물처럼 짓지 않는다) · ${d.id}`);
    else t(!/^표본/.test(d.name), `① 실물 드레스는 «표본»이라 부르지 않는다 · ${d.id}`);
  });

  // ② 줄 세우기 — 명세 문장을 다른 손으로 옮긴 셈과 대조
  const spec = (ans, list) => {
    const len = ['ankle', 'calf', 'knee'].includes(ans.len) ? ans.len : '';
    const fit = ['body', 'waist', 'loose'].includes(ans.fit) ? ans.fit : '';
    const low = (ans.pref || []).includes('low'), arms = (ans.pref || []).includes('arms');
    if (!len && !fit && !low && !arms) return { asked: false, match: [], rest: list.map((d) => d.id) };
    const sc = list.map((d, i) => {
      let need = 0, hit = 0, down = 0;
      if (len) { need++; if (d.length === len) hit++; }                          // 길이 답 = dress.length 일 때 맞음
      if (fit) { need++; if (FIT[d.line] === fit) hit++; }                         // 핏 답 = 그 라인의 fit 일 때 맞음
      if (low && d.expo === 'deep') down++;                                        // «노출은 적게» → deep 은 아래로
      if (arms && d.sleeve === 'none') down++;                                     // «팔을 덮는 쪽» → none 은 아래로(sleeve · bolero 는 덮는 쪽)
      return { id: d.id, i, hit, down, ok: hit === need && down === 0 };
    });
    const match = sc.filter((x) => x.ok).map((x) => x.id);
    const rest = sc.filter((x) => !x.ok).sort((a, b) => (a.down - b.down) || (b.hit - a.hit) || (a.i - b.i)).map((x) => x.id);
    return { asked: true, match, rest };
  };
  const pool = R.dresses.slice();   // 표본 포함 전부(운영 판정과 무관하게 규칙만 잰다)
  let combos = 0, wrong = [];
  for (const len of ['', 'ankle', 'calf', 'knee', 'unsure']) for (const fit of ['', 'body', 'waist', 'loose', 'unsure']) for (const pref of [[], ['low'], ['arms'], ['low', 'arms']]) {
    combos++;
    const a = { len, fit, pref }, got = R.rank(a, pool), want = spec(a, pool);
    const g = { asked: got.asked, match: got.match.map((d) => d.id), rest: got.rest.map((d) => d.id) };
    if (JSON.stringify(g) !== JSON.stringify(want)) wrong.push(JSON.stringify(a));
    if (got.asked && got.near !== (got.match.length === 0)) wrong.push('near ' + JSON.stringify(a));
  }
  t(!wrong.length, `② 답 조합 ${combos}가지 모두 명세 6장 순서와 같다` + (wrong.length ? ' · 어긋남 ' + wrong.slice(0, 3).join(' / ') : ''));
  t(R.rank({ len: 'unsure', fit: 'unsure', pref: [] }, pool).asked === false, '② «아직 몰라요»만 고르면 나누지 않는다(조건을 보지 않는다)');
  t(R.rank({ len: 'giant', fit: 'x', pref: ['heart'] }, pool).asked === false, '② 모르는 답은 무시한다');

  // ③ 표본 — 운영 주소에서 0벌
  const pgHosts = (/PROD_HOSTS\s*=\s*\[([^\]]*)\]/.exec(PG) || [])[1];
  t(!!pgHosts && JSON.stringify(R.PROD_HOSTS) === JSON.stringify(pgHosts.split(',').map((x) => x.trim().replace(/^'|'$/g, ''))), '③ 운영 주소 목록 = shared/preview-guard.js PROD_HOSTS');
  for (const h of ['momentedit.kr', 'www.momentedit.kr', 'MOMENTEDIT.KR.']) {
    const Rp = load(src, h);
    t(Rp.list().every((d) => !d.sample), `③ 운영 주소(${h})에서는 표본 0벌`);
  }
  const Rv = load(src, 'momentedit-site-git-x-preview.vercel.app');
  t(Rv.list().length === R.dresses.length, '③ 미리보기 · 로컬에서는 표본까지 보인다');

  // ④ 스위치
  const noindex = /<meta name="robots" content="noindex">/.test(PAGE);
  if (R.live) {
    t(R.dresses.every((d) => !d.sample), '④ 켜졌다 — 표본은 지워야 한다');
    t(!noindex, '④ 켜졌다 — dress.html 의 noindex 줄을 지운다');
    t(/\/dress\.html/.test(SITEMAP), '④ 켜졌다 — sitemap.xml 에 /dress.html');
  } else {
    t(noindex, '④ 꺼짐 — dress.html 은 noindex');
  }
  t(/<div data-dress-on hidden[^>]*><a href="dress\.html" class="journal-guide-link">드레스 둘러보기 <span class="arrow">→<\/span><\/a><\/div>/.test(IDX), '④ 홈 «드레스 둘러보기 →»는 기존 외곽 단추 · 기본 hidden');
  t(/<span data-dress-off>대여 의상은 프리 사이즈\(44~88 내외\)로, 상담에서 직접 보고 확인하실 수 있습니다\.<\/span><span data-dress-on hidden>대여 의상은 프리 사이즈\(44~88 내외\)입니다\. 상담이 확정되면 마이페이지에서 입어 보실 두 벌을 미리 고르실 수 있습니다\.<\/span>/.test(INQ), '④ 신청서 Nº 03 Note — 지금 문장 · 켜질 문장(기본 hidden · 링크 없음)');
  for (const [nm, f] of [['홈', IDX], ['신청서', INQ]]) t(/<script src="\/assets\/dress-refs\.js" defer><\/script>/.test(f) && /window\.DRESS_REFS&&window\.DRESS_REFS\.live/.test(f), `④ ${nm}이 같은 원천의 스위치를 읽는다(defer)`);

  // ⑤ GAS 0
  for (const [nm, f] of [['dress.html', PAGE], ['dress-refs.js', src]]) {
    t(!/script\.google(usercontent)?\.com/.test(f), `⑤ ${nm} — GAS 주소 없음`);
    t(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon/.test(f.replace(/\/\*[\s\S]*?\*\//g, '')), `⑤ ${nm} — 서버를 부르는 길 없음`);
  }

  // ⑥ 서버 짝
  const dp = /var DRESS_PICK = \{([^}]*)\}/.exec(gas || '');
  const num = (k) => { const m = dp && new RegExp(k + ':\\s*(\\d+)').exec(dp[1]); return m ? +m[1] : null; };
  t(!!dp && num('untilDays') === R.changeUntilDays, '⑥ 서버 마감 일수 = 원천 changeUntilDays');
  t(!!dp && num('max') === R.pick, '⑥ 서버 벌 수 = 원천 pick');
  const da = /var DRESS_ANS = \{\s*len:\s*\[([^\]]*)\],\s*fit:\s*\[([^\]]*)\],\s*pref:\s*\[([^\]]*)\]/.exec(gas || '');
  const lst = (s) => s.split(',').map((x) => x.trim().replace(/^'|'$/g, '')).join();
  t(!!da && lst(da[1]) === qk('len') && lst(da[2]) === qk('fit') && lst(da[3]) === qk('pref'), '⑥ 서버 답 값(DRESS_ANS) = 원천 물음의 답 값');
  t(/case 'saveDressPick':\s*return jsonOut\(handleSaveDressPick\(body\)\);/.test(gas || ''), '⑥ doPost 가 saveDressPick 을 받는다');

  // ⑦ 금지어 — 원천의 글 · dress.html(주석 걷고) · 마이페이지 카드
  const BAN = ['추천', '맞춤', '담기', '하트', '커버', '콤플렉스', '피하세요', '체형', '골격', '—'];
  const strs = []; (function walk(o) { if (typeof o === 'string') strs.push(o); else if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') Object.keys(o).forEach((k) => walk(o[k])); })(JSON.parse(JSON.stringify(R)));
  const decom = (s) => s.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
  const card = (MP.match(/function renderDress\(d, boxArg, demo\)\{[\s\S]*?\n\}\n/) || [''])[0];
  const pick = (MP.match(/function openDressPicker\(dr, opt\)\{[\s\S]*?\n\}\n/) || [''])[0];
  t(!!card && !!pick, '⑦ 마이페이지 카드 · 겹화면 코드를 찾았다');
  const hay = [['원천', strs.join('\n')], ['dress.html', decom(PAGE)], ['마이페이지 카드', decom(card + pick)]];
  const hits = [];
  for (const [nm, h] of hay) for (const w of BAN) if (h.indexOf(w) > -1) hits.push(nm + ' «' + w + '»');
  t(!hits.length, '⑦ 고객 문구 금지어 0건' + (hits.length ? ' · ' + hits.join(', ') : ''));

  // ⑧ 마이페이지 · 관리자
  for (const [nm, f] of [['mypage', MP], ['admin', AD]]) t(/<script src="\/assets\/dress-refs\.js"><\/script>/.test(f), `⑧ ${nm} 가 같은 원천을 읽는다`);
  const io = (id) => MP.indexOf('id="' + id + '"');
  t(io('mp_consult') > -1 && io('mp_consult') < io('mp_dress') && io('mp_dress') < io('mp_fitting'), '⑧ 카드 자리 = 상담 → 시착 준비 → 시착 동의');
  t(/!R\.live \|\| d\.isException \|\| d\.product==='웨딩스냅' \|\| d\.stage!=='상담확정'/.test(card) && /c\.status==='승인완료' \|\| c\.status==='확정'/.test(card) && /자체 준비/.test(card), '⑧ 카드 판정 = 스위치 · 시그니처 · 상담확정 · 확정된 상담 · 자체 준비 아님');
  t(/if\(closed && !ids\.length\)\{ hide\(\); return; \}/.test(card) && /상담 날 다른 드레스로 바꿔 입어 보실 수도 있어요\./.test(card), '⑧ 마감 뒤 = 고른 게 있으면 바꾸기 없이 · 없으면 숨김');
  t(/cc-btn-ghost trk-act trk-act-min" data-dress-open>바꾸기</.test(card) && /class="cc-btn-ghost" data-dress-open[^>]*>드레스 둘러보기</.test(card), '⑧ 단추 격 = 스냅 기획 카드와 같다(외곽 · 글 단추)');
  t(/'\/dress\.html\?pick=1&embed=1&t='\+Date\.now\(\)/.test(pick) && /ev\.source!==fr\.contentWindow \|\| ev\.origin!==location\.origin/.test(pick), '⑧ 겹화면 = dress.html?pick=1&embed=1 · 같은 출처 · 그 창에서 온 말만');
  t(/get\('preview_card'\)!=='dress'/.test(MP) && /Dress Card Preview · 실제 저장 아님/.test(MP), '⑧ ?preview_card=dress — 로그인 없이 상태를 차례로(저장 없음)');
  t(/if\(opt\.demo\)\{ setTimeout\(function\(\)\{ ack\(true\); \}, 400\); return; \}/.test(pick), '⑧ 미리 보기에서는 저장을 부르지 않는다');

  // ⑨ 코워크 검토 1(10/23)
  t(/#pkBar\{position:sticky;bottom:0;z-index:5\}/.test(PAGE) && !/\.wz-bar\{position:sticky/.test(PAGE), '⑨ [DRESS_BAR_STICK] 붙는 것은 #pkBar(카드의 직계) — 막대에 sticky 를 걸면 붙을 자리가 없다');
  const badge = (/\.dr-badge\{[^}]*\}/.exec(PAGE) || [''])[0];
  t(!!badge && !/var\(--seal\)/.test(badge) && /box-shadow:inset 0 0 0 1px var\(--gold-deep\)/.test(badge), '⑨ [DRESS_BADGE_NOFILL] «Nº» 배지 = 흰 바탕 · 먹빛 글 · 금빛 테 한 겹(진사 칠 없음)');
  t(/if\(closed\)\{ subs=\[\(n===1\?'상담 전날 이 드레스를 준비해 둘게요\.':'상담 전날 이 두 벌을 준비해 둘게요\.'\), '상담 날 다른 드레스로 바꿔 입어 보실 수도 있어요\.'\]; \}/.test(card), '⑨ [DRESS_CLOSED_KEEP] 마감 뒤 카드 = «준비해 둘게요» + «바꿔 입어 보실 수도» 두 줄');
  t(/\(has \? '' : ' pk-skip'\)/.test(PAGE) && /\.wz-bar \.cc-btn\.pk-skip,\.wz-bar \.cc-btn\.pk-skip:hover\{background:var\(--card-white\)/.test(PAGE), '⑨ [DRESS_SKIP_SOFT] 답이 없을 때 «건너뛰기»는 옅은 단추');
  for (const [nm, f] of [['dress.html', PAGE], ['mypage', MP]]) t(f.indexOf('.wz-steps li.nav .wz-stepb{margin-bottom:calc(6px + 1.5em - 44px)}') > -1, `⑨ [WZ_STEPS_STILL] ${nm} — 지나온 걸음 단추가 진행 표시 높이를 키우지 않는다`);
  const d2 = R.dresses.find((d) => d.line === 'column') || R.dresses[0];
  const cellWant = [R.line(d2.line).ko, R.lengthOf(d2.length).ko, d2.fabric].join(' · ');
  t(typeof R.sumCell === 'function' && R.sumCell(d2) === cellWant, `⑨ [DRESS_SUM_ONE] 칸 한 줄 = 라인 · 길이 · 소재(«${cellWant}»)`);
  t(typeof R.sumDetail === 'function' && R.sumDetail(d2) === cellWant + ' · ' + d2.neck, '⑨ [DRESS_SUM_ONE] 자세히 = 라인 · 길이 · 소재 · 넥라인');
  t(/var sum = R\.sumCell\(d\);/.test(PAGE) && /esc\(R\.sumDetail\(d\)\)/.test(PAGE) && !/sumPick|sumPublic/.test(PAGE), '⑨ [DRESS_SUM_ONE] 공개 · 고르기가 같은 한 줄을 쓴다(옛 «넥라인 · 소재 · 라인» 없음)');
  const DUE = [['2026-10-25', '10월 23일(금)'], ['2026-03-01', '2월 27일(금)'], ['2027-01-01', '12월 30일(수)'], ['2026-11-02', '10월 31일(토)'], ['', ''], ['2026/10/25', '']];   // 기대값은 python datetime 으로 셈(눈대중 아님 · [DATE_DOW])
  t(typeof R.untilText === 'function' && DUE.every(([y, w]) => R.untilText(y) === w), '⑨ [DRESS_DUE_DATE] 마감 날 글 = 상담일 −2일 · 요일 계산(달 · 해 넘김 포함) · 못 읽으면 빈 글');
  t(/due=\(typeof R\.untilText==='function'\)\?R\.untilText\(dr\.ymd\):''/.test(card) && /'<div class="mp-dotln dr-due">'/.test(card) && /바꾸기는 '\+due\+'까지 할 수 있어요\./.test(card), '⑨ [DRESS_DUE_DATE] 카드 0 · 1 · 2벌 = 점 한 줄 «바꾸기는 …까지»(상담일을 못 읽으면 줄 없음)');
  t(/ymd:\(dr&&dr\.ymd\)\|\|''/.test(pick) && /if \(m && m\.ymd\) S\.due = R\.untilText\(m\.ymd\);/.test(PAGE) && />바꾸기는 ' \+ \(S\.due \? esc\(S\.due\) : '상담 이틀 전'\) \+ '까지 할 수 있어요\.</.test(PAGE), '⑨ [DRESS_DUE_DATE] 완료 화면도 날짜로(겹화면이 상담일을 넘긴다 · 단독은 «상담 이틀 전»)');
  t(/placeholder="신경 쓰이는 점이나 궁금한 점을 적어 주세요"/.test(PAGE), '⑨ 남길 말 칸 자리 표시 글');
  const slip = rd('assets/dress-refs/lines/slip.svg') || '';
  const pts = []; String((/ d="([^"]*)"/.exec(slip) || [])[1] || '').replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (m0, x, y) => { pts.push([+x, +y]); return m0; });
  const span = (f) => { const xs = pts.filter(f).map((q) => q[0]); return xs.length ? Math.max(...xs) - Math.min(...xs) : 0; };
  const hem = span((q) => q[1] === 188), waist = span((q) => q[1] >= 80 && q[1] <= 90);
  t(hem > 0 && waist > 0 && hem / waist <= 1.6, `⑨ 슬립 그림 — 밑단이 허리의 1.6배 안(곧게 떨어진다 · 머메이드로 읽히지 않게) · 지금 ${waist ? (hem / waist).toFixed(2) : '?'}배`);
  const GASALL = (function walk(d) { let out = ''; for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const q = d + '/' + e.name; if (e.isDirectory()) out += walk(q); else if (/\.gs$/.test(e.name)) out += rd(q) || ''; } return out; })('automation');
  t(GASALL.length > 0 && !/<a [^>]*color:#B89A75/i.test(GASALL), '⑨ [MAIL_LINK_INK] 메일 · GAS 화면의 글자 링크에 선 색(#B89A75)을 쓰지 않는다');
  return { bad, okn };
}

if (process.argv.includes('--selftest')) {
  // 깨 보기 — 모두 빨강이어야 이 검사를 믿는다
  const cases = [
    ['핏 짝 바꿈(엠파이어 → 허리)', SRC.replace("key: 'empire', en: 'Empire', ko: '엠파이어', fit: 'loose'", "key: 'empire', en: 'Empire', ko: '엠파이어', fit: 'waist'"), GAS],
    ['표본이 운영에 샌다', SRC.replace('return !(prod && d.sample);', 'return true;'), GAS],
    ['서버 마감 일수가 다르다', SRC, (GAS || '').replace('untilDays: 2,', 'untilDays: 3,')],
    ['줄 세우기 순서가 다르다(맞은 수 먼저)', SRC.replace('(x.down - y.down) || (y.hit - x.hit)', '(y.hit - x.hit) || (x.down - y.down)'), GAS],
    ['마감 날 요일이 하루 밀린다', SRC.replace("'일월화수목금토'.charAt(t.getUTCDay())", "'일월화수목금토'.charAt((t.getUTCDay() + 1) % 7)"), GAS],
    ['칸 한 줄에서 길이가 빠졌다', SRC.replace("return [l ? l.ko : '', g ? g.ko : '', d.fabric || ''].filter(Boolean).join(' · ');", "return [l ? l.ko : '', d.fabric || ''].filter(Boolean).join(' · ');"), GAS],
    ['막대에 다시 sticky(붙을 자리 없음)', SRC, GAS, PAGE0.replace('#pkBar{position:sticky;bottom:0;z-index:5}', '').replace('.wz-bar{display:flex;', '.wz-bar{position:sticky;bottom:0;display:flex;')],
    ['«Nº» 배지를 다시 진사로 칠함', SRC, GAS, PAGE0.replace('background:var(--card-white);color:var(--accent);box-shadow:inset 0 0 0 1px var(--gold-deep)', 'background:var(--seal);color:#fff')]
  ];
  let red = 0;
  for (const [nm, s, g, pg] of cases) { if (s === SRC && g === GAS && (!pg || pg === PAGE0)) { console.log('  selftest 틀을 못 만들었다 · ' + nm); continue; } const r = audit(s, g, pg || PAGE0); console.log((r.bad.length ? '  빨강 ' : '  초록?? ') + nm + (r.bad.length ? ' · ' + r.bad[0] : '')); if (r.bad.length) red++; }
  console.log(red === cases.length ? 'selftest OK — 깨면 빨강' : 'selftest FAIL — 깨도 초록인 칸이 있다');
  process.exit(red === cases.length ? 0 : 1);
}

const { bad, okn } = audit(SRC, GAS);
if (bad.length) { console.log('FAIL dress-refs ' + bad.length + '건'); bad.forEach((b) => console.log('  ✗ ' + b)); process.exit(1); }
console.log('ok dress-refs — ' + okn.length + '칸 통과(모양 · 줄 세우기 · 표본 · 스위치 · GAS 0 · 서버 짝 · 금지어 · 마이페이지)');
