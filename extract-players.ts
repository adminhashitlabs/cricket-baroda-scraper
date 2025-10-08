import WebScraper from './src/scraper';
import { TeamPlayerExtractor } from './src/teams';
import * as fs from 'fs';
import * as path from 'path';

const url = 'https://www.cricketbaroda.com/match/17797270/Y.S.C-Women-vs-Combined-Disrict-Women---1';

async function extractPlayerData() {
    console.log('Starting player data extraction...');

    const scraper = new WebScraper(url);
    await scraper.initBrowser();

    try {
        // Extract teams and players
        const extractor = new TeamPlayerExtractor(scraper['browser']!, scraper['page']!, url);
        const { teams, players } = await extractor.run();

        console.log('Teams found:', teams.length);
        console.log('Players found:', players.length);

        // Save to file
        const outputPath = path.join(__dirname, 'players-data.json');
        fs.writeFileSync(outputPath, JSON.stringify({ teams, players }, null, 2));

        console.log(`Player data saved to: ${outputPath}`);

        // Log some sample data
        console.log('\nSample players:');
        players.slice(0, 5).forEach(player => {
            console.log(`${player.name} (ID: ${player.id}) - Team: ${player.teamId}`);
        });

    } catch (error) {
        console.error('Error extracting player data:', error);
    } finally {
        await scraper.closeBrowser();
    }
}

extractPlayerData().catch(console.error);
