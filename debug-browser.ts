console.log('🚀 Starting browser initialization debug...');

async function browserDebug() {
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

        console.log('🌐 Testing page access...');
        const page = discovery['scraper']['page'];
        if (page) {
            console.log('✅ Page object exists');

            console.log('🌐 Navigating to tournament page...');
            const tournamentCenterUrl = 'https://www.cricketbaroda.com/match-center/tournaments';
            await page.goto(tournamentCenterUrl, { waitUntil: 'networkidle2' });
            console.log('✅ Navigation successful');

            const currentUrl = page.url();
            console.log(`📍 Current URL: ${currentUrl}`);

            console.log('🎯 Test completed successfully!');
        } else {
            console.log('❌ Page object is null');
        }

        return;

    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('Stack:', error.stack);
    }
}

browserDebug().then(() => {
    console.log('🏁 Browser debug completed');
}).catch(console.error);
