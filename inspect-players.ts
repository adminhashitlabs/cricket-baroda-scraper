import puppeteer from 'puppeteer';
import { CONFIG } from './src/config';
import { logger } from './src/logger';

/**
 * Script to inspect HTML structure and find player ID attributes
 */
async function inspectPlayerIds() {
    logger.info('Starting HTML inspection for player IDs', {}, 'Inspector');

    const browser = await puppeteer.launch({
        headless: false, // Keep browser visible for inspection
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const url = 'https://www.cricketbaroda.com/match/17797270/Y.S.C-Women-vs-Combined-Disrict-Women---1';
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Navigate to commentary tab
    try {
        await page.click('text="COMMENTARY"');
        await new Promise(resolve => setTimeout(resolve, CONFIG.TIMEOUTS.COMMENTARY_LOAD));
        logger.info('Navigated to commentary tab', {}, 'Inspector');
    } catch (e) {
        logger.error('Failed to navigate to commentary', e as Error, {}, 'Inspector');
        await browser.close();
        return;
    }

    // Select first team
    try {
        await page.select('select.sc-bc4a329-1', '10134252-1');
        await new Promise(resolve => setTimeout(resolve, CONFIG.TIMEOUTS.COMMENTARY_LOAD));
        logger.info('Selected team for inspection', {}, 'Inspector');
    } catch (e) {
        logger.error('Failed to select team', e as Error, {}, 'Inspector');
        await browser.close();
        return;
    }

    // Inspect ball elements for player ID attributes
    const ballElements = await page.$$(CONFIG.SELECTORS.BALL_ELEMENTS);

    logger.info(`Found ${ballElements.length} ball elements`, {}, 'Inspector');

    for (let i = 0; i < Math.min(ballElements.length, 5); i++) {
        const element = ballElements[i];
        const html = await element.evaluate(el => el.outerHTML);
        const text = await element.evaluate(el => el.textContent?.trim() || '');

        logger.info(`Ball element ${i + 1}:`, {
            text: text.substring(0, 100),
            html: html.substring(0, 200)
        }, 'Inspector');

        // Look for any data attributes or IDs
        const attributes = await element.evaluate(el => {
            const attrs: { [key: string]: string } = {};
            for (let attr of el.attributes) {
                attrs[attr.name] = attr.value;
            }
            return attrs;
        });

        logger.info(`Attributes for ball ${i + 1}:`, attributes, 'Inspector');

        // Look for nested elements that might contain player info
        const nestedElements = await element.$$('*');
        for (let j = 0; j < nestedElements.length; j++) {
            const nestedAttrs = await nestedElements[j].evaluate(el => {
                const attrs: { [key: string]: string } = {};
                for (let attr of el.attributes) {
                    attrs[attr.name] = attr.value;
                }
                return attrs;
            });

            const nestedText = await nestedElements[j].evaluate(el => el.textContent?.trim() || '');
            const nestedTag = await nestedElements[j].evaluate(el => el.tagName);

            if (Object.keys(nestedAttrs).length > 0 || nestedText.includes('to ')) {
                logger.info(`Nested element ${j} in ball ${i + 1}:`, {
                    tag: nestedTag,
                    text: nestedText.substring(0, 50),
                    attributes: nestedAttrs
                }, 'Inspector');
            }
        }
    }

    // Keep browser open for manual inspection
    logger.info('Browser kept open for manual inspection. Press Ctrl+C to exit.', {}, 'Inspector');
    process.on('SIGINT', async () => {
        await browser.close();
        process.exit(0);
    });
}

// Run the inspection
inspectPlayerIds().catch(console.error);
