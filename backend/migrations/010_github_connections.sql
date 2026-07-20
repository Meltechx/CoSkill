-- GitHub OAuth access tokens are only available from Supabase during the
-- callback. Keep them in a backend-only table for the GitHub workspace API.
create table if not exists public.github_connections (
    user_id uuid primary key references public.users(id) on delete cascade,
    access_token text not null,
    updated_at timestamptz not null default now()
);

alter table public.github_connections enable row level security;

-- Deliberately no user-facing policy: only the backend service-role client
-- reads or writes OAuth tokens.
