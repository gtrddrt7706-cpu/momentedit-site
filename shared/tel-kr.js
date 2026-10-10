/* ★★[PHONE_AUTOFILL_82 2026-09-25 사장님 지적 「번호 적는 모든 곳에 +82 가 나와도 정상적으로 돌아가게」]
   브라우저 자동완성은 휴대폰 번호를 «+82 10-7349-7706» 으로 넣는다.
   종전 칸들은 숫자만 남겨 «821073497706»(12자리)을 만들었고, 11자리로 자르는 문의서 칸은
   «821-0734-9770» — **끝자리를 잘라 버렸다.** 그 번호로는 알림톡이 나가지 않는다.
   (#800 은 이 값을 «한 자리가 어딘가 빠진 +82 번호»로 읽었지만, 자른 것은 우리 칸이었다)

   ★국가번호는 «숫자만 남기기 전에» 0 으로 바꾼다 — «+» 나 «00» 이 앞에 보일 때만 국가번호가 확실하다.
   ★«+» 없이 82 로 시작하면 **휴대폰 꼴(82 + 1x + 7~8자리 = 11~12자리)일 때만** 바꾼다.
     현금영수증 칸에는 사업자번호(10자리)·주민번호(13자리)도 들어오는데, 82 로 시작해도 건드리지 않는다.
   ★모르는 모양은 숫자만 남긴 그대로 돌려준다 — 억지로 고치면 «남의 번호»가 된다(_phoneKR 과 같은 원칙).

   서버의 _phoneKR · _crKR(automation/platform/00_platform-config.gs)와 같은 규칙이다 — 한쪽만 고치지 말 것.
   GAS 가 내보내는 화면(automation/consultation/ScreenA_apply.html)은 이 파일을 못 읽어서 같은 함수를 안에 한 벌 품고 있다.
   scripts/audit/tel-autofill.mjs 가 둘이 같은지 본다(GAS 예비 관리 화면 Admin.html 은 2026-10-08 은퇴 · ADMIN_BACKUP_RETIRE). */
(function () {
  function meTelDigits(v) {
    var s = String(v == null ? '' : v);
    var d = s.replace(/[^0-9]/g, '');
    if (/^\s*(\+|00)/.test(s)) {                       // «+82» · «0082» — 국가번호가 확실하다
      var t = d.replace(/^00/, '');
      if (t.slice(0, 2) === '82') {
        var r = t.slice(2);
        if (r.charAt(0) === '0') r = r.slice(1);       // «+82 010…» 처럼 0 을 한 번 더 적은 값
        // 010 은 8자리가 붙어야 온전하다(11자). 7자리면 한 자리가 빠진 것이라 되살리지 않는다(_phoneKR 과 같다)
        if (/^(10\d{8}|1[16789]\d{7,8}|[2-7]\d{7,9})$/.test(r)) return '0' + r;
      }
      return d;
    }
    var m = d.match(/^82(10\d{8}|1[16789]\d{7,8})$/);    // «+» 없이 82 — 휴대폰 꼴(11~12자리)만
    return m ? '0' + m[1] : d;
  }
  window.meTelDigits = meTelDigits;
  /* ★[TEL_LEN_OK 2026-10-09 고객 여정 A~Z 점검 2라운드 D2-4] 번호가 «온전한가» — 숫자 «개수»로 본다.
     종전 문의서 칸은 글자 패턴([0-9\-\s\+]{9,})이라 하이픈까지 세어 «010-1234-5»(숫자 8자리)가 통과했고, 서버도 그대로 저장해
     알림톡 · 문자가 안 나갔다(관리자 메일 CONTACT_SILENT 로 나중에야 드러난다).
       ① 국내(meTelDigits 뒤 0 으로 시작): 010 = 11자리 · 011 · 016 ~ 019 = 10 ~ 11 · 02 = 9 ~ 10 · 그 밖(031 ~ 064 지역번호 · 070 · 050x 등) = 10 ~ 11
       ② «+82» · «0082» = meTelDigits 가 0 으로 바꾼 뒤 ① 과 같은 기준(온전하지 않으면 안 바꿔 0 으로 시작하지 않는다 → 거절)
       ③ 그 밖 «+» 국제 번호 = 숫자 8 ~ 15자리(서버 받침과 같은 수 · 화면은 «+» 를 지켜서 보낸다 · TEL_INTL_KEEP)
       ④ 0 으로도 «+» 로도 시작하지 않는 것(1588-1234 대표번호 등)은 거절
     ★서버(40_signup · _phoneKR 뒤 길이 받침)는 국내를 9 ~ 11자리로 더 느슨하게 받는다 — 화면이 더 엄격해도 서버가 받는 국제 번호는 막지 않는다.
     scripts/audit/tel-len-ok.mjs 가 표본으로 잰다. */
  function meTelOk(v) {
    var s = String(v == null ? '' : v).trim();
    var dd = s.replace(/[^0-9]/g, '');
    if (/^\+/.test(s) && dd.slice(0, 2) !== '82') return dd.length >= 8 && dd.length <= 15;   // ③
    var d = meTelDigits(s);
    if (d.charAt(0) !== '0') return false;                                                    // ② 덜 쓴 +82 · ④
    if (/^010/.test(d)) return d.length === 11;
    if (/^01[16789]/.test(d)) return d.length === 10 || d.length === 11;
    if (/^02/.test(d)) return d.length === 9 || d.length === 10;
    return d.length === 10 || d.length === 11;
  }
  window.meTelOk = meTelOk;
})();
