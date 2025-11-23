import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { CatanRoom } from './rooms/CatanRoom';

const PORT = Number(process.env.PORT || 2567);

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../../../../dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = createServer(app);

  const gameServer = new Server({
    transport: new WebSocketTransport({
      server: httpServer
    })
  });

  gameServer.define('catan', CatanRoom);

  await gameServer.listen(PORT);
  console.log(`🚀 Colyseus server listening on ws://localhost:${PORT}`);
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
