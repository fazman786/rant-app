import { getConfig, saveConfig } from './lib/storage.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const config = await getConfig();
      return res.json({ status: 'ok', config });
    }

    if (req.method === 'POST') {
      const cronSecret = process.env.CRON_SECRET;
      const authHeader = req.headers.authorization;
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const updates = req.body;
      const current = await getConfig();
      const merged = { ...current, ...updates };
      await saveConfig(merged);
      return res.json({ status: 'ok', config: merged });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
