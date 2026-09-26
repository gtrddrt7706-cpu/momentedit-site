// 우리 예식 대본을 «파일로» 돌려준다 (Vercel 서버리스) — 카톡 · 인스타 · 네이버 같은 앱 안 브라우저용.
// ★★[SAVE_INAPP 2026-09-26 코워크 회신5 4-3 · 연구 E05(카카오 공식 FAQ 2025-09 · 직원 답변 2025-10)]
//   카톡 인앱에서는 브라우저가 만든 파일(blob · data URL)을 내려받지 못한다 — 안드로이드는 blob 내려받기가,
//   아이폰은 a.download 가 막힌다. 둘 다 되는 길은 «서버가 Content-Disposition: attachment 로 돌려주는 것» 하나다.
//   → 빌더(order-preview.html saveScriptTxt)가 대본 글을 폼 POST 로 보내고, 여기서 그대로 파일로 돌려준다.
// ★글은 기록하지 않는다 — 서약 · 편지 · 인사말(두 분이 쓴 글)이 들어 있다. 콘솔 출력 · 시트 · 로그 어디에도 남기지 않는다.
//   GET 쿼리로 받지 않는 까닭도 같다 — 주소는 플랫폼 요청 기록에 남는다. 본문(POST)만 받는다.
// ★저장하지 않는다 · 되돌려 줄 뿐이다 — 요청한 사람이 보낸 글을 그 사람에게만 돌려준다(상태 없음 · 운영 시트와 무관 · PREVIEW 안전).
// ★text/plain + attachment + nosniff(vercel.json 전역) — 돌려준 글이 페이지로 그려지지 않는다(되비침 XSS 없음).

const rateGate = require('./_ratelimit');

const MAX_BYTES = 200 * 1024;   // 대본 + 두 분 글 · 넉넉히(보통 10KB 안팎)

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BYTES) { reject(new Error('too_big')); req.destroy(); return; } chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function safeName(n) {
  // 파일 이름은 한글 · 영문 · 숫자 · _ - . 만 · 끝은 .txt · 40자 안
  const s = String(n || '').replace(/[^0-9A-Za-z가-힣_.-]/g, '').slice(0, 40);
  return (s && /\.txt$/.test(s)) ? s : '우리예식대본.txt';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); res.end(); return; }
  if (!rateGate(req, 20, 200)) { res.statusCode = 429; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end('잠시 뒤에 다시 눌러 주세요.'); return; }
  let raw = '';
  try { raw = await readBody(req); } catch (e) { res.statusCode = 413; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end('글이 너무 길어요 · «대본 복사»를 써 주세요.'); return; }
  let text = '', name = '';
  const ct = String(req.headers['content-type'] || '');
  try {
    if (/application\/json/.test(ct)) { const j = JSON.parse(raw || '{}'); text = j.text; name = j.name; }
    else { const p = new URLSearchParams(raw); text = p.get('text'); name = p.get('name'); }
  } catch (e) { text = ''; }
  text = String(text || '');
  if (!text.trim()) { res.statusCode = 400; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end('보낼 글이 없어요.'); return; }
  const fn = safeName(name);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', "attachment; filename=\"script.txt\"; filename*=UTF-8''" + encodeURIComponent(fn));
  res.setHeader('Cache-Control', 'no-store');
  res.end('﻿' + text.replace(/\r?\n/g, '\r\n'));   // BOM + CRLF — 윈도 메모장 · 폰 파일 뷰어에서 한글 · 줄바꿈이 깨지지 않게
};
