import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8768;

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

    // 1. Mobile Viewport (390x844)
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`http://localhost:${PORT}/?skip_intro=1#/doomloader`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 300));

    // Check Header & Tagline
    const header = await page.evaluate(() => {
      const ph = document.querySelector('.ph');
      const title = ph ? ph.querySelector('h1')?.textContent : '';
      const dev = ph ? ph.querySelector('.dev')?.textContent : '';
      const tagline = ph ? (ph.querySelector('.tagline')?.textContent || '') : '';
      return { title, dev, tagline };
    });
    console.log('App header:', header);
    if (header.title !== 'Doomloader' || header.dev !== 'Doomsage' || !header.tagline) {
      throw new Error('Header missing Doomloader title, Doomsage developer, or tagline');
    }

    // Check Screenshots honest empty state
    const shotsEmpty = await page.$eval('.shots', el => el.textContent.trim());
    console.log('Screenshots text:', shotsEmpty);
    if (!shotsEmpty.includes('Screenshots arrive with the first release')) {
      throw new Error('Expected screenshots empty state to contain "Screenshots arrive with the first release"');
    }

    // Check Install Button disabled
    const dlBtn = await page.evaluate(() => {
      const btn = document.getElementById('dl');
      return {
        text: btn ? btn.textContent.trim() : '',
        disabled: btn ? btn.getAttribute('aria-disabled') : null
      };
    });
    console.log('Install button:', dlBtn);
    if (dlBtn.text !== 'Not released yet' || dlBtn.disabled !== 'true') {
      throw new Error('Install button must be disabled with "Not released yet"');
    }

    // Check Package ID on its own row & wrapping safely
    const pkg = await page.evaluate(() => {
      const el = document.querySelector('.pkg-id') || document.querySelector('.kv b');
      const parent = el ? el.parentElement : null;
      const elRect = el ? el.getBoundingClientRect() : null;
      const pRect = parent ? parent.getBoundingClientRect() : null;
      const style = el ? window.getComputedStyle(el) : null;
      return {
        text: el ? el.textContent.trim() : '',
        wordBreak: style ? style.wordBreak : '',
        overflowWrap: style ? style.overflowWrap : '',
        overflows: elRect && pRect ? elRect.right > pRect.right + 2 : false
      };
    });
    console.log('Package ID check:', pkg);
    if (pkg.text !== 'com.doomloader.app' || pkg.overflows) {
      throw new Error('Package ID overflows container or wrong text');
    }

    // Check Columns on Mobile (should be 1 column)
    const mobileCols = await page.$eval('.cols', el => window.getComputedStyle(el).gridTemplateColumns);
    console.log('Mobile .cols grid-template-columns:', mobileCols);
    if (mobileCols.split(' ').length > 1) {
      throw new Error('Expected mobile layout to be single column');
    }

    // 2. Desktop Viewport (1440x900)
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise(r => setTimeout(r, 200));
    const desktopCols = await page.$eval('.cols', el => window.getComputedStyle(el).gridTemplateColumns);
    console.log('Desktop .cols grid-template-columns:', desktopCols);
    if (desktopCols.split(' ').length < 2) {
      throw new Error('Expected desktop layout to have 2 columns');
    }

    console.log('All App Detail unit tests PASSED!');
  } finally {
    await browser.close();
    server.close();
  }
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
