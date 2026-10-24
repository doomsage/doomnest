import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8769;

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
    await page.goto(`http://localhost:${PORT}/?skip_intro=1#/doomloader`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    // 1. Verify Star Pick Buttons
    const starCount = await page.$$eval('#pick button', btns => btns.length);
    console.log('Star picker button count:', starCount);
    if (starCount !== 5) throw new Error('Expected 5 star rating buttons');

    // Test clicking star 4
    await page.click('#pick button:nth-child(4)');
    const activeStars = await page.$$eval('#pick button.on', btns => btns.length);
    console.log('Active stars after clicking 4th star:', activeStars);
    if (activeStars !== 4) throw new Error('Expected 4 active stars');

    // 2. Test validation: Submitting review without name shows error
    await page.click('#rsub');
    await new Promise(r => setTimeout(r, 100));
    // HTML5 validation or rmsg check
    const rnameValid = await page.$eval('#rname', el => el.checkValidity());
    console.log('rname checkValidity without value:', rnameValid);
    if (rnameValid) throw new Error('Expected rname to be invalid when empty');

    // 3. Test Idea form validation
    const inameValid = await page.$eval('#iname', el => el.checkValidity());
    const itextValid = await page.$eval('#itext', el => el.checkValidity());
    console.log('Idea form validity without inputs:', { inameValid, itextValid });
    if (inameValid || itextValid) throw new Error('Expected idea inputs to require values');

    // 4. Verify review list container is populated or shows empty state
    const rlistText = await page.$eval('#rlist', el => el.textContent.trim());
    console.log('Reviews list container text:', rlistText.slice(0, 60));
    if (!rlistText) throw new Error('Expected reviews list to have text');

    console.log('All Firebase & Review form tests PASSED!');
  } finally {
    await browser.close();
    server.close();
  }
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
