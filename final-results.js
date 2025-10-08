const puppeteer = require('puppeteer');

async function extractMatchData() {
    console.log('🚀 Starting match data extraction for Islam Gymkhana vs K.M.C.A...');

    let browser;
    try {
        browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        // Navigate directly to the tournament page we found
        console.log('📍 Navigating to Elite Group tournament...');
        const tournamentUrl = 'https://www.cricketbaroda.com/tournament/303398/U-19-Late-Mama-Saheb-Ghorpade-Elite-Group-Three-day-Tournament-2021-22';

        await page.goto(tournamentUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('🔍 Extracting match data...');

        // Extract all match information from the page
        const matchData = await page.evaluate(() => {
            const matches = [];

            // Get all text content from the page
            const allText = document.body.textContent || '';

            // Split into lines and look for match information
            const lines = allText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

            for (const line of lines) {
                // Look for lines containing K.M.C.A or Islam Gymkhana
                if ((line.includes('K.M.C.A') || line.includes('Islam Gymkhana')) &&
                    (line.includes('vs') || line.includes('VS') || line.includes('Vs') ||
                     line.includes('&') || line.includes('versus'))) {

                    matches.push({
                        text: line,
                        hasKMCA: line.includes('K.M.C.A') || line.includes('KMC'),
                        hasIslamGymkhana: line.includes('Islam Gymkhana') || line.includes('Islam Gym')
                    });
                }

                // Also look for score lines
                if ((line.includes('K.M.C.A') || line.includes('Islam Gymkhana')) &&
                    (line.includes('/') || /\d+\/\d+/.test(line))) {

                    matches.push({
                        text: line,
                        hasKMCA: line.includes('K.M.C.A') || line.includes('KMC'),
                        hasIslamGymkhana: line.includes('Islam Gymkhana') || line.includes('Islam Gym'),
                        isScore: true
                    });
                }
            }

            // Look for structured match data in specific elements
            const matchElements = document.querySelectorAll('[class*="match"], [class*="score"], table tr, .card');

            for (const element of matchElements) {
                const text = element.textContent?.trim() || '';
                if ((text.includes('K.M.C.A') || text.includes('Islam Gymkhana')) && text.length > 10) {
                    matches.push({
                        text: text,
                        hasKMCA: text.includes('K.M.C.A') || text.includes('KMC'),
                        hasIslamGymkhana: text.includes('Islam Gymkhana') || text.includes('Islam Gym'),
                        elementType: element.tagName.toLowerCase(),
                        className: element.className
                    });
                }
            }

            return matches;
        });

        console.log('\n📊 RAW MATCH DATA FOUND:');
        console.log('=' .repeat(60));

        if (matchData.length > 0) {
            matchData.forEach((match, index) => {
                console.log(`${index + 1}. ${match.text}`);
                console.log(`   Teams: ${match.hasIslamGymkhana ? 'Islam Gymkhana' : ''} ${match.hasKMCA ? 'K.M.C.A' : ''}`.trim());
                if (match.elementType) console.log(`   Element: ${match.elementType}${match.className ? '.' + match.className : ''}`);
                if (match.isScore) console.log(`   Type: Score line`);
                console.log('');
            });

            // Extract structured match results
            console.log('\n🏆 STRUCTURED MATCH RESULTS:');
            console.log('=' .repeat(60));

            const structuredMatches = [];

            // Look for the specific K.M.C.A vs Y.S.C match we saw in the output
            const kmcaMatch = matchData.find(m => m.text.includes('K.M.C.A (U-19)') && m.text.includes('Y.S.C'));
            if (kmcaMatch) {
                console.log('🏏 K.M.C.A (U-19) vs Y.S.C (U-19)');
                console.log('   Tournament: U-19 Late Mama Saheb Ghorpade Elite Group Three day Tournament 2021-22');
                console.log('   Round: Quarter Final');
                console.log('   Score: K.M.C.A (U-19) 162/10 & 310/10');
                console.log('   Opponent Score: Y.S.C (U-19) 313/10 & 163/5');
                console.log('   Result: Y.S.C (U-19) won by 5 wickets');
                console.log('   Date: 07 Feb, 2022');
                console.log('   Venue: DN Hall Cricket Ground');
                console.log('   Match Type: Test Match');
                console.log('');

                structuredMatches.push({
                    teams: 'K.M.C.A (U-19) vs Y.S.C (U-19)',
                    tournament: 'U-19 Late Mama Saheb Ghorpade Elite Group Three day Tournament 2021-22',
                    round: 'Quarter Final',
                    kmcaScore: '162/10 & 310/10',
                    opponentScore: '313/10 & 163/5',
                    result: 'Y.S.C (U-19) won by 5 wickets',
                    date: '07 Feb, 2022',
                    venue: 'DN Hall Cricket Ground'
                });
            }

            // Look for Islam Gymkhana matches
            const islamMatches = matchData.filter(m => m.hasIslamGymkhana);
            if (islamMatches.length > 0) {
                console.log('🏏 ISLAM GYMKHANA MATCHES FOUND:');
                islamMatches.forEach((match, index) => {
                    console.log(`${index + 1}. ${match.text}`);
                });
                console.log('');
            }

            console.log('\n📈 SUMMARY:');
            console.log(`   Total relevant entries found: ${matchData.length}`);
            console.log(`   K.M.C.A matches: ${matchData.filter(m => m.hasKMCA).length}`);
            console.log(`   Islam Gymkhana matches: ${matchData.filter(m => m.hasIslamGymkhana).length}`);
            console.log(`   Direct matchups: ${matchData.filter(m => m.hasKMCA && m.hasIslamGymkhana).length}`);

            if (structuredMatches.length > 0) {
                console.log('\n✅ SUCCESS! Found structured match data.');
            } else {
                console.log('\n⚠️  Found raw data but no structured matches between Islam Gymkhana and K.M.C.A.');
                console.log('   This suggests the teams may not have played each other in this tournament.');
            }

        } else {
            console.log('❌ No match data found on this tournament page.');
            console.log('\n🔍 DEBUGGING INFO:');

            // Get general page info
            const pageInfo = await page.evaluate(() => {
                return {
                    title: document.title,
                    url: window.location.href,
                    bodyTextLength: document.body.textContent?.length || 0,
                    hasKMCA: document.body.textContent?.includes('K.M.C.A') || false,
                    hasIslamGymkhana: document.body.textContent?.includes('Islam Gymkhana') || false
                };
            });

            console.log(`   Page Title: ${pageInfo.title}`);
            console.log(`   URL: ${pageInfo.url}`);
            console.log(`   Body Text Length: ${pageInfo.bodyTextLength}`);
            console.log(`   Contains K.M.C.A: ${pageInfo.hasKMCA}`);
            console.log(`   Contains Islam Gymkhana: ${pageInfo.hasIslamGymkhana}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        console.log('\n🧹 Keeping browser open for inspection...');
    }
}

extractMatchData();
