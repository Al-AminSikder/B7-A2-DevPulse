import express, { Application } from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import issueRoutes from './modules/issues/issues.routes';
import { errorHandler } from './middleware/error.middleware';

const app: Application = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.status(200).json({ status: 'healthy', project: 'DevPulse API Engine' });
});

app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Requested API endpoint location was not discovered.' });
});

app.use(errorHandler);

export default app;