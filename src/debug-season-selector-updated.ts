import { CricketBarodaTournamentScraper } from './platforms/cricket-baroda-tournament-scraper';
import { logger } from './logger';

async function debugSeasonSelector() {
    const scraper = new CricketBarodaTournamentScraper();

    try {
        logger.info('Debugging season selector', {}, 'DebugSeason');

        await scraper.initialize();

        // Navigate to tournaments page
        const tournamentCenterUrl = 'https://www.cricketbaroda.com/match-center/tournaments';
        await scraper['page']!.goto(tournamentCenterUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Debug the page content
        const pageInfo = await scraper['page']!.evaluate(() => {
            const seasonSelect = document.querySelector('select.sc-bc4a329-1.grmngK.form-select') as HTMLSelectElement;
            const allSelects = document.querySelectorAll('select');
            const allOptions = document.querySelectorAll('option');

            return {
                title: document.title,
                url: window.location.href,
                seasonSelectExists: !!seasonSelect,
                seasonSelectOptions: seasonSelect ? seasonSelect.options.length : 0,
                totalSelects: allSelects.length,
                totalOptions: allOptions.length,
                bodyText: document.body.textContent?.substring(0, 1000) || '',
                selectDetails: Array.from(allSelects).map((select, index) => ({
                    index,
                    name: select.name,
                    className: select.className,
                    id: select.id,
                    optionCount: select.options.length,
                    firstOption: select.options.length > 0 ? select.options[0].text : 'No options'
                }))
            };
        });

        console.log('Page Info:');
        console.log(`Title: ${pageInfo.title}`);
        console.log(`URL: ${pageInfo.url}`);
        console.log(`Season select exists: ${pageInfo.seasonSelectExists}`);
        console.log(`Season select options: ${pageInfo.seasonSelectOptions}`);
        console.log(`Total selects: ${pageInfo.totalSelects}`);
        console.log(`Total options: ${pageInfo.totalOptions}`);
        console.log('');

        console.log('All Select Elements:');
        pageInfo.selectDetails.forEach(detail => {
            console.log(`Select ${detail.index}: name="${detail.name}", class="${detail.className}", id="${detail.id}"`);
            console.log(`  Options: ${detail.optionCount}, First: "${detail.firstOption}"`);
        });

        console.log('');
        console.log('Body Text Preview:');
        console.log(pageInfo.bodyText);

    } catch (error) {
        logger.error('Debug season selector failed', error as Error, {}, 'DebugSeason');
    } finally {
        await scraper.cleanup();
    }
}

debugSeasonSelector().catch(console.error);
