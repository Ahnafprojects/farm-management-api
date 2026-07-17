/* eslint-disable no-console */

/**
 * Minimal centralized logger. All application code logs through this
 * module instead of calling `console.*` directly, so log output stays
 * consistent and can be swapped for a structured logger later without
 * touching call sites.
 */
export const logger = {
  info(...args) {
    console.log(...args);
  },
  error(...args) {
    console.error(...args);
  },
};

export default logger;
