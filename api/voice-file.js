// 두 분 목소리 파일을 «파일로» 돌려준다 (Vercel 서버리스) — 카톡 · 인스타 · 네이버 같은 앱 안 브라우저용.
// ★★[VOICE_KEEP 2026-09-28 코워크 0928 8-6] «두 분 목소리 파일은 ○월 ○일에 지워져요. 간직하려면 내려받으세요» 의 [내려받기].
//   카톡 인앱은 브라우저가 만든 파일(blob · data URL)을 내려받지 못한다 — 서버가 Content-Disposition: attachment 로 돌려주는 길 하나다
//   (api/script-file.js 와 같은 까닭 · SAVE_INAPP).
// ★마이페이지가 폼 POST 로 {token, id} 를 보낸다 → GAS ritualFileGet(두 분 계정으로만 · 그 예식 폴더 안의 파일만) → 그대로 파일로 돌려준다.
// ★소리 · 토큰은 기록하지 않는다 — 콘솔 출력 · 로그 어디에도 남기지 않는다. GET 쿼리로 받지 않는다(주소는 요청 기록에 남는다).
// ★응답 한도 4.5MB — 다듬은 녹음(24kHz 16bit 모노 · 60초 안)은 3MB 안이다. 넘으면 알린다.

const rateGate = require('./_ratelimit');

const EXEC = 'https://script.google.com/macros/s/AKfycbyR3n9MrPJNQfBDPDocq4VeUd8y78TtyrMTZ3a3g_eOmYwOIc6im5yXo3z1pJv7QgSBEQ/exec';
const MAX_BODY = 8 * 1024, MAX_OUT = 4.3 * 1024 * 1024;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(new Error('too_big')); req.destroy(); return; } chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
function safeName(n, ext) {
  const s = String(n || '').replace(/[^0-9A-Za-z가-힣 _.-]/g, '').trim().slice(0, 40);
  return (s || '두분목소리') + ext;
}
/* ★[SCRIPT_FILE_BACK 2026-10-07] 실패하면 이 응답이 마이페이지 화면을 통째로 덮는다(폼 POST) — 종전엔 흰 화면 글 한 줄 · 돌아갈 단추 · 코드 없음.
   이제 _failpage(까닭 한 줄 + 코드 + «돌아가기»). 자리 L(불러오기 · 파일 받기 · GAS ritualFileGet 과 같은 글자) ·
   몰림 1 · 로그인 표 없음 8 · GAS 늦음 5 · GAS 답 깨짐 7 · 그 밖 GAS 실패 4 · GAS 가 준 글(코드 포함)은 그대로 · 까닭이 글인 거절은 코드 없이(P1) */
const failPage = require('./_failpage');
const say = (res, code, t) => failPage(res, code, '목소리 파일을 내려받지 못했어요', t);

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); res.end(); return; }
  if (!rateGate(req, 30, 300)) { say(res, 429, '요청이 몰렸어요 · 잠시 뒤 다시 눌러 주세요 (코드 L1)'); return; }
  let raw = ''; try { raw = await readBody(req); } catch (e) { say(res, 413, '요청이 너무 커요'); return; }
  const p = new URLSearchParams(raw), token = String(p.get('token') || ''), id = String(p.get('id') || ''), name = p.get('name');
  if (!token) { say(res, 400, '로그인이 풀렸어요 · 마이페이지에서 다시 로그인해 주세요 (코드 L8)'); return; }
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(id)) { say(res, 400, '내려받을 파일을 찾지 못했어요'); return; }
  let d = null, n = 0;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(EXEC, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'ritualFileGet', token, id }), signal: ctl.signal, redirect: 'follow' });
    try { d = await r.json(); } catch (e) { d = null; n = (e && e.name === 'AbortError') ? 5 : 7; }
  } catch (e) { d = null; n = (e && e.name === 'AbortError') ? 5 : 4; }
  finally { clearTimeout(t); }
  if (!d || !d.ok || !d.data) {
    let line = '';
    if (d && d.error) {   // GAS 가 준 글 — 1~9 면 이미 «(코드 L#)»가 붙어 온다 · ecode 만 오면 붙인다(끝 마침표는 걷는다)
      line = String(d.error).trim();
      const ec = /^[A-Z][1-9]$/.test(String(d.ecode || '')) ? String(d.ecode) : '';
      if (ec && !/\(코드 [A-Z]\d/.test(line)) line = line.replace(/[\s.]+$/, '') + ' (코드 ' + ec + (d.eid ? ' · ' + String(d.eid).replace(/[^A-Z0-9]/gi, '').slice(0, 8) : '') + ')';
    } else {
      if (!n) n = d ? 4 : 7;   // 답은 왔는데 파일이 없다 4 · JSON 이 아니었다 7
      line = (n === 5 ? '응답이 늦어요' : n === 7 ? '서버가 잠깐 멈췄어요' : '파일을 받지 못했어요') + ' · 마이페이지에서 다시 눌러 주세요 (코드 L' + n + ')';
    }
    say(res, 404, line); return;
  }
  const buf = Buffer.from(String(d.data), 'base64');
  if (buf.length > MAX_OUT) { say(res, 413, '파일이 커서 여기서 내려받을 수 없어요 · 저희에게 말씀해 주시면 보내 드려요'); return; }
  const mime = /^audio\/[a-z0-9.+-]+$/.test(String(d.mime || '')) ? d.mime : 'audio/wav';
  const ext = /mpeg|mp3/.test(mime) ? '.mp3' : /mp4|m4a|aac/.test(mime) ? '.m4a' : /webm/.test(mime) ? '.webm' : '.wav';
  res.statusCode = 200;
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', "attachment; filename=\"voice" + ext + "\"; filename*=UTF-8''" + encodeURIComponent(safeName(name, ext)));
  res.setHeader('Cache-Control', 'no-store');
  res.end(buf);
};
