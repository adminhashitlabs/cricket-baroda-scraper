/**
 * Configuration constants for the cricket scraper
 */
export const CONFIG = {
    // Browser settings
    BROWSER: {
        HEADLESS: true,
        DEFAULT_TIMEOUT: 30000,
    },

    // URLs
    BASE_URL: 'https://www.cricketbaroda.com',

    // Selectors
    SELECTORS: {
        COMMENTARY_CONTAINER: 'div.sc-5abfe348-0.hbtmkB',
        TEAM_SELECTORS: [
            'select.sc-5abfe348-2 option',
            'select.sc-bc4a329-1 option',
            'select option',
            '.form-select option'
        ],
        BALL_ELEMENTS: 'div.sc-5abfe348-1',
        OVER_SUMMARY_ELEMENTS: 'div.sc-5abfe348-7',
    },

    // Timeouts (in milliseconds)
    TIMEOUTS: {
        PAGE_LOAD: 30000,
        ELEMENT_WAIT: 10000,
        COMMENTARY_LOAD: 3000,
        TEAM_LOAD: 2000,
        CONTENT_LOAD: 5000,
    },

    // Retry settings
    RETRY: {
        MAX_ATTEMPTS: 3,
        DELAY: 1000,
    },

    // Data processing
    DATA: {
        MAX_INNINGS: 2,
        MAX_OVERS: 50,
        MAX_BALLS_PER_OVER: 6,
        DEFAULT_TEAM_NAME: 'Unknown Team',
    },

    // Logging
    LOGGING: {
        LEVEL: 'info', // 'debug', 'info', 'warn', 'error', 'fatal'
        ENABLE_CONSOLE: true,
        ENABLE_FILE: false,
        FILE_PATH: 'logs/scraper.log',
        MAX_FILE_SIZE: 10485760, // 10MB
        FORMAT: 'text', // 'text' or 'json'
        INCLUDE_TIMESTAMP: true,
        INCLUDE_SOURCE: true,
    },
} as const;

/**
 * Environment-specific configuration
 */
export const getEnvConfig = () => {
    return {
        NODE_ENV: process.env.NODE_ENV || 'development',
        DEBUG: process.env.DEBUG === 'true',
        OUTPUT_FILE: process.env.OUTPUT_FILE || 'output.json',
        LOG_LEVEL: process.env.LOG_LEVEL || CONFIG.LOGGING.LEVEL,
    };
};
