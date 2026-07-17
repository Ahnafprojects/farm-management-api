import express from 'express';
import farmsRoutes from './routes/farms.routes.js';
import healthRoutes from './routes/health.routes.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(express.json());

app.use('/health', healthRoutes);
app.use('/farms', farmsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
