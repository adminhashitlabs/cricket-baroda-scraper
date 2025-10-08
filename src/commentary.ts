import { Browser, Page } from 'puppeteer';
import { Team, BallData, OverSummary, InningData, WicketInfo, Player } from './types';
import { CONFIG } from './config';
import { SelectorError, TimeoutError, DataParsingError, ScraperError, withErrorHandling } from './errors';
import { logger, logOperation } from './logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Extracts cricket commentary data from web pages
 *
 * This class handles the extraction of detailed cricket match data including:
 * - Ball-by-ball commentary with bowler/batter information
 * - Wicket information and dismissal details
 * - Over summaries and team statistics
 * - Player performance data
 *
 * Uses Puppeteer for browser automation and DOM manipulation.
 *
 * @example
 * ```typescript
 * const extractor = new CommentaryExtractor(browser, page, matchUrl);
 * const result = await extractor.run([]);
 * console.log(`Extracted ${result.balls.length} balls`);
 * ```
 */
export class CommentaryExtractor {
    private browser: Browser;
    private page: Page;
    private url: string;
    private playerLookup: Map<string, string> = new Map();

    /**
     * Creates a new CommentaryExtractor instance
     *
     * @param browser - Puppeteer browser instance
     * @param page - Puppeteer page instance
     * @param url - Target match URL to extract data from
     */
    constructor(browser: Browser, page: Page, url: string) {
        this.browser = browser;
        this.page = page;
        this.url = url;
        this.loadPlayerData();
    }

    /**
     * Loads player data from the JSON file and creates a lookup map
     *
     * @private
     */
    private loadPlayerData(): void {
        try {
            const playerDataPath = path.join(__dirname, '..', 'players-data.json');
            if (fs.existsSync(playerDataPath)) {
                const playerData = JSON.parse(fs.readFileSync(playerDataPath, 'utf-8'));
                const players: Player[] = playerData.players || [];

                // Create lookup map from player name to ID
                this.playerLookup.clear();
                players.forEach(player => {
                    this.playerLookup.set(player.name.toLowerCase().trim(), player.id);
                });

                logger.info('Player data loaded successfully', {
                    playerCount: players.length,
                    lookupMapSize: this.playerLookup.size
                }, 'CommentaryExtractor');
            } else {
                logger.warn('Player data file not found, proceeding without player IDs', {
                    expectedPath: playerDataPath
                }, 'CommentaryExtractor');
            }
        } catch (error) {
            logger.error('Failed to load player data', error as Error, {}, 'CommentaryExtractor');
        }
    }

    /**
     * Looks up a player ID by name
     *
     * @private
     * @param playerName - The player's name to look up
     * @returns The player ID if found, undefined otherwise
     */
    /**
     * Looks up a player ID by name
     *
     * @private
     * @param playerName - The player's name to look up
     * @returns The player ID if found, undefined otherwise
     */
    private getPlayerId(playerName: string): string | undefined {
        if (!playerName || playerName.trim().length === 0) {
            return undefined;
        }

        const normalizedName = playerName.toLowerCase().trim();

        // Try exact match first
        const exactMatch = this.playerLookup.get(normalizedName);
        if (exactMatch) {
            return exactMatch;
        }

        // Try case-insensitive match
        for (const [name, id] of this.playerLookup.entries()) {
            if (name.toLowerCase() === normalizedName) {
                logger.debug('Found case-insensitive match for player', {
                    extractedName: playerName,
                    storedName: name,
                    playerId: id
                }, 'CommentaryExtractor');
                return id;
            }
        }

        // Try partial matches for common name variations
        for (const [name, id] of this.playerLookup.entries()) {
            const normalizedStored = name.toLowerCase();
            // Check if one contains the other
            if (normalizedStored.includes(normalizedName) || normalizedName.includes(normalizedStored)) {
                logger.debug('Found partial match for player', {
                    extractedName: playerName,
                    storedName: name,
                    playerId: id
                }, 'CommentaryExtractor');
                return id;
            }

            // Try matching first and last names
            const extractedParts = normalizedName.split(' ');
            const storedParts = normalizedStored.split(' ');

            if (extractedParts.length >= 2 && storedParts.length >= 2) {
                const extractedFirst = extractedParts[0];
                const extractedLast = extractedParts[extractedParts.length - 1];
                const storedFirst = storedParts[0];
                const storedLast = storedParts[storedParts.length - 1];

                // Match first and last names
                if ((extractedFirst === storedFirst || extractedFirst === storedLast) &&
                    (extractedLast === storedLast || extractedLast === storedFirst)) {
                    logger.debug('Found name parts match for player', {
                        extractedName: playerName,
                        storedName: name,
                        playerId: id
                    }, 'CommentaryExtractor');
                    return id;
                }
            }
        }

        logger.debug('Player ID not found', { playerName }, 'CommentaryExtractor');
        return undefined;
    }

    /**
     * Navigates to the commentary tab on the cricket match page
     *
     * Locates and clicks the COMMENTARY tab to access ball-by-ball data.
     * Uses multiple strategies to find the commentary link if standard selectors fail.
     *
     * @private
     * @throws {SelectorError} When commentary tab cannot be found
     * @throws {TimeoutError} When navigation times out
     * @returns Promise that resolves when commentary tab is active
     */
    private async navigateToCommentaryTab(): Promise<void> {
        const endOperation = logOperation('navigate_to_commentary', { url: this.url }, 'CommentaryExtractor');

        logger.debug('Looking for COMMENTARY tab...', { url: this.url }, 'CommentaryExtractor');

        // First, let's see what links are on the page
        const allLinks = await this.page.$$eval('a', anchors => anchors.map(a => ({
            text: a.textContent?.trim() || '',
            href: a.getAttribute('href') || ''
        })));
        logger.debug('All links found on page', {
            linkCount: allLinks.length,
            commentaryLinks: allLinks.filter(link => link.text && link.text.length > 0).slice(0, 10)
        }, 'CommentaryExtractor');

        // Look for COMMENTARY link - try multiple approaches
        let commentaryLink = await this.page.$('a[href*="COMMENTARY"]');
        if (!commentaryLink) {
            // Try finding by text content using evaluate
            const links = await this.page.$$('a');
            for (const link of links) {
                const text = await link.evaluate(el => el.textContent?.trim() || '');
                if (text === 'COMMENTARY') {
                    commentaryLink = link;
                    break;
                }
            }
        }

        if (!commentaryLink) {
            logger.debug('COMMENTARY tab not found with standard selectors, trying alternative methods', {}, 'CommentaryExtractor');
            // Try clicking directly using page.click with text
            try {
                await this.page.click('::-p-text(COMMENTARY)');
                logger.info('Clicked COMMENTARY using text selector', {}, 'CommentaryExtractor');
            } catch (e) {
                // Try alternative text selector
                try {
                    await this.page.click('text="COMMENTARY"');
                    logger.info('Clicked COMMENTARY using alternative text selector', {}, 'CommentaryExtractor');
                } catch (e2) {
                    logger.error('Could not click COMMENTARY tab with any method', e2 as Error, { url: this.url }, 'CommentaryExtractor');
                    throw new SelectorError('COMMENTARY tab not found', 'a[href*="COMMENTARY"]');
                }
            }
        } else {
            await commentaryLink.click();
            logger.info('COMMENTARY tab clicked successfully', {}, 'CommentaryExtractor');
        }

        // Wait for URL to change or page to load
        await new Promise(resolve => setTimeout(resolve, CONFIG.TIMEOUTS.COMMENTARY_LOAD));
        const currentUrl = this.page.url();
        logger.debug('Page navigation completed', { currentUrl }, 'CommentaryExtractor');

        endOperation();
    }

    private async findTeamOptions(): Promise<{ value: string; text: string }[]> {
        const endOperation = logOperation('find_team_options', { url: this.url }, 'CommentaryExtractor');

        logger.debug('Looking for team selector...', { url: this.url }, 'CommentaryExtractor');

        // First, let's wait a bit and see what content is available
        await new Promise(resolve => setTimeout(resolve, CONFIG.TIMEOUTS.TEAM_LOAD));

        // Check if any select elements exist
        const selectCount = await this.page.$$eval('select', selects => selects.length);
        logger.debug('Select elements found on page', { selectCount }, 'CommentaryExtractor');

        if (selectCount === 0) {
            logger.info('No team selector found, will try direct commentary extraction', { url: this.url }, 'CommentaryExtractor');
            endOperation();
            return []; // No team selector found
        }

        // Try to find the team selector with different approaches
        let teamSelector;
        try {
            teamSelector = await this.page.waitForSelector('select.sc-5abfe348-2', { timeout: CONFIG.TIMEOUTS.CONTENT_LOAD });
        } catch (e) {
            // Try alternative selectors
            const selectors = ['select', '[role="combobox"]', '.team-selector'];
            for (const sel of selectors) {
                try {
                    teamSelector = await this.page.waitForSelector(sel, { timeout: CONFIG.TIMEOUTS.TEAM_LOAD });
                    if (teamSelector) break;
                } catch (e2) {
                    continue;
                }
            }
        }

        if (!teamSelector) {
            logger.warn('Team selector not found with any method', { url: this.url }, 'CommentaryExtractor');
            throw new SelectorError('Team selector not found with any method', 'select.sc-5abfe348-2');
        }

        logger.debug('Found team selector, retrieving team options...', {}, 'CommentaryExtractor');

        // Debug: Let's see what select elements are available
        const selectElements = await this.page.$$eval('select', selects => selects.map(s => ({
            id: s.id,
            className: s.className,
            name: s.name
        })));
        logger.debug('Available select elements', { selectElements }, 'CommentaryExtractor');

        // Get team options - try multiple selectors
        let teamOptions: { value: string; text: string }[] = [];
        const optionSelectors = CONFIG.SELECTORS.TEAM_SELECTORS;

        for (const selector of optionSelectors) {
            try {
                teamOptions = await this.page.$$eval(selector, (options: Element[]) =>
                    options
                        .filter((option): option is HTMLOptionElement => option instanceof HTMLOptionElement)
                        .map(option => ({
                            value: option.value,
                            text: option.textContent?.trim() || ''
                        }))
                        .filter(option => option.text && option.text.length > 0)
                );
                if (teamOptions.length > 0) {
                    logger.info('Team options found successfully', {
                        selector,
                        teamCount: teamOptions.length,
                        teams: teamOptions.map(t => t.text)
                    }, 'CommentaryExtractor');
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        endOperation();
        return teamOptions;
    }

    private async selectTeam(teamValue: string): Promise<void> {
        const endOperation = logOperation('select_team', { teamValue }, 'CommentaryExtractor');

        await this.page.select('select.sc-bc4a329-1', teamValue);
        logger.info('Team selected successfully', { teamValue }, 'CommentaryExtractor');

        // Wait for commentary to load
        await new Promise(resolve => setTimeout(resolve, CONFIG.TIMEOUTS.COMMENTARY_LOAD));
        logger.debug('Waiting for commentary to load after team selection', { teamValue }, 'CommentaryExtractor');

        endOperation();
    }

    /**
     * Main method to extract cricket commentary data
     *
     * Orchestrates the entire commentary extraction process including:
     * - Navigation to commentary tab
     * - Team selection and data extraction for each innings
     * - Ball-by-ball data parsing
     * - Wicket information extraction
     * - Over summary generation
     *
     * @param teams - Array of team information for the match
     * @returns Promise resolving to extracted balls and innings data
     * @throws {ScraperError} When extraction fails
     *
     * @example
     * ```typescript
     * const teams = [{ name: 'Team A', id: 'team1' }, { name: 'Team B', id: 'team2' }];
     * const result = await extractor.extractCommentary(teams);
     * console.log(`Extracted ${result.balls.length} balls from ${result.innings.length} innings`);
     * ```
     */
    async extractCommentary(teams: Team[]): Promise<{ balls: BallData[], innings: InningData[] }> {
        const endOperation = logOperation('extract_commentary', { url: this.url, teamCount: teams.length }, 'CommentaryExtractor');

        try {
            logger.info('Starting commentary extraction', { url: this.url, teamCount: teams.length }, 'CommentaryExtractor');

            // Navigate to COMMENTARY tab with error handling
            await withErrorHandling(
                () => this.navigateToCommentaryTab(),
                'Failed to navigate to commentary tab'
            );

            // Extract data for both teams/innings
            const allInnings: InningData[] = [];
            const allBalls: BallData[] = [];

            // Try to find team selector first
            const teamOptions = await withErrorHandling(
                () => this.findTeamOptions(),
                'Failed to find team selection options'
            );

            if (teamOptions.length === 0) {
                logger.info('No team options found, attempting direct commentary extraction', { url: this.url }, 'CommentaryExtractor');
                // Try to find the commentary container directly
                const commentaryContainer = await this.page.$(`${CONFIG.SELECTORS.COMMENTARY_CONTAINER}`);
                if (commentaryContainer) {
                    logger.debug('Found commentary container directly, proceeding with extraction...', {}, 'CommentaryExtractor');
                    const { balls, overSummaries } = await this.extractCommentaryBalls();
                    const innings = await this.groupBallsIntoInnings(balls, overSummaries, CONFIG.DATA.DEFAULT_TEAM_NAME);
                    logger.info('Direct commentary extraction completed', {
                        ballCount: balls.length,
                        inningsCount: innings.length
                    }, 'CommentaryExtractor');
                    endOperation();
                    return { balls, innings };
                } else {
                    throw new SelectorError('No team options or commentary container found', CONFIG.SELECTORS.COMMENTARY_CONTAINER);
                }
            }

            for (let i = 0; i < Math.min(teamOptions.length, CONFIG.DATA.MAX_INNINGS); i++) {
                const targetTeam = teamOptions[i];
                logger.info(`Processing team ${i + 1}/${Math.min(teamOptions.length, CONFIG.DATA.MAX_INNINGS)}`, {
                    teamName: targetTeam.text,
                    teamValue: targetTeam.value
                }, 'CommentaryExtractor');

                // Select the team with error handling
                await withErrorHandling(
                    () => this.selectTeam(targetTeam.value),
                    `Failed to select team: ${targetTeam.text}`,
                    { teamValue: targetTeam.value, teamText: targetTeam.text }
                );

                // Extract commentary for this team
                const { balls, overSummaries } = await withErrorHandling(
                    () => this.extractCommentaryBalls(),
                    `Failed to extract commentary for team: ${targetTeam.text}`,
                    { team: targetTeam.text }
                );

                // Group balls into innings for this team
                const innings = await withErrorHandling(
                    () => this.groupBallsIntoInnings(balls, overSummaries, targetTeam.text),
                    `Failed to group balls into innings for team: ${targetTeam.text}`,
                    { team: targetTeam.text, ballCount: balls.length }
                );

                // Add to combined results
                allInnings.push(...innings);
                allBalls.push(...balls);

                logger.debug(`Team ${targetTeam.text} processing completed`, {
                    team: targetTeam.text,
                    ballsExtracted: balls.length,
                    inningsCreated: innings.length
                }, 'CommentaryExtractor');
            }

            logger.info('Commentary extraction completed successfully', {
                url: this.url,
                totalBalls: allBalls.length,
                totalInnings: allInnings.length,
                teamsProcessed: Math.min(teamOptions.length, CONFIG.DATA.MAX_INNINGS)
            }, 'CommentaryExtractor');

            endOperation();
            return { balls: allBalls, innings: allInnings };

        } catch (error) {
            logger.error('Commentary extraction failed', error as Error, { url: this.url }, 'CommentaryExtractor');

            // Re-throw ScraperError instances as-is
            if (error instanceof ScraperError) {
                throw error;
            }

            // Wrap unknown errors
            throw new ScraperError(
                `Commentary extraction failed: ${error instanceof Error ? error.message : String(error)}`,
                'COMMENTARY_EXTRACTION_FAILED',
                { url: this.url, originalError: error }
            );
        }
    }

    private async extractCommentaryBalls(): Promise<{ balls: BallData[], overSummaries: OverSummary[] }> {
        const endOperation = logOperation('extract_commentary_balls', { url: this.url }, 'CommentaryExtractor');

        logger.debug('Starting commentary balls extraction', { url: this.url }, 'CommentaryExtractor');

        // Wait for commentary container to load
        logger.debug('Waiting for commentary container...', { selector: CONFIG.SELECTORS.COMMENTARY_CONTAINER }, 'CommentaryExtractor');
        await this.page.waitForSelector(CONFIG.SELECTORS.COMMENTARY_CONTAINER, { timeout: CONFIG.TIMEOUTS.ELEMENT_WAIT });
        logger.debug('Commentary container found', { selector: CONFIG.SELECTORS.COMMENTARY_CONTAINER }, 'CommentaryExtractor');

        // Get all elements in the commentary container
        const allElements = await this.page.$$(`${CONFIG.SELECTORS.COMMENTARY_CONTAINER} > *`);
        logger.info('Elements found in commentary container', {
            elementCount: allElements.length,
            selector: CONFIG.SELECTORS.COMMENTARY_CONTAINER
        }, 'CommentaryExtractor');

        if (allElements.length === 0) {
            logger.warn('No elements found in commentary container', { url: this.url }, 'CommentaryExtractor');
            endOperation();
            return { balls: [], overSummaries: [] };
        }

        const balls: BallData[] = [];
        const overSummaries: OverSummary[] = [];
        let ballCount = 0;
        let summaryCount = 0;
        let unknownCount = 0;

        // Process all elements
        for (let i = 0; i < allElements.length; i++) {
            console.log(`Processing element ${i}/${allElements.length}`);
            const element = allElements[i];

            // Get element details
            const tagName = await element.evaluate(el => el.tagName);
            const className = await element.evaluate(el => el.className);
            const text = await element.evaluate(el => el.textContent?.trim() || '');

            logger.debug(`Processing element ${i}/${allElements.length}`, { tagName, className: className.substring(0, 50) }, 'CommentaryExtractor');

            // Check if this is a ball element (has the specific class)
            if (className.includes(CONFIG.SELECTORS.BALL_ELEMENTS.replace('div.', ''))) {
                logger.debug(`Processing ball element`, { elementIndex: i }, 'CommentaryExtractor');
                ballCount++;
                // This is a ball element - parse ball data
                // Format: "19.6 Jinal Patel to TANVIR SHAIKH, 2 runs, to Cow corner"
                logger.debug(`Ball text: "${text.substring(0, 100)}..."`, { fullTextLength: text.length }, 'CommentaryExtractor');

                // Extract over and ball number (e.g., "19.6" but might be "19.62" due to concatenation)
                const ballMatch = text.match(/^(\d+)\.(\d)/);
                if (ballMatch) {
                    const over = parseInt(ballMatch[1]);
                    // Handle concatenated format - if ball number is > 6, it's probably concatenated
                    let ballStr = ballMatch[2];
                    let ball = parseInt(ballStr.charAt(0)); // Take first digit as ball number

                    // Extract bowler (text after ball number until "to")
                    const bowlerMatch = text.match(/^\d+\.\d+(.+?)to\s+/);
                    const bowler = bowlerMatch ? bowlerMatch[1].trim() : '';

                    // Extract batter (text between "to" and first comma)
                    const batterMatch = text.match(/to\s+([^,]+),/);
                    const batter = batterMatch ? batterMatch[1].trim() : '';

                    // Extract description (everything after first comma)
                    const descriptionMatch = text.match(/,\s*(.+)$/);
                    const description = descriptionMatch ? descriptionMatch[1].trim() : '';

                    // Extract runs from description (look for number before "run" or "runs", or handle special cases)
                    let runs = 0;
                    if (description.includes('FOUR')) {
                        runs = 4;
                    } else if (description.includes('SIX') || description.includes('six')) {
                        runs = 6;
                    } else {
                        const runsMatch = description.match(/(\d+)\s+run/);
                        runs = runsMatch ? parseInt(runsMatch[1]) : 0;
                    }

                    logger.debug(`Parsed ball data`, {
                        over, ball, bowler: bowler.substring(0, 20), batter: batter.substring(0, 20), runs
                    }, 'CommentaryExtractor');

                    // Parse wicket information if this is a wicket ball
                    const wicketInfo = this.parseWicketInfo(description, bowler);

                    // Look up player IDs
                    const bowlerId = this.getPlayerId(bowler);
                    const batterId = this.getPlayerId(batter);

                    const ballData: BallData = {
                        over: over,
                        ball: ball,
                        bowler: bowler,
                        batter: batter,
                        runs: runs,
                        description: description,
                        teamId: '',
                        bowlerId: bowlerId,
                        batterId: batterId,
                        wicketInfo: wicketInfo
                    };
                    balls.push(ballData);
                }
            } else if (className.includes(CONFIG.SELECTORS.OVER_SUMMARY_ELEMENTS.replace('div.', ''))) {
                logger.debug(`Found over summary element`, { elementIndex: i }, 'CommentaryExtractor');
                summaryCount++;
                // This is an over summary element - parse over summary
                const overSummary = this.parseOverSummary(text);
                if (overSummary) {
                    overSummaries.push(overSummary);
                    logger.debug(`Parsed over summary`, { over: overSummary.over, runs: overSummary.runs, wickets: overSummary.wickets }, 'CommentaryExtractor');
                } else {
                    logger.warn(`Failed to parse over summary`, { text: text.substring(0, 100) }, 'CommentaryExtractor');
                }
            } else {
                logger.debug(`Unknown element type`, { tagName, className: className.substring(0, 50), elementIndex: i }, 'CommentaryExtractor');
                unknownCount++;
            }
        }

        logger.info('Commentary balls extraction completed', {
            totalElements: allElements.length,
            ballsFound: ballCount,
            summariesFound: summaryCount,
            unknownElements: unknownCount,
            ballsExtracted: balls.length,
            overSummariesExtracted: overSummaries.length
        }, 'CommentaryExtractor');

        endOperation();
        return { balls, overSummaries };
    }

    private async groupBallsIntoInnings(balls: BallData[], overSummaries: OverSummary[], teamName: string): Promise<InningData[]> {
        const innings: InningData[] = [];
        const ballsByInning = new Map<number, BallData[]>();

        // Group balls by inning (we'll determine this from the team selection)
        balls.forEach(ball => {
            const inning = 1; // For now, assume all balls are from 1st inning
            if (!ballsByInning.has(inning)) {
                ballsByInning.set(inning, []);
            }
            ballsByInning.get(inning)!.push(ball);
        });

        // Create innings data using the over summaries from the website
        innings.push({
            teamId: '',
            teamName: teamName,
            overs: overSummaries,
            balls: balls,
            totalRuns: overSummaries.reduce((sum, over) => sum + over.runs, 0),
            totalWickets: overSummaries.reduce((sum, over) => sum + over.wickets, 0),
            totalOvers: overSummaries.length
        });

        return innings;
    }

    private parseOverSummary(text: string): OverSummary | null {
        try {
            // Validate input
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                logger.warn('Invalid text provided to parseOverSummary', { textLength: text?.length || 0 }, 'CommentaryExtractor');
                return null;
            }

            // Use regex to extract information more reliably
            const overMatch = text.match(/End of over (\d+)/);
            if (!overMatch) {
                logger.debug('Could not find over number in text', { text: text.substring(0, 50) }, 'CommentaryExtractor');
                return null;
            }

            let over = parseInt(overMatch[1]);
            if (isNaN(over)) {
                throw new DataParsingError('Invalid over number format', overMatch[1]);
            }

            // If over number seems too high (like 206 instead of 20), try to extract just the first digit(s)
            if (over > CONFIG.DATA.MAX_OVERS) { // Cricket matches rarely go over 50 overs
                const overStr = overMatch[1];
                // Take only the first 1-2 digits
                const realOver = parseInt(overStr.substring(0, overStr.length > 2 ? 2 : 1));
                if (!isNaN(realOver) && realOver <= CONFIG.DATA.MAX_OVERS) {
                    over = realOver;
                    logger.debug('Corrected over number from parsing error', { original: overMatch[1], corrected: over }, 'CommentaryExtractor');
                } else {
                    throw new DataParsingError('Unable to parse valid over number', overStr);
                }
            }

            // Extract runs - look for "Runs" followed by a number
            const runsMatch = text.match(/Runs (\d+)/);
            const runs = runsMatch ? parseInt(runsMatch[1]) : 0;
            if (runsMatch && isNaN(runs)) {
                throw new DataParsingError('Invalid runs format', runsMatch[1]);
            }

            // Extract wickets - look for "Wkts" followed by a number (before any slash or other text)
            const wktsMatch = text.match(/Wkts(\d+)/);
            let wickets = wktsMatch ? parseInt(wktsMatch[1]) : 0;
            if (wktsMatch && isNaN(wickets)) {
                throw new DataParsingError('Invalid wickets format', wktsMatch[1]);
            }

            // If wickets seems too high (like 118), it might be "1" followed by score "118/5"
            if (wickets > 10) { // Cricket matches rarely have more than 10 wickets
                const wktsStr = wktsMatch ? wktsMatch[1] : '';
                wickets = parseInt(wktsStr.charAt(0)); // Take just the first digit
                if (isNaN(wickets)) {
                    wickets = 0; // Default to 0 if parsing fails
                }
                logger.debug('Corrected wickets count from parsing error', { original: wktsMatch ? wktsMatch[1] : 'null', corrected: wickets }, 'CommentaryExtractor');
            }

            // Extract bowler figures (like "4-0-4-0")
            const bowlerFigures = text.match(/(\d+-\d+-\d+-\d+)/g) || [];

            const overSummary = {
                over: over,
                bowler: bowlerFigures.length > 0 ? bowlerFigures[0]! : '', // Use first bowler figure as main bowler
                runs: runs,
                wickets: wickets,
                balls: CONFIG.DATA.MAX_BALLS_PER_OVER, // Standard over
                maidens: runs === 0 ? 1 : 0,
                economy: runs / 1, // 1 over
                summary: text,
                teamId: ''
            };

            logger.debug('Successfully parsed over summary', {
                over: overSummary.over,
                runs: overSummary.runs,
                wickets: overSummary.wickets,
                bowler: overSummary.bowler
            }, 'CommentaryExtractor');

            return overSummary;
        } catch (error) {
            if (error instanceof DataParsingError) {
                logger.warn('Over summary parsing failed', { error: error.message, text: text.substring(0, 100) }, 'CommentaryExtractor');
                // Return null for parsing errors to allow graceful degradation
                return null;
            }
            logger.error('Unexpected error parsing over summary', error as Error, { text: text.substring(0, 100) }, 'CommentaryExtractor');
            return null;
        }
        return null;
    }

    private groupBallsIntoOvers(balls: BallData[]): OverSummary[] {
        const overs = new Map<number, BallData[]>();

        balls.forEach(ball => {
            if (!overs.has(ball.over)) {
                overs.set(ball.over, []);
            }
            overs.get(ball.over)!.push(ball);
        });

        return Array.from(overs.entries()).map(([overNumber, overBalls]) => ({
            over: overNumber,
            bowler: overBalls[0]?.bowler || '',
            runs: overBalls.reduce((sum, ball) => sum + ball.runs, 0),
            wickets: overBalls.filter(ball => ball.description.toLowerCase().includes('out') || ball.description.toLowerCase().includes('wicket')).length,
            balls: overBalls.length,
            maidens: overBalls.length === CONFIG.DATA.MAX_BALLS_PER_OVER && overBalls.reduce((sum, ball) => sum + ball.runs, 0) === 0 ? 1 : 0,
            economy: overBalls.length > 0 ? (overBalls.reduce((sum, ball) => sum + ball.runs, 0) / (overBalls.length / 6)) : 0,
            summary: `${overBalls[0]?.bowler || ''} bowled ${overBalls.length} balls, ${overBalls.reduce((sum, ball) => sum + ball.runs, 0)} runs, ${overBalls.filter(ball => ball.description.toLowerCase().includes('out') || ball.description.toLowerCase().includes('wicket')).length} wickets`,
            teamId: ''
        }));
    }

    private parseWicketInfo(description: string, bowler: string): WicketInfo | undefined {
        try {
            // Validate inputs
            if (!description || typeof description !== 'string') {
                console.warn('Invalid description provided to parseWicketInfo');
                return undefined;
            }

            if (!bowler || typeof bowler !== 'string') {
                console.warn('Invalid bowler provided to parseWicketInfo');
                return undefined;
            }

            if (!description.startsWith('OUT')) {
                return undefined;
            }

            // Extract batting stats from parentheses at the end
            const statsMatch = description.match(/\((\d+)r (\d+)b (\d+)x4s (\d+)x6s SR: ([\d.]+)\)/);
            let battingStats = {
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                strikeRate: 0
            };

            if (statsMatch) {
                const runs = parseInt(statsMatch[1]);
                const balls = parseInt(statsMatch[2]);
                const fours = parseInt(statsMatch[3]);
                const sixes = parseInt(statsMatch[4]);
                const strikeRate = parseFloat(statsMatch[5]);

                // Validate parsed stats
                if (isNaN(runs) || isNaN(balls) || isNaN(fours) || isNaN(sixes) || isNaN(strikeRate)) {
                    throw new DataParsingError('Invalid batting stats format', statsMatch[0]);
                }

                battingStats = {
                    runs,
                    balls,
                    fours,
                    sixes,
                    strikeRate
                };
            }

            // Remove the stats part and "OUT" prefix for easier parsing
            let wicketText = description.replace(/^OUT\s*/, '').replace(/\s*\([^)]+\)$/, '');

            // Parse different wicket types
            if (wicketText.includes('Caught out') || wicketText.includes('Caught')) {
                // Format: "Caught out, Caught at Long-on by Trisha PatelAmrita Joseph c Trisha Patel b Arohi Bist"
                // The tricky part is that fielder and player names are concatenated: "by Trisha PatelAmrita Joseph"
                // But the fielder appears twice, so we can use that pattern

                const cAndBMatch = wicketText.match(/(.+?) c (.+?) b (.+)/);
                if (cAndBMatch) {
                    const fielder = cAndBMatch[2].trim();
                    const bowlerName = cAndBMatch[3].trim();

                    if (!fielder || !bowlerName) {
                        throw new DataParsingError('Invalid caught wicket format', wicketText);
                    }

                    // Extract player name from the part before "c fielder b bowler"
                    let playerPart = cAndBMatch[1].trim();

                    // Remove "Caught out, Caught at..." prefix
                    if (playerPart.startsWith('Caught out,')) {
                        playerPart = playerPart.replace(/^Caught out,\s*/, '');
                    }
                    if (playerPart.startsWith('Caught at')) {
                        playerPart = playerPart.replace(/^Caught at .+? by /, '');
                    }

                    // The player name should be after the fielder name in the concatenated string
                    // Pattern: "by FielderNamePlayerName" -> extract PlayerName
                    let playerName: string;
                    if (playerPart.startsWith(fielder)) {
                        playerName = playerPart.substring(fielder.length).trim();
                    } else {
                        // Fallback: use the whole playerPart as player name
                        playerName = playerPart;
                    }

                    if (!playerName) {
                        throw new DataParsingError('Could not extract player name from wicket text', wicketText);
                    }

                    return {
                        wicketType: 'caught',
                        playerName,
                        bowler: bowlerName,
                        fielder,
                        battingStats
                    };
                }
            } else if (wicketText.includes('Stumped')) {
                // Format: "StumpedJaya Mohite st †Maitri Rathod b Aarya yogeshbhai Mehta"
                const stumpedMatch = wicketText.match(/Stumped(.+?) st †(.+?) b (.+)/);
                if (stumpedMatch) {
                    const playerName = stumpedMatch[1].trim();
                    const fielder = stumpedMatch[2].trim();
                    const bowlerName = stumpedMatch[3].trim();

                    if (!playerName || !fielder || !bowlerName) {
                        throw new DataParsingError('Invalid stumped wicket format', wicketText);
                    }

                    return {
                        wicketType: 'stumped',
                        playerName,
                        bowler: bowlerName,
                        fielder,
                        battingStats
                    };
                }
            } else if (wicketText.includes('LBW')) {
                // Format: "LBWHrutvisha Patel lbw b Aarya yogeshbhai Mehta"
                const lbwMatch = wicketText.match(/LBW(.+?) lbw b (.+)/);
                if (lbwMatch) {
                    const playerName = lbwMatch[1].trim();
                    const bowlerName = lbwMatch[2].trim();

                    if (!playerName || !bowlerName) {
                        throw new DataParsingError('Invalid LBW wicket format', wicketText);
                    }

                    return {
                        wicketType: 'lbw',
                        playerName,
                        bowler: bowlerName,
                        battingStats
                    };
                }
            } else if (wicketText.includes('Bowled')) {
                // Format: "BowledDharti Rathod b Janvi nikeshkumar Raval"
                const bowledMatch = wicketText.match(/Bowled(.+?) b (.+)/);
                if (bowledMatch) {
                    const playerName = bowledMatch[1].trim();
                    const bowlerName = bowledMatch[2].trim();

                    if (!playerName || !bowlerName) {
                        throw new DataParsingError('Invalid bowled wicket format', wicketText);
                    }

                    return {
                        wicketType: 'bowled',
                        playerName,
                        bowler: bowlerName,
                        battingStats
                    };
                }
            }

            // Fallback: try to extract basic information
            const basicMatch = wicketText.match(/(.+?) b (.+)/);
            if (basicMatch) {
                const playerName = basicMatch[1].trim();
                const bowlerName = basicMatch[2].trim();

                if (!playerName || !bowlerName) {
                    throw new DataParsingError('Invalid basic wicket format', wicketText);
                }

                return {
                    wicketType: 'other',
                    playerName,
                    bowler: bowlerName,
                    battingStats
                };
            }

            // If we can't parse it, return basic info
            const playerName = wicketText.split(' ')[0] || 'Unknown';
            return {
                wicketType: 'other',
                playerName,
                bowler,
                battingStats
            };

        } catch (error) {
            if (error instanceof DataParsingError) {
                console.error('Wicket parsing error:', error.message);
                // Return undefined for parsing errors to allow graceful degradation
                return undefined;
            }
            console.error('Unexpected error parsing wicket info:', error);
            return undefined;
        }
    }

    /**
     * Public interface method for running commentary extraction
     *
     * Simple wrapper around extractCommentary for external usage.
     * Provides a clean API for extracting cricket commentary data.
     *
     * @param teams - Array of team information for the match
     * @returns Promise resolving to extracted balls and innings data
     *
     * @example
     * ```typescript
     * const extractor = new CommentaryExtractor(browser, page, matchUrl);
     * const { balls, innings } = await extractor.run(teams);
     * ```
     */
    async run(teams: Team[]): Promise<{ balls: BallData[], innings: InningData[] }> {
        return await this.extractCommentary(teams);
    }
}
