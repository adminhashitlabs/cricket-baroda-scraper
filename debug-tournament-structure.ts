console.log('🚀 Starting tournament structure debugging...');

// Immediate synchronous log
console.log('📋 Script started successfully');

async function debugTournamentStructure() {
    console.log('📋 About to import modules...');

    const { CricketBarodaTournamentDiscovery } = await import('./src/platforms/cricket-baroda-tournament-discovery');
    const { logger } = await import('./src/logger');

    console.log('✅ Modules imported successfully');

    const discovery = new CricketBarodaTournamentDiscovery();
    console.log('✅ Discovery instance created');'🚀 Starting tournament structure debugging...');

async function debugTournamentStructure() {
    console.log('� About to import modules...');

    const { CricketBarodaTournamentDiscovery } = await import('./src/platforms/cricket-baroda-tournament-discovery');
    const { logger } = await import('./src/logger');

    console.log('✅ Modules imported successfully');

    const discovery = new CricketBarodaTournamentDiscovery();
    console.log('✅ Discovery instance created');

    try {
        console.log('📋 Initializing discovery system...');
        // Initialize the discovery system
        await discovery.initialize();
        console.log('✅ Discovery system initialized');

        // Navigate to the tournaments page
        const tournamentCenterUrl = 'https://www.cricketbaroda.com/match-center/tournaments';
        console.log(`🌐 Navigating to: ${tournamentCenterUrl}`);
        await discovery['scraper']['page']!.goto(tournamentCenterUrl, { waitUntil: 'networkidle2' });
        console.log('✅ Page navigation complete');

        // Select the 2021-22 season
        console.log('🎯 Selecting 2021-22 season...');
        await discovery['scraper']['page']!.select('select.sc-bc4a329-1.grmngK.form-select', '17');
        console.log('✅ Season selected');

        // Wait for the page to load
        console.log('⏳ Waiting for page to load...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Page load wait complete');

        // Get the page content to analyze structure
        console.log('📄 Getting page content...');
        const pageContent = await discovery['scraper']['page']!.content();
        console.log(`📊 Page content length: ${pageContent.length}`);

        // Look for tournament DIV elements
        console.log('🔍 Looking for tournament DIV elements...');
        const tournamentElements = await discovery['scraper']['page']!.$$('div[class*="sc-6d90bb31"]');
        console.log(`🎯 Found ${tournamentElements.length} tournament DIV elements`);

        if (tournamentElements.length > 0) {
            // Examine the first tournament element
            const firstTournament = tournamentElements[0];
            const elementHTML = await discovery['scraper']['page']!.evaluate(el => el.outerHTML, firstTournament);
            logger.info('First tournament element HTML', { html: elementHTML.substring(0, 500) });

            // Check if it has any clickable elements
            const clickableElements = await firstTournament.$$('a, button, [onclick], [role="button"]');
            logger.info(`Found ${clickableElements.length} clickable elements in first tournament`);

            // Look for any links or data attributes
            const links = await firstTournament.$$('a');
            logger.info(`Found ${links.length} links in first tournament`);

            if (links.length > 0) {
                const linkHref = await discovery['scraper']['page']!.evaluate(el => el.href, links[0]);
                logger.info('First link href', { href: linkHref });
            }

            // Check for data attributes that might contain tournament IDs
            const dataAttributes = await discovery['scraper']['page']!.evaluate(el => {
                const attrs: { [key: string]: string } = {};
                for (let attr of el.attributes) {
                    if (attr.name.startsWith('data-')) {
                        attrs[attr.name] = attr.value;
                    }
                }
                return attrs;
            }, firstTournament);

            logger.info('Data attributes on first tournament', { attributes: dataAttributes });

            // Try to find the specific U-19 Late Mama Saheb Ghorpade tournaments
            const allTournamentsText = await discovery['scraper']['page']!.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('div[class*="sc-6d90bb31"]'));
                return elements.map(el => el.textContent?.trim() || '');
            });

            const targetTournaments = allTournamentsText.filter(text =>
                text.includes('U-19 Late Mama Saheb Ghorpade') &&
                (text.includes('Elite Group') || text.includes('Plate Group'))
            );

            logger.info('Found target tournament texts', {
                count: targetTournaments.length,
                tournaments: targetTournaments
            });

            // Try clicking on the first target tournament to see what happens
            if (targetTournaments.length > 0) {
                const targetElements = await discovery['scraper']['page']!.$$('div[class*="sc-6d90bb31"]');
                const targetElement = targetElements.find(async (el) => {
                    const text = await discovery['scraper']['page']!.evaluate(e => e.textContent?.trim() || '', el);
                    return text.includes('U-19 Late Mama Saheb Ghorpade Elite Group');
                });

                if (targetElement) {
                    logger.info('Attempting to click on target tournament element');

                    // Try different click methods
                    try {
                        await targetElement.click();
                        await new Promise(resolve => setTimeout(resolve, 2000));

                        const currentUrl = discovery['scraper']['page']!.url();
                        logger.info('URL after clicking tournament', { url: currentUrl });

                        // Check if page changed
                        if (currentUrl !== tournamentCenterUrl) {
                            logger.info('Page navigation successful!');

                            // Extract match information from the new page
                            const matchElements = await discovery['scraper']['page']!.$$('[class*="match"], [class*="fixture"], .match-card, .fixture-card');
                            logger.info(`Found ${matchElements.length} potential match elements on tournament page`);
                        } else {
                            logger.info('Page did not change after click - tournament might not be clickable');
                        }
                    } catch (clickError) {
                        logger.error('Error clicking tournament element', clickError as Error);
                    }
                }
            }
        }

    } catch (error) {
        console.log('❌ Error in debug script:', error);
        const errorObj = error instanceof Error ? error : new Error(String(error));
        logger.error('Error debugging tournament structure', errorObj);
    } finally {
        console.log('🧹 Cleaning up resources...');
        // Clean up resources
        await discovery.cleanup();
        console.log('✅ Cleanup complete');
    }
}

// Run the debug script
debugTournamentStructure().catch(console.error);
