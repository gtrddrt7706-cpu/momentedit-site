// 내려받기 함수 하나 — 우리 예식 대본(.txt) · 두 분 목소리 파일을 «파일로» 돌려준다 (Vercel 서버리스).
// ★★[API_FN_CAP 2026-10-30 사장님 «함수 하나 합치기»] Vercel Hobby 는 배포 하나에 서버리스 함수 12개까지다.
//   13개(10/23 부터)를 10/29 부터 막기 시작해 운영 · 미리 보기 배포가 모두 «Build Failed»였다
//   («No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan» · 사장님이 Vercel 화면에서 확인).
//   → 두 내려받기를 이 함수 하나로 모았다. 일은 그대로 두 파일(api/_script-file.js · api/_voice-file.js · _ 로 시작해 함수로 세지 않는다)이 한다.
//   옛 주소 /api/script-file · /api/voice-file 은 vercel.json routes 가 여기로 보낸다(k=script · k=voice) — 화면 · 폼은 그대로다.
// ★요청 본문(POST)은 건드리지 않고 그대로 넘긴다(두 파일이 직접 읽는다) · 여기서도 아무것도 기록하지 않는다.
// ★함수를 새로 만들기 전에 merge-guard 의 «함수 12개 이하» 검사를 본다 — 합칠 수 있는 것은 이렇게 _ 파일 + 나눠 주는 함수로.

const SCRIPT = require('./_script-file');
const VOICE = require('./_voice-file');

module.exports = (req, res) => {
  const u = String(req.url || '');
  const k = (req.query && req.query.k) || ((/[?&]k=([a-z]+)/.exec(u) || [])[1]) || (/voice-file/.test(u) ? 'voice' : /script-file/.test(u) ? 'script' : '');
  if (k === 'script') return SCRIPT(req, res);
  if (k === 'voice') return VOICE(req, res);
  res.statusCode = 404; res.end();
};
