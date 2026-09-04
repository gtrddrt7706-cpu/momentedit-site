// 감사가 쓸 «비어 있는 포트»를 커널에서 받아 온다.
//
// ★[FREE_PORT 2026-08-30 사용자 지시 "자동으로 전부 개선"]
//   감사마다 포트를 리터럴로 박아 두었더니 같은 번호를 쓰는 짝이 생겼다(실측 2쌍).
//   그 둘이 나란히 돌면 뒤에 뜬 쪽이 서버를 못 띄우고, 화면은 멀쩡한데 검사만 붉어진다.
//   실제로 index-jr-hover 가 단독 실행은 초록인데 9개를 연달아 돌리자 3건 실패로 떴다 —
//   원인은 화면이 아니라 포트였다.
//
//   ★환경 탓으로 붉는 검사는 사람이 곧 무시한다. 그게 검사를 죽이는 가장 흔한 길이라,
//     «틀렸을 때만 붉게» 만드는 것은 검사 내용만큼 중요한 일이다.
//
//   ★공용 서버에 «접속»하는 스크립트(scripts/check-est-one.mjs 등 · 워크플로가 8895 하나를
//     띄우고 여럿이 함께 쓴다)는 이 함수를 쓰지 않는다. 그건 충돌이 아니라 의도된 공유다.
//     이 함수는 «자기 서버를 직접 띄우는» 감사만을 위한 것이다.
import net from 'node:net';

export function freePort() {
  return new Promise((res, rej) => {
    const probe = net.createServer();
    probe.once('error', rej);
    probe.listen(0, '127.0.0.1', () => {
      const p = probe.address().port;
      probe.close(() => res(p));
    });
  });
}
