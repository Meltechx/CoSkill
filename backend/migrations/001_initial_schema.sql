-- ============================================================
-- CoSkill — Initial Schema Migration
-- Run this in your Supabase SQL Editor or via CLI:
--   supabase db push
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. users
-- ============================================================
create table if not exists public.users (
    id          uuid primary key default gen_random_uuid(),
    email       text not null unique,
    full_name   text not null,
    avatar_url  text,
    created_at  timestamptz not null default now()
);

comment on table public.users is 'Platform users, synced from Supabase Auth.';

-- ============================================================
-- 2. projects
-- ============================================================
create type public.project_status as enum ('active', 'completed', 'archived', 'paused');

create table if not exists public.projects (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references public.users(id) on delete cascade,
    title       text not null,
    description text,
    goal        text,
    status      public.project_status not null default 'active',
    deadline    timestamptz,
    created_at  timestamptz not null default now()
);

comment on table public.projects is 'Projects owned by a user.';

-- ============================================================
-- 3. tasks
-- ============================================================
create type public.task_status as enum ('todo', 'in_progress', 'completed', 'cancelled');
create type public.task_difficulty as enum ('easy', 'medium', 'hard', 'expert');

create table if not exists public.tasks (
    id               uuid primary key default gen_random_uuid(),
    project_id       uuid not null references public.projects(id) on delete cascade,
    title            text not null,
    description      text,
    difficulty       public.task_difficulty not null default 'medium',
    estimated_hours  numeric(6, 2),
    actual_hours     numeric(6, 2),
    status           public.task_status not null default 'todo',
    skill_tags       text[] not null default '{}',
    created_at       timestamptz not null default now(),
    completed_at     timestamptz,

    constraint completed_at_requires_status
        check (completed_at is null or status = 'completed')
);

comment on table public.tasks        is 'Individual tasks within a project.';
comment on column public.tasks.skill_tags is 'Array of skill labels, e.g. {python, fastapi}.';

-- ============================================================
-- 4. performance_scores
-- ============================================================
create table if not exists public.performance_scores (
    id                   uuid primary key default gen_random_uuid(),
    user_id              uuid not null references public.users(id) on delete cascade,
    task_id              uuid not null references public.tasks(id) on delete cascade,
    score                numeric(5, 2) not null check (score between 0 and 100),
    completion_time_score numeric(5, 2) not null check (completion_time_score between 0 and 100),
    consistency_score    numeric(5, 2) not null check (consistency_score between 0 and 100),
    difficulty_score     numeric(5, 2) not null check (difficulty_score between 0 and 100),
    notes                text,
    created_at           timestamptz not null default now(),

    unique (user_id, task_id)
);

comment on table public.performance_scores is 'AI-computed performance breakdown per task per user.';

-- ============================================================
-- 5. skill_profiles
-- ============================================================
create table if not exists public.skill_profiles (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references public.users(id) on delete cascade,
    skill_name   text not null,
    total_tasks  integer not null default 0 check (total_tasks >= 0),
    avg_score    numeric(5, 2) check (avg_score between 0 and 100),
    last_updated timestamptz not null default now(),

    unique (user_id, skill_name)
);

comment on table public.skill_profiles is 'Aggregated skill metrics per user, updated after each scored task.';

-- ============================================================
-- Indexes
-- ============================================================

-- projects
create index if not exists idx_projects_user_id  on public.projects(user_id);
create index if not exists idx_projects_status   on public.projects(status);
create index if not exists idx_projects_deadline on public.projects(deadline) where deadline is not null;

-- tasks
create index if not exists idx_tasks_project_id    on public.tasks(project_id);
create index if not exists idx_tasks_status        on public.tasks(status);
create index if not exists idx_tasks_skill_tags    on public.tasks using gin(skill_tags);
create index if not exists idx_tasks_completed_at  on public.tasks(completed_at) where completed_at is not null;

-- performance_scores
create index if not exists idx_perf_user_id    on public.performance_scores(user_id);
create index if not exists idx_perf_task_id    on public.performance_scores(task_id);
create index if not exists idx_perf_created_at on public.performance_scores(created_at);

-- skill_profiles
create index if not exists idx_skill_profiles_user_id    on public.skill_profiles(user_id);
create index if not exists idx_skill_profiles_skill_name on public.skill_profiles(skill_name);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.users             enable row level security;
alter table public.projects          enable row level security;
alter table public.tasks             enable row level security;
alter table public.performance_scores enable row level security;
alter table public.skill_profiles    enable row level security;

-- users: can only read/update own row
create policy "users_select_own" on public.users
    for select using (auth.uid() = id);

create policy "users_update_own" on public.users
    for update using (auth.uid() = id);

-- projects: full CRUD on own projects
create policy "projects_select_own" on public.projects
    for select using (auth.uid() = user_id);

create policy "projects_insert_own" on public.projects
    for insert with check (auth.uid() = user_id);

create policy "projects_update_own" on public.projects
    for update using (auth.uid() = user_id);

create policy "projects_delete_own" on public.projects
    for delete using (auth.uid() = user_id);

-- tasks: accessible through project ownership
create policy "tasks_select_own" on public.tasks
    for select using (
        exists (
            select 1 from public.projects p
            where p.id = project_id and p.user_id = auth.uid()
        )
    );

create policy "tasks_insert_own" on public.tasks
    for insert with check (
        exists (
            select 1 from public.projects p
            where p.id = project_id and p.user_id = auth.uid()
        )
    );

create policy "tasks_update_own" on public.tasks
    for update using (
        exists (
            select 1 from public.projects p
            where p.id = project_id and p.user_id = auth.uid()
        )
    );

create policy "tasks_delete_own" on public.tasks
    for delete using (
        exists (
            select 1 from public.projects p
            where p.id = project_id and p.user_id = auth.uid()
        )
    );

-- performance_scores: own rows only
create policy "perf_select_own" on public.performance_scores
    for select using (auth.uid() = user_id);

create policy "perf_insert_own" on public.performance_scores
    for insert with check (auth.uid() = user_id);

-- skill_profiles: own rows only
create policy "skill_select_own" on public.skill_profiles
    for select using (auth.uid() = user_id);

create policy "skill_insert_own" on public.skill_profiles
    for insert with check (auth.uid() = user_id);

create policy "skill_update_own" on public.skill_profiles
    for update using (auth.uid() = user_id);

-- ============================================================
-- Helper: auto-insert user row on Supabase Auth signup
-- ============================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.users (id, email, full_name, avatar_url)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url'
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_auth_user();

-- ============================================================
-- Helper: auto-update skill_profiles when a performance_score
--         is inserted or updated
-- ============================================================
create or replace function public.refresh_skill_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_tags text[];
    v_tag  text;
begin
    -- fetch the skill_tags from the related task
    select skill_tags into v_tags
    from public.tasks
    where id = new.task_id;

    foreach v_tag in array coalesce(v_tags, '{}')
    loop
        insert into public.skill_profiles (user_id, skill_name, total_tasks, avg_score, last_updated)
        values (new.user_id, v_tag, 1, new.score, now())
        on conflict (user_id, skill_name) do update
            set total_tasks  = skill_profiles.total_tasks + 1,
                avg_score    = (skill_profiles.avg_score * skill_profiles.total_tasks + new.score)
                               / (skill_profiles.total_tasks + 1),
                last_updated = now();
    end loop;

    return new;
end;
$$;

create trigger on_performance_score_upsert
    after insert on public.performance_scores
    for each row execute procedure public.refresh_skill_profile();
