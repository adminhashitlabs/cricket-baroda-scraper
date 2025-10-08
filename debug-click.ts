console.log('🚀 Starting tournament click debug...');

async function clickDebug() {
    try {
        console.log('📋 Importing modules...');

        const { CricketBarodaTournamentDiscovery } = await import('./src/platforms/cricket-baroda-tournament-discovery');
        const { logger } = await import('./src/logger');

        console.log('✅ Modules imported successfully');

        const discovery = new CricketBarodaTournamentDiscovery();
        console.log('✅ Discovery instance created');

        console.log('📋 Initializing browser...');
        await discovery.initialize();
        console.log('✅ Browser initialized successfully');

        console.log('🌐 Navigating to tournament page...');
        const tournamentCenterUrl = 'https://www.cricketbaroda.com/match-center/tournaments';
        await discovery['scraper']['page']!.goto(tournamentCenterUrl, { waitUntil: 'networkidle2' });
        console.log('✅ Navigation successful');

        console.log('🎯 Selecting 2021-22 season...');
        await discovery['scraper']['page']!.select('select.sc-bc4a329-1.grmngK.form-select', '17');
        console.log('✅ Season selected');

        console.log('⏳ Waiting for page to load...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Page load wait complete');

        console.log('🔍 Looking for tournament elements...');
        const tournamentElements = await discovery['scraper']['page']!.$$('div[class*="sc-6d90bb31"]');
        console.log(`🎯 Found ${tournamentElements.length} tournament DIV elements`);

        if (tournamentElements.length > 0) {
            // Find the U-19 Late Mama Saheb Ghorpade Elite Group tournament
            console.log('🎯 Looking for U-19 Late Mama Saheb Ghorpade Elite Group tournament...');

            for (let i = 0; i < tournamentElements.length; i++) {
                const element = tournamentElements[i];
                const text = await discovery['scraper']['page']!.evaluate(el => el.textContent?.trim() || '', element);

                if (text.includes('U-19 Late Mama Saheb Ghorpade Elite Group')) {
                    console.log(`✅ Found target tournament at index ${i}: ${text.substring(0, 100)}...`);

                    console.log('🖱️ Attempting to click on tournament element...');
                    try {
                        await element.click();
                        console.log('✅ Click successful');

                        console.log('⏳ Waiting for navigation...');
                        await new Promise(resolve => setTimeout(resolve, 3000));

                        const currentUrl = discovery['scraper']['page']!.url();
                        console.log(`📍 Current URL after click: ${currentUrl}`);

                        if (currentUrl !== tournamentCenterUrl) {
                            console.log('🎉 Page navigation successful!');

                            // Check for match-related elements on the new page
                            const matchElements = await discovery['scraper']['page']!.$$('[class*="match"], [class*="fixture"], .match-card, .fixture-card, [data-testid*="match"]');
                            console.log(`🏏 Found ${matchElements.length} potential match elements`);

                            // Look for specific match content
                            const pageText = await discovery['scraper']['page']!.evaluate(() => document.body.textContent || '');
                            const hasMatchKeywords = ['match', 'fixture', 'vs', 'Islam Gymkhana', 'K.M.C.A'].some(keyword =>
                                pageText.toLowerCase().includes(keyword.toLowerCase())
                            );
                            console.log(`📝 Page contains match keywords: ${hasMatchKeywords}`);

                        } else {
                            console.log('❌ Page did not change after click');

                            // Check if any JavaScript events were triggered
                            const pageContentAfter = await discovery['scraper']['page']!.content();
                            console.log(`📄 Page content length after click: ${pageContentAfter.length}`);
                        }

                    } catch (clickError) {
                        console.log('❌ Click failed:', clickError.message);

                        // Try alternative click methods
                        console.log('🔄 Trying alternative click method...');
                        try {
                            await discovery['scraper']['page']!.evaluate(el => el.click(), element);
                            console.log('✅ Alternative click successful');
                        } catch (altClickError) {
                            console.log('❌ Alternative click also failed:', altClickError.message);
                        }
                    }

                    break; // Stop after finding the first target tournament
                }
            }
        }

        console.log('🎯 Click test completed!');
        return;

    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('Stack:', error.stack);
    }
}

clickDebug().then(() => {
    console.log('🏁 Click debug completed');
}).catch(console.error);
