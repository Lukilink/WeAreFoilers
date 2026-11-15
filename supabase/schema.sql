-- We Are Foilers: database for Supabase (Postgres). Version 1.
--
-- Run: Supabase dashboard → SQL Editor → New query → paste everything → Run.
-- The script is idempotent (safe to run again). Upgrades use "add column if not exists".
--
-- Roles
--   Visitors (not signed in): see approved, visible cards WITHOUT WhatsApp/email.
--   Members (signed in, email confirmed): additionally see WhatsApp/email.
--   Owners: exactly ONE card per account (foiler, school or shop).
--   Auto entries: schools/shops added from public info (owner_id is null, is_auto = true).
--                 The real school/shop can register and claim it; the admin then removes the auto entry.
--   Admins: listed in public.admins. Approve, hide, block, partner badge, settings.
--
-- Nobody writes into the tables directly. All writes go through the functions below
-- (security definer), which check who is calling. So nobody can approve themselves
-- or give themselves the partner badge.

-- 1. Helpers -------------------------------------------------------------------

-- disciplines: [{"id": "wing", "level": 3}, …]  ids as in assets/js/catalog.js, level 1..4
create or replace function public.disciplines_valid(d jsonb)
returns boolean
language plpgsql
immutable
as $$
declare e jsonb;
begin
  if jsonb_typeof(d) is distinct from 'array' then return false; end if;
  if jsonb_array_length(d) < 1 or jsonb_array_length(d) > 13 then return false; end if;
  for e in select * from jsonb_array_elements(d) loop
    if jsonb_typeof(e) <> 'object' then return false; end if;
    if coalesce(e->>'id', '') !~ '^[a-z-]{1,20}$' then return false; end if;
    if jsonb_typeof(e->'level') <> 'number' or (e->>'level')::int not between 1 and 4 then return false; end if;
  end loop;
  return true;
end;
$$;

create or replace function public.tags_valid(t text[], max_n int, max_len int, pattern text)
returns boolean
language sql
immutable
as $$
  select coalesce(array_length(t, 1), 0) <= max_n
     and not exists (select 1 from unnest(t) x where char_length(x) > max_len or x !~ pattern);
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. Tables --------------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid unique references auth.users (id) on delete cascade,   -- null = auto entry

  -- public (once approved and visible)
  type             text not null default 'private' check (type in ('private','school','shop')),
  name             text not null check (char_length(btrim(name)) between 1 and 60),
  avatar_seed      text not null default '' check (char_length(avatar_seed) <= 40),
  photo_path       text check (photo_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$'),
  home_label       text not null check (char_length(home_label) between 1 and 120),
  home_lat         double precision not null check (home_lat between -90 and 90),
  home_lng         double precision not null check (home_lng between -180 and 180),
  away_label       text check (char_length(away_label) <= 120),
  away_lat         double precision check (away_lat between -90 and 90),
  away_lng         double precision check (away_lng between -180 and 180),
  away_until       text not null default '' check (char_length(away_until) <= 40),
  at_away          boolean not null default false,
  disciplines      jsonb not null check (public.disciplines_valid(disciplines)),
  discipline_other text not null default '' check (char_length(discipline_other) <= 30),
  open_for         text[] not null default '{}' check (public.tags_valid(open_for, 12, 30, '^[a-z-]+$')),
  gear             text[] not null default '{}' check (public.tags_valid(gear, 25, 40, '^[^<>]+$')),
  gear_other       text not null default '' check (char_length(gear_other) <= 40),
  about            text not null default '' check (char_length(about) <= 160),
  instagram        text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  website          text check (char_length(website) <= 300 and website ~* '^https://[^[:space:]]+\.[^[:space:]]+$'),
  hours            text not null default '' check (char_length(hours) <= 80),
  is_partner       boolean not null default false,
  is_auto          boolean not null default false,
  source_url       text check (char_length(source_url) <= 300),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- members only
  whatsapp         text check (whatsapp ~ '^\+[1-9][0-9]{6,14}$'),
  email            text check (char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),

  -- owner and admin only (read through my_profile() / admin_overview())
  visible          boolean not null default true,
  status           text not null default 'pending' check (status in ('pending','approved','hidden','blocked')),
  claim_of         uuid references public.profiles (id) on delete set null,   -- "the auto entry X is us"

  constraint profiles_away_complete check ((away_label is null) = (away_lat is null) and (away_lat is null) = (away_lng is null)),
  constraint profiles_at_away_needs_away check (not at_away or away_lat is not null),
  constraint profiles_owner_or_auto check (owner_id is not null or is_auto)
);
-- kind of gear (wings, foils, boards …): what a foiler owns, a school rents out, a shop sells or rents
alter table public.profiles add column if not exists kit text[] not null default '{}' check (public.tags_valid(kit, 12, 30, '^[a-z-]+$'));
create index if not exists profiles_live_idx on public.profiles (status, visible);
-- public hint "this card has WhatsApp/email" without revealing them
alter table public.profiles add column if not exists has_contact boolean generated always as (whatsapp is not null or email is not null) stored;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Partner program: link where the user shares We Are Foilers (Instagram bio, website …)
create table if not exists public.partner_requests (
  profile_id  uuid primary key references public.profiles (id) on delete cascade,
  link        text not null check (char_length(link) <= 300 and link ~* '^https://.+'),
  status      text not null default 'requested' check (status in ('requested','verified','rejected')),
  note        text not null default '' check (char_length(note) <= 300),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  reason      text not null check (char_length(reason) between 2 and 60),
  note        text not null default '' check (char_length(note) <= 400),
  open        boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.settings (
  key    text primary key check (key in ('manual_approval','show_demo','partner_program')),
  value  jsonb not null
);
insert into public.settings (key, value) values
  ('manual_approval', 'true'), ('show_demo', 'true'), ('partner_program', 'true')
on conflict (key) do nothing;

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- 3. Rights and row rules ------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.partner_requests enable row level security;
alter table public.reports          enable row level security;
alter table public.settings         enable row level security;
alter table public.admins           enable row level security;

revoke all on public.profiles, public.partner_requests, public.reports, public.settings, public.admins from anon, authenticated;

-- Visitors: public columns only
grant select (id, type, name, avatar_seed, photo_path, home_label, home_lat, home_lng, away_label, away_lat, away_lng,
              away_until, at_away, disciplines, discipline_other, open_for, gear, gear_other, kit, about, instagram, website,
              hours, is_partner, is_auto, has_contact, created_at, updated_at)
  on public.profiles to anon;
-- Members: plus WhatsApp and email
grant select (id, type, name, avatar_seed, photo_path, home_label, home_lat, home_lng, away_label, away_lat, away_lng,
              away_until, at_away, disciplines, discipline_other, open_for, gear, gear_other, kit, about, instagram, website,
              hours, is_partner, is_auto, has_contact, created_at, updated_at, whatsapp, email)
  on public.profiles to authenticated;

drop policy if exists "Live cards" on public.profiles;
create policy "Live cards" on public.profiles for select to anon, authenticated
  using (status = 'approved' and visible);

grant select on public.settings to anon, authenticated;
drop policy if exists "Settings are public" on public.settings;
create policy "Settings are public" on public.settings for select to anon, authenticated using (true);

-- 4. Functions -----------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql security definer stable set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

create or replace function public.setting(k text)
returns jsonb
language sql security definer stable set search_path = ''
as $$
  select value from public.settings where key = k;
$$;

-- Move a point randomly by up to `meters` (privacy for private foilers)
create or replace function public.fuzz_point(lat double precision, lng double precision, meters double precision, out flat double precision, out flng double precision)
language plpgsql volatile set search_path = ''
as $$
declare r double precision := meters * sqrt(random()); a double precision := random() * 2 * pi();
begin
  flat := round(((lat + (r * cos(a)) / 111320.0))::numeric, 5);
  flng := round(((lng + (r * sin(a)) / (111320.0 * cos(radians(lat)))))::numeric, 5);
end;
$$;

-- Own card, all columns
create or replace function public.my_profile()
returns setof public.profiles
language sql security definer stable set search_path = ''
as $$
  select * from public.profiles where owner_id = (select auth.uid());
$$;

-- Create or update your own card. Only the keys present in p are changed.
-- Locations: {"label","lat","lng","exact":true}. With exact=true and type private the point is fuzzed here.
create or replace function public.save_my_profile(p jsonb)
returns setof public.profiles
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  cur public.profiles;
  t text;
  fz record;
  fuzz_m constant double precision := 1500;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into cur from public.profiles where owner_id = uid;

  if cur.id is null then
    if not (p ? 'name' and p ? 'home' and p ? 'disciplines') then raise exception 'Name, home and disciplines are required'; end if;
    insert into public.profiles (owner_id, name, home_label, home_lat, home_lng, disciplines, status)
    values (uid, p->>'name', p->'home'->>'label', (p->'home'->>'lat')::float8, (p->'home'->>'lng')::float8, p->'disciplines',
            case when coalesce((public.setting('manual_approval'))::boolean, true) then 'pending' else 'approved' end)
    returning * into cur;
  end if;

  t := coalesce(p->>'type', cur.type);

  update public.profiles set
    type             = t,
    name             = coalesce(nullif(btrim(p->>'name'), ''), name),
    avatar_seed      = case when p ? 'avatarSeed' then coalesce(p->>'avatarSeed', '') else avatar_seed end,
    photo_path       = case when p ? 'photoPath' then nullif(p->>'photoPath', '') else photo_path end,
    disciplines      = coalesce(p->'disciplines', disciplines),
    discipline_other = case when p ? 'disciplineOther' then coalesce(p->>'disciplineOther', '') else discipline_other end,
    open_for         = case when p ? 'openFor' then coalesce(array(select jsonb_array_elements_text(p->'openFor')), '{}') else open_for end,
    gear             = case when p ? 'gear' then coalesce(array(select jsonb_array_elements_text(p->'gear')), '{}') else gear end,
    gear_other       = case when p ? 'gearOther' then coalesce(p->>'gearOther', '') else gear_other end,
    kit              = case when p ? 'kit' then coalesce(array(select jsonb_array_elements_text(p->'kit')), '{}') else kit end,
    about            = case when p ? 'about' then coalesce(p->>'about', '') else about end,
    instagram        = case when p ? 'instagram' then nullif(p->>'instagram', '') else instagram end,
    whatsapp         = case when p ? 'whatsapp' then nullif(p->>'whatsapp', '') else whatsapp end,
    email            = case when p ? 'email' then nullif(p->>'email', '') else email end,
    website          = case when t = 'private' then null when p ? 'website' then nullif(p->>'website', '') else website end,
    hours            = case when t = 'private' then '' when p ? 'hours' then coalesce(p->>'hours', '') else hours end,
    claim_of         = case when t = 'private' then null
                            when p ? 'claimOf' then (select id from public.profiles a where a.id = nullif(p->>'claimOf', '')::uuid and a.is_auto)
                            else claim_of end
  where id = cur.id;

  -- locations
  if p ? 'home' and jsonb_typeof(p->'home') = 'object' then
    if t = 'private' and coalesce((p->'home'->>'exact')::boolean, false) then
      select * into fz from public.fuzz_point((p->'home'->>'lat')::float8, (p->'home'->>'lng')::float8, fuzz_m);
      update public.profiles set home_label = p->'home'->>'label', home_lat = fz.flat, home_lng = fz.flng where id = cur.id;
    else
      update public.profiles set home_label = p->'home'->>'label', home_lat = (p->'home'->>'lat')::float8, home_lng = (p->'home'->>'lng')::float8 where id = cur.id;
    end if;
  end if;
  if p ? 'away' then
    if jsonb_typeof(p->'away') = 'object' then
      if t = 'private' and coalesce((p->'away'->>'exact')::boolean, false) then
        select * into fz from public.fuzz_point((p->'away'->>'lat')::float8, (p->'away'->>'lng')::float8, fuzz_m);
      else
        select (p->'away'->>'lat')::float8 as flat, (p->'away'->>'lng')::float8 as flng into fz;
      end if;
      update public.profiles set away_label = p->'away'->>'label', away_lat = fz.flat, away_lng = fz.flng,
                                 away_until = coalesce(p->'away'->>'until', '') where id = cur.id;
    else
      update public.profiles set away_label = null, away_lat = null, away_lng = null, away_until = '', at_away = false where id = cur.id;
    end if;
  end if;
  if p ? 'atAway' then
    update public.profiles set at_away = (p->>'atAway')::boolean and away_lat is not null where id = cur.id;
  end if;

  return query select * from public.profiles where id = cur.id;
end;
$$;

create or replace function public.set_my_visible(v boolean)
returns setof public.profiles
language sql security definer set search_path = ''
as $$
  update public.profiles set visible = v where owner_id = (select auth.uid()) returning *;
$$;

-- Deletes the account (and with it the card, reports and partner request).
-- The photo is removed by the browser before calling this.
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'Not signed in'; end if;
  delete from auth.users where id = (select auth.uid());
end;
$$;

create or replace function public.report_profile(pid uuid, reason text, note text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  -- simple flood guard: max 10 reports per hour from the same account
  if (select auth.uid()) is not null and (select count(*) from public.reports
      where reporter_id = (select auth.uid()) and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many reports. Please try again later.';
  end if;
  insert into public.reports (profile_id, reporter_id, reason, note)
  values (pid, (select auth.uid()), left(coalesce(reason, ''), 60), left(coalesce(note, ''), 400));
end;
$$;

-- Partner program: the owner tells us where they shared the link
create or replace function public.request_partner(link text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare pid uuid;
begin
  select id into pid from public.profiles where owner_id = (select auth.uid());
  if pid is null then raise exception 'Create your card first'; end if;
  insert into public.partner_requests (profile_id, link) values (pid, link)
  on conflict (profile_id) do update set link = excluded.link, status = 'requested', created_at = now(), decided_at = null
    where public.partner_requests.status <> 'verified' or public.partner_requests.link <> excluded.link;
end;
$$;

create or replace function public.my_partner_request()
returns setof public.partner_requests
language sql security definer stable set search_path = ''
as $$
  select r.* from public.partner_requests r join public.profiles p on p.id = r.profile_id where p.owner_id = (select auth.uid());
$$;

-- Admin ---------------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb
language plpgsql security definer stable set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return jsonb_build_object(
    'profiles', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc) from public.profiles p), '[]'),
    'reports',  coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from public.reports r), '[]'),
    'partners', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.partner_requests x), '[]'),
    'settings', coalesce((select jsonb_object_agg(key, value) from public.settings), '{}'));
end;
$$;

-- status: approved | hidden | blocked | pending | deleted
-- Approving a card that claims an auto entry removes that auto entry.
create or replace function public.admin_decide(pid uuid, new_status text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare c uuid;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if new_status = 'deleted' then
    delete from public.profiles where id = pid and (is_auto or owner_id is null);
    if not found then raise exception 'Only auto entries can be deleted. Block or hide real accounts.'; end if;
    return;
  end if;
  if new_status not in ('approved','hidden','blocked','pending') then raise exception 'Unknown status'; end if;
  update public.profiles set status = new_status where id = pid returning claim_of into c;
  if new_status = 'approved' and c is not null then
    delete from public.profiles where id = c and is_auto;
    update public.profiles set claim_of = null where id = pid;
  end if;
  if new_status in ('hidden','blocked') then
    update public.reports set open = false where profile_id = pid;
  end if;
end;
$$;

create or replace function public.admin_set_partner(pid uuid, on_off boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.profiles set is_partner = on_off where id = pid;
  update public.partner_requests set status = case when on_off then 'verified' else 'rejected' end, decided_at = now()
   where profile_id = pid;
end;
$$;

create or replace function public.admin_close_report(rid uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.reports set open = false where id = rid;
end;
$$;

create or replace function public.admin_set_setting(k text, v jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  insert into public.settings (key, value) values (k, v) on conflict (key) do update set value = excluded.value;
end;
$$;

-- Execute rights
revoke all on function public.is_admin(), public.setting(text), public.fuzz_point(double precision, double precision, double precision),
  public.my_profile(), public.save_my_profile(jsonb), public.set_my_visible(boolean), public.delete_my_account(),
  public.report_profile(uuid, text, text), public.request_partner(text), public.my_partner_request(),
  public.admin_overview(), public.admin_decide(uuid, text), public.admin_set_partner(uuid, boolean),
  public.admin_close_report(uuid), public.admin_set_setting(text, jsonb)
  from public, anon;

grant execute on function public.is_admin(), public.my_profile(), public.save_my_profile(jsonb), public.set_my_visible(boolean),
  public.delete_my_account(), public.request_partner(text), public.my_partner_request(),
  public.admin_overview(), public.admin_decide(uuid, text), public.admin_set_partner(uuid, boolean),
  public.admin_close_report(uuid), public.admin_set_setting(text, jsonb)
  to authenticated;
-- Visitors may report too (no account needed)
grant execute on function public.report_profile(uuid, text, text) to anon, authenticated;

-- 5. Photos ---------------------------------------------------------------------
-- Public bucket (profile photos are public anyway). Upload only into your own folder <user id>/…
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Photo upload (own folder)" on storage.objects;
drop policy if exists "Photo update (own folder)" on storage.objects;
drop policy if exists "Photo delete (own folder, admin)" on storage.objects;
create policy "Photo upload (own folder)" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Photo update (own folder)" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Photo delete (own folder, admin)" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
