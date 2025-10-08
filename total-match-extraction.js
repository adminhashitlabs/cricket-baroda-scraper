const puppeteer = require('puppeteer');

async function extractCompleteMatchData() {
    console.log('🚀 Starting comprehensive match data extraction...');

    let browser;
    try {
        browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        // Example match URL provided by user
        const matchUrl = 'https://www.cricketbaroda.com/match/17801317/Advick-Cricket-Academy-Women-vs-Y.S.C-Women';

        console.log(`📍 Navigating to match: ${matchUrl}`);
        await page.goto(matchUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('🔍 Extracting comprehensive match data...');

        // Extract basic match information
        const matchInfo = await page.evaluate(() => {
            const info = {
                title: document.title,
                url: window.location.href,
                teams: [],
                players: [],
                score: '',
                result: '',
                venue: '',
                date: '',
                matchType: '',
                commentary: []
            };

            // Extract teams from title or page content
            const title = document.title;
            const teamMatch = title.match(/(.+?)\s*vs\s*(.+?)\s*\|/);
            if (teamMatch) {
                info.teams = [teamMatch[1].trim(), teamMatch[2].trim()];
            }

            // Look for team names in various places
            const teamSelectors = [
                '.team-name',
                '[class*="team"]',
                'h1',
                'h2',
                '.card-title',
                '[class*="score"]'
            ];

            for (const selector of teamSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    const text = el.textContent?.trim() || '';
                    if (text && text.length > 3 && !text.includes('Cricket') && !text.includes('Baroda')) {
                        if (text.includes('vs') || text.includes('VS')) {
                            const teams = text.split(/\s*vs\s*|\s*VS\s*/i);
                            if (teams.length === 2) {
                                info.teams = [teams[0].trim(), teams[1].trim()];
                                break;
                            }
                        }
                    }
                }
                if (info.teams.length === 2) break;
            }

            // Extract score information
            const scoreSelectors = [
                '.score',
                '[class*="score"]',
                '.runs',
                '[class*="runs"]',
                'h3',
                'h4'
            ];

            for (const selector of scoreSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    const text = el.textContent?.trim() || '';
                    if (text && /\d+\/\d+|\d+/.test(text) && text.length < 50) {
                        info.score = text;
                        break;
                    }
                }
                if (info.score) break;
            }

            // Extract result
            const resultSelectors = [
                '.result',
                '[class*="result"]',
                '.status',
                '[class*="status"]',
                'p'
            ];

            for (const selector of resultSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    const text = el.textContent?.trim() || '';
                    if (text && (text.includes('won') || text.includes('lost') || text.includes('drawn') || text.includes('tied'))) {
                        info.result = text;
                        break;
                    }
                }
                if (info.result) break;
            }

            // Extract venue and date
            const venueSelectors = [
                '.venue',
                '[class*="venue"]',
                '.ground',
                '[class*="ground"]',
                '.location',
                '[class*="location"]'
            ];

            for (const selector of venueSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    const text = el.textContent?.trim() || '';
                    if (text && text.length > 5 && !text.includes('http')) {
                        info.venue = text;
                        break;
                    }
                }
                if (info.venue) break;
            }

            // Look for date in various formats
            const dateSelectors = [
                '.date',
                '[class*="date"]',
                'time',
                '[datetime]'
            ];

            for (const selector of dateSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    const text = el.textContent?.trim() || '';
                    const datetime = el.getAttribute('datetime');
                    if (datetime) {
                        info.date = datetime;
                        break;
                    } else if (text && /\d{1,2}\s+[A-Za-z]+|\d{1,2}\/\d{1,2}/.test(text)) {
                        info.date = text;
                        break;
                    }
                }
                if (info.date) break;
            }

            return info;
        });

        console.log('\n🏏 MATCH INFORMATION:');
        console.log('='.repeat(60));
        console.log(`Title: ${matchInfo.title}`);
        console.log(`Teams: ${matchInfo.teams.join(' vs ')}`);
        console.log(`Score: ${matchInfo.score || 'Not found'}`);
        console.log(`Result: ${matchInfo.result || 'Not found'}`);
        console.log(`Venue: ${matchInfo.venue || 'Not found'}`);
        console.log(`Date: ${matchInfo.date || 'Not found'}`);

        // Extract players from the match
        console.log('\n👥 EXTRACTING PLAYERS...');

        const playersData = await page.evaluate(() => {
            const players = {
                team1: [],
                team2: [],
                allPlayers: []
            };

            // Look for player names in various sections
            const playerSelectors = [
                '.player-name',
                '[class*="player"]',
                '.batsman',
                '[class*="batsman"]',
                '.bowler',
                '[class*="bowler"]',
                'td',
                'tr',
                '.card',
                '[class*="card"]'
            ];

            const foundPlayers = new Set();

            for (const selector of playerSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    const text = el.textContent?.trim() || '';
                    if (text && text.length > 3 && text.length < 30) {
                        // Look for patterns that suggest player names
                        const words = text.split(/\s+/);
                        if (words.length >= 2 && words.length <= 4) {
                            // Check if it looks like a name (contains letters, no numbers, reasonable length)
                            const hasLetters = /[a-zA-Z]/.test(text);
                            const hasNumbers = /\d/.test(text);
                            const noSpecial = !/[^\w\s]/.test(text);

                            if (hasLetters && !hasNumbers && noSpecial && !foundPlayers.has(text)) {
                                // Additional check: not a common non-player text
                                const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'had', 'by', 'hot', 'but', 'about', 'were', 'this', 'that', 'with', 'from', 'they', 'will', 'would', 'there', 'their', 'what', 'when', 'where', 'how', 'each', 'which', 'time', 'year', 'people', 'way', 'day', 'man', 'thing', 'woman', 'life', 'child', 'world', 'school', 'state', 'family', 'student', 'group', 'country', 'problem', 'hand', 'part', 'place', 'case', 'week', 'company', 'system', 'program', 'question', 'work', 'government', 'number', 'night', 'point', 'home', 'water', 'room', 'mother', 'area', 'money', 'story', 'fact', 'month', 'lot', 'right', 'study', 'book', 'eye', 'job', 'word', 'business', 'issue', 'side', 'kind', 'head', 'house', 'service', 'friend', 'father', 'power', 'hour', 'game', 'line', 'end', 'member', 'law', 'car', 'city', 'community', 'name', 'president', 'team', 'minute', 'idea', 'kid', 'body', 'information', 'back', 'parent', 'face', 'others', 'level', 'office', 'door', 'health', 'person', 'art', 'war', 'history', 'party', 'result', 'change', 'morning', 'reason', 'research', 'girl', 'guy', 'moment', 'air', 'teacher', 'force', 'education'];

                                const isCommonWord = words.some(word =>
                                    commonWords.includes(word.toLowerCase()) ||
                                    word.length < 2
                                );

                                if (!isCommonWord) {
                                    foundPlayers.add(text);
                                    players.allPlayers.push({
                                        name: text,
                                        element: selector,
                                        text: el.textContent?.trim() || ''
                                    });
                                }
                            }
                        }
                    }
                }
            }

            // Try to organize players by team if possible
            const team1Name = players.allPlayers.length > 0 ? players.allPlayers[0].name.split(' ')[0] : '';
            const team2Name = players.allPlayers.length > 1 ? players.allPlayers[1].name.split(' ')[0] : '';

            players.team1 = players.allPlayers.filter(p => p.name.toLowerCase().includes(team1Name.toLowerCase()));
            players.team2 = players.allPlayers.filter(p => p.name.toLowerCase().includes(team2Name.toLowerCase()));

            return players;
        });

        console.log('\n👥 PLAYERS FOUND:');
        console.log('='.repeat(60));
        console.log(`Total Players: ${playersData.allPlayers.length}`);

        if (playersData.team1.length > 0) {
            console.log(`\nTeam 1 Players (${playersData.team1.length}):`);
            playersData.team1.forEach((player, index) => {
                console.log(`  ${index + 1}. ${player.name}`);
            });
        }

        if (playersData.team2.length > 0) {
            console.log(`\nTeam 2 Players (${playersData.team2.length}):`);
            playersData.team2.forEach((player, index) => {
                console.log(`  ${index + 1}. ${player.name}`);
            });
        }

        // Extract commentary data
        console.log('\n📝 EXTRACTING COMMENTARY...');

        // Try to find and click commentary tab
        try {
            const commentarySelectors = [
                'a[href*="COMMENTARY"]',
                'button:has-text("COMMENTARY")',
                '::-p-text(COMMENTARY)',
                'text="COMMENTARY"'
            ];

            let commentaryClicked = false;

            for (const selector of commentarySelectors) {
                try {
                    await page.click(selector);
                    console.log(`✅ Clicked COMMENTARY tab using: ${selector}`);
                    commentaryClicked = true;
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    break;
                } catch (e) {
                    // Try next selector
                }
            }

            if (!commentaryClicked) {
                console.log('⚠️  Could not find COMMENTARY tab, extracting available commentary...');
            }

        } catch (error) {
            console.log('⚠️  Error accessing commentary tab, extracting available data...');
        }

        // Extract commentary content
        const commentaryData = await page.evaluate(() => {
            const commentary = {
                balls: [],
                overs: [],
                wickets: [],
                allCommentary: []
            };

            // Look for commentary elements
            const commentarySelectors = [
                '.commentary',
                '[class*="commentary"]',
                '.ball',
                '[class*="ball"]',
                '.over',
                '[class*="over"]',
                '.wicket',
                '[class*="wicket"]',
                'td',
                'tr',
                '.card-body',
                '[class*="card"]'
            ];

            for (const selector of commentarySelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    const text = el.textContent?.trim() || '';
                    if (text && text.length > 10 && text.length < 200) {
                        // Look for ball-by-ball commentary patterns
                        if (/\d+\.\d+|\d+\/\d+|wicket|out|lbw|bowled|caught/i.test(text)) {
                            commentary.allCommentary.push({
                                text: text,
                                type: 'ball',
                                element: selector
                            });
                        } else if (text.includes('over') || /^\d+ overs?$/.test(text)) {
                            commentary.overs.push({
                                text: text,
                                element: selector
                            });
                        } else if (text.includes('wicket') || /\b(out|lbw|bowled|caught|run out)\b/i.test(text)) {
                            commentary.wickets.push({
                                text: text,
                                element: selector
                            });
                        }
                    }
                }
            }

            // Get all text that might be commentary
            const allTextElements = document.querySelectorAll('*');
            for (const el of allTextElements) {
                const text = el.textContent?.trim() || '';
                if (text && text.length > 20 && text.length < 150) {
                    // Look for commentary-like patterns
                    if (/\d+.*\d+.*runs?|wicket|over|ball|bowled|caught|lbw/i.test(text) &&
                        !text.includes('http') &&
                        !text.includes('Copyright') &&
                        !text.includes('Baroda Cricket Association')) {
                        commentary.allCommentary.push({
                            text: text,
                            type: 'general',
                            element: el.tagName.toLowerCase()
                        });
                    }
                }
            }

            return commentary;
        });

        console.log('\n📝 COMMENTARY DATA:');
        console.log('='.repeat(60));
        console.log(`Total Commentary Items: ${commentaryData.allCommentary.length}`);
        console.log(`Overs Found: ${commentaryData.overs.length}`);
        console.log(`Wickets Found: ${commentaryData.wickets.length}`);

        if (commentaryData.allCommentary.length > 0) {
            console.log('\n📋 COMMENTARY ITEMS:');
            commentaryData.allCommentary.slice(0, 20).forEach((item, index) => {
                console.log(`  ${index + 1}. [${item.type}] ${item.text}`);
                console.log(`     Element: ${item.element}`);
                console.log('');
            });

            if (commentaryData.allCommentary.length > 20) {
                console.log(`  ... and ${commentaryData.allCommentary.length - 20} more items`);
            }
        }

        if (commentaryData.wickets.length > 0) {
            console.log('\n⚾ WICKETS:');
            commentaryData.wickets.forEach((wicket, index) => {
                console.log(`  ${index + 1}. ${wicket.text}`);
            });
        }

        // Create comprehensive JSON output
        const completeMatchData = {
            match: {
                url: matchUrl,
                title: matchInfo.title,
                teams: matchInfo.teams,
                score: matchInfo.score,
                result: matchInfo.result,
                venue: matchInfo.venue,
                date: matchInfo.date,
                matchType: matchInfo.matchType
            },
            players: {
                total: playersData.allPlayers.length,
                team1: playersData.team1,
                team2: playersData.team2,
                allPlayers: playersData.allPlayers
            },
            commentary: {
                total: commentaryData.allCommentary.length,
                overs: commentaryData.overs.length,
                wickets: commentaryData.wickets.length,
                items: commentaryData.allCommentary,
                wicketDetails: commentaryData.wickets
            },
            metadata: {
                extractionDate: new Date().toISOString(),
                source: 'CricketBaroda',
                extractor: 'Puppeteer Web Scraper'
            }
        };

        // Save to JSON file
        const fs = require('fs');
        const jsonFileName = `match_${Date.now()}.json`;
        fs.writeFileSync(jsonFileName, JSON.stringify(completeMatchData, null, 2));
        console.log(`\n💾 Match data saved to: ${jsonFileName}`);

        // Summary
        console.log('\n🎉 EXTRACTION COMPLETE');
        console.log('='.repeat(60));
        console.log('SUMMARY:');
        console.log(`  ✅ Teams: ${matchInfo.teams.length > 0 ? 'Found' : 'Not found'}`);
        console.log(`  ✅ Players: ${playersData.allPlayers.length} found`);
        console.log(`  ✅ Commentary: ${commentaryData.allCommentary.length} items`);
        console.log(`  ✅ Match Score: ${matchInfo.score ? 'Found' : 'Not found'}`);
        console.log(`  ✅ Match Result: ${matchInfo.result ? 'Found' : 'Not found'}`);
        console.log(`  💾 JSON File: ${jsonFileName}`);

        return completeMatchData;

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        // Always close the browser
        if (browser) {
            console.log('\n🔒 Closing browser...');
            await browser.close();
            console.log('✅ Browser closed successfully');
        }
    }
}

// Run the extraction
extractCompleteMatchData()
    .then((data) => {
        console.log('\n✅ Extraction completed successfully!');
        console.log(`📊 Data extracted: ${JSON.stringify(data, null, 2).length} characters`);
    })
    .catch((error) => {
        console.error('❌ Extraction failed:', error.message);
        process.exit(1);
    });
