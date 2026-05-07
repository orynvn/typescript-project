import type { AppHealth } from '@repo/types';

const health: AppHealth = {
  status: 'ok',
  timestamp: new Date().toISOString()
};

console.log('Backend scaffold ready', health.status);
