/**
 * Capture App Store screenshots at iPad Pro 12.9" / 13" dimensions (2048×2732)
 * Compatible with the "iPad 12.9" or 13" display" requirement
 * (2064×2752, 2752×2064, 2048×2732, or 2732×2048).
 *
 * Usage:  node capture-ipad-screenshots.js
 * Output: pwa-packages/ios/screenshots/ipad/
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const wait = (ms) => new Promise(r => setTimeout(r, ms));

const SITE_URL = process.env.SITE_URL || 'https://essence-qc-19129.web.app';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'pwa-packages', 'ios', 'screenshots', 'ipad');

// iPad Pro 12.9" logical resolution at 2× scale → 2048×2732 actual pixels
const VIEWPORT = { width: 1024, height: 1366, deviceScaleFactor: 2 };

async function capture() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Capturing iPad App Store screenshots from ${SITE_URL}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Viewport: ${VIEWPORT.width}×${VIEWPORT.height} @${VIEWPORT.deviceScaleFactor}×`);
  console.log(`Output resolution: ${VIEWPORT.width * VIEWPORT.deviceScaleFactor}×${VIEWPORT.height * VIEWPORT.deviceScaleFactor}px\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // ── 1. Map view ──────────────────────────────────
  console.log('1/6 — Map view...');
  await page.goto(SITE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(7000); // Let map tiles load
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01-map.png'), type: 'png' });
  console.log('     ✓ 01-map.png');

  // ── 2. List view ─────────────────────────────────
  console.log('2/6 — List view...');
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent?.trim().includes('Liste')) { btn.click(); break; }
    }
  });
  await wait(2000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '02-list.png'), type: 'png' });
  console.log('     ✓ 02-list.png');

  // ── 3. Station detail ────────────────────────────
  console.log('3/6 — Station detail...');
  await page.evaluate(() => {
    const cards = document.querySelectorAll('[class*="rounded-xl"][class*="border"]');
    if (cards.length > 0) cards[0].click();
  });
  await wait(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03-station-detail.png'), type: 'png' });
  console.log('     ✓ 03-station-detail.png');

  // Close station detail
  await page.keyboard.press('Escape');
  await wait(500);

  // ── 4. Settings ──────────────────────────────────
  console.log('4/6 — Settings...');
  await page.evaluate(() => {
    const header = document.querySelector('header');
    if (header) {
      const buttons = header.querySelectorAll('button');
      const gearBtn = buttons[buttons.length - 1];
      if (gearBtn) gearBtn.click();
    }
  });
  await wait(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04-settings.png'), type: 'png' });
  console.log('     ✓ 04-settings.png');

  // Enable Costco mode
  await page.evaluate(() => {
    const switches = document.querySelectorAll('[role="switch"]');
    for (const sw of switches) { sw.click(); break; }
  });
  await wait(500);
  await page.keyboard.press('Escape');
  await wait(1000);

  // ── 5. Costco banner + Map ───────────────────────
  console.log('5/6 — Costco mode (map)...');
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent?.trim().includes('Carte')) { btn.click(); break; }
    }
  });
  await wait(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05-costco-map.png'), type: 'png' });
  console.log('     ✓ 05-costco-map.png');

  // ── 6. Route planning ───────────────────────────
  console.log('6/6 — Route planning...');
  const searchInput = await page.$('input[type="text"]');
  if (searchInput) {
    await searchInput.click();
    await wait(500);
    await searchInput.type('Québec', { delay: 80 });
    await wait(3000);
    await page.evaluate(() => {
      const pacItem = document.querySelector('.pac-item');
      if (pacItem) pacItem.click();
    });
    await wait(5000);
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, '06-route.png'), type: 'png' });
  console.log('     ✓ 06-route.png');

  await page.close();
  await browser.close();

  // Summary
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'));
  console.log(`\n✅ ${files.length} screenshots saved to ${OUTPUT_DIR}`);
  console.log(`   Resolution: ${VIEWPORT.width * VIEWPORT.deviceScaleFactor}×${VIEWPORT.height * VIEWPORT.deviceScaleFactor}px`);
  console.log('\nThese are ready for the App Store "iPad 12.9" or 13" Display" slot.');
}

capture().catch(e => {
  console.error('Failed:', e);
  process.exit(1);
});
