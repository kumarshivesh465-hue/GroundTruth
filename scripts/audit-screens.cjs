/* Headless visual audit: loads each screen (?screen=), checks console errors,
   horizontal overflow, and oversized SVG/img (the "giant logo" regression).
   Usage: npm run build && npm run preview (in another shell) && npm run verify
   Requires Chrome/Edge installed. Configure path via CHROME_PATH env var. */
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));

if (!chromePath) {
  console.error('Chrome/Edge not found. Set CHROME_PATH env var.');
  process.exit(1);
}

const SCREENS = [
  'home', 'capture', 'record-claim', 'acoustic-check', 'review-evidence',
  'ai-analysis', 'result-match', 'result-mismatch', 'result-clarity', 'history',
];
const BASE = process.env.AUDIT_URL || 'http://localhost:4173/';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 900, deviceScaleFactor: 1 });

  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
  });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + String(e).slice(0, 200)));
  page.on('requestfailed', (r) =>
    consoleErrors.push('REQFAIL: ' + r.url().slice(-60) + ' ' + (r.failure() || {}).errorText)
  );

  const outDir = process.env.AUDIT_SHOTS || '/tmp/screens';
  fs.mkdirSync(outDir, { recursive: true });

  let failed = false;
  for (const screen of SCREENS) {
    consoleErrors.length = 0;
    await page.goto(BASE + '?screen=' + screen, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1200)); // let animations/fonts settle

    const audit = await page.evaluate(() => {
      const doc = document.scrollingElement || document.documentElement;
      const vw = window.innerWidth;
      const tooWide = [];
      document.querySelectorAll('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > vw + 8 && !el.closest('[class*="overflow"]')) {
          tooWide.push(el.tagName + '.' + String(el.className).split(' ').slice(0, 2).join('.'));
        }
      });
      const oversized = [];
      document.querySelectorAll('svg,img,video,canvas').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 470 || r.height > 470) {
          oversized.push(el.tagName + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
        }
      });
      return {
        reactMounted:
          !!document.querySelector('#root main, #root > main') ||
          document.getElementById('root').children.length > 0,
        overflowX: doc.scrollWidth > doc.clientWidth + 2,
        scrollWidth: doc.scrollWidth,
        tooWide: [...new Set(tooWide)].slice(0, 4),
        oversized,
        fontLoaded: document.fonts.check("700 16px 'Plus Jakarta Sans'"),
        bodyText: (document.body.innerText || '').slice(0, 60).replace(/\s+/g, ' '),
      };
    });

    await page.screenshot({ path: outDir + '/' + screen + '.png' });

    const problems = [];
    if (!audit.reactMounted) problems.push('REACT NOT MOUNTED');
    if (audit.overflowX) problems.push('H-OVERFLOW ' + audit.scrollWidth + 'px [' + audit.tooWide.join(' | ') + ']');
    if (audit.oversized.length) problems.push('OVERSIZED: ' + audit.oversized.join(', '));
    if (!audit.fontLoaded) problems.push('FONT NOT LOADED');
    if (consoleErrors.length) problems.push('CONSOLE: ' + consoleErrors.slice(0, 3).join(' || '));

    if (problems.length) failed = true;
    console.log(
      '[' + screen + '] ' + (problems.length ? 'ISSUES -> ' + problems.join(' ++ ') : 'OK') +
      ' | "' + audit.bodyText + '"'
    );
  }

  await browser.close();
  console.log(failed ? '\nAUDIT FAILED' : '\nALL 10 SCREENS PASS');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
