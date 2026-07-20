-- Team matching profile fields
alter table public.users
  add column if not exists bio text,
  add column if not exists skills text[] default '{}',
  add column if not exists technologies text[] default '{}',
  add column if not exists experience_level text default 'mid'
    check (experience_level in ('junior', 'mid', 'senior', 'lead')),
  add column if not exists github_url text,
  add column if not exists linkedin_url text,
  add column if not exists work_preferences text[] default '{}',
  add column if not exists team_role text default 'other'
    check (team_role in ('backend', 'frontend', 'mobile', 'designer', 'ai-ml', 'devops', 'other')),
  add column if not exists is_available boolean default true;
