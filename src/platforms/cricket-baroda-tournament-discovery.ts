import { CricketBarodaTournamentScraper } from './cricket-baroda-tournament-scraper';
import { logger } from '../logger';

interface TournamentDiscoveryResult {
    year: string;
    season: string;
    tournaments: TournamentInfo[];
    totalPages: number;
    totalTournaments: number;
}

interface TournamentInfo {
    name: string;
    url: string;
    id: string;
    year: string;
    season: string;
    startDate?: string;
    endDate?: string;
    type?: string;
    category?: string;
}

/**
 * Comprehensive Tournament Discovery System
 *
 * Systematically discovers all tournaments from CricketBaroda by:
 * 1. Iterating through all available years/seasons
 * 2. Handling pagination for each year
 * 3. Extracting complete tournament information
 */
export class CricketBarodaTournamentDiscovery {
    private scraper: CricketBarodaTournamentScraper;

    constructor() {
        this.scraper = new CricketBarodaTournamentScraper();
    }

    /**
     * Initialize the discovery system
     */
    async initialize(): Promise<void> {
        await this.scraper.initialize();
    }

    /**
     * Clean up resources
     */
    async cleanup(): Promise<void> {
        await this.scraper.cleanup();
    }

    /**
     * Discover all tournaments across all years and pages
     */
    async discoverAllTournaments(): Promise<TournamentDiscoveryResult[]> {
        const results: TournamentDiscoveryResult[] = [];

        try {
            logger.info('Starting comprehensive tournament discovery', {}, 'TournamentDiscovery');

            // Navigate to tournaments page
            const tournamentCenterUrl = 'https://www.cricketbaroda.com/match-center/tournaments';
            await this.scraper['page']!.goto(tournamentCenterUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Wait for content to load (the page uses dynamic loading)
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Wait for the season selector to be available
            await this.scraper['page']!.waitForSelector('select.sc-bc4a329-1.grmngK.form-select', { timeout: 10000 });

            // Get all available seasons/years
            const availableSeasons = await this.getAvailableSeasons();

            logger.info(`Found ${availableSeasons.length} seasons to process`, { seasons: availableSeasons }, 'TournamentDiscovery');

            // Process each season
            for (const season of availableSeasons) {
                logger.info(`Processing season: ${season.text} (${season.value})`, { season }, 'TournamentDiscovery');

                const seasonResult = await this.processSeason(season);
                results.push(seasonResult);

                logger.info(`Completed season ${season.text}: ${seasonResult.totalTournaments} tournaments found`, {
                    season: season.text,
                    tournaments: seasonResult.totalTournaments,
                    pages: seasonResult.totalPages
                }, 'TournamentDiscovery');
            }

            logger.info('Tournament discovery completed', {
                totalSeasons: results.length,
                totalTournaments: results.reduce((sum, r) => sum + r.totalTournaments, 0)
            }, 'TournamentDiscovery');

        } catch (error) {
            logger.error('Tournament discovery failed', error as Error, {}, 'TournamentDiscovery');
            throw error;
        }

        return results;
    }

    /**
     * Get all available seasons from the dropdown
     */
    private async getAvailableSeasons(): Promise<Array<{ value: string; text: string }>> {
        // Wait for the season selector to be available
        await this.scraper['page']!.waitForSelector('select.sc-bc4a329-1.grmngK.form-select', { timeout: 10000 });

        return await this.scraper['page']!.evaluate(() => {
            const seasonSelect = document.querySelector('select.sc-bc4a329-1.grmngK.form-select') as HTMLSelectElement;

            if (!seasonSelect) {
                return [];
            }

            const seasons: Array<{ value: string; text: string }> = [];
            for (let i = 0; i < seasonSelect.options.length; i++) {
                const option = seasonSelect.options[i];
                seasons.push({
                    value: option.value,
                    text: option.text
                });
            }

            return seasons;
        });
    }

    /**
     * Process a specific season to extract all tournaments
     */
    private async processSeason(season: { value: string; text: string }): Promise<TournamentDiscoveryResult> {
        const result: TournamentDiscoveryResult = {
            year: season.value,
            season: season.text,
            tournaments: [],
            totalPages: 0,
            totalTournaments: 0
        };

        try {
            // Select the season
            await this.selectSeason(season.value);

            // Wait for content to load
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Get total pages for this season
            const totalPages = await this.getTotalPages();
            result.totalPages = totalPages;

            logger.info(`Season ${season.text} has ${totalPages} pages`, { season: season.text, pages: totalPages }, 'TournamentDiscovery');

            // Process each page
            for (let page = 1; page <= totalPages; page++) {
                logger.info(`Processing page ${page}/${totalPages} for season ${season.text}`, {
                    season: season.text,
                    page,
                    totalPages
                }, 'TournamentDiscovery');

                if (page > 1) {
                    await this.navigateToPage(page);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                const pageTournaments = await this.extractTournamentsFromPage(season);
                result.tournaments.push(...pageTournaments);

                logger.info(`Page ${page} completed: ${pageTournaments.length} tournaments found`, {
                    season: season.text,
                    page,
                    tournamentsOnPage: pageTournaments.length
                }, 'TournamentDiscovery');
            }

            result.totalTournaments = result.tournaments.length;

        } catch (error) {
            logger.error(`Failed to process season ${season.text}`, error as Error, { season }, 'TournamentDiscovery');
        }

        return result;
    }

    private async selectSeason(seasonValue: string): Promise<void> {
        // Wait for the season selector to be available
        await this.scraper['page']!.waitForSelector('select.sc-bc4a329-1.grmngK.form-select', { timeout: 5000 });

        // Select the season
        await this.scraper['page']!.select('select.sc-bc4a329-1.grmngK.form-select', seasonValue);
    }

    /**
     * Get total number of pages for current season
     */
    private async getTotalPages(): Promise<number> {
        return await this.scraper['page']!.evaluate(() => {
            // Look for pagination elements
            const paginationElements = document.querySelectorAll('[class*="pagination"], .pagination, [class*="page"]');

            for (const element of paginationElements) {
                const text = element.textContent?.toLowerCase() || '';

                // Look for patterns like "1 of 5" or "Page 1 of 5"
                const pageMatch = text.match(/(\d+)\s*of\s*(\d+)/i);
                if (pageMatch) {
                    return parseInt(pageMatch[2]);
                }

                // Look for "1 / 5" pattern
                const slashMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
                if (slashMatch) {
                    return parseInt(slashMatch[2]);
                }
            }

            // Look for page number buttons/links
            const pageButtons = document.querySelectorAll('button[class*="page"], a[class*="page"], [class*="page-number"]');
            if (pageButtons.length > 0) {
                // Assume we can find the highest page number
                let maxPage = 1;
                for (const button of pageButtons) {
                    const text = button.textContent?.trim() || '';
                    const num = parseInt(text);
                    if (!isNaN(num) && num > maxPage) {
                        maxPage = num;
                    }
                }
                return maxPage;
            }

            // Check body text for pagination patterns like "1 of 2"
            const bodyText = document.body.textContent || '';
            const bodyPageMatch = bodyText.match(/(\d+)\s*of\s*(\d+)/i);
            if (bodyPageMatch) {
                return parseInt(bodyPageMatch[2]);
            }

            // Default to 1 page if no pagination found
            return 1;
        });
    }

    private async navigateToPage(pageNumber: number): Promise<void> {
        await this.scraper['page']!.evaluate((page: number) => {
            // Look for pagination controls
            const pageButtons = document.querySelectorAll('button, a, [role="button"]');

            for (const button of pageButtons) {
                const text = button.textContent?.trim() || '';
                if (text === page.toString()) {
                    (button as HTMLElement).click();
                    return;
                }
            }

            // Try to find next button if page > 1
            if (page > 1) {
                const nextButtons = document.querySelectorAll('button[class*="next"], a[class*="next"], [class*="next"]');
                for (const nextBtn of nextButtons) {
                    const text = nextBtn.textContent?.toLowerCase() || '';
                    if (text.includes('next') || text.includes('>')) {
                        (nextBtn as HTMLElement).click();
                        return;
                    }
                }
            }
        }, pageNumber);
    }

    private async extractTournamentsFromPage(season: { value: string; text: string }): Promise<TournamentInfo[]> {
        return await this.scraper['page']!.evaluate((seasonInfo: { value: string; text: string }) => {
            const tournaments: TournamentInfo[] = [];

            // First, try to extract from tournament links (anchor tags)
            const tournamentLinks = document.querySelectorAll('a[href*="tournament"]');

            for (const link of tournamentLinks) {
                const anchor = link as HTMLAnchorElement;
                const href = anchor.href;
                const text = link.textContent?.trim() || '';

                // Skip if text is too short or contains unwanted content
                if (text.length < 10 || text.includes('@font-face') || text.includes('Copyright') || text.includes('Baroda Cricket Association')) {
                    continue;
                }

                // Extract tournament ID from URL
                const urlMatch = href.match(/\/tournament\/(\d+)/);
                const tournamentId = urlMatch ? urlMatch[1] : '';

                // Look for tournament patterns in the text
                if (text.includes('Tournament') || text.includes('League') || text.includes('Cup') ||
                    text.includes('Premier') || text.includes('Championship') ||
                    text.includes('U-19') || text.includes('Late Mama Saheb') || text.includes('Ghorpade')) {

                    // Extract tournament details from text
                    const tournament: TournamentInfo = {
                        name: text,
                        url: href,
                        id: tournamentId,
                        year: seasonInfo.value,
                        season: seasonInfo.text
                    };

                    // Try to extract dates - look for patterns like "27 October, 2021 - 18 February, 2022"
                    const dateMatch = text.match(/(\d{1,2}\s+[A-Za-z]+,\s+\d{4})\s*-\s*(\d{1,2}\s+[A-Za-z]+,\s+\d{4})/);
                    if (dateMatch) {
                        tournament.startDate = dateMatch[1];
                        tournament.endDate = dateMatch[2];
                    }

                    // Try to extract tournament type
                    if (text.includes('T20') || text.includes('Twenty20')) {
                        tournament.type = 'T20';
                    } else if (text.includes('One Day') || text.includes('ODI')) {
                        tournament.type = 'One Day';
                    } else if (text.includes('Three Day') || text.includes('Test')) {
                        tournament.type = 'Three Day';
                    } else if (text.includes('Two Day')) {
                        tournament.type = 'Two Day';
                    }

                    // Extract category (U-19, U-16, etc.)
                    const categoryMatch = text.match(/(U-\d+|Under \d+|Senior|Junior)/i);
                    if (categoryMatch) {
                        tournament.category = categoryMatch[1];
                    }

                    // Only add if it's not already in the list (avoid duplicates)
                    const isDuplicate = tournaments.some(t => t.url === tournament.url);
                    if (!isDuplicate) {
                        tournaments.push(tournament);
                    }
                }
            }

            // Fallback: If no links found, try extracting from DIV elements (original logic)
            if (tournaments.length === 0) {
                const tournamentElements = document.querySelectorAll('div[class*="sc-6d90bb31"], h2[class*="sc-6d90bb31"]');

                for (const element of tournamentElements) {
                    const text = element.textContent?.trim() || '';

                    // Skip if text is too short or contains unwanted content
                    if (text.length < 10 || text.includes('@font-face') || text.includes('Copyright') || text.includes('Baroda Cricket Association')) {
                        continue;
                    }

                    // Look for tournament patterns in the text
                    if (text.includes('Tournament') || text.includes('League') || text.includes('Cup') ||
                        text.includes('Premier') || text.includes('Championship')) {

                        // Extract tournament details from text
                        const tournament: TournamentInfo = {
                            name: text,
                            url: '', // No direct URL available
                            id: '', // No ID available
                            year: seasonInfo.value,
                            season: seasonInfo.text
                        };

                        // Try to extract dates - look for patterns like "27 October, 2021 - 18 February, 2022"
                        const dateMatch = text.match(/(\d{1,2}\s+[A-Za-z]+,\s+\d{4})\s*-\s*(\d{1,2}\s+[A-Za-z]+,\s+\d{4})/);
                        if (dateMatch) {
                            tournament.startDate = dateMatch[1];
                            tournament.endDate = dateMatch[2];
                        }

                        // Try to extract tournament type
                        if (text.includes('T20') || text.includes('Twenty20')) {
                            tournament.type = 'T20';
                        } else if (text.includes('One Day') || text.includes('ODI')) {
                            tournament.type = 'One Day';
                        } else if (text.includes('Three Day') || text.includes('Test')) {
                            tournament.type = 'Three Day';
                        } else if (text.includes('Two Day')) {
                            tournament.type = 'Two Day';
                        }

                        // Extract category (U-19, U-16, etc.)
                        const categoryMatch = text.match(/(U-\d+|Under \d+|Senior|Junior)/i);
                        if (categoryMatch) {
                            tournament.category = categoryMatch[1];
                        }

                        // Only add if it's not already in the list (avoid duplicates)
                        const isDuplicate = tournaments.some(t => t.name === tournament.name);
                        if (!isDuplicate) {
                            tournaments.push(tournament);
                        }
                    }
                }
            }

            // Also try to extract from the main body text as a fallback
            if (tournaments.length === 0) {
                const bodyText = document.body.textContent || '';
                const lines = bodyText.split('\n');

                for (const line of lines) {
                    const text = line.trim();
                    if (text.includes('Tournament') && text.includes('2021') &&
                        (text.includes('U-19') || text.includes('Late Mama Saheb') || text.includes('Ghorpade'))) {

                        const tournament: TournamentInfo = {
                            name: text,
                            url: '',
                            id: '',
                            year: seasonInfo.value,
                            season: seasonInfo.text,
                            category: text.includes('U-19') ? 'U-19' : undefined,
                            type: text.includes('One Day') ? 'One Day' :
                                  text.includes('Three Day') ? 'Three Day' :
                                  text.includes('Two Day') ? 'Two Day' : undefined
                        };

                        tournaments.push(tournament);
                    }
                }
            }

            return tournaments;
        }, season);
    }

    /**
     * Search for specific tournament by name across all seasons
     */
    async searchTournament(tournamentName: string): Promise<TournamentInfo | null> {
        try {
            logger.info(`Searching for tournament: ${tournamentName}`, { tournamentName }, 'TournamentDiscovery');

            const allResults = await this.discoverAllTournaments();

            for (const seasonResult of allResults) {
                const found = seasonResult.tournaments.find(t =>
                    t.name.toLowerCase().includes(tournamentName.toLowerCase())
                );

                if (found) {
                    logger.info(`Found tournament: ${found.name}`, { tournament: found }, 'TournamentDiscovery');
                    return found;
                }
            }

            logger.info(`Tournament not found: ${tournamentName}`, { tournamentName }, 'TournamentDiscovery');
            return null;

        } catch (error) {
            logger.error(`Tournament search failed for: ${tournamentName}`, error as Error, { tournamentName }, 'TournamentDiscovery');
            return null;
        }
    }

    /**
     * Get tournaments for a specific year
     */
    async getTournamentsByYear(year: string): Promise<TournamentInfo[]> {
        try {
            logger.info(`Getting tournaments for year: ${year}`, { year }, 'TournamentDiscovery');

            const allResults = await this.discoverAllTournaments();
            const yearResult = allResults.find(r => r.season === year || r.year === year);

            if (yearResult) {
                logger.info(`Found ${yearResult.totalTournaments} tournaments for year ${year}`, {
                    year,
                    tournaments: yearResult.totalTournaments
                }, 'TournamentDiscovery');
                return yearResult.tournaments;
            }

            logger.info(`No tournaments found for year: ${year}`, { year }, 'TournamentDiscovery');
            return [];

        } catch (error) {
            logger.error(`Failed to get tournaments for year: ${year}`, error as Error, { year }, 'TournamentDiscovery');
            return [];
        }
    }
}
