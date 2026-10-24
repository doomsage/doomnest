import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8765;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
};

function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
      let reqPath = parsedUrl.pathname;
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
      const filePath = path.join(ROOT_DIR, reqPath);

      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    });

    server.listen(PORT, () => {
      console.log(`Test server running at http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

async function run() {
  const args = process.argv.slice(2);
  const doScreenshots = args.includes('--screenshot') || args.length === 0;
  const doTests = args.includes('--test') || args.length === 0;

  const server = await createServer();
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const viewports = [
    { name: 'phone', width: 390, height: 844, deviceScaleFactor: 2 },
    { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 2 }
  ];

  try {
    if (doTests) {
      console.log('\n--- Running Automated UI & Accessibility Tests ---');
      const page = await browser.newPage();
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
      await page.goto(`http://localhost:${PORT}/?skip_intro=1`, { waitUntil: 'networkidle2' });

      // Test 1: Title
      const title = await page.title();
      console.log(`Page title: "${title}"`);
      if (!title.toLowerCase().includes('doomnest')) {
        throw new Error(`Expected title to include DoomNest, got "${title}"`);
      }

      // Test 2: Top bar logo
      const logoSrc = await page.$eval('[data-logo]', el => el.getAttribute('src') || el.src);
      console.log(`Top bar logo source: ${logoSrc.slice(0, 40)}...`);

      // Test 3: App navigation
      await page.goto(`http://localhost:${PORT}/#/doomloader`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 400));
      const inAppClass = await page.$eval('body', el => el.classList.contains('in-app'));
      console.log(`In-app class present on route #/doomloader: ${inAppClass}`);
      if (!inAppClass) throw new Error('Expected body to have .in-app on #/doomloader');

      // Test 4: Package ID overflow check
      const pkgInfo = await page.evaluate(() => {
        const pkgEl = document.querySelector('.kv b');
        if (!pkgEl) return null;
        const rect = pkgEl.getBoundingClientRect();
        const parentRect = pkgEl.parentElement.getBoundingClientRect();
        const style = window.getComputedStyle(pkgEl);
        return {
          text: pkgEl.textContent,
          overflowWrap: style.overflowWrap,
          wordBreak: style.wordBreak,
          width: rect.width,
          parentWidth: parentRect.width,
          overflows: rect.right > parentRect.right + 2
        };
      });
      console.log('Package ID element check:', pkgInfo);

      // Test 5: Install button state
      const dlBtnText = await page.$eval('#dl', el => el.textContent.trim());
      const dlBtnDisabled = await page.$eval('#dl', el => el.getAttribute('aria-disabled'));
      console.log(`Download button text: "${dlBtnText}", aria-disabled: "${dlBtnDisabled}"`);

      console.log('All baseline assertions passed!\n');
      await page.close();
    }

    if (doScreenshots) {
      console.log('\n--- Capturing High-Res Responsive Screenshots ---');
      for (const vp of viewports) {
        console.log(`\nViewport: ${vp.name} (${vp.width}x${vp.height})`);
        const page = await browser.newPage();
        await page.setViewport(vp);

        // 1. Intro frames (flying in, assembling, settling)
        for (const frame of [0.4, 1.0, 1.6, 2.2]) {
          await page.goto(`http://localhost:${PORT}/?frame=${frame}`, { waitUntil: 'networkidle2' });
          await new Promise(r => setTimeout(r, 200));
          const p = path.join(screenshotDir, `${vp.name}_intro_frame_${frame.toFixed(1)}.png`);
          await page.screenshot({ path: p, fullPage: false });
          console.log(`Saved: ${p}`);
        }

        // 2. Hub Home (after intro settled)
        await page.goto(`http://localhost:${PORT}/?skip_intro=1`, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 400));
        let p = path.join(screenshotDir, `${vp.name}_hub_home.png`);
        await page.screenshot({ path: p, fullPage: false });
        console.log(`Saved: ${p}`);

        // 3. Hub Home Scrolled (continuous parallax motion)
        await page.evaluate(() => window.scrollTo(0, 300));
        await new Promise(r => setTimeout(r, 300));
        p = path.join(screenshotDir, `${vp.name}_hub_scrolled.png`);
        await page.screenshot({ path: p, fullPage: false });
        console.log(`Saved: ${p}`);

        // 4. App Detail Top
        await page.goto(`http://localhost:${PORT}/?skip_intro=1#/doomloader`, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 400));
        p = path.join(screenshotDir, `${vp.name}_app_top.png`);
        await page.screenshot({ path: p, fullPage: false });
        console.log(`Saved: ${p}`);

        // 5. App Detail Reviews & Suggestion section
        await page.evaluate(() => {
          const el = document.getElementById('rform') || document.querySelector('.sum');
          if (el) el.scrollIntoView();
        });
        await new Promise(r => setTimeout(r, 500));
        p = path.join(screenshotDir, `${vp.name}_app_reviews.png`);
        await page.screenshot({ path: p, fullPage: false });
        console.log(`Saved: ${p}`);

        await page.close();
      }
    }
  } catch (err) {
    console.error('Error during test execution:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
}

run();
