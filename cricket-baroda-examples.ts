import { CricketBarodaTournamentScraper } from './src/platforms/cricket-baroda-tournament-scraper';
import { CricketBarodaPlatform } from './src/platforms/cricket-baroda-platform';
import { DataPipeline } from './src/platforms/data-pipeline';
import { logger } from './src/logger';

/**
 * Example usage of CricketBaroda Tournament Scraper
 *
 * This script demonstrates how to use the specialized CricketBaroda tournament scraper
 * to extract comprehensive tournament data from CricketBaroda website.
 */
async function cricketBarodaTournamentExample() {
    logger.info('Starting CricketBaroda Tournament Scraper Example', {}, 'CricketBarodaExample');

    const scraper = new CricketBarodaTournamentScraper();

    try {
        // Initialize the scraper
        await scraper.initialize();

        // Example 1: Extract tournament list with year filtering
        logger.info('Example 1: Extracting tournaments for 2024-25 season', {}, 'CricketBarodaExample');
        const tournaments2024 = await scraper.extractTournamentList('2024-25');
        logger.info('Found tournaments', {
            count: tournaments2024.length,
            tournaments: tournaments2024.map(t => ({ name: t.name, url: t.url }))
        }, 'CricketBarodaExample');

        // Example 2: Get comprehensive tournament information
        if (tournaments2024.length > 0) {
            const firstTournament = tournaments2024[0];
            logger.info('Example 2: Getting comprehensive tournament info', { tournament: firstTournament.name }, 'CricketBarodaExample');

            const tournamentInfo = await scraper.getComprehensiveTournamentInfo(firstTournament.url);
            logger.info('Tournament details', {
                name: tournamentInfo.name,
                status: tournamentInfo.status,
                format: tournamentInfo.format,
                teamsCount: tournamentInfo.totalTeams,
                matchesCount: tournamentInfo.totalMatches,
                organizer: tournamentInfo.organizer,
                venue: tournamentInfo.venue
            }, 'CricketBarodaExample');

            // Example 3: Extract participating teams
            logger.info('Example 3: Extracting participating teams', { tournament: firstTournament.name }, 'CricketBarodaExample');
            const teams = await scraper.extractTournamentTeams(firstTournament.url);
            logger.info('Participating teams', {
                count: teams.length,
                teams: teams.map(t => ({ id: t.id, name: t.name, hasUrl: !!t.url }))
            }, 'CricketBarodaExample');

            // Example 4: Extract team rosters (for teams with URLs)
            for (const team of teams.slice(0, 2)) { // Process first 2 teams as example
                if (team.url) {
                    logger.info('Example 4: Extracting team roster', { teamName: team.name }, 'CricketBarodaExample');
                    try {
                        const roster = await scraper.extractTeamRoster(team.url, team.name);
                        logger.info('Team roster extracted', {
                            teamName: roster.name,
                            playersCount: roster.players?.length || 0,
                            samplePlayers: roster.players?.slice(0, 3).map(p => ({ name: p.name, role: p.role })) || []
                        }, 'CricketBarodaExample');
                    } catch (error) {
                        logger.warn('Failed to extract roster for team', {
                            teamName: team.name,
                            error: error instanceof Error ? error.message : String(error)
                        }, 'CricketBarodaExample');
                    }
                }
            }

            // Example 5: Extract all matches
            logger.info('Example 5: Extracting tournament matches', { tournament: firstTournament.name }, 'CricketBarodaExample');
            const matches = await scraper.scrapeTournamentMatches(firstTournament.url);
            logger.info('Tournament matches', {
                count: matches.length,
                sampleMatches: matches.slice(0, 3).map(m => ({
                    id: m.id,
                    teams: `${m.team1} vs ${m.team2}`,
                    status: m.status,
                    date: m.date,
                    venue: m.venue
                }))
            }, 'CricketBarodaExample');

            // Example 6: Extract players from a specific match
            if (matches.length > 0) {
                const firstMatch = matches[0];
                logger.info('Example 6: Extracting match players', {
                    matchId: firstMatch.id,
                    teams: `${firstMatch.team1} vs ${firstMatch.team2}`
                }, 'CricketBarodaExample');

                try {
                    const matchPlayers = await scraper.extractMatchPlayers(firstMatch.url, firstMatch);
                    logger.info('Match players extracted', {
                        count: matchPlayers.length,
                        roles: matchPlayers.reduce((acc, player) => {
                            acc[player.role] = (acc[player.role] || 0) + 1;
                            return acc;
                        }, {} as Record<string, number>),
                        samplePlayers: matchPlayers.slice(0, 5).map(p => ({
                            name: p.name,
                            role: p.role,
                            isCaptain: p.isCaptain,
                            isWicketKeeper: p.isWicketKeeper
                        }))
                    }, 'CricketBarodaExample');
                } catch (error) {
                    logger.warn('Failed to extract match players', {
                        matchId: firstMatch.id,
                        error: error instanceof Error ? error.message : String(error)
                    }, 'CricketBarodaExample');
                }
            }
        }

        logger.info('CricketBaroda Tournament Scraper Example completed successfully', {}, 'CricketBarodaExample');

    } catch (error) {
        logger.error('CricketBaroda Tournament Scraper Example failed', error as Error, {}, 'CricketBarodaExample');
    } finally {
        // Clean up
        await scraper.cleanup();
    }
}

/**
 * Example of using CricketBaroda Platform with Data Pipeline
 */
async function cricketBarodaPlatformExample() {
    logger.info('Starting CricketBaroda Platform Example', {}, 'CricketBarodaPlatformExample');

    try {
        // Create CricketBaroda platform
        const platform = new CricketBarodaPlatform({
            name: 'cricketbaroda',
            baseUrl: 'https://www.cricketbaroda.com'
        });

        // Initialize platform
        await platform.initialize();

        // Create data pipeline configuration
        const pipelineConfig = {
            platform: 'cricketbaroda',
            mode: 'tournament' as const,
            urls: [
                'https://www.cricketbaroda.com/tournament/1500003/Late-Dr.-Mrunalini-Devi-Puar-Womens-T20-Tournament-2025-26'
            ],
            processing: {
                validate: true,
                transform: true,
                sendToApi: false, // Set to true to send to API
                storeLocally: true,
                continueOnError: true
            },
            errorHandling: {
                continueOnError: true,
                maxRetries: 3,
                retryDelay: 1000
            },
            output: {
                directory: './output',
                filePattern: 'cricketbaroda-{type}-{id}-{timestamp}.json'
            }
        };

        // Create and execute data pipeline
        const pipeline = new DataPipeline(platform, pipelineConfig);
        const result = await pipeline.execute();

        logger.info('Data pipeline execution completed', {
            success: result.success,
            message: result.message,
            tournamentsProcessed: result.results.tournamentsProcessed,
            matchesFound: result.results.matchesFound,
            matchesProcessed: result.results.matchesProcessed,
            teamsExtracted: result.results.teamsExtracted,
            tournamentInfos: result.results.tournamentInfos
        }, 'CricketBarodaPlatformExample');

        // Clean up platform
        await platform.cleanup();

        logger.info('CricketBaroda Platform Example completed successfully', {}, 'CricketBarodaPlatformExample');

    } catch (error) {
        logger.error('CricketBaroda Platform Example failed', error as Error, {}, 'CricketBarodaPlatformExample');
    }
}

/**
 * Complete workflow example: From tournament discovery to match processing
 */
async function completeCricketBarodaWorkflow() {
    logger.info('Starting Complete CricketBaroda Workflow', {}, 'CompleteWorkflow');

    const scraper = new CricketBarodaTournamentScraper();

    try {
        await scraper.initialize();

        // Step 1: Discover tournaments for a specific year
        logger.info('Step 1: Discovering tournaments for 2024-25', {}, 'CompleteWorkflow');
        const tournaments = await scraper.extractTournamentList('2024-25');

        if (tournaments.length === 0) {
            logger.warn('No tournaments found for 2024-25', {}, 'CompleteWorkflow');
            return;
        }

        // Step 2: Process each tournament
        for (const tournament of tournaments.slice(0, 2)) { // Process first 2 tournaments
            logger.info('Step 2: Processing tournament', { name: tournament.name }, 'CompleteWorkflow');

            try {
                // Get comprehensive tournament info
                const tournamentInfo = await scraper.getComprehensiveTournamentInfo(tournament.url);

                // Get teams
                const teams = await scraper.extractTournamentTeams(tournament.url);

                // Get matches
                const matches = await scraper.scrapeTournamentMatches(tournament.url);

                logger.info('Tournament processed successfully', {
                    name: tournamentInfo.name,
                    teamsCount: teams.length,
                    matchesCount: matches.length,
                    status: tournamentInfo.status
                }, 'CompleteWorkflow');

                // Step 3: Process a sample match (first match)
                if (matches.length > 0) {
                    const sampleMatch = matches[0];
                    logger.info('Step 3: Processing sample match', {
                        matchId: sampleMatch.id,
                        teams: `${sampleMatch.team1} vs ${sampleMatch.team2}`
                    }, 'CompleteWorkflow');

                    const matchPlayers = await scraper.extractMatchPlayers(sampleMatch.url, sampleMatch);
                    logger.info('Sample match processed', {
                        playersCount: matchPlayers.length
                    }, 'CompleteWorkflow');
                }

            } catch (error) {
                logger.warn('Failed to process tournament', {
                    name: tournament.name,
                    error: error instanceof Error ? error.message : String(error)
                }, 'CompleteWorkflow');
            }
        }

        logger.info('Complete CricketBaroda Workflow finished successfully', {}, 'CompleteWorkflow');

    } catch (error) {
        logger.error('Complete CricketBaroda Workflow failed', error as Error, {}, 'CompleteWorkflow');
    } finally {
        await scraper.cleanup();
    }
}

// Export functions for use in other scripts
export {
    cricketBarodaTournamentExample,
    cricketBarodaPlatformExample,
    completeCricketBarodaWorkflow
};

// Run examples if script is executed directly
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--tournament')) {
        cricketBarodaTournamentExample();
    } else if (args.includes('--platform')) {
        cricketBarodaPlatformExample();
    } else if (args.includes('--workflow')) {
        completeCricketBarodaWorkflow();
    } else {
        // Run all examples
        Promise.all([
            cricketBarodaTournamentExample(),
            cricketBarodaPlatformExample(),
            completeCricketBarodaWorkflow()
        ]).then(() => {
            logger.info('All CricketBaroda examples completed', {}, 'CricketBarodaExamples');
        }).catch((error) => {
            logger.error('CricketBaroda examples failed', error as Error, {}, 'CricketBarodaExamples');
        });
    }
}
