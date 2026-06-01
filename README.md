# WaSender

WaSender is a high-performance, multi-tenant WhatsApp mass-sending platform. It is designed for businesses to manage bulk messaging campaigns with human-like behavior, ensuring high delivery rates and resistance to WhatsApp bans.

## 🚀 Features

- **Multi-Tenant Architecture:** Secure data isolation using Supabase Row-Level Security (RLS).
- **Human-Like Sending:** Randomized delays between messages to mimic human behavior and reduce ban risks.
- **Real-time Connectivity:** Stream WhatsApp QR codes directly to the dashboard using Server-Sent Events (SSE).
- **Bulk Messaging:** Efficient queue management using BullMQ and Redis for large-scale campaigns.
- **Global Contact Management:** Shared contact and tag system for streamlined segmentation.
- **Detailed Analytics:** Audit trails and message logs for every campaign.

## 🛠️ Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS)
- **Messaging Queue:** [BullMQ](https://docs.bullmq.io/) & [Redis](https://redis.io/)
- **WhatsApp Integration:** [Baileys](https://github.com/WhiskeySockets/Baileys)
- **Styling:** Tailwind CSS

## 📋 Prerequisites

- **Node.js:** v18 or higher
- **Redis:** A running instance (local or hosted)
- **Supabase:** A project created on Supabase.com

## ⚙️ Getting Started

### 1. Clone the repository
```bash
git clone <repository-url>
cd WaSender
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory and add the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### 4. Database Setup
Execute the SQL schema found in `docs/database_setup.md` or `Plan.md` within your Supabase SQL Editor to provision the necessary tables and RLS policies.

### 5. Run the Application

Start the Next.js development server:
```bash
npm run dev
```

Start the background worker (ensure Redis is running):
```bash
# Currently under development. See src/workers/senderWorker.ts
```

## 📂 Project Structure

```text
src/
├── app/              # Next.js App Router (Pages & API Routes)
│   ├── api/          # Backend API endpoints (WhatsApp, Contacts)
│   ├── auth/         # Authentication flow
│   └── dashboard/    # Protected user workspace
├── components/       # Reusable UI components
├── lib/              # Core logic & library integrations (Supabase, WhatsApp)
├── types/            # TypeScript definitions
└── workers/          # BullMQ background workers
```

## 🛡️ Development Conventions

- **Security:** Always use Supabase RLS for multi-tenant isolation. Private data like `wa_sessions` must always be scoped to `auth.uid()`.
- **Anti-Ban:** Maintain a randomized delay (10-30 seconds) between outgoing messages.
- **Stateless/Stateful:** Next.js handles stateless API requests, while the background worker maintains persistent WhatsApp socket connections.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
