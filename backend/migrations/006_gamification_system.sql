-- CoSkill — premium gamification, achievements, streaks, and XP activity.

create table if not exists public.xp_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    amount integer not null check (amount > 0),
    event_type text not null,
    title text not null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    badge_id text not null,
    unlocked_at timestamptz not null default now(),
    unique (user_id, badge_id)
);

create table if not exists public.user_activity_days (
    user_id uuid not null references public.users(id) on delete cascade,
    activity_date date not null,
    xp_earned integer not null default 0,
    primary key (user_id, activity_date)
);

create index if not exists idx_xp_events_user_created on public.xp_events(user_id, created_at desc);
create index if not exists idx_user_badges_user_unlocked on public.user_badges(user_id, unlocked_at desc);

alter table public.xp_events enable row level security;
alter table public.user_badges enable row level security;
alter table public.user_activity_days enable row level security;

create policy "xp_events_select_own" on public.xp_events for select using (auth.uid() = user_id);
create policy "badges_select_own" on public.user_badges for select using (auth.uid() = user_id);
create policy "activity_days_select_own" on public.user_activity_days for select using (auth.uid() = user_id);

create or replace function public.gamification_level(p_xp integer)
returns table(level integer, level_start_xp integer, next_level_xp integer)
language plpgsql immutable
as $$
begin
    if p_xp < 250 then
        return query select 1, 0, 250;
    elsif p_xp < 600 then
        return query select 2, 250, 600;
    elsif p_xp < 1000 then
        return query select 3, 600, 1000;
    elsif p_xp < 1500 then
        return query select 4, 1000, 1500;
    else
        return query select
            5 + floor((p_xp - 1500) / 500.0)::integer,
            1500 + floor((p_xp - 1500) / 500.0)::integer * 500,
            2000 + floor((p_xp - 1500) / 500.0)::integer * 500;
    end if;
end;
$$;

-- Normalize existing accounts from the original 100-XP formula to the
-- richer threshold curve above. Runtime reads use this same helper.
update public.users
set level = progression.level
from (
    select id, (public.gamification_level(xp)).level
    from public.users
) as progression
where public.users.id = progression.id;

comment on column public.users.level is 'Derived from the gamification threshold curve.';

create or replace function public.unlock_gamification_badge(p_user_id uuid, p_badge_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.user_badges (user_id, badge_id)
    values (p_user_id, p_badge_id)
    on conflict (user_id, badge_id) do nothing;

    if found then
        update public.users
        set badges = array_append(coalesce(badges, '{}'), p_badge_id)
        where id = p_user_id;
    end if;
end;
$$;

create or replace function public.current_gamification_streak(p_user_id uuid)
returns integer
language sql stable
as $$
    with recursive streak(day) as (
        select current_date
        where exists (
            select 1 from public.user_activity_days
            where user_id = p_user_id and activity_date = current_date
        )
        union all
        select day - 1
        from streak
        where exists (
            select 1 from public.user_activity_days
            where user_id = p_user_id and activity_date = streak.day - 1
        )
    )
    select count(*)::integer from streak;
$$;

create or replace function public.evaluate_gamification_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_projects integer;
    v_completed integer;
    v_ai_events integer;
    v_streak integer;
    v_early_bird boolean;
    v_fast_finish boolean;
begin
    select count(*) into v_projects from public.projects where user_id = p_user_id;
    select count(*) into v_completed
    from public.tasks t join public.projects p on p.id = t.project_id
    where p.user_id = p_user_id and t.status = 'completed';
    select count(*) into v_ai_events from public.xp_events
    where user_id = p_user_id and event_type like 'ai_%';
    select public.current_gamification_streak(p_user_id) into v_streak;
    select exists (
        select 1 from public.tasks t join public.projects p on p.id = t.project_id
        where p.user_id = p_user_id and t.completed_at is not null
        and extract(hour from t.completed_at at time zone 'UTC') < 9
    ) into v_early_bird;
    select exists (
        select 1 from public.tasks t join public.projects p on p.id = t.project_id
        where p.user_id = p_user_id and t.status = 'completed'
        and t.time_spent_minutes is not null and t.time_spent_minutes <= 30
    ) into v_fast_finish;

    if v_projects >= 1 then perform public.unlock_gamification_badge(p_user_id, 'first_project'); end if;
    if v_fast_finish then perform public.unlock_gamification_badge(p_user_id, 'fast_finisher'); end if;
    if v_completed >= 10 then perform public.unlock_gamification_badge(p_user_id, 'ship_it'); end if;
    if v_ai_events >= 1 then perform public.unlock_gamification_badge(p_user_id, 'ai_explorer'); end if;
    if exists (
        select 1 from public.xp_events
        where user_id = p_user_id and event_type = 'sprint_completed'
    ) then perform public.unlock_gamification_badge(p_user_id, 'sprint_master'); end if;
    if v_streak >= 7 then perform public.unlock_gamification_badge(p_user_id, 'seven_day_streak'); end if;
    if v_completed >= 100 then perform public.unlock_gamification_badge(p_user_id, 'hundred_tasks'); end if;
    if v_ai_events >= 10 then perform public.unlock_gamification_badge(p_user_id, 'ai_power_user'); end if;
    if v_completed >= 30 then perform public.unlock_gamification_badge(p_user_id, 'consistency'); end if;
    if v_early_bird then perform public.unlock_gamification_badge(p_user_id, 'early_bird'); end if;
end;
$$;

create or replace function public.award_gamification_xp(
    p_user_id uuid,
    p_amount integer,
    p_event_type text,
    p_title text,
    p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_xp integer;
    v_level integer;
    v_daily_bonus integer := 0;
    v_total_award integer;
begin
    if p_amount <= 0 then return; end if;
    -- The first meaningful action each day earns a modest streak bonus. The
    -- activity-day record also naturally resets a streak after a missed day.
    if p_event_type <> 'daily_streak' and not exists (
        select 1 from public.user_activity_days
        where user_id = p_user_id and activity_date = current_date
    ) then
        v_daily_bonus := 5;
    end if;
    v_total_award := p_amount + v_daily_bonus;
    update public.users set xp = xp + v_total_award where id = p_user_id returning xp into v_xp;
    select level into v_level from public.gamification_level(v_xp);
    update public.users set level = v_level where id = p_user_id;
    insert into public.xp_events (user_id, amount, event_type, title, metadata)
    values (p_user_id, p_amount, p_event_type, p_title, coalesce(p_metadata, '{}'::jsonb));
    if v_daily_bonus > 0 then
        insert into public.xp_events (user_id, amount, event_type, title)
        values (p_user_id, v_daily_bonus, 'daily_streak', 'Daily activity streak');
    end if;
    insert into public.user_activity_days (user_id, activity_date, xp_earned)
    values (p_user_id, current_date, v_total_award)
    on conflict (user_id, activity_date) do update set xp_earned = user_activity_days.xp_earned + excluded.xp_earned;
    perform public.evaluate_gamification_badges(p_user_id);
end;
$$;

create or replace function public.award_xp_on_task_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
    v_xp_reward integer;
    v_project_deadline timestamptz;
begin
    if new.status = 'completed' and old.status is distinct from 'completed' then
        select user_id into v_user_id from public.projects where id = new.project_id;
        v_xp_reward := case new.difficulty when 'easy' then 10 when 'medium' then 25 when 'hard' then 50 when 'expert' then 100 else 25 end;
        perform public.award_gamification_xp(v_user_id, v_xp_reward, 'task_completed', new.title, jsonb_build_object('task_id', new.id));

        -- Treat finishing every task in a project as a sprint completion.
        -- This remains idempotent if project work is later edited or reopened.
        if not exists (
            select 1 from public.tasks
            where project_id = new.project_id and status <> 'completed'
        ) and not exists (
            select 1 from public.xp_events
            where user_id = v_user_id
              and event_type = 'sprint_completed'
              and metadata ->> 'project_id' = new.project_id::text
        ) then
            select deadline into v_project_deadline from public.projects where id = new.project_id;
            perform public.award_gamification_xp(
                v_user_id,
                100,
                'sprint_completed',
                case when v_project_deadline is null or v_project_deadline >= now() then 'Finished sprint on time' else 'Completed sprint' end,
                jsonb_build_object('project_id', new.project_id)
            );
        end if;
    end if;
    return new;
end;
$$;

create or replace function public.evaluate_project_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    perform public.evaluate_gamification_badges(new.user_id);
    return new;
end;
$$;

drop trigger if exists on_project_created_evaluate_badges on public.projects;
create trigger on_project_created_evaluate_badges after insert on public.projects
    for each row execute procedure public.evaluate_project_badge();
