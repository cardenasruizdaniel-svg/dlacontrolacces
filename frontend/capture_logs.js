const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Capture console logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

    console.log("Navigating to login...");
    await page.goto('http://localhost:4000/login', { waitUntil: 'networkidle0' });
    
    console.log("Filling form...");
    await page.type('input[type="text"]', 'admin@dlaredes.com.co');
    await page.type('input[type="password"]', 'DLA2026*');
    await page.click('button[type="submit"]');
    
    console.log("Waiting 5s...");
    await new Promise(r => setTimeout(r, 5000));
    
    await browser.close();
    console.log("Done");
})();
