import puppeteer, { Browser, Page } from 'puppeteer';
import { TournamentScraper, MatchInfo, TournamentInfo, TournamentTeam, MatchPlayer } from './interfaces';
import { logger, logOperation } from '../logger';
import { BrowserError, ScraperError, withRetry } from '../errors';
import { CONFIG } from '../config';

/**
 * Tournament scraper for extracting match information from tournament pages
 *
 * This class handles scraping tournament/series pages to extract lists of matches
 * that can then be processed individually.
 */
export class CricketTournamentScraper implements TournamentScraper {
    private browser: Browser | null = null;
    private page: Page | null = null;

    /**
     * Initialize browser for tournament scraping
     */
    async initialize(): Promise<void> {
        const endOperation = logOperation('browser_initialization', {}, 'CricketTournamentScraper');

        try {
            logger.debug('Initializing browser for tournament scraping...', { headless: CONFIG.BROWSER.HEADLESS }, 'CricketTournamentScraper');
            this.browser = await puppeteer.launch({
                headless: CONFIG.BROWSER.HEADLESS,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            this.page = await this.browser.newPage();

            // Set reasonable timeouts
            this.page.setDefaultTimeout(CONFIG.BROWSER.DEFAULT_TIMEOUT);
            this.page.setDefaultNavigationTimeout(CONFIG.BROWSER.DEFAULT_TIMEOUT);

            logger.info('Browser initialized for tournament scraping', {}, 'CricketTournamentScraper');
            endOperation();
        } catch (error) {
            logger.error('Browser initialization failed for tournament scraper', error as Error, {}, 'CricketTournamentScraper');
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
                logger.debug('Closing tournament scraper browser...', {}, 'CricketTournamentScraper');
                await this.browser.close();
                this.browser = null;
                this.page = null;
                logger.debug('Tournament scraper browser closed successfully', {}, 'CricketTournamentScraper');
            } catch (error) {
                logger.warn('Warning: Error closing tournament scraper browser', {
                    error: error instanceof Error ? error.message : String(error)
                }, 'CricketTournamentScraper');
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

        const endOperation = logOperation('scrape_tournament_matches', { url: tournamentUrl }, 'CricketTournamentScraper');

        try {
            logger.info('Starting tournament match scraping', { url: tournamentUrl }, 'CricketTournamentScraper');

            // Navigate to tournament page
            await withRetry(
                async () => {
                    logger.debug(`Navigating to tournament page: ${tournamentUrl}`, { url: tournamentUrl }, 'CricketTournamentScraper');
                    await this.page!.goto(tournamentUrl, {
                        waitUntil: 'networkidle2',
                        timeout: CONFIG.BROWSER.DEFAULT_TIMEOUT
                    });
                    logger.info('Tournament page loaded successfully', { url: tournamentUrl }, 'CricketTournamentScraper');
                },
                CONFIG.RETRY.MAX_ATTEMPTS,
                CONFIG.RETRY.DELAY,
                `Failed to load tournament page ${tournamentUrl}`
            );

            // Extract match information
            const matches = await this.extractMatchesFromPage(tournamentUrl);

            logger.info('Tournament match scraping completed', {
                url: tournamentUrl,
                matchesFound: matches.length
            }, 'CricketTournamentScraper');

            endOperation();
            return matches;

        } catch (error) {
            logger.error('Tournament match scraping failed', error as Error, { url: tournamentUrl }, 'CricketTournamentScraper');
            throw new ScraperError(
                `Tournament scraping failed: ${error instanceof Error ? error.message : String(error)}`,
                'TOURNAMENT_SCRAPING_FAILED',
                { url: tournamentUrl, originalError: error }
            );
        }
    }

    /**
     * Extract match information from the current page
     * @param tournamentUrl - Original tournament URL for context
     * @returns Promise resolving to list of matches
     */
    private async extractMatchesFromPage(tournamentUrl: string): Promise<MatchInfo[]> {
        const matches: MatchInfo[] = [];

        try {
            // Wait for match elements to load
            await this.page!.waitForSelector('.match-card, .match-item, .fixture, [data-match-id]', { timeout: 10000 });

            // Extract match data using multiple selectors (flexible for different platforms)
            const matchData = await this.page!.evaluate(() => {
                const matches: any[] = [];

                // Common selectors for cricket match listings
                const selectors = [
                    '.match-card',
                    '.match-item',
                    '.fixture',
                    '[data-match-id]',
                    '.match-list-item',
                    '.game-card'
                ];

                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        elements.forEach((element, index) => {
                            const link = element.querySelector('a[href*="match"]') ||
                                       element.querySelector('a[href*="game"]') ||
                                       element.querySelector('a');

                            if (link) {
                                const href = (link as HTMLAnchorElement).href;
                                const title = element.textContent?.trim() ||
                                            link.textContent?.trim() ||
                                            `Match ${index + 1}`;

                                // Extract team names from text content
                                const text = element.textContent || '';
                                const teamMatches = text.match(/([A-Za-z\s]+)\s+vs\s+([A-Za-z\s]+)/);

                                matches.push({
                                    url: href,
                                    title: title,
                                    team1: teamMatches ? teamMatches[1].trim() : 'Team 1',
                                    team2: teamMatches ? teamMatches[2].trim() : 'Team 2',
                                    status: 'scheduled', // Default status
                                    id: href.split('/').pop() || `match_${index + 1}`
                                });
                            }
                        });
                        break; // Use first selector that finds elements
                    }
                }

                return matches;
            });

            // Convert to MatchInfo objects
            for (const data of matchData) {
                matches.push({
                    id: data.id,
                    url: data.url,
                    title: data.title,
                    team1: data.team1,
                    team2: data.team2,
                    status: data.status,
                    tournament: await this.extractTournamentName(tournamentUrl)
                });
            }

            logger.debug('Extracted matches from page', {
                url: tournamentUrl,
                matchesFound: matches.length,
                matches: matches.map(m => ({ id: m.id, title: m.title }))
            }, 'CricketTournamentScraper');

        } catch (error) {
            logger.warn('Failed to extract matches using primary method, trying fallback', {
                error: error instanceof Error ? error.message : String(error),
                url: tournamentUrl
            }, 'CricketTournamentScraper');

            // Fallback: try to find any links that look like match URLs
            const fallbackMatches = await this.extractMatchesFallback(tournamentUrl);
            matches.push(...fallbackMatches);
        }

        return matches;
    }

    /**
     * Fallback method to extract matches when primary method fails
     * @param tournamentUrl - Tournament URL for context
     * @returns Promise resolving to list of matches
     */
    private async extractMatchesFallback(tournamentUrl: string): Promise<MatchInfo[]> {
        const matches: MatchInfo[] = [];

        try {
            const links = await this.page!.evaluate(() => {
                const matchLinks: any[] = [];
                const allLinks = document.querySelectorAll('a[href]');

                allLinks.forEach((link, index) => {
                    const href = (link as HTMLAnchorElement).href;
                    const text = link.textContent?.trim() || '';

                    // Look for links that contain match-related keywords
                    if (href.includes('match') || href.includes('game') ||
                        text.toLowerCase().includes('vs') ||
                        text.toLowerCase().includes('versus')) {

                        matchLinks.push({
                            url: href,
                            title: text || `Match ${index + 1}`,
                            id: href.split('/').pop() || `match_${index + 1}`
                        });
                    }
                });

                return matchLinks;
            });

            // Convert to MatchInfo objects
            for (const link of links) {
                matches.push({
                    id: link.id,
                    url: link.url,
                    title: link.title,
                    team1: 'Team 1', // Placeholder
                    team2: 'Team 2', // Placeholder
                    status: 'scheduled',
                    tournament: await this.extractTournamentName(tournamentUrl)
                });
            }

            logger.debug('Extracted matches using fallback method', {
                url: tournamentUrl,
                matchesFound: matches.length
            }, 'CricketTournamentScraper');

        } catch (error) {
            logger.error('Fallback match extraction also failed', error as Error, {
                url: tournamentUrl
            }, 'CricketTournamentScraper');
        }

        return matches;
    }

    /**
     * Extract tournament name from the page
     * @param tournamentUrl - Tournament URL
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
            }, 'CricketTournamentScraper');
            return 'Unknown Tournament';
        }
    }

    /**
     * Get detailed tournament information
     * @param tournamentUrl - URL of the tournament
     * @returns Promise resolving to tournament info
     */
    async getTournamentInfo(tournamentUrl: string): Promise<{
        name: string;
        matches: MatchInfo[];
        status: string;
    }> {
        const endOperation = logOperation('get_tournament_info', { url: tournamentUrl }, 'CricketTournamentScraper');

        try {
            logger.info('Getting tournament information', { url: tournamentUrl }, 'CricketTournamentScraper');

            const matches = await this.scrapeTournamentMatches(tournamentUrl);
            const name = await this.extractTournamentName(tournamentUrl);

            const tournamentInfo = {
                name,
                matches,
                status: matches.length > 0 ? 'active' : 'no_matches'
            };

            logger.info('Tournament information retrieved', {
                url: tournamentUrl,
                name,
                matchesCount: matches.length,
                status: tournamentInfo.status
            }, 'CricketTournamentScraper');

            endOperation();
            return tournamentInfo;

        } catch (error) {
            logger.error('Failed to get tournament information', error as Error, {
                url: tournamentUrl
            }, 'CricketTournamentScraper');

            endOperation();
            throw new ScraperError(
                `Tournament info retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
                'TOURNAMENT_INFO_FAILED',
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

        const endOperation = logOperation('get_comprehensive_tournament_info', { url: tournamentUrl }, 'CricketTournamentScraper');

        try {
            logger.info('Getting comprehensive tournament information', { url: tournamentUrl }, 'CricketTournamentScraper');

            // Navigate to tournament page
            await withRetry(
                async () => {
                    logger.debug(`Navigating to tournament page: ${tournamentUrl}`, { url: tournamentUrl }, 'CricketTournamentScraper');
                    await this.page!.goto(tournamentUrl, {
                        waitUntil: 'networkidle2',
                        timeout: CONFIG.BROWSER.DEFAULT_TIMEOUT
                    });
                    logger.info('Tournament page loaded successfully', { url: tournamentUrl }, 'CricketTournamentScraper');
                },
                CONFIG.RETRY.MAX_ATTEMPTS,
                CONFIG.RETRY.DELAY,
                `Failed to load tournament page ${tournamentUrl}`
            );

            // Extract comprehensive tournament metadata
            const tournamentInfo = await this.extractTournamentMetadata(tournamentUrl);

            // Extract participating teams
            const teams = await this.extractTournamentTeams(tournamentUrl);
            tournamentInfo.totalTeams = teams.length;

            // Extract all matches
            const matches = await this.extractMatchesFromPage(tournamentUrl);
            tournamentInfo.totalMatches = matches.length;

            logger.info('Comprehensive tournament information retrieved', {
                url: tournamentUrl,
                name: tournamentInfo.name,
                teamsCount: teams.length,
                matchesCount: matches.length,
                status: tournamentInfo.status
            }, 'CricketTournamentScraper');

            endOperation();
            return tournamentInfo;

        } catch (error) {
            logger.error('Failed to get comprehensive tournament information', error as Error, {
                url: tournamentUrl
            }, 'CricketTournamentScraper');

            endOperation();
            throw new ScraperError(
                `Comprehensive tournament info retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
                'COMPREHENSIVE_TOURNAMENT_INFO_FAILED',
                { url: tournamentUrl, originalError: error }
            );
        }
    }

    /**
     * Extract comprehensive tournament metadata
     * @param tournamentUrl - Tournament URL
     * @returns Promise resolving to tournament metadata
     */
    private async extractTournamentMetadata(tournamentUrl: string): Promise<TournamentInfo> {
        try {
            const metadata = await this.page!.evaluate(() => {
                const data: any = {};

                // Extract tournament name
                const nameSelectors = [
                    'h1',
                    '.tournament-title',
                    '.series-title',
                    '.competition-title',
                    '.tournament-name',
                    '[data-tournament-name]',
                    '.series-name'
                ];

                for (const selector of nameSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent?.trim()) {
                        data.name = element.textContent.trim();
                        break;
                    }
                }

                // Extract organizer/series information
                const organizerSelectors = [
                    '.organizer',
                    '.series-organizer',
                    '.tournament-organizer',
                    '[data-organizer]',
                    '.series-info'
                ];

                for (const selector of organizerSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent?.trim()) {
                        data.organizer = element.textContent.trim();
                        break;
                    }
                }

                // Extract format (T20, ODI, Test, etc.)
                const formatSelectors = [
                    '.format',
                    '.match-format',
                    '.tournament-format',
                    '[data-format]',
                    '.series-format'
                ];

                for (const selector of formatSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent?.trim()) {
                        data.format = element.textContent.trim();
                        break;
                    }
                }

                // Extract dates
                const dateSelectors = [
                    '.dates',
                    '.tournament-dates',
                    '.series-dates',
                    '[data-start-date]',
                    '[data-end-date]',
                    '.date-range'
                ];

                for (const selector of dateSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent?.trim()) {
                        const dateText = element.textContent.trim();
                        // Try to parse start and end dates
                        const dateMatch = dateText.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})\s*-\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
                        if (dateMatch) {
                            data.startDate = dateMatch[1];
                            data.endDate = dateMatch[2];
                        } else {
                            data.startDate = dateText;
                        }
                        break;
                    }
                }

                // Extract venue/location
                const venueSelectors = [
                    '.venue',
                    '.location',
                    '.tournament-venue',
                    '[data-venue]',
                    '.ground'
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
                    '.series-status'
                ];

                let status = 'ongoing'; // default
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

            // Generate tournament ID from URL or name
            const tournamentId = tournamentUrl.split('/').pop()?.split('?')[0] ||
                               metadata.name?.toLowerCase().replace(/\s+/g, '_') ||
                               `tournament_${Date.now()}`;

            const tournamentInfo: TournamentInfo = {
                id: tournamentId,
                name: metadata.name || 'Unknown Tournament',
                organizer: metadata.organizer,
                format: metadata.format,
                status: metadata.status || 'ongoing',
                startDate: metadata.startDate,
                endDate: metadata.endDate,
                venue: metadata.venue,
                url: tournamentUrl,
                metadata: {
                    extractedAt: new Date().toISOString(),
                    source: 'tournament_page'
                }
            };

            logger.debug('Extracted tournament metadata', {
                url: tournamentUrl,
                name: tournamentInfo.name,
                status: tournamentInfo.status,
                format: tournamentInfo.format
            }, 'CricketTournamentScraper');

            return tournamentInfo;

        } catch (error) {
            logger.warn('Failed to extract tournament metadata', {
                error: error instanceof Error ? error.message : String(error),
                url: tournamentUrl
            }, 'CricketTournamentScraper');

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
     * Extract participating teams from tournament page
     * @param tournamentUrl - URL of the tournament
     * @returns Promise resolving to list of teams
     */
    async extractTournamentTeams(tournamentUrl: string): Promise<TournamentTeam[]> {
        if (!this.page) {
            throw new BrowserError('Browser not initialized', { url: tournamentUrl });
        }

        try {
            logger.debug('Extracting tournament teams', { url: tournamentUrl }, 'CricketTournamentScraper');

            const teams = await this.page!.evaluate(() => {
                const teams: any[] = [];

                // Common selectors for team listings
                const teamSelectors = [
                    '.team-card',
                    '.team-item',
                    '.participant',
                    '.team-list-item',
                    '[data-team-id]',
                    '.team-name',
                    '.participant-team'
                ];

                for (const selector of teamSelectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        elements.forEach((element, index) => {
                            const name = element.textContent?.trim() ||
                                       element.getAttribute('data-team-name') ||
                                       `Team ${index + 1}`;

                            const link = element.querySelector('a[href*="team"]') ||
                                       element.querySelector('a[href*="squad"]') ||
                                       element.querySelector('a');

                            const teamUrl = link ? (link as HTMLAnchorElement).href : null;

                            if (name && !teams.some(t => t.name === name)) {
                                teams.push({
                                    id: `team_${index + 1}`,
                                    name: name,
                                    url: teamUrl,
                                    players: [] // Will be populated separately
                                });
                            }
                        });
                        break; // Use first selector that finds elements
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

            logger.debug('Extracted tournament teams', {
                url: tournamentUrl,
                teamsCount: tournamentTeams.length,
                teams: tournamentTeams.map(t => t.name)
            }, 'CricketTournamentScraper');

            return tournamentTeams;

        } catch (error) {
            logger.warn('Failed to extract tournament teams', {
                error: error instanceof Error ? error.message : String(error),
                url: tournamentUrl
            }, 'CricketTournamentScraper');
            return [];
        }
    }

    /**
     * Extract team roster from team page or tournament context
     * @param teamUrl - URL of the team page
     * @param teamName - Name of the team
     * @returns Promise resolving to team roster
     */
    async extractTeamRoster(teamUrl: string, teamName: string): Promise<TournamentTeam> {
        if (!this.page) {
            throw new BrowserError('Browser not initialized', { url: teamUrl });
        }

        try {
            logger.debug('Extracting team roster', { url: teamUrl, teamName }, 'CricketTournamentScraper');

            // Navigate to team page if different from current page
            if (this.page.url() !== teamUrl) {
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
            }

            const roster = await this.page!.evaluate((teamName) => {
                const players: any[] = [];

                // Common selectors for player listings in team rosters
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

                            if (name && !players.some(p => p.name === name)) {
                                players.push({
                                    id: `player_${index + 1}`,
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

            logger.debug('Extracted team roster', {
                url: teamUrl,
                teamName,
                playersCount: roster.length
            }, 'CricketTournamentScraper');

            return teamRoster;

        } catch (error) {
            logger.warn('Failed to extract team roster', {
                error: error instanceof Error ? error.message : String(error),
                url: teamUrl,
                teamName
            }, 'CricketTournamentScraper');

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
     * Extract players who actually played in a specific match
     * @param matchUrl - URL of the match
     * @param matchInfo - Basic match information
     * @returns Promise resolving to match players
     */
    async extractMatchPlayers(matchUrl: string, matchInfo: MatchInfo): Promise<MatchPlayer[]> {
        if (!this.page) {
            throw new BrowserError('Browser not initialized', { url: matchUrl });
        }

        try {
            logger.debug('Extracting match players', { url: matchUrl, matchId: matchInfo.id }, 'CricketTournamentScraper');

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

                            if (name && !players.some(p => p.name === name && p.team === team)) {
                                players.push({
                                    id: `player_${index + 1}`,
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

            logger.debug('Extracted match players', {
                url: matchUrl,
                matchId: matchInfo.id,
                playersCount: matchPlayers.length
            }, 'CricketTournamentScraper');

            return matchPlayers;

        } catch (error) {
            logger.warn('Failed to extract match players', {
                error: error instanceof Error ? error.message : String(error),
                url: matchUrl,
                matchId: matchInfo.id
            }, 'CricketTournamentScraper');
            return [];
        }
    }
}
