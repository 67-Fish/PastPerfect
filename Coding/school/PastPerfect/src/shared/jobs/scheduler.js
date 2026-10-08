import { logger } from '../utils/logger.js';
import cron from 'node-cron';
import { query, execute } from '../database/pool.js';

const jobs = [
  {
    name: 'cleanupExpiredTokens',
    schedule: '0 3 * * *', // Daily at 3 AM
    enabled: true,
    handler: async () => {
      logger.info('Running cleanupExpiredTokens job');
      const result = await execute(
        `DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL`
      );
      logger.info({ deleted: result.affectedRows }, 'Expired tokens cleaned up');
    },
  },
  {
    name: 'cleanupOldSessions',
    schedule: '0 4 * * 0', // Weekly on Sunday at 4 AM
    enabled: true,
    handler: async () => {
      logger.info('Running cleanupOldSessions job');
      const result = await execute(
        `DELETE FROM study_sessions 
         WHERE status = 'abandoned' 
         AND started_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`
      );
      logger.info({ deleted: result.affectedRows }, 'Old abandoned sessions cleaned up');
    },
  },
  {
    name: 'sendPendingNotifications',
    schedule: '*/5 * * * *', // Every 5 minutes
    enabled: true,
    handler: async () => {
      logger.debug('Checking for pending notifications');
      // Placeholder for notification sending logic
    },
  },
];

let scheduledJobs = new Map();

export function startJobs() {
  for (const job of jobs) {
    if (!job.enabled) continue;
    
    const task = cron.schedule(job.schedule, async () => {
      try {
        await job.handler();
      } catch (error) {
        logger.error({ err: error, job: job.name }, 'Job failed');
      }
    }, {
      scheduled: true,
      timezone: 'UTC',
    });
    
    scheduledJobs.set(job.name, task);
    logger.info({ job: job.name, schedule: job.schedule }, 'Job scheduled');
  }
}

export function stopJobs() {
  for (const [name, task] of scheduledJobs.entries()) {
    task.stop();
    logger.info({ job: name }, 'Job stopped');
  }
  scheduledJobs.clear();
}

export function runJobNow(name) {
  const job = jobs.find(j => j.name === name);
  if (!job) {
    throw new Error(`Job ${name} not found`);
  }
  return job.handler();
}

export function getJobStatus() {
  return jobs.map(j => ({
    name: j.name,
    schedule: j.schedule,
    enabled: j.enabled,
  }));
}