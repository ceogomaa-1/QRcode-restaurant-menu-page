-- AR Menu Generator — Supabase Schema
-- Run this in the Supabase SQL editor to set up your database

-- Restaurants table
create table if not exists restaurants (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  created_at timestamptz default now() not null
);

-- Dishes table
create table if not exists dishes (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid references restaurants(id) on delete cascade not null,
  name text not null,
  price numeric(10, 2) not null default 0,
  description text default '',
  glb_url text not null,
  usdz_url text,
  created_at timestamptz default now() not null
);

-- Migration: add usdz_url to existing dishes table (safe to run if column already exists)
alter table dishes add column if not exists usdz_url text;

-- Indexes
create index if not exists dishes_restaurant_id_idx on dishes(restaurant_id);
create index if not exists restaurants_slug_idx on restaurants(slug);

-- Row Level Security (RLS) — enable public read, restrict write to authenticated users
alter table restaurants enable row level security;
alter table dishes enable row level security;

-- Public read access
create policy "Public read restaurants"
  on restaurants for select using (true);

create policy "Public read dishes"
  on dishes for select using (true);

-- Authenticated write access (for admin uploads via service key or authenticated session)
create policy "Authenticated insert restaurants"
  on restaurants for insert with check (true);

create policy "Authenticated insert dishes"
  on dishes for insert with check (true);

-- Storage bucket for GLB models
-- Run this in the Supabase dashboard > Storage > New bucket:
-- Bucket name: glb-models
-- Public: true

-- Or via SQL:
insert into storage.buckets (id, name, public)
values ('glb-models', 'glb-models', true)
on conflict (id) do nothing;

-- Storage policy: allow public read
create policy "Public read glb-models"
  on storage.objects for select using (bucket_id = 'glb-models');

-- Storage policy: allow insert (for admin uploads)
create policy "Allow uploads to glb-models"
  on storage.objects for insert with check (bucket_id = 'glb-models');
