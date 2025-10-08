import { CricketBarodaTournamentDiscovery } from './platforms/cricket-baroda-tournament-discovery';
import { logger } from './logger';

/**
 * Debug script to investigate why getAvailableSeasons returns 0 seasons
 */
async function debugSeasonSelector() {
    const discovery = new CricketBarodaTournamentDiscovery();

    try {
        logger.info('Starting season selector debug', {}, 'SeasonDebug');

        // Initialize the discovery system
        await discovery.initialize();
        logger.info('Discovery system initialized', {}, 'SeasonDebug');

        // Navigate to tournaments page
        const tournamentCenterUrl = 'https://www.cricketbaroda.com/match-center/tournaments';
        await discovery['scraper']['page']!.goto(tournamentCenterUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        logger.info('Navigated to tournaments page', { url: tournamentCenterUrl }, 'SeasonDebug');

        // Wait a bit for dynamic content to load
        await new Promise(resolve => setTimeout(resolve, 5000));
        logger.info('Waited 5 seconds for content to load', {}, 'SeasonDebug');

        // Check if the page loaded correctly
        const pageTitle = await discovery['scraper']['page']!.title();
        logger.info('Page title', { title: pageTitle }, 'SeasonDebug');

        // Check if season selector exists
        const selectorExists = await discovery['scraper']['page']!.evaluate(() => {
            const selector = document.querySelector('select.sc-bc4a329-1.grmngK.form-select') as HTMLSelectElement;
            return {
                exists: !!selector,
                selector: selector ? selector.outerHTML : null,
                options: selector ? Array.from(selector.options).map((opt: HTMLOptionElement) => ({ value: opt.value, text: opt.text })) : []
            };
        });

        logger.info('Season selector check', {
            exists: selectorExists.exists,
            optionsCount: selectorExists.options.length,
            options: selectorExists.options
        }, 'SeasonDebug');

        if (!selectorExists.exists) {
            // Try alternative selectors
            const alternativeSelectors = [
                'select.form-select',
                'select[name*="season"]',
                'select[name*="year"]',
                'select[class*="season"]',
                'select[class*="year"]',
                'select'
            ];

            for (const altSelector of alternativeSelectors) {
                const altResult = await discovery['scraper']['page']!.evaluate((sel: string) => {
                    const element = document.querySelector(sel) as HTMLSelectElement;
                    return {
                        selector: sel,
                        exists: !!element,
                        options: element ? Array.from(element.options).map(opt => ({ value: opt.value, text: opt.text })) : []
                    };
                }, altSelector);

                if (altResult.exists && altResult.options.length > 0) {
                    logger.info('Found alternative selector', altResult, 'SeasonDebug');
                    break;
                }
            }

            // Check the entire page for any select elements
            const allSelects = await discovery['scraper']['page']!.evaluate(() => {
                const selects = document.querySelectorAll('select');
                return Array.from(selects).map(sel => ({
                    tagName: sel.tagName,
                    className: sel.className,
                    id: sel.id,
                    name: sel.name,
                    options: Array.from(sel.options).map(opt => ({ value: opt.value, text: opt.text }))
                }));
            });

            logger.info('All select elements on page', { count: allSelects.length, selects: allSelects }, 'SeasonDebug');
        }

        // Take a screenshot for visual inspection
        await discovery['scraper']['page']!.screenshot({ path: 'debug-season-selector.png', fullPage: true });
        logger.info('Screenshot saved as debug-season-selector.png', {}, 'SeasonDebug');

    } catch (error) {
        logger.error('Season selector debug failed', error as Error, {}, 'SeasonDebug');
    } finally {
        await discovery.cleanup();
    }
}

// Run the debug
debugSeasonSelector().catch(console.error);
