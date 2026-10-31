// 식전 영상 겉모습 시안 3개(15초씩 · 같은 사진 · 같은 문구) — 사장님 11/01 «저 영상 너무 별로» → «추천대로» · «GPT 랑 의논해서 해»
// GPT 검토(11/01 · Pro)에서 받은 것: 레터박스 빼기(16:9 에서 사진 높이 26% 손해) · 흐린 같은 사진 배경 빼고 사진에서 뽑은 조용한 색면 ·
//   사진은 원본 전체(네 모서리) 보존 · 확대는 «들어갈 수 있는 최대 크기의 96 → 100%»만 · 한글 한 줄이 먼저 · 문구 컷은 아래 띠를 비워 사진 크기가 안 바뀜 ·
//   B 의 필터 · 빛 번짐 낮추고 디졸브 짧게 · C 는 세 칸 · 글자 화면 줄이고 사진을 볼 시간 2.5초 이상
// A 오늘에서 시작해 오늘로 돌아오기(추천 · GPT «D») · B 필름 무드 · C 모던 모션
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, Easing, Sequence, delayRender, continueRender } from 'remotion';

const C = { ink: '#1C1B19', cream: '#F5F1EA', seal: '#6B2A24', gold: '#B89A75', goldSoft: '#D9C4A3' };
const SERIF = "'Cormorant Garamond', 'Noto Serif KR', serif";
const KO = "'Noto Serif KR', 'Noto Serif CJK KR', serif";
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const cl = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const P = (f: string) => staticFile('photos/' + f);
type Ph = { f: string; w: number; h: number };
const ph = (f: string, w = 1200, h = 1500): Ph => ({ f, w, h });
const SNAP = ph('snap.jpg', 1400, 700), ABOUT = ph('about.jpg', 1400, 800), HERO = ph('hero.jpg', 1600, 900);
const W02 = ph('w02-1.jpg'), W04 = ph('w04-2.jpg'), C03 = ph('c03-2.jpg'), C05 = ph('c05-1.jpg'), W07 = ph('w07-1.jpg'), W10 = ph('w10-1.jpg');
const KID1 = ph('gallery-05.jpg', 600, 600), KID2 = ph('gallery-03.jpg', 600, 600); // 견본 — 실제로는 «처음»(어린 시절) 칸 사진
const NAMES = { g: '이서준', b: '정하윤', date: '2027. 05. 22' };
const BAND = 168; // 문구 컷의 아래 띠(사진은 그 위에 맞춘다)

const Grain: React.FC<{ o?: number }> = ({ o = 0.05 }) => {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 2) % 12;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: o, mixBlendMode: 'overlay' }}>
      <svg width="100%" height="100%"><filter id={`lg${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} /><feColorMatrix type="saturate" values="0" /></filter><rect width="100%" height="100%" filter={`url(#lg${seed})`} /></svg>
    </AbsoluteFill>
  );
};

// 사진 가장자리 색 — 채도를 낮추고 바탕색(먹 또는 크림) 쪽으로 섞는다. 사진 가까이는 사진 색, 화면 끝으로 갈수록 바탕색(의도한 색면처럼)
// side: 'lr' 좌우 · 'tb' 위아래 · 돌려줌 [a 가까이, b 가까이, a 끝, b 끝]
type Tone = 'ink' | 'cream';
const TONE: Record<Tone, number[]> = { ink: [28, 27, 25], cream: [245, 241, 234] };
function useEdge(p: Ph, side: 'lr' | 'tb', tone: Tone = 'ink'): [string, string, string, string] {
  const [h] = useState(() => delayRender('edge ' + p.f));
  const base = tone === 'ink' ? C.ink : C.cream;
  const [c, setC] = useState<[string, string, string, string]>([base, base, base, base]);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const W = 48, H = Math.max(8, Math.round((48 * img.height) / img.width));
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const x = cv.getContext('2d')!; x.drawImage(img, 0, 0, W, H);
      const avg = (sx: number, sy: number, sw: number, sh: number) => {
        const d = x.getImageData(sx, sy, sw, sh).data; let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
        r /= n; g /= n; b /= n; const l = (r + g + b) / 3;
        return [r, g, b].map((v) => v * 0.55 + l * 0.45); // 채도 낮춤
      };
      const T = TONE[tone];
      const mix = (c3: number[], k: number) => `rgb(${c3.map((v, i) => Math.round(v * (1 - k) + T[i] * k)).join(',')})`;
      const [ea, eb] = side === 'lr' ? [avg(0, 0, 4, H), avg(W - 4, 0, 4, H)] : [avg(0, 0, W, 3), avg(0, H - 3, W, 3)];
      const kNear = tone === 'ink' ? 0.5 : 0.45, kFar = tone === 'ink' ? 0.82 : 0.78;
      setC([mix(ea, kNear), mix(eb, kNear), mix(ea, kFar), mix(eb, kFar)]);
      continueRender(h);
    };
    img.onerror = () => continueRender(h);
    img.src = P(p.f);
  }, [p.f, side, tone, h]);
  return c;
}
const field = (dir: 'lr' | 'tb', c: [string, string, string, string], p0: number, p1: number) =>
  `linear-gradient(${dir === 'lr' ? 90 : 180}deg, ${c[2]} 0%, ${c[0]} ${p0}%, ${c[1]} ${p1}%, ${c[3]} 100%)`;

// 원본 전체를 칸 안 최대 크기로 — 남는 곳은 사진에서 뽑은 색면 · s = 96 → 100% 로 아주 천천히 커진다(자르지 않는다)
const Fit: React.FC<{ p: Ph; s: number; top?: number; bottom?: number; filter?: string; tone?: Tone }> = ({ p, s, top = 0, bottom = 0, filter = 'none', tone = 'ink' }) => {
  const bw = 1920, bh = 1080 - top - bottom, asp = p.w / p.h;
  const wide = asp > bw / bh;
  const c = useEdge(p, wide ? 'tb' : 'lr', tone);
  let w = wide ? bw : bh * asp, h = wide ? bw / asp : bh;
  w *= s; h *= s;
  const x = (bw - w) / 2, y = top + (bh - h) / 2;
  const bg = wide ? field('tb', c, (y / 1080) * 100, ((y + h) / 1080) * 100) : field('lr', c, (x / bw) * 100, ((x + w) / bw) * 100);
  return (
    <AbsoluteFill style={{ background: bg }}>
      <Img src={P(p.f)} style={{ position: 'absolute', left: x, top: y, width: w, height: h, filter }} />
    </AbsoluteFill>
  );
};

// 세로 두 장(또는 정사각 두 장)을 같은 높이로 나란히 — 원본 전체 · 간격 20 · 남는 양옆은 색면
const Pair: React.FC<{ a: Ph; b: Ph; s: number; top?: number; bottom?: number; gap?: number; filter?: string; tone?: Tone; enter?: number }> = ({ a, b, s, top = 0, bottom = 0, gap = 20, filter = 'none', tone = 'ink', enter = 1 }) => {
  const bh = 1080 - top - bottom;
  const ca = useEdge(a, 'lr', tone);
  const cb = useEdge(b, 'lr', tone);
  const H0 = Math.min(bh, (1920 - 120 - gap) / (a.w / a.h + b.w / b.h));
  const H = H0 * s;
  const wa = H * (a.w / a.h), wb = H * (b.w / b.h);
  const x0 = (1920 - wa - wb - gap) / 2, y = top + (bh - H) / 2;
  return (
    <AbsoluteFill style={{ background: field('lr', [ca[0], cb[1], ca[2], cb[3]], (x0 / 1920) * 100, ((x0 + wa + wb + gap) / 1920) * 100) }}>
      <Img src={P(a.f)} style={{ position: 'absolute', left: x0, top: y, width: wa, height: H, filter }} />
      <Img src={P(b.f)} style={{ position: 'absolute', left: x0 + wa + gap, top: y, width: wb, height: H, filter, opacity: enter }} />
    </AbsoluteFill>
  );
};

// 한 컷 — 들어올 때 짧게 녹아든다(디졸브 길이 = fade) · t 는 컷 안 진행(0 → 1)
const Cut: React.FC<{ dur: number; fade: number; children: (t: number, f: number) => React.ReactNode }> = ({ dur, fade, children }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, dur + fade], [0, 1], cl);
  const o = fade <= 1 ? 1 : interpolate(f, [0, fade], [0, 1], { ...cl, easing: Easing.inOut(Easing.quad) });
  return <AbsoluteFill style={{ opacity: o }}>{children(t, f)}</AbsoluteFill>;
};

// 아래 띠 문구 — 한글 한 줄(52px) · 띠는 먹색 · 사진과 겹치지 않는다
const Band: React.FC<{ ko: string; en?: string; f: number; dur: number; bg?: string }> = ({ ko, en, f, dur, bg = C.ink }) => {
  const o = interpolate(f, [8, 22, dur - 6, dur + 6], [0, 1, 1, 0], cl);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BAND, background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ opacity: o, fontFamily: KO, fontWeight: 500, fontSize: 52, color: C.cream, letterSpacing: '0.04em', lineHeight: 1.2 }}>{ko}</div>
      {en && <div style={{ opacity: o * 0.85, fontFamily: SERIF, fontStyle: 'italic', fontSize: 30, color: C.goldSoft, marginTop: 6 }}>{en}</div>}
    </div>
  );
};

type Step = { from: number; dur: number; fade: number; el: (t: number, f: number) => React.ReactNode };
const Steps: React.FC<{ steps: Step[] }> = ({ steps }) => (
  <>
    {steps.map((s, i) => (
      <Sequence key={i} from={s.from} durationInFrames={i === steps.length - 1 ? s.dur : s.dur + (steps[i + 1]?.fade || 1)} layout="none">
        <Cut dur={s.dur} fade={s.fade}>{(t, f) => s.el(t, f)}</Cut>
      </Sequence>
    ))}
  </>
);

// ───────────── A 오늘에서 시작해 오늘로 돌아오기(추천) ─────────────
// 0–2초 오늘 사진(제목 없이) → 2–5.6 어린 시절 두 장 → 5.6–8.4 함께한 날 ① → 8.4–11.2 ② → 11.2–15 처음의 오늘 사진으로 돌아와 멈춤
export const LookA: React.FC = () => {
  const s = (t: number) => 0.96 + 0.04 * t;
  const steps: Step[] = [
    { from: 0, dur: 60, fade: 1, el: (t) => <Fit p={W07} s={s(t)} /> },
    { from: 60, dur: 108, fade: 9, el: (t, f) => <><Pair a={KID1} b={KID2} s={1} bottom={BAND} /><Band ko="서로를 알기 전의 우리" f={f} dur={108} /></> },
    { from: 168, dur: 84, fade: 1, el: (t, f) => <><Fit p={SNAP} s={s(t)} bottom={BAND} /><Band ko="그리고, 당신을 만났습니다" f={f} dur={84} /></> },
    { from: 252, dur: 84, fade: 1, el: (t, f) => <><Fit p={C03} s={s(t)} bottom={BAND} /><Band ko="평범해서 더 소중했던 날들" f={f} dur={84} /></> },
    { from: 336, dur: 114, fade: 11, el: (t, f) => {
      const st = interpolate(f, [0, 54], [0.96, 1], { ...cl, easing: ease }); // 마지막 2초는 멈춤
      return <><Fit p={W07} s={st} bottom={BAND} /><Band ko="이제, 같은 내일로" en={`${NAMES.g} · ${NAMES.b} · ${NAMES.date}`} f={f - 10} dur={130} /></>;
    } },
  ];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Steps steps={steps} />
      <Tag t="A · 오늘에서 시작해 오늘로(추천)" dark />
    </AbsoluteFill>
  );
};

// ───────────── B 필름 무드 ─────────────
// 원본 색에 아주 옅은 따뜻함 · 입자 낮게 · 빛 번짐은 장 바뀔 때만 잠깐 · 디졸브 0.35초 · 한글이 먼저(영문은 작게 아래)
const WARM = 'sepia(0.07) saturate(1.02)';
const Flash: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at - 6, at + 2, at + 16], [0, 0.32, 0], cl);
  return <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen', opacity: o, background: 'radial-gradient(circle at 70% 35%, rgba(255,186,120,0.9) 0%, rgba(255,140,80,0.3) 28%, rgba(0,0,0,0) 60%)' }} />;
};
const SubB: React.FC<{ ko: string; en?: string; f: number; dur: number }> = ({ ko, en, f, dur }) => {
  const o = interpolate(f, [10, 26, dur - 4, dur + 8], [0, 1, 1, 0], cl);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BAND, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: o }}>
      <div style={{ fontFamily: KO, fontWeight: 500, fontSize: 48, color: '#FFF6EA', letterSpacing: '0.05em' }}>{ko}</div>
      {en && <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 30, color: '#E8D6BC', marginTop: 4 }}>{en}</div>}
    </div>
  );
};
export const LookB: React.FC = () => {
  const s = (t: number) => 0.96 + 0.04 * t;
  const X = 11;
  const steps: Step[] = [
    { from: 0, dur: 72, fade: 1, el: (t, f) => <><Fit p={HERO} s={s(t)} filter={WARM} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 120, opacity: interpolate(f, [10, 26, 56, 72], [0, 1, 1, 0], cl), background: 'linear-gradient(180deg, rgba(20,12,6,0) 45%, rgba(20,12,6,0.55) 100%)' }}>
        <div style={{ fontFamily: KO, fontWeight: 500, fontSize: 56, color: '#FFF6EA', letterSpacing: '0.12em', textShadow: '0 2px 18px rgba(30,18,8,0.55)' }}>{NAMES.g} · {NAMES.b}</div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 40, color: '#F2E3CC', marginTop: 10, textShadow: '0 2px 18px rgba(30,18,8,0.55)' }}>Our wedding day</div>
      </AbsoluteFill></> },
    { from: 72, dur: 96, fade: X, el: (t, f) => <><Pair a={W02} b={W04} s={1} bottom={BAND} filter={WARM} enter={interpolate(f, [18, 30], [0, 1], cl)} /><SubB ko="그리고, 당신을 만났습니다" en="And then, I met you" f={f} dur={96} /></> },
    { from: 168, dur: 90, fade: X, el: (t, f) => <><Fit p={ABOUT} s={s(t)} bottom={BAND} filter={WARM} /><SubB ko="평범해서 더 소중했던 날들" en="Ordinary days, precious days" f={f} dur={90} /></> },
    { from: 258, dur: 90, fade: X, el: (t, f) => <><Pair a={C03} b={C05} s={1} bottom={BAND} filter={WARM} enter={interpolate(f, [18, 30], [0, 1], cl)} /><SubB ko="늘 곁에 있던 마음" en="Always by my side" f={f} dur={90} /></> },
    { from: 348, dur: 102, fade: X, el: (t, f) => <><Fit p={W10} s={interpolate(f, [0, 60], [0.96, 1], { ...cl, easing: ease })} bottom={BAND} filter={WARM} /><SubB ko="이제, 같은 내일로" en="Now, toward the same tomorrow" f={f} dur={130} /></> },
  ];
  return (
    <AbsoluteFill style={{ background: '#17120E' }}>
      <Steps steps={steps} />
      <Flash at={72} /><Flash at={258} />
      <Grain o={0.05} />
      <Tag t="B · 필름 무드" dark />
    </AbsoluteFill>
  );
};

// ───────────── C 모던 모션 ─────────────
// 닦아 내듯 열리는 화면 · 사진은 한 장 또는 두 장(원본 전체) · 사진을 볼 시간 2.5초 이상 · 글자만 나오는 화면은 처음과 끝 두 번
const Wipe: React.FC<{ dir: 'l' | 'r' | 'u'; f: number; len?: number; children: React.ReactNode }> = ({ dir, f, len = 18, children }) => {
  const p = interpolate(f, [0, len], [100, 0], { ...cl, easing: ease });
  const clip = dir === 'l' ? `inset(0 ${p}% 0 0)` : dir === 'r' ? `inset(0 0 0 ${p}%)` : `inset(${p}% 0 0 0)`;
  return <AbsoluteFill style={{ clipPath: clip }}>{children}</AbsoluteFill>;
};
const Words: React.FC<{ lines: string[]; f: number; small?: string }> = ({ lines, f, small }) => (
  <AbsoluteFill style={{ background: C.cream, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
    {small && <div style={{ fontFamily: SERIF, fontSize: 26, letterSpacing: '0.5em', color: C.seal, marginBottom: 30, opacity: interpolate(f, [0, 12], [0, 1], cl) }}>{small}</div>}
    <div style={{ display: 'flex', gap: 30 }}>
      {lines.map((w, i) => {
        const d = 4 + i * 6;
        return <div key={i} style={{ fontFamily: KO, fontWeight: 500, fontSize: 104, color: C.ink, opacity: interpolate(f, [d, d + 12], [0, 1], cl), transform: `translateY(${interpolate(f, [d, d + 16], [26, 0], { ...cl, easing: ease })}px)` }}>{w}</div>;
      })}
    </div>
    <div style={{ width: interpolate(f, [10, 30], [0, 150], { ...cl, easing: ease }), height: 2, background: C.seal, marginTop: 38 }} />
  </AbsoluteFill>
);
const CapC: React.FC<{ ko: string; f: number }> = ({ ko, f }) => {
  const o = interpolate(f, [16, 28], [0, 1], cl);
  const x = interpolate(f, [16, 34], [-20, 0], { ...cl, easing: ease });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BAND, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, opacity: o, transform: `translateX(${x}px)` }}>
      <div style={{ width: 40, height: 2, background: C.seal }} />
      <div style={{ fontFamily: KO, fontWeight: 500, fontSize: 48, color: C.ink, letterSpacing: '0.04em' }}>{ko}</div>
    </div>
  );
};
export const LookC: React.FC = () => {
  const s = (t: number) => 0.96 + 0.04 * t;
  const steps: Step[] = [
    { from: 0, dur: 54, fade: 1, el: (t, f) => <Words small="THE WEDDING OF" lines={[NAMES.g, '&', NAMES.b]} f={f} /> },
    { from: 54, dur: 84, fade: 1, el: (t, f) => <Wipe dir="r" f={f}><Fit p={HERO} s={s(t)} tone="cream" /></Wipe> },
    { from: 138, dur: 96, fade: 1, el: (t, f) => <Wipe dir="u" f={f}><AbsoluteFill style={{ background: C.cream }} /><Pair a={W02} b={W04} s={1} bottom={BAND} tone="cream" enter={interpolate(f, [14, 26], [0, 1], cl)} /><CapC ko="그리고, 당신을 만났습니다" f={f} /></Wipe> },
    { from: 234, dur: 84, fade: 1, el: (t, f) => <Wipe dir="l" f={f}><Fit p={SNAP} s={s(t)} bottom={BAND} tone="cream" /><CapC ko="평범해서 더 소중했던 날들" f={f} /></Wipe> },
    { from: 318, dur: 72, fade: 1, el: (t, f) => <Wipe dir="r" f={f}><Fit p={W10} s={s(t)} bottom={BAND} tone="cream" /><CapC ko="이제, 같은 내일로" f={f} /></Wipe> },
    { from: 390, dur: 60, fade: 10, el: (t, f) => <Words small={NAMES.date} lines={['오늘,', '부부가', '됩니다']} f={f} /> },
  ];
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      <Steps steps={steps} />
      <Grain o={0.04} />
      <Tag t="C · 모던 모션" />
    </AbsoluteFill>
  );
};

// 시안 이름표(왼쪽 위 · 비교용 · 실제 영상에는 없다)
const Tag: React.FC<{ t: string; dark?: boolean }> = ({ t, dark }) => (
  <div style={{ position: 'absolute', left: 28, top: 22, fontFamily: KO, fontSize: 22, color: dark ? 'rgba(255,255,255,0.8)' : 'rgba(28,27,25,0.75)', background: dark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.65)', padding: '6px 14px', borderRadius: 4 }}>{t}</div>
);
