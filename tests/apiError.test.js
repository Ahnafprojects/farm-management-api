import { ApiError } from '../src/utils/ApiError.js';

describe('ApiError factories', () => {
  it('internal() builds a 500 INTERNAL_ERROR with a default message', () => {
    const err = ApiError.internal();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.message).toBe('Internal server error');
  });

  it('internal() accepts a custom message', () => {
    const err = ApiError.internal('custom failure');
    expect(err.message).toBe('custom failure');
  });
});
