# 녹음 넘김 (나래이션 섹션 → 인스타 섹션 → «성우 나레이션 검토» 채팅) [REC_HANDOFF_1018]

판마다 타입캐스트에 붙여 넣을 글을 여기 둬요. 줄마다 «화자: 문장»이라 그대로 붙이면 화자가 자동으로 정해져요. 다운로드는 **문장별 분리**로 받아요.

| 파일 | 줄 | 담긴 클립 |
|---|---|---|
| 검토7판_1018_우성.txt | 17 | 151 · 154 · 156(화촉 예시 2 «밝혀 주시겠습니다» 다시 받기) · 251 · 252 · 253 · 254(새 예시) |
| 검토8판_1018_진희_우성.txt | 37 | 진희 11줄 = 45 · 110(첫 문장 «다 함께하는 촬영은 …») · 우성 26줄 = 148 · 153 · 170 · 186 · 191 · 192(다시 받기) · 206 · 207(새로) |

## ★지금 받을 것 = 「전체_1018」 한 벌 (10/18 18:48 · 성우 틀림 46 + 다시 받을 줄 81) [REC_ALL_1018]

7판 · 8판 파일은 이 안에 다 들어 있어요. **이 네 파일만 쓰면 돼요.**

| 파일 | 폴더(--in 아래) | 줄 | 화자 |
|---|---|---|---|
| 전체_1018_1_안내.txt | 1_안내 | 16 | 진희(45 · 110 · 47 · 121 · 130) |
| 전체_1018_2_진행_전반.txt | 2_진행_전반 | 31 | 우성 |
| 전체_1018_3_진행_후반.txt | 3_진행_후반 | 11 | 우성 |
| 전체_1018_7_예시_멘트.txt | 7_예시_멘트 | 226 | 우성 |

- 117클립 · 284문장 = 다시 받을 줄 81클립(`docs/plans/식순연구/타입캐스트/다시받기/` · 7판 · 8판 · 그 전 판 글 바뀜) ∪ 성우 틀림 46클립(23 · 121 · 130 · 131 · 148 ~ 189) · 겹침 10(148 · 151 · 153 · 154 · 156 · 170 · 172 · 173 · 184 · 186).
  성우 틀림 36클립은 글이 그대로라 지금 글로 받으면 돼요.
- 넣을 때 `--clip` 은 **`전체_1018_clip.txt` 를 그대로** 넘겨요(`=번호_slug` 117개). 앞글자로 고르면 번져요 — `narr-table-in` 은 ex2 ~ ex5 까지, `narr-bless-mid` 는 ex2 ~ ex4 까지 딸려 와요.
  `node scripts/assemble-narration.mjs --in <폴더> --clip "$(cat docs/handoff/녹음/전체_1018_clip.txt)"`
- 넣은 뒤 차례: `node scripts/check-text-audio.mjs --redub`(재더빙 명단을 새로 씀 · 검사가 명단 ↔ 어긋남을 양방향으로 본다) → `node scripts/build-redub-byvoice.mjs --write`(다시받기/ 를 비움) → `node scripts/check-recorded.mjs`.
  CI 가 생성물(듣기 페이지 등)을 짚으면 build-voice-parts --write → build-script-review → build-listen-all --out listen-abb5d829.html --web → build-listen-tone --write 순서로 다시 뽑아요.
- 쓰지 않는 자리: 201 `narr-ring-out-ex4` · 247 `bridge-b11-song-light` 는 걷은 줄(RETIRED)이라 받지 않아요. 253 이름은 `narr-ring-out-ex9` 예요.
- 성우 기록: `_recorded.json` 의 voice 는 소리가 아니라 대본의 화자 배정으로 찍혀요 — 이겸 · 예슬로 잘못 받은 46클립도 «우성 · 진희»로 적혀 있었어요. 그래서 성우 틀림은 검사가 못 잡아요. 이번처럼 귀(또는 목소리 대조)로만 잡혀요.
- 빠르기: 지금 클립 파일 길이로 재면 우성 295 · 진희 290음절/분이고 큐 계산(PARAM.spm 300)과 합계 1% 차이예요(실제 2,041초 · 계산 2,015초). 쉼을 뺀 말 빠르기(약 422)에 맞춰 받으면 클립 길이가 지금과 같아져요 — 큐 쪽은 고칠 것이 없어요.
- 나래이션 섹션은 이 녹음 PR 이 병합될 때까지 `assets/audio/narration` · `_recorded.json` · ritual-cue `FILES` · 다시받기 명단 · **나레이션 글(ritual-open · ritual-cue 의 대사)** 을 건드리지 않아요. 글을 바꾸면 위 목록이 달라져서예요.

## 사이트에 넣을 때 (디자인 섹션 · Claude Code)
- 받은 문장 파일을 한 폴더에 두고 `node scripts/assemble-narration.mjs --in <폴더> --clip <slug,…>` — 파일 이름(FILES 번호_slug.mp3) · 무음 · 음량 · `assets/audio/narration/_recorded.json` 을 이 도구가 함께 맞춰요. **_recorded.json 을 손으로 고치지 않아요.**
- 그러면 나래이션 쪽 검사(TEXT_AUDIO_MATCH · 다시 받기 목록 · 녹음 전 표시)는 따로 바꿀 것 없이 초록이 돼요. 넣은 뒤 `node scripts/check-text-audio.mjs --redub` 로 다시 받기 목록에서 빠졌는지만 봐 주세요.
- slug 는 각 판 PR 의 «다시 받을 줄»에 있어요. 253 의 이름은 `narr-ring-out-ex9` 예요(201 `narr-ring-out-ex4` 는 쉬는 소리라 다시 쓰지 않아요).
