-- Supabase schema for message ingestion

create table if not exists public.conversations (
  conversation_id text primary key,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  message_id text primary key,
  conversation_id text not null references public.conversations(conversation_id),
  direction text not null,
  content text not null,
  timestamp timestamptz not null,
  processed boolean not null default false
);

create table if not exists public.ai_outputs (
  id serial primary key,
  conversation_id text not null references public.conversations(conversation_id),
  summary text,
  requirements text,
  business_requirements text,
  next_steps text,
  lead_status text,
  key_entities text
  created_at timestamptz not null default now()
);
