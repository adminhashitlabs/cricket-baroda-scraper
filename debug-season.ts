console.log('🚀 Starting season selection debug...');

async function seasonDebug() {
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
            console.log('📄 Examining first tournament element...');
            const firstTournament = tournamentElements[0];
            const elementHTML = await discovery['scraper']['page']!.evaluate(el => el.outerHTML, firstTournament);
            console.log('First tournament element HTML (first 200 chars):', elementHTML.substring(0, 200));

            console.log('🔗 Checking for links in first tournament...');
            const links = await firstTournament.$$('a');
            console.log(`Found ${links.length} links in first tournament`);

            if (links.length > 0) {
                const linkHref = await discovery['scraper']['page']!.evaluate(el => el.href, links[0]);
                console.log('First link href:', linkHref);
            }
        }

        console.log('🎯 Season selection test completed successfully!');
        return;

    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('Stack:', error.stack);
    }
}

seasonDebug().then(() => {
    console.log('🏁 Season debug completed');
}).catch(console.error);
