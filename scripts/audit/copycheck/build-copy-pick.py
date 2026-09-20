#!/usr/bin/env python3
# 문안 판정 화면 생성기 [COPY_PICK v2] — 2026-09-20
#
# 왜 — 「녹음 → 실청 → 다시 → 재녹음」은 한 바퀴가 비싸다. 글에서 먼저 판정을 받으면
#   녹음은 확정 뒤 한 번이면 된다. 실청 판정이 쓰던 방식을 «소리»에서 «글»로 옮긴 것이다.
#
# v2 — 회차를 여러 개 받아 한 판으로 묶는다. 사장님 지시 「판정 회차 올리지 말고 끝까지 진행해」.
#   ★기본은 «바꾼 것만» 보인다. 176문장 중 126이 바뀐 것이고 50은 그대로인데,
#     안 바뀐 것까지 판정을 받으면 지치기만 하고 판정의 질이 떨어진다.
#
# ★★[2026-09-20 둘째 판] 문장마다 도장(@xxxx)을 함께 찍는다. 문서 열쇠 하나로만 대조하면
#   판정 중에 문안이 한 글자만 바뀌어도 판정 전체가 거부된다 — 사장님이 누르신 152개를 버리게 된다.
#   문장 도장이 있으면 «그 사이에 내가 고친 문장»만 골라 다시 여쭐 수 있다(apply-pick.py 참조).
# ★[LISTEN_KEY_STAMP 교훈] 저장 열쇠를 내용에서 뽑는다. 고정 문자열이면 글이 바뀌었는데도
#   지난 판정이 되살아나 «그대로»로 찍힌 자리가 초록으로 남는다.
#
#   python3 build-copy-pick.py round0.json round1.json ... 문안판정.html
import json, sys, html, hashlib

SRCS = [a for a in sys.argv[1:] if a.endswith('.json')]
out  = [a for a in sys.argv[1:] if a.endswith('.html')][0]
parts = [json.load(open(f, encoding='utf-8')) for f in SRCS]
e = lambda s: html.escape(str(s), quote=True)

# ★근거 글에 **굵게** 표시를 써 놓은 자리가 일흔 군데 있다. 이 화면은 글을 그대로 escape 하므로
#   별표가 별표로 찍힌다. 브라우저로 직접 열어 보고서야 보였다 — 만들어 놓고 안 여는 것이
#   이 작업에서 제일 많이 당한 사고다. 굵게로 살려서 찍는다.
import re as _re
def ew(s):
    return _re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', e(s))

stamp = hashlib.sha1(json.dumps(
    [[[s['new'] for s in c['sents']] for c in d['clips']] for d in parts],
    ensure_ascii=False).encode()).hexdigest()[:8]

nsent = sum(len(c['sents']) for d in parts for c in d['clips'])
nchg  = sum(1 for d in parts for c in d['clips'] for s in c['sents'] if s['old'] != s['new'])

blocks = []
for d in parts:
    cards = []
    for c in d['clips']:
        rows = []
        for s in c['sents']:
            sid  = f"{c['no']}#{s['i']}"
            same = s['old'] == s['new']
            gone = not s['new'].strip()
            if gone:   box = '<div class="t cut">이 문장은 <b>지웁니다</b></div>'
            elif same: box = '<div class="t keep">바꾸지 않습니다</div>'
            else:      box = f"<div class='t new'>{e(s['new'])}</div>"
            rows.append(f"""
<div class="s{' same' if same else ''}" data-id="{e(sid)}" data-h="{hashlib.sha1(s['new'].encode()).hexdigest()[:4]}">
  <div class=hd><b>#{s['i']}</b><span class=tag>{e(s.get('tag',''))}</span></div>
  <div class=lbl>지금</div><div class="t old">{e(s['old'])}</div>
  <div class=lbl>바꿀 글</div>{box}
  <div class=why>{ew(s['why'])}</div>
  <div class=btns>
    <button class=b data-v="채택">채택</button>
    <button class=b data-v="그대로">지금 글로</button>
    <button class=b data-v="다시">다시</button>
  </div>
  <textarea class=rz rows=2 placeholder="무엇이 걸리나요? 한 줄이면 됩니다 — 이 줄이 다음 문안의 재료입니다"></textarea>
</div>""")
        cards.append(f"""
<div class=c>
  <div class=ch><b>[{e(c['no'])}] {e(c['slug'])}</b><span class=v>{e(c['label'])} · {e(c['voice'])}</span></div>
  {('<div class=cn>' + ew(c['clipnote']) + '</div>') if c.get('clipnote') else ''}
  {''.join(rows)}
</div>""")
    blocks.append(f"""
<section class=rd data-round="{e(d['round'])}">
  <h2>{e(d['round'])}회차 · {e(d['title'])}</h2>
  <div class=note>{ew(d["note"])}</div>
  {''.join(cards)}
</section>""")

print(f'회차 {len(parts)} · 문장 {nsent} · 바뀐 것 {nchg} · 열쇠 {stamp}')
open(out, 'w', encoding='utf-8').write(f"""<!doctype html><html lang=ko><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>문안 판정 · 전 회차</title>
<style>
:root{{--bg:#faf9f7;--bg2:#f2f0ec;--tx:#2b2724;--lt:#8a827a;--bd:#e2ddd6;--gd:#8c7853;--ok:#3f7a52;--no:#b05a45}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--tx);font-family:system-ui,-apple-system,"Apple SD Gothic Neo",sans-serif;font-size:15px;line-height:1.65}}
.w{{max-width:760px;margin:0 auto;padding:16px}}
h1{{font-size:20px;margin:0 0 4px}}
h2{{font-size:16px;margin:26px 0 6px;padding-top:14px;border-top:2px solid var(--bd)}}
.sub{{color:var(--lt);font-size:13px;margin:0 0 12px}}
.note{{background:var(--bg2);border-radius:10px;padding:11px 13px;font-size:13.5px;margin:0 0 14px}}
.bar{{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--bd);padding:9px 0;margin-bottom:12px;z-index:9}}
.pg{{height:5px;background:var(--bd);border-radius:99px;overflow:hidden;margin:6px 0}}
.pg>i{{display:block;height:100%;background:var(--gd);width:0}}
.tg{{display:flex;gap:8px;align-items:center;font-size:13px;color:var(--lt);margin-top:4px}}
.tg button{{border:1px solid var(--bd);background:#fff;color:var(--tx);border-radius:7px;padding:4px 10px;font-size:12.5px;cursor:pointer;font-family:inherit}}
.tg button.on{{background:var(--gd);border-color:var(--gd);color:#fff}}
.c{{border:1px solid var(--bd);border-radius:12px;background:#fff;margin:0 0 12px;overflow:hidden}}
.ch{{background:var(--bg2);padding:9px 13px;font-size:14px;display:flex;gap:8px;flex-wrap:wrap;align-items:baseline}}
.ch .v{{color:var(--lt);font-size:12.5px}}
.cn{{background:#f9f6f0;border-bottom:1px solid var(--bd);padding:10px 13px;font-size:13px;color:#5c554e;white-space:pre-wrap}}
.s{{padding:12px 13px;border-top:1px solid var(--bd)}}
.hd{{display:flex;gap:8px;align-items:center;margin-bottom:6px}}
.tag{{font-size:11.5px;color:var(--gd);background:#f6f2ea;border-radius:5px;padding:1px 7px}}
.lbl{{font-size:11.5px;color:var(--lt);margin-top:7px}}
.t{{padding:7px 10px;border-radius:8px;font-size:14.5px;white-space:pre-wrap}}
.old{{background:#f7f5f2;color:#6b645c}}
.new{{background:#f1f6f2;border-left:3px solid var(--ok)}}
.keep{{background:#f7f5f2;color:var(--lt);font-size:13px}}
.cut{{background:#fbf2f0;border-left:3px solid var(--no);color:#7a4a3e;font-size:13.5px}}
.why{{font-size:13px;color:#5c554e;margin-top:8px;padding-left:10px;border-left:2px solid var(--bd);white-space:pre-wrap}}
.btns{{display:flex;gap:7px;margin-top:10px;flex-wrap:wrap}}
.b{{flex:1;min-width:82px;min-height:44px;border:1px solid var(--bd);background:#fff;border-radius:9px;font-size:14px;cursor:pointer;font-family:inherit;color:var(--tx)}}
.b.on[data-v="채택"]{{background:var(--ok);border-color:var(--ok);color:#fff}}
.b.on[data-v="그대로"]{{background:#6b645c;border-color:#6b645c;color:#fff}}
.b.on[data-v="다시"]{{background:var(--no);border-color:var(--no);color:#fff}}
.rz{{display:none;width:100%;margin-top:8px;padding:8px 10px;border:1px solid var(--bd);border-radius:8px;font-family:inherit;font-size:14px;resize:vertical}}
.s.redo .rz{{display:block}}
body.chg .s.same{{display:none}}
body.chg .c:not(:has(.s:not(.same))){{display:none}}
.out{{width:100%;height:230px;font-family:ui-monospace,monospace;font-size:12px;padding:10px;border:1px solid var(--bd);border-radius:9px;margin-top:8px}}
.go{{width:100%;min-height:48px;background:var(--gd);color:#fff;border:0;border-radius:10px;font-size:15px;cursor:pointer;font-family:inherit;margin-top:10px}}
@media(prefers-color-scheme:dark){{.cn{{background:#262219;color:#c8bfb4}}:root{{--bg:#1b1917;--bg2:#252220;--tx:#eae6e0;--lt:#9c948b;--bd:#37332f}}.c,.b,.rz,.out,.tg button{{background:#211e1c;color:var(--tx)}}.old,.keep{{background:#2a2725;color:#a8a099}}.new{{background:#1e2a21}}.cut{{background:#2a1f1c;color:#d9a294}}}}
</style>
<div class=w>
<h1>문안 판정 · 전 회차</h1>
<p class=sub>회차 {len(parts)}개 · 문장 {nsent}개(바뀐 것 {nchg}개) · 소리 아니고 <b>글</b>만 봅니다</p>
<div class=note><b>글에서 먼저 정하는 이유</b> — 녹음하고 나서 고치면 그 자리를 두 번 받아야 합니다.
글이 확정되면 녹음은 한 번이면 됩니다.<br><br>
<b>「다시」를 누르실 때</b>는 <b>무엇이 걸리는지</b> 한 줄만 적어 주세요. 대안을 지으실 필요는 없습니다.
그 한 줄이 다음 문안의 재료입니다.<br><br>
<b>한 번에 다 안 하셔도 됩니다.</b> 누른 것은 이 브라우저에 저장되니 닫았다 다시 여셔도 그대로 있습니다.
다만 <b>같은 브라우저에서 여셔야</b> 합니다.</div>
<div class=bar>
  <div id=st>0 / {nchg}</div><div class=pg><i id=pgi></i></div>
  <div class=tg><span>보기</span>
    <button id=f1 class=on>바꾼 것만</button><button id=f2>전부</button>
  </div>
</div>
{''.join(blocks)}
<button class=go id=mk>결과 만들기</button>
<textarea class=out id=o placeholder="여기에 결과가 나옵니다"></textarea>
<button class=go id=cp>복사</button>
</div>
<script>
var KEY='me_copy_pick_all_{stamp}';
var V={{}}; try{{V=JSON.parse(localStorage.getItem(KEY)||'{{}}')||{{}}}}catch(e){{V={{}}}}
function save(){{try{{localStorage.setItem(KEY,JSON.stringify(V))}}catch(e){{}}}}
var N={nchg};
document.body.classList.add('chg');
function paint(){{
  var d=0;
  document.querySelectorAll('.s').forEach(function(s){{
    var id=s.dataset.id, v=V[id]&&V[id].v;
    s.classList.toggle('redo', v==='다시');
    s.querySelectorAll('.b').forEach(function(b){{b.classList.toggle('on', b.dataset.v===v)}});
    var ta=s.querySelector('.rz'); if(V[id]&&V[id].r!=null&&ta.value!==V[id].r) ta.value=V[id].r;
    if(v && !s.classList.contains('same')) d++;
  }});
  document.getElementById('st').textContent=d+' / '+N;
  document.getElementById('pgi').style.width=(N?d/N*100:0)+'%';
}}
document.addEventListener('click',function(ev){{
  var b=ev.target.closest('.b'); if(!b) return;
  var s=b.closest('.s'), id=s.dataset.id;
  V[id]=V[id]||{{}}; V[id].v=(V[id].v===b.dataset.v)?null:b.dataset.v;
  save(); paint();
}});
document.addEventListener('input',function(ev){{
  var ta=ev.target.closest('.rz'); if(!ta) return;
  var id=ta.closest('.s').dataset.id; V[id]=V[id]||{{}}; V[id].r=ta.value; save();
}});
document.getElementById('f1').onclick=function(){{document.body.classList.add('chg');this.classList.add('on');document.getElementById('f2').classList.remove('on')}};
document.getElementById('f2').onclick=function(){{document.body.classList.remove('chg');this.classList.add('on');document.getElementById('f1').classList.remove('on')}};
document.getElementById('mk').onclick=function(){{
  var L=['### COPY_PICK v2 · 전 회차 · key={stamp}'];
  document.querySelectorAll('.rd').forEach(function(rd){{
    L.push('## '+rd.dataset.round+'회차');
    rd.querySelectorAll('.s').forEach(function(s){{
      var id=s.dataset.id, o=V[id]||{{}};
      if(!o.v && s.classList.contains('same')) return;
      L.push('O '+id+' = '+(o.v||'미정')+' @'+s.dataset.h);
      if(o.r&&o.r.trim()) L.push('# '+o.r.trim().replace(/\\n/g,' '));
    }});
  }});
  document.getElementById('o').value=L.join('\\n');
}};
document.getElementById('cp').onclick=function(){{
  var t=document.getElementById('o'); if(!t.value) document.getElementById('mk').click();
  t.select(); try{{document.execCommand('copy')}}catch(e){{}}
  this.textContent='복사했습니다';
  var me=this; setTimeout(function(){{me.textContent='복사'}},1500);
}};
paint();
</script>
</html>""")
