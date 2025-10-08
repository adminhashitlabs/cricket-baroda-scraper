const { CricketBarodaTournamentDiscovery } = require('./dist/src/platforms/cricket-baroda-tournament-discovery');
const { logger } = require('./dist/src/logger');

async function testTournamentDiscovery() {
    console.log('Testing tournament discovery...');

    const discovery = new CricketBarodaTournamentDiscovery();

    try {
        await discovery.initialize();

        // Get tournaments for 2021-22
        const tournaments = await discovery.getTournamentsByYear('2021-22');

        console.log(`Found ${tournaments.length} tournaments for 2021-22`);

        // Filter for U-19 Late Mama Saheb Ghorpade tournaments
        const targetTournaments = tournaments.filter(tournament =>
            tournament.name.includes('U-19 Late Mama Saheb Ghorpade') &&
            (tournament.name.includes('Elite Group') || tournament.name.includes('Plate Group'))
        );

        console.log(`Found ${targetTournaments.length} target tournaments:`);
        targetTournaments.forEach(tournament => {
            console.log(`- ${tournament.name}`);
            console.log(`  URL: ${tournament.url}`);
            console.log(`  ID: ${tournament.id}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await discovery.cleanup();
    }
}

testTournamentDiscovery();
