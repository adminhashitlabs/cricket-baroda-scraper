const { CricketBarodaTournamentScraper } = require('./dist/src/platforms/cricket-baroda-tournament-scraper');
const { logger } = require('./dist/src/logger');

async function extractTargetMatches() {
    console.log('🚀 Starting target tournament match extraction...');

    const scraper = new CricketBarodaTournamentScraper();

    try {
        await scraper.initialize();
        console.log('✅ Scraper initialized');

        // Navigate to tournaments page
        const tournamentCenterUrl = 'https://www.cricketbaroda.com/match-center/tournaments';
        await scraper['page'].goto(tournamentCenterUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('✅ Navigated to tournaments page');

        // Wait for season selector
        await scraper['page'].waitForSelector('select.sc-bc4a329-1.grmngK.form-select', { timeout: 10000 });

        // Get available seasons
        const availableSeasons = await scraper['page'].evaluate(() => {
            const seasonSelect = document.querySelector('select.sc-bc4a329-1.grmngK.form-select');
            if (!seasonSelect) return [];

            const seasons = [];
            for (let i = 0; i < seasonSelect.options.length; i++) {
                const option = seasonSelect.options[i];
                seasons.push({
                    value: option.value,
                    text: option.text
                });
            }
            return seasons;
        });

        console.log(`📅 Found ${availableSeasons.length} seasons`);

        // Find 2021-22 season
        const season2021 = availableSeasons.find(s => s.text === '2021-22');
        if (!season2021) {
            console.log('❌ 2021-22 season not found');
            return;
        }

        console.log(`🎯 Found 2021-22 season: ${season2021.text} (${season2021.value})`);

        // Select 2021-22 season
        await scraper['page'].select('select.sc-bc4a329-1.grmngK.form-select', season2021.value);
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('✅ Selected 2021-22 season');

        // Extract tournaments
        const allTournaments = await scraper['page'].evaluate(() => {
            const tournaments = [];

            // Look for tournament links
            const tournamentLinks = document.querySelectorAll('a[href*="tournament"]');

            for (const link of tournamentLinks) {
                const anchor = link;
                const href = anchor.href;
                const text = link.textContent?.trim() || '';

                // Extract tournament ID from URL
                const urlMatch = href.match(/\/tournament\/(\d+)/);
                const tournamentId = urlMatch ? urlMatch[1] : '';

                // Look for U-19 Late Mama Saheb Ghorpade tournaments
                if (text.includes('U-19') && text.includes('Late Mama Saheb') && text.includes('Ghorpade')) {
                    tournaments.push({
                        name: text,
                        url: href,
                        id: tournamentId
                    });
                }
            }

            return tournaments;
        });

        console.log(`🏆 Found ${allTournaments.length} U-19 Late Mama Saheb Ghorpade tournaments:`);
        allTournaments.forEach((tournament, index) => {
            console.log(`${index + 1}. ${tournament.name}`);
            console.log(`   URL: ${tournament.url}`);
            console.log(`   ID: ${tournament.id}`);
            console.log('');
        });

        // Extract matches from each tournament
        for (const tournament of allTournaments) {
            console.log(`\n🔍 Processing: ${tournament.name}`);

            try {
                const matches = await scraper.scrapeTournamentMatches(tournament.url);
                console.log(`   📊 Found ${matches.length} matches`);

                // Filter for Islam Gymkhana vs K.M.C.A matches
                const islamKmcaMatches = matches.filter(match =>
                    (match.team1?.includes('Islam Gymkhana') && match.team2?.includes('K.M.C.A')) ||
                    (match.team1?.includes('K.M.C.A') && match.team2?.includes('Islam Gymkhana'))
                );

                if (islamKmcaMatches.length > 0) {
                    console.log(`   🏏 Found ${islamKmcaMatches.length} matches between Islam Gymkhana and K.M.C.A:`);

                    islamKmcaMatches.forEach((match, index) => {
                        console.log(`      ${index + 1}. ${match.team1} vs ${match.team2}`);
                        console.log(`         Status: ${match.status || 'Unknown'}`);
                        console.log(`         URL: ${match.url || 'N/A'}`);
                        if (match.date) console.log(`         Date: ${match.date}`);
                        if (match.venue) console.log(`         Venue: ${match.venue}`);
                        if (match.result) console.log(`         Result: ${match.result}`);
                        console.log('');
                    });
                } else {
                    console.log(`   ❌ No matches found between Islam Gymkhana and K.M.C.A`);
                }

            } catch (error) {
                console.log(`   ❌ Error extracting matches: ${error.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await scraper.cleanup();
        console.log('🧹 Cleanup completed');
    }
}

extractTargetMatches();
