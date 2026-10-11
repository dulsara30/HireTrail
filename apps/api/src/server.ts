import { app } from './app';
import { config } from './config/config';
import { connectDatabase } from './core/db/connection';
import { logger } from './core/logger/logger';

async function bootstrap() {
  try {
    await connectDatabase(config.mongodbUri, config.mongodbDbName);
    app.listen(config.port, () => {
      logger.info(`HireTrail API server running on port ${config.port} (${config.appEnv})`);
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to start HireTrail API server');
    process.exit(1);
  }
}

bootstrap();
