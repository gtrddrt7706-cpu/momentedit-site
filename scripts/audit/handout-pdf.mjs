// [HANDOUT_PDF] build-handout.py 가 만든 _handout.html 을 A4 PDF 로 굽는다.
import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;
const out = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('file://' + process.cwd() + '/_handout.html', { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready);
await p.emulateMedia({ media: 'print' });
await p.pdf({ path: out, format: 'A4', printBackground: true });
await b.close();
console.log('ok handout-pdf: ' + out);
