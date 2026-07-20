-- CoSkill — harden gamification access for existing authenticated users.
-- Run after 005_xp_system.sql and 006_gamification_system.sql.

grant usage on schema public to authenticated;
grant select on public.users, public.xp_events, public.user_badges, public.user_activity_days to authenticated;

create or replace function public.ensure_gamification_user(
    p_user_id uuid,
    p_email text,
    p_full_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.users (id, email, full_name, xp, level, badges)
    values (
        p_user_id,
        p_email,
        coalesce(nullif(trim(p_full_name), ''), split_part(p_email, '@', 1), 'CoSkill member'),
        0,
        1,
        '{}'::text[]
    )
    on conflict (id) do nothing;
end;
$$;

grant execute on function public.ensure_gamification_user(uuid, text, text) to authenticated;
grant execute on function public.current_gamification_streak(uuid) to authenticated;
grant execute on function public.award_gamification_xp(uuid, integer, text, text, jsonb) to authenticated;

