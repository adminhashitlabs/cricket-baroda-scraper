const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class CompleteMatchExtractor {
    constructor(browser, page, url) {
        this.browser = browser;
        this.page = page;
        this.url = url;
        this.playerLookup = new Map();
        this.teams = [];
        this.loadPlayerData();
    }

    loadPlayerData() {
        try {
            const playerDataPath = path.join(__dirname, 'players-data.json');
            if (fs.existsSync(playerDataPath)) {
                const playerData = JSON.parse(fs.readFileSync(playerDataPath, 'utf-8'));
                this.teams = playerData.teams || [];

                // Create lookup map from player name to ID
                this.playerLookup.clear();
                const players = playerData.players || [];
                players.forEach(player => {
                    this.playerLookup.set(player.name.toLowerCase().trim(), {
                        name: player.name,
                        id: player.id,
                        teamId: player.teamId
                    });
                });

                console.log(`✅ Player data loaded: ${this.teams.length} teams, ${players.length} players`);
            } else {
                console.log('⚠️  Player data file not found');
            }
        } catch (error) {
            console.error('❌ Failed to load player data:', error.message);
        }
    }

    getPlayerByName(playerName) {
        if (!playerName || playerName.trim().length === 0) {
            return null;
        }

        const normalizedName = playerName.toLowerCase().trim();

        // Try exact match first
        let player = this.playerLookup.get(normalizedName);
        if (player) return player;

        // Try case-insensitive match
        for (const [name, playerData] of this.playerLookup.entries()) {
            if (name.toLowerCase() === normalizedName) {
                return playerData;
            }
        }

        // Try partial matches
        for (const [name, playerData] of this.playerLookup.entries()) {
            const normalizedStored = name.toLowerCase();
            if (normalizedStored.includes(normalizedName) || normalizedName.includes(normalizedStored)) {
                return playerData;
            }

            // Try matching first and last names
            const extractedParts = normalizedName.split(' ');
            const storedParts = normalizedStored.split(' ');

            if (extractedParts.length >= 2 && storedParts.length >= 2) {
                const extractedFirst = extractedParts[0];
                const extractedLast = extractedParts[extractedParts.length - 1];
                const storedFirst = storedParts[0];
                const storedLast = storedParts[storedParts.length - 1];

                if ((extractedFirst === storedFirst || extractedFirst === storedLast) &&
                    (extractedLast === storedLast || extractedLast === storedFirst)) {
                    return playerData;
                }
            }
        }

        return null;
    }

    parseCommentaryIntoOvers(commentaryItems) {
        const overs = [];
        const overMap = new Map();

        for (const item of commentaryItems) {
            const text = item.text;

            // Look for over patterns like "End of over 20", "19.5", etc.
            // More flexible regex to catch over.ball notation anywhere in text
            const overMatch = text.match(/End of over (\d+)|(\d{1,2})\.([1-7])(?!\d)/);
            if (overMatch) {
                const overNumber = overMatch[1] || overMatch[2];
                const ballNumber = overMatch[3];

                if (ballNumber) {
                    // Validate that this is a reasonable over/ball combination
                    const overNum = parseInt(overNumber);
                    const ballNum = parseInt(ballNumber);

                    // Skip if over number is unreasonably high (>50 for most cricket formats)
                    if (overNum > 50) continue;

                    // Fix: Take only the first digit after the dot as ball number
                    const actualBallNumber = ballNum;

                    if (!overMap.has(overNumber)) {
                        overMap.set(overNumber, {
                            over: parseInt(overNumber),
                            balls: []
                        });
                    }

                    const over = overMap.get(overNumber);

                    // Parse ball information
                    const ballInfo = this.parseBallInfo(text);
                    if (ballInfo) {
                        ballInfo.ball = actualBallNumber;
                        over.balls.push(ballInfo);
                    }
                }
            } else {
                // Look for individual ball patterns like "19.51Jaya Mohite to Prapti Raval, 1 run"
                // Format: over.ball[extra]Bowler Name to Batsman Name, result
                const ballMatch = text.match(/(\d{1,2})\.(\d{1,2})([A-Z0-9]*)([A-Z][A-Za-z\s]+) to ([A-Za-z\s]+),/);
                if (ballMatch) {
                    const overNumber = ballMatch[1];
                    const ballNumber = ballMatch[2];
                    const extra = ballMatch[3]; // Things like "1", "WD", etc.
                    const bowlerName = ballMatch[4];
                    const batsmanName = ballMatch[5];

                    // Validate over number
                    const overNum = parseInt(overNumber);
                    if (overNum > 50) continue;

                    // Ball number should be 1-6 (or 7 for no-balls), take first digit if multi-digit
                    let actualBallNumber = parseInt(ballNumber.toString()[0]);
                    if (actualBallNumber < 1 || actualBallNumber > 7) {
                        actualBallNumber = parseInt(ballNumber);
                    }

                    if (!overMap.has(overNumber)) {
                        overMap.set(overNumber, {
                            over: parseInt(overNumber),
                            balls: []
                        });
                    }

                    const over = overMap.get(overNumber);
                    const ballInfo = this.parseBallInfo(text);
                    if (ballInfo) {
                        ballInfo.ball = actualBallNumber;
                        over.balls.push(ballInfo);
                    }
                }
            }
        }

        // Convert map to array and sort
        for (const over of overMap.values()) {
            over.balls.sort((a, b) => a.ball - b.ball);
            overs.push(over);
        }

        overs.sort((a, b) => a.over - b.over);
        return overs;
    }

    parseBallInfo(text) {
        // Extract bowler and batsman
        const bowlerMatch = text.match(/([A-Za-z\s]+) to ([A-Za-z\s]+),/);
        let bowler = null;
        let batsman = null;

        if (bowlerMatch) {
            bowler = this.getPlayerByName(bowlerMatch[1].trim());
            batsman = this.getPlayerByName(bowlerMatch[2].trim());
        }

        // Extract runs
        let runs = 0;
        const runsMatch = text.match(/(\d+) run|(\d+) runs/);
        if (runsMatch) {
            runs = parseInt(runsMatch[1] || runsMatch[2]);
        } else if (text.includes('no run')) {
            runs = 0;
        } else if (text.includes('wide') || text.includes('bye') || text.includes('leg bye')) {
            runs = 1; // Extras
        }

        // Extract wickets
        let wickets = 0;
        let wicketType = null;
        if (text.includes('OUT') || text.includes('out') || text.includes('wicket')) {
            wickets = 1;
            if (text.includes('bowled')) wicketType = 'bowled';
            else if (text.includes('caught')) wicketType = 'caught';
            else if (text.includes('lbw')) wicketType = 'lbw';
            else if (text.includes('run out')) wicketType = 'run out';
            else wicketType = 'other';
        }

        // Extract shot area (if mentioned)
        let shotArea = null;
        if (text.includes('cover')) shotArea = 'cover';
        else if (text.includes('point')) shotArea = 'point';
        else if (text.includes('mid-off')) shotArea = 'mid-off';
        else if (text.includes('mid-on')) shotArea = 'mid-on';
        else if (text.includes('square leg')) shotArea = 'square leg';
        else if (text.includes('fine leg')) shotArea = 'fine leg';

        return {
            ball: null, // Will be set by caller
            bowler: bowler,
            batsman: batsman,
            runs: runs,
            wickets: wickets,
            wicketType: wicketType,
            shotArea: shotArea,
            description: text.trim()
        };
    }

    async extractCompleteMatchData() {
        console.log('🚀 Starting complete match data extraction...');

        try {
            console.log(`📍 Navigating to match: ${this.url}`);
            await this.page.goto(this.url, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            await new Promise(resolve => setTimeout(resolve, 5000));

            // Extract basic match information
            const matchInfo = await this.page.evaluate(() => {
                const info = {
                    title: document.title,
                    url: window.location.href,
                    teams: [],
                    score: '',
                    result: '',
                    venue: '',
                    date: '',
                    matchType: 'T20' // Default assumption
                };

                // Extract teams from title
                const title = document.title;
                const teamMatch = title.match(/(.+?)\s*vs\s*(.+?)\s*\|/);
                if (teamMatch) {
                    info.teams = [teamMatch[1].trim(), teamMatch[2].trim()];
                }

                // Extract result
                const resultSelectors = ['.result', '[class*="result"]', '.status', '[class*="status"]', 'p'];
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

                return info;
            });

            console.log(`Title: ${matchInfo.title}`);
            console.log(`Teams: ${matchInfo.teams.join(' vs ')}`);
            console.log(`Result: ${matchInfo.result || 'Not found'}`);

            // Navigate to COMMENTARY tab
            console.log('\n📝 Accessing COMMENTARY tab...');
            try {
                await this.page.click('::-p-text(COMMENTARY)');
                console.log('✅ COMMENTARY tab accessed');
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error) {
                console.log('⚠️  Could not access COMMENTARY tab, extracting available data...');
            }

            // Extract commentary
            const commentaryData = await this.page.evaluate(() => {
                const commentary = [];

                // Look for commentary elements - be selective but not too restrictive
                const selectors = [
                    '.commentary', '[class*="commentary"]', '.ball', '[class*="ball"]',
                    'td', 'tr', '.card-body', '[class*="card"]'
                ];

                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    for (const el of elements) {
                        const text = el.textContent?.trim() || '';
                        if (text && text.length > 10 && text.length < 200) {
                            // Include text that has over.ball notation OR wicket/delivery keywords
                            // But exclude obvious non-commentary like strike rates
                            if ((/\d+\.\d+/.test(text) || /\b(?:wicket|out|lbw|bowled|caught|run|to|,)\b/i.test(text)) &&
                                !/\bSR:\s*\d+\.\d+/.test(text) && // Exclude strike rate patterns
                                !/\bCRR:\s*\d+\.\d+/.test(text) && // Exclude current run rate
                                !/\bRR:\s*\d+\.\d+/.test(text) &&   // Exclude required run rate
                                !text.includes('http') &&
                                !text.includes('Copyright') &&
                                !text.includes('Baroda Cricket Association')) {
                                commentary.push({
                                    text: text,
                                    type: 'ball',
                                    element: selector
                                });
                            }
                        }
                    }
                }

                // Get all text that might be commentary - be less restrictive
                const allTextElements = document.querySelectorAll('*');
                for (const el of allTextElements) {
                    const text = el.textContent?.trim() || '';
                    if (text && text.length > 20 && text.length < 150) {
                        // Include text with over.ball notation and delivery keywords
                        if (/\d+\.\d+/.test(text) &&
                            /\b(?:to|runs?|wicket|over|ball|bowled|caught|lbw|out|,)\b/i.test(text) &&
                            !/\bSR:\s*\d+\.\d+/.test(text) && // Exclude strike rate patterns
                            !/\bCRR:\s*\d+\.\d+/.test(text) && // Exclude current run rate
                            !/\bRR:\s*\d+\.\d+/.test(text) &&   // Exclude required run rate
                            !text.includes('http') &&
                            !text.includes('Copyright') &&
                            !text.includes('Baroda Cricket Association')) {
                            commentary.push({
                                text: text,
                                type: 'general',
                                element: el.tagName.toLowerCase()
                            });
                        }
                    }
                }

                return commentary;
            });

            console.log(`📊 Found ${commentaryData.length} commentary items`);

            // Parse commentary into overs structure
            const overs = this.parseCommentaryIntoOvers(commentaryData);
            console.log(`📋 Organized into ${overs.length} overs`);

            // Organize teams with players
            const teamsWithPlayers = this.teams.map(team => {
                const teamPlayers = [];
                for (const [name, playerData] of this.playerLookup.entries()) {
                    if (playerData.teamId === team.id) {
                        teamPlayers.push({
                            name: playerData.name,
                            id: playerData.id
                        });
                    }
                }

                return {
                    name: team.name,
                    id: team.id,
                    players: teamPlayers
                };
            });

            // Create the complete JSON structure as requested
            const completeMatchData = {
                match: {
                    title: matchInfo.title,
                    url: this.url,
                    teams: matchInfo.teams,
                    result: matchInfo.result,
                    venue: matchInfo.venue,
                    date: matchInfo.date,
                    matchType: matchInfo.matchType
                },
                teams: teamsWithPlayers,
                commentary: overs
            };

            // Save to JSON file
            const jsonFileName = `complete_match_${Date.now()}.json`;
            fs.writeFileSync(jsonFileName, JSON.stringify(completeMatchData, null, 2));
            console.log(`\n💾 Complete match data saved to: ${jsonFileName}`);

            // Summary
            console.log('\n🎉 EXTRACTION COMPLETE');
            console.log('='.repeat(60));
            console.log('SUMMARY:');
            console.log(`  ✅ Teams: ${teamsWithPlayers.length} teams loaded`);
            console.log(`  ✅ Players: ${teamsWithPlayers.reduce((sum, team) => sum + team.players.length, 0)} players`);
            console.log(`  ✅ Commentary: ${overs.length} overs, ${overs.reduce((sum, over) => sum + over.balls.length, 0)} balls`);
            console.log(`  ✅ Match Result: ${matchInfo.result ? 'Found' : 'Not found'}`);
            console.log(`  💾 JSON File: ${jsonFileName}`);

            // Show sample structure
            if (overs.length > 0) {
                console.log('\n📋 SAMPLE OVER STRUCTURE:');
                const sampleOver = overs[0];
                console.log(`Over ${sampleOver.over}:`);
                sampleOver.balls.slice(0, 3).forEach(ball => {
                    console.log(`  Ball ${ball.ball}: ${ball.runs} runs, ${ball.wickets} wickets`);
                    if (ball.bowler) console.log(`    Bowler: ${ball.bowler.name} (ID: ${ball.bowler.id})`);
                    if (ball.batsman) console.log(`    Batsman: ${ball.batsman.name} (ID: ${ball.batsman.id})`);
                    if (ball.shotArea) console.log(`    Shot: ${ball.shotArea}`);
                    console.log(`    "${ball.description}"`);
                    console.log('');
                });
            }

            return completeMatchData;

        } catch (error) {
            console.error('❌ Error:', error.message);
            throw error;
        }
    }
}

async function runCompleteExtraction() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    const matchUrl = 'https://www.cricketbaroda.com/match/17801317/Advick-Cricket-Academy-Women-vs-Y.S.C-Women';

    try {
        const extractor = new CompleteMatchExtractor(browser, page, matchUrl);
        await extractor.extractCompleteMatchData();
    } catch (error) {
        console.error('❌ Extraction failed:', error.message);
    } finally {
        console.log('\n🔒 Closing browser...');
        await browser.close();
        console.log('✅ Browser closed successfully');
    }
}

runCompleteExtraction();
