/**
 * Log level constants with terminal color codes for visual distinction
 */
export const LOG_LEVELS = {
  SUCCESS: 'success',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  DEBUG: 'debug',
} as const;

export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

/**
 * ANSI color codes for terminal output
 */
export const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Background colors
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m',
  bgBlue: '\x1b[44m',
  bgCyan: '\x1b[46m',
} as const;

/**
 * Map log levels to their respective colors
 */
export const LEVEL_COLORS: Record<LogLevel, string> = {
  success: COLORS.green,
  info: COLORS.blue,
  warning: COLORS.yellow,
  error: COLORS.red,
  debug: COLORS.gray,
};

/**
 * Map log levels to their display labels
 */
export const LEVEL_LABELS: Record<LogLevel, string> = {
  success: '✓ SUCCESS',
  info: 'ℹ INFO',
  warning: '⚠ WARNING',
  error: '✗ ERROR',
  debug: '🔍 DEBUG',
};
