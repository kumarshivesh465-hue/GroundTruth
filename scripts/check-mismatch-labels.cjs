/* Automated check: walk capture -> record -> acoustic -> review -> result-mismatch,
   once with webcam OFF and once with webcam ON (getUserMedia patched to replay an
   animated canvas of the preset cylinder photo, so COCO-SSD detects live), then
   report the Visual Identity DETECTED/EXPECTED fields on the mismatch screen.
   Usage: npm run build && npm run preview &  then: node scripts/check-mismatch-labels.cjs */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const os = require('os');
const path = require('path');

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

const BASE = process.env.AUDIT_URL || 'http://localhost:4173/';
const SHOT_DIR = process.env.AUDIT_SHOTS || path.join(os.tmpdir(), 'gt-mismatch-check');
const IMG_URL =
  'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&w=800&q=80';

/* Runs before any page script: replace getUserMedia with a live MediaStream from
   an animated canvas showing the cylinder photo. Uses evaluateOnNewDocument so the
   app's toggleWebcam() gets a real stream with real frames. */
const FAKE_CAM_HOOK = (imageUrl) => {
  let streamPromise = null;
  const getStream = () => {
    if (!streamPromise) {
      streamPromise = (async () => {
        const res = await fetch(imageUrl, { mode: 'cors' });
        const blob = await res.blob();
        const bmp = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        const stream = canvas.captureStream(10);
        // Gentle zoom animation so the stream keeps producing frames
        let t = 0;
        const draw = () => {
          t += 0.02;
          const scale = 1.1 + 0.05 * Math.sin(t);
          const w = 640 * scale;
          const h = 480 * scale;
          ctx.fillStyle = '#404040';
          ctx.fillRect(0, 0, 640, 480);
          ctx.drawImage(bmp, (640 - w) / 2, (480 - h) / 2, w, h);
          requestAnimationFrame(draw);
        };
        draw();
        return stream;
      })();
    }
    return streamPromise;
  };
  const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    try {
      return await getStream();
    } catch (e) {
      console.warn('fake cam hook failed, falling back:', e);
      return orig(constraints);
    }
  };
};

async function runFlow(browser, label, useFakeCam) {
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 900 });

  if (useFakeCam) {
    await page.evaluateOnNewDocument(FAKE_CAM_HOOK, IMG_URL);
  }

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 120));
  });
  // Auto-dismiss alerts (the app alert()s when getUserMedia fails) and record them
  page.on('dialog', async (d) => {
    errors.push('DIALOG: ' + d.message().slice(0, 120));
    await d.dismiss();
  });

  await page.goto(BASE + '?screen=capture', { waitUntil: 'networkidle0', timeout: 45000 });

  const result = { label, steps: [], detected: null, expected: null, statusChip: null };

  // 1. Toggle webcam (ON only)
  if (useFakeCam) {
    await page.waitForSelector('#camera-webcam-toggle', { visible: true });
    await page.click('#camera-webcam-toggle');
    try {
      await page.waitForFunction(
        () => {
          const v = document.querySelector('video');
          return !!(v && v.srcObject && v.videoWidth > 0);
        },
        { timeout: 15000, polling: 250 }
      );
    } catch (e) {
      throw new Error(
        'Fake webcam did not start. Diagnostics: ' +
          (errors.join(' || ') || '(none)') +
          ' | original: ' +
          e.message
      );
    }
    result.steps.push('webcam active (fake stream)');
    await new Promise((r) => setTimeout(r, 500));
  }

  // 2. Select the conflict preset
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const conflict = btns.find((b) => b.textContent.trim() === 'Conflict');
    if (conflict) conflict.click();
  });
  await new Promise((r) => setTimeout(r, 250));
  result.steps.push('conflict preset selected');

  // 3. Shutter capture (TF.js runs live when webcam is on)
  await page.waitForSelector('#shutter-capture-button', { visible: true });
  await page.click('#shutter-capture-button');
  // Generous timeout: the webcam-ON run includes TF.js model download on first use
  try {
    await page.waitForSelector('#continue-to-acoustic-btn', { visible: true, timeout: 90000 });
  } catch (e) {
    const diag = await page.evaluate(() => ({
      bodyText: (document.body.innerText || '').slice(0, 400).replace(/\s+/g, ' '),
      hasErrorBanner: document.body.innerText.includes('Detection Error'),
      errorText: (document.body.innerText.match(/Detection Error[\s\S]{0,120}/) || [''])[0],
    }));
    await page.screenshot({ path: path.join(SHOT_DIR, 'capture-stuck.png') });
    throw new Error(
      'Capture did not navigate. Diagnostics: ' + JSON.stringify(diag) +
      ' | consoleErrors: ' + (errors.join(' || ') || '(none)')
    );
  }
  result.steps.push('captured -> record-claim');

  // 4. Record claim screen: read vision card, continue
  const visionCardText = await page.evaluate(() => {
    return (document.body.innerText.match(/VISUAL FRAME[^\n]*/g) || []).join(' | ') || null;
  });
  result.visionCard = visionCardText;
  await page.click('#continue-to-acoustic-btn');

  // 5. Acoustic check: let sweep finish, continue to review
  await page.waitForFunction(() => document.body.innerText.includes('Review Evidence'), { timeout: 20000 });
  await page.click('#complete-sweep-btn');
  result.steps.push('acoustic done -> review');

  // 6. Review: use local fallback -> result per preset outcome (mismatch)
  await page.waitForSelector('#use-local-fallback-btn', { visible: true });
  await page.click('#use-local-fallback-btn');
  await page.waitForFunction(() => document.body.innerText.includes('Evidence mismatch'), { timeout: 10000 });
  result.steps.push('review -> result-mismatch');

  // 7. Read DETECTED/EXPECTED for the Visual Identity row
  const fields = await page.evaluate(() => {
    const body = document.body.innerText;
    const section = body.split('Visual Identity')[1] || '';
    const nextSection = section.split('Acoustic Signal')[0] || '';
    const grab = (key) => {
      const m = nextSection.match(new RegExp(key + '\\s*\\n\\s*([^\\n]+)'));
      return m ? m[1].trim() : null;
    };
    return { detected: grab('DETECTED'), expected: grab('EXPECTED') };
  });
  result.detected = fields.detected;
  result.expected = fields.expected;
  result.statusChip = await page.evaluate(() => {
    const m = document.body.innerText.match(/VISUAL FRAME · (DETECTED|UNCLEAR)/);
    return m ? m[1] : null;
  });

  await page.screenshot({ path: path.join(SHOT_DIR, label + '.png') });
  if (errors.length) result.errors = errors.slice(0, 4);
  await page.close();
  return result;
}

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });

  const off = await runFlow(browser, 'webcam-off', false);
  console.log('=== ' + off.label.toUpperCase() + ' ===');
  console.log('flow : ' + off.steps.join(' -> '));
  console.log('record-claim vision card: ' + (off.visionCard || '(absent)'));
  console.log('DETECTED : ' + off.detected);
  console.log('EXPECTED : ' + off.expected);
  if (off.errors) console.log('errors : ' + off.errors.join(' || '));

  const on = await runFlow(browser, 'webcam-on', true);
  console.log('\n=== ' + on.label.toUpperCase() + ' ===');
  console.log('flow : ' + on.steps.join(' -> '));
  console.log('record-claim vision card: ' + (on.visionCard || '(absent)'));
  console.log('DETECTED : ' + on.detected);
  console.log('EXPECTED : ' + on.expected);
  if (on.errors) console.log('errors : ' + on.errors.join(' || '));

  await browser.close();

  console.log('\nSummary:');
  console.log('  webcam OFF -> ' + (off.detected || '?') + ' / ' + (off.expected || '?'));
  console.log('  webcam ON  -> ' + (on.detected || '?') + ' / ' + (on.expected || '?'));
  console.log('screenshots: ' + SHOT_DIR);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
