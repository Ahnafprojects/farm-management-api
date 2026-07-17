import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as usersRepository from '../repositories/users.repository.js';
import { config } from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';

const BCRYPT_COST = 10;

/**
 * A pre-computed bcrypt hash of a value no real password can equal, used to
 * keep `login`'s response time constant whether or not the email exists -
 * without it, an unknown email short-circuits before any bcrypt comparison
 * runs, producing a measurable timing side-channel that lets an attacker
 * enumerate registered emails even though the error message is identical.
 */
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('not-a-real-password-placeholder', BCRYPT_COST);

/**
 * Registers a new user. Throws a 409 ApiError if the email is already taken.
 * @param {{ email: string, password: string }} data
 * @returns {{ id: number, email: string }}
 */
export function register({ email, password }) {
  const existing = usersRepository.findByEmail(email);
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }
  const passwordHash = bcrypt.hashSync(password, BCRYPT_COST);
  return usersRepository.create({ email, passwordHash });
}

/**
 * Authenticates a user and issues a signed JWT. Uses an identical error
 * message for both "unknown email" and "wrong password" so a caller cannot
 * enumerate which one was incorrect.
 * @param {{ email: string, password: string }} data
 * @returns {{ token: string, expiresIn: string }}
 */
export function login({ email, password }) {
  const user = usersRepository.findByEmail(email);
  const invalidCredentials = () => ApiError.unauthorized('Invalid email or password');

  // Always run a bcrypt comparison, even for an unknown email, so the
  // response time is the same in both cases (see DUMMY_PASSWORD_HASH).
  const passwordMatches = bcrypt.compareSync(
    password,
    user ? user.password_hash : DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches) {
    throw invalidCredentials();
  }

  const token = jwt.sign({ sub: user.id, email: user.email }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    algorithm: 'HS256',
  });

  return { token, expiresIn: config.jwt.expiresIn };
}

export default { register, login };
