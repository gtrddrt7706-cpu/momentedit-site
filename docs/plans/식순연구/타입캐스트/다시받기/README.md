# 다시 받을 대본 (자동 생성 · 손으로 고치지 마세요)

`node scripts/build-redub-byvoice.mjs --write` 가 만듭니다.

★재더빙_붙여넣기.txt 와 다릅니다 — 그쪽은 «화면 글 ↔ 소리»만 보아 편지·덕담·서약(castLive)이
  구조적으로 빠집니다. 이 폴더가 «소리 기준» 전부입니다.

파일 하나 = 화자 하나입니다. 대장 차례 그대로이고, 되돌리는 표는 `_순서.json` 에 있습니다.

| 파일 | 성우 | 줄 | 클립 |
|---|---|---|---|
| 1_진희.txt | 진희 | 9 | 2 |
| 2_서진.txt | 서진 | 9 | 2 |
| 3_우성.txt | 우성 | 3 | 1 |

## 받은 wav 를 되돌려 넣는 명령 (자동 생성 · 그대로 복사해 쓰세요)

```
# 진희 — 9줄 · 2클립
node scripts/assemble-narration.mjs --in <진희_받은폴더> \
  --clip =02_guest-2-10min,=04_guest-4-1min
```

```
# 서진 — 9줄 · 2클립
node scripts/assemble-narration.mjs --in <서진_받은폴더> \
  --clip =02_guest-2,=04_guest-4
```

```
# 우성 — 3줄 · 1클립
node scripts/assemble-narration.mjs --in <우성_받은폴더> \
  --clip =86_narr-round-mid
```

