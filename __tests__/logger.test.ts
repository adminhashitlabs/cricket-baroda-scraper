import { Logger, LogLevel } from '../src/logger';
import { CONFIG } from '../src/config';

describe('Logger', () => {
  let logger: Logger;
  let originalLevel: LogLevel;

  beforeEach(() => {
    logger = Logger.getInstance();
    originalLevel = logger['config'].level; // Access private config
  });

  afterEach(() => {
    logger['config'].level = originalLevel; // Reset level
  });

  test('should be a singleton', () => {
    const logger1 = Logger.getInstance();
    const logger2 = Logger.getInstance();
    expect(logger1).toBe(logger2);
  });

  test('should log info messages', () => {
    const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
    logger.info('Test info message');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]')
    );
    consoleSpy.mockRestore();
  });

  test('should log error messages', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    logger.error('Test error message');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]')
    );
    consoleSpy.mockRestore();
  });

  test('should log with operation timing', () => {
    const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
    const endOperation = logger.startOperation('test-operation');
    endOperation();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('test-operation')
    );
    consoleSpy.mockRestore();
  });

  test('should handle log levels correctly', () => {
    logger['config'].level = LogLevel.DEBUG;
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
    logger.debug('Test debug message');
    expect(debugSpy).toHaveBeenCalled();
    debugSpy.mockRestore();
  });
});
