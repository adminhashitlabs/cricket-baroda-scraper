import { CricketBarodaTournamentScraper } from './src/platforms/cricket-baroda-tournament-scraper';
import { logger } from './src/logger';

/**
 * Quick test to extract teams from a CricketBaroda tournament
 */
async function testTournamentTeams() {
    const scraper = new CricketBarodaTournamentScraper();

    try {
        logger.info('Initializing CricketBaroda Tournament Scraper', {}, 'TeamTest');

        // Initialize the scraper
        await scraper.initialize();
        logger.info('Scraper initialized successfully', {}, 'TeamTest');

        // Use the example tournament URL from the examples
        const tournamentUrl = 'https://www.cricketbaroda.com/tournament/1500003/Late-Dr.-Mrunalini-Devi-Puar-Womens-T20-Tournament-2025-26';

        logger.info('Extracting teams from tournament', { url: tournamentUrl }, 'TeamTest');

        // Extract participating teams
        const teams = await scraper.extractTournamentTeams(tournamentUrl);

        console.log('\n🎯 TEAMS PARTICIPATING IN THE TOURNAMENT:');
        console.log('=' .repeat(50));
        console.log(`Tournament: Late Dr. Mrunalini Devi Puar Womens T20 Tournament 2025-26`);
        console.log(`Total Teams Found: ${teams.length}`);
        console.log('=' .repeat(50));

        teams.forEach((team, index) => {
            console.log(`${index + 1}. ${team.name}`);
            console.log(`   ID: ${team.id}`);
            console.log(`   URL: ${team.url || 'No team page available'}`);
            console.log(`   Players: ${team.players?.length || 0} (will be populated when roster is extracted)`);
            console.log('');
        });

        logger.info('Team extraction completed successfully', {
            teamsFound: teams.length,
            teams: teams.map(t => t.name)
        }, 'TeamTest');

        // Also get basic tournament info
        logger.info('Getting tournament information', {}, 'TeamTest');
        const tournamentInfo = await scraper.getTournamentInfo(tournamentUrl);

        console.log('\n📊 TOURNAMENT INFORMATION:');
        console.log('=' .repeat(30));
        console.log(`Name: ${tournamentInfo.name}`);
        console.log(`Status: ${tournamentInfo.status}`);
        console.log(`Matches: ${tournamentInfo.matches.length}`);
        console.log('=' .repeat(30));

    } catch (error) {
        logger.error('Team extraction test failed', error as Error, {}, 'TeamTest');
        console.error('\n❌ Error extracting teams:', error instanceof Error ? error.message : String(error));
    } finally {
        // Clean up
        await scraper.cleanup();
        logger.info('Scraper cleaned up', {}, 'TeamTest');
    }
}

// Run the test
testTournamentTeams().then(() => {
    console.log('\n✅ Test completed!');
}).catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
});
