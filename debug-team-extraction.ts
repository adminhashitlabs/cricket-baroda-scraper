import { CricketBarodaTournamentScraper } from './src/platforms/cricket-baroda-tournament-scraper';
import { logger } from './src/logger';

async function debugTeamExtraction() {
    const scraper = new CricketBarodaTournamentScraper();
    const tournamentUrl = 'https://www.cricketbaroda.com/tournament/1500003/Late-Dr.-Mrunalini-Devi-Puar-Womens-T20-Tournament-2025-26';

    logger.info('Starting team extraction debug', {}, 'TeamDebug');

    try {
        await scraper.initialize();
        logger.info('Scraper initialized successfully', {}, 'TeamDebug');

        // Navigate to tournament page
        await scraper['page']!.goto(tournamentUrl, { waitUntil: 'networkidle2' });
        logger.info('Page loaded, extracting teams', {}, 'TeamDebug');

        // Extract teams with detailed logging
        const teams = await scraper['page']!.evaluate(() => {
            const teams: any[] = [];
            const teamNames = new Set<string>();

            console.log('Starting team extraction...');

            // Extract teams from match cards
            const matchCards = document.querySelectorAll('.match-card');
            console.log(`Found ${matchCards.length} match cards`);

            matchCards.forEach((card, matchIndex) => {
                console.log(`\nProcessing card ${matchIndex + 1}:`);

                // Try to extract from the URL which contains team names
                const link = card.querySelector('a[href*="match"]') as HTMLAnchorElement;
                if (link) {
                    const url = link.href;
                    console.log(`  URL: ${url}`);

                    // URL format: /match/123/Team1-vs-Team2
                    const urlMatch = url.match(/\/match\/\d+\/(.+)-vs-(.+)$/);
                    if (urlMatch) {
                        const team1 = decodeURIComponent(urlMatch[1]).replace(/-/g, ' ');
                        const team2 = decodeURIComponent(urlMatch[2]).replace(/-/g, ' ');

                        console.log(`  Extracted teams from URL: "${team1}" vs "${team2}"`);

                        [team1, team2].forEach(teamName => {
                            if (!teamNames.has(teamName)) {
                                teamNames.add(teamName);
                                teams.push({
                                    id: `team_${teams.length + 1}`,
                                    name: teamName,
                                    url: null,
                                    players: []
                                });
                                console.log(`  Added team: ${teamName}`);
                            }
                        });
                    } else {
                        console.log(`  No match found in URL pattern`);
                    }
                } else {
                    console.log(`  No link found in card`);
                }
            });

            console.log(`\nTotal teams found: ${teams.length}`);
            return teams;
        });

        console.log('\n🎯 FINAL RESULT:');
        console.log('================');
        console.log(`Teams found: ${teams.length}`);
        teams.forEach((team, index) => {
            console.log(`${index + 1}. ${team.name}`);
        });

        logger.info('Team extraction debug completed', {
            teamsFound: teams.length,
            teamNames: teams.map(t => t.name)
        }, 'TeamDebug');

    } catch (error) {
        logger.error('Team extraction debug failed', error as Error, {}, 'TeamDebug');
    } finally {
        await scraper.cleanup();
        logger.info('Scraper cleaned up', {}, 'TeamDebug');
    }
}

// Run the debug function
debugTeamExtraction().then(() => {
    console.log('\n✅ Team extraction debug completed!');
}).catch(error => {
    console.error('❌ Debug failed:', error);
});
