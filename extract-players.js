import { launch } from 'puppeteer';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

async function extractPlayerData(url) {
    console.log('Starting player data extraction...');

    const browser = await launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.evaluate(()=>{});

        // Extract teams
        const teams = await page.evaluate(() =>{
            const teamAnchorParents = document.querySelectorAll('.sc-3d56998f-7.OdhRR');
            const teams= [];
            console.log('Team pills found:', teamAnchorParents.length);
    
            for (let i = 0; i < teamAnchorParents.length; i++) {
                const name = teamAnchorParents[i].querySelector('a')?.textContent;
                const pillId = teamAnchorParents[i].querySelector('a')?.getAttribute('href')?.split('/')[2];
                teams.push({ name, id: pillId, pillId });
            }
    
            console.log('Teams extracted:', teams);

            return teams;
    
        });
    
        // extract players for teams
        const players = await page.evaluate(() => {
            const teamUls = document.querySelectorAll('.sc-3d56998f-12.cGApab');
            const playersForMatch = [];
            for(const ul of teamUls){
                const currentTeamPlayers = [];
                const playerAnchorElements = ul.querySelectorAll('a');

                for(const playerAnchorElement of playerAnchorElements){
                    const name = playerAnchorElement.textContent?.trim() || '';
                    const playerId = playerAnchorElement.getAttribute('href').split('/')[2];

                    const player = { name, id: playerId };
                    currentTeamPlayers.push(player);

                }
                if(currentTeamPlayers.length > 0){
                    playersForMatch.push(currentTeamPlayers);
                }
            }

            return playersForMatch;
        });

        const [teamOnePlayers, teamTwoPlayers] = players;

        // Save to file
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const outputPath = join(__dirname, 'data-ingestion-src/players-data.json');
        writeFileSync(outputPath, JSON.stringify({ teams, teamOnePlayers, teamTwoPlayers }, null, 2));

        console.log(`\nPlayer data saved to: ${outputPath}`);
        console.log(`Total players extracted: ${teamOnePlayers.length + teamTwoPlayers.length}`);
   

    } catch (error) {
        console.error('Error extracting player data:', error);
    } finally {
        await browser.close();
    }
}

async function extractPlayers(url) {
    return await extractPlayerData(url);
}

export default { extractPlayers };

// Run if called directly
extractPlayerData(
    'https://cricketbaroda.com/match/18089466/AMI-SUPER-AVENGERS-vs-ALEMBIC-WARRIORS' // pass the match url here 
).catch(console.error);
