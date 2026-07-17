import express from 'express';
import farmsRoutes from './routes/farms.routes.js';
import healthRoutes from './routes/health.routes.js';

const app = express();

app.use(express.json());

app.use('/health', healthRoutes);
app.use('/farms', farmsRoutes);

export default app;
