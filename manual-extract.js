const puppeteer = require('puppeteer');

async function extractTournamentInfo() {
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

extractTournamentInfo();

        // Wait longer for content to load
        console.log('⏳ Waiting for tournament content to load...');
        await new Promise(resolve => setTimeout(resolve, 8000));

        // Detailed page analysis
        console.log('\n🔍 Analyzing page structure...');
        const pageAnalysis = await page.evaluate(() => {
            const analysis = {
                allLinks: [],
                allDivs: [],
                allElements: [],
                bodyHTML: ''
            };

            // Get all links
            const links = document.querySelectorAll('a');
            for (const link of links) {
                if (link.href && link.href.includes('tournament')) {
                    analysis.allLinks.push({
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
                    analysis.allDivs.push({
                        text: text,
                        className: div.className,
                        id: div.id,
                        attributes: Array.from(div.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ')
                    });
                }
            }

            // Look for any elements with tournament-related data attributes
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
                const attrs = Array.from(el.attributes);
                for (const attr of attrs) {
                    if (attr.name.includes('data') && attr.value.includes('tournament')) {
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

        console.log(`📊 Found ${pageAnalysis.allLinks.length} tournament-related links`);
        console.log(`📦 Found ${pageAnalysis.allDivs.length} tournament-related divs`);
        console.log(`🔗 Found ${pageAnalysis.allElements.length} elements with tournament data`);

        if (pageAnalysis.allLinks.length > 0) {
            console.log('\n🔗 Tournament Links:');
            pageAnalysis.allLinks.forEach((link, index) => {
                console.log(`${index + 1}. ${link.text}`);
                console.log(`   URL: ${link.href}`);
                console.log(`   Classes: ${link.className}`);
                console.log('');
            });
        }

        if (pageAnalysis.allDivs.length > 0) {
            console.log('\n📦 Tournament DIVs:');
            pageAnalysis.allDivs.forEach((div, index) => {
                console.log(`${index + 1}. ${div.text}`);
                console.log(`   Classes: ${div.className}`);
                console.log(`   Attributes: ${div.attributes}`);
                console.log('');
            });
        }

        // Try to find actual tournament URLs from the page
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

            // Look for onclick handlers that might navigate to tournaments
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

                // Extract matches from this tournament
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
        // Don't close browser automatically so we can inspect
        console.log('🧹 Keeping browser open for inspection...');
    }
}

extractTournamentInfo();

                for (const div of divs) {
                    const text = div.textContent?.trim() || '';

                    if (text.includes('U-19') && text.includes('Late Mama Saheb') && text.includes('Ghorpade')) {
                        tournamentData.push({
                            name: text,
                            url: '',
                            id: '',
                            source: 'div'
                        });
                    }
                }
            }

            // Third try: Search body text
            if (tournamentData.length === 0) {
                const bodyText = document.body.textContent || '';
                const lines = bodyText.split('\n');

                for (const line of lines) {
                    const text = line.trim();
                    if (text.includes('U-19') && text.includes('Late Mama Saheb') && text.includes('Ghorpade')) {
                        tournamentData.push({
                            name: text,
                            url: '',
                            id: '',
                            source: 'body'
                        });
                    }
                }
            }

            return tournamentData;
        });

        console.log(`\n🏆 Found ${tournaments.length} target tournaments:`);
        tournaments.forEach((tournament, index) => {
            console.log(`${index + 1}. ${tournament.name}`);
            console.log(`   Source: ${tournament.source}`);
            console.log('');
        });

        // Since we can't find match data on the listing page, let's try to construct tournament URLs
        console.log(`\n🔍 Attempting to find tournament URLs by trying common ID patterns...`);

        const possibleIds = [
            '1500001', '1500002', '1500003', '1500004', '1500005',
            '1500006', '1500007', '1500008', '1500009', '1500010',
            '2021001', '2021002', '2021003', '2021004', '2021005',
            '202101', '202102', '202103', '202104', '202105'
        ];

        const foundTournaments = [];

        for (const tournament of tournaments.slice(0, 2)) { // Test with first 2 tournaments
            console.log(`\n🏏 Searching for URLs for: ${tournament.name.split('Tournament')[0].trim()}`);

            for (const id of possibleIds) {
                try {
                    const testUrl = `https://www.cricketbaroda.com/tournament/${id}`;
                    console.log(`   Trying: ${testUrl}`);

                    // Navigate to test URL
                    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });

                    // Check if this is the correct tournament
                    const pageInfo = await page.evaluate((tournamentInfo) => {
                        const title = document.title.toLowerCase();
                        const bodyText = document.body.textContent?.toLowerCase() || '';

                        const hasGhorpade = title.includes('ghorpade') || bodyText.includes('ghorpade');
                        const hasMamaSaheb = title.includes('mama saheb') || bodyText.includes('mama saheb');
                        const has2021 = title.includes('2021') || bodyText.includes('2021');
                        const hasU19 = title.includes('u-19') || bodyText.includes('u-19') || bodyText.includes('under 19');

                        // Check for Elite/Plate group
                        const isElite = tournamentInfo.name.toLowerCase().includes('elite');
                        const isPlate = tournamentInfo.name.toLowerCase().includes('plate');

                        const hasElite = title.includes('elite') || bodyText.includes('elite');
                        const hasPlate = title.includes('plate') || bodyText.includes('plate');

                        const groupMatch = (isElite && hasElite) || (isPlate && hasPlate) || (!isElite && !isPlate);

                        return {
                            title: document.title,
                            isCorrectTournament: hasGhorpade && hasMamaSaheb && has2021 && hasU19 && groupMatch,
                            hasGhorpade,
                            hasMamaSaheb,
                            has2021,
                            hasU19,
                            hasElite,
                            hasPlate,
                            groupMatch
                        };
                    }, tournament);

                    console.log(`      Title: ${pageInfo.title}`);
                    console.log(`      Correct: ${pageInfo.isCorrectTournament} (G:${pageInfo.hasGhorpade}, MS:${pageInfo.hasMamaSaheb}, 21:${pageInfo.has2021}, U19:${pageInfo.hasU19}, Group:${pageInfo.groupMatch})`);

                    if (pageInfo.isCorrectTournament) {
                        console.log(`      ✅ Found matching tournament!`);

                        // Extract matches from this tournament page
                        const matches = await page.evaluate(() => {
                            const matchData = [];

                            // Look for various match selectors
                            const selectors = [
                                'table tr',
                                '.match-card',
                                '.match-item',
                                '[class*="match"]',
                                '[class*="score"]',
                                '.card'
                            ];

                            for (const selector of selectors) {
                                const elements = document.querySelectorAll(selector);

                                for (const element of elements) {
                                    const text = element.textContent?.trim() || '';

                                    // Look for matches involving Islam Gymkhana and K.M.C.A
                                    if ((text.includes('Islam Gymkhana') || text.includes('Islam Gym')) &&
                                        (text.includes('K.M.C.A') || text.includes('KMC') || text.includes('K.M.C.A.'))) {

                                        // Extract score information
                                        const scoreMatch = text.match(/(\d+\/\d+|\d+)\s*(?:vs|Vs|VS|-)\s*(\d+\/\d+|\d+)/);
                                        const score = scoreMatch ? `${scoreMatch[1]} vs ${scoreMatch[2]}` : 'Score not found';

                                        matchData.push({
                                            teams: text.match(/(Islam Gymkhana.*?K\.M\.C\.A\.?|K\.M\.C\.A\.?.*?Islam Gymkhana)/)?.[0] || 'Islam Gymkhana vs K.M.C.A',
                                            score: score,
                                            fullText: text.substring(0, 200) + '...',
                                            elementType: element.tagName.toLowerCase() + '.' + selector
                                        });
                                    }
                                }

                                if (matchData.length > 0) break;
                            }

                            return matchData;
                        });

                        if (matches.length > 0) {
                            console.log(`      🏏 Found ${matches.length} matches!`);
                            foundTournaments.push({
                                name: tournament.name,
                                url: testUrl,
                                id: id,
                                matches: matches
                            });
                        } else {
                            console.log(`      ❌ No matches found on this page`);
                        }

                        break; // Found the correct tournament, stop searching
                    }

                } catch (error) {
                    // URL not found or timeout, continue to next ID
                    console.log(`      ❌ Error/Timeout: ${error.message}`);
                }
            }
        }

        // Display results
        if (foundTournaments.length > 0) {
            console.log(`\n� SUCCESS! Found matches in ${foundTournaments.length} tournaments:`);

            foundTournaments.forEach((tournament, index) => {
                console.log(`\n${index + 1}. ${tournament.name}`);
                console.log(`   URL: ${tournament.url}`);
                console.log(`   ID: ${tournament.id}`);
                console.log(`   Matches: ${tournament.matches.length}`);

                tournament.matches.forEach((match, matchIndex) => {
                    console.log(`      ${matchIndex + 1}. ${match.teams}`);
                    console.log(`         Score: ${match.score}`);
                    console.log(`         Details: ${match.fullText}`);
                    console.log('');
                });
            });
        } else {
            console.log(`\n❌ No tournament URLs found or no matches available`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (browser) {
            await browser.close();
            console.log('🧹 Browser closed');
        }
    }
}

extractTournamentInfo();
