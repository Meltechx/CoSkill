-- ============================================================
-- CoSkill — Grant table privileges to Supabase roles
-- Run this in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- authenticated role (logged-in users via JWT)
grant usage on schema public to authenticated;

grant select, insert, update        on public.users              to authenticated;
grant select, insert, update, delete on public.projects          to authenticated;
grant select, insert, update, delete on public.tasks             to authenticated;
grant select, insert                 on public.performance_scores to authenticated;
grant select, insert, update         on public.skill_profiles    to authenticated;

-- anon role (unauthenticated requests — read-only where needed)
grant usage on schema public to anon;

-- service_role already has full access by default in Supabase
