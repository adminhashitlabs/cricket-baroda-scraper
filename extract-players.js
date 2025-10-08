const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function extractPlayerData() {
    console.log('Starting player data extraction...');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const url = 'https://www.cricketbaroda.com/match/17801317/Advick-Cricket-Academy-Women-vs-Y.S.C-Women';

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Navigate to TEAMS tab
        await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const teamsLink = links.find(link => link.textContent?.trim() === 'TEAMS');
            if (teamsLink) {
                teamsLink.scrollIntoView();
                teamsLink.click();
            }
        });

        await new Promise(resolve => setTimeout(resolve, 5000));

        // Extract teams
        const teams = [];
        const teamPillElements = await page.$$('a.sc-73674382-0');
        console.log('Team pills found:', teamPillElements.length);

        for (let i = 0; i < teamPillElements.length; i++) {
            const name = await teamPillElements[i].evaluate(el => el.textContent?.trim() || '');
            const pillId = await teamPillElements[i].evaluate(el => el.id);
            teams.push({ name, id: pillId, pillId });
        }

        console.log('Teams extracted:', teams);

        const players = [];

        // Process each team
        for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
            const team = teams[teamIndex];
            console.log(`\nProcessing team: ${team.name}`);

            // Ensure on TEAMS tab
            await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                const teamsLink = links.find(link => link.textContent?.trim() === 'TEAMS');
                if (teamsLink) {
                    teamsLink.scrollIntoView();
                    teamsLink.click();
                }
            });

            await new Promise(resolve => setTimeout(resolve, 5000));

            // Click team pill
            const pillElements = await page.$$('a.sc-73674382-0');
            if (pillElements[teamIndex]) {
                await pillElements[teamIndex].scrollIntoView();
                await pillElements[teamIndex].click();
                console.log(`Clicked team pill for ${team.name}`);
            }

            await new Promise(resolve => setTimeout(resolve, 10000));

            // Get player count
            const playerCount = await page.evaluate(() => {
                const container = document.querySelector('div.sc-970ea800-15.chYnrI');
                if (container) {
                    return container.querySelectorAll('div').length;
                }
                return 0;
            });

            console.log(`Player count for ${team.name}:`, playerCount);

            // Extract players
            for (let j = 0; j < playerCount; j++) {
                console.log(`Processing player ${j + 1}/${playerCount}`);

                const playerEl = await page.$(`div.sc-970ea800-15.chYnrI > div:nth-child(${j + 1})`);
                if (playerEl) {
                    const name = await playerEl.evaluate(el => el.textContent?.trim() || '');
                    console.log(`Player name: ${name}`);

                    // Click player to get their profile
                    await playerEl.click();
                    await page.waitForNavigation({ waitUntil: 'networkidle2' });

                    const playerUrl = page.url();
                    console.log(`Player URL: ${playerUrl}`);

                    const segments = playerUrl.split('/');
                    const id = segments[segments.length - 2];
                    console.log(`Player ID: ${id}`);

                    players.push({ name, id, teamId: team.id });

                    // Go back
                    await page.goBack();
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Re-navigate to TEAMS and re-click pill
                    await page.evaluate(() => {
                        const links = Array.from(document.querySelectorAll('a'));
                        const teamsLink = links.find(link => link.textContent?.trim() === 'TEAMS');
                        if (teamsLink) teamsLink.click();
                    });

                    await new Promise(resolve => setTimeout(resolve, 5000));

                    const pillElementsAfter = await page.$$('a.sc-73674382-0');
                    if (pillElementsAfter[teamIndex]) {
                        await pillElementsAfter[teamIndex].click();
                    }

                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // Reset to match page for next team
            await page.goto(url);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // Save to file
        const outputPath = path.join(__dirname, 'players-data.json');
        fs.writeFileSync(outputPath, JSON.stringify({ teams, players }, null, 2));

        console.log(`\nPlayer data saved to: ${outputPath}`);
        console.log(`Total players extracted: ${players.length}`);

        // Log sample data
        console.log('\nSample players:');
        players.slice(0, 10).forEach(player => {
            console.log(`${player.name} (ID: ${player.id}) - Team: ${player.teamId}`);
        });

    } catch (error) {
        console.error('Error extracting player data:', error);
    } finally {
        await browser.close();
    }
}

extractPlayerData().catch(console.error);
