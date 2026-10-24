import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8766;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
      let reqPath = parsedUrl.pathname;
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
      const filePath = path.join(ROOT_DIR, reqPath);
      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function test() {
  const server = await createServer();
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });

    // Test Frame 0.5: Pieces flying in
    await page.goto(`http://localhost:${PORT}/?frame=0.5`);
    const frame05 = await page.evaluate(() => {
      const pcs = document.querySelectorAll('.pc');
      if (pcs.length !== 9) return { count: pcs.length };
      const t0 = pcs[0].style.transform;
      return { count: pcs.length, t0, hasTranslate: t0.includes('translate3d') };
    });
    console.log('Frame 0.5 test:', frame05);
    if (frame05.count !== 9 || !frame05.hasTranslate) {
      throw new Error('Frame 0.5 failed: expected 9 pieces flying in');
    }

    // Test Frame 1.4: Assembled logo
    await page.goto(`http://localhost:${PORT}/?frame=1.4`);
    const frame14 = await page.evaluate(() => {
      const lg = document.getElementById('lg');
      return { scale: lg.style.transform };
    });
    console.log('Frame 1.4 test:', frame14);

    // Test Frame 2.0: Logo flying towards top bar
    await page.goto(`http://localhost:${PORT}/?frame=2.0`);
    const frame20 = await page.evaluate(() => {
      const lg = document.getElementById('lg');
      const intro = document.getElementById('intro');
      return {
        lgTransform: lg.style.transform,
        introDisplay: window.getComputedStyle(intro).display
      };
    });
    console.log('Frame 2.0 test:', frame20);

    // Test Skip intro on click
    await page.goto(`http://localhost:${PORT}/?intro=1`);
    await page.click('#intro');
    await new Promise(r => setTimeout(r, 150));
    const introHidden = await page.$eval('#intro', el => window.getComputedStyle(el).display === 'none');
    console.log('Skip intro on click test, intro hidden:', introHidden);
    if (!introHidden) throw new Error('Expected #intro to be hidden after click');

    console.log('All intro unit tests PASSED!');
  } finally {
    await browser.close();
    server.close();
  }
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
