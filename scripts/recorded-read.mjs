/* ★★[REC_READ 2026-09-14] _recorded.json 을 읽는 «하나뿐인 자».
 *
 * ── 왜 만드나 (내가 깨뜨린 것을 내가 못 찾았다)
 *   [VOICE_CHANGED] 로 「누가 읽었는지」를 박으면서 값의 꼴이 둘이 됐다:
 *     옛 기록  "대사 문자열"
 *     새 기록  { text: "대사", voice: "우성" }
 *   읽는 쪽 열세 곳 중 «다섯»만 둘 다 받게 고쳤고 여덟이 문자열만 알았다.
 *   그 여덟은 조용히 안 깨진다 — `"[object Object]"` 를 «녹음된 글»로 알고 대조한다.
 *   실제로 build-chorus 가 「재료가 서로 다른 글을 읽었다」며 26 번을 안 적었고,
 *   check-text-audio 는 「서약 합창이 어긋난다」고 빨개졌다. 둘 다 소리는 멀쩡했다.
 *
 * ── 그래서 읽는 자를 하나로 둔다
 *   꼴이 또 늘어도(예: 언제 받았는지) 여기만 고치면 된다.
 *   ★새로 _recorded.json 을 읽는 코드를 쓸 때는 반드시 이걸 쓴다. 직접 파싱하지 말 것.
 */
import fs from 'node:fs';
import path from 'node:path';

/** 값 하나 → 대사 문자열 (옛 문자열 꼴 · 새 객체 꼴 둘 다) */
export const recText = (v) => (typeof v === 'string' ? v : (v && v.text) || '');
/** 값 하나 → 성우 이름 (옛 기록에는 없다 · 그때는 null) */
export const recVoice = (v) => (typeof v === 'string' ? null : (v && v.voice) || null);

/** 폴더 하나의 clips 를 «전부 문자열로» 펴서 준다. 종전 코드가 그대로 쓰던 모양이다. */
export function recClips(dir) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(dir, '_recorded.json'), 'utf8'));
    const out = {};
    for (const [k, v] of Object.entries(j.clips || {})) out[k] = recText(v);
    return out;
  } catch { return {}; }
}
