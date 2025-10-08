const puppeteer = require('puppeteer');

async function analyzeTournamentPage() {
    console.log('🚀 Starting tournament page analysis...');

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

        // Analyze page structure
        console.log('\n🔍 Analyzing page structure...');
        const pageAnalysis = await page.evaluate(() => {
            const analysis = {
                tournamentLinks: [],
                tournamentDivs: [],
                allElements: [],
                bodyHTML: ''
            };

            // Get all links that might be tournament links
            const links = document.querySelectorAll('a');
            for (const link of links) {
                if (link.href && (link.href.includes('tournament') || link.textContent?.includes('U-19'))) {
                    analysis.tournamentLinks.push({
                        href: link.href,
                        text: link.textContent?.trim() || '',
                        className: link.className,
                        parentClass: link.parentElement?.className || ''
                    });
                }
            }

            // Get all divs that might contain tournament info
            const divs = document.querySelectorAll('div');
            for (const div of divs) {
                const text = div.textContent?.trim() || '';
                if (text.includes('U-19') && text.includes('Ghorpade')) {
                    analysis.tournamentDivs.push({
                        text: text,
                        className: div.className,
                        id: div.id,
                        attributes: Array.from(div.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ')
                    });
                }
            }

            // Look for any elements with data attributes
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
                const attrs = Array.from(el.attributes);
                for (const attr of attrs) {
                    if (attr.value && (attr.value.includes('tournament') || attr.value.includes('U-19'))) {
                        analysis.allElements.push({
                            tag: el.tagName,
                            attr: attr.name,
                            value: attr.value,
                            text: el.textContent?.trim() || ''
                        });
                    }
                }
            }

            // Get a sample of the HTML structure
            analysis.bodyHTML = document.body.innerHTML.substring(0, 2000);

            return analysis;
        });

        console.log(`📊 Found ${pageAnalysis.tournamentLinks.length} tournament-related links`);
        console.log(`📦 Found ${pageAnalysis.tournamentDivs.length} tournament-related divs`);
        console.log(`🔗 Found ${pageAnalysis.allElements.length} elements with tournament data`);

        if (pageAnalysis.tournamentLinks.length > 0) {
            console.log('\n🔗 Tournament Links:');
            pageAnalysis.tournamentLinks.forEach((link, index) => {
                console.log(`${index + 1}. ${link.text}`);
                console.log(`   URL: ${link.href}`);
                console.log(`   Classes: ${link.className}`);
                console.log('');
            });
        }

        if (pageAnalysis.tournamentDivs.length > 0) {
            console.log('\n📦 Tournament DIVs:');
            pageAnalysis.tournamentDivs.forEach((div, index) => {
                console.log(`${index + 1}. ${div.text}`);
                console.log(`   Classes: ${div.className}`);
                console.log(`   Attributes: ${div.attributes}`);
                console.log('');
            });
        }

        // Try to find actual tournament URLs
        const tournamentUrls = await page.evaluate(() => {
            const urls = [];

            // Look for any hrefs containing tournament
            const allLinks = document.querySelectorAll('a[href*="tournament"]');
            for (const link of allLinks) {
                urls.push({
                    url: link.href,
                    text: link.textContent?.trim() || ''
                });
            }

            // Look for onclick handlers
            const allElements = document.querySelectorAll('*[onclick]');
            for (const el of allElements) {
                const onclick = el.getAttribute('onclick');
                if (onclick && onclick.includes('tournament')) {
                    urls.push({
                        url: `onclick: ${onclick}`,
                        text: el.textContent?.trim() || ''
                    });
                }
            }

            return urls;
        });

        if (tournamentUrls.length > 0) {
            console.log('\n🎯 Found tournament URLs:');
            tournamentUrls.forEach((url, index) => {
                console.log(`${index + 1}. ${url.text}`);
                console.log(`   ${url.url}`);
                console.log('');
            });

            // Try to access the first tournament URL
            const firstUrl = tournamentUrls[0].url;
            if (firstUrl.startsWith('http')) {
                console.log(`🔍 Testing first tournament URL: ${firstUrl}`);
                await page.goto(firstUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

                // Extract matches
                const matches = await page.evaluate(() => {
                    const matchElements = document.querySelectorAll('table tr, .match-card, .card, [class*="match"], [class*="score"]');
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
                } else {
                    console.log('\n❌ No matches found on this tournament page');
                }
            }
        } else {
            console.log('\n❌ No tournament URLs found on the page');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        console.log('🧹 Keeping browser open for inspection...');
    }
}

analyzeTournamentPage();
