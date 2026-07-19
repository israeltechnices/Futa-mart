create table listings (
  id text primary key,
  type text not null,
  title text not null,
  category text not null,
  price text not null,
  description text,
  location text,
  contact text,
  owner_id text not null,
  status text default 'open',
  created_at bigint not null
);

alter table listings enable row level security;

create policy "Public can read listings" on listings for select using (true);
create policy "Public can insert listings" on listings for insert with check (true);
create policy "Public can update listings" on listings for update using (true);
