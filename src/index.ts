import WebScraper from './scraper';
import { DataPipeline } from './platforms/data-pipeline';
import { CricketBarodaPlatform } from './platforms/cricket-baroda-platform';
import { logger } from './logger';

/**
 * Main entry point for the cricket scraper application
 *
 * Supports two modes:
 * 1. Single match scraping (legacy mode)
 * 2. Pipeline mode for tournament/match processing
 */

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args[0] || 'single'; // 'single' or 'pipeline'

async function main() {
    logger.info('Starting cricket scraper application', { mode }, 'Main');

    try {
        if (mode === 'pipeline') {
            await runPipelineMode();
        } else {
            await runSingleMatchMode();
        }

        logger.info('Application completed successfully', { mode }, 'Main');
    } catch (error) {
        logger.error('Application failed', error as Error, { mode }, 'Main');
        process.exit(1);
    }
}

/**
 * Run in single match mode (legacy)
 */
async function runSingleMatchMode() {
    const url = process.env.MATCH_URL || 'https://www.cricketbaroda.com/match/17797270/Y.S.C-Women-vs-Combined-Disrict-Women---1';

    logger.info('Running in single match mode', { url }, 'Main');

    const scraper = new WebScraper(url);
    try {
        await scraper.scrape();
        logger.info('Single match scraping completed successfully', { url }, 'Main');
    } catch (error) {
        logger.error('Single match scraping failed', error as Error, { url }, 'Main');
        throw error;
    }
}

/**
 * Run in pipeline mode (new architecture)
 */
async function runPipelineMode() {
    // Get configuration from environment variables or command line
    const platformName = process.env.PLATFORM || 'cricketbaroda';
    const pipelineMode = (process.env.PIPELINE_MODE || 'tournament') as 'tournament' | 'matches';
    const urls = (process.env.URLS || process.env.TOURNAMENT_URL)?.split(',') || [
        'https://www.cricketbaroda.com/tournament/12345' // Default tournament URL
    ];

    logger.info('Running in pipeline mode', {
        platform: platformName,
        mode: pipelineMode,
        urlCount: urls.length
    }, 'Main');

    // Create platform
    const platformConfig = {
        name: platformName,
        baseUrl: 'https://www.cricketbaroda.com'
    };
    const platform = new CricketBarodaPlatform(platformConfig);

    // Create pipeline configuration
    const pipelineConfig = DataPipeline.createDefaultConfig(platformName, urls, pipelineMode);

    // Override defaults with environment variables
    if (process.env.VALIDATE_DATA) {
        pipelineConfig.processing.validate = process.env.VALIDATE_DATA === 'true';
    }
    if (process.env.SEND_TO_API) {
        pipelineConfig.processing.sendToApi = process.env.SEND_TO_API === 'true';
    }
    if (process.env.STORE_LOCALLY) {
        pipelineConfig.processing.storeLocally = process.env.STORE_LOCALLY === 'true';
    }
    if (process.env.CONTINUE_ON_ERROR) {
        pipelineConfig.errorHandling.continueOnError = process.env.CONTINUE_ON_ERROR === 'true';
    }
    if (process.env.MAX_RETRIES) {
        pipelineConfig.errorHandling.maxRetries = parseInt(process.env.MAX_RETRIES);
    }

    // Validate configuration
    const validation = DataPipeline.validateConfig(pipelineConfig);
    if (!validation.isValid) {
        logger.error('Invalid pipeline configuration', new Error(validation.errors.join(', ')), {}, 'Main');
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    // Create and execute pipeline
    const pipeline = new DataPipeline(platform, pipelineConfig);
    const result = await pipeline.execute();

    logger.info('Pipeline execution completed', {
        success: result.success,
        message: result.message,
        stats: result.progress.stats,
        results: result.results
    }, 'Main');

    if (!result.success) {
        throw new Error(result.message);
    }
}

main();
