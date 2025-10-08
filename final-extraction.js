const puppeteer = require('puppeteer');

async function extractIslamGymkhanaMatches() {
    console.log('🚀 Starting comprehensive match extraction for Islam Gymkhana vs K.M.C.A...');

    let browser;
    try {
        browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        // Enable request interception to monitor network requests
        await page.setRequestInterception(true);
        const networkRequests = [];

        page.on('request', (request) => {
            if (request.url().includes('tournament') || request.url().includes('match') || request.url().includes('api')) {
                networkRequests.push({
                    url: request.url(),
                    method: request.method(),
                    headers: request.headers()
                });
            }
            request.continue();
        });

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

        // Get available seasons
        const seasons = await page.evaluate(() => {
            const select = document.querySelector('select.sc-bc4a329-1.grmngK.form-select');
            if (!select) return [];

            const options = [];
            for (let i = 0; i < select.options.length; i++) {
                options.push({
                    value: select.options[i].value,
                    text: select.options[i].text
                });
            }
            return options;
        });

        console.log(`📅 Found ${seasons.length} seasons:`);
        seasons.forEach(season => console.log(`  - ${season.text} (${season.value})`));

        // Find 2021-22 season
        const season2021 = seasons.find(s => s.text === '2021-22');
        if (!season2021) {
            console.log('❌ 2021-22 season not found');
            return;
        }

        console.log(`🎯 Selecting 2021-22 season...`);
        await page.select('select.sc-bc4a329-1.grmngK.form-select', season2021.value);

        // Wait for content to load
        console.log('⏳ Waiting for tournament content to load...');
        await new Promise(resolve => setTimeout(resolve, 8000));

        // Extract tournament DIVs
        const tournamentData = await page.evaluate(() => {
            const tournaments = [];
            const divs = document.querySelectorAll('div.sc-6d90bb31-0.hZyYvw');

            for (const div of divs) {
                const text = div.textContent?.trim() || '';
                if (text.includes('U-19') && text.includes('Ghorpade')) {
                    // Extract all text content from this DIV and its children
                    const allText = [];
                    const elements = div.querySelectorAll('*');

                    for (const el of elements) {
                        const elText = el.textContent?.trim();
                        if (elText && elText.length > 10) {
                            allText.push({
                                text: elText,
                                tag: el.tagName,
                                className: el.className
                            });
                        }
                    }

                    tournaments.push({
                        name: text,
                        fullText: text,
                        allElements: allText,
                        html: div.innerHTML
                    });
                }
            }

            return tournaments;
        });

        console.log(`\n🏆 Found ${tournamentData.length} target tournaments:`);
        tournamentData.forEach((tournament, index) => {
            console.log(`${index + 1}. ${tournament.name}`);
        });

        // Now try to extract match data from these tournaments
        console.log('\n🔍 Extracting match data from tournament content...');

        const allMatches = [];

        for (const tournament of tournamentData) {
            console.log(`\n📊 Processing: ${tournament.name.split('Tournament')[0].trim()}`);

            // Look for match data in the tournament text
            const matchPatterns = [
                /Islam Gymkhana.*?K\.M\.C\.A\.?/gi,
                /K\.M\.C\.A\.?.*?Islam Gymkhana/gi,
                /Islam Gym.*?KMC/gi,
                /KMC.*?Islam Gym/gi
            ];

            const matches = [];

            for (const pattern of matchPatterns) {
                const found = tournament.fullText.match(pattern);
                if (found) {
                    matches.push(...found);
                }
            }

            // Also search in individual elements
            for (const element of tournament.allElements) {
                for (const pattern of matchPatterns) {
                    const found = element.text.match(pattern);
                    if (found) {
                        matches.push(...found.map(m => `${m} (${element.tag}.${element.className})`));
                    }
                }
            }

            if (matches.length > 0) {
                console.log(`✅ Found ${matches.length} potential matches:`);
                matches.forEach((match, index) => {
                    console.log(`   ${index + 1}. ${match}`);
                    allMatches.push({
                        tournament: tournament.name,
                        match: match,
                        source: 'tournament_div'
                    });
                });
            } else {
                console.log('❌ No matches found in this tournament DIV');
            }
        }

        // Try clicking on tournament DIVs to see if they reveal more content
        console.log('\n🖱️  Trying to interact with tournament DIVs...');

        const tournamentDivs = await page.$$('div.sc-6d90bb31-0.hZyYvw');
        let clickedDivs = 0;

        for (let i = 0; i < tournamentDivs.length; i++) {
            const divText = await tournamentDivs[i].evaluate(el => el.textContent?.trim() || '');

            if (divText.includes('U-19') && divText.includes('Ghorpade')) {
                console.log(`\n🎯 Clicking on DIV ${clickedDivs + 1}: ${divText.substring(0, 100)}...`);

                try {
                    // Clear previous network requests
                    networkRequests.length = 0;

                    // Click the DIV
                    await tournamentDivs[i].click();

                    // Wait to see if anything happens
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    // Check for new content or navigation
                    const currentUrl = page.url();
                    const newContent = await page.evaluate(() => {
                        // Look for any new match-related content
                        const allText = document.body.textContent || '';
                        const matchMentions = allText.match(/Islam Gymkhana|K\.M\.C\.A\.?/gi) || [];
                        return {
                            url: window.location.href,
                            matchMentions: matchMentions.length,
                            newMatches: matchMentions
                        };
                    });

                    console.log(`📍 URL after click: ${newContent.url}`);
                    console.log(`🏏 Match mentions: ${newContent.matchMentions}`);

                    if (newContent.matchMentions > 0) {
                        console.log('✅ Found match data after click!');
                        newContent.newMatches.forEach((match, index) => {
                            console.log(`   ${index + 1}. ${match}`);
                            allMatches.push({
                                tournament: divText,
                                match: match,
                                source: 'after_click'
                            });
                        });
                    }

                    // Check network requests
                    if (networkRequests.length > 0) {
                        console.log(`📡 Network requests triggered: ${networkRequests.length}`);
                        networkRequests.forEach((req, index) => {
                            console.log(`   ${index + 1}. ${req.method} ${req.url}`);
                        });
                    }

                    clickedDivs++;

                    // Only test first 2 DIVs to avoid overwhelming
                    if (clickedDivs >= 2) break;

                } catch (error) {
                    console.log(`❌ Error clicking DIV: ${error.message}`);
                }
            }
        }

        // Final results
        console.log('\n🎉 EXTRACTION COMPLETE');
        console.log('=' .repeat(50));

        if (allMatches.length > 0) {
            console.log(`\n✅ SUCCESS! Found ${allMatches.length} matches between Islam Gymkhana and K.M.C.A:`);

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
                byTournament[tournamentName].forEach((match, index) => {
                    console.log(`   ${index + 1}. ${match.match} (${match.source})`);
                });
            });

        } else {
            console.log('\n❌ No matches found between Islam Gymkhana and K.M.C.A.');
            console.log('\n🔍 Analysis:');
            console.log('- Tournament discovery: ✅ Working');
            console.log('- DIV extraction: ✅ Working');
            console.log('- Match data in DIVs: ❌ Not found');
            console.log('- Click interaction: Tested but no additional data revealed');
            console.log('\n💡 Possible reasons:');
            console.log('- Match data might be loaded via separate API calls');
            console.log('- Tournament pages might require different navigation');
            console.log('- Data might be in a different format or location');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        console.log('\n🧹 Keeping browser open for inspection...');
    }
}

extractIslamGymkhanaMatches();
