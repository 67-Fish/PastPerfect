import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { logger } from './shared/utils/logger.js';
import { runMigrations } from './shared/database/migrate.js';
import { errorHandler } from './shared/middleware/errorHandler.js';
import { authenticate } from './shared/middleware/auth.js';
import { rateLimiters } from './shared/middleware/rateLimit.js';
import { setupWebSocket } from './shared/websocket/server.js';
import { startJobs } from './shared/jobs/scheduler.js';

// Route imports
import authRoutes from './modules/auth/routes.js';
import schoolRoutes from './modules/schools/routes.js';
import userRoutes from './modules/users/routes.js';
import paperRoutes from './modules/papers/routes.js';
import paymentRoutes from './modules/payments/routes.js';
import studyRoutes from './modules/study/routes.js';

// View routes
import viewRoutes from './routes/views.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: env.APP.URL,
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files - serve from src/public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    }, 'HTTP request');
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rate limiting
app.use('/api/auth', rateLimiters.auth);
app.use('/api', rateLimiters.api);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/schools', authenticate, schoolRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/papers', authenticate, paperRoutes);
app.use('/api/payments', authenticate, paymentRoutes);
app.use('/api/study', authenticate, studyRoutes);

// View Routes (SSR)
app.use('/', viewRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404);
  if (req.accepts('json')) {
    return res.json({ error: 'Not found' });
  }
  res.render('errors/404', { title: 'Page Not Found' });
});

// Error handler
app.use(errorHandler);

let server = null;

async function startServer() {
  try {
    // Run migrations
    await runMigrations();
    
    // Start HTTP server
    server = app.listen(env.PORT, () => {
      logger.info(`Server running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    });

    // Setup WebSocket
    setupWebSocket(server);
    
    // Start background jobs
    startJobs();

  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

async function shutdown() {
  logger.info('Shutting down...');
  
  if (server) {
    await new Promise((resolve) => {
      server.close(() => resolve());
    });
  }
  
  const { closePool } = await import('./shared/database/pool.js');
  await closePool();
  
  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer();

export default app;