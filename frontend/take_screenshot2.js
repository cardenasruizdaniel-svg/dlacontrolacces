const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log("Navigating to login...");
    await page.goto('http://localhost:4000/login', { waitUntil: 'networkidle0' });
    
    console.log("Filling form...");
    await page.type('input[type="text"]', 'admin@dlaredes.com.co');
    await page.type('input[type="password"]', 'DLA2026*');
    await page.click('button[type="submit"]');
    
    console.log("Waiting 10s for Dashboard to compile and load...");
    await new Promise(r => setTimeout(r, 10000));
    
    const content = await page.content();
    if (content.includes('Seleccione la Plataforma')) {
        console.log("Found app selector, clicking ERP Administrativo...");
        const elements = await page.$$('button, .cursor-pointer');
        for (const el of elements) {
            const text = await page.evaluate(e => e.innerText, el);
            if (text && text.includes('ERP Administrativo')) {
                await el.click();
                await new Promise(r => setTimeout(r, 5000));
                break;
            }
        }
    }
    
    console.log("Taking dashboard screenshot...");
    await page.screenshot({ path: 'C:/Users/asert/.gemini/antigravity/brain/c7824de8-4dbb-4ce7-8192-9cd207bc0add/scratch/final_dashboard.png' });
    
    console.log("Extracting sidebar links...");
    const links = await page.$$eval('aside nav a', anchors => anchors.map(a => a.textContent));
    console.log("Sidebar links available:", links);
    
    const bodyHTML = await page.evaluate(() => document.body.innerText);
    console.log("BODY AFTER 10s:");
    console.log(bodyHTML.substring(0, 1000));
    
    await browser.close();
    console.log("Done");
})();
