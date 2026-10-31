/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Full-Stack Express Server (Zero API Keys Required)
 */

import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Local Studio Status Endpoint (Zero API Keys Required)
  app.get('/api/status', (_req: Request, res: Response) => {
    res.json({
      studio: 'White Chocolate Studio',
      edition: '100-Spoke Lowrider Rap & R&B Edition',
      apiKeysRequired: false,
      obsBridgeReady: true,
      tiktokLiveReady: true,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`White Chocolate Studio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
