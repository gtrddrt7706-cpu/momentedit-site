// ★★[PHOTO_SCENE_1031 검토 173 2026-10-31 사장님 아이디어] 순간마다 «이 순간에 담을 수 있는 장면»
//   원천 RitualOpen.sceneOf 하나 — ① 미리 보기 창(제목 · 그림 · 대표 · 설명 · 구도 한 줄) · ② 접힌 줄 · 한눈에 보기 · 완성 링크 · 확대(맨 위 창 하나) ·
//   ★[PHOTO_SCENE_MIN_1101 검토 180] 고객 화면에 라벨 «연출 장면 · …» · «…예시예요» · «다른 장면 보기» · 마이페이지 «참고 · …» 0건(데이터 alt · SCENE_LABEL 은 남김 · 관리 · 작가 화면용)
//   마이페이지(summary.scenes) · 관리 화면(summary.shots). 전체 대본에는 넣지 않는다 · 컷 수 · 빠짐없는 촬영 약속 금지 · 녹음 0 · 영상 새로 만들지 않음.
//   node scripts/audit/photo-scene.mjs [--shots <폴더>]   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SHOTS = (() => { const i = process.argv.indexOf('--shots'); return i > -1 ? process.argv[i + 1] : ''; })();
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
const LABEL = '연출 장면 · 실제 예식 사진 아님';
const BAN = ['건지는 사진', '남는 3컷', '놓치지 않도록'];
const PS_FINE = '사진의 구도와 수는 당일 진행과 현장 상황에 따라 달라질 수 있어요.';
const GONE = /다른 장면|연출 장면|예시예요|실제 예식 사진 아님/;   // [PHOTO_SCENE_MIN_1101] 장면 칸 · 확대 · 마이페이지 장면 줄에 0건
// ── 데이터
const KEYS = ['guest', 'prevideo', 'candle', 'entry', 'matjeol', 'welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'song', 'letter', 'tribute', 'table', 'toast', '_close'];
ok('장면 17순간 + 판 갈래 셋(감사문 · 서로에게 · 인사만) — 대표 1 · 다른 장면 2 · 설명', KEYS.every((k) => O.PSCENE[k] && O.PSCENE[k].alt.length === 2 && O.PSCENE[k].desc) && ['vow:thanks', 'letter:each', 'tribute:nohug'].every((k) => O.PSCENE[k] && O.PSCENE[k].alt.length === 2));
ok('라벨 값은 데이터에 남김(관리 · 작가 화면용 · 고객 화면엔 안 그림)', O.SCENE_LABEL === LABEL);
ok('[SCENE_PHOTO_1101] 그림 보류(img null) 0 — 장면 20(판 갈래 포함) 모두 사진 · 파일 이름 = 장면 id 꼴', Object.entries(O.PSCENE).every(([id, x]) => x.img === (id === 'letter:each' ? 'letter' : id.replace(/^_/, '').replace(':', '-'))));
{ const IDS = ['entry', 'guest', 'prevideo', 'candle', 'matjeol', 'welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'song', 'letter', 'tribute', 'tribute-nohug', 'table', 'toast', 'close', 'vow-thanks'];
  const wsz = (f) => { const b = fs.readFileSync(f).subarray(0, 40); if (b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WEBP') return ''; const t = b.toString('latin1', 12, 16);
    if (t === 'VP8 ') return (b.readUInt16LE(26) & 0x3fff) + 'x' + (b.readUInt16LE(28) & 0x3fff);
    if (t === 'VP8L') { const v = b.readUInt32LE(21); return ((v & 0x3fff) + 1) + 'x' + (((v >>> 14) & 0x3fff) + 1); }
    if (t === 'VP8X') return (b.readUIntLE(24, 3) + 1) + 'x' + (b.readUIntLE(27, 3) + 1); return ''; };
  const miss = []; for (const n of IDS) for (const [suf, want] of [['', '1280x720'], ['-640', '640x360']]) { const f = path.join(ROOT, 'assets/video/moments/scene', n + suf + '.webp'); const d = fs.existsSync(f) ? wsz(f) : '없음'; if (d !== want) miss.push(n + suf + ' ' + d); }
  ok(`[SCENE_PHOTO_1101] 사진 19 id 모두 2벌 · 1280×720 / 640×360`, IDS.length === 19 && !miss.length && new Set(Object.values(O.PSCENE).map((x) => x.img)).size === 19, miss.join(' · '));
  ok('[SCENE_PHOTO_1101] 그림 원천 = 사진 판(영상 프레임 아님)', /^photo/.test(O.SCENE_SRC_V), O.SCENE_SRC_V); }
// ── [SCENE_DRAMA_ONLY 검토 182] 고객 화면은 극적인 9순간만 · 데이터 · 그림은 그대로 · 마이페이지 목록 = 엔진 목록
const SHOW_B = ['candle', 'entry', 'matjeol', 'vow', 'ring', 'song', 'letter', 'tribute', 'toast'];
const SHOW = ['candle', 'entry', 'matjeol', 'vow', 'ring', 'song', 'letter', 'tribute', 'toast'], HIDE = ['guest', 'prevideo', 'welcome', 'declare', 'bless', 'free', 'table', '_close'];
ok('[SCENE_DRAMA_ONLY] 보이는 순간 = 9곳(화촉 · 입장 · 맞절 · 서약 · 반지 · 축가 · 편지 · 부모님께 인사 · 축배)', JSON.stringify(O.SCENE_SHOW) === JSON.stringify(SHOW) && SHOW.every(O.sceneShow) && !HIDE.some(O.sceneShow), JSON.stringify(O.SCENE_SHOW));
ok('[SCENE_DRAMA_ONLY] 빠진 8곳도 데이터 · 그림은 남김(관리 · 작가 화면용)', HIDE.every((k) => O.PSCENE[k] && O.PSCENE[k].img));
{ const mp = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8'), m = mp.match(/var SCENE_SHOW=(\[[^\]]*\]);/);
  ok('[SCENE_DRAMA_ONLY] 마이페이지 목록 = 엔진 목록(이 파일은 ritual-open 을 읽지 않는다)', !!m && JSON.stringify(JSON.parse(m[1].replace(/'/g, '"'))) === JSON.stringify(SHOW), m && m[1]); }
{ const S = O.applyExample({ course: 'open' }, 'standard'); S.course = 'open';
  ok('남는 장면(shotOf · 마이페이지 한 줄) = 대표 장면 문구', O.bodySeq(S).every((k) => !O.sceneOf(k, S) || O.shotOf(k, S) === O.sceneOf(k, S).rep));
  const T = Object.assign({}, S, { tribHug: 'off' }); ok('인사만 → tribute:nohug · 제 사진(보류 아님) [SCENE_PHOTO_1101]', O.sceneId('tribute', T) === 'tribute:nohug' && !O.sceneOf('tribute', T).hold && /tribute-nohug\.webp/.test(O.sceneOf('tribute', T).img.src));
  const L = Object.assign({}, S, { on: Object.assign({}, S.on, { letter: 1 }) }); O.setChip(L, 'letter', 'each'); ok('편지 «서로에게» → letter:each', O.sceneId('letter', L) === 'letter:each');
  const sig0 = O.sceneSig(S); ok('재확인 열쇠 — 인사 동작이 바뀌면 바뀐다 · 음악(곡)만 바꾸면 그대로', O.sceneSig(T) !== sig0 && O.sceneSig(Object.assign({}, S, { bgm: { x: 1 }, entryMusic: 'k1' })) === sig0);
  ok('식전(하객 맞이 · 식전 영상) → 본식 차례 그대로', (() => { const xs = O.sceneList(S); return xs[0].k === 'guest' && xs[0].pre && xs.filter((x) => x.pre).length === 2 && xs.slice(2).every((x) => !x.pre); })()); }
// ── 금지 문구(고객 면 · 원천)
for (const f of ['order-preview.html', 'mypage.html', 'assets/ritual-open.js', 'index.html']) { const t = fs.readFileSync(path.join(ROOT, f), 'utf8'); const hit = BAN.filter((b) => t.includes(b)); ok(`금지 문구 없음 — ${f}`, !hit.length, hit.join(' · ')); }
// ── [PHOTO_SCENE_MIN_1101] 걷은 것이 코드에 돌아오지 않았나(고객 면)
{ const op = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8'), mp = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');
  const back = ['class="ps-lab"', 'class="psz-lab"', 'class="ps-more"', 'class="ps-alt"', 'PS_FINE_IMG', 'window.psMore'].filter((t) => op.includes(t));
  ok('식순 화면 — 라벨 · 그림 설명 · 다른 장면 단추 · 펼침 목록 코드 없음', !back.length, back.join(' · '));
  ok('마이페이지 — 장면 줄에 «참고 · …»(다른 장면) 없음', !/ph-sc-s">참고 · /.test(mp)); }
// ── 그림 파일 · 판
{ let m = null; try { m = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/video/moments/scene/_frames.json'), 'utf8')); } catch {}
  ok('그림 판 = 원천 판(영상이 바뀌면 다시 뽑기 · build-scene-frames --check)', !!m && m.v === O.SCENE_V && m.src === O.SCENE_SRC_V); }
// ── 브라우저
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
try {
  for (const vp of [{ width: 390, height: 860, tag: '390' }, { width: 1280, height: 900, tag: 'pc' }]) {
    const pg = await br.newPage({ viewport: { width: vp.width, height: vp.height }, reducedMotion: 'reduce' }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(900);
    const prep = async (setup) => pg.evaluate(async (setup) => { const R = RitualOpen, w = (ms) => new Promise((x) => setTimeout(x, ms));
      R.applyExample(S, 'standard'); delete S.tribHug;
      if (setup === 'letter') { S.on.letter = 1; R.setChip(S, 'letter', 'each'); }
      if (setup === 'nohug') S.tribHug = 'off';
      if (setup === 'toast') S.on.toast = 1;
      opSync(); buildSteps(); idx = STEPS.findIndex((x) => x.k === 'pick'); render(); await w(400); }, setup);
    const open = async (k) => { await pg.evaluate(async (k) => { opPv(k); await new Promise((x) => setTimeout(x, 700)); try { _pvStop(); } catch (e) {} const sc = document.querySelector('#pvScene .ps'); if (sc) sc.scrollIntoView({ block: 'start' }); }, k); await wait(500); };
    const shot = async (nm) => { if (!SHOTS) return; await pg.screenshot({ path: path.join(SHOTS, `${nm}-${vp.tag}.png`) }); };
    await prep('');
    await pg.evaluate(() => document.querySelector('.pk-lead') && document.querySelector('.pk-lead').scrollIntoView());
    const lead = await pg.evaluate(() => [...document.querySelectorAll('.pk-lead')].map((e) => e.textContent));
    ok(`${vp.tag} 고르기 소개 한 번 «미리 찍는 웨딩 촬영과 달리 …»`, lead.length === 1 && lead[0] === '미리 찍는 웨딩 촬영과 달리, 함께한 분들과 이날에만 생기는 표정을 기록해요.', JSON.stringify(lead));
    { const hid = [], seen = []; for (const k of ['prevideo', 'welcome', 'declare', 'bless', 'free', 'table']) { await open(k); const o = await pg.evaluate((k) => { const e = document.querySelector('#pvScene'); return { open: !!e && PV.k === k, has: !!(e && (e.querySelector('.ps') || e.textContent.trim())) }; }, k); if (o.open) seen.push(k); if (!o.open || o.has) hid.push(k + (o.open ? '' : '(창 안 열림)')); await pg.evaluate(() => opPvClose()); await wait(150); }
      ok(`${vp.tag} [SCENE_DRAMA_ONLY] ① 창이 열린 채 — 빠진 순간(식전 영상 · 인사말 · 선언 · 덕담 · 축사 · 테이블)엔 장면 칸 0 (하객 맞이 · 닫는 인사는 ① 창이 없다 · ② 에서 잰다)`, !hid.length && seen.length === 6, hid.join(' · ')); }
    await open('matjeol'); await shot('1-matjeol');
    const m = await pg.evaluate(() => { const sc = document.querySelector('#pvScene .ps'), fig = sc && sc.querySelector('.ps-fig'), img = fig && fig.querySelector('img');
      const act = document.querySelector('#pvAct');
      return { h: sc && sc.querySelector('.ps-h').textContent, kids: sc ? [...sc.children].map((e) => e.className) : [], aria: fig ? fig.getAttribute('aria-label') : '',
        rep: sc && sc.querySelector('.ps-rep').textContent, ratio: fig ? +(fig.getBoundingClientRect().width / fig.getBoundingClientRect().height).toFixed(2) : 0, fit: img ? getComputedStyle(img).objectFit : '', loaded: img ? img.naturalWidth : 0,
        orderOk: !!(sc && act && (sc.compareDocumentPosition(act) & Node.DOCUMENT_POSITION_FOLLOWING)), afterMedia: !!(sc && (document.querySelector('#pvM').compareDocumentPosition(sc) & Node.DOCUMENT_POSITION_FOLLOWING)),
        fine: sc && [...sc.querySelectorAll('.ps-fine')].map((e) => e.textContent), txt: sc ? sc.textContent : '' }; });
    ok(`${vp.tag} ① 창 맞절 — 제목 · 그림 16:9(원본 그대로) · 대표 · 설명 · 구도 한 줄 그 차례뿐 · 영상 아래 · 담기 위 [PHOTO_SCENE_MIN_1101]`, m.h === '이 순간에 담을 수 있는 장면' && m.kids.join('|') === 'ps-h|ps-fig|ps-rep|ps-desc|ps-fine' && m.rep === '마주 보고 몸을 숙이는 두 분' && Math.abs(m.ratio - 1.78) < 0.03 && m.fit === 'cover' && m.loaded > 0 && m.orderOk && m.afterMedia, JSON.stringify(m));
    ok(`${vp.tag} 구도 한 줄만(PS_FINE) · 라벨 · «예시예요» · «다른 장면» 0건 · 그림 이름은 대표 장면만`, m.fine.length === 1 && m.fine[0] === PS_FINE && !GONE.test(m.txt) && m.aria === '마주 보고 몸을 숙이는 두 분 · 크게 보기', JSON.stringify({ fine: m.fine, aria: m.aria }));
    // 확대 — 맨 위 창 하나 · Esc 는 확대만 닫는다 · 초점은 누른 그림으로 · 소리 다시 안 튼다
    const z = await pg.evaluate(async (GONE_SRC) => { const GONE_RE = new RegExp(GONE_SRC); const fig = document.querySelector('#pvScene .ps-fig'), a = PV.au; const t0 = a ? a.src : ''; fig.focus(); fig.click(); await new Promise((x) => setTimeout(x, 150));
      const Z = document.getElementById('psZoom'), o = { open: !Z.hidden, gone: !Z.querySelector('.psz-lab') && !GONE_RE.test(Z.textContent + ' ' + Z.getAttribute('aria-label')), name: Z.getAttribute('aria-label'), inert: document.getElementById('pvSheet').hasAttribute('inert'), focusIn: Z.contains(document.activeElement), top: (+getComputedStyle(Z).zIndex || 0) > (+getComputedStyle(document.getElementById('pvSheet')).zIndex || 0) };   /* inert 창은 elementFromPoint 가 건너뛰어 점 검사는 헛돈다 — 층 값을 견준다 */
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await new Promise((x) => setTimeout(x, 150));
      o.closed = Z.hidden; o.pvOpen = !document.getElementById('pvSheet').hidden; o.back = document.activeElement === fig; o.noReplay = (a ? a.src : '') === t0 && (!a || a.paused); return o; }, GONE.source);
    ok(`${vp.tag} 확대 — 맨 위에 보임(① 창보다 위 층) · 라벨 없음(이름은 대표 장면) · Esc 는 확대만 · ① 창은 그대로 · 초점 복원 · 소리 다시 안 틂`, z.open && z.top && z.gone && z.name === '마주 보고 몸을 숙이는 두 분' && z.inert && z.focusIn && z.closed && z.pvOpen && z.back && z.noReplay, JSON.stringify(z));
    if (vp.tag === 'pc') { await pg.evaluate(() => { document.querySelector('#pvScene .ps-fig').click(); }); await wait(300); await shot('5-zoom'); await pg.evaluate(() => psZoomClose()); }
    const ie = await pg.evaluate(() => { const sc = document.querySelector('#pvScene .ps'), c = sc.cloneNode(true); document.body.appendChild(c); _psImgErr(c.querySelector('.ps-fig img'));
      const o = { kids: [...c.children].map((e) => e.className).join('|'), fine: [...c.querySelectorAll('.ps-fine')].map((e) => e.textContent) }; c.remove(); return o; });
    ok(`${vp.tag} 그림을 못 읽으면(_psImgErr) 그림만 빠지고 대표 · 설명 · 구도 한 줄 그대로`, ie.kids === 'ps-h|ps-rep|ps-desc|ps-fine' && ie.fine.length === 1 && ie.fine[0] === PS_FINE, JSON.stringify(ie));
    await pg.evaluate(() => opPvClose()); await wait(200);
    await prep('toast'); await open('toast'); await shot('2-toast');
    await prep('letter'); await open('letter'); await shot('3-letter-each');
    const le = await pg.evaluate(() => ({ rep: document.querySelector('#pvScene .ps-rep').textContent, img: !!document.querySelector('#pvScene .ps-fig') }));
    ok(`${vp.tag} 편지 «서로에게» — 대표 «편지를 읽고 듣는 두 분»`, le.rep === '편지를 읽고 듣는 두 분' && le.img, JSON.stringify(le));
    await pg.evaluate(() => opPvClose()); await wait(200);
    await prep('nohug'); await open('tribute'); await shot('4-tribute-nohug');
    await pg.waitForFunction(() => { const i = document.querySelector('#pvScene .ps-fig img'); return !i || i.complete; }, null, { timeout: 5000 }).catch(() => {});
    const nh = await pg.evaluate(() => ({ rep: document.querySelector('#pvScene .ps-rep').textContent, img: !!document.querySelector('#pvScene .ps-fig'), src: (document.querySelector('#pvScene .ps-fig img') || {}).src || '', loaded: (document.querySelector('#pvScene .ps-fig img') || {}).naturalWidth || 0, lab: !!document.querySelector('#pvScene .ps-lab'), fine: document.querySelector('#pvScene > .ps > .ps-fine:last-child').textContent }));
    ok(`${vp.tag} 인사만 — 제 사진(tribute-nohug) · 라벨 없음 · 구도 한 줄 [SCENE_PHOTO_1101]`, nh.rep === '부모님께 인사하는 두 분' && nh.img && /scene\/tribute-nohug-640\.webp/.test(nh.src) && nh.loaded > 0 && !nh.lab && nh.fine === '사진의 구도와 수는 당일 진행과 현장 상황에 따라 달라질 수 있어요.', JSON.stringify(nh));
    await pg.evaluate(() => opPvClose()); await wait(200);
    if (vp.tag === '390') {
      const r = await pg.evaluate(async () => { const w = (ms) => new Promise((x) => setTimeout(x, ms)), out = {};
        R2 = RitualOpen; R2.applyExample(S, 'standard'); delete S.tribHug; opSync(); buildSteps(); idx = STEPS.findIndex((x) => x.k === 'listen'); render(); await w(300); mkGo('matjeol'); await w(400);
        const d = document.querySelector('[data-fk="psfold:matjeol"]'); out.fold = d ? d.querySelector('summary').textContent : ''; out.foldTxt = d ? d.textContent : ''; out.foldFine = d ? [...d.querySelectorAll('.ps-fine')].map((e) => e.textContent) : []; out.closed = d ? !d.open : false; out.last = d ? !d.nextElementSibling : false;
        mkGo('_close'); await w(300); const d2 = document.querySelector('[data-fk="psfold:_close"]'); out.fold2 = d2 ? d2.querySelector('summary').textContent : '';
        mkGo('guest'); await w(300); out.foldGuest = !!document.querySelector('[data-fk="psfold:guest"]'); mkGo('matjeol'); await w(300); out.foldRing = !!document.querySelector('[data-fk="psfold:matjeol"]');
        mkGo('_sum'); await w(300); out.links = [...document.querySelectorAll('[data-fk^="pslink:"]')].map((e) => e.textContent); out.sumImg = !!document.querySelector('.mk-sum .ps-fig');
        out.script = scriptTextOpen();
        out.pl = _ordPayload(true).summary; return out; });
      ok('② 하나씩 만들기 — 맨 아래 접힌 줄 «사진으로 담을 장면 보기»(처음 닫힘) · [SCENE_DRAMA_ONLY] 맞절엔 있고 하객 맞이 · 닫는 인사엔 없음', r.fold === '사진으로 담을 장면 보기' && r.closed && r.last && r.fold2 === '' && !r.foldGuest && r.foldRing, JSON.stringify([r.fold, r.closed, r.last, r.fold2, r.foldGuest, r.foldRing]));
      ok('② 접힌 줄 안 — 라벨 · «예시예요» · «다른 장면» 0건 · 구도 한 줄만 [PHOTO_SCENE_MIN_1101]', !GONE.test(r.foldTxt) && r.foldFine.length === 1 && r.foldFine[0] === PS_FINE, JSON.stringify(r.foldFine));
      ok('한눈에 보기 — 큰 그림 없이 순간 이름 링크만 · [SCENE_DRAMA_ONLY] 극적인 순간만(하객 맞이 · 선언 · 덕담 · 테이블 인사 링크 없음)', r.links.length >= 5 && !r.links.some((t) => /하객 맞이|성혼 선언|덕담|테이블|닫는 인사|인사말|식전 영상/.test(t)) && r.links.includes('맞절') && !r.sumImg, JSON.stringify(r.links));
      ok('전체 대본 복사 · 파일 받기에 장면 글 없음', !r.script.includes(LABEL) && !r.script.includes('이 순간에 담을 수 있는 장면') && !r.script.includes('마주 보고 몸을 숙이는 두 분'));
      const sc = r.pl.scenes || [], sh = (r.pl.shots || {}).items || [];
      ok('저장 — scenes(마이페이지 · [SCENE_DRAMA_ONLY] 9순간만 · 옛 shot 문구 되살림 없음) · shots(작가 칸 · 전체 그대로 · 판 · 재확인)', sc.length && sc.every((x) => SHOW_B.includes(String(x.k).replace(/:.*/, '')) && x.id && Array.isArray(x.alt)) && !sc.some((x) => x.k === 'guest') && sh.length > sc.length && sh[0].k === 'guest' && sh.every((x) => x.id && x.rep && x.kind === '연출') && r.pl.shots.v === O.SCENE_V && typeof r.pl.shots.chgN === 'number', JSON.stringify({ sc: sc.map((x) => x.k), sh: sh.map((x) => x.k) }));
    }
    ok(`${vp.tag} pageerror 0`, !errs.length, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nPHOTO_SCENE FAIL ${fail}` : '\nPHOTO_SCENE OK'); process.exit(fail ? 1 : 0);
