const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugCommentary() {
    console.log('🔍 Debugging commentary extraction...');

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const url = 'https://www.cricketbaroda.com/match/17801317/Advick-Cricket-Academy-Women-vs-Y.S.C-Women';

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Navigate to COMMENTARY tab
        await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a, button, div[role="tab"]'));
            const teamsLink = links.find(link =>
                link.textContent?.trim().toUpperCase() === 'COMMENTARY' ||
                link.textContent?.trim().toLowerCase().includes('commentary')
            );
            if (teamsLink) {
                teamsLink.scrollIntoView();
                teamsLink.click();
            }
        });

        await new Promise(resolve => setTimeout(resolve, 5000));

        // Extract commentary with debug info
        const commentaryData = await page.evaluate(() => {
            const commentary = [];

            // Look for commentary elements
            const selectors = [
                '.commentary', '[class*="commentary"]', '.ball', '[class*="ball"]',
                'td', 'tr', '.card-body', '[class*="card"]'
            ];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    const text = el.textContent?.trim() || '';
                    if (text && text.length > 10 && text.length < 200) {
                        if (/\d+\.\d+|\d+\/\d+|wicket|out|lbw|bowled|caught|run/i.test(text)) {
                            commentary.push({
                                text: text,
                                type: 'ball',
                                element: selector,
                                hasOverBall: /\d+\.\d+/.test(text),
                                hasWicket: /wicket|out|lbw|bowled|caught|run/i.test(text),
                                hasStrikeRate: /SR:\s*\d+\.\d+/.test(text)
                            });
                        }
                    }
                }
            }

            // Get all text that might be commentary
            const allTextElements = document.querySelectorAll('*');
            for (const el of allTextElements) {
                const text = el.textContent?.trim() || '';
                if (text && text.length > 20 && text.length < 150) {
                    if (/\d+.*\d+.*runs?|wicket|over|ball|bowled|caught|lbw/i.test(text) &&
                        !text.includes('http') &&
                        !text.includes('Copyright') &&
                        !text.includes('Baroda Cricket Association')) {
                        commentary.push({
                            text: text,
                            type: 'general',
                            element: el.tagName.toLowerCase(),
                            hasOverBall: /\d+\.\d+/.test(text),
                            hasWicket: /wicket|out|lbw|bowled|caught|run/i.test(text),
                            hasStrikeRate: /SR:\s*\d+\.\d+/.test(text)
                        });
                    }
                }
            }

            return commentary;
        });

        console.log(`📊 Found ${commentaryData.length} commentary items`);

        // Show sample of what was found
        console.log('\n📋 SAMPLE COMMENTARY ITEMS:');
        commentaryData.slice(0, 20).forEach((item, index) => {
            console.log(`${index + 1}. [${item.type}] ${item.text}`);
            console.log(`   Over.ball: ${item.hasOverBall}, Wicket: ${item.hasWicket}, SR: ${item.hasStrikeRate}`);
            console.log('');
        });

        // Save debug data
        fs.writeFileSync('debug-commentary.json', JSON.stringify(commentaryData, null, 2));
        console.log('💾 Debug data saved to debug-commentary.json');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }
}

debugCommentary().catch(console.error);
