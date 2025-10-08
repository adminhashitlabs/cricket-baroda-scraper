import { CricketBarodaTournamentScraper } from './src/platforms/cricket-baroda-tournament-scraper';
import { logger } from './src/logger';

/**
 * Debug script to inspect CricketBaroda tournament page structure
 */
async function debugTournamentPage() {
    const scraper = new CricketBarodaTournamentScraper();

    try {
        logger.info('Starting CricketBaroda page structure debug', {}, 'DebugScript');

        // Initialize the scraper
        await scraper.initialize();

        const tournamentUrl = 'https://www.cricketbaroda.com/tournament/1500003/Late-Dr.-Mrunalini-Devi-Puar-Womens-T20-Tournament-2025-26';

        logger.info('Navigating to tournament page for inspection', { url: tournamentUrl }, 'DebugScript');

        // Navigate to the page
        await scraper['page'].goto(tournamentUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        logger.info('Page loaded, inspecting structure', {}, 'DebugScript');

        // Get page structure information
        const pageStructure = await scraper['page']!.evaluate(() => {
            const result: any = {
                title: document.title,
                url: window.location.href,
                bodyClasses: document.body.className,
                tabs: [],
                teamElements: [],
                matchElements: [],
                allLinks: [],
                allButtons: []
            };

            // Look for tab elements
            const tabSelectors = [
                '.tab', '.nav-tab', '[data-tab]', '.tournament-tabs',
                '.tabs', '.tab-list', '.nav-tabs', '.menu-tabs',
                'nav', 'ul li', '.menu-item'
            ];

            for (const selector of tabSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    result.tabs.push({
                        selector,
                        count: elements.length,
                        sample: Array.from(elements).slice(0, 3).map(el => ({
                            text: el.textContent?.trim(),
                            className: el.className,
                            tagName: el.tagName,
                            attributes: Array.from(el.attributes).map(attr => `${attr.name}="${attr.value}"`)
                        }))
                    });
                }
            }

            // Look for team-related elements
            const teamSelectors = [
                '.team-pill', '.team-button', '.team-card', '.participant',
                '[data-team-id]', '.team-link', 'a[href*="team"]',
                '.teams', '.team-list', '.participants'
            ];

            for (const selector of teamSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    result.teamElements.push({
                        selector,
                        count: elements.length,
                        sample: Array.from(elements).slice(0, 3).map(el => ({
                            text: el.textContent?.trim(),
                            className: el.className,
                            tagName: el.tagName,
                            href: el.getAttribute('href')
                        }))
                    });
                }
            }

            // Look for match-related elements
            const matchSelectors = [
                '.match-card', '.fixture-card', '.game-card', '[data-match-id]',
                '.match-item', 'a[href*="match"]', '.matches', '.fixtures'
            ];

            for (const selector of matchSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    result.matchElements.push({
                        selector,
                        count: elements.length,
                        sample: Array.from(elements).slice(0, 3).map(el => ({
                            text: el.textContent?.trim(),
                            className: el.className,
                            tagName: el.tagName,
                            href: el.getAttribute('href')
                        }))
                    });
                }
            }

            // Get all links
            const allLinks = document.querySelectorAll('a[href]');
            result.allLinks = Array.from(allLinks).slice(0, 10).map(link => ({
                href: (link as HTMLAnchorElement).href,
                text: link.textContent?.trim() || ''
            }));

            // Get all buttons
            const allButtons = document.querySelectorAll('button, [role="button"], .btn');
            result.allButtons = Array.from(allButtons).slice(0, 10).map(btn => ({
                text: btn.textContent?.trim(),
                className: btn.className,
                tagName: btn.tagName
            }));

            return result;
        });

        console.log('\n🔍 CRICKETBARODA TOURNAMENT PAGE STRUCTURE ANALYSIS:');
        console.log('=' .repeat(60));
        console.log(`Title: ${pageStructure.title}`);
        console.log(`URL: ${pageStructure.url}`);
        console.log(`Body Classes: ${pageStructure.bodyClasses}`);
        console.log('=' .repeat(60));

        console.log('\n📑 TABS FOUND:');
        pageStructure.tabs.forEach(tab => {
            console.log(`Selector: ${tab.selector} (${tab.count} elements)`);
            tab.sample.forEach((sample, i) => {
                console.log(`  ${i + 1}. ${sample.text} [${sample.tagName}.${sample.className}]`);
                if (sample.attributes.length > 0) {
                    console.log(`     Attributes: ${sample.attributes.join(', ')}`);
                }
            });
            console.log('');
        });

        console.log('\n👥 TEAM ELEMENTS FOUND:');
        pageStructure.teamElements.forEach(team => {
            console.log(`Selector: ${team.selector} (${team.count} elements)`);
            team.sample.forEach((sample, i) => {
                console.log(`  ${i + 1}. ${sample.text} [${sample.tagName}.${sample.className}]`);
                if (sample.href) console.log(`     Link: ${sample.href}`);
            });
            console.log('');
        });

        console.log('\n🏏 MATCH ELEMENTS FOUND:');
        pageStructure.matchElements.forEach(match => {
            console.log(`Selector: ${match.selector} (${match.count} elements)`);
            match.sample.forEach((sample, i) => {
                console.log(`  ${i + 1}. ${sample.text} [${sample.tagName}.${sample.className}]`);
                if (sample.href) console.log(`     Link: ${sample.href}`);
            });
            console.log('');
        });

        console.log('\n🔗 SAMPLE LINKS:');
        pageStructure.allLinks.forEach((link, i) => {
            console.log(`  ${i + 1}. ${link.text} -> ${link.href}`);
        });

        console.log('\n🔘 SAMPLE BUTTONS:');
        pageStructure.allButtons.forEach((btn, i) => {
            console.log(`  ${i + 1}. ${btn.text} [${btn.tagName}.${btn.className}]`);
        });

        logger.info('Page structure analysis completed', {
            title: pageStructure.title,
            tabsFound: pageStructure.tabs.length,
            teamElementsFound: pageStructure.teamElements.length,
            matchElementsFound: pageStructure.matchElements.length
        }, 'DebugScript');

    } catch (error) {
        logger.error('Page structure debug failed', error as Error, {}, 'DebugScript');
        console.error('\n❌ Debug failed:', error instanceof Error ? error.message : String(error));
    } finally {
        await scraper.cleanup();
    }
}

// Run the debug script
debugTournamentPage().then(() => {
    console.log('\n✅ Debug completed!');
}).catch((error) => {
    console.error('\n❌ Debug failed:', error);
    process.exit(1);
});
