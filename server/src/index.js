import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import path from 'node:path';
import router from './routes.js';

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.56.1:5173'
  ],
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan('dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
app.use('/uploads', express.static(path.resolve('uploads'), { maxAge: '1h' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', dataMode: 'demo/manual', liveTelemetry: false }));
app.use('/api', router);
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
  if (err.code === 11000) return res.status(409).json({ message: 'A record with that identifier already exists.' });
  if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ message: 'Invalid JSON.' });
  res.status(500).json({ message: err.message?.includes('Only JPG') ? err.message : 'Server error. Check server logs.' });
});
const port = Number(process.env.PORT || 5000);
if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error('Set MONGO_URI and JWT_SECRET in server/.env');
  process.exit(1);
}
try {
  await mongoose.connect(process.env.MONGO_URI);
  app.listen(port, () => console.log(`GridWatch API listening on http://localhost:${port} (demo/manual data unless connected to a real source)`));
} catch (err) {
  console.error('MongoDB connection failed:', err.message);
  process.exit(1);
}
