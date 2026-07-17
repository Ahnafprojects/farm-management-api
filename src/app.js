import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/index.js';
import farmsRoutes from './routes/farms.routes.js';
import authRoutes from './routes/auth.routes.js';
import healthRoutes from './routes/health.routes.js';
import { generalLimiter, authLimiter } from './middlewares/rateLimiter.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.disable('x-powered-by');

app.use(helmet());

const allowedOrigins = config.corsOrigin.split(',').map((origin) => origin.trim());
app.use(
  cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
  }),
);

app.use(morgan(config.isProduction ? 'combined' : 'dev', { skip: () => config.isTest }));

app.use(express.json({ limit: '10kb' }));

app.use(generalLimiter);

app.use('/health', healthRoutes);
app.use('/auth', authLimiter, authRoutes);
app.use('/farms', farmsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
