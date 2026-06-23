import { getConfig, getPositions, getTradeLog, getBalance, getLastScan } from './lib/storage.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const [config, positions, log, balance, lastScan] = await Promise.all([
      getConfig(), getPositions(), getTradeLog(), getBalance(), getLastScan(),
    ]);

    const closed = log.filter(t => t.type === "CLOSE");
    const wins = closed.filter(t => t.pnl > 0).length;
    const losses = closed.filter(t => t.pnl <= 0).length;
    const totalPnL = closed.reduce((s, t) => s + (t.pnl || 0), 0);
    const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;

    return res.json({
      status: 'ok',
      serverBot: true,
      config,
      positions,
      tradeLog: log.slice(0, 100),
      balance,
      lastScan,
      stats: {
        totalTrades: closed.length,
        wins, losses,
        winRate: winRate.toFixed(1),
        totalPnL: totalPnL.toFixed(2),
      },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message, serverBot: false });
  }
}
