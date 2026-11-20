-- Bucket privat untuk bukti transaksi; setiap user hanya akses folder miliknya (nama folder = user id)
insert into storage.buckets (id, name, public) values ('proofs', 'proofs', false) on conflict (id) do nothing;
create policy "bukti_milik_sendiri" on storage.objects for all to authenticated
  using (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);