// parents.html 「듣기」 — 기기 음성(TTS)과 녹음 음원(mp3)이 동시에 나지 않는지 실렌더로 확인한다
//
//   node scripts/audit/parents-listen-race.mjs
//
// 왜 이 검사가 필요한가 (2026-08-04 실제 신고)
//   "편지 듣다가 중간에 기존 더빙하기전 음성이 나오다가 한번더 누르니 동시에나오는버그발견"
//
//   parents.html은 fetch(AUDIO_SRC,{method:'HEAD'})가 200이면 음원 모드로, 아니면 기기 음성으로 읽는다.
//   그런데 이 판정은 비동기다. 판정이 끝나기 전에 버튼을 보여 주면 「모드를 모르는 채로 누를 수 있는 창」이 열리고,
//   그 창에서 누른 기기 음성이 살아 있는 채로 음원 모드가 켜지면 두 소리가 겹친다.
//   ★모드를 모르는 채로는 버튼을 보여 주지 않는다. 다만 영영 모르는 상태로 두지도 않는다.
//
// 어떻게 재현하는가
//   ① mp3의 HEAD 응답을 일부러 늦추는 정적 서버를 직접 띄운다(판정이 늦는 실제 상황 = 느린 회선).
//   ② speechSynthesis와 Audio를 페이지 로드 전에 가짜로 바꿔 「지금 소리가 나고 있는가」를 기록한다.
//      헤드리스 브라우저에는 스피커가 없어 진짜 소리로는 판정할 수 없다 — 겹침은 상태로 잡는다.
//   ③ 판정 전 클릭 → HEAD 착지 → 재클릭 순서를 그대로 재연하고, 두 소리가 한 번이라도 겹치면 실패로 본다.
//
// ★[LISTEN_LEAD_IN 2026-08-30] 「듣기」는 누른 뒤 2초 있다가 소리를 낸다(첫마디 씹힘 방지).
//   그래서 이 검사도 «누르고 조금 기다렸다» 보면 안 된다 — 2초 안에는 워밍업 한 문장만 나 있고,
//   편지 본문은 아직 시작되지 않았다. 워밍업까지 «읽고 있다»로 세면 본문 낭독이 통째로 죽어도 초록이 된다.
//   그래서 아래 2·4번은 LEAD 를 넘겨 기다리고, speaks 를 1(워밍업)이 아니라 «1보다 큰가»로 본다.
//
// ★고치기 전에 빨간불이 떠야 하는 검사다. 초록으로만 태어난 검사는 아무것도 지키지 못한다.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { launchBrowser } from './_browser.mjs';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '../..');
const PORT = 8232;
const LEAD = 2000;        // parents.html 의 LEAD_IN 과 같은 값 — 여기가 어긋나면 아래 대기가 헛돈다
const WARM = 1;           // 누르는 즉시 나가는 워밍업 문장 수(엔진 깨우기) — 본문은 이보다 많아야 한다
const AUDIO_PATH = '/assets/audio/parents-letter.mp3';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2',
};

// 시나리오마다 mp3 HEAD를 어떻게 대접할지 바꾼다
let audioRule = { delayMs: 0, status: 200 };

const srv = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const send = () => {
    const file = path.join(root, url.replace(/^\/+/, ''));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end();
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const size = fs.statSync(file).size;
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': size });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  };
  if (url === AUDIO_PATH) {
    return setTimeout(() => {
      if (audioRule.status !== 200) { res.writeHead(audioRule.status); return res.end(); }
      send();
    }, audioRule.delayMs);
  }
  send();
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
const stop = () => { try { srv.close(); } catch {} };
process.on('exit', stop);

// 페이지가 실행되기 전에 「소리 상태」를 대신할 가짜 장치를 끼운다
const PROBE = `
(function(){
  var T0 = Date.now();
  var S = window.__snd = { log: [], tts:false, audio:false, overlap:false, speaks:0, plays:0, cancels:0, audibleAt:null, playAt:null };
  function mark(what){
    S.log.push(((Date.now()-T0)/1000).toFixed(2) + ' ' + what);
    if (S.tts && S.audio) S.overlap = true;      // 한 번이라도 겹치면 그 사실은 남는다
  }
  var synth = {
    speaking:false, pending:false, paused:false, onvoiceschanged:null,
    getVoices:function(){ return []; },
    speak:function(){ S.speaks++; this.speaking=true; S.tts=true; mark('tts.speak'); },
    cancel:function(){ S.cancels++; this.speaking=false; S.tts=false; mark('tts.cancel'); },
    pause:function(){}, resume:function(){},
    addEventListener:function(){}, removeEventListener:function(){}
  };
  try { Object.defineProperty(window,'speechSynthesis',{ value:synth, configurable:true }); } catch(e){}
  window.SpeechSynthesisUtterance = function(t){
    this.text=t; this.lang=''; this.voice=null; this.rate=1; this.pitch=1;
    this.onend=null; this.onerror=null; this.onstart=null;
    this.addEventListener=function(){}; this.removeEventListener=function(){};
  };
  function FakeAudio(src){ this.src=src||''; this.paused=true; this.preload=''; this.currentTime=0; this.ended=false; this.muted=false; this._h={}; }
  /* [LISTEN_LEAD_IN] 들리기 시작한 «첫 순간»을 기록한다 — 재생 시작이 아니라 «소리가 난» 시각이다.
     음원 모드의 리드인은 재생을 늦추는 게 아니라 앞 2초를 죽여 두는 방식이라, 이걸 안 재면
     리드인이 통째로 사라져도 play 시각만 보고 초록이 난다. */
  var _unmuteWatch=null;
  function _watchUnmute(a){
    if(_unmuteWatch) clearInterval(_unmuteWatch);
    _unmuteWatch=setInterval(function(){
      if(!a.paused && !a.muted && S.audibleAt==null){ S.audibleAt=Date.now()-T0; mark('audio.audible'); }
    },20);
  }
  FakeAudio.prototype.addEventListener=function(k,f){ (this._h[k]=this._h[k]||[]).push(f); };
  FakeAudio.prototype.removeEventListener=function(){};
  FakeAudio.prototype.load=function(){};
  FakeAudio.prototype.play=function(){ S.plays++; this.paused=false; S.audio=true; if(S.playAt==null)S.playAt=Date.now()-T0; mark('audio.play'); _watchUnmute(this); return Promise.resolve(); };
  FakeAudio.prototype.pause=function(){ this.paused=true; S.audio=false; mark('audio.pause'); };
  window.Audio = FakeAudio;
})();
`;

const br = await launchBrowser();
if (!br) { console.error('✗ 브라우저를 못 띄웠습니다'); stop(); process.exit(1); }
if (br.kind !== 'playwright') {
  console.log('· playwright가 아니라 건너뜁니다(가짜 장치 주입에 addInitScript가 필요)');
  await br.close(); stop(); process.exit(0);
}

let bad = 0;
const fail = (m) => { console.log(`  ✗ ${m}`); bad++; };

async function open() {
  const { page, errors } = await br.newPage({ port: PORT, viewport: { width: 390, height: 844 } });
  await page.addInitScript(PROBE);
  await page.goto(`http://localhost:${PORT}/parents.html`, { waitUntil: 'domcontentloaded' });
  return { page, errors };
}
const snd = (page) => page.evaluate(() => window.__snd);
const btnState = (page) => page.evaluate(() => {
  const b = document.getElementById('listenBtn');
  if (!b) return { there: false };
  return { there: true, hidden: !!b.hidden, visible: !!(b.offsetWidth || b.offsetHeight), text: (b.textContent || '').trim() };
});
// 눌러 본다. 못 누르면 「누를 수 있는 창이 없었다」는 뜻이라 그대로 알린다.
async function tryClick(page, ms = 700) {
  try { await page.click('#listenBtn', { timeout: ms }); return true; } catch { return false; }
}

/* ── 시나리오 1 ── 음원은 있지만 판정이 늦다: 판정 전 클릭 → 착지 → 재클릭 */
{
  audioRule = { delayMs: 1500, status: 200 };
  console.log('\n── 1) 음원 200이 1.5초 늦게 올 때 (조기 클릭 → 착지 → 재클릭)');
  const { page } = await open();
  await page.waitForTimeout(350);                       // 아직 HEAD 미착지

  const early = await btnState(page);
  const clickedEarly = await tryClick(page);
  console.log(`  판정 전 버튼   보임=${early.visible} / 눌림=${clickedEarly}`);

  await page.waitForTimeout(1800);                      // HEAD 착지 + 모드 전환
  const mid = await snd(page);
  console.log(`  착지 직후      tts=${mid.tts} audio=${mid.audio}`);

  await tryClick(page, 1500);                           // 「멈추려고」 한 번 더
  await page.waitForTimeout(400);
  const s = await snd(page);
  console.log(`  재클릭 후      tts=${s.tts} audio=${s.audio} (speak ${s.speaks} · play ${s.plays} · cancel ${s.cancels})`);
  console.log(`  타임라인       ${s.log.join(' → ') || '(없음)'}`);

  if (s.overlap) fail('기기 음성과 음원이 동시에 났습니다 — 사용자가 신고한 그 증상');
  if (s.tts && s.audio) fail('재클릭 뒤에도 두 소리가 함께 살아 있습니다');
  await page.close();
}

/* ── 시나리오 2 ── 음원이 없다: 폴백이 살아 있어야 한다 */
{
  audioRule = { delayMs: 2000, status: 404 };
  console.log('\n── 2) 음원이 없을 때 (404가 2초 늦게 올 때) — 기기 음성 폴백');
  const { page } = await open();
  await page.waitForTimeout(3200);                      // 404 착지 + 타임아웃 폴백 여유
  const st = await btnState(page);
  const clicked = await tryClick(page, 1500);
  const early = await snd(page);                        // 리드인 «안»: 아직 본문이 나오면 안 된다
  await page.waitForTimeout(LEAD + 500);                // 리드인 «밖»: 이제 본문이 나와 있어야 한다
  const s = await snd(page);
  console.log(`  버튼           보임=${st.visible} / 눌림=${clicked}`);
  console.log(`  결과           tts=${s.tts} audio=${s.audio} (누른 직후 speak ${early.speaks} → 2초 뒤 ${s.speaks} · play ${s.plays})`);

  if (!st.visible) fail('음원이 없는데 듣기 버튼이 끝내 안 보입니다 — 폴백이 죽었습니다');
  if (!s.tts || s.speaks === 0) fail('음원이 없는데 기기 음성이 안 납니다');
  if (early.speaks > WARM) fail(`리드인 2초를 안 지키고 바로 읽기 시작했습니다(누른 직후 ${early.speaks}문장) — 첫마디가 씹힙니다`);
  if (s.speaks <= WARM) fail('2초가 지나도 편지 본문이 읽히지 않습니다 — 워밍업 한 문장만 나고 끝났습니다');
  if (s.plays) fail('음원이 없는데 음원 재생을 시도했습니다');
  await page.close();
}

/* ── 시나리오 3 ── 음원이 바로 있다: 음원만 나야 한다 + 연타해도 겹치면 안 된다 */
{
  audioRule = { delayMs: 0, status: 200 };
  console.log('\n── 3) 음원이 바로 있을 때 — 음원만 · 연타');
  const { page } = await open();
  await page.waitForTimeout(700);
  await tryClick(page, 1500);
  await page.waitForTimeout(150);
  const one = await snd(page);
  await tryClick(page, 1500);                           // 연타
  await tryClick(page, 1500);
  await page.waitForTimeout(300);
  const s = await snd(page);
  console.log(`  첫 클릭        tts=${one.tts} audio=${one.audio}`);
  console.log(`  연타 후        tts=${s.tts} audio=${s.audio} (speak ${s.speaks} · play ${s.plays})`);
  console.log(`  타임라인       ${s.log.join(' → ') || '(없음)'}`);

  if (s.speaks) fail('음원이 있는데 기기 음성이 났습니다');
  if (!one.audio) fail('음원이 있는데 첫 클릭에 재생이 시작되지 않았습니다');
  if (s.overlap) fail('연타 중 두 소리가 겹쳤습니다');
  await page.close();
}

/* ── 시나리오 4 ── 판정이 영영 안 온다: 버튼이 영영 안 나오면 안 된다 */
{
  audioRule = { delayMs: 99000, status: 200 };
  console.log('\n── 4) 판정이 영영 안 올 때 — 기다리다 기기 음성으로 내려앉는가');
  const { page } = await open();
  await page.waitForTimeout(3400);                      // HEAD_WAIT(2.5초) + 여유
  const st = await btnState(page);
  const clicked = await tryClick(page, 1500);
  await page.waitForTimeout(LEAD + 500);                // 리드인을 넘겨야 본문이 나와 있다
  const s = await snd(page);
  console.log(`  버튼           보임=${st.visible} / 눌림=${clicked}`);
  console.log(`  결과           tts=${s.tts} audio=${s.audio} (speak ${s.speaks} · play ${s.plays})`);

  if (!st.visible) fail('판정이 안 왔다고 듣기 버튼이 끝내 안 보입니다 — 느린 회선에서 기능이 사라집니다');
  if (!s.tts) fail('내려앉은 뒤에도 기기 음성이 안 납니다');
  if (s.speaks <= WARM) fail('내려앉은 뒤 2초가 지나도 편지 본문이 읽히지 않습니다');
  if (s.overlap) fail('두 소리가 겹쳤습니다');
  await page.close();
}

/* ── 시나리오 5 ── [LISTEN_LEAD_IN] 누르고 2초는 «조용»해야 한다 · 그동안 화면은 «바로» 반응해야 한다
   사용자 신고: "처음 누를때 가끔씩 씹히는 경우가 있어 첫마디가 말이야"
   고친 방식은 «재생을 늦추는 것»이 아니라 «앞 2초를 죽여 두는 것»이다(iOS 자동재생 정책 때문).
   그래서 재는 것도 play 시각이 아니라 «들리기 시작한» 시각이어야 한다. */
{
  audioRule = { delayMs: 0, status: 200 };
  console.log('\n── 5) 리드인 — 누르고 2초는 조용한가 · 화면은 즉시 반응하는가');
  const { page } = await open();
  await page.waitForTimeout(700);
  await tryClick(page, 1500);

  await page.waitForTimeout(250);                       // 리드인 «안»
  const inLead = await snd(page);
  const lbl = await btnState(page);
  const barUp = await page.evaluate(() => !!document.body.classList.contains('listening'));
  console.log(`  누른 직후      들림=${inLead.audibleAt != null} · 버튼="${lbl.text}" · 멈춤줄=${barUp}`);

  await page.waitForTimeout(LEAD);                      // 리드인 «밖»
  const s = await snd(page);
  console.log(`  2초 뒤         재생시작 ${s.playAt}ms → 들리기시작 ${s.audibleAt}ms`);
  console.log(`  타임라인       ${s.log.join(' → ') || '(없음)'}`);

  if (inLead.audibleAt != null) fail(`누르자마자 소리가 났습니다(${inLead.audibleAt}ms) — 첫마디가 씹히는 그 상태입니다`);
  if (lbl.text !== '멈춤') fail(`기다리는 2초 동안 버튼이 "${lbl.text}" 입니다 — 안 눌린 줄 알고 또 누릅니다`);
  if (!barUp) fail('기다리는 2초 동안 멈춤 줄이 안 떴습니다 — 반응이 없어 보입니다');
  if (s.audibleAt == null) fail('2초가 지나도 끝내 소리가 나지 않았습니다');
  else if (s.audibleAt < LEAD * 0.8) fail(`리드인이 너무 짧습니다(${s.audibleAt}ms · 기대 ${LEAD}ms)`);
  await page.close();
}

/* ── 시나리오 6 ── 기다리는 중에 다시 누르면 «취소»여야 한다
   이걸 안 지키면 «멈췄는데 2초 뒤에 혼자 소리가 나는» 유령이 생긴다.
   ★두 모드를 «둘 다» 본다. 처음엔 음원 모드로만 봤는데, 예약 지우기를 일부러 없애도 초록이었다 —
     음원 쪽 예약은 터져도 이미 멈춰 둔 소리의 음소거만 푸는 것이라 아무 소리가 안 난다.
     유령이 실제로 «말을 하는» 곳은 기기 음성 쪽이다. 거기를 안 보면 이 검사는 모양만 남는다. */
for (const mode of [
  { name: '음원',      rule: { delayMs: 0, status: 200 },    wait: 700 },
  { name: '기기 음성', rule: { delayMs: 0, status: 404 },    wait: 900 },
]) {
  audioRule = mode.rule;
  console.log(`\n── 6) 리드인 중 재클릭 — 취소되는가 (${mode.name})`);
  const { page } = await open();
  await page.waitForTimeout(mode.wait);
  await tryClick(page, 1500);
  const atClick = await snd(page);
  await page.waitForTimeout(300);
  await tryClick(page, 1500);                           // 기다리는 중에 «멈춤»
  await page.waitForTimeout(LEAD + 600);                // 예약이 살아 있었다면 이 사이에 터진다
  const s = await snd(page);
  const lbl = await btnState(page);
  const ghostTts = s.speaks > atClick.speaks;           // 멈춘 뒤에 «새로» 말하기 시작했는가
  console.log(`  결과           들림=${s.audibleAt != null} · 멈춘뒤 새 낭독=${ghostTts} · 버튼="${lbl.text}"`);
  console.log(`  타임라인       ${s.log.join(' → ') || '(없음)'}`);

  if (s.audibleAt != null) fail(`[${mode.name}] 멈춘 뒤에 소리가 났습니다(${s.audibleAt}ms) — 예약이 안 지워졌습니다`);
  if (ghostTts) fail(`[${mode.name}] 멈춘 뒤에 편지를 읽기 시작했습니다(${atClick.speaks}→${s.speaks}문장) — 예약이 안 지워졌습니다`);
  if (lbl.text !== '듣기') fail(`[${mode.name}] 멈췄는데 버튼이 "${lbl.text}" 입니다`);
  await page.close();
}

await br.close();
stop();
console.log(bad ? `\n✗ ${bad}건 실패 — 「듣기」가 두 소리를 동시에 내거나 첫마디를 씹습니다` : '\n✓ 일곱 상황 모두 통과 — 한 번에 한 소리만 · 누르고 2초 뒤에 첫 글자부터');
process.exit(bad ? 1 : 0);
