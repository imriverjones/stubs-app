// Lets Node run the app's TypeScript directly: "./types" → "./types.ts".
import { register } from 'node:module';
register(
  'data:text/javascript,' +
    encodeURIComponent(`export async function resolve(s, c, next) {
  if (s.startsWith('.') && !/\\.\\w+$/.test(s)) { try { return await next(s + '.ts', c); } catch {} }
  return next(s, c);
}`),
);
