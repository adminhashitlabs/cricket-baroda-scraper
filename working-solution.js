const puppeteer = require('puppeteer');

async function extractTournamentMatches() {
    console.log('🚀 Starting final match extraction for Islam Gymkhana vs K.M.C.A...');

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
        await page.select('select.sc-bc4a329-1.grmngK.form-select', '17'); // 2021-22 season value

        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 8000));

        // Find and click on tournament DIVs to get their URLs
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

                        // Go back to tournaments page
                        await page.goto('https://www.cricketbaroda.com/match-center/tournaments', {
                            waitUntil: 'domcontentloaded',
                            timeout: 30000
                        });

                        // Re-select season
                        await page.waitForSelector('select.sc-bc4a329-1.grmngK.form-select', { timeout: 10000 });
                        await page.select('select.sc-bc4a329-1.grmngK.form-select', '17');
                        await new Promise(resolve => setTimeout(resolve, 5000));

                        // Re-get DIVs (they might have changed)
                        break; // Only get first tournament for now
                    } else {
                        console.log(`❌ Could not extract ID from URL: ${currentUrl}`);
                        await page.goBack();
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }

                } catch (error) {
                    console.log(`❌ Error processing tournament: ${error.message}`);
                }
            }
        }

        // Now use the API to get match data
        if (tournamentIds.length > 0) {
            console.log('\n📡 Fetching match data from API...');

            for (const tournament of tournamentIds) {
                console.log(`\n🏏 Getting matches for: ${tournament.name.split('Tournament')[0].trim()}`);

                try {
                    // Navigate to tournament page
                    await page.goto(tournament.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                    // Wait for content to load
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    // Extract match data from the page
                    const matchData = await page.evaluate(() => {
                        const matches = [];

                        // Look for match cards or match information
                        const matchSelectors = [
                            '.match-card',
                            '[class*="match"]',
                            '.card',
                            'table tr',
                            '[class*="score"]',
                            'div'
                        ];

                        for (const selector of matchSelectors) {
                            const elements = document.querySelectorAll(selector);

                            for (const element of elements) {
                                const text = element.textContent?.trim() || '';

                                // Look for Islam Gymkhana vs K.M.C.A matches
                                if ((text.includes('Islam Gymkhana') || text.includes('Islam Gym')) &&
                                    (text.includes('K.M.C.A') || text.includes('KMC') || text.includes('K.M.C.A.'))) {

                                    // Extract score information
                                    const scorePatterns = [
                                        /(\d+\/\d+|\d+)\s*(vs|Vs|VS|-)\s*(\d+\/\d+|\d+)/g,
                                        /(\d+)\s*(vs|Vs|VS|-)\s*(\d+)/g,
                                        /([0-9]+)\s*\/\s*([0-9]+)\s*(vs|Vs|VS|-)\s*([0-9]+)\s*\/\s*([0-9]+)/g
                                    ];

                                    let score = 'Score not found';
                                    for (const pattern of scorePatterns) {
                                        const match = text.match(pattern);
                                        if (match) {
                                            score = match[0];
                                            break;
                                        }
                                    }

                                    matches.push({
                                        teams: text.match(/(Islam Gymkhana.*?K\.M\.C\.A\.?|K\.M\.C\.A\.?.*?Islam Gymkhana)/)?.[0] || 'Islam Gymkhana vs K.M.C.A',
                                        score: score,
                                        fullText: text.substring(0, 200) + '...',
                                        elementType: element.tagName.toLowerCase() + (element.className ? '.' + element.className : ''),
                                        date: text.match(/(\d{1,2}\s+[A-Za-z]+|\d{1,2}\/\d{1,2}\/\d{4})/)?.[0] || 'Date not found'
                                    });
                                }
                            }

                            if (matches.length > 0) break;
                        }

                        return matches;
                    });

                    if (matchData.length > 0) {
                        console.log(`✅ Found ${matchData.length} matches!`);

                        matchData.forEach((match, index) => {
                            console.log(`\n🏆 Match ${index + 1}:`);
                            console.log(`   Teams: ${match.teams}`);
                            console.log(`   Score: ${match.score}`);
                            console.log(`   Date: ${match.date}`);
                            console.log(`   Details: ${match.fullText}`);
                            console.log(`   Element: ${match.elementType}`);
                        });
                    } else {
                        console.log('❌ No matches found on this tournament page');

                        // Try to get all text from the page for debugging
                        const allText = await page.evaluate(() => {
                            const elements = document.querySelectorAll('*');
                            let text = '';
                            for (const el of elements) {
                                const elText = el.textContent?.trim();
                                if (elText && elText.includes('Islam') || elText.includes('K.M.C')) {
                                    text += elText + '\n';
                                }
                            }
                            return text;
                        });

                        if (allText) {
                            console.log('📝 Found some relevant text:');
                            console.log(allText);
                        }
                    }

                } catch (error) {
                    console.log(`❌ Error fetching matches: ${error.message}`);
                }
            }
        } else {
            console.log('❌ No tournament IDs found');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        console.log('\n🧹 Keeping browser open for inspection...');
    }
}

extractTournamentMatches();
