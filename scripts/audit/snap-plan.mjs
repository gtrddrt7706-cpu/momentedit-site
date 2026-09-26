// 고르는 스냅 기획 — 결정이 코드 곳곳에서 같은 값을 말하는지 [SNAP_PICK_V2 2026-09-26 사장님 회의]
//
//   목록 파일(assets/snap-refs.js)은 부부 화면 · 관리자 · 작가 브리프가 함께 읽는 «단 하나의 원천»이다.
//   그런데 같은 숫자가 다른 곳에도 산다 — 진행표(분·시각) · 서버(고르기 4장·사진 3장·마감·잠금) · 촬영 목록표(장면 이름·구도·준비물).
//   사본은 원천이 바뀔 때 조용히 틀린다(스냅 45 → 50 → 60 이 실제로 그렇게 움직였다). 그래서 잰다.
//
//   D5 기본 4장면 · D6 공간마다 최대 4장(고를 수 있는 8장) · D8 사진 3장 + 링크 3개 · D2 마감 14일 전 · 잠금 3일 전
//   D3 분 = 진행표 «단독 스냅 촬영» · 시각 = 계약 도착 시각 + 목록의 분(브리프가 이렇게 계산한다)
//   D9 묻는 칸은 하나 · D11 장면 목록 = 촬영 목록표
//
//   ★[SERVED_OURS] 원천을 못 찾으면 «틀렸다(1)»가 아니라 «못 쟀다(2)».
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (r) => { try { return fs.readFileSync(path.join(ROOT, r), 'utf8'); } catch (e) { return null; } };
const refsSrc = read('assets/snap-refs.js'), seq = read('assets/sequence-modal.js'), my = read('mypage.html'),
  gs = read('automation/platform/80_production.gs'), shot = read('docs/plans/스냅_레퍼런스_촬영목록표.md'),
  adm = read('admin.html'), brief = read('brief.html'), priv = read('privacy.html'),
  cb = read('automation/consultation/consultation-booking.gs'), ag = read('automation/admin/admin.gs');   // [SNAP_CONSENT] 지우기 길(doPost · adminCall)
if (!refsSrc || !seq || !my || !gs || !shot || !adm || !brief || !priv || !cb || !ag) { console.log('━━ snap-plan — 원천 파일을 못 찾았습니다 · 재지 못했습니다'); process.exit(2); }
const ctx = { window: {} }; vm.createContext(ctx);
try { vm.runInContext(refsSrc, ctx); } catch (e) { console.log('━━ snap-plan — snap-refs.js 를 실행하지 못했습니다: ' + e.message); process.exit(1); }
const R = ctx.window.SNAP_REFS;
const bad = [], okn = [];
const t = (cond, msg) => { if (cond) okn.push(msg); else bad.push(msg); };

// ── D5 · D6 · 번호 형식
t(R && R.zones && R.zones.length === 2 && R.zones[0].key === 'candle' && R.zones[1].key === 'white', '공간 둘(캔들존 → 화이트존 순)');
const ids = [];
(R.zones || []).forEach((z) => {
  t(z.base.length === 4, `${z.ko} 기본 4장면(D5) — 지금 ${z.base.length}`);
  t(z.pick.length === 8, `${z.ko} 고를 수 있는 8장면 — 지금 ${z.pick.length}`);
  const pre = z.key === 'candle' ? 'c' : 'w';
  z.base.concat(z.pick).forEach((s) => { ids.push(s.id); t(new RegExp('^' + pre + '\\d{2}$').test(s.id), `${s.id} — ${z.ko} 번호 형식(${pre}+두 자리 · 서버 SNAP_ZONE_RE 와 같다)`); });
  z.pick.concat(z.base).forEach((s) => (s.needs || []).forEach((n) => t(!!R.needs[n], `${s.id} 준비물 «${n}» 안내가 needs 에 있다`)));
  z.base.concat(z.pick).forEach((s) => { if (s.img) ['webp', 'jpg'].forEach((x) => t(fs.existsSync(path.join(ROOT, 'assets/snap-refs', s.img + '.' + x)), `${s.id} 사진 파일 assets/snap-refs/${s.img}.${x}`)); });
});
t(new Set(ids).size === ids.length, '장면 번호가 겹치지 않는다');
t(R.limits.pick === 4, `고르기 최대 4장(D6) — 지금 ${R.limits.pick}`);

// ── 서버와 같은 한도(고르기·사진·링크) · 마감·잠금 날수
const sv = gs.match(/var SNAP_V2 = \{ pick: (\d+), up: (\d+), link: (\d+), note: (\d+), lockDays: (\d+), dueDays: (\d+), keepDays: (\d+), briefDays: (\d+)/);
if (!sv) bad.push('80_production.gs 의 SNAP_V2 한도 줄을 못 찾았다');
else {
  t(+sv[1] === R.limits.pick && +sv[2] === R.limits.up && +sv[3] === R.limits.link, `한도 서버 = 목록(고르기 ${sv[1]} · 사진 ${sv[2]} · 링크 ${sv[3]})`);
  t(+sv[2] === 3 && +sv[3] === 3, '사진 3장 + 링크 3개(D8)');
  t(+sv[6] === 14 && +sv[5] === 3, '마감 14일 전 · 잠금 3일 전(D2)');
  t(+sv[7] === 183, '올린 사진 보관 183일(청첩장·편지 파기 기준)');
  const cd = my.match(/wu-(\d+)\*864e5\)/), cl = my.match(/late:days<=(\d+), lock:days<=(\d+)/);
  t(!!(cd && cl && +cd[1] === +sv[6] && +cl[1] === +sv[6] && +cl[2] === +sv[5]), '부부 화면 마감·잠금 날수 = 서버');
  t(my.indexOf("_sdu.days<=21 && _sdu.days>" + sv[5]) !== -1, '«지금 할 일» 한 줄은 3주 전부터 잠금 전까지(D2)');
}

// ── [SNAP_V2_FROM] 새 기획은 처리방침 시행일부터 — 서버 날짜 = privacy.html 시행일 = 위탁 줄의 «부터» 날짜
const fr = gs.match(/maxUploads: \d+, from: '(\d{4})-(\d{2})-(\d{2})' \}/), pv = priv.match(/개정 시행일자 · (\d{4})\.(\d{2})\.(\d{2})/), dl = priv.match(/촬영\(스냅\)[\s\S]{0,400}?(\d{4})년 (\d{1,2})월 (\d{1,2})일부터/);
t(!!fr && !!pv && fr.slice(1, 4).join('-') === pv.slice(1, 4).join('-'), `새 기획 여는 날(SNAP_V2.from ${fr ? fr.slice(1, 4).join('-') : '못 읽음'}) = 처리방침 개정 시행일(${pv ? pv.slice(1, 4).join('.') : '못 읽음'})`);
t(!!fr && !!dl && +dl[1] === +fr[1] && +dl[2] === +fr[2] && +dl[3] === +fr[3], `새 기획 여는 날 = 처리방침 «촬영(스냅)» 위탁 줄의 시작일(${dl ? dl.slice(1, 4).join('.') : '못 읽음'})`);
const phRow = (priv.match(/촬영\(스냅\)<\/span>\s*<span class="spec-val">([^<]*)/) || [])[1] || '';
t(/^모먼트에디트와 계약한 사진작가/.test(phRow) && phRow.indexOf('촬영별') === -1, '처리방침 위탁 줄 = «모먼트에디트와 계약한 사진작가» — 매번 바뀌는 외부 작가가 아니다(PHOTOG_CONTRACT 2026-09-26 사장님)');
t(/snapV2: _snapV2Live\(\)/.test(gs), '부부 화면 표시(snapV2)는 날짜 문을 따른다 — true 로 박지 않는다');
[['_snapIsV2 && !_snapV2Live()', '새 기획 저장'], ['function handleSnapRefUpload', '참고 사진 올리기'], ['function adminSnapBrief', '촬영 브리프 만들기']].forEach(([k, n]) => {
  const i = gs.indexOf(k); t(i > -1 && gs.slice(i, i + 900).indexOf('_snapV2Live()') > -1, `${n}도 날짜 문을 본다(시행일 전 거절)`);
});

// ── D3 · 분 = 진행표 · 시각 = 계약 도착 + 목록의 분
const ar = seq.match(/\['신랑·신부 도착',\s*'(\d+)분',\s*\[([^\]]+)\]/), sn = seq.match(/\['단독 스냅 촬영',\s*'(\d+)분',\s*\[([^\]]+)\],\s*'([^']*)'/);
if (!ar || !sn) { console.log('━━ snap-plan — 진행표에서 «신랑·신부 도착»·«단독 스냅 촬영» 줄을 못 찾았습니다 · 재지 못했습니다'); process.exit(2); }
const times = (s) => s.split(',').map((x) => x.replace(/['\s]/g, ''));
const addMin = (hm, n) => { const [h, m] = hm.split(':').map(Number); const v = h * 60 + m + n; return String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(v % 60).padStart(2, '0'); };
t(+ar[1] === R.arrive, `도착 분 = 진행표(${ar[1]}분) — 목록 ${R.arrive}`);
t(+sn[1] === R.total, `단독 스냅 분 = 진행표(${sn[1]}분) — 목록 합계 ${R.total}`);
const dm = sn[3].match(/캔들존 (\d+)분 · 이동 (\d+)분 · 화이트존 (\d+)분 · 입장 준비 (\d+)분/);
t(!!dm && +dm[1] === R.zones[0].min && +dm[2] === R.move && +dm[3] === R.zones[1].min && +dm[4] === R.prep, `공간별 분 = 진행표 설명(${dm ? dm.slice(1).join('·') : '못 읽음'}) — 목록 ${R.zones[0].min}·${R.move}·${R.zones[1].min}·${R.prep}`);
const arT = times(ar[2]), snT = times(sn[2]);
t(arT.every((a, i) => addMin(a, R.arrive) === snT[i]), `스냅 시작 = 도착 + ${R.arrive}분(브리프 계산식) — 진행표 ${snT.join(',')}`);
const slot = gs.match(/\(\{ '(\d\d:\d\d)': '\d\d:\d\d', '(\d\d:\d\d)': '\d\d:\d\d', '(\d\d:\d\d)': '\d\d:\d\d' \}\)\[String\(_ci\./);
t(!!slot && slot.slice(1, 4).join(',') === arT.join(','), `계약 도착 슬롯 = 진행표 도착 시각(${arT.join(',')}) — 브리프가 계약값을 도착으로 쓴다`);

// ── D11 · 장면 목록 = 촬영 목록표
const rows = {};
shot.split('\n').forEach((l) => { const m = l.match(/^\|\s*([cw]\d{2})\s*\|\s*([^|]+?)\s*\|\s*(기본|선택)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|/); if (m) rows[m[1]] = { name: m[2], kind: m[3], frame: m[4], needs: m[5] }; });
(R.zones || []).forEach((z) => {
  z.base.forEach((s) => { const r = rows[s.id]; t(!!r && r.name === s.name && r.kind === '기본' && r.frame === s.frame, `${s.id} «${s.name}» = 촬영 목록표(기본 · ${s.frame})`); });
  z.pick.forEach((s) => { const r = rows[s.id]; t(!!r && r.name === s.name && r.kind === '선택' && r.frame === s.frame && r.needs === (s.needs || []).join(', '), `${s.id} «${s.name}» = 촬영 목록표(선택 · ${s.frame} · ${(s.needs || []).join(', ') || '준비물 없음'})`); });
});
t(Object.keys(rows).length === ids.length, `촬영 목록표 줄 수 = 목록 장면 수(${Object.keys(rows).length} · ${ids.length})`);

// ── D9 · 묻는 칸은 하나 · 다섯 걸음 · 지운 질문이 돌아오지 않는다
const st = my.match(/var SNAP_STEPS=\[([^\]]+)\]/);
t(!!st && (st[1].match(/\{k:'/g) || []).length === 5 && /k:'when'.*k:'candle'.*k:'white'.*k:'note'.*k:'send'/.test(st[1]), '다섯 걸음(이날의 스냅 · 캔들존 · 화이트존 · 알면 좋은 것 · 전해요)');
const blk = (() => { const a = my.indexOf("// ── 스냅 기획(촬영 전 · '예식 준비' 앞)"), b = my.indexOf('function seatDrinkCounts('); return a > -1 && b > a ? my.slice(a, b) : ''; })();
t(!!blk, '스냅 블록을 찾았다');
t((blk.match(/<textarea/g) || []).length === 1, `묻는 칸은 하나(D9) — textarea ${(blk.match(/<textarea/g) || []).length}`);
['mp_snapAbout', 'mp_snapProps', 'mp_snapMoodNote', 'mp_snapDirector', 'mp_snapRef"', 'mp_snapMust"', 'data-smust', 'data-stone', 'data-scomf', 'SNAP_TONES', 'SNAP_COMFORTS', 'SNAP_MUSTHAVES'].forEach((k) => t(my.indexOf(k) === -1, `지운 질문 «${k}» 이 돌아오지 않았다(2026-09-26 사장님 지시)`));
t(/!p\.snapV2/.test(blk), '서버가 새 기획을 알 때만 연다(SNAP_V2_GATE)');
t(!/["' ]sp-[a-z]/.test(blk), '스냅 블록은 snp- 이름만 — 좌석 화면이 .sp-opt·.sp-note 를 쓴다(이름이 겹쳐 좌석 화면 CSS 가 바뀔 뻔했다)');
t(blk.indexOf(".join('<span class=\"snp-arw\"") === -1 && /class=\"snp-flg\"[^;]*snp-arw/.test(blk) && my.indexOf('.snp-flg{display:inline-flex') !== -1, '흐름 줄 화살표는 다음 칸과 한 덩어리(SNAP_FLOW_WRAP) — 따로 두면 줄 끝에 «›»가 매달리고 «본식»만 떨어졌다');

// ── [SNAP_CONSENT 2026-09-26 사장님 · 코워크 명세 ①] 동의 — 모으는 그 자리에서 따로 · 미리 체크하지 않는다 · 한 번이면 다시 묻지 않는다
{
  const cut = (a, b) => { const i = my.indexOf(a); if (i < 0) return ''; const j = my.indexOf(b, i + a.length); return j < 0 ? '' : my.slice(i, j); };
  const ah = cut('function _snapAgreeHtml(){', '\n}'), aok = cut('function _snapAgreeOk(){', '\n}'), flowR = cut('function renderSnapFlow(){', '\nfunction ');
  t(ah.indexOf('고른 장면 · 메모 · 올린 사진을 촬영 준비에 쓰고, 모먼트에디트와 계약한 사진작가에게 전하는 데 동의해요.') > -1, '동의 문구 = 코워크 명세 그대로');
  const ckTag = (ah.match(/<input type="checkbox" id="mp_snapAgreeCk"[^>]*>/) || [''])[0];
  t(!!ckTag && !/checked/.test(ckTag) && !/mp_snapAgreeCk[\s\S]{0,160}\.checked\s*=\s*true/.test(my), '체크는 미리 켜지 않는다(태그에도 · 코드에도)');
  t(/<label class="snp-agree-row"><input type="checkbox" id="mp_snapAgreeCk"><span>/.test(ah), '글을 눌러도 체크된다(label 안에 체크와 글)');
  t(/\.snp-agree-row\{[^}]*min-height:44px/.test(my) && /\.snp-agree-more,\.snp-agree-pv\{[^}]*min-height:44px/.test(my) && /\.snp-dellink\{[^}]*min-height:44px/.test(my), '누름 칸 44px — 체크 줄 · 자세히 보기 · 처리방침 전문 · 스냅 기획 지우기');
  t(/\(agreeAsk\?_snapAgreeHtml\(\):''\)[^\n]*\n\s*\+'<button type="button" class="cc-btn-ghost" id="mp_snapStart"[^>]*>스냅 기획하기<\/button>'/.test(blk), '자리 — «스냅 기획하기» 바로 위 · 테두리 버튼(사장님 결정 ⑥ SNAP_BTN_GHOST)');
  t(/var agreeAsk=!lock&&!\(meta\.consent&&meta\.consent\.at\);/.test(blk) && flowR.indexOf('mp_snapAgreeCk') === -1, '한 번 동의하면(서버 기록) 다시 묻지 않는다 · 편집 화면엔 체크가 없다');
  t(aok.indexOf("'위 동의에 체크하시면 시작할 수 있어요'") > -1 && /ck\.focus\(/.test(aok) && !/disabled/.test(aok), '체크 없이 누르면 — 버튼을 막지 않고 체크 줄로 초점 · 한 줄로 알린다');
  t(/if\(!_snapAgreeOk\(\)\) return; startSnapFlow\(p\.snapDraft\|\|\{\}, p, agreeAsk\);/.test(blk), '시작 전에 확인 · 막 동의했으면 첫 저장에 싣는다');
  ['<dt>받는 것</dt><dd>고른 장면 · 메모 · 참고 링크 · 두 분이 올린 참고 사진</dd>',
   '<dt>쓰는 곳</dt><dd>스냅 촬영 준비 · 사진작가에게 촬영 요청서로 전해요(성함 · 연락처는 전하지 않아요)</dd>',
   '<dt>보관</dt><dd>올린 사진 · 링크 · 메모는 예식 6개월 뒤 지워요</dd>',
   '<dt>동의하지 않으셔도 돼요</dt><dd>스냅 기획 없이 기본 장면으로 찍어요</dd>'].forEach((x) => t(ah.indexOf(x) > -1, '자세히 보기 — ' + x.replace(/<\/dt>/, ' · ').replace(/<[^>]+>/g, '')));
  t(ah.indexOf('올린 사진 · 메모는 예식 6개월 뒤 지워요<br><button') > -1 && /aria-expanded="false" aria-controls="mp_snapAgreeBody"/.test(ah) && /id="mp_snapAgreeBody" hidden/.test(ah), '작은 줄 «… 6개월 뒤 지워요» + «자세히 보기»(제 줄 · 줄 끝 가운뎃점 없이) — 펼치기 전엔 숨김(aria-expanded)');
  t(ah.indexOf('href="privacy.html#snap-plan"') > -1 && /<div class="spec-row" id="snap-plan">[\s\S]{0,300}<span class="spec-key">스냅 기획<\/span>/.test(priv), '«개인정보 처리방침 전문 보기» → 처리방침의 스냅 기획 줄(id="snap-plan")');
  t(/snapConsent:ag\?1:undefined/.test(my) && /snapConsent:SNAPFLOW\.agreeNew\?1:undefined/.test(my), '첫 저장 · 첫 올리기에 동의를 싣는다');
  t(flowR.indexOf('>스냅 기획 지우기</button>') > -1, '편집 화면 맨 아래 «스냅 기획 지우기»');
  t(my.indexOf("body:'고른 장면 · 메모 · 올린 사진을 지우고 동의도 거둬요. 기본 장면으로 찍어요.'") > -1 && /action:'snapWithdraw'/.test(my), '지우기 확인 창 문구 = 명세 그대로 · 서버 snapWithdraw');
  t(/case 'snapWithdraw':\s*return jsonOut\(handleSnapWithdraw\(body\)\);/.test(cb), 'doPost 가 snapWithdraw 를 잇는다');
  t(/adminSnapWithdraw: adminSnapWithdraw/.test(ag) && /data-snapact="withdraw"/.test(adm) && /gas\('adminSnapWithdraw'/.test(adm), '관리자 «기획 지우기(동의 거둠)» — 잠긴 뒤 부탁받았을 때');
  t(/if \(!\(body && body\.snapConsent\)\) return \{ ok: false, consent: false, error: SNAP_CONSENT_MSG \};/.test(gs) && /if \(!body\.snapConsent\) return \{ ok: false, consent: false, error: SNAP_CONSENT_MSG \};/.test(gs), '서버 — 동의 없이 새 기획 저장 · 사진 올리기를 거절한다(동작은 snap-plan.test.js 15)');
  t(/var SNAP_CONSENT_MSG = '스냅 기획을 시작하려면 동의가 필요해요\.';/.test(gs), '거절 문구 = 명세 그대로');
  t(/m\.consent = \{ at: fmtKST\(new Date\(\)\), ver: String\(SNAP_V2\.from\) \};/.test(gs), '동의 기록 = {한국 시각 · 그때의 처리방침 시행일}');
  t(/okc = _snapConsentOk\(r\.m\)/.test(gs) && /note: okc \? String\(sd\.note \|\| ''\) : ''/.test(gs), '촬영 브리프는 동의가 있을 때만 기획을 싣는다');
  t(/row\('동의',\(_sm\.consent&&_sm\.consent\.at\)/.test(adm), '관리자 «스냅 상세»에 «동의 {일시}» 줄');
  const snapRow = (priv.match(/<span class="spec-key">스냅 기획<\/span>\s*<span class="spec-val">([^<]*)/) || [])[1] || '';
  t(/\(선택 · 따로 동의를 받은 경우에만\)$/.test(snapRow), '처리방침 수집 줄 끝 «(선택 · 따로 동의를 받은 경우에만)»');
  t(/다만 정보주체의 권리에 불리하지 않은 변경\(수탁사 추가 고지 등\)은 공고와 동시에 시행할 수 있습니다\./.test(priv) && /10조 단서에 따라 공고와 동시에 시행/.test(priv), '[SNAP_OPEN_NOW] 개정 이력 — 10조 단서에 따라 공고와 동시에 시행(근거 조문이 본문에 있다)');
  const pd = priv.match(/개정 시행일자 · (\d{4})\.(\d{2})\.(\d{2}) \(공고 (\d{4})\.(\d{2})\.(\d{2})\)/);
  t(!!pd && pd.slice(1, 4).join('.') === pd.slice(4, 7).join('.'), '[SNAP_OPEN_NOW] 시행일 = 공고일(바로 연다)');
}

// ── 같은 원천을 읽는다
[['mypage.html', my], ['admin.html', adm], ['brief.html', brief]].forEach(([f, s]) => t(s.indexOf('<script src="/assets/snap-refs.js"></script>') !== -1, `${f} 가 목록 파일을 읽는다`));
t(/noindex/.test(brief) && brief.indexOf('이름·연락처') !== -1, 'brief.html — 검색 차단 · 이름·연락처를 싣지 않는다는 약속이 있다');

if (bad.length) { console.log('━━ snap-plan — 빨강 ' + bad.length + '건'); bad.forEach((b) => console.log('   · ' + b)); process.exit(1); }
console.log(`━━ snap-plan OK — ${okn.length}항목 · 단독 스냅 ${R.total}분(캔들존 ${R.zones[0].min} · 이동 ${R.move} · 화이트존 ${R.zones[1].min} · 입장 준비 ${R.prep}) = 진행표 · 장면 ${ids.length}개 = 촬영 목록표`);
process.exit(0);
