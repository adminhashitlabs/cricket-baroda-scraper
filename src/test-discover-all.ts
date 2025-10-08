import { CricketBarodaTournamentDiscovery } from './platforms/cricket-baroda-tournament-discovery';
import { logger } from './logger';

/**
 * Simple test to check if discoverAllTournaments works
 */
async function testDiscoverAllTournaments() {
    const discovery = new CricketBarodaTournamentDiscovery();

    try {
        logger.info('Starting discoverAllTournaments test', {}, 'DiscoverTest');

        // Initialize the discovery system
        await discovery.initialize();
        logger.info('Discovery system initialized', {}, 'DiscoverTest');

        // Call discoverAllTournaments
        const results = await discovery.discoverAllTournaments();

        logger.info('discoverAllTournaments completed', {
            seasonsFound: results.length,
            totalTournaments: results.reduce((sum, r) => sum + r.totalTournaments, 0)
        }, 'DiscoverTest');

        console.log(`Found ${results.length} seasons with ${results.reduce((sum, r) => sum + r.totalTournaments, 0)} total tournaments`);

    } catch (error) {
        logger.error('discoverAllTournaments test failed', error as Error, {}, 'DiscoverTest');
    } finally {
        await discovery.cleanup();
    }
}

// Run the test
testDiscoverAllTournaments().catch(console.error);
