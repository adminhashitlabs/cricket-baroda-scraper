const puppeteer = require('puppeteer');

async function clickTournamentDivs() {
    console.log('🚀 Starting tournament DIV interaction test...');

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

        // Find tournament DIVs
        const tournamentDivs = await page.$$('div.sc-6d90bb31-0.hZyYvw');

        console.log(`\n🏆 Found ${tournamentDivs.length} tournament DIVs`);

        // Try to click on the first Ghorpade tournament DIV
        for (let i = 0; i < tournamentDivs.length; i++) {
            const divText = await tournamentDivs[i].evaluate(el => el.textContent?.trim() || '');

            if (divText.includes('U-19') && divText.includes('Ghorpade')) {
                console.log(`\n🎯 Clicking on tournament DIV ${i + 1}: ${divText.substring(0, 100)}...`);

                // Check if the DIV has any event listeners or data attributes
                const divInfo = await tournamentDivs[i].evaluate(el => {
                    const attrs = Array.from(el.attributes);
                    const attrMap = {};
                    attrs.forEach(attr => {
                        attrMap[attr.name] = attr.value;
                    });

                    return {
                        attributes: attrMap,
                        hasClickListener: el.onclick !== null,
                        tagName: el.tagName,
                        className: el.className,
                        innerHTML: el.innerHTML.substring(0, 500)
                    };
                });

                console.log('DIV Info:');
                console.log(`  - Tag: ${divInfo.tagName}`);
                console.log(`  - Class: ${divInfo.className}`);
                console.log(`  - Has Click Listener: ${divInfo.hasClickListener}`);
                console.log(`  - Attributes: ${JSON.stringify(divInfo.attributes, null, 2)}`);
                console.log(`  - Inner HTML: ${divInfo.innerHTML.substring(0, 200)}...`);

                // Try clicking the DIV
                try {
                    await tournamentDivs[i].click();
                    console.log('✅ Clicked on DIV, waiting for navigation...');

                    // Wait a bit to see if navigation happens
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    // Check current URL
                    const currentUrl = page.url();
                    console.log(`📍 Current URL after click: ${currentUrl}`);

                    if (currentUrl !== 'https://www.cricketbaroda.com/match-center/tournaments') {
                        console.log('🎉 Navigation occurred!');

                        // Try to extract matches from this page
                        const matches = await page.evaluate(() => {
                            const matchElements = document.querySelectorAll('table tr, .match-card, .card, [class*="match"], [class*="score"], div, span');
                            const matches = [];

                            for (const element of matchElements) {
                                const text = element.textContent?.trim() || '';
                                if (text.includes('Islam Gymkhana') && (text.includes('K.M.C.A') || text.includes('KMC'))) {
                                    matches.push({
                                        text: text,
                                        element: element.tagName + (element.className ? '.' + element.className : '')
                                    });
                                }
                            }

                            return matches;
                        });

                        if (matches.length > 0) {
                            console.log(`\n✅ SUCCESS! Found ${matches.length} matches:`);
                            matches.forEach((match, index) => {
                                console.log(`${index + 1}. ${match.text}`);
                                console.log(`   Element: ${match.element}`);
                                console.log('');
                            });
                            break; // Found matches, stop
                        } else {
                            console.log('\n❌ No matches found on this page, going back...');
                            await page.goBack();
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    } else {
                        console.log('❌ No navigation occurred');
                    }

                } catch (error) {
                    console.log(`❌ Error clicking DIV: ${error.message}`);
                }

                break; // Only test the first Ghorpade tournament
            }
        }

        // If clicking didn't work, try a different approach
        console.log('\n🔄 Trying alternative approach...');

        // Look for any elements that might contain match data directly on the page
        const allText = await page.evaluate(() => {
            const elements = document.querySelectorAll('*');
            let allContent = '';

            for (const el of elements) {
                const text = el.textContent?.trim() || '';
                if (text.includes('Islam Gymkhana') && text.includes('K.M.C.A')) {
                    allContent += text + '\n';
                }
            }

            return allContent;
        });

        if (allText) {
            console.log('\n✅ Found match data on the page:');
            console.log(allText);
        } else {
            console.log('\n❌ No match data found on the tournaments listing page');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        console.log('🧹 Keeping browser open for inspection...');
    }
}

clickTournamentDivs();
