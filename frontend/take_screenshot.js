const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set viewport to desktop
  await page.setViewport({ width: 1280, height: 800 });

  // 1. Go to login page
  console.log("Navigating to login...");
  await page.goto('http://localhost:4000/login', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'C:/Users/asert/.gemini/antigravity/brain/c7824de8-4dbb-4ce7-8192-9cd207bc0add/scratch/screenshot_1_login.png' });

  // 2. Fill login form
  console.log("Filling form...");
  await page.type('input[type="text"]', 'admin@dlaredes.com.co');
  await page.type('input[type="password"]', 'DLA2026*');
  await page.click('button[type="submit"]');

  // Wait for navigation or a selector to appear
  console.log("Waiting for app selector or dashboard...");
  try {
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
  } catch (e) {
      console.log("No navigation, taking screenshot of current state...");
  }
  
  await page.screenshot({ path: 'C:/Users/asert/.gemini/antigravity/brain/c7824de8-4dbb-4ce7-8192-9cd207bc0add/scratch/screenshot_2_after_login.png' });

  // 3. If App Selector is shown, click "ERP Administrativo"
  const content = await page.content();
  if (content.includes('Seleccione la Plataforma') || content.includes('ERP Administrativo')) {
      console.log("App selector found. Clicking ERP Administrativo...");
      // find the card with text ERP Administrativo and click it
      const elements = await page.$$('.cursor-pointer');
      if (elements.length > 0) {
          await elements[0].click();
          await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
      }
  }

  // 4. Take final screenshot
  console.log("Taking final dashboard screenshot...");
  await page.screenshot({ path: 'C:/Users/asert/.gemini/antigravity/brain/c7824de8-4dbb-4ce7-8192-9cd207bc0add/scratch/screenshot_3_dashboard.png' });
  
  // Extract sidebar links
  const links = await page.$$eval('aside nav a', anchors => anchors.map(a => a.textContent));
  console.log("Sidebar links available:", links);

  await browser.close();
  console.log("Done");
})();
