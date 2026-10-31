// 식전 영상 «에디토리얼» — 타임라인 계산(화면 · calculateMetadata 공용)
// 길이 = 마이페이지 약속과 같은 식(_pvcSecs): 5장 70초 · 20장 117초 · 그 사이는 비례
export const FPS = 30;

export type Sec = 'first' | 'days' | 'today';
export type Photo = { src: string; w: number; h: number; sec: Sec };
export type Caps = { cover: string; first: string[]; days: string[]; today: string[]; credits: string[] };
export type Props = {
  groom: string;
  bride: string;
  wedding: string; // YYYY-MM-DD
  met?: string; // YYYY-MM-DD · 선택
  photos: Photo[];
  caps: Caps;
  bpm: number;
};

export type Seg =
  | { kind: 'open'; from: number; dur: number }
  | { kind: 'cover'; from: number; dur: number; photo?: Photo }
  | { kind: 'card'; from: number; dur: number; no: number; sec: Sec }
  | { kind: 'spread'; from: number; dur: number; sec: 'first' | 'days'; photos: Photo[]; cap?: string; folio: number }
  | { kind: 'today'; from: number; dur: number; photo: Photo; cap?: string; bw: boolean; idx: number; last: boolean; title?: boolean; no?: number; date?: string }
  | { kind: 'credits'; from: number; dur: number };

export const OVERLAP = 12; // 겹쳐 넘어가는 프레임(0.4초)

const fmtDate = (ymd: string) => { const m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}. ${m[2]}. ${m[3]}` : ''; };

export function totalSecs(n: number) {
  return n < 5 ? 70 : Math.round(70 + ((n - 5) * 47) / 15);
}

const isLand = (p: Photo) => p.w / p.h > 1.15;

// 사진 묶기 — 가로는 한 장 · 세로(정사각 포함)는 두 장씩, 많으면 세 장씩
export function groupSpreads(ps: Photo[], many: boolean): Photo[][] {
  const out: Photo[][] = [];
  let cur: Photo[] = [];
  const cap = many ? 3 : 2;
  for (const p of ps) {
    if (isLand(p)) {
      if (cur.length) { out.push(cur); cur = []; }
      out.push([p]);
      continue;
    }
    cur.push(p);
    if (cur.length >= cap) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out;
}

export function plan(p: Props): { segs: Seg[]; total: number } {
  const first = p.photos.filter((x) => x.sec === 'first');
  const days = p.photos.filter((x) => x.sec === 'days');
  const today = p.photos.filter((x) => x.sec === 'today');
  const T = totalSecs(p.photos.length);
  const beat = 60 / (p.bpm || 80);

  const coverPhoto = today[0] || days[0] || first[0];
  const todayRest = today.length > 1 ? today.slice(1) : today.length === 1 && (days.length || first.length) ? today : [];
  // 표지에 쓴 사진은 «오늘»에서 다시 쓰지 않는다(오늘 사진이 한 장뿐이면 표지와 오늘에 한 번씩)

  const fSpreads = groupSpreads(first, false);
  const dSpreads = groupSpreads(days, days.length >= 8);
  const chapters: Sec[] = [];
  if (fSpreads.length) chapters.push('first');
  if (dSpreads.length) chapters.push('days');

  let open = 1.5, cover = 6.5, card = 2.2, credits = 9;
  const wSpread = (k: number) => 1 + 0.8 * (k - 1); // 여러 장 = 모아 보기 + 한 장씩 크게
  const W = fSpreads.reduce((a, s) => a + wSpread(s.length), 0) + dSpreads.reduce((a, s) => a + wSpread(s.length), 0) + todayRest.length * 1.15;
  const fixed = () => open + cover + card * chapters.length + credits;
  const extra = Math.max(0, T - fixed() - W * 6);
  if (extra > 0) {
    cover += Math.min(4, extra * 0.35);
    credits += Math.min(3, extra * 0.25);
    card += Math.min(1, (extra * 0.1) / Math.max(1, chapters.length));
  }
  const u = W > 0 ? Math.max(2.4, (T - fixed()) / W) : 0;

  const segs: Seg[] = [];
  let t = 0; // 초
  const snap = (x: number) => Math.round(x / beat) * beat; // 박자에 붙인다
  const push = (s: Omit<Seg, 'from' | 'dur'> & { dur: number }) => {
    const from = Math.round(t * FPS);
    const end = Math.round(snap(t + s.dur) * FPS);
    const dur = Math.max(30, end - from);
    segs.push({ ...(s as any), from, dur });
    t = end / FPS;
  };
  push({ kind: 'open', dur: open } as any);
  push({ kind: 'cover', dur: cover, photo: coverPhoto } as any);
  let no = 0, folio = 2;
  if (fSpreads.length) {
    push({ kind: 'card', dur: card, no: ++no, sec: 'first' } as any);
    fSpreads.forEach((s, i) => push({ kind: 'spread', sec: 'first', photos: s, cap: p.caps.first[i], folio: folio++, dur: u * wSpread(s.length) } as any));
  }
  if (dSpreads.length) {
    push({ kind: 'card', dur: card, no: ++no, sec: 'days' } as any);
    dSpreads.forEach((s, i) => push({ kind: 'spread', sec: 'days', photos: s, cap: p.caps.days[i], folio: folio++, dur: u * wSpread(s.length) } as any));
  }
  if (todayRest.length) {
    const bwAt = todayRest.length >= 3 ? Math.floor(todayRest.length / 2) : -1;
    todayRest.forEach((ph, i) => {
      const last = i === todayRest.length - 1;
      const cap = i === 0 ? p.caps.today[0] : last ? p.caps.today[p.caps.today.length - 1] : undefined;
      push({ kind: 'today', photo: ph, cap, bw: i === bwAt, idx: i, last, title: i === 0, no: no + 1, date: fmtDate(p.wedding), dur: u * 1.15 + (i === 0 ? card * 0.6 : 0) } as any);
    });
  }
  // 크레딧은 남은 시간을 모두 받는다 — 전체 길이가 약속(T)과 같게
  const from = Math.round(t * FPS);
  const total = Math.max(from + Math.round(6 * FPS), Math.round(T * FPS));
  segs.push({ kind: 'credits', from, dur: total - from });
  return { segs, total };
}
