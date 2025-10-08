/**
 * Custom error classes for the cricket scraper application
 */

/**
 * Base error class for all scraper-related errors
 */
export class ScraperError extends Error {
    public readonly code: string;
    public readonly timestamp: Date;
    public readonly context?: Record<string, any>;

    constructor(message: string, code: string, context?: Record<string, any>) {
        super(message);
        this.name = 'ScraperError';
        this.code = code;
        this.timestamp = new Date();
        this.context = context;

        // Maintains proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ScraperError);
        }
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            timestamp: this.timestamp.toISOString(),
            context: this.context,
            stack: this.stack
        };
    }
}

/**
 * Error thrown when browser operations fail
 */
export class BrowserError extends ScraperError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 'BROWSER_ERROR', context);
        this.name = 'BrowserError';
    }
}

/**
 * Error thrown when element selectors fail to find elements
 */
export class SelectorError extends ScraperError {
    public readonly selector: string;

    constructor(message: string, selector: string, context?: Record<string, any>) {
        super(message, 'SELECTOR_ERROR', { ...context, selector });
        this.name = 'SelectorError';
        this.selector = selector;
    }
}

/**
 * Error thrown when operations timeout
 */
export class TimeoutError extends ScraperError {
    public readonly timeout: number;

    constructor(message: string, timeout: number, context?: Record<string, any>) {
        super(message, 'TIMEOUT_ERROR', { ...context, timeout });
        this.name = 'TimeoutError';
        this.timeout = timeout;
    }
}

/**
 * Error thrown when data parsing fails
 */
export class DataParsingError extends ScraperError {
    public readonly data: string;

    constructor(message: string, data: string, context?: Record<string, any>) {
        super(message, 'DATA_PARSING_ERROR', { ...context, data });
        this.name = 'DataParsingError';
        this.data = data;
    }
}

/**
 * Error thrown when network operations fail
 */
export class NetworkError extends ScraperError {
    public readonly url: string;
    public readonly statusCode?: number;

    constructor(message: string, url: string, statusCode?: number, context?: Record<string, any>) {
        super(message, 'NETWORK_ERROR', { ...context, url, statusCode });
        this.name = 'NetworkError';
        this.url = url;
        this.statusCode = statusCode;
    }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends ScraperError {
    public readonly configKey: string;

    constructor(message: string, configKey: string, context?: Record<string, any>) {
        super(message, 'CONFIGURATION_ERROR', { ...context, configKey });
        this.name = 'ConfigurationError';
        this.configKey = configKey;
    }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends ScraperError {
    public readonly field: string;
    public readonly value: any;

    constructor(message: string, field: string, value: any, context?: Record<string, any>) {
        super(message, 'VALIDATION_ERROR', { ...context, field, value });
        this.name = 'ValidationError';
        this.field = field;
        this.value = value;
    }
}

/**
 * Utility function to wrap async operations with error handling
 */
export async function withErrorHandling<T>(
    operation: () => Promise<T>,
    errorMessage: string,
    context?: Record<string, any>
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        if (error instanceof ScraperError) {
            throw error;
        }

        // Wrap unknown errors in ScraperError
        throw new ScraperError(
            `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`,
            'OPERATION_FAILED',
            { ...context, originalError: error }
        );
    }
}

/**
 * Utility function to retry operations with exponential backoff
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000,
    errorMessage: string = 'Operation failed after retries'
): Promise<T> {
    let lastError: Error = new Error('No attempts made');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            if (attempt === maxAttempts) {
                break;
            }

            // Exponential backoff
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw new ScraperError(
        `${errorMessage} after ${maxAttempts} attempts: ${lastError.message}`,
        'MAX_RETRIES_EXCEEDED',
        { maxAttempts, lastError: lastError.message }
    );
}
