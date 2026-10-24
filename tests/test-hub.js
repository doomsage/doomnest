import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8767;

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
    await page.goto(`http://localhost:${PORT}/?skip_intro=1`, { waitUntil: 'networkidle2' });

    // 1. Verify app cards exist and display Icon, Name, Rating
    const appTile = await page.evaluate(() => {
      const tile = document.querySelector('.atile');
      if (!tile) return null;
      const name = tile.querySelector('h3')?.textContent;
      const rate = tile.querySelector('.r')?.textContent;
      const icon = tile.querySelector('.ic') !== null;
      const getBtn = tile.querySelector('.get')?.textContent;
      return { name, rate, icon, getBtn };
    });
    console.log('App tile check:', appTile);
    if (!appTile || appTile.name !== 'Doomloader' || !appTile.icon) {
      throw new Error('Expected Doomloader app card with icon and rating');
    }

    // 2. Test search functionality
    await page.type('#q', 'xyznonexistent');
    await new Promise(r => setTimeout(r, 100));
    const noAppsVisible = await page.$eval('#noapps', el => !el.hidden);
    console.log('Search nonexistent query shows noapps message:', noAppsVisible);
    if (!noAppsVisible) throw new Error('Expected #noapps to be visible when search has no matches');

    // Clear search
    await page.evaluate(() => {
      const q = document.getElementById('q');
      q.value = '';
      q.dispatchEvent(new Event('input'));
    });
    await new Promise(r => setTimeout(r, 100));
    const tilesCount = await page.$$eval('.atile', els => els.length);
    console.log('Tiles count after clear:', tilesCount);
    if (tilesCount !== 1) throw new Error('Expected 1 tile after search clear');

    // 3. Test data-driven addition of a future app
    const dynamicAdd = await page.evaluate(() => {
      window.DN.apps.push({
        id: 'futureapp',
        name: 'Future App',
        cat: 'Tools',
        apkUrl: null
      });
      window.DN.render();
      return document.querySelectorAll('.atile').length;
    });
    console.log('Dynamic app list expansion count:', dynamicAdd);
    if (dynamicAdd !== 2) throw new Error('Expected 2 tiles after dynamic addition');

    // 4. Test scroll-linked motion (ticker shifts on scroll, NO fade-in on scroll)
    await page.evaluate(() => window.scrollTo(0, 200));
    await new Promise(r => setTimeout(r, 200));
    const scrollEffect = await page.evaluate(() => {
      const hw = document.getElementById('hw');
      const mq = document.getElementById('marq-track');
      return {
        scrollY: window.scrollY,
        hwTransform: hw ? hw.style.transform : '',
        mqTransform: mq ? mq.style.transform : ''
      };
    });
    console.log('Scroll transforms:', scrollEffect);
    if (!scrollEffect.mqTransform.includes('translate3d') && !scrollEffect.hwTransform.includes('translate3d')) {
      throw new Error('Expected scroll-linked translate3d transform');
    }

    console.log('All Hub UI tests PASSED!');
  } finally {
    await browser.close();
    server.close();
  }
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
