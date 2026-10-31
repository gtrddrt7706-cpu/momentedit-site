import { plan } from './src/plan';
import { sample } from './src/sample';
const r = plan(sample);
console.log(r.total, (r.total/30).toFixed(1));
for (const s of r.segs) console.log(s.kind, s.from, s.dur, (s as any).sec||'', (s as any).photos ? (s as any).photos.map((p:any)=>p.src.split('/')[1]).join(',') : ((s as any).photo? (s as any).photo.src : ''), (s as any).cap||'');
