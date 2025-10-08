import { CricketPlatform, PlatformConfig, MatchScraper, TournamentScraper, DataProcessor, DataStorage, ApiClient, MatchInfo } from './interfaces';
import { ScrapedData } from '../types';
import { CricketBarodaTournamentScraper } from './cricket-baroda-tournament-scraper';
import WebScraper from '../scraper';
import { CommentaryExtractor } from '../commentary';
import { logger, logOperation } from '../logger';
import { ScraperError } from '../errors';
import puppeteer, { Browser, Page } from 'puppeteer';

/**
 * CricketBaroda platform implementation
 *
 * This class provides a complete implementation of the CricketPlatform interface
 * for scraping cricket data from the Cricket Baroda website.
 */
export class CricketBarodaPlatform implements CricketPlatform {
    readonly config: PlatformConfig;
    readonly matchScraper: MatchScraper;
    readonly tournamentScraper: TournamentScraper;
    readonly dataProcessor: DataProcessor;
    readonly dataStorage: DataStorage;
    readonly apiClient: ApiClient;

    private browser: Browser | null = null;
    private page: Page | null = null;

    constructor(config: PlatformConfig) {
        this.config = {
            ...config,
            name: config.name || 'cricketbaroda',
            baseUrl: config.baseUrl || 'https://www.cricketbaroda.com'
        };

        this.matchScraper = new CricketBarodaMatchScraper();
        this.tournamentScraper = new CricketBarodaTournamentScraper();
        this.dataProcessor = new CricketBarodaDataProcessor();
        this.dataStorage = new CricketBarodaDataStorage();
        this.apiClient = new CricketBarodaApiClient();
    }

    /**
     * Initialize the platform
     */
    async initialize(): Promise<void> {
        const endOperation = logOperation('platform_initialize', {
            platform: this.config.name
        }, 'CricketBarodaPlatform');

        try {
            logger.info('Initializing CricketBaroda platform', {
                platform: this.config.name,
                baseUrl: this.config.baseUrl
            }, 'CricketBarodaPlatform');

            // Initialize browser for shared use
            this.browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            this.page = await this.browser.newPage();

            // Set reasonable timeouts
            this.page.setDefaultTimeout(30000);
            this.page.setDefaultNavigationTimeout(30000);

            // Initialize components that need browser access
            if (this.matchScraper instanceof CricketBarodaMatchScraper) {
                await this.matchScraper.initialize(this.browser, this.page);
            }

            // Initialize tournament scraper
            await this.tournamentScraper.initialize();

            logger.info('CricketBaroda platform initialized successfully', {
                platform: this.config.name
            }, 'CricketBarodaPlatform');

            endOperation();
        } catch (error) {
            logger.error('CricketBaroda platform initialization failed', error as Error, {
                platform: this.config.name
            }, 'CricketBarodaPlatform');
            throw new ScraperError(
                `Platform initialization failed: ${error instanceof Error ? error.message : String(error)}`,
                'PLATFORM_INITIALIZATION_FAILED',
                { platform: this.config.name, originalError: error }
            );
        }
    }

    /**
     * Clean up platform resources
     */
    async cleanup(): Promise<void> {
        try {
            logger.debug('Cleaning up CricketBaroda platform resources', {
                platform: this.config.name
            }, 'CricketBarodaPlatform');

            // Cleanup tournament scraper
            await this.tournamentScraper.cleanup();

            // Close shared browser
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.page = null;
            }

            logger.debug('CricketBaroda platform cleanup completed', {
                platform: this.config.name
            }, 'CricketBarodaPlatform');
        } catch (error) {
            logger.warn('CricketBaroda platform cleanup failed', {
                error: error instanceof Error ? error.message : String(error),
                platform: this.config.name
            }, 'CricketBarodaPlatform');
        }
    }

    /**
     * Check if the platform is ready for use
     */
    async isReady(): Promise<boolean> {
        try {
            return !!(this.browser && this.page && !this.browser.isConnected());
        } catch (error) {
            logger.warn('Platform readiness check failed', {
                error: error instanceof Error ? error.message : String(error),
                platform: this.config.name
            }, 'CricketBarodaPlatform');
            return false;
        }
    }
}

/**
 * CricketBaroda match scraper implementation
 */
class CricketBarodaMatchScraper implements MatchScraper {
    private browser: Browser | null = null;
    private page: Page | null = null;

    /**
     * Initialize with shared browser instance
     */
    async initialize(browser: Browser, page: Page): Promise<void> {
        this.browser = browser;
        this.page = page;
    }

    /**
     * Scrape detailed data from a specific match URL
     */
    async scrapeMatch(matchUrl: string): Promise<ScrapedData> {
        if (!this.browser || !this.page) {
            throw new ScraperError('Match scraper not initialized', 'SCRAPER_NOT_INITIALIZED');
        }

        const scraper = new WebScraper(matchUrl);
        // Inject our browser and page instances
        (scraper as any).browser = this.browser;
        (scraper as any).page = this.page;

        try {
            // Override the initBrowser method to skip browser initialization
            const originalInitBrowser = scraper.initBrowser.bind(scraper);
            scraper.initBrowser = async () => {
                (scraper as any).browser = this.browser;
                (scraper as any).page = this.page;
                logger.debug('Using shared browser instance for match scraping', { url: matchUrl }, 'CricketBarodaMatchScraper');
            };

            // Scrape the match data
            await scraper.initBrowser();
            await scraper.fetchData();

            // Extract commentary data
            const commentaryExtractor = new CommentaryExtractor(this.browser, this.page, matchUrl);
            const commentaryData = await commentaryExtractor.run([]);

            // Build the scraped data structure
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

            return data;
        } catch (error) {
            throw new ScraperError(
                `Match scraping failed: ${error instanceof Error ? error.message : String(error)}`,
                'MATCH_SCRAPING_FAILED',
                { url: matchUrl, originalError: error }
            );
        }
    }

    /**
     * Extract basic match information from a match URL
     */
    async getMatchInfo(matchUrl: string): Promise<MatchInfo> {
        // For now, return basic info - this could be enhanced to scrape match details
        const matchId = matchUrl.split('/').pop() || 'unknown';

        return {
            id: matchId,
            url: matchUrl,
            title: `Match ${matchId}`,
            team1: 'Team 1',
            team2: 'Team 2',
            status: 'scheduled'
        };
    }
}

/**
 * CricketBaroda data processor implementation
 */
class CricketBarodaDataProcessor implements DataProcessor {
    /**
     * Process scraped match data before storage
     */
    async processMatchData(data: ScrapedData, matchInfo: MatchInfo): Promise<ScrapedData> {
        // Add match information to the data
        const processedData = {
            ...data,
            matchTitle: matchInfo.title,
            team1: matchInfo.team1,
            team2: matchInfo.team2,
            status: matchInfo.status,
            venue: matchInfo.venue || '',
            date: matchInfo.date || ''
        };

        logger.debug('Processed match data', {
            matchId: matchInfo.id,
            ballsCount: processedData.commentary?.length || 0,
            inningsCount: processedData.innings?.length || 0
        }, 'CricketBarodaDataProcessor');

        return processedData;
    }

    /**
     * Validate scraped data integrity
     */
    async validateData(data: ScrapedData): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
    }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic validation
        if (!data.commentary || data.commentary.length === 0) {
            errors.push('No commentary data found');
        }

        if (!data.innings || data.innings.length === 0) {
            errors.push('No innings data found');
        }

        // Check for data consistency
        const totalBalls = data.commentary?.length || 0;
        const totalInningsBalls = data.innings?.reduce((sum: number, inning) =>
            sum + (inning.balls?.length || 0), 0) || 0;

        if (totalBalls !== totalInningsBalls) {
            warnings.push(`Ball count mismatch: ${totalBalls} in commentary vs ${totalInningsBalls} in innings`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Transform data for external API consumption
     */
    async transformForApi(data: ScrapedData, format: string): Promise<any> {
        // For now, return the data as-is
        // This could be enhanced to transform data for specific API formats
        return data;
    }
}

/**
 * CricketBaroda data storage implementation
 */
class CricketBarodaDataStorage implements DataStorage {
    /**
     * Store match data
     */
    async storeMatchData(data: ScrapedData, matchInfo: MatchInfo): Promise<void> {
        const fs = require('fs');
        const path = require('path');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `match-${matchInfo.id}-${timestamp}.json`;
        const filepath = path.join('./output', filename);

        // Ensure output directory exists
        if (!fs.existsSync('./output')) {
            fs.mkdirSync('./output', { recursive: true });
        }

        const jsonData = JSON.stringify(data, null, 2);
        fs.writeFileSync(filepath, jsonData);

        logger.info('Match data stored locally', {
            matchId: matchInfo.id,
            filepath,
            dataSize: jsonData.length
        }, 'CricketBarodaDataStorage');
    }

    /**
     * Store player data
     */
    async storePlayerData(players: import('../types').Player[], matchInfo: MatchInfo): Promise<void> {
        // For now, just log - could be enhanced to store in database
        logger.debug('Player data storage requested', {
            matchId: matchInfo.id,
            playerCount: players.length
        }, 'CricketBarodaDataStorage');
    }

    /**
     * Store team data
     */
    async storeTeamData(teams: import('../types').Team[], matchInfo: MatchInfo): Promise<void> {
        // For now, just log - could be enhanced to store in database
        logger.debug('Team data storage requested', {
            matchId: matchInfo.id,
            teamCount: teams.length
        }, 'CricketBarodaDataStorage');
    }

    /**
     * Check if match data already exists
     */
    async matchExists(matchId: string): Promise<boolean> {
        // For now, always return false - could be enhanced to check filesystem/database
        return false;
    }
}

/**
 * CricketBaroda API client implementation
 */
class CricketBarodaApiClient implements ApiClient {
    private apiBaseUrl: string = process.env.API_BASE_URL || 'http://localhost:3000/api';

    /**
     * Send match data to external API
     */
    async sendMatchData(data: ScrapedData, matchInfo: MatchInfo): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }> {
        try {
            // This is a placeholder - implement actual API call
            logger.info('API call placeholder: sending match data', {
                matchId: matchInfo.id,
                apiUrl: this.apiBaseUrl,
                dataSize: JSON.stringify(data).length
            }, 'CricketBarodaApiClient');

            // Simulate API call
            return {
                success: true,
                message: 'Match data sent successfully (placeholder)',
                data: { matchId: matchInfo.id }
            };
        } catch (error) {
            logger.error('Failed to send match data to API', error as Error, {
                matchId: matchInfo.id
            }, 'CricketBarodaApiClient');

            return {
                success: false,
                message: `API call failed: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    /**
     * Send player data to external API
     */
    async sendPlayerData(players: import('../types').Player[], matchInfo: MatchInfo): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }> {
        try {
            logger.info('API call placeholder: sending player data', {
                matchId: matchInfo.id,
                playerCount: players.length
            }, 'CricketBarodaApiClient');

            return {
                success: true,
                message: 'Player data sent successfully (placeholder)',
                data: { matchId: matchInfo.id, playerCount: players.length }
            };
        } catch (error) {
            return {
                success: false,
                message: `API call failed: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    /**
     * Send team data to external API
     */
    async sendTeamData(teams: import('../types').Team[], matchInfo: MatchInfo): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }> {
        try {
            logger.info('API call placeholder: sending team data', {
                matchId: matchInfo.id,
                teamCount: teams.length
            }, 'CricketBarodaApiClient');

            return {
                success: true,
                message: 'Team data sent successfully (placeholder)',
                data: { matchId: matchInfo.id, teamCount: teams.length }
            };
        } catch (error) {
            return {
                success: false,
                message: `API call failed: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
}
