import { Queue, ConnectionOptions } from 'bullmq';

export const redisConnection: ConnectionOptions = process.env.REDIS_URL 
  ? { 
      url: process.env.REDIS_URL, 
      tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
      maxRetriesPerRequest: null
    }
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null
    };

declare global {
  var messageQueue: Queue | undefined;
}

export const messageQueue = global.messageQueue || new Queue('bulk-sender', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

if (process.env.NODE_ENV !== 'production') {
  global.messageQueue = messageQueue;
}
