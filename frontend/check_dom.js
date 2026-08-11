const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto('http://localhost:4000/login', { waitUntil: 'networkidle0' });
    await page.type('input[type="text"]', 'admin@dlaredes.com.co');
    await page.type('input[type="password"]', 'DLA2026*');
    await page.click('button[type="submit"]');
    try {
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 3000 });
    } catch (e) {}
    
    // Check if there is an error message
    const errorText = await page.evaluate(() => {
        const errorEl = document.querySelector('.text-rose-300');
        return errorEl ? errorEl.innerText : 'NO_ERROR';
    });
    console.log("Error text on login:", errorText);

    // If we have app selector, click it
    const content = await page.content();
    if (content.includes('Seleccione la Plataforma') || content.includes('ERP Administrativo')) {
        console.log("App selector found. Clicking ERP Administrativo...");
        const elements = await page.$$('button, .cursor-pointer');
        for (const el of elements) {
            const text = await page.evaluate(e => e.innerText, el);
            if (text && text.includes('ERP Administrativo')) {
                await el.click();
                try {
                    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
                } catch(e) {}
                break;
            }
        }
    }

    const bodyHTML = await page.evaluate(() => document.body.innerText);
    console.log("BODY AFTER LOGIN:");
    console.log(bodyHTML);
    await browser.close();
})();
