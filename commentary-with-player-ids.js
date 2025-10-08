const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class CommentaryExtractorWithPlayerIds {
    constructor(browser, page, url) {
        this.browser = browser;
        this.page = page;
        this.url = url;
        this.playerLookup = new Map();
        this.loadPlayerData();
    }

    loadPlayerData() {
        try {
            const playerDataPath = path.join(__dirname, 'players-data.json');
            if (fs.existsSync(playerDataPath)) {
                const playerData = JSON.parse(fs.readFileSync(playerDataPath, 'utf-8'));
                const players = playerData.players || [];

                // Create lookup map from player name to ID
                this.playerLookup.clear();
                players.forEach(player => {
                    this.playerLookup.set(player.name.toLowerCase().trim(), player.id);
                });

                console.log(`✅ Player data loaded successfully: ${players.length} players`);
            } else {
                console.log('⚠️  Player data file not found, proceeding without player IDs');
            }
        } catch (error) {
            console.error('❌ Failed to load player data:', error.message);
        }
    }

    getPlayerId(playerName) {
        if (!playerName || playerName.trim().length === 0) {
            return undefined;
        }

        const normalizedName = playerName.toLowerCase().trim();

        // Try exact match first
        const exactMatch = this.playerLookup.get(normalizedName);
        if (exactMatch) {
            return exactMatch;
        }

        // Try case-insensitive match
        for (const [name, id] of this.playerLookup.entries()) {
            if (name.toLowerCase() === normalizedName) {
                return id;
            }
        }

        // Try partial matches for common name variations
        for (const [name, id] of this.playerLookup.entries()) {
            const normalizedStored = name.toLowerCase();
            // Check if one contains the other
            if (normalizedStored.includes(normalizedName) || normalizedName.includes(normalizedStored)) {
                return id;
            }

            // Try matching first and last names
            const extractedParts = normalizedName.split(' ');
            const storedParts = normalizedStored.split(' ');

            if (extractedParts.length >= 2 && storedParts.length >= 2) {
                const extractedFirst = extractedParts[0];
                const extractedLast = extractedParts[extractedParts.length - 1];
                const storedFirst = storedParts[0];
                const storedLast = storedParts[storedParts.length - 1];

                // Match first and last names
                if ((extractedFirst === storedFirst || extractedFirst === storedLast) &&
                    (extractedLast === storedLast || extractedLast === storedFirst)) {
                    return id;
                }
            }
        }

        return undefined;
    }

    async extractCompleteMatchData() {
        console.log('🚀 Starting comprehensive match data extraction with player IDs...');

        try {
            console.log(`📍 Navigating to match: ${this.url}`);
            await this.page.goto(this.url, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            // Wait for content to load
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
                    date: ''
                };

                // Extract teams from title
                const title = document.title;
                const teamMatch = title.match(/(.+?)\s*vs\s*(.+?)\s*\|/);
                if (teamMatch) {
                    info.teams = [teamMatch[1].trim(), teamMatch[2].trim()];
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

            // Extract commentary with player IDs
            const commentaryData = await this.page.evaluate(() => {
                const commentary = {
                    balls: [],
                    allCommentary: []
                };

                // Look for commentary elements
                const commentarySelectors = [
                    '.commentary',
                    '[class*="commentary"]',
                    '.ball',
                    '[class*="ball"]',
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

            console.log(`📊 Found ${commentaryData.allCommentary.length} commentary items`);

            // Process commentary and append player IDs
            const processedCommentary = [];
            for (const item of commentaryData.allCommentary) {
                const playersInText = this.extractPlayersFromText(item.text);
                const commentaryWithIds = {
                    ...item,
                    players: playersInText.map(player => ({
                        name: player,
                        id: this.getPlayerId(player)
                    }))
                };
                processedCommentary.push(commentaryWithIds);
            }

            // Create comprehensive JSON output
            const completeMatchData = {
                match: {
                    url: this.url,
                    title: matchInfo.title,
                    teams: matchInfo.teams,
                    result: matchInfo.result,
                    venue: matchInfo.venue,
                    date: matchInfo.date
                },
                players: {
                    totalLoaded: this.playerLookup.size,
                    lookupMap: Object.fromEntries(this.playerLookup)
                },
                commentary: {
                    total: processedCommentary.length,
                    items: processedCommentary
                },
                metadata: {
                    extractionDate: new Date().toISOString(),
                    source: 'CricketBaroda',
                    extractor: 'CommentaryExtractor with Player IDs',
                    playerDataLoaded: true
                }
            };

            // Save to JSON file
            const jsonFileName = `match_with_player_ids_${Date.now()}.json`;
            fs.writeFileSync(jsonFileName, JSON.stringify(completeMatchData, null, 2));
            console.log(`\n💾 Match data with player IDs saved to: ${jsonFileName}`);

            // Summary
            console.log('\n🎉 EXTRACTION COMPLETE WITH PLAYER IDs');
            console.log('='.repeat(60));
            console.log('SUMMARY:');
            console.log(`  ✅ Teams: ${matchInfo.teams.length > 0 ? 'Found' : 'Not found'}`);
            console.log(`  ✅ Player Data: ${this.playerLookup.size} players loaded`);
            console.log(`  ✅ Commentary: ${processedCommentary.length} items with player IDs`);
            console.log(`  ✅ Match Result: ${matchInfo.result ? 'Found' : 'Not found'}`);
            console.log(`  💾 JSON File: ${jsonFileName}`);

            // Show sample commentary with player IDs
            const itemsWithPlayers = processedCommentary.filter(item =>
                item.players.some(p => p.id)
            );

            if (itemsWithPlayers.length > 0) {
                console.log('\n🎯 COMMENTARY ITEMS WITH PLAYER IDs:');
                itemsWithPlayers.slice(0, 5).forEach((item, index) => {
                    console.log(`  ${index + 1}. "${item.text}"`);
                    item.players.forEach(player => {
                        if (player.id) {
                            console.log(`     👤 ${player.name} (ID: ${player.id})`);
                        }
                    });
                    console.log('');
                });
            }

            return completeMatchData;

        } catch (error) {
            console.error('❌ Error:', error.message);
            throw error;
        }
    }

    extractPlayersFromText(text) {
        const players = [];
        const words = text.split(/\s+/);

        // Look for potential player names (2-4 word combinations)
        for (let i = 0; i < words.length; i++) {
            for (let len = 2; len <= 4 && i + len <= words.length; len++) {
                const potentialName = words.slice(i, i + len).join(' ');
                if (potentialName.length > 3 && potentialName.length < 30) {
                    // Check if it looks like a name
                    const hasLetters = /[a-zA-Z]/.test(potentialName);
                    const hasNumbers = /\d/.test(potentialName);
                    const noSpecial = !/[^\w\s]/.test(potentialName);

                    if (hasLetters && !hasNumbers && noSpecial) {
                        // Not a common word
                        const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'had', 'by', 'hot', 'but', 'about', 'were', 'this', 'that', 'with', 'from', 'they', 'will', 'would', 'there', 'their', 'what', 'when', 'where', 'how', 'each', 'which', 'time', 'year', 'people', 'way', 'day', 'man', 'thing', 'woman', 'life', 'child', 'world', 'school', 'state', 'family', 'student', 'group', 'country', 'problem', 'hand', 'part', 'place', 'case', 'week', 'company', 'system', 'program', 'question', 'work', 'government', 'number', 'night', 'point', 'home', 'water', 'room', 'mother', 'area', 'money', 'story', 'fact', 'month', 'lot', 'right', 'study', 'book', 'eye', 'job', 'word', 'business', 'issue', 'side', 'kind', 'head', 'house', 'service', 'friend', 'father', 'power', 'hour', 'game', 'line', 'end', 'member', 'law', 'car', 'city', 'community', 'name', 'president', 'team', 'minute', 'idea', 'kid', 'body', 'information', 'back', 'parent', 'face', 'others', 'level', 'office', 'door', 'health', 'person', 'art', 'war', 'history', 'party', 'result', 'change', 'morning', 'reason', 'research', 'girl', 'guy', 'moment', 'air', 'teacher', 'force', 'education'];

                        const isCommonWord = potentialName.toLowerCase().split(' ').some(word =>
                            commonWords.includes(word.toLowerCase()) ||
                            word.length < 2
                        );

                        if (!isCommonWord && !players.includes(potentialName)) {
                            players.push(potentialName);
                        }
                    }
                }
            }
        }

        return players;
    }
}

async function runExtraction() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    const matchUrl = 'https://www.cricketbaroda.com/match/17801317/Advick-Cricket-Academy-Women-vs-Y.S.C-Women';

    try {
        const extractor = new CommentaryExtractorWithPlayerIds(browser, page, matchUrl);
        await extractor.extractCompleteMatchData();
    } catch (error) {
        console.error('❌ Extraction failed:', error.message);
    } finally {
        console.log('\n🔒 Closing browser...');
        await browser.close();
        console.log('✅ Browser closed successfully');
    }
}

runExtraction();
