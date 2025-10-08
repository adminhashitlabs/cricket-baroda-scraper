import { CricketBarodaTournamentDiscovery } from './platforms/cricket-baroda-tournament-discovery';
import { logger } from './logger';

/**
 * Test script for comprehensive tournament discovery
 */
async function testTournamentDiscovery() {
    const discovery = new CricketBarodaTournamentDiscovery();

    try {
        logger.info('Starting comprehensive tournament discovery test', {}, 'DiscoveryTest');

        // Initialize the discovery system
        await discovery.initialize();
        logger.info('Tournament discovery system initialized', {}, 'DiscoveryTest');

        console.log('🏏 Starting comprehensive tournament discovery...\n');

        // Discover all tournaments
        const results = await discovery.discoverAllTournaments();

        console.log('📊 DISCOVERY RESULTS SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Seasons Processed: ${results.length}`);
        console.log(`Total Tournaments Found: ${results.reduce((sum, r) => sum + r.totalTournaments, 0)}`);
        console.log('');

        // Display results by season
        results.forEach((seasonResult, index) => {
            console.log(`🏆 SEASON ${index + 1}: ${seasonResult.season} (${seasonResult.year})`);
            console.log(`   Pages: ${seasonResult.totalPages}`);
            console.log(`   Tournaments: ${seasonResult.totalTournaments}`);
            console.log('');

            if (seasonResult.tournaments.length > 0) {
                console.log('   TOURNAMENTS:');
                seasonResult.tournaments.forEach((tournament, tIndex) => {
                    console.log(`   ${tIndex + 1}. ${tournament.name}`);
                    if (tournament.url) {
                        console.log(`      URL: ${tournament.url}`);
                    }
                    if (tournament.id) {
                        console.log(`      ID: ${tournament.id}`);
                    }
                    if (tournament.type) {
                        console.log(`      Type: ${tournament.type}`);
                    }
                    if (tournament.category) {
                        console.log(`      Category: ${tournament.category}`);
                    }
                    if (tournament.startDate && tournament.endDate) {
                        console.log(`      Dates: ${tournament.startDate} - ${tournament.endDate}`);
                    }
                    console.log('');
                });
            } else {
                console.log('   No tournaments found for this season');
            }
            console.log('');
        });

        // Search for specific tournament
        console.log('🔍 SEARCHING FOR SPECIFIC TOURNAMENT');
        console.log('='.repeat(40));

        const targetTournament = await discovery.searchTournament('Late Mama Saheb Ghorpade');
        if (targetTournament) {
            console.log('✅ Found target tournament:');
            console.log(`   Name: ${targetTournament.name}`);
            console.log(`   Season: ${targetTournament.season}`);
            console.log(`   Year: ${targetTournament.year}`);
            if (targetTournament.url) {
                console.log(`   URL: ${targetTournament.url}`);
            }
            if (targetTournament.type) {
                console.log(`   Type: ${targetTournament.type}`);
            }
            if (targetTournament.category) {
                console.log(`   Category: ${targetTournament.category}`);
            }
        } else {
            console.log('❌ Target tournament not found');
        }

        logger.info('Tournament discovery test completed', {
            seasonsProcessed: results.length,
            totalTournaments: results.reduce((sum, r) => sum + r.totalTournaments, 0)
        }, 'DiscoveryTest');

    } catch (error) {
        logger.error('Tournament discovery test failed', error as Error, {}, 'DiscoveryTest');
        console.error('❌ Discovery test failed:', error);
    } finally {
        await discovery.cleanup();
        logger.info('Tournament discovery system cleaned up', {}, 'DiscoveryTest');
    }
}

/**
 * Test script for year-specific tournament discovery
 */
async function testYearSpecificDiscovery(year: string) {
    const discovery = new CricketBarodaTournamentDiscovery();

    try {
        logger.info(`Starting year-specific discovery test for ${year}`, { year }, 'YearTest');

        await discovery.initialize();

        console.log(`🏏 Discovering tournaments for year: ${year}\n`);

        const tournaments = await discovery.getTournamentsByYear(year);

        console.log(`📊 TOURNAMENTS FOR ${year}`);
        console.log('='.repeat(40));
        console.log(`Total Tournaments: ${tournaments.length}`);
        console.log('');

        if (tournaments.length > 0) {
            tournaments.forEach((tournament, index) => {
                console.log(`${index + 1}. ${tournament.name}`);
                if (tournament.url) {
                    console.log(`   URL: ${tournament.url}`);
                }
                if (tournament.type) {
                    console.log(`   Type: ${tournament.type}`);
                }
                if (tournament.category) {
                    console.log(`   Category: ${tournament.category}`);
                }
                console.log('');
            });
        } else {
            console.log('No tournaments found for this year');
        }

        logger.info(`Year-specific discovery test completed for ${year}`, {
            year,
            tournamentsFound: tournaments.length
        }, 'YearTest');

    } catch (error) {
        logger.error(`Year-specific discovery test failed for ${year}`, error as Error, { year }, 'YearTest');
        console.error('❌ Year-specific test failed:', error);
    } finally {
        await discovery.cleanup();
    }
}

// Run the comprehensive test
console.log('🚀 Starting CricketBaroda Tournament Discovery Test\n');

// Uncomment the test you want to run:
// testTournamentDiscovery(); // Comprehensive discovery
testYearSpecificDiscovery('2021-22'); // Year-specific discovery
