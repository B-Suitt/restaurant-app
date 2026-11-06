-- Tiempo real: cada suscriptor recibe solo las filas que su política RLS le deja leer.
alter publication supabase_realtime
  add table public.order_items, public.orders, public.waiter_calls, public.table_sessions;

-- Fotos de platos: lectura pública, escritura solo admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dish-photos', 'dish-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "dish-photos: admin sube" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dish-photos' and private.has_role('admin'));

create policy "dish-photos: admin modifica" on storage.objects
  for update to authenticated
  using (bucket_id = 'dish-photos' and private.has_role('admin'));

create policy "dish-photos: admin elimina" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dish-photos' and private.has_role('admin'));
