console.log('Testing basic imports...');

try {
    const { CricketBarodaTournamentDiscovery } = require('./dist/src/platforms/cricket-baroda-tournament-discovery');
    console.log('✅ Import successful');
} catch (error) {
    console.log('❌ Import failed:', error.message);
}

try {
    const { logger } = require('./dist/src/logger');
    console.log('✅ Logger import successful');
} catch (error) {
    console.log('❌ Logger import failed:', error.message);
}
