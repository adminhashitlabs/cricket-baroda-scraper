const puppeteer = require('puppeteer');

async function extractEnhancedMatchData() {
    console.log('🚀 Starting enhanced match data extraction...');

    let browser;
    try {
        browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        // Navigate to the match URL
        const matchUrl = 'https://www.cricketbaroda.com/match/17801317/Advick-Cricket-Academy-Women-vs-Y.S.C-Women';

        console.log(`📍 Navigating to match: ${matchUrl}`);
        await page.goto(matchUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('🔍 Extracting enhanced match data...');

        // Extract comprehensive match information
        const matchData = await page.evaluate(() => {
            const data = {
                teams: [],
                players: new Set(),
                score: '',
                result: '',
                venue: '',
                date: '',
                commentary: [],
                ballByBall: [],
                wickets: [],
                overs: []
            };

            // Extract teams from URL or title
            const url = window.location.href;
            const urlMatch = url.match(/\/match\/\d+\/(.+?)-vs-(.+?)$/);
            if (urlMatch) {
                data.teams = [
                    urlMatch[1].replace(/-/g, ' '),
                    urlMatch[2].replace(/-/g, ' ')
                ];
            }

            // Extract result
            const resultElements = document.querySelectorAll('*');
            for (const el of resultElements) {
                const text = el.textContent?.trim() || '';
                if (text.includes('won by') || text.includes('lost by') || text.includes('drawn')) {
                    data.result = text;
                    break;
                }
            }

            // Extract score
            const scoreElements = document.querySelectorAll('*');
            for (const el of scoreElements) {
                const text = el.textContent?.trim() || '';
                if (/^\d+\/\d+|\d+-\d+/.test(text) && text.length < 20) {
                    data.score = text;
                    break;
                }
            }

            return data;
        });

        console.log('\n🏏 MATCH INFORMATION:');
        console.log('='.repeat(60));
        console.log(`Teams: ${matchData.teams.join(' vs ')}`);
        console.log(`Result: ${matchData.result}`);
        console.log(`Score: ${matchData.score}`);

        // Access commentary tab
        console.log('\n📝 Accessing commentary...');
        try {
            await page.click('::-p-text(COMMENTARY)');
            console.log('✅ COMMENTARY tab accessed');
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
            console.log('⚠️  Could not access COMMENTARY tab');
        }

        // Extract detailed commentary and players
        const detailedData = await page.evaluate(() => {
            const data = {
                players: new Set(),
                commentary: [],
                ballByBall: [],
                wickets: [],
                overs: []
            };

            // Get all commentary text
            const allElements = document.querySelectorAll('*');
            const commentaryTexts = [];

            for (const el of allElements) {
                const text = el.textContent?.trim() || '';
                if (text && text.length > 5 && text.length < 300) {
                    commentaryTexts.push(text);
                }
            }

            // Process commentary to extract players and detailed info
            for (const text of commentaryTexts) {
                // Extract player names using regex patterns
                const playerPatterns = [
                    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g,  // Names like "Hani Patel"
                    /([A-Z][a-z]+\s+[A-Z][a-z]+)/g,       // Names like "Prapti Raval"
                    /([A-Z][A-Z\s]+)/g                    // Names like "TANVIR SHAIKH"
                ];

                for (const pattern of playerPatterns) {
                    const matches = text.match(pattern);
                    if (matches) {
                        for (const match of matches) {
                            // Filter out common non-player words
                            if (!/^(to|the|and|for|are|but|not|you|all|can|her|was|one|our|had|by|hot|but|about|were|this|that|with|from|they|will|would|there|their|what|when|where|how|each|which|time|year|people|way|day|man|thing|woman|life|child|world|school|state|family|student|group|country|problem|hand|part|place|case|week|company|system|program|question|work|government|number|night|point|home|water|room|mother|area|money|story|fact|month|lot|right|study|book|eye|job|word|business|issue|side|kind|head|house|service|friend|father|power|hour|game|line|end|member|law|car|city|community|name|president|team|minute|idea|kid|body|information|back|parent|face|others|level|office|door|health|person|art|war|history|party|result|change|morning|reason|research|girl|guy|moment|air|teacher|force|education)$/i.test(match) &&
                                match.length >= 4 && match.length <= 30) {
                                data.players.add(match.trim());
                            }
                        }
                    }
                }

                // Categorize commentary
                if (text.includes('wicket') || /\b(out|lbw|bowled|caught|run out)\b/i.test(text)) {
                    data.wickets.push(text);
                } else if (/^\d+\.\d+/.test(text) || text.includes(' to ')) {
                    data.ballByBall.push(text);
                } else if (text.includes('End of over') || /^\d+ overs?$/.test(text)) {
                    data.overs.push(text);
                } else if (text.length > 10) {
                    data.commentary.push(text);
                }
            }

            return {
                players: Array.from(data.players),
                commentary: data.commentary.slice(0, 50), // Limit for display
                ballByBall: data.ballByBall.slice(0, 30),
                wickets: data.wickets,
                overs: data.overs.slice(0, 20),
                totalCommentary: data.commentary.length,
                totalBallByBall: data.ballByBall.length,
                totalWickets: data.wickets.length,
                totalOvers: data.overs.length
            };
        });

        console.log('\n👥 PLAYERS EXTRACTED:');
        console.log('='.repeat(60));
        console.log(`Total Players Found: ${detailedData.players.length}`);

        if (detailedData.players.length > 0) {
            console.log('\nPlayer List:');
            detailedData.players.forEach((player, index) => {
                console.log(`  ${index + 1}. ${player}`);
            });
        }

        console.log('\n📊 COMMENTARY STATISTICS:');
        console.log('='.repeat(60));
        console.log(`Total Commentary Items: ${detailedData.totalCommentary}`);
        console.log(`Ball-by-Ball Entries: ${detailedData.totalBallByBall}`);
        console.log(`Wickets: ${detailedData.totalWickets}`);
        console.log(`Overs: ${detailedData.totalOvers}`);

        console.log('\n⚾ BALL-BY-BALL COMMENTARY:');
        console.log('='.repeat(60));
        if (detailedData.ballByBall.length > 0) {
            detailedData.ballByBall.slice(0, 15).forEach((ball, index) => {
                console.log(`  ${index + 1}. ${ball}`);
            });
            if (detailedData.ballByBall.length > 15) {
                console.log(`  ... and ${detailedData.ballByBall.length - 15} more balls`);
            }
        }

        console.log('\n🏏 WICKETS:');
        console.log('='.repeat(60));
        if (detailedData.wickets.length > 0) {
            detailedData.wickets.forEach((wicket, index) => {
                console.log(`  ${index + 1}. ${wicket}`);
            });
        }

        console.log('\n📋 OVER SUMMARIES:');
        console.log('='.repeat(60));
        if (detailedData.overs.length > 0) {
            detailedData.overs.slice(0, 10).forEach((over, index) => {
                console.log(`  ${index + 1}. ${over}`);
            });
            if (detailedData.overs.length > 10) {
                console.log(`  ... and ${detailedData.overs.length - 10} more overs`);
            }
        }

        console.log('\n🎉 EXTRACTION COMPLETE');
        console.log('='.repeat(60));
        console.log('FINAL SUMMARY:');
        console.log(`  🏏 Teams: ${matchData.teams.join(' vs ')}`);
        console.log(`  🏆 Result: ${matchData.result}`);
        console.log(`  📊 Score: ${matchData.score}`);
        console.log(`  👥 Players: ${detailedData.players.length} found`);
        console.log(`  📝 Commentary: ${detailedData.totalCommentary} items`);
        console.log(`  ⚾ Ball-by-Ball: ${detailedData.totalBallByBall} entries`);
        console.log(`  🏏 Wickets: ${detailedData.totalWickets} wickets`);
        console.log(`  📋 Overs: ${detailedData.totalOvers} over summaries`);

        // Show sample players
        if (detailedData.players.length > 0) {
            console.log('\n👥 SAMPLE PLAYERS:');
            detailedData.players.slice(0, 10).forEach((player, index) => {
                console.log(`  ${index + 1}. ${player}`);
            });
            if (detailedData.players.length > 10) {
                console.log(`  ... and ${detailedData.players.length - 10} more players`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        console.log('\n🧹 Keeping browser open for inspection...');
    }
}

extractEnhancedMatchData();
