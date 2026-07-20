-- CoSkill — XP and level progression

alter table public.users
    add column if not exists xp integer not null default 0 check (xp >= 0),
    add column if not exists level integer not null default 1 check (level >= 1),
    add column if not exists badges text[] not null default '{}';

-- Keep existing accounts consistent with the level formula.
update public.users
set level = floor(xp / 100.0)::integer + 1;

comment on column public.users.xp is 'Experience earned from completing tasks.';
comment on column public.users.level is 'Derived progression level: floor(xp / 100) + 1.';
comment on column public.users.badges is 'Unlocked achievement badge labels.';

create or replace function public.award_xp_on_task_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
    v_xp_reward integer;
begin
    if new.status = 'completed' and old.status is distinct from 'completed' then
        select user_id into v_user_id from public.projects where id = new.project_id;
        v_xp_reward := case new.difficulty
            when 'easy' then 10
            when 'medium' then 25
            when 'hard' then 50
            when 'expert' then 100
            else 25
        end;

        update public.users
        set xp = xp + v_xp_reward,
            level = floor((xp + v_xp_reward) / 100.0)::integer + 1
        where id = v_user_id;
    end if;
    return new;
end;
$$;

drop trigger if exists on_task_completion_award_xp on public.tasks;
create trigger on_task_completion_award_xp
    after update of status on public.tasks
    for each row execute procedure public.award_xp_on_task_completion();
