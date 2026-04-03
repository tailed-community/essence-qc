const puppeteer = require('puppeteer');
const path = require('path');

const wait = (ms) => new Promise(r => setTimeout(r, ms));

const SITE_URL = process.env.SITE_URL || 'https://essence-qc-19129.web.app';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'public', 'screenshots');

async function captureScreenshots() {
  console.log(`Capturing screenshots from ${SITE_URL}...`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Mobile map view (1080x1920)
  console.log('1/3 — Mobile map view...');
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await mobilePage.goto(SITE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  // Wait for map tiles to load
  await wait(5000);
  // Dismiss any geolocation prompt by clicking away
  await mobilePage.screenshot({
    path: path.join(OUTPUT_DIR, 'mobile-map.png'),
    type: 'png',
  });

  // Mobile list view (1080x1920)
  console.log('2/3 — Mobile list view...');
  // Click the "Liste" toggle button
  try {
    await mobilePage.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.trim() === 'Liste') {
          btn.click();
          break;
        }
      }
    });
    await wait(2000);
  } catch (e) {
    console.log('  Could not click Liste button, trying URL param...');
    await mobilePage.goto(`${SITE_URL}/?view=list`, { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(3000);
  }
  await mobilePage.screenshot({
    path: path.join(OUTPUT_DIR, 'mobile-list.png'),
    type: 'png',
  });
  await mobilePage.close();

  // Desktop map view (1920x1080)
  console.log('3/3 — Desktop map view...');
  const desktopPage = await browser.newPage();
  await desktopPage.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await desktopPage.goto(SITE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(5000);
  await desktopPage.screenshot({
    path: path.join(OUTPUT_DIR, 'desktop-map.png'),
    type: 'png',
  });
  await desktopPage.close();

  await browser.close();
  console.log(`Screenshots saved to ${OUTPUT_DIR}`);
}

captureScreenshots().catch(e => {
  console.error('Screenshot capture failed:', e);
  process.exit(1);
});
