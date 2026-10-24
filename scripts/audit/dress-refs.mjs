#!/usr/bin/env node
/* ★★[DRESS_REFS 2026-10-23 코워크 설계 명세 «시착 준비»] 원천(assets/dress-refs.js) 모양 · 줄 세우기 규칙(명세 6장) · 스위치 · 표본 · 서버 짝을 한 번에 잰다.
 *
 * ① 모양 — 라인 다섯(slip · column · aline · empire · twopiece)과 핏 짝(몸 선을 따라 = 슬립 · 컬럼 / 허리만 잡고 아래는 여유 = 라이트 A라인 · 투피스 / 전체적으로 여유 = 엠파이어) ·
 *          길이 셋 · 물음 셋의 답 값 · 드레스 칸(expo · sleeve · 길이 · 라인) · 그림 파일(같은 캔버스 · 채움 없음 · 금색 선) · 사진 파일
 * ② 줄 세우기 — 답의 모든 조합(길이 5 × 핏 5 × 편한 쪽 4)마다 R.rank 를 «명세 문장을 그대로 옮긴 셈»과 대조한다(다른 손으로 쓴 셈 · 같은 함수를 다시 부르지 않는다)
 * ③ 표본 — 운영 주소(momentedit.kr)에서는 0벌 · 그 밖에서는 보인다 · 이름은 «표본 NN» · 운영 판정 목록 = shared/preview-guard.js PROD_HOSTS
 * ④ 스위치 — 꺼짐 · 켜짐 모두 dress.html noindex · sitemap 에 없음([DRESS_PUBLIC_OFF] 명세 2) · 홈에는 드레스 자리가 없다(#1323 이전과 같다) · 켜짐: 표본 0벌 · 실물 4벌 · 사진
 * ⑤ GAS 0 — dress.html · dress-refs.js 에 GAS 주소 · fetch · XHR · sendBeacon 이 없다(저장은 마이페이지가 한다)
 * ⑥ 서버 짝 — consultation-booking.gs DRESS_PICK(마감 일수 · 벌 수) · DRESS_ANS(답 값) = 원천 · 드레스 id 가 서버 id 규칙을 지난다
 * ⑦ 고객 문구 금지어 — 추천 · 맞춤 · 담기 · 하트 · 커버 · 콤플렉스 · 피하세요 · 체형 · 골격 · 전각 줄표(원천 글 · dress.html · 마이페이지 카드)
 * ⑧ 마이페이지 · 관리자 — 같은 원천을 읽는다 · 카드 자리(mp_consult → mp_dress → mp_fitting) · 카드 판정(스위치 · 시그니처 · 신청접수 ~ 상담확정 · 취소 아님 · 자체 준비) · 겹화면 주소 · 미리 보기
 * ⑨ 코워크 검토 1(10/23) — 아래 막대는 #pkBar 가 붙는다 · «Nº» 배지 칠 없음 · 마감 뒤 «준비해 둘게요» · 건너뛰기 옅게 · 진행 표시 높이 그대로 ·
 *    칸 한 줄 «라인 · 길이 · 소재»(넥라인은 자세히) · 슬립 그림이 퍼지지 않는다 · 남길 말 자리 글 · 마감 날 숫자(요일 계산) · 메일 글자 링크 #7A5F37
 * ⑩ 코워크 검토 2(10/23) — 자세히의 고르기 단추는 이름 · 한 줄 바로 아래(분위기 · 소품은 그 아래) · 사진 넘김은 사진 위 · 짧은 화면에서 사진 칸 상한 ·
 *    반투명 면 없음. 단추가 막대 위에 «보이는가»는 숫자로 scripts/audit/dress-fit.mjs 가 잰다(브라우저)
 * ⑪ 코워크 검토 4(10/23 · 배포 전 전면 재검토) — 켜기 조건(실물 4벌 · 모두 사진 · ex 는 사진 있는 장만 [DRESS_LIVE_READY]) · 신청서 Note 한 덩어리 ·
 *    나가기 판([DRESS_EXIT_ASK]) · 안 고르면 한 줄 · 시착비 칸(홈 · 신청서 · 시착 동의서와 숫자 대조 [DRESS_FIT_FEE]) · 사진 먼저 · 한 폭 · 라인 한 문장 ·
 *    인트로 걷기 · 질문 없이 바로 보기 · 답 글 · 단추 위계 · 남길 말 완료 화면 · 카드 말 · 숫자 모양 · 결정 대기 글 없음(공개 화면 몫은 ⑫ 로 걷었다)
 * ⑫ 코워크 설계 명세 2(10/23 · 사장님 «마이페이지만» · «대면 상담 신청 후 웨딩 드레스 볼 수 있게») — 공개 쪽 걷기([DRESS_PUBLIC_OFF]) · 신청 직후부터 카드([DRESS_APPLY_OPEN]) ·
 *    날짜 없음 = 마감 없음([DRESS_NO_DATE]) · 카드 말 «드레스 미리 보기»([DRESS_CARD_SEE]) · 목록부터 · 물음 띠([DRESS_LIST_FIRST]) · 자세히에 라인 설명([DRESS_LINE_IN_DETAIL]) ·
 *    분위기 글이 라인 설명을 되풀이하지 않는다([DRESS_MOOD_OWN]) · 신청서 켜질 문장([DRESS_NOTE_APPLY]) · 접수 메일 한 줄([DRESS_SIGNUP_MAIL]) · 확정 메일은 0벌만([DRESS_CONFIRM_ZERO])
 * ⑬ 코워크 디자인 라운드 1(10/23 · 사장님 «디자이너 시선으로 · 고객 입장에서») — 카드에 드레스 칸([DRESS_CARD_PHOTOS]) · 칸 = 그 드레스 자세히([DRESS_SEE_TAP]) · 마감 뒤 보기만([DRESS_SEE_CLOSED]) ·
 *    0벌 글 한 줄([DRESS_CARD_ONE_LINE]) · 막대 흰 단색 + 위 1px 선 · 시착비 줄 걷기([DRESS_BAR_PLAIN]) · 띠 아래 점 줄 둘([DRESS_BAND_DOTS]) · 띠 글([DRESS_BAND_WORDS]) ·
 *    한 그리드 · «답과 맞아요»([DRESS_ONE_GRID]) · «아직 몰라요» 걷기 · «노출 · 소매»([DRESS_Q_TRIM]) · 완료 화면 단추 하나([DRESS_MEMO_ONEBTN]) · 상담 카드 두 자리([DRESS_CARD_ON])
 *    첫 화면 막대 선에 글줄이 걸리지 않게 사진 폭 · 그리드 위 여백을 몇 px 맞춘다([DRESS_BAR_FIT] · 여러 크기 실측은 dress-fit.mjs) · 사진 기준 430 → 402(막대가 28px 낮아진 만큼)
 * ⑭ 코워크 디자인 라운드 2(10/23 · 사장님 «고객입장에서 디테일한 개선점들도») — 휴대폰 뒤로가기 = 겹화면 안에서 한 걸음([DRESS_BACK_STEP]) · 단추 벌 수([DRESS_CARD_COUNT]) ·
 *    PC 칸 140px([DRESS_CARD_WIDE]) · 이전 · 다음 드레스([DRESS_NEXT_PREV]) · 누름 반응([DRESS_PRESS]) · 카드 Nº([DRESS_CARD_NUM]) · «답과 맞아요» 요약 아래([DRESS_FIT_BELOW]) · 마감 한 줄 한 곳([DRESS_DUE_SAME])
 *
 * 종료: 0 통과 · 1 어긋남 · 2 못 쟀다(원천 없음)
 * ★깨 보고 믿는다 — --selftest 는 일부러 틀린 원천(핏 짝 바꿈 · 표본 운영 노출 · 마감 일수 다름 …)을 넣어 모두 빨강이 되는지 본다.
 *   켜기 조건은 «다 갖춘 켠 사본»이 초록인지 먼저 보고(대조), 거기서 한 가지씩 깨서(표본만 · 사진 없음 · 4벌 미만 · ex 빈 장) 각각 빨강인지 본다.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch (e) { return null; } };
const SRC = rd('assets/dress-refs.js'), PAGE0 = rd('dress.html'), MP0 = rd('mypage.html'), AD = rd('admin.html'), IDX = rd('index.html'), INQ = rd('inquiry.html');
const GAS = rd('automation/consultation/consultation-booking.gs'), PG = rd('shared/preview-guard.js'), SITEMAP = rd('sitemap.xml') || '';
const SU0 = rd('automation/platform/40_signup.gs') || '', FPAR = rd('scripts/audit/footer-parity.mjs') || '';
if (!SRC || !PAGE0 || !MP0 || !GAS || !PG || !IDX || !INQ || !AD) { console.log('못 쟀다 — 원천 파일이 없다'); process.exit(2); }

const load = (src, host) => { const ctx = { window: { location: { hostname: host || 'localhost' } } }; vm.createContext(ctx); vm.runInContext(src, ctx); return ctx.window.DRESS_REFS; };

function audit(src, gas, PAGE = PAGE0, MP = MP0, X = {}) {
  const SITE = X.SITE != null ? X.SITE : SITEMAP, INQX = X.INQ != null ? X.INQ : INQ, IDXX = X.IDX != null ? X.IDX : IDX, SU = X.SU != null ? X.SU : SU0;
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
  t(qk('len') === 'ankle,calf,knee', '① 길이 물음 답 = 길이 셋([DRESS_Q_TRIM] «아직 몰라요»는 뺐다 — 건너뛰기 · 질문 없이 바로 보기와 같은 일)');
  t(qk('fit') === 'body,waist,loose', '① 핏 물음 답 = 핏 셋([DRESS_Q_TRIM] «아직 몰라요» 없음)');
  t(qk('pref') === 'low,arms,none' && R.questions[2].none === 'none' && R.PREF_NONE === 'none', '① 셋째 물음(노출 · 소매) = 노출이 적은 드레스 · 소매나 볼레로가 있는 드레스 · 특별히 없어요(none · 혼자만) [DRESS_Q_FIRST]');
  t(R.questions.map((q) => q.step).join('|') === '길이|핏|노출 · 소매', '① [DRESS_Q_TRIM] 걸음 이름 = 길이 · 핏 · 노출 · 소매(«편한 쪽»은 무엇을 묻는지 안 보였다)');
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
  /* ★[DRESS_SAMPLE_PROD 2026-10-23 사장님 «지금뜨게해»] 표식이 참인 동안만 운영 주소에도 표본이 보인다 — 표식은 그 모양 그대로(주석의 결정 이름까지) 있어야 한다 */
  const sampleProd = R.SAMPLES_ON_PROD === true;
  t(R.SAMPLES_ON_PROD === undefined || typeof R.SAMPLES_ON_PROD === 'boolean', '③ SAMPLES_ON_PROD 는 참/거짓');
  if (sampleProd) t(/\n    SAMPLES_ON_PROD: true,\s+\/\/ \[DRESS_SAMPLE_PROD /.test(src), '③ [DRESS_SAMPLE_PROD] 운영에서 표본을 여는 줄은 사장님 결정 표식과 한 줄');
  for (const h of ['momentedit.kr', 'www.momentedit.kr', 'MOMENTEDIT.KR.']) {
    const Rp = load(src, h);
    if (sampleProd) t(Rp.list().length === R.dresses.length, `③ [DRESS_SAMPLE_PROD] 사장님 결정으로 표본 운영 중 — 운영 주소(${h})에도 ${R.dresses.length}벌`);
    else t(Rp.list().every((d) => !d.sample), `③ 운영 주소(${h})에서는 표본 0벌`);
  }
  const Rv = load(src, 'momentedit-site-git-x-preview.vercel.app');
  t(Rv.list().length === R.dresses.length, '③ 미리보기 · 로컬에서는 표본까지 보인다');

  // ④ 스위치 — ★[DRESS_PUBLIC_OFF 명세 2] noindex 는 늘 · sitemap 에는 넣지 않는다(켤 때 할 일에서 두 줄을 뺐다)
  const noindex = /<meta name="robots" content="noindex">/.test(PAGE);
  t(noindex, '④ [DRESS_PUBLIC_OFF] dress.html 은 늘 noindex(스위치와 상관없이 · 마이페이지 겹화면 전용)');
  t(!/dress\.html/.test(SITE), '④ [DRESS_PUBLIC_OFF] sitemap.xml 에 /dress.html 을 넣지 않는다');
  t(!/ㄴ\. dress\.html 의 noindex 줄을 지운다|sitemap\.xml 에 \/dress\.html 을 넣는다/.test(src), '④ [DRESS_PUBLIC_OFF] 원천의 «켤 때 할 일»에 noindex · sitemap 줄이 없다');
  if (R.live && sampleProd) {
    /* ★[DRESS_SAMPLE_PROD] 켜기 조건(실물 4벌 · 모두 사진)은 표식이 참인 동안 보류 — 사장님이 표본으로 켜기를 골랐다. 표식을 false 로 돌리면 아래 줄이 다시 본다 */
    t(R.dresses.length > 0 && R.dresses.every((d) => d.sample), '④ [DRESS_SAMPLE_PROD] 사장님 결정으로 표본 운영 중 — 표본만 있다(실물을 넣으면 표본을 지우고 표식을 false 로)');
  } else if (R.live) {
    t(R.dresses.every((d) => !d.sample), '④ 켜졌다 — 표본은 지워야 한다');
    /* ★[DRESS_LIVE_READY 2026-10-23 코워크 검토 4] 켤 때 할 일 ㄴ — 사진 없이 켜면 고르기 화면 칸이 라인 그림만 남고(같은 라인끼리 같은 그림 · 미니 · 미디도 바닥 길이) · 0벌이면 목록이 통째로 빈다 */
    const real = R.dresses.filter((d) => !d.sample);
    t(real.length >= 4, `④ [DRESS_LIVE_READY] 켜졌다 — 실물 4벌 이상(지금 ${real.length}벌)`);
    t(real.length > 0 && real.every((d) => !!d.img), '④ [DRESS_LIVE_READY] 켜졌다 — 모든 드레스에 사진(img)' + (real.filter((d) => !d.img).length ? ' · 없음 ' + real.filter((d) => !d.img).map((d) => d.id).join(', ') : ''));
    t(real.every((d) => (d.ex || []).every((e) => !!(e && e.img))), '④ [DRESS_LIVE_READY] 켜졌다 — 넘겨 보는 사진(ex)은 사진이 있는 장만');
  }
  /* ★[DRESS_PUBLIC_OFF 명세 2 · 사장님 «마이페이지만»] 홈은 #1323 이전과 같다 — 드레스 자리 · 원천 싣기 · 스위치 스크립트 · 사진 겹 링크가 없다 */
  t(!/dress-refs\.js|data-dress-|href="dress\.html"|DRESS_HOME_BELOW|DRESS_LIVE/.test(IDXX), '④ [DRESS_PUBLIC_OFF] 홈에 드레스 자리가 없다(dress-refs.js · data-dress-* · dress.html 링크 0)');
  /* ★[DRESS_NOTE_ONE 2026-10-23 코워크 검토 4] Nº 03 Note 는 글 한 덩어리 — 줄이 flex 라 span 과 맨 글이 따로 칸이 되면 스위치가 꺼져 있어도 두 단으로 갈라진다(운영 신청서가 깨진다).
     켜질 글은 data-dress-text 에 통째로 두고 스크립트가 바꾼다(꺼짐 = 종전과 같은 글 한 덩어리 · 픽셀까지 같다) */
  const NOTE_TAIL = ' 시착(기본 2벌)은 상담 당일 동의 후 진행됩니다. 계약을 진행하지 않으시면 시착하신 벌수만큼(1벌 50,000원 · 최대 100,000원) 차감되고 나머지 예약금은 환불됩니다.';
  /* ★[DRESS_NOTE_APPLY 명세 2 · 5장] 켜질 첫 문장 = «…입니다. 신청하시면 마이페이지에서 상담 날 입어 보실 드레스를 미리 둘러보실 수 있습니다.» */
  const NOTE_HTML = '<span class="accent">Note</span><span data-dress-text="대여 의상은 프리 사이즈(44~88 내외)입니다. 신청하시면 마이페이지에서 상담 날 입어 보실 드레스를 미리 둘러보실 수 있습니다.' + NOTE_TAIL + '">대여 의상은 프리 사이즈(44~88 내외)로, 상담에서 직접 보고 확인하실 수 있습니다.' + NOTE_TAIL + '</span>\n';
  t(INQX.indexOf(NOTE_HTML) > -1, '④ [DRESS_NOTE_ONE] 신청서 Nº 03 Note — «Note» 뒤 글 한 덩어리(지금 문장) · 켜질 문장은 data-dress-text(링크 없음)');
  const noteRow = (INQX.match(/<div class="compact-row-note">[\s\S]*?<\/div>/g) || []).find((x) => /대여 의상/.test(x)) || '';
  t(!!noteRow && !/data-dress-(on|off)/.test(noteRow) && (noteRow.match(/<span/g) || []).length === 2, '④ [DRESS_NOTE_ONE] 신청서 Note 줄에 칸은 둘뿐(«Note» · 글 한 덩어리) — 글을 span 으로 쪼개지 않는다');
  t(/document\.querySelectorAll\('\[data-dress-text\]'\)\.forEach\(function\(el\)\{el\.textContent=el\.getAttribute\('data-dress-text'\);\}\);/.test(INQX), '④ [DRESS_NOTE_ONE] 켜지면 data-dress-text 글로 통째로 바꾼다');
  t(/<script src="\/assets\/dress-refs\.js" defer><\/script>/.test(INQX) && /window\.DRESS_REFS&&window\.DRESS_REFS\.live/.test(INQX), '④ 신청서가 같은 원천의 스위치를 읽는다(defer)');

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
  /* [DRESS_Q_TRIM 라운드 1] 화면은 «아직 몰라요»를 뺐지만 서버(DRESS_ANS)는 옛 저장본의 'unsure'를 그대로 받는다(조건을 보지 않는다) — 서버 = 원천 답 + 'unsure' 만 더 */
  const extra = (srv, cli) => srv.split(',').filter((v) => cli.split(',').indexOf(v) < 0);
  const covers = (srv, cli) => cli.split(',').every((v) => srv.split(',').indexOf(v) > -1);
  t(!!da && covers(lst(da[1]), qk('len')) && covers(lst(da[2]), qk('fit')) && lst(da[3]) === qk('pref') && extra(lst(da[1]), qk('len')).join() === 'unsure' && extra(lst(da[2]), qk('fit')).join() === 'unsure', '⑥ 서버 답 값(DRESS_ANS) = 원천 물음의 답 값 + 옛 저장본 «unsure»(라운드 1 에서 화면 답만 뺐다)');
  t(/case 'saveDressPick':\s*return jsonOut\(handleSaveDressPick\(body\)\);/.test(gas || ''), '⑥ doPost 가 saveDressPick 을 받는다');
  /* ★[DRESS_APPLY_OPEN 명세 2] 카드가 보이는 단계(mypage DRESS_STAGES) = 서버가 받는 단계(DRESS_PICK.stages) — 어긋나면 «보이는데 저장이 거절» 또는 «받는데 안 보임» */
  const sgas = (/stages:\s*\[([^\]]*)\]/.exec(dp ? dp[1] : '') || [])[1], smp = (/var DRESS_STAGES=\[([^\]]*)\];/.exec(MP) || [])[1];
  t(!!sgas && !!smp && lst(sgas) === lst(smp) && lst(smp) === '신청접수,상담확정', `⑥ [DRESS_APPLY_OPEN] 카드 단계 = 서버 단계 = 신청접수 · 상담확정(서버 ${sgas ? lst(sgas) : '없음'} · 화면 ${smp ? lst(smp) : '없음'})`);

  // ⑦ 금지어 — 원천의 글 · dress.html(주석 걷고) · 마이페이지 카드
  const BAN = ['추천', '맞춤', '담기', '하트', '커버', '콤플렉스', '피하세요', '체형', '골격', '—'];
  const strs = []; (function walk(o) { if (typeof o === 'string') strs.push(o); else if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') Object.keys(o).forEach((k) => walk(o[k])); })(JSON.parse(JSON.stringify(R)));
  const decom = (s) => s.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
  const card = (MP.match(/function renderDress\(d, boxArg\)\{[\s\S]*?\n\}\n/) || [''])[0];   // ★[DRESS_STICKER] 걷은 카드 — 늘 비운다
  const stk = (MP.match(/var DRESS_STICKER='[^']*';\n[\s\S]*?\nfunction renderDress\(d, boxArg\)\{/) || [''])[0];   // ★[DRESS_STICKER] 스티커 단추(그림 · 자리 · 흔들림)
  const cardOn = (MP.match(/function _dressCardOn\(d\)\{[\s\S]*?\n\}\n/) || [''])[0];   // [DRESS_CARD_ON] 카드 판정 한 곳(상담 카드도 쓴다)
  const pick = (MP.match(/function openDressPicker\(dr, opt\)\{[\s\S]*?\n\}\n/) || [''])[0];
  t(!!card && !!pick && !!cardOn && !!stk, '⑦ 마이페이지 걷은 카드 · 스티커 · 카드 판정 · 겹화면 코드를 찾았다');
  const hay = [['원천', strs.join('\n')], ['dress.html', decom(PAGE)], ['마이페이지 스티커', decom(card + stk + pick)]];
  const hits = [];
  for (const [nm, h] of hay) for (const w of BAN) if (h.indexOf(w) > -1) hits.push(nm + ' «' + w + '»');
  t(!hits.length, '⑦ 고객 문구 금지어 0건' + (hits.length ? ' · ' + hits.join(', ') : ''));

  // ⑧ 마이페이지 · 관리자
  for (const [nm, f] of [['mypage', MP], ['admin', AD]]) t(/<script src="\/assets\/dress-refs\.js"><\/script>/.test(f), `⑧ ${nm} 가 같은 원천을 읽는다`);
  const io = (id) => MP.indexOf('id="' + id + '"');
  t(io('mp_consult') > -1 && io('mp_consult') < io('mp_dress') && io('mp_dress') < io('mp_fitting'), '⑧ 카드 자리 = 상담 → 시착 준비 → 시착 동의');
  t(/!R\.live \|\| d\.isException \|\| d\.product==='웨딩스냅' \|\| DRESS_STAGES\.indexOf\(d\.stage\)<0/.test(cardOn) && /if\(!c\.status \|\| c\.status==='취소'\) return false;/.test(cardOn) && !/c\.status==='승인완료' \|\| c\.status==='확정'/.test(cardOn) && /자체 준비/.test(cardOn) && /  var dressOn = !isSnap && !!d && _dressCardOn\(d\);\n  var DST = dressOn \? _dstHtml\(c\.dress\) : '';/.test(MP), '⑧ [DRESS_APPLY_OPEN · DRESS_CARD_ON] 카드 판정(한 곳) = 스위치 · 시그니처 · 신청접수 ~ 상담확정 · 상담 예약이 취소 아님 · 자체 준비 아님(확정 전에도 보인다)');
  t(!/closed|dr\.open===false/.test(decom(card)) && !/dr\.open===false/.test(decom(cardOn)), '⑧ [DRESS_NO_DEADLINE] 마감으로 숨기거나 «마감 뒤» 보기만으로 가지 않는다(0 · 1 · 2벌만)');
  t(/  box\.style\.display='none'; box\.innerHTML='';\n/.test(card) && !/data-dress-open|data-dress-see|dr-ths|cc-btn-ghost|드레스 보러 가기/.test(decom(card)) && !/data-dress-open|data-dress-see|드레스 보러 가기/.test(decom(MP)), '⑧ [DRESS_STICKER] 따로 카드는 걷었다 — renderDress 는 늘 비운다 · «드레스 보러 가기» 단추 · 카드 사진 칸이 마이페이지에 없다');
  t(stk.indexOf('<button type="button" class="dst" data-dst aria-label="드레스 보기">') > -1 && /<span class="dst-lb" aria-hidden="true"><span class="dst-lbt">드레스 보기<\/span><\/span>/.test(stk) && !/dst-lbw|dst-lbn/.test(decom(MP)) && /<span class="dst-sw"><span class="dst-art">'\+img\+'<\/span><span class="dst-hit" aria-hidden="true"><\/span><\/span>/.test(stk) && /\.dst\{pointer-events:none\}/.test(MP) && /\.dst-hit,\.dst-lb\{pointer-events:auto\}/.test(MP) && /\.dst-hit\{position:absolute;inset:0;clip-path:polygon\(/.test(MP) && /openDressPicker\(dr, \{ demo:!!demo, key:String\(\(d&&d\.code\)\|\|''\) \}\)/.test(stk) && (decom(MP).match(/class="dst" data-dst/g) || []).length === 1, '⑧ [DRESS_STICKER · STICKER_ONE_WORD] 단추 = 스티커 하나(aria-label · 글 = 폭과 상관없이 «드레스 보기» · 층 = 누름 › 칸 › 회전 › 그림 · 글은 궤도 › 수평) · 누르면 창(질문 먼저)이 바로');
  t(/'\/dress\.html\?pick=1&embed=1&pop=1'\+\(opt\.open\?'&open='\+encodeURIComponent\(opt\.open\):''\)\+'&t='\+Date\.now\(\)/.test(pick) && /ev\.source!==fr\.contentWindow \|\| ev\.origin!==location\.origin/.test(pick), '⑧ 겹화면 = dress.html?pick=1&embed=1(카드 칸이면 &open=그 드레스 [DRESS_SEE_TAP]) · 같은 출처 · 그 창에서 온 말만');
  t(/get\('preview_card'\)!=='dress'/.test(MP) && /Dress Sticker Preview · 실제 저장 아님/.test(MP) && /renderConsult\(s\[1\]\.consult, s\[1\]\.product, s\[1\], \$\('mp_pvDress'\+i\), true\)/.test(MP), '⑧ ?preview_card=dress — 로그인 없이 상태를 차례로(저장 없음)');
  t(/var states=\[\['일정 선택 전 · 0벌', pre\], \['0벌', mk\(\[\]\)\]/.test(MP) && /var pre=\{ stage:'신청접수', product:'시그니처', consult:\{ status:'신청접수', dress:\{ attire:'대여 희망 · 2벌', ymd:'', open:true, saved:null \} \} \};/.test(MP), '⑧ [DRESS_APPLY_OPEN] 미리 보기 맨 앞 = «일정 선택 전 · 0벌»(신청접수 · 날짜 없음 · 열림)');
  t(/if\(opt\.demo\)\{ setTimeout\(win, 400\); return; \}/.test(pick) && /var win=function\(\)\{ saved=true; failCode=''; if\(toExit\)\{ done\(\); return; \} ack\(true\); \};/.test(pick), '⑧ 미리 보기에서는 저장을 부르지 않는다(성공과 같은 길 · 나가기면 닫는다)');

  // ⑨ 코워크 검토 1(10/23)
  t(/#pkBar\{position:sticky;bottom:0;z-index:5\}/.test(PAGE) && !/\.wz-bar\{position:sticky/.test(PAGE), '⑨ [DRESS_BAR_STICK] 붙는 것은 #pkBar(카드의 직계) — 막대에 sticky 를 걸면 붙을 자리가 없다');
  const badge = (/\.dr-badge\{[^}]*\}/.exec(PAGE) || [''])[0];
  t(!!badge && !/var\(--seal\)/.test(badge) && /box-shadow:inset 0 0 0 1px var\(--gold-deep\)/.test(badge), '⑨ [DRESS_BADGE_NOFILL] «Nº» 배지 = 흰 바탕 · 먹빛 글 · 금빛 테 한 겹(진사 칠 없음)');
  t(/\+ \(n\?'<span class="dst-pill" aria-hidden="true">'\+n\+'벌<\/span>':''\)/.test(stk) && !/cc-sub|mp-dotln|cc-title/.test(decom((stk.match(/function _dstHtml\(dr\)\{[\s\S]*?\n\}/) || [''])[0])), '⑨ [DRESS_STICKER] 고른 드레스가 있으면 스티커 오른쪽 위 «n벌» 알약만 · 0벌은 알약도 없다 · 글 줄 없음');
  t(/\(has \? '' : ' cc-btn-wait'\) \+ '" data-go="1"' \+ \(has \? '' : ' aria-disabled="true"'\)/.test(PAGE) && !/건너뛰기|pk-skip'/.test(decom((PAGE.match(/function barHTML\(\)\{[\s\S]*?\n  \}\n/) || [''])[0])) && /if \(!\(Array\.isArray\(v\) \? v\.length > 0 : !!v\)\) return;/.test(PAGE), '⑨ [DRESS_Q_FIRST] 답하기 전엔 주 단추가 옅고 눌리지 않는다 · «건너뛰기» 없음');
  for (const [nm, f] of [['dress.html', PAGE], ['mypage', MP]]) t(f.indexOf('.wz-steps li.nav .wz-stepb{margin-bottom:calc(6px + 1.5em - 44px)}') > -1, `⑨ [WZ_STEPS_STILL] ${nm} — 지나온 걸음 단추가 진행 표시 높이를 키우지 않는다`);
  const d2 = R.dresses.find((d) => d.line === 'column') || R.dresses[0];
  const cellWant = [R.line(d2.line).ko, R.lengthOf(d2.length).ko, d2.fabric].join(' · ');
  t(typeof R.sumCell === 'function' && R.sumCell(d2) === cellWant, `⑨ [DRESS_SUM_ONE] 칸 한 줄 = 라인 · 길이 · 소재(«${cellWant}»)`);
  t(typeof R.sumDetail === 'function' && R.sumDetail(d2) === cellWant + ' · ' + d2.neck, '⑨ [DRESS_SUM_ONE] 자세히 = 라인 · 길이 · 소재 · 넥라인');
  t(/var sum = R\.sumCell\(d\);/.test(PAGE) && /esc\(R\.sumDetail\(d\)\)/.test(PAGE) && !/sumPick|sumPublic/.test(PAGE), '⑨ [DRESS_SUM_ONE] 공개 · 고르기가 같은 한 줄을 쓴다(옛 «넥라인 · 소재 · 라인» 없음)');
  const DUE = [['2026-10-25', '10월 23일(금)'], ['2026-03-01', '2월 27일(금)'], ['2027-01-01', '12월 30일(수)'], ['2026-11-02', '10월 31일(토)'], ['', ''], ['2026/10/25', '']];   // 기대값은 python datetime 으로 셈(눈대중 아님 · [DATE_DOW])
  t(typeof R.untilText === 'function' && DUE.every(([y, w]) => R.untilText(y) === w), '⑨ [DRESS_DUE_DATE] 마감 날 글 = 상담일 −2일 · 요일 계산(달 · 해 넘김 포함) · 못 읽으면 빈 글');
  t(!/dueLine|untilText|까지 고르실 수|까지 할 수 있어요|전날|시착\(기본 2벌\)/.test(decom(card)) && PAGE.indexOf('<div class="pk-end-dots"><p class="dotln">시착(기본 2벌)은 현장에서 다시 보고 정하셔도 돼요.</p></div>') > -1, '⑨ [DRESS_CARD_MIN · DRESS_NO_DEADLINE] «시착(기본 2벌)은 …» 줄은 카드에서 걷어 고르기 화면 결과 맨 아래 한 줄로 · 마감 날짜 줄 · «전날» 없음');
  t(/open:true, ymd:\(dr&&dr\.ymd\)\|\|''/.test(pick) && !/R\.dueLine\(|상담 이틀 전|전날/.test(decom(PAGE)) && /\(one \? '상담 날 이 드레스를 먼저 보여 드릴게요\.' : '상담 날 이 두 벌을 먼저 보여 드릴게요\.'\)/.test(PAGE), '⑨ [DRESS_NO_DEADLINE] 완료 화면 = «상담 날 이 …을 먼저 보여 드릴게요.» · 마감 줄 없음 · 마이페이지는 늘 open:true 로 넘긴다');
  t(typeof R.dueLine === 'function' && R.dueLine('2026-11-07') === '바꾸기는 11월 5일(목)까지 할 수 있어요.' && R.dueLine('') === '상담 날짜가 정해지면 바꾸기 마감일을 알려 드릴게요.', '⑭ [DRESS_DUE_SAME] R.dueLine — 날짜 있음 «바꾸기는 11월 5일(목)까지 할 수 있어요.» · 없음 «상담 날짜가 정해지면 바꾸기 마감일을 알려 드릴게요.»');
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
  const iLead = PAGE.indexOf("(ln && ln.lead ? '<p class=\"dv-lead\">' + esc(ln.lead) + '</p>' : '')"), iNote = PAGE.indexOf("(ln && ln.note ? '<p class=\"dotln\">' + esc(ln.note) + '</p>' : '')");
  t(iSum > -1 && iCtl > iSum && iLead > iCtl && iNote > iLead && iMood > iNote, '⑩ [DRESS_DETAIL_FIT · DRESS_LINE_IN_DETAIL] 자세히 = 이름 · 요약 줄 → 고르기 단추 → 라인 설명 · 함께 볼 점 → 분위기 · 어울리는 소품');
  t(/detailHTML\(d, ctl\)/.test(PAGE) && !/'<div class="pk-ctl">' \+ ctl \+ '<\/div>';\s*\n\s*\}/.test(PAGE), '⑩ [DRESS_DETAIL_FIT] 고르기 화면은 단추를 자세히 안에 넘긴다(사진 · 글 뒤에 따로 붙이지 않는다)');
  t(/class="dv-arr dv-prev"/.test(PAGE) && /class="dv-arr dv-next"/.test(PAGE) && !/class="dv-nav"/.test(PAGE) && /\.dv-arr\{position:absolute;top:50%/.test(PAGE), '⑩ [DRESS_DETAIL_FIT] 사진 넘김(‹ › · n / 5)은 사진 위 — 사진 아래 줄로 돌아가면 단추가 다시 내려간다');
  t(PAGE.indexOf('.pk-main .dv-view{max-width:360px;max-width:min(360px,max(150px,calc((100vh - 402px) * 0.75)));max-width:min(360px,max(150px,calc((100dvh - 402px) * 0.75)))}') > -1, '⑩ [DRESS_DETAIL_FIT · DRESS_BAR_PLAIN] 짧은 화면에서 사진 칸 상한(3:4 그대로 · 막대가 28px 낮아진 만큼 430 → 402)');
  t(/class="pk-picked"><span class="dr-badge">/.test(PAGE) && /<button type="button" class="pk-txt" data-act="unpick">빼기<\/button><\/div>/.test(PAGE), '⑩ 명세 «고른 드레스예요 · 빼기» 한 줄');
  t(!/rgba\(255,\s*255,\s*255,\s*0?\.\d+\)/.test(PAGE), '⑩ 사진 위 이름표 · 넘김에 반투명 면 없음([GLASS_MENU_OWNER] «새 반투명 면 금지»)');
  /* ★[DRESS_BAR_PLAIN 라운드 1 · 2] 막대 = 흰 단색 + 위 1px 가는 선 — 위 15px 흐림에 걸린 글(자세히 라인 설명 · 목록 칸 한 줄)이 취소선처럼 보였다 */
  t(/\.wz-bar\{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:14px 0 calc\(14px \+ env\(safe-area-inset-bottom,0px\)\);background:var\(--card-white\);border-top:1px solid var\(--hairline\)\}/.test(PAGE) && !/linear-gradient/.test(PAGE), '⑬ [DRESS_BAR_PLAIN] 막대 바탕 = 흰 단색 + 위 1px 선(흐림 없음)');
  const FITSRC = rd('scripts/audit/dress-fit.mjs') || '';
  t(/DRESS_DETAIL_FIT/.test(FITSRC) && /\[390, 844, true\], \[390, 740, true\], \[1280, 900, true\]/.test(FITSRC) && /ctlBottom > m\.barTop/.test(FITSRC), '⑩ dress-fit.mjs 가 세 크기 × 네 상태를 잰다(390×844 · 390×740 · 1280×900)');
  t(/DRESS_BAR_FIT/.test(FITSRC) && /const BAR_SIZES = \[\[360, 780\], \[375, 812\], \[390, 844\], \[390, 740\], \[414, 896\], \[1280, 900\]\];/.test(FITSRC) && /r\.top < T - 1 && r\.bottom > T \+ 1/.test(FITSRC) && /openDressPicker\(/.test(FITSRC), '⑬ [DRESS_BAR_FIT] dress-fit.mjs 가 여섯 크기 × (목록 + 자세히 여섯)에서 «막대 선에 걸린 글줄 0»을 잰다(겹화면 · 단독)');

  // ⑪ 코워크 검토 4(10/23) — 배포 전 전면 재검토
  const JS = (PAGE.match(/<script>\n\/\* ★★\[DRESS_PAGE\][\s\S]*?<\/script>/) || [''])[0];
  const fnOf = (name) => (JS.match(new RegExp('function ' + name + '\\([^)]*\\)\\{[\\s\\S]*?\\n  \\}\\n')) || [''])[0];
  t(!!JS, '⑪ 고르기 · 공개 화면 스크립트를 찾았다');
  // [DRESS_LINE_ONE] 라인 설명 한 문장 · 함께 볼 점은 슬립 · 컬럼 둘(명세 글 그대로)
  const LINE_TX = { slip: ['얇은 새틴이 몸을 따라 흐르는 라인입니다.', '누드톤 심리스 속옷을 함께 준비하시면 좋습니다.'], column: ['위에서 아래로 곧게 떨어지는 단정한 라인입니다.', '앉고 걷는 품을 시착 때 함께 확인해 보세요.'],
    aline: ['허리에서 아래로 가볍게 퍼지는 라인입니다.', ''], empire: ['가슴 아래에서 허리선이 잡혀 조이지 않는 편안한 라인입니다.', ''], twopiece: ['상의와 치마가 나뉘어 볼레로나 재킷을 더하기 좋은 구성입니다.', ''] };
  t(R.lines.every((l) => LINE_TX[l.key] && l.lead === LINE_TX[l.key][0] && l.note === LINE_TX[l.key][1]), '⑪ [DRESS_LINE_ONE] 라인 설명 = 한 문장씩 · 함께 볼 점은 슬립 · 컬럼 둘(명세 글 그대로)');
  t(/\(ln && ln\.note \? '<p class="dotln">' \+ esc\(ln\.note\) \+ '<\/p>' : ''\)/.test(fnOf('detailHTML')), '⑪ [DRESS_LINE_ONE] 함께 볼 점은 있을 때만 점 한 줄([NOTE_DOT] · 이제 자세히 안)');
  // [DRESS_Q_WORDS] 물음 · 답 글
  const qOf = (k) => R.questions.find((q) => q.key === k) || { opts: [] };
  t(qOf('len').opts.map((o) => o[1]).join('|') === '발목까지|미디(종아리)|미니(무릎 근처)', '⑪ [DRESS_Q_WORDS] 길이 답 = 발목까지 · 미디(종아리) · 미니(무릎 근처)(칸 한 줄의 «미디 · 미니»와 이어진다 · [DRESS_Q_TRIM] «아직 몰라요» 없음)');
  t(!R.questions.some((q) => q.opts.some((o) => o[0] === 'unsure' || /아직 몰라요/.test(o[1]))), '⑬ [DRESS_Q_TRIM] 물음 어디에도 «아직 몰라요»가 없다(빠져나가는 길은 «건너뛰기» · «질문 없이 바로 보기» 둘)');
  t(qOf('pref').q === '이런 드레스가 편하신가요?' && qOf('pref').opts.map((o) => o[1]).join('|') === '노출이 적은 드레스|소매나 볼레로가 있는 드레스|특별히 없어요', '⑪ [DRESS_Q_WORDS · DRESS_Q_FIRST] 셋째 물음 = «이런 드레스가 편하신가요?» · 노출이 적은 드레스 · 소매나 볼레로가 있는 드레스 · 특별히 없어요');
  const figs = qOf('fit').figs || {};
  t(['body', 'waist', 'loose'].every((k) => figs[k] && R.line(figs[k]) && R.line(figs[k]).fit === k) && figs.body === 'slip' && figs.waist === 'aline' && figs.loose === 'empire', '⑪ [DRESS_Q_WORDS] 핏 답 왼쪽 그림 = 슬립 · 라이트 A라인 · 엠파이어(그 라인의 핏과 같은 답)');
  t(/var ln = figs\[o\[0\]\] \? R\.line\(figs\[o\[0\]\]\) : null;/.test(fnOf('qHTML')) && /class="pk-ofig" aria-hidden="true"/.test(fnOf('qHTML')), '⑪ [DRESS_Q_WORDS] 핏 답에 작은 라인 그림');
  // [DRESS_NO_INTRO] [DRESS_SKIP_Q] [DRESS_NO_PICK_OK]
  t(!/function introHTML|몇 가지 답하고 보기|바로 둘러보기/.test(JS) && /var S = \{ view: 'q', q: 0,/.test(JS), '⑪ [DRESS_NO_INTRO · DRESS_Q_FIRST] 인트로 없음 — 열면 물음 1부터(사장님 10/24 «질문을 먼저 의무적으로»)');
  t(/<p class="pk-solo" id="pkSolo" hidden>이 화면에서 고른 것은 저장되지 않아요<\/p>/.test(PAGE) && /if \(!EMBED\) \$\('pkSolo'\)\.hidden = false;/.test(JS), '⑪ [DRESS_NO_INTRO] 단독(?pick=1)일 때만 머리 아래 «이 화면에서 고른 것은 저장되지 않아요»');
  t(!/data-act="browse"|pk-skipq|바로 보기/.test(decom(JS)) && !/act === 'browse'/.test(JS), '⑪ [DRESS_Q_FIRST] 물음 아래 «드레스 바로 보기 ›»(browse) 없음 — 답해야 결과로 간다');
  t(!/pk-band-dots/.test(fnOf('bandHTML')) && !/안 고르셔도|고르지 않으셔도/.test(decom(JS) + decom(card)) && !/고르셔도/.test(decom(fnOf('qHTML'))), '⑬ [DRESS_Q_FIRST · DRESS_NO_DEADLINE] 띠 아래 점 줄 없음(결과 맨 아래 한 줄로) · «안 고르셔도 …» 줄은 걷었다');
  t(/\(S\.q > 0 \? '<button type="button" class="cc-btn-ghost" data-go="-1">이전<\/button>' : ''\)/.test(fnOf('barHTML')), '⑪ [DRESS_NO_INTRO] 첫 물음 막대에는 «이전»이 없다(갈 곳이 없다 · 스냅 기획 첫 걸음과 같다)');
  // [DRESS_PICK_TIER] 진한 단추가 한 화면에 둘 서지 않게
  const dph = fnOf('detailPickHTML');
  t(/else if \(!count\(\)\) ctl = '<button type="button" class="cc-btn" data-act="pick">입어 볼 드레스로 고르기<\/button>';/.test(dph) && /else ctl = '<button type="button" class="cc-btn-ghost" data-act="pick">Nº 0' \+ \(S\.picks\.indexOf\(null\) \+ 1\) \+ '로 고르기<\/button>';/.test(dph), '⑪ [DRESS_PICK_TIER] 자세히 = 0벌이면 칠한 «입어 볼 드레스로 고르기» · 한 벌 뒤에는 외곽 «Nº 02로 고르기»');
  t(/c === 0 \? '드레스를 골라 주세요'/.test(fnOf('barHTML')) && !/두 벌을 골라 주세요/.test(PAGE), '⑪ [DRESS_PICK_TIER] 막대 0벌 = «드레스를 골라 주세요»(«두 벌»이라 하지 않는다 · 한 줄)');
  // [DRESS_FIT_FEE] 시착비 — 숫자를 홈 가격표 · 신청서 · 시착 동의서와 대조
  const J70 = rd('automation/platform/70_journey.gs') || '';
  /* [DRESS_FIT_FEE] 공개 시착 칸(세 문장 · 점 줄 셋)은 공개 화면과 함께 걷었다([DRESS_PUBLIC_OFF]) — 고르기 막대 «안 입은 드레스는 시착비가 들지 않아요»의 근거 숫자만 대조한다 */
  t(PAGE.indexOf('class="fit-p"') < 0 && PAGE.indexOf('class="fit-dots"') < 0, '⑪ [DRESS_PUBLIC_OFF] 공개 시착 칸(세 문장 · 점 줄)이 없다');
  t(J70.indexOf("'드레스 시착은 2벌까지 포함됩니다. (3벌째부터 1벌당 50,000원)'") > -1 && J70.indexOf('실제 진행한 벌수만큼(1벌당 50,000원 · 최대 100,000원) 예약금이 시착 비용으로 공제되고 나머지는 전액 환불됩니다') > -1, '⑪ [DRESS_FIT_FEE] 시착 동의서(70_journey FITTING_CONSENT) = 2벌 포함 · 3벌째부터 1벌당 50,000원 · 최대 100,000원 — 시착비 금액은 상담 카드 · 시착 동의서가 맡는다');
  t(IDXX.indexOf('<li>드레스 시착 <span class="li-meta">상담 당일 · 기본 2벌</span></li>') > -1 && IDXX.indexOf('<li>추가 시착 <span class="li-price">₩50,000<span class="li-meta">/벌 · 3벌째부터</span></span></li>') > -1, '⑪ [DRESS_FIT_FEE] 홈 가격표 = 상담 당일 · 기본 2벌 · ₩50,000/벌 · 3벌째부터 — 시착 동의서와 같은 숫자');
  t(INQX.indexOf('시착(기본 2벌)은 상담 당일 동의 후 진행됩니다. 계약을 진행하지 않으시면 시착하신 벌수만큼(1벌 50,000원 · 최대 100,000원) 차감되고 나머지 예약금은 환불됩니다.') > -1, '⑪ [DRESS_FIT_FEE] 신청서 Nº 03 = 기본 2벌 · 최대 100,000원 · 차감 — 시착 동의서와 같은 숫자');
  t(!/pk-bar-note|시착비/.test(decom(PAGE)), '⑬ [DRESS_BAR_PLAIN] 고르기 화면에 시착비 줄이 없다 — 막대 위 «안 입은 드레스는 시착비가 들지 않아요.»를 걷었다(금액 안내는 상담 카드 «예식까지 함께 챙길 것들» · 시착 동의서 몫)');
  t(fnOf('doneHTML').indexOf('<p class="dotln">시착(기본 2벌)은 현장에서 다시 보고 정하셔도 돼요.</p>') > -1 && !/입어 볼지는 상담 날/.test(decom(JS) + decom(card)), '⑪ [DRESS_NO_DEADLINE] 완료 화면 점 줄도 «시착(기본 2벌)은 …» 같은 말(카드 · 띠 · 완료 한 문장)');
  // [DRESS_MEMO_DONE] 남길 말 = 완료 화면 · «남기기»
  t(/id="pkMemo"/.test(fnOf('doneHTML')) && !/pkMemo/.test(fnOf('listHTML')) && !/pkLeave|data-act="leave"/.test(PAGE) && /<button type="button" class="cc-btn" id="pkHome" data-act="home">마이페이지로 돌아가기<\/button><p class="pk-done-err" id="pkDoneErr" role="alert"><\/p>/.test(fnOf('doneHTML')) && /디렉터에게 남길 말 <span>\(선택\)<\/span>/.test(fnOf('doneHTML')), '⑬ [DRESS_MEMO_DONE · DRESS_MEMO_ONEBTN] 남길 말은 완료 화면 · 작은 «남기기» 알약 없음 · 아래 단추 하나(실패 한 줄은 단추 아래) · 목록에는 없다');
  t(/hb\.textContent = sending \? '남기는 중…' : \(md \? '남기고 돌아가기' : '마이페이지로 돌아가기'\);/.test(fnOf('paintHead')) && /var md = EMBED && S\.memo\.trim\(\) !== baseMemo\(\)/.test(fnOf('paintHead')) && /if \(act === 'home'\) \{ if \(EMBED && S\.memo\.trim\(\) !== baseMemo\(\)\) save\('home'\); else if \(EMBED\) exit\(\); else location\.href = '\/mypage\.html'; return; \}/.test(JS) && /exit: mode === 'exit' \|\| mode === 'home'/.test(fnOf('save')), '⑬ [DRESS_MEMO_ONEBTN] 글을 고치면 «남기고 돌아가기»(저장이 닿으면 닫는다) · 아니면 «마이페이지로 돌아가기» · 단독은 늘 «마이페이지로 돌아가기»');
  t(/\.pk-fig\{width:140px/.test(PAGE) && /<span class="dr-badge" aria-hidden="true">' \+ n \+ '<\/span>/.test(fnOf('doneHTML')), '⑪ [DRESS_MEMO_DONE] 완료 화면 그림 140px · Nº 01 · Nº 02 표시');
  // [DRESS_EXIT_ASK] 나가기 판 — 마이페이지 입력 화면과 같은 규칙 · 같은 판
  const op = (MP.match(/function openDressPicker\(dr, opt\)\{[\s\S]*?\n\}\n/) || [''])[0];
  t(/<span class="wiz-acts"><button type="button" class="wiz-exit wiz-save" id="pkSave" disabled>저장<\/button><button type="button" class="wiz-exit" id="pkExit">나가기<\/button><\/span>/.test(PAGE), '⑪ [DRESS_EXIT_ASK] 머리 알약 «저장 · 나가기»(마이페이지 .wiz-acts 와 같은 모양)');
  t(/type: 'momentedit:dressExit'/.test(fnOf('exit')) && /type: 'momentedit:dressState', dirty: dirty\(\), failed: !!S\.failed, busy: !!S\.busy/.test(fnOf('syncState')), '⑪ [DRESS_EXIT_ASK] 겹화면은 나가기를 부모에게 묻고 «바뀐 게 있나 · 실패 · 저장 중»을 알린다');
  t(/function keyOf\(ids, memo\)\{ return JSON\.stringify\(\[ids, String\(memo \|\| ''\)\.trim\(\)\]\); \}/.test(JS) && /S\.base = keyOf\(ok, sv \? String\(sv\.memo \|\| ''\)\.slice\(0, 200\) : ''\);/.test(JS), '⑪ [DRESS_EXIT_ASK] «바뀐 게 있나» = 고른 두 벌 · 남길 말 대 서버 저장본(기준선은 채움 · 저장 성공 때)');
  t(/mpConfirm\(\{ title:st\.failed\?'저장이 아직 안 됐어요':'저장하지 않은 변경이 있어요',/.test(op) && /'저장하고 나갈까요\? 저장하지 않으면 방금 고치신 내용은 남지 않아요\.'/.test(op) && /yes:'저장하고 나가기', no:'그냥 나가기', dismissNull:true/.test(op), '⑪ [DRESS_EXIT_ASK] 판 = 마이페이지 입력 화면의 그 판(저장하지 않은 변경이 있어요 · 저장하고 나가기 · 그냥 나가기 · 닫으면 그대로)');
  t(/if\(!st\.dirty && !st\.failed\)\{ done\(\); return; \}/.test(op) && /var _bkId=bkOpen\(onBack\);/.test(op) && /if\(e\.key==='Escape' && document\.activeElement!==fr\) askExit\(false\);/.test(op) && /if\(m\.type==='momentedit:dressExit'\)\{ askExit\(false\); return; \}/.test(op), '⑪ [DRESS_EXIT_ASK · DRESS_BACK_STEP] 바뀐 게 없으면 바로 닫힌다 · 머리 «나가기» · 뒤로가기(겹화면이 물러설 곳이 없을 때) · Esc 셋이 한 곳(askExit)을 지난다');
  t(/if\(st\.busy\)\{ exitWait=true;/.test(op) && /var win=function\(\)\{ saved=true; failCode=''; if\(toExit\)\{ done\(\); return; \} ack\(true\); \};/.test(op), '⑪ [DRESS_EXIT_ASK] 저장 중이면 기다렸다 판단 · «저장하고 나가기»는 저장이 닿은 뒤에 닫는다');
  // [DRESS_SOLO_NOSAVE] 단독(?pick=1)은 저장이 없다 — «저장» · «남기기»를 숨기고(마이페이지 스냅 동의 전과 같은 꼴) 저장한 척하지 않는다
  const svSolo = (fnOf('save').match(/if \(!EMBED\) \{[\s\S]*?\n    \}/) || [''])[0];
  t(PAGE.indexOf('html.pk-alone #pkSave,html.pk-ro #pkSave{display:none}') > -1 && /if \(!EMBED\) document\.documentElement\.classList\.add\('pk-alone'\);/.test(JS), '⑪ [DRESS_SOLO_NOSAVE · DRESS_SEE_CLOSED] 단독 · 마감 뒤 보기만이면 머리 «저장»을 숨긴다');
  t(!!svSolo && !/S\.saved|S\.left|S\.base/.test(svSolo) && /go\('done'\)/.test(svSolo), '⑪ [DRESS_SOLO_NOSAVE] 단독은 저장한 척하지 않는다(«저장됨 · 남겼어요» 없음) · 막대 단추는 완료 화면으로 넘기기만');
  // [DRESS_SLIDES] 사진 있는 장만 · 한 장이면 넘김 없음
  const Rs = load(src);
  t(typeof Rs.slides === 'function' && JSON.stringify(Rs.slides({ img: 'a', ex: [{ t: '앞', img: 'b' }, { t: '뒤' }] })) === '[{"img":"b","t":"앞"}]' && JSON.stringify(Rs.slides({ img: 'a', ex: [{ t: '앞' }] })) === '[{"img":"a","t":""}]', '⑪ [DRESS_SLIDES] 넘겨 보는 사진 = 사진 있는 장만 · 없으면 대표 사진 한 장');
  t(/var sl = R\.slides\(d\), n = sl\.length[,;]/.test(fnOf('detailHTML')) && /\(n > 1 \? '<button type="button" class="dv-arr dv-prev"/.test(fnOf('detailHTML')), '⑪ [DRESS_SLIDES] 한 장이면 ‹ › 와 «n / 5»를 두지 않는다');
  /* [DRESS_PHOTO_FIRST] [DRESS_ONE_WIDTH] [DRESS_CLOSE_IN] [DRESS_NEXT_ONE] 은 공개 화면 몫이라 공개 화면과 함께 걷었다 — ⑫ [DRESS_PUBLIC_OFF] 가 «없다»를 본다 */
  // [DRESS_NUM_LINING] 숫자 모양
  t(/\.dr-badge\{[^}]*font-variant-numeric:lining-nums/.test(PAGE) && /\.pk-slot\{[^}]*font-variant-numeric:lining-nums/.test(PAGE) && /\.dst-pill\{[^}]*font-variant-numeric:lining-nums/.test(MP), '⑪ [DRESS_NUM_LINING] Nº 칸 · 배지 · 스티커 알약 = lining-nums(«Nº o1»로 읽히지 않게)');
  /* [DRESS_HOME_BELOW] 홈 «드레스 둘러보기»는 명세 2(사장님 «마이페이지만»)로 걷었다 — ④ 가 «홈에 드레스 자리 없음»을 본다 */
  // ★[DRESS_DECIDED_1023 코워크 회신 4 보충 · 사장님 «너가 홈페이지 뒤져서 찾아봐»] 결정 대기 셋(맞추는 방식 · 대여 포함 · 두 번째 의상)을 사이트 · 계약서 근거로 닫았다
  //   [DRESS_RENT_ONE] 대여 = 1벌 기본 포함 · 2벌부터 추가 비용 — 신청서 «대여 희망 벌 수»와 같은 뜻 · 금액은 쓰지 않는다(2벌째 금액은 어디에도 없다)
  //   ★[DRESS_PUBLIC_OFF 명세 2] 대여 줄은 공개 시착 칸과 함께 걷었다 — 고르기 화면 · 원천 어디에도 대여 금액을 쓰지 않는다(2벌째 금액은 시그니처 쪽 어디에도 없다)
  const rentLines = [decom(PAGE), strs.join('\n')].join('\n').split('\n').filter((x) => /대여/.test(x));
  t(!rentLines.some((x) => /[0-9][0-9,]*\s*원|₩/.test(x)), '⑪ [DRESS_RENT_ONE] 대여를 말하는 줄에 금액이 없다' + (rentLines.length ? ' · ' + rentLines.map((x) => x.trim().slice(0, 40)).join(' / ') : ''));
  //   [DRESS_KNEE_SECOND] 미니 = «두 번째 의상»은 쓰되 다이닝 자리는 쓰지 않는다(140분 Farewell 환복 뒤 다이닝 · 대여 드레스로 식당에 가지 않는다)
  const knee = R.lengthOf('knee');
  t(!!knee && knee.note === '무릎 근처 길이로, 가볍고 경쾌해 두 번째 의상으로도 잘 어울립니다.', '⑪ [DRESS_KNEE_SECOND] 미니 설명 «무릎 근처 길이로, 가볍고 경쾌해 두 번째 의상으로도 잘 어울립니다.»' + (knee ? '' : ' · knee 없음'));
  //   [DRESS_CALF_FRESH 코워크 회신 5] 미디 «산뜻합니다» — 길이 설명의 «경쾌»는 미니 한 번만(이웃 줄에 같은 낱말 두 번 없음)
  const calf = R.lengthOf('calf');
  t(!!calf && calf.note === '종아리 길이로, 구두까지 보여 산뜻합니다.' && R.lengths.filter((g) => String(g.note || '').indexOf('경쾌') > -1).length === 1, '⑪ [DRESS_CALF_FRESH] 미디 «종아리 길이로, 구두까지 보여 산뜻합니다.» · 길이 설명의 «경쾌»는 미니 한 번만');
  const meal = [strs.join('\n'), decom(PAGE)].some((x) => x.indexOf('식사') > -1);
  t(!meal, '⑪ [DRESS_KNEE_SECOND] 드레스 글에 «식사»가 없다 — 대여 드레스는 다이닝 자리에 입고 가지 않는다');
  //   [DRESS_FITNOTE_EMPTY] 맞추는 방법은 어디에도 없다 — 지어 쓰지 않고 빈 값 · 머리 본문이 그 몫
  t(R.fitNote === '', '⑪ [DRESS_FITNOTE_EMPTY] fitNote 빈 값(맞추는 방법은 어디에도 없다 · 지어 쓰지 않는다)');
  const banned = ['두 번째 착장', '갈아입', '대여료', '추가금'].filter((w) => strs.join('\n').indexOf(w) > -1 || decom(PAGE).indexOf(w) > -1);
  t(!banned.length, '⑪ [DRESS_DECIDED_1023] 쓰지 않는 낱말 없음(옛 «두 번째 착장» · 갈아입기 · 대여료 · «추가금» — 공개 글은 «추가 비용»)' + (banned.length ? ' · ' + banned.join(', ') : ''));

  // ⑫ 코워크 설계 명세 2(10/23) — 신청 직후 마이페이지 · 공개 쪽 걷기
  //   [DRESS_PUBLIC_OFF] 공개 «의상과 소품» 화면 · 홈 단추는 걷었다 — ?pick=1 이 아니면 마이페이지로 · 공개 화면 몫 코드 · 스타일 0 · 푸터 검사도 네 면
  t(PAGE.indexOf("<script>if(!/[?&]pick=1(?:&|$)/.test(location.search))location.replace('/mypage.html');</script>") > -1 && PAGE.indexOf('location.replace') < PAGE.indexOf('<style>'), '⑫ [DRESS_PUBLIC_OFF] ?pick=1 이 아니면 머리에서 바로 마이페이지로 넘긴다(그리기 전 · replace)');
  const PUB = ['id="pubView"', 'id="pubMain"', 'id="pubFoot"', 'id="dvLayer"', 'class="hero', 'id="secDresses"', 'id="lineList"', 'id="lenList"', 'class="cta-btn"', 'function renderPublic', 'function openLayer', 'function nextOf', '<footer', '<nav'].filter((x) => PAGE.indexOf(x) > -1);
  t(!PUB.length, '⑫ [DRESS_PUBLIC_OFF] 공개 화면 몫(머리 사진 · 드레스 그리드 · 라인 · 길이 · 시착 · 단추 · 푸터 · 자세히 겹화면)이 없다' + (PUB.length ? ' · 남음 ' + PUB.join(', ') : ''));
  t(/<title>드레스 미리 보기 · 모먼트에디트<\/title>/.test(PAGE) && !/og:|twitter:|rel="canonical"/.test(PAGE), '⑫ [DRESS_PUBLIC_OFF] 제목 = «드레스 미리 보기» · 공유 · 검색용 머리 태그 없음(겹화면 전용)');
  t(/const PAGES = \['index', 'inquiry', 'privacy', 'parents'\];/.test(FPAR), '⑫ [DRESS_PUBLIC_OFF] 푸터 대조는 네 면(dress 없음)');
  //   [DRESS_LIST_FIRST] 열면 목록 · 물음은 목록 맨 위 띠(«답하기 ›» · 답한 뒤 고른 답 + «답 바꾸기 ›») · 진행 표시는 물음 셋에서만
  t(/var STEPS = R\.questions\.map\(function\(q\)\{ return q\.step; \}\);/.test(JS) && !/stepsHTML/.test(fnOf('listHTML')) && /return stepsHTML\(i\) \+/.test(fnOf('qHTML')), '⑫ [DRESS_LIST_FIRST · DRESS_Q_TRIM] 진행 표시는 물음 셋(이름은 원천 한 곳 · 길이 · 핏 · 노출 · 소매)에서만 — 목록에는 없다');
  const band = fnOf('bandHTML');
  t(/return '<div class="pk-band"><p class="pk-band-t">' \+ esc\(said\) \+ '<\/p>'/.test(band) && !/어울리는|답하기|원하시는 길이와 핏을/.test(decom(band)) && /data-act="ask">답 바꾸기 <span aria-hidden="true">&rsaquo;<\/span><\/button>/.test(band), '⑫ [DRESS_Q_FIRST] 결과 맨 위 띠 = 고른 답 글 + «답 바꾸기 ›»(답 없는 띠 «답하기 ›»는 없다)');
  t(/if \(Array\.isArray\(v\) \? v\.indexOf\(o\[0\]\) >= 0 : v === o\[0\]\) out\.push\(o\[1\]\);/.test(fnOf('ansWords')) && /return out\.join\(' · '\);/.test(fnOf('ansWords')), '⑫ [DRESS_LIST_FIRST] 띠의 답 글 = 물음의 답 글을 « · »로(건너뛰기 · 옛 저장본의 unsure 는 답 글이 없어 빠진다)');
  t(/if \(act === 'ask'\) \{ S\.touched = true; go\('q', \{ q: 0 \}\); return; \}/.test(JS) && /if \(S\.q < 2\) \{ go\('q', \{ q: S\.q \+ 1 \}\); return; \}[\s\S]*?go\('list'\);/.test(fnOf('stepGo')) && !/pk-foot|data-act="reask"/.test(PAGE), '⑫ [DRESS_Q_FIRST] «답 바꾸기 ›»는 물음 1부터(고른 답 · 고른 드레스 그대로) · 셋째 물음 뒤는 결과');
  //   [DRESS_LINE_IN_DETAIL] 자세히 = 그 드레스 라인의 한 줄 설명 · 함께 볼 점(⑩ 이 자리 순서를 본다)
  t(/var sl = R\.slides\(d\), n = sl\.length, ln = R\.line\(d\.line\);/.test(fnOf('detailHTML')) && /\.dv-lead\{font-size:14px;color:var\(--sub\);line-height:1\.85;margin-top:14px\}/.test(PAGE), '⑫ [DRESS_LINE_IN_DETAIL] 자세히가 그 드레스 라인(lines[].lead · note)을 읽는다');
  //   [DRESS_MOOD_OWN] 분위기 글(mood)이 라인 설명(lead)을 되풀이하지 않는다 — 자세히에서 바로 아래위로 나간다(띄어쓰기 · 문장부호를 뺀 이어진 글자 5개 이상 겹침 = 빨강)
  const sq = (x) => String(x || '').replace(/[\s.,·()]/g, '');
  const run = (a, b) => { a = sq(a); b = sq(b); let best = ''; for (let i = 0; i < a.length; i++) for (let j = i + best.length + 1; j <= a.length; j++) { const u = a.slice(i, j); if (b.indexOf(u) > -1) best = u; else break; } return best; };
  const echo = R.dresses.map((d) => [d.id, run(d.mood, (R.line(d.line) || {}).lead)]).filter((x) => x[1].length >= 5);
  t(!echo.length, '⑫ [DRESS_MOOD_OWN] 드레스 분위기 글이 그 라인 설명을 되풀이하지 않는다(5글자 넘게 겹침 0)' + (echo.length ? ' · ' + echo.map((x) => x[0] + ' «' + x[1] + '»').join(', ') : ''));
  //   [DRESS_CARD_SEE] 카드 · 고르기 화면 머리 · 겹화면 이름 = «드레스 미리 보기» · 0벌 말
  t(!/<div class="cc-title">드레스 미리 보기<\/div>|<div class="cc-eyebrow en-22">Dress<\/div>/.test(decom(MP)) && !/<div class="cc-title">시착 준비<\/div>/.test(decom(MP)), '⑬ [DRESS_STICKER · DRESS_CARD_SEE] 이름 «드레스 미리 보기»는 스티커 글 · 겹화면 머리에만 — 따로 카드 제목(Dress)은 없다');
  t(/<span class="pk-head-n">드레스 미리 보기<\/span>/.test(PAGE) && /fr\.title='드레스 미리 보기';/.test(pick) && /card\.setAttribute\('aria-label','드레스 미리 보기'\);/.test(pick), '⑫ [DRESS_CARD_SEE] 고르기 화면 머리 · 팝업 창 이름도 «드레스 미리 보기»([COURSE_WIDE] 같은 말)');
  //   [DRESS_NO_DATE] 상담 날짜가 없으면 마감 줄 대신 — 0벌은 줄을 빼고 · 1 · 2벌은 «상담 날짜가 정해지면 바꾸기 마감일을 알려 드릴게요.»
  t(!/var dueLine|notes=/.test(card), '⑫ [DRESS_NO_DEADLINE · DRESS_CARD_MIN] 카드에 마감 줄 · 점 줄 없음');
  t(/function _dressYmd_\(cr\)/.test(gas || '') && /function _dressOpen_\(ymd\) \{[^}]*\[DRESS_NO_DEADLINE[^}]*return true;\s*\}/.test(gas || '') && /open: _dressOpen_\(y\)/.test(gas || '') && !/바꾸기 마감이 지났어요/.test(decom(gas || '')), '⑫ [DRESS_NO_DEADLINE] 서버 = 늘 열림 · 저장을 날짜로 거절하지 않는다 — 동작은 dress-pick.test.js 가 잰다');
  //   [DRESS_SIGNUP_MAIL] [DRESS_CONFIRM_ZERO] 메일
  t(/상담 날 입어 보실 드레스도 <a href="' \+ safeAttr\(mypage\) \+ '" style="color:#7A5F37;font-weight:500">마이페이지<\/a>에서 미리 둘러보실 수 있습니다\./.test(SU) && /_dRow && _dressMailOk_\(_dRow\)/.test(SU) && /dressLine \+   \/\/ \[DRESS_SIGNUP_MAIL\]/.test(SU), '⑫ [DRESS_SIGNUP_MAIL] 신청 접수 메일 한 줄 + 마이페이지 링크(판정은 확정 메일과 같은 _dressMailOk_)');
  t(/_dressMailOk_\(row\) && !_dressPicked_\(row\)/.test(gas || ''), '⑫ [DRESS_CONFIRM_ZERO] 확정 메일의 드레스 줄은 아직 한 벌도 안 고른 분에게만');

  // ⑬ 코워크 디자인 라운드 1(10/23)
  //   [DRESS_CARD_PHOTOS] 카드 0벌 = 원천 앞 세 벌 칸 · 1 · 2벌 · 마감 뒤 = 고른 드레스 칸(같은 크기 · 누를 수 있다 · 이름 두 줄) · [DRESS_SEE_TAP] 칸 = 그 드레스 자세히
  t(!/data-dress-see|R\.list\(\)\.slice\(0,3\)\.map\(see\)/.test(decom(MP)), '⑬ [DRESS_STICKER · DRESS_SEE_TAP] 카드 사진 칸(누르면 그 드레스 자세히)은 카드와 함께 걷었다 — 고른 드레스는 겹화면에서');
  // [DRESS_CARD_PHOTOS] 카드 사진 칸 CSS — 카드와 함께 걷었다
  t(!/\.dr-ths?\{|\.dr-th-pv\{|\.dr-th-badge\{|\.dr-th-n\{/.test(decom(MP)), '⑬ [DRESS_CARD_PHOTOS · DRESS_STICKER] 걷은 카드의 사진 칸 CSS 가 남아 있지 않다');
  t(/if \(OPEN && R\.dress\(OPEN\)\) \{ S\.view = 'detail'; S\.cur = OPEN; \}/.test(JS) && /if \(S\.view !== 'detail'\) \{ S\.view = S\.answered \? 'list' : 'q'; S\.q = 0; \}/.test(fnOf('applyFill')) && /if \(!S\.answered\) \{ go\('q', \{ q: 0 \}\); return; \}/.test(fnOf('backToList')), '⑬ [DRESS_SEE_TAP · DRESS_Q_FIRST] &open=<id> 면 자세히부터(채움이 와도 머문다) · 답한 적이 있으면 결과 · 없으면 물음 1 · 자세히에서 돌아갈 때 답이 없으면 물음 1');
  //   [DRESS_SEE_CLOSED] 바꾸기 마감 뒤 칸을 눌러 들어오면 보기만 — 막대 · 고르기 · 빼기 · 머리 저장 · 점 줄 없음
  t(/var ro = false, roNew = ro !== S\.ro;/.test(fnOf('applyFill')) && /if \(\(S\.view === 'list' \|\| S\.view === 'detail'\) && !S\.ro\)/.test(fnOf('barHTML')), '⑬ [DRESS_NO_DEADLINE] 보기만(pk-ro)으로 가지 않는다 — 부모가 open:false 를 보내도 고르기 · 막대가 그대로');
  //   [DRESS_ONE_GRID] 한 그리드 · 맞는 칸 앞 · «답과 맞아요»(gold-text · 칠 없음) · 두 덩어리 · 구분선 · 소제목 «드레스» 없음
  t(/'<h3 class="pk-sub-h">답에 맞는 드레스<\/h3>'/.test(fnOf('listHTML')) && /'<h3 class="pk-sub-h">다른 드레스<\/h3>' \+ gridHTML\(sp\.rest\)/.test(fnOf('listHTML')) && /<button type="button" class="cc-btn-ghost pk-more" data-act="more">다른 드레스도 보기<\/button>/.test(fnOf('listHTML')) && /답에 꼭 맞는 드레스가 없어 가까운 드레스를 먼저 놓았어요\./.test(fnOf('listHTML')) && /var open = S\.more \|\| rest\.some\(function\(d\)\{ return S\.picks\.indexOf\(d\.id\) >= 0; \}\);/.test(fnOf('splitList')) && /front = rest\.slice\(0, 3\)/.test(fnOf('splitList')) && /gridHTML\(sp\.front\)/.test(fnOf('listHTML')) && !/추천|맞춤/.test(decom(JS)), '⑬ [DRESS_RESULT_SPLIT] 결과 = «답에 맞는 드레스»(맞는 칸만 · 없으면 가까운 3벌 + 한 줄) → «다른 드레스도 보기» → 나머지(«다른 드레스») · 고른 드레스가 나머지에 있으면 처음부터 펼침 · «추천 · 맞춤» 없음');
  //   [DRESS_CARD_ON] 상담 카드 — 드레스 카드가 보일 때만 진행 흐름 시착 줄을 빼고 · 확정 카드 방문 전 안내에 «챙겨 오실 것»
  const cons = (MP.match(/function renderConsult\(c, product, d, boxArg, demo\)\{[\s\S]*?\n\}\n/) || [''])[0];
  t(/var dressOn = !isSnap && !!d && _dressCardOn\(d\);/.test(cons) && /\(isSnap\|\|dressOn\?'':'<div class="vg-row"><span class="vg-k">상담 · 시착<\/span><span class="vg-v">드레스 시착은 상담 당일 함께 진행돼요\.<\/span><\/div>'\)/.test(cons) && /\(dressOn \? '<div class="vg-row"><span class="vg-k">챙겨 오실 것<\/span><span class="vg-v"><span class="ln-bal">누드톤 심리스 속옷과 실리콘 브라<\/span><span class="ln-bal">예식 날 신을 굽 높이의 신발<\/span><\/span><\/div>' : ''\)/.test(cons), '⑬ [DRESS_CARD_ON] 상담 카드 — 드레스 카드가 보일 때만 진행 흐름 시착 줄 빼기 · 방문 전 안내 «챙겨 오실 것»(꺼짐 · 자체 준비 · 스냅은 그대로)');
  t(cons.indexOf("'<div class=\"vg-row\"><span class=\"vg-k\">챙겨 오실 것") > cons.indexOf('<div class="vg-title">방문 전 안내</div>') && cons.indexOf('<div class="vg-title">방문 전 안내</div>') > -1, '⑬ [DRESS_CARD_ON] «챙겨 오실 것»은 확정 카드 «방문 전 안내» 안');
  t(/  box\.innerHTML = '<div class="consult-card'\+\(DST\?' cc-st':''\)\+'">'\+DST\+'<div class="cc-eyebrow en-22">'/.test(cons) && !/vg-st|\+DST\b(?!\+'<div class="cc-eyebrow)/.test(decom(cons).replace("'+DST+'<div class=\"cc-eyebrow", '')) && /\n  _dstWire\(box, d, demo\);/.test(cons) && !/vg-st/.test(decom(MP)), '⑬ [DRESS_STICKER_HEAD] 스티커 자리 = 상담 카드 머리 오른쪽 위(확정 · 확정 전 · 변경 제안 모두) · 안내 블록 비움(.vg-st)은 걷었다 · 판정은 [DRESS_CARD_ON] 그대로');
  t(/<li>누드톤 심리스 속옷과 실리콘 브라<\/li><li>예식 날 신을 굽 높이의 신발<\/li>/.test(fnOf('doneHTML')), '⑬ [DRESS_CARD_ON] 챙겨 오실 것 낱말 = 고르기 완료 화면 «준비해 오시면 좋아요»와 같다');
  /* ★[DRESS_BAR_FIT 라운드 1 · 2 «막대에 반쯤 걸린 글 0»] 첫 화면 맞춤 — 크기마다 줄 자리가 달라 CSS 한 값으로는 못 맞춘다(실측은 dress-fit.mjs) */
  const fitB = fnOf('fitBar'), fitK = fnOf('fitKey'), rnd = fnOf('render');
  t(/var said = ansWords\(\)\.split\(' · '\)\.map\(function\(p\)\{ return p\.replace\(\/ \/g, '\\u00a0'\); \}\)\.join\(' · '\);/.test(fnOf('bandHTML')), '⑬ [DRESS_BAND_KEEP] 답한 띠 = 답 하나는 한 덩어리(답 중간에서 줄이 꺾이지 않는다)');
  t(/try \{ fitBar\(\); \} catch \(e\) \{\}/.test(rnd) && rnd.indexOf('fitBar()') > rnd.indexOf('window.scrollTo(0, 0)') && rnd.indexOf('window.scrollTo(0, 0)') > -1, '⑬ [DRESS_BAR_FIT] 그릴 때마다 첫 화면 맞춤(맨 위로 올린 뒤)');
  t(/var box = dt \? m\.querySelector\('\.dv-view'\) : v === 'list' \? m\.querySelector\('\.pk-grid'\) : null;/.test(fitB) && /iv\.push\(\[r\.top - T \+ 0\.5, r\.bottom - T \+ 6\]\)/.test(fitB), '⑬ [DRESS_BAR_FIT] 자세히 = 사진 폭 · 목록 = 그리드 위 여백 · 보이는 줄은 막대 선 위 6px 여유 · 숨는 줄은 선 아래로 다');
  t(/hi = Math\.min\(40, \(base - 150\) \* 4 \/ 3\); lo = Math\.max\(-40, -\(Math\.min\(360, cw\) - base\) \* 4 \/ 3\);/.test(fitB) && /if \(c\) lo = Math\.max\(lo, c\.getBoundingClientRect\(\)\.bottom - T \+ 8\);/.test(fitB) && /hi = Math\.min\(12, base - 8\); lo = -24;/.test(fitB), '⑬ [DRESS_BAR_FIT · DRESS_RESULT_SPLIT] 옮기는 한도 — 고르기 단추는 막대 위 8px 이상 · 사진 150 ~ 360px · 그리드 위 여백 8px 이상 · 올림 12px · 내림 24px(결과 첫 그리드)');
  t(/if \(!had && \(window\.pageYOffset \|\| 0\) > 1\) return;/.test(fitB) && /function refit\(\)\{ if \(\(window\.pageYOffset \|\| 0\) > 1\) return; FIT = \{\};/.test(JS), '⑬ [DRESS_BAR_FIT] 첫 화면(스크롤 0)에서만 잰다 — 읽던 자리를 흔들지 않는다(글꼴이 늦게 떠도 읽던 중이면 정한 값 그대로)');
  t(/S\.cur \+ '\|' \+ \(S\.ro \? 1 : 0\);/.test(fitK) && !/S\.picks/.test(fitK) && /window\.innerWidth \+ 'x' \+ window\.innerHeight/.test(fitK), '⑬ [DRESS_BAR_FIT] 같은 드레스 · 같은 크기는 한 번 정한 값 그대로 — 고른 수는 열쇠에 없다(고르기 · 빼기로 사진이 움직이지 않게)');
  t(/^\s*FIT = \{\};/m.test(fnOf('applyFill')) && /window\.addEventListener\('resize'/.test(JS) && /document\.fonts\.addEventListener\('loadingdone'/.test(JS), '⑬ [DRESS_BAR_FIT] 저장본이 오면 · 화면 크기 · 글꼴이 바뀌면 다시 잰다');
  t(/\.pk-picked\{display:flex;align-items:center;gap:8px;min-height:calc\(30px \+ 14px \* 1\.3\);/.test(PAGE) && /\.cc-btn\{display:block;width:100%;text-align:center;padding:15px 18px;[^}]*font-size:14px;[^}]*line-height:1\.3;/.test(PAGE), '⑬ [DRESS_BAR_FIT] 고른 줄 높이 = 고르기 단추(위아래 15px + 14px × 1.3) — 고르기 · 빼기를 눌러도 아래 글이 움직이지 않는다');
  // ⑭ 코워크 디자인 라운드 2(10/23 · 사장님 «고객입장에서 디테일한 개선점들도») — 실제 동작은 dress-fit.mjs 가 잰다(뒤로가기 · 이웃 넘기기)
  const sb = fnOf('stepBack'), btl = fnOf('backToList');
  t(/if \(S\.view === 'detail'\) \{ backToList\(\); return true; \}/.test(sb) && /if \(S\.view === 'list'\) \{ go\('q', \{ q: R\.questions\.length - 1 \}\); return true; \}/.test(sb) && /if \(S\.view === 'q'\) \{ if \(S\.q > 0\) \{ go\('q', \{ q: S\.q - 1 \}\); return true; \} return false; \}/.test(sb), '⑭ [DRESS_BACK_STEP · DRESS_Q_FIRST] 한 걸음 = 자세히 → 결과 → 물음 3 → 2 → 1 → false(부모가 나가기 판단)');
  t(/var back = S\.cur, y = S\.listY \|\| 0;/.test(btl) && /window\.scrollTo\(0, y\)/.test(btl) && /if \(act === 'list'\) \{ backToList\(\); return; \}/.test(JS) && /if \(e\.key === 'Escape' && S\.view === 'detail'\) \{ e\.preventDefault\(\); backToList\(\); \}/.test(JS) && /if \(op\) \{ S\.touched = true; S\.listY = window\.pageYOffset \|\| 0; go\('detail', \{ cur: op \}\); return; \}/.test(JS), '⑭ [DRESS_BACK_STEP] 목록으로 돌아가는 길 하나(«‹ 목록» · 뒤로가기 · Esc) · 떠날 때의 자리로');
  t(/else if \(m\.type === 'momentedit:dressBack'\) \{/.test(JS) && /stepped = stepBack\(\)/.test(JS) && /type: 'momentedit:dressBackDone', stepped: stepped/.test(JS), '⑭ [DRESS_BACK_STEP] 겹화면이 부모의 뒤로가기 질문(dressBack)에 한 걸음 물러서고 답한다(dressBackDone)');
  t(/function onBack\(\)\{\s*if\(closed\) return;\s*_bkId=bkOpen\(onBack\);/.test(op) && /backT=setTimeout\(function\(\)\{ backT=0; askExit\(false\); \}, 600\);/.test(op) && /post\(\{type:'momentedit:dressBack'\}\);/.test(op) && /if\(m\.type==='momentedit:dressBackDone'\)\{ if\(!backT\) return; clearTimeout\(backT\); backT=0; if\(!m\.stepped\) askExit\(false\); return; \}/.test(op) && /function rearm\(\)\{ if\(!closed && !bkAlive\(_bkId\)\) _bkId=bkOpen\(onBack\); \}/.test(op), '⑭ [DRESS_BACK_STEP] 마이페이지 — 뒤로가기 층을 바로 다시 걸고 겹화면에 묻는다 · 물러서면 그대로 · 아니면(또는 600ms 무응답) 나가기 판단');
  const nbh = fnOf('nbHTML');
  t(/function orderIds\(\)\{ var sp = splitList\(\); return sp\.front\.concat\(sp\.open \? sp\.rest : \[\]\)\.map/.test(JS) && /i > 0 \? R\.dress\(ids\[i - 1\]\) : null/.test(nbh) && /i < ids\.length - 1 \? R\.dress\(ids\[i \+ 1\]\) : null/.test(nbh) && /&lsaquo;<\/span>&nbsp;이전 드레스<\/button>/.test(nbh) && /다음 드레스&nbsp;<span aria-hidden="true">&rsaquo;/.test(nbh) && /class="pk-txt pk-nb-p"/.test(nbh) && /\+ detailHTML\(d, ctl\) \+ nbHTML\(d\);/.test(fnOf('detailPickHTML')) && /if \(nb\) \{ S\.touched = true; go\('detail', \{ cur: nb \}\); return; \}/.test(JS), '⑭ [DRESS_NEXT_PREV · DRESS_RESULT_SPLIT] 자세히 맨 아래 «‹ 이전 드레스 · 다음 드레스 ›» — 화면에 보이는 순서(접혀 있으면 «답에 맞는 드레스»까지) · 끝에서는 그쪽 단추 없음');
  t(/\.pk-nb\{display:flex;align-items:center;/.test(PAGE) && /\.pk-nb-n\{margin-left:auto;margin-right:-12px\}/.test(PAGE) && /\.pk-nb-p\{margin-left:-12px\}/.test(PAGE) && /\.pk-txt\{display:inline-flex;align-items:center;justify-content:center;min-height:44px;/.test(PAGE), '⑭ [DRESS_NEXT_PREV] 한쪽만 남아도 제자리 · 누르는 칸 44px');
  t(/\.dr-pv:active,\.pk-slot\.on:active\{transform:scale\(\.98\)\}/.test(PAGE) && /\.pk-opt:active\{transform:scale\(\.98\);background:var\(--bg2\)\}/.test(PAGE) && /\.dst:active \.dst-in\{transform:translateY\(1px\) scale\(\.98\);transition-duration:\.09s\}/.test(MP) && /\.dst:active \.dst-art\{filter:drop-shadow\(0 1px 1px rgba\(28,27,25,\.10\)\);transition-duration:\.09s\}/.test(MP) && /\.dst-in\{[^}]*transition:transform \.14s/.test(MP) && /@media \(hover:hover\) and \(pointer:fine\)\{ \.dst:hover \.dst-in\{transform:translateY\(-1px\)\} \.dst:hover \.dst-art\{filter:drop-shadow\(0 3px 4px rgba\(28,27,25,\.12\)\)\} \}/.test(MP) && /\.dst:focus-visible \.dst-box\{outline:2px solid var\(--gold-deep\);outline-offset:2px;border-radius:8px\}/.test(MP) && /\.trk-chip:active,\.wed-slot:active,\.dn-segbtn:active,\.dn-fpill:active,\.srv-opts button:active\{transform:scale\(\.98\);background:var\(--bg2\)\}/.test(MP), '⑭ [DRESS_PRESS · STICKER_FINISH_1024] 누르는 동안 반응 — 드레스 칸 · Nº 칸 .98 · 스티커 = 마우스 올림 위로 1px · 그림자 조금(140ms · 터치 없음) / 누름 .98 + 아래 1px · 그림자 낮게(90ms) · 초점 = 공통 금빛 테(그림 칸 둘레)');
  t(/\.dst-pill\{position:absolute;top:-6px;right:0;[^}]*min-width:24px;height:18px;[^}]*border-radius:9px;background:var\(--card-white\);color:var\(--text\);box-shadow:inset 0 0 0 1px var\(--gold-deep\);[^}]*font-size:10px;[^}]*font-variant-numeric:lining-nums/.test(MP) && !/\.dst-pill\{transform:translate/.test(MP) && /\.dst-box\{position:relative/.test(MP) && /\+ \(n\?'<span class="dst-pill" aria-hidden="true">'\+n\+'벌<\/span>':''\)/.test(stk), '⑭ [DRESS_STICKER · SEL_ONE] «n벌» = 저장한 결과만 · 흔들리지 않는 층 · 고리 오른쪽 옆(칸 위 −6 · 오른쪽 0) · 24×18 · 종이 바탕 · 금빛 1px · 반경 9 · 10px 먹 글 · 그림자 없음');
  t(/\.dst\{--dst-s:72px;[^}]*min-width:44px;min-height:44px/.test(MP) && /@media \(min-width:400px\)\{ \.dst\{--dst-s:76px\} \}/.test(MP) && /@media \(min-width:420px\)\{ \.dst\{--dst-s:80px\} \}/.test(MP) && /@media \(min-width:768px\)\{ \.dst\{--dst-s:84px\} \}/.test(MP) && /@media \(min-width:820px\)\{ \.dst\{--dst-s:88px\} \}/.test(MP) && /@media \(min-width:1024px\)\{ \.dst\{--dst-s:92px\} \}/.test(MP) && /@media \(min-width:1280px\)\{ \.dst\{--dst-s:96px\} \}/.test(MP) && /SZ='\(min-width:1280px\) 96px, \(min-width:1024px\) 92px, \(min-width:820px\) 88px, \(min-width:768px\) 84px, \(min-width:420px\) 80px, \(min-width:400px\) 76px, 72px'/.test(stk) && /width="176" height="176"/.test(stk) && /var DRESS_STICKER='\/assets\/dress\/sticker-';/.test(stk) && /112w, '\+P\+'128\.'\+ext\+' 128w, '\+P\+'176\.'\+ext\+' 176w'/.test(stk) && !/dst-ph/.test(decom(MP)), '⑭ [DRESS_STICKER · STICKER_FINISH_1024] 크기(그림 칸) = 72 · 76(400+) · 80(420+) · 84(768+) · 88(820+) · 92(1024+) · 96px(1280+) · 누름 칸 44px 이상 · 그림 크기 고정(자리 흔들림 없음)');
  const cellF = fnOf('cellHTML');
  t(cellF.indexOf("'<span class=\"dr-sum\">'") > -1 && cellF.indexOf("'<span class=\"dr-fit\" aria-hidden=\"true\">답과 맞아요</span>'") > cellF.indexOf("'<span class=\"dr-sum\">'"), '⑭ [DRESS_FIT_BELOW] «답과 맞아요»는 요약 줄 아래(이름 · 요약이 끊기지 않고 한 줄 칸끼리 높이가 맞다)');
  t(/\.dst-lb\{position:absolute;left:0;top:0;display:block;font-family:var\(--serif-ko\);font-weight:400;font-size:12px;line-height:18px;letter-spacing:\.02em;color:var\(--gold-deep\);white-space:nowrap;/.test(MP) && /\.dst\.dst-pm \.dst-lb\{font-size:11\.5px;line-height:16px\}/.test(MP) && !/\.dst-lb\{[^}]*filter/.test(MP) && /x=\(S-w\)\/2; y=S\+\(st\.classList\.contains\('dst-pm'\)\?4:6\);/.test(stk), '⑭ [DRESS_STICKER] 글 «드레스 미리 보기» = 금빛(gold-deep) · 명조 · 768+ 12px · 행간 18 · 그림 아래 6px 가운데 / 폰 11.5px · 행간 16 · 자간 .02em · 한 줄 · 그림자 · 필터 없음');
  // [DRESS_STICKER_ART] 그림 파일 — 크기마다 webp · png · 30KB 이하 · 176 webp 는 코워크가 보낸 그대로(sha256 앞 16자)
  { const files = [112, 128, 176].flatMap((n) => ['webp', 'png'].map((e) => `assets/dress/sticker-${n}.${e}`));
    const sz = files.map((f) => { try { return fs.statSync(path.join(ROOT, f)).size; } catch (e) { return -1; } });
    let sha = ''; try { sha = createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'assets/dress/sticker-176.webp'))).digest('hex').slice(0, 16); } catch (e) {}
    t(sz.every((b) => b > 0 && b <= 30 * 1024) && sha === 'f1a5b1883d368b2e', `⑯ [DRESS_STICKER_ART] 스티커 그림 여섯 벌(112 · 128 · 176 × webp · png) · 30KB 이하 · 176 webp 원본 그대로 (${sz.join(' · ')} · ${sha})`); }
  // [DRESS_STICKER] 흔들림 · 그림자 · 자리
  { const kf = (nm) => { const m = MP.match(new RegExp('@keyframes ' + nm + '\\{([^]*?)\\}\\}')); return m ? [...(m[1] + '}').matchAll(/(\d+)%\{transform:rotate\((-?[\d.]+)deg\)\}/g)].map((x) => [+x[1], +x[2]]) : []; };
    const sw = kf('dstSwing'), ob = kf('dstOrbit'), lv = kf('dstLevel');
    const swOk = JSON.stringify(sw.map((x) => x[1])) === JSON.stringify([-3, -6, 0, -5, -1.5, -3.8, -2.7, -3]);
    const syncOk = sw.length === ob.length && ob.length === lv.length && sw.every((x, i) => ob[i][0] === x[0] && lv[i][0] === x[0] && Math.abs(ob[i][1] - (x[1] + 3)) < 1e-9 && Math.abs(lv[i][1] + ob[i][1]) < 1e-9);
    t(swOk && syncOk && /\.dst\.is-sw \.dst-sw\{animation:dstSwing 2\.8s ease-in-out 1\}/.test(MP) && /\.dst\.is-sw \.dst-lb\{animation:dstOrbit 2\.8s ease-in-out 1\}/.test(MP) && /\.dst\.is-sw \.dst-lbt\{animation:dstLevel 2\.8s ease-in-out 1\}/.test(MP) && /@media \(prefers-reduced-motion:reduce\)\{ \.dst\.is-sw \.dst-sw,\.dst\.is-sw \.dst-lb,\.dst\.is-sw \.dst-lbt\{animation:none\} \.dst-in,\.dst:hover \.dst-in,\.dst:active \.dst-in\{transform:none;transition:none\} \.dst-art\{transition-duration:\.08s\} \}/.test(MP) && /\.dst-sw\{display:block;width:100%;height:100%;transform:rotate\(-3deg\);transform-origin:49% 2%\}/.test(MP) && /\.dst-art\{[^}]*filter:drop-shadow\(0 2px 2px rgba\(28,27,25,\.10\)\)/.test(MP) && /lb\.style\.transformOrigin=\(Math\.round\(\(\.49\*S-x\)\*10\)\/10\)\+'px '\+\(Math\.round\(\(\.02\*S-y\)\*10\)\/10\)\+'px';/.test(stk), `⑯ [DRESS_STICKER_SWAY · STICKER_FINISH_1024] 흔들림 = 고리 축 · 쉼 −3° · −6 → 0 → −5 → −1.5 → −3.8 → −2.7 → −3° · 2.8초 한 번 · 글은 같은 궤도(고리 축 · 그림과 같은 각도 차) + 안쪽 반대 각도 = 글줄 늘 수평 · 동작 줄이기 = 흔들림 · 이동 · 작아짐 없음 · 그림자만 80ms (${sw.length}칸)`); }
  t(/if\(!_dstSwungOnce && window\.IntersectionObserver\)/.test(stk) && /e\.intersectionRatio>=0\.6 && !_dstSwungOnce\)\{ _dstSwungOnce=true; io\.disconnect\(\); _dstSwing\(st\); \}/.test(stk) && !/addEventListener\('mouseenter'/.test(stk) && /if\(_dstScrolling\)\{ setTimeout\(go, 260\); return; \}/.test(stk) && /matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\) return;/.test(stk), '⑯ [DRESS_STICKER] 흔드는 때 = 카드가 보일 때 처음 한 번뿐(다시 그려도 · 창을 닫아도 · 답을 바꿔도 안 흔든다) · 스크롤이 멈춘 뒤 · 마우스 올림 흔들림 없음 · 동작 줄이기는 없음');
  const lay = (stk.match(/function _dstLayout\(card\)\{[\s\S]*?\n\}\n/) || [''])[0];
  t(/var k=Math\.max\(0, Math\.min\(1, \(W-360\)\/70\)\), r0=-2\+6\*k, t0=-14\+6\*k;/.test(lay) && /tries\.push\(\[t, r, lm, 'in', 'spec', -6\]\)/.test(lay) && /M=PH\?16:\(W<1024\?24:32\)/.test(lay) && /return v\.left>=M && v\.right<=W-M\+\.5 && l\.left>=M && l\.right<=W-M && p\.right<=W-M && q\.left>=0 && q\.right<=W && !_dstHits\(st, obs, bc\);/.test(lay) && /if\(fixedIn\(pe\)\) continue;/.test(stk) && /if\(!ok\)\{ ok=\[0,0,0,'none'\];/.test(lay), '⑯ [DRESS_STICKER_HEAD · STICKER_FINISH_1024] 자리 = 코워크 값에서 시작(폰 360 오른쪽 −2 · 위 −14 ~ 430 오른쪽 4 · 위 −8 · 768+ 카드 안 위 20 · 오른쪽 21) · 걸림돌과 겹침 0 · 화면 끝 16 · 24 · 32px · 없으면 멈춤(none)');
  t(!/\.style\.(padding|margin)|setProperty\('(padding|margin)|data-dst-sq|squeeze/.test(decom(lay)) && !/S0\*k|scales|--dst-s/.test(decom(lay)) && !/vg-st/.test(decom(MP)), '⑯ [STICKER_NO_REFLOW] 스티커는 얹기만 — 자리를 정할 때 카드 글에 여백 · 패딩을 더하지 않는다 · 크기를 줄여서 맞추지 않는다(크기는 폭마다 고정)');
  t(/stx\.classList\.toggle\('dst-pm', PH\);/.test(lay.replace('st.classList','stx.classList')) && /\.dst\.dst-pm \.dst-lb\{font-size:11\.5px;line-height:16px\}/.test(MP) && !/\.dst\.dst-pm \.dst-lb\{[^}]*(border-radius|box-shadow|background)/.test(MP) && /if\(mode==='hang'\)\{ var cr=card\.getBoundingClientRect\(\), sr=st\.getBoundingClientRect\(\); x=\(cr\.right-60-w\)-sr\.left; y=\(cr\.top\+4\)-sr\.top; \}/.test(stk), '⑯ [STICKER_LABEL_HANG] 폰 = 테두리 없는 글을 옷걸이 왼쪽 위 빈자리에(카드 위 4 · 오른쪽 60) · 흰 알약([STICKER_PILL_PHONE])은 걷었다 · 겹치면 그림 바로 아래로');
  t(/else if\(mode==='top'\)\{ x=\.49\*S-w\/2; y=-lb\.offsetHeight-3; \}/.test(stk) && /\['top', 'out', 'hang', true\]\.forEach\(function\(lm\)/.test(lay) && /else if\(mode==='out'\)\{ var cr2=card\.getBoundingClientRect\(\), sr2=st\.getBoundingClientRect\(\); x=\.36\*S-6-w; y=\(cr2\.top-2-lb\.offsetHeight\)-sr2\.top; \}/.test(stk) && /if\(lr && pr && hit\(lr, pr, 3\)\) return true;/.test(stk), '⑯ [STICKER_LABEL_TOP] 폰 = 옷걸이 고리 바로 위 가운데(줄 상자 3px = 글자 5px) · 진행 점에 닿으면 묶음째 아래 → 위 · 그래도 안 되면(360 · 375) 카드 윗선 밖 옷걸이 왼쪽(out) · 그다음 옷걸이 왼쪽 위 · «n벌»과 떨어진다 / 768+ = 그림 아래');
  t(/if\(lg && hit\(lg,o,8\)\) return true;/.test(stk) && /ins=fs\?Math\.max\(0, Math\.floor\(\(lr\.height-fs\)\/2\)\):0;/.test(stk), '⑯ [STICKER_ONE_WORD] 글 ↔ 둘레 글 · 진행 점 8px 이상(글자 상자로 잰다)');
  t(/function _dstR\(st, el\)\{/.test(stk) && /var lr=lb&&_dstR\(st, lb\), pr=pl&&_dstR\(st, pl\)/.test(stk) && /var b=_dstR\(st, st\.querySelector\('\.dst-box'\)\), S=b\.width,/.test(stk) && !/lb\.getBoundingClientRect\(\)|pl\.getBoundingClientRect\(\)/.test(lay), '⑯ [STICKER_LAYOUT_STILL] 자리를 잴 때는 흔들림 · 누름 transform 을 빼고(offset) 잰다');
  t(/document\.fonts\.addEventListener\('loadingdone'/.test(stk) && /new ResizeObserver\(function\(\)\{[^\n]*if\(w!==w0 \|\| h!==h0\)\{ w0=w; h0=h; lay\(\); \}/.test(stk) && /var lay=function\(\)\{ _dstLayout\(card\); \};/.test(stk), '⑯ [STICKER_RELAYOUT] 글꼴이 늦게 들어오거나 카드 크기가 바뀌면 자리를 다시 잰다 · 흔들림은 다시 시작하지 않는다');
  t(/function _dstHeadSpot\(card, st, mode\)\{/.test(stk) && /var cx=\(R\+inR\)\/2, left=cx-lw\/2; if\(left<R\+24\) left=R\+24;/.test(stk) && /var top=\(tT\+dB\)\/2-bh\/2; if\(top\+bh>dTop-12\) top=dTop-12-bh;/.test(stk) && /if\(topC<8 \|\| boxR>inR\+\.5\) return null;/.test(stk) && /\['under','side'\]\.forEach\(function\(lm\)\{ var cc=_dstHeadSpot\(card, st, lm\); if\(cc\) tries\.push/.test(lay), '⑯ [STICKER_HEAD_CENTER] 768+ = 묶음을 머리 글 옆 빈자리 가운데(머리 글과 24px 먼저) · 세로 = 제목 ~ 날짜 줄 가운데 · 구분선과 12px · 카드 안 · 값이 아니라 계산 · 안 맞으면 종전 자리');
  t(/var DST_BANDS=\[\[0,\.057,\.466,\.534\],/.test(stk) && /var env=_dstRects\(st, \[-6,-3,0\]\), rest=_dstRects\(st, \[-3\]\)/.test(stk) && /for\(j=0;j<v\.rest\.length;j\+\+\) if\(hit\(v\.rest\[j\],o,4\)\) return true;/.test(stk) && /for\(j=0;j<v\.env\.length;j\+\+\) if\(hit\(v\.env\[j\],o,2\)\) return true;/.test(stk) && /if\(boxClear && o\.k==='t' && hit\(box,o,1\)\) return true;/.test(stk) && /\[true, false\]\.forEach\(function\(bc\)/.test(stk) && /if\(lr\)\{ for\(var k=0;k<v\.rest\.length;k\+\+\) if\(hit\(v\.rest\[k\], lr, 2\)\) return true; \}/.test(stk), '⑯ [STICKER_VIS_EDGE] 보이는 드레스 = 그림의 실제 윤곽(가로띠 17줄) · 쉼 −3°(둘레 4px) · 흔들림 −6° ~ 0°(둘레 2px) · 그림자까지 화면 끝 안 · 글이 옷감에 겹치지 않게');
  t(/ov\.className='dr-pop';/.test(pick) && /card\.className='dr-pop-card'; card\.setAttribute\('role','dialog'\); card\.setAttribute\('aria-modal','true'\);/.test(pick) && /ov\.addEventListener\('click', function\(e\)\{ if\(e\.target===ov\) askExit\(false\); \}\);/.test(pick) && /return W<768 \? Math\.min\(H\*\.88, 760\) : Math\.min\(H\*\.84, 720\);/.test(pick) && /if\(m\.type==='momentedit:dressHeight'\)\{ var h=\+m\.h; if\(h>0\) card\.style\.height=Math\.ceil\(h\+2\)\+'px'; return; \}/.test(pick) && /\.dr-pop\{position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:0;background:rgba\(32,28,24,\.26\);/.test(MP) && !/\.dr-pop\{[^}]*backdrop-filter/.test(MP) && /\.dr-pop-card\{[^}]*height:420px;max-height:min\(88vh,760px\);max-height:min\(88dvh,760px\);[^}]*border-radius:12px 12px 0 0;box-shadow:0 16px 48px rgba\(28,27,25,\.14\);[^}]*transform:translateY\(16px\);transition:transform \.22s cubic-bezier\(\.22,1,\.36,1\)\}/.test(MP) && /\.dr-pop\.out \.dr-pop-card\{transform:translateY\(12px\);transition:transform \.16s cubic-bezier\(\.4,0,1,1\)\}/.test(MP) && /\.dr-pop-card\{max-width:600px;max-height:min\(84vh,720px\);max-height:min\(84dvh,720px\);[^}]*border-radius:8px;transform:translateY\(6px\);transition:transform \.18s cubic-bezier\(\.22,1,\.36,1\)\}/.test(MP) && /\.dr-pop\.out\{transition:opacity \.12s cubic-bezier\(\.4,0,1,1\)\}/.test(MP) && /if\(_dstRefocus\)\{ _dstRefocus=false; try\{ st\.focus\(\{preventScroll:true\}\); \}catch\(e\)\{\} \}/.test(stk), '⑯ [DRESS_POPUP · POPUP_FIT_1024] 창 — 폰 = 아래 시트(폭 100% · 위 모서리 12 · 최대 min(88dvh, 760) · 16px → 0 · 220ms · 나갈 때 12px · 160ms) · 768+ = 가운데 600 · 모서리 8 · 최대 min(84dvh, 720) · 6px → 0 · 180ms · 나갈 때 옅어지며 120ms · 높이 = 내용 · 흐림 없음 · 닫으면 초점은 스티커');
  t(/var POP = EMBED && Q\.get\('pop'\) === '1';/.test(PAGE) && /px\.className = 'pk-x'; px\.textContent = '\\u2715'; px\.setAttribute\('aria-label', '닫기'\);/.test(PAGE) && /\.pk-x\{width:44px;height:44px;/.test(PAGE) && /html\.pk-pop \.pk-head\{position:sticky;top:0;/.test(PAGE) && /html\.pk-pop #pkSave\{display:none\}/.test(PAGE) && /html\.pk-pop \.pk-card\{max-width:none;min-height:0;/.test(PAGE) && /window\.parent\.postMessage\(\{ type: 'momentedit:dressHeight', h: h \}, location\.origin\)/.test(PAGE) && /html\.pk-pop \.pk-main \.dv-view\{max-width:min\(360px,max\(150px,calc\(\(var\(--pk-vh,100vh\) - 402px\) \* 0\.75\)\)\)\}/.test(PAGE) && /html\.pk-pop \.pk-grid > :only-child\{grid-column:1 \/ -1;justify-self:center;width:100%;max-width:200px\}/.test(PAGE) && /html\.pk-pop \.pk-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:16px 12px\}/.test(PAGE) && /\.pk-opt\{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;/.test(PAGE) && /html\.pk-pop \.wz-bar,html\.pk-pop \.wz-bar\.pk-bar\{gap:12px\}/.test(PAGE), '⑯ [DRESS_POPUP · POPUP_FIT_1024] 창 머리 = 제목 + ✕(44px) · «저장»은 아래 막대 주 단추 하나 · 창 높이 = 내용(사진은 창 최대 높이로 잰다) · 한 벌 가운데 200 · 여러 벌 2열 12/16 · 물음 칸 48 · Nº 칸과 주 단추 사이 12');
  // ⑮ 코워크 디자인 라운드 3(10/23 · 외부 검토를 거른 것 + 코워크) — 동작은 dress-fit.mjs 가 잰다(작은 사진 → 자세히 · 바꾸기 · 답 바꾸기 뒤 두 벌)
  const slotF = fnOf('slotHTML');
  t(/data-act="slot" data-i="' \+ i \+ '" aria-label="' \+ esc\(n \+ ' ' \+ d\.name \+ ' 자세히 보기'\) \+ '">' \+ photo\(d\) \+ '<\/button>'/.test(slotF) && !/unslot|pk-slot-x|&times;/.test(decom(JS)) && !/\.pk-slot-x\{/.test(PAGE) && /if \(act === 'slot'\) \{ var sid = S\.picks\[\+t\.getAttribute\('data-i'\)\]; if \(!sid\) return; S\.touched = true; if \(S\.view === 'list'\) S\.listY = window\.pageYOffset \|\| 0; go\('detail', \{ cur: sid \}\); return; \}/.test(JS), '⑮ [DRESS_SLOT_SEE] 막대 작은 사진 = 그 드레스 자세히(«Nº 01 이름 자세히 보기») · × 와 «누르면 빼기» 없음');
  t(/'<div class="pk-swap"><p class="pk-swap-t" tabindex="-1">두 벌을 다 골랐어요\.<\/p><div class="pk-swap-b"><button type="button" class="cc-btn-ghost" data-swap="0">Nº 01과 바꾸기<\/button><button type="button" class="cc-btn-ghost" data-swap="1">Nº 02와 바꾸기<\/button><\/div><\/div>'/.test(fnOf('detailPickHTML')) && !/다 찼어요|pk-full/.test(decom(PAGE)) && /if \(sw != null\) \{ var si = \+sw; if \(S\.picks\.indexOf\(S\.cur\) < 0 && R\.dress\(S\.cur\)\) \{ S\.picks\[si\] = S\.cur;/.test(JS) && /\.pk-swap-b\{display:flex;gap:8px\}/.test(PAGE), '⑮ [DRESS_FULL_SWAP] 두 벌 찬 뒤 다른 드레스 = «두 벌을 다 골랐어요.» + 외곽 «Nº 01과 바꾸기 · Nº 02와 바꾸기»(한 줄 · 순서 번호 그대로)');
  t(qOf('pref').sub === '둘 다 골라도 돼요.', '⑮ [DRESS_Q3_SUB · DRESS_Q_FIRST] 셋째 물음 보조 글 «둘 다 골라도 돼요.»');
  return { bad, okn };
}

if (process.argv.includes('--selftest')) {
  // 깨 보기 — 모두 빨강이어야 이 검사를 믿는다
  const cases = [
    ['핏 짝 바꿈(엠파이어 → 허리)', SRC.replace("key: 'empire', en: 'Empire', ko: '엠파이어', fit: 'loose'", "key: 'empire', en: 'Empire', ko: '엠파이어', fit: 'waist'"), GAS],
    ['표본이 운영에 샌다(표식 없이)', SRC.replace('return !(prod && d.sample);', 'return true;').replace('SAMPLES_ON_PROD: true,', 'SAMPLES_ON_PROD: false,'), GAS],
    ['표식은 참인데 운영에서 표본이 빠진다', SRC.replace('var prod = R.isProd() && R.SAMPLES_ON_PROD !== true;', 'var prod = R.isProd();'), GAS],
    ['표식 줄에서 사장님 결정 이름이 빠졌다', SRC.replace('// [DRESS_SAMPLE_PROD 2026-10-23', '// [표본 운영 2026-10-23'), GAS],
    ['서버 마감 일수가 다르다', SRC, (GAS || '').replace('untilDays: 2,', 'untilDays: 3,')],
    ['줄 세우기 순서가 다르다(맞은 수 먼저)', SRC.replace('(x.down - y.down) || (y.hit - x.hit)', '(y.hit - x.hit) || (x.down - y.down)'), GAS],
    ['마감 날 요일이 하루 밀린다', SRC.replace("'일월화수목금토'.charAt(t.getUTCDay())", "'일월화수목금토'.charAt((t.getUTCDay() + 1) % 7)"), GAS],
    ['칸 한 줄에서 길이가 빠졌다', SRC.replace("return [l ? l.ko : '', g ? g.ko : '', d.fabric || ''].filter(Boolean).join(' · ');", "return [l ? l.ko : '', d.fabric || ''].filter(Boolean).join(' · ');"), GAS],
    ['막대에 다시 sticky(붙을 자리 없음)', SRC, GAS, PAGE0.replace('#pkBar{position:sticky;bottom:0;z-index:5}', '').replace('.wz-bar{display:flex;', '.wz-bar{position:sticky;bottom:0;display:flex;')],
    ['«Nº» 배지를 다시 진사로 칠함', SRC, GAS, PAGE0.replace('background:var(--card-white);color:var(--accent);box-shadow:inset 0 0 0 1px var(--gold-deep)', 'background:var(--seal);color:#fff')],
    ['고르기 단추를 다시 사진 · 글 뒤로', SRC, GAS, PAGE0.replace(/      \+ \(ctl \? '<div class="pk-ctl">' \+ ctl \+ '<\/div>' : ''\)[^\n]*\n/, '').replace("      + '</div></div>';\n  }\n  function wireStrip", "      + (ctl ? '<div class=\"pk-ctl\">' + ctl + '</div>' : '')\n      + '</div></div>';\n  }\n  function wireStrip")],
    // ★[DRESS_NOTE_ONE · DRESS_EXIT_ASK · DRESS_FIT_FEE · DRESS_SLIDES 코워크 검토 4] 고친 것을 되돌리면 빨강
    ['신청서 Note 를 다시 span 으로 쪼갬', SRC, GAS, PAGE0, MP0, { INQ: INQ.replace(/<span data-dress-text="[^"]*">(대여 의상은 프리 사이즈\(44~88 내외\)로, 상담에서 직접 보고 확인하실 수 있습니다\.)/, '<span data-dress-off>$1</span><span>') }],
    ['나가기가 다시 닫기 신호만 보낸다', SRC, GAS, PAGE0.replace("window.parent.postMessage({ type: 'momentedit:dressExit' }, location.origin); } catch (e) {} return; }\n    location.href = '/mypage.html';\n  }\n  function applyFill", "window.parent.postMessage({ type: 'momentedit:dressClose' }, location.origin); } catch (e) {} return; }\n    location.href = '/mypage.html';\n  }\n  function applyFill")],
    ['막대 위 시착비 줄이 되살아남', SRC, GAS, PAGE0.replace("return '<div class=\"wz-bar pk-bar\">'", "return '<div class=\"wz-bar pk-bar\"><p class=\"pk-bar-note\">안 입은 드레스는 시착비가 들지 않아요.</p>'")],
    ['사진 없는 장도 다시 넘긴다', SRC.replace('.filter(function (e) { return e && e.img; })', '.filter(function (e) { return !!e; })'), GAS],
    ['단독에서 «저장»이 다시 보인다', SRC, GAS, PAGE0.replace('html.pk-alone #pkSave,html.pk-ro #pkSave{display:none}', '')],
    ['단독이 다시 저장한 척(«저장됨»)', SRC, GAS, PAGE0.replace("if (mode === 'done') go('done'); else if (mode === 'exit' || mode === 'home') exitNow();", "S.saved = true; if (mode === 'done') go('done'); else if (mode === 'exit' || mode === 'home') exitNow();")],
    // ★[DRESS_DECIDED_1023 코워크 회신 4 보충] 사이트 · 계약서 근거로 닫은 셋을 되돌리면 빨강
    ['대여 줄에 금액을 씀', SRC, GAS, PAGE0.replace('<div class="pk-end-dots"><p class="dotln">시착(기본 2벌)은 현장에서 다시 보고 정하셔도 돼요.</p></div>', '<div class="pk-end-dots"><p class="dotln">시착(기본 2벌)은 현장에서 다시 보고 정하셔도 돼요.</p><p class="dotln">대여 드레스는 2벌부터 1벌당 100,000원이 더해집니다.</p></div>')],
    ['다시 목록부터 연다', SRC, GAS, PAGE0.replace("var S = { view: 'q', q: 0,", "var S = { view: 'list', q: 0,")],
    ['물음 아래 «드레스 바로 보기»가 다시', SRC, GAS, PAGE0.replace("      ;   // ★[DRESS_Q_FIRST] 물음 아래", "      + '<button type=\"button\" class=\"pk-txt pk-skipq\" data-act=\"browse\">드레스 바로 보기</button>';   // ★[DRESS_Q_FIRST] 물음 아래")],
    ['«건너뛰기»가 다시', SRC, GAS, PAGE0.replace("var fw = S.q < 2 ? '다음' : '드레스 보기';", "var fw = has ? (S.q < 2 ? '다음' : '드레스 보기') : '건너뛰기';")],
    ['답 없이도 다음으로 간다', SRC, GAS, PAGE0.replace("    if (!(Array.isArray(v) ? v.length > 0 : !!v)) return;", "")],
    // ★[DRESS_STICKER 2026-10-24] 걷은 카드 · 스티커를 되돌리면 빨강
    ['따로 카드가 다시 «드레스 보러 가기»', SRC, GAS, PAGE0, MP0.replace("  box.style.display='none'; box.innerHTML='';\n", "  box.innerHTML='<div class=\"consult-card\"><button type=\"button\" class=\"cc-btn-ghost\" data-dress-open>드레스 보러 가기</button></div>'; box.style.display='block';\n")],
    ['카드 제목이 다시 «드레스 미리 보기»', SRC, GAS, PAGE0, MP0.replace("  box.style.display='none'; box.innerHTML='';\n", "  box.innerHTML='<div class=\"consult-card\"><div class=\"cc-eyebrow en-22\">Dress</div><div class=\"cc-title\">드레스 미리 보기</div></div>';\n")],
    ['카드 사진 칸이 다시(누르면 자세히)', SRC, GAS, PAGE0, MP0.replace("  box.style.display='none'; box.innerHTML='';\n", "  box.innerHTML='<button class=\"dr-th\" data-dress-see=\"S01\"></button>';\n")],
    ['스티커 글을 지움', SRC, GAS, PAGE0, MP0.replace('<span class="dst-lb" aria-hidden="true"><span class="dst-lbt">드레스 보기</span></span>', '')],
    ['스티커 알약이 0벌에도', SRC, GAS, PAGE0, MP0.replace("+ (n?'<span class=\"dst-pill\" aria-hidden=\"true\">'+n+'벌</span>':'')", "+ '<span class=\"dst-pill\" aria-hidden=\"true\">'+n+'벌</span>'")],
    ['스티커가 다시 안내 블록 안으로', SRC, GAS, PAGE0, MP0.replace("<div class=\"vg-title\">방문 전 안내</div>'", "<div class=\"vg-title\">방문 전 안내</div>'+DST").replace("'\">'+DST+'<div class=\"cc-eyebrow en-22\">'", "'\">'+'<div class=\"cc-eyebrow en-22\">'")],
    ['«n벌»을 진사로 칠함', SRC, GAS, PAGE0, MP0.replace('border-radius:9px;background:var(--card-white);color:var(--text);', 'border-radius:9px;background:var(--seal);color:var(--card-white);')],
    ['폰 스티커 크기를 다시 64px', SRC, GAS, PAGE0, MP0.replace('@media (min-width:400px){ .dst{--dst-s:76px} }', '@media (min-width:400px){ .dst{--dst-s:64px} }')],
    ['좁은 폰 카드 윗선 밖 자리(out)를 뺌', SRC, GAS, PAGE0, MP0.replace("['top', 'out', 'hang', true].forEach(function(lm)", "['top', 'hang', true].forEach(function(lm)")],
    ['글 ↔ 둘레 8px 을 2px 로', SRC, GAS, PAGE0, MP0.replace('if(lg && hit(lg,o,8)) return true;', 'if(lg && hit(lg,o,2)) return true;')],
    ['768+ 글이 다시 «드레스 미리 보기»', SRC, GAS, PAGE0, MP0.replace('<span class="dst-lbt">드레스 보기</span>', '<span class="dst-lbt"><span class="dst-lbw">드레스 미리 보기</span><span class="dst-lbn">드레스 보기</span></span>')],
    ['흔들리는 글 사각형으로 잰다', SRC, GAS, PAGE0, MP0.replace('var lr=lb&&_dstR(st, lb), pr=pl&&_dstR(st, pl)', 'var lr=lb&&lb.getBoundingClientRect(), pr=pl&&pl.getBoundingClientRect()')],
    ['글꼴이 늦게 와도 다시 재지 않는다', SRC, GAS, PAGE0, MP0.replace("if(document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function(){ if(card.isConnected) lay(); });", '')],
    ['흔들림이 끝나지 않는다', SRC, GAS, PAGE0, MP0.replace('.dst.is-sw .dst-sw{animation:dstSwing 2.8s ease-in-out 1}', '.dst.is-sw .dst-sw{animation:dstSwing 2.8s ease-in-out infinite}')],
    ['글이 같이 흔들리지 않는다', SRC, GAS, PAGE0, MP0.replace('.dst.is-sw .dst-lb{animation:dstOrbit 2.8s ease-in-out 1}', '')],
    ['글줄이 기운다(반대 각도 보정 없음)', SRC, GAS, PAGE0, MP0.replace('.dst.is-sw .dst-lbt{animation:dstLevel 2.8s ease-in-out 1}', '')],
    ['글 보정 각도가 궤도와 어긋남', SRC, GAS, PAGE0, MP0.replace('12%{transform:rotate(3deg)}30%{transform:rotate(-3deg)}48%{transform:rotate(2deg)}', '12%{transform:rotate(2deg)}30%{transform:rotate(-3deg)}48%{transform:rotate(2deg)}')],
    ['팝업이 다시 전체 화면', SRC, GAS, PAGE0, MP0.replace("ov.className='dr-pop';", "ov.style.cssText='position:fixed;inset:0';")],
    ['팝업 막에 흐림', SRC, GAS, PAGE0, MP0.replace('padding:0;background:rgba(32,28,24,.26);', 'padding:0;background:rgba(32,28,24,.26);backdrop-filter:blur(2px);')],
    ['폰 창이 다시 가운데 · 고정 높이', SRC, GAS, PAGE0, MP0.replace('display:flex;align-items:flex-end;justify-content:center;padding:0;', 'display:flex;align-items:center;justify-content:center;padding:12px;')],
    ['창 높이가 내용을 따르지 않는다', SRC, GAS, PAGE0, MP0.replace("if(h>0) card.style.height=Math.ceil(h+2)+'px';", '')],
    ['닫은 뒤 초점이 스티커로 안 간다', SRC, GAS, PAGE0, MP0.replace("if(_dstRefocus){ _dstRefocus=false; try{ st.focus({preventScroll:true}); }catch(e){} }", '')],
    ['창 머리에 «나가기» 알약이 다시', SRC, GAS, PAGE0.replace("px.className = 'pk-x'; ", ''), MP0],
    ['창 머리에 «저장»이 다시', SRC, GAS, PAGE0.replace('html.pk-pop #pkSave{display:none}', ''), MP0],
    ['창 안 카드가 다시 화면 높이로 늘어남(내용 높이 못 잼)', SRC, GAS, PAGE0.replace('html.pk-pop .pk-card{max-width:none;min-height:0;', 'html.pk-pop .pk-card{max-width:none;min-height:100vh;'), MP0],
    ['창 사진 크기를 다시 창 높이로(서로 물고 늘어남)', SRC, GAS, PAGE0.replace('calc((var(--pk-vh,100vh) - 402px) * 0.75)))}', 'calc((100vh - 402px) * 0.75)))}'), MP0],
    ['동작 줄이기에도 흔든다', SRC, GAS, PAGE0, MP0.replace("  try{ if(matchMedia('(prefers-reduced-motion: reduce)').matches) return; }catch(e){}\n", '')],
    ['마우스 올림에 다시 흔든다', SRC, GAS, PAGE0, MP0.replace("  /* ★[STICKER_FINISH_1024] 마우스 올림 흔들림은 걷었다", "  st.addEventListener('mouseenter', function(){ _dstSwing(st); });\n  /* ★[STICKER_FINISH_1024] 마우스 올림 흔들림은 걷었다")],
    ['그림자를 글에도(필터가 글까지)', SRC, GAS, PAGE0, MP0.replace('.dst-lb{position:absolute;left:0;top:0;display:block;', '.dst-lb{position:absolute;left:0;top:0;display:block;filter:drop-shadow(0 2px 2px rgba(28,27,25,.10));')],
    ['폭으로만 자리를 정함(겹침을 안 봄)', SRC, GAS, PAGE0, MP0.replace("q.left>=0 && q.right<=W && !_dstHits(st, obs, bc); };", "q.left>=0 && q.right<=W; };")],
    ['겹치면 글을 민다(머리 줄 비움)', SRC, GAS, PAGE0, MP0.replace("  st.setAttribute('data-at', ok[3]);\n}", "  if(ok[3]==='none') card.firstElementChild.style.paddingRight='40px';\n  st.setAttribute('data-at', ok[3]);\n}")],
    ['겹치면 스티커를 줄인다', SRC, GAS, PAGE0, MP0.replace("  var obs=_dstObstacles(card, st);\n  var place=", "  var obs=_dstObstacles(card, st), S0=st.offsetWidth, scales=[1,.8];\n  var place=")],
    ['폰 오른쪽 끝을 기울기 전 상자로 잰다', SRC, GAS, PAGE0, MP0.replace('return v.left>=M && v.right<=W-M+.5 &&', 'return v.left>=M && (st.querySelector(\'.dst-box\')||st).getBoundingClientRect().right<=W-M &&')],
    ['폰 글이 다시 흰 알약', SRC, GAS, PAGE0, MP0.replace('.dst.dst-pm .dst-lb{font-size:11.5px;line-height:16px}', '.dst.dst-pm .dst-lb{font-size:11.5px;line-height:16px;border-radius:999px;background:var(--card-white);box-shadow:inset 0 0 0 1px var(--gold-deep)}')],
    ['폰도 글을 아래 줄로', SRC, GAS, PAGE0, MP0.replace("st.classList.toggle('dst-pm', PH);", "st.classList.toggle('dst-pm', false);")],
    ['흔들림 축이 그림 고리에서 벗어남', SRC, GAS, PAGE0, MP0.replace('transform:rotate(-3deg);transform-origin:49% 2%}', 'transform:rotate(-3deg);transform-origin:50% 50%}')],
    ['그림을 다시 임시 그림으로', SRC, GAS, PAGE0, MP0.replace("var DRESS_STICKER='/assets/dress/sticker-';", "var DRESS_STICKER='';")],
    ['누름 칸이 44px 아래', SRC, GAS, PAGE0, MP0.replace('min-width:44px;min-height:44px;margin:0;padding:0;border:0;background:none', 'margin:0;padding:0;border:0;background:none')],
    ['그림 칸 모서리가 다시 누름을 받는다', SRC, GAS, PAGE0, MP0.replace('.dst{pointer-events:none}', '')],
    ['그림 상자가 글 위에 걸쳐도 된다', SRC, GAS, PAGE0, MP0.replace("[true, false].forEach(function(bc){", "[false].forEach(function(bc){")],
    ['폰 글이 다시 옷걸이 왼쪽 먼저', SRC, GAS, PAGE0, MP0.replace("['top', 'out', 'hang', true].forEach(function(lm)", "['hang', 'top', 'out', true].forEach(function(lm)")],
    ['768+ 가 다시 오른쪽 구석 먼저', SRC, GAS, PAGE0, MP0.replace("var cc=_dstHeadSpot(card, st, lm); if(cc) tries.push", "var cc=null; if(cc) tries.push")],
    ['머리 글과 24px 간격을 안 지킴', SRC, GAS, PAGE0, MP0.replace('if(left<R+24) left=R+24;', '')],
    ['결과 맨 아래 점 줄을 지움', SRC, GAS, PAGE0.replace("return h + '<div class=\"pk-end-dots\"><p class=\"dotln\">시착(기본 2벌)은 현장에서 다시 보고 정하셔도 돼요.</p></div>';", "return h;")],
    ['띠가 다시 «답하기»', SRC, GAS, PAGE0.replace('data-act="ask">답 바꾸기 <span', 'data-act="ask">답하기 <span')],
    ['결과가 다시 한 그리드', SRC, GAS, PAGE0.replace("h += gridHTML(sp.front);", "h += gridHTML(sp.front.concat(sp.rest)); sp.rest = [];")],
    ['고른 드레스가 나머지에 있어도 접힘', SRC, GAS, PAGE0.replace("var open = S.more || rest.some(function(d){ return S.picks.indexOf(d.id) >= 0; });", "var open = S.more;")],
    ['결과에서 뒤로가기가 바로 닫기 판단', SRC, GAS, PAGE0.replace("    if (S.view === 'list') { go('q', { q: R.questions.length - 1 }); return true; }\n", "")],
    ['이웃 드레스 순서가 화면과 다르다(원천 순서)', SRC, GAS, PAGE0.replace("function orderIds(){ var sp = splitList(); return sp.front.concat(sp.open ? sp.rest : []).map", "function orderIds(){ var sp = splitList(); return R.list().map")],
    ['셋째 물음 보조 글이 옛 글', SRC.replace("sub: '둘 다 골라도 돼요.'", "sub: '둘 다 골라도 되고, 안 골라도 돼요.'"), GAS],
    ['«특별히 없어요»가 빠짐', SRC.replace(", ['none', '특별히 없어요']", ""), GAS],
    ['결과 소제목에 «추천»', SRC, GAS, PAGE0.replace("'<h3 class=\"pk-sub-h\">답에 맞는 드레스</h3>'", "'<h3 class=\"pk-sub-h\">추천 드레스</h3>'")],
    ['자세히에서 답 없이 목록으로', SRC, GAS, PAGE0.replace("    if (!S.answered) { go('q', { q: 0 }); return; }", "   ")],
    ['답한 적 있어도 물음부터', SRC, GAS, PAGE0.replace("S.view = S.answered ? 'list' : 'q';", "S.view = 'q';")],
    ['미니 설명에 다시 다이닝', SRC.replace("note: '무릎 근처 길이로, 가볍고 경쾌해 두 번째 의상으로도 잘 어울립니다.'", "note: '무릎 근처 길이로, 식사 자리에도 잘 어울립니다.'"), GAS],
    ['fitNote 를 지어 씀', SRC.replace("fitNote: '',", "fitNote: '핀으로 품을 맞춥니다',"), GAS],
    ['미디에 다시 «경쾌»(이웃 줄 겹침)', SRC.replace("note: '종아리 길이로, 구두까지 보여 산뜻합니다.'", "note: '종아리 길이로, 구두까지 보여 경쾌합니다.'"), GAS],
    // ★★[명세 2 · 10/23] 신청 직후 마이페이지 · 공개 쪽 걷기 — 되돌리면 빨강
    ['공개 화면을 되살림(pubView)', SRC, GAS, PAGE0.replace('<div id="pickView" class="pk-wrap">', '<div id="pubView"></div>\n<div id="pickView" class="pk-wrap">')],
    ['?pick=1 아니면 넘기는 줄을 지움', SRC, GAS, PAGE0.replace("<script>if(!/[?&]pick=1(?:&|$)/.test(location.search))location.replace('/mypage.html');</script>", '')],
    ['noindex 를 지움', SRC, GAS, PAGE0.replace('<meta name="robots" content="noindex">', '')],
    ['sitemap 에 dress.html', SRC, GAS, PAGE0, MP0, { SITE: SITEMAP + '\n<url><loc>https://momentedit.kr/dress.html</loc></url>' }],
    ['홈에 드레스 단추를 되살림', SRC, GAS, PAGE0, MP0, { IDX: IDX.replace('</body>', '<div data-dress-on hidden><a href="dress.html" class="journal-guide-link">드레스 둘러보기</a></div>\n</body>') }],
    ['원천 «켤 때 할 일»에 noindex 줄이 다시', SRC.replace('        ㄱ. 아래 표본(sample:true)을 지우고 실물을 넣는다', '        ㄱ. 아래 표본(sample:true)을 지우고 실물을 넣는다   ㄴ. dress.html 의 noindex 줄을 지운다'), GAS],
    ['목록에 다시 진행 표시', SRC, GAS, PAGE0.replace("h = '<h2 class=\"sr\" data-head tabindex=\"-1\">드레스 목록</h2>' + bandHTML();", "h = '<h2 class=\"sr\" data-head tabindex=\"-1\">드레스 목록</h2>' + stepsHTML(3) + bandHTML();")],
    ['물음에 «아직 몰라요»가 다시', SRC.replace("opts: [['ankle', '발목까지'], ['calf', '미디(종아리)'], ['knee', '미니(무릎 근처)']] }", "opts: [['ankle', '발목까지'], ['calf', '미디(종아리)'], ['knee', '미니(무릎 근처)'], ['unsure', '아직 몰라요']] }"), GAS],
    ['라인 설명을 요약 줄과 단추 사이로(단추가 막대 뒤로)', SRC, GAS, PAGE0.replace(/(      \+ \(ctl \? '<div class="pk-ctl">' \+ ctl \+ '<\/div>' : ''\)[^\n]*\n)(      \+ \(ln && ln\.lead[^\n]*\n)/, '$2$1')],
    ['표본 분위기 글이 라인 설명을 되풀이', SRC.replace("mood: '장식 없이 매끈한 크레이프 결'", "mood: '장식 없이 곧게 떨어지는 단정한 선'"), GAS],
    ['카드가 다시 상담확정에서만(서버와 어긋남)', SRC, GAS, PAGE0, MP0.replace("var DRESS_STAGES=['신청접수','상담확정'];", "var DRESS_STAGES=['상담확정'];")],
    ['카드가 다시 확정된 상담에서만', SRC, GAS, PAGE0, MP0.replace("if(!c.status || c.status==='취소') return false;", "if(!(c.status==='승인완료' || c.status==='확정')) return false;")],
    ['미리 보기 첫 상태(일정 선택 전)를 지움', SRC, GAS, PAGE0, MP0.replace("var states=[['일정 선택 전 · 0벌', pre], ['0벌', mk([])]", "var states=[['0벌', mk([])]")],
    ['신청서 켜질 문장이 옛 문장', SRC, GAS, PAGE0, MP0, { INQ: INQ.replace('신청하시면 마이페이지에서 상담 날 입어 보실 드레스를 미리 둘러보실 수 있습니다.', '상담이 확정되면 마이페이지에서 입어 보실 두 벌을 미리 고르실 수 있습니다.') }],
    ['서버가 다시 상담확정에서만', SRC, (GAS || '').replace("stages: ['신청접수', '상담확정']", "stages: ['상담확정']")],
    ['서버가 다시 마감으로 닫는다', SRC, (GAS || '').replace(/(function _dressOpen_\(ymd\) \{[\s\S]*?)return true;/, (m, a) => a + 'var y = _ymdOf(ymd); if (!y) return false; return _dayDiff(y, _kstYmd(new Date())) >= DRESS_PICK.untilDays;')],
    ['서버가 저장을 날짜로 다시 거절', SRC, (GAS || '').replace(/    \/\* ★\[DRESS_NO_DEADLINE 2026-10-23 사장님\] 날짜로 거절하지 않는다[^\n]*\n/, "    if (!_dressOpen_(_dressYmd_(r))) return { ok: false, error: '바꾸기 마감이 지났어요' };\n")],
    ['마이페이지가 open:false 를 다시 넘김', SRC, GAS, PAGE0, MP0.replace('open:true, ymd:', 'open:!(dr&&dr.open===false), ymd:')],
    ['확정 메일이 다시 고른 분에게도', SRC, (GAS || '').replace('_dressMailOk_(row) && !_dressPicked_(row)', '_dressMailOk_(row)')],
    ['접수 메일 드레스 줄을 지움', SRC, GAS, PAGE0, MP0, { SU: SU0.replace("    dressLine +   // [DRESS_SIGNUP_MAIL]", '    // [DRESS_SIGNUP_MAIL]') }],
    // ★★[코워크 디자인 라운드 1 · 10/23] 고친 것을 되돌리면 빨강
    ['고르기 화면이 &open= 을 무시', SRC, GAS, PAGE0.replace("if (OPEN && R.dress(OPEN)) { S.view = 'detail'; S.cur = OPEN; }", '')],
    ['막대에 흐림(그라데이션)이 다시', SRC, GAS, PAGE0.replace('background:var(--card-white);border-top:1px solid var(--hairline)}', 'background:linear-gradient(180deg,rgba(255,255,255,0) 0,var(--card-white) 15px)}')],
    ['«답과 맞아요»를 지움', SRC, GAS, PAGE0.replace("(fit ? '<span class=\"dr-fit\" aria-hidden=\"true\">답과 맞아요</span>' : '')", "''")],
    ['셋째 걸음이 다시 «편한 쪽»', SRC.replace("step: '노출 · 소매'", "step: '편한 쪽'"), GAS],
    ['완료 화면에 «남기기» 알약이 다시', SRC, GAS, PAGE0.replace("' / 200</span></div></div>'", "' / 200</span><button type=\"button\" class=\"wiz-exit wiz-save\" id=\"pkLeave\" data-act=\"leave\" disabled>남기기</button></div></div>'")],
    ['«남기고 돌아가기»가 저장하지 않고 나간다', SRC, GAS, PAGE0.replace("if (act === 'home') { if (EMBED && S.memo.trim() !== baseMemo()) save('home'); else if (EMBED) exit(); else location.href = '/mypage.html'; return; }", "if (act === 'home') { if (EMBED) exit(); else location.href = '/mypage.html'; return; }")],
    ['마감 뒤에도 막대 · 고르기가 보인다', SRC, GAS, PAGE0.replace("if ((S.view === 'list' || S.view === 'detail') && !S.ro) {", "if (S.view === 'list' || S.view === 'detail') {")],
    ['상담 카드 진행 흐름 시착 줄이 늘 보인다', SRC, GAS, PAGE0, MP0.replace("+ (isSnap||dressOn?'':'<div class=\"vg-row\"><span class=\"vg-k\">상담 · 시착</span>", "+ (isSnap?'':'<div class=\"vg-row\"><span class=\"vg-k\">상담 · 시착</span>")],
    ['«챙겨 오실 것»이 꺼져 있어도 보인다', SRC, GAS, PAGE0, MP0.replace("+ (dressOn ? '<div class=\"vg-row\"><span class=\"vg-k\">챙겨 오실 것</span>", "+ (true ? '<div class=\"vg-row\"><span class=\"vg-k\">챙겨 오실 것</span>")],
    // ★[DRESS_BAR_FIT 라운드 1 · 2] 첫 화면 맞춤을 되돌리면 빨강
    ['첫 화면 맞춤을 안 부름', SRC, GAS, PAGE0.replace('    try { fitBar(); } catch (e) {}   // [DRESS_BAR_FIT]', '    // [DRESS_BAR_FIT]')],
    ['고른 수를 맞춤 열쇠에 넣음(고르면 사진이 움직인다)', SRC, GAS, PAGE0.replace("S.cur + '|' + (S.ro ? 1 : 0);", "S.cur + '|' + (S.ro ? 1 : 0) + '|' + S.picks.join(',');")],
    ['고르기 단추가 막대에 붙어도 된다(여유 없앰)', SRC, GAS, PAGE0.replace('if (c) lo = Math.max(lo, c.getBoundingClientRect().bottom - T + 8);', '')],
    ['보이는 줄 여유를 없앰(선에 닿는 줄)', SRC, GAS, PAGE0.replace('r.bottom - T + 6]', 'r.bottom - T + 0]')],
    ['저장본이 와도 다시 재지 않음', SRC, GAS, PAGE0.replace('    FIT = {};   // [DRESS_BAR_FIT] 저장본이 오면', '    // [DRESS_BAR_FIT] 저장본이 오면')],
    ['읽던 자리에서도 다시 잰다(스크롤 중 흔들림)', SRC, GAS, PAGE0.replace('if (!had && (window.pageYOffset || 0) > 1) return;', '')],
    ['글꼴이 늦게 뜨면 읽던 중에도 값을 지운다', SRC, GAS, PAGE0.replace('function refit(){ if ((window.pageYOffset || 0) > 1) return; FIT = {};', 'function refit(){ FIT = {};')],
    ['고른 줄이 다시 44px(고르면 아래 글이 4px 움직인다)', SRC, GAS, PAGE0.replace('.pk-picked{display:flex;align-items:center;gap:8px;min-height:calc(30px + 14px * 1.3);', '.pk-picked{display:flex;align-items:center;gap:8px;min-height:44px;')],
    ['사진 기준이 다시 430(막대가 낮아진 만큼 안 키움)', SRC, GAS, PAGE0.split('402px) * 0.75').join('430px) * 0.75')],
    ['답한 띠가 답 중간에서 꺾인다', SRC, GAS, PAGE0.replace("var said = ansWords().split(' · ').map(function(p){ return p.replace(/ /g, '\\u00a0'); }).join(' · ');", 'var said = ansWords();')],
    // ★[코워크 디자인 라운드 2 · 10/23] 고친 것을 되돌리면 빨강
    ['뒤로가기가 다시 겹화면을 통째로 닫으려 한다', SRC, GAS, PAGE0, MP0.replace('var _bkId=bkOpen(onBack);', 'var _bkId=bkOpen(function(){ askExit(true); });')],
    ['겹화면이 뒤로가기 질문에 답하지 않는다', SRC, GAS, PAGE0.replace("type: 'momentedit:dressBackDone', stepped: stepped", "type: 'momentedit:dressBackSkip', stepped: stepped")],
    ['목록 자리를 기억하지 않는다', SRC, GAS, PAGE0.replace("if (op) { S.touched = true; S.listY = window.pageYOffset || 0; go('detail', { cur: op }); return; }", "if (op) { S.touched = true; go('detail', { cur: op }); return; }")],
    ['이웃 드레스 줄을 지움', SRC, GAS, PAGE0.replace('+ detailHTML(d, ctl) + nbHTML(d);', '+ detailHTML(d, ctl);')],
    ['누름 반응을 지움', SRC, GAS, PAGE0.replace('.dr-pv:active,.pk-slot.on:active{transform:scale(.98)}', '')],
    ['«답과 맞아요»가 다시 이름 바로 아래', SRC, GAS, PAGE0.replace("      + '<span class=\"dr-sum\">' + esc(sum) + '</span>'\n      + (fit ? '<span class=\"dr-fit\" aria-hidden=\"true\">답과 맞아요</span>' : '') + '</span></div>';", "      + (fit ? '<span class=\"dr-fit\" aria-hidden=\"true\">답과 맞아요</span>' : '')\n      + '<span class=\"dr-sum\">' + esc(sum) + '</span></span></div>';")],
    ['완료 화면에 마감 줄이 다시', SRC, GAS, PAGE0.replace("'<div class=\"pk-dots\"><p class=\"dotln\">시착(기본 2벌)은 현장에서 다시 보고 정하셔도 돼요.</p></div>'", "'<div class=\"pk-dots\"><p class=\"dotln\">시착(기본 2벌)은 현장에서 다시 보고 정하셔도 돼요.</p><p class=\"dotln\">' + esc(R.dueLine(S.ymd)) + '</p></div>'")],
    ['마감 한 줄 원천이 다른 말', SRC.replace("'상담 날짜가 정해지면 바꾸기 마감일을 알려 드릴게요.'", "'상담 이틀 전까지 바꾸실 수 있어요.'"), GAS],
    // ★[코워크 디자인 라운드 3 · 10/23] 고친 것을 되돌리면 빨강
    ['막대 작은 사진이 다시 «누르면 빼기»', SRC, GAS, PAGE0.replace('data-act="slot" data-i="', 'data-act="unslot" data-i="')],
    ['막대 작은 사진에 × 가 다시', SRC, GAS, PAGE0.replace(`' 자세히 보기') + '">' + photo(d) + '</button>';`, `' 자세히 보기') + '">' + photo(d) + '<span class="pk-slot-x" aria-hidden="true">&times;</span></button>';`)],
    ['두 벌 찬 뒤 다시 막다른 길', SRC, GAS, PAGE0.replace('<div class="pk-swap"><p class="pk-swap-t" tabindex="-1">두 벌을 다 골랐어요.</p>', '<div class="pk-swap"><p class="pk-swap-t" tabindex="-1">Nº 01 · Nº 02 가 다 찼어요. 하나를 빼고 골라 주세요.</p>')],
  ];
  /* ★[DRESS_LIVE_READY] 켜기 조건 — 다 갖춘 켠 사본(실물 4벌 · 모두 사진 · ex 도 사진 · noindex 는 그대로 · sitemap 에 없음 [DRESS_PUBLIC_OFF])이 먼저 초록이어야 한다(대조).
     거기서 한 가지씩 깬다 — 표본만 · 사진 없음 · 4벌 미만 · ex 에 사진 없는 장. 사진 자리는 있는 파일(홈 Styling 사진)을 가리킨다 */
  const ex = (img) => "[{ t: '앞', img: '" + img + "' }, { t: '뒤', img: '" + img + "' }]";
  const one = (id, line, len, img, exs) => "      { id: '" + id + "', name: '드레스 " + id + "', line: '" + line + "', length: '" + len + "', neck: '보트넥', fabric: '크레이프', expo: 'soft', sleeve: 'none', mood: '단정한 선', pair: '짧은 베일', img: '" + img + "', ex: " + exs + " }";
  const P = '../home/styling';
  const four = (o) => { o = o || {}; return [one('D01', 'column', 'ankle', o.noImg ? '' : P, ex(P)), one('D02', 'slip', 'calf', P, o.emptyEx ? "[{ t: '앞', img: '" + P + "' }, { t: '뒤' }]" : ex(P)), one('D03', 'aline', 'knee', P, ex(P)), one('D04', 'empire', 'ankle', P, ex(P))].slice(0, o.n || 4).join(',\n'); };
  const ON = (s) => s.replace(/live: (true|false),\s+\/\/ \[DRESS_LIVE\]/, 'live: true,              // [DRESS_LIVE]').replace('SAMPLES_ON_PROD: true,', 'SAMPLES_ON_PROD: false,');   // 켬 · 표본 운영 표식 끔
  const LIVE_SRC = (dresses) => ON(SRC).replace(/dresses: \[[\s\S]*?\n    \]\n  \};/, () => 'dresses: [\n' + dresses + '\n    ]\n  };');
  const LIVE_PAGE = PAGE0;     // [DRESS_PUBLIC_OFF] 켜도 noindex 는 그대로
  const LIVE_SITE = SITEMAP;   // [DRESS_PUBLIC_OFF] 켜도 sitemap 에 넣지 않는다
  const okSrc = LIVE_SRC(four());
  const ctl = audit(okSrc, GAS, LIVE_PAGE, MP0, { SITE: LIVE_SITE });
  const ctlOk = okSrc !== SRC && /live: true,/.test(okSrc) && !ctl.bad.length;
  console.log((ctlOk ? '  대조 초록 ' : '  대조가 빨강?? ') + '다 갖춘 켠 사본(실물 4벌 · 모두 사진 · ex 도 사진)' + (ctl.bad.length ? ' · ' + ctl.bad.slice(0, 3).join(' / ') : ''));
  cases.push(['켜기 — 표식 없이 표본만(live 만 켬)', ON(SRC), GAS, LIVE_PAGE, MP0, { SITE: LIVE_SITE }]);
  cases.push(['표식은 참인데 실물이 섞였다', SRC.replace(/dresses: \[/, () => 'dresses: [\n' + four({ n: 1 }) + ','), GAS, LIVE_PAGE, MP0, { SITE: LIVE_SITE }]);
  cases.push(['켜기 — 사진 없는 드레스', LIVE_SRC(four({ noImg: true })), GAS, LIVE_PAGE, MP0, { SITE: LIVE_SITE }]);
  cases.push(['켜기 — 4벌 미만(3벌)', LIVE_SRC(four({ n: 3 })), GAS, LIVE_PAGE, MP0, { SITE: LIVE_SITE }]);
  cases.push(['켜기 — ex 에 사진 없는 장', LIVE_SRC(four({ emptyEx: true })), GAS, LIVE_PAGE, MP0, { SITE: LIVE_SITE }]);
  let red = 0;
  let broke = 0;
  for (const [nm, s, g, pg, mp, x] of cases) {
    if (s === SRC && g === GAS && (!pg || pg === PAGE0) && (!mp || mp === MP0) && !x) { console.log('  selftest 틀을 못 만들었다 · ' + nm); broke++; continue; }
    if (x && ((x.INQ != null && x.INQ === INQ) || (x.SU != null && x.SU === SU0) || (x.IDX != null && x.IDX === IDX) || (x.SITE != null && x.SITE === SITEMAP && !/live: true/.test(s)))) { console.log('  selftest 틀을 못 만들었다 · ' + nm); broke++; continue; }
    const r = audit(s, g, pg || PAGE0, mp || MP0, x || {});
    console.log((r.bad.length ? '  빨강 ' : '  초록?? ') + nm + (r.bad.length ? ' · ' + r.bad[0] : ''));
    if (r.bad.length) red++;
  }
  const allRed = red === cases.length && !broke;
  console.log(allRed && ctlOk ? 'selftest OK — 대조는 초록 · 깨면 빨강(' + cases.length + '가지)' : 'selftest FAIL — ' + (ctlOk ? '깨도 초록인 칸이 있다' : '다 갖춘 켠 사본이 초록이 아니다(대조 실패)'));
  process.exit(allRed && ctlOk ? 0 : 1);
}

const { bad, okn } = audit(SRC, GAS);
if (bad.length) { console.log('FAIL dress-refs ' + bad.length + '건'); bad.forEach((b) => console.log('  ✗ ' + b)); process.exit(1); }
console.log('ok dress-refs — ' + okn.length + '칸 통과(모양 · 줄 세우기 · 표본 · 스위치 · GAS 0 · 서버 짝 · 금지어 · 마이페이지)');
