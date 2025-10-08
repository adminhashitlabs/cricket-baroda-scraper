const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function extractCompletePlayerData() {
    console.log('🚀 Starting complete player data extraction...');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const url = 'https://www.cricketbaroda.com/match/17801317/Advick-Cricket-Academy-Women-vs-Y.S.C-Women';

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Navigate to TEAMS tab
        console.log('📋 Navigating to TEAMS tab...');
        await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a, button, div[role="tab"]'));
            const teamsLink = links.find(link =>
                link.textContent?.trim().toUpperCase() === 'TEAMS' ||
                link.textContent?.trim().toLowerCase().includes('teams')
            );
            if (teamsLink) {
                teamsLink.scrollIntoView();
                teamsLink.click();
            }
        });

        await new Promise(resolve => setTimeout(resolve, 5000));

        // Extract teams
        const teams = [];
        const teamSelectors = [
            'a.sc-73674382-0', // Original selector
            'a[href*="team"]', // Alternative
            'button[role="tab"]', // Alternative
            '.team-pill', // Alternative
            '[data-team]' // Alternative
        ];

        let teamPillElements = [];
        for (const selector of teamSelectors) {
            teamPillElements = await page.$$(selector);
            if (teamPillElements.length > 0) {
                console.log(`✅ Found ${teamPillElements.length} team pills using selector: ${selector}`);
                break;
            }
        }

        if (teamPillElements.length === 0) {
            throw new Error('No team pills found with any selector');
        }

        for (let i = 0; i < teamPillElements.length; i++) {
            const name = await teamPillElements[i].evaluate(el => el.textContent?.trim() || '');
            const pillId = await teamPillElements[i].evaluate(el => el.id || el.getAttribute('data-team-id') || `team_${i}`);
            teams.push({ name, id: pillId, pillId, index: i });
            console.log(`  Team ${i + 1}: ${name} (ID: ${pillId})`);
        }

        const allPlayers = [];

        // Process each team
        for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
            const team = teams[teamIndex];
            console.log(`\n🏏 Processing team: ${team.name} (${teamIndex + 1}/${teams.length})`);

            // Ensure on TEAMS tab
            await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a, button, div[role="tab"]'));
                const teamsLink = links.find(link =>
                    link.textContent?.trim().toUpperCase() === 'TEAMS' ||
                    link.textContent?.trim().toLowerCase().includes('teams')
                );
                if (teamsLink) {
                    teamsLink.scrollIntoView();
                    teamsLink.click();
                }
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            // Click team pill
            const pillElements = await page.$$(teamSelectors[0]); // Use the working selector
            if (pillElements[teamIndex]) {
                await pillElements[teamIndex].scrollIntoView();
                await pillElements[teamIndex].click();
                console.log(`✅ Clicked team pill for ${team.name}`);
            } else {
                console.log(`❌ Could not find team pill for ${team.name}`);
                continue;
            }

            await new Promise(resolve => setTimeout(resolve, 8000));

            // Try multiple selectors for player containers
            const playerContainerSelectors = [
                'div.sc-970ea800-15.chYnrI',
                '.player-list',
                '.players-container',
                '[class*="player"]',
                '.team-players',
                'div[role="list"]',
                'div[class*="list"]'
            ];

            let playerElements = [];
            let usedSelector = '';

            for (const selector of playerContainerSelectors) {
                try {
                    const container = await page.$(selector);
                    if (container) {
                        playerElements = await container.$$('div, a, span');
                        if (playerElements.length > 0) {
                            usedSelector = selector;
                            console.log(`✅ Found ${playerElements.length} player elements using: ${selector}`);
                            break;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            // If no container found, try direct player selectors
            if (playerElements.length === 0) {
                const directSelectors = [
                    '.player-name',
                    '[class*="player"]',
                    'a[href*="player"]',
                    'div[onclick]',
                    'span'
                ];

                for (const selector of directSelectors) {
                    playerElements = await page.$$(selector);
                    if (playerElements.length > 0 && playerElements.length <= 25) { // Reasonable limit
                        usedSelector = selector;
                        console.log(`✅ Found ${playerElements.length} player elements using direct selector: ${selector}`);
                        break;
                    }
                }
            }

            console.log(`📊 Processing ${playerElements.length} player elements for ${team.name}`);

            const teamPlayers = [];

            // Extract players
            for (let j = 0; j < playerElements.length; j++) {
                try {
                    const playerEl = playerElements[j];
                    const name = await playerEl.evaluate(el => el.textContent?.trim() || '');

                    // Skip empty or very short names
                    if (!name || name.length < 2) continue;

                    // Skip common UI text
                    const skipWords = ['players', 'team', 'squad', 'xi', 'playing', 'eleven', 'select', 'choose'];
                    if (skipWords.some(word => name.toLowerCase().includes(word))) continue;

                    console.log(`  👤 Processing player ${j + 1}/${playerElements.length}: ${name}`);

                    // Check if it's a clickable element
                    const isClickable = await playerEl.evaluate(el => {
                        return el.tagName === 'A' ||
                               el.onclick ||
                               el.getAttribute('role') === 'button' ||
                               el.closest('a') ||
                               el.closest('button');
                    });

                    if (isClickable) {
                        // Click player to get their profile
                        try {
                            await playerEl.click();
                            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });

                            const playerUrl = page.url();
                            console.log(`    🔗 Player URL: ${playerUrl}`);

                            const segments = playerUrl.split('/');
                            const id = segments[segments.length - 2];
                            console.log(`    🆔 Player ID: ${id}`);

                            teamPlayers.push({ name, id, teamId: team.id });

                            // Go back
                            await page.goBack();
                            await new Promise(resolve => setTimeout(resolve, 2000));

                        } catch (clickError) {
                            console.log(`    ⚠️  Could not click player ${name}: ${clickError.message}`);
                            // Still add player without ID
                            teamPlayers.push({ name, id: null, teamId: team.id });
                        }
                    } else {
                        console.log(`    ℹ️  Player ${name} is not clickable, adding without ID`);
                        teamPlayers.push({ name, id: null, teamId: team.id });
                    }

                    // Re-navigate to TEAMS and re-click pill after every few players
                    if ((j + 1) % 3 === 0 && j < playerElements.length - 1) {
                        console.log(`    🔄 Re-navigating to maintain context...`);
                        await page.evaluate(() => {
                            const links = Array.from(document.querySelectorAll('a, button, div[role="tab"]'));
                            const teamsLink = links.find(link =>
                                link.textContent?.trim().toUpperCase() === 'TEAMS' ||
                                link.textContent?.trim().toLowerCase().includes('teams')
                            );
                            if (teamsLink) teamsLink.click();
                        });

                        await new Promise(resolve => setTimeout(resolve, 3000));

                        const pillElementsAfter = await page.$$(teamSelectors[0]);
                        if (pillElementsAfter[teamIndex]) {
                            await pillElementsAfter[teamIndex].click();
                        }

                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }

                } catch (error) {
                    console.log(`    ❌ Error processing player ${j + 1}: ${error.message}`);
                }
            }

            console.log(`✅ Extracted ${teamPlayers.length} players for ${team.name}`);
            allPlayers.push(...teamPlayers);

            // Reset to match page for next team
            if (teamIndex < teams.length - 1) {
                await page.goto(url);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        // Remove duplicates and clean data
        const uniquePlayers = [];
        const seen = new Set();

        for (const player of allPlayers) {
            const key = `${player.name}-${player.teamId}`;
            if (!seen.has(key) && player.name && player.name.length > 1) {
                uniquePlayers.push(player);
                seen.add(key);
            }
        }

        // Save to file
        const outputPath = path.join(__dirname, 'players-data-complete.json');
        const data = {
            teams,
            players: uniquePlayers,
            metadata: {
                extractionDate: new Date().toISOString(),
                source: 'CricketBaroda TEAMS tab',
                totalPlayers: uniquePlayers.length,
                playersWithIds: uniquePlayers.filter(p => p.id).length,
                matchUrl: url
            }
        };

        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

        console.log(`\n💾 Complete player data saved to: ${outputPath}`);
        console.log(`📊 Total unique players extracted: ${uniquePlayers.length}`);
        console.log(`🆔 Players with IDs: ${uniquePlayers.filter(p => p.id).length}`);
        console.log(`❓ Players without IDs: ${uniquePlayers.filter(p => !p.id).length}`);

        // Log sample data
        console.log('\n📋 Sample players:');
        uniquePlayers.slice(0, 15).forEach((player, index) => {
            const idStatus = player.id ? `🆔 ${player.id}` : '❓ No ID';
            console.log(`  ${index + 1}. ${player.name} (${idStatus}) - Team: ${player.teamId}`);
        });

        return data;

    } catch (error) {
        console.error('❌ Error extracting player data:', error);
        throw error;
    } finally {
        console.log('\n🔒 Closing browser...');
        await browser.close();
        console.log('✅ Browser closed successfully');
    }
}

extractCompletePlayerData().catch(console.error);
