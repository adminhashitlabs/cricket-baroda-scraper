import { CricketTournamentScraper } from './src/platforms/tournament-scraper';
import { logger } from './src/logger';

/**
 * Test script for the enhanced tournament scraper
 * Tests the new comprehensive tournament data extraction methods
 */
async function testEnhancedTournamentScraper() {
    const scraper = new CricketTournamentScraper();

    try {
        logger.info('Starting enhanced tournament scraper test', {}, 'TestScript');

        // Initialize the scraper
        await scraper.initialize();
        logger.info('Tournament scraper initialized successfully', {}, 'TestScript');

        // Test with a sample tournament URL (you can replace this with a real URL)
        const testTournamentUrl = 'https://example.com/tournament/test-tournament';

        logger.info('Testing comprehensive tournament info extraction', { url: testTournamentUrl }, 'TestScript');

        // Test the new comprehensive tournament info method
        try {
            const tournamentInfo = await scraper.getComprehensiveTournamentInfo(testTournamentUrl);
            logger.info('Comprehensive tournament info extracted successfully', {
                name: tournamentInfo.name,
                status: tournamentInfo.status,
                teamsCount: tournamentInfo.totalTeams,
                matchesCount: tournamentInfo.totalMatches
            }, 'TestScript');
        } catch (error) {
            logger.warn('Comprehensive tournament info test failed (expected for example URL)', {
                error: error instanceof Error ? error.message : String(error)
            }, 'TestScript');
        }

        // Test team extraction
        try {
            const teams = await scraper.extractTournamentTeams(testTournamentUrl);
            logger.info('Tournament teams extracted successfully', {
                teamsCount: teams.length,
                teams: teams.map(t => t.name)
            }, 'TestScript');
        } catch (error) {
            logger.warn('Team extraction test failed (expected for example URL)', {
                error: error instanceof Error ? error.message : String(error)
            }, 'TestScript');
        }

        // Test team roster extraction
        try {
            const testTeamUrl = 'https://example.com/team/test-team';
            const teamRoster = await scraper.extractTeamRoster(testTeamUrl, 'Test Team');
            logger.info('Team roster extracted successfully', {
                teamName: teamRoster.name,
                playersCount: teamRoster.players?.length || 0
            }, 'TestScript');
        } catch (error) {
            logger.warn('Team roster extraction test failed (expected for example URL)', {
                error: error instanceof Error ? error.message : String(error)
            }, 'TestScript');
        }

        // Test match player extraction
        try {
            const testMatchUrl = 'https://example.com/match/test-match';
            const testMatchInfo = {
                id: 'test_match_1',
                url: testMatchUrl,
                title: 'Test Match',
                team1: 'Team A',
                team2: 'Team B',
                status: 'completed'
            };
            const matchPlayers = await scraper.extractMatchPlayers(testMatchUrl, testMatchInfo);
            logger.info('Match players extracted successfully', {
                matchId: testMatchInfo.id,
                playersCount: matchPlayers.length
            }, 'TestScript');
        } catch (error) {
            logger.warn('Match player extraction test failed (expected for example URL)', {
                error: error instanceof Error ? error.message : String(error)
            }, 'TestScript');
        }

        logger.info('Enhanced tournament scraper test completed', {}, 'TestScript');

    } catch (error) {
        logger.error('Enhanced tournament scraper test failed', error as Error, {}, 'TestScript');
    } finally {
        // Clean up
        await scraper.cleanup();
        logger.info('Tournament scraper cleaned up', {}, 'TestScript');
    }
}

// Run the test if this script is executed directly
if (require.main === module) {
    testEnhancedTournamentScraper()
        .then(() => {
            logger.info('Test script completed successfully', {}, 'TestScript');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Test script failed', error as Error, {}, 'TestScript');
            process.exit(1);
        });
}

export { testEnhancedTournamentScraper };
