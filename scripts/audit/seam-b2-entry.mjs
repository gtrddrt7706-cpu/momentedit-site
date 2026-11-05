#!/usr/bin/env node
/* [SEAM_B2_SPLIT] seam-b2 의 입장 장면 둘(음02 · 음04 · 곡 해독 · 실제 시간 대기) — CI 칸 20분에 맞춰 나눠 돈다 · 검사 본문은 seam-b2.mjs 하나 */
process.env.ONLY = process.env.ONLY || '음02,음04';
await import('./seam-b2.mjs');
