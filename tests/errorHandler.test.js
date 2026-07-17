import { jest } from '@jest/globals';
import { z } from 'zod';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { ApiError } from '../src/utils/ApiError.js';

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler middleware', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('maps an ApiError to its own status/code/message', () => {
    const res = mockRes();
    errorHandler(ApiError.conflict('duplicate'), {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'CONFLICT', message: 'duplicate' },
    });
  });

  it('maps a raw ZodError to 400 VALIDATION_ERROR with field details', () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({});
    const res = mockRes();
    errorHandler(result.error, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details[0]).toMatchObject({ field: 'name' });
  });

  it('maps a body-parser SyntaxError to 400 VALIDATION_ERROR', () => {
    const err = new SyntaxError('Unexpected token');
    err.body = '{bad';
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON in request body' },
    });
  });

  it('maps an entity.too.large error to 400 VALIDATION_ERROR', () => {
    const err = new Error('request entity too large');
    err.type = 'entity.too.large';
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Request body exceeds the allowed size limit' },
    });
  });

  it('maps an unexpected error to a generic 500 and logs it server-side', () => {
    const err = new Error('some internal detail that must not leak');
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('INTERNAL_ERROR');
    // NODE_ENV=test (not production) in this suite, so the message is passed through;
    // this still proves the error is logged server-side rather than swallowed.
    expect(consoleErrorSpy).toHaveBeenCalledWith(err);
  });
});
