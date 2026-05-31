# Database Initialization Guide

This document provides the SQL queries required to set up the database for WaSender in Supabase. These queries initialize the tables, enforce Row-Level Security (RLS), and create optimized indexes for performance.

## Prerequisites

1. Create a project in [Supabase](https://supabase.com/).
2. Open the **SQL Editor** in your Supabase dashboard.

## SQL Initialization Script

Run the following script to provision the tables, indexes, and RLS policies.

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
-- Stores user profile information, linked to auth.users
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (new.id, new.raw_user_meta_data->>'display_name');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. CONTACTS TABLE
-- Global contact records shared across all users
CREATE TABLE public.contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    comment TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'opted_out')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. TAGS TABLE
-- Global tagging system for contact segmentation
CREATE TABLE public.tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color_code TEXT DEFAULT '#3B82F6' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. CONTACT_TAGS (Join Table)
-- Relates global contacts to global tags
CREATE TABLE public.contact_tags (
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (contact_id, tag_id)
);

-- 5. WA_SESSIONS (Baileys DB Auth Store)
-- Secure storage for WhatsApp session authentication states (Private to User)
CREATE TABLE public.wa_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    session_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. MESSAGE_LOGS TABLE
-- Audit trail for all messaging attempts (Private to User)
CREATE TABLE public.message_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    phone_number TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'sent', 'failed')) NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- PERFORMANCE INDEXES
CREATE INDEX idx_contacts_phone ON public.contacts(phone_number);
CREATE INDEX idx_contact_tags_composite ON public.contact_tags(tag_id, contact_id);
CREATE INDEX idx_message_logs_user_status ON public.message_logs(user_id, status);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

-- CREATE RLS POLICIES

-- Profiles: Users can only manage their own profile
CREATE POLICY "Users can only manage their own profile" 
ON public.profiles FOR ALL USING (auth.uid() = id);

-- Contacts: Any authenticated user can manage global contacts
CREATE POLICY "Authenticated users can manage global contacts" 
ON public.contacts FOR ALL TO authenticated USING (true);

-- Tags: Any authenticated user can manage global tags
CREATE POLICY "Authenticated users can manage global tags" 
ON public.tags FOR ALL TO authenticated USING (true);

-- Contact Tags: Any authenticated user can manage joint records
CREATE POLICY "Authenticated users can manage joint records" 
ON public.contact_tags FOR ALL TO authenticated USING (true);

-- WA Sessions: Users can only manage their own session (Private)
CREATE POLICY "Users can only manage their own session" 
ON public.wa_sessions FOR ALL USING (auth.uid() = user_id);

-- Message Logs: Users can only view their own logs (Private)
CREATE POLICY "Users can only view their own logs" 
ON public.message_logs FOR ALL USING (auth.uid() = user_id);
```

## How it Works

- **Global Contacts & Tags:** The `contacts` and `tags` tables no longer have a `user_id` column. This allows all users in the system to share a single, unified database of contacts and categories.
- **Multi-Tenancy for Operations:** Messaging sessions (`wa_sessions`) and audit trails (`message_logs`) remain private. Each user only sees their own WhatsApp connection status and their own sending history.
- **Security:** RLS policies still require users to be authenticated via Supabase to access any data, even global ones.
- **Data Integrity:** The `UNIQUE` constraint on `contacts.phone_number` ensures no duplicate entries in the shared list.
