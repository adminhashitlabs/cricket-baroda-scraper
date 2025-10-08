const puppeteer = require('puppeteer');

async function inspectPlayerIds() {
    console.log('Starting HTML inspection for player IDs');

    const browser = await puppeteer.launch({
        headless: false, // Keep browser visible for inspection
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const url = 'https://www.cricketbaroda.com/match/17797270/Y.S.C-Women-vs-Combined-Disrict-Women---1';
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Navigate to commentary tab
    try {
        // Use page.evaluate to find and click COMMENTARY
        await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('a, button, div, span'));
            const commentaryElement = elements.find(el =>
                el.textContent?.trim().toUpperCase() === 'COMMENTARY' ||
                el.textContent?.trim().toLowerCase().includes('commentary')
            );
            if (commentaryElement) {
                commentaryElement.click();
                return true;
            }
            return false;
        });

        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('Navigated to commentary tab');
    } catch (e) {
        console.error('Failed to navigate to commentary', e);
        await browser.close();
        return;
    }

    // Inspect available selectors before selecting team
    try {
        const selectElements = await page.$$eval('select', selects => selects.map(s => ({
            id: s.id,
            className: s.className,
            name: s.name,
            options: Array.from(s.options).map(opt => ({ value: opt.value, text: opt.textContent?.trim() }))
        })));

        console.log('Available select elements:', JSON.stringify(selectElements, null, 2));

        // Try to find team selector with different approaches
        let teamSelector = null;
        const possibleSelectors = ['select.sc-bc4a329-1', 'select', '[role="combobox"]'];

        for (const selector of possibleSelectors) {
            try {
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    console.log(`Found ${elements.length} elements with selector: ${selector}`);
                    teamSelector = elements[0];
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (teamSelector) {
            await teamSelector.select('10134252-1');
        } else {
            console.log('No team selector found, proceeding without team selection');
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('Team selection completed');
    } catch (e) {
        console.error('Failed to select team', e);
        console.log('Proceeding without team selection...');
    }

    // Wait for commentary container to load (same as working scraper)
    try {
        console.log('Waiting for commentary container...');
        await page.waitForSelector('div.sc-5abfe348-0.hbtmkB', { timeout: 10000 });
        console.log('Commentary container found');

        // Get all elements in the commentary container (same as working scraper)
        const allElements = await page.$$('div.sc-5abfe348-0.hbtmkB > *');
        console.log(`Found ${allElements.length} elements in commentary container`);

        if (allElements.length === 0) {
            console.log('No elements found in commentary container');
            return;
        }

        // Process first few elements to see their structure
        for (let i = 0; i < Math.min(allElements.length, 10); i++) {
            const element = allElements[i];
            const tagName = await element.evaluate(el => el.tagName);
            const className = await element.evaluate(el => el.className);
            const text = await element.evaluate(el => el.textContent?.trim() || '');

            console.log(`\nElement ${i}: ${tagName}.${className}`);
            console.log(`Text: ${text.substring(0, 100)}...`);

            // Check if this is a ball element
            if (className.includes('sc-5abfe348-1')) {
                console.log('*** BALL ELEMENT FOUND ***');

                // Get full HTML
                const html = await element.evaluate(el => el.outerHTML);
                console.log(`Full HTML: ${html.substring(0, 500)}...`);

                // Look for player names and IDs in the HTML
                const playerData = await element.evaluate(el => {
                    const result = {
                        text: el.textContent?.trim() || '',
                        html: el.outerHTML,
                        attributes: {},
                        nestedElements: []
                    };

                    // Get all attributes
                    for (let j = 0; j < el.attributes.length; j++) {
                        const attr = el.attributes[j];
                        result.attributes[attr.name] = attr.value;
                    }

                    // Get nested elements
                    const nested = el.querySelectorAll('*');
                    for (let k = 0; k < nested.length; k++) {
                        const nestedEl = nested[k];
                        const nestedData = {
                            tag: nestedEl.tagName,
                            text: nestedEl.textContent?.trim() || '',
                            attributes: {}
                        };

                        for (let m = 0; m < nestedEl.attributes.length; m++) {
                            const attr = nestedEl.attributes[m];
                            nestedData.attributes[attr.name] = attr.value;
                        }

                        result.nestedElements.push(nestedData);
                    }

                    return result;
                });

                console.log('Player data:', JSON.stringify(playerData, null, 2));
                break; // Just show first ball element
            }
        }

    } catch (e) {
        console.error('Failed to find commentary container', e);
    }

    // Keep browser open for manual inspection
    console.log('\nBrowser kept open for manual inspection. Press Ctrl+C to exit.');
    process.on('SIGINT', async () => {
        await browser.close();
        process.exit(0);
    });
}

// Run the inspection
inspectPlayerIds().catch(console.error);
