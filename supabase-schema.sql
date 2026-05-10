-- 1. TABLES SETUP
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
  key_entities text,
  created_at timestamptz not null default now()
);

-- 2. SECURITY & PERMISSIONS (Crucial for Backend Access)

-- Disable Row Level Security (RLS) so the Node.js server can write data
alter table public.conversations disable row level security;
alter table public.messages disable row level security;
alter table public.ai_outputs disable row level security;

-- Grant all permissions to the service_role (the key your server uses)
grant all on table public.conversations to service_role;
grant all on table public.messages to service_role;
grant all on table public.ai_outputs to service_role;

-- Grant permission to the ID counter (sequence) for the ai_outputs table
GRANT USAGE, SELECT ON SEQUENCE public.ai_outputs_id_seq TO service_role;

-- Ensure the worker can use all sequences in the public schema
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;