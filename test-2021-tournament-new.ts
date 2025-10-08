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

        // First, navigate to the tournament center and select 2021-22 season
        console.log('🏏 Navigating to tournament center and selecting 2021-22 season...');

        const tournamentCenterUrl = 'https://www.cricketbaroda.com/match-center/tournaments';
        await scraper['page']!.goto(tournamentCenterUrl, { waitUntil: 'networkidle2' });

        // Select the 2021-22 season from the dropdown
        const seasonSelected = await scraper['page']!.evaluate(() => {
            const seasonSelect = document.querySelector('select.sc-bc4a329-1.grmngK.form-select') as HTMLSelectElement;
            if (seasonSelect) {
                // Look for 2021-22 option
                for (let i = 0; i < seasonSelect.options.length; i++) {
                    const option = seasonSelect.options[i];
                    if (option.value.includes('2021') || option.text.includes('2021')) {
                        seasonSelect.value = option.value;
                        seasonSelect.dispatchEvent(new Event('change', { bubbles: true }));
                        return { success: true, selectedValue: option.value, selectedText: option.text };
                    }
                }
                return { success: false, availableOptions: Array.from(seasonSelect.options).map(opt => ({ value: opt.value, text: opt.text })) };
            }
            return { success: false, error: 'Dropdown not found' };
        });

        if (!seasonSelected.success) {
            console.log('❌ Could not select 2021-22 season');
            if (seasonSelected.availableOptions) {
                console.log('📋 Available seasons:');
                seasonSelected.availableOptions.forEach((option, index) => {
                    console.log(`   ${index + 1}. ${option.text} (${option.value})`);
                });
            } else {
                console.log(`Error: ${seasonSelected.error}`);
            }
            return;
        }

        console.log(`✅ Selected season: ${seasonSelected.selectedText} (${seasonSelected.selectedValue})`);

        // Wait for the page to update with the selected season
        console.log('⏳ Waiting for tournaments to load...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Now look for actual tournament links that contain the U-19 Late Mama Saheb Ghorpade text
        const tournamentData = await scraper['page']!.evaluate(() => {
            const tournaments: any[] = [];

            // Look for all links that might be tournament links
            const allLinks = document.querySelectorAll('a');

            for (const link of allLinks) {
                const anchor = link as HTMLAnchorElement;
                const href = anchor.href;
                const text = link.textContent?.trim() || '';

                // Look for tournament links that contain our target tournament
                if (href && text && (text.includes('U-19') || text.includes('Late Mama Saheb') || text.includes('Ghorpade'))) {
                    tournaments.push({
                        name: text,
                        url: href,
                        isTargetTournament: text.includes('U-19') && text.includes('Late Mama Saheb') && text.includes('Ghorpade') && text.includes('2021')
                    });
                }
            }

            // Look for clickable elements that might contain tournament names
            const clickableElements = document.querySelectorAll('button, [role="button"], [onclick], .clickable, [class*="card"], [class*="tournament"]');

            for (const element of clickableElements) {
                const text = element.textContent?.trim() || '';
                if (text.includes('U-19 Late Mama Saheb Ghorpade') && text.includes('2021')) {
                    tournaments.push({
                        name: text,
                        url: null, // No direct href
                        element: element.tagName + (element.className ? '.' + element.className.split(' ').join('.') : ''),
                        isTargetTournament: true,
                        foundVia: 'clickable element'
                    });
                }
            }

            // Also check for any elements that contain the tournament text (even if not links)
            const allElements = document.querySelectorAll('*');
            for (const element of allElements) {
                const text = element.textContent?.trim() || '';
                if (text.includes('U-19 Late Mama Saheb Ghorpade') && text.includes('2021') && !text.includes('@font-face')) {
                    // Look for the nearest link
                    const linkElement = element.closest('a');
                    if (linkElement) {
                        const anchor = linkElement as HTMLAnchorElement;
                        tournaments.push({
                            name: text,
                            url: anchor.href,
                            isTargetTournament: true,
                            foundVia: 'element traversal'
                        });
                    } else {
                        // Look for clickable parent
                        const clickableParent = element.closest('button, [role="button"], [onclick]');
                        if (clickableParent) {
                            tournaments.push({
                                name: text,
                                url: null,
                                element: clickableParent.tagName,
                                isTargetTournament: true,
                                foundVia: 'clickable parent'
                            });
                        } else {
                            // No clickable element found
                            tournaments.push({
                                name: text,
                                url: null,
                                isTargetTournament: true,
                                foundVia: 'text only'
                            });
                        }
                    }
                    break; // Only add once
                }
            }

            return {
                tournaments: tournaments.slice(0, 10), // Limit results
                pageTitle: document.title,
                bodyTextSample: document.body.textContent?.substring(0, 2000) + '...',
                totalLinks: allLinks.length,
                totalClickable: clickableElements.length
            };
        });

        console.log(`📄 Page Title: ${tournamentData.pageTitle}`);
        console.log(`🔗 Total links found: ${tournamentData.totalLinks}`);
        console.log(`🖱️ Total clickable elements: ${tournamentData.totalClickable}`);
        console.log(`🏆 Found ${tournamentData.tournaments.length} potential tournament references:`);

        let tournament2021Url: string | null = null;
        let tournamentTitle: string = '';

        if (tournamentData.tournaments.length > 0) {
            tournamentData.tournaments.forEach((tournament, index) => {
                console.log(`${index + 1}. ${tournament.name}`);
                console.log(`   URL: ${tournament.url || 'No URL'}`);
                console.log(`   Element: ${tournament.element || 'N/A'}`);
                console.log(`   Target: ${tournament.isTargetTournament ? 'YES' : 'NO'}`);
                console.log(`   Found via: ${tournament.foundVia}`);
                console.log('');

                if (tournament.isTargetTournament && tournament.url) {
                    tournament2021Url = tournament.url;
                    tournamentTitle = tournament.name;
                }
            });
        } else {
            console.log('❌ No tournament references found');
            console.log('📝 Page content sample:');
            console.log(tournamentData.bodyTextSample);
        }

        // Check if there are any actual tournament links on the page
        console.log('🔍 Checking for any tournament links on the current page...');

        const allLinksData = await scraper['page']!.evaluate(() => {
            const links: any[] = [];
            const allLinks = document.querySelectorAll('a');

            for (const link of allLinks) {
                const anchor = link as HTMLAnchorElement;
                const href = anchor.href;
                const text = link.textContent?.trim() || '';

                if (href && href.includes('/tournament/')) {
                    links.push({
                        text: text,
                        href: href,
                        id: href.match(/\/tournament\/(\d+)/)?.[1]
                    });
                }
            }

            return {
                tournamentLinks: links,
                totalLinks: allLinks.length,
                pageHasGhorpadeText: document.body.textContent?.includes('U-19 Late Mama Saheb Ghorpade') || false
            };
        });

        console.log(`🔗 Found ${allLinksData.tournamentLinks.length} tournament links out of ${allLinksData.totalLinks} total links`);
        console.log(`📝 Page contains Ghorpade text: ${allLinksData.pageHasGhorpadeText}`);

        if (allLinksData.tournamentLinks.length > 0) {
            console.log('🏆 Available tournament links:');
            allLinksData.tournamentLinks.forEach((link, index) => {
                console.log(`${index + 1}. ${link.text}`);
                console.log(`   URL: ${link.href}`);
                console.log(`   ID: ${link.id}`);
                console.log('');
            });

            // Try the first available tournament to see if it has match data
            const firstTournament = allLinksData.tournamentLinks[0];
            tournament2021Url = firstTournament.href;
            tournamentTitle = firstTournament.text;
            console.log(`🎯 Using first available tournament: ${tournamentTitle}`);
        } else {
            console.log('❌ No tournament links found on the page');
            console.log('💡 This suggests that 2021 tournament data may not be accessible via the current website structure');

            // Check if match data is available directly on the current page
            console.log('🔍 Checking if match data is available on the current page...');

            const matchDataOnPage = await scraper['page']!.evaluate(() => {
                const bodyText = document.body.textContent || '';
                const hasIslam = bodyText.includes('Islam Gymkhana');
                const hasKMCA = bodyText.includes('K.M.C.A');
                const hasScores = /\d+\/\d+/.test(bodyText);

                return {
                    hasIslam,
                    hasKMCA,
                    hasScores,
                    bodyLength: bodyText.length,
                    scorePatterns: bodyText.match(/\d+\/\d+/g) || []
                };
            });

            console.log('📊 Current page analysis:');
            console.log(`   Has Islam Gymkhana: ${matchDataOnPage.hasIslam}`);
            console.log(`   Has K.M.C.A: ${matchDataOnPage.hasKMCA}`);
            console.log(`   Has scores: ${matchDataOnPage.hasScores}`);
            console.log(`   Score patterns found: ${matchDataOnPage.scorePatterns.length}`);
            console.log(`   Body text length: ${matchDataOnPage.bodyLength}`);

            if (matchDataOnPage.hasIslam && matchDataOnPage.hasKMCA && matchDataOnPage.hasScores) {
                console.log('✅ Match data appears to be on the current page!');
                // Extract match data from current page
                const currentPageMatchData = await scraper['page']!.evaluate(() => {
                    const matches: any[] = [];
                    const bodyText = document.body.textContent || '';

                    // Look for text containing both teams
                    const lines = bodyText.split('\n');
                    for (const line of lines) {
                        if (line.includes('Islam Gymkhana') && line.includes('K.M.C.A')) {
                            const scoreMatch = line.match(/(\d+\/\d+).*?(vs|Vs|VS|-).*?(\d+\/\d+)/);
                            if (scoreMatch) {
                                matches.push({
                                    teams: 'Islam Gymkhana vs K.M.C.A',
                                    score: `${scoreMatch[1]} vs ${scoreMatch[3]}`,
                                    fullText: line.trim(),
                                    source: 'current page'
                                });
                            }
                        }
                    }

                    return matches;
                });

                if (currentPageMatchData.length > 0) {
                    console.log('\n🎯 MATCH FOUND ON CURRENT PAGE:');
                    console.log('='.repeat(40));
                    currentPageMatchData.forEach((match, index) => {
                        console.log(`Match ${index + 1}:`);
                        console.log(`   Teams: ${match.teams}`);
                        console.log(`   Score: ${match.score}`);
                        console.log(`   Context: ${match.fullText}`);
                    });
                    return; // Exit successfully
                }
            }

            console.log('❌ No match data found on current page either');
            console.log('💡 Conclusion: The 2021 tournament match data between Islam Gymkhana and K.M.C.A appears to be unavailable');
            console.log('   This could be because:');
            console.log('   - The data was never digitized');
            console.log('   - The website structure changed');
            console.log('   - Historical data is not maintained');
            return;
        }

        // Now navigate to the tournament page and extract match data
        console.log(`\n🏏 Navigating to tournament: ${tournament2021Url}`);
        console.log(`   Title: ${tournamentTitle}`);

        if (!tournament2021Url) {
            console.log('❌ No tournament URL available');
            return;
        }

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
