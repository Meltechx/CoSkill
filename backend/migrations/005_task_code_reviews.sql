-- CoSkill — AI code review results for completed task submissions

alter table public.tasks
    add column if not exists quality_score integer,
    add column if not exists issues text[] not null default '{}',
    add column if not exists suggestions text[] not null default '{}';

alter table public.tasks
    add constraint tasks_quality_score_range
    check (quality_score is null or quality_score between 0 and 100);

comment on column public.tasks.quality_score is 'AI-generated code quality score for the submitted work.';
comment on column public.tasks.issues is 'Up to three AI-identified bugs or code-quality issues.';
comment on column public.tasks.suggestions is 'Up to two AI-generated improvement suggestions.';
