// src/workers/senderWorker.ts
import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

let worker: Worker | null = null;

export function initWorker() {
  if (worker) return;

  console.log('Initializing Bulk Sender Worker...');

  worker = new Worker('bulk-sender', async (job: Job) => {
    const { userId, contacts, template } = job.data;
    
    // Extract active socket reference from memory map
    // @ts-ignore
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
    }
    
    console.log(`[Worker] Finished job for user ${userId}`);
  }, {
    connection: { 
      host: process.env.REDIS_HOST || 'localhost', 
      port: parseInt(process.env.REDIS_PORT || '6379') 
    },
    concurrency: 1 // One job at a time per worker instance to maintain cadence
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });

  console.log('Worker initialized and listening for jobs.');
}
