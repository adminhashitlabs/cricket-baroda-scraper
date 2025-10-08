console.log('🚀 Starting simple tournament debug...');

async function simpleDebug() {
    try {
        console.log('📋 Importing modules...');

        const { CricketBarodaTournamentDiscovery } = await import('./src/platforms/cricket-baroda-tournament-discovery');
        const { logger } = await import('./src/logger');

        console.log('✅ Modules imported successfully');

        const discovery = new CricketBarodaTournamentDiscovery();
        console.log('✅ Discovery instance created');

        console.log('🎯 Test completed successfully!');
        return;

    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('Stack:', error.stack);
    }
}

simpleDebug().then(() => {
    console.log('🏁 Simple debug completed');
}).catch(console.error);
