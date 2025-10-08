const puppeteer = require('puppeteer');

async function extractCompleteMatchData() {
    console.log('🚀 Starting complete match data extraction for Islam Gymkhana vs K.M.C.A...');

    let browser;
    try {
        browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        // Navigate to tournaments page
        console.log('📍 Navigating to tournaments page...');
        await page.goto('https://www.cricketbaroda.com/match-center/tournaments', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Wait for season selector
        await page.waitForSelector('select.sc-bc4a329-1.grmngK.form-select', { timeout: 10000 });

        // Select 2021-22 season
        await page.select('select.sc-bc4a329-1.grmngK.form-select', '17');

        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 8000));

        // Find and process tournament DIVs
        const tournamentDivs = await page.$$('div.sc-6d90bb31-0.hZyYvw');
        const tournamentIds = [];

        console.log('🔍 Extracting tournament IDs...');

        for (let i = 0; i < tournamentDivs.length; i++) {
            const divText = await tournamentDivs[i].evaluate(el => el.textContent?.trim() || '');

            if (divText.includes('U-19') && divText.includes('Ghorpade')) {
                console.log(`🎯 Processing: ${divText.substring(0, 80)}...`);

                try {
                    // Click the DIV to navigate to tournament page
                    await tournamentDivs[i].click();

                    // Wait for navigation
                    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });

                    // Extract tournament ID from URL
                    const currentUrl = page.url();
                    const idMatch = currentUrl.match(/\/tournament\/(\d+)\//);

                    if (idMatch) {
                        const tournamentId = idMatch[1];
                        console.log(`✅ Found tournament ID: ${tournamentId}`);
                        console.log(`   URL: ${currentUrl}`);

                        tournamentIds.push({
                            id: tournamentId,
                            name: divText,
                            url: currentUrl
                        });

                        // Go back to tournaments page for next tournament
                        await page.goto('https://www.cricketbaroda.com/match-center/tournaments', {
                            waitUntil: 'domcontentloaded',
                            timeout: 30000
                        });

                        // Re-select season
                        await page.waitForSelector('select.sc-bc4a329-1.grmngK.form-select', { timeout: 10000 });
                        await page.select('select.sc-bc4a329-1.grmngK.form-select', '17');
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }

                } catch (error) {
                    console.log(`❌ Error processing tournament: ${error.message}`);
                }
            }
        }

        // Now extract match data from each tournament
        console.log('\n📊 Extracting match data from tournaments...');

        const allMatches = [];

        for (const tournament of tournamentIds) {
            console.log(`\n🏏 Processing tournament: ${tournament.name.split('Tournament')[0].trim()}`);

            try {
                // Navigate to tournament page
                await page.goto(tournament.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // Wait for content to load
                await new Promise(resolve => setTimeout(resolve, 5000));

                // Extract all match information
                const matches = await page.evaluate(() => {
                    const matchData = [];

                    // Look for match cards and scorecards
                    const matchElements = document.querySelectorAll('div, span, p, td, tr');

                    for (const element of matchElements) {
                        const text = element.textContent?.trim() || '';

                        // Look for matches involving K.M.C.A or Islam Gymkhana
                        const hasIslamGymkhana = text.includes('Islam Gymkhana') || text.includes('Islam Gym');
                        const hasKMCA = text.includes('K.M.C.A') || text.includes('KMC') || text.includes('K.M.C.A.');

                        if ((hasIslamGymkhana || hasKMCA) && text.length > 20) {
                            // Extract match details
                            const matchInfo = {
                                text: text,
                                hasIslamGymkhana: hasIslamGymkhana,
                                hasKMCA: hasKMCA,
                                elementType: element.tagName.toLowerCase(),
                                className: element.className || ''
                            };

                            // Try to extract structured data
                            const scoreMatch = text.match(/(\d+\/\d+|\d+)\s*(?:vs|Vs|VS|-)\s*(\d+\/\d+|\d+)/);
                            if (scoreMatch) {
                                matchInfo.score = scoreMatch[0];
                            }

                            // Extract result
                            const resultMatch = text.match(/(won by|Match Drawn|abandoned|cancelled)/i);
                            if (resultMatch) {
                                matchInfo.result = resultMatch[0];
                            }

                            // Extract date
                            const dateMatch = text.match(/(\d{1,2}\s+[A-Za-z]+|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+[A-Za-z]+,\s+\d{4})/);
                            if (dateMatch) {
                                matchInfo.date = dateMatch[0];
                            }

                            // Extract venue
                            const venueMatch = text.match(/(DN Hall|BCA Cricket|Postal Training|Alembic|MPCG)/);
                            if (venueMatch) {
                                matchInfo.venue = venueMatch[0];
                            }

                            matchData.push(matchInfo);
                        }
                    }

                    return matchData;
                });

                if (matches.length > 0) {
                    console.log(`✅ Found ${matches.length} relevant matches:`);

                    matches.forEach((match, index) => {
                        console.log(`\n🏆 Match ${index + 1}:`);
                        console.log(`   Content: ${match.text}`);
                        console.log(`   Teams: ${match.hasIslamGymkhana ? 'Islam Gymkhana' : ''} ${match.hasKMCA ? 'K.M.C.A' : ''}`.trim());
                        if (match.score) console.log(`   Score: ${match.score}`);
                        if (match.result) console.log(`   Result: ${match.result}`);
                        if (match.date) console.log(`   Date: ${match.date}`);
                        if (match.venue) console.log(`   Venue: ${match.venue}`);
                        console.log(`   Element: ${match.elementType}${match.className ? '.' + match.className : ''}`);

                        allMatches.push({
                            tournament: tournament.name,
                            ...match
                        });
                    });
                } else {
                    console.log('❌ No matches found on this tournament page');
                }

            } catch (error) {
                console.log(`❌ Error fetching matches: ${error.message}`);
            }
        }

        // Final summary
        console.log('\n🎉 EXTRACTION COMPLETE');
        console.log('=' .repeat(60));

        if (allMatches.length > 0) {
            console.log(`\n✅ SUCCESS! Found ${allMatches.length} matches involving Islam Gymkhana and/or K.M.C.A:`);

            // Group by tournament
            const byTournament = {};
            allMatches.forEach(match => {
                if (!byTournament[match.tournament]) {
                    byTournament[match.tournament] = [];
                }
                byTournament[match.tournament].push(match);
            });

            Object.keys(byTournament).forEach(tournamentName => {
                console.log(`\n🏆 ${tournamentName}`);
                console.log('-'.repeat(80));

                byTournament[tournamentName].forEach((match, index) => {
                    console.log(`\n${index + 1}. ${match.hasIslamGymkhana && match.hasKMCA ? 'Islam Gymkhana vs K.M.C.A' : match.hasIslamGymkhana ? 'Islam Gymkhana match' : 'K.M.C.A match'}`);
                    if (match.score) console.log(`   Score: ${match.score}`);
                    if (match.result) console.log(`   Result: ${match.result}`);
                    if (match.date) console.log(`   Date: ${match.date}`);
                    if (match.venue) console.log(`   Venue: ${match.venue}`);
                    console.log(`   Details: ${match.text.substring(0, 150)}${match.text.length > 150 ? '...' : ''}`);
                });
            });

            // Summary statistics
            const islamGymkhanaMatches = allMatches.filter(m => m.hasIslamGymkhana).length;
            const kmcaMatches = allMatches.filter(m => m.hasKMCA).length;
            const bothTeamsMatches = allMatches.filter(m => m.hasIslamGymkhana && m.hasKMCA).length;

            console.log('\n📈 SUMMARY STATISTICS:');
            console.log(`   Total matches found: ${allMatches.length}`);
            console.log(`   Matches with Islam Gymkhana: ${islamGymkhanaMatches}`);
            console.log(`   Matches with K.M.C.A: ${kmcaMatches}`);
            console.log(`   Direct Islam Gymkhana vs K.M.C.A matches: ${bothTeamsMatches}`);

        } else {
            console.log('\n❌ No matches found involving Islam Gymkhana or K.M.C.A.');
            console.log('\n🔍 Analysis:');
            console.log('- Tournament discovery: ✅ Working');
            console.log('- Tournament navigation: ✅ Working');
            console.log('- Match data extraction: ❌ No matches found');
            console.log('\n💡 Possible reasons:');
            console.log('- Teams may not have participated in these tournaments');
            console.log('- Team names might be formatted differently');
            console.log('- Matches might be in a different section of the page');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        console.log('\n🧹 Keeping browser open for inspection...');
    }
}

extractCompleteMatchData();
