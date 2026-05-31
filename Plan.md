Here is a comprehensive, conceptual overview of how all these puzzle pieces fit together. This breakdown explains the macro architecture, data flows, and why this specific stack keeps your system fast, multi-tenant secure, and resistant to WhatsApp bans.

---

## 📐 The Macro Architecture

This platform splits its responsibilities across three core layers: the **Client Interface**, the **API Gateway/State Machine**, and the **Isolated Background Processing Layer**.

```
                                  +-------------------+
                                  |  Next.js Frontend |
                                  +---------+---------+
                                            |
                         HTTPS Post / SSE   |   Secure Session Auth
                                            v
                                  +-------------------+
                                  | Supabase Backend  | <----+ (RLS Policies)
                                  +---------+---------+      |
                                            |                |
                       Queue Enqueue        |                | Read/Write
                       (Data Payload)       v                | State Data
                                    +---------------+        |
                                    | Redis Engine  |        |
                                    +-------+-------+        |
                                            |                |
                                            v                |
                                  +-------------------+      |
                                  |   BullMQ Worker   |------+
                                  +---------+---------+
                                            |
                                            | (Baileys Socket Instance)
                                            v
                                    [ WhatsApp Web ]

```

### 1. The Frontend Layer (Next.js 14)

* **Responsibility:** Renders the minimalist, high-contrast dashboard, manages the stacked search filter views, and displays real-time connection status.
* **Communication:** It talks to the API via traditional REST calls for data mutations, but uses a continuous **Server-Sent Events (SSE)** channel when displaying the WhatsApp setup screen to live-stream the QR code strings directly from the running backend node.

### 2. The Identity & Storage Engine (Supabase)

* **Responsibility:** Handles user authentication (Magic Links) and stores all operational business data.
* **The Security Secret (RLS):** By mapping every query through Supabase Row-Level Security, the database itself guarantees multi-tenancy. Even if a bug in your application layer accidentally exposes a global route, the database will refuse to return data unless the `auth.uid()` match checks out.

### 3. The Automation & Queue Worker (BullMQ + Baileys)

* **Responsibility:** Maintains persistent connections to WhatsApp servers and processes mass-sending loops.
* **Why split this off?** Web application routes (like Next.js API paths) are stateless and ephemeral; they cut off after a few seconds. Sending 500 messages with intentional 20-second delays takes over two hours. BullMQ acts as an independent process that safely preserves the execution context over long time frames, long after the browser window is closed.

---

## 🔄 Core Data Workflows

### Phase A: The Authentication Loop (Connecting to WhatsApp)

```
[UI Component]                [Next.js API Route]              [Supabase DB]
      |                                |                             |
      |--- 1. Request Connection ----->|                             |
      |                                |--- 2. Fetch Stored Session->|
      |                                |<- 3. Return Credentials ----|
      |                                |                             |
      |                                | [Instantiate Baileys Sock]  |
      |                                |                             |
      |<- 4. Stream QR via SSE --------|                             |
      |    (If unauthenticated)        |                             |
      |                                |                             |
      | [Scan QR via Mobile Device]    |                             |
      |                                |--- 5. Encrypt & Save State->|
      |<-- 6. Stream "Connected" ------|                             |

```

1. The dashboard client requests a connection event.
2. The route handler checks `wa_sessions` in Supabase for preexisting authentication matrices.
3. If no session is found, Baileys generates a text-based cryptographic string. The API route passes this string down the open **SSE stream** to the client, which projects it visually as a standard QR code.
4. When you scan the code on your phone, WhatsApp validates the device. Baileys detects this change, intercepts the raw authentication tokens, encrypts the payload, and saves it in your database's `wa_sessions` slot.

### Phase B: The Bulk Campaign Execution Loop

```
[UI Component]                [Next.js API Route]               [Redis Queue]
      |                                |                             |
      |--- 1. Submit Campaign Payload ->|                             |
      |    (Filters + Template text)   |                             |
      |                                |--- 2. Compute Segment ----->|
      |                                |                             |
      |                                |--- 3. Push Bulk Job Data -->|
      |<-- 4. Confirm Queue Success ---|                             |

```

1. The user picks their targeted attributes (e.g., Tag: `Lead`, Country: `LK`), inputs a template text string (`Hi {{name}}`), and clicks **Send**.
2. The Next.js API evaluates the filter, aggregates the matching list of phone numbers, and inserts a single bulk entry payload containing the targeted list into your **Redis instance**.
3. A **BullMQ Worker** running inside a persistent host architecture picks up the task ticket. It initiates the sending pipeline sequentially:
* It reads the specific contact row details.
* It replaces the `{{name}}` string dynamically with the targeted contact's real identity name.
* It pulls the live active socket pointer for that client user.
* It fires off the payload across the socket interface to WhatsApp's server gateway.
* It notes down a successful/failed row item in your `message_logs` ledger.
* It calculates a random value between 10,000ms and 30,000ms, puts its current execution thread to sleep, and wakes up to repeat the loop until the target segment is fully processed.



---

## 🔒 Multi-Tenant Data Isolation Strategy

To maximize system security and performance, structural isolation boundaries are built directly into your physical schema layouts across three dimensions:

| Layer Boundary | Isolation Pattern | Protective Mechanism |
| --- | --- | --- |
| **Relational Data** | Tenant Isolation via Row-Level Security | **Supabase Engine Constraints:** Every operational entity table features a mandatory `user_id UUID` column bound directly back to `auth.users`. Database-enforced RLS filtering rules prevent structural data leaks across users. |
| **Memory Isolation** | Explicit Process Sockets Caching | **Global Runtime Storage Map:** WebSocket pointers are separated at runtime by allocating individual user instances within an in-memory string-mapped key-value dictionary schema object (`global.activeSockets.get(userId)`). |
| **Worker Concurrency** | Sequence Pipeline Scheduling | **Single-Worker Loop Design:** The BullMQ processing architecture executes sequential loops for individual send jobs. This structure enforces a predictable sending cadence and avoids sudden spikes in outbound web traffic. |

## 📂 Phase 1: Database Schema & Multi-Tenant RLS

Run this SQL script in your Supabase SQL editor. It provisions all 6 
tables, enforces strict Row-Level Security (RLS) isolation by linking data 
to `auth.users`, and builds optimized indexes for the stacked tag 
filtering engine.

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, 
NOW()) NOT NULL
);

-- 2. CONTACTS TABLE
CREATE TABLE public.contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    phone_number TEXT NOT NULL,
    display_name TEXT NOT NULL,
    country_code TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'opted_out')) 
NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, 
NOW()) NOT NULL,
    UNIQUE(user_id, phone_number)
);

-- 3. TAGS TABLE
CREATE TABLE public.tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color_code TEXT DEFAULT '#3B82F6' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, 
NOW()) NOT NULL,
    UNIQUE(user_id, name)
);

-- 4. CONTACT_TAGS (Join Table)
CREATE TABLE public.contact_tags (
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT 
NULL,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (contact_id, tag_id)
);

-- 5. WA_SESSIONS (Baileys DB Auth Store)
CREATE TABLE public.wa_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL 
UNIQUE,
    session_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, 
NOW()) NOT NULL
);

-- 6. MESSAGE_LOGS TABLE
CREATE TABLE public.message_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    phone_number TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'sent', 'failed')) NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) 
NOT NULL
);

-- PERFORMANCE INDEXES
CREATE INDEX idx_contacts_user_phone ON public.contacts(user_id, 
phone_number);
CREATE INDEX idx_contact_tags_composite ON public.contact_tags(tag_id, 
contact_id);
CREATE INDEX idx_message_logs_user_status ON public.message_logs(user_id, 
status);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

-- CREATE RLS POLICIES (Example: Contacts)
CREATE POLICY "Users can only manage their own contacts" 
ON public.contacts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only manage their own tags" 
ON public.tags FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only manage their own joint records" 
ON public.contact_tags FOR ALL USING (
    EXISTS (SELECT 1 FROM public.contacts WHERE id = contact_id AND 
user_id = auth.uid())
);

CREATE POLICY "Users can only manage their own session" 
ON public.wa_sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only view their own logs" 
ON public.message_logs FOR ALL USING (auth.uid() = user_id);

```

---

## 🛠️ Phase 2: Next.js Stack Setup & Middleware

Initialize your directory structure and secure your routes. This 
architecture isolates your frontend layout and guards backend mutations 
using standard middleware tokens.

```
├── src/
│   ├── app/
│   │   ├── auth/            # Login, Magic Link entrypoints
│   │   ├── dashboard/       # Protected workspace layout
│   │   │   ├── contacts/    # Contact view & stacked filter 
component
│   │   │   └── settings/    # QR Code generation engine
│   │   └── api/
│   │       ├── contacts/    # Filtering and mutation API
│   │       ├── tags/        # Tag handling CRUD endpoints
│   │       └── whatsapp/    # Real-time Server-Sent Events QR 
endpoint
│   ├── middleware.ts        # Route authentication guard
│   └── lib/
│       └── supabase.ts      # Instantiated Supabase Client

```

### The Authentication Guard Middleware

Create this file at `src/middleware.ts` to ensure users who aren't logged 
in get bounced cleanly to the `/auth` interface before hitting any data 
components.

```typescript
// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  // Redirect to login if accessing dashboard without a session
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};

```

---

## 🔌 Phase 3: The Custom Baileys Database Auth Store

Baileys inherently wants to write session credentials to the local file 
system. This adapter maps the Baileys internal `AuthenticationState` 
directly to your multi-tenant Supabase database instance, ensuring 
absolute state permanence.

```typescript
// src/lib/whatsapp/dbAuthStore.ts
import { AuthenticationState, AuthenticationCreds, BufferJSON, 
initAuthCreds } from '@whiskeysockets/baileys';
import { SupabaseClient } from '@supabase/supabase-js';

export async function useSupabaseAuthStore(supabase: SupabaseClient, 
userId: string): Promise<{ state: AuthenticationState, saveCreds: () => 
Promise<void> }> {
  
  // 1. Fetch existing session data from Supabase
  const { data } = await supabase
    .from('wa_sessions')
    .select('session_data')
    .eq('user_id', userId)
    .single();

  let creds: AuthenticationCreds;
  let keys: any = {};

  if (data?.session_data) {
    const parsed = JSON.parse(data.session_data, BufferJSON.reviver);
    creds = parsed.creds;
    keys = parsed.keys || {};
  } else {
    creds = initAuthCreds();
  }

  return {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const data: any = {};
          for (const id of ids) {
            data[id] = keys[`${type}-${id}`];
          }
          return data;
        },
        set: (data) => {
          for (const type in data) {
            for (const id in data[type]) {
              const val = data[type][id];
              if (val === null) {
                delete keys[`${type}-${id}`];
              } else {
                keys[`${type}-${id}`] = val;
              }
            }
          }
        }
      }
    },
    saveCreds: async () => {
      const sessionString = JSON.stringify({ creds, keys }, 
BufferJSON.replacer);
      await supabase
        .from('wa_sessions')
        .upsert({ 
          user_id: userId, 
          session_data: sessionString,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    }
  };
}

```

---

## ⚡ Phase 4: QR Streaming via Server-Sent Events (SSE)

This API route establishes an isolated socket instance per user, streams 
authentication credentials directly to the browser view via low-overhead 
Server-Sent Events, and caches live socket pointers in memory.

```typescript
// src/app/api/whatsapp/connect/route.ts
import { NextRequest } from 'next/server';
import makeWASocket, { DisconnectReason } from '@whiskeysockets/baileys';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { useSupabaseAuthStore } from '@/lib/whatsapp/dbAuthStore';

// In-Memory Socket Map for global connection tracking
global.activeSockets = global.activeSockets || new Map();

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendSSE = (event: string, data: string) => {
    writer.write(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
  };

  // Instantiate Baileys Connection using Database state store
  const { state, saveCreds } = await useSupabaseAuthStore(supabase, 
user.id);
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  global.activeSockets.set(user.id, sock);

  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      sendSSE('qr', qr);
    }
    
    if (connection === 'open') {
      sendSSE('status', 'connected');
      writer.close();
    }
    
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as 
any)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        sendSSE('status', 'reconnecting');
      } else {
        sendSSE('status', 'disconnected');
        writer.close();
      }
    }
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

```

---

## 🧠 Phase 5: The Advanced Stacked Filter Engine

To power complex filtering logic ("Contacts tagged with *both* VIP and 
Lead who live in Sri Lanka"), use this raw query framework to filter 
contacts via strict relational counting logic.

```typescript
// src/app/api/contacts/filter/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { tags, countryCode, status } = await req.json(); // tags is array 
of UUIDs

  let query = supabase
    .from('contacts')
    .select(`
      id, phone_number, display_name, country_code, status,
      contact_tags!inner(tag_id)
    `);

  if (status) query = query.eq('status', status);
  if (countryCode) query = query.eq('country_code', countryCode);
  
  // Handle complex strict AND tag intersection logic
  if (tags && tags.length > 0) {
    query = query.in('contact_tags.tag_id', tags);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 
500 });

  // Post-filter to assert client-side strict relational intersection (AND 
Logic verification)
  const filteredData = data.filter((contact: any) => {
    const contactTagIds = contact.contact_tags.map((t: any) => t.tag_id);
    return tags.every((requiredTagId: string) => 
contactTagIds.includes(requiredTagId));
  });

  return NextResponse.json({ contacts: filteredData });
}

```

---

## 🎛️ Phase 6: BullMQ Bulk Message Queue Worker

This backend worker isolated script processes your background processing 
list sequentially. It injects template variables, references the stored 
socket map, fires messages natively, and runs a randomized 
$10\text{--}30\text{ s}$ sleep block to match natural human cadence.

```typescript
// src/workers/senderWorker.ts
import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, 
process.env.SUPABASE_SERVICE_ROLE_KEY!);
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const worker = new Worker('bulk-sender', async (job: Job) => {
  const { userId, contacts, template } = job.data;
  
  // Extract active socket reference from memory map
  const userSocket = global.activeSockets?.get(userId);
  if (!userSocket) {
    throw new Error(`WhatsApp socket session uninitialized for client 
token: ${userId}`);
  }

  for (const contact of contacts) {
    // Check global campaign cancellation token or state modifications 
here if needed
    const customizedMessage = template.replace('{{name}}', 
contact.display_name);
    const jid = `${contact.phone_number.replace('+', '')}@s.whatsapp.net`;

    try {
      await userSocket.sendMessage(jid, { text: customizedMessage });
      
      await supabase.from('message_logs').insert({
        user_id: userId,
        phone_number: contact.phone_number,
        status: 'sent'
      });
    } catch (err: any) {
      await supabase.from('message_logs').insert({
        user_id: userId,
        phone_number: contact.phone_number,
        status: 'failed',
        error_message: err.message
      });
    }

    // Dynamic anti-spam protection: Human-like delay calculated per 
transmission
    const randomCooldown = Math.floor(Math.random() * (30000 - 10000 + 1)) 
+ 10000;
    await delay(randomCooldown);
  }
}, {
  connection: { host: process.env.REDIS_HOST, port: 
parseInt(process.env.REDIS_PORT || '6379') }
});

```

---

## 🚀 The Deployment Checklist

To put this live without runtime crashes, ensure your hosting topology 
supports these parameters:

* **Persistent Process Execution:** Do **not** deploy the BullMQ backend 
worker file inside standard serverless platforms (like Vercel Functions). 
Vercel routes timeout after 15–30 seconds. Run your worker process in a 
persistent container platform (like Render, Railway, or AWS ECS) so the 
execution thread remains alive during long sending windows.
* **Max Connections Tuning:** Set up connection pooling via Supabase 
connection parameters (`pool_mode=transaction`) to prevent thousands of 
background queue events from overwhelming database limits.
