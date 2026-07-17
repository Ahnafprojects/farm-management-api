import app from './app.js';
import './db/schema.js';
import { config } from './config/index.js';

const server = app.listen(config.port, () => {
  console.log(`Farm Management API listening on port ${config.port} (${config.nodeEnv})`);
});

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close((err) => {
    if (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default server;
