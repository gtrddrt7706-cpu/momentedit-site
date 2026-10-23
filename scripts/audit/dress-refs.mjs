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
 * ⑩ 코워크 검토 2(10/23) — 자세히의 고르기 단추는 이름 · 한 줄 바로 아래(분위기 · 소품은 그 아래) · 사진 넘김은 사진 위 · 짧은 화면에서 사진 칸 상한 ·
 *    반투명 면 없음. 단추가 막대 위에 «보이는가»는 숫자로 scripts/audit/dress-fit.mjs 가 잰다(브라우저)
 * ⑪ 코워크 검토 4(10/23 · 배포 전 전면 재검토) — 켜기 조건(실물 4벌 · 모두 사진 · ex 는 사진 있는 장만 [DRESS_LIVE_READY]) · 신청서 Note 한 덩어리 ·
 *    나가기 판([DRESS_EXIT_ASK]) · 안 고르면 한 줄 · 시착비 칸(홈 · 신청서 · 시착 동의서와 숫자 대조 [DRESS_FIT_FEE]) · 사진 먼저 · 한 폭 · 라인 한 문장 ·
 *    닫기 자리 · 다음 드레스 · 인트로 걷기 · 질문 없이 바로 보기 · 답 글 · 단추 위계 · 남길 말 완료 화면 · 카드 말 · 홈 단추 자리 · 숫자 모양 · 결정 대기 글 없음
 *
 * 종료: 0 통과 · 1 어긋남 · 2 못 쟀다(원천 없음)
 * ★깨 보고 믿는다 — --selftest 는 일부러 틀린 원천(핏 짝 바꿈 · 표본 운영 노출 · 마감 일수 다름 …)을 넣어 모두 빨강이 되는지 본다.
 *   켜기 조건은 «다 갖춘 켠 사본»이 초록인지 먼저 보고(대조), 거기서 한 가지씩 깨서(표본만 · 사진 없음 · 4벌 미만 · ex 빈 장) 각각 빨강인지 본다.
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

function audit(src, gas, PAGE = PAGE0, MP = MP0, X = {}) {
  const SITE = X.SITE != null ? X.SITE : SITEMAP, INQX = X.INQ != null ? X.INQ : INQ, IDXX = X.IDX != null ? X.IDX : IDX;
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
    t(!!(l.en && l.ko && l.lead && l.svg) && typeof l.note === 'string', `① ${l.key} 칸(en · ko · lead · svg · note 는 글)`);
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
    t(/\/dress\.html/.test(SITE), '④ 켜졌다 — sitemap.xml 에 /dress.html');
    /* ★[DRESS_LIVE_READY 2026-10-23 코워크 검토 4] 켤 때 할 일 ㄹ — 사진 없이 켜면 공개 칸이 라인 그림만 남고(같은 라인끼리 같은 그림 · 미니 · 미디도 바닥 길이) · 0벌이면 공개 그리드가 통째로 빈다 */
    const real = R.dresses.filter((d) => !d.sample);
    t(real.length >= 4, `④ [DRESS_LIVE_READY] 켜졌다 — 실물 4벌 이상(지금 ${real.length}벌)`);
    t(real.length > 0 && real.every((d) => !!d.img), '④ [DRESS_LIVE_READY] 켜졌다 — 모든 드레스에 사진(img)' + (real.filter((d) => !d.img).length ? ' · 없음 ' + real.filter((d) => !d.img).map((d) => d.id).join(', ') : ''));
    t(real.every((d) => (d.ex || []).every((e) => !!(e && e.img))), '④ [DRESS_LIVE_READY] 켜졌다 — 넘겨 보는 사진(ex)은 사진이 있는 장만');
  } else {
    t(noindex, '④ 꺼짐 — dress.html 은 noindex');
  }
  t(/<div data-dress-on hidden[^>]*><a href="dress\.html" class="journal-guide-link" style="margin-left:0;margin-right:0">드레스 둘러보기 <span class="arrow">→<\/span><\/a><\/div>/.test(IDXX), '④ 홈 «드레스 둘러보기 →»는 기존 외곽 단추 · 기본 hidden · 폰에서 사진과 같은 좌우 끝');
  /* ★[DRESS_NOTE_ONE 2026-10-23 코워크 검토 4] Nº 03 Note 는 글 한 덩어리 — 줄이 flex 라 span 과 맨 글이 따로 칸이 되면 스위치가 꺼져 있어도 두 단으로 갈라진다(운영 신청서가 깨진다).
     켜질 글은 data-dress-text 에 통째로 두고 스크립트가 바꾼다(꺼짐 = 종전과 같은 글 한 덩어리 · 픽셀까지 같다) */
  const NOTE_TAIL = ' 시착(기본 2벌)은 상담 당일 동의 후 진행됩니다. 계약을 진행하지 않으시면 시착하신 벌수만큼(1벌 50,000원 · 최대 100,000원) 차감되고 나머지 예약금은 환불됩니다.';
  const NOTE_HTML = '<span class="accent">Note</span><span data-dress-text="대여 의상은 프리 사이즈(44~88 내외)입니다. 상담이 확정되면 마이페이지에서 입어 보실 두 벌을 미리 고르실 수 있습니다.' + NOTE_TAIL + '">대여 의상은 프리 사이즈(44~88 내외)로, 상담에서 직접 보고 확인하실 수 있습니다.' + NOTE_TAIL + '</span>\n';
  t(INQX.indexOf(NOTE_HTML) > -1, '④ [DRESS_NOTE_ONE] 신청서 Nº 03 Note — «Note» 뒤 글 한 덩어리(지금 문장) · 켜질 문장은 data-dress-text(링크 없음)');
  const noteRow = (INQX.match(/<div class="compact-row-note">[\s\S]*?<\/div>/g) || []).find((x) => /대여 의상/.test(x)) || '';
  t(!!noteRow && !/data-dress-(on|off)/.test(noteRow) && (noteRow.match(/<span/g) || []).length === 2, '④ [DRESS_NOTE_ONE] 신청서 Note 줄에 칸은 둘뿐(«Note» · 글 한 덩어리) — 글을 span 으로 쪼개지 않는다');
  t(/document\.querySelectorAll\('\[data-dress-text\]'\)\.forEach\(function\(el\)\{el\.textContent=el\.getAttribute\('data-dress-text'\);\}\);/.test(INQX), '④ [DRESS_NOTE_ONE] 켜지면 data-dress-text 글로 통째로 바꾼다');
  for (const [nm, f] of [['홈', IDXX], ['신청서', INQX]]) t(/<script src="\/assets\/dress-refs\.js" defer><\/script>/.test(f) && /window\.DRESS_REFS&&window\.DRESS_REFS\.live/.test(f), `④ ${nm}이 같은 원천의 스위치를 읽는다(defer)`);

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
  t(/var obtn=function\(t\)\{ return '<button type="button" class="cc-btn-ghost" data-dress-open style="margin-top:14px">'\+t\+'<\/button>'; \};/.test(card) && /btn=obtn\('두 벌 고르기'\)/.test(card) && /btn=obtn\('이어서 고르기'\)/.test(card) && /btn=obtn\('바꾸기'\)/.test(card) && !/trk-act-min|드레스 둘러보기/.test(card), '⑧ [DRESS_CARD_WORDS] 0 · 1 · 2벌 단추 = 같은 자리 · 같은 외곽 단추(두 벌 고르기 · 이어서 고르기 · 바꾸기)');
  t(/'\/dress\.html\?pick=1&embed=1&t='\+Date\.now\(\)/.test(pick) && /ev\.source!==fr\.contentWindow \|\| ev\.origin!==location\.origin/.test(pick), '⑧ 겹화면 = dress.html?pick=1&embed=1 · 같은 출처 · 그 창에서 온 말만');
  t(/get\('preview_card'\)!=='dress'/.test(MP) && /Dress Card Preview · 실제 저장 아님/.test(MP), '⑧ ?preview_card=dress — 로그인 없이 상태를 차례로(저장 없음)');
  t(/if\(opt\.demo\)\{ setTimeout\(win, 400\); return; \}/.test(pick) && /var win=function\(\)\{ saved=true; failCode=''; if\(toExit\)\{ done\(\); return; \} ack\(true\); \};/.test(pick), '⑧ 미리 보기에서는 저장을 부르지 않는다(성공과 같은 길 · 나가기면 닫는다)');

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
  // ⑩ 코워크 검토 2(10/23) — 자세히 첫 화면에서 고르기 단추가 막대 위에(숫자는 dress-fit.mjs)
  const iSum = PAGE.indexOf("'<p class=\"dv-sum\">'"), iCtl = PAGE.indexOf("(ctl ? '<div class=\"pk-ctl\">' + ctl + '</div>' : '')"), iMood = PAGE.indexOf("'<p class=\"dv-mood\">'");
  t(iSum > -1 && iCtl > iSum && iMood > iCtl, '⑩ [DRESS_DETAIL_FIT] 자세히 = 이름 · 한 줄 → 고르기 단추 → 분위기 · 어울리는 소품');
  t(/detailHTML\(d, 'pick', ctl\)/.test(PAGE) && !/'<div class="pk-ctl">' \+ ctl \+ '<\/div>';\s*\n\s*\}/.test(PAGE), '⑩ [DRESS_DETAIL_FIT] 고르기 화면은 단추를 자세히 안에 넘긴다(사진 · 글 뒤에 따로 붙이지 않는다)');
  t(/class="dv-arr dv-prev"/.test(PAGE) && /class="dv-arr dv-next"/.test(PAGE) && !/class="dv-nav"/.test(PAGE) && /\.dv-arr\{position:absolute;top:50%/.test(PAGE), '⑩ [DRESS_DETAIL_FIT] 사진 넘김(‹ › · n / 5)은 사진 위 — 사진 아래 줄로 돌아가면 단추가 다시 내려간다');
  t(PAGE.indexOf('.pk-main .dv-view{max-width:360px;max-width:min(360px,max(150px,calc((100vh - 430px) * 0.75)));max-width:min(360px,max(150px,calc((100dvh - 430px) * 0.75)))}') > -1, '⑩ [DRESS_DETAIL_FIT] 짧은 화면에서 사진 칸 상한(3:4 그대로)');
  t(/class="pk-picked"><span class="dr-badge">/.test(PAGE) && /<button type="button" class="pk-txt" data-act="unpick">빼기<\/button><\/div>/.test(PAGE), '⑩ 명세 «고른 드레스예요 · 빼기» 한 줄');
  t(!/rgba\(255,\s*255,\s*255,\s*0?\.\d+\)/.test(PAGE.replace(/linear-gradient\([^)]*\)[^;]*;/g, '')), '⑩ 사진 위 이름표 · 넘김에 반투명 면 없음([GLASS_MENU_OWNER] «새 반투명 면 금지» · 막대의 흐려지는 15px 그라디언트는 제외)');
  const FITSRC = rd('scripts/audit/dress-fit.mjs') || '';
  t(/DRESS_DETAIL_FIT/.test(FITSRC) && /\[390, 844, true\], \[390, 740, true\], \[1280, 900, true\]/.test(FITSRC) && /ctlBottom > m\.barTop/.test(FITSRC), '⑩ dress-fit.mjs 가 세 크기 × 네 상태를 잰다(390×844 · 390×740 · 1280×900)');

  // ⑪ 코워크 검토 4(10/23) — 배포 전 전면 재검토
  const JS = (PAGE.match(/<script>\n\/\* ★★\[DRESS_PAGE\][\s\S]*?<\/script>/) || [''])[0];
  const fnOf = (name) => (JS.match(new RegExp('function ' + name + '\\([^)]*\\)\\{[\\s\\S]*?\\n  \\}\\n')) || [''])[0];
  t(!!JS, '⑪ 고르기 · 공개 화면 스크립트를 찾았다');
  // [DRESS_LINE_ONE] 라인 설명 한 문장 · 함께 볼 점은 슬립 · 컬럼 둘(명세 글 그대로)
  const LINE_TX = { slip: ['얇은 새틴이 몸을 따라 흐르는 라인입니다.', '누드톤 심리스 속옷을 함께 준비하시면 좋습니다.'], column: ['위에서 아래로 곧게 떨어지는 단정한 라인입니다.', '앉고 걷는 품을 시착 때 함께 확인해 보세요.'],
    aline: ['허리에서 아래로 가볍게 퍼지는 라인입니다.', ''], empire: ['가슴 아래에서 허리선이 잡혀 조이지 않는 편안한 라인입니다.', ''], twopiece: ['상의와 치마가 나뉘어 볼레로나 재킷을 더하기 좋은 구성입니다.', ''] };
  t(R.lines.every((l) => LINE_TX[l.key] && l.lead === LINE_TX[l.key][0] && l.note === LINE_TX[l.key][1]), '⑪ [DRESS_LINE_ONE] 라인 설명 = 한 문장씩 · 함께 볼 점은 슬립 · 컬럼 둘(명세 글 그대로)');
  t(/\(l\.note \? '<p class="dotln">' \+ esc\(l\.note\) \+ '<\/p>' : ''\)/.test(JS), '⑪ [DRESS_LINE_ONE] 함께 볼 점은 있을 때만 점 한 줄([NOTE_DOT])');
  // [DRESS_Q_WORDS] 물음 · 답 글
  const qOf = (k) => R.questions.find((q) => q.key === k) || { opts: [] };
  t(qOf('len').opts.map((o) => o[1]).join('|') === '발목까지|미디(종아리)|미니(무릎 근처)|아직 몰라요', '⑪ [DRESS_Q_WORDS] 길이 답 = 발목까지 · 미디(종아리) · 미니(무릎 근처) · 아직 몰라요(칸 한 줄의 «미디 · 미니»와 이어진다)');
  t(qOf('pref').q === '이런 드레스가 편하신가요?' && qOf('pref').opts.map((o) => o[1]).join('|') === '노출이 적은 드레스|소매나 볼레로가 있는 드레스', '⑪ [DRESS_Q_WORDS] 셋째 물음 = «이런 드레스가 편하신가요?» · 노출이 적은 드레스 · 소매나 볼레로가 있는 드레스');
  const figs = qOf('fit').figs || {};
  t(['body', 'waist', 'loose'].every((k) => figs[k] && R.line(figs[k]) && R.line(figs[k]).fit === k) && figs.body === 'slip' && figs.waist === 'aline' && figs.loose === 'empire', '⑪ [DRESS_Q_WORDS] 핏 답 왼쪽 그림 = 슬립 · 라이트 A라인 · 엠파이어(그 라인의 핏과 같은 답)');
  t(/var ln = figs\[o\[0\]\] \? R\.line\(figs\[o\[0\]\]\) : null;/.test(fnOf('qHTML')) && /class="pk-ofig" aria-hidden="true"/.test(fnOf('qHTML')), '⑪ [DRESS_Q_WORDS] 핏 답에 작은 라인 그림(«아직 몰라요»는 빈 자리로 글 시작을 맞춘다)');
  // [DRESS_NO_INTRO] [DRESS_SKIP_Q] [DRESS_NO_PICK_OK]
  t(!/function introHTML|data-act="ask"|몇 가지 답하고 보기|바로 둘러보기/.test(JS) && /var S = \{ view: 'q', q: 0,/.test(JS), '⑪ [DRESS_NO_INTRO] 인트로 없음 — 열면 첫 물음부터');
  t(/<p class="pk-solo" id="pkSolo" hidden>이 화면에서 고른 것은 저장되지 않아요<\/p>/.test(PAGE) && /if \(!EMBED\) \$\('pkSolo'\)\.hidden = false;/.test(JS), '⑪ [DRESS_NO_INTRO] 단독(?pick=1)일 때만 머리 아래 «이 화면에서 고른 것은 저장되지 않아요»');
  t(/'<button type="button" class="pk-txt pk-skipq" data-act="browse">질문 없이 바로 보기 <span aria-hidden="true">&rsaquo;<\/span><\/button>'/.test(fnOf('qHTML')), '⑪ [DRESS_SKIP_Q] 물음마다 «질문 없이 바로 보기»');
  t(/\(i === 0 \? '<p class="dotln pk-q-dot">고르지 않으셔도 상담 날 함께 골라요\.<\/p>' : ''\)/.test(fnOf('qHTML')) && /'고르지 않으셔도 상담 날 함께 골라요\.'\]; btn=obtn\('두 벌 고르기'\)/.test(card), '⑪ [DRESS_NO_PICK_OK] 첫 물음 · 카드 0벌에 «고르지 않으셔도 상담 날 함께 골라요.»');
  t(/\(S\.q > 0 \? '<button type="button" class="cc-btn-ghost" data-go="-1">이전<\/button>' : ''\)/.test(fnOf('barHTML')), '⑪ [DRESS_NO_INTRO] 첫 물음 막대에는 «이전»이 없다(갈 곳이 없다 · 스냅 기획 첫 걸음과 같다)');
  // [DRESS_PICK_TIER] 진한 단추가 한 화면에 둘 서지 않게
  const dph = fnOf('detailPickHTML');
  t(/else if \(!count\(\)\) ctl = '<button type="button" class="cc-btn" data-act="pick">입어 볼 드레스로 고르기<\/button>';/.test(dph) && /else ctl = '<button type="button" class="cc-btn-ghost" data-act="pick">Nº 0' \+ \(S\.picks\.indexOf\(null\) \+ 1\) \+ '로 고르기<\/button>';/.test(dph), '⑪ [DRESS_PICK_TIER] 자세히 = 0벌이면 칠한 «입어 볼 드레스로 고르기» · 한 벌 뒤에는 외곽 «Nº 02로 고르기»');
  t(/c === 0 \? '드레스를 골라 주세요'/.test(fnOf('barHTML')) && !/두 벌을 골라 주세요/.test(PAGE), '⑪ [DRESS_PICK_TIER] 막대 0벌 = «드레스를 골라 주세요»(«두 벌»이라 하지 않는다 · 한 줄)');
  // [DRESS_FIT_FEE] 시착비 — 숫자를 홈 가격표 · 신청서 · 시착 동의서와 대조
  const J70 = rd('automation/platform/70_journey.gs') || '';
  const FEE = ['시착은 상담 당일 기본 2벌이며, 3벌째부터 1벌당 50,000원입니다.', '상담이 확정되면 마이페이지에서 입어 보실 두 벌을 미리 고르실 수 있고, 상담 전날 준비해 둡니다. 고르지 않으셔도 상담 날 함께 고릅니다.', '본 계약을 진행하지 않으시면 시착하신 벌수만큼(1벌당 50,000원 · 최대 100,000원) 예약금에서 차감되고 나머지는 환불됩니다.'];
  t(FEE.every((x) => PAGE.indexOf('<p class="fit-p">' + x + '</p>') > -1), '⑪ [DRESS_FIT_FEE] 공개 시착 칸 세 문장(기본 2벌 · 3벌째부터 · 차감)');
  const DOTS = ['준비해 오시면 좋습니다 · 누드톤 심리스 속옷과 실리콘 브라, 예식 날 신을 굽 높이의 신발', '대여 드레스는 1벌이 기본으로 포함되며, 2벌부터는 추가 비용이 있습니다.', '직접 준비하신 드레스로도 진행하실 수 있습니다.'];
  const fitDots = ((PAGE.match(/<div class="fit-dots">([\s\S]*?)<\/div>/) || ['', ''])[1].match(/<p class="dotln">[^<]*<\/p>/g) || []).map((x) => x.replace(/<[^>]+>/g, ''));
  t(JSON.stringify(fitDots) === JSON.stringify(DOTS), '⑪ [DRESS_FIT_FEE · DRESS_RENT_ONE] 시착 칸 점 줄 셋 — 준비해 오시면 좋습니다 · 대여 1벌 기본 포함 · 직접 준비하신 드레스(이 차례)' + (JSON.stringify(fitDots) === JSON.stringify(DOTS) ? '' : ' · 지금 ' + JSON.stringify(fitDots)));
  t(J70.indexOf("'드레스 시착은 2벌까지 포함됩니다. (3벌째부터 1벌당 50,000원)'") > -1 && J70.indexOf('실제 진행한 벌수만큼(1벌당 50,000원 · 최대 100,000원) 예약금이 시착 비용으로 공제되고 나머지는 전액 환불됩니다') > -1, '⑪ [DRESS_FIT_FEE] 시착 동의서(70_journey FITTING_CONSENT) = 2벌 포함 · 3벌째부터 1벌당 50,000원 · 최대 100,000원 — 공개 칸과 같은 숫자');
  t(IDXX.indexOf('<li>드레스 시착 <span class="li-meta">상담 당일 · 기본 2벌</span></li>') > -1 && IDXX.indexOf('<li>추가 시착 <span class="li-price">₩50,000<span class="li-meta">/벌 · 3벌째부터</span></span></li>') > -1, '⑪ [DRESS_FIT_FEE] 홈 가격표 = 상담 당일 · 기본 2벌 · ₩50,000/벌 · 3벌째부터 — 공개 칸과 같은 숫자');
  t(INQX.indexOf('시착(기본 2벌)은 상담 당일 동의 후 진행됩니다. 계약을 진행하지 않으시면 시착하신 벌수만큼(1벌 50,000원 · 최대 100,000원) 차감되고 나머지 예약금은 환불됩니다.') > -1, '⑪ [DRESS_FIT_FEE] 신청서 Nº 03 = 기본 2벌 · 최대 100,000원 · 차감 — 공개 칸과 같은 숫자');
  t(/<p class="pk-bar-note">안 입은 드레스는 시착비가 들지 않아요\.<\/p>/.test(PAGE) && !/입지 않으면 차감되지 않아요/.test(PAGE), '⑪ [DRESS_FIT_FEE] 고르기 막대 한 줄 = «안 입은 드레스는 시착비가 들지 않아요.»');
  t(/<p class="dotln">입어 볼지는 상담 날 정하셔도 돼요\.<\/p>/.test(fnOf('doneHTML')), '⑪ [DRESS_FIT_FEE] «입어 볼지는 상담 날 정하셔도 돼요»는 완료 화면');
  // [DRESS_MEMO_DONE] 남길 말 = 완료 화면 · «남기기»
  t(/id="pkMemo"/.test(fnOf('doneHTML')) && !/pkMemo/.test(fnOf('listHTML')) && /id="pkLeave" data-act="leave"/.test(fnOf('doneHTML')) && /디렉터에게 남길 말 <span>\(선택\)<\/span>/.test(fnOf('doneHTML')), '⑪ [DRESS_MEMO_DONE] 남길 말은 완료 화면(«디렉터에게 남길 말 (선택)» + 작은 «남기기») · 목록에는 없다');
  t(/\.pk-fig\{width:140px/.test(PAGE) && /<span class="dr-badge" aria-hidden="true">' \+ n \+ '<\/span>/.test(fnOf('doneHTML')), '⑪ [DRESS_MEMO_DONE] 완료 화면 그림 140px · Nº 01 · Nº 02 표시');
  // [DRESS_EXIT_ASK] 나가기 판 — 마이페이지 입력 화면과 같은 규칙 · 같은 판
  const op = (MP.match(/function openDressPicker\(dr, opt\)\{[\s\S]*?\n\}\n/) || [''])[0];
  t(/<span class="wiz-acts"><button type="button" class="wiz-exit wiz-save" id="pkSave" disabled>저장<\/button><button type="button" class="wiz-exit" id="pkExit">나가기<\/button><\/span>/.test(PAGE), '⑪ [DRESS_EXIT_ASK] 머리 알약 «저장 · 나가기»(마이페이지 .wiz-acts 와 같은 모양)');
  t(/type: 'momentedit:dressExit'/.test(fnOf('exit')) && /type: 'momentedit:dressState', dirty: dirty\(\), failed: !!S\.failed, busy: !!S\.busy/.test(fnOf('syncState')), '⑪ [DRESS_EXIT_ASK] 겹화면은 나가기를 부모에게 묻고 «바뀐 게 있나 · 실패 · 저장 중»을 알린다');
  t(/function keyOf\(ids, memo\)\{ return JSON\.stringify\(\[ids, String\(memo \|\| ''\)\.trim\(\)\]\); \}/.test(JS) && /S\.base = keyOf\(ok, sv \? String\(sv\.memo \|\| ''\)\.slice\(0, 200\) : ''\);/.test(JS), '⑪ [DRESS_EXIT_ASK] «바뀐 게 있나» = 고른 두 벌 · 남길 말 대 서버 저장본(기준선은 채움 · 저장 성공 때)');
  t(/mpConfirm\(\{ title:st\.failed\?'저장이 아직 안 됐어요':'저장하지 않은 변경이 있어요',/.test(op) && /'저장하고 나갈까요\? 저장하지 않으면 방금 고치신 내용은 남지 않아요\.'/.test(op) && /yes:'저장하고 나가기', no:'그냥 나가기', dismissNull:true/.test(op), '⑪ [DRESS_EXIT_ASK] 판 = 마이페이지 입력 화면의 그 판(저장하지 않은 변경이 있어요 · 저장하고 나가기 · 그냥 나가기 · 닫으면 그대로)');
  t(/if\(!st\.dirty && !st\.failed\)\{ done\(\); return; \}/.test(op) && /var _bkId=bkOpen\(function\(\)\{ askExit\(true\); \}\);/.test(op) && /if\(e\.key==='Escape' && document\.activeElement!==fr\) askExit\(false\);/.test(op) && /if\(m\.type==='momentedit:dressExit'\)\{ askExit\(false\); return; \}/.test(op), '⑪ [DRESS_EXIT_ASK] 바뀐 게 없으면 바로 닫힌다 · 머리 «나가기» · 뒤로가기 · Esc 셋이 한 곳(askExit)을 지난다');
  t(/if\(st\.busy\)\{ exitWait=true;/.test(op) && /var win=function\(\)\{ saved=true; failCode=''; if\(toExit\)\{ done\(\); return; \} ack\(true\); \};/.test(op), '⑪ [DRESS_EXIT_ASK] 저장 중이면 기다렸다 판단 · «저장하고 나가기»는 저장이 닿은 뒤에 닫는다');
  // [DRESS_SOLO_NOSAVE] 단독(?pick=1)은 저장이 없다 — «저장» · «남기기»를 숨기고(마이페이지 스냅 동의 전과 같은 꼴) 저장한 척하지 않는다
  const svSolo = (fnOf('save').match(/if \(!EMBED\) \{[\s\S]*?\n    \}/) || [''])[0];
  t(PAGE.indexOf('html.pk-alone #pkSave,html.pk-alone #pkLeave{display:none}') > -1 && /if \(!EMBED\) document\.documentElement\.classList\.add\('pk-alone'\);/.test(JS), '⑪ [DRESS_SOLO_NOSAVE] 단독이면 머리 «저장» · 완료 «남기기»를 숨긴다');
  t(!!svSolo && !/S\.saved|S\.left|S\.base/.test(svSolo) && /go\('done'\)/.test(svSolo), '⑪ [DRESS_SOLO_NOSAVE] 단독은 저장한 척하지 않는다(«저장됨 · 남겼어요» 없음) · 막대 단추는 완료 화면으로 넘기기만');
  // [DRESS_SLIDES] 사진 있는 장만 · 한 장이면 넘김 없음
  const Rs = load(src);
  t(typeof Rs.slides === 'function' && JSON.stringify(Rs.slides({ img: 'a', ex: [{ t: '앞', img: 'b' }, { t: '뒤' }] })) === '[{"img":"b","t":"앞"}]' && JSON.stringify(Rs.slides({ img: 'a', ex: [{ t: '앞' }] })) === '[{"img":"a","t":""}]', '⑪ [DRESS_SLIDES] 넘겨 보는 사진 = 사진 있는 장만 · 없으면 대표 사진 한 장');
  t(/var sl = R\.slides\(d\), n = sl\.length;/.test(fnOf('detailHTML')) && /\(n > 1 \? '<button type="button" class="dv-arr dv-prev"/.test(fnOf('detailHTML')), '⑪ [DRESS_SLIDES] 한 장이면 ‹ › 와 «n / 5»를 두지 않는다');
  // [DRESS_PHOTO_FIRST] [DRESS_ONE_WIDTH] [DRESS_CLOSE_IN] [DRESS_NEXT_ONE]
  const order = ['class="hero-ph"', 'class="hero-title"', 'id="hDress"', 'id="hLine"', 'id="hLen"', 'id="hFit"', 'id="hGroom"', 'class="cta-btn"'].map((x) => PAGE.indexOf(x));
  t(order.every((x, i) => x > -1 && (i === 0 || x > order[i - 1])), '⑪ [DRESS_PHOTO_FIRST] 순서 = 사진 → 제목 → 드레스 → 라인 → 길이 → 시착 → 신랑 → 단추');
  t(/<div class="hero-ph"><picture><source type="image\/webp" srcset="\/assets\/home\/styling\.webp"><img src="\/assets\/home\/styling\.jpg"/.test(PAGE), '⑪ [DRESS_PHOTO_FIRST] 머리 사진 = 홈 Styling 섹션과 같은 사진');
  t(/\.sec\{max-width:var\(--wide\);/.test(PAGE) && !/sec-wide/.test(PAGE), '⑪ [DRESS_ONE_WIDTH] 섹션 이름 · 그리드가 한 내용 폭(같은 왼쪽 끝)');
  t(/\.dv-top\{[^}]*max-width:880px;margin:0 auto;/.test(PAGE), '⑪ [DRESS_CLOSE_IN] «닫기»는 내용 칸 안 오른쪽 위');
  t(/return l\[\(i \+ 1\) % l\.length\]\.id;/.test(fnOf('nextOf')) && /다음 드레스 <span aria-hidden="true">&rsaquo;<\/span>/.test(fnOf('detailHTML')), '⑪ [DRESS_NEXT_ONE] 글 아래 «다음 드레스 ›» — 마지막이면 처음으로');
  // [DRESS_NUM_LINING] 숫자 모양
  t(/\.dr-badge\{[^}]*font-variant-numeric:lining-nums/.test(PAGE) && /\.pk-slot\{[^}]*font-variant-numeric:lining-nums/.test(PAGE) && /\.dr-th-empty\{[^}]*font-variant-numeric:lining-nums/.test(MP), '⑪ [DRESS_NUM_LINING] Nº 칸 · 배지 · 카드 번호 = lining-nums(«Nº o1»로 읽히지 않게)');
  // [DRESS_HOME_BELOW] 홈 단추는 사진 아래 · 사진도 같은 곳으로 · 단추 글 가운데
  const iPh = IDXX.indexOf('data-dress-photo style="height:380px'), iLk = IDXX.indexOf('<div data-dress-on hidden style="margin:24px 0 0"><a href="dress.html" class="journal-guide-link" style="margin-left:0;margin-right:0">');
  t(iPh > -1 && iLk > iPh && iLk - iPh < 700, '⑪ [DRESS_HOME_BELOW] 홈 «드레스 둘러보기»는 사진 바로 아래');
  t(/document\.querySelectorAll\('\[data-dress-photo\]'\)\.forEach\(function\(el\)\{var a=document\.createElement\('a'\);a\.href='dress\.html';a\.tabIndex=-1;a\.setAttribute\('aria-hidden','true'\);/.test(IDXX) && /\.journal-guide-link \{\n  display: inline-block;\n  text-align: center;/.test(IDXX), '⑪ [DRESS_HOME_BELOW] 켜지면 사진도 같은 곳으로(키보드 · 화면 읽기는 단추 하나) · 단추 글 가운데');
  // ★[DRESS_DECIDED_1023 코워크 회신 4 보충 · 사장님 «너가 홈페이지 뒤져서 찾아봐»] 결정 대기 셋(맞추는 방식 · 대여 포함 · 두 번째 의상)을 사이트 · 계약서 근거로 닫았다
  //   [DRESS_RENT_ONE] 대여 = 1벌 기본 포함 · 2벌부터 추가 비용 — 신청서 «대여 희망 벌 수»와 같은 뜻 · 금액은 쓰지 않는다(2벌째 금액은 어디에도 없다)
  const rentDots = (decom(PAGE).match(/<p class="dotln">[^<]*대여[^<]*<\/p>/g) || []).map((x) => x.replace(/<[^>]+>/g, ''));
  t(INQX.indexOf('<span class="conditional-sub">1벌 기본 포함 · 2벌부터 추가금 발생</span>') > -1 && rentDots.length === 1 && rentDots[0] === DOTS[1], '⑪ [DRESS_RENT_ONE] 공개 시착 칸 «대여 드레스는 1벌이 기본으로 포함되며, 2벌부터는 추가 비용이 있습니다.» = 신청서 «1벌 기본 포함 · 2벌부터 추가금 발생»과 같은 뜻');
  t(!rentDots.some((x) => /[0-9][0-9,]*\s*원|₩/.test(x)), '⑪ [DRESS_RENT_ONE] 대여 줄에 금액이 없다(2벌째 금액은 시그니처 쪽 어디에도 없다)' + (rentDots.length ? ' · ' + rentDots.join(' / ') : ''));
  //   [DRESS_KNEE_SECOND] 미니 = «두 번째 의상»은 쓰되 다이닝 자리는 쓰지 않는다(140분 Farewell 환복 뒤 다이닝 · 대여 드레스로 식당에 가지 않는다)
  const knee = R.lengthOf('knee');
  t(!!knee && knee.note === '무릎 근처 길이로, 가볍고 경쾌해 두 번째 의상으로도 잘 어울립니다.', '⑪ [DRESS_KNEE_SECOND] 미니 설명 «무릎 근처 길이로, 가볍고 경쾌해 두 번째 의상으로도 잘 어울립니다.»' + (knee ? '' : ' · knee 없음'));
  //   [DRESS_CALF_FRESH 코워크 회신 5] 미디 «산뜻합니다» — 길이 설명의 «경쾌»는 미니 한 번만(이웃 줄에 같은 낱말 두 번 없음)
  const calf = R.lengthOf('calf');
  t(!!calf && calf.note === '종아리 길이로, 구두까지 보여 산뜻합니다.' && R.lengths.filter((g) => String(g.note || '').indexOf('경쾌') > -1).length === 1, '⑪ [DRESS_CALF_FRESH] 미디 «종아리 길이로, 구두까지 보여 산뜻합니다.» · 길이 설명의 «경쾌»는 미니 한 번만');
  const meal = [strs.join('\n'), decom(PAGE)].some((x) => x.indexOf('식사') > -1);
  t(!meal, '⑪ [DRESS_KNEE_SECOND] 드레스 글에 «식사»가 없다 — 대여 드레스는 다이닝 자리에 입고 가지 않는다');
  //   [DRESS_FITNOTE_EMPTY] 맞추는 방법은 어디에도 없다 — 지어 쓰지 않고 빈 값 · 머리 본문이 그 몫
  t(R.fitNote === '' && PAGE.indexOf('대여 드레스는 프리 사이즈(44~88 내외)이며, 상담 날 예식 공간에서 직접 입어 보실 수 있습니다.') > -1, '⑪ [DRESS_FITNOTE_EMPTY] fitNote 빈 값(줄 없음) · 머리 본문 «상담 날 예식 공간에서 직접 입어 보실 수 있습니다»');
  const banned = ['두 번째 착장', '갈아입', '대여료', '추가금'].filter((w) => strs.join('\n').indexOf(w) > -1 || decom(PAGE).indexOf(w) > -1);
  t(!banned.length, '⑪ [DRESS_DECIDED_1023] 쓰지 않는 낱말 없음(옛 «두 번째 착장» · 갈아입기 · 대여료 · «추가금» — 공개 글은 «추가 비용»)' + (banned.length ? ' · ' + banned.join(', ') : ''));
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
    ['«Nº» 배지를 다시 진사로 칠함', SRC, GAS, PAGE0.replace('background:var(--card-white);color:var(--accent);box-shadow:inset 0 0 0 1px var(--gold-deep)', 'background:var(--seal);color:#fff')],
    ['고르기 단추를 다시 사진 · 글 뒤로', SRC, GAS, PAGE0.replace("      + (ctl ? '<div class=\"pk-ctl\">' + ctl + '</div>' : '')", '').replace("      + (nx ? '<button", "      + (ctl ? '<div class=\"pk-ctl\">' + ctl + '</div>' : '')\n      + (nx ? '<button")],
    // ★[DRESS_NOTE_ONE · DRESS_EXIT_ASK · DRESS_FIT_FEE · DRESS_SLIDES 코워크 검토 4] 고친 것을 되돌리면 빨강
    ['신청서 Note 를 다시 span 으로 쪼갬', SRC, GAS, PAGE0, MP0, { INQ: INQ.replace(/<span data-dress-text="[^"]*">(대여 의상은 프리 사이즈\(44~88 내외\)로, 상담에서 직접 보고 확인하실 수 있습니다\.)/, '<span data-dress-off>$1</span><span>') }],
    ['나가기가 다시 닫기 신호만 보낸다', SRC, GAS, PAGE0.replace("window.parent.postMessage({ type: 'momentedit:dressExit' }, location.origin); } catch (e) {} return; }\n    location.href = '/dress.html';\n  }\n  function applyFill", "window.parent.postMessage({ type: 'momentedit:dressClose' }, location.origin); } catch (e) {} return; }\n    location.href = '/dress.html';\n  }\n  function applyFill")],
    ['시착비 숫자가 시착 동의서와 다르다', SRC, GAS, PAGE0.replace('3벌째부터 1벌당 50,000원입니다.', '3벌째부터 1벌당 70,000원입니다.')],
    ['사진 없는 장도 다시 넘긴다', SRC.replace('.filter(function (e) { return e && e.img; })', '.filter(function (e) { return !!e; })'), GAS],
    ['단독에서 «저장»이 다시 보인다', SRC, GAS, PAGE0.replace('html.pk-alone #pkSave,html.pk-alone #pkLeave{display:none}', '')],
    ['단독이 다시 저장한 척(«저장됨»)', SRC, GAS, PAGE0.replace("if (mode === 'done') go('done'); else if (mode === 'exit') exitNow();", "S.saved = true; if (mode === 'done') go('done'); else if (mode === 'exit') exitNow();")],
    // ★[DRESS_DECIDED_1023 코워크 회신 4 보충] 사이트 · 계약서 근거로 닫은 셋을 되돌리면 빨강
    ['대여 한 줄을 지움', SRC, GAS, PAGE0.replace('<p class="dotln">대여 드레스는 1벌이 기본으로 포함되며, 2벌부터는 추가 비용이 있습니다.</p>', '')],
    ['대여 한 줄에 금액을 씀', SRC, GAS, PAGE0.replace('2벌부터는 추가 비용이 있습니다.</p>', '2벌부터는 1벌당 100,000원이 더해집니다.</p>')],
    ['신청서 대여 문장이 바뀜(공개 칸과 어긋남)', SRC, GAS, PAGE0, MP0, { INQ: INQ.replace('1벌 기본 포함 · 2벌부터 추가금 발생', '2벌 기본 포함 · 3벌부터 추가금 발생') }],
    ['미니 설명에 다시 다이닝', SRC.replace("note: '무릎 근처 길이로, 가볍고 경쾌해 두 번째 의상으로도 잘 어울립니다.'", "note: '무릎 근처 길이로, 식사 자리에도 잘 어울립니다.'"), GAS],
    ['fitNote 를 지어 씀', SRC.replace("fitNote: '',", "fitNote: '핀으로 품을 맞춥니다',"), GAS],
    ['미디에 다시 «경쾌»(이웃 줄 겹침)', SRC.replace("note: '종아리 길이로, 구두까지 보여 산뜻합니다.'", "note: '종아리 길이로, 구두까지 보여 경쾌합니다.'"), GAS]
  ];
  /* ★[DRESS_LIVE_READY] 켜기 조건 — 다 갖춘 켠 사본(실물 4벌 · 모두 사진 · ex 도 사진 · noindex 없음 · sitemap)이 먼저 초록이어야 한다(대조).
     거기서 한 가지씩 깬다 — 표본만 · 사진 없음 · 4벌 미만 · ex 에 사진 없는 장. 사진 자리는 있는 파일(홈 Styling 사진)을 가리킨다 */
  const ex = (img) => "[{ t: '앞', img: '" + img + "' }, { t: '뒤', img: '" + img + "' }]";
  const one = (id, line, len, img, exs) => "      { id: '" + id + "', name: '드레스 " + id + "', line: '" + line + "', length: '" + len + "', neck: '보트넥', fabric: '크레이프', expo: 'soft', sleeve: 'none', mood: '단정한 선', pair: '짧은 베일', img: '" + img + "', ex: " + exs + " }";
  const P = '../home/styling';
  const four = (o) => { o = o || {}; return [one('D01', 'column', 'ankle', o.noImg ? '' : P, ex(P)), one('D02', 'slip', 'calf', P, o.emptyEx ? "[{ t: '앞', img: '" + P + "' }, { t: '뒤' }]" : ex(P)), one('D03', 'aline', 'knee', P, ex(P)), one('D04', 'empire', 'ankle', P, ex(P))].slice(0, o.n || 4).join(',\n'); };
  const LIVE_SRC = (dresses) => SRC.replace('live: false,             // [DRESS_LIVE]', 'live: true,              // [DRESS_LIVE]').replace(/dresses: \[[\s\S]*?\n    \]\n  \};/, () => 'dresses: [\n' + dresses + '\n    ]\n  };');
  const LIVE_PAGE = PAGE0.replace('<meta name="robots" content="noindex">', '');
  const LIVE_SITE = SITEMAP + '\n<url><loc>https://momentedit.kr/dress.html</loc></url>';
  const okSrc = LIVE_SRC(four());
  const ctl = audit(okSrc, GAS, LIVE_PAGE, MP0, { SITE: LIVE_SITE });
  const ctlOk = okSrc !== SRC && /live: true,/.test(okSrc) && !ctl.bad.length;
  console.log((ctlOk ? '  대조 초록 ' : '  대조가 빨강?? ') + '다 갖춘 켠 사본(실물 4벌 · 모두 사진 · ex 도 사진)' + (ctl.bad.length ? ' · ' + ctl.bad.slice(0, 3).join(' / ') : ''));
  cases.push(['켜기 — 표본만(실물 0벌)', LIVE_SRC('') === SRC ? SRC : SRC.replace('live: false,             // [DRESS_LIVE]', 'live: true,              // [DRESS_LIVE]'), GAS, LIVE_PAGE, MP0, { SITE: LIVE_SITE }]);
  cases.push(['켜기 — 사진 없는 드레스', LIVE_SRC(four({ noImg: true })), GAS, LIVE_PAGE, MP0, { SITE: LIVE_SITE }]);
  cases.push(['켜기 — 4벌 미만(3벌)', LIVE_SRC(four({ n: 3 })), GAS, LIVE_PAGE, MP0, { SITE: LIVE_SITE }]);
  cases.push(['켜기 — ex 에 사진 없는 장', LIVE_SRC(four({ emptyEx: true })), GAS, LIVE_PAGE, MP0, { SITE: LIVE_SITE }]);
  let red = 0;
  for (const [nm, s, g, pg, mp, x] of cases) {
    if (s === SRC && g === GAS && (!pg || pg === PAGE0) && !x) { console.log('  selftest 틀을 못 만들었다 · ' + nm); continue; }
    if (x && x.INQ === INQ) { console.log('  selftest 틀을 못 만들었다 · ' + nm); continue; }
    const r = audit(s, g, pg || PAGE0, mp || MP0, x || {});
    console.log((r.bad.length ? '  빨강 ' : '  초록?? ') + nm + (r.bad.length ? ' · ' + r.bad[0] : ''));
    if (r.bad.length) red++;
  }
  const allRed = red === cases.length;
  console.log(allRed && ctlOk ? 'selftest OK — 대조는 초록 · 깨면 빨강(' + cases.length + '가지)' : 'selftest FAIL — ' + (ctlOk ? '깨도 초록인 칸이 있다' : '다 갖춘 켠 사본이 초록이 아니다(대조 실패)'));
  process.exit(allRed && ctlOk ? 0 : 1);
}

const { bad, okn } = audit(SRC, GAS);
if (bad.length) { console.log('FAIL dress-refs ' + bad.length + '건'); bad.forEach((b) => console.log('  ✗ ' + b)); process.exit(1); }
console.log('ok dress-refs — ' + okn.length + '칸 통과(모양 · 줄 세우기 · 표본 · 스위치 · GAS 0 · 서버 짝 · 금지어 · 마이페이지)');
