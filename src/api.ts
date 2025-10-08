import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './logger.js';

// Import CommonJS modules
const { extractPlayers } = require('../extract-players.js');
const { extractMatchData } = require('../complete-match-structured.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Extract players endpoint
app.get('/api/players', async (req, res) => {
  try {
    logger.info('API: Starting player extraction');
    const players = await extractPlayers();
    res.json({
      success: true,
      data: players,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('API: Player extraction failed', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Extract match data endpoint
app.post('/api/match', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Match URL is required',
        timestamp: new Date().toISOString()
      });
    }

    logger.info('API: Starting match extraction', { url });
    const matchData = await extractMatchData(url);
    res.json({
      success: true,
      data: matchData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('API: Match extraction failed', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('API: Unhandled error', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`);
  console.log(`🚀 Cricket Scraper API running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/health`);
});

export default app;
