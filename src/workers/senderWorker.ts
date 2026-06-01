// src/workers/senderWorker.ts
import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { redisConnection } from '@/lib/queue';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

declare global {
  var senderWorker: Worker | undefined;
}

export function initWorker() {
  if (global.senderWorker) return;

  console.log('Initializing Bulk Sender Worker...');

  const worker = new Worker('bulk-sender', async (job: Job) => {
    const { userId, contacts, template } = job.data;
    
    const userSocket = global.activeSockets?.get(userId);
    
    if (!userSocket) {
      console.error(`[Worker] No active socket for user ${userId}`);
      throw new Error(`WhatsApp socket session uninitialized for client token: ${userId}`);
    }

    console.log(`[Worker] Starting send job for user ${userId}, ${contacts.length} contacts.`);

    for (const contact of contacts) {
      const customizedMessage = template.replace('{{name}}', contact.display_name);
      const jid = `${contact.phone_number.replace('+', '').replace(/\s/g, '')}@s.whatsapp.net`;

      try {
        console.log(`[Worker] Sending message to ${jid}`);
        await userSocket.sendMessage(jid, { text: customizedMessage });
        
        await supabase.from('message_logs').insert({
          user_id: userId,
          phone_number: contact.phone_number,
          status: 'sent'
        });
      } catch (err: any) {
        console.error(`[Worker] Failed to send to ${contact.phone_number}:`, err.message);
        await supabase.from('message_logs').insert({
          user_id: userId,
          phone_number: contact.phone_number,
          status: 'failed',
          error_message: err.message
        });
      }

      // Randomized anti-spam delay: 10-30 seconds
      const cooldown = Math.floor(Math.random() * (30000 - 10000 + 1)) + 10000;
      console.log(`[Worker] Sleeping for ${cooldown/1000}s...`);
      await delay(cooldown);
    }
    
    console.log(`[Worker] Finished job for user ${userId}`);
  }, {
    connection: redisConnection,
    concurrency: 1 
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });

  global.senderWorker = worker;
  console.log('Worker initialized and listening for jobs.');
}
