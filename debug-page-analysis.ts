console.log('🚀 Starting comprehensive page analysis...');

async function pageAnalysis() {
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

        // Wait longer for dynamic content to load
        console.log('⏳ Waiting for dynamic content...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('✅ Dynamic content wait complete');

        console.log('🔍 Analyzing page structure...');

        // Get basic page info
        const pageInfo = await page.evaluate(() => ({
            title: document.title,
            url: window.location.href,
            bodyTextLength: document.body.textContent?.length || 0,
            innerHTMLLength: document.body.innerHTML.length,
            hasSelect: !!document.querySelector('select'),
            hasDropdown: !!document.querySelector('[class*="dropdown"], [class*="select"], [role="combobox"]'),
            selectCount: document.querySelectorAll('select').length,
            buttonCount: document.querySelectorAll('button').length,
            divCount: document.querySelectorAll('div').length,
            inputCount: document.querySelectorAll('input').length
        }));

        console.log('📄 PAGE INFO:');
        console.log(`   Title: ${pageInfo.title}`);
        console.log(`   URL: ${pageInfo.url}`);
        console.log(`   Body text length: ${pageInfo.bodyTextLength}`);
        console.log(`   HTML length: ${pageInfo.innerHTMLLength}`);
        console.log(`   Has select: ${pageInfo.hasSelect}`);
        console.log(`   Has dropdown: ${pageInfo.hasDropdown}`);
        console.log(`   Select count: ${pageInfo.selectCount}`);
        console.log(`   Button count: ${pageInfo.buttonCount}`);
        console.log('');

        // Look for season-related text
        const seasonText = await page.evaluate(() => {
            const allText = document.body.textContent || '';
            const has2021 = allText.includes('2021');
            const has2022 = allText.includes('2022');
            const hasSeason = allText.includes('season') || allText.includes('Season');
            const hasYear = allText.includes('year') || allText.includes('Year');

            // Look for elements containing season/year text
            const seasonElements = Array.from(document.querySelectorAll('*')).filter(el => {
                const text = el.textContent?.trim() || '';
                return text.length > 0 && text.length < 100 &&
                       (text.includes('2021') || text.includes('2022') || text.includes('Season') || text.includes('Year'));
            }).map(el => ({
                tagName: el.tagName,
                className: el.className,
                id: el.id,
                text: el.textContent?.trim()
            }));

            return {
                has2021,
                has2022,
                hasSeason,
                hasYear,
                seasonElements: seasonElements.slice(0, 10) // First 10 matches
            };
        });

        console.log('📅 SEASON ANALYSIS:');
        console.log(`   Has 2021: ${seasonText.has2021}`);
        console.log(`   Has 2022: ${seasonText.has2022}`);
        console.log(`   Has Season: ${seasonText.hasSeason}`);
        console.log(`   Has Year: ${seasonText.hasYear}`);
        console.log('   Season elements found:');
        seasonText.seasonElements.forEach((el, i) => {
            console.log(`     ${i + 1}. ${el.tagName}.${el.className} - "${el.text}"`);
        });
        console.log('');

        // Look for interactive elements that might be dropdowns
        const interactiveElements = await page.$$('[role="combobox"], [role="listbox"], [class*="dropdown"], [class*="select"], button[class*="dropdown"]');
        console.log(`🎯 Found ${interactiveElements.length} potential dropdown elements`);

        for (let i = 0; i < Math.min(interactiveElements.length, 5); i++) {
            const element = interactiveElements[i];
            const elementInfo = await page.evaluate(el => ({
                tagName: el.tagName,
                className: el.className,
                id: el.id,
                role: el.getAttribute('role'),
                text: el.textContent?.trim(),
                hasClickHandler: !!(el.onclick || el.getAttribute('onclick')),
                ariaExpanded: el.getAttribute('aria-expanded'),
                ariaHaspopup: el.getAttribute('aria-haspopup')
            }), element);

            console.log(`Interactive element ${i + 1}:`);
            console.log(`   Tag: ${elementInfo.tagName}`);
            console.log(`   Class: ${elementInfo.className}`);
            console.log(`   Role: ${elementInfo.role}`);
            console.log(`   Text: "${elementInfo.text}"`);
            console.log(`   Has click handler: ${elementInfo.hasClickHandler}`);
            console.log(`   Aria expanded: ${elementInfo.ariaExpanded}`);
            console.log('');
        }

        // Try to find the tournament elements we know exist
        const tournamentElements = await page.$$('div[class*="sc-6d90bb31"]');
        console.log(`🏏 Found ${tournamentElements.length} tournament elements`);

        if (tournamentElements.length > 0) {
            console.log('✅ Tournament elements exist - page is loaded correctly');
        } else {
            console.log('❌ No tournament elements found - page may not be fully loaded');
        }

        console.log('🎯 Page analysis completed!');
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

pageAnalysis().then(() => {
    console.log('🏁 Page analysis completed');
}).catch(console.error);
