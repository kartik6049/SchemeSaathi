/**
 * Tiny structured logger (JSON lines in production, readable text in dev).
 * Never log request bodies: they may contain a user's profile (NFR-07).
 */
import { env } from '../config/env.js';

type Level = 'info' | 'warn' | 'error';

function write(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (env.isTest && level !== 'error') return;
  if (env.isProd) {
    console[level === 'info' ? 'log' : level](JSON.stringify({ level, msg, time: new Date().toISOString(), ...meta }));
  } else {
    console[level === 'info' ? 'log' : level](`[${level}] ${msg}`, meta ?? '');
  }
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => write('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write('error', msg, meta),
};
