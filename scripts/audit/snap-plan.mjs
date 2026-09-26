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
  adm = read('admin.html'), brief = read('brief.html'), priv = read('privacy.html');
if (!refsSrc || !seq || !my || !gs || !shot || !adm || !brief || !priv) { console.log('━━ snap-plan — 원천 파일을 못 찾았습니다 · 재지 못했습니다'); process.exit(2); }
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

// ── 같은 원천을 읽는다
[['mypage.html', my], ['admin.html', adm], ['brief.html', brief]].forEach(([f, s]) => t(s.indexOf('<script src="/assets/snap-refs.js"></script>') !== -1, `${f} 가 목록 파일을 읽는다`));
t(/noindex/.test(brief) && brief.indexOf('이름·연락처') !== -1, 'brief.html — 검색 차단 · 이름·연락처를 싣지 않는다는 약속이 있다');

if (bad.length) { console.log('━━ snap-plan — 빨강 ' + bad.length + '건'); bad.forEach((b) => console.log('   · ' + b)); process.exit(1); }
console.log(`━━ snap-plan OK — ${okn.length}항목 · 단독 스냅 ${R.total}분(캔들존 ${R.zones[0].min} · 이동 ${R.move} · 화이트존 ${R.zones[1].min} · 입장 준비 ${R.prep}) = 진행표 · 장면 ${ids.length}개 = 촬영 목록표`);
process.exit(0);
