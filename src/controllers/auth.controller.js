import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const register = asyncHandler(async (req, res) => {
  const user = authService.register(req.body);
  sendSuccess(res, { statusCode: 201, message: 'User registered successfully', data: user });
});

export const login = asyncHandler(async (req, res) => {
  const result = authService.login(req.body);
  sendSuccess(res, { message: 'Login successful', data: result });
});

export default { register, login };
