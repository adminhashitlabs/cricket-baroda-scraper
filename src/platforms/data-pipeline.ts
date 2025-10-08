import { CricketPlatform, TournamentScraper, PipelineConfig, PipelineProgress, MatchInfo, TournamentInfo, TournamentTeam } from './interfaces';
import { MatchProcessor } from './match-processor';
import { logger, logOperation } from '../logger';
import { ScraperError } from '../errors';

/**
 * Data pipeline for orchestrating cricket data scraping and processing
 *
 * This class coordinates the entire data pipeline from tournament discovery
 * through match processing to API integration and storage.
 */
export class DataPipeline {
    private platform: CricketPlatform;
    private tournamentScraper: TournamentScraper;
    private matchProcessor: MatchProcessor;
    private config: PipelineConfig;
    private progress: PipelineProgress;

    constructor(
        platform: CricketPlatform,
        config: PipelineConfig
    ) {
        this.platform = platform;
        this.tournamentScraper = platform.tournamentScraper;
        this.matchProcessor = new MatchProcessor(
            platform.matchScraper,
            platform.dataProcessor,
            platform.dataStorage,
            platform.apiClient
        );
        this.config = config;
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
     * Execute the complete data pipeline
     * @returns Promise resolving to pipeline execution results
     */
    async execute(): Promise<{
        success: boolean;
        message: string;
        progress: PipelineProgress;
        results: {
            tournamentsProcessed: number;
            matchesFound: number;
            matchesProcessed: number;
            matchesFailed: number;
            dataSent: boolean;
            teamsExtracted: number;
            tournamentInfos: number;
        };
    }> {
        const endOperation = logOperation('execute_pipeline', {
            platform: this.config.platform,
            mode: this.config.mode,
            urls: this.config.urls
        }, 'DataPipeline');

        try {
            logger.info('Starting data pipeline execution', {
                platform: this.config.platform,
                mode: this.config.mode,
                urlCount: this.config.urls.length
            }, 'DataPipeline');

            // Initialize platform
            await this.platform.initialize();

            let matches: MatchInfo[] = [];
            let tournamentsProcessed = 0;
            let teamsExtracted: TournamentTeam[] = [];
            let tournamentInfos: TournamentInfo[] = [];

            // Get matches based on mode
            if (this.config.mode === 'tournament') {
                // Process tournament URLs to get comprehensive tournament data
                for (const tournamentUrl of this.config.urls) {
                    try {
                        logger.info('Processing tournament comprehensively', { url: tournamentUrl }, 'DataPipeline');

                        // Get comprehensive tournament information
                        const tournamentInfo = await this.tournamentScraper.getComprehensiveTournamentInfo(tournamentUrl);
                        tournamentInfos.push(tournamentInfo);

                        // Extract participating teams
                        const teams = await this.tournamentScraper.extractTournamentTeams(tournamentUrl);
                        teamsExtracted.push(...teams);

                        // Extract team rosters for each team
                        for (const team of teams) {
                            if (team.url) {
                                try {
                                    const roster = await this.tournamentScraper.extractTeamRoster(team.url, team.name);
                                    // Update team with roster information
                                    const teamIndex = teamsExtracted.findIndex(t => t.id === team.id);
                                    if (teamIndex !== -1) {
                                        teamsExtracted[teamIndex] = roster;
                                    }
                                    logger.debug('Team roster extracted', {
                                        teamName: team.name,
                                        playersCount: roster.players?.length || 0
                                    }, 'DataPipeline');
                                } catch (error) {
                                    logger.warn('Failed to extract team roster', {
                                        teamName: team.name,
                                        url: team.url,
                                        error: error instanceof Error ? error.message : String(error)
                                    }, 'DataPipeline');
                                }
                            }
                        }

                        // Get matches from the tournament
                        const tournamentMatches = await this.tournamentScraper.scrapeTournamentMatches(tournamentUrl);
                        matches.push(...tournamentMatches);
                        tournamentsProcessed++;

                        logger.info('Tournament processed comprehensively', {
                            url: tournamentUrl,
                            name: tournamentInfo.name,
                            status: tournamentInfo.status,
                            teamsCount: teams.length,
                            matchesCount: tournamentMatches.length,
                            format: tournamentInfo.format
                        }, 'DataPipeline');

                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        logger.error('Failed to process tournament comprehensively', error as Error, {
                            url: tournamentUrl,
                            error: errorMessage
                        }, 'DataPipeline');

                        if (!this.config.errorHandling.continueOnError) {
                            throw new ScraperError(
                                `Tournament processing failed: ${errorMessage}`,
                                'PIPELINE_EXECUTION_FAILED',
                                { url: tournamentUrl, originalError: error }
                            );
                        }
                    }
                }
            } else {
                // Direct match URLs
                matches = this.config.urls.map((url, index) => ({
                    id: `match_${index + 1}`,
                    url,
                    title: `Match ${index + 1}`,
                    team1: 'Team 1',
                    team2: 'Team 2',
                    status: 'scheduled'
                }));
            }

            // Remove duplicates based on URL
            const uniqueMatches = this.deduplicateMatches(matches);

            logger.info('Match collection completed', {
                totalMatches: matches.length,
                uniqueMatches: uniqueMatches.length,
                duplicatesRemoved: matches.length - uniqueMatches.length
            }, 'DataPipeline');

            if (uniqueMatches.length === 0) {
                logger.warn('No matches found to process', {}, 'DataPipeline');
                return {
                    success: true,
                    message: 'No matches found to process',
                    progress: this.progress,
                    results: {
                        tournamentsProcessed,
                        matchesFound: 0,
                        matchesProcessed: 0,
                        matchesFailed: 0,
                        dataSent: false,
                        teamsExtracted: teamsExtracted.length,
                        tournamentInfos: tournamentInfos.length
                    }
                };
            }

            // Process matches
            const processingOptions = {
                validate: this.config.processing.validate,
                transform: this.config.processing.transform,
                sendToApi: this.config.processing.sendToApi,
                storeLocally: this.config.processing.storeLocally,
                continueOnError: this.config.errorHandling.continueOnError,
                maxRetries: this.config.errorHandling.maxRetries,
                retryDelay: this.config.errorHandling.retryDelay
            };

            const processingResult = await this.matchProcessor.processMatches(uniqueMatches, processingOptions);

            // Update progress
            this.progress = processingResult.progress;

            const result = {
                success: processingResult.success,
                message: processingResult.success
                    ? `Successfully processed ${processingResult.processed} matches`
                    : `Processing completed with ${processingResult.failed} failures`,
                progress: this.progress,
                results: {
                    tournamentsProcessed,
                    matchesFound: uniqueMatches.length,
                    matchesProcessed: processingResult.processed,
                    matchesFailed: processingResult.failed,
                    dataSent: this.config.processing.sendToApi,
                    teamsExtracted: teamsExtracted.length,
                    tournamentInfos: tournamentInfos.length
                }
            };

            logger.info('Data pipeline execution completed', {
                success: result.success,
                tournamentsProcessed,
                matchesFound: uniqueMatches.length,
                matchesProcessed: processingResult.processed,
                matchesFailed: processingResult.failed,
                stats: this.progress.stats
            }, 'DataPipeline');

            endOperation();
            return result;

        } catch (error) {
            logger.error('Data pipeline execution failed', error as Error, {
                platform: this.config.platform,
                mode: this.config.mode,
                urls: this.config.urls
            }, 'DataPipeline');

            endOperation();
            throw new ScraperError(
                `Pipeline execution failed: ${error instanceof Error ? error.message : String(error)}`,
                'PIPELINE_EXECUTION_FAILED',
                {
                    platform: this.config.platform,
                    mode: this.config.mode,
                    urls: this.config.urls,
                    originalError: error
                }
            );
        } finally {
            // Cleanup platform resources
            try {
                await this.platform.cleanup();
            } catch (cleanupError) {
                logger.warn('Platform cleanup failed', {
                    error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
                }, 'DataPipeline');
            }
        }
    }

    /**
     * Remove duplicate matches based on URL
     * @param matches - Array of matches that may contain duplicates
     * @returns Array of unique matches
     */
    private deduplicateMatches(matches: MatchInfo[]): MatchInfo[] {
        const seen = new Set<string>();
        const unique: MatchInfo[] = [];

        for (const match of matches) {
            if (!seen.has(match.url)) {
                seen.add(match.url);
                unique.push(match);
            }
        }

        return unique;
    }

    /**
     * Get current pipeline progress
     * @returns Current progress information
     */
    getProgress(): PipelineProgress {
        return { ...this.progress };
    }

    /**
     * Reset pipeline progress
     */
    resetProgress(): void {
        this.progress = this.initializeProgress();
        this.matchProcessor.resetProgress();
    }

    /**
     * Validate pipeline configuration
     * @param config - Configuration to validate
     * @returns Validation result
     */
    static validateConfig(config: PipelineConfig): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        if (!config.platform) {
            errors.push('Platform is required');
        }

        if (!['tournament', 'matches'].includes(config.mode)) {
            errors.push('Mode must be either "tournament" or "matches"');
        }

        if (!config.urls || config.urls.length === 0) {
            errors.push('At least one URL is required');
        }

        if (config.errorHandling.maxRetries < 0) {
            errors.push('maxRetries must be non-negative');
        }

        if (config.errorHandling.retryDelay < 0) {
            errors.push('retryDelay must be non-negative');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Create a default pipeline configuration
     * @param platform - Platform name
     * @param urls - URLs to process
     * @param mode - Processing mode
     * @returns Default configuration
     */
    static createDefaultConfig(
        platform: string,
        urls: string[],
        mode: 'tournament' | 'matches' = 'tournament'
    ): PipelineConfig {
        return {
            platform,
            mode,
            urls,
            processing: {
                validate: true,
                transform: true,
                sendToApi: true,
                storeLocally: true
            },
            errorHandling: {
                continueOnError: true,
                maxRetries: 3,
                retryDelay: 1000
            },
            output: {
                directory: './output',
                filePattern: 'match-{matchId}-{timestamp}.json'
            }
        };
    }
}
