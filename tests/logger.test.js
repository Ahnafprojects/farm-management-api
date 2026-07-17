import { jest } from '@jest/globals';
import { logger } from '../src/utils/logger.js';

describe('logger', () => {
  it('info() writes through console.log', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('hello');
    expect(spy).toHaveBeenCalledWith('hello');
    spy.mockRestore();
  });

  it('error() writes through console.error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('boom');
    expect(spy).toHaveBeenCalledWith('boom');
    spy.mockRestore();
  });
});
