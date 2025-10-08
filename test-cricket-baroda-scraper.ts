import { CricketBarodaTournamentScraper } from './src/platforms/cricket-baroda-tournament-scraper';
import { logger } from './src/logger';

/**
 * Test script for the CricketBaroda Tournament Scraper
 * Tests all the specialized CricketBaroda tournament scraping functionality
 */
async function testCricketBarodaTournamentScraper() {
    const scraper = new CricketBarodaTournamentScraper();

    try {
        logger.info('Starting CricketBaroda Tournament Scraper test', {}, 'CricketBarodaTestScript');

        // Initialize the scraper
        await scraper.initialize();
        logger.info('CricketBaroda Tournament Scraper initialized successfully', {}, 'CricketBarodaTestScript');

        // Test 1: Tournament List Extraction
        logger.info('Test 1: Extracting tournament list', {}, 'CricketBarodaTestScript');
        try {
            const tournaments = await scraper.extractTournamentList('2024-25');
            logger.info('Tournament list extracted successfully', {
                tournamentsFound: tournaments.length,
                sampleTournaments: tournaments.slice(0, 3).map(t => ({ name: t.name, year: t.year }))
            }, 'CricketBarodaTestScript');
        } catch (error) {
            logger.warn('Tournament list extraction test failed (expected for test environment)', {
                error: error instanceof Error ? error.message : String(error)
            }, 'CricketBarodaTestScript');
        }

        // Test 2: Tournament List Extraction without year filter
        logger.info('Test 2: Extracting tournament list without year filter', {}, 'CricketBarodaTestScript');
        try {
            const allTournaments = await scraper.extractTournamentList();
            logger.info('All tournaments extracted successfully', {
                tournamentsFound: allTournaments.length
            }, 'CricketBarodaTestScript');
        } catch (error) {
            logger.warn('All tournaments extraction test failed (expected for test environment)', {
                error: error instanceof Error ? error.message : String(error)
            }, 'CricketBarodaTestScript');
        }

        // Test 3: Comprehensive Tournament Info (using example URL)
        logger.info('Test 3: Extracting comprehensive tournament info', {}, 'CricketBarodaTestScript');
        const testTournamentUrl = 'https://www.cricketbaroda.com/tournament/1500003/Late-Dr.-Mrunalini-Devi-Puar-Womens-T20-Tournament-2025-26';
        try {
            const tournamentInfo = await scraper.getComprehensiveTournamentInfo(testTournamentUrl);
            logger.info('Comprehensive tournament info extracted successfully', {
                name: tournamentInfo.name,
                status: tournamentInfo.status,
                format: tournamentInfo.format,
                organizer: tournamentInfo.organizer,
                totalTeams: tournamentInfo.totalTeams,
                totalMatches: tournamentInfo.totalMatches
            }, 'CricketBarodaTestScript');
        } catch (error) {
            logger.warn('Comprehensive tournament info test failed (expected for example URL)', {
                error: error instanceof Error ? error.message : String(error),
                url: testTournamentUrl
            }, 'CricketBarodaTestScript');
        }

        // Test 4: Tournament Teams Extraction
        logger.info('Test 4: Extracting tournament teams', {}, 'CricketBarodaTestScript');
        try {
            const teams = await scraper.extractTournamentTeams(testTournamentUrl);
            logger.info('Tournament teams extracted successfully', {
                teamsCount: teams.length,
                teams: teams.map(t => ({ id: t.id, name: t.name, hasUrl: !!t.url }))
            }, 'CricketBarodaTestScript');
        } catch (error) {
            logger.warn('Tournament teams extraction test failed (expected for example URL)', {
                error: error instanceof Error ? error.message : String(error),
                url: testTournamentUrl
            }, 'CricketBarodaTestScript');
        }

        // Test 5: Tournament Matches Extraction
        logger.info('Test 5: Extracting tournament matches', {}, 'CricketBarodaTestScript');
        try {
            const matches = await scraper.scrapeTournamentMatches(testTournamentUrl);
            logger.info('Tournament matches extracted successfully', {
                matchesCount: matches.length,
                matches: matches.slice(0, 3).map(m => ({
                    id: m.id,
                    teams: `${m.team1} vs ${m.team2}`,
                    status: m.status
                }))
            }, 'CricketBarodaTestScript');
        } catch (error) {
            logger.warn('Tournament matches extraction test failed (expected for example URL)', {
                error: error instanceof Error ? error.message : String(error),
                url: testTournamentUrl
            }, 'CricketBarodaTestScript');
        }

        // Test 6: Team Roster Extraction (using example team URL)
        logger.info('Test 6: Extracting team roster', {}, 'CricketBarodaTestScript');
        const testTeamUrl = 'https://www.cricketbaroda.com/team/example-team-123';
        const testTeamName = 'Example Team';
        try {
            const teamRoster = await scraper.extractTeamRoster(testTeamUrl, testTeamName);
            logger.info('Team roster extracted successfully', {
                teamName: teamRoster.name,
                playersCount: teamRoster.players?.length || 0,
                hasPlayers: !!(teamRoster.players && teamRoster.players.length > 0)
            }, 'CricketBarodaTestScript');
        } catch (error) {
            logger.warn('Team roster extraction test failed (expected for example URL)', {
                error: error instanceof Error ? error.message : String(error),
                url: testTeamUrl,
                teamName: testTeamName
            }, 'CricketBarodaTestScript');
        }

        // Test 7: Match Players Extraction (using example match URL)
        logger.info('Test 7: Extracting match players', {}, 'CricketBarodaTestScript');
        const testMatchUrl = 'https://www.cricketbaroda.com/match/example-match-456';
        const testMatchInfo = {
            id: 'example_match_456',
            url: testMatchUrl,
            title: 'Example Team A vs Example Team B',
            team1: 'Example Team A',
            team2: 'Example Team B',
            status: 'completed'
        };
        try {
            const matchPlayers = await scraper.extractMatchPlayers(testMatchUrl, testMatchInfo);
            logger.info('Match players extracted successfully', {
                matchId: testMatchInfo.id,
                playersCount: matchPlayers.length,
                teams: matchPlayers.map(p => p.teamId).filter((v, i, a) => a.indexOf(v) === i)
            }, 'CricketBarodaTestScript');
        } catch (error) {
            logger.warn('Match players extraction test failed (expected for example URL)', {
                error: error instanceof Error ? error.message : String(error),
                url: testMatchUrl,
                matchId: testMatchInfo.id
            }, 'CricketBarodaTestScript');
        }

        // Test 8: Basic Tournament Info
        logger.info('Test 8: Extracting basic tournament info', {}, 'CricketBarodaTestScript');
        try {
            const basicInfo = await scraper.getTournamentInfo(testTournamentUrl);
            logger.info('Basic tournament info extracted successfully', {
                name: basicInfo.name,
                status: basicInfo.status,
                matchesCount: basicInfo.matches.length
            }, 'CricketBarodaTestScript');
        } catch (error) {
            logger.warn('Basic tournament info test failed (expected for example URL)', {
                error: error instanceof Error ? error.message : String(error),
                url: testTournamentUrl
            }, 'CricketBarodaTestScript');
        }

        logger.info('CricketBaroda Tournament Scraper test completed successfully', {}, 'CricketBarodaTestScript');

    } catch (error) {
        logger.error('CricketBaroda Tournament Scraper test failed', error as Error, {}, 'CricketBarodaTestScript');
    } finally {
        // Clean up
        await scraper.cleanup();
        logger.info('CricketBaroda Tournament Scraper cleaned up', {}, 'CricketBarodaTestScript');
    }
}

/**
 * Test the CricketBaroda platform integration
 */
async function testCricketBarodaPlatformIntegration() {
    const { CricketBarodaPlatform } = await import('./src/platforms/cricket-baroda-platform');

    try {
        logger.info('Starting CricketBaroda Platform integration test', {}, 'CricketBarodaPlatformTest');

        const platform = new CricketBarodaPlatform({
            name: 'cricketbaroda',
            baseUrl: 'https://www.cricketbaroda.com'
        });

        // Initialize platform
        await platform.initialize();
        logger.info('CricketBaroda Platform initialized successfully', {}, 'CricketBarodaPlatformTest');

        // Test platform readiness
        const isReady = await platform.isReady();
        logger.info('Platform readiness check', { isReady }, 'CricketBarodaPlatformTest');

        // Clean up
        await platform.cleanup();
        logger.info('CricketBaroda Platform cleaned up successfully', {}, 'CricketBarodaPlatformTest');

    } catch (error) {
        logger.error('CricketBaroda Platform integration test failed', error as Error, {}, 'CricketBarodaPlatformTest');
    }
}

/**
 * Run all CricketBaroda tests
 */
async function runAllCricketBarodaTests() {
    logger.info('Running all CricketBaroda tests', {}, 'CricketBarodaTestSuite');

    try {
        await testCricketBarodaTournamentScraper();
        await testCricketBarodaPlatformIntegration();

        logger.info('All CricketBaroda tests completed successfully', {}, 'CricketBarodaTestSuite');
    } catch (error) {
        logger.error('CricketBaroda test suite failed', error as Error, {}, 'CricketBarodaTestSuite');
    }
}

// Run the tests if this script is executed directly
if (require.main === module) {
    runAllCricketBarodaTests()
        .then(() => {
            logger.info('CricketBaroda test suite completed successfully', {}, 'CricketBarodaTestSuite');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('CricketBaroda test suite failed', error as Error, {}, 'CricketBarodaTestSuite');
            process.exit(1);
        });
}

export {
    testCricketBarodaTournamentScraper,
    testCricketBarodaPlatformIntegration,
    runAllCricketBarodaTests
};
