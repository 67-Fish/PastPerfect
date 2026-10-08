import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { logger } from '../utils/logger.js';

const clients = new Map();

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(4001, 'Authentication required');
        return;
      }

      let payload;
      try {
        payload = jwt.verify(token, env.JWT.ACCESS_SECRET);
      } catch (err) {
        ws.close(4001, 'Invalid token');
        return;
      }

      if (payload.type !== 'access') {
        ws.close(4001, 'Invalid token type');
        return;
      }

      ws.userId = payload.sub;
      ws.schoolId = payload.schoolId;
      ws.roles = payload.roles || [];
      ws.isAlive = true;

      // Register client
      if (!clients.has(ws.schoolId)) {
        clients.set(ws.schoolId, new Set());
      }
      clients.get(ws.schoolId).add(ws);

      logger.info({ userId: ws.userId, schoolId: ws.schoolId }, 'WebSocket connected');

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          handleMessage(ws, message);
        } catch (err) {
          logger.warn({ err }, 'Invalid WebSocket message');
        }
      });

      ws.on('close', () => {
        const schoolClients = clients.get(ws.schoolId);
        if (schoolClients) {
          schoolClients.delete(ws);
          if (schoolClients.size === 0) {
            clients.delete(ws.schoolId);
          }
        }
        logger.info({ userId: ws.userId }, 'WebSocket disconnected');
      });

      ws.on('error', (err) => {
        logger.error({ err, userId: ws.userId }, 'WebSocket error');
      });

      // Send welcome message
      ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));

    } catch (error) {
      logger.error({ err: error }, 'WebSocket connection error');
      ws.close(4000, 'Internal error');
    }
  });

  // Heartbeat
  const interval = setInterval(() => {
    for (const [schoolId, schoolClients] of clients.entries()) {
      for (const ws of schoolClients) {
        if (ws.isAlive === false) {
          ws.terminate();
          schoolClients.delete(ws);
          continue;
        }
        ws.isAlive = false;
        ws.ping();
      }
      if (schoolClients.size === 0) {
        clients.delete(schoolId);
      }
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  logger.info('WebSocket server initialized');
}

function handleMessage(ws, message) {
  switch (message.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;
    case 'subscribe':
      // Handle channel subscriptions if needed
      break;
    default:
      logger.debug({ message }, 'Unknown WebSocket message type');
  }
}

export function broadcastToSchool(schoolId, event, data) {
  const schoolClients = clients.get(schoolId);
  if (!schoolClients) return;

  const message = JSON.stringify({ type: event, data, timestamp: new Date().toISOString() });
  
  for (const ws of schoolClients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

export function broadcastToRole(schoolId, role, event, data) {
  const schoolClients = clients.get(schoolId);
  if (!schoolClients) return;

  const message = JSON.stringify({ type: event, data, timestamp: new Date().toISOString() });
  
  for (const ws of schoolClients) {
    if (ws.readyState === WebSocket.OPEN && ws.roles?.includes(role)) {
      ws.send(message);
    }
  }
}

export function broadcastToAll(event, data) {
  const message = JSON.stringify({ type: event, data, timestamp: new Date().toISOString() });
  
  for (const [_, schoolClients] of clients.entries()) {
    for (const ws of schoolClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }
}

export function getConnectedClientsCount(schoolId) {
  if (schoolId) {
    return clients.get(schoolId)?.size || 0;
  }
  let count = 0;
  for (const [_, schoolClients] of clients.entries()) {
    count += schoolClients.size;
  }
  return count;
}