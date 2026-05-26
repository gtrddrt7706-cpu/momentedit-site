/**
 * Moment Edit · 하객 편지 "편지지" 이메일 템플릿
 * ------------------------------------------------------------------
 * 라이브 페이지(live.html)에서 하객이 남긴 편지를 부부에게 보낼 때,
 * 이 함수가 만든 HTML을 메일 본문으로 사용하면 청첩장과 같은 무드의
 * 편지지로 전달됩니다. (편지 수신 웹훅 Apps Script 안에 붙여넣어 사용)
 *
 * 사용 예:
 *   var html = buildGuestLetterHtml(guestName, relation, recipient, message);
 *   GmailApp.sendEmail(coupleEmails, '[Moment Edit] ' + toTitle(recipient) + ' 편지가 도착했습니다',
 *     '', { htmlBody: html, name: 'Moment Edit', from: 'contact@momentedit.kr' });
 *
 *   recipient 값: 'groom' | 'bride' | 'both'  (live.html 폼의 recipient 필드)
 */

var LETTER_LOGO_URL = 'https://raw.githubusercontent.com/gtrddrt7706-cpu/momentedit-site/main/assets/preview/email-logo.png';

function toTitle(recipient) {
  return recipient === 'groom' ? '신랑에게' : (recipient === 'bride' ? '신부에게' : '두 분께');
}
function toShort(recipient) {
  return recipient === 'groom' ? '신랑' : (recipient === 'bride' ? '신부' : '두 분께');
}

function buildGuestLetterHtml(guestName, relation, recipient, message) {
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  };
  var rel = relation ? ('<span style="color:#9a8f7f;font-size:12px;"> · ' + esc(relation) + '</span>') : '';
  var body = esc(message).replace(/\n/g, '<br>');
  return '' +
    '<div style="font-family:\'Noto Serif KR\',serif;max-width:560px;margin:0 auto;padding:46px 32px;background:#FAFAF8;color:#3d3d3a;">' +
      '<div style="text-align:center;"><img src="' + LETTER_LOGO_URL + '" alt="MOMENT EDIT — Private Wedding Studio" width="190" style="display:block;width:190px;max-width:58%;height:auto;margin:0 auto;border:0;"></div>' +
      '<div style="width:42px;height:1px;background:#B89A75;margin:24px auto 28px;"></div>' +
      '<p style="text-align:center;font-family:\'Cormorant Garamond\',serif;font-size:13px;letter-spacing:0.32em;color:#B89A75;margin:0;">A LETTER HAS ARRIVED</p>' +
      '<p style="text-align:center;font-size:15px;font-weight:300;margin:8px 0 0;">' + toTitle(recipient) + ' 편지가 도착했습니다</p>' +
      '<div style="background:#fff;border:1px solid rgba(184,154,117,0.35);border-radius:2px;padding:32px 28px;margin:26px 0;">' +
        '<div style="font-family:\'Cormorant Garamond\',serif;font-size:13px;letter-spacing:0.12em;color:#9a8f7f;margin-bottom:20px;">TO. ' + toShort(recipient) + '</div>' +
        '<div style="font-size:15px;line-height:2.05;font-weight:300;color:#3d3d3a;">' + body + '</div>' +
        '<div style="height:1px;background:rgba(0,0,0,0.06);margin:26px 0 16px;"></div>' +
        '<div style="text-align:right;font-size:13px;color:#5A554C;">From. ' + esc(guestName) + rel + '</div>' +
      '</div>' +
      '<div style="text-align:center;font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:11px;color:#B89A75;margin-top:30px;">Focus on the Essence, Record the Truth.</div>' +
      '<div style="text-align:center;font-size:10px;color:#aaa;margin-top:12px;">Moment Edit · 두 분만을 위한 기록</div>' +
    '</div>';
}
