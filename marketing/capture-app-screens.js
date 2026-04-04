const puppeteer = require('puppeteer');
const path = require('path');

const wait = (ms) => new Promise(r => setTimeout(r, ms));

const SITE_URL = process.env.SITE_URL || 'https://essence-qc-19129.web.app';
const OUTPUT_DIR = path.resolve(__dirname, 'public', 'app-screens');

async function captureAppScreens() {
  console.log(`Capturing app screens from ${SITE_URL}...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ── 1. Map view (phone frame) ──
  console.log('1/6 — Phone map view...');
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(SITE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(6000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'phone-map.png'), type: 'png' });

  // ── 2. List view ──
  console.log('2/6 — Phone list view...');
  try {
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.trim().includes('Liste')) { btn.click(); break; }
      }
    });
    await wait(2000);
  } catch (e) { console.log('  Liste click failed'); }
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'phone-list.png'), type: 'png' });

  // ── 3. Settings dialog ──
  console.log('3/6 — Settings dialog...');
  try {
    // Click the gear icon button (last button in header)
    await page.evaluate(() => {
      const header = document.querySelector('header');
      if (header) {
        const buttons = header.querySelectorAll('button');
        const gearBtn = buttons[buttons.length - 1];
        if (gearBtn) gearBtn.click();
      }
    });
    await wait(1000);
  } catch (e) { console.log('  Settings click failed'); }
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'phone-settings.png'), type: 'png' });

  // Close settings
  try {
    await page.evaluate(() => {
      // Press escape or click close button
      const closeBtn = document.querySelector('[data-state="open"] button[class*="close"], [role="dialog"] button');
      if (closeBtn) closeBtn.click();
      else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    await wait(500);
    // Also try pressing Escape directly
    await page.keyboard.press('Escape');
    await wait(500);
  } catch (e) {}

  // ── 4. Settings with Costco toggle ON ──
  console.log('4/6 — Settings with Costco ON...');
  try {
    // Open settings again
    await page.evaluate(() => {
      const header = document.querySelector('header');
      if (header) {
        const buttons = header.querySelectorAll('button');
        const gearBtn = buttons[buttons.length - 1];
        if (gearBtn) gearBtn.click();
      }
    });
    await wait(1000);
    // Toggle the Costco switch
    await page.evaluate(() => {
      const switches = document.querySelectorAll('[role="switch"]');
      for (const sw of switches) {
        sw.click();
        break;
      }
    });
    await wait(500);
  } catch (e) { console.log('  Costco toggle failed'); }
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'phone-costco-settings.png'), type: 'png' });

  // Close and wait for Costco banner to appear
  try {
    await page.keyboard.press('Escape');
    await wait(1000);
  } catch (e) {}

  // ── 5. Map with Costco banner ──
  console.log('5/6 — Map with Costco banner...');
  // Go back to map view
  try {
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.trim().includes('Carte')) { btn.click(); break; }
      }
    });
    await wait(2000);
  } catch (e) {}
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'phone-costco-map.png'), type: 'png' });

  // ── 6. Station detail (click a marker on the map) ──
  console.log('6/6 — Station detail dialog...');
  // Back to list, click first station
  try {
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.trim().includes('Liste')) { btn.click(); break; }
      }
    });
    await wait(1500);
    // Click the first station card
    await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="rounded-xl"][class*="border"]');
      if (cards.length > 0) cards[0].click();
    });
    await wait(1000);
  } catch (e) { console.log('  Station click failed'); }
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'phone-station-detail.png'), type: 'png' });

  await page.close();
  await browser.close();
  console.log(`App screens saved to ${OUTPUT_DIR}`);
}

captureAppScreens().catch(e => {
  console.error('App screen capture failed:', e);
  process.exit(1);
});
