#!/usr/bin/env node
/**
 * GAS 동기화 — 저장소 automation/ → Apps Script 「Moment Edit 통합」 프로젝트
 *
 * ★왜 clasp push 를 안 쓰는가 (2026-08-07 실측으로 확인)
 *   clasp 는 rootDir 기준 '상대 경로'를 그대로 원격 파일명으로 쓴다. 그런데
 *     저장소: platform/96_ai_cost.gs · consultation/consultation-booking.gs · admin/admin.gs
 *     원격  : 96_ai_cost            · Consultation booking              · admin
 *   즉 clasp push -f 를 돌리면 폴더 접두어가 붙은 파일 23개를 새로 만들고
 *   기존 23개를 전부 지운다 = 프로젝트 파괴. 게다가 이름 자체가 다른 게 둘 있다:
 *     97_ai-handoff.gs → 97_aihandoff  (하이픈 없음)
 *     consultation-booking.gs → Consultation booking  (대문자·공백)
 *   저장소를 평면화하면 레터 프로젝트(form-to-couple 등)와 한 폴더에 섞이므로 그것도 답이 아니다.
 *   → 대응표를 코드에 명시하고 Apps Script API 로 직접 동기화한다.
 *
 * 안전장치
 *   - 원격에 대응표에 없는 파일이 있으면 중단(모르는 파일을 지우지 않는다)
 *   - 대응표의 로컬 파일이 없으면 중단
 *   - appsscript.json(매니페스트)은 원격 것을 그대로 유지 — 저장소에 없기 때문
 *   - --check(기본)는 읽기만 한다. 쓰기는 --push 를 명시해야 한다
 *   - 배포는 기존 배포 갱신만(deploymentId 필수) → /exec 주소 불변
 *
 * 사용
 *   node scripts/gas-sync.mjs --check
 *   node scripts/gas-sync.mjs --push --deploy
 * 환경변수
 *   CLASPRC_JSON       clasp login 후 ~/.clasprc.json 전문 (refresh_token 추출용)
 *   GAS_DEPLOYMENT_ID  기존 배포 ID (--deploy 시 필수)
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT_ID = JSON.parse(readFileSync(resolve(ROOT, '.clasp.json'), 'utf8')).scriptId;

/** 저장소 경로(automation/ 기준) → 원격 GAS 파일명.
 *  ★원격 파일을 추가·삭제·개명하면 여기도 같이 고칠 것. 안 고치면 스크립트가 중단시킨다(의도된 동작). */
const MAP = {
  'consultation/consultation-booking.gs': 'Consultation booking',   // ★대문자·공백
  'consultation/ScreenA_apply.html': 'ScreenA_apply',               // ★실제 고객 화면 — .claspignore 의 '목업' 주석은 틀렸다
  'consultation/ScreenB_schedule.html': 'ScreenB_schedule',
  'consultation/ScreenC_change.html': 'ScreenC_change',
  'admin/admin.gs': 'admin',
  'admin/Admin.html': 'Admin',
  'platform/00_platform-config.gs': '00_platform-config',
  'platform/10_customers-setup.gs': '10_customers-setup',
  'platform/20_customers-data.gs': '20_customers-data',
  'platform/30_auth-core.gs': '30_auth-core',
  'platform/40_signup.gs': '40_signup',
  'platform/50_auth-handlers.gs': '50_auth-handlers',
  'platform/60_mypage.gs': '60_mypage',
  'platform/70_journey.gs': '70_journey',
  'platform/80_production.gs': '80_production',
  'platform/85_invitation.gs': '85_invitation',
  'platform/86_dining_ai.gs': '86_dining_ai',
  'platform/88_place_audit.gs': '88_place_audit',
  'platform/90_test-utils.gs': '90_test-utils',
  'platform/95_notify.gs': '95_notify',
  'platform/96_ai_cost.gs': '96_ai_cost',
  'platform/97_ai-handoff.gs': '97_aihandoff',                      // ★하이픈 없음
  'platform/98_pay_card.gs': '98_pay_card',
};

const args = new Set(process.argv.slice(2));
const DO_PUSH = args.has('--push');
const DO_DEPLOY = args.has('--deploy');

function die(msg) { console.error('\n✖ ' + msg); process.exit(1); }
function ok(msg) { console.log('  ' + msg); }

/** clasprc.json 에서 refresh_token · client 정보 추출 (clasp 버전별 형식 차이 흡수) */
function readCreds() {
  const raw = process.env.CLASPRC_JSON;
  if (!raw) die('CLASPRC_JSON 이 없습니다. PC에서 `clasp login` 후 ~/.clasprc.json 전문을 넣으세요.');
  let j; try { j = JSON.parse(raw); } catch { die('CLASPRC_JSON 이 올바른 JSON 이 아닙니다.'); }
  const cand = [j, j.token, j.tokens?.default, j.credentials].filter(Boolean);
  let refresh, id, secret;
  for (const c of cand) {
    refresh = refresh || c.refresh_token;
    id = id || c.client_id || c.clientId;
    secret = secret || c.client_secret || c.clientSecret;
  }
  const o = j.oauth2ClientSettings || {};
  id = id || o.clientId; secret = secret || o.clientSecret;
  if (!refresh) die('CLASPRC_JSON 에서 refresh_token 을 못 찾았습니다.');
  if (!id || !secret) die('CLASPRC_JSON 에서 client_id/client_secret 을 못 찾았습니다.');
  return { refresh, id, secret };
}

async function accessToken() {
  const { refresh, id, secret } = readCreds();
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: 'refresh_token' }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) die('토큰 발급 실패 (' + r.status + '): ' + JSON.stringify(j).slice(0, 300)
    + '\n  → clasp login 을 다시 하거나, Apps Script API 사용 설정(script.google.com/home/usersettings)을 확인하세요.');
  return j.access_token;
}

async function api(token, path, method = 'GET', body) {
  const r = await fetch('https://script.googleapis.com/v1/projects/' + SCRIPT_ID + path, {
    method,
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) die('Apps Script API 실패 ' + method + ' ' + path + ' (' + r.status + '): ' + JSON.stringify(j).slice(0, 400));
  return j;
}

const typeOf = (p) => (p.endsWith('.html') ? 'HTML' : 'SERVER_JS');

(async () => {
  console.log('GAS 동기화 · scriptId ' + SCRIPT_ID.slice(0, 12) + '…');
  const token = await accessToken();
  const remote = await api(token, '/content');
  const rFiles = remote.files || [];

  // ── 대조 ──
  const wanted = new Map(Object.entries(MAP).map(([local, name]) => [name, local]));
  const rNames = rFiles.filter((f) => f.type !== 'JSON').map((f) => f.name);

  const unknown = rNames.filter((n) => !wanted.has(n));
  if (unknown.length) {
    die('원격에 대응표에 없는 파일이 있습니다. 지우지 않으려고 중단합니다:\n'
      + unknown.map((n) => '    - ' + n).join('\n')
      + '\n  → scripts/gas-sync.mjs 의 MAP 에 추가하고, 저장소에도 해당 파일을 두세요.');
  }
  const missingLocal = [...wanted.values()].filter((p) => !existsSync(resolve(ROOT, 'automation', p)));
  if (missingLocal.length) die('대응표의 로컬 파일이 없습니다:\n' + missingLocal.map((p) => '    - automation/' + p).join('\n'));

  const notOnRemote = [...wanted.keys()].filter((n) => !rNames.includes(n));
  if (notOnRemote.length) ok('원격에 아직 없는 파일(새로 생성됨): ' + notOnRemote.join(', '));

  // ── 변경분 계산 ──
  const rBySource = new Map(rFiles.map((f) => [f.name, f.source || '']));
  const changed = [];
  const payload = [];
  for (const [local, name] of Object.entries(MAP)) {
    const src = readFileSync(resolve(ROOT, 'automation', local), 'utf8');
    if ((rBySource.get(name) ?? null) !== src) changed.push({ name, local, bytes: src.length });
    payload.push({ name, type: typeOf(local), source: src });
  }
  // 매니페스트는 원격 것을 그대로 유지(저장소에 없음)
  const manifest = rFiles.find((f) => f.type === 'JSON');
  if (!manifest) die('원격에 appsscript 매니페스트가 없습니다. 중단합니다.');
  payload.push({ name: manifest.name, type: 'JSON', source: manifest.source });

  console.log('\n■ 대조 결과');
  ok('원격 파일 ' + rNames.length + '개 · 대응표 ' + Object.keys(MAP).length + '개 · 모르는 원격 파일 0개');
  if (!changed.length) { ok('내용 차이 없음 — 반영할 것이 없습니다.'); }
  else {
    console.log('\n■ 바뀔 파일 ' + changed.length + '개');
    changed.forEach((c) => ok(c.name.padEnd(26) + ' ← automation/' + c.local));
  }

  if (!DO_PUSH) { console.log('\n(읽기 전용 모드 — 반영하려면 --push)'); return; }
  if (!changed.length) { console.log('\n반영할 변경이 없어 종료합니다.'); return; }

  // ── 반영 ──
  await api(token, '/content', 'PUT', { files: payload });
  console.log('\n✔ 코드 반영 완료 (' + changed.length + '개)');

  if (!DO_DEPLOY) { console.log('(배포는 --deploy 를 붙여야 진행됩니다)'); return; }

  const dep = process.env.GAS_DEPLOYMENT_ID;
  if (!dep) die('GAS_DEPLOYMENT_ID 가 없습니다. 새 배포를 만들면 /exec 주소가 바뀌므로 일부러 중단합니다.');

  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const ver = await api(token, '/versions', 'POST', { description: 'auto ' + (process.env.GITHUB_SHA || '').slice(0, 7) + ' ' + stamp });
  ok('새 버전 ' + ver.versionNumber + ' 생성');

  await api(token, '/deployments/' + dep, 'PUT', {
    deploymentConfig: { scriptId: SCRIPT_ID, versionNumber: ver.versionNumber, manifestFileName: manifest.name, description: 'auto ' + stamp },
  });
  console.log('✔ 기존 배포 갱신 완료 — /exec 주소는 그대로입니다.');
})();
