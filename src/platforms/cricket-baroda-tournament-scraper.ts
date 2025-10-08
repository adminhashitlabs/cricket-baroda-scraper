import puppeteer, { Browser, Page } from 'puppeteer';
import { TournamentScraper, MatchInfo, TournamentInfo, TournamentTeam, MatchPlayer } from './interfaces';
import { logger, logOperation } from '../logger';
import { BrowserError, ScraperError, withRetry } from '../errors';
import { CONFIG } from '../config';

/**
 * CricketBaroda Tournament Scraper
 *
 * Specialized scraper for CricketBaroda tournament pages with specific handling for:
 * - Tournament list with year filtering
 * - Individual tournament metadata extraction
 * - Teams tab navigation and team roster extraction
 * - Matches tab navigation and match metadata extraction
 */
export class CricketBarodaTournamentScraper implements TournamentScraper {
    private browser: Browser | null = null;
    private page: Page | null = null;

    /**
     * Initialize browser for tournament scraping
     */
    async initialize(): Promise<void> {
        const endOperation = logOperation('cricketbaroda_browser_initialization', {}, 'CricketBarodaTournamentScraper');

        try {
            logger.info('Initializing browser for CricketBaroda tournament scraping...', { headless: CONFIG.BROWSER.HEADLESS }, 'CricketBarodaTournamentScraper');
            this.browser = await puppeteer.launch({
                headless: CONFIG.BROWSER.HEADLESS,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            this.page = await this.browser.newPage();

            // Set reasonable timeouts
            this.page.setDefaultTimeout(CONFIG.BROWSER.DEFAULT_TIMEOUT);
            this.page.setDefaultNavigationTimeout(CONFIG.BROWSER.DEFAULT_TIMEOUT);

            logger.info('Browser initialized for CricketBaroda tournament scraping', {}, 'CricketBarodaTournamentScraper');
            endOperation();
        } catch (error) {
            logger.error('Browser initialization failed for CricketBaroda tournament scraper', error as Error, {}, 'CricketBarodaTournamentScraper');
            throw new BrowserError(
                `Failed to initialize browser: ${error instanceof Error ? error.message : String(error)}`,
                { headless: CONFIG.BROWSER.HEADLESS }
            );
        }
    }

    /**
     * Clean up browser resources
     */
    async cleanup(): Promise<void> {
        if (this.browser) {
            try {
                logger.debug('Closing CricketBaroda tournament scraper browser...', {}, 'CricketBarodaTournamentScraper');
                await this.browser.close();
                this.browser = null;
                this.page = null;
                logger.debug('CricketBaroda tournament scraper browser closed successfully', {}, 'CricketBarodaTournamentScraper');
            } catch (error) {
                logger.warn('Warning: Error closing CricketBaroda tournament scraper browser', {
                    error: error instanceof Error ? error.message : String(error)
                }, 'CricketBarodaTournamentScraper');
            }
        }
    }

    /**
     * Scrape all matches from a tournament page
     * @param tournamentUrl - URL of the tournament page
     * @returns Promise resolving to list of matches
     */
    async scrapeTournamentMatches(tournamentUrl: string): Promise<MatchInfo[]> {
        if (!this.page) {
            throw new BrowserError('Browser not initialized', { url: tournamentUrl });
        }

        const endOperation = logOperation('scrape_cricketbaroda_tournament_matches', { url: tournamentUrl }, 'CricketBarodaTournamentScraper');

        try {
            logger.info('Starting CricketBaroda tournament match scraping', { url: tournamentUrl }, 'CricketBarodaTournamentScraper');

            // Navigate to tournament page
            await withRetry(
                async () => {
                    logger.debug(`Navigating to CricketBaroda tournament page: ${tournamentUrl}`, { url: tournamentUrl }, 'CricketBarodaTournamentScraper');
                    await this.page!.goto(tournamentUrl, {
                        waitUntil: 'networkidle2',
                        timeout: CONFIG.BROWSER.DEFAULT_TIMEOUT
                    });
                    logger.info('CricketBaroda tournament page loaded successfully', { url: tournamentUrl }, 'CricketBarodaTournamentScraper');
                },
                CONFIG.RETRY.MAX_ATTEMPTS,
                CONFIG.RETRY.DELAY,
                `Failed to load tournament page ${tournamentUrl}`
            );

            // Navigate to matches tab
            await this.navigateToMatchesTab();

            // Extract match information from matches tab
            const matches = await this.extractMatchesFromMatchesTab(tournamentUrl);

            logger.info('CricketBaroda tournament match scraping completed', {
                url: tournamentUrl,
                matchesFound: matches.length
            }, 'CricketBarodaTournamentScraper');

            endOperation();
            return matches;

        } catch (error) {
            logger.error('CricketBaroda tournament match scraping failed', error as Error, { url: tournamentUrl }, 'CricketBarodaTournamentScraper');
            throw new ScraperError(
                `CricketBaroda tournament scraping failed: ${error instanceof Error ? error.message : String(error)}`,
                'CRICKETBARODA_TOURNAMENT_SCRAPING_FAILED',
                { url: tournamentUrl, originalError: error }
            );
        }
    }

    /**
     * Get tournament/series information
     * @param tournamentUrl - URL of the tournament
     * @returns Promise resolving to tournament info
     */
    async getTournamentInfo(tournamentUrl: string): Promise<{
        name: string;
        matches: MatchInfo[];
        status: string;
    }> {
        const endOperation = logOperation('get_cricketbaroda_tournament_info', { url: tournamentUrl }, 'CricketBarodaTournamentScraper');

        try {
            logger.info('Getting CricketBaroda tournament information', { url: tournamentUrl }, 'CricketBarodaTournamentScraper');

            const matches = await this.scrapeTournamentMatches(tournamentUrl);
            const name = await this.extractTournamentName(tournamentUrl);

            const tournamentInfo = {
                name,
                matches,
                status: matches.length > 0 ? 'active' : 'no_matches'
            };

            logger.info('CricketBaroda tournament information retrieved', {
                url: tournamentUrl,
                name,
                matchesCount: matches.length,
                status: tournamentInfo.status
            }, 'CricketBarodaTournamentScraper');

            endOperation();
            return tournamentInfo;

        } catch (error) {
            logger.error('Failed to get CricketBaroda tournament information', error as Error, {
                url: tournamentUrl
            }, 'CricketBarodaTournamentScraper');

            endOperation();
            throw new ScraperError(
                `CricketBaroda tournament info retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
                'CRICKETBARODA_TOURNAMENT_INFO_FAILED',
                { url: tournamentUrl, originalError: error }
            );
        }
    }

    /**
     * Get comprehensive tournament information including metadata, teams, and matches
     * @param tournamentUrl - URL of the tournament
     * @returns Promise resolving to comprehensive tournament data
     */
    async getComprehensiveTournamentInfo(tournamentUrl: string): Promise<TournamentInfo> {
        if (!this.page) {
            throw new BrowserError('Browser not initialized', { url: tournamentUrl });
        }

        const endOperation = logOperation('get_cricketbaroda_comprehensive_tournament_info', { url: tournamentUrl }, 'CricketBarodaTournamentScraper');

        try {
            logger.info('Getting comprehensive CricketBaroda tournament information', { url: tournamentUrl }, 'CricketBarodaTournamentScraper');

            // Navigate to tournament page
            await withRetry(
                async () => {
                    logger.debug(`Navigating to CricketBaroda tournament page: ${tournamentUrl}`, { url: tournamentUrl }, 'CricketBarodaTournamentScraper');
                    await this.page!.goto(tournamentUrl, {
                        waitUntil: 'networkidle2',
                        timeout: CONFIG.BROWSER.DEFAULT_TIMEOUT
                    });
                    logger.info('CricketBaroda tournament page loaded successfully', { url: tournamentUrl }, 'CricketBarodaTournamentScraper');
                },
                CONFIG.RETRY.MAX_ATTEMPTS,
                CONFIG.RETRY.DELAY,
                `Failed to load tournament page ${tournamentUrl}`
            );

            // Extract comprehensive tournament metadata
            const tournamentInfo = await this.extractCricketBarodaTournamentMetadata(tournamentUrl);

            // Extract participating teams
            const teams = await this.extractCricketBarodaTournamentTeams(tournamentUrl);
            tournamentInfo.totalTeams = teams.length;

            // Extract all matches
            const matches = await this.extractCricketBarodaTournamentMatches(tournamentUrl);
            tournamentInfo.totalMatches = matches.length;

            logger.info('Comprehensive CricketBaroda tournament information retrieved', {
                url: tournamentUrl,
                name: tournamentInfo.name,
                teamsCount: teams.length,
                matchesCount: matches.length,
                status: tournamentInfo.status
            }, 'CricketBarodaTournamentScraper');

            endOperation();
            return tournamentInfo;

        } catch (error) {
            logger.error('Failed to get comprehensive CricketBaroda tournament information', error as Error, {
                url: tournamentUrl
            }, 'CricketBarodaTournamentScraper');

            endOperation();
            throw new ScraperError(
                `Comprehensive CricketBaroda tournament info retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
                'CRICKETBARODA_COMPREHENSIVE_TOURNAMENT_INFO_FAILED',
                { url: tournamentUrl, originalError: error }
            );
        }
    }

    /**
     * Extract participating teams from CricketBaroda tournament page
     * @param tournamentUrl - URL of the tournament
     * @returns Promise resolving to list of teams
     */
    async extractTournamentTeams(tournamentUrl: string): Promise<TournamentTeam[]> {
        if (!this.page) {
            throw new BrowserError('Browser not initialized', { url: tournamentUrl });
        }

        const endOperation = logOperation('extract_cricketbaroda_tournament_teams', { url: tournamentUrl }, 'CricketBarodaTournamentScraper');

        try {
            logger.info('Extracting CricketBaroda tournament teams', { url: tournamentUrl }, 'CricketBarodaTournamentScraper');

            // Navigate to tournament page
            await withRetry(
                async () => {
                    logger.debug(`Navigating to CricketBaroda tournament page: ${tournamentUrl}`, { url: tournamentUrl }, 'CricketBarodaTournamentScraper');
                    await this.page!.goto(tournamentUrl, {
                        waitUntil: 'networkidle2',
                        timeout: CONFIG.BROWSER.DEFAULT_TIMEOUT
                    });
                    logger.info('CricketBaroda tournament page loaded successfully', { url: tournamentUrl }, 'CricketBarodaTournamentScraper');
                },
                CONFIG.RETRY.MAX_ATTEMPTS,
                CONFIG.RETRY.DELAY,
                `Failed to load tournament page ${tournamentUrl}`
            );

            // Extract teams with pagination support
            const teams = await this.extractTeamsWithPagination(tournamentUrl);

            logger.info('CricketBaroda tournament teams extracted', {
                url: tournamentUrl,
                teamsFound: teams.length,
                teamNames: teams.map(t => t.name)
            }, 'CricketBarodaTournamentScraper');

            endOperation();
            return teams;

        } catch (error) {
            logger.error('Failed to extract CricketBaroda tournament teams', error as Error, {
                url: tournamentUrl
            }, 'CricketBarodaTournamentScraper');
            endOperation();
            throw new ScraperError(
                `CricketBaroda tournament team extraction failed: ${error instanceof Error ? error.message : String(error)}`,
                'CRICKETBARODA_TEAM_EXTRACTION_FAILED',
                { url: tournamentUrl, originalError: error }
            );
        }
    }

    /**
     * Extract team roster from CricketBaroda team page
     * @param teamUrl - URL of the team page
     * @param teamName - Name of the team
     * @returns Promise resolving to team roster
     */
    async extractTeamRoster(teamUrl: string, teamName: string): Promise<TournamentTeam> {
        return this.extractCricketBarodaTeamRoster(teamUrl, teamName);
    }

    /**
     * Extract players who actually played in a CricketBaroda match
     * @param matchUrl - URL of the match
     * @param matchInfo - Basic match information
     * @returns Promise resolving to match players
     */
    async extractMatchPlayers(matchUrl: string, matchInfo: MatchInfo): Promise<MatchPlayer[]> {
        return this.extractCricketBarodaMatchPlayers(matchUrl, matchInfo);
    }

    /**
     * Extract tournament list from CricketBaroda match center with year filtering
     * @param year - Year to filter tournaments (e.g., "2024-25")
     * @returns Promise resolving to list of tournament URLs
     */
    async extractTournamentList(year?: string): Promise<{ name: string; url: string; year: string }[]> {
        if (!this.page) {
            throw new BrowserError('Browser not initialized');
        }

        const endOperation = logOperation('extract_cricketbaroda_tournament_list', { year }, 'CricketBarodaTournamentScraper');

        try {
            const tournamentListUrl = 'https://www.cricketbaroda.com/match-center/tournaments';
            logger.info('Extracting CricketBaroda tournament list', { url: tournamentListUrl, year }, 'CricketBarodaTournamentScraper');

            // Navigate to tournament list page
            await withRetry(
                async () => {
                    await this.page!.goto(tournamentListUrl, {
                        waitUntil: 'networkidle2',
                        timeout: CONFIG.BROWSER.DEFAULT_TIMEOUT
                    });
                },
                CONFIG.RETRY.MAX_ATTEMPTS,
                CONFIG.RETRY.DELAY,
                `Failed to load tournament list page ${tournamentListUrl}`
            );

            // If year is specified, apply the filter
            if (year) {
                await this.applyYearFilter(year);
            }

            // Extract tournament list
            const tournaments = await this.page!.evaluate(() => {
                const tournaments: any[] = [];

                // Look for tournament cards/links
                const selectors = [
                    '.tournament-card',
                    '.tournament-item',
                    '.competition-card',
                    '[data-tournament-id]',
                    '.tournament-link',
                    'a[href*="tournament"]'
                ];

                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        elements.forEach((element) => {
                            const link = element.tagName === 'A' ? element : element.querySelector('a[href*="tournament"]');
                            if (link) {
                                const href = (link as HTMLAnchorElement).href;
                                const name = element.textContent?.trim() ||
                                           link.textContent?.trim() ||
                                           `Tournament ${tournaments.length + 1}`;

                                if (href.includes('tournament') && !tournaments.some(t => t.url === href)) {
                                    tournaments.push({
                                        name: name,
                                        url: href,
                                        year: '' // Will be filled from filter or page context
                                    });
                                }
                            }
                        });
                        break;
                    }
                }

                return tournaments;
            });

            // If year was applied, set it for all tournaments
            if (year) {
                tournaments.forEach(t => t.year = year);
            }

            logger.info('CricketBaroda tournament list extracted', {
                tournamentsFound: tournaments.length,
                year: year || 'all'
            }, 'CricketBarodaTournamentScraper');

            endOperation();
            return tournaments;

        } catch (error) {
            logger.error('Failed to extract CricketBaroda tournament list', error as Error, { year }, 'CricketBarodaTournamentScraper');
            endOperation();
            throw new ScraperError(
                `Tournament list extraction failed: ${error instanceof Error ? error.message : String(error)}`,
                'CRICKETBARODA_TOURNAMENT_LIST_FAILED',
                { year, originalError: error }
            );
        }
    }

    /**
     * Apply year filter on tournament list page
     * @param year - Year to filter (e.g., "2024-25")
     */
    private async applyYearFilter(year: string): Promise<void> {
        try {
            logger.debug('Applying year filter', { year }, 'CricketBarodaTournamentScraper');

            // Wait for year selector to load
            await this.page!.waitForSelector('select[name*="year"], .year-selector, [data-year-filter]', { timeout: 10000 });

            // Apply the year filter
            await this.page!.evaluate((targetYear) => {
                const selectors = [
                    'select[name*="year"]',
                    '.year-selector select',
                    '[data-year-filter] select',
                    'select'
                ];

                for (const selector of selectors) {
                    const selectElement = document.querySelector(selector) as HTMLSelectElement;
                    if (selectElement) {
                        // Find option with matching year
                        const options = Array.from(selectElement.options);
                        const matchingOption = options.find(option =>
                            option.text.includes(targetYear) || option.value.includes(targetYear)
                        );

                        if (matchingOption) {
                            selectElement.value = matchingOption.value;
                            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
                            return true;
                        }
                    }
                }
                return false;
            }, year);

            // Wait for page to update with filtered results
            await new Promise(resolve => setTimeout(resolve, 2000));

            logger.debug('Year filter applied successfully', { year }, 'CricketBarodaTournamentScraper');

        } catch (error) {
            logger.warn('Failed to apply year filter', {
                error: error instanceof Error ? error.message : String(error),
                year
            }, 'CricketBarodaTournamentScraper');
        }
    }

    /**
     * Extract comprehensive tournament metadata from CricketBaroda tournament page
     * @param tournamentUrl - Tournament URL
     * @returns Promise resolving to tournament metadata
     */
    private async extractCricketBarodaTournamentMetadata(tournamentUrl: string): Promise<TournamentInfo> {
        try {
            const metadata = await this.page!.evaluate(() => {
                const data: any = {};

                // Extract tournament name
                const nameSelectors = [
                    'h1',
                    '.tournament-title',
                    '.tournament-name',
                    '[data-tournament-name]',
                    '.competition-title'
                ];

                for (const selector of nameSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent?.trim()) {
                        data.name = element.textContent.trim();
                        break;
                    }
                }

                // Extract duration/dates
                const dateSelectors = [
                    '.tournament-dates',
                    '.duration',
                    '.date-range',
                    '[data-duration]',
                    '.tournament-period'
                ];

                for (const selector of dateSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent?.trim()) {
                        data.duration = element.textContent.trim();
                        break;
                    }
                }

                // Extract format (T20, ODI, etc.)
                const formatSelectors = [
                    '.format',
                    '.tournament-format',
                    '[data-format]',
                    '.competition-format'
                ];

                for (const selector of formatSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent?.trim()) {
                        data.format = element.textContent.trim();
                        break;
                    }
                }

                // Extract venue
                const venueSelectors = [
                    '.venue',
                    '.tournament-venue',
                    '[data-venue]',
                    '.location'
                ];

                for (const selector of venueSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent?.trim()) {
                        data.venue = element.textContent.trim();
                        break;
                    }
                }

                // Extract status
                const statusSelectors = [
                    '.status',
                    '.tournament-status',
                    '[data-status]',
                    '.competition-status'
                ];

                let status = 'ongoing';
                for (const selector of statusSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent?.trim()) {
                        const statusText = element.textContent.trim().toLowerCase();
                        if (statusText.includes('completed') || statusText.includes('finished')) {
                            status = 'completed';
                        } else if (statusText.includes('upcoming') || statusText.includes('scheduled')) {
                            status = 'upcoming';
                        } else if (statusText.includes('cancelled')) {
                            status = 'cancelled';
                        }
                        break;
                    }
                }
                data.status = status;

                return data;
            });

            // Generate tournament ID from URL
            const tournamentId = tournamentUrl.split('/').pop()?.split('?')[0] ||
                               metadata.name?.toLowerCase().replace(/\s+/g, '_') ||
                               `tournament_${Date.now()}`;

            const tournamentInfo: TournamentInfo = {
                id: tournamentId,
                name: metadata.name || 'Unknown Tournament',
                organizer: 'Cricket Baroda',
                format: metadata.format,
                status: metadata.status || 'ongoing',
                startDate: metadata.duration, // Could be parsed further
                venue: metadata.venue,
                url: tournamentUrl,
                metadata: {
                    extractedAt: new Date().toISOString(),
                    source: 'cricketbaroda_tournament_page',
                    duration: metadata.duration
                }
            };

            logger.debug('Extracted CricketBaroda tournament metadata', {
                url: tournamentUrl,
                name: tournamentInfo.name,
                status: tournamentInfo.status,
                format: tournamentInfo.format
            }, 'CricketBarodaTournamentScraper');

            return tournamentInfo;

        } catch (error) {
            logger.warn('Failed to extract CricketBaroda tournament metadata', {
                error: error instanceof Error ? error.message : String(error),
                url: tournamentUrl
            }, 'CricketBarodaTournamentScraper');

            // Return basic tournament info on failure
            return {
                id: tournamentUrl.split('/').pop() || `tournament_${Date.now()}`,
                name: 'Unknown Tournament',
                status: 'ongoing',
                url: tournamentUrl
            };
        }
    }

    /**
     * Navigate to matches tab on tournament page
     */
    private async navigateToMatchesTab(): Promise<void> {
        try {
            logger.debug('Navigating to matches tab', {}, 'CricketBarodaTournamentScraper');

            // Wait for tabs to load
            await this.page!.waitForSelector('.tab, .nav-tab, [data-tab], .tournament-tabs', { timeout: 10000 });

            // Click on matches tab
            await this.page!.evaluate(() => {
                const tabSelectors = [
                    '.tab[data-tab*="match"]',
                    'a[href*="matches"]'
                ];

                for (const selector of tabSelectors) {
                    const tab = document.querySelector(selector) as HTMLElement;
                    if (tab) {
                        tab.click();
                        return true;
                    }
                }

                // Try to find any tab that might be matches
                const allTabs = document.querySelectorAll('.tab, .nav-tab');
                for (const tab of allTabs) {
                    const text = tab.textContent?.toLowerCase() || '';
                    if (text.includes('match') || text.includes('fixture')) {
                        (tab as HTMLElement).click();
                        return true;
                    }
                }

                return false;
            });

            // Wait for matches content to load
            await new Promise(resolve => setTimeout(resolve, 2000));

            logger.debug('Successfully navigated to matches tab', {}, 'CricketBarodaTournamentScraper');

        } catch (error) {
            logger.warn('Failed to navigate to matches tab', {
                error: error instanceof Error ? error.message : String(error)
            }, 'CricketBarodaTournamentScraper');
        }
    }

    /**
     * Navigate to teams tab on tournament page
     */
    private async navigateToTeamsTab(): Promise<void> {
        try {
            logger.debug('Navigating to teams tab', {}, 'CricketBarodaTournamentScraper');

            // Wait for tabs to load
            await this.page!.waitForSelector('.tab, .nav-tab, [data-tab], .tournament-tabs', { timeout: 10000 });

            // Click on teams tab
            await this.page!.evaluate(() => {
                const tabSelectors = [
                    '.tab[data-tab*="team"]',
                    'a[href*="teams"]'
                ];

                for (const selector of tabSelectors) {
                    const tab = document.querySelector(selector) as HTMLElement;
                    if (tab) {
                        tab.click();
                        return true;
                    }
                }

                // Try to find any tab that might be teams
                const allTabs = document.querySelectorAll('.tab, .nav-tab');
                for (const tab of allTabs) {
                    const text = tab.textContent?.toLowerCase() || '';
                    if (text.includes('team') || text.includes('squad')) {
                        (tab as HTMLElement).click();
                        return true;
                    }
                }

                return false;
            });

            // Wait for teams content to load
            await new Promise(resolve => setTimeout(resolve, 2000));

            logger.debug('Successfully navigated to teams tab', {}, 'CricketBarodaTournamentScraper');

        } catch (error) {
            logger.warn('Failed to navigate to teams tab', {
                error: error instanceof Error ? error.message : String(error)
            }, 'CricketBarodaTournamentScraper');
        }
    }

    /**
     * Extract teams from all pages of matches with pagination support
     * @param tournamentUrl - Tournament URL
     * @returns Promise resolving to list of teams
     */
    private async extractTeamsWithPagination(_tournamentUrl: string): Promise<TournamentTeam[]> {
        const allTeams = new Map<string, any>();

        // First, navigate to matches tab to ensure matches are visible
        const matchesTabClicked = await this.page!.evaluate(() => {
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

        if (matchesTabClicked) {
            logger.debug('Successfully navigated to matches tab', {}, 'CricketBarodaTournamentScraper');
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            logger.warn('Could not find matches tab, proceeding with current page', {}, 'CricketBarodaTournamentScraper');
        }

        // Check for pagination and get total pages
        const paginationInfo = await this.page!.evaluate(() => {
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

            for (const selector of paginationSelectors) {
                const paginationElement = document.querySelector(selector);
                if (paginationElement) {
                    hasPagination = true;
                    
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

            return { hasPagination, totalPages };
        });

        logger.debug('Pagination analysis', {
            hasPagination: paginationInfo.hasPagination,
            totalPages: paginationInfo.totalPages,
            matchesTabClicked
        }, 'CricketBarodaTournamentScraper');

        // Extract teams from each page
        for (let currentPage = 1; currentPage <= paginationInfo.totalPages; currentPage++) {
            logger.debug(`Processing page ${currentPage}/${paginationInfo.totalPages}`, {}, 'CricketBarodaTournamentScraper');

            const pageTeams = await this.page!.evaluate(() => {
                const teams: any[] = [];
                const teamNames = new Set<string>();

                const matchCards = document.querySelectorAll('.match-card');
                matchCards.forEach((card) => {
                    const link = card.querySelector('a[href*="match"]') as HTMLAnchorElement;
                    if (link) {
                        const url = link.href;
                        const urlMatch = url.match(/\/match\/\d+\/(.+)-vs-(.+)$/);
                        if (urlMatch) {
                            const team1 = decodeURIComponent(urlMatch[1]).replace(/-/g, ' ').trim();
                            const team2 = decodeURIComponent(urlMatch[2]).replace(/-/g, ' ').trim();

                            [team1, team2].forEach(teamName => {
                                if (!teamNames.has(teamName)) {
                                    teamNames.add(teamName);
                                    teams.push({
                                        name: teamName,
                                        url: null,
                                        players: []
                                    });
                                }
                            });
                        }
                    }
                });

                return teams;
            });

            // Add teams from this page to global collection
            pageTeams.forEach(team => {
                if (!allTeams.has(team.name)) {
                    allTeams.set(team.name, team);
                }
            });

            // Navigate to next page if available
            if (currentPage < paginationInfo.totalPages) {
                const nextPageClicked = await this.page!.evaluate(() => {
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
                                (button as HTMLElement).click();
                                return true;
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
                            nextButton.click();
                            return true;
                        }
                    }

                    return false;
                });

                if (nextPageClicked) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    logger.warn(`Could not navigate to page ${currentPage + 1}`, {}, 'CricketBarodaTournamentScraper');
                    break;
                }
            }
        }

        // Convert to array and assign sequential IDs
        const teams = Array.from(allTeams.values());
        teams.forEach((team, index) => {
            team.id = `team_${index + 1}`;
        });

        return teams;
    }

    /**
     * Extract teams from CricketBaroda tournament teams tab
     * @param tournamentUrl - Tournament URL
     * @returns Promise resolving to list of teams
     */
    private async extractCricketBarodaTournamentTeams(tournamentUrl: string): Promise<TournamentTeam[]> {
        if (!this.page) {
            throw new BrowserError('Browser not initialized', { url: tournamentUrl });
        }

        try {
            logger.debug('Extracting CricketBaroda tournament teams from matches', { url: tournamentUrl }, 'CricketBarodaTournamentScraper');

            // CricketBaroda doesn't have a dedicated teams tab, so we extract teams from match cards
            const teams = await this.page!.evaluate(() => {
                const teams: any[] = [];
                const teamNames = new Set<string>();

                // Extract teams from match cards
                const matchCards = document.querySelectorAll('.match-card');
                matchCards.forEach((card, _matchIndex) => {
                    // Look for team names in the match card
                    // Teams are embedded in long text strings with scores
                    const cardText = card.textContent || '';

                    // Use regex to extract team names that appear before scores
                    // Pattern: word characters and spaces followed by a score like "121/4"
                    const teamScorePattern = /([A-Za-z\s\.\-\(\)]+?)\d+\/\d+/g;
                    const potentialTeams: string[] = [];
                    let match;

                    while ((match = teamScorePattern.exec(cardText)) !== null) {
                        const teamName = match[1].trim();
                        // Clean up the team name
                        const cleanTeamName = teamName
                            .replace(/\s+/g, ' ') // Normalize spaces
                            .replace(/^\s*\(\s*|\s*\)\s*$/g, '') // Remove surrounding parentheses
                            .trim();

                        if (cleanTeamName.length > 3 && cleanTeamName.length < 80 &&
                            !cleanTeamName.includes('Tournament') &&
                            !cleanTeamName.includes('Ground') &&
                            !cleanTeamName.includes('Academy') === false) { // Keep academy names

                            potentialTeams.push(cleanTeamName);
                        }
                    }

                    // Also try to extract from the URL which contains team names
                    const link = card.querySelector('a[href*="match"]') as HTMLAnchorElement;
                    if (link) {
                        const url = link.href;
                        // URL format: /match/123/Team1-vs-Team2
                        const urlMatch = url.match(/\/match\/\d+\/(.+)-vs-(.+)$/);
                        if (urlMatch) {
                            const team1 = decodeURIComponent(urlMatch[1]).replace(/-/g, ' ').trim();
                            const team2 = decodeURIComponent(urlMatch[2]).replace(/-/g, ' ').trim();

                            [team1, team2].forEach(teamName => {
                                if (!teamNames.has(teamName)) {
                                    teamNames.add(teamName);
                                    teams.push({
                                        id: `team_${teams.length + 1}`,
                                        name: teamName,
                                        url: null,
                                        players: []
                                    });
                                }
                            });
                        }
                    }

                    // Add teams found from text parsing
                    potentialTeams.slice(0, 2).forEach(teamName => { // Take first 2 to avoid duplicates
                        if (!teamNames.has(teamName)) {
                            teamNames.add(teamName);
                            teams.push({
                                id: `team_${teams.length + 1}`,
                                name: teamName,
                                url: null,
                                players: []
                            });
                        }
                    });
                });

                // If no teams found from match cards, try alternative approach
                if (teams.length === 0) {
                    // Look for any elements that might contain team names
                    const possibleTeamSelectors = [
                        '.team-name',
                        '.participant-name',
                        '[class*="team"]',
                        '[class*="participant"]'
                    ];

                    for (const selector of possibleTeamSelectors) {
                        const elements = document.querySelectorAll(selector);
                        elements.forEach((element, _index) => {
                            const name = element.textContent?.trim();
                            if (name && name.length > 3 && !teamNames.has(name)) {
                                teamNames.add(name);
                                teams.push({
                                    id: `team_${teams.length + 1}`,
                                    name: name,
                                    url: null,
                                    players: []
                                });
                            }
                        });
                        if (teams.length > 0) break;
                    }
                }

                return teams;
            });

            // Convert to TournamentTeam objects
            const tournamentTeams: TournamentTeam[] = teams.map(team => ({
                id: team.id,
                name: team.name,
                url: team.url,
                players: team.players || []
            }));

            logger.debug('CricketBaroda tournament teams extracted', {
                url: tournamentUrl,
                teamsFound: tournamentTeams.length,
                teamNames: tournamentTeams.map(t => t.name)
            }, 'CricketBarodaTournamentScraper');

            return tournamentTeams;

        } catch (error) {
            logger.error('Failed to extract CricketBaroda tournament teams', error as Error, {
                url: tournamentUrl
            }, 'CricketBarodaTournamentScraper');
            return [];
        }
    }

    /**
     * Extract matches from CricketBaroda tournament matches tab
     * @param tournamentUrl - Tournament URL
     * @returns Promise resolving to list of matches
     */
    private async extractCricketBarodaTournamentMatches(tournamentUrl: string): Promise<MatchInfo[]> {
        if (!this.page) {
            throw new BrowserError('Browser not initialized', { url: tournamentUrl });
        }

        try {
            logger.debug('Extracting CricketBaroda tournament matches', { url: tournamentUrl }, 'CricketBarodaTournamentScraper');

            // Navigate to matches tab
            await this.navigateToMatchesTab();

            // Extract match information
            const matches = await this.page!.evaluate(() => {
                const matches: any[] = [];

                // Look for match cards/items
                const matchSelectors = [
                    '.match-card',
                    '.fixture-card',
                    '.game-card',
                    '[data-match-id]',
                    '.match-item',
                    'a[href*="match"]'
                ];

                for (const selector of matchSelectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        elements.forEach((element, index) => {
                            const link = element.tagName === 'A' ? element : element.querySelector('a[href*="match"]');
                            if (link) {
                                const matchUrl = (link as HTMLAnchorElement).href;
                                const matchId = matchUrl.split('/').pop() || `match_${index + 1}`;

                                // Extract team names
                                const text = element.textContent || '';
                                const teamMatch = text.match(/([A-Za-z\s]+)\s+vs\s+([A-Za-z\s]+)/) ||
                                                text.match(/([A-Za-z\s]+)\s+v\s+([A-Za-z\s]+)/);

                                // Extract player of the match if available
                                const pomSelectors = ['.player-of-match', '.pom', '[data-pom]'];
                                let playerOfMatch = '';
                                for (const pomSelector of pomSelectors) {
                                    const pomElement = element.querySelector(pomSelector);
                                    if (pomElement) {
                                        playerOfMatch = pomElement.textContent?.trim() || '';
                                        break;
                                    }
                                }

                                if (!matches.some(m => m.id === matchId)) {
                                    matches.push({
                                        id: matchId,
                                        url: matchUrl,
                                        title: text.trim() || `Match ${index + 1}`,
                                        team1: teamMatch ? teamMatch[1].trim() : 'Team 1',
                                        team2: teamMatch ? teamMatch[2].trim() : 'Team 2',
                                        status: 'scheduled',
                                        playerOfMatch: playerOfMatch,
                                        tournament: '' // Will be set from context
                                    });
                                }
                            }
                        });
                        break;
                    }
                }

                return matches;
            });

            // Convert to MatchInfo objects and set tournament context
            const tournamentName = await this.extractTournamentName(tournamentUrl);
            const matchInfos: MatchInfo[] = matches.map(match => ({
                id: match.id,
                url: match.url,
                title: match.title,
                team1: match.team1,
                team2: match.team2,
                status: match.status,
                tournament: tournamentName,
                date: match.date,
                venue: match.venue
            }));

            logger.debug('Extracted CricketBaroda tournament matches', {
                url: tournamentUrl,
                matchesCount: matchInfos.length,
                matches: matchInfos.map(m => ({ id: m.id, title: m.title, teams: `${m.team1} vs ${m.team2}` }))
            }, 'CricketBarodaTournamentScraper');

            return matchInfos;

        } catch (error) {
            logger.warn('Failed to extract CricketBaroda tournament matches', {
                error: error instanceof Error ? error.message : String(error),
                url: tournamentUrl
            }, 'CricketBarodaTournamentScraper');
            return [];
        }
    }

    /**
     * Extract matches from matches tab (fallback method)
     * @param tournamentUrl - Tournament URL
     * @returns Promise resolving to list of matches
     */
    private async extractMatchesFromMatchesTab(tournamentUrl: string): Promise<MatchInfo[]> {
        return this.extractCricketBarodaTournamentMatches(tournamentUrl);
    }

    /**
     * Extract team roster from CricketBaroda team page
     * @param teamUrl - URL of the team page
     * @param teamName - Name of the team
     * @returns Promise resolving to team roster
     */
    private async extractCricketBarodaTeamRoster(teamUrl: string, teamName: string): Promise<TournamentTeam> {
        if (!this.page) {
            throw new BrowserError('Browser not initialized', { url: teamUrl });
        }

        try {
            logger.debug('Extracting CricketBaroda team roster', { url: teamUrl, teamName }, 'CricketBarodaTournamentScraper');

            // Navigate to team page
            await withRetry(
                async () => {
                    await this.page!.goto(teamUrl, {
                        waitUntil: 'networkidle2',
                        timeout: CONFIG.BROWSER.DEFAULT_TIMEOUT
                    });
                },
                CONFIG.RETRY.MAX_ATTEMPTS,
                CONFIG.RETRY.DELAY,
                `Failed to load team page ${teamUrl}`
            );

            // Extract player information
            const roster = await this.page!.evaluate((teamName) => {
                const players: any[] = [];

                // Look for player listings
                const playerSelectors = [
                    '.player-card',
                    '.player-item',
                    '.squad-player',
                    '.team-player',
                    '[data-player-id]',
                    '.player-name',
                    '.player-list-item'
                ];

                for (const selector of playerSelectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        elements.forEach((element, index) => {
                            const name = element.textContent?.trim() ||
                                       element.getAttribute('data-player-name') ||
                                       `Player ${index + 1}`;

                            const role = element.getAttribute('data-role') ||
                                       element.querySelector('.player-role')?.textContent?.trim() ||
                                       'Unknown';

                            // Try to extract player ID from various attributes
                            const playerId = element.getAttribute('data-player-id') ||
                                           element.getAttribute('data-id') ||
                                           name.toLowerCase().replace(/\s+/g, '_');

                            if (name && !players.some(p => p.name === name)) {
                                players.push({
                                    id: playerId,
                                    name: name,
                                    role: role,
                                    team: teamName
                                });
                            }
                        });
                        break;
                    }
                }

                return players;
            }, teamName);

            const teamRoster: TournamentTeam = {
                id: teamUrl.split('/').pop() || `team_${Date.now()}`,
                name: teamName,
                url: teamUrl,
                players: roster
            };

            logger.debug('Extracted CricketBaroda team roster', {
                url: teamUrl,
                teamName,
                playersCount: roster.length
            }, 'CricketBarodaTournamentScraper');

            return teamRoster;

        } catch (error) {
            logger.warn('Failed to extract CricketBaroda team roster', {
                error: error instanceof Error ? error.message : String(error),
                url: teamUrl,
                teamName
            }, 'CricketBarodaTournamentScraper');

            // Return basic team info on failure
            return {
                id: teamUrl.split('/').pop() || `team_${Date.now()}`,
                name: teamName,
                url: teamUrl,
                players: []
            };
        }
    }

    /**
     * Extract players who actually played in a CricketBaroda match
     * @param matchUrl - URL of the match
     * @param matchInfo - Basic match information
     * @returns Promise resolving to match players
     */
    private async extractCricketBarodaMatchPlayers(matchUrl: string, matchInfo: MatchInfo): Promise<MatchPlayer[]> {
        if (!this.page) {
            throw new BrowserError('Browser not initialized', { url: matchUrl });
        }

        try {
            logger.debug('Extracting CricketBaroda match players', { url: matchUrl, matchId: matchInfo.id }, 'CricketBarodaTournamentScraper');

            // Navigate to match page
            await withRetry(
                async () => {
                    await this.page!.goto(matchUrl, {
                        waitUntil: 'networkidle2',
                        timeout: CONFIG.BROWSER.DEFAULT_TIMEOUT
                    });
                },
                CONFIG.RETRY.MAX_ATTEMPTS,
                CONFIG.RETRY.DELAY,
                `Failed to load match page ${matchUrl}`
            );

            // Extract match players
            const matchPlayers = await this.page!.evaluate((matchInfo) => {
                const players: any[] = [];

                // Look for playing XI or match players
                const playerSelectors = [
                    '.playing-xi .player',
                    '.match-players .player',
                    '.team-players .player',
                    '.squad .player',
                    '[data-playing="true"]',
                    '.batsman',
                    '.bowler',
                    '.fielder'
                ];

                for (const selector of playerSelectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        elements.forEach((element, index) => {
                            const name = element.textContent?.trim() ||
                                       element.getAttribute('data-player-name') ||
                                       `Player ${index + 1}`;

                            const team = element.closest('.team-1') ? matchInfo.team1 :
                                       element.closest('.team-2') ? matchInfo.team2 :
                                       matchInfo.team1; // Default to team1

                            const role = element.getAttribute('data-role') ||
                                       element.querySelector('.player-role')?.textContent?.trim() ||
                                       'Unknown';

                            // Try to extract player ID
                            const playerId = element.getAttribute('data-player-id') ||
                                           element.getAttribute('data-id') ||
                                           name.toLowerCase().replace(/\s+/g, '_');

                            if (name && !players.some(p => p.name === name && p.team === team)) {
                                players.push({
                                    id: playerId,
                                    name: name,
                                    team: team,
                                    role: role,
                                    matchId: matchInfo.id,
                                    played: true
                                });
                            }
                        });
                        break;
                    }
                }

                return players;
            }, matchInfo);

            logger.debug('Extracted CricketBaroda match players', {
                url: matchUrl,
                matchId: matchInfo.id,
                playersCount: matchPlayers.length
            }, 'CricketBarodaTournamentScraper');

            return matchPlayers;

        } catch (error) {
            logger.warn('Failed to extract CricketBaroda match players', {
                error: error instanceof Error ? error.message : String(error),
                url: matchUrl,
                matchId: matchInfo.id
            }, 'CricketBarodaTournamentScraper');
            return [];
        }
    }

    /**
     * Extract tournament name from the page
     * @param tournamentUrl - Tournament URL for context
     * @returns Promise resolving to tournament name
     */
    private async extractTournamentName(tournamentUrl: string): Promise<string> {
        try {
            const tournamentName = await this.page!.evaluate(() => {
                // Look for common tournament title selectors
                const selectors = [
                    'h1',
                    '.tournament-title',
                    '.series-title',
                    '.competition-title',
                    '.tournament-name',
                    'title'
                ];

                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent?.trim()) {
                        return element.textContent.trim();
                    }
                }

                // Fallback to page title
                return document.title || 'Unknown Tournament';
            });

            return tournamentName;
        } catch (error) {
            logger.warn('Failed to extract tournament name', {
                error: error instanceof Error ? error.message : String(error),
                url: tournamentUrl
            }, 'CricketBarodaTournamentScraper');
            return 'Unknown Tournament';
        }
    }
}
