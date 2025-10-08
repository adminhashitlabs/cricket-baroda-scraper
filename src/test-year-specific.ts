import { CricketBarodaTournamentDiscovery } from './platforms/cricket-baroda-tournament-discovery';
import { logger } from './logger';

/**
 * Simple test for getTournamentsByYear method
 */
async function testGetTournamentsByYear() {
    const discovery = new CricketBarodaTournamentDiscovery();

    try {
        logger.info('Starting getTournamentsByYear test', {}, 'YearTest');

        await discovery.initialize();

        console.log('🏏 Testing getTournamentsByYear for 2021-22\n');

        const tournaments = await discovery.getTournamentsByYear('2021-22');

        console.log(`Found ${tournaments.length} tournaments for 2021-22`);

        if (tournaments.length > 0) {
            console.log('First few tournaments:');
            tournaments.slice(0, 5).forEach((t, i) => {
                console.log(`${i + 1}. ${t.name}`);
            });
        }

    } catch (error) {
        logger.error('getTournamentsByYear test failed', error as Error, {}, 'YearTest');
    } finally {
        await discovery.cleanup();
    }
}

// Run the test
testGetTournamentsByYear().catch(console.error);
