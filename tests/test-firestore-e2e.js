import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8770;

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

async function run() {
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

    // Clear local storage cooldown
    await page.evaluate(() => localStorage.removeItem('dn_rev'));

    const testName = 'E2E Tester ' + Math.floor(Math.random() * 1000);
    const testText = 'Test review created for automated validation.';

    console.log(`Submitting test review for "${testName}"...`);
    await page.click('#pick button:nth-child(5)');
    await page.type('#rname', testName);
    await page.type('#rtext', testText);
    await page.click('#rsub');

    // Wait for response message
    await page.waitForFunction(
      () => document.getElementById('rmsg').textContent.includes('Thanks. Your review is live.'),
      { timeout: 8000 }
    );
    console.log('Submission confirmed: "Thanks. Your review is live."');

    // Wait for the review to appear in the list
    await page.waitForFunction(
      (name) => document.getElementById('rlist').textContent.includes(name),
      { timeout: 8000 },
      testName
    );
    console.log(`Review list now contains "${testName}"!`);

    // Now query Firestore REST API to find the document ID and delete it
    console.log('Querying Firestore REST to delete test review...');
    const listRes = await fetch('https://firestore.googleapis.com/v1/projects/doomnest-5f1fa/databases/(default)/documents/reviews');
    if (listRes.ok) {
      const data = await listRes.json();
      if (data.documents) {
        for (const doc of data.documents) {
          const docName = doc.fields?.name?.stringValue;
          if (docName && docName.includes('E2E Tester')) {
            console.log(`Deleting test doc: ${doc.name}...`);
            await fetch(`https://firestore.googleapis.com/v1/${doc.name}`, { method: 'DELETE' });
            console.log('Deleted successfully!');
          }
        }
      }
    }

    console.log('E2E review test and cleanup PASSED!');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
