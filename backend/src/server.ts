import app from './app';
import { config } from './config';
import { prisma } from './database';
import { attachRealtime } from './realtime';

const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
const io = attachRealtime(server);

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down gracefully`);
  await io.close(); // ferme aussi le serveur HTTP
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
