import { Redis } from '@upstash/redis';

let redis = null;

function getRedis() {
  if (!redis) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Upstash Redis not configured');
    }
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

const DEFAULT_CONFIG = {
  autoTrade: true,
  riskLevel: "conservative",
  positionSizePct: 3,
  stopLossPct: 1.5,
  takeProfitPct: 4.5,
  maxOpenPositions: 2,
  scanIntervalSec: 120,
  enabledPairs: ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA"],
  trailingStop: true,
  trailingStopPct: 1.0,
  dailyLossLimit: 300,
  confluenceRequired: 4,
  paperBalance: 10000,
};

export async function getConfig() {
  const config = await getRedis().get('bot:config');
  return config || DEFAULT_CONFIG;
}

export async function saveConfig(config) {
  await getRedis().set('bot:config', config);
}

export async function getPositions() {
  return await getRedis().get('bot:positions') || [];
}

export async function savePositions(positions) {
  await getRedis().set('bot:positions', positions);
}

export async function getTradeLog() {
  return await getRedis().get('bot:trade_log') || [];
}

export async function addTrade(entry) {
  const log = await getTradeLog();
  log.unshift({ ...entry, timestamp: Date.now() });
  if (log.length > 500) log.length = 500;
  await getRedis().set('bot:trade_log', log);
  return log;
}

export async function getBalance() {
  return await getRedis().get('bot:balance') || { available: 10000, total: 10000 };
}

export async function saveBalance(bal) {
  await getRedis().set('bot:balance', bal);
}

export async function getLastScan() {
  return await getRedis().get('bot:last_scan') || null;
}

export async function saveLastScan(data) {
  await getRedis().set('bot:last_scan', data);
}
