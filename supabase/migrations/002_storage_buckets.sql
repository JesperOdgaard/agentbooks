-- ============================================================
-- STORAGE BUCKETS
-- Kør denne migration i Supabase SQL Editor
-- ============================================================

-- Opret invoices-bucket (private — kun signed URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'invoices',
  'invoices',
  false,
  20971520,  -- 20 MB
  array['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

-- Opret expense-receipts-bucket (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expense-receipts',
  'expense-receipts',
  false,
  10485760,  -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

-- ── RLS policies: invoices bucket ─────────────────────────────────────────────

-- Upload: kun authenticated brugere kan uploade til deres org-mappe
create policy "Authenticated upload to own org"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] in (
      select organization_id::text
      from organization_members
      where user_id = auth.uid()
    )
  );

-- Læse: kun org-medlemmer kan læse
create policy "Org members can read invoice files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] in (
      select organization_id::text
      from organization_members
      where user_id = auth.uid()
    )
  );

-- Slet: kun admin/bogholder
create policy "Admin can delete invoice files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] in (
      select organization_id::text
      from organization_members
      where user_id = auth.uid() and role in ('admin', 'accountant')
    )
  );

-- ── RLS policies: expense-receipts bucket ─────────────────────────────────────

create policy "Authenticated upload to expense receipts"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'expense-receipts'
    and (storage.foldername(name))[1] in (
      select organization_id::text
      from organization_members
      where user_id = auth.uid()
    )
  );

create policy "Org members can read expense receipts"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'expense-receipts'
    and (storage.foldername(name))[1] in (
      select organization_id::text
      from organization_members
      where user_id = auth.uid()
    )
  );

create policy "Admin can delete expense receipts"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'expense-receipts'
    and (storage.foldername(name))[1] in (
      select organization_id::text
      from organization_members
      where user_id = auth.uid() and role in ('admin', 'accountant')
    )
  );
