/**
 * Configuration examples for the cricket scraper application
 *
 * This file contains examples of how to configure the scraper for different use cases.
 * Copy these configurations and modify them according to your needs.
 */

export const CONFIG_EXAMPLES = {
  /**
   * Single match scraping (legacy mode)
   */
  singleMatch: {
    mode: 'single',
    environment: {
      MATCH_URL: 'https://www.cricketbaroda.com/match/17797270/Y.S.C-Women-vs-Combined-Disrict-Women---1'
    },
    command: 'npm run scrape:single'
  },

  /**
   * Tournament mode - scrape all matches from a tournament
   */
  tournamentMode: {
    mode: 'pipeline',
    pipelineMode: 'tournament',
    environment: {
      PLATFORM: 'cricketbaroda',
      PIPELINE_MODE: 'tournament',
      TOURNAMENT_URL: 'https://www.cricketbaroda.com/tournament/12345',
      VALIDATE_DATA: 'true',
      SEND_TO_API: 'true',
      STORE_LOCALLY: 'true',
      CONTINUE_ON_ERROR: 'true',
      MAX_RETRIES: '3'
    },
    command: 'npm run scrape:tournament'
  },

  /**
   * Multiple matches mode - scrape specific matches
   */
  multipleMatchesMode: {
    mode: 'pipeline',
    pipelineMode: 'matches',
    environment: {
      PLATFORM: 'cricketbaroda',
      PIPELINE_MODE: 'matches',
      URLS: 'https://www.cricketbaroda.com/match/1,https://www.cricketbaroda.com/match/2,https://www.cricketbaroda.com/match/3',
      VALIDATE_DATA: 'true',
      SEND_TO_API: 'true',
      STORE_LOCALLY: 'true',
      CONTINUE_ON_ERROR: 'true',
      MAX_RETRIES: '3'
    },
    command: 'npm run scrape:matches'
  },

  /**
   * API-only mode - only send data to API, don't store locally
   */
  apiOnlyMode: {
    mode: 'pipeline',
    pipelineMode: 'tournament',
    environment: {
      PLATFORM: 'cricketbaroda',
      PIPELINE_MODE: 'tournament',
      TOURNAMENT_URL: 'https://www.cricketbaroda.com/tournament/12345',
      VALIDATE_DATA: 'true',
      SEND_TO_API: 'true',
      STORE_LOCALLY: 'false',
      CONTINUE_ON_ERROR: 'true',
      MAX_RETRIES: '3',
      API_BASE_URL: 'https://your-api.com/api'
    }
  },

  /**
   * Local storage only mode - don't send to API
   */
  localOnlyMode: {
    mode: 'pipeline',
    pipelineMode: 'matches',
    environment: {
      PLATFORM: 'cricketbaroda',
      PIPELINE_MODE: 'matches',
      URLS: 'https://www.cricketbaroda.com/match/1,https://www.cricketbaroda.com/match/2',
      VALIDATE_DATA: 'true',
      SEND_TO_API: 'false',
      STORE_LOCALLY: 'true',
      CONTINUE_ON_ERROR: 'true',
      MAX_RETRIES: '3'
    }
  },

  /**
   * Fast mode - minimal validation, continue on errors
   */
  fastMode: {
    mode: 'pipeline',
    pipelineMode: 'tournament',
    environment: {
      PLATFORM: 'cricketbaroda',
      PIPELINE_MODE: 'tournament',
      TOURNAMENT_URL: 'https://www.cricketbaroda.com/tournament/12345',
      VALIDATE_DATA: 'false',
      SEND_TO_API: 'true',
      STORE_LOCALLY: 'false',
      CONTINUE_ON_ERROR: 'true',
      MAX_RETRIES: '1'
    }
  },

  /**
   * Debug mode - detailed logging, single match
   */
  debugMode: {
    mode: 'pipeline',
    pipelineMode: 'matches',
    environment: {
      PLATFORM: 'cricketbaroda',
      PIPELINE_MODE: 'matches',
      URLS: 'https://www.cricketbaroda.com/match/17797270/Y.S.C-Women-vs-Combined-Disrict-Women---1',
      VALIDATE_DATA: 'true',
      SEND_TO_API: 'false',
      STORE_LOCALLY: 'true',
      CONTINUE_ON_ERROR: 'false',
      MAX_RETRIES: '1',
      LOG_LEVEL: 'debug'
    }
  }
};

/**
 * Helper function to generate environment variable commands
 */
export function generateEnvCommand(config: typeof CONFIG_EXAMPLES.singleMatch): string {
  const envVars = Object.entries(config.environment)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  return `${envVars} ${config.command}`;
}

/**
 * Helper function to create a .env file content
 */
export function generateEnvFile(config: typeof CONFIG_EXAMPLES.singleMatch): string {
  return Object.entries(config.environment)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

/**
 * Usage examples:
 *
 * 1. Single match scraping:
 *    npm run scrape:single
 *
 * 2. Tournament scraping:
 *    TOURNAMENT_URL="https://www.cricketbaroda.com/tournament/12345" npm run scrape:tournament
 *
 * 3. Multiple matches:
 *    URLS="url1,url2,url3" npm run scrape:matches
 *
 * 4. Custom configuration:
 *    VALIDATE_DATA=false SEND_TO_API=true STORE_LOCALLY=false npm run scrape:pipeline
 *
 * 5. Using environment file:
 *    cp config-examples.ts .env && npm run scrape:pipeline
 */
