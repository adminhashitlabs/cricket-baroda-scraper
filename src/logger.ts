/**
 * Structured logging system for the cricket scraper application
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4
}

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    levelName: string;
    message: string;
    context?: Record<string, any>;
    error?: Error;
    source?: string;
}

export interface LoggerConfig {
    level: LogLevel;
    enableConsole: boolean;
    enableFile: boolean;
    filePath?: string;
    maxFileSize?: number; // in bytes
    format: 'json' | 'text';
    includeTimestamp: boolean;
    includeSource: boolean;
}

export class Logger {
    private config: LoggerConfig;
    private logBuffer: LogEntry[] = [];
    private static instance: Logger;

    constructor(config: Partial<LoggerConfig> = {}) {
        this.config = {
            level: LogLevel.INFO,
            enableConsole: true,
            enableFile: false,
            format: 'text',
            includeTimestamp: true,
            includeSource: true,
            ...config
        };
    }

    static getInstance(config?: Partial<LoggerConfig>): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(config);
        }
        return Logger.instance;
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this.config.level;
    }

    private formatEntry(entry: LogEntry): string {
        if (this.config.format === 'json') {
            return JSON.stringify(entry, null, 2);
        }

        // Text format
        let output = '';

        if (this.config.includeTimestamp) {
            output += `[${entry.timestamp}] `;
        }

        output += `[${entry.levelName}]`;

        if (this.config.includeSource && entry.source) {
            output += ` [${entry.source}]`;
        }

        output += `: ${entry.message}`;

        if (entry.context && Object.keys(entry.context).length > 0) {
            output += ` | Context: ${JSON.stringify(entry.context)}`;
        }

        if (entry.error) {
            output += ` | Error: ${entry.error.message}`;
            if (entry.error.stack) {
                output += `\n${entry.error.stack}`;
            }
        }

        return output;
    }

    private writeToConsole(entry: LogEntry): void {
        const formatted = this.formatEntry(entry);

        switch (entry.level) {
            case LogLevel.DEBUG:
                console.debug(formatted);
                break;
            case LogLevel.INFO:
                console.info(formatted);
                break;
            case LogLevel.WARN:
                console.warn(formatted);
                break;
            case LogLevel.ERROR:
            case LogLevel.FATAL:
                console.error(formatted);
                break;
        }
    }

    private writeToFile(entry: LogEntry): void {
        if (!this.config.enableFile || !this.config.filePath) {
            return;
        }

        try {
            const fs = require('fs');
            const path = require('path');

            // Ensure directory exists
            const dir = path.dirname(this.config.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const formatted = this.formatEntry(entry) + '\n';

            // Check file size limit
            if (this.config.maxFileSize) {
                try {
                    const stats = fs.statSync(this.config.filePath);
                    if (stats.size + formatted.length > this.config.maxFileSize) {
                        // Rotate log file
                        const backupPath = `${this.config.filePath}.old`;
                        if (fs.existsSync(backupPath)) {
                            fs.unlinkSync(backupPath);
                        }
                        fs.renameSync(this.config.filePath, backupPath);
                    }
                } catch (error) {
                    // File doesn't exist yet, that's fine
                }
            }

            fs.appendFileSync(this.config.filePath, formatted);
        } catch (error) {
            // Fallback to console if file logging fails
            console.error('Failed to write to log file:', error);
            this.writeToConsole(entry);
        }
    }

    private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error, source?: string): void {
        if (!this.shouldLog(level)) {
            return;
        }

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            levelName: LogLevel[level],
            message,
            context,
            error,
            source
        };

        // Add to buffer for potential batch processing
        this.logBuffer.push(entry);

        // Keep buffer size manageable
        if (this.logBuffer.length > 1000) {
            this.logBuffer = this.logBuffer.slice(-500);
        }

        // Write to configured outputs
        if (this.config.enableConsole) {
            this.writeToConsole(entry);
        }

        if (this.config.enableFile) {
            this.writeToFile(entry);
        }
    }

    debug(message: string, context?: Record<string, any>, source?: string): void {
        this.log(LogLevel.DEBUG, message, context, undefined, source);
    }

    info(message: string, context?: Record<string, any>, source?: string): void {
        this.log(LogLevel.INFO, message, context, undefined, source);
    }

    warn(message: string, context?: Record<string, any>, source?: string): void {
        this.log(LogLevel.WARN, message, context, undefined, source);
    }

    error(message: string, error?: Error, context?: Record<string, any>, source?: string): void {
        this.log(LogLevel.ERROR, message, context, error, source);
    }

    fatal(message: string, error?: Error, context?: Record<string, any>, source?: string): void {
        this.log(LogLevel.FATAL, message, context, error, source);
    }

    // Utility methods
    startOperation(operation: string, context?: Record<string, any>, source?: string): () => void {
        this.info(`Starting operation: ${operation}`, context, source);
        const startTime = Date.now();

        return () => {
            const duration = Date.now() - startTime;
            this.info(`Completed operation: ${operation}`, { ...context, duration }, source);
        };
    }

    logPerformance(operation: string, duration: number, context?: Record<string, any>, source?: string): void {
        const level = duration > 5000 ? LogLevel.WARN : LogLevel.DEBUG;
        this.log(level, `Performance: ${operation}`, { ...context, duration }, undefined, source);
    }

    logErrorWithContext(error: Error, context?: Record<string, any>, source?: string): void {
        this.error(error.message, error, context, source);
    }

    // Configuration methods
    setLevel(level: LogLevel): void {
        this.config.level = level;
    }

    setConsoleEnabled(enabled: boolean): void {
        this.config.enableConsole = enabled;
    }

    setFileLogging(enabled: boolean, filePath?: string): void {
        this.config.enableFile = enabled;
        if (filePath) {
            this.config.filePath = filePath;
        }
    }

    // Get recent logs for debugging
    getRecentLogs(count: number = 50): LogEntry[] {
        return this.logBuffer.slice(-count);
    }

    // Flush any buffered logs
    flush(): void {
        // For now, logs are written immediately, but this could be extended for batching
    }
}

// Create default logger instance
export const logger = Logger.getInstance();

// Convenience functions for common logging patterns
export const logOperation = (operation: string, context?: Record<string, any>, source?: string) => {
    return logger.startOperation(operation, context, source);
};

export const logError = (error: Error, context?: Record<string, any>, source?: string) => {
    logger.logErrorWithContext(error, context, source);
};

export const logPerformance = (operation: string, duration: number, context?: Record<string, any>, source?: string) => {
    logger.logPerformance(operation, duration, context, source);
};
