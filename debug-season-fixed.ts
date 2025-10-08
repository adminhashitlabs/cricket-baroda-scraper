console.log('🚀 Starting season selection with proper waiting...');

async function seasonSelectionTest() {
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

        // Wait for the select element to be available
        console.log('⏳ Waiting for season selector to be available...');
        await page.waitForSelector('select.sc-bc4a329-1.grmngK.form-select', { timeout: 10000 });
        console.log('✅ Season selector is now available');

        // Additional wait to ensure it's fully interactive
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('🎯 Selecting 2021-22 season...');
        await page.select('select.sc-bc4a329-1.grmngK.form-select', '17');
        console.log('✅ Season selected successfully');

        console.log('⏳ Waiting for page to update...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('✅ Page update wait complete');

        console.log('🔍 Checking for 2021-22 tournaments...');
        const tournamentElements = await page.$$('div[class*="sc-6d90bb31"]');
        console.log(`🎯 Found ${tournamentElements.length} tournament elements after season selection`);

        if (tournamentElements.length > 0) {
            // Look for the specific U-19 Late Mama Saheb Ghorpade tournaments
            const targetTournaments: string[] = [];

            for (const element of tournamentElements) {
                const text = await page.evaluate(el => el.textContent?.trim() || '', element);
                if (text.includes('U-19 Late Mama Saheb Ghorpade') &&
                    (text.includes('Elite Group') || text.includes('Plate Group'))) {
                    targetTournaments.push(text);
                }
            }

            console.log(`🎯 Found ${targetTournaments.length} target tournaments:`);
            targetTournaments.forEach((tournament, i) => {
                console.log(`   ${i + 1}. ${tournament.substring(0, 80)}...`);
            });

            if (targetTournaments.length > 0) {
                console.log('✅ SUCCESS: Target tournaments found for 2021-22!');
            } else {
                console.log('❌ No target tournaments found - they may not exist for this season');
            }
        }

        console.log('🎯 Season selection test completed successfully!');
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

seasonSelectionTest().then(() => {
    console.log('🏁 Season selection test completed');
}).catch(console.error);
