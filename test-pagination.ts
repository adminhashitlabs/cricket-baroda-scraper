import { CricketBarodaTournamentScraper } from './src/platforms/cricket-baroda-tournament-scraper';
import { logger } from './src/logger';

/**
 * Test pagination handling in CricketBaroda tournament scraper
 */
async function testPagination() {
    const scraper = new CricketBarodaTournamentScraper();

    try {
        logger.info('Testing pagination in CricketBaroda tournament scraper', {}, 'PaginationTest');

        // Initialize the scraper
        await scraper.initialize();
        logger.info('Scraper initialized successfully', {}, 'PaginationTest');

        // Use the example tournament URL
        const tournamentUrl = 'https://www.cricketbaroda.com/tournament/1500003/Late-Dr.-Mrunalini-Devi-Puar-Womens-T20-Tournament-2025-26';

        logger.info('Navigating to tournament page', { url: tournamentUrl }, 'PaginationTest');

        // Navigate to tournament page
        await scraper['page']!.goto(tournamentUrl, { waitUntil: 'networkidle2' });

        // Test pagination detection
        const paginationInfo = await scraper['page']!.evaluate(() => {
            const paginationSelectors = [
                '.pagination',
                '.page-navigation',
                '[class*="pagination"]',
                '[class*="page"]',
                '.nav-links',
                'div.sc-65496371-0.cJYcvJ'  // Specific selector provided by user
            ];

            let totalPages = 1;
            let hasPagination = false;
            let paginationHTML = '';

            for (const selector of paginationSelectors) {
                const paginationElement = document.querySelector(selector);
                if (paginationElement) {
                    hasPagination = true;
                    paginationHTML = paginationElement.outerHTML;

                    // Check for "X of Y" pattern in the text content
                    const textContent = paginationElement.textContent || '';
                    const pageMatch = textContent.match(/(\d+)\s*of\s*(\d+)/);
                    if (pageMatch) {
                        totalPages = parseInt(pageMatch[2]);
                        break;
                    }

                    // Fallback to original logic
                    const pageLinks = paginationElement.querySelectorAll('a, button, [class*="page"], [class*="next"]');
                    const pageNumbers: number[] = [];

                    pageLinks.forEach(link => {
                        const text = link.textContent?.trim() || '';
                        const href = (link as HTMLAnchorElement).href || '';
                        const dataPage = link.getAttribute('data-page');

                        const pageMatch = text.match(/\d+/) || href.match(/page=(\d+)/) || (dataPage ? [dataPage] : null);
                        if (pageMatch) {
                            const pageNum = parseInt(pageMatch[0]);
                            if (!isNaN(pageNum) && pageNum > 0) {
                                pageNumbers.push(pageNum);
                            }
                        }
                    });

                    if (pageNumbers.length > 0) {
                        totalPages = Math.max(...pageNumbers);
                    }
                    break;
                }
            }

            return { hasPagination, totalPages, paginationHTML: paginationHTML.substring(0, 500) };
        });

        console.log('\n🔍 PAGINATION ANALYSIS:');
        console.log('========================');
        console.log(`Has Pagination: ${paginationInfo.hasPagination}`);
        console.log(`Total Pages: ${paginationInfo.totalPages}`);
        console.log(`Pagination HTML: ${paginationInfo.paginationHTML}`);

        // Check what tabs are available and try to navigate to matches
        const tabInfo = await scraper['page']!.evaluate(() => {
            const tabs = document.querySelectorAll('ul li, .tab, [data-tab]');
            const tabDetails: any[] = [];

            tabs.forEach((tab, index) => {
                const text = tab.textContent?.trim() || '';
                const className = tab.className || '';
                const dataTab = tab.getAttribute('data-tab');

                if (text && (text.toLowerCase().includes('match') || text.toLowerCase().includes('fixture') || text.toLowerCase().includes('schedule'))) {
                    tabDetails.push({
                        index,
                        text,
                        className,
                        dataTab,
                        isMatchTab: true
                    });
                } else {
                    tabDetails.push({
                        index,
                        text,
                        className,
                        dataTab,
                        isMatchTab: false
                    });
                }
            });

            return tabDetails;
        });

        console.log('\n📑 AVAILABLE TABS:');
        console.log('==================');
        tabInfo.forEach((tab, index) => {
            console.log(`${index + 1}. "${tab.text}" (class: ${tab.className}) ${tab.isMatchTab ? '🎯 MATCH TAB' : ''}`);
        });

        // Try to click on matches tab
        const matchTabClicked = await scraper['page']!.evaluate(() => {
            const tabs = document.querySelectorAll('ul li, .tab, [data-tab]');
            for (const tab of tabs) {
                const text = tab.textContent?.trim().toLowerCase() || '';
                if (text.includes('match') || text.includes('fixture') || text.includes('schedule')) {
                    (tab as HTMLElement).click();
                    return true;
                }
            }
            return false;
        });

        if (matchTabClicked) {
            console.log('✅ Clicked on matches tab');
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            console.log('❌ Could not find matches tab');
        }

        // Count matches on current page after tab navigation
        const matchInfo = await scraper['page']!.evaluate(() => {
            const matchCards = document.querySelectorAll('.match-card');
            const urls: string[] = [];
            
            matchCards.forEach((card, index) => {
                if (index < 3) { // Get first 3
                    const link = card.querySelector('a[href*="match"]') as HTMLAnchorElement;
                    if (link) {
                        urls.push(link.href);
                    }
                }
            });
            
            return { count: matchCards.length, urls: urls };
        });
        
        console.log(`📊 MATCHES AFTER TAB NAVIGATION: ${matchInfo.count}`);
        console.log('🔗 SAMPLE URLs:');
        matchInfo.urls.forEach((url, index) => {
            console.log(`  ${index + 1}: ${url}`);
        });

        // Test navigation to next page if pagination exists
        if (paginationInfo.hasPagination && paginationInfo.totalPages > 1) {
            console.log('\n🔄 TESTING PAGE NAVIGATION:');

            const nextPageResult = await scraper['page']!.evaluate(() => {
                // First, try to find next button in the specific pagination element
                const paginationElement = document.querySelector('div.sc-65496371-0.cJYcvJ');
                if (paginationElement) {
                    const buttons = paginationElement.querySelectorAll('button, a');
                    for (const button of buttons) {
                        const text = button.textContent?.trim().toLowerCase() || '';
                        const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
                        const iconClass = button.querySelector('i')?.className || '';
                        
                        // Check for right arrow indicators
                        if (text.includes('next') || text.includes('>') || text.includes('»') || 
                            ariaLabel.includes('next') || ariaLabel.includes('right') ||
                            iconClass.includes('caret-right') || iconClass.includes('chevron-right') ||
                            iconClass.includes('arrow-right')) {
                            console.log(`Found next button in pagination element: ${text || ariaLabel || iconClass}`);
                            (button as HTMLElement).click();
                            return { clicked: true, selector: 'pagination-element-button', text: text || ariaLabel || iconClass };
                        }
                    }
                }

                // Fallback to original selectors
                const nextSelectors = [
                    'a[class*="next"]',
                    'button[class*="next"]',
                    '[class*="next"]'
                ];

                for (const selector of nextSelectors) {
                    const nextButton = document.querySelector(selector) as HTMLElement;
                    if (nextButton && !nextButton.hasAttribute('disabled') && nextButton.style.display !== 'none') {
                        console.log(`Found next button: ${selector}`);
                        nextButton.click();
                        return { clicked: true, selector: selector };
                    }
                }

                return { clicked: false, selector: null };
            });

            if (nextPageResult.clicked) {
                console.log(`✅ Clicked next page button using selector: ${nextPageResult.selector}`);
                if (nextPageResult.text) {
                    console.log(`Button text/aria-label: ${nextPageResult.text}`);
                }
                await new Promise(resolve => setTimeout(resolve, 3000));

                const newMatchCount = await scraper['page']!.evaluate(() => {
                    const matchCards = document.querySelectorAll('.match-card');
                    return matchCards.length;
                });

                console.log(`📊 MATCHES ON NEXT PAGE: ${newMatchCount}`);
            } else {
                console.log('❌ Could not find or click next page button');
            }
        }

        logger.info('Pagination test completed', {
            hasPagination: paginationInfo.hasPagination,
            totalPages: paginationInfo.totalPages,
            matchesOnFirstPage: matchInfo.count
        }, 'PaginationTest');

    } catch (error) {
        logger.error('Pagination test failed', error as Error, {}, 'PaginationTest');
        console.error('❌ Test failed:', error);
    } finally {
        await scraper.cleanup();
        logger.info('Scraper cleaned up', {}, 'PaginationTest');
    }
}

// Run the test
testPagination().then(() => {
    console.log('\n✅ Pagination test completed!');
}).catch(error => {
    console.error('❌ Test failed:', error);
});
