import {
  BrowserError,
  SelectorError,
  TimeoutError,
  DataParsingError,
  NetworkError,
  ValidationError
} from '../src/errors';

describe('Custom Errors', () => {
  test('BrowserError should have correct name and message', () => {
    const error = new BrowserError('Browser failed to launch');
    expect(error.name).toBe('BrowserError');
    expect(error.message).toBe('Browser failed to launch');
    expect(error instanceof Error).toBe(true);
  });

  test('SelectorError should have correct name and include selector', () => {
    const error = new SelectorError('Element not found', '.some-selector');
    expect(error.name).toBe('SelectorError');
    expect(error.message).toBe('Element not found');
    expect(error.selector).toBe('.some-selector');
  });

  test('TimeoutError should have correct name and timeout info', () => {
    const error = new TimeoutError('Operation timed out', 5000);
    expect(error.name).toBe('TimeoutError');
    expect(error.message).toBe('Operation timed out');
    expect(error.timeout).toBe(5000);
  });

  test('DataParsingError should have correct name and parsing details', () => {
    const error = new DataParsingError('Invalid JSON', 'ball data');
    expect(error.name).toBe('DataParsingError');
    expect(error.message).toBe('Invalid JSON');
    expect(error.data).toBe('ball data');
  });

  test('NetworkError should have correct name and URL', () => {
    const error = new NetworkError('Connection failed', 'https://example.com');
    expect(error.name).toBe('NetworkError');
    expect(error.message).toBe('Connection failed');
    expect(error.url).toBe('https://example.com');
  });

  test('ValidationError should have correct name and validation details', () => {
    const error = new ValidationError('Invalid data format', 'score', 'invalid-value');
    expect(error.name).toBe('ValidationError');
    expect(error.message).toContain('Invalid data format');
    expect(error.field).toBe('score');
    expect(error.value).toBe('invalid-value');
  });
});
