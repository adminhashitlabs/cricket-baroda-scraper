console.log('🚀 Starting selector debug...');

async function selectorDebug() {
    let discovery: any = null;

    try {
        console.log('📋 Importing modules...');

        const { CricketBarodaTournamentDiscovery } = await import('./src/platforms/cricket-baroda-tournament-discovery');
        const { logger } = await import('./src/logger');

        console.log('✅ Modules imported successfully');

        discovery = new CricketBarodaTournamentDiscovery();
        console.log('✅ Discovery instance created');

        console.log('📋 Initializing browser...');
        await discovery.initialize();
        console.log('✅ Browser initialized successfully');

        console.log('🌐 Navigating to tournament page...');
        const tournamentCenterUrl = 'https://www.cricketbaroda.com/match-center/tournaments';
        const page = discovery['scraper']['page']!;

        await page.goto(tournamentCenterUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        console.log('✅ Navigation successful');

        console.log('🔍 Analyzing page selectors...');

        // Get all select elements
        const selectElements = await page.$$('select');
        console.log(`📋 Found ${selectElements.length} select elements`);

        for (let i = 0; i < selectElements.length; i++) {
            const select = selectElements[i];
            const selectInfo = await page.evaluate((el: HTMLSelectElement) => ({
                tagName: el.tagName,
                className: el.className,
                id: el.id,
                name: el.name,
                optionsCount: el.options.length,
                firstFewOptions: Array.from(el.options).slice(0, 3).map((opt: HTMLOptionElement) => ({
                    value: opt.value,
                    text: opt.text
                }))
            }), select);

            console.log(`Select ${i + 1}:`);
            console.log(`  Tag: ${selectInfo.tagName}`);
            console.log(`  Class: ${selectInfo.className}`);
            console.log(`  ID: ${selectInfo.id}`);
            console.log(`  Name: ${selectInfo.name}`);
            console.log(`  Options: ${selectInfo.optionsCount}`);
            console.log(`  Sample options:`, selectInfo.firstFewOptions);
            console.log('');
        }

        // Try to find the season selector with a more flexible approach
        console.log('🎯 Looking for season selector...');

        // Try different possible selectors
        const possibleSelectors = [
            'select.sc-bc4a329-1.grmngK.form-select',
            'select[class*="form-select"]',
            'select[name*="season"]',
            'select[name*="year"]',
            'select',
            '.form-select',
            '[class*="select"]'
        ];

        for (const selector of possibleSelectors) {
            try {
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    console.log(`✅ Selector "${selector}" found ${elements.length} elements`);

                    // Check if any of these contain season/year options
                    for (let i = 0; i < Math.min(elements.length, 3); i++) {
                        const element = elements[i];
                        const options = await page.evaluate((el: HTMLSelectElement) => {
                            if (el.tagName === 'SELECT') {
                                return Array.from(el.options).map((opt: HTMLOptionElement) => ({
                                    value: opt.value,
                                    text: opt.text
                                }));
                            }
                            return null;
                        }, element);

                        if (options && options.some(opt => opt.text.includes('2021') || opt.text.includes('2022'))) {
                            console.log(`🎯 Found season selector: "${selector}" (element ${i + 1})`);
                            console.log('Options:', options.slice(0, 5));
                        }
                    }
                } else {
                    console.log(`❌ Selector "${selector}" found 0 elements`);
                }
            } catch (error) {
                console.log(`⚠️ Error with selector "${selector}":`, error.message);
            }
        }

        console.log('🎯 Selector analysis completed!');
        return;

    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('Stack:', error.stack);
    } finally {
        console.log('🧹 Cleaning up...');
        try {
            if (discovery) {
                await discovery.cleanup();
            }
            console.log('✅ Cleanup complete');
        } catch (cleanupError) {
            console.log('⚠️ Cleanup error:', cleanupError.message);
        }
    }
}

selectorDebug().then(() => {
    console.log('🏁 Selector debug completed');
}).catch(console.error);
