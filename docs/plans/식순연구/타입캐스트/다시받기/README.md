# 다시 받을 대본 (자동 생성 · 손으로 고치지 마세요)

`node scripts/build-redub-byvoice.mjs --write` 가 만듭니다.

★재더빙_붙여넣기.txt 와 다릅니다 — 그쪽은 «화면 글 ↔ 소리»만 보아 편지·덕담·서약(castLive)이
  구조적으로 빠집니다. 이 폴더가 «소리 기준» 전부입니다.

파일 하나 = 화자 하나입니다. 대장 차례 그대로이고, 되돌리는 표는 `_순서.json` 에 있습니다.

| 파일 | 성우 | 줄 | 클립 |
|---|---|---|---|
| 1_우성.txt | 우성 | 49 | 19 |
| 2_이겸.txt | 이겸 | 27 | 2 |
| 3_주하.txt | 주하 | 17 | 1 |
| 4_권일.txt | 권일 | 15 | 1 |
| 5_서진.txt | 서진 | 13 | 1 |
| 6_정숙.txt | 정숙 | 4 | 1 |

## 받은 wav 를 되돌려 넣는 명령 (자동 생성 · 그대로 복사해 쓰세요)

```
# 우성 — 49줄 · 19클립
node scripts/assemble-narration.mjs --in <우성_받은폴더> \
  --clip =05_entry-A,=07_entry-C,=08_entry-D,=09_entry-E,=10_entry-F,=22_narr-bless-open,=23_narr-bless-mid,=24_narr-bless-end,=25_narr-bless-end-long,=27_letter-parent,=28_letter-each,=29_letter-both,=38_tribute-in,=52_narr-entry-out,=79_narr-entry-out-B,=80_narr-entry-out-C,=81_narr-entry-out-D,=82_narr-entry-out-E,=83_narr-entry-out-F
```

```
# 이겸 — 27줄 · 2클립
node scripts/assemble-narration.mjs --in <이겸_받은폴더> \
  --clip =11_letter-each,=14_tribute
```

```
# 주하 — 17줄 · 1클립
node scripts/assemble-narration.mjs --in <주하_받은폴더> \
  --clip =13_bless-mother
```

```
# 권일 — 15줄 · 1클립
node scripts/assemble-narration.mjs --in <권일_받은폴더> \
  --clip =12_bless-father
```

```
# 서진 — 13줄 · 1클립
node scripts/assemble-narration.mjs --in <서진_받은폴더> \
  --clip =10_letter-parent
```

```
# 정숙 — 4줄 · 1클립
node scripts/assemble-narration.mjs --in <정숙_받은폴더> \
  --clip =27_tribute-reply
```

