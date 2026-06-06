# TODO — 카카오 알림톡(솔라피) 전환

> 지금 구현 X. 채널·템플릿 준비된 뒤 별도 지시 때 착수.

고객 알림을 **메일 → 카카오 알림톡(솔라피)**으로 전환 예정.
- 접수 단계부터 전 고객 알림을 카톡으로, **고객 메일 0건**.
- 솔라피 REST API를 GAS `UrlFetchApp`으로 호출, **알림톡 실패 시 LMS 자동 대체**.
- **카카오 비즈니스 채널 개설·연동 + 템플릿 검수 승인 후** 구현.
- 단계별 템플릿 문구는 별도 확정 예정.

## 참고
- 발송 지점 전수조사 + `sendNotify(event, target, data)` 추상화 레이어 설계는
  세션에서 이미 정리함(이벤트 레지스트리 / 수신자 해석 / 채널 어댑터 / 발송로그·dedup).
- 신규 파일 `automation/platform/15_notify.gs` 단일 진입점으로 흩어진 메일 콜사이트 통합 예정.
- API Key/Secret은 `PropertiesService`(Script Properties), 코드 커밋 금지.
- 관리자 알림(notifyStudio·오류·브리프)은 자유형식이라 메일 유지 권장(중복 3벌만 통합).
