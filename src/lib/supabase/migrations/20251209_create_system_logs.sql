-- Create system_logs table for persistent error tracking
create table if not exists system_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  level text default 'error', -- 'info', 'warn', 'error', 'bof'
  message text not null,
  details jsonb, -- Stores contextual data (stack trace, inputs, etc.)
  user_id uuid, -- Optional: link to auth.users
  path text, -- Optional: URL path where error occurred
  environment text default 'production'
);

-- Enable RLS
alter table system_logs enable row level security;

-- Policy: Allow inserts from authenticated users and service role
create policy "Enable insert for authenticated users" 
on system_logs for insert 
to authenticated, service_role 
with check (true);

-- Policy: Allow select only for service_role (admins) to prevent leaking logs
create policy "Enable select for admins only" 
on system_logs for select 
to service_role 
using (true);
