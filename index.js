import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

import passport from 'passport';
import { fileURLToPath } from 'url';
import path from 'path';

// Load env FIRST before anything else
dotenv.config();

import { connectDB } from './utils/db.js';
import processRoute from './routes/process.js';
import statusRoute from './routes/status.js';
import authRoute, { initGoogleStrategy } from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
await connectDB();

// Init Google OAuth AFTER dotenv loaded
initGoogleStrategy();

app.use(cors({
  origin: [
    'http://localhost:5173',
    process.env.CLIENT_URL,
  ],
  credentials: true,
}));

app.use(express.json());
app.use(passport.initialize());

app.use('/outputs', express.static(path.join(__dirname, 'outputs')));

app.use('/api/auth', authRoute);
app.use('/api/process', processRoute);
app.use('/api/status', statusRoute);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ReelSmith is running 🔥' });
});

app.listen(PORT, () => {
  console.log(`🔨 ReelSmith server running on http://localhost:${PORT}`);
});
