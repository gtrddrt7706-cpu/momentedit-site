#!/usr/bin/env node
/* [SEAM_B2_SPLIT] seam-b2 의 나머지 일곱 — CI 칸 20분에 맞춰 나눠 돈다 · 검사 본문은 seam-b2.mjs 하나 */
process.env.ONLY = process.env.ONLY || '음07,음03,음06,음08,음05,음09,음10';
await import('./seam-b2.mjs');
