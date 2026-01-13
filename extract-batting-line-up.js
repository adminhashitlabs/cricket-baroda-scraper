import { launch } from 'puppeteer';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { group } from 'console';

async function extractBattingScoreCardData(url) {
    console.log('Starting Batting scorecard extraction...');

    const browser = await launch({
        headless: false,
    });

    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        await new Promise(resolve => setTimeout(resolve, 2000));

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
       
        const battingInnings = await page.evaluate(async()=>{
            scorecard_button = document.querySelectorAll('.sc-83d0d22b-3')[1].querySelector('a');
            scorecard_button.click();

            //sleep
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            let innings = [];

            const battingTeamNamesElements = document.querySelectorAll('h3.sc-7a881374-9, .eJsSZa');
            const tables = document.querySelectorAll('table.sc-7a881374-15, .gXJhZN');

            battingTeamNamesElements.forEach((teamNameElement, index) => {
                const teamName = teamNameElement.textContent.trim();
                const table = tables[index];
                console.log('Processing team:', teamName);
                const rows = table.querySelectorAll('tbody tr');
                const currentInning = {
                    teamName: teamName,
                    players: [],
                };
                for(row of rows){
                    const columns = row.querySelectorAll('td');
                    if(columns.length < 6){
                        continue;
                    }
                    const playerName = columns[0].textContent.trim();
                    const outString = columns[1].textContent.trim();
                    currentInning.players.push({
                        playerName,
                        outString,
                    });
                }
                innings.push(currentInning);
            });
            return innings;
        });

        console.log('Extracted Batting Innings:', battingInnings);

        // write batting data to a json file
        const battingOutputPath = join(__dirname, 'data-ingestion-src/batting-data.json');
        writeFileSync(battingOutputPath, JSON.stringify(battingInnings, null, 2));
        console.log(`Batting data written to ${battingOutputPath}`);

    } catch (error) {
        console.error('Error extracting player data:', error);
    } finally {
        await browser.close();
    }
}

async function extractBattingScoreCard(url) {
    return await extractBattingScoreCardData(url);
}

export default { extractBattingScoreCard };

// Run if called directly
extractBattingScoreCard(
    'https://cricketbaroda.com/match/19775431/Navsari-District-U-14-vs-Billimora-District-U-14' // pass the match url here 
).catch(console.error);
