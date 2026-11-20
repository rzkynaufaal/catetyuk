-- Jalankan di Supabase: SQL Editor > New query > Run
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null, type text not null check (type in ('income','expense')), icon text,
  unique (user_id, type, name));
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null, amount bigint not null check (amount > 0),
  type text not null check (type in ('income','expense')),
  category_id uuid references public.categories on delete restrict,
  tx_date date not null, payment_method text not null default 'Tunai',
  notes text, proof_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index on public.transactions (user_id, tx_date desc);
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null, year int not null, month int not null check (month between 1 and 12),
  category_id uuid references public.categories on delete cascade, -- NULL = anggaran keseluruhan
  amount bigint not null check (amount > 0), notes text);
create unique index budgets_unik on public.budgets (user_id, year, month, coalesce(category_id, '00000000-0000-0000-0000-000000000000'));
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null, target_amount bigint not null check (target_amount > 0),
  initial_amount bigint not null default 0 check (initial_amount >= 0),
  target_date date, kind text, icon text, priority text, notes text,
  cancelled boolean not null default false, created_at timestamptz not null default now());
-- Kontribusi = alokasi dana, BUKAN baris transactions, sehingga tidak pernah dihitung sebagai pemasukan/pengeluaran.
create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  goal_id uuid not null references public.savings_goals on delete cascade,
  amount bigint not null check (amount > 0), contributed_on date not null, notes text);

-- Row Level Security: setiap user hanya bisa mengakses barisnya sendiri
do $$ declare t text; begin
  foreach t in array array['categories','transactions','budgets','savings_goals','goal_contributions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "milik_sendiri" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop; end $$;

create function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger tx_updated before update on public.transactions for each row execute function public.touch_updated_at();

-- Kategori bawaan untuk setiap akun baru
create function public.seed_categories() returns trigger language plpgsql security definer set search_path = '' as $$ begin
  insert into public.categories (user_id, name, type) select new.id, n, 'expense' from unnest(array['Makanan & Minuman','Transportasi','Pendidikan','Kesehatan','Belanja','Hiburan','Tagihan & Utilitas','Tempat Tinggal','Kebutuhan Pribadi','Lainnya']) n;
  insert into public.categories (user_id, name, type) select new.id, n, 'income' from unnest(array['Uang Saku','Gaji','Freelance','Bisnis Pribadi','Beasiswa','Investasi','Hadiah','Bonus','Lainnya']) n;
  return new; end $$;
create trigger on_signup after insert on auth.users for each row execute function public.seed_categories();
