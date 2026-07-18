-- CoSkill — Task timing and verification tracking

alter table public.tasks
    add column if not exists started_at timestamptz,
    add column if not exists time_spent_minutes integer,
    add column if not exists is_flagged boolean not null default false,
    add column if not exists flag_reason text,
    add column if not exists verification_question text,
    add column if not exists verification_answer text;

alter table public.tasks
    add constraint tasks_time_spent_minutes_nonnegative
    check (time_spent_minutes is null or time_spent_minutes >= 0);

comment on column public.tasks.is_flagged is 'Whether completion requires an AI verification answer.';
comment on column public.tasks.verification_question is 'AI-generated question used to verify unusually fast completion.';

-- A failed verification adjusts only the current user's performance row.
grant update on public.performance_scores to authenticated;

drop policy if exists "perf_update_own" on public.performance_scores;
create policy "perf_update_own" on public.performance_scores
    for update using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
