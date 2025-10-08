import { CricketBarodaTournamentScraper } from './src/platforms/cricket-baroda-tournament-scraper';
import { logger } from './src/logger';

/**
 * Test script to find and extract score from a specific 2021 tournament match
 */
async function test2021TournamentMatch() {
    const scraper = new CricketBarodaTournamentScraper();

    try {
        logger.info('Testing 2021 tournament match extraction', {}, '2021Test');

        // Initialize the scraper
        await scraper.initialize();
        logger.info('Scraper initialized successfully', {}, '2021Test');

        // Try direct URL construction for 2021 tournaments
        console.log('� Trying direct URL construction for 2021 U-19 Late Mama Saheb Ghorpade tournament...');

        const possibleIds = [
            '1500001', '1500002', '1500003', '1500004', '1500005',
            '1500006', '1500007', '1500008', '1500009', '1500010',
            '2021', '202101', '202102', '202103', '202104', '202105'
        ];

        let tournament2021Url: string | null = null;
        let tournamentTitle: string = '';

        for (const id of possibleIds) {
            try {
                const directUrl = `https://www.cricketbaroda.com/tournament/${id}`;
                console.log(`Trying: ${directUrl}`);

                await scraper['page']!.goto(directUrl, { waitUntil: 'networkidle2', timeout: 5000 });

                const tournamentInfo = await scraper['page']!.evaluate(() => {
                    const title = document.title.toLowerCase();
                    const bodyText = document.body.textContent?.toLowerCase() || '';

                    const hasGhorpade = title.includes('ghorpade') || bodyText.includes('ghorpade');
                    const hasMamaSaheb = title.includes('mama saheb') || bodyText.includes('mama saheb');
                    const has2021 = title.includes('2021') || bodyText.includes('2021');
                    const hasU19 = title.includes('u-19') || bodyText.includes('u-19') || bodyText.includes('under 19');

                    return {
                        title: document.title,
                        hasGhorpade,
                        hasMamaSaheb,
                        has2021,
                        hasU19,
                        isCorrectTournament: hasGhorpade && hasMamaSaheb && has2021 && hasU19
                    };
                });

                console.log(`   Title: ${tournamentInfo.title}`);
                console.log(`   Ghorpade: ${tournamentInfo.hasGhorpade}, Mama Saheb: ${tournamentInfo.hasMamaSaheb}, 2021: ${tournamentInfo.has2021}, U-19: ${tournamentInfo.hasU19}`);

                if (tournamentInfo.isCorrectTournament) {
                    tournament2021Url = directUrl;
                    tournamentTitle = tournamentInfo.title;
                    console.log(`✅ Found the correct tournament: ${tournamentTitle}`);
                    break;
                }

            } catch (error) {
                console.log(`❌ Failed to load: ${id}`);
            }
        }

        if (!tournament2021Url) {
            console.log('❌ Could not find the U-19 Late Mama Saheb Ghorpade tournament via direct URLs');
            console.log('💡 The tournament data might not be available or the ID pattern is different');

            // Let's try to find what tournaments are actually available
            console.log('\n🔍 Checking what tournaments are currently available...');
            await scraper['page']!.goto('https://www.cricketbaroda.com/match-center/tournaments', { waitUntil: 'networkidle2' });

            const availableTournaments = await scraper['page']!.evaluate(() => {
                const tournaments: any[] = [];
                const links = document.querySelectorAll('a[href*="tournament"]');

                for (const link of links) {
                    const anchor = link as HTMLAnchorElement;
                    const href = anchor.href;
                    const text = link.textContent?.trim() || '';

                    if (href && text && href.includes('/tournament/')) {
                        tournaments.push({
                            name: text,
                            url: href,
                            year: href.match(/(\d{4})/)?.[1] || 'Unknown'
                        });
                    }
                }

                return tournaments.slice(0, 20); // Return first 20
            });

            console.log(`\n📋 AVAILABLE TOURNAMENTS (${availableTournaments.length} found):`);
            console.log('='.repeat(70));
            availableTournaments.forEach((tournament, index) => {
                console.log(`${index + 1}. ${tournament.name}`);
                console.log(`   Year: ${tournament.year}`);
                console.log(`   URL: ${tournament.url}`);
                console.log('');
            });

            return;
        }

        // Now navigate to the tournament page and extract match data
        console.log(`\n� Navigating to tournament: ${tournament2021Url}`);
        console.log(`   Title: ${tournamentTitle}`);
        await scraper['page']!.goto(tournament2021Url, { waitUntil: 'networkidle2' });

        // Extract match data from the tournament page
        const matchData = await scraper['page']!.evaluate(() => {
            const matches: any[] = [];

            // Look for match elements - they might be in tables, cards, or lists
            const matchElements = document.querySelectorAll('table, .match-card, .match-item, [class*="match"], [class*="score"], tr, .card');

            for (const element of matchElements) {
                const text = element.textContent?.trim() || '';

                // Look for matches involving Islam Gymkhana and K.M.C.A
                if ((text.includes('Islam Gymkhana') || text.includes('Islam Gym')) &&
                    (text.includes('K.M.C.A') || text.includes('KMC') || text.includes('K.M.C.A.'))) {

                    // Extract score information - look for patterns like "123/4" or "123"
                    const scoreMatch = text.match(/(\d+\/\d+|\d+)\s*(?:vs|Vs|VS|-)\s*(\d+\/\d+|\d+)/);
                    const score = scoreMatch ? `${scoreMatch[1]} vs ${scoreMatch[2]}` : 'Score not found';

                    matches.push({
                        teams: text.match(/(Islam Gymkhana.*?K\.M\.C\.A\.?|K\.M\.C\.A\.?.*?Islam Gymkhana)/)?.[0] || 'Islam Gymkhana vs K.M.C.A',
                        score: score,
                        fullText: text.substring(0, 300) + '...',
                        elementType: element.tagName.toLowerCase()
                    });
                }
            }

            // Also check for any score-related text in the page
            const bodyText = document.body.textContent || '';
            const scorePatterns = bodyText.match(/(\d+\/\d+).*?(Islam Gymkhana).*?(K\.M\.C\.A).*?(\d+\/\d+)/gi) ||
                                 bodyText.match(/(Islam Gymkhana).*?(\d+\/\d+).*?(K\.M\.C\.A).*?(\d+\/\d+)/gi);

            if (scorePatterns && scorePatterns.length > 0) {
                matches.push({
                    teams: 'Islam Gymkhana vs K.M.C.A',
                    score: scorePatterns[0],
                    source: 'body text pattern',
                    elementType: 'body'
                });
            }

            return matches;
        });

        console.log('\n📊 Match Data Results:');
        console.log('='.repeat(50));

        if (matchData.length > 0) {
            matchData.forEach((match, index) => {
                console.log(`\nMatch ${index + 1}:`);
                console.log(`   Teams: ${match.teams}`);
                console.log(`   Score: ${match.score}`);
                console.log(`   Element Type: ${match.elementType}`);
                if (match.fullText) {
                    console.log(`   Context: ${match.fullText}`);
                }
                if (match.source) {
                    console.log(`   Source: ${match.source}`);
                }
            });
        } else {
            console.log('❌ No matches found between Islam Gymkhana and K.M.C.A');
            console.log('💡 The tournament page might have a different structure or the data might not be available');

            // Debug: Show some page content to understand the structure
            const debugInfo = await scraper['page']!.evaluate(() => {
                const tables = document.querySelectorAll('table');
                const cards = document.querySelectorAll('[class*="match"], [class*="score"], [class*="card"], tr');
                const allText = document.body.textContent || '';

                return {
                    title: document.title,
                    tableCount: tables.length,
                    cardCount: cards.length,
                    bodyTextSample: allText.substring(0, 1000) + '...',
                    hasIslam: allText.includes('Islam Gymkhana'),
                    hasKMCA: allText.includes('K.M.C.A'),
                    totalLength: allText.length
                };
            });

            console.log('\n🔍 Debug Information:');
            console.log(`   Page Title: ${debugInfo.title}`);
            console.log(`   Tables Found: ${debugInfo.tableCount}`);
            console.log(`   Match Cards: ${debugInfo.cardCount}`);
            console.log(`   Total Text Length: ${debugInfo.totalLength}`);
            console.log(`   Has Islam Gymkhana: ${debugInfo.hasIslam}`);
            console.log(`   Has K.M.C.A: ${debugInfo.hasKMCA}`);
            console.log(`   Body Text Sample: ${debugInfo.bodyTextSample}`);
        }

        logger.info('2021 tournament test completed', {
            tournamentUrl: tournament2021Url,
            tournamentTitle,
            matchesFound: matchData.length
        }, '2021Test');

    } catch (error) {
        logger.error('2021 tournament test failed', error as Error, {}, '2021Test');
        console.error('❌ Error during tournament testing:', error);
    } finally {
        await scraper.cleanup();
    }
}

// Run the test
test2021TournamentMatch().then(() => {
    console.log('\n✅ Test completed!');
}).catch((error) => {
    console.error('❌ Test failed with error:', error);
});
