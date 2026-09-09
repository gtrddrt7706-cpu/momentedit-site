/* [SETTLE] 전환이 «끝났는지»를 시간이 아니라 «상태»로 확인한다.
 *
 * 왜 (2026-09-09 코워크 지적 · 라운드 3 오류 넷 중 셋이 이 자리였다)
 *   레일 획좌표 · Tab 순회 · 1280px opacity — 셋 다 «전환 중»에 읽어서 틀렸다.
 *   waitForTimeout(500) 은 «아마 끝났겠지»다. 기기가 느리면 안 끝나 있고,
 *   빠르면 헛되이 기다린다. 둘 다 나쁘지만 «안 끝났는데 읽는 쪽»이 값을 뒤집는다.
 *   ★그래서 문장이 아니라 «분기»로 만든다 — 안 읽어도 지켜지게(§10-4 의 값).
 *
 * ★★[SETTLE_LIMIT] 이 함수가 못 보는 것이 있다. 반드시 알고 써라.
 *   getAnimations() 는 «CSS 전환·애니메이션»만 안다. JS 가 매 프레임 inline style 로
 *   바꾸는 것(스크롤 등장 연출의 el.style.opacity)은 여기 안 잡힌다.
 *   실사고: typo-ramp 렌더 칸이 첫 화면 .hero-tease-main 의 opacity:0 을 보고
 *   「램프 밖 0건」을 냈다 — settle 을 걸었어도 그건 안 잡혔을 것이다.
 *   → JS 가 그리는 상태는 «그 값을 직접 읽어» 확인한다. 이 함수는 CSS 쪽만 맡는다.
 */

/** CSS 전환·애니메이션이 전부 끝날 때까지 기다린다(무한 반복은 제외).
 *  @param {object} page  playwright/puppeteer page
 *  @param {number} timeout  ms — 못 가라앉으면 그냥 돌아온다(막지 않는다)
 *  @returns {Promise<boolean>} true=가라앉음 · false=시간 안에 못 가라앉음(«안 쟀다»로 취급) */
export async function settle(page, timeout = 4000) {
  const ok = await page.waitForFunction(() => {
    if (!document.getAnimations) return true;          // 지원 안 하면 판단을 미루지 않는다
    return document.getAnimations().every((a) => {
      if (a.playState !== 'running') return true;
      const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
      return !!(t && t.iterations === Infinity);        // 무한 반복은 «끝남»을 기다릴 수 없다
    });
  }, null, { timeout }).then(() => true).catch(() => false);
  return ok;
}
