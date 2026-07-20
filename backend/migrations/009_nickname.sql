-- Usernames are optional until a member completes onboarding. The application
-- requires one before completing onboarding, which lets existing accounts be
-- migrated without inventing usernames for them.
alter table public.users
  add column if not exists username text;

-- Keep URLs and lookups predictable by storing canonical lowercase usernames.
alter table public.users
  add constraint users_username_format
    check (username is null or username ~ '^[a-z0-9_]{3,20}$') not valid;

alter table public.users
  validate constraint users_username_format;

-- A unique index also serves the username-search and public-profile lookups.
create unique index if not exists idx_users_username
  on public.users (username)
  where username is not null;

comment on column public.users.username is
  'Lowercase public handle; required by the onboarding flow.';
