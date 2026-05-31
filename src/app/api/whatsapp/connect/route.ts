// src/app/api/whatsapp/connect/route.ts
import { NextRequest } from 'next/server';
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { useSupabaseAuthStore } from '@/lib/whatsapp/dbAuthStore';

// In-Memory Socket Map for global connection tracking
// @ts-ignore
global.activeSockets = global.activeSockets || new Map();

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // Close existing socket if any to prevent "Connection Failure" conflicts
  // @ts-ignore
  const existingSock = global.activeSockets.get(user.id);
  if (existingSock) {
    console.log(`Cleaning up existing socket for user ${user.id}`);
    // Remove all listeners so they don't try to write to the old stream
    existingSock.ev.removeAllListeners('connection.update');
    existingSock.ev.removeAllListeners('creds.update');
    existingSock.end(undefined);
    // @ts-ignore
    global.activeSockets.delete(user.id);
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();
  let isStreamClosed = false;

  const sendSSE = (event: string, data: string) => {
    if (isStreamClosed) return;
    try {
      writer.write(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
    } catch (e) {
      console.error('SSE Write Error:', e);
      isStreamClosed = true;
    }
  };

  const closeStream = () => {
    if (isStreamClosed) return;
    isStreamClosed = true;
    writer.close().catch(() => {});
  };

  // Instantiate Baileys Connection using Database state store
  const { state, saveCreds } = await useSupabaseAuthStore(supabase, user.id);

  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Starting Baileys for user ${user.id} using version v${version.join('.')}${isLatest ? ' (latest)' : ''}`);

  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  // @ts-ignore
  global.activeSockets.set(user.id, sock);

  sock.ev.on('creds.update', async () => {
    console.log(`Creds update for user ${user.id}`);
    await saveCreds();
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`QR generated for user ${user.id}`);
      sendSSE('qr', qr);
    }

    if (connection === 'open') {
      console.log(`Connection opened for user ${user.id}`);
      sendSSE('status', 'connected');
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      console.log(`Connection closed for user ${user.id} with status ${statusCode}`);

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log(`Attempting to reconnect for user ${user.id}...`);
        sendSSE('status', 'retry_now');
        closeStream();
      } else {
        sendSSE('status', 'disconnected');
        // @ts-ignore
        global.activeSockets.delete(user.id);
        closeStream();
      }
    }
  });

  // Handle stream close (client disconnect)
  req.signal.onabort = () => {
    console.log(`Client aborted SSE for user ${user.id}`);
    isStreamClosed = true;
    // We keep the socket alive in global.activeSockets, but stop streaming
    writer.close().catch(() => {});
  };

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

