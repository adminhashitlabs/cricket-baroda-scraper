import puppeteer, { Browser, Page } from 'puppeteer';
import { ScrapedData, BallData } from './types';
import { CommentaryExtractor } from './commentary';
import { BrowserError, ScraperError, withErrorHandling, withRetry } from './errors';
import { CONFIG } from './config';
import { Logger, LogLevel, logger, logOperation } from './logger';

/**
 * Main web scraper class for extracting cricket match data
 *
 * This class orchestrates the entire scraping process including:
 * - Browser lifecycle management
 * - Page navigation and data extraction
 * - Error handling and retry logic
 * - Data storage and output
 *
 * @example
 * ```typescript
 * const scraper = new WebScraper('https://example-cricket-site.com/match/123');
 * await scraper.initBrowser();
 * const data = await scraper.scrape();
 * await scraper.storeData(data, 'output.json');
 * await scraper.closeBrowser();
 * ```
 */
class WebScraper {
    private url: string;
    private browser: Browser | null = null;
    private page: Page | null = null;

    /**
     * Creates a new WebScraper instance
     * @param url - The target URL to scrape cricket match data from
     */
    constructor(url: string) {
        this.url = url;
    }

    /**
     * Initializes the browser instance with Puppeteer
     *
     * Sets up a new browser and page with configured timeouts and options.
     * This method must be called before any scraping operations.
     *
     * @throws {BrowserError} When browser initialization fails
     * @returns Promise that resolves when browser is ready
     *
     * @example
     * ```typescript
     * await scraper.initBrowser();
     * ```
     */
    async initBrowser(): Promise<void> {
        const endOperation = logOperation('browser_initialization', { url: this.url }, 'WebScraper');

        try {
            logger.debug('Initializing browser...', { headless: CONFIG.BROWSER.HEADLESS }, 'WebScraper');
            this.browser = await puppeteer.launch({
                headless: CONFIG.BROWSER.HEADLESS,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            this.page = await this.browser.newPage();

            // Set reasonable timeouts
            this.page.setDefaultTimeout(CONFIG.BROWSER.DEFAULT_TIMEOUT);
            this.page.setDefaultNavigationTimeout(CONFIG.BROWSER.DEFAULT_TIMEOUT);

            logger.info('Browser initialized successfully', { url: this.url }, 'WebScraper');
            endOperation();
        } catch (error) {
            logger.error('Browser initialization failed', error as Error, { url: this.url }, 'WebScraper');
            throw new BrowserError(
                `Failed to initialize browser: ${error instanceof Error ? error.message : String(error)}`,
                { url: this.url, headless: CONFIG.BROWSER.HEADLESS }
            );
        }
    }

    /**
     * Closes the browser instance and cleans up resources
     *
     * Should be called when scraping is complete to free up system resources.
     * Safe to call multiple times or if browser was never initialized.
     *
     * @returns Promise that resolves when browser is closed
     *
     * @example
     * ```typescript
     * await scraper.closeBrowser();
     * ```
     */
    async closeBrowser(): Promise<void> {
        if (this.browser) {
            try {
                logger.debug('Closing browser...', {}, 'WebScraper');
                await this.browser.close();
                this.browser = null;
                this.page = null;
                logger.debug('Browser closed successfully', {}, 'WebScraper');
            } catch (error) {
                logger.warn('Warning: Error closing browser', { error: error instanceof Error ? error.message : String(error) }, 'WebScraper');
                // Don't throw here as this is cleanup code
            }
        }
    }

    /**
     * Fetches data from the target URL by navigating the browser page
     *
     * Loads the cricket match page and waits for network activity to settle.
     * Includes retry logic for handling temporary network issues.
     *
     * @throws {BrowserError} When browser is not initialized
     * @throws {ScraperError} When page loading fails after retries
     * @returns Promise that resolves when page is loaded
     *
     * @example
     * ```typescript
     * await scraper.fetchData();
     * ```
     */
    async fetchData(): Promise<void> {
        if (!this.page) {
            throw new BrowserError('Browser not initialized', { url: this.url });
        }

        await withRetry(
            async () => {
                logger.debug(`Navigating to ${this.url}...`, { url: this.url }, 'WebScraper');
                await this.page!.goto(this.url, {
                    waitUntil: 'networkidle2',
                    timeout: CONFIG.BROWSER.DEFAULT_TIMEOUT
                });
                logger.info('Page loaded successfully', { url: this.url }, 'WebScraper');
            },
            CONFIG.RETRY.MAX_ATTEMPTS,
            CONFIG.RETRY.DELAY,
            `Failed to load page ${this.url}`
        );
    }

    /**
     * Parses the loaded page data into structured cricket match information
     *
     * Currently returns a placeholder structure. In production, this would
     * extract actual data from the DOM using selectors and parsing logic.
     *
     * @returns Structured cricket match data
     *
     * @example
     * ```typescript
     * const data = scraper.parseData();
     * console.log(data.matchTitle);
     * ```
     */
    parseData(): ScrapedData {
        // This will be replaced with dynamic parsing
        return {
            title: '',
            matchTitle: '',
            team1: '',
            team2: '',
            score1: '',
            score2: '',
            status: '',
            venue: '',
            date: '',
            players: [],
            innings: [],
            teams: [],
            playersData: [],
            commentary: []
        };
    }

    /**
     * Main scraping orchestration method
     *
     * Coordinates the entire scraping process: browser initialization,
     * data fetching, parsing, and cleanup. This is the primary method
     * that external code should call to perform scraping.
     *
     * @throws {BrowserError} When browser operations fail
     * @throws {ScraperError} When scraping process encounters errors
     * @returns Promise that resolves when scraping is complete
     *
     * @example
     * ```typescript
     * await scraper.scrape();
     * ```
     */
    async scrape(): Promise<void> {
        const endOperation = logOperation('scraping_process', { url: this.url }, 'WebScraper');

        try {
            logger.info('Starting scraping process', { url: this.url }, 'WebScraper');

            await withErrorHandling(
                () => this.initBrowser(),
                'Failed to initialize browser'
            );

            await withErrorHandling(
                () => this.fetchData(),
                'Failed to fetch data from page'
            );

            // Extract commentary data for both innings
            const commentaryData = await withErrorHandling(
                async () => {
                    logger.debug('Extracting commentary data...', { url: this.url }, 'WebScraper');
                    const commentaryExtractor = new CommentaryExtractor(this.browser!, this.page!, this.url);
                    const result = await commentaryExtractor.run([]);
                    logger.info('Commentary extraction completed', {
                        ballCount: result.balls.length,
                        inningsCount: result.innings.length,
                        url: this.url
                    }, 'WebScraper');
                    return result;
                },
                'Failed to extract commentary data',
                { url: this.url }
            );

            const data: ScrapedData = {
                title: '',
                matchTitle: '',
                team1: '',
                team2: '',
                score1: '',
                score2: '',
                status: '',
                venue: '',
                date: '',
                players: [],
                innings: commentaryData.innings,
                teams: [],
                playersData: [],
                commentary: commentaryData.balls
            };

            await withErrorHandling(
                () => this.storeData(data),
                'Failed to store scraped data'
            );

            logger.info('Scraping process completed successfully', {
                url: this.url,
                totalBalls: commentaryData.balls.length,
                totalInnings: commentaryData.innings.length
            }, 'WebScraper');

            endOperation();

        } catch (error) {
            logger.error('Scraping failed', error as Error, { url: this.url }, 'WebScraper');

            // Re-throw ScraperError instances as-is
            if (error instanceof ScraperError) {
                throw error;
            }

            // Wrap unknown errors
            throw new ScraperError(
                `Scraping operation failed: ${error instanceof Error ? error.message : String(error)}`,
                'SCRAPING_FAILED',
                { url: this.url, originalError: error }
            );
        } finally {
            await this.closeBrowser();
        }
    }

    /**
     * Stores the scraped data to a JSON file
     *
     * Saves the extracted cricket match data to the specified file path.
     * Includes validation and error handling for data integrity.
     *
     * @param data - The scraped cricket match data to store
     * @throws {ScraperError} When data storage fails
     * @returns Promise that resolves when data is saved
     *
     * @example
     * ```typescript
     * await scraper.storeData(scrapedData, 'match-data.json');
     * ```
     */
    async storeData(data: ScrapedData): Promise<void> {
        await withErrorHandling(
            async () => {
                logger.debug('Storing scraped data...', { dataSize: data ? JSON.stringify(data).length : 0 }, 'WebScraper');
                const fs = require('fs');

                // Ensure data is valid before saving
                if (!data || typeof data !== 'object') {
                    throw new ScraperError('Invalid data provided for storage', 'INVALID_DATA');
                }

                const jsonData = JSON.stringify(data, null, 2);
                fs.writeFileSync('output.json', jsonData);

                logger.info('Data saved successfully', {
                    filePath: 'output.json',
                    dataSize: jsonData.length,
                    ballCount: data.commentary?.length || 0,
                    inningsCount: data.innings?.length || 0
                }, 'WebScraper');
            },
            'Failed to store scraped data to file',
            { dataSize: data ? JSON.stringify(data).length : 0 }
        );
    }
}

export default WebScraper;