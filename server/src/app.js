const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const CLIENT_DIST = path.resolve(__dirname, '..', '..', 'client', 'dist');

function requestLogger(req, res, next) {
  const started = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started} ms)`);
  });
  next();
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((s) => s.trim()),
    })
  );
  app.use(express.json({ limit: '200kb' }));
  if (!config.isTest) app.use(requestLogger);

  // ---- API ----
  app.use('/api', publicRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', notFound);

  // ---- Website (React build) ----
  // After "npm run build" the compiled React app in client/dist is served
  // from this same server, so one process serves both the API and the site.
  if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
    app.use(express.static(CLIENT_DIST, { index: false }));
    app.get('*', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
  } else {
    app.get('/', (req, res) => {
      res.json({
        message: 'Pizza shop API is running. Run "npm run build" to serve the website from here too.',
        health: '/api/health',
      });
    });
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
