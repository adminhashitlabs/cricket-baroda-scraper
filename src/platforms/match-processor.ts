import { MatchScraper, MatchInfo, DataProcessor, DataStorage, ApiClient, PipelineProgress } from './interfaces';
import { ScrapedData } from '../types';
import { logger, logOperation } from '../logger';
import { ScraperError } from '../errors';

/**
 * Processor for handling multiple cricket matches
 *
 * This class orchestrates the processing of multiple matches, including
 * scraping, data processing, validation, and storage/API integration.
 */
export class MatchProcessor {
    private matchScraper: MatchScraper;
    private dataProcessor: DataProcessor;
    private dataStorage: DataStorage;
    private apiClient: ApiClient;
    private progress: PipelineProgress;

    constructor(
        matchScraper: MatchScraper,
        dataProcessor: DataProcessor,
        dataStorage: DataStorage,
        apiClient: ApiClient
    ) {
        this.matchScraper = matchScraper;
        this.dataProcessor = dataProcessor;
        this.dataStorage = dataStorage;
        this.apiClient = apiClient;
        this.progress = this.initializeProgress();
    }

    /**
     * Initialize progress tracking
     */
    private initializeProgress(): PipelineProgress {
        return {
            total: 0,
            completed: 0,
            failed: 0,
            startTime: new Date(),
            stats: {
                matchesProcessed: 0,
                ballsExtracted: 0,
                playersFound: 0,
                errors: []
            }
        };
    }

    /**
     * Process a list of matches
     * @param matches - List of matches to process
     * @param options - Processing options
     * @returns Promise resolving to processing results
     */
    async processMatches(
        matches: MatchInfo[],
        options: {
            validate?: boolean;
            transform?: boolean;
            sendToApi?: boolean;
            storeLocally?: boolean;
            continueOnError?: boolean;
            maxRetries?: number;
            retryDelay?: number;
        } = {}
    ): Promise<{
        success: boolean;
        processed: number;
        failed: number;
        results: Array<{
            match: MatchInfo;
            success: boolean;
            data?: ScrapedData;
            error?: string;
        }>;
        progress: PipelineProgress;
    }> {
        const endOperation = logOperation('process_matches', {
            matchCount: matches.length,
            options
        }, 'MatchProcessor');

        this.progress.total = matches.length;
        this.progress.startTime = new Date();

        logger.info('Starting batch match processing', {
            matchCount: matches.length,
            options
        }, 'MatchProcessor');

        const results = [];
        let processed = 0;
        let failed = 0;

        for (const match of matches) {
            this.progress.current = match.title;

            try {
                logger.info('Processing match', {
                    matchId: match.id,
                    matchTitle: match.title,
                    progress: `${processed + 1}/${matches.length}`
                }, 'MatchProcessor');

                const result = await this.processSingleMatch(match, options);
                results.push(result);

                if (result.success) {
                    processed++;
                    this.progress.completed = processed;
                    this.updateProgressStats(result.data);
                } else {
                    failed++;
                    this.progress.failed = failed;
                    this.progress.stats.errors.push(result.error || 'Unknown error');
                }

                // Log progress
                const progressPercent = Math.round((processed + failed) / matches.length * 100);
                logger.info('Match processing progress', {
                    processed,
                    failed,
                    total: matches.length,
                    progressPercent: `${progressPercent}%`,
                    currentMatch: match.title
                }, 'MatchProcessor');

            } catch (error) {
                failed++;
                this.progress.failed = failed;
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.progress.stats.errors.push(errorMessage);

                results.push({
                    match,
                    success: false,
                    error: errorMessage
                });

                logger.error('Match processing failed', error as Error, {
                    matchId: match.id,
                    matchTitle: match.title,
                    error: errorMessage
                }, 'MatchProcessor');

                // Check if we should continue on error
                if (!options.continueOnError) {
                    logger.error('Stopping batch processing due to error', new Error(`Match processing failed: ${errorMessage}`), {
                        matchId: match.id,
                        shouldContinue: options.continueOnError
                    }, 'MatchProcessor');
                    break;
                }
            }
        }

        const finalResult = {
            success: failed === 0,
            processed,
            failed,
            results,
            progress: this.progress
        };

        logger.info('Batch match processing completed', {
            total: matches.length,
            processed,
            failed,
            success: finalResult.success,
            stats: this.progress.stats
        }, 'MatchProcessor');

        endOperation();
        return finalResult;
    }

    /**
     * Process a single match with retry logic
     * @param match - Match to process
     * @param options - Processing options
     * @returns Promise resolving to processing result
     */
    private async processSingleMatch(
        match: MatchInfo,
        options: {
            validate?: boolean;
            transform?: boolean;
            sendToApi?: boolean;
            storeLocally?: boolean;
            maxRetries?: number;
            retryDelay?: number;
        }
    ): Promise<{
        match: MatchInfo;
        success: boolean;
        data?: ScrapedData;
        error?: string;
    }> {
        const maxRetries = options.maxRetries || 3;
        const retryDelay = options.retryDelay || 1000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.debug('Processing match attempt', {
                    matchId: match.id,
                    attempt,
                    maxRetries
                }, 'MatchProcessor');

                // Scrape match data
                const rawData = await this.matchScraper.scrapeMatch(match.url);

                // Process data
                let processedData = rawData;
                if (options.validate !== false) {
                    const validation = await this.dataProcessor.validateData(rawData);
                    if (!validation.isValid) {
                        throw new ScraperError(
                            `Data validation failed: ${validation.errors.join(', ')}`,
                            'VALIDATION_FAILED',
                            { matchId: match.id, errors: validation.errors }
                        );
                    }
                }

                processedData = await this.dataProcessor.processMatchData(rawData, match);

                // Store locally if requested
                if (options.storeLocally !== false) {
                    await this.dataStorage.storeMatchData(processedData, match);

                    // Store related data
                    if (processedData.playersData && processedData.playersData.length > 0) {
                        await this.dataStorage.storePlayerData(processedData.playersData, match);
                    }

                    if (processedData.teams && processedData.teams.length > 0) {
                        await this.dataStorage.storeTeamData(processedData.teams, match);
                    }
                }

                // Send to API if requested
                if (options.sendToApi) {
                    await this.sendToApi(processedData, match);
                }

                logger.info('Match processed successfully', {
                    matchId: match.id,
                    ballsExtracted: processedData.commentary?.length || 0,
                    playersFound: processedData.playersData?.length || 0,
                    attempt
                }, 'MatchProcessor');

                return {
                    match,
                    success: true,
                    data: processedData
                };

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);

                logger.warn('Match processing attempt failed', {
                    matchId: match.id,
                    attempt,
                    maxRetries,
                    error: errorMessage
                }, 'MatchProcessor');

                // If this is the last attempt, don't retry
                if (attempt === maxRetries) {
                    return {
                        match,
                        success: false,
                        error: `Failed after ${maxRetries} attempts: ${errorMessage}`
                    };
                }

                // Wait before retrying
                if (retryDelay > 0) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        }

        // This should never be reached, but just in case
        return {
            match,
            success: false,
            error: 'Unexpected error in match processing'
        };
    }

    /**
     * Send processed data to external API
     * @param data - Processed match data
     * @param match - Match information
     */
    private async sendToApi(data: ScrapedData, match: MatchInfo): Promise<void> {
        try {
            // Send match data
            const matchResult = await this.apiClient.sendMatchData(data, match);
            if (!matchResult.success) {
                logger.warn('Failed to send match data to API', {
                    matchId: match.id,
                    message: matchResult.message
                }, 'MatchProcessor');
            }

            // Send player data if available
            if (data.playersData && data.playersData.length > 0) {
                const playerResult = await this.apiClient.sendPlayerData(data.playersData, match);
                if (!playerResult.success) {
                    logger.warn('Failed to send player data to API', {
                        matchId: match.id,
                        message: playerResult.message
                    }, 'MatchProcessor');
                }
            }

            // Send team data if available
            if (data.teams && data.teams.length > 0) {
                const teamResult = await this.apiClient.sendTeamData(data.teams, match);
                if (!teamResult.success) {
                    logger.warn('Failed to send team data to API', {
                        matchId: match.id,
                        message: teamResult.message
                    }, 'MatchProcessor');
                }
            }

            logger.debug('Data sent to API successfully', {
                matchId: match.id
            }, 'MatchProcessor');

        } catch (error) {
            logger.error('Failed to send data to API', error as Error, {
                matchId: match.id
            }, 'MatchProcessor');
            throw error;
        }
    }

    /**
     * Update progress statistics
     * @param data - Scraped data to extract stats from
     */
    private updateProgressStats(data?: ScrapedData): void {
        if (data) {
            this.progress.stats.matchesProcessed++;
            this.progress.stats.ballsExtracted += data.commentary?.length || 0;
            this.progress.stats.playersFound += data.playersData?.length || 0;
        }
    }

    /**
     * Get current processing progress
     * @returns Current progress information
     */
    getProgress(): PipelineProgress {
        return { ...this.progress };
    }

    /**
     * Reset progress tracking
     */
    resetProgress(): void {
        this.progress = this.initializeProgress();
    }
}
